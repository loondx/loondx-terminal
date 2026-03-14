# High-Level Design (HLD) - LOONDX Terminal

## 1. System Philosophy
LOONDX Terminal is designed as a **data-heavy, low-latency intelligence platform**. It shifts the heavy lifting (AI analysis and data normalization) to the backend background processes so the user experiences an "instant-on" financial terminal.

## 2. System Context (C4 Model - Level 1)
```mermaid
graph LR
    User(Stock Trader/Investor) -->|Interacts| Loondx[LOONDX Terminal]
    Loondx -->|Fetches Data| MarketAPI[IndianAPI.in / Screener]
    Loondx -->|Analyzes| AI[Anthropic Claude 3.5]
    Loondx -->|Monitors| Social[X / Reddit]
```

## 3. High-Level Architecture (Level 2)
The platform is composed of four primary containers, orchestrated via Docker.

```mermaid
graph TD
    subgraph "Frontend Layer"
        UI[React Dashboard]
        Router[React Router]
        Charts[Chart.js / TradingView Light]
    end

    subgraph "Logic Layer (NestJS)"
        Gateway[REST API Gateway]
        IngestService[Market Ingestion]
        AIService[Intelligence Engine]
        Jobs[Cron Schedulers]
    end

    subgraph "Data Layer"
        PG[(PostgreSQL - Structured Data)]
        Redis[(Redis - Price Cache)]
    end

    UI -->|JSON| Gateway
    Gateway -->|ORM| PG
    Gateway -->|Cache| Redis
    Jobs -->|Pull| MarketAPI
    Jobs -->|Push| PG
```

## 4. Key Performance Strategies
- **Database-First Intelligence**: We never make an AI call while a user is waiting. All AI insights are precomputed and cached.
- **Micro-Updates**: Only high-frequency data (Price) is polled frequently. Deep analysis is refreshed on a 6-12 hour cycle.
- **State Hydration**: On startup, the UI hydrates from a single "Intelligence Package" reducing the number of round-trips to the server.
