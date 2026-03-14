# User Journey - LOONDX Terminal

## 1. Discovery & Onboarding
The user lands on the terminal with a high-level overview of the Indian market.

```mermaid
graph TD
    Start[Land on Dashboard] --> |Auto-load| MarketPulse[Market Pulse Ticker]
    MarketPulse --> |View| HeadlineData[USD/INR, Oil, FII/DII Flows]
```

## 2. Stock Investigation Flow
The primary workflow for a trader or researcher.

```mermaid
graph TD
    Identify[Search for Ticker e.g. RELIANCE] --> |Enter| Loading[Loading Screen / AI Hydration]
    Loading --> |View| MainChart[Interactive Price & Volume Chart]
    MainChart --> |Scrutinize| Technicals[Technicals: MA, BB, VWAP]
    MainChart --> |Scroll Down| Intelligence[AI Deep Research Panel]
    Intelligence --> |Verify| ImpactChain[Review Global Impact Chain]
```

## 3. Deep Research & Decision Making
How the user decides to act based on multiple signals.

```mermaid
graph LR
    Signals{Signal Synthesis}
    Signals --> Sentiment[Social Sentiment Gauge]
    Signals --> Value[Intrinsic Value vs Market Price]
    Signals --> Macro[Macro Impact on Sector]
    
    Sentiment & Value & Macro --> Recommendation[AI Action: BUY / HOLD / SELL]
```

## 4. Interaction Archetypes
- **The Scalper**: Stays in the main chart area, toggling 1D/5D timeframes and using the sidebar "Live Pulse" for sentiment shifts.
- **The Value Investor**: Focuses on the "Valuation / DCF" panel and the "AI Deep Research" summary to find entries below intrinsic value.
- **The Macro Analyst**: Primarily watches the top ticker and the "Global Impact Chain" to predict sector-wide movements.
