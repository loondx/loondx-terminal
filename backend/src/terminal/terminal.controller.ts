import { Controller, Get, Param, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma.service';

@Controller('api/terminal')
export class TerminalController {
  constructor(private readonly prisma: PrismaService) {}

  @Get('dashboard/:ticker')
  async getDashboardData(@Param('ticker') ticker: string) {
    const stock = await this.prisma.stock.findUnique({
      where: { ticker },
      include: {
        sector: true,
        aiInsights: {
          orderBy: { precomputedAt: 'desc' },
          take: 1,
        },
        news: {
          orderBy: { publishedAt: 'desc' },
          take: 15,
        },
        tweets: { take: 5 },
        redditPosts: { take: 5 },
      },
    });

    if (!stock) {
      // For initial onboarding/production, if not found, we might trigger a background fetch
      throw new NotFoundException(`Stock ${ticker} not found in LOONDX Database.`);
    }

    // Also include global macro signals for the dashboard header/sidebar
    const macroSignals = await this.prisma.macroSignal.findMany();

    return {
      stock,
      macroSignals,
      serverTime: new Date(),
    };
  }

  @Get('market-status')
  async getMarketStatus() {
    const macro = await this.prisma.macroSignal.findMany();
    const topGainers = await this.prisma.stock.findMany({
      orderBy: { changePercent: 'desc' },
      take: 5,
    });
    return { macro, topGainers };
  }
}
