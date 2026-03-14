import React from 'react';

type DotColor = 'bl' | 'or' | 'gr' | 'tl' | 'pu' | 're' | 'ye';

interface PanelHeaderProps {
  label: string;
  dot: DotColor;
  right?: React.ReactNode;
}

const DOT_CLASS: Record<DotColor, string> = {
  bl: 'bg-brand-bl shadow-[0_0_5px_var(--bl)]',
  or: 'bg-brand-or shadow-[0_0_5px_var(--or)]',
  gr: 'bg-brand-gr shadow-[0_0_5px_var(--gr)]',
  tl: 'bg-brand-tl shadow-[0_0_5px_var(--tl)]',
  pu: 'bg-brand-pu shadow-[0_0_5px_var(--pu)]',
  re: 'bg-brand-re shadow-[0_0_5px_var(--re)]',
  ye: 'bg-brand-ye shadow-[0_0_5px_var(--ye)]',
};

export const PanelHeader: React.FC<PanelHeaderProps> = ({ label, dot, right }) => (
  <div className="flex items-center justify-between py-[6px] px-[11px] border-b border-brand-bd shrink-0">
    <div className="font-mono text-[9px] font-semibold tracking-[.15em] uppercase text-brand-t2 flex items-center gap-[5px]">
      <span className={`w-[5px] h-[5px] rounded-full shrink-0 ${DOT_CLASS[dot]}`}></span>
      {label}
    </div>
    {right && <div>{right}</div>}
  </div>
);
