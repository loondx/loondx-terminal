import { Injectable, Logger } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { firstValueFrom } from 'rxjs';
import * as cheerio from 'cheerio';

@Injectable()
export class ScraperService {
  private readonly logger = new Logger(ScraperService.name);

  constructor(private readonly httpService: HttpService) {}

  /**
   * Scrapes Screener.in for financial data.
   * Best Practice: Only store structured essentials (ROE, Debt, etc.)
   */
  async scrapeScreener(ticker: string) {
    try {
      // Indian stock tickers on Screener usually follow a clean URL pattern
      const cleanTicker = ticker.split('.')[0]; 
      const url = `https://www.screener.in/company/${cleanTicker}/consolidated/`;
      
      this.logger.log(`Scraping financials from ${url}`);
      
      const response = await firstValueFrom(this.httpService.get(url, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/119.0.0.0 Safari/537.36'
        }
      }));

      const $ = cheerio.load(response.data);
      
      // Extraction logic for 'Key Points' / 'Essential Ratios'
      // These selectors are illustrative of a typical Screener.in layout
      const roe = parseFloat($('#top-ratios li:contains("ROE") .number').text()) || 0;
      const debtToEquity = parseFloat($('#top-ratios li:contains("Debt to equity") .number').text()) || 0;
      const eps = parseFloat($('#top-ratios li:contains("EPS") .number').text()) || 0;
      const marketCap = parseFloat($('#top-ratios li:contains("Market Cap") .number').text().replace(/,/g, '')) || 0;

      return { roe, debtToEquity, eps, marketCap };
    } catch (e) {
      this.logger.error(`Failed to scrape Screener for ${ticker}: ${e.message}`);
      return null;
    }
  }

  /**
   * Aggregates news from Google News feed.
   */
  async scrapeNews(ticker: string) {
    try {
      const url = `https://news.google.com/rss/search?q=${ticker}+stock&hl=en-IN&gl=IN&ceid=IN:en`;
      const response = await firstValueFrom(this.httpService.get(url));
      const $ = cheerio.load(response.data, { xmlMode: true });
      
      const items: any[] = [];
      $('item').slice(0, 10).each((_, el) => {
        items.push({
          title: $(el).find('title').text(),
          link: $(el).find('link').text(),
          pubDate: new Date($(el).find('pubDate').text()),
          source: $(el).find('source').text()
        });
      });
      return items;
    } catch (e) {
      this.logger.error(`News scrape failed for ${ticker}: ${e.message}`);
      return [];
    }
  }
}
