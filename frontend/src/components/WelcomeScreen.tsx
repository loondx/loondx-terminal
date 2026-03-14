import React, { useCallback, useEffect, useState } from 'react';
import { stockService } from '../services/stock.service';
import { formatPrice } from '../utils/formatters';

interface WelcomeScreenProps {
  onSelect: (ticker: string) => void;
}

export const WelcomeScreen: React.FC<WelcomeScreenProps> = ({ onSelect }) => {
  const [query, setQuery] = useState('');
  const [focused, setFocused] = useState(false);
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [allStocks, setAllStocks] = useState<any[]>([]);

  useEffect(() => {
    stockService.getInitData().then(d => {
      setData(d);
      setLoading(false);
    });
    stockService.getAllStocks().then(s => setAllStocks(s));
  }, []);

  const handleSubmit = useCallback((raw: string) => {
    const ticker = raw.trim().toUpperCase();
    if (!ticker) return;
    onSelect(ticker);
  }, [onSelect]);

  const filtered = query.length >= 1
    ? allStocks.filter(s =>
        s.ticker.toUpperCase().includes(query.toUpperCase()) ||
        s.name.toUpperCase().includes(query.toUpperCase())
      ).slice(0, 10)
    : [];

  if (loading) return (
    <div className="flex-1 flex items-center justify-center bg-brand-bg">
      <div className="flex flex-col items-center gap-4">
        <div className="w-12 h-12 border-2 border-brand-bl border-t-transparent rounded-full animate-spin"></div>
        <span className="font-mono text-[10px] text-brand-t4 uppercase tracking-[0.3em] animate-pulse">Initializing Global Stream...</span>
      </div>
    </div>
  );

  return (
    <div className="flex-1 flex flex-col bg-brand-bg relative overflow-y-auto scrollbar-custom select-none p-6 md:p-10 lg:p-16">
      
      {/* Background Decor */}
      <div className="absolute inset-0 bg-[linear-gradient(rgba(14,165,233,0.02)_1px,transparent_1px),linear-gradient(90deg,rgba(14,165,233,0.02)_1px,transparent_1px)] bg-[size:60px_60px] pointer-events-none" />
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_60%_40%_at_50%_45%,rgba(14,165,233,0.05),transparent)] pointer-events-none" />

      <div className="relative z-10 max-w-[1240px] w-full mx-auto flex flex-col gap-16 pb-20">
        
        {/* HEADER SECTION */}
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-8 border-b border-brand-bd pb-12">
          <div>
            <div className="font-mono text-[48px] font-black tracking-[-3px] text-transparent bg-clip-text bg-gradient-to-r from-brand-bl via-white to-brand-pu leading-none mb-4">
              LOONDX<span className="text-brand-t4 opacity-20 text-[24px] tracking-widest ml-4 font-light italic">CORE_INIT</span>
            </div>
            <div className="font-mono text-[12px] text-brand-t3 tracking-[0.5em] uppercase flex items-center gap-3">
              <span className="w-2 h-2 rounded-full bg-brand-gr animate-pulse shadow-[0_0_8px_var(--gr)]"></span>
              Quantum Intelligence Terminal <span className="text-brand-t4 opacity-30"> v2.4.0</span>
            </div>
          </div>

          {/* Search Integrated into Welcome */}
          <div className="w-full md:w-[420px] relative">
            <div className={`flex items-center gap-3 bg-brand-bge border rounded-[8px] px-4 py-3 transition-all duration-300 ${focused ? 'border-brand-bl ring-2 ring-brand-bl/10 bg-brand-bgc' : 'border-brand-bd'}`}>
              <span className="text-brand-bl text-[16px] font-black">⌕</span>
              <input
                autoFocus
                type="text"
                placeholder="EXECUTE DEPTH RESEARCH..."
                className="flex-1 bg-transparent font-mono text-[13px] text-brand-t1 outline-none placeholder:text-brand-t4 tracking-widest"
                value={query}
                onChange={e => setQuery(e.target.value)}
                onFocus={() => setFocused(true)}
                onBlur={() => setTimeout(() => setFocused(false), 200)}
                onKeyDown={e => {
                  if (e.key === 'Enter') {
                    const first = filtered[0];
                    handleSubmit(first?.ticker || query);
                  }
                }}
              />
            </div>
            {focused && query.length > 0 && (
              <div className="absolute top-full left-0 right-0 mt-2 bg-brand-bge border border-brand-bdh rounded shadow-2xl z-50 overflow-hidden divide-y divide-brand-bd">
                {filtered.map(s => (
                  <button key={s.ticker} onMouseDown={() => handleSubmit(s.ticker)} className="w-full p-3 flex justify-between items-center hover:bg-brand-bgc transition-colors">
                    <div className="flex flex-col text-left">
                      <span className="font-mono font-black text-[12px] text-brand-bl">{s.ticker}</span>
                      <span className="text-[10px] text-brand-t4 uppercase">{s.name}</span>
                    </div>
                    <span className="font-mono text-[10px] text-brand-t3">₹{formatPrice(s.price)}</span>
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* MARKET SNAPSHOT GRID */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          
          {/* Recent Activity */}
          <div className="flex flex-col gap-4">
            <div className="flex items-center justify-between border-b border-brand-bd pb-2 mb-2">
               <span className="text-[10px] font-mono tracking-[0.3em] font-black uppercase text-brand-bl">Recently Researched</span>
               <span className="w-1.5 h-1.5 rounded-full bg-brand-bl"></span>
            </div>
            <div className="flex flex-col gap-2">
              {data.recent?.map((s: any) => (
                <button key={s.ticker} onClick={() => handleSubmit(s.ticker)} className="flex items-center justify-between p-3 bg-brand-bgc border border-brand-bd rounded hover:border-brand-bl transition-all group">
                  <div className="flex flex-col text-left">
                    <span className="font-mono font-black text-[13px] text-brand-t1 group-hover:text-brand-bl">{s.ticker}</span>
                    <span className="text-[9px] text-brand-t4 uppercase tracking-tighter">{s.name}</span>
                  </div>
                  <div className="text-right flex flex-col items-end">
                    <span className="font-mono text-[12px] font-bold">₹{formatPrice(s.price)}</span>
                    <span className={`text-[10px] font-mono ${s.changePercent >= 0 ? 'text-brand-gr' : 'text-brand-re'}`}>
                      {s.changePercent >= 0 ? '▲' : '▼'}{Math.abs(s.changePercent).toFixed(2)}%
                    </span>
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* Market Sentiment / Movers */}
          <div className="flex flex-col gap-4">
             <div className="flex items-center justify-between border-b border-brand-bd pb-2 mb-2">
                <span className="text-[10px] font-mono tracking-[0.3em] font-black uppercase text-brand-gr">Top Performers</span>
                <span className="w-1.5 h-1.5 rounded-full bg-brand-gr"></span>
             </div>
             <div className="grid grid-cols-1 gap-2">
                {data.gainers?.map((s: any) => (
                  <button key={s.ticker} onClick={() => handleSubmit(s.ticker)} className="flex items-center gap-4 p-3 bg-[rgba(34,197,94,0.04)] border border-brand-gr/20 rounded hover:bg-[rgba(34,197,94,0.08)] transition-all">
                    <div className="font-mono font-black text-[14px] text-brand-gr w-20">{s.ticker}</div>
                    <div className="flex-1 text-[10px] text-brand-t3 truncate uppercase">{s.name}</div>
                    <div className="text-brand-gr font-mono font-black text-[11px]">+{s.changePercent.toFixed(2)}%</div>
                  </button>
                ))}
             </div>
             <div className="mt-4 flex items-center justify-between border-b border-brand-bd pb-2 mb-2 opacity-60">
                <span className="text-[10px] font-mono tracking-[0.3em] font-black uppercase text-brand-re">Session Underperformers</span>
                <span className="w-1.5 h-1.5 rounded-full bg-brand-re"></span>
             </div>
             <div className="grid grid-cols-1 gap-2 opacity-80">
                {data.losers?.map((s: any) => (
                  <button key={s.ticker} onClick={() => handleSubmit(s.ticker)} className="flex items-center gap-4 p-3 bg-[rgba(239,68,68,0.04)] border border-brand-re/20 rounded hover:bg-[rgba(239,68,68,0.08)] transition-all">
                    <div className="font-mono font-black text-[14px] text-brand-re w-20">{s.ticker}</div>
                    <div className="flex-1 text-[10px] text-brand-t3 truncate uppercase">{s.name}</div>
                    <div className="text-brand-re font-mono font-black text-[11px]">{s.changePercent.toFixed(2)}%</div>
                  </button>
                ))}
             </div>
          </div>

          {/* Macro Signals & Narrative */}
          <div className="flex flex-col gap-6">
             <div className="p-6 bg-brand-bgc border border-brand-bd rounded-lg shadow-2xl flex flex-col gap-4 relative overflow-hidden group">
                <div className="absolute top-0 right-0 w-32 h-32 bg-brand-bl opacity-[0.03] blur-3xl group-hover:opacity-[0.06] transition-opacity" />
                <div className="text-[9px] font-black font-mono text-brand-t4 uppercase tracking-widest border-b border-brand-bd pb-2">Institutional Intelligence Pulse</div>
                <div className="text-[13px] text-brand-t2 leading-relaxed font-serif italic text-justify opacity-90">
                  {data.summary?.narrative || "Aggregating global macro signals and quantitative indicators to synthesize current session context..."}
                </div>
                <div className="flex flex-wrap gap-2 mt-2">
                  {data.summary?.topThemes?.slice(0, 3).map((t: string) => (
                    <span key={t} className="text-[9px] font-mono font-black text-brand-bl bg-brand-blg px-2 py-0.5 rounded border border-brand-bl/20 uppercase">{t}</span>
                  ))}
                </div>
             </div>

             <div className="flex flex-col gap-3">
               <span className="text-[9px] font-mono tracking-[0.3em] font-black uppercase text-brand-pu pl-2">Active Macro Signals</span>
               {data.macro?.map((m: any) => (
                 <div key={m.id} className="p-4 bg-[rgba(139,92,246,0.03)] border border-brand-pu/10 rounded flex flex-col gap-2">
                    <div className="flex justify-between items-center">
                       <span className="text-[11px] font-black text-brand-t1 uppercase tracking-tight line-clamp-1">{m.title}</span>
                       <span className={`text-[8px] font-black px-1.5 rounded uppercase ${m.impact === 'POSITIVE' ? 'text-brand-gr bg-brand-gr/10' : 'text-brand-re bg-brand-re/10'}`}>{m.impact}</span>
                    </div>
                    <p className="text-[10px] text-brand-t4 line-clamp-2 leading-snug">{m.description}</p>
                 </div>
               ))}
             </div>
          </div>

        </div>

        {/* FOOTER ACTION */}
        <div className="mt-12 flex flex-col items-center gap-6 opacity-30 hover:opacity-100 transition-opacity">
           <div className="flex items-center gap-6">
              <div className="flex flex-col items-center">
                <span className="text-[18px] mb-1">🛡️</span>
                <span className="text-[9px] font-mono uppercase tracking-widest text-brand-t4">SOC 2 COMPLIANT</span>
              </div>
              <div className="w-[1px] h-6 bg-brand-bd"></div>
              <div className="flex flex-col items-center">
                <span className="text-[18px] mb-1">🔒</span>
                <span className="text-[9px] font-mono uppercase tracking-widest text-brand-t4">AES-256 ENCRYPTED</span>
              </div>
              <div className="w-[1px] h-6 bg-brand-bd"></div>
              <div className="flex flex-col items-center">
                <span className="text-[18px] mb-1">🏦</span>
                <span className="text-[9px] font-mono uppercase tracking-widest text-brand-t4">INSTITUTIONAL GRADE</span>
              </div>
           </div>
        </div>

      </div>
    </div>
  );
};
