// import { fetchClient } from './api.config';
import { STOCKS } from '../data';

/**
 * StockDataService
 * Handles core stock price and metric fetching.
 * Switch between simulated and real API based on VITE_API_URL.
 */
class StockService {
  private readonly baseUrl = 'http://localhost:3000/api/terminal';

  async getStockData(ticker: string) {
    try {
      const response = await fetch(`${this.baseUrl}/dashboard/${ticker}`);
      if (!response.ok) throw new Error('Backend failed');
      const data = await response.json();
      
      // Map backend structure to frontend expectation if needed
      // Or update frontend to use the new rich data package
      return data;
    } catch (error) {
      console.warn('Backend not available, falling back to mock data', error);
      return STOCKS[ticker] || STOCKS['AAPL'];
    }
  }

  async getMarketStatus() {
    try {
      const response = await fetch(`${this.baseUrl}/market-status`);
      return await response.json();
    } catch (e) {
      return { macro: [], topGainers: [] };
    }
  }
}

export const stockService = new StockService();
