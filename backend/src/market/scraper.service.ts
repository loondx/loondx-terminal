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
      const cleanTicker = ticker.split('.')[0].toUpperCase(); 
      const url = `https://www.screener.in/company/${cleanTicker}/consolidated/`;
      
      this.logger.log(`Scraping real data from ${url}`);
      
      const response = await firstValueFrom(this.httpService.get(url, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/119.0.0.0 Safari/537.36'
        }
      }));

      const $ = cheerio.load(response.data);
      
      const getNumber = (label: string) => {
        const text = $(`li:contains("${label}") .number`).first().text().replace(/,/g, '').trim();
        return parseFloat(text) || 0;
      };

      const price = getNumber("Current Price");
      const marketCap = getNumber("Market Cap");
      const roe = getNumber("ROE");
      const debtToEquity = getNumber("Debt to equity");
      const eps = getNumber("EPS") || (getNumber("Stock P/E") > 0 ? (price / getNumber("Stock P/E")) : 0);
      const faceValue = getNumber("Face Value");

      // Extract Financial Tables
      const quarterly = this.parseTable($, '#quarters');
      const profitLoss = this.parseTable($, '#profit-loss');
      
      // Extract Announcements/News
      const announcements: any[] = [];
      $('#announcements .announcement').each((_, el) => {
        const date = $(el).find('.date').text().trim();
        const title = $(el).find('.title').text().trim();
        const link = $(el).find('a').attr('href');
        announcements.push({
          date,
          title,
          url: link ? (link.startsWith('http') ? link : `https://www.screener.in${link}`) : '#'
        });
      });

      return { 
        price, 
        marketCap, 
        roe, 
        debtToEquity, 
        eps, 
        faceValue,
        name: $('h1').first().text().trim() || cleanTicker,
        financials: {
          quarterly,
          profitLoss
        },
        announcements
      };
    } catch (e) {
      this.logger.error(`Failed to scrape Screener for ${ticker}: ${e.message}`);
      return null;
    }
  }

  private parseTable($: any, sectionId: string) {
    const section = $(sectionId);
    if (!section.length) return null;

    const table = section.find('table').first();
    const headers: string[] = [];
    table.find('thead th').each((i, el) => {
      if (i > 0) headers.push($(el).text().trim());
    });

    const rows: Record<string, (string | number)[]> = {};
    table.find('tbody tr').each((_, tr) => {
      const rowName = $(tr).find('td').first().text().trim();
      if (!rowName || rowName.includes('Raw Data')) return;

      const values: (string | number)[] = [];
      $(tr).find('td').each((i, td) => {
        if (i > 0) {
          const valText = $(td).text().trim().replace(/,/g, '').replace(/%/g, '');
          const val = parseFloat(valText);
          values.push(isNaN(val) ? valText : val);
        }
      });
      rows[rowName] = values;
    });

    return { headers, rows };
  }

  /**
   * Aggregates news from MULTIPLE high-signal, free sources:
   * 1. Google News (broad coverage)
   * 2. Economic Times Markets RSS
   * 3. Moneycontrol RSS
   * Deduplicates by title and sorts by date.
   */
  async scrapeNews(ticker: string) {
    const cleanTicker = ticker.split('.')[0];
    const query = encodeURIComponent(`${cleanTicker} stock`);

    const sources = [
      {
        label: 'Google News',
        url: `https://news.google.com/rss/search?q=${query}+NSE+BSE&hl=en-IN&gl=IN&ceid=IN:en`,
        itemSel: 'item',
        titleSel: 'title',
        linkSel: 'link',
        dateSel: 'pubDate',
        sourceSel: 'source',
      },
      {
        label: 'ET Markets',
        url: `https://economictimes.indiatimes.com/markets/stocks/rssfeeds/2146842.cms`,
        itemSel: 'item',
        titleSel: 'title',
        linkSel: 'link',
        dateSel: 'pubDate',
        sourceSel: null, // hardcode below
      },
      {
        label: 'Moneycontrol',
        url: `https://www.moneycontrol.com/rss/business.xml`,
        itemSel: 'item',
        titleSel: 'title',
        linkSel: 'link',
        dateSel: 'pubDate',
        sourceSel: null,
      },
    ];

    const seen = new Set<string>();
    const allItems: any[] = [];

    await Promise.allSettled(
      sources.map(async (src) => {
        try {
          const resp = await firstValueFrom(
            this.httpService.get(src.url, {
              headers: { 'User-Agent': 'Mozilla/5.0 (compatible; LOONDX/1.0)' },
              timeout: 6000,
            }),
          );
          const $ = cheerio.load(resp.data, { xmlMode: true });
          $(src.itemSel).slice(0, 12).each((_, el) => {
            const rawTitle = $(el).find(src.titleSel).text().trim();
            const title = rawTitle.replace(/<!\[CDATA\[|\]\]>/g, '').trim();
            // Only include items mentioning the ticker or company name
            if (!title.toUpperCase().includes(cleanTicker.toUpperCase()) &&
                !title.toLowerCase().includes(cleanTicker.toLowerCase())) return;

            const url = $(el).find(src.linkSel).text().trim() ||
                        $(el).find(src.linkSel).attr('href') || '#';
            const pubDate = $(el).find(src.dateSel).text();
            const source = src.sourceSel
              ? $(el).find(src.sourceSel).text() || src.label
              : src.label;

            // Deduplicate by normalized title
            const key = title.slice(0, 60).toLowerCase();
            if (!seen.has(key) && title.length > 10) {
              seen.add(key);
              allItems.push({
                headline: title,
                url,
                publishedAt: pubDate ? new Date(pubDate) : new Date(),
                source,
              });
            }
          });
        } catch (e) {
          this.logger.warn(`[${src.label}] feed failed: ${e.message}`);
        }
      }),
    );

    // Sort by date descending, newest first
    allItems.sort((a, b) => b.publishedAt.getTime() - a.publishedAt.getTime());

    this.logger.log(`Aggregated ${allItems.length} news items for ${cleanTicker} from ${sources.length} sources`);
    return allItems.slice(0, 20);
  }

  /**
   * Fetches official exchange filings from NSE.
   * These are the HIGHEST signal events — earnings, board meets, dividends, splits.
   */
  async scrapeExchangeFilings(ticker: string) {
    try {
      const cleanTicker = ticker.split('.')[0].toUpperCase();
      // NSE Corporate announcements (public endpoint)
      const url = `https://www.nseindia.com/api/corp-info?symbol=${cleanTicker}&corpType=announcements&market=equities`;

      const response = await firstValueFrom(
        this.httpService.get(url, {
          headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)',
            'Accept': 'application/json',
            'Referer': 'https://www.nseindia.com',
          },
          timeout: 6000,
        }),
      );

      const data = response.data?.data || [];
      return data.slice(0, 10).map((item: any) => ({
        title: item.subject || item.desc || 'Exchange Filing',
        date: item.an_dt || item.date,
        url: item.attchmntFile
          ? `https://nsearchives.nseindia.com/${item.attchmntFile}`
          : `https://www.nseindia.com/get-quotes/equity?symbol=${cleanTicker}`,
        source: 'NSE Official',
        category: 'EXCHANGE_FILING',
      }));
    } catch (e) {
      this.logger.warn(`NSE filings fetch failed for ${ticker}: ${e.message}`);
      return [];
    }
  }

  /**
   * Scrapes Reddit for the ticker mention in stock-related subreddits.
   */
  async scrapeReddit(ticker: string) {
    try {
      const cleanTicker = ticker.split('.')[0];
      const url = `https://www.reddit.com/r/IndianStockMarket+IndiaInvestments/search.rss?q=${cleanTicker}&restrict_sr=1&sort=new&limit=10`;

      this.logger.log(`Fetching Reddit sentiment for ${cleanTicker}...`);

      const response = await firstValueFrom(
        this.httpService.get(url, {
          headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
          },
          timeout: 6000,
        }),
      );
      const $ = cheerio.load(response.data, { xmlMode: true });

      const posts: any[] = [];
      $('entry').slice(0, 8).each((_, el) => {
        const title = $(el).find('title').text().replace(/<!\[CDATA\[|\]\]>/g, '').trim();
        if (!title) return;
        posts.push({
          title,
          url: $(el).find('link').attr('href'),
          author: $(el).find('author name').text(),
          publishedAt: new Date($(el).find('updated').text()),
          category: 'REDDIT',
        });
      });
      return posts;
    } catch (e) {
      this.logger.error(`Reddit fetch failed for ${ticker}: ${e.message}`);
      return [];
    }
  }
}
