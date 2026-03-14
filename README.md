# LOONDX Terminal 🚀

**LOONDX Terminal** is a professional-grade financial intelligence platform designed for the Indian stock market. It combines real-time data, social sentiment analysis, and deep AI insights powered by Claude 3.5 Opus to provide a next-generation trading and research experience.

![Terminal Preview](https://github.com/loondx/loondx-terminal/raw/main/resizable_layout_final_verify_1773485522965.webp)

## 🌟 Key Features

- **Real-time Indian Market Data**: Live prices, volumes, and metrics for NSE/BSE listed companies via `IndianAPI.in`.
- **AI Intelligence Layer**: Deep research summaries and "Impact Chain" mapping (e.g., how global events like oil spikes affect specific stocks).
- **Sentiment Engine**: Aggregated sentiment analysis from X (Twitter) and Reddit.
- **Global Macro Signals**: Real-time tracking of Crude Oil, USD/INR, RBI rates, and Treasury Yields.
- **Advanced Charting**: interactive OHLC charts with technical indicators (MA, BB, VWAP, EMA) and Elliott Wave projections.
- **Institutional Tracker**: Monitor FII/DII net flows to follow institutional movement.

## 🛠 Tech Stack

- **Frontend**: React, TypeScript, Chart.js, Tailwind CSS.
- **Backend**: NestJS (Node.js), TypeScript, Prisma ORM.
- **Database**: PostgreSQL (Core data) & Redis (Caching).
- **AI**: Anthropic Claude 3.5 API.
- **DevOps**: Docker & Docker Compose.

## 🚀 Getting Started

### Prerequisites
- Node.js v18+
- Docker & Docker Compose
- API Keys for `IndianAPI.in` and `Anthropic` (Claude)

### Installation

1. **Clone the repository**
   ```bash
   git clone https://github.com/loondx/loondx-terminal.git
   cd loondx-terminal
   ```

2. **Configure Environment Variables**
   Create a `.env` file in the `backend` directory:
   ```env
   DATABASE_URL="postgresql://postgres:postgres@localhost:5432/loondx_db?schema=public"
   INDIAN_API_KEY="your_api_key"
   ANTHROPIC_API_KEY="your_api_key"
   ```

3. **Start the system (Docker)**
   ```bash
   docker-compose up -d
   ```

4. **Initialize Metadata**
   ```bash
   cd backend
   npx prisma db push
   ```

## 📚 Documentation
- **Architecture**: Detailed system design in [docs/ARCHITECTURE.md](./docs/ARCHITECTURE.md).
- **API Reference**: Swagger UI is available at `http://localhost:3000/docs` when the backend is running.

## 🛡 License
UNLICENSED (Proprietary for LOONDX)
