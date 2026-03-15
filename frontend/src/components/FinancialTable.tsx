import React from 'react';

interface FinancialTableProps {
  title: string;
  data: {
    headers: string[];
    rows: Record<string, (string | number)[]>;
  } | null;
}

export const FinancialTable: React.FC<FinancialTableProps> = ({ title, data }) => {
  if (!data) return (
    <div className="p-4 text-brand-t4 text-[10px] font-mono border border-brand-bd rounded bg-brand-bgc">
      {title} data not available for this ticker.
    </div>
  );

  return (
    <div className="flex flex-col bg-brand-bg border border-brand-bd rounded-[8px] overflow-hidden shadow-2xl relative">
      <div className="bg-brand-bgc p-[12px_20px] border-b border-brand-bd flex justify-between items-center shrink-0 z-30">
        <div className="flex items-center gap-2">
          <div className="w-1.5 h-1.5 rounded-full bg-brand-bl animate-pulse"></div>
          <span className="font-mono text-[12px] uppercase font-black text-brand-t1 tracking-tighter">{title}</span>
        </div>
        <span className="text-[10px] text-brand-t4 uppercase font-black tracking-widest bg-brand-bgc px-2 py-1 rounded border border-brand-bd shadow-inner">Values in Cr (INR)</span>
      </div>
      <div className="w-full overflow-x-auto scrollbar-custom">
        <table className="w-full text-left border-separate border-spacing-0 relative pb-10 min-w-[1000px]">
          <thead>
            <tr className="bg-brand-bgc sticky top-0 z-50">
              <th className="p-[14px_24px] text-[10px] text-brand-t4 uppercase font-black tracking-widest sticky left-0 top-0 bg-brand-bgc z-50 border-r border-brand-bd border-b border-brand-bd min-w-[220px] shadow-[4px_0_10px_rgba(0,0,0,0.5)]">
                PARTICULARS
              </th>
              {data.headers.map((h, i) => (
                <th key={i} className="p-[14px_20px] text-[11px] text-brand-t1 font-black font-mono text-right min-w-[120px] border-b border-brand-bd bg-brand-bgc border-r border-[rgba(255,255,255,0.03)] last:border-r-0 uppercase">
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-[rgba(255,255,255,0.03)]">
            {Object.entries(data.rows).map(([rowName, values], idx) => {
              const isProfitLine = rowName.toLowerCase().includes('net profit') || 
                                   rowName.toLowerCase().includes('operating profit');
              const isHeaderLine = rowName.toLowerCase().includes('revenue') || 
                                   rowName.toLowerCase().includes('sales');
              
              return (
                <tr key={idx} className={`hover:bg-[rgba(14,165,233,0.06)] transition-all group ${isProfitLine ? 'bg-[rgba(34,197,94,0.05)] border-t border-brand-gr/20' : ''} ${isHeaderLine ? 'bg-[rgba(14,165,233,0.03)]' : ''}`}>
                  <td className={`p-[16px_24px] text-[11px] font-bold sticky left-0 z-20 border-r border-brand-bd whitespace-nowrap transition-colors backdrop-blur-md shadow-[4px_0_8px_rgba(0,0,0,0.3)]
                    ${isProfitLine ? 'text-brand-gr text-[12px]' : isHeaderLine ? 'text-brand-bl' : 'text-brand-t2'}`} 
                    style={{ backgroundColor: '#0b1122' }}>
                    {rowName}
                  </td>
                  {values.map((v, i) => (
                    <td key={i} className={`p-[16px_20px] text-[12px] text-right font-mono border-r border-[rgba(255,255,255,0.02)] last:border-r-0 tracking-tight
                      ${typeof v === 'number' && v < 0 ? 'text-brand-re font-black' : 'text-brand-t1'}
                      ${isProfitLine ? 'font-black text-[13px] text-brand-gr' : ''}`}>
                      {typeof v === 'number' ? v.toLocaleString('en-IN') : v}
                    </td>
                  ))}
                </tr>
              );
            })}
            {/* Added extra padding row to ensure bottom-most rows aren't 'crushed' */}
            <tr className="h-12 pointer-events-none">
              <td className="sticky left-0 bg-[#0b1122] border-r border-brand-bd"></td>
              {data.headers.map((_, i) => <td key={i}></td>)}
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  );
};
