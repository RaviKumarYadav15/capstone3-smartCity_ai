export function formatINR(val) {
  const n = Number(val) || 0;
  if (n >= 1e7) return `₹ ${(n / 1e7).toFixed(2)} Cr`;
  if (n >= 1e5) return `₹ ${(n / 1e5).toFixed(2)} Lakhs`;
  return `₹ ${n.toLocaleString('en-IN')}`;
}
export const formatDate = (v) => (v ? new Date(v).toLocaleDateString('en-GB') : '—');
export const formatDateTime = (v) => {
  if (!v) return '—';
  const d = new Date(v);
  if (Number.isNaN(d.getTime())) return '—';
  return d.toLocaleString('en-GB', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    hour12: true,
  });
};
export const statusLabel = (s) => (s === 'rejected' ? 'Rejected / Invalid' : String(s || '').replace(/_/g, ' '));

export const CATEGORIES = ['Pothole', 'Road Damage', 'Water Leakage', 'Street Lights', 'Garbage', 'Flooding', 'Infrastructure', 'other'];
export const EMOJI = { Pothole: '🕳️', 'Road Damage': '🛣️', 'Water Leakage': '💧', 'Street Lights': '💡', Garbage: '🗑️', Flooding: '🌊', Infrastructure: '🏗️', other: '⚠️' };
export const SEVERITY_COLOR = { critical: '#ff4757', high: '#ff8c42', medium: '#ffd166', low: '#06d6a0' };
export const STATUSES = ['reported', 'verified', 'under_review', 'in_progress', 'resolved', 'rejected'];
export const DISPUTE_CATEGORIES = ['Substandard Material Quality', 'Abandoned / Delayed Work', 'Ghost Project', 'Warranty Defect', 'Other'];
export const DEFAULT_CENTER = [11.3410, 77.7172];
