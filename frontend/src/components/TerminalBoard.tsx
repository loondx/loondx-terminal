import React, { useState, useEffect, useRef } from 'react';
import Chart from 'chart.js/auto';
import { genOHLC, genLbls, calcMA, calcEMA, calcBB, calcVWAP } from '../utils/charting';
import { PanelHeader } from './PanelHeader';

interface TerminalBoardProps {
  curStock: string;
  stockData: any; 
  loading: boolean;
}

export const TerminalBoard: React.FC<TerminalBoardProps> = ({ curStock, stockData, loading }) => {
  const [chartType, setChartType] = useState('candle');
  const [tf, setTf] = useState('1M');
  const [showIndicators, setShowIndicators] = useState({ MA: true, BB: false, VWAP: false, EMA: false });
  
  const [rightWidth, setRightWidth] = useState(330);
  const [bottomHeight, setBottomHeight] = useState(250);
  const [isResizingRight, setIsResizingRight] = useState(false);
  const [isResizingBottom, setIsResizingBottom] = useState(false);
  const [showSidebar, setShowSidebar] = useState(window.innerWidth >= 1280);

  const isBackend = !!stockData?.stock;
  const sd = isBackend ? stockData.stock : (stockData || { name: 'Loading...', price: 0, ticker: curStock });
  const macro = stockData?.macroSignals || [];
  const insights = sd.aiInsights?.[0] || null;

  const [livePrice, setLivePrice] = useState<number>(sd.price || 0);

  const pChartRef = useRef<HTMLCanvasElement>(null);
  const vChartRef = useRef<HTMLCanvasElement>(null);
  const wChartRef = useRef<HTMLCanvasElement>(null);
  const pChartInst = useRef<Chart | null>(null);
  const vChartInst = useRef<Chart | null>(null);
  const wChartInst = useRef<Chart | null>(null);

  useEffect(() => {
    if (sd.price) setLivePrice(sd.price);
    const itv = setInterval(() => {
      setLivePrice((prev: number) => {
        if (prev === 0) return sd.price || 0;
        return Math.max(prev + (Math.random() - 0.499) * 0.11, 1);
      });
    }, 4000);
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

  useEffect(() => {
    if (loading || !sd.price) return;
    if (pChartInst.current) pChartInst.current.destroy();
    if (vChartInst.current) vChartInst.current.destroy();
    if (wChartInst.current) wChartInst.current.destroy();

    const t = requestAnimationFrame(() => {
      const d = sd;
      const ctxP = pChartRef.current?.getContext('2d');
      const ctxV = vChartRef.current?.getContext('2d');
      const ctxW = wChartRef.current?.getContext('2d');

      const tfN: any = { '1D': 25, '5D': 50, '1M': 60, '3M': 90, '6M': 126, '1Y': 250, '5Y': 260 };
      const n = tfN[tf] || 60;
      const ohlcD = genOHLC(n, d.price || 1300, d.volume || 50e6);
      const lbls = genLbls(n, tf);
      const closes = ohlcD.map(x => x.c);
      const ma20 = calcMA(closes, 20);
      const ma50 = calcMA(closes, 50);
      const ema21 = calcEMA(closes, 21);
      const bb = calcBB(closes, 20);
      const vwap = calcVWAP(ohlcD);
      const vols = ohlcD.map(x => x.v);
      const vcol = ohlcD.map(x => x.c >= x.o ? 'rgba(20,184,166,.5)' : 'rgba(239,68,68,.4)');

      if (ctxP) {
        let pDs: any;
        if (chartType === 'line') {
          pDs = { label: 'P', data: closes, type: 'line', borderColor: '#0ea5e9', borderWidth: 1.8, pointRadius: 0, fill: false, order: 10, tension: .2 };
        } else if (chartType === 'area') {
          const g = ctxP.createLinearGradient(0, 0, 0, 300);
          g.addColorStop(0, 'rgba(14,165,233,.22)');
          g.addColorStop(1, 'rgba(14,165,233,.01)');
          pDs = { label: 'P', data: closes, type: 'line', borderColor: '#0ea5e9', borderWidth: 1.8, pointRadius: 0, fill: true, backgroundColor: g, order: 10, tension: .3 };
        } else {
          pDs = { label: 'P', data: closes, type: 'bar', backgroundColor: 'transparent', borderColor: 'transparent', barPercentage: .01, order: 10, ohlcD: ohlcD, chartT: chartType };
        }
        const ds = [pDs];
        if (showIndicators.MA) {
          ds.push({ label: 'MA20', data: ma20, type: 'line', borderColor: 'rgba(14,165,233,.8)', borderWidth: 1.2, pointRadius: 0, fill: false } as any);
          ds.push({ label: 'MA50', data: ma50, type: 'line', borderColor: 'rgba(249,115,22,.6)', borderWidth: 1.2, pointRadius: 0, fill: false } as any);
        }
        if (showIndicators.BB) {
          ds.push({ label: 'BB+', data: bb.u, type: 'line', borderColor: 'rgba(100,116,139,.3)', borderWidth: 1, borderDash: [5,5], pointRadius: 0, fill: false } as any);
          ds.push({ label: 'BB-', data: bb.l, type: 'line', borderColor: 'rgba(100,116,139,.3)', borderWidth: 1, borderDash: [5,5], pointRadius: 0, fill: false } as any);
        }
        if (showIndicators.VWAP) ds.push({ label: 'VWAP', data: vwap, type: 'line', borderColor: 'rgba(234,179,8,.7)', borderWidth: 1, borderDash: [3,2], pointRadius: 0, fill: false } as any);
        if (showIndicators.EMA) ds.push({ label: 'EMA21', data: ema21, type: 'line', borderColor: 'rgba(139,92,246,.7)', borderWidth: 1.2, pointRadius: 0, fill: false } as any);

        pChartInst.current = new Chart(ctxP, {
          type: 'bar',
          data: { labels: lbls, datasets: ds },
          options: {
            responsive: true, maintainAspectRatio: false, animation: { duration: 400 },
            plugins: { legend: { display: false }, tooltip: { enabled: true } },
            scales: {
              x: { ticks: { color: '#334155', font: { size: 9 }, maxTicksLimit: 12 }, grid: { color: 'rgba(23,32,56,.8)' }, border: { color: '#172038' } },
              y: { position: 'right', ticks: { color: '#64748b', font: { size: 10 }, callback: (v) => '₹' + Number(v).toFixed(0) }, grid: { color: 'rgba(23,32,56,.8)' }, border: { color: '#172038' } }
            }
          }
        });
      }
      if (ctxV) {
        vChartInst.current = new Chart(ctxV, {
          type: 'bar',
          data: { labels: lbls, datasets: [{ data: vols, backgroundColor: vcol, borderWidth: 0, borderRadius: 1 }] },
          options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false } }, scales: { x: { display: false }, y: { display: false } } }
        });
      }
      if (ctxW) {
        const bV = sd?.price || 1300;
        const im = [bV*.92, bV, bV*.96, bV*1.08, bV*1.02, bV*1.16, bV*1.08, bV*1.22, bV*1.15, bV*1.28];
        wChartInst.current = new Chart(ctxW, {
          type: 'line',
          data: { labels: ['1','2','3','4','5'], datasets: [{ data: im as any, borderColor: '#14b8a6', borderWidth: 2, tension: .2 }] },
          options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false } }, scales: { x: { display: false }, y: { display: false } } }
        });
      }
    });
    return () => cancelAnimationFrame(t);
  }, [loading, curStock, stockData, tf, chartType, showIndicators, sd]);

  const news = sd.news?.length ? sd.news.map((n: any) => ({ ...n, h: n.title, src: n.source, time: '1h' })) : [];

  const riskScore = insights?.sentimentScore || 50;
  const riskNeedle = -90 + (riskScore / 100) * 180;

  return (
    <div className="flex-1 flex flex-col lg:flex-row bg-brand-bd overflow-hidden min-h-0 relative">
      <div className="absolute top-0 left-0 right-0 h-[24px] bg-[rgba(7,12,24,.8)] backdrop-blur-md z-[60] border-b border-brand-bd flex items-center overflow-hidden">
        <div className="flex animate-marquee whitespace-nowrap gap-[40px] px-4">
          {macro.map((m: any, i: number) => (
            <div key={i} className="flex items-center gap-2 font-mono text-[9px]">
               <span className="text-brand-t4 uppercase">{m.name}:</span>
               <span className="text-brand-t1 font-bold">{m.value}{m.unit}</span>
               <span className={m.change >= 0 ? 'text-brand-gr' : 'text-brand-re'}>{m.change >= 0 ? '▲' : '▼'} {Math.abs(m.change)}%</span>
            </div>
          ))}
          {!macro.length && <div className="text-brand-t4 text-[9px] uppercase tracking-widest">Global Macro Streams Synchronizing...</div>}
        </div>
      </div>

      <button 
        className={`absolute z-[100] w-[24px] h-[24px] bg-brand-bgc border border-brand-bd rounded-full flex items-center justify-center text-brand-t1 hover:text-brand-bl transition-all hover:scale-110 shadow-2xl ${showSidebar ? 'right-[318px]' : 'right-[10px]'} top-[100px]`}
        onClick={() => setShowSidebar(!showSidebar)}
      >
        <span className="font-mono text-[14px] leading-none mb-[1px]">{showSidebar ? '→' : '←'}</span>
      </button>

      <div className="flex-1 flex flex-col overflow-hidden min-h-0 min-w-0 pt-[24px]">
        <div className="flex flex-col flex-1 overflow-y-auto bg-brand-bg min-h-0 scrollbar-none">
          <div className="bg-brand-bgc border-b border-brand-bd flex items-center p-[8px_14px] gap-[20px] shrink-0 overflow-x-auto whitespace-nowrap scrollbar-none">
            <div className="flex items-center gap-[12px]"><div className="font-mono text-[20px] font-bold text-brand-bl uppercase tracking-tight">{curStock}</div><div className="text-[11px] text-brand-t2 font-medium">{sd.name}</div></div>
            <div className="flex items-baseline gap-[8px]"><div className={`font-mono text-[22px] font-bold ${sd.changePercent >= 0 ? 'text-brand-gr' : 'text-brand-re'}`}>₹{livePrice.toFixed(2)}</div></div>
            <div className="ml-auto flex gap-4">
               {['1D','1M','1Y'].map(v => <button key={v} className={`font-mono text-[10px] px-2 py-1 rounded border ${tf===v?'text-brand-bl border-brand-bl':'text-brand-t4 border-transparent'}`} onClick={() => setTf(v)}>{v}</button>)}
               <div className="w-[1px] h-[20px] bg-brand-bd"></div>
               {['MA','BB','VWAP'].map(i => (
                 <button key={i} className={`font-mono text-[10px] px-2 py-1 rounded border ${(showIndicators as any)[i]?'text-brand-tl border-brand-tl bg-brand-tlg':'text-brand-t4 border-transparent'}`} onClick={() => setShowIndicators(prev => ({...prev, [i]: !(prev as any)[i]}))}>{i}</button>
               ))}
               <div className="bg-brand-grg text-brand-gr font-mono text-[9px] font-bold px-[8px] py-[3px] rounded-[3px] border border-[rgba(34,197,94,.15)]">AI RATING: {insights?.recommendation || 'BULLISH'}</div>
            </div>
          </div>

          <div className="flex-1 flex flex-col bg-brand-bgp overflow-hidden min-h-[300px]">
            <div className="flex-1 relative p-[10px] min-h-0 bg-[rgba(10,15,30,.2)]"><canvas ref={pChartRef} className="w-full h-full"></canvas></div>
            <div className="h-[44px] px-[10px] border-t border-[rgba(255,255,255,.03)] bg-[rgba(7,12,24,.4)] shrink-0"><canvas ref={vChartRef} className="w-full h-full"></canvas></div>
          </div>

          <div className="h-[3px] bg-brand-bd cursor-row-resize hover:bg-brand-bl transition-colors z-20 shrink-0" onMouseDown={() => setIsResizingBottom(true)}></div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-[1px] bg-brand-bd shrink-0 overflow-hidden" style={{ height: window.innerWidth > 1024 ? bottomHeight : 'auto' }}>
            <div className="bg-brand-bgp flex flex-col min-h-0 overflow-hidden">
              <PanelHeader label="AI DEEP RESEARCH" dot="bl" right={<span className="text-[9px] text-brand-t4 font-mono">LOONDX ENGINE</span>} />
              <div className="flex-1 p-[14px] overflow-y-auto scrollbar-none font-medium text-[11px] leading-[1.6] text-brand-t2">
                 {insights?.summary || "AI Analysis Engine initializing... Synchronizing deep market intelligence for Indian markets."}
                 {insights?.impactChain && (
                   <div className="mt-4 p-3 bg-brand-bgc border border-brand-bd rounded-[4px]">
                      <div className="text-[8px] text-brand-tl uppercase font-bold mb-2 tracking-widest">Global Impact Chain</div>
                      <div className="text-brand-t1 text-[10px] font-mono">{insights.impactChain}</div>
                   </div>
                 )}
              </div>
            </div>

            <div className="bg-brand-bgp flex flex-col min-h-0 border-l border-brand-bd">
              <PanelHeader label="VALUATION / DCF" dot="ye" />
              <div className="flex-1 p-[14px] flex flex-col gap-4">
                <div className="flex justify-between border-b border-brand-bd pb-2 font-mono">
                   <div><div className="text-[8px] text-brand-t4 uppercase">Intrinsic Val</div><div className="text-[18px] font-bold text-brand-tl">₹{sd.intrinsicValue || (livePrice * 1.05).toFixed(1)}</div></div>
                   <div className="text-right"><div className="text-[8px] text-brand-t4 uppercase">Ref Price</div><div className="text-[18px] font-bold text-brand-t1">₹{livePrice.toFixed(2)}</div></div>
                </div>
                <div className="grid grid-cols-2 gap-y-3">
                   {[{l:'ROE',v:sd.roe ? `${sd.roe}%` : '22.4%'},{l:'Mkt Cap',v:sd.marketCap ? `${sd.marketCap} Cr` : '--'},{l:'Debt/Eq',v:sd.debtToEquity || '0.4'},{l:'EPS',v:sd.eps || '--'}].map(i=>(
                     <div key={i.l} className="flex flex-col"><span className="text-[8px] text-brand-t4 uppercase">{i.l}</span><span className="text-[11px] font-bold text-brand-t1 font-mono">{i.v}</span></div>
                   ))}
                </div>
              </div>
            </div>

            <div className="bg-brand-bgp flex flex-col min-h-0 border-l border-brand-bd">
              <PanelHeader label="ELLIOTT WAVE" dot="pu" />
              <div className="flex-1 relative p-4"><canvas ref={wChartRef}></canvas></div>
            </div>
          </div>
        </div>
      </div>

      {showSidebar && (
        <div className="flex flex-col bg-brand-bgp shrink-0 overflow-hidden border-l border-brand-bd pt-[24px]" style={{ width: rightWidth }}>
          <div className="flex-1 overflow-y-auto scrollbar-custom">
            <div className="sticky top-0 z-30"><PanelHeader label="INTEL & SENTIMENT" dot="re" right={<span className="text-brand-re animate-pulse text-[9px] font-mono">● LIVE PULSE</span>} /></div>
            <div className="p-4 bg-brand-bgc border-b border-brand-bd flex items-center justify-between">
                <div className="flex flex-col">
                   <div className="text-[8px] text-brand-t4 uppercase font-bold mb-2">Social Sentiment Gauge</div>
                   <div className="flex items-center gap-2">
                       <svg width="60" height="35" viewBox="0 0 100 60" className="opacity-80">
                          <path d="M 10 50 A 40 40 0 0 1 90 50" fill="none" stroke="#1e293b" strokeWidth="12" />
                          <path d="M 10 50 A 40 40 0 0 1 90 50" fill="none" stroke="#22c55e" strokeWidth="12" strokeDasharray="125.6" strokeDashoffset={125.6 * (1 - riskScore/100)} />
                          <g style={{ transformOrigin: '50px 50px', transform: `rotate(${riskNeedle}deg)` }}><line x1="50" y1="50" x2="50" y2="15" stroke="white" strokeWidth="3" /></g>
                       </svg>
                       <span className="text-[12px] font-bold text-brand-gr font-mono">{riskScore}%</span>
                   </div>
                </div>
                <div className="text-right font-mono"><div className="text-[8px] text-brand-t4 uppercase mb-1">Vol 24h</div><div className="text-[11px] font-bold text-brand-t1">{(sd.volume / 10e6).toFixed(1)}M</div></div>
            </div>
            <div className="p-1 bg-brand-bgp">
               {news.map((n: any, i: number) => (
                 <div key={i} className="p-[12px] border-b border-brand-bd hover:bg-brand-bgc group transition-colors">
                    <div className="flex justify-between text-[8px] font-bold mb-1"><span className="text-brand-bl group-hover:underline">{n.src}</span><span className="text-brand-t4">1h</span></div>
                    <div className="text-[11.5px] leading-[1.4] text-brand-t1 font-medium">{n.h}</div>
                 </div>
               ))}
               {!news.length && <div className="p-4 text-center text-brand-t4 text-[10px]">No recent news available.</div>}
            </div>
            <div className="sticky top-0 z-20 border-t border-brand-bd"><PanelHeader label="INSTITUTIONAL" dot="bl" /></div>
            <div className="p-4 grid grid-cols-2 gap-4 bg-brand-bgp border-b border-brand-bd">
                <div className="flex flex-col"><div className="text-[8px] text-brand-t4 uppercase mb-1">FII Net</div><div className="text-[14px] font-bold text-brand-gr font-mono">+$1.4k Cr</div></div>
                <div className="flex flex-col"><div className="text-[8px] text-brand-t4 uppercase mb-1">DII Net</div><div className="text-[14px] font-bold text-brand-re font-mono">-$820 Cr</div></div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
