import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { PrismaService } from '../prisma.service';
import { MarketService } from '../market/market.service';
import { MacroService } from '../market/macro.service';
import { ScraperService } from '../market/scraper.service';
import { AIService } from '../ai/ai.service';
import { IntelligenceService } from '../ai/intelligence.service';

@Injectable()
export class JobsService {
  private readonly logger = new Logger(JobsService.name);
  private readonly priorityTickers = ['RELIANCE.NS', 'TCS.NS', 'HDFCBANK.NS', 'INFY.NS', 'ICICIBANK.NS', 'ADANIENT.NS', 'SBIN.NS'];

  constructor(
    private readonly prisma: PrismaService,
    private readonly marketService: MarketService,
    private readonly macroService: MacroService,
    private readonly scraperService: ScraperService,
    private readonly aiService: AIService,
    private readonly intelligenceService: IntelligenceService,
  ) {}

  @Cron(CronExpression.EVERY_5_MINUTES)
  async refreshRealtimeData() {
    this.logger.log('Refreshing realtime market and macro data...');
    
    // 1. Macro Signals update
    const macroSignals = await this.macroService.getMacroSignals();
    for (const signal of macroSignals) {
      await this.prisma.macroSignal.upsert({
        where: { id: signal.name },
        update: { value: signal.value, change: signal.change, lastUpdated: new Date() },
        create: { id: signal.name, name: signal.name, value: signal.value, change: signal.change },
      });
    }

    // 2. Google Trends Spike Detection
    await this.intelligenceService.checkSearchSpikes(['Adani stock', 'Market Crash', 'Inflation India', 'Nifty 50']);

    // 3. Quick Price Refresh
    for (const ticker of this.priorityTickers) {
      try {
        const details = await this.marketService.getStockDetails(ticker);
        await this.prisma.stock.upsert({
          where: { ticker },
          update: {
            price: details.price,
            changePercent: details.change_percent,
            volume: details.volume, // Volume now in schema
            lastUpdated: new Date(),
          },
          create: {
            ticker,
            name: ticker.split('.')[0],
            price: details.price,
            changePercent: details.change_percent,
            volume: details.volume,
          }
        });
      } catch (e) {
        this.logger.warn(`Could not refresh ${ticker}: ${e.message}`);
      }
    }
  }

  @Cron(CronExpression.EVERY_DAY_AT_MIDNIGHT)
  async refreshFinancialsAndSectors() {
    this.logger.log('Starting Daily Financial & Sector sync...');
    for (const ticker of this.priorityTickers) {
      try {
        const financials = await this.scraperService.scrapeScreener(ticker);
        if (financials) {
          // Derive EPS from PE if possible
          const currentStock = await this.prisma.stock.findUnique({ where: { ticker } });
          const eps = financials.stockPE > 0 && currentStock?.price 
            ? parseFloat((currentStock.price / financials.stockPE).toFixed(2)) 
            : 0;

          await this.prisma.stock.update({
            where: { ticker },
            data: {
              roe: financials.roe,
              debtToEquity: financials.debtToEquity,
              eps,
              marketCap: financials.marketCap,
              stockPE: financials.stockPE,
              bookValue: financials.bookValue,
            },
          });
          this.logger.log(`Updated financials for ${ticker} via Screener.in`);
        }
      } catch (e) {
        this.logger.error(`Error updating financials for ${ticker}: ${e.message}`);
      }
    }
  }

  @Cron('0 0 */12 * * *') // Twice daily deep AI dive
  async generateNextLevelInsights() {
    this.logger.log('Starting Next-Level AI Production Analysis...');
    const stocks = await this.prisma.stock.findMany({ include: { sector: true } });
    const macroData = await this.prisma.macroSignal.findMany();

    for (const stock of stocks) {
      try {
        const rssNews = await this.scraperService.scrapeNews(stock.ticker);
        const history = await this.scraperService.fetchHistoricalData(stock.ticker);
        
        // Aligned with New AIService signature: (stockData, historical, news, macro)
        const deepAnalysis = await this.aiService.deepStockAnalysis(
          stock, 
          history, 
          rssNews, 
          macroData
        );
        
        await this.prisma.aIInsight.create({
          data: {
            stockId: stock.id,
            summary: deepAnalysis.summary,
            recommendation: deepAnalysis.recommendation,
            intrinsicValue: deepAnalysis.intrinsicValue,
            valuationScore: deepAnalysis.valuationScore,
            riskScore: deepAnalysis.riskScore,
            growthScore: deepAnalysis.growthScore,
            sentimentScore: deepAnalysis.sentimentScore,
            impactChain: deepAnalysis.impactChain,
            analysisType: 'DEEP_RESEARCH',
            expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
          },
        });
        
        this.logger.log(`Deep AI research completed for ${stock.ticker}`);
      } catch (error) {
        this.logger.error(`Deep research failed for ${stock.ticker}: ${error.message}`);
      }
    }
  }
}
