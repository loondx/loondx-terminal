# LOONDX Terminal — Data Sources Summary

Quick reference for where every piece of data comes from.

---

## 💰 Live Stock Price

| Priority | Source | What We Get |
|---|---|---|
| 1st (Primary) | **NSE India API** | Exact official price, VWAP, 52W High/Low, circuit bands, delivery % |
| 2nd (Fallback) | **Google Finance** | Real-time scrape from `google.com/finance/quote/TICKER:NSE` |
| 3rd (Last resort) | **Yahoo Finance** | Price + previous close for change % calculation |

> NSE = most accurate. Same price you see on NSE website.

---

## 📈 Historical Price Chart (OHLCV)

| Source | Range | Used For |
|---|---|---|
| **Yahoo Finance API** | 5 Years daily | 1D / 1W / 1M / 3M / 6M / 1Y / 5Y / MAX chart |

Stored in PostgreSQL. Up to **1,500 daily candles** per stock.

---

## 🏢 Company Fundamentals

| Source | What We Get |
|---|---|
| **Screener.in** | P/E, ROE, Debt-to-Equity, Market Cap, Book Value, EPS, quarterly P&L, annual results |

Stored in PostgreSQL. Refreshed every 15 minutes.

---

## 📰 News, Blogs & Articles

*The news engine fetches up to **80 total articles** per stock. We query 7 distinct pipelines to ensure complete coverage.*

| Source | Type | Window |
|---|---|---|
| **Google News RSS** (General) | Press releases, mainstream news | 120 hours |
| **Google News RSS** (Analysis) | Blogs, forecasts, deep dives, target prices | 120 hours |
| **Google News RSS** (Earnings) | Quarterly results and profit data | 120 hours |
| **Google News RSS** (Sector) | Broad industry context | 120 hours |
| **Economic Times RSS** | Indian market news | 120 hours |
| **Moneycontrol RSS** | Indian business news | 120 hours |
| **Livemint RSS** | High-quality Indian financial news | 120 hours |
| **Yahoo Finance RSS** | International + corporate news | 120 hours |
| **Business Standard RSS** | Institutional / macro news | 120 hours |

Cached in Redis for 10 minutes per ticker.

---

## 📢 Corporate Filings & Actions

| Source | What We Get |
|---|---|
| **NSE India API** (`corpType=announcements`) | Official company announcements (M&A, results, regulatory) |
| **NSE India API** (`corpType=actions`) | Dividends, stock splits, rights issues, bonus shares (with Ex-Date) |

Cached in Redis for 30 minutes. Uses session cookie warm-up.

---

## 💬 Social Sentiment (Reddit)

*The social scraper fetches up to **60 active discussions** to gauge raw retail sentiment.*

| Source | Target Communities | Window |
|---|---|---|
| **Reddit RSS** | `IndianStockMarket`, `IndiaInvestments`, `IndianStreetBets`, `DalalStreetTalks`, `ValueInvesting`, `Daytrading`, `stocks`, `wallstreetbets`, `pennystocks` | 120 hours |

---

## 🤖 AI Analysis

| Priority | Service | Model Used |
|---|---|---|
| 1st (Primary) | **OpenRouter** | Routes across Claude 3.5, GPT-4o, Llama 3 |
| 2nd (Fallback) | **Anthropic Claude** | Claude 3.5 Sonnet directly |
| 3rd (Failsafe) | **Simulated** | Rule-based response if APIs are down |

AI gets: stock fundamentals + 5Y price history + 168h of news + Reddit + macro signals.  
Produces: Summary, BUY/HOLD/SELL, Intrinsic Value, Risk Score, Growth Score, Sentiment Score.

---

## 🌐 Macro Signals

| Source | Data |
|---|---|
| **Seeded in DB** | USD/INR, RBI Repo Rate, Crude Oil price |

---

## ⚡ Cache Strategy

| Data | Cache | TTL |
|---|---|---|
| News / Social / Filings | Redis | 10 min |
| Stock fundamentals | PostgreSQL | 15 min stale check |
| Price history | PostgreSQL | Fetched on refresh |
| AI analysis | PostgreSQL | Fetched on refresh |
