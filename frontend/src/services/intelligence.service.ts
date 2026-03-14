import { fetchClient } from './api.config';
/**
 * Intelligence and Agentic AI Services
 * Fetches real-time AI insights, supply chain graphs, and market anomalies from the LOONDX Backend.
 */

class IntelligenceService {
  async getEventsPipeline(ticker: string) {
    try {
      const data = await fetchClient<any>(`/terminal/intelligence/${ticker}`);
      const latestInsight = data.aiInsights?.[0];
      
      // Extract sectors from the stock's sector if available
      const sectors = data.sector ? [`${data.sector.name} ${data.changePercent >= 0 ? '↑' : '↓'}`] : ["General Market ↑"];
      
      // Extract affected companies from supply chain
      const affected = [ticker];
      if (data.upstream) data.upstream.forEach((u: any) => affected.push(u.dependsOnTicker || u.dependsOn?.ticker));
      if (data.downstream) data.downstream.forEach((d: any) => affected.push(d.stockTicker || d.stock?.ticker));

      return {
        event: latestInsight?.analysisType || "Market Equilibrium",
        reasoning: latestInsight?.summary || "No active catalysts detected. Analyzing structural price support levels.",
        sectors: sectors,
        affected_companies: Array.from(new Set(affected)).slice(0, 5)
      };
    } catch (error) {
      console.error('Failed to fetch event pipeline:', error);
      return {
        event: "Data Stream Interrupted",
        reasoning: "Connection to LOONDX Intelligence Engine lost. Synchronizing...",
        sectors: [],
        affected_companies: []
      };
    }
  }

  async getSupplyChainGraph(ticker: string) {
    try {
      const data = await fetchClient<any>(`/terminal/intelligence/${ticker}`);
      const upstream = (data.upstream || []).map((u: any) => ({
        type: 'supplier',
        name: u.dependsOn?.name || u.dependsOnTicker,
        item: u.item || 'Core Input',
        risk: u.riskLevel || 'Low'
      }));
      
      const downstream = (data.downstream || []).map((d: any) => ({
        type: 'consumer',
        name: d.stock?.name || d.stockTicker,
        item: d.item || 'Final Product',
        risk: 'Medium'
      }));

      return [...upstream, ...downstream];
    } catch (error) {
      console.error('Failed to fetch supply chain:', error);
      return [];
    }
  }

  async getMarketAnomalies() {
    try {
      const data = await fetchClient<any>('/terminal/market-status');
      return (data.trends || []).map((t: any) => ({
        time: new Date(t.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        asset: t.query,
        type: t.isSpiking ? 'Spike Detected' : 'Trending',
        desc: `Search volume for "${t.query}" is ${t.isSpiking ? 'surging' : 'elevated'} in Indian markets.`,
        severity: t.isSpiking ? 'high' : 'medium'
      }));
    } catch (error) {
      console.error('Failed to fetch market anomalies:', error);
      return [];
    }
  }

  async getMacroIntel() {
    try {
      const data = await fetchClient<any>('/terminal/market-status');
      const macro: Record<string, any> = {};
      (data.macro || []).forEach((m: any) => {
        if (m.name.includes('Repo')) macro.rates = { value: `${m.value}${m.unit}`, impact: m.change >= 0 ? 'Hawkish' : 'Dovish' };
        if (m.name.includes('USD/INR')) macro.inflation = { value: `${m.value}${m.unit}`, impact: 'Currency Vol' };
        if (m.name.includes('Oil')) macro.oil = { value: `${m.value}${m.unit}`, impact: m.change >= 0 ? 'Inflationary' : 'Deflationary' };
        if (m.name.includes('Nifty')) macro.dxy = { value: `${m.value}${m.unit}`, impact: 'Index Pulse' };
      });

      return {
        rates: macro.rates || { value: '6.50%', impact: 'Neutral' },
        inflation: macro.inflation || { value: '84.32', impact: 'Stable' },
        oil: macro.oil || { value: '$78.4', impact: 'Stable' },
        dxy: macro.dxy || { value: '24323', impact: 'Sideways' }
      };
    } catch (error) {
      console.error('Failed to fetch macro intel:', error);
      return null;
    }
  }
}

export const intelligenceService = new IntelligenceService();
