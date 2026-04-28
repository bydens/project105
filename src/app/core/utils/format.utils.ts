export function fmt(n: number | null | undefined, d = 1): string {
  if (n === null || n === undefined || !isFinite(n)) return '—';
  return n.toFixed(d);
}

export function fmtDelta(n: number, d = 1): string {
  if (!isFinite(n)) return '—';
  return (n > 0 ? '+' : '') + n.toFixed(d);
}
