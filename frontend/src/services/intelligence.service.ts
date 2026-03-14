/**
 * Intelligence and Agentic AI Services
 * To be replaced by the Graph DB & AI processing endpoints in backend.
 */

// Migrated hardcoded state out of component for architecture purity.
const EVENTS_DATA: Record<string, any> = {
  AAPL: {
    event: "Taiwan Semiconductor Yield Drop",
    impact: "Negative",
    sectors: ["Semiconductors ↓", "Consumer Electronics ↓", "Supply Chain Logistics ↑"],
    affected_companies: ["TSM", "AAPL", "QCOM", "NVDA"],
    reasoning: "TSMC 3nm node yields drop → Chip cost increases → Apple iPhone margins compressed → AAPL stock faces headwinds."
  },
  MSFT: {
    event: "OpenAI Breakthrough Release",
    impact: "Positive",
    sectors: ["Artificial Intelligence ↑", "Cloud Computing ↑", "Enterprise Software ↑"],
    affected_companies: ["MSFT", "GOOGL", "AMZN"],
    reasoning: "New model release drives Azure compute usage → MSFT Copilot adoption scales → Cloud revenue increases."
  },
  DEFAULT: {
    event: "Middle East Conflict Escalation",
    impact: "Mixed",
    sectors: ["Energy ↑", "Airlines ↓", "Defense ↑", "Shipping ↓"],
    affected_companies: ["XOM", "DAL", "LMT", "NUE"],
    reasoning: "Oil supply risk → Oil price increases → Airlines cost increases → Airline stocks decline. Defense spending increases."
  }
};

const SUPPLY_CHAIN: Record<string, any[]> = {
  AAPL: [
    { type: 'supplier', name: 'TSMC', item: 'Silicon Chips', risk: 'High (Geopolitical)' },
    { type: 'supplier', name: 'Foxconn', item: 'Assembly', risk: 'Medium (Labor)' },
    { type: 'supplier', name: 'Corning', item: 'Glass', risk: 'Low' },
    { type: 'competitor', name: 'Samsung', item: 'Smartphones', risk: 'High' }
  ],
  DEFAULT: [
    { type: 'supplier', name: 'Albemarle', item: 'Lithium', risk: 'High (Commodity)' },
    { type: 'supplier', name: 'Nvidia', item: 'GPU Compute', risk: 'Medium (Supply)' },
    { type: 'consumer', name: 'Enterprise IT', item: 'SaaS', risk: 'Low' }
  ]
};

const ANOMALIES = [
  { time: '10:42 AM', asset: 'NVDA', type: 'Volume Spike', desc: 'Trading volume 3x normal. Probable institutional block buy.', severity: 'high' },
  { time: '09:15 AM', asset: 'XLE (Energy)', type: 'Sector Divergence', desc: 'Energy decoupling from SPY. Oil futures up 4.2%.', severity: 'medium' },
  { time: '08:30 AM', asset: 'AAPL', type: 'Options Flow', desc: '$20M in short-dated call options swept.', severity: 'medium' }
];

const MACRO = {
  rates: { value: '5.25%', trend: 'Hold', impact: 'Tech valuations stable' },
  inflation: { value: '3.1%', trend: 'Cooling', impact: 'Consumer discretionary ↑' },
  oil: { value: '$84.20', trend: 'Rising', impact: 'Transport ↓, Energy ↑' },
  dxy: { value: '104.2', trend: 'Flat', impact: 'Multinationals neutral' }
};

class IntelligenceService {
  async getEventsPipeline(ticker: string) {
    return new Promise((resolve) => {
      setTimeout(() => resolve(EVENTS_DATA[ticker] || EVENTS_DATA['DEFAULT']), 450);
    });
  }

  async getSupplyChainGraph(ticker: string) {
    return new Promise((resolve) => {
      setTimeout(() => resolve(SUPPLY_CHAIN[ticker] || SUPPLY_CHAIN['DEFAULT']), 250);
    });
  }

  async getMarketAnomalies() {
    return new Promise((resolve) => setTimeout(() => resolve(ANOMALIES), 200));
  }

  async getMacroIntel() {
    return new Promise((resolve) => setTimeout(() => resolve(MACRO), 100));
  }
}

export const intelligenceService = new IntelligenceService();
