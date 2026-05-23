export function formatRatio(value: number, symbol: string = ''): string {
  if (!Number.isFinite(value) || value <= 0) return '—';
  if (value >= 1000) return `${symbol}${Math.round(value).toLocaleString()}`;
  if (value >= 100) return `${symbol}${value.toFixed(1)}`;
  return `${symbol}${value.toFixed(2)}`;
}
