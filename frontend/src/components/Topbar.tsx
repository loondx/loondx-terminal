import React, { useState, useEffect } from 'react';
import { STOCKS, TICKS } from '../data';
import { AppLogo } from './AppLogo';

interface TopbarProps {
  curStock: string;
  setCurStock: (stock: string) => void;
  viewMode: 'TERMINAL' | 'INTELLIGENCE';
  setViewMode: (mode: 'TERMINAL' | 'INTELLIGENCE') => void;
  showToast: (msg: string) => void;
}

export const Topbar: React.FC<TopbarProps> = ({ curStock, setCurStock, viewMode, setViewMode, showToast }) => {
  const [search, setSearch] = useState('');
  const [showSugg, setShowSugg] = useState(false);
  const [time, setTime] = useState('--:--:-- EST');

  // Clock
  useEffect(() => {
    const interval = setInterval(() => {
      const n = new Date();
      setTime(
        String(n.getHours()).padStart(2, '0') + ':' +
        String(n.getMinutes()).padStart(2, '0') + ':' +
        String(n.getSeconds()).padStart(2, '0') + ' IST'
      );
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="min-h-[48px] bg-[rgba(7,12,24,.98)] border-b border-brand-bd flex flex-wrap items-center px-[14px] py-[8px] lg:py-0 gap-[11px] shrink-0 backdrop-blur-[12px] z-50">
      <AppLogo hiddenOnMobile />
      <div className="hidden sm:block w-[1px] h-[24px] bg-brand-bd shrink-0"></div>

      <div className="relative w-full sm:w-[270px] shrink-0">
        <span className="absolute left-[9px] top-1/2 -translate-y-1/2 text-brand-t3 text-[13px] pointer-events-none">⌕</span>
        <input
          type="text"
          className="w-full bg-brand-bgc border border-brand-bd rounded-[4px] py-[6px] pr-[10px] pl-[30px] font-mono text-[12px] text-brand-t1 outline-none transition-all duration-200 tracking-[.04em] focus:focus-ring-bl placeholder:text-brand-t3"
          placeholder="Search ticker, ISIN, company…"
          value={search}
          onChange={(e) => { setSearch(e.target.value); setShowSugg(true); }}
          onFocus={() => setShowSugg(true)}
          onBlur={() => setTimeout(() => setShowSugg(false), 200)}
        />
        {showSugg && (
          <div className="absolute top-[calc(100%+4px)] left-0 right-0 bg-brand-bge border border-brand-bdh rounded-[4px] overflow-hidden z-[300] shadow-[0_16px_40px_rgba(0,0,0,.5)] block">
            {Object.entries(STOCKS).filter(([k, v]) => k.includes(search.toUpperCase()) || v.name.toUpperCase().includes(search.toUpperCase())).map(([k, v]) => (
              <div key={k} className="p-[8px_12px] cursor-pointer flex items-center gap-[8px] border-b border-brand-bd transition-colors duration-100 hover:bg-brand-bgh last:border-none" onClick={() => { setCurStock(k); setSearch(''); setShowSugg(false); showToast(`✓ Loaded ${k} — ${v.name}`); }}>
                <span className="font-mono font-semibold text-[12px] text-brand-bl min-w-[50px]">{k}</span>
                <span className="text-brand-t2 text-[11px] flex-1">{v.name}</span>
                <span className={`font-mono text-[11px] ${v.dir === 'up' ? 'text-brand-gr' : 'text-brand-re'}`}>${v.price.toFixed(2)}</span>
                <span className={`font-mono text-[10px] ${v.dir === 'up' ? 'text-brand-gr' : 'text-brand-re'}`}>{v.chg > 0 ? '+' : ''}{v.pct.toFixed(2)}%</span>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="w-[1px] h-[24px] bg-brand-bd shrink-0"></div>

      <div className="flex items-center gap-[4px] px-[8px] shrink-0">
        <button className={`font-mono text-[9px] font-bold tracking-[.1em] py-[4px] px-[12px] rounded-[3px] border cursor-pointer transition-all uppercase ${viewMode === 'TERMINAL' ? 'text-brand-bl border-brand-bld bg-brand-blg shadow-[0_0_8px_rgba(14,165,233,.2)]' : 'border-transparent text-brand-t3 hover:text-brand-t1 hover:bg-brand-bge'}`} onClick={() => setViewMode('TERMINAL')}>MARKETS</button>
        <button className={`font-mono text-[9px] font-bold tracking-[.1em] py-[4px] px-[12px] rounded-[3px] border cursor-pointer transition-all uppercase flex items-center gap-[5px] ${viewMode === 'INTELLIGENCE' ? 'text-brand-pu border-[#8b5cf6] bg-[rgba(139,92,246,.08)] shadow-[0_0_8px_rgba(139,92,246,.2)]' : 'border-transparent text-brand-t3 hover:text-brand-t1 hover:bg-brand-bge'}`} onClick={() => setViewMode('INTELLIGENCE')}>
          {viewMode === 'INTELLIGENCE' && <span className="w-[4px] h-[4px] rounded-full bg-brand-pu animate-pulse"></span>}
          AI INTELLIGENCE
        </button>
      </div>

      <div className="hidden lg:block w-[1px] h-[24px] bg-brand-bd shrink-0"></div>

      <div className="hidden lg:flex gap-0 flex-1 overflow-x-auto scrollbar-none">
        {TICKS.map(t => (
          <div key={t.s} className="flex items-center gap-[5px] py-[4px] px-[9px] border-r border-brand-bd cursor-pointer transition-colors hover:bg-brand-bgc whitespace-nowrap">
            <span className="font-mono text-[10px] font-semibold text-brand-t3">{t.s}</span>
            <span className="font-mono text-[10px] text-brand-t1">{t.p > 999 ? t.p.toLocaleString() : t.p.toFixed(t.p > 10 ? 2 : 4)}</span>
            <span className={`font-mono text-[9px] ${t.c > 0 ? 'text-brand-gr' : 'text-brand-re'}`}>{t.c > 0 ? '+' : ''}{t.c.toFixed(2)}%</span>
          </div>
        ))}
      </div>

      <div className="flex items-center gap-[7px] ml-auto shrink-0 flex-wrap justify-end">
        <div className="flex items-center gap-[5px] py-[4px] px-[9px] bg-brand-grg border border-[rgba(34,197,94,.25)] rounded-[4px]">
          <div className="w-[6px] h-[6px] rounded-full bg-brand-gr shadow-[0_0_7px_var(--gr)] animate-flash"></div>
          <span className="font-mono text-[9px] text-brand-gr tracking-[.08em]">NYSE OPEN</span>
        </div>
        <div className="font-mono text-[11px] text-brand-t2">{time}</div>
        <div className="w-[1px] h-[24px] bg-brand-bd shrink-0"></div>
        <div className="w-[30px] h-[30px] bg-brand-bgc border border-brand-bd rounded-[4px] flex items-center justify-center cursor-pointer text-brand-t2 text-[13px] transition-all hover:border-brand-bl hover:text-brand-bl" onClick={() => showToast('📊 2 price alerts triggered for ' + curStock)}>🔔</div>
        <div className="w-[30px] h-[30px] bg-brand-bgc border border-brand-bd rounded-[4px] flex items-center justify-center cursor-pointer text-brand-t2 text-[13px] transition-all hover:border-brand-bl hover:text-brand-bl" onClick={() => showToast('★ Watchlist: AAPL MSFT NVDA OTHERS')}>★</div>
        <div className="w-[30px] h-[30px] bg-brand-bgc border border-brand-bd rounded-[4px] flex items-center justify-center cursor-pointer text-brand-t2 text-[13px] transition-all hover:border-brand-bl hover:text-brand-bl" onClick={() => showToast('⚙ Settings panel')}>⚙</div>
      </div>
    </div>
  );
};
