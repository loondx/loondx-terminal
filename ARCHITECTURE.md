# LOONDX Terminal Architecture & Data Flow

This document provides a detailed, production-level overview of the LOONDX Terminal's core architecture, specifically focusing on how data is sourced, validated, filtered, and processed by our AI engines.

## 1. High-Level System Architecture

LOONDX Terminal uses a hybrid fetching architecture designed for maximum resilience and data richness without relying on paid enterprise data terminals.

```mermaid
graph TD
    UI[Frontend (React/Chart.js)] --> API[NestJS API Gateway]
    
    API --> Cache[(Redis Cache)]
    API --> DB[(PostgreSQL DB)]
    
    API -- Prices & Profile --> MarketScraper[Market Scraper Engine]
    API -- Quarterly/Annual --> ScreenerScraper[Fundamentals Scraper]
    API -- Analysis & Signals --> AIEngine[AI Intelligence Layer]

    MarketScraper -.-> Google[Google Finance (Live Price)]
    MarketScraper -.-> Yahoo[Yahoo Finance (Fallback/Historical)]
    MarketScraper -.-> News[News Aggregators (Google, ET, MC)]
    MarketScraper -.-> NSE[NSE India (Official Filings)]
    MarketScraper -.-> Reddit[Reddit (Social Sentiment)]
    
    AIEngine -.-> OpenRouter[OpenRouter Primary AI]
    AIEngine -.-> Anthropic[Claude Native Fallback]
```

---

## 2. Core Data Sources

LOONDX Terminal orchestrates multiple un-gated sources to build a complete institutional-grade profile for an asset.

### A. Live & Historical Pricing
- **Primary Source:** Google Finance HTML Scraping
  - *Why?* Real-time accuracy without paying exchange licensing fees. Matches what users see when they google the stock.
- **Secondary Fallback:** Yahoo Finance API (`finishthedata`/`yahoo-finance2`)
  - *Why?* Exhaustive historical OHLCV (Open, High, Low, Close, Volume) data for robust charting.

### B. Fundamental Data
- **Primary Source:** Screener.in
  - *Why?* Gold standard for Indian equities. Provides highly accurate quarterly P&L, balance sheets, Market Cap, ROE, Debt/Equity, and PE ratios.

### C. News, Blogs & Articles
We aggressively source unstructured text to feed the AI context engines.
- **Google News (General):** Catches all major press releases and main-stream media mentions.
- **Google News (Fin-Blogs & Analysis):** Explicit queries searching for `target`, `deep dive`, `analysis`, and `forecast`. This surfaces independent financial blogs and Substack articles.
- **Economic Times & Moneycontrol (RSS):** Dedicated Indian financial pipelines.
- **Yahoo Finance RSS:** Broad international coverage and sector alignment.
- **Business Standard RSS:** Institutional-grade macro coverage.

*Data is captured across a 7-day rolling window (168 hours) to ensure the AI evaluates weekly momentum, not just daily panic.*

### D. Social Pulse
- **Source:** Reddit RSS
- **Subreddits Monitored:** `r/IndianStockMarket`, `r/IndiaInvestments`, `r/wallstreetbets`, `r/stocks`, `r/pennystocks`
- *Why?* Captures retail sentiment, rumors, and crowd-sourced due diligence before it hits mainstream news.

### E. AI Intelligence Layer
- **Primary Route:** OpenRouter AI 
  - Allows us to seamlessly route across multiple LLMs (Claude 3.5 Sonnet, GPT-4o, Llama 3) based on load and cost.
- **Fallback Route:** Native Anthropic API Layer
  - Hard-coded redundancy to Claude 3.5 Sonnet if OpenRouter connection drops.
- **Failsafe Route:** Simulated Terminal Layer
  - If API keys fail, the system gracefully degrades to simulated cluster responses, rather than crashing the interface.

---

## 3. Data Filtering & Trust Protocols

Scraping unstructured data yields high noise. We apply stringent programmatic filters.

### News & Blog Relevance Pipeline
When the terminal requests news for a ticker (e.g. `RELIANCE`):
1. **Search Expansion:** The scraper queries for `("Reliance Industries" OR "RELIANCE" OR "RELIANCE.NS")` across all RSS portals simultaneously.
2. **Title Heuristics:** The incoming article title is parsed.
3. **Source-Based Trust:**
   - **High-Trust (Google/Yahoo):** If the article is returned by Google/Yahoo search directly, we trust their internal relevancy algorithm and permit the article *even if the exact ticker string isn't in the title*. (e.g., *"This Indian Telecom Giant Just Broke Records"* would pass).
   - **Low-Trust (General ET/MC Feeds):** For firehose feeds, we execute a strict substring check. The article is dropped unless it explicitly contains the ticker or the first word of the company name.
4. **Time & Deduping:** Articles are stripped of HTML tags, hashed by the first 64 characters of their title, and deduplicated. We trim any data older than 168 hours for AI passes, and 120 hours for UI display.

### Chart Rendering Overlays
To avoid clutter, charting data is aggregated locally:
1. **Historical Canvas:** Real OHLCV data drives the main spline.
2. **Mathematical Overlay:** 50-Day Moving Average and 200-Day Moving Average are calculated real-time in the browser using custom math utils.
3. **Vol & Momentum Sub-Layers:** Volume and RSI (Relative Strength Index) are derived locally and injected into shared UI canvases on their own isolated, compressed Y-axes to retain a clean layout.

---

## 4. Development Workflow & State Management

### Triggering an Analysis
When a user searches a ticker (e.g. `INFY`):
1. **Cache Check:** The system checks PostgreSQL for a recent snapshot (under 15 minutes old).
2. **Asynchronous Price Update:** Even if the DB is fresh, the system fires off an asynchronous request to Google Finance to fetch the **exact live price** and patches it into the returned dataset so the UI is perfectly real-time.
3. **Background Aggregation (Miss):** If data is stale or missing, the `TerminalController` blocks the UI loader and spawns parallel workers to fetch Filings, Screener Data, Live Prices, and 168-hours of Global News.
4. **Neural Pass:** The aggregated dump is fed to OpenRouter.
5. **Persistence:** The structured AI JSON response is committed to Postgres, Redis caches are updated, and the full payload is streamed to the React interface.
