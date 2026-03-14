import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { HttpService } from '@nestjs/axios';
import { firstValueFrom } from 'rxjs';

@Injectable()
export class AIService {
  private readonly logger = new Logger(AIService.name);
  private readonly apiKey: string;
  private readonly anthropicUrl = 'https://api.anthropic.com/v1/messages';

  constructor(
    private readonly configService: ConfigService,
    private readonly httpService: HttpService,
  ) {
    this.apiKey = this.configService.get<string>('ANTHROPIC_API_KEY') || '';
  }

  /**
   * Global Event Impact Engine
   * Maps macro events (wars, rate changes) to sector/company impacts
   */
  async analyzeGlobalImpact(eventDescription: string, affectedSectors: string[]) {
    const prompt = `
      Event: ${eventDescription}
      Sectors to evaluate: ${affectedSectors.join(', ')}
      
      Analyze the impact of this event. Map out the 'Impact Chain'.
      Example: 'War in Middle East -> Oil prices rise -> Airline margins fall -> Energy stocks rise'.
      
      Output format: JSON with keys: globalSummary, impactChains (array of strings), sectorOutlook (object mapping sector to POSITIVE/NEGATIVE/NEUTRAL).
    `;

    return this.callClaude(prompt, 'claude-3-opus-20240229');
  }

  async deepStockAnalysis(stockData: any, news: any[], macro: any[], sentiment: any[]) {
    const prompt = `
      Deep Research Analysis for ${stockData.ticker}
      
      Financials: ${JSON.stringify(stockData)}
      Recent News: ${JSON.stringify(news)}
      Macro Signals: ${JSON.stringify(macro)}
      Social Sentiment: ${JSON.stringify(sentiment)}
      
      Task: Perform a next-level investment summary.
      - Combine financial strength, news sentiment, sector outlook (IT/Bank/etc), and macro risk.
      - Calculate an estimated Intrinsic Value.
      - Predict next quarter's trajectory.
      
      Output JSON Format:
      {
        "summary": "Full professional summary",
        "sentimentScore": 0-100,
        "intrinsicValue": number,
        "marginOfSafety": "percentage string",
        "recommendation": "BUY|HOLD|SELL",
        "impactAnalysis": "How macro signals affect this specific stock"
      }
    `;

    return this.callClaude(prompt, 'claude-3-opus-20240229');
  }

  private async callClaude(prompt: string, model: string = 'claude-3-sonnet-20240229') {
    if (!this.apiKey || this.apiKey.includes('your_')) {
      this.logger.warn('Anthropic API Key not configured. Returning fallback.');
      return { summary: 'AI Analysis limited (No API Key)', sentimentScore: 50, recommendation: 'HOLD' };
    }

    try {
      const response = await firstValueFrom(
        this.httpService.post(
          this.anthropicUrl,
          {
            model: model,
            max_tokens: 1500,
            messages: [{ role: 'user', content: prompt }],
          },
          {
            headers: {
              'x-api-key': this.apiKey,
              'anthropic-version': '2023-06-01',
              'content-type': 'application/json',
            },
          },
        ),
      );
      return JSON.parse(response.data.content[0].text);
    } catch (error) {
      this.logger.error(`Claude API Error: ${error.message}`);
      return { error: 'Analysis failed' };
    }
  }
}
