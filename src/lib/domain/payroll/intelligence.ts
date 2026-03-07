export function variance(current: number, previous: number) {
  const delta = current - previous;
  const pct = previous === 0 ? (current === 0 ? 0 : 100) : (delta / previous) * 100;
  return { delta, pct };
}
