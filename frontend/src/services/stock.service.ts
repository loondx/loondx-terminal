/**
 * StockDataService
 * Handles core stock price and metric fetching from the LOONDX Backend.
 */
class StockService {
  private readonly baseUrl = 'http://localhost:3000/api/terminal';

  async getStockData(ticker: string) {
    try {
      const response = await fetch(`${this.baseUrl}/dashboard/${ticker}`);
      if (!response.ok) throw new Error('Backend failed');
      return await response.json();
    } catch (error) {
      console.error('Failed to fetch stock data:', error);
      throw error;
    }
  }

  async getAllStocks() {
    try {
      const response = await fetch(`${this.baseUrl}/stocks`);
      if (!response.ok) throw new Error('Backend failed');
      return await response.json();
    } catch (error) {
      console.error('Failed to fetch stocks list:', error);
      return [];
    }
  }

  async getMarketStatus() {
    try {
      const response = await fetch(`${this.baseUrl}/market-status`);
      if (!response.ok) throw new Error('Backend failed');
      return await response.json();
    } catch (e) {
      console.error('Failed to fetch market status:', e);
      return { macro: [], trends: [], topGainers: [] };
    }
  }
}

export const stockService = new StockService();
