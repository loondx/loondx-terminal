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

  // Default to AAPL price initially to avoid NaN, though it'll be updated immediately
  const [livePrice, setLivePrice] = useState(STOCKS[curStock]?.price || 212.49);

  const pChartRef = useRef<HTMLCanvasElement>(null);
  const vChartRef = useRef<HTMLCanvasElement>(null);
  const wChartRef = useRef<HTMLCanvasElement>(null);
  const pChartInst = useRef<Chart | null>(null);
  const vChartInst = useRef<Chart | null>(null);
  const wChartInst = useRef<Chart | null>(null);

  // Live price tick
  useEffect(() => {
    if (stockData) {
      setLivePrice(stockData.price);
    }
    const itv = setInterval(() => {
      setLivePrice(prev => Math.max(prev + (Math.random() - 0.499) * 0.11, 20));
    }, 3200);
    return () => clearInterval(itv);
  }, [curStock]);

  // Chart rebuilding logic
  useEffect(() => {
    if (loading) return;

    if (pChartInst.current) pChartInst.current.destroy();
    if (vChartInst.current) vChartInst.current.destroy();
    if (wChartInst.current) wChartInst.current.destroy();

    const timer = requestAnimationFrame(() => {
      const d = STOCKS[curStock] || STOCKS['AAPL'];
      const ctxP = pChartRef.current?.getContext('2d');
      const ctxV = vChartRef.current?.getContext('2d');
      const ctxW = wChartRef.current?.getContext('2d');

      const tfN: any = { '1D': 26, '5D': 50, '1M': 60, '3M': 90, '6M': 126, '1Y': 252, '5Y': 260 };
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
          const g = ctxP.createLinearGradient(0, 0, 0, 280);
          g.addColorStop(0, 'rgba(14,165,233,.22)');
          g.addColorStop(1, 'rgba(14,165,233,.01)');
          pDs = { label: 'P', data: closes, type: 'line', borderColor: '#0ea5e9', borderWidth: 1.8, pointRadius: 0, fill: true, backgroundColor: g, order: 10, tension: .3 };
        } else {
          pDs = { label: 'P', data: closes, type: 'bar', backgroundColor: 'transparent', borderColor: 'transparent', barPercentage: .01, order: 10, ohlcD: ohlcD, chartT: chartType };
        }

        const ds = [pDs];
        if (showMA) { 
          ds.push({ label: 'MA20', data: ma20, type: 'line', borderColor: 'rgba(14,165,233,.82)', borderWidth: 1.5, pointRadius: 0, order: 3, fill: false } as any); 
          ds.push({ label: 'MA50', data: ma50, type: 'line', borderColor: 'rgba(249,115,22,.72)', borderWidth: 1.5, pointRadius: 0, order: 4, fill: false } as any); 
        }
        if (showBB) { 
          ds.push({ label: 'BB+', data: bb.u, type: 'line', borderColor: 'rgba(100,116,139,.42)', borderWidth: 1, borderDash: [4, 3], pointRadius: 0, order: 5, fill: false } as any); 
          ds.push({ label: 'BB-', data: bb.l, type: 'line', borderColor: 'rgba(100,116,139,.42)', borderWidth: 1, borderDash: [4, 3], pointRadius: 0, order: 6, fill: false } as any); 
        }
        if (showVWAP) ds.push({ label: 'VWAP', data: vwap, type: 'line', borderColor: 'rgba(234,179,8,.8)', borderWidth: 1.5, borderDash: [5, 2], pointRadius: 0, order: 7, fill: false } as any);
        if (showEMA) ds.push({ label: 'EMA21', data: ema21, type: 'line', borderColor: 'rgba(139,92,246,.8)', borderWidth: 1.5, pointRadius: 0, order: 8, fill: false } as any);

        pChartInst.current = new Chart(ctxP, {
          type: 'bar',
          data: { labels: lbls, datasets: ds },
          options: {
            responsive: true, maintainAspectRatio: false, animation: { duration: 280 },
            interaction: { mode: 'index', intersect: false },
            plugins: {
              legend: { display: false },
              tooltip: {
                enabled: true, backgroundColor: 'rgba(7,12,24,.97)', borderColor: '#1e3050', borderWidth: 1,
                titleFont: { family: 'IBM Plex Mono', size: 10 }, bodyFont: { family: 'IBM Plex Mono', size: 10 },
                callbacks: {
                  title: (ctx2) => lbls[ctx2[0].dataIndex] || '',
                  label: (ctx2) => {
                    if (ctx2.dataset.label === 'P' || ctx2.parsed.y === null) return '';
                    return ' ' + ctx2.dataset.label + ': $' + ctx2.parsed.y.toFixed(2);
                  }
                }
              }
            },
            scales: {
              x: { ticks: { color: '#334155', font: { family: 'IBM Plex Mono', size: 9 }, maxTicksLimit: 10, maxRotation: 0 }, grid: { color: 'rgba(23,32,56,.8)' }, border: { color: '#172038' } },
              y: { position: 'right', ticks: { color: '#64748b', font: { family: 'IBM Plex Mono', size: 10 }, callback: (v) => '$' + Number(v).toFixed(0) }, grid: { color: 'rgba(23,32,56,.8)' }, border: { color: '#172038' } }
            }
          }
        });
      }
      if (ctxV) {
        vChartInst.current = new Chart(ctxV, {
          type: 'bar',
          data: {
            labels: lbls,
            datasets: [{ data: vols, backgroundColor: vcol, borderWidth: 0, borderRadius: 1 }]
          },
          options: {
            responsive: true, maintainAspectRatio: false, animation: { duration: 280 },
            plugins: { legend: { display: false }, tooltip: { enabled: false } },
            scales: {
              x: { display: false },
              y: { position: 'right', ticks: { color: '#334155', font: { family: 'IBM Plex Mono', size: 8 }, callback: (v) => (Number(v) / 1e6).toFixed(0) + 'M' }, grid: { color: 'rgba(23,32,56,.5)' }, border: { color: '#172038' } }
            }
          }
        });
      }
      if (ctxW) {
        const baseVal = d?.base || 185;
        const imp = [baseVal * .92, baseVal, baseVal * .96, baseVal * 1.08, baseVal * 1.02, baseVal * 1.16, baseVal * 1.08, baseVal * 1.22, baseVal * 1.15, baseVal * 1.28];
        const prj = [null, null, null, null, null, null, null, baseVal * 1.22, baseVal * 1.25, baseVal * 1.35];
        wChartInst.current = new Chart(ctxW, {
          type: 'line',
          data: {
            labels: ['', '1', '', '2', '', '3', '', '4', '', '5'],
            datasets: [
              { data: imp as any, borderColor: 'rgba(20,184,166,.92)', borderWidth: 2, pointRadius: imp.map((_, i) => i % 2 === 1 ? 4 : 1.5), pointBackgroundColor: imp.map((_, i) => i % 2 === 1 ? '#14b8a6' : 'transparent'), pointBorderColor: imp.map((_, i) => i % 2 === 1 ? '#14b8a6' : 'rgba(20,184,166,.3)'), fill: false, tension: .2 },
              { data: prj as any, borderColor: 'rgba(249,115,22,.5)', borderWidth: 1.5, borderDash: [5, 3], pointRadius: 0, fill: false, tension: .4 }
            ]
          },
          options: {
            responsive: true, maintainAspectRatio: false,
            plugins: { legend: { display: false }, tooltip: { backgroundColor: 'rgba(7,12,24,.96)', borderColor: '#1e3050', borderWidth: 1, bodyFont: { family: 'IBM Plex Mono', size: 10 }, callbacks: { label: (ctx2) => ctx2.parsed.y ? ' $' + ctx2.parsed.y.toFixed(2) : '' } } },
            scales: {
              x: { ticks: { color: '#14b8a6', font: { family: 'IBM Plex Mono', size: 11, weight: 'bold' } }, grid: { color: 'rgba(23,32,56,.7)' }, border: { display: true, color: '#172038' } },
              y: { position: 'right', ticks: { color: '#64748b', font: { family: 'IBM Plex Mono', size: 9 }, callback: (v) => '$' + Number(v).toFixed(0) }, grid: { color: 'rgba(23,32,56,.7)' }, border: { display: true, color: '#172038' } }
            }
          }
        });
      }
    });

    return () => cancelAnimationFrame(timer);
  }, [loading, curStock, stockData, tf, chartType, showMA, showBB, showVWAP, showEMA]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      pChartInst.current?.destroy();
      vChartInst.current?.destroy();
      wChartInst.current?.destroy();
    };
  }, []);

  const sd = stockData || STOCKS['AAPL'];

  // --- Dynamic News Generation --- //
  const newsItems = NEWS2.map(item => {
    const sName = sd.name.split(' ')[0]; // E.g., 'Apple', 'NVIDIA', 'Tesla'
    const h = item.h
      .replace(/Apple|iPhone|MacBook|App Store|Vision Pro/g, (match: string) => {
        if (match === 'iPhone') return curStock === 'TSLA' ? 'Model 3' : curStock === 'NVDA' ? 'H100' : 'Product';
        if (match === 'Vision Pro') return curStock === 'TSLA' ? 'CyberTruck' : curStock === 'NVDA' ? 'Omniverse' : 'Next-gen';
        if (match === 'App Store') return curStock === 'TSLA' ? 'Supercharger' : curStock === 'NVDA' ? 'AI Cloud' : 'Platform';
        return sName;
      })
      .replace(/Services/g, curStock === 'NVDA' ? 'Data Center' : curStock === 'TSLA' ? 'Energy' : 'Services');
    return { ...item, h };
  });

  // --- Derived financial metrics — all update when curStock changes --- //
  const b = sd.base || 180;
  const revenue   = +(b * 2.11).toFixed(1);
  const netIncome = +(b * 0.506).toFixed(1);
  const netMargin = +((netIncome / revenue) * 100).toFixed(2);
  const eps       = +(b * 0.0366).toFixed(2);
  const pe        = +(sd.price / eps).toFixed(1);
  const sectorPe  = +(+pe * 0.885).toFixed(1);
  const roe       = +((netIncome / (b * 0.0641)) * 100).toFixed(1);
  const fcf       = +(b * 0.578).toFixed(1);
  const fcfYield  = +(3.8 * (185 / b) * (sd.price / 212.49)).toFixed(1);
  const divYield  = +(0.48 * (185 / b)).toFixed(2);
  const roa       = +(22.4 * (185 / b)).toFixed(1);
  const payout    = +(15.4 * (b / 185)).toFixed(1);

  const dcfVal    = +(b * 1.007).toFixed(2);
  const grahamVal = +(b * 0.963).toFixed(2);
  const mos       = +(((dcfVal - sd.price) / dcfVal) * 100).toFixed(1);
  const mosOver   = +mos < 0;
  const mosWidth  = Math.min(Math.abs(+mos) * 1.2, 100);

  const wacc      = +(8.4 + (sd.vol - 3.8) * 0.08).toFixed(1);
  const growth5y  = +(7.2 + (sd.pct > 0 ? 0.4 : -0.4)).toFixed(1);
  const evEbitda  = +(22.4 * (sd.price / 212.49)).toFixed(1);
  const peg       = +(+pe / (+growth5y * 10)).toFixed(2);
  const pb        = +(sd.price / (b * 0.089)).toFixed(1);
  const ps        = +(sd.price / (b * 0.14)).toFixed(2);

  const analystBuy   = sd.rating.includes('STRONG') ? 36 : sd.rating.includes('BUY') ? 28 : 18;
  const analystTotal = 44;
  const buyPct       = +((analystBuy / analystTotal) * 100).toFixed(0);
  const tgtAvg       = +(sd.price * 1.12).toFixed(2);
  const tgtHi        = +(sd.price * 1.38).toFixed(0);
  const tgtLo        = +(sd.price * 0.87).toFixed(0);
  const tgtUpside    = +(((+tgtAvg - sd.price) / sd.price) * 100).toFixed(1);

  const riskScore   = Math.min(100, Math.round(30 + sd.vol * 1.6 + Math.abs(sd.pct) * 1.2));
  const riskLabel   = riskScore < 35 ? 'LOW RISK' : riskScore < 55 ? 'MODERATE RISK' : riskScore < 72 ? 'ELEVATED RISK' : 'HIGH RISK';
  const riskNeedle  = -90 + (riskScore / 100) * 180;
  const riskDashOff = 175.9 * (1 - riskScore / 100);
  const beta        = +(1.0 + (sd.vol - 3.8) * 0.052).toFixed(2);
  const varVal      = +(-2.8 - (sd.vol - 3.8) * 0.15).toFixed(1);
  const sharpe      = +(2.1 - (sd.vol - 3.8) * 0.06).toFixed(2);
  const maxDD       = -(28 + Math.round(sd.vol * 0.9));

  const sentBull    = Math.min(85, Math.max(22, 58 + Math.round(sd.pct * 2.2)));
  const sentBear    = Math.max(5, Math.round((100 - sentBull) * 0.24));
  const sentNeut    = 100 - sentBull - sentBear;

  const ewTarget1   = +(sd.price * 1.074).toFixed(0);
  const ewTarget2   = +(sd.price * 1.136).toFixed(0);
  const ewSupport   = +(sd.price * 0.935).toFixed(0);

  return (
    <div className="flex-1 flex flex-col lg:grid lg:grid-cols-[1fr_298px] gap-[1px] bg-brand-bd overflow-hidden min-h-0">
      <div className="flex flex-col gap-[1px] bg-brand-bd overflow-y-auto min-h-0">

        {/* HERO */}
        <div className="bg-gradient-to-r from-brand-bgc to-brand-bgp overflow-x-auto flex flex-row items-center p-0 shrink-0 scrollbar-none">
          <div className="flex items-center gap-[11px] px-[14px] border-r border-brand-bd">
            <div>
              <div className="font-mono text-[20px] font-bold text-brand-bl tracking-[.04em] text-shadow-bl">{curStock}</div>
              <div className="text-[12px] text-brand-t2 font-medium">{sd.name}</div>
              <div className="font-mono text-[9px] text-brand-t3 tracking-[.08em] uppercase">{sd.exch}</div>
            </div>
          </div>
          <div className="px-[12px] border-r border-brand-bd flex items-baseline gap-[9px]">
            <div className={`font-mono text-[22px] font-bold tracking-[-.02em] transition-colors duration-300 ${sd.dir === 'up' ? 'text-brand-gr' : 'text-brand-re'}`}>${livePrice.toFixed(2)}</div>
            <div>
              <div className={`font-mono text-[12px] font-semibold ${sd.dir === 'up' ? 'text-brand-gr' : 'text-brand-re'}`}>{sd.chg > 0 ? '+$' : '-$'}{Math.abs(sd.chg).toFixed(2)}</div>
              <div className={`font-mono text-[10px] ${sd.dir === 'up' ? 'text-brand-gr' : 'text-brand-re'}`}>{sd.pct > 0 ? '+' : ''}{sd.pct.toFixed(2)}%</div>
            </div>
          </div>
          <div className="flex flex-1 overflow-hidden">
            <div className="flex flex-col gap-[1px] px-[10px] border-r border-brand-bd justify-center"><div className="text-[9px] text-brand-t3 uppercase tracking-[.08em]">Open</div><div className="font-mono text-[11px] font-medium">{sd.open.toFixed(2)}</div></div>
            <div className="flex flex-col gap-[1px] px-[10px] border-r border-brand-bd justify-center"><div className="text-[9px] text-brand-t3 uppercase tracking-[.08em]">High</div><div className="font-mono text-[11px] font-medium text-brand-gr">{sd.high.toFixed(2)}</div></div>
            <div className="flex flex-col gap-[1px] px-[10px] border-r border-brand-bd justify-center"><div className="text-[9px] text-brand-t3 uppercase tracking-[.08em]">Low</div><div className="font-mono text-[11px] font-medium text-brand-re">{sd.low.toFixed(2)}</div></div>
            <div className="flex flex-col gap-[1px] px-[10px] border-r border-brand-bd justify-center"><div className="text-[9px] text-brand-t3 uppercase tracking-[.08em]">52W H</div><div className="font-mono text-[11px] font-medium">{sd.wh.toFixed(2)}</div></div>
            <div className="flex flex-col gap-[1px] px-[10px] border-r border-brand-bd justify-center"><div className="text-[9px] text-brand-t3 uppercase tracking-[.08em]">52W L</div><div className="font-mono text-[11px] font-medium">{sd.wl.toFixed(2)}</div></div>
            <div className="flex flex-col gap-[1px] px-[10px] justify-center"><div className="text-[9px] text-brand-t3 uppercase tracking-[.08em]">Vol</div><div className="font-mono text-[11px] font-medium text-brand-tl">{sd.vol}M</div></div>
          </div>
          <div className="px-[12px] flex items-center">
            <div className={`py-[4px] px-[10px] rounded-[3px] font-mono text-[10px] font-bold tracking-[.1em] ${sd.rating.includes('BUY') ? 'bg-brand-grg border border-[rgba(34,197,94,.3)] text-brand-gr' : sd.rating === 'HOLD' ? 'bg-brand-org border border-[rgba(249,115,22,.3)] text-brand-or' : 'bg-brand-reg border border-[rgba(239,68,68,.3)] text-brand-re'}`}>
              {sd.rating}
            </div>
          </div>
        </div>

        {/* CHART AREA */}
        <div className="bg-brand-bgp flex flex-col overflow-hidden" style={{ minHeight: 280, maxHeight: 420 }}>
          <div className="flex items-center gap-[3px] py-[5px] px-[11px] border-b border-brand-bd bg-brand-bgc shrink-0 flex-wrap">
            {['1D', '5D', '1M', '3M', '6M', '1Y', '5Y'].map(t => (
              <button key={t} className={`font-mono text-[11px] py-[3px] px-[8px] rounded-[3px] border cursor-pointer bg-none transition-all ${tf === t ? 'text-brand-bl border-brand-bld bg-brand-blg' : 'border-transparent text-brand-t3 hover:text-brand-t1 hover:bg-brand-bge'}`} onClick={() => setTf(t)}>{t}</button>
            ))}
            <div className="w-[1px] h-[17px] bg-brand-bd mx-[5px]"></div>
            <button className={`font-mono text-[10px] py-[2px] px-[7px] rounded-[3px] border cursor-pointer bg-none transition-all ml-[3px] ${showMA ? 'text-brand-tl border-brand-tld bg-brand-tlg' : 'border-brand-bd text-brand-t3'}`} onClick={() => setShowMA(!showMA)}>MA</button>
            <button className={`font-mono text-[10px] py-[2px] px-[7px] rounded-[3px] border cursor-pointer bg-none transition-all ml-[3px] ${showBB ? 'text-brand-tl border-brand-tld bg-brand-tlg' : 'border-brand-bd text-brand-t3'}`} onClick={() => setShowBB(!showBB)}>BB</button>
            <button className={`font-mono text-[10px] py-[2px] px-[7px] rounded-[3px] border cursor-pointer bg-none transition-all ml-[3px] ${showVWAP ? 'text-brand-tl border-brand-tld bg-brand-tlg' : 'border-brand-bd text-brand-t3'}`} onClick={() => setShowVWAP(!showVWAP)}>VWAP</button>
            <button className={`font-mono text-[10px] py-[2px] px-[7px] rounded-[3px] border cursor-pointer bg-none transition-all ml-[3px] ${showEMA ? 'text-brand-tl border-brand-tld bg-brand-tlg' : 'border-brand-bd text-brand-t3'}`} onClick={() => setShowEMA(!showEMA)}>EMA</button>
            <div className="flex gap-[2px] ml-auto">
              {['candle', 'line', 'area'].map(c => (
                <button key={c} className={`font-mono text-[9px] py-[2px] px-[6px] rounded-[3px] border uppercase cursor-pointer transition-all ${chartType === c ? 'text-brand-or border-brand-ord bg-brand-org' : 'border-brand-bd bg-none text-brand-t3'}`} onClick={() => setChartType(c)}>{c}</button>
              ))}
            </div>
          </div>
          <div className="flex-1 relative min-h-0 overflow-hidden pt-[5px] px-[11px] min-h-[300px]">
            <canvas ref={pChartRef}></canvas>
          </div>
          <div className="font-mono text-[9px] text-brand-t3 py-[1px] px-[11px] tracking-[.07em]">VOLUME</div>
          <div className="h-[42px] px-[11px] pb-[4px] shrink-0"><canvas ref={vChartRef}></canvas></div>
        </div>

        {/* BOTTOM */}
        <div className="flex flex-col lg:grid lg:grid-cols-3 gap-[1px] bg-brand-bd overflow-hidden shrink-0 min-h-[208px]">
          <div className="bg-brand-bgp overflow-hidden flex flex-col pb-2 lg:pb-0">
            <PanelHeader label="FUNDAMENTALS" dot="bl" right={<span className="font-mono text-[10px] text-brand-bl">TTM · Q1 2025</span>} />
            <div className="grid grid-cols-2 flex-1 overflow-hidden">
              <div className="bg-brand-bgc py-[8px] px-[11px] border-b border-r border-brand-bd flex flex-col gap-[2px] hover:bg-brand-bgh transition-colors cursor-default">
                <div className="text-[9px] uppercase tracking-[.1em] text-brand-t3">Revenue</div>
                <div className="font-mono text-[14px] font-semibold text-brand-bl">${revenue}B</div>
                <div className="flex gap-[4px]"><div className="text-[9px] text-brand-t3">TTM</div><div className="text-[9px] font-mono text-brand-gr">▲ 4.1%</div></div>
                <div className="h-[2px] bg-brand-bd rounded-[1px] mt-[3px] overflow-hidden"><div className="h-full rounded-[1px] bg-brand-bl" style={{ width: '82%' }}></div></div>
              </div>
              <div className="bg-brand-bgc py-[8px] px-[11px] border-b border-brand-bd flex flex-col gap-[2px] hover:bg-brand-bgh transition-colors cursor-default">
                <div className="text-[9px] uppercase tracking-[.1em] text-brand-t3">Net Income</div>
                <div className="font-mono text-[14px] font-semibold text-brand-tl">${netIncome}B</div>
                <div className="flex gap-[4px]"><div className="text-[9px] text-brand-t3">{netMargin}% margin</div><div className="text-[9px] font-mono text-brand-gr">▲ 5.8%</div></div>
                <div className="h-[2px] bg-brand-bd rounded-[1px] mt-[3px] overflow-hidden"><div className="h-full rounded-[1px] bg-brand-tl" style={{ width: '72%' }}></div></div>
              </div>
              <div className="bg-brand-bgc py-[8px] px-[11px] border-b border-r border-brand-bd flex flex-col gap-[2px] hover:bg-brand-bgh transition-colors cursor-default">
                <div className="text-[9px] uppercase tracking-[.1em] text-brand-t3">P/E Ratio</div>
                <div className="font-mono text-[14px] font-semibold text-brand-or">{pe}×</div>
                <div className="flex gap-[4px]"><div className="text-[9px] text-brand-t3">Sector: {sectorPe}×</div><div className="text-[9px] font-mono text-brand-re">▲ +{(+pe - +sectorPe).toFixed(1)}×</div></div>
                <div className="h-[2px] bg-brand-bd rounded-[1px] mt-[3px] overflow-hidden"><div className="h-full rounded-[1px] bg-brand-or" style={{ width: `${Math.min(pe / 0.6, 100)}%` }}></div></div>
              </div>
              <div className="bg-brand-bgc py-[8px] px-[11px] border-b border-brand-bd flex flex-col gap-[2px] hover:bg-brand-bgh transition-colors cursor-default">
                <div className="text-[9px] uppercase tracking-[.1em] text-brand-t3">EPS Diluted</div>
                <div className="font-mono text-[14px] font-semibold text-brand-bl">${eps}</div>
                <div className="flex gap-[4px]"><div className="text-[9px] text-brand-t3">TTM</div><div className="text-[9px] font-mono text-brand-gr">▲ 11.2%</div></div>
                <div className="h-[2px] bg-brand-bd rounded-[1px] mt-[3px] overflow-hidden"><div className="h-full rounded-[1px] bg-brand-bl" style={{ width: '67%' }}></div></div>
              </div>
              <div className="bg-brand-bgc py-[8px] px-[11px] border-r border-brand-bd flex flex-col gap-[2px] hover:bg-brand-bgh transition-colors cursor-default">
                <div className="text-[9px] uppercase tracking-[.1em] text-brand-t3">ROE</div>
                <div className="font-mono text-[14px] font-semibold text-brand-gr">{roe}%</div>
                <div className="text-[9px] text-brand-t3">Top 2% sector</div>
                <div className="h-[2px] bg-brand-bd rounded-[1px] mt-[3px] overflow-hidden"><div className="h-full rounded-[1px] bg-brand-gr" style={{ width: `${Math.min(roe / 2, 100)}%` }}></div></div>
              </div>
              <div className="bg-brand-bgc py-[8px] px-[11px] flex flex-col gap-[2px] hover:bg-brand-bgh transition-colors cursor-default">
                <div className="text-[9px] uppercase tracking-[.1em] text-brand-t3">Free Cash Flow</div>
                <div className="font-mono text-[14px] font-semibold text-brand-pu">${fcf}B</div>
                <div className="flex gap-[4px]"><div className="text-[9px] text-brand-t3">FCF yield {fcfYield}%</div><div className="text-[9px] font-mono text-brand-gr">▲ 9.4%</div></div>
                <div className="h-[2px] bg-brand-bd rounded-[1px] mt-[3px] overflow-hidden"><div className="h-full rounded-[1px] bg-brand-pu" style={{ width: '88%' }}></div></div>
              </div>
            </div>
          </div>

          <div className="bg-brand-bgp overflow-hidden flex flex-col">
            <PanelHeader label="INTRINSIC VALUE" dot="or" />
            <div className="flex-1 p-[9px_11px] flex flex-col gap-[7px] overflow-hidden">
              <div className="flex justify-between items-start">
                <div><div className="text-[9px] uppercase tracking-[.1em] text-brand-t3 mb-[2px]">DCF Value</div><div className="font-mono text-[15px] font-bold text-brand-tl">${dcfVal}</div></div>
                <div className="text-center"><div className="text-[9px] uppercase tracking-[.1em] text-brand-t3 mb-[2px]">Graham #</div><div className="font-mono text-[15px] font-bold text-brand-ye">${grahamVal}</div></div>
                <div className="text-right"><div className="text-[9px] uppercase tracking-[.1em] text-brand-t3 mb-[2px]">Market Price</div><div className="font-mono text-[15px] font-bold text-brand-t1">${livePrice.toFixed(2)}</div></div>
              </div>
              <div>
                <div className="flex justify-between items-center mb-[3px]">
                  <span className="text-[9px] uppercase tracking-[.09em] text-brand-t3">MARGIN OF SAFETY</span>
                  <span className={`font-mono text-[10px] font-bold py-[1px] px-[7px] rounded-[3px] ${mosOver ? 'bg-brand-org text-brand-or border border-[rgba(249,115,22,.3)]' : 'bg-brand-grg text-brand-gr border border-[rgba(34,197,94,.3)]'}`}>{mos}% {mosOver ? 'OVERVALUED' : 'UNDERVALUED'}</span>
                </div>
                <div className="h-[7px] bg-brand-bge rounded-[4px] overflow-hidden">
                  <div className="relative h-full rounded-[4px] bg-gradient-to-r from-brand-re to-brand-or transition-all duration-1000 ease-out flex items-center justify-end" style={{ width: loading ? '0%' : `${mosWidth}%` }}>
                    <div className="absolute right-[-1px] top-1/2 -translate-y-1/2 w-[9px] h-[9px] rounded-full bg-white shadow-[0_0_7px_rgba(255,255,255,.5)]"></div>
                  </div>
                </div>
                <div className="flex justify-between font-mono text-[8px] text-brand-t4 mt-[2px]">
                  <span>−50%</span><span>−25%</span><span>FAIR</span><span>+25%</span><span>+50%</span>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-[2px_7px]">
                <div className="flex justify-between text-[10px] py-[2px] border-b border-[rgba(255,255,255,.03)]"><span className="text-brand-t3">WACC</span><span className="font-mono font-medium">{wacc}%</span></div>
                <div className="flex justify-between text-[10px] py-[2px] border-b border-[rgba(255,255,255,.03)]"><span className="text-brand-t3">Terminal g</span><span className="font-mono font-medium">3.0%</span></div>
                <div className="flex justify-between text-[10px] py-[2px] border-b border-[rgba(255,255,255,.03)]"><span className="text-brand-t3">Growth 5Y</span><span className="font-mono font-medium">{growth5y}%</span></div>
                <div className="flex justify-between text-[10px] py-[2px] border-b border-[rgba(255,255,255,.03)]"><span className="text-brand-t3">FCF Yield</span><span className="font-mono font-medium text-brand-tl">{fcfYield}%</span></div>
                <div className="flex justify-between text-[10px] py-[2px] border-b border-[rgba(255,255,255,.03)]"><span className="text-brand-t3">EV/EBITDA</span><span className="font-mono font-medium text-brand-or">{evEbitda}×</span></div>
                <div className="flex justify-between text-[10px] py-[2px] border-b border-[rgba(255,255,255,.03)]"><span className="text-brand-t3">PEG</span><span className="font-mono font-medium">{peg}</span></div>
                <div className="flex justify-between text-[10px] py-[2px] border-b border-[rgba(255,255,255,.03)]"><span className="text-brand-t3">P/B</span><span className="font-mono font-medium text-brand-or">{pb}×</span></div>
                <div className="flex justify-between text-[10px] py-[2px] border-b border-[rgba(255,255,255,.03)]"><span className="text-brand-t3">P/S</span><span className="font-mono font-medium">{ps}×</span></div>
              </div>
              <div className="p-[6px_8px] bg-brand-bge rounded-[3px] border border-brand-bd">
                <div className="text-[9px] text-brand-t3 font-mono tracking-[.06em] mb-[3px] uppercase">WALL STREET CONSENSUS · 44 ANALYSTS</div>
                <div className="flex items-center gap-[6px]">
                  <span className="font-mono text-[13px] font-bold text-brand-gr">{sd.rating.includes('BUY') ? 'BUY' : 'HOLD'}</span>
                  <div className="flex-1 h-[4px] bg-brand-bd rounded-[2px] overflow-hidden">
                    <div className="h-full rounded-[2px] bg-gradient-to-r from-brand-gr to-brand-tl transition-all duration-1000 ease-out" style={{ width: loading ? '0%' : `${buyPct}%` }}></div>
                  </div>
                  <span className="font-mono text-[10px] text-brand-t3">{analystBuy}/{analystTotal}</span>
                </div>
                <div className="text-[9px] text-brand-t3 mt-[2px]">Avg target: <span className="font-mono text-brand-t1">${tgtAvg}</span> · Upside: <span className="text-brand-gr">+{tgtUpside}%</span> · Hi: <span className="text-brand-gr">${tgtHi}</span> · Lo: <span className="text-brand-re">${tgtLo}</span></div>
              </div>
            </div>
          </div>

          <div className="bg-brand-bgp overflow-hidden flex flex-col">
            <PanelHeader label="ELLIOTT WAVE" dot="tl" right={<span className="font-mono text-[10px] text-brand-tl">IMPULSE · WAVE 3</span>} />
            <div className="flex-1 p-[4px_9px] min-h-0"><canvas ref={wChartRef}></canvas></div>
            <div className="flex gap-[10px] py-[5px] px-[11px] border-t border-brand-bd shrink-0 bg-brand-bgc items-center">
              <div className="flex items-center gap-[4px] font-mono text-[9px] text-brand-t3"><div className="w-[8px] h-[3px] rounded-[1px] bg-brand-tl"></div>Impulse</div>
              <div className="flex items-center gap-[4px] font-mono text-[9px] text-brand-t3"><div className="w-[8px] h-[3px] rounded-[1px] bg-brand-or opacity-60"></div>Projection</div>
              <div className="ml-auto font-mono text-[9px] text-brand-t3">Target: <span className="text-brand-or">${ewTarget1}–${ewTarget2}</span> Support: <span className="text-brand-gr">${ewSupport}</span></div>
            </div>
          </div>
        </div>

      </div>

      {/* RIGHT SIDEBAR */}
      <div className="flex flex-col lg:grid lg:grid-rows-[minmax(200px,1fr)_auto_auto] gap-[1px] bg-brand-bd overflow-hidden shrink-0 lg:shrink">
        <div className="bg-brand-bgp flex flex-col overflow-hidden">
            <PanelHeader label="NEWS INTELLIGENCE" dot="bl" right={<span className="font-mono text-[9px] text-brand-t3 flex items-center gap-[3px]"><span className="text-brand-re animate-flash">●</span> LIVE</span>} />
          <div className="flex-1 overflow-y-auto scrollbar-custom">
            {newsItems.map((n, i) => (
              <div key={i} className="p-[8px_11px] border-b border-brand-bd cursor-pointer transition-colors hover:bg-brand-bgc">
                <div className="flex items-center gap-[5px] mb-[3px]">
                  <span className="font-mono text-[9px] text-brand-bl uppercase tracking-[.05em]">{n.src}</span>
                  <span className="text-[9px] text-brand-t3">{n.time} ago</span>
                  <span className={`ml-auto font-mono text-[8px] font-bold py-[1px] px-[5px] rounded-[10px] ${n.s === 'bull' ? 'bg-brand-grg text-brand-gr' : n.s === 'bear' ? 'bg-brand-reg text-brand-re' : 'bg-[rgba(100,116,139,.18)] text-brand-t2'}`}>
                    {n.s === 'bull' ? '▲ BULL' : n.s === 'bear' ? '▼ BEAR' : '● NEUT'}
                  </span>
                </div>
                <div className="text-[11px] leading-[1.4]">{n.h}</div>
              </div>
            ))}
          </div>
          <div className="flex items-center gap-[5px] py-[6px] px-[11px] border-t border-brand-bd bg-brand-bgc shrink-0">
            <span className="font-mono text-[9px] text-brand-t3 whitespace-nowrap">SENTIMENT</span>
            <div className="flex-1 h-[5px] bg-brand-bge rounded-[3px] flex overflow-hidden">
              <div className="h-full bg-brand-gr" style={{ width: `${sentBull}%` }}></div>
              <div className="h-full bg-brand-t4" style={{ width: `${sentNeut}%` }}></div>
              <div className="h-full bg-brand-re" style={{ width: `${sentBear}%` }}></div>
            </div>
            <span className="font-mono text-[9px] text-brand-gr">BULL {sentBull}%</span>
          </div>
          <div className="flex border-t border-brand-bd shrink-0 bg-brand-bgp">
            <div className="flex-1 py-[6px] px-[9px] border-r border-brand-bd flex flex-col gap-[1px]">
              <div className="text-[8px] text-brand-t3 uppercase tracking-[.07em]">P/L Today</div>
              <div className="font-mono text-[12px] font-semibold text-brand-gr">+$1,842</div>
            </div>
            <div className="flex-1 py-[6px] px-[9px] border-r border-brand-bd flex flex-col gap-[1px]">
              <div className="text-[8px] text-brand-t3 uppercase tracking-[.07em]">P/L Total</div>
              <div className="font-mono text-[12px] font-semibold text-brand-gr">+$24.7K</div>
            </div>
            <div className="flex-1 py-[6px] px-[9px] flex flex-col gap-[1px]">
              <div className="text-[8px] text-brand-t3 uppercase tracking-[.07em]">Exposure</div>
              <div className="font-mono text-[12px] font-semibold">$48,200</div>
            </div>
          </div>
        </div>

        <div className="bg-brand-bgp flex flex-col overflow-hidden">
          <PanelHeader label="RISK SCORE" dot="or" right={<span className="font-mono text-[10px] text-brand-or">COMPOSITE MODEL</span>} />
          <div className="flex-1 flex items-center justify-center gap-[14px] p-[7px_10px] min-h-0">
            <div className="flex flex-col items-center shrink-0">
              <svg width="138" height="80" viewBox="0 0 138 80">
                <defs>
                  <linearGradient id="gg2" x1="0%" y1="0%" x2="100%" y2="0%">
                    <stop offset="0%" stopColor="#22c55e" /><stop offset="35%" stopColor="#eab308" />
                    <stop offset="65%" stopColor="#f97316" /><stop offset="100%" stopColor="#ef4444" />
                  </linearGradient>
                </defs>
                <path d="M 13 72 A 56 56 0 0 1 125 72" fill="none" stroke="#172038" strokeWidth="11" strokeLinecap="round" />
                <path id="gFill" d="M 13 72 A 56 56 0 0 1 125 72" fill="none" stroke="url(#gg2)" strokeWidth="11" strokeLinecap="round" strokeDasharray="175.9" strokeDashoffset={loading ? 175.9 : riskDashOff} style={{ transition: 'stroke-dashoffset 1.4s cubic-bezier(.4,0,.2,1)' }} />
                <g id="gNeedle" style={{ transformOrigin: '69px 72px', transform: `rotate(${riskNeedle}deg)`, transition: 'transform 1.4s cubic-bezier(.4,0,.2,1)' }}>
                  <line x1="69" y1="72" x2="69" y2="24" stroke="white" strokeWidth="2" strokeLinecap="round" opacity=".9" />
                  <circle cx="69" cy="72" r="4" fill="#0b1122" stroke="white" strokeWidth="1.5" />
                </g>
                <text x="8" y="80" fill="#475569" fontSize="7" fontFamily="IBM Plex Mono">LOW</text>
                <text x="111" y="80" fill="#475569" fontSize="7" fontFamily="IBM Plex Mono">HIGH</text>
                <text x="62" y="14" fill="#475569" fontSize="7" fontFamily="IBM Plex Mono">MED</text>
              </svg>
              <div className="font-mono text-[17px] font-bold text-brand-or text-center mt-[1px]">{riskScore}<span className="text-[11px] text-brand-t3">/100</span></div>
              <div className="font-mono text-[8px] text-brand-t3 uppercase tracking-[.1em] text-center">{riskLabel}</div>
            </div>
            <div className="flex-1 flex flex-col gap-[4px]">
              <div className="flex items-center gap-[6px]"><span className="text-[9px] text-brand-t3 flex-1 whitespace-nowrap">Beta (β)</span><div className="flex-[2] h-[3px] bg-brand-bd rounded-[2px] overflow-hidden"><div className="h-full rounded-[2px] bg-brand-or" style={{ width: `${Math.min(+beta * 45, 100)}%` }}></div></div><span className="font-mono text-[9px] min-w-[28px] text-right text-brand-or">{beta}</span></div>
              <div className="flex items-center gap-[6px]"><span className="text-[9px] text-brand-t3 flex-1 whitespace-nowrap">Liquidity</span><div className="flex-[2] h-[3px] bg-brand-bd rounded-[2px] overflow-hidden"><div className="h-full rounded-[2px] bg-brand-gr" style={{ width: `${Math.min(100 - sd.vol * 2, 95)}%` }}></div></div><span className="font-mono text-[9px] min-w-[28px] text-right text-brand-gr">{sd.vol < 6 ? 'HIGH' : sd.vol < 12 ? 'MED' : 'LOW'}</span></div>
              <div className="flex items-center gap-[6px]"><span className="text-[9px] text-brand-t3 flex-1 whitespace-nowrap">Debt/Equity</span><div className="flex-[2] h-[3px] bg-brand-bd rounded-[2px] overflow-hidden"><div className="h-full rounded-[2px] bg-brand-bl" style={{ width: '40%' }}></div></div><span className="font-mono text-[9px] min-w-[28px] text-right text-brand-bl">1.42</span></div>
              <div className="flex items-center gap-[6px]"><span className="text-[9px] text-brand-t3 flex-1 whitespace-nowrap">VaR 95%</span><div className="flex-[2] h-[3px] bg-brand-bd rounded-[2px] overflow-hidden"><div className="h-full rounded-[2px] bg-brand-re" style={{ width: `${Math.min(Math.abs(varVal) * 8, 80)}%` }}></div></div><span className="font-mono text-[9px] min-w-[28px] text-right text-brand-re">{varVal}%</span></div>
              <div className="flex items-center gap-[6px]"><span className="text-[9px] text-brand-t3 flex-1 whitespace-nowrap">Sharpe</span><div className="flex-[2] h-[3px] bg-brand-bd rounded-[2px] overflow-hidden"><div className="h-full rounded-[2px] bg-brand-tl" style={{ width: `${Math.min(+sharpe * 36, 100)}%` }}></div></div><span className="font-mono text-[9px] min-w-[28px] text-right text-brand-tl">{sharpe}</span></div>
              <div className="flex items-center gap-[6px]"><span className="text-[9px] text-brand-t3 flex-1 whitespace-nowrap">Max DD</span><div className="flex-[2] h-[3px] bg-brand-bd rounded-[2px] overflow-hidden"><div className="h-full rounded-[2px] bg-brand-ye" style={{ width: `${Math.min(Math.abs(maxDD), 80)}%` }}></div></div><span className="font-mono text-[9px] min-w-[28px] text-right text-brand-ye">{maxDD}%</span></div>
            </div>
          </div>
        </div>

        <div className="bg-brand-bgp">
          <PanelHeader label="KEY RATIOS" dot="pu" />
          <div className="grid grid-cols-3 flex-1 h-[60px]">
            <div className="flex flex-col justify-center px-[9px] border-r border-brand-bd hover:bg-brand-bgc transition-colors"><div className="text-[8px] uppercase tracking-[.09em] text-brand-t3">Div Yield</div><div className="font-mono text-[15px] font-bold text-brand-gr">{divYield}%</div></div>
            <div className="flex flex-col justify-center px-[9px] border-r border-brand-bd hover:bg-brand-bgc transition-colors"><div className="text-[8px] uppercase tracking-[.09em] text-brand-t3">ROA</div><div className="font-mono text-[15px] font-bold text-brand-tl">{roa}%</div></div>
            <div className="flex flex-col justify-center px-[9px] hover:bg-brand-bgc transition-colors"><div className="text-[8px] uppercase tracking-[.09em] text-brand-t3">Payout</div><div className="font-mono text-[15px] font-bold text-brand-or">{payout}%</div></div>
          </div>
        </div>
      </div>

    </div>
  );
};
