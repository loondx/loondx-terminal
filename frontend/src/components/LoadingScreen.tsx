import React, { useState, useEffect, useRef } from 'react';
import { APP_CONFIG } from '../config';
import { AppLogo } from './AppLogo';

interface LoadingScreenProps {
  curStock: string;
  onComplete: () => void;
  hasLoaded?: boolean;
}

export const LoadingScreen: React.FC<LoadingScreenProps> = ({ curStock, onComplete, hasLoaded = false }) => {
  const [loadPct, setLoadPct] = useState(0);
  const [loadStep, setLoadStep] = useState(0);

  const hasLoadedRef = useRef(hasLoaded);
  useEffect(() => { hasLoadedRef.current = hasLoaded; }, [hasLoaded]);

  // Loading Sequence
  useEffect(() => {
    setLoadPct(0);
    setLoadStep(0);
    const steps = [
      { id: 'ls0', dur: 420 }, { id: 'ls1', dur: 360 }, { id: 'ls2', dur: 500 },
      { id: 'ls3', dur: 440 }, { id: 'ls4', dur: 400 }, { id: 'ls5', dur: 340 }, { id: 'ls6', dur: 280 }
    ];
    let total = 0, sum = steps.reduce((a, b) => a + b.dur, 0), i = 0, lp = 0;

    const animBar = (tgt: number, dur: number, cb: () => void) => {
      let s = lp, frames = Math.max(1, Math.floor(dur / 16)), f = 0;
      const tk = () => {
        f++;
        let p = Math.min(s + Math.round((tgt - s) * f / frames), 100);
        lp = p;
        setLoadPct(p);
        if (f < frames) requestAnimationFrame(tk);
        else if (cb) cb();
      };
      requestAnimationFrame(tk);
    }

    const nx = () => {
      if (i >= steps.length) {
        if (!hasLoadedRef.current) {
          // If animation finished but API didn't, hold at 99%
          if (lp !== 99) setLoadPct(99); 
          setTimeout(nx, 150);
          return;
        }
        animBar(100, 200, () => {
          setTimeout(() => {
            onComplete();
          }, 280);
        });
        return;
      }
      setLoadStep(i);
      let tgt = Math.round((total + steps[i].dur) / sum * 100);
      animBar(tgt, steps[i].dur, () => {
        total += steps[i].dur;
        i++;
        nx();
      });
    }
    nx();
  }, [curStock, onComplete]);

  return (
    <div id="ldr" className="fixed inset-0 bg-brand-bg z-[9999] flex flex-col items-center justify-center gap-[28px] transition-opacity duration-700">
      <AppLogo className="text-[26px] tracking-[.32em] text-shadow-bl-lg" />
      <div className="font-mono text-[38px] font-bold text-brand-bl tracking-[-.02em] min-w-[80px] text-center">{loadPct}%</div>
      <div className="w-[300px] h-[2px] bg-brand-bd rounded-[1px] overflow-hidden">
        <div className="h-full bg-gradient-to-r from-brand-bld via-brand-bl to-brand-tl rounded-[1px] shadow-[0_0_10px_var(--bl)] transition-all duration-75" style={{ width: `${loadPct}%` }}></div>
      </div>
      <div className="flex flex-col gap-[5px] w-[300px]">
        {['Initializing market data feeds', 'Connecting exchange WebSocket APIs', `Loading ${curStock} fundamental database`, 'Calibrating DCF valuation models', 'Running Elliott Wave pattern engine', 'Fetching news intelligence feed', 'Rendering institutional terminal'].map((st, idx) => (
          <div key={idx} className={`font-mono text-[10px] flex items-center gap-[8px] transition-all duration-250 ${loadStep > idx ? 'opacity-100 translate-x-0 text-brand-t2' : loadStep === idx ? 'opacity-100 translate-x-0 text-brand-bl' : 'opacity-0 -translate-x-[6px] text-brand-t3'}`}>
            <div className={`w-[5px] h-[5px] rounded-full shrink-0 ${loadStep > idx ? 'bg-brand-gr shadow-[0_0_6px_var(--gr)]' : loadStep === idx ? 'bg-brand-bl shadow-[0_0_6px_var(--bl)] animate-ldp' : 'bg-brand-t4'}`}></div>
            {st}
          </div>
        ))}
      </div>
      <div className="font-mono text-[10px] tracking-[.2em] text-brand-t3 uppercase">{APP_CONFIG.tagline} · {APP_CONFIG.companyName}</div>
    </div>
  );
};
