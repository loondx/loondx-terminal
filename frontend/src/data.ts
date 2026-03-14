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

export const TICKS = [
  {s:'SPX',p:5842.41,c:0.68},
  {s:'NDX',p:20413.80,c:1.12},
  {s:'DJI',p:43801.34,c:-0.21},
  {s:'VIX',p:18.42,c:3.40},
  {s:'TNX',p:4.31,c:-0.08},
  {s:'DXY',p:103.84,c:-0.12},
  {s:'BTC',p:84210,c:-2.14},
  {s:'ETH',p:3241,c:-1.08},
  {s:'GOLD',p:2991.70,c:0.44},
  {s:'OIL',p:78.40,c:1.22}
];

export const STOCKS: Record<string, StockData> = {
  AAPL:{name:'Apple Inc.',exch:'NASDAQ · Technology · Large Cap',price:212.49,chg:2.84,pct:1.35,dir:'up',open:209.65,high:213.82,low:208.91,base:185,vol:3.8,rating:'STRONG BUY',wh:237.49,wl:164.08},
  MSFT:{name:'Microsoft Corp.',exch:'NASDAQ · Technology · Large Cap',price:408.32,chg:5.12,pct:1.27,dir:'up',open:403.20,high:410.44,low:401.80,base:360,vol:5.2,rating:'BUY',wh:468.35,wl:309.45},
  NVDA:{name:'NVIDIA Corp.',exch:'NASDAQ · Semiconductors · Large Cap',price:875.40,chg:18.40,pct:2.14,dir:'up',open:857.00,high:882.12,low:854.20,base:700,vol:18,rating:'STRONG BUY',wh:974.00,wl:373.39},
  GOOGL:{name:'Alphabet Inc.',exch:'NASDAQ · Technology · Large Cap',price:175.84,chg:-0.92,pct:-0.52,dir:'dn',open:176.76,high:177.40,low:175.10,base:160,vol:2.8,rating:'BUY',wh:207.05,wl:130.67},
  TSLA:{name:'Tesla Inc.',exch:'NASDAQ · EV / Auto · Large Cap',price:248.67,chg:-4.22,pct:-1.67,dir:'dn',open:252.89,high:253.44,low:246.80,base:220,vol:8.5,rating:'HOLD',wh:299.29,wl:138.80},
  META:{name:'Meta Platforms Inc.',exch:'NASDAQ · Social Media · Large Cap',price:563.40,chg:8.20,pct:1.48,dir:'up',open:555.20,high:566.80,low:554.00,base:480,vol:7.5,rating:'BUY',wh:638.40,wl:344.19},
  JPM:{name:'JPMorgan Chase & Co.',exch:'NYSE · Banking · Large Cap',price:236.80,chg:-1.40,pct:-0.59,dir:'dn',open:238.20,high:238.80,low:235.90,base:210,vol:3.0,rating:'BUY',wh:263.45,wl:172.52},
  AMZN:{name:'Amazon.com Inc.',exch:'NASDAQ · E-Commerce / Cloud',price:198.50,chg:2.10,pct:1.07,dir:'up',open:196.40,high:199.88,low:195.80,base:170,vol:4.5,rating:'STRONG BUY',wh:242.52,wl:151.61},
};

export const NEWS2 = [
  {src:'Bloomberg',time:'1m',h:'Apple Services hits all-time high — AI subscription tiers drive 18% YoY digital revenue growth in Q1 FY2025',s:'bull'},
  {src:'Reuters',time:'9m',h:'Supply chain checks: iPhone 17 Pro ramp tracking 12% above seasonal norms — analyst raises Q3 estimates',s:'bull'},
  {src:'WSJ',time:'23m',h:'DOJ widens App Store antitrust probe; structural remedy including mandatory third-party stores under active discussion',s:'bear'},
  {src:'FT',time:'45m',h:'Apple Intelligence enterprise adoption accelerates: 34% of Fortune 500 firms piloting Copilot integrations',s:'bull'},
  {src:'CNBC',time:'1h',h:'Apple announces $110B incremental buyback + dividend raise; management signals robust multi-year capital return capacity',s:'bull'},
  {src:"Barron's",time:'2h',h:'Apple Intelligence monetization debate: base case $8B incremental revenue by FY2026 — varies widely by analyst',s:'neut'},
  {src:'Bloomberg',time:'3h',h:'Apple-TSMC N3E wafer ramp 2 weeks ahead of schedule — gross margin expansion of 40–60bps flagged by supply chain checks',s:'bull'},
  {src:'NYT',time:'4h',h:'EU Digital Markets Act NFC mandate: Apple must open payments API — analysts estimate €800M annual revenue impact',s:'bear'},
  {src:'Forbes',time:'5h',h:'Vision Pro enterprise: 2,400+ corporate app submissions; average deployment deal size $180K across financial services',s:'neut'},
  {src:'SA',time:'6h',h:'China recovery thesis strengthening: Apple regains #1 premium tier position as Huawei Mate 70 competitive pressure eases',s:'bull'},
];
