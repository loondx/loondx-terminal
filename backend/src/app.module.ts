import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { HttpModule } from '@nestjs/axios';
import { ScheduleModule } from '@nestjs/schedule';
import { PrismaService } from './prisma.service';
import { MarketService } from './market/market.service';
import { MacroService } from './market/macro.service';
import { AIService } from './ai/ai.service';
import { JobsService } from './jobs/jobs.service';
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
    MarketService,
    MacroService,
    AIService,
    JobsService,
  ],
})
export class AppModule {}
