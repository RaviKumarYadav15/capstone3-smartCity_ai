import { useCallback, useEffect, useState } from 'react';
import { api } from '../api.js';
import ReportsMap, { LAYERS } from '../components/ReportsMap.jsx';
import ReportCard from '../components/ReportCard.jsx';

const FILTERS = [
  ['all', 'All Reports'],
  ['critical', 'Critical Hazards'],
  ['high', 'High Priority'],
  ['new', 'Newly Reported'],
  ['resolved', 'Resolved'],
];

export default function MapPage() {
  const [reports, setReports] = useState([]);
  const [stats, setStats] = useState(null);
  const [prediction, setPrediction] = useState(null);
  const [filter, setFilter] = useState('all');
  const [layer, setLayer] = useState('osm');
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    try {
      const [r, s] = await Promise.all([api.get('/reports'), api.get('/stats')]);
      setReports(r.reports);
      setStats(s);
      setError('');
    } catch (e) {
      setError(e.message);
    }
  }, []);

  useEffect(() => {
    load();
    api.get('/predictions').then((d) => setPrediction(d.prediction)).catch(() => {});
    const t = setInterval(load, 30000);
    return () => clearInterval(t);
  }, [load]);

  const visible = reports.filter(
    (r) =>
      filter === 'all' ||
      r.severity === filter ||
      r.status === filter ||
      (filter === 'new' && r.status === 'reported')
  );

  const counts = {
    all: reports.length,
    critical: reports.filter((r) => r.severity === 'critical').length,
    high: reports.filter((r) => r.severity === 'high').length,
    new: reports.filter((r) => r.status === 'reported').length,
    resolved: reports.filter((r) => r.status === 'resolved').length,
  };

  const replace = (updated) => setReports((list) => list.map((r) => (r.id === updated.id ? updated : r)));

  return (
    <>
      {/* Top 2-Column Section: Map on Left, Two Status Rows on Right */}
      <section className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch">
        {/* Left Column: Live City Incident Map */}
        <div className="lg:col-span-7 xl:col-span-8 bg-white border border-slate-200/90 rounded-3xl p-5 sm:p-6 shadow-sm flex flex-col justify-between">
          <div className="flex flex-wrap items-center justify-between gap-4 mb-3">
            <div>
              <h1 className="text-xl sm:text-2xl font-black text-slate-900 m-0">Live City Incident Map</h1>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-slate-600 uppercase tracking-wider">Map Style:</span>
              <select
                value={layer}
                onChange={(e) => setLayer(e.target.value)}
                className="text-xs font-semibold py-1.5 px-3 rounded-full border border-slate-200 bg-slate-50 cursor-pointer"
              >
                {Object.entries(LAYERS).map(([k, v]) => (
                  <option key={k} value={k}>{v.name}</option>
                ))}
              </select>
            </div>
          </div>

          {error && <p className="error p-3 rounded-xl bg-red-50 border border-red-200 my-2 text-xs">{error}</p>}
          
          <div className="rounded-2xl overflow-hidden border border-slate-200 flex-1 min-h-[380px] sm:min-h-[440px]">
            <ReportsMap reports={visible} layer={layer} />
          </div>

          <div className="flex items-center justify-between text-xs text-slate-500 mt-3 px-1">
            <span>Click any pin to view details and status</span>
            <span className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-emerald-500"></span> Live feed (auto-updates every 30s)
            </span>
          </div>
        </div>

        {/* Right Column: Two Rows Showing Live Status of the City */}
        <div className="lg:col-span-5 xl:col-span-4 flex flex-col gap-6 justify-between">
          {/* Row 1: Area Health Index */}
          {stats && (
            <div className="bg-white border border-slate-200/90 rounded-3xl p-5 sm:p-6 shadow-sm flex-1 flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between mb-2">
                  <h2 className="text-base sm:text-lg font-bold text-slate-900 m-0">Area Health Index</h2>
                  <span className={`px-2.5 py-0.5 rounded-full text-xs font-bold uppercase tracking-wider ${
                    stats.health.score >= 80 ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' :
                    stats.health.score >= 60 ? 'bg-amber-50 text-amber-700 border border-amber-200' :
                    'bg-red-50 text-red-700 border border-red-200'
                  }`}>
                    {stats.health.label}
                  </span>
                </div>
                <div className="health flex items-baseline gap-2 mb-2">
                  <span className="text-3xl font-black text-slate-900">{stats.health.score}</span>
                  <span className="text-xs font-semibold text-slate-500">/ 100</span>
                </div>
                <div className="w-full bg-slate-100 rounded-full h-3 overflow-hidden border border-slate-200 my-2">
                  <div
                    className={`h-full rounded-full transition-all duration-500 ${
                      stats.health.score >= 80 ? 'bg-emerald-500' :
                      stats.health.score >= 60 ? 'bg-amber-500' : 'bg-red-500'
                    }`}
                    style={{ width: `${stats.health.score}%` }}
                  />
                </div>
                <p className="text-xs text-slate-500 mt-2 leading-relaxed">
                  Live score determined by unresolved critical and high severity hazards across the city grid
                </p>
              </div>

              <div className="pt-3 border-t border-slate-100 mt-3 flex items-center justify-between text-xs text-slate-500">
                <span>Active reports: <strong className="text-slate-800">{counts.all}</strong></span>
                <span>Critical hazards: <strong className="text-red-600">{counts.critical}</strong></span>
              </div>
            </div>
          )}

          {/* Row 2: AI Municipal Outlook */}
          {prediction && (
            <div className="bg-white border border-slate-200/90 rounded-3xl p-5 sm:p-6 shadow-sm flex-1 flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between mb-2">
                  <h2 className="text-base sm:text-lg font-bold text-slate-900 m-0 flex items-center gap-2">
                    <span>🧠</span> AI Municipal Outlook
                  </h2>
                  <span className="text-xs font-bold px-2.5 py-0.5 rounded-full bg-slate-100 border border-slate-200 text-slate-600 uppercase">
                    Trend: {prediction.trend}
                  </span>
                </div>
                <p className="text-xs sm:text-sm text-slate-700 leading-relaxed font-medium m-0 mt-2">
                  {prediction.prediction}
                </p>
              </div>
              <div className="mt-3 pt-3 border-t border-slate-100 text-xs text-slate-600 flex flex-col gap-1">
                <div><strong>Hotspot:</strong> {prediction.hotspot} · <strong>Urgent:</strong> {prediction.urgent}</div>
                <div><strong>Action:</strong> {prediction.recommendation}</div>
              </div>
            </div>
          )}
        </div>
      </section>

      {/* Community Feed with Filter Tabs */}
      <section className="bg-white border border-slate-200/90 rounded-3xl p-6 sm:p-8 shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
          <div>
            <h2 className="text-xl font-bold text-slate-900 m-0">Community Incident Feed</h2>
          </div>
          <div className="pills flex flex-wrap gap-2">
            {FILTERS.map(([k, label]) => (
              <button
                key={k}
                className={`pill text-xs font-semibold py-1.5 px-3.5 rounded-full border transition-all ${
                  filter === k
                    ? 'bg-slate-900 text-white border-slate-900 shadow-xs'
                    : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
                }`}
                onClick={() => setFilter(k)}
              >
                {label} <span className="ml-1 opacity-75 font-normal">({counts[k] ?? 0})</span>
              </button>
            ))}
          </div>
        </div>

        {visible.length === 0 ? (
          <div className="text-center py-12 text-slate-500 text-sm">
            <span className="text-3xl block mb-2">🔍</span>
            No civic reports match this filter
          </div>
        ) : (
          <div className="grid cards">
            {visible.map((r) => (
              <ReportCard key={r.id} report={r} onChange={replace} />
            ))}
          </div>
        )}
      </section>
    </>
  );
}
