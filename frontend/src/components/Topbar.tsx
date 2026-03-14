import React, { useState, useEffect } from 'react';
import { AppLogo } from './AppLogo';
import { stockService } from '../services/stock.service';
import { formatPrice, formatPercent } from '../utils/formatters';

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
  const [time, setTime] = useState('--:--:-- IST');
  const [allStocks, setAllStocks] = useState<any[]>([]);
  const [marketStatus, setMarketStatus] = useState<any>({ macro: [], topGainers: [] });

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

  // Fetch stocks for search and market status for marquee
  useEffect(() => {
    stockService.getAllStocks().then(setAllStocks);
    stockService.getMarketStatus().then(setMarketStatus);
  }, []);

  // Filter logic: show all DB stocks on focus, filter by query when typing
  const filtered = search.length >= 1
    ? allStocks.filter((s) =>
        s.ticker.includes(search.toUpperCase()) || s.name.toUpperCase().includes(search.toUpperCase())
      ).slice(0, 8)
    : allStocks.slice(0, 8); // show up to 8 recent stocks on focus

  return (
    <div className="min-h-[48px] bg-[rgba(7,12,24,.98)] border-b border-brand-bd flex flex-wrap items-center px-[14px] py-[8px] lg:py-0 gap-[11px] shrink-0 backdrop-blur-[12px] z-[10000]">
      <div onClick={() => setCurStock('')} className="cursor-pointer hover:opacity-80 transition-opacity">
        <AppLogo hiddenOnMobile />
      </div>
      <div className="hidden sm:block w-[1px] h-[24px] bg-brand-bd shrink-0"></div>

      {/* SEARCH CONTAINER */}
      <div className="relative w-full sm:w-[320px] shrink-0">
        <span className="absolute left-[9px] top-1/2 -translate-y-1/2 text-brand-t3 text-[13px] pointer-events-none">⌕</span>
        <input
          type="text"
          className="w-full bg-brand-bgc border border-brand-bd rounded-[4px] py-[6px] pr-[30px] pl-[30px] font-mono text-[12px] text-brand-t1 outline-none transition-all duration-200 tracking-[.04em] focus:border-brand-bl placeholder:text-brand-t3"
          placeholder="Search ticker (e.g. RELIANCE, TCS)..."
          value={search}
          onChange={(e) => { 
            setSearch(e.target.value); 
            setShowSugg(true); 
          }}
          onFocus={() => setShowSugg(true)}
          onBlur={() => {
            setTimeout(() => setShowSugg(false), 250);
          }}
        />
        {search ? (
          <button 
            className="absolute right-[8px] top-1/2 -translate-y-1/2 text-brand-bl hover:text-brand-t1 text-[14px] font-black"
            onClick={() => {
              setSearch('');
              setShowSugg(false);
            }}
          >×</button>
        ) : curStock ? (
          <button 
            className="absolute right-[8px] top-1/2 -translate-y-1/2 text-brand-t4 hover:text-brand-bl text-[10px] font-mono font-bold"
            onClick={() => setCurStock('')}
          >ESC</button>
        ) : null}

        {showSugg && (
          <div className="absolute top-[calc(100%+6px)] left-0 right-0 bg-brand-bge border border-brand-bdh rounded-[4px] overflow-hidden z-[10001] shadow-[0_20px_50px_rgba(0,0,0,.6)]">
          <div className="p-[6px_10px] bg-brand-bgc border-b border-brand-bd text-[9px] text-brand-t4 font-bold tracking-widest uppercase flex justify-between">
              <span>{search ? 'Search Results' : 'Recent Instruments'}</span>
              <span>{filtered.length} found</span>
            </div>
            {filtered.map((s) => (
              <div 
                key={s.ticker} 
                className="p-[10px_12px] cursor-pointer flex items-center gap-[10px] border-b border-brand-bd last:border-none transition-colors duration-100 hover:bg-brand-bgh active:bg-brand-blg"
                onClick={() => {
                  setCurStock(s.ticker);
                  setSearch('');
                  setShowSugg(false);
                  showToast(`✓ Instrument Switched: ${s.ticker}`);
                }}
              >
                <div className="w-[36px] h-[36px] rounded-[4px] bg-brand-bgc flex items-center justify-center font-bold text-brand-bl text-[11px] border border-brand-bd">{s.ticker[0]}</div>
                <div className="flex-1 overflow-hidden">
                  <div className="font-mono font-bold text-[12px] text-brand-t1">{s.ticker}</div>
                  <div className="text-brand-t3 text-[10px] truncate">{s.name}</div>
                </div>
                <div className="text-right">
                  <div className={`font-mono text-[11px] font-bold ${s.changePercent >= 0 ? 'text-brand-gr' : 'text-brand-re'}`}>₹{formatPrice(s.price)}</div>
                  <div className={`font-mono text-[9px] ${s.changePercent >= 0 ? 'text-brand-gr' : 'text-brand-re'}`}>{formatPercent(s.changePercent)}</div>
                </div>
              </div>
            ))}
            {search && search.length >= 2 && !filtered.find(s => s.ticker === search.toUpperCase()) && (
              <div 
                className="p-[12px] cursor-pointer flex items-center gap-[10px] bg-[rgba(14,165,233,0.05)] hover:bg-[rgba(14,165,233,0.1)] transition-colors"
                onClick={() => {
                  const ticker = search.includes('.') ? search.toUpperCase() : `${search.toUpperCase()}.NS`;
                  setCurStock(ticker);
                  setSearch('');
                  setShowSugg(false);
                  showToast(`🔍 Searching LOONDX Engine for ${ticker}...`);
                }}
              >
                <div className="w-[36px] h-[36px] rounded-[4px] bg-brand-bl flex items-center justify-center text-[white] text-[16px]">📡</div>
                <div className="flex-1">
                  <div className="font-mono font-bold text-[12px] text-brand-bl">Search External: {search.toUpperCase()}</div>
                  <div className="text-brand-t3 text-[10px]">Fetch real-time data from Indian API</div>
                </div>
              </div>
            )}
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

      <div className="hidden lg:flex gap-0 flex-1 overflow-x-auto scrollbar-none items-center">
        {marketStatus.macro.map((m: any) => (
          <div key={m.id} className="flex items-center gap-[5px] py-[4px] px-[9px] border-r border-brand-bd cursor-pointer transition-colors hover:bg-brand-bgc whitespace-nowrap group">
            <span className="font-mono text-[10px] font-semibold text-brand-t3 group-hover:text-brand-bl">{m.name}</span>
            <span className="font-mono text-[10px] text-brand-t1">{m.value}{m.unit}</span>
            <span className={`font-mono text-[9px] ${m.change >= 0 ? 'text-brand-gr' : 'text-brand-re'}`}>{m.change >= 0 ? '+' : ''}{m.change.toFixed(2)}%</span>
          </div>
        ))}
      </div>

      <div className="flex items-center gap-[10px] ml-auto shrink-0 flex-wrap justify-end">
        <div className="flex items-center gap-[5px] py-[4px] px-[9px] bg-brand-grg border border-[rgba(34,197,94,.2)] rounded-[4px]">
          <div className="w-[6px] h-[6px] rounded-full bg-brand-gr shadow-[0_0_7px_var(--gr)] animate-pulse"></div>
          <span className="font-mono text-[9px] text-brand-gr tracking-[.08em]">DATA: LIVE</span>
        </div>
        <div className="flex flex-col items-end">
           <div className="font-mono text-[11px] text-brand-t1 font-bold leading-none">{time}</div>
           <div className="font-mono text-[7px] text-brand-t4 uppercase tracking-tighter mt-1">{curStock ? `SYNCED: ${curStock}` : 'WAITING FOR INPUT'}</div>
        </div>
        <button 
          className="w-[30px] h-[30px] bg-brand-bgc border border-brand-bd rounded-[4px] flex items-center justify-center cursor-pointer text-brand-t2 text-[13px] hover:border-brand-bl hover:text-brand-bl transition-colors"
          onClick={() => {
            if (curStock) {
              showToast(`🔄 Force Refreshing ${curStock}...`);
              stockService.refreshStock(curStock).then(() => window.location.reload());
            }
          }}
        >
          ↻
        </button>
        <div className="w-[30px] h-[30px] bg-brand-bgc border border-brand-bd rounded-[4px] flex items-center justify-center cursor-pointer text-brand-t2 text-[13px] hover:border-brand-bl hover:text-brand-bl transition-colors">⚙</div>
      </div>
    </div>
  );
};
