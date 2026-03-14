import { Injectable, Logger } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { firstValueFrom } from 'rxjs';
import * as cheerio from 'cheerio';

@Injectable()
export class ScraperService {
  private readonly logger = new Logger(ScraperService.name);

  constructor(private readonly httpService: HttpService) {}

  /**
   * Fetches historical OHLC (1 month) for trend analysis.
   */
  async fetchHistoricalData(ticker: string): Promise<any[]> {
    try {
      const yfTicker = ticker.includes('.') ? ticker : `${ticker}.NS`;
      // Fetch 1 year of daily data to support multiple timeframes
      const url = `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(yfTicker)}?interval=1d&range=1y`;

      const response = await firstValueFrom(
        this.httpService.get(url, {
          headers: { 'User-Agent': 'Mozilla/5.0' },
          timeout: 8000,
        }),
      );

      const result = response.data?.chart?.result?.[0];
      if (!result) return [];

      const timestamps = result.timestamp || [];
      const quote = result.indicators.quote[0];
      const adjClose = result.indicators.adjclose?.[0]?.adjclose || quote.close;

      return timestamps.map((ts: number, i: number) => ({
        date: new Date(ts * 1000),
        open: quote.open[i],
        high: quote.high[i],
        low: quote.low[i],
        close: adjClose[i],
        volume: quote.volume[i],
      })).filter((x: any) => x.close != null);
    } catch (e) {
      this.logger.error(`Historical fetch failed for ${ticker}: ${e.message}`);
      return [];
    }
  }

  /**
   * Fetches the REAL-TIME price from Yahoo Finance API.
   */
  async fetchLivePrice(ticker: string): Promise<{ symbol: string; price: number; change: number; changePercent: number; name: string; exchange: string; dayLow?: number; dayHigh?: number } | null> {
    try {
      const yfTicker = ticker.includes('.') ? ticker : `${ticker}.NS`;
      const url = `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(yfTicker)}?interval=1d&range=1d`;

      const response = await firstValueFrom(
        this.httpService.get(url, {
          headers: { 'User-Agent': 'Mozilla/5.0' },
          timeout: 8000,
        }),
      );

      const meta = response.data?.chart?.result?.[0]?.meta;
      if (!meta) return null;

      const price  = meta.regularMarketPrice ?? meta.previousClose ?? 0;
      const prev   = meta.chartPreviousClose ?? meta.previousClose ?? price;
      const change = parseFloat((price - prev).toFixed(2));
      const changePct = prev > 0 ? parseFloat(((change / prev) * 100).toFixed(2)) : 0;

      return {
        symbol: yfTicker,
        price,
        change,
        changePercent: changePct,
        name: meta.longName || meta.shortName || ticker,
        exchange: meta.exchangeName || 'NSE',
        dayLow: meta.regularMarketDayLow,
        dayHigh: meta.regularMarketDayHigh,
      };
    } catch (e) {
      this.logger.warn(`Yahoo Finance direct fetch failed for ${ticker}. Attempting symbol lookup...`);
      
      // Fallback: Try searching for the symbol
      try {
        const searchUrl = `https://query2.finance.yahoo.com/v1/finance/search?q=${encodeURIComponent(ticker)}`;
        const searchResp = await firstValueFrom(
          this.httpService.get(searchUrl, {
            headers: { 'User-Agent': 'Mozilla/5.0' },
            timeout: 5000,
          }),
        );
        const quotes = searchResp.data?.quotes || [];
        // Filters for Indian exchanges or high relevance
        const match = quotes.find((q: any) => q.exchange === 'NSI' || q.exchange === 'BSE') || quotes[0];
        
        if (match && match.symbol) {
          this.logger.log(`Found matching symbol for "${ticker}": ${match.symbol}`);
          return this.fetchLivePrice(match.symbol); // Re-fetch with correct symbol
        }
      } catch (searchError) {
        this.logger.error(`Symbol lookup failed for ${ticker}: ${searchError.message}`);
      }
      
      return null;
    }
  }

  /**
   * Scrapes Screener.in for FUNDAMENTALS ONLY.
   */
  async scrapeScreener(ticker: string) {
    try {
      const cleanTicker = ticker.split('.')[0].toUpperCase();
      const url = `https://www.screener.in/company/${cleanTicker}/consolidated/`;
      let response;
      try {
        response = await firstValueFrom(this.httpService.get(url, {
          headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/119.0.0.0 Safari/537.36'
          },
          timeout: 10000,
        }));
      } catch (e) {
        if (e.response?.status === 404) {
          this.logger.warn(`Screener 404 for ${cleanTicker}. Falling back to search API...`);
          const sUrl = `https://www.screener.in/api/company/search/?q=${encodeURIComponent(cleanTicker)}`;
          const sResp = await firstValueFrom(this.httpService.get(sUrl, {
            headers: { 'User-Agent': 'Mozilla/5.0' },
            timeout: 5000,
          }));
          const results = sResp.data || [];
          if (results.length > 0) {
            const best = results[0].url; // e.g. "/company/INFY/"
            this.logger.log(`Found better Screener target for ${cleanTicker} -> ${best}`);
            const fUrl = `https://www.screener.in${best}consolidated/`;
            response = await firstValueFrom(this.httpService.get(fUrl, {
              headers: { 'User-Agent': 'Mozilla/5.0' },
              timeout: 10000,
            }));
          } else {
            throw e;
          }
        } else {
          throw e;
        }
      }

      const $ = cheerio.load(response.data);
      
      // Screener stores key ratios in <li> elements like:
      // <li> Market Cap <span class="number">1,23,456</span> </li>
      const getNumber = (label: string) => {
        // Try multiple selector patterns Screener uses
        const selectors = [
          `li:contains("${label}") span.number`,
          `li:contains("${label}") .number`,
          `#top-ratios li:contains("${label}") span`,
        ];
        for (const sel of selectors) {
          const text = $(sel).first().text().replace(/,/g, '').replace(/%/g, '').trim();
          const num = parseFloat(text);
          if (!isNaN(num) && num !== 0) return num;
        }
        return 0;
      };

      const marketCap    = getNumber('Market Cap');
      const roe          = getNumber('ROE');
      const debtToEquity = getNumber('Debt to equity');
      const stockPE      = getNumber('Stock P/E');
      const bookValue    = getNumber('Book Value');
      const faceValue    = getNumber('Face Value');

      // Get company name from Screener page title / h1
      const name = $('h1.margin-0').first().text().trim() ||
                   $('h1').first().text().trim() ||
                   cleanTicker;

      // Financial tables
      const quarterly  = this.parseTable($, '#quarters');
      const profitLoss = this.parseTable($, '#profit-loss');
      const balanceSheet = this.parseTable($, '#balance-sheet');

      // EPS derived from P/E and price (we'll fill price from Yahoo later)
      // Announcements from Screener
      const announcements: any[] = [];
      $('#announcements .announcement').each((_, el) => {
        const date  = $(el).find('.date').text().trim();
        const title = $(el).find('.title').text().trim();
        const link  = $(el).find('a').attr('href');
        if (title) {
          announcements.push({
            date,
            title,
            url: link ? (link.startsWith('http') ? link : `https://www.screener.in${link}`) : '#',
          });
        }
      });

      return {
        // NOTE: price is NOT set here — caller should use fetchLivePrice()
        price: 0,
        marketCap,
        roe,
        debtToEquity,
        stockPE,
        bookValue,
        faceValue,
        name,
        financials: { quarterly, profitLoss, balanceSheet },
        announcements,
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
    table.find('tr').each((_, tr) => {
      // Robust row label detection: check first <td> but handle nested buttons/spans
      const firstTd = $(tr).find('td').first();
      let rowName = firstTd.text().trim() || firstTd.find('button').text().trim() || firstTd.find('span').text().trim();
      
      // Intensive cleaning of labels (remove symbols like + and large whitespace)
      rowName = rowName.replace(/[+]/g, '').replace(/\s\s+/g, ' ').trim();
      
      // Skip utility rows but KEEP all financial metrics
      if (!rowName || rowName.toLowerCase().includes('raw data') || rowName.toLowerCase().includes('pdf') || rowName.length < 2) return;

      const values: (string | number)[] = [];
      $(tr).find('td').each((i, td) => {
        if (i > 0) {
          const valText = $(td).text().trim().replace(/,/g, '').replace(/%/g, '');
          const val = parseFloat(valText);
          values.push(isNaN(val) ? valText : val);
        }
      });
      
      if (values.length > 0) {
        rows[rowName] = values;
      }
    });
    
    // Safety check: ensure Net Profit is captured if it exists as a <th> or weirdly formatted row
    if (!rows['Net Profit']) {
      table.find('tr:contains("Net Profit")').each((_, tr) => {
          const values: (string | number)[] = [];
          $(tr).find('td:not(:first-child)').each((_, td) => {
              const valText = $(td).text().trim().replace(/,/g, '').replace(/%/g, '');
              values.push(parseFloat(valText) || 0);
          });
          if (values.length > 0) rows['Net Profit'] = values;
      });
    }

    return { headers, rows };
  }

  /**
   * Aggregates news from MULTIPLE high-signal, free sources:
   * 1. Google News (broad coverage)
   * 2. Economic Times Markets RSS
   * 3. Moneycontrol RSS
   * Deduplicates by title and sorts by date.
   */
  /**
   * Aggregates financial news from multiple RSS sources (Google, ET, MC).
   * Broadened to include company name and sector context for maximum signal.
   */
  async scrapeNews(ticker: string, companyName?: string, sector?: string, withinHours: number = 48) {
    const cleanTicker = ticker.split('.')[0];
    const searchTerm = companyName ? `${companyName} stock` : `${cleanTicker} stock`;
    const sectorQuery = sector ? ` OR "${sector} sector"` : '';
    const query = encodeURIComponent(`${searchTerm}${sectorQuery}`);

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
        sourceSel: null,
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
      {
        label: 'Yahoo Finance',
        url: `https://finance.yahoo.com/rss/headline?s=${cleanTicker}`,
        itemSel: 'item',
        titleSel: 'title',
        linkSel: 'link',
        dateSel: 'pubDate',
        sourceSel: null,
      },
      {
        label: 'Business Standard',
        url: `https://www.business-standard.com/rss/markets-106.rss`,
        itemSel: 'item',
        titleSel: 'title',
        linkSel: 'link',
        dateSel: 'pubDate',
        sourceSel: null,
      },
    ];

    const seen = new Set<string>();
    const allItems: any[] = [];
    const now = Date.now();
    const cutoff = withinHours > 0 ? now - (withinHours * 60 * 60 * 1000) : 0;

    await Promise.allSettled(
      sources.map(async (src) => {
        try {
          const resp = await firstValueFrom(
            this.httpService.get(src.url, {
              headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36' },
              timeout: 7000,
            }),
          );
          const $ = cheerio.load(resp.data, { xmlMode: true });
          $(src.itemSel).slice(0, 20).each((_, el) => {
            const rawTitle = $(el).find(src.titleSel).text().trim();
            const title = rawTitle.replace(/<!\[CDATA\[|\]\]>/g, '').trim();
            
            // Relevancy check: Match Ticker OR Company Name OR Sector (if query was sector-incl)
            const matchesTicker = title.toUpperCase().includes(cleanTicker.toUpperCase());
            const matchesCompany = companyName && title.toLowerCase().includes(companyName.toLowerCase());
            const matchesSector = sector && title.toLowerCase().includes(sector.toLowerCase());

            if (!matchesTicker && !matchesCompany && !matchesSector && src.label === 'Google News') return;

            const url = $(el).find(src.linkSel).text().trim() ||
                        $(el).find(src.linkSel).attr('href') || '#';
            const pubDateStr = $(el).find(src.dateSel).text();
            const pubDate = pubDateStr ? new Date(pubDateStr) : new Date();

            if (cutoff > 0 && pubDate.getTime() < cutoff) return;

            const source = src.sourceSel ? $(el).find(src.sourceSel).text() || src.label : src.label;

            const key = title.slice(0, 64).toLowerCase();
            if (!seen.has(key) && title.length > 10) {
              seen.add(key);
              allItems.push({
                headline: title,
                url,
                publishedAt: pubDate,
                source,
                isSectorNews: !matchesTicker && !matchesCompany && matchesSector
              });
            }
          });
        } catch (e) {
          this.logger.warn(`[${src.label}] feed failed: ${e.message}`);
        }
      }),
    );

    allItems.sort((a, b) => b.publishedAt.getTime() - a.publishedAt.getTime());
    return allItems.slice(0, 40);
  }

  /**
   * Fetches official exchange filings from NSE.
   */
  async scrapeExchangeFilings(ticker: string, withinHours: number = 72) { // Filings slightly longer window
    try {
      const cleanTicker = ticker.split('.')[0].toUpperCase();
      const url = `https://www.nseindia.com/api/corp-info?symbol=${cleanTicker}&corpType=announcements&market=equities`;

      const response = await firstValueFrom(
        this.httpService.get(url, {
          headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
            'Accept': 'application/json',
            'Referer': 'https://www.nseindia.com',
          },
          timeout: 6000,
        }),
      );

      const data = response.data?.data || [];
      const cutoff = withinHours > 0 ? Date.now() - (withinHours * 60 * 60 * 1000) : 0;

      return data
        .filter((item: any) => {
          if (cutoff <= 0) return true;
          const dt = new Date(item.an_dt || item.date);
          return dt.getTime() >= cutoff;
        })
        .slice(0, 15)
        .map((item: any) => ({
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
   * Scrapes Reddit for recent sentiment (48h).
   * Expanded to multiple subreddits and includes sector context.
   */
  async scrapeReddit(ticker: string, sector?: string, withinHours: number = 48) {
    try {
      const cleanTicker = ticker.split('.')[0];
      const sectorQuery = sector ? ` OR "${sector}"` : '';
      const query = encodeURIComponent(`(${cleanTicker}${sectorQuery})`);
      
      // Target high-signal retail investor hubs
      const subreddits = 'IndianStockMarket+IndiaInvestments+pennystocks+stocks+wallstreetbets';
      const url = `https://www.reddit.com/r/${subreddits}/search.rss?q=${query}&restrict_sr=1&sort=new&limit=25`;

      const response = await firstValueFrom(
        this.httpService.get(url, {
          headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36' },
          timeout: 7000,
        }),
      );
      const $ = cheerio.load(response.data, { xmlMode: true });
      const cutoff = withinHours > 0 ? Date.now() - (withinHours * 60 * 60 * 1000) : 0;

      const posts: any[] = [];
      const seen = new Set<string>();

      $('entry').each((_, el) => {
        const title = $(el).find('title').text().replace(/<!\[CDATA\[|\]\]>/g, '').trim();
        const pubDate = new Date($(el).find('updated').text());
        
        if (!title || title.length < 5) return;
        if (cutoff > 0 && pubDate.getTime() < cutoff) return;

        const url = $(el).find('link').attr('href');
        const key = title.slice(0, 50).toLowerCase();
        
        if (!seen.has(key)) {
          seen.add(key);
          posts.push({
            title,
            url,
            author: $(el).find('author name').text() || 'anon',
            publishedAt: pubDate,
            category: 'REDDIT',
          });
        }
      });
      return posts.slice(0, 20);
    } catch (e) {
      this.logger.error(`Reddit fetch failed for ${ticker}: ${e.message}`);
      return [];
    }
  }
}
