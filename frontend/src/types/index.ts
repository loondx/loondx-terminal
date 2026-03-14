export interface StockData {
  name: string;
  exch: string;
  price: number;
  chg: number;
  pct: number;
  dir: 'up' | 'dn';
  open: number;
  high: number;
  low: number;
  base: number;
  vol: number;
  rating: string;
  wh: number;
  wl: number;
}

export interface TickData {
  s: string;
  p: number;
  c: number;
}

export interface NewsItem {
  src: string;
  time: string;
  h: string;
  s: 'bull' | 'bear' | 'neut';
}
