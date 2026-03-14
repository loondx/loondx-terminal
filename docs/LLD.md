# Low-Level Design (LLD) - LOONDX Terminal

## 1. Class Diagram (Backend Services)
```mermaid
classDiagram
    class TerminalController {
        +getDashboardData(ticker)
        +getMarketStatus()
    }
    class MarketService {
        +getStockDetails(ticker)
        +getFinancials(ticker)
        +getNews(ticker)
    }
    class AIService {
        +analyzeGlobalImpact(event)
        +deepStockAnalysis(data)
        -callClaude(prompt)
    }
    class JobsService {
        +refreshRealtimeData()
        +generateNextLevelInsights()
    }
    class PrismaService {
        +stock
        +aiInsight
        +macroSignal
    }

    TerminalController --> PrismaService
    JobsService --> MarketService
    JobsService --> AIService
    JobsService --> PrismaService
    AIService --> ConfigService
```

## 2. Sequence Diagram: AI Insight Generation
This describes the background process that runs every 6-12 hours.

```mermaid
sequenceDiagram
    participant Cron as JobsService
    participant MS as MarketService
    participant AI as AIService
    participant DB as PostgreSQL (Prisma)

    Cron->>DB: Get List of Active Tickers
    loop For each Ticker
        Cron->>MS: Fetch Latest News (15 articles)
        Cron->>MS: Fetch Social Sentiment (X/Reddit)
        Cron->>AI: analyzeDeep(Financials + News + Social)
        AI-->>Cron: Returns JSON (Summary, Value, Chain)
        Cron->>DB: Upsert AIInsight (Expires In 24h)
    end
```

## 3. Data Schema Details
- **Stock Model**: Central hub. Stores normalization of external metrics (PE, ROE, FCF).
- **Impact Chain String**: A serialized representation of global events. Example: `War -> Oil -> Logistics -> Margins`.
- **PrecomputedAt**: Every insight is timestamped to ensure the UI can show "Analysis fresh as of X hours ago".

## 4. Error Handling & Circuit Breaking
- **Market API Failure**: Jobs service catches errors and logs them. The DB retains the *last known good data*.
- **AI API Failure**: If Claude is down, the system generates a "Limited Analysis" fallback from basic financial ratios in the database.
