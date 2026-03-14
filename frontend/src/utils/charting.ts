export const genOHLC = (n: number, base: number) => {
  const a = []; let p = base;
  // Volatility is roughly 1-2% per step
  const vol = base * 0.015;
  for (let i = 0; i < n; i++) {
    const o = p, mv = (Math.random() - .48) * vol, c = Math.max(o + mv, o * .85);
    const h = Math.max(o, c) + Math.random() * (vol * 0.5), l = Math.min(o, c) - Math.random() * (vol * 0.5);
    a.push({ o, h: Math.max(h, o, c), l: Math.min(l, o, c), c, v: Math.floor(1e6 + Math.random() * 5e6) });
    p = c;
  }
  return a;
};

export const genLbls = (n: number, tf: string) => {
  const a = [], now = new Date();
  const days: any = { '1D': 1 / 96, '5D': 5 / n, '1M': 30 / n, '3M': 90 / n, '6M': 182 / n, '1Y': 365 / n, '5Y': 1825 / n };
  const day = days[tf] || 30 / n;
  for (let i = n - 1; i >= 0; i--) {
    const d = new Date(now.getTime() - i * day * 86400000);
    if (tf === '1D') a.push(d.getHours().toString().padStart(2, '0') + ':' + d.getMinutes().toString().padStart(2, '0'));
    else a.push((d.getMonth() + 1) + '/' + d.getDate() + (tf === '1Y' || tf === '5Y' ? '/' + (d.getFullYear() % 100) : ''));
  }
  return a;
};

export const calcMA = (c: number[], p: number) => 
  c.map((_, i) => i < p - 1 ? null : c.slice(i - p + 1, i + 1).reduce((a, b) => a + b, 0) / p);

export const calcEMA = (c: number[], p: number) => {
  const k = 2 / (p + 1), r = new Array(c.length).fill(null); let ema: number | null = null;
  c.forEach((v, i) => {
    if (ema === null) {
      if (i >= p - 1) { ema = c.slice(0, i + 1).reduce((a, b) => a + b, 0) / p; r[i] = ema; }
    } else { ema = v * k + ema * (1 - k); r[i] = ema; }
  });
  return r;
};

export const calcBB = (c: number[], p: number) => {
  const u: (number | null)[] = [], l: (number | null)[] = [];
  c.forEach((_, i) => {
    if (i < p - 1) { u.push(null); l.push(null); return; }
    const sl = c.slice(i - p + 1, i + 1), m = sl.reduce((a, b) => a + b, 0) / p;
    const sd = Math.sqrt(sl.map((v) => (v - m) * (v - m)).reduce((a, b) => a + b, 0) / p);
    u.push(m + 2 * sd); l.push(m - 2 * sd);
  });
  return { u, l };
};

export const calcVWAP = (d: any[]) => {
  let cTV = 0, cV = 0;
  return d.map((x) => { const tp = (x.h + x.l + x.c) / 3; cTV += tp * x.v; cV += x.v; return cTV / cV; });
};

export const calcRSI = (c: number[], p: number = 14) => {
  const r: (number | null)[] = new Array(c.length).fill(null);
  if (c.length <= p) return r;
  
  let gains = 0, losses = 0;
  for (let i = 1; i <= p; i++) {
    const diff = c[i] - c[i-1];
    if (diff > 0) gains += diff; else losses -= diff;
  }
  
  let avgG = gains / p, avgL = losses / p;
  r[p] = 100 - (100 / (1 + (avgG / (avgL || 1))));

  for (let i = p + 1; i < c.length; i++) {
    const diff = c[i] - c[i-1];
    const g = diff > 0 ? diff : 0, l = diff < 0 ? -diff : 0;
    avgG = (avgG * (p - 1) + g) / p;
    avgL = (avgL * (p - 1) + l) / p;
    r[i] = 100 - (100 / (1 + (avgG / (avgL || 1))));
  }
  return r;
};

export const csPlugin = {
  id: 'cs',
  beforeDatasetsDraw: (chart: any) => {
    const ds = chart.data.datasets[0];
    if (!ds.ohlcD || ds.chartT !== 'candle') return;
    const ctx = chart.ctx, x = chart.scales.x, y = chart.scales.y;
    const ohlcD = ds.ohlcD;
    const bw = Math.max(1.5, (x.width / ohlcD.length) * .65);
    ohlcD.forEach((d: any, i: number) => {
      const px = x.getPixelForValue(i), po = y.getPixelForValue(d.o), pc = y.getPixelForValue(d.c);
      const ph2 = y.getPixelForValue(d.h), pl2 = y.getPixelForValue(d.l), up = d.c >= d.o;
      ctx.beginPath(); ctx.strokeStyle = up ? 'rgba(34,197,94,.75)' : 'rgba(239,68,68,.75)';
      ctx.lineWidth = 1; ctx.moveTo(px, ph2); ctx.lineTo(px, pl2); ctx.stroke();
      ctx.fillStyle = up ? 'rgba(34,197,94,.88)' : 'rgba(239,68,68,.88)';
      ctx.fillRect(px - bw / 2, Math.min(po, pc), bw, Math.abs(po - pc) || 1.5);
    });
  }
};
