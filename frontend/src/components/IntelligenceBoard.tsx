import React, { useState, useEffect } from 'react';
import { intelligenceService } from '../services/intelligence.service';

interface Props {
  curStock: string;
}

export const IntelligenceBoard: React.FC<Props> = ({ curStock }) => {
  const [loading, setLoading] = useState(true);
  const [event, setEvent] = useState<any>(null);
  const [chain, setChain] = useState<any[]>([]);
  const [anomalies, setAnomalies] = useState<any[]>([]);
  const [macro, setMacro] = useState<any>(null);

  useEffect(() => {
    let unmounted = false;
    setLoading(true);
    
    // Abstracted Promise.all fetching pattern mimicking real network calls
    Promise.all([
      intelligenceService.getEventsPipeline(curStock),
      intelligenceService.getSupplyChainGraph(curStock),
      intelligenceService.getMarketAnomalies(),
      intelligenceService.getMacroIntel()
    ]).then(([evRes, chainRes, anomRes, macRes]) => {
      if (!unmounted) {
        setEvent(evRes);
        setChain(chainRes as any[]);
        setAnomalies(anomRes as any[]);
        setMacro(macRes);
        setLoading(false);
      }
    });

    return () => { unmounted = true; };
  }, [curStock]);

  if (loading || !event || !macro) {
    return (
      <div className="flex-1 flex items-center justify-center bg-brand-bg relative overflow-hidden">
        <div className="absolute inset-0 bg-[linear-gradient(rgba(14,165,233,0.03)_1px,transparent_1px),linear-gradient(90deg,rgba(14,165,233,0.03)_1px,transparent_1px)] bg-[size:20px_20px]"></div>
        <div className="flex flex-col items-center gap-[15px] z-10">
          <div className="w-[30px] h-[30px] border-2 border-brand-t3 border-t-brand-bl rounded-full animate-spin"></div>
          <div className="font-mono text-[10px] tracking-[.2em] text-brand-bl uppercase animate-pulse">Running AI Market Impact Models...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col md:flex-row gap-[1px] bg-brand-bd overflow-hidden min-h-0">
      
      {/* LEFT COL: EVENT & MACRO */}
      <div className="flex-1 flex flex-col gap-[1px] overflow-hidden min-w-0">
        
        {/* EVENT PIPELINE WIDGET */}
        <div className="flex-1 bg-brand-bgp flex flex-col overflow-hidden min-h-0">
          <div className="flex items-center justify-between py-[8px] px-[14px] border-b border-brand-bd shrink-0 bg-brand-bgc">
            <div className="font-mono text-[10px] font-semibold tracking-[.15em] uppercase text-brand-t1 flex items-center gap-[6px]">
              <span className="w-[6px] h-[6px] rounded-full bg-brand-re shadow-[0_0_6px_var(--re)] animate-pulse"></span>
              AI EVENT IMPACT DETECTOR
            </div>
          </div>
          <div className="flex-1 p-[14px] overflow-y-auto scrollbar-custom">
            <div className="mb-[16px]">
              <div className="text-[9px] uppercase tracking-[.1em] text-brand-t3 mb-[4px]">Detected Catalyst Event</div>
              <div className="font-mono text-[16px] font-bold text-center py-[10px] border border-brand-bd rounded-[4px] bg-[rgba(239,68,68,0.05)] text-brand-t1">
                {event.event}
              </div>
            </div>
            
            <div className="flex items-stretch gap-[10px] mb-[16px]">
              <div className="w-[2px] bg-gradient-to-b from-brand-bl via-brand-pu to-brand-or rounded-full shrink-0"></div>
              <div className="flex-1 space-y-[10px]">
                <div className="text-[9px] uppercase tracking-[.1em] text-brand-t3">System Reasoning Pipeline</div>
                <div className="font-mono text-[11px] text-brand-t2 leading-[1.6]">
                  {event.reasoning.split('→').map((step: string, i: number, arr: any[]) => (
                    <React.Fragment key={i}>
                      <span className="text-brand-t1 bg-brand-bge px-[4px] py-[2px] rounded-[2px] border border-brand-bd">{step.trim()}</span>
                      {i < arr.length - 1 && <span className="text-brand-t4 mx-[4px]">→</span>}
                    </React.Fragment>
                  ))}
                </div>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-[10px]">
              <div className="border border-brand-bd rounded-[4px] p-[8px] bg-brand-bge">
                <div className="text-[8px] uppercase tracking-[.1em] text-brand-t3 mb-[6px]">Affected Sectors</div>
                <div className="flex flex-col gap-[4px]">
                  {event.sectors.map((s: string, i: number) => (
                    <div key={i} className={`font-mono text-[10px] ${s.includes('↑') ? 'text-brand-gr' : 'text-brand-re'}`}>{s}</div>
                  ))}
                </div>
              </div>
              <div className="border border-brand-bd rounded-[4px] p-[8px] bg-brand-bge">
                <div className="text-[8px] uppercase tracking-[.1em] text-brand-t3 mb-[6px]">Exposed Companies</div>
                <div className="flex flex-wrap gap-[4px]">
                  {event.affected_companies.map((c: string, i: number) => (
                    <span key={i} className="font-mono text-[10px] px-[6px] py-[2px] rounded-[3px] bg-brand-bg text-brand-t1 border border-brand-bd">{c}</span>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* MACRO INTELLIGENCE */}
        <div className="h-[200px] bg-brand-bgp flex flex-col shrink-0">
          <div className="flex items-center justify-between py-[6px] px-[14px] border-b border-brand-bd shrink-0">
            <div className="font-mono text-[9px] font-semibold tracking-[.15em] uppercase text-brand-t2 flex items-center gap-[6px]">
              <span className="w-[5px] h-[5px] rounded-full bg-brand-bl shadow-[0_0_5px_var(--bl)]"></span>
              MACRO INTELLIGENCE LAYER
            </div>
          </div>
          <div className="grid grid-cols-2 lg:grid-cols-4 flex-1">
            <div className="p-[10px] border-r border-brand-bd flex flex-col justify-center relative overflow-hidden group">
              <div className="absolute inset-0 bg-gradient-to-b from-transparent to-[rgba(14,165,233,0.05)] opacity-0 group-hover:opacity-100 transition-opacity"></div>
              <div className="text-[9px] uppercase tracking-[.1em] text-brand-t3 mb-[4px] z-10">Fed Rate</div>
              <div className="font-mono text-[18px] font-bold text-brand-bl z-10">{macro.rates.value}</div>
              <div className="font-mono text-[9px] text-brand-gr mt-[4px] z-10">{macro.rates.impact}</div>
            </div>
            <div className="p-[10px] border-r border-brand-bd flex flex-col justify-center relative overflow-hidden group">
              <div className="absolute inset-0 bg-gradient-to-b from-transparent to-[rgba(14,165,233,0.05)] opacity-0 group-hover:opacity-100 transition-opacity"></div>
              <div className="text-[9px] uppercase tracking-[.1em] text-brand-t3 mb-[4px] z-10">Inflation (CPI)</div>
              <div className="font-mono text-[18px] font-bold text-brand-tl z-10">{macro.inflation.value}</div>
              <div className="font-mono text-[9px] text-brand-or mt-[4px] z-10">{macro.inflation.impact}</div>
            </div>
            <div className="p-[10px] border-r border-brand-bd flex flex-col justify-center relative overflow-hidden group">
              <div className="absolute inset-0 bg-gradient-to-b from-transparent to-[rgba(14,165,233,0.05)] opacity-0 group-hover:opacity-100 transition-opacity"></div>
              <div className="text-[9px] uppercase tracking-[.1em] text-brand-t3 mb-[4px] z-10">WTI Crude</div>
              <div className="font-mono text-[18px] font-bold text-brand-ye z-10">{macro.oil.value}</div>
              <div className="font-mono text-[9px] text-brand-re mt-[4px] z-10">{macro.oil.impact}</div>
            </div>
            <div className="p-[10px] flex flex-col justify-center relative overflow-hidden group">
              <div className="absolute inset-0 bg-gradient-to-b from-transparent to-[rgba(14,165,233,0.05)] opacity-0 group-hover:opacity-100 transition-opacity"></div>
              <div className="text-[9px] uppercase tracking-[.1em] text-brand-t3 mb-[4px] z-10">DXY Index</div>
              <div className="font-mono text-[18px] font-bold text-brand-t1 z-10">{macro.dxy.value}</div>
              <div className="font-mono text-[9px] text-brand-t3 mt-[4px] z-10">{macro.dxy.impact}</div>
            </div>
          </div>
        </div>
      </div>

      {/* RIGHT COL: SUPPLY CHAIN & ANOMALIES */}
      <div className="w-full md:w-[360px] flex flex-col gap-[1px] overflow-hidden shrink-0">
        
        {/* SUPPLY CHAIN GRAPH */}
        <div className="flex-[1.5] bg-brand-bgp flex flex-col overflow-hidden">
          <div className="flex items-center justify-between py-[8px] px-[14px] border-b border-brand-bd shrink-0">
            <div className="font-mono text-[9px] font-semibold tracking-[.15em] uppercase text-brand-t2 flex items-center gap-[6px]">
              <span className="w-[5px] h-[5px] rounded-full bg-brand-or shadow-[0_0_5px_var(--or)]"></span>
              SUPPLY CHAIN NETWORK
            </div>
          </div>
          <div className="flex-1 p-[10px] overflow-y-auto scrollbar-custom relative">
            <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-[rgba(23,32,56,0.5)] to-transparent pointer-events-none"></div>
            
            <div className="flex flex-col gap-[8px] relative z-10">
              <div className="mx-auto bg-brand-blg border border-brand-bl px-[12px] py-[6px] rounded-[4px] font-mono text-[12px] font-bold text-brand-bl shadow-[0_0_10px_rgba(14,165,233,.2)]">
                {curStock}
              </div>
              <div className="h-[20px] w-[2px] bg-brand-bd mx-auto"></div>
              
              {chain.map((c, i) => (
                <div key={i} className="bg-brand-bgc border border-brand-bd rounded-[4px] p-[8px] flex items-center justify-between hover:border-brand-t3 transition-colors group">
                  <div>
                    <div className="font-mono text-[11px] text-brand-t1 font-semibold">{c.name}</div>
                    <div className="text-[9px] text-brand-t3">{c.type.toUpperCase()} • {c.item}</div>
                  </div>
                  <div className="text-right">
                    <div className="text-[8px] uppercase tracking-[.1em] text-brand-t4 mb-[2px]">Risk Exposure</div>
                    <div className={`font-mono text-[9px] px-[4px] py-[2px] rounded-[2px] ${c.risk.includes('High') ? 'bg-brand-reg text-brand-re' : c.risk.includes('Medium') ? 'bg-brand-org text-brand-or' : 'bg-brand-grg text-brand-gr'}`}>
                      {c.risk}
                    </div>
                  </div>
                </div>
              ))}

              <div className="mt-[10px] p-[6px] border border-[rgba(249,115,22,.3)] bg-[rgba(249,115,22,.05)] rounded-[4px] text-center">
                <div className="text-[9px] text-brand-or font-mono">⚠️ 1 Supply chain disruption detected.</div>
              </div>
            </div>
          </div>
        </div>

        {/* MARKET ANOMALIES */}
        <div className="flex-1 bg-brand-bgp flex flex-col overflow-hidden">
          <div className="flex items-center justify-between py-[8px] px-[14px] border-b border-brand-bd shrink-0">
            <div className="font-mono text-[9px] font-semibold tracking-[.15em] uppercase text-brand-t2 flex items-center gap-[6px]">
              <span className="w-[5px] h-[5px] rounded-full bg-brand-ye shadow-[0_0_5px_var(--ye)] animate-pulse"></span>
              MARKET RADAR & ANOMALIES
            </div>
          </div>
          <div className="flex-1 overflow-y-auto scrollbar-custom">
            {anomalies.map((a, i) => (
              <div key={i} className="p-[10px] border-b border-brand-bd hover:bg-brand-bgc transition-colors cursor-default">
                <div className="flex items-center justify-between mb-[4px]">
                  <div className="flex items-center gap-[6px]">
                    <span className={`font-mono text-[10px] font-bold px-[4px] py-[1px] rounded-[2px] ${a.severity === 'high' ? 'bg-brand-re text-[white]' : 'bg-brand-or text-[white]'}`}>
                      {a.asset}
                    </span>
                    <span className="font-mono text-[10px] text-brand-t1">{a.type}</span>
                  </div>
                  <span className="font-mono text-[9px] text-brand-t4">{a.time}</span>
                </div>
                <div className="text-[11px] text-brand-t3 leading-[1.4]">{a.desc}</div>
              </div>
            ))}
          </div>
        </div>
      </div>

    </div>
  );
};
