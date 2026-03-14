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
    <div className="flex flex-col bg-brand-bgp border border-brand-bd rounded overflow-hidden">
      <div className="bg-brand-bgc p-[8px_14px] border-b border-brand-bd flex justify-between items-center">
        <span className="font-mono text-[10px] uppercase font-bold text-brand-t1">{title}</span>
        <span className="text-[8px] text-brand-t4 uppercase font-mono">Consolidated (Cr)</span>
      </div>
      <div className="overflow-x-auto scrollbar-none">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="border-b border-brand-bd bg-[rgba(255,255,255,0.02)]">
              <th className="p-[8px_14px] text-[9px] text-brand-t4 uppercase font-mono sticky left-0 bg-brand-bgp z-10 border-r border-brand-bd">Period</th>
              {data.headers.map((h, i) => (
                <th key={i} className="p-[8px_14px] text-[9px] text-brand-t1 font-mono text-right min-w-[80px]">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {Object.entries(data.rows).map(([rowName, values], idx) => (
              <tr key={idx} className="border-b border-[rgba(255,255,255,0.03)] hover:bg-[rgba(14,165,233,0.03)] transition-colors group">
                <td className="p-[8px_14px] text-[10px] text-brand-t2 font-medium sticky left-0 bg-brand-bgp group-hover:bg-[#111827] z-10 border-r border-brand-bd whitespace-nowrap">
                  {rowName}
                </td>
                {values.map((v, i) => (
                  <td key={i} className="p-[8px_14px] text-[10px] text-right font-mono text-brand-t1">
                    {typeof v === 'number' ? v.toLocaleString('en-IN') : v}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};
