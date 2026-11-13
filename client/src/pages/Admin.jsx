import { useCallback, useEffect, useState } from 'react';
import { api } from '../api.js';
import { useToast } from '../components/Toast.jsx';
import ReportAnalysisModal from '../components/ReportAnalysisModal.jsx';
import { EMOJI, STATUSES, formatDate, statusLabel } from '../utils/format.js';

export default function Admin() {
  const toast = useToast();
  const [tab, setTab] = useState('reports');
  const [reports, setReports] = useState([]);
  const [disputes, setDisputes] = useState([]);
  const [selectedReport, setSelectedReport] = useState(null);

  const load = useCallback(async () => {
    try {
      const [r, d] = await Promise.all([api.get('/reports'), api.get('/disputes')]);
      setReports(r.reports);
      setDisputes(d.disputes);
    } catch (e) {
      toast(e.message);
    }
  }, [toast]);

  useEffect(() => {
    load();
  }, [load]);

  const setStatus = async (id, status) => {
    try {
      await api.patch(`/reports/${id}/status`, { status });
      load();
      toast('Status updated');
    } catch (e) {
      toast(e.message);
    }
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

  const open = reports.filter((r) => r.status !== 'resolved').length;
  const pendingDisputes = disputes.filter((d) => d.status === 'open').length;

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
          <div className="num text-2xl font-black text-emerald-600">{reports.length - open}</div>
          <div className="text-xs font-semibold text-emerald-700 uppercase tracking-wider mt-1">Resolved Issues</div>
        </div>
        <div className="p-4 sm:p-5 rounded-2xl border border-amber-200 bg-amber-50/70 text-center">
          <div className="num text-2xl font-black text-amber-600">{pendingDisputes}</div>
          <div className="text-xs font-semibold text-amber-700 uppercase tracking-wider mt-1">Tender Claims</div>
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
                <div className="flex-1 min-w-[280px]">
                  <div className="flex items-center gap-2 mb-1.5">
                    <span className="font-bold text-slate-900 text-sm">
                      {EMOJI[r.category]} {r.category}
                    </span>
                    <span className={`tag sev-${r.severity} text-[10px] font-bold uppercase px-2.5 py-0.5 rounded-full`}>
                      {r.severity}
                    </span>
                    <span className="text-xs text-slate-400">•</span>
                    <span className="text-xs font-semibold text-slate-600">{r.department}</span>
                  </div>
                  <p className="text-xs text-slate-700 m-0 mb-1 leading-relaxed">{r.description}</p>
                  <p className="text-[11px] text-slate-400 m-0">
                    Reported by {r.userName} · {formatDate(r.createdAt)} · 📍 {r.lat.toFixed(4)}, {r.lng.toFixed(4)}
                  </p>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    className="text-xs font-semibold py-1.5 px-3 rounded-full bg-blue-50 hover:bg-blue-100 text-blue-700 border border-blue-200 transition-colors cursor-pointer"
                    onClick={() => setSelectedReport(r)}
                    title="View incident details and remediation plan"
                  >
                    <span>🔍</span> View in Details
                  </button>
                  <select
                    value={r.status}
                    onChange={(e) => setStatus(r.id, e.target.value)}
                    aria-label="Report Status"
                    className="text-xs font-semibold py-1.5 px-3 rounded-full border border-slate-200 bg-slate-50 w-auto"
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
      ) : disputes.length === 0 ? (
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
                <p className="text-[11px] text-slate-400 m-0">
                  Filed by {d.userName} · {d.supportCount} citizen supporter(s) · {formatDate(d.createdAt)}
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
