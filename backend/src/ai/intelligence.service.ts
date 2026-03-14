import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma.service';
import { AIService } from '../ai/ai.service';

@Injectable()
export class IntelligenceService {
  private readonly logger = new Logger(IntelligenceService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly ai: AIService,
  ) {}

  /**
   * Supply Chain / Dependency Mapping logic.
   * Connects stocks like Airline -> Oil -> Energy.
   */
  async mapDependencies(ticker: string) {
    const stock = await this.prisma.stock.findUnique({ where: { ticker } });
    if (!stock) return;

    // In a real system, we'd query a dependency DB or use AI to discover them.
    // Example logic based on Sector.
    const sectors = await this.prisma.sector.findMany();
    // Logic: Airlines depend on Energy sector stocks.
  }

  /**
   * Global Event Impact Engine
   * The "Bloomberg Beater" feature.
   */
  async processGlobalEvent(event: { name: string; description: string; sectors: string[] }) {
    this.logger.log(`Processing Global Event: ${event.name}`);
    
    // 1. Ask AI to analyze the ripple effect
    const analysis = await this.ai.analyzeGlobalImpact(event.description, event.sectors);
    
    // 2. Store the macro signal impact
    await this.prisma.macroSignal.create({
      data: {
        name: event.name,
        value: 0, // Event magnitude
        impact: JSON.stringify(analysis.impactChains),
      }
    });

    // 3. Update Sector Sentiment
    if (analysis.sectorOutlook) {
      for (const [sectorName, outlook] of Object.entries(analysis.sectorOutlook)) {
        await this.prisma.sector.upsert({
          where: { name: sectorName },
          update: { sentiment: outlook as string },
          create: { name: sectorName, sentiment: outlook as string }
        });
      }
    }

    return analysis;
  }

  /**
   * Google Trends Spike Detection
   */
  async checkSearchSpikes(terms: string[]) {
    // In production, use Google Trends API or scraping.
    for (const term of terms) {
      // Simulation of a spike detection
      const score = Math.floor(Math.random() * 100);
      const isSpiking = score > 80;
      
      await this.prisma.googleTrend.upsert({
        where: { term },
        update: { score, isSpiking, lastUpdated: new Date() },
        create: { term, score, isSpiking }
      });
    }
  }
}
