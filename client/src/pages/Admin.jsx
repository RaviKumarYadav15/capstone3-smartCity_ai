import { useCallback, useEffect, useState } from 'react';
import { api, resolveImageUrl } from '../api.js';
import { useToast } from '../components/Toast.jsx';
import ReportAnalysisModal from '../components/ReportAnalysisModal.jsx';
import { EMOJI, STATUSES, formatDate, formatDateTime, statusLabel } from '../utils/format.js';

export default function Admin() {
  const toast = useToast();
  const [tab, setTab] = useState('reports');
  const [reports, setReports] = useState([]);
  const [disputes, setDisputes] = useState([]);
  const [users, setUsers] = useState([]);
  const [selectedReport, setSelectedReport] = useState(null);
  const [rejectingReport, setRejectingReport] = useState(null);
  const [rejectionCategory, setRejectionCategory] = useState('fake_prank');
  const [rejectionReason, setRejectionReason] = useState('');
  const [userFilter, setUserFilter] = useState('flagged'); // 'flagged' | 'all'

  const load = useCallback(async () => {
    try {
      const [r, d, u] = await Promise.all([
        api.get('/reports'),
        api.get('/disputes'),
        api.get('/users').catch(() => ({ users: [] })),
      ]);
      setReports(r.reports || []);
      setDisputes(d.disputes || []);
      setUsers(u.users || []);
    } catch (e) {
      toast(e.message);
    }
  }, [toast]);

  useEffect(() => {
    load();
  }, [load]);

  const setStatus = async (id, status, extra = {}) => {
    let resolutionNotes = extra.resolutionNotes;
    if (status === 'resolved' && !resolutionNotes) {
      const input = window.prompt('Optional: Enter resolution summary / repair verification notes:');
      if (input !== null && input.trim()) resolutionNotes = input.trim();
    }
    try {
      await api.patch(`/reports/${id}/status`, {
        status,
        resolutionNotes,
        rejectionCategory: extra.rejectionCategory,
        rejectionReason: extra.rejectionReason,
      });
      load();
      toast('Status updated');
    } catch (e) {
      toast(e.message);
    }
  };

  const handleStatusChange = (report, newStatus) => {
    if (newStatus === 'rejected') {
      setRejectingReport(report);
      setRejectionCategory('fake_prank');
      setRejectionReason('');
      return;
    }
    setStatus(report.id, newStatus);
  };

  const confirmRejection = async () => {
    if (!rejectingReport) return;
    await setStatus(rejectingReport.id, 'rejected', {
      rejectionCategory,
      rejectionReason: rejectionReason.trim() || 'Report marked as invalid/false by authority.',
    });
    setRejectingReport(null);
  };

  const remove = async (id) => {
    if (!window.confirm('Delete this report permanently?')) return;
    try {
      await api.del(`/reports/${id}`);
      load();
      toast('Report deleted');
    } catch (e) {
      toast(e.message);
    }
  };

  const setDispute = async (id, status) => {
    try {
      await api.patch(`/disputes/${id}`, { status });
      load();
      toast('Moderation status updated');
    } catch (e) {
      toast(e.message);
    }
  };

  const resetStrikes = async (userId) => {
    if (!window.confirm('Reset strikes for this citizen back to 0 and restore active standing?')) return;
    try {
      await api.patch(`/users/${userId}/reset-strikes`);
      load();
      toast('Citizen strikes reset to 0');
    } catch (e) {
      toast(e.message);
    }
  };

  const unblockUser = async (userId) => {
    if (!window.confirm('Unblock and restore this citizen account?')) return;
    try {
      await api.patch(`/users/${userId}/unblock`);
      load();
      toast('Citizen account unblocked');
    } catch (e) {
      toast(e.message);
    }
  };

  const blockUser = async (userId) => {
    const reason = window.prompt('Enter reason for manually blocking this citizen account:');
    if (!reason || !reason.trim()) return;
    try {
      await api.patch(`/users/${userId}/block`, { reason: reason.trim() });
      load();
      toast('Citizen account blocked');
    } catch (e) {
      toast(e.message);
    }
  };

  const open = reports.filter((r) => r.status !== 'resolved' && r.status !== 'rejected').length;
  const pendingDisputes = disputes.filter((d) => d.status === 'open').length;
  const sanctionedUsers = users.filter((u) => u.strikes > 0 || u.isBlocked || u.isRestricted);
  const displayedUsers = userFilter === 'flagged' ? sanctionedUsers : users;

  return (
    <section className="bg-white border border-slate-200/90 rounded-3xl p-6 sm:p-8 shadow-sm">
      <div className="border-b border-slate-100 pb-5 mb-6">
        <h1 className="text-2xl sm:text-3xl font-black text-slate-900 m-0">Moderation & Redressal Console</h1>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3.5 mb-6">
        <div className="p-4 sm:p-5 rounded-2xl border border-slate-200 bg-slate-50 text-center">
          <div className="num text-2xl font-black text-slate-900">{reports.length}</div>
          <div className="text-xs font-semibold text-slate-500 uppercase tracking-wider mt-1">Total Reports</div>
        </div>
        <div className="p-4 sm:p-5 rounded-2xl border border-red-200 bg-red-50/70 text-center">
          <div className="num text-2xl font-black text-red-600">{open}</div>
          <div className="text-xs font-semibold text-red-700 uppercase tracking-wider mt-1">Unresolved Issues</div>
        </div>
        <div className="p-4 sm:p-5 rounded-2xl border border-emerald-200 bg-emerald-50/70 text-center">
          <div className="num text-2xl font-black text-emerald-600">
            {reports.filter((r) => r.status === 'resolved').length}
          </div>
          <div className="text-xs font-semibold text-emerald-700 uppercase tracking-wider mt-1">Resolved Issues</div>
        </div>
        <div className="p-4 sm:p-5 rounded-2xl border border-amber-200 bg-amber-50/70 text-center">
          <div className="num text-2xl font-black text-amber-600">{sanctionedUsers.length}</div>
          <div className="text-xs font-semibold text-amber-700 uppercase tracking-wider mt-1">Sanctioned Citizens</div>
        </div>
      </div>

      <div className="pills flex flex-wrap gap-2 mb-6 border-b border-slate-100 pb-4">
        <button
          className={`pill text-xs font-semibold py-2 px-5 rounded-full border transition-all cursor-pointer ${
            tab === 'reports' ? 'bg-slate-900 text-white border-slate-900 shadow-xs' : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
          }`}
          onClick={() => setTab('reports')}
        >
          Civic Incident Reports ({reports.length})
        </button>
        <button
          className={`pill text-xs font-semibold py-2 px-5 rounded-full border transition-all cursor-pointer ${
            tab === 'disputes' ? 'bg-slate-900 text-white border-slate-900 shadow-xs' : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
          }`}
          onClick={() => setTab('disputes')}
        >
          Tender Defect Claims ({disputes.length})
        </button>
        <button
          className={`pill text-xs font-semibold py-2 px-5 rounded-full border transition-all cursor-pointer ${
            tab === 'users' ? 'bg-slate-900 text-white border-slate-900 shadow-xs' : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
          }`}
          onClick={() => setTab('users')}
        >
          Citizen Moderation & Strikes ({sanctionedUsers.length})
        </button>
      </div>

      {tab === 'reports' ? (
        reports.length === 0 ? (
          <p className="text-slate-500 text-sm py-8 text-center">No civic reports filed</p>
        ) : (
          <div className="flex flex-col gap-3">
            {reports.map((r) => (
              <div
                className="p-4 rounded-2xl border border-slate-200 bg-white hover:bg-slate-50/80 transition-colors flex flex-wrap items-center justify-between gap-4"
                key={r.id}
              >
                <div className="flex items-start gap-3.5 flex-1 min-w-[280px]">
                  {/* Photo Evidence Thumbnail or Placeholder */}
                  {r.imageUrl ? (
                    <a
                      href={resolveImageUrl(r.imageUrl)}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="group relative block w-16 h-16 sm:w-20 sm:h-20 rounded-2xl overflow-hidden border border-slate-200 shrink-0 shadow-2xs hover:shadow-md transition-all cursor-pointer bg-slate-100"
                      title="Click to view full photo evidence in new tab"
                    >
                      <img
                        src={resolveImageUrl(r.imageUrl)}
                        alt={r.category}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-200"
                        loading="lazy"
                      />
                      <span className="absolute bottom-1 right-1 bg-black/60 backdrop-blur-xs text-white text-[9px] font-bold px-1.5 py-0.5 rounded-md flex items-center gap-0.5">
                        📷
                      </span>
                    </a>
                  ) : (
                    <div
                      className="w-16 h-16 sm:w-20 sm:h-20 rounded-2xl border border-slate-200 bg-slate-50 flex items-center justify-center text-2xl sm:text-3xl shrink-0 select-none"
                      title="No photo attached"
                    >
                      {EMOJI[r.category] || '⚠️'}
                    </div>
                  )}

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1.5 flex-wrap">
                      <span className="font-bold text-slate-900 text-sm">
                        {EMOJI[r.category]} {r.category}
                      </span>
                      <span className={`tag sev-${r.severity} text-[10px] font-bold uppercase px-2.5 py-0.5 rounded-full`}>
                        {r.severity}
                      </span>
                      <span className="text-xs text-slate-400">•</span>
                      <span className="text-xs font-semibold text-slate-600 truncate">{r.department}</span>
                    </div>
                    <p className="text-xs text-slate-700 m-0 mb-1 leading-relaxed">{r.description}</p>
                    <p className="text-[11px] text-slate-500 m-0">
                      Reported by {r.userName} · {formatDateTime(r.createdAt)} · 📍 {r.address?.formatted || [r.address?.area, r.address?.city].filter(Boolean).join(', ') || `${r.lat.toFixed(4)}, ${r.lng.toFixed(4)}`}
                      {r.resolvedAt && (
                        <span className="text-emerald-700 font-semibold"> · Resolved: {formatDateTime(r.resolvedAt)}</span>
                      )}
                    </p>
                    {r.resolutionNotes && (
                      <div className="mt-1.5 text-[11px] bg-emerald-50 text-emerald-800 border border-emerald-200 rounded-lg p-1.5 leading-snug">
                        <strong>Resolution notes:</strong> {r.resolutionNotes}
                      </div>
                    )}
                    {r.status === 'rejected' && (
                      <div className="mt-1.5 text-[11px] bg-red-50 text-red-800 border border-red-200 rounded-lg p-1.5 leading-snug">
                        <strong>Rejected ({r.rejectionCategory ? r.rejectionCategory.replace(/_/g, ' ') : 'Invalid'}):</strong> {r.rejectionReason}
                      </div>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  <button
                    className="text-xs font-semibold py-1.5 px-3 rounded-full bg-blue-50 hover:bg-blue-100 text-blue-700 border border-blue-200 transition-colors cursor-pointer"
                    onClick={() => setSelectedReport(r)}
                    title="View incident details and remediation plan"
                  >
                    <span>🔍</span> View in Details
                  </button>
                  <select
                    value={r.status}
                    onChange={(e) => handleStatusChange(r, e.target.value)}
                    aria-label="Report Status"
                    className={`text-xs font-semibold py-1.5 px-3 rounded-full border w-auto cursor-pointer ${
                      r.status === 'rejected'
                        ? 'border-red-300 bg-red-50 text-red-800'
                        : 'border-slate-200 bg-slate-50 text-slate-800'
                    }`}
                  >
                    {STATUSES.map((s) => (
                      <option key={s} value={s}>
                        {statusLabel(s)}
                      </option>
                    ))}
                  </select>
                  <button
                    className="text-xs font-semibold py-1.5 px-3.5 rounded-full bg-red-50 hover:bg-red-100 text-red-700 border border-red-200 transition-colors cursor-pointer"
                    onClick={() => remove(r.id)}
                    title="Permanently remove spurious report"
                  >
                    Delete
                  </button>
                </div>
              </div>
            ))}
          </div>
        )
      ) : tab === 'disputes' ? (
        disputes.length === 0 ? (
          <p className="text-slate-500 text-sm py-8 text-center">No citizen claims on tenders</p>
        ) : (
          <div className="flex flex-col gap-3">
            {disputes.map((d) => (
              <div
                className="p-4 rounded-2xl border border-slate-200 bg-white hover:bg-slate-50/80 transition-colors flex flex-wrap items-center justify-between gap-4"
                key={d.id}
              >
                <div className="flex-1 min-w-[280px]">
                  <div className="flex items-center gap-2 mb-1.5">
                    <span className="font-mono text-xs font-bold text-slate-900 px-2.5 py-0.5 rounded-full bg-slate-100 border border-slate-200">
                      {d.tenderId}
                    </span>
                    <span className="font-bold text-xs px-2.5 py-0.5 rounded-full bg-amber-50 text-amber-800 border border-amber-200">
                      {d.category}
                    </span>
                  </div>
                  <p className="text-xs text-slate-700 m-0 mb-1 leading-relaxed">{d.description}</p>
                  <p className="text-[11px] text-slate-500 m-0">
                    Filed by {d.userName} · {d.supportCount} citizen supporter(s) · {formatDateTime(d.createdAt)}
                  </p>
                </div>

                <div className="flex items-center gap-2">
                  <span className="text-xs font-semibold text-slate-500">Moderation:</span>
                  <select
                    value={d.status}
                    onChange={(e) => setDispute(d.id, e.target.value)}
                    aria-label="Moderation Status"
                    className="text-xs font-semibold py-1.5 px-3 rounded-full border border-slate-200 bg-slate-50 w-auto"
                  >
                    <option value="open">Open (Publicly Flagged)</option>
                    <option value="reviewed">Reviewed (Audit Initiated)</option>
                    <option value="dismissed">Dismissed (Baseless)</option>
                  </select>
                </div>
              </div>
            ))}
          </div>
        )
      ) : (
        /* Citizen Moderation & Strikes Tab */
        <div className="flex flex-col gap-4">
          <div className="flex items-center justify-between gap-3 flex-wrap">
            <p className="text-xs text-slate-500 m-0">
              Policy: <strong>Strike 1</strong> = Warning · <strong>Strike 2</strong> = 7-Day Temporary Cooldown · <strong>Strike 3</strong> = Indefinite Ban
            </p>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setUserFilter('flagged')}
                className={`text-xs font-semibold py-1.5 px-3.5 rounded-full border transition cursor-pointer ${
                  userFilter === 'flagged' ? 'bg-slate-900 text-white border-slate-900' : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
                }`}
              >
                Sanctioned Only ({sanctionedUsers.length})
              </button>
              <button
                type="button"
                onClick={() => setUserFilter('all')}
                className={`text-xs font-semibold py-1.5 px-3.5 rounded-full border transition cursor-pointer ${
                  userFilter === 'all' ? 'bg-slate-900 text-white border-slate-900' : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
                }`}
              >
                All Citizens ({users.length})
              </button>
            </div>
          </div>

          {displayedUsers.length === 0 ? (
            <p className="text-slate-500 text-sm py-8 text-center">
              {userFilter === 'flagged' ? 'No citizens have received strikes or sanctions.' : 'No registered citizens found.'}
            </p>
          ) : (
            <div className="flex flex-col gap-3">
              {displayedUsers.map((u) => (
                <div
                  key={u.id}
                  className="p-4 rounded-2xl border border-slate-200 bg-white hover:bg-slate-50/80 transition-colors flex flex-wrap items-start justify-between gap-4"
                >
                  <div className="flex-1 min-w-[260px]">
                    <div className="flex items-center gap-2.5 mb-1.5 flex-wrap">
                      <span className="font-bold text-slate-900 text-sm">{u.name}</span>
                      <span className="text-xs text-slate-400 truncate">({u.email})</span>
                      <span className="text-[10px] uppercase font-bold px-2 py-0.5 rounded-full bg-slate-100 text-slate-600 border border-slate-200">
                        {u.role}
                      </span>
                      {u.isBlocked || u.status === 'banned' ? (
                        <span className="text-[10px] font-bold px-2.5 py-0.5 rounded-full bg-red-100 text-red-800 border border-red-300">
                          🔴 Indefinitely Restricted
                        </span>
                      ) : u.status === 'suspended' ? (
                        <span className="text-[10px] font-bold px-2.5 py-0.5 rounded-full bg-amber-100 text-amber-900 border border-amber-300">
                          🟠 7-Day Cooldown
                        </span>
                      ) : u.status === 'warned' ? (
                        <span className="text-[10px] font-bold px-2.5 py-0.5 rounded-full bg-yellow-100 text-yellow-900 border border-yellow-300">
                          🟡 1 Warning Strike
                        </span>
                      ) : (
                        <span className="text-[10px] font-bold px-2.5 py-0.5 rounded-full bg-emerald-50 text-emerald-800 border border-emerald-200">
                          🟢 Good Standing
                        </span>
                      )}
                    </div>

                    <div className="text-xs text-slate-600 space-y-1">
                      <div>
                        Strikes accumulated: <strong className="text-slate-800 font-mono font-bold">{u.strikes || 0} / 3</strong>
                      </div>
                      {u.suspendedUntil && u.status === 'suspended' && (
                        <div className="text-amber-800 text-[11px] font-medium">
                          Cooldown expires: {formatDateTime(u.suspendedUntil)}
                        </div>
                      )}
                      {u.restrictionReason && (
                        <div className="text-red-700 text-[11px] italic">
                          Notice: {u.restrictionReason}
                        </div>
                      )}
                    </div>

                    {/* Strike History Logs */}
                    {u.strikeHistory && u.strikeHistory.length > 0 && (
                      <div className="mt-3 bg-slate-50 border border-slate-200/90 rounded-xl p-2.5 space-y-1.5">
                        <div className="text-[11px] font-bold text-slate-700 uppercase tracking-wider">
                          Strike Log History:
                        </div>
                        {u.strikeHistory.map((s, idx) => (
                          <div key={idx} className="bg-white p-2 rounded-lg border border-slate-200 text-[11px]">
                            <div className="flex items-center justify-between text-slate-800 font-semibold mb-0.5">
                              <span>Strike {idx + 1}: {s.reason.replace(/_/g, ' ')}</span>
                              <span className="text-[10px] text-slate-400">{formatDate(s.createdAt)}</span>
                            </div>
                            {s.note && <div className="text-slate-600 text-[11px]">{s.note}</div>}
                            {s.reportTitle && (
                              <div className="text-[10px] text-slate-400 truncate">
                                Report: {s.reportTitle}
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  <div className="flex items-center gap-2 shrink-0 flex-wrap">
                    {u.strikes > 0 && (
                      <button
                        type="button"
                        onClick={() => resetStrikes(u.id)}
                        className="text-xs font-semibold py-1.5 px-3 rounded-full bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-300 transition cursor-pointer"
                        title="Clear all accumulated strikes back to 0"
                      >
                        Reset Strikes
                      </button>
                    )}
                    {u.isBlocked || u.status === 'banned' || u.status === 'suspended' ? (
                      <button
                        type="button"
                        onClick={() => unblockUser(u.id)}
                        className="text-xs font-semibold py-1.5 px-3.5 rounded-full bg-blue-50 hover:bg-blue-100 text-blue-800 border border-blue-300 transition cursor-pointer"
                        title="Remove sanctions and restore active standing"
                      >
                        Unban / Restore
                      </button>
                    ) : (
                      <button
                        type="button"
                        onClick={() => blockUser(u.id)}
                        className="text-xs font-semibold py-1.5 px-3.5 rounded-full bg-red-50 hover:bg-red-100 text-red-700 border border-red-200 transition cursor-pointer"
                        title="Manually ban this account from reporting and voting"
                      >
                        Manual Block
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Rejection Modal for Authorities/Admins */}
      {rejectingReport && (
        <div className="fixed inset-0 z-[1200] bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-slate-200 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center gap-3 mb-4">
              <span className="w-10 h-10 rounded-2xl bg-red-100 text-red-600 flex items-center justify-center text-xl shrink-0">
                ⚠️
              </span>
              <div>
                <h3 className="text-base font-bold text-slate-900 m-0">Reject Civic Report</h3>
                <p className="text-xs text-slate-500 m-0">Verify invalidity and apply standing policy</p>
              </div>
            </div>

            <div className="bg-slate-50 rounded-2xl p-3 border border-slate-200 mb-4 text-xs text-slate-700">
              <p className="font-bold text-slate-800 m-0 mb-1">
                {rejectingReport.category} · {rejectingReport.userName}
              </p>
              <p className="text-slate-600 m-0 truncate">{rejectingReport.description}</p>
            </div>

            <div className="space-y-3.5 mb-5">
              <div>
                <label className="text-xs font-bold text-slate-800 block mb-1.5">
                  Rejection Category:
                </label>
                <select
                  value={rejectionCategory}
                  onChange={(e) => setRejectionCategory(e.target.value)}
                  className="w-full text-xs font-semibold py-2 px-3 rounded-xl border border-slate-300 bg-white text-slate-800 focus:outline-none focus:ring-2 focus:ring-red-500/20"
                >
                  <option value="fake_prank">False Incident / Prank (Applies 1 Strike)</option>
                  <option value="spam">Spam or Inappropriate Content (Applies 1 Strike)</option>
                  <option value="not_civic">Not a Public Civic Infrastructure Hazard (Applies 1 Strike)</option>
                  <option value="duplicate">Duplicate of Open Report (No Strike Applied)</option>
                  <option value="other">Physical Verification Failure (Applies 1 Strike)</option>
                </select>
              </div>

              <div>
                <label className="text-xs font-bold text-slate-800 block mb-1.5">
                  Explanation / Verification Note:
                </label>
                <textarea
                  rows={3}
                  value={rejectionReason}
                  onChange={(e) => setRejectionReason(e.target.value)}
                  placeholder="e.g. Field inspection confirmed no pothole exists at the reported coordinates."
                  className="w-full text-xs p-3 rounded-xl border border-slate-300 bg-white text-slate-800 focus:outline-none focus:ring-2 focus:ring-red-500/20"
                />
              </div>

              <div className={`p-3 rounded-xl text-[11px] leading-relaxed border ${
                rejectionCategory === 'duplicate'
                  ? 'bg-blue-50 text-blue-800 border-blue-200'
                  : 'bg-amber-50 text-amber-900 border-amber-200'
              }`}>
                {rejectionCategory === 'duplicate' ? (
                  <span>ℹ️ <strong>Duplicate Policy:</strong> No strike will be applied against the reporting citizen.</span>
                ) : (
                  <span>⚠️ <strong>Strike Policy:</strong> 1 strike will be recorded against the author. Upon 2 strikes, account enters 7-day cooldown; at 3 strikes, permanent ban.</span>
                )}
              </div>
            </div>

            <div className="flex gap-2.5 justify-end">
              <button
                type="button"
                onClick={() => setRejectingReport(null)}
                className="text-xs font-semibold py-2 px-4 rounded-full border border-slate-300 text-slate-700 hover:bg-slate-50 transition cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={confirmRejection}
                className="text-xs font-bold py-2 px-5 rounded-full bg-red-600 hover:bg-red-700 text-white transition shadow-xs cursor-pointer"
              >
                Confirm Rejection
              </button>
            </div>
          </div>
        </div>
      )}

      {selectedReport && (
        <ReportAnalysisModal
          report={selectedReport}
          onClose={() => setSelectedReport(null)}
          onUpdate={(updated) => {
            setSelectedReport(updated);
            setReports((list) => list.map((item) => (item.id === updated.id ? updated : item)));
          }}
        />
      )}
    </section>
  );
}
