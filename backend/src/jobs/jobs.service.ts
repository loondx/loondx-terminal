import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { PrismaService } from '../prisma.service';
import { MarketService } from '../market/market.service';
import { MacroService } from '../market/macro.service';
import { AIService } from '../ai/ai.service';

@Injectable()
export class JobsService {
  private readonly logger = new Logger(JobsService.name);

  // Focus on top Indian Nifty 50 tickers
  private readonly priorityTickers = ['RELIANCE.NS', 'TCS.NS', 'HDFCBANK.NS', 'INFY.NS', 'ICICIBANK.NS', 'ADANIENT.NS', 'SBIN.NS'];

  constructor(
    private readonly prisma: PrismaService,
    private readonly marketService: MarketService,
    private readonly macroService: MacroService,
    private readonly aiService: AIService,
  ) {}

  @Cron(CronExpression.EVERY_5_MINUTES)
  async refreshRealtimeData() {
    this.logger.log('Refreshing realtime market and macro data...');
    
    // 1. Refresh Macro Signals (Global Events)
    const macroSignals = await this.macroService.getMacroSignals();
    for (const signal of macroSignals) {
      await this.prisma.macroSignal.upsert({
        where: { id: signal.name }, // Use name as ID for simplicity in demo
        update: { value: signal.value, change: signal.change, lastUpdated: new Date() },
        create: { id: signal.name, name: signal.name, value: signal.value, change: signal.change },
      });
    }

    // 2. Refresh Stock Prices & Volume
    for (const ticker of this.priorityTickers) {
      try {
        const details = await this.marketService.getStockDetails(ticker);
        await this.prisma.stock.update({
          where: { ticker },
          data: {
            price: details.price,
            changePercent: details.change_percent,
            volume: details.volume,
            lastUpdated: new Date(),
          },
        });
      } catch (e) {
        this.logger.warn(`Could not refresh ${ticker}, skipping...`);
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
        const news = await this.marketService.getNews(stock.ticker);
        const social = await this.macroService.getSocialSentiment(stock.ticker);
        
        const deepAnalysis = await this.aiService.deepStockAnalysis(stock, news, macroData, social);
        
        await this.prisma.aIInsight.create({
          data: {
            stockId: stock.id,
            summary: deepAnalysis.summary,
            sentimentScore: deepAnalysis.sentimentScore,
            intrinsicValue: deepAnalysis.intrinsicValue,
            recommendation: deepAnalysis.recommendation,
            impactChain: deepAnalysis.impactAnalysis,
            analysisType: 'DEEP_RESEARCH',
            expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000), // 24h expiration for deep research
          },
        });
        
        this.logger.log(`Deep AI research completed for ${stock.ticker}`);
      } catch (error) {
        this.logger.error(`Deep research failed for ${stock.ticker}: ${error.message}`);
      }
    }
  }
}
