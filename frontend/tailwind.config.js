/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        brand: {
          bg: '#040710',
          bgp: '#070c18',
          bgc: '#0b1122',
          bge: '#0f1928',
          bgh: '#131f32',
          bd: '#172038',
          bdh: '#1e3050',
          bl: '#0ea5e9',
          bld: '#0369a1',
          blg: 'rgba(14,165,233,0.12)',
          tl: '#14b8a6',
          tld: '#0f766e',
          tlg: 'rgba(20,184,166,0.12)',
          or: '#f97316',
          ord: '#c2410c',
          org: 'rgba(249,115,22,0.12)',
          gr: '#22c55e',
          grg: 'rgba(34,197,94,0.12)',
          re: '#ef4444',
          reg: 'rgba(239,68,68,0.1)',
          ye: '#eab308',
          pu: '#8b5cf6',
          t1: '#e2e8f0',
          t2: '#94a3b8',
          t3: '#475569',
          t4: '#1e293b'
        }
      },
      fontFamily: {
        mono: ['IBM Plex Mono', 'monospace'],
        sans: ['IBM Plex Sans', 'sans-serif']
      },
      fontSize: {
        'xxs': '0.5rem',     // 8px
        'xs2': '0.5625rem',  // 9px
        'xs': '0.625rem',    // 10px
        'sm2': '0.6875rem',  // 11px
        'sm': '0.75rem',     // 12px
        'base': '0.875rem',  // 14px
      },
      backgroundImage: {
        'radial-gradient': 'radial-gradient(ellipse 80% 40% at 50% -5%, rgba(14,165,233,0.07) 0%, transparent 60%)',
        'grid-pattern': 'linear-gradient(rgba(255,255,255,0.016) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.016) 1px, transparent 1px)'
      },
      animation: {
        'pulse-fast': 'pulse 1.1s step-end infinite',
        'flash': 'flash 2s infinite',
        'ldp': 'ldp 0.8s infinite'
      },
      keyframes: {
        flash: {
          '0%, 100%': { opacity: 1 },
          '50%': { opacity: 0.3 }
        },
        ldp: {
          '0%, 100%': { opacity: 1 },
          '50%': { opacity: 0.25 }
        }
      }
    },
  },
  plugins: [],
}
