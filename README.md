# LOONDX Terminal

**AI-powered financial intelligence dashboard** — aggregates real-time market data, company financials, multi-source news, exchange filings, and AI analysis into a single local terminal.

> Built for retail investors, quants, and traders who want institutional-grade research without paying for a Bloomberg terminal.

---

## What It Does

| Feature | Source | Storage |
|---|---|---|
| **Live stock price** | Yahoo Finance API (same as Google) | DB (refreshed every 30 min) |
| **Company fundamentals** | Screener.in | DB (P/E, ROE, Debt, Market Cap, EPS) |
| **Quarterly financials** | Screener.in | DB (JSON — quarters, P&L, balance sheet) |
| **AI analysis** | Claude (Anthropic) | DB (BUY/HOLD/SELL, intrinsic value, summary) |
| **Latest news** | Google News + ET Markets + Moneycontrol | Redis only (10 min TTL) |
| **Exchange filings** | NSE official API | Redis only (30 min TTL) |
| **Reddit sentiment** | r/IndianStockMarket + r/IndiaInvestments | Redis only (10 min TTL) |
| **Macro signals** | Seeded (USD/INR, Repo Rate, Oil) | DB |

**Design rule:** Only things that are slow/expensive to re-fetch live in PostgreSQL. Everything ephemeral (news, social, filings) stays in Redis and expires automatically.

---

## Architecture

```
Browser (React + Chart.js)
    │
    ▼
NestJS API (port 3000)
    ├── Yahoo Finance API  ──► Live price (₹, %, exchange)
    ├── Screener.in        ──► Fundamentals (ROE, P/E, quarterly tables)
    ├── Google News RSS    ──► News (10 min Redis cache)
    ├── ET Markets RSS     ──► News (10 min Redis cache)
    ├── Moneycontrol RSS   ──► News (10 min Redis cache)
    ├── NSE API            ──► Exchange filings (30 min Redis cache)
    ├── Reddit RSS         ──► Social sentiment (10 min Redis cache)
    ├── Claude API         ──► AI deep analysis (BUY/HOLD/SELL)
    │
    ├── PostgreSQL         ──► Company data + AI insights (persistent)
    └── Redis              ──► News, social, filings (ephemeral)
```

---

## Quick Start (Local)

### Prerequisites
- [Docker Desktop](https://www.docker.com/products/docker-desktop/) (for Postgres + Redis)
- [Node.js 18+](https://nodejs.org/)
- [Git](https://git-scm.com/)

### 1. Clone and install

```bash
git clone https://github.com/your-org/loondx-terminal.git
cd loondx-terminal

# Install backend dependencies
cd backend && npm install

# Install frontend dependencies
cd ../frontend && npm install
```

### 2. Start databases

```bash
# From project root
cd ..
docker-compose up -d
```

This starts:
- PostgreSQL on `localhost:5432`
- Redis on `localhost:6379`

### 3. Configure environment

```bash
cd backend
```

Edit `.env`:

```env
DATABASE_URL="postgresql://postgres:postgres@localhost:5432/loondx_db?schema=public"
PORT=3000
REDIS_HOST=localhost
REDIS_PORT=6379

# Optional: Add for AI analysis (Claude)
# Get from https://console.anthropic.com/
ANTHROPIC_API_KEY=your_key_here

# Optional: Fallback price API
INDIAN_API_KEY=your_key_here
```

> Without `ANTHROPIC_API_KEY`, AI insights fall back to a rule-based summary. Everything else works.

### 4. Initialize database

```bash
cd backend
npx prisma db push
npx prisma generate
```

### 5. Start the app

Open **two terminals**:

```bash
# Terminal 1 — Backend
cd backend
npm run dev
# Running on http://localhost:3000
```

```bash
# Terminal 2 — Frontend
cd frontend
npm run dev
# Running on http://localhost:5173
```

### 6. Open the terminal

Visit **http://localhost:5173**

On first load you'll see the **Welcome Screen** — search for any NSE company (TCS, INFY, RELIANCE, HDFCBANK, etc.).

---

## Searching for a Stock

- Type any **NSE ticker** (e.g. `TCS`, `WIPRO`, `BAJFINANCE`)
- Or search by **company name** (e.g. "tata", "infosys")
- For a stock not already in the DB → the terminal **auto-fetches** live data from Yahoo + Screener
- Previously viewed stocks load instantly from DB (refreshed if stale > 30 min)

---

## Dashboard Panels

```
┌──────────────────────────────────────────────────────┬─────────────────────┐
│  PRICE CHART (candlestick / indicators)              │  NSE FILINGS        │
│  TF: 1D / 5D / 1M / 3M / 6M / 1Y / 5Y              │  (official events)  │
│  Indicators: MA20/50, EMA21, BB, VWAP                ├─────────────────────┤
├──────────────────────────────────────────────────────│  INTEL & SENTIMENT  │
│  VOLUME BAR CHART                                    │  (multi-source news)│
├───────────────────┬──────────────────────────────────├─────────────────────┤
│  KEY METRICS      │  ELLIOTT WAVE                    │  SOCIAL PULSE       │
│  Price/Change     │  (trend projection)              │  (Reddit)           │
│  Market Cap       │                                  ├─────────────────────┤
│  P/E, ROE, D/E    │                                  │  INSTITUTIONAL      │
├───────────────────┴──────────────────────────────────┴─────────────────────┤
│  AI DEEP RESEARCH PANEL                                                     │
│  Summary | Sentiment Score | Intrinsic Value | BUY/HOLD/SELL               │
└─────────────────────────────────────────────────────────────────────────────┘
```

Switch the main panel between **CHART** and **FINANCIALS** (quarterly P&L tables from Screener).

---

## Data Freshness

| Data | Refreshed when |
|---|---|
| Price | Every dashboard load (if > 30 min stale) |
| Fundamentals | Every dashboard load (if > 30 min stale) |
| AI insight | When fundamentals refresh |
| News | Every 10 minutes per ticker (Redis TTL) |
| Reddit | Every 10 minutes per ticker (Redis TTL) |
| NSE Filings | Every 30 minutes per ticker (Redis TTL) |

Force a refresh anytime: `POST /api/terminal/refresh/:ticker`

---

## API Endpoints

```
GET  /api/terminal/dashboard/:ticker   Full intelligence package
GET  /api/terminal/stocks              All known stocks (autocomplete)
GET  /api/terminal/market-status       Macro signals + top gainers/losers
POST /api/terminal/refresh/:ticker     Force re-fetch everything

GET  /api-docs                         Swagger UI
```

---

## Technology Stack

| Layer | Technology |
|---|---|
| Frontend | React 18 + TypeScript + Chart.js |
| Backend | NestJS + TypeScript |
| Database | PostgreSQL (via Prisma ORM) |
| Cache | Redis (via ioredis) |
| AI | Anthropic Claude (claude-3-opus) |
| Styling | Vanilla CSS (custom design system) |
| Containerization | Docker Compose |

---

## Troubleshooting

**"Could not resolve live price"** — The ticker isn't found on NSE. Try without `.NS` suffix (e.g. `RELIANCE` not `RELIANCE.NS`).

**Charts show wrong price** — Force refresh: `POST /api/terminal/refresh/TICKER`

**AI analysis shows fallback** — Add `ANTHROPIC_API_KEY` to `backend/.env`

**Redis connection errors** — Make sure Docker is running: `docker-compose up -d`

**Screener data missing** — Screener.in blocks aggressive scrapers. Normal usage works fine.

---

## Roadmap

- [ ] Historical OHLCV data from Yahoo Finance (real candles, not generated)
- [ ] Watchlist — track multiple stocks
- [ ] Price alerts (email / desktop notification)
- [ ] FII/DII institutional flow data (NSE bulk deals API)
- [ ] Peer comparison panel (compare P/E, ROE across sector)
- [ ] Export to PDF research report
