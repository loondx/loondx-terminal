import { Injectable, OnModuleInit, Logger } from '@nestjs/common';
import { PrismaService } from './prisma.service';

@Injectable()
export class SeedService implements OnModuleInit {
  private readonly logger = new Logger(SeedService.name);

  constructor(private readonly prisma: PrismaService) {}

  async onModuleInit() {
    this.logger.log('Seeding initial market data...');
    
    // Seed Sectors
    const sectors = [
      { name: 'Energy', sentiment: 'BULLISH', macroContext: 'Strong global demand and rising refining margins.' },
      { name: 'IT Services', sentiment: 'NEUTRAL', macroContext: 'Muted discretionary spending in US/Europe.' },
      { name: 'Banking', sentiment: 'BULLISH', macroContext: 'Credit growth remains robust, NPAs at multi-year lows.' },
      { name: 'Auto', sentiment: 'BULLISH', macroContext: 'EV transition and premiumization driving growth.' }
    ];

    for (const s of sectors) {
      await this.prisma.sector.upsert({
        where: { name: s.name },
        update: {},
        create: s
      });
    }

    const energySector = await this.prisma.sector.findUnique({ where: { name: 'Energy' } });
    const itSector = await this.prisma.sector.findUnique({ where: { name: 'IT Services' } });
    const bankingSector = await this.prisma.sector.findUnique({ where: { name: 'Banking' } });

    // Seed Priority Stocks
    const stocks = [
      { ticker: 'RELIANCE.NS', name: 'Reliance Industries', sectorId: energySector?.id, price: 1312.45, changePercent: 1.2, volume: 8400000 },
      { ticker: 'TCS.NS', name: 'Tata Consultancy Services', sectorId: itSector?.id, price: 4120.30, changePercent: 0.8, volume: 2100000 },
      { ticker: 'HDFCBANK.NS', name: 'HDFC Bank', sectorId: bankingSector?.id, price: 1745.20, changePercent: -0.5, volume: 12500000 }
    ];

    for (const s of stocks) {
      await this.prisma.stock.upsert({
        where: { ticker: s.ticker },
        update: {},
        create: s
      });
    }

    // Seed Macro Signals
    const macro = [
      { name: 'Oil Price (Brent)', value: 78.4, unit: ' USD', change: 1.2 },
      { name: 'USD/INR', value: 84.32, unit: '', change: 0.04 },
      { name: 'Nifty 50', value: 24323, unit: '', change: 0.68 },
      { name: 'RBI Repo Rate', value: 6.5, unit: '%', change: 0 }
    ];

    for (const m of macro) {
      await this.prisma.macroSignal.upsert({
        where: { id: m.name },
        update: {},
        create: { id: m.name, ...m }
      });
    }

    this.logger.log('Seeding completed.');
  }
}
