import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { HttpModule } from '@nestjs/axios';
import { ScheduleModule } from '@nestjs/schedule';
import { PrismaService } from './prisma.service';
import { MarketService } from './market/market.service';
import { MacroService } from './market/macro.service';
import { ScraperService } from './market/scraper.service';
import { AIService } from './ai/ai.service';
import { IntelligenceService } from './ai/intelligence.service';
import { JobsService } from './jobs/jobs.service';
import { SeedService } from './seed.service';
import { CacheService } from './cache.service';
import { TerminalController } from './terminal/terminal.controller';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    HttpModule,
    ScheduleModule.forRoot(),
  ],
  controllers: [TerminalController],
  providers: [
    PrismaService,
    CacheService,
    MarketService,
    MacroService,
    ScraperService,
    AIService,
    IntelligenceService,
    JobsService,
    SeedService,
  ],
})
export class AppModule {}
