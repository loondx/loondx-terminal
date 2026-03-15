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
      // Fetch 5 years of daily data to support 1D/1M/3M/6M/1Y/2Y/3Y/5Y/MAX timeframes
      const url = `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(yfTicker)}?interval=1d&range=5y`;

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
   * Fetches the REAL-TIME price.
   * Priority: NSE India API (official) → Google Finance → Yahoo Finance
   */
  async fetchLivePrice(ticker: string): Promise<{ symbol: string; price: number; change: number; changePercent: number; name: string; exchange: string; dayLow?: number; dayHigh?: number; vwap?: number; weekHigh52?: number; weekLow52?: number; deliveryPct?: number; } | null> {
    const cleanTicker = ticker.split('.')[0].toUpperCase();
    
    // 1. Try NSE India API (official exchange — most accurate)
    const nseData = await this.fetchNSEPrice(cleanTicker);
    if (nseData) return nseData;

    // 2. Fallback: Google Finance scrape
    const googleData = await this.fetchGooglePrice(cleanTicker);
    
    try {
      const yfTicker = ticker.includes('.') ? ticker : `${ticker}.NS`;
      const url = `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(yfTicker)}?interval=1d&range=1d`;

      const response = await firstValueFrom(
        this.httpService.get(url, {
          headers: { 'User-Agent': 'Mozilla/5.0' },
          timeout: 5000,
        }),
      );

      const meta = response.data?.chart?.result?.[0]?.meta;
      
      if (googleData && meta) {
        const price = googleData.price;
        const prev = meta.chartPreviousClose ?? meta.previousClose ?? price;
        const change = parseFloat((price - prev).toFixed(2));
        const changePct = prev > 0 ? parseFloat(((change / prev) * 100).toFixed(2)) : 0;
        return {
          symbol: yfTicker, price, change, changePercent: changePct,
          name: meta.longName || meta.shortName || cleanTicker,
          exchange: 'NSE', dayLow: meta.regularMarketDayLow, dayHigh: meta.regularMarketDayHigh,
        };
      }

      if (meta) {
        const price  = meta.regularMarketPrice ?? meta.previousClose ?? 0;
        const prev   = meta.chartPreviousClose ?? meta.previousClose ?? price;
        const change = parseFloat((price - prev).toFixed(2));
        const changePct = prev > 0 ? parseFloat(((change / prev) * 100).toFixed(2)) : 0;
        return {
          symbol: yfTicker, price, change, changePercent: changePct,
          name: meta.longName || meta.shortName || ticker,
          exchange: 'NSE', dayLow: meta.regularMarketDayLow, dayHigh: meta.regularMarketDayHigh,
        };
      }
    } catch (e) {
      this.logger.warn(`Yahoo metadata fetch failed for ${ticker}. Returning Google data if available.`);
    }

    return googleData;
  }

  /**
   * NSE India official API — the most accurate source for Indian equities.
   * Requires a session cookie warm-up (GET homepage first, then hit the API).
   */
  private async fetchNSEPrice(ticker: string): Promise<any> {
    try {
      // Step 1: Warm up session to get cookies
      const warmupResp = await firstValueFrom(
        this.httpService.get('https://www.nseindia.com', {
          headers: this.nseHeaders(),
          timeout: 5000,
        }),
      );
      const rawCookies: string[] = warmupResp.headers['set-cookie'] || [];
      const cookieStr = rawCookies.map((c: string) => c.split(';')[0]).join('; ');

      // Step 2: Hit the quote API with the session cookie
      const apiResp = await firstValueFrom(
        this.httpService.get(
          `https://www.nseindia.com/api/quote-equity?symbol=${encodeURIComponent(ticker)}`,
          {
            headers: { ...this.nseHeaders(), Cookie: cookieStr },
            timeout: 5000,
          },
        ),
      );

      const d = apiResp.data;
      if (!d?.priceInfo) return null;

      const pi = d.priceInfo;
      const si = d.securityInfo || {};
      const md = d.metadata || {};

      const price = pi.lastPrice ?? pi.close ?? 0;
      const prev  = pi.previousClose ?? price;
      const change = parseFloat((price - prev).toFixed(2));
      const changePct = prev > 0 ? parseFloat(((change / prev) * 100).toFixed(2)) : 0;

      this.logger.log(`[NSE] ${ticker}: ₹${price} (${changePct > 0 ? '+' : ''}${changePct}%)`);

      return {
        symbol: `${ticker}.NS`,
        price,
        change,
        changePercent: changePct,
        name: md.companyName || ticker,
        exchange: 'NSE',
        dayLow:      pi.intraDayHighLow?.min,
        dayHigh:     pi.intraDayHighLow?.max,
        vwap:        pi.vwap,
        weekHigh52:  pi.weekHighLow?.max,
        weekLow52:   pi.weekHighLow?.min,
        deliveryPct: d.deliveryTradedQuantity ? (d.deliveryTradedQuantity / (d.totalTradedVolume || 1)) * 100 : undefined,
        prevClose:   prev,
        open:        pi.open,
        upperBand:   pi.uppercircuitprice,
        lowerBand:   pi.lowercircuitprice,
      };
    } catch (e) {
      this.logger.warn(`NSE price fetch failed for ${ticker}: ${e.message}`);
      return null;
    }
  }

  /** Standard browser-like headers required by NSE to avoid bot detection */
  private nseHeaders() {
    return {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
      'Accept': 'application/json, text/plain, */*',
      'Accept-Language': 'en-US,en;q=0.9',
      'Accept-Encoding': 'gzip, deflate, br',
      'Connection': 'keep-alive',
      'Referer': 'https://www.nseindia.com/',
      'Sec-Fetch-Dest': 'empty',
      'Sec-Fetch-Mode': 'cors',
      'Sec-Fetch-Site': 'same-origin',
    };
  }

  /**
   * Extra precision fallback: Scraping Google Finance / Search for exact price.
   */
  async fetchGooglePrice(ticker: string): Promise<any> {
    try {
      let cleanTicker = ticker.split('.')[0].toUpperCase();
      let exchangeStr = 'NSE';

      // Nifty / Indices override mapping 
      if (cleanTicker === 'NIFTY_50' || cleanTicker === 'NIFTY') {
        cleanTicker = 'NIFTY_50';
        exchangeStr = 'INDEXNSE';
      } else if (cleanTicker === 'BANKNIFTY') {
        cleanTicker = 'NIFTY_BANK';
        exchangeStr = 'INDEXNSE';
      } else if (cleanTicker === 'SENSEX') {
        exchangeStr = 'INDEXBOM';
      }

      const url = `https://www.google.com/finance/quote/${cleanTicker}:${exchangeStr}`;
      
      const response = await firstValueFrom(this.httpService.get(url, {
        headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/119.0.0.0 Safari/537.36' },
        timeout: 5000,
      }));

      const $ = cheerio.load(response.data);
      
      // Class used by Google Finance for the primary huge price text
      const priceText = $('.YMlKec.fxKbKc').first().text();
      const price = parseFloat(priceText.replace(/[^0-9.-]+/g, ''));
      
      if (isNaN(price) || price === 0) return null;

      return {
        symbol: exchangeStr === 'INDEXNSE' ? `^NSEI` : `${cleanTicker}.NS`,
        price: price,
        change: 0, 
        changePercent: 0,
        name: cleanTicker,
        exchange: exchangeStr === 'INDEXNSE' ? 'INDEXNSE' : 'NSE',
      };
    } catch (e) {
      this.logger.error(`Google Price Fallback failed for ${ticker} : ${e.message}`);
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
    const nameKeywords = companyName ? companyName.split(' ')[0] : '';
    // Broadened search to capture more signal: Ticker, Name, and general market context
    const searchTerm = nameKeywords 
        ? `("${nameKeywords}" OR "${cleanTicker}" OR "${cleanTicker}.NS")` 
        : `("${cleanTicker}" OR "${cleanTicker}.NS")`;
    const query = encodeURIComponent(`${searchTerm} share price news`);

    const sectorQuery  = sector ? encodeURIComponent(`"${sector}" NSE BSE India stock market`) : null;

    const sources = [
      // ── 1. Company direct search ─────────────────────────────────────────────
      {
        label: 'Google News',
        url: `https://news.google.com/rss/search?q=${query}+NSE+BSE&hl=en-IN&gl=IN&ceid=IN:en`,
        itemSel: 'item', titleSel: 'title', linkSel: 'link', dateSel: 'pubDate', sourceSel: 'source',
        trusted: true,
      },
      // ── 2. Analysis, blogs, forecasts ────────────────────────────────────────
      {
        label: 'Fin-Blogs & Analysis',
        url: `https://news.google.com/rss/search?q=${encodeURIComponent(`${searchTerm} (analysis OR target OR forecast OR "buy rating" OR "sell rating" OR "price target" OR blog OR "deep dive")`)}+NSE&hl=en-IN&gl=IN&ceid=IN:en`,
        itemSel: 'item', titleSel: 'title', linkSel: 'link', dateSel: 'pubDate', sourceSel: 'source',
        trusted: true,
      },
      // ── 3. Earnings & results query ──────────────────────────────────────────
      {
        label: 'Earnings & Results',
        url: `https://news.google.com/rss/search?q=${encodeURIComponent(`${searchTerm} (quarterly results OR earnings OR Q1 OR Q2 OR Q3 OR Q4 OR profit OR revenue OR EBITDA)`)}+NSE&hl=en-IN&gl=IN&ceid=IN:en`,
        itemSel: 'item', titleSel: 'title', linkSel: 'link', dateSel: 'pubDate', sourceSel: 'source',
        trusted: true,
      },
      // ── 4. Sector industry context ───────────────────────────────────────────
      ...(sectorQuery ? [{
        label: 'Sector Context',
        url: `https://news.google.com/rss/search?q=${sectorQuery}&hl=en-IN&gl=IN&ceid=IN:en`,
        itemSel: 'item', titleSel: 'title', linkSel: 'link', dateSel: 'pubDate', sourceSel: 'source',
        trusted: false,
        isSector: true,
      }] : []),
      // ── 5. Yahoo direct ticker RSS ───────────────────────────────────────────
      {
        label: 'Yahoo Finance',
        url: `https://finance.yahoo.com/rss/headline?s=${cleanTicker}.NS`,
        itemSel: 'item', titleSel: 'title', linkSel: 'link', dateSel: 'pubDate', sourceSel: null,
        trusted: true,
      },
      // ── 6. Indian financial wire feeds ───────────────────────────────────────
      {
        label: 'ET Markets',
        url: `https://economictimes.indiatimes.com/markets/stocks/rssfeeds/2146842.cms`,
        itemSel: 'item', titleSel: 'title', linkSel: 'link', dateSel: 'pubDate', sourceSel: null,
        trusted: false,
      },
      {
        label: 'Moneycontrol',
        url: `https://www.moneycontrol.com/rss/business.xml`,
        itemSel: 'item', titleSel: 'title', linkSel: 'link', dateSel: 'pubDate', sourceSel: null,
        trusted: false,
      },
      {
        label: 'Business Standard',
        url: `https://www.business-standard.com/rss/markets-106.rss`,
        itemSel: 'item', titleSel: 'title', linkSel: 'link', dateSel: 'pubDate', sourceSel: null,
        trusted: false,
      },
      {
        label: 'Livemint',
        url: `https://www.livemint.com/rss/markets`,
        itemSel: 'item', titleSel: 'title', linkSel: 'link', dateSel: 'pubDate', sourceSel: null,
        trusted: false,
      },
    ];

    const seen = new Set<string>();
    const allItems: any[] = [];
    const now = Date.now();
    const cutoff = withinHours > 0 ? now - (withinHours * 60 * 60 * 1000) : 0;

      await Promise.allSettled(
      sources.map(async (src: any) => {
        try {
          const resp = await firstValueFrom(
            this.httpService.get(src.url, {
              headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36' },
              timeout: 7000,
            }),
          );
          const $ = cheerio.load(resp.data, { xmlMode: true });
          $(src.itemSel).slice(0, 30).each((_, el) => {
            const rawTitle = $(el).find(src.titleSel).text().trim();
            const title = rawTitle.replace(/<!\[CDATA\[|\]\]>/g, '').trim();
            
            // Relevancy check: Include ticker, full name, or the first major keyword of the name
            const matchesTicker = title.toUpperCase().includes(cleanTicker.toUpperCase());
            const matchesCompany = companyName && title.toLowerCase().includes(companyName.toLowerCase());
            const matchesFirstWord = nameKeywords && nameKeywords.length > 2 && title.toLowerCase().includes(nameKeywords.toLowerCase());

            // Specific search queries (Google/Yahoo flags) bypass strict checking. General wire feeds must match keywords.
            if (!src.trusted && !matchesTicker && !matchesCompany && !matchesFirstWord) {
              return;
            }

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
                isSectorNews: src.isSector || false,
              });
            }
          });
        } catch (e) {
          this.logger.warn(`[${src.label}] feed failed: ${e.message}`);
        }
      }),
    );

    allItems.sort((a, b) => b.publishedAt.getTime() - a.publishedAt.getTime());
    return allItems.slice(0, 80); // Massive context length: up to 80 articles
  }

  /**
   * Fetches official exchange filings + corporate actions from NSE with session cookies.
   * Returns announcements, board meetings, and corporate actions (dividends, splits, rights).
   */
  async scrapeExchangeFilings(ticker: string, withinHours: number = 120) {
    try {
      const cleanTicker = ticker.split('.')[0].toUpperCase();

      // Warm up NSE session
      const warmupResp = await firstValueFrom(
        this.httpService.get('https://www.nseindia.com', {
          headers: this.nseHeaders(),
          timeout: 5000,
        }),
      );
      const rawCookies: string[] = warmupResp.headers['set-cookie'] || [];
      const cookieStr = rawCookies.map((c: string) => c.split(';')[0]).join('; ');
      const headers = { ...this.nseHeaders(), Cookie: cookieStr };

      // Parallel fetch: announcements + corporate actions + board meetings
      const [annResp, corpResp] = await Promise.allSettled([
        firstValueFrom(this.httpService.get(
          `https://www.nseindia.com/api/corp-info?symbol=${cleanTicker}&corpType=announcements&market=equities`,
          { headers, timeout: 5000 }
        )),
        firstValueFrom(this.httpService.get(
          `https://www.nseindia.com/api/corp-info?symbol=${cleanTicker}&corpType=actions&market=equities`,
          { headers, timeout: 5000 }
        )),
      ]);

      const cutoff = withinHours > 0 ? Date.now() - (withinHours * 60 * 60 * 1000) : 0;
      const results: any[] = [];
      const seen = new Set<string>();

      // Process announcements
      if (annResp.status === 'fulfilled') {
        const data: any[] = annResp.value.data?.data || [];
        for (const item of data) {
          const dt = new Date(item.an_dt || item.date || 0);
          if (cutoff > 0 && dt.getTime() < cutoff) continue;
          const key = (item.subject || '').slice(0, 60).toLowerCase();
          if (seen.has(key)) continue;
          seen.add(key);
          results.push({
            title: item.subject || item.desc || 'Corporate Announcement',
            date: item.an_dt || item.date,
            url: item.attchmntFile
              ? `https://nsearchives.nseindia.com/${item.attchmntFile}`
              : `https://www.nseindia.com/get-quotes/equity?symbol=${cleanTicker}`,
            source: 'NSE Announcement',
            category: 'ANNOUNCEMENT',
          });
        }
      }

      // Process corporate actions (dividends, splits, rights etc.)
      if (corpResp.status === 'fulfilled') {
        const data: any[] = corpResp.value.data?.data || [];
        for (const item of data.slice(0, 5)) {
          const key = (`${item.subject || ''}${item.exDate || ''}`).slice(0, 60).toLowerCase();
          if (seen.has(key)) continue;
          seen.add(key);
          results.push({
            title: `${item.purpose || item.subject || 'Corporate Action'} | Ex-Date: ${item.exDate || '--'}`,
            date: item.exDate || item.recordDate,
            url: `https://www.nseindia.com/get-quotes/equity?symbol=${cleanTicker}`,
            source: 'NSE Corp Action',
            category: 'CORPORATE_ACTION',
          });
        }
      }

      return results.slice(0, 20);
    } catch (e) {
      this.logger.warn(`NSE filings/actions fetch failed for ${ticker}: ${e.message}`);
      return [];
    }
  }

  /**
   * Scrapes Reddit for recent sentiment (48h).
   * Expanded to multiple subreddits and includes sector context.
   */
    async scrapeReddit(ticker: string, companyName?: string, sector?: string, withinHours: number = 48) {
    try {
      const cleanTicker = ticker.split('.')[0];
      const nameKeywords = companyName ? companyName.split(' ')[0] : '';
      const queryText = nameKeywords ? `("${nameKeywords}" OR "${cleanTicker}")` : `"${cleanTicker}"`;
      const query = encodeURIComponent(queryText);
      
      // Target high-signal retail investor hubs
      const subreddits = 'IndianStockMarket+IndiaInvestments+pennystocks+stocks+wallstreetbets+IndianStreetBets+DalalStreetTalks+ValueInvesting+Daytrading';
      const url = `https://www.reddit.com/r/${subreddits}/search.rss?q=${query}&restrict_sr=1&sort=new&limit=60`;

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
      return posts.slice(0, 60);
    } catch (e) {
      this.logger.error(`Reddit fetch failed for ${ticker}: ${e.message}`);
      return [];
    }
  }
}
