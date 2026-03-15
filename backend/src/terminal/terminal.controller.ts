import { Controller, Get, Post, Param, Body, NotFoundException, Logger } from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { PrismaService } from '../prisma.service';
import { ScraperService } from '../market/scraper.service';
import { CacheService } from '../cache.service';
import { AIService } from '../ai/ai.service';

@ApiTags('terminal')
@Controller('api/terminal')
export class TerminalController {
  private readonly logger = new Logger(TerminalController.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly scraperService: ScraperService,
    private readonly cacheService: CacheService,
    private readonly aiService: AIService,
  ) {}

  // ─── GET /api/terminal/init ──────────────────────────────────────────────────
  @Get('init')
  @ApiOperation({ summary: 'Initial market summary for the landing page' })
  async getInit() {
    return this.getCached('market:init', async () => {
      const [recent, gainers, losers, macro, summary] = await Promise.all([
        // Recently researched/updated
        this.prisma.stock.findMany({ 
          take: 6, 
          orderBy: { lastUpdated: 'desc' },
          select: { ticker: true, name: true, price: true, changePercent: true, exchange: true }
        }),
        // Top Gainers
        this.prisma.stock.findMany({ 
          take: 5, 
          orderBy: { changePercent: 'desc' },
          select: { ticker: true, name: true, price: true, changePercent: true }
        }),
        // Top Losers
        this.prisma.stock.findMany({ 
          take: 5, 
          orderBy: { changePercent: 'asc' },
          select: { ticker: true, name: true, price: true, changePercent: true }
        }),
        // Macro Signals
        this.prisma.macroSignal.findMany({ take: 3, orderBy: { lastUpdated: 'desc' } }),
        // Market Summary
        this.getMarketNarrative()
      ]);

      return { recent, gainers, losers, macro, summary };
    }, 300); // 5 min cache
  }

  // ─── GET /api/terminal/dashboard/:ticker ────────────────────────────────────
  @Get(['dashboard/:ticker', 'intelligence/:ticker'])
  @ApiOperation({ summary: 'Full intelligence package for a ticker' })
  async getDashboard(@Param('ticker') ticker: string) {
    const key = ticker.toUpperCase().split('.')[0];

    let stock = await this.prisma.stock.findUnique({
      where: { ticker: key },
      include: {
        sector:     true,
        aiInsights: { orderBy: { precomputedAt: 'desc' }, take: 1 },
        priceHistory: { orderBy: { date: 'desc' }, take: 300 },
      },
    }) as any;

    const isStale = !stock || (Date.now() - stock.lastUpdated.getTime() > 15 * 60 * 1000); // 15 min stale

    try {
      if (!stock || isStale) {
        stock = await this.fetchAndPersist(key);
      } else {
        // User requested EXACT latest price on every search, bypass 15min delay for pure price
        const live = await this.scraperService.fetchLivePrice(key);
        if (live && live.price) {
           stock.price = live.price;
           stock.change = live.change;
           stock.changePercent = live.changePercent;
           // Fire and forget DB update so it's fresh for next API calls
           this.prisma.stock.update({ 
              where: { id: stock.id }, 
              data: { price: live.price, change: live.change, changePercent: live.changePercent, lastUpdated: new Date() } 
           }).catch((e) => this.logger.warn(`Failed async price update: ${e.message}`));
        }
      }
    } catch (e) {
      this.logger.error(`Failed to refresh stock ${key}: ${e.message}`);
      if (!stock) throw new NotFoundException(`Stock ${key} not found and failed to fetch.`);
    }

    const companyName = stock.name;
    const sectorName = stock.sector?.name;

    const [liveNews, socialFeed, exchangeFilings, narrative] = await Promise.all([
      this.getCached(`news:${key}`,    () => this.scraperService.scrapeNews(key, companyName, sectorName, 120), 600),
      this.getCached(`social:${key}`,  () => this.scraperService.scrapeReddit(key, companyName, sectorName, 120), 600),
      this.getCached(`filings:${key}`, () => this.scraperService.scrapeExchangeFilings(key, 120),  1800),
      this.getMarketNarrative(),
    ]);

    const macroSignals = await this.prisma.macroSignal.findMany({ orderBy: { lastUpdated: 'desc' } });

    return {
      stock,
      liveNews,
      socialFeed,
      exchangeFilings,
      macroSignals,
      narrative,
      supplyChain: await this.getSupplyChain(key),
      serverTime: new Date(),
    };
  }

  // ─── GET /api/terminal/supply-chain/:ticker ─────────────────────────────────
  @Get('supply-chain/:ticker')
  async getSupplyChain(@Param('ticker') ticker: string) {
    const key = ticker.toUpperCase().split('.')[0];
    return this.getCached(`supply-chain:${key}`, async () => {
      const stock = await this.prisma.stock.findUnique({ where: { ticker: key } });
      if (!stock) return null;
      return this.aiService.mapSupplyChain(stock.name, key, 'Linked Industry');
    }, 86400); // Cache for 24h as supply chains don't change daily
  }

  // ─── GET /api/terminal/narrative ─────────────────────────────────────────────
  @Get('narrative')
  async getMarketNarrative() {
    try {
      return await this.getCached('market:narrative', async () => {
        const topStocks = await this.prisma.stock.findMany({ 
          orderBy: { changePercent: 'desc' }, 
          take: 10 
        });
        const macro = await this.prisma.macroSignal.findMany();
        const aiResult = await this.aiService.generateMarketNarrative(topStocks, macro);
        
        return await this.prisma.marketSummary.upsert({
          where: { date: new Date() },
          update: { narrative: aiResult.narrative, topThemes: aiResult.topThemes, volatility: aiResult.volatility },
          create: { narrative: aiResult.narrative, topThemes: aiResult.topThemes, volatility: aiResult.volatility },
        });
      }, 3600); // Cache for 1 hour
    } catch (err) {
      this.logger.error(`Failed to generate market narrative: ${err.message}`);
      return { narrative: 'Market narrative synchronization in progress...', topThemes: [], volatility: 'STABLE' };
    }
  }

  // ─── GET /api/terminal/stocks ────────────────────────────────────────────────
  @Get('stocks')
  @ApiOperation({ summary: 'All persisted stocks (for search autocomplete)' })
  async getAllStocks() {
    return this.prisma.stock.findMany({
      select: {
        ticker:       true,
        name:         true,
        exchange:     true,
        price:        true,
        changePercent: true,
        marketCap:    true,
        lastUpdated:  true,
      },
      orderBy: { lastUpdated: 'desc' },
    });
  }

  // ─── GET /api/terminal/market-status ────────────────────────────────────────
  @Get('market-status')
  @ApiOperation({ summary: 'Macro signals + top movers' })
  async getMarketStatus() {
    const [macro, topGainers, topLosers] = await Promise.all([
      this.prisma.macroSignal.findMany({ orderBy: { lastUpdated: 'desc' } }),
      this.prisma.stock.findMany({ orderBy: { changePercent: 'desc' }, take: 5 }),
      this.prisma.stock.findMany({ orderBy: { changePercent: 'asc'  }, take: 5 }),
    ]);
    return { macro, topGainers, topLosers };
  }

  // ─── POST /api/terminal/refresh/:ticker ─────────────────────────────────────
  @Post('refresh/:ticker')
  @ApiOperation({ summary: 'Force-refresh a ticker (price + fundamentals + AI)' })
  async refreshStock(@Param('ticker') ticker: string) {
    const key = ticker.toUpperCase().split('.')[0];

    // Delete existing so fetchAndPersist creates fresh
    await this.prisma.stock.deleteMany({ where: { ticker: key } });

    // Also clear Redis caches for this ticker
    await Promise.all([
      this.cacheService.set(`news:${key}`,    [], 1),
      this.cacheService.set(`social:${key}`,  [], 1),
      this.cacheService.set(`filings:${key}`, [], 1),
    ]);

    const stock = await this.fetchAndPersist(key);
    return { success: true, stock };
  }

  // ─── PRIVATE: Fetch everything and persist to DB ─────────────────────────────
  private async fetchAndPersist(ticker: string) {
    try {
      this.logger.log(`[${ticker}] Running Research Engine...`);

      const yf = await this.scraperService.fetchLivePrice(ticker);
      if (!yf) throw new NotFoundException(`Ticker ${ticker} not found`);

      // If Yahoo found a better symbol (e.g. INFY.NS for INFOSYS), use it for the rest
      const resolvedTicker = yf.symbol || ticker;

      const [hist, sc] = await Promise.all([
        this.scraperService.fetchHistoricalData(resolvedTicker),
        this.scraperService.scrapeScreener(resolvedTicker),
      ]);

      // Use the canonical, cleaned ticker for the DB (e.g. INFY instead of INFOSYS or INFY.NS)
      const canonicalTicker = resolvedTicker.split('.')[0].toUpperCase();
      const stock = await this.prisma.stock.upsert({
        where: { ticker: canonicalTicker },
        update: {
          name: yf.name, price: yf.price, change: yf.change, changePercent: yf.changePercent,
          marketCap: sc?.marketCap ?? 0, roe: sc?.roe ?? 0, debtToEquity: sc?.debtToEquity ?? 0,
          lastUpdated: new Date(),
          stockPE: sc?.stockPE ?? 0, bookValue: sc?.bookValue ?? 0,
          financials: (sc?.financials as any) ?? {},
        },
        create: {
          ticker: canonicalTicker, name: yf.name, price: yf.price, change: yf.change, changePercent: yf.changePercent,
          marketCap: sc?.marketCap ?? 0, roe: sc?.roe ?? 0, debtToEquity: sc?.debtToEquity ?? 0,
          lastUpdated: new Date(),
          stockPE: sc?.stockPE ?? 0, bookValue: sc?.bookValue ?? 0,
          financials: (sc?.financials as any) ?? {},
        }
      });

      // Save History (Bulk insertion for better production performance)
      if (hist.length > 0) {
        await this.prisma.priceHistory.deleteMany({ where: { stockId: stock.id } });
        await this.prisma.priceHistory.createMany({
          data: hist.map(h => ({ ...h, stockId: stock.id }))
        });
      }

      // AI Analysis - Wrapped in try/catch to ensure core data availability even if AI fails
      let ai: any = null;
      try {
        const [news, social] = await Promise.all([
          this.scraperService.scrapeNews(ticker, stock.name, stock.sector?.name, 168),
          this.scraperService.scrapeReddit(ticker, stock.name, stock.sector?.name, 168),
        ]);
        const macro = await this.prisma.macroSignal.findMany();
        ai = await this.aiService.deepStockAnalysis(stock, hist, news, macro);
      } catch (err) {
        this.logger.warn(`[${ticker}] AI Research synchronization delayed: ${err.message}`);
      }

      if (ai && ai.summary) {
        await this.prisma.aIInsight.deleteMany({ where: { stockId: stock.id } });
        await this.prisma.aIInsight.create({
          data: {
            stockId: stock.id,
            summary: ai.summary,
            recommendation: ai.recommendation,
            intrinsicValue: ai.intrinsicValue,
            valuationScore: ai.valuationScore,
            riskScore: ai.riskScore,
            growthScore: ai.growthScore,
            sentimentScore: ai.sentimentScore,
            impactChain: ai.impactChain,
          }
        });
      }

      return this.prisma.stock.findUnique({
        where: { id: stock.id },
        include: {
          sector:     true,
          aiInsights: { orderBy: { precomputedAt: 'desc' }, take: 1 },
          priceHistory: { orderBy: { date: 'desc' }, take: 300 },
        },
      });

    } catch (e) {
      this.logger.error(`[${ticker}] fetchAndPersist failed: ${e.message}`);
      throw e;
    }
  }

  // ─── PRIVATE: Redis cache helper with auto-fetch on miss ────────────────────
  private async getCached<T>(key: string, fetcher: () => Promise<T>, ttlSeconds: number): Promise<T> {
    const cached = await this.cacheService.get<T>(key);
    if (cached) return cached;

    const fresh = await fetcher().catch(() => [] as unknown as T);
    await this.cacheService.set(key, fresh, ttlSeconds);
    return fresh;
  }
}
