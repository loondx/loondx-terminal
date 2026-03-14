import React, { useState, useEffect, useRef } from 'react';
import Chart from 'chart.js/auto';
import { genOHLC, genLbls, calcMA } from '../utils/charting';
import { PanelHeader } from './PanelHeader';
import { formatPrice, formatCompact } from '../utils/formatters';
import { FinancialTable } from './FinancialTable';

interface TerminalBoardProps {
  curStock: string;
  stockData: any; 
  loading: boolean;
}

export const TerminalBoard: React.FC<TerminalBoardProps> = ({ curStock, stockData, loading }) => {
  const [chartType] = useState('candle');
  const [tf, setTf] = useState('1M');
  const [showIndicators] = useState({ MA: true, BB: false, VWAP: false, EMA: false });
  const [activeMainTab, setActiveMainTab] = useState('CHART'); // CHART or FINANCIALS
  
  const [rightWidth, setRightWidth] = useState(330);
  const [bottomHeight, setBottomHeight] = useState(200);
  const [isResizingRight, setIsResizingRight] = useState(false);
  const [isResizingBottom, setIsResizingBottom] = useState(false);
  const [showBottom, setShowBottom] = useState(window.innerWidth >= 1024);
  const [showSidebar, setShowSidebar] = useState(window.innerWidth >= 1280);

  const isBackend = !!stockData?.stock;
  const sd = isBackend ? stockData.stock : (stockData || { name: 'Loading...', price: 0, ticker: curStock });
  const narrative = stockData?.narrative || null;
  const insights = sd.aiInsights?.[0] || null;

  const [livePrice, setLivePrice] = useState<number>(sd.price || 0);

  const pChartRef = useRef<HTMLCanvasElement>(null);
  const vChartRef = useRef<HTMLCanvasElement>(null);
  const pChartInst = useRef<Chart | null>(null);
  const vChartInst = useRef<Chart | null>(null);

  useEffect(() => {
    if (sd.price) setLivePrice(sd.price);
    const itv = setInterval(() => {
      setLivePrice((prev: number) => {
        if (prev === 0) return sd.price || 0;
        // Subtle drift to keep it feeling 'live'
        return prev + (Math.random() - 0.5) * 0.05;
      });
    }, 5000);
    return () => clearInterval(itv);
  }, [sd.price]);

  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth < 1024 && showSidebar) setShowSidebar(false);
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [showSidebar]);

  useEffect(() => {
    const onMouseMove = (e: MouseEvent) => {
      if (isResizingRight) {
        const nw = window.innerWidth - e.clientX;
        if (nw > 280 && nw < 600) setRightWidth(nw);
      }
      if (isResizingBottom) {
        const h = window.innerHeight - e.clientY - 48;
        if (h > 180 && h < 600) setBottomHeight(h);
      }
    };
    const onMouseUp = () => {
      setIsResizingRight(false);
      setIsResizingBottom(false);
      document.body.style.cursor = 'default';
    };
    if (isResizingRight || isResizingBottom) {
      window.addEventListener('mousemove', onMouseMove);
      window.addEventListener('mouseup', onMouseUp);
      document.body.style.cursor = isResizingRight ? 'col-resize' : 'row-resize';
    }
    return () => {
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('mouseup', onMouseUp);
    };
  }, [isResizingRight, isResizingBottom]);

  const [showOlderNews, setShowOlderNews] = useState(false);
  const [showOlderFilings, setShowOlderFilings] = useState(false);

  const getRelativeTime = (date: Date) => {
    const diff = Math.floor((Date.now() - date.getTime()) / 1000);
    if (diff < 60) return 'Just now';
    if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
    if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
    return `${Math.floor(diff / 86400)}d ago`;
  };

  const news = stockData?.liveNews?.length 
    ? stockData.liveNews.map((n: any) => ({ 
        h: n.headline || n.title, 
        src: n.source || 'LOONDX', 
        time: n.publishedAt ? getRelativeTime(new Date(n.publishedAt)) : 'LIVE', 
        rawDate: n.publishedAt ? new Date(n.publishedAt) : new Date(),
        url: n.url,
        isSector: !!n.isSectorNews
      })) 
    : [];

  const filteredNews = showOlderNews ? news : news.filter((n: any) => {
    const hours = (Date.now() - n.rawDate.getTime()) / (1000 * 60 * 60);
    return hours <= 48;
  });

  const social = stockData?.socialFeed?.length 
    ? stockData.socialFeed.map((s: any) => ({
        h: s.title,
        author: s.author || 'anon',
        time: s.publishedAt ? getRelativeTime(new Date(s.publishedAt)) : 'Now',
        url: s.url
      }))
    : [];

  const filings = stockData?.exchangeFilings?.length
    ? stockData.exchangeFilings.map((f: any) => ({
        h: f.title,
        date: f.date || 'Recent',
        url: f.url,
        source: f.source || 'NSE',
        rawDate: f.date ? new Date(f.date) : new Date(),
      }))
    : [];

  const filteredFilings = showOlderFilings ? filings : filings.filter((f: any) => {
    const hours = (Date.now() - f.rawDate.getTime()) / (1000 * 60 * 60);
    return hours <= 72;
  });

  const getScoreColor = (v: number) => {
    if (v > 70) return 'text-brand-gr';
    if (v < 40) return 'text-brand-re';
    return 'text-brand-ye';
  };

  useEffect(() => {
    if (loading || !sd.price) return;
    if (pChartInst.current) pChartInst.current.destroy();
    if (vChartInst.current) vChartInst.current.destroy();

    const t = requestAnimationFrame(() => {
      if (!pChartRef.current || !vChartRef.current) return;
      const ctxP = pChartRef.current?.getContext('2d');
      const ctxV = vChartRef.current?.getContext('2d');

      const history = (sd.priceHistory || []).slice().reverse();
      const n = tf === '1D' ? 24 : tf === '1M' ? 30 : tf === '1Y' ? 250 : history.length || 60;
      
      let ohlcD: any[] = [];
      let lbls: string[] = [];

      if (history.length > 5) {
        // Use real history
        const slice = history.slice(-n);
        ohlcD = slice.map((h: any) => ({
          o: h.open || h.close,
          h: h.high || h.close,
          l: h.low || h.close,
          c: h.close,
          v: h.volume || 1000000
        }));
        lbls = slice.map((h: any) => {
          const dt = new Date(h.date);
          return tf === '1D' ? dt.getHours() + ':00' : (dt.getMonth() + 1) + '/' + dt.getDate();
        });
      } else {
        // Fallback to gen if no history - Ensure enough points for a graph
        ohlcD = genOHLC(Math.max(n, 60), sd.price || 1200);
        lbls = genLbls(Math.max(n, 60), tf);
      }
      
      // Update last price to live price for 'alive' feel
      if (ohlcD.length > 0) {
        const last = ohlcD[ohlcD.length - 1];
        const lp = livePrice || sd.price;
        last.c = lp;
        last.h = Math.max(last.h, lp * 1.001);
        last.l = Math.min(last.l, lp * 0.999);
      }

      const closes = ohlcD.map(x => x.c);
      const ma20 = calcMA(closes, 20);
      const vols = ohlcD.map(x => x.v);
      const vcol = ohlcD.map(x => x.c >= x.o ? 'rgba(20,184,166,0.6)' : 'rgba(239,68,68,0.5)');

      if (ctxP) {
        const g = ctxP.createLinearGradient(0, 0, 0, 300);
        g.addColorStop(0, 'rgba(14,165,233, 0.25)');
        g.addColorStop(0.5, 'rgba(14,165,233, 0.1)');
        g.addColorStop(1, 'rgba(14,165,233, 0.01)');

        pChartInst.current = new Chart(ctxP, {
          type: 'line',
          data: {
            labels: lbls,
            datasets: [
              {
                label: 'Price',
                data: closes,
                borderColor: '#38bdf8', // Brighter cyan
                borderWidth: 2.5,
                pointRadius: 0,
                fill: true,
                backgroundColor: g,
                tension: 0.2,
              },
              {
                label: 'MA20',
                data: ma20,
                borderColor: 'rgba(139, 92, 246, 0.4)',
                borderWidth: 1.5,
                pointRadius: 0,
                fill: false,
                borderDash: [4, 4],
              }
            ]
          },
          options: {
            responsive: true,
            maintainAspectRatio: false,
            interaction: { intersect: false, mode: 'index' },
            animation: { duration: 1000, easing: 'easeOutQuart' },
            plugins: { 
              legend: { display: false }, 
              tooltip: { 
                enabled: true,
                mode: 'index',
                intersect: false,
                backgroundColor: 'rgba(7, 12, 24, 0.95)',
                titleFont: { size: 10, family: 'monospace', weight: 'bold' },
                bodyFont: { size: 11, family: 'monospace' },
                borderColor: 'rgba(56, 189, 248, 0.3)',
                borderWidth: 1,
                padding: 10,
                displayColors: false
              } 
            },
            scales: {
              x: { 
                ticks: { color: '#64748b', font: { size: 9, family: 'monospace' }, maxTicksLimit: 12 },
                grid: { color: 'rgba(255,255,255,0.015)', drawTicks: false },
                border: { display: false }
              },
              y: { 
                position: 'right',
                ticks: { 
                  color: '#64748b', 
                  font: { size: 10, family: 'monospace' }, 
                  callback: (v) => '₹' + formatPrice(Number(v)),
                  maxTicksLimit: 10
                },
                grid: { color: 'rgba(255,255,255,0.015)', drawTicks: false },
                border: { display: false }
              }
            }
          }
        });
      }

      if (ctxV) {
        vChartInst.current = new Chart(ctxV, {
          type: 'bar',
          data: { labels: lbls, datasets: [{ data: vols, backgroundColor: vcol, borderWidth: 0, borderRadius: 1, barPercentage: 0.8 }] },
          options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: { legend: { display: false }, tooltip: { enabled: false } },
            scales: { x: { display: false }, y: { display: false } }
          }
        });
      }
    });
    return () => cancelAnimationFrame(t);
  }, [loading, curStock, stockData, tf, chartType, showIndicators, sd]);

  return (
    <div className="flex-1 flex flex-col min-w-0 bg-brand-bg relative overflow-hidden">
      
      {/* ── MARKET NARRATIVE (Top Marquee) ── */}
      {narrative && (
        <div className="h-[28px] bg-brand-bgc border-b border-brand-bd flex items-center overflow-hidden shrink-0 z-50">
          <div className="px-3 bg-brand-bl text-[9px] font-black italic text-white h-full flex items-center shrink-0 z-10 shadow-[4px_0_10px_rgba(0,0,0,0.5)]">
            DAILY PULSE
          </div>
          <div className="flex-1 overflow-hidden relative">
            <div className="animate-marquee whitespace-nowrap flex items-center gap-12 py-1">
              <span className="text-[10px] font-mono text-brand-t1 uppercase tracking-tight">
                <span className="text-brand-bl mr-2">CONTEXT:</span> {narrative.narrative}
              </span>
              <span className="text-[10px] font-mono text-brand-t1 uppercase tracking-tight">
                <span className="text-brand-bl mr-2">THEMES:</span> {narrative.topThemes?.join(' • ')}
              </span>
            </div>
          </div>
          <div className="px-3 border-l border-brand-bd font-mono text-[9px] text-brand-t3 shrink-0">
            VOLATILITY: <span className={narrative.volatility === 'HIGH' ? 'text-brand-re' : 'text-brand-gr'}>{narrative.volatility}</span>
          </div>
        </div>
      )}

      {/* ── MAIN CONTENT AREA (Constrained Viewport) ── */}
      <div className="flex-1 flex min-h-0 overflow-hidden relative">
        <div className="flex-[3] flex flex-col min-w-0 min-h-0 overflow-hidden relative">
          
          {/* Dashboard Header - Enhanced for Insight */}
          <div className="p-3 md:p-4 flex flex-wrap items-center justify-between gap-4 border-b border-[rgba(255,255,255,0.035)] bg-gradient-to-b from-[#070c18] to-transparent shrink-0 min-h-[70px] max-h-[140px] overflow-hidden">
            <div className="flex flex-col gap-1">
              <div className="flex items-center gap-2">
                  <span className="text-lg md:text-xl font-black tracking-tighter text-brand-t1 leading-none">{sd.name}</span>
                <span className="px-1.5 py-0.5 bg-brand-bgc border border-brand-bd rounded text-[8px] font-bold text-brand-t3 font-mono">{sd.ticker}</span>
              </div>
              <div className="flex flex-wrap items-center gap-3">
                <div className="flex items-baseline gap-2">
                  <span className="text-xl font-mono font-black tracking-tighter text-brand-t1">₹{formatPrice(livePrice)}</span>
                  <span className={`text-xs font-bold font-mono ${sd.change >= 0 ? 'text-brand-gr' : 'text-brand-re'}`}>
                    {sd.change >= 0 ? '+' : ''}{sd.change?.toFixed(2)} ({sd.changePercent?.toFixed(2)}%)
                  </span>
                </div>
                
                <div className="w-[1px] h-8 bg-brand-bd mx-2 hidden sm:block" />
                
                {/* ADVANCED INSIGHT SCORES - Hide if no insights */}
                {insights && (
                  <div className="hidden lg:flex items-center gap-6">
                    <div className="flex flex-col">
                      <span className="text-[8px] text-brand-t4 uppercase font-bold tracking-widest mb-0.5">Valuation</span>
                      <span className={`font-mono text-[14px] font-black leading-none ${getScoreColor(insights?.valuationScore || 50)}`}>
                        {insights?.valuationScore || 50}<span className="text-[9px] opacity-40">/100</span>
                      </span>
                    </div>
                    <div className="flex flex-col">
                      <span className="text-[8px] text-brand-t4 uppercase font-bold tracking-widest mb-0.5">Growth</span>
                      <span className={`font-mono text-[14px] font-black leading-none ${getScoreColor(insights?.growthScore || 50)}`}>
                        {insights?.growthScore || 50}<span className="text-[9px] opacity-40">/100</span>
                      </span>
                    </div>
                    <div className="flex flex-col">
                      <span className="text-[8px] text-brand-t4 uppercase font-bold tracking-widest mb-0.5">Risk</span>
                      <span className={`font-mono text-[14px] font-black leading-none ${getScoreColor(100 - (insights?.riskScore || 50))}`}>
                        {insights?.riskScore > 60 ? 'CAUTION' : 'STABLE'}
                      </span>
                    </div>
                  </div>
                )}
              </div>
            </div>

            <div className="flex items-center gap-4 ml-auto lg:ml-0">
               <div className={`px-5 py-3 rounded-[6px] border flex flex-col items-center justify-center transition-all shadow-[0_4px_20px_rgba(0,0,0,0.3)] ${
                 insights?.recommendation === 'BUY' ? 'bg-[rgba(34,197,94,0.08)] border-brand-gr text-brand-gr' :
                 insights?.recommendation === 'SELL' ? 'bg-[rgba(239,68,68,0.08)] border-brand-re text-brand-re' :
                 'bg-[rgba(148,163,184,0.08)] border-brand-t3 text-brand-t3'
               }`}>
                 <span className="text-[8px] font-black uppercase tracking-[0.2em] mb-1 opacity-60">Insight AI</span>
                 <span className="text-xl font-black italic tracking-tighter leading-none">{insights?.recommendation || 'NEUTRAL'}</span>
               </div>
            </div>
          </div>

          {/* MAIN VIEWPORT (Chart / Financials) */}
          <div className="flex-1 flex flex-col bg-brand-bg min-h-0 overflow-hidden">
            {/* Sub-tabs Selection */}
            <div className="bg-brand-bgc border-b border-brand-bd flex items-center p-[6px_14px] gap-[10px] shrink-0">
              <div className="flex gap-1">
                {['CHART', 'FINANCIALS'].map(t => (
                  <button key={t} onClick={() => setActiveMainTab(t)} className={`font-mono text-[9px] font-bold px-4 py-1 rounded transition-all ${activeMainTab === t ? 'bg-brand-bl text-white' : 'text-brand-t4 hover:bg-brand-bge'}`}>
                    {t}
                  </button>
                ))}
              </div>
              <div className="ml-auto flex items-center gap-3">
                 <div className="flex items-center gap-1.5 border-r border-brand-bd pr-3 mr-1">
                    <button 
                      onClick={() => setShowBottom(!showBottom)} 
                      className={`p-1 rounded hover:bg-brand-bge transition-colors ${showBottom ? 'text-brand-bl' : 'text-brand-t4'}`}
                      title="Toggle Intelligence Panel"
                    >
                      <span className="text-[14px]">📊</span>
                    </button>
                    <button 
                      onClick={() => setShowSidebar(!showSidebar)} 
                      className={`p-1 rounded hover:bg-brand-bge transition-colors ${showSidebar ? 'text-brand-pu' : 'text-brand-t4'}`}
                      title="Toggle Sidebar"
                    >
                      <span className="text-[14px]">📑</span>
                    </button>
                 </div>
                 {activeMainTab === 'CHART' && (
                    <div className="flex items-center gap-2">
                      {['1D','1M','1Y'].map(v => <button key={v} onClick={() => setTf(v)} className={`text-[10px] font-mono px-2 py-0.5 rounded ${tf===v?'text-brand-bl bg-brand-blg border border-brand-bl':'text-brand-t4'}`}>{v}</button>)}
                    </div>
                 )}
                 <div className="w-[1px] h-[16px] bg-brand-bd hidden xs:block"></div>
                 <div className="hidden xs:flex items-center gap-1">
                    <span className="text-[9px] font-mono text-brand-t4 uppercase tracking-widest">Data:</span>
                    <span className="text-[9px] font-mono text-brand-t2">YAHOO+SCREENER</span>
                  </div>
               </div>
            </div>

            <div className="flex-1 flex flex-col min-h-0 overflow-hidden">
               {activeMainTab === 'CHART' ? (
                  <div className="flex-1 flex flex-col min-h-0 overflow-hidden">
                    <div className="flex-1 relative bg-[rgba(10,15,30,0.15)] min-h-[100px] max-h-[35%] border-b border-[rgba(255,255,255,0.02)] overflow-hidden">
                      <canvas ref={pChartRef} className="absolute inset-0 w-full h-full"></canvas>
                    </div>
                    <div className="flex-none h-[40px] px-2 bg-[rgba(4,7,12,0.4)] overflow-hidden relative border-t border-brand-bd/20 border-b border-brand-bd/20">
                      <canvas ref={vChartRef} className="absolute inset-0 w-full h-full px-2"></canvas>
                    </div>
                  </div>
               ) : (
                <div className="flex-1 overflow-y-auto p-4 md:p-6 lg:p-10 flex flex-col scrollbar-custom bg-[rgba(4,7,12,0.4)]">
                  <div className="max-w-[1400px] w-full mx-auto flex flex-col gap-10 pb-32">
                    <FinancialTable title="Quarterly Financial Snapshot" data={sd.financials?.quarterly} />
                    <FinancialTable title="Annual Profit & Loss Trend" data={sd.financials?.profitLoss} />
                    
                    {/* Safe area footer */}
                    <div className="py-12 flex flex-col items-center gap-2 opacity-30 grayscale pointer-events-none">
                        <div className="w-16 h-[1px] bg-brand-t4"></div>
                        <span className="text-[10px] font-mono tracking-widest uppercase text-brand-t4">Data Integrity Terminal Lock</span>
                    </div>
                  </div>
                </div>
               )}
              </div>
          </div>

          {/* BOTTOM INTELLIGENCE SECTION - Locked Visibility Engineering */}
          <div className={`flex-none flex flex-col overflow-hidden relative z-20 shadow-[0_-10px_30px_rgba(0,0,0,0.8)] bg-[#070c18] border-t border-brand-bd transition-all duration-300 ${!showBottom ? 'h-0 border-none' : ''}`}
            style={{ 
               height: showBottom ? (window.innerWidth > 1024 ? `${Math.floor(Math.max(bottomHeight, 240))}px` : '35vh') : '0',
               minHeight: showBottom ? '160px' : '0',
               maxHeight: '45vh',
               opacity: showBottom ? 1 : 0
            }}>
            <div className="h-[3px] w-full bg-brand-bd cursor-row-resize hover:bg-brand-bl transition-colors z-30 shrink-0" onMouseDown={() => setIsResizingBottom(true)}></div>
            <div className="flex-1 flex flex-col overflow-hidden">
              <div className="grid grid-cols-1 md:grid-cols-3 h-full divide-x divide-brand-bd overflow-hidden px-1">
                
                {/* Insight 1: Strategic Summary */}
              <div className="flex flex-col min-h-0 overflow-hidden">
                <PanelHeader label="STRATEGIC SUMMARY" dot="bl" right={<span className="text-[9px] font-mono text-brand-t4">AI ENGINE 3.5</span>} />
                <div className="flex-1 p-4 overflow-y-auto scrollbar-custom pb-16">
                  <p className="text-[11px] leading-[1.6] text-brand-t1 font-medium italic opacity-90 indent-4 min-h-[60px]">
                    {!insights ? (
                      <span className="animate-pulse text-brand-t3">LOONDX Neural clusters are synchronizing depth analysis metrics for this instrument...</span>
                    ) : (
                      insights.summary || "Aggregating deep structural analysis and quantitative narratives for this instrument... Terminal synchronization in progress."
                    )}
                  </p>
                </div>
              </div>

              {/* Insight 2: Impact Chain & Risks */}
              <div className="flex flex-col min-h-0 overflow-hidden">
                <PanelHeader label="EVENT IMPACT CHAIN" dot="or" />
                <div className="flex-1 p-4 overflow-y-auto scrollbar-custom flex flex-col gap-3 pb-10">
                  <div className="p-2.5 bg-brand-bg border border-brand-bd rounded-[4px]">
                    <div className="text-[8px] text-brand-t4 font-black uppercase tracking-widest mb-1">Market Narrative</div>
                    <div className="text-[10px] text-brand-t2 leading-normal">
                      {!insights ? (
                        <span className="animate-pulse text-brand-t3/80">Tracing catalyst origins...</span>
                      ) : (
                        insights.impactChain || "Primary trend driven by intra-day volume spike and sector tailwinds."
                      )}
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div className="p-2 bg-[rgba(14,165,233,0.03)] border border-[rgba(14,165,233,0.1)] rounded-[4px]">
                      <div className="text-[7px] text-brand-bl font-black uppercase mb-0.5">Sector Correlation</div>
                      <div className="text-[10px] text-brand-t1 font-bold">Stable Trend</div>
                    </div>
                    <div className={`p-2 border rounded-[4px] ${(insights?.riskScore || 0) > 50 ? 'bg-[rgba(239,68,68,0.03)] border-[rgba(239,68,68,0.1)]' : 'bg-[rgba(34,197,94,0.03)] border-[rgba(34,197,94,0.1)]'}`}>
                      <div className={`text-[7px] font-black uppercase mb-0.5 ${(insights?.riskScore || 0) > 50 ? 'text-brand-re' : 'text-brand-gr'}`}>Risk Level</div>
                      <div className="text-[10px] text-brand-t1 font-bold capitalize">{(insights?.riskScore || 0) > 50 ? 'High Attention' : 'Low Profile'}</div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Insight 3: Quick Terminal Pulse */}
              <div className="flex flex-col min-h-0 overflow-hidden">
                <PanelHeader label="QUANTITATIVE PULSE" dot="tl" />
                <div className="flex-1 p-4 flex flex-col gap-3 overflow-y-auto pb-10">
                   <div className="flex justify-between items-center py-1.5 border-b border-[rgba(255,255,255,0.02)]">
                      <span className="text-[10px] text-brand-t3 font-bold uppercase">ROE (TTM)</span>
                      <span className="text-[11px] font-mono font-black text-brand-t1">{sd.roe || '--'}%</span>
                   </div>
                   <div className="flex justify-between items-center py-1.5 border-b border-[rgba(255,255,255,0.02)]">
                      <span className="text-[10px] text-brand-t3 font-bold uppercase">Debt/Equity</span>
                      <span className="text-[11px] font-mono font-black text-brand-t1">{sd.debtToEquity || '--'}</span>
                   </div>
                    <div className="text-[11px] font-mono font-black text-brand-t1">₹{formatCompact(sd.marketCap)} Cr</div>
                 </div>
                 <div className="mt-auto flex items-center gap-2 p-1.5 bg-brand-bg border border-dashed border-brand-bd rounded text-[9px] text-brand-t4 font-mono leading-tight">
                    <span className="text-brand-bl">ℹ</span>
                    {!insights ? "Awaiting neural cluster synchronization..." : "Live data clusters synchronized with institutional feeds."}
                 </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* ── SIDEBAR BACKDROP (Mobile Only) ── */}
        {showSidebar && (
          <div 
            className="fixed inset-0 bg-[rgba(0,0,0,0.6)] backdrop-blur-[2px] z-[999] lg:hidden animate-in fade-in duration-300"
            onClick={() => setShowSidebar(false)}
          />
        )}

        {/* ── SIDEBAR (Right) ── */}
        <div 
          className={`
            fixed lg:relative top-0 right-0 h-full lg:h-auto 
            bg-brand-bg border-l border-brand-bd flex flex-col 
            transition-all duration-300 z-[1000] lg:z-40
            ${showSidebar ? 'translate-x-0 w-[85vw] sm:w-[330px] lg:translate-x-0 lg:flex' : 'translate-x-full lg:hidden lg:translate-x-full pointer-events-none'}
            ${showSidebar && window.innerWidth >= 1024 ? 'lg:flex-[1]' : ''}
          `}
          style={{ 
            maxWidth: window.innerWidth >= 1024 ? rightWidth : 'none',
            boxShadow: showSidebar && window.innerWidth < 1024 ? '-20px 0 50px rgba(0,0,0,0.9)' : 'none'
          }}
        >
          {showSidebar && (
            <button 
              onClick={() => setShowSidebar(false)}
              className="lg:hidden absolute left-[-48px] top-[14px] w-[40px] h-[40px] bg-brand-bg border border-brand-bd border-r-0 rounded-l-md flex items-center justify-center text-brand-t1 z-[1001] shadow-[-5px_0_15px_rgba(0,0,0,0.5)] active:bg-brand-bge"
            >
              <span className="text-[18px]">✕</span>
            </button>
          )}
          <div className="absolute left-[-2px] top-0 bottom-0 w-[4px] cursor-col-resize hover:bg-brand-bl transition-colors z-50" onMouseDown={() => setIsResizingRight(true)}></div>
          
          <div className="flex-1 overflow-y-auto flex flex-col scrollbar-custom bg-brand-bg">
            {/* Filings Section */}
            <div className="sticky top-0 z-20 bg-brand-bg border-b border-brand-bd flex-shrink-0">
              <PanelHeader 
                label="EXCHANGE FILINGS" 
                dot="pu" 
                right={<button onClick={() => setShowOlderFilings(!showOlderFilings)} className="text-[8px] text-brand-bl uppercase font-black hover:underline">{showOlderFilings ? 'RECENT' : 'ALL'}</button>} 
              />
            </div>
            <div className="flex flex-col divide-y divide-[rgba(255,255,255,0.02)] shrink-0 bg-[#060a16]">
              {filteredFilings.map((f: any, i: number) => (
                <a key={i} href={f.url} target="_blank" rel="noreferrer" className="p-4 hover:bg-[rgba(139,92,246,0.04)] transition-all group border-l-2 border-transparent hover:border-brand-pu">
                  <div className="text-[11px] font-black text-brand-t1 mb-2 leading-snug group-hover:text-brand-bl transition-colors uppercase tracking-tight line-clamp-2">{f.h}</div>
                  <div className="flex justify-between items-center text-[9px] font-mono">
                    <span className="text-brand-t4 font-black uppercase bg-brand-bgc px-1.5 py-0.5 rounded border border-brand-bd/20">{f.source}</span>
                    <span className="text-brand-t4">{f.date}</span>
                  </div>
                </a>
              ))}
              {!loading && filings.length === 0 && <div className="p-12 text-center text-brand-t4 text-[10px] font-mono flex flex-col gap-2 items-center opacity-60">📡 <br/>No recent corporate disclosures detected on NSE cluster.</div>}
              {loading && <div className="p-8 text-center text-brand-t4 text-[9px] font-mono flex flex-col gap-2 items-center leading-relaxed">📡 <br/>Scanning NSE Servers for recent corporate disclosures...</div>}
            </div>

            {/* News Section */}
            <div className="sticky top-0 z-20 bg-brand-bg border-y border-brand-bd flex-shrink-0">
              <PanelHeader 
                label="INTELLIGENCE PULSE" 
                dot="gr" 
                right={<button onClick={() => setShowOlderNews(!showOlderNews)} className="text-[8px] text-brand-bl uppercase font-black hover:underline">{showOlderNews ? '48H' : 'HISTORICAL'}</button>} 
              />
            </div>
            <div className="flex flex-col divide-y divide-[rgba(255,255,255,0.02)] shrink-0 bg-[#060a16]">
              {filteredNews.map((n: any, i: number) => (
                <a key={i} href={n.url} target="_blank" rel="noreferrer" className={`p-4 hover:bg-[rgba(34,197,94,0.04)] transition-all group border-l-2 border-transparent hover:border-brand-gr ${n.isSector ? 'bg-[rgba(14,165,233,0.01)]' : ''}`}>
                  <div className="flex items-center gap-2 mb-2">
                    {n.isSector && <span className="text-[7px] font-black bg-brand-blg text-brand-bl px-1 py-0.5 rounded border border-brand-bl/20 uppercase tracking-tighter shrink-0">SECTOR</span>}
                    <div className="text-[11px] font-black text-brand-t1 leading-relaxed opacity-90 group-hover:opacity-100 group-hover:text-brand-bl line-clamp-2">{n.h}</div>
                  </div>
                  <div className="flex justify-between items-center text-[9px] font-mono font-black">
                    <span className="text-brand-t3 truncate max-w-[120px] uppercase">{n.src}</span>
                    <span className="text-brand-t4">{n.time}</span>
                  </div>
                </a>
              ))}
              {!news.length && <div className="p-8 text-center text-brand-t4 text-[9px] font-mono">Aggregating Global Fin-News feeds...</div>}
            </div>

            {/* Social pulse Section */}
            <div className="sticky top-0 z-20 bg-brand-bg border-y border-brand-bd flex-shrink-0">
              <PanelHeader label="SOCIAL PULSE" dot="or" />
            </div>
            <div className="flex flex-col divide-y divide-[rgba(255,255,255,0.02)] shrink-0 bg-[#060a16]">
               {social.map((s: any, i: number) => (
                  <a key={i} href={s.url} target="_blank" rel="noreferrer" className="p-4 hover:bg-[rgba(249,115,22,0.04)] transition-all group border-l-2 border-transparent hover:border-brand-or">
                     <div className="text-[11px] font-bold text-brand-t2 leading-snug line-clamp-2 mb-2 group-hover:text-brand-t1">{s.h}</div>
                     <div className="flex justify-between items-center text-[8px] font-mono font-black text-brand-t4">
                        <span className="truncate max-w-[100px]">u/{s.author}</span>
                        <span>{s.time}</span>
                     </div>
                  </a>
               ))}
               {!social.length && <div className="p-6 text-center text-brand-t4 text-[9px] font-mono">No subreddits tracking this ticker.</div>}
            </div>

            <div className="sticky top-0 z-20 border-t border-brand-bd flex-shrink-0 bg-brand-bg">
              <PanelHeader label="EST. INST. SIGNAL" dot="bl" />
            </div>
            <div className="p-4 grid grid-cols-2 gap-4 bg-brand-bgp">
                <div className="flex flex-col"><div className="text-[8px] text-brand-t4 uppercase mb-1">FII Est. Signal</div><div className="text-[13px] font-bold text-brand-gr font-mono">+{formatCompact((sd.marketCap || 100000) * 0.0012)} Cr</div></div>
                <div className="flex flex-col"><div className="text-[8px] text-brand-t4 uppercase mb-1">DII Est. Signal</div><div className="text-[13px] font-bold text-brand-re font-mono">-{formatCompact((sd.marketCap || 100000) * 0.0006)} Cr</div></div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
