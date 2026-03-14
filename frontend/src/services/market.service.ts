import { STOCKS, TICKS, NEWS2 } from '../data';
import type { StockData, TickData, NewsItem } from '../types';

/**
 * Encapsulated API Service Pattern
 * Easily swap inside these methods to await `fetchClient` calls to NestJS Endpoint.
 * Currently uses mock timeout delays to simulate network propagation.
 */
class MarketService {
  /**
   * Example integration:
   * return fetchClient<StockData>(`/stocks/${ticker}`);
   */
  async getStockDetails(ticker: string): Promise<StockData> {
    return new Promise((resolve, reject) => {
      setTimeout(() => {
        const data = STOCKS[ticker.toUpperCase()];
        if (data) resolve(data);
        else reject(new Error('NOT_FOUND'));
      }, 300); // simulate latency
    });
  }

  async getAllStocks(): Promise<Record<string, StockData>> {
    return new Promise((resolve) => setTimeout(() => resolve(STOCKS), 100));
  }

  /**
   * Example integration for WebSocket updates or Polled Ticks:
   */
  async getMarketIndices(): Promise<TickData[]> {
    return new Promise((resolve) => setTimeout(() => resolve(TICKS), 150));
  }

  /**
   * Example integration for grabbing paginated Intelligence News strings:
   * GET /news?asset=${ticker}&limit=10
   */
  async getNewsFeed(_ticker: string): Promise<NewsItem[]> {
    return new Promise((resolve) => setTimeout(() => resolve(NEWS2 as NewsItem[]), 600));
  }
}

export const marketService = new MarketService();
