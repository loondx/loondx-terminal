import React from 'react';

interface ToastProps {
  message: string;
}

export const Toast: React.FC<ToastProps> = ({ message }) => (
  <div className={`fixed bottom-[22px] left-1/2 -translate-x-1/2 bg-[#0f1928] border border-[#1e3050] rounded-[4px] px-[16px] py-[8px] font-mono text-[11px] text-[#e2e8f0] transition-all duration-300 pointer-events-none z-[1000] shadow-[0_8px_32px_rgba(0,0,0,.5)] whitespace-nowrap ${message ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-[16px]'}`}>
    {message}
  </div>
);
