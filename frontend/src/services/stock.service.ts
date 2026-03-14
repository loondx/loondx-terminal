// import { fetchClient } from './api.config';
import { STOCKS } from '../data';

/**
 * StockDataService
 * Handles core stock price and metric fetching.
 * Switch between simulated and real API based on VITE_API_URL.
 */
class StockService {
  async getStockData(ticker: string) {
    // In production, we would call our backend:
    // return fetchClient(`/stocks/${ticker}`);
    
    // For now, return from our data layer with a simulated delay
    return new Promise((resolve) => {
      setTimeout(() => {
        resolve(STOCKS[ticker] || STOCKS['AAPL']);
      }, 300);
    });
  }

  async getNews(_ticker: string) {
    // Simulated news fetch
    return new Promise((resolve) => {
      setTimeout(() => {
        // Return simulated news (or calling /news endpoint)
        resolve([]);
      }, 500);
    });
  }
}

export const stockService = new StockService();
