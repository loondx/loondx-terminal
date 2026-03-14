import React, { useState, useEffect, useRef } from 'react';
import Chart from 'chart.js/auto';
import { STOCKS, NEWS2 } from '../data';
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
  const [showMA, setShowMA] = useState(true);
  const [showBB, setShowBB] = useState(false);
  const [showVWAP, setShowVWAP] = useState(false);
  const [showEMA, setShowEMA] = useState(false);
  
  const [rightWidth, setRightWidth] = useState(330);
  const [bottomHeight, setBottomHeight] = useState(250);
  const [isResizingRight, setIsResizingRight] = useState(false);
  const [isResizingBottom, setIsResizingBottom] = useState(false);
  const [showSidebar, setShowSidebar] = useState(window.innerWidth > 1400);

  const [livePrice, setLivePrice] = useState<number>(stockData?.price || 212.49);

  const pChartRef = useRef<HTMLCanvasElement>(null);
  const vChartRef = useRef<HTMLCanvasElement>(null);
  const wChartRef = useRef<HTMLCanvasElement>(null);
  const pChartInst = useRef<Chart | null>(null);
  const vChartInst = useRef<Chart | null>(null);
  const wChartInst = useRef<Chart | null>(null);

  useEffect(() => {
    if (stockData) setLivePrice(stockData.price);
    const itv = setInterval(() => {
      setLivePrice((prev: number) => Math.max(prev + (Math.random() - 0.499) * 0.11, 20));
    }, 3200);
    return () => clearInterval(itv);
  }, [stockData]);

  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth < 1024) setShowSidebar(false);
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

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
    if (loading) return;
    if (pChartInst.current) pChartInst.current.destroy();
    if (vChartInst.current) vChartInst.current.destroy();
    if (wChartInst.current) wChartInst.current.destroy();

    const t = requestAnimationFrame(() => {
      const d = stockData || STOCKS['AAPL'];
      const ctxP = pChartRef.current?.getContext('2d');
      const ctxV = vChartRef.current?.getContext('2d');
      const ctxW = wChartRef.current?.getContext('2d');

      const tfN: any = { '1D': 25, '5D': 50, '1M': 60, '3M': 90, '6M': 126, '1Y': 250, '5Y': 260 };
      const n = tfN[tf] || 60;
      const ohlcD = genOHLC(n, d.base, d.vol);
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
        if (showMA) { 
          ds.push({ label: 'MA20', data: ma20, type: 'line', borderColor: 'rgba(14,165,233,.8)', borderWidth: 1.4, pointRadius: 0, order: 3, fill: false } as any); 
          ds.push({ label: 'MA50', data: ma50, type: 'line', borderColor: 'rgba(249,115,22,.7)', borderWidth: 1.4, pointRadius: 0, order: 4, fill: false } as any); 
        }
        if (showBB) { 
          ds.push({ label: 'BB+', data: bb.u, type: 'line', borderColor: 'rgba(100,116,139,.4)', borderWidth: 1, borderDash: [4, 4], pointRadius: 0, order: 5, fill: false } as any); 
          ds.push({ label: 'BB-', data: bb.l, type: 'line', borderColor: 'rgba(100,116,139,.4)', borderWidth: 1, borderDash: [4, 4], pointRadius: 0, order: 6, fill: false } as any); 
        }
        if (showVWAP) ds.push({ label: 'VWAP', data: vwap, type: 'line', borderColor: 'rgba(234,179,8,.8)', borderWidth: 1.2, borderDash: [5, 2], pointRadius: 0, order: 7, fill: false } as any);
        if (showEMA) ds.push({ label: 'EMA21', data: ema21, type: 'line', borderColor: 'rgba(139,92,246,.8)', borderWidth: 1.4, pointRadius: 0, order: 8, fill: false } as any);

        pChartInst.current = new Chart(ctxP, {
          type: 'bar',
          data: { labels: lbls, datasets: ds },
          options: {
            responsive: true, maintainAspectRatio: false, animation: { duration: 300 },
            interaction: { mode: 'index', intersect: false },
            plugins: { legend: { display: false }, tooltip: { enabled: true, backgroundColor: 'rgba(7,12,24,.98)', borderColor: '#1e3050', borderWidth: 1, titleFont: { size: 10 }, bodyFont: { size: 10 } } },
            scales: {
              x: { ticks: { color: '#334155', font: { size: 9 }, maxTicksLimit: 12 }, grid: { color: 'rgba(23,32,56,.8)' }, border: { color: '#172038' } },
              y: { position: 'right', ticks: { color: '#64748b', font: { size: 10 }, callback: (v) => '$' + Number(v).toFixed(0) }, grid: { color: 'rgba(23,32,56,.8)' }, border: { color: '#172038' } }
            }
          }
        });
      }
      if (ctxV) {
        vChartInst.current = new Chart(ctxV, {
          type: 'bar',
          data: { labels: lbls, datasets: [{ data: vols, backgroundColor: vcol, borderWidth: 0, borderRadius: 1 }] },
          options: {
            responsive: true, maintainAspectRatio: false, animation: { duration: 300 },
            plugins: { legend: { display: false }, tooltip: { enabled: false } },
            scales: { x: { display: false }, y: { position: 'right', ticks: { color: '#334155', font: { size: 8 }, callback: (v) => (Number(v) / 1e6).toFixed(0) + 'M' }, grid: { color: 'rgba(23,32,56,.5)' } } }
          }
        });
      }
      if (ctxW) {
        const bV = d?.base || 185;
        const im = [bV*.92, bV, bV*.96, bV*1.08, bV*1.02, bV*1.16, bV*1.08, bV*1.22, bV*1.15, bV*1.28];
        const pr = [null, null, null, null, null, null, null, bV*1.22, bV*1.25, bV*1.35];
        wChartInst.current = new Chart(ctxW, {
          type: 'line',
          data: { labels: ['','1','','2','','3','','4','','5'], datasets: [{ data: im as any, borderColor: 'rgba(20,184,166,.9)', borderWidth: 2, pointRadius: im.map((_,i)=>i%2?4:1), pointBackgroundColor: im.map((_,i)=>i%2?'#14b8a6':'transparent'), fill: false, tension: .2 }, { data: pr as any, borderColor: 'rgba(249,115,22,.5)', borderWidth: 1.5, borderDash: [5,3], pointRadius: 0, fill: false, tension: .4 }] },
          options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false } }, scales: { x: { ticks: { color: '#14b8a6', font: { size: 10, weight: 'bold' } }, grid: { display: false } }, y: { position: 'right', ticks: { color: '#475569', font: { size: 8 } }, grid: { color: 'rgba(23,32,56,.5)' } } } }
        });
      }
    });
    return () => cancelAnimationFrame(t);
  }, [loading, curStock, stockData, tf, chartType, showMA, showBB, showVWAP, showEMA]);

  const sd = stockData || STOCKS['AAPL'];
  const news = NEWS2.map(item => {
    const sN = sd.name.split(' ')[0];
    const h = item.h.replace(/Apple|iPhone|MacBook|App Store|Vision Pro/g, sN);
    return { ...item, h };
  });

  const b = sd.base || 180;
  const metrics = {
    rev: +(b * 2.11).toFixed(1),
    net: +(b * 0.506).toFixed(1),
    eps: +(b * 0.036).toFixed(2),
    pe: +(sd.price / (b * 0.036 || 1)).toFixed(1),
    roe: 16.4,
    fcf: +(b * 0.22).toFixed(1),
    dcf: +(b * 1.05).toFixed(2),
    graham: +(b * 0.98).toFixed(2),
    risk: Math.min(100, Math.round(35 + (sd.vol || 50) * 0.3 + Math.abs(sd.pct || 0) * 2.1)),
  };

  const riskNeedle = -90 + (metrics.risk / 100) * 180;

  return (
    <div className="flex-1 flex flex-col lg:flex-row bg-brand-bd overflow-hidden min-h-0 relative">
      
      {/* SIDEBAR TOGGLE BUTTON (Floating on right edge of chart area) */}
      <button 
        className="absolute right-[10px] top-[100px] z-[50] w-[24px] h-[24px] bg-brand-bgc border border-brand-bd rounded-full flex items-center justify-center text-brand-t1 hover:text-brand-bl transition-all hover:scale-110 shadow-lg"
        onClick={() => setShowSidebar(!showSidebar)}
        title={showSidebar ? "Hide Sidebar" : "Show Sidebar"}
      >
        {showSidebar ? '→' : '←'}
      </button>

      <div className="flex-1 flex flex-col overflow-hidden min-h-0 min-w-0">
        <div className="flex flex-col flex-1 overflow-y-auto bg-brand-bg min-h-0 scrollbar-none">
          
          {/* HEADER HERO */}
          <div className="bg-brand-bgc border-b border-brand-bd flex items-center p-[8px_14px] gap-[20px] shrink-0 overflow-x-auto whitespace-nowrap scrollbar-none">
            <div className="flex items-center gap-[12px]"><div className="font-mono text-[20px] font-bold text-brand-bl">{curStock}</div><div className="text-[11px] text-brand-t2 font-medium">{sd.name}</div></div>
            <div className="flex items-baseline gap-[8px]"><div className={`font-mono text-[22px] font-bold ${sd.dir === 'up' ? 'text-brand-gr' : 'text-brand-re'}`}>${livePrice.toFixed(2)}</div><div className={`font-mono text-[10px] ${sd.dir === 'up' ? 'text-brand-gr' : 'text-brand-re'}`}>{sd.chg > 0 ? '+' : ''}{sd.chg.toFixed(2)} ({sd.pct.toFixed(2)}%)</div></div>
            <div className="ml-auto hidden xl:flex gap-[15px]">
               <div className="flex flex-col"><div className="text-[9px] text-brand-t4 uppercase">Open</div><div className="font-mono text-[11px] text-brand-t1">289.65</div></div>
               <div className="flex flex-col"><div className="text-[9px] text-brand-t4 uppercase">High</div><div className="font-mono text-[11px] text-brand-gr">213.82</div></div>
               <div className="flex flex-col"><div className="text-[9px] text-brand-t4 uppercase">Low</div><div className="font-mono text-[11px] text-brand-re">208.91</div></div>
            </div>
            <div className="bg-brand-grg text-brand-gr font-mono text-[9px] font-bold px-[8px] py-[3px] rounded-[3px] border border-[rgba(34,197,94,.15)] animate-pulse hidden md:block">STRONG BUY</div>
          </div>

          {/* CHART AREA */}
          <div className="flex-1 flex flex-col bg-brand-bgp overflow-hidden min-h-[300px]">
            <div className="flex items-center gap-[4px] p-[6px_10px] border-b border-brand-bd bg-brand-bgc shrink-0">
              {['1D', '5D', '1M', '3M', '6M', '1Y', '5Y'].map(t => (<button key={t} className={`font-mono text-[10px] py-[2px] px-[6px] rounded-[2px] border ${tf === t ? 'text-brand-bl border-brand-bl bg-brand-blg' : 'border-transparent text-brand-t3'}`} onClick={() => setTf(t)}>{t}</button>))}
              <div className="w-[1px] h-[14px] bg-brand-bd mx-[5px]"></div>
              {['MA','BB','VWAP','EMA'].map(s => {
                const act = (s==='MA'&&showMA)||(s==='BB'&&showBB)||(s==='VWAP'&&showVWAP)||(s==='EMA'&&showEMA);
                return <button key={s} className={`font-mono text-[9px] py-[2px] px-[7px] rounded-[2px] border ${act ? 'text-brand-tl border-brand-tl bg-brand-tlg' : 'border-brand-bd text-brand-t3'}`} onClick={() => { if(s==='MA') setShowMA(!showMA); if(s==='BB') setShowBB(!showBB); if(s==='VWAP') setShowVWAP(!showVWAP); if(s==='EMA') setShowEMA(!showEMA); }}>{s}</button>
              })}
              <div className="ml-auto flex gap-[2px]">
                {['candle', 'line', 'area'].map(c => (<button key={c} className={`font-mono text-[10px] py-[2px] px-[6px] rounded-[2px] border uppercase ${chartType === c ? 'text-brand-ye border-brand-ye bg-[rgba(234,179,8,.05)]' : 'border-transparent text-brand-t3'}`} onClick={() => setChartType(c)}>{c}</button>))}
              </div>
            </div>
            <div className="flex-1 relative p-[10px] min-h-0 bg-[rgba(10,15,30,.2)]"><canvas ref={pChartRef} className="w-full h-full"></canvas></div>
            <div className="h-[44px] px-[10px] border-t border-[rgba(255,255,255,.03)] bg-[rgba(7,12,24,.4)] shrink-0"><canvas ref={vChartRef} className="w-full h-full"></canvas></div>
          </div>

          <div className="h-[3px] bg-brand-bd cursor-row-resize hover:bg-brand-bl transition-colors z-20 shrink-0" onMouseDown={() => setIsResizingBottom(true)}></div>

          {/* BOTTOM PANELS - Grid per Image Ref */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-[1px] bg-brand-bd shrink-0 overflow-hidden" style={{ height: window.innerWidth > 1024 ? bottomHeight : 'auto' }}>
            
            {/* Fundamentals */}
            <div className="bg-brand-bgp flex flex-col min-h-0">
              <PanelHeader label="FUNDAMENTALS" dot="bl" right={<span className="text-[9px] text-brand-t4 font-mono uppercase tracking-widest">TTM ● Q1 2025</span>} />
              <div className="flex-1 p-[10px_14px] flex flex-col gap-[14px] overflow-y-auto scrollbar-none">
                <div className="flex justify-between items-end">
                  <div><div className="text-[8px] text-brand-t3 uppercase mb-[3px]">Revenue</div><div className="font-mono text-[18px] font-bold text-brand-bl">${metrics.rev}B</div><div className="text-[9px] text-brand-gr font-mono">TTM ▲ 4.1%</div></div>
                  <div className="text-right">
                    <div className="text-[8px] text-brand-t3 uppercase mb-[3px]">Net Income</div><div className="font-mono text-[18px] font-bold text-brand-tl">${metrics.net}B</div><div className="text-[9px] text-brand-gr font-mono">23.96% Margin ▲ 5.8%</div>
                  </div>
                </div>
                <div className="flex justify-between items-end border-t border-[rgba(255,255,255,.03)] pt-[10px]">
                   <div><div className="text-[8px] text-brand-t3 uppercase mb-[3px]">P/E Ratio</div><div className="font-mono text-[16px] font-bold text-brand-or">{metrics.pe}×</div><div className="text-[8px] text-brand-t4">Sector: 27.8× <span className="text-brand-re">+3.6×</span></div></div>
                   <div className="text-right"><div className="text-[8px] text-brand-t3 uppercase mb-[3px]">EPS Diluted</div><div className="font-mono text-[16px] font-bold text-brand-bl">${metrics.eps}</div><div className="text-[8px] text-brand-gr font-mono">TTM ▲ 11.2%</div></div>
                </div>
              </div>
            </div>

            {/* Intrinsic Value */}
            <div className="bg-brand-bgp flex flex-col min-h-0 border-l border-brand-bd">
              <PanelHeader label="INTRINSIC VALUE" dot="ye" right={<div className="flex gap-[10px] font-mono text-[9px] font-bold"><span className="text-brand-tl">DCF</span> ● <span className="text-brand-ye">GRAHAM</span></div>} />
              <div className="flex-1 p-[10px_14px] flex flex-col gap-[12px] overflow-y-auto scrollbar-none">
                <div className="flex justify-between items-baseline font-mono">
                   <div><div className="text-[8px] text-brand-t4 uppercase">DCF Val</div><div className="text-[15px] font-bold text-brand-tl">${metrics.dcf}</div></div>
                   <div className="text-right"><div className="text-[8px] text-brand-t4 uppercase">Market Price</div><div className="text-[15px] font-bold text-brand-t1">${livePrice.toFixed(2)}</div></div>
                </div>
                <div>
                  <div className="flex justify-between text-[10px] mb-[4px]"><span className="text-brand-t3 uppercase font-bold text-[8.5px]">Margin of Safety</span><span className="text-brand-re font-bold text-[9px]">-12.2% OVERVALUED</span></div>
                  <div className="h-[5px] bg-brand-bd rounded-full overflow-hidden flex"><div className="h-full bg-brand-or w-[45%]"></div></div>
                </div>
                <div className="grid grid-cols-2 gap-x-[15px] gap-y-[4px] border-t border-[rgba(255,255,255,.03)] pt-[8px]">
                  {[{l:'WACC',v:'8.4%'},{l:'Term. g',v:'3.0%'},{l:'Growth',v:'7.2%'},{l:'Yield',v:'3.8%'}].map(i=>(
                    <div key={i.l} className="flex justify-between"><span className="text-[8px] text-brand-t4 uppercase">{i.l}</span><span className="font-mono text-[9px] font-bold text-brand-t1">{i.v}</span></div>
                  ))}
                </div>
              </div>
            </div>

            {/* Elliott Wave */}
            <div className="bg-brand-bgp flex flex-col min-h-0 border-l border-brand-bd">
              <PanelHeader label="ELLIOTT WAVE" dot="pu" right={<span className="text-[9px] text-brand-tl font-mono uppercase tracking-widest">IMPULSE — WAVE 3</span>} />
              <div className="flex-1 flex flex-col p-[4px_10px] min-h-0 overflow-hidden">
                <div className="flex-1 relative"><canvas ref={wChartRef}></canvas></div>
              </div>
            </div>

          </div>
        </div>
      </div>

      {showSidebar && <div className="hidden lg:block w-[3px] bg-brand-bd cursor-col-resize hover:bg-brand-bl transition-colors z-20 shrink-0" onMouseDown={() => setIsResizingRight(true)}></div>}

      {/* RIGHT SIDEBAR - FIXED SCROLLING & RESPONSIVE */}
      {showSidebar && (
        <div className="flex flex-col bg-brand-bgp shrink-0 overflow-hidden min-h-0 border-l border-brand-bd lg:border-none shadow-2xl z-40" style={{ width: window.innerWidth > 1024 ? rightWidth : '100%' }}>
          
          {/* Scrollable Container for ALL Sidebar Contents */}
          <div className="flex-1 overflow-y-auto scrollbar-custom">
            
            {/* News Intelligence - Unified Header/Content */}
            <div className="sticky top-0 z-10">
               <PanelHeader label="NEWS INTELLIGENCE" dot="re" right={<span className="font-mono text-[9px] text-brand-re animate-pulse">● LIVE</span>} />
            </div>
            <div className="p-[2px_4px] bg-brand-bgp">
               {news.map((n, i) => (
                 <div key={i} className="p-[10px_12px] border-b border-brand-bd last:border-none hover:bg-brand-bgc transition-colors cursor-pointer group">
                    <div className="flex justify-between items-center mb-[3px]">
                      <span className="font-mono text-[9px] text-brand-bl font-bold uppercase">{n.src} <span className="text-brand-t4 font-normal ml-1">{n.time} ago</span></span>
                      <span className={`text-[8px] font-bold py-[1px] px-[4px] rounded-[2px] ${i % 2 === 0 ? 'text-brand-gr bg-[rgba(34,197,94,.1)]' : 'text-brand-re bg-[rgba(239,68,68,.1)]'}`}>{i % 2 === 0 ? '▲ BULL' : '▼ BEAR'}</span>
                    </div>
                    <div className="text-[11.5px] leading-[1.4] text-brand-t1 group-hover:text-brand-bl transition-colors tracking-tight font-medium">{n.h}</div>
                 </div>
               ))}
            </div>

            {/* Sentiment */}
            <div className="sticky top-0 z-10 border-t border-brand-bd">
               <PanelHeader label="SENTIMENT" dot="bl" right={<div className="h-[4px] w-[50px] bg-brand-bd rounded-full overflow-hidden"><div className="h-full bg-brand-gr w-[75%]"></div></div>} />
            </div>
            <div className="p-[15px_14px] flex items-center justify-between bg-brand-bgp">
                <div className="flex flex-col items-center"><div className="text-[8px] text-brand-t4 uppercase mb-1">P/L Today</div><div className="font-mono text-[14px] font-bold text-brand-gr">+$1,042</div></div>
                <div className="flex flex-col items-center"><div className="text-[8px] text-brand-t4 uppercase mb-1">Snapshot</div><div className="font-mono text-[14px] font-bold text-brand-tl">BULLISH</div></div>
                <div className="flex flex-col items-center"><div className="text-[8px] text-brand-t4 uppercase mb-1">Exposure</div><div className="font-mono text-[14px] font-bold text-brand-t1">$48,200</div></div>
            </div>

            {/* Risk Score */}
            <div className="sticky top-0 z-10 border-t border-brand-bd">
               <PanelHeader label="RISK SCORE" dot="ye" right={<span className="text-[8px] text-brand-ye uppercase tracking-widest font-bold">Composite Model</span>} />
            </div>
            <div className="p-[15px_16px] flex flex-col gap-[15px] bg-brand-bgp pb-4 px-4">
                <div className="flex items-center gap-[20px]">
                  <div className="relative w-[80px] h-[55px]">
                    <svg width="80" height="55" viewBox="0 0 100 60">
                       <path d="M 10 50 A 40 40 0 0 1 90 50" fill="none" stroke="#1e293b" strokeWidth="10" strokeLinecap="round" />
                       <path d="M 10 50 A 40 40 0 0 1 90 50" fill="none" stroke="url(#rg4)" strokeWidth="10" strokeLinecap="round" strokeDasharray="125.6" strokeDashoffset={125.6 * (1 - metrics.risk/100)} />
                       <defs><linearGradient id="rg4"><stop offset="0%" stopColor="#22c55e"/><stop offset="50%" stopColor="#eab308"/><stop offset="100%" stopColor="#ef4444"/></linearGradient></defs>
                       <g style={{ transformOrigin: '50px 50px', transform: `rotate(${riskNeedle}deg)` }}><line x1="50" y1="50" x2="50" y2="15" stroke="white" strokeWidth="3" strokeLinecap="round" /></g>
                    </svg>
                    <div className="absolute inset-0 flex items-center justify-center pt-8"><div className="text-center leading-[1]"><div className="font-mono text-[14px] font-bold text-brand-ye">{metrics.risk}<span className="text-[10px] font-normal text-brand-t4">/100</span></div></div></div>
                  </div>
                  <div className="flex-1 flex flex-col gap-[4px]">
                    {[ {l:'Beta (β)', v:'1.18', c:'ye'}, {l:'Liquidity', v:'HIGH', c:'gr'} ].map((r,i)=>(
                      <div key={i} className="flex items-center justify-between">
                        <span className="text-[8px] text-brand-t4 uppercase tracking-tighter">{r.l}</span>
                        <span className={`font-mono text-[9px] font-bold text-brand-${r.c}`}>{r.v}</span>
                      </div>
                    ))}
                  </div>
                </div>
            </div>

            {/* Key Ratios */}
            <div className="sticky top-0 z-10 border-t border-brand-bd">
               <PanelHeader label="KEY RATIOS" dot="tl" right={<span className="text-[8px] text-brand-t4 font-mono uppercase">Sector Rank: #1</span>} />
            </div>
            <div className="p-[15px_16px] grid grid-cols-2 gap-[15px] bg-brand-bgp pb-8">
                <div className="flex flex-col"><div className="text-[8px] text-brand-t4 uppercase mb-1">Div Yield</div><div className="font-mono text-[13px] font-bold text-brand-gr">0.48%</div></div>
                <div className="flex flex-col"><div className="text-[8px] text-brand-t4 uppercase mb-1">Payout</div><div className="font-mono text-[13px] font-bold text-brand-or">15.4%</div></div>
            </div>

          </div>
        </div>
      )}
    </div>
  );
};
