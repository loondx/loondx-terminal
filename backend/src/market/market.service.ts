import { Injectable, Logger } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { ConfigService } from '@nestjs/config';
import { firstValueFrom } from 'rxjs';

@Injectable()
export class MarketService {
  private readonly logger = new Logger(MarketService.name);
  private readonly baseUrl = 'https://stock.indianapi.in';
  private readonly apiKey: string;

  constructor(
    private readonly httpService: HttpService,
    private readonly configService: ConfigService,
  ) {
    this.apiKey = this.configService.get<string>('INDIAN_API_KEY') || '';
  }

  async getStockDetails(stock_name: string) {
    try {
      const response = await firstValueFrom(
        this.httpService.get(`${this.baseUrl}/stock`, {
          params: { stock_name },
          headers: { 'X-Api-Key': this.apiKey },
        }),
      );
      return response.data;
    } catch (error) {
      this.logger.error(`Error fetching stock details for ${stock_name}: ${error.message}`);
      throw error;
    }
  }

  async getFinancials(stock_name: string) {
    try {
      const response = await firstValueFrom(
        this.httpService.get(`${this.baseUrl}/statement`, {
          params: { stock_name },
          headers: { 'X-Api-Key': this.apiKey },
        }),
      );
      return response.data;
    } catch (error) {
      this.logger.error(`Error fetching financials for ${stock_name}: ${error.message}`);
      throw error;
    }
  }

  async getNews(stock_name: string) {
    try {
      const response = await firstValueFrom(
        this.httpService.get(`${this.baseUrl}/news`, {
          params: { stock_name },
          headers: { 'X-Api-Key': this.apiKey },
        }),
      );
      return response.data;
    } catch (error) {
      this.logger.error(`Error fetching news for ${stock_name}: ${error.message}`);
      throw error;
    }
  }

  async getHistoricalData(stock_name: string, period: string = '1mo') {
    try {
      const response = await firstValueFrom(
        this.httpService.get(`${this.baseUrl}/historical_data`, {
          params: { stock_name, period },
          headers: { 'X-Api-Key': this.apiKey },
        }),
      );
      return response.data;
    } catch (error) {
      this.logger.error(`Error fetching historical data for ${stock_name}: ${error.message}`);
      throw error;
    }
  }
}
