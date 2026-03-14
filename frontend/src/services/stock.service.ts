import { fetchClient } from './api.config';

/**
 * StockDataService
 * Handles core stock price and metric fetching from the LOONDX Backend.
 */
class StockService {
  async getStockData(ticker: string) {
    return fetchClient<any>(`/terminal/dashboard/${ticker}`);
  }

  async getAllStocks() {
    try {
      return await fetchClient<any[]>('/terminal/stocks');
    } catch (error) {
      console.error('Failed to fetch stocks list:', error);
      return [];
    }
  }

  async getMarketStatus() {
    try {
      return await fetchClient<any>('/terminal/market-status');
    } catch (e) {
      console.error('Failed to fetch market status:', e);
      return { macro: [], trends: [], topGainers: [] };
    }
  }

  async refreshStock(ticker: string) {
    return fetchClient<any>(`/terminal/refresh/${ticker}`, { method: 'POST' });
  }

  async getInitData() {
    try {
      return await fetchClient<any>('/terminal/init');
    } catch (e) {
      console.error('Failed to fetch init market data:', e);
      return null;
    }
  }
}

export const stockService = new StockService();
