/** Formats accuracy as a rounded percent string, or an em dash when no shots were fired. */
export function formatAccuracy(shotsHit: number, shotsFired: number): string {
  if (shotsFired <= 0) return '—';
  return `${Math.round((100 * shotsHit) / shotsFired)}%`;
}
