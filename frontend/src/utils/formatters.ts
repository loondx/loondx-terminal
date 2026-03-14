
/**
 * Financial formatters for the LOONDX Terminal.
 * Supports Indian numbering system (Lakhs, Crores).
 */

export const formatPrice = (v: number | string | null): string => {
  if (v === null || v === undefined) return '--';
  const num = typeof v === 'string' ? parseFloat(v) : v;
  if (isNaN(num)) return '--';
  
  return num.toLocaleString('en-IN', {
    maximumFractionDigits: 2,
    minimumFractionDigits: 2
  });
};

export const formatCompact = (v: number | null): string => {
  if (v === null || v === undefined) return '--';
  if (v >= 10000000) return (v / 10000000).toFixed(2) + ' Cr';
  if (v >= 100000) return (v / 100000).toFixed(2) + ' L';
  if (v >= 1000) return (v / 1000).toFixed(2) + ' K';
  return v.toString();
};

export const formatPercent = (v: number | null): string => {
  if (v === null || v === undefined) return '--';
  return (v > 0 ? '+' : '') + v.toFixed(2) + '%';
};
