import { Controller, Get, Param, NotFoundException } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { PrismaService } from '../prisma.service';

@ApiTags('terminal')
@Controller('api/terminal')
export class TerminalController {
  constructor(private readonly prisma: PrismaService) {}

  @Get('dashboard/:ticker')
  @ApiOperation({ summary: 'Get full dashboard data package for a specific stock' })
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
        upstream: { include: { dependsOn: true } },
        downstream: { include: { stock: true } },
      },
    });

    if (!stock) {
      throw new NotFoundException(`Stock ${ticker} not found in LOONDX Database.`);
    }

    const macroSignals = await this.prisma.macroSignal.findMany();
    const trends = await this.prisma.googleTrend.findMany({
      where: { isSpiking: true },
      take: 5
    });

    return {
      stock,
      macroSignals,
      activeTrends: trends,
      serverTime: new Date(),
    };
  }

  @Get('market-status')
  @ApiOperation({ summary: 'Get high-level market pulse' })
  async getMarketStatus() {
    const macro = await this.prisma.macroSignal.findMany();
    const trends = await this.prisma.googleTrend.findMany({ take: 10 });
    const topGainers = await this.prisma.stock.findMany({
      orderBy: { changePercent: 'desc' },
      take: 5,
    });
    return { macro, trends, topGainers };
  }
}
