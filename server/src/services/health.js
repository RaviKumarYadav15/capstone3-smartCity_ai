/** Area health score 0-100 from *unresolved* reports only (resolved issues no longer penalise). */
export function healthScore({ openCritical = 0, openHigh = 0, openOther = 0 } = {}) {
  const raw = 100 - openCritical * 15 - openHigh * 8 - openOther * 2;
  return Math.max(0, Math.min(100, raw));
}
export const healthLabel = (s) => (s >= 80 ? 'Excellent' : s >= 60 ? 'Good' : s >= 40 ? 'Needs attention' : 'Critical');
