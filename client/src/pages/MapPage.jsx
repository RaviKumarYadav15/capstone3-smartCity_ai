import { useCallback, useEffect, useMemo, useState } from 'react';
import { api } from '../api.js';
import { useToast } from '../components/Toast.jsx';
import ReportsMap, { LAYERS } from '../components/ReportsMap.jsx';
import ReportCard from '../components/ReportCard.jsx';
import { getDistanceKm, reverseGeocode } from '../utils/geocode.js';
import { EMOJI } from '../utils/format.js';
import {
  BiCurrentLocation,
  BiCopy,
  BiCheck,
  BiInfoCircle,
  BiFile,
  BiX,
} from 'react-icons/bi';

const FILTERS = [
  ['all', 'All Reports'],
  ['critical', 'Critical Hazards'],
  ['high', 'High Priority'],
  ['new', 'Newly Reported'],
  ['resolved', 'Resolved'],
];

export default function MapPage() {
  const toast = useToast();
  const [reports, setReports] = useState([]);
  const [stats, setStats] = useState(null);
  const [prediction, setPrediction] = useState(null);
  const [filter, setFilter] = useState('all');
  const [layer, setLayer] = useState('osm');
  const [targetLocation, setTargetLocation] = useState(null);
  const [targetId, setTargetId] = useState(null);
  const [error, setError] = useState('');

  // Multi-city, 3D locate & nearby 5km states
  const [selectedCity, setSelectedCity] = useState(() => {
    try {
      return localStorage.getItem('smartcity_preferred_city') || 'all';
    } catch {
      return 'all';
    }
  });
  const [userLocation, setUserLocation] = useState(null);
  const [isNearby5km, setIsNearby5km] = useState(false);
  const [locatingUser, setLocatingUser] = useState(false);
  const [cityCenter, setCityCenter] = useState(null);
  const [cityZoom, setCityZoom] = useState(13);

  // Interactive features states
  const [showGrievanceModal, setShowGrievanceModal] = useState(false);
  const [copiedLetter, setCopiedLetter] = useState(false);

  // Dynamic city aggregation from all fetched reports
  const detectedCities = useMemo(() => {
    const map = {};
    reports.forEach((r) => {
      const cityName =
        r.address?.city?.trim() ||
        (r.address?.formatted ? r.address.formatted.split(',').slice(-3, -2)[0]?.trim() : '') ||
        '';
      if (!cityName) return;
      const key = cityName.toLowerCase();
      if (!map[key]) {
        map[key] = {
          name: cityName,
          count: 0,
          latSum: 0,
          lngSum: 0,
        };
      }
      map[key].count += 1;
      map[key].latSum += r.lat;
      map[key].lngSum += r.lng;
    });

    return Object.values(map)
      .map((c) => ({
        name: c.name,
        count: c.count,
        center: [c.latSum / c.count, c.lngSum / c.count],
      }))
      .sort((a, b) => b.count - a.count);
  }, [reports]);

  const handleLocate = (report) => {
    setTargetLocation([report.lat, report.lng]);
    setTargetId(report.id);
    const el = document.getElementById('live-incident-map');
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  };

  const load = useCallback(async () => {
    try {
      const [r, s] = await Promise.all([api.get('/reports'), api.get('/stats')]);
      if (r?.reports) setReports(r.reports);
      if (s) setStats(s);
      setError('');
    } catch (e) {
      // Only set visible error if no reports have loaded yet
      setReports((current) => {
        if (!current || current.length === 0) {
          setError(e.message || 'Cannot reach the server');
        }
        return current;
      });
    }
  }, []);

  useEffect(() => {
    load();
    api.get('/predictions').then((d) => setPrediction(d.prediction)).catch(() => {});
    const t = setInterval(load, 30000);
    return () => clearInterval(t);
  }, [load]);

  // Center on saved city when reports/cities are loaded
  useEffect(() => {
    if (selectedCity && selectedCity !== 'all' && detectedCities.length > 0) {
      const match = detectedCities.find((c) => c.name.toLowerCase() === selectedCity.toLowerCase());
      if (match) {
        setCityCenter(match.center);
        setCityZoom(13);
      }
    }
  }, [detectedCities, selectedCity]);

  // Handle city selection change
  const handleCityChange = (newCity) => {
    setSelectedCity(newCity);
    setIsNearby5km(false);
    setTargetLocation(null);
    setTargetId(null);
    try {
      localStorage.setItem('smartcity_preferred_city', newCity);
    } catch {}

    if (newCity === 'all') {
      setCityCenter(null);
      setCityZoom(6);
    } else {
      const found = detectedCities.find((c) => c.name.toLowerCase() === newCity.toLowerCase());
      if (found) {
        setCityCenter(found.center);
        setCityZoom(13);
      }
    }
  };

  // 3D Locate Me click handler
  const handleLocateToggle = () => {
    if (isNearby5km) {
      // Toggle off back to start state
      setIsNearby5km(false);
      toast.success('Reset to full city view');
      return;
    }

    if (userLocation) {
      // Already have coordinates, fly to user and activate 5km mode
      setCityCenter(userLocation);
      setCityZoom(14);
      setTargetLocation(null);
      setTargetId(null);
      setIsNearby5km(true);
      toast.success('Centered on your live location — showing 5 km nearby hazards');
      return;
    }

    if (!navigator.geolocation) {
      toast.error('Geolocation is not supported by your browser');
      return;
    }
    setLocatingUser(true);
    navigator.geolocation.getCurrentPosition(
      (p) => {
        setLocatingUser(false);
        const coords = [p.coords.latitude, p.coords.longitude];
        setUserLocation(coords);
        setCityCenter(coords);
        setCityZoom(14);
        setTargetLocation(null);
        setTargetId(null);
        setIsNearby5km(true);
        toast.success('Centered on your live location — showing 5 km nearby hazards');
      },
      () => {
        setLocatingUser(false);
        toast.error('Could not get GPS location — please allow location permission');
      },
      { enableHighAccuracy: true, timeout: 8000 }
    );
  };

  // Count reports within 5 km of user's live position
  const nearby5kmCount = useMemo(() => {
    if (!userLocation) return 0;
    return reports.filter((r) => {
      const d = getDistanceKm(userLocation[0], userLocation[1], r.lat, r.lng);
      return d <= 5;
    }).length;
  }, [reports, userLocation]);

  // Filter reports by selected city or 5 km nearby radius
  const reportsInCity = useMemo(() => {
    if (isNearby5km && userLocation) {
      return reports.filter((r) => {
        const dist = getDistanceKm(userLocation[0], userLocation[1], r.lat, r.lng);
        return dist <= 5;
      });
    }

    if (selectedCity === 'all') return reports;

    return reports.filter((r) => {
      const c = r.address?.city?.toLowerCase() || '';
      return (
        c === selectedCity.toLowerCase() ||
        (r.address?.formatted && r.address.formatted.toLowerCase().includes(selectedCity.toLowerCase()))
      );
    });
  }, [reports, selectedCity, isNearby5km, userLocation]);

  const visible = reportsInCity.filter(
    (r) =>
      filter === 'all' ||
      r.severity === filter ||
      r.status === filter ||
      r.category === filter ||
      (filter === 'new' && r.status === 'reported')
  );

  const counts = {
    all: reportsInCity.length,
    active: reportsInCity.filter((r) => r.status !== 'resolved').length,
    critical: reportsInCity.filter((r) => r.severity === 'critical').length,
    high: reportsInCity.filter((r) => r.severity === 'high').length,
    new: reportsInCity.filter((r) => r.status === 'reported').length,
    resolved: reportsInCity.filter((r) => r.status === 'resolved').length,
  };

  const categoryStats = useMemo(() => {
    const list = reportsInCity || [];
    const map = {};
    for (const r of list) {
      const cat = r.category || 'other';
      if (!map[cat]) {
        map[cat] = { category: cat, total: 0, active: 0, resolved: 0 };
      }
      map[cat].total += 1;
      if (r.status === 'resolved') {
        map[cat].resolved += 1;
      } else {
        map[cat].active += 1;
      }
    }
    return Object.values(map).sort((a, b) => b.active - a.active || b.total - a.total);
  }, [reportsInCity]);

  const severityStats = useMemo(() => {
    const list = reportsInCity || [];
    return {
      critical: list.filter((r) => r.severity === 'critical' && r.status !== 'resolved').length,
      high: list.filter((r) => r.severity === 'high' && r.status !== 'resolved').length,
      medium: list.filter((r) => r.severity === 'medium' && r.status !== 'resolved').length,
      low: list.filter((r) => r.severity === 'low' && r.status !== 'resolved').length,
    };
  }, [reportsInCity]);

  const fitBoundsCoords = useMemo(() => {
    if (selectedCity === 'all' && !isNearby5km && reportsInCity.length > 1) {
      return reportsInCity.map((r) => [r.lat, r.lng]);
    }
    return null;
  }, [selectedCity, isNearby5km, reportsInCity]);

  const replace = (updated) => setReports((list) => list.map((r) => (r.id === updated.id ? updated : r)));

  const generatedGrievanceLetter = useMemo(() => {
    const dateStr = new Date().toLocaleDateString('en-IN', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    });
    const jurisdiction = selectedCity !== 'all' ? selectedCity : 'Smart City Municipal Corporation';
    const critCount = severityStats.critical;
    const highCount = severityStats.high;

    return `URGENT CIVIC DIRECTIVE & GRIEVANCE MEMORANDUM
Date: ${dateStr}
To:
The Municipal Commissioner / Chief Engineer (Public Works Department)
${jurisdiction} Municipal Corporation

Subject: Formal Escalation Regarding High-Risk Civic Infrastructure Defects in ${jurisdiction}

Dear Municipal Authorities,

I am writing to submit an official citizen escalation regarding public safety and civic infrastructure degradation in ${jurisdiction}, supported by empirical real-time civic incident tracking data.

Civic Incident Overview:
• Total Registered Incidents: ${counts.all} (${counts.active} open, ${counts.resolved} resolved)
• Critical Unresolved Defects: ${critCount} critical hazard(s) requiring immediate intervention
• High-Priority Defect Count: ${highCount} major infrastructure defect(s)
${prediction?.hotspot ? `• Identified Primary Hotspot: ${prediction.hotspot}` : ''}
${prediction?.recommendation ? `• Recommended Action: ${prediction.recommendation}` : ''}

Urgent Municipal Intervention Requested:
Under municipal road safety standards and public grievance service level agreements, we request the immediate dispatch of an inspection crew to inspect and remediate these issues to protect public safety.

Submitted via Smart City Civic Intelligence Platform
Live Incident Tracking Feed: https://smart-city-ai.vercel.app/map`;
  }, [selectedCity, counts, severityStats, prediction]);

  const copyToClipboard = async (text) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedLetter(true);
      toast.success('Directive memorandum copied to clipboard!');
      setTimeout(() => setCopiedLetter(false), 3000);
    } catch {
      toast.error('Failed to copy to clipboard');
    }
  };

  const downloadLetter = (text, filename = 'Municipal_Escalation_Directive.txt') => {
    const blob = new Blob([text], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    toast.success('Downloaded letter as text file');
  };

  return (
    <>
      {/* Top City Selector (Above the Dashboard & Heading) */}
      <div className="flex justify-end mb-4">
        <select
          value={selectedCity}
          onChange={(e) => handleCityChange(e.target.value)}
          aria-label="Select City"
          className="w-full sm:w-auto text-xs sm:text-sm font-bold py-2 px-4 rounded-full border border-slate-300 bg-white hover:bg-slate-50 text-slate-800 cursor-pointer shadow-xs focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition-all"
        >
          <option value="all">🌐 All Cities ({reports.length} Total)</option>
          {detectedCities.map((c) => (
            <option key={c.name} value={c.name}>
              📍 {c.name} ({c.count})
            </option>
          ))}
        </select>
      </div>

      {/* Top 2-Column Section: Map on Left, Two Status Rows on Right */}
      <section className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch">
        {/* Left Column: City Issues Map */}
        <div id="live-incident-map" className="lg:col-span-7 xl:col-span-8 bg-white border border-slate-200/90 rounded-3xl p-5 sm:p-6 shadow-sm flex flex-col justify-between">
          {/* Header Row: Clean Title on Left, Count Badge on Right (City selector moved to Top Scope Bar) */}
          <div className="flex flex-wrap items-center justify-between gap-3 mb-3">
            <div>
              <h1 className="text-xl sm:text-2xl font-black text-slate-900 m-0">City Issues Map</h1>
              <p className="text-xs text-slate-500 m-0 mt-0.5">Real-time public incident, hazard & infrastructure tracking</p>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-slate-600 bg-slate-100 px-3 py-1.5 rounded-full border border-slate-200 flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-blue-500"></span>
                {visible.length} issues visible
              </span>
            </div>
          </div>

          {error && <p className="error p-3 rounded-xl bg-red-50 border border-red-200 my-2 text-xs">{error}</p>}
          
          {/* Map Frame with Floating Map Controls (isolated stacking context) */}
          <div className="relative rounded-2xl overflow-hidden border border-slate-200 flex-1 min-h-[380px] sm:min-h-[440px] isolate">
            {/* Top Right Floating Map Style Dropdown on the Map Itself */}
            <div className="absolute top-3 right-3 z-[30]">
              <select
                value={layer}
                onChange={(e) => setLayer(e.target.value)}
                aria-label="Map Tile Style"
                className="text-xs font-semibold py-1.5 px-3 rounded-xl border border-slate-200/90 bg-white/95 backdrop-blur-md text-slate-700 cursor-pointer shadow-md hover:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 transition"
              >
                {Object.entries(LAYERS).map(([k, v]) => (
                  <option key={k} value={k}>
                    {v.name}
                  </option>
                ))}
              </select>
            </div>

            <ReportsMap
              reports={visible}
              layer={layer}
              targetLocation={targetLocation}
              targetId={targetId}
              centerLocation={cityCenter}
              userLocation={userLocation}
              isNearby5km={isNearby5km}
              zoom={cityZoom}
              fitBoundsCoords={fitBoundsCoords}
            />

            {/* Floating 3D Locate 5km Around Me Button on Map */}
            <div className="absolute bottom-5 right-5 z-[30]">
              <button
                type="button"
                onClick={handleLocateToggle}
                disabled={locatingUser}
                title={isNearby5km ? 'Click to reset back to full view' : 'Locate 5km Around Me'}
                aria-label="Locate 5km Around Me"
                className={`transition-all cursor-pointer flex items-center gap-2 select-none px-4 py-2.5 sm:px-5 sm:py-3 rounded-full ${
                  isNearby5km
                    ? 'bg-gradient-to-b from-blue-500 to-blue-600 text-white border-2 border-blue-400 shadow-[0_6px_0_#1d4ed8,0_12px_22px_rgba(37,99,235,0.35)] active:translate-y-1 active:shadow-[0_2px_0_#1d4ed8,0_4px_10px_rgba(37,99,235,0.3)]'
                    : 'bg-gradient-to-b from-white via-slate-50 to-slate-100 text-slate-800 border-2 border-slate-300 shadow-[0_6px_0_#94a3b8,0_12px_22px_rgba(0,0,0,0.2)] active:translate-y-1 active:shadow-[0_2px_0_#94a3b8,0_4px_10px_rgba(0,0,0,0.15)] hover:from-white hover:to-blue-50'
                }`}
              >
                {locatingUser ? (
                  <>
                    <span className="w-4 h-4 border-2 border-blue-600/30 border-t-blue-600 rounded-full animate-spin"></span>
                    <span className="font-extrabold text-xs sm:text-sm">Locating...</span>
                  </>
                ) : (
                  <>
                    <BiCurrentLocation
                      className={`text-xl sm:text-2xl transition-transform ${
                        isNearby5km ? 'text-white animate-pulse' : 'text-blue-600 group-hover:scale-110'
                      }`}
                    />
                    <span
                      className={`font-extrabold text-xs sm:text-sm tracking-tight ${
                        isNearby5km ? 'text-white' : 'text-slate-800'
                      }`}
                    >
                      Locate 5km Around Me
                    </span>
                    {isNearby5km && nearby5kmCount > 0 && (
                      <span className="bg-white/25 text-white text-[11px] font-black px-2 py-0.5 rounded-full ml-0.5">
                        {nearby5kmCount}
                      </span>
                    )}
                  </>
                )}
              </button>
            </div>
          </div>

          <div className="flex items-center justify-between text-xs text-slate-500 mt-3 px-1 flex-wrap gap-2">
            <span>
              {isNearby5km && userLocation
                ? `Showing ${reportsInCity.length} civic reports within 5 km of your GPS location`
                : selectedCity === 'all'
                ? `Showing all ${reports.length} civic reports across all regions`
                : `Showing ${reportsInCity.length} reports in ${selectedCity}`}
            </span>
            <span className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-emerald-500"></span> Live feed (auto-updates every 30s)
            </span>
          </div>
        </div>

        {/* Right Column: Two Rows Showing Live Status of the City */}
        <div className="lg:col-span-5 xl:col-span-4 flex flex-col gap-6 justify-between">
          {/* Row 1: Area Incident Breakdown (Category-wise & Criticality-wise) */}
          <div className="bg-white border border-slate-200/90 rounded-3xl p-5 sm:p-6 shadow-sm flex-1 flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between mb-3">
                <h2 className="text-base sm:text-lg font-bold text-slate-900 m-0">
                  {isNearby5km
                    ? 'Nearby Incident Breakdown'
                    : selectedCity !== 'all'
                    ? `${selectedCity} Incident Breakdown`
                    : 'Area Incident Breakdown'}
                </h2>
                <span className="px-2.5 py-0.5 rounded-full text-xs font-bold uppercase tracking-wider bg-slate-100 text-slate-700 border border-slate-200">
                  {counts.all} Total ({counts.active} Open)
                </span>
              </div>

              {/* Criticality / Severity Filter Row */}
              <div className="mb-3.5">
                <div className="text-[11px] font-bold uppercase tracking-wider text-slate-500 mb-1.5 flex items-center justify-between">
                  <span>Criticality Breakdown:</span>
                  {filter !== 'all' && (
                    <button
                      type="button"
                      onClick={() => setFilter('all')}
                      className="text-[11px] text-blue-600 hover:text-blue-800 font-semibold cursor-pointer underline"
                    >
                      Reset Filter
                    </button>
                  )}
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5">
                  <button
                    type="button"
                    onClick={() => {
                      setFilter((prev) => (prev === 'critical' ? 'all' : 'critical'));
                      document.getElementById('live-incident-map')?.scrollIntoView({ behavior: 'smooth' });
                    }}
                    className={`px-2 py-1.5 rounded-xl font-bold text-xs flex items-center justify-between border cursor-pointer transition ${
                      filter === 'critical'
                        ? 'bg-red-600 text-white border-red-700 shadow-xs'
                        : 'bg-red-50 text-red-700 border-red-200 hover:bg-red-100'
                    }`}
                    title="Filter Critical Hazards"
                  >
                    <span className="flex items-center gap-1">🔴 Crit</span>
                    <span className="font-mono text-xs">{severityStats.critical}</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setFilter((prev) => (prev === 'high' ? 'all' : 'high'));
                      document.getElementById('live-incident-map')?.scrollIntoView({ behavior: 'smooth' });
                    }}
                    className={`px-2 py-1.5 rounded-xl font-bold text-xs flex items-center justify-between border cursor-pointer transition ${
                      filter === 'high'
                        ? 'bg-amber-600 text-white border-amber-700 shadow-xs'
                        : 'bg-amber-50 text-amber-800 border-amber-200 hover:bg-amber-100'
                    }`}
                    title="Filter High Priority"
                  >
                    <span className="flex items-center gap-1">🟠 High</span>
                    <span className="font-mono text-xs">{severityStats.high}</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setFilter((prev) => (prev === 'medium' ? 'all' : 'medium'));
                      document.getElementById('live-incident-map')?.scrollIntoView({ behavior: 'smooth' });
                    }}
                    className={`px-2 py-1.5 rounded-xl font-bold text-xs flex items-center justify-between border cursor-pointer transition ${
                      filter === 'medium'
                        ? 'bg-yellow-500 text-white border-yellow-600 shadow-xs'
                        : 'bg-yellow-50 text-yellow-800 border-yellow-200 hover:bg-yellow-100'
                    }`}
                    title="Filter Medium Priority"
                  >
                    <span className="flex items-center gap-1">🟡 Med</span>
                    <span className="font-mono text-xs">{severityStats.medium}</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setFilter((prev) => (prev === 'low' ? 'all' : 'low'));
                      document.getElementById('live-incident-map')?.scrollIntoView({ behavior: 'smooth' });
                    }}
                    className={`px-2 py-1.5 rounded-xl font-bold text-xs flex items-center justify-between border cursor-pointer transition ${
                      filter === 'low'
                        ? 'bg-emerald-600 text-white border-emerald-700 shadow-xs'
                        : 'bg-emerald-50 text-emerald-800 border-emerald-200 hover:bg-emerald-100'
                    }`}
                    title="Filter Low Priority"
                  >
                    <span className="flex items-center gap-1">🟢 Low</span>
                    <span className="font-mono text-xs">{severityStats.low}</span>
                  </button>
                </div>
              </div>

              {/* Category-wise Breakdown Table */}
              <div>
                <div className="text-[11px] font-bold uppercase tracking-wider text-slate-500 mb-1.5 flex items-center justify-between">
                  <span>Category Breakdown:</span>
                  <span className="text-[10px] text-slate-400 font-normal">Click row to filter map</span>
                </div>
                {categoryStats.length === 0 ? (
                  <p className="text-xs text-slate-400 italic py-2">No reports recorded in this area yet.</p>
                ) : (
                  <div className="overflow-x-auto max-h-48 overflow-y-auto border border-slate-100 rounded-xl">
                    <table className="w-full text-xs text-left">
                      <thead className="text-[10px] uppercase font-bold text-slate-500 bg-slate-50 border-b border-slate-100 sticky top-0">
                        <tr>
                          <th className="py-1.5 px-2.5">Category</th>
                          <th className="py-1.5 px-2 text-center text-amber-700">Open</th>
                          <th className="py-1.5 px-2 text-center text-emerald-700">Resolved</th>
                          <th className="py-1.5 px-2 text-right">Total</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {categoryStats.map((c) => {
                          const isSelected = filter === c.category;
                          return (
                            <tr
                              key={c.category}
                              onClick={() => {
                                setFilter((prev) => (prev === c.category ? 'all' : c.category));
                                document.getElementById('live-incident-map')?.scrollIntoView({ behavior: 'smooth' });
                              }}
                              className={`cursor-pointer transition-colors ${
                                isSelected ? 'bg-blue-50/80 font-bold' : 'hover:bg-slate-50'
                              }`}
                            >
                              <td className="py-1.5 px-2.5 flex items-center gap-1.5 truncate max-w-[150px]">
                                <span>{EMOJI[c.category] || '⚠️'}</span>
                                <span className="truncate">{c.category}</span>
                              </td>
                              <td className="py-1.5 px-2 text-center font-mono font-semibold text-amber-700">{c.active}</td>
                              <td className="py-1.5 px-2 text-center font-mono font-semibold text-emerald-700">{c.resolved}</td>
                              <td className="py-1.5 px-2 text-right font-mono font-bold text-slate-800">{c.total}</td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </div>

            <div className="pt-2.5 border-t border-slate-100 mt-3 flex items-center justify-between text-xs text-slate-500">
              <span>Active reports: <strong className="text-slate-800">{counts.active}</strong></span>
              <span>Critical hazards: <strong className="text-red-600">{severityStats.critical}</strong></span>
            </div>
          </div>

          {/* Row 2: Interactive Map Guide (Legend & SOP) */}
          <div className="bg-white border border-slate-200/90 rounded-3xl p-5 sm:p-6 shadow-sm flex-1 flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between mb-2.5">
                <h2 className="text-base sm:text-lg font-bold text-slate-900 m-0 flex items-center gap-2">
                  <span>🗺️</span> Interactive Map Guide
                </h2>
                <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-blue-50 text-blue-700 border border-blue-200 uppercase tracking-wider">
                  Citizen SOP
                </span>
              </div>

              {/* Map Significance (Visual Legend) */}
              <div className="mb-3">
                <p className="text-[11px] font-bold uppercase tracking-wider text-slate-500 mb-1.5">
                  Map Significance (Visual Legend):
                </p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5 text-xs text-slate-700">
                  <div className="flex items-start gap-1.5 p-1.5 rounded-lg bg-red-50/60 border border-red-100">
                    <span className="text-sm shrink-0">🔴</span>
                    <div className="leading-snug">
                      <strong className="text-red-700">Critical:</strong> Immediate hazard (open manhole, live wire, collapsed road).
                    </div>
                  </div>
                  <div className="flex items-start gap-1.5 p-1.5 rounded-lg bg-amber-50/60 border border-amber-100">
                    <span className="text-sm shrink-0">🟠</span>
                    <div className="leading-snug">
                      <strong className="text-amber-800">High / Moderate:</strong> Severe defect needing maintenance.
                    </div>
                  </div>
                  <div className="flex items-start gap-1.5 p-1.5 rounded-lg bg-blue-50/60 border border-blue-100">
                    <span className="text-sm shrink-0">🔵</span>
                    <div className="leading-snug">
                      <strong className="text-blue-700">Verified:</strong> Authenticated by 3 citizens within 250m.
                    </div>
                  </div>
                  <div className="flex items-start gap-1.5 p-1.5 rounded-lg bg-emerald-50/60 border border-emerald-100">
                    <span className="text-sm shrink-0">🟢</span>
                    <div className="leading-snug">
                      <strong className="text-emerald-700">Resolved:</strong> Municipal repair completed and closed.
                    </div>
                  </div>
                </div>
              </div>

              {/* 3-Step Civic SOP */}
              <div>
                <p className="text-[11px] font-bold uppercase tracking-wider text-slate-500 mb-1.5">
                  3-Step Civic SOP (How to use this page):
                </p>
                <div className="flex flex-col gap-1.5 text-xs text-slate-700">
                  <div className="flex items-start gap-2 p-1.5 rounded-lg bg-slate-50 border border-slate-100">
                    <span className="font-bold text-blue-600 font-mono shrink-0">1.</span>
                    <div>
                      <strong>Locate:</strong> Select your city dropdown or click <em>"Locate 5km Around Me"</em> on the map.
                    </div>
                  </div>
                  <div className="flex items-start gap-2 p-1.5 rounded-lg bg-slate-50 border border-slate-100">
                    <span className="font-bold text-blue-600 font-mono shrink-0">2.</span>
                    <div>
                      <strong>Eyewitness Verify:</strong> Walk near an open issue (&lt; 250m) and click <em>Verify</em> to authenticate it for fast authority routing.
                    </div>
                  </div>
                  <div className="flex items-start gap-2 p-1.5 rounded-lg bg-slate-50 border border-slate-100">
                    <span className="font-bold text-blue-600 font-mono shrink-0">3.</span>
                    <div>
                      <strong>Escalate:</strong> If an issue remains stagnant, click <em>Draft Grievance Letter</em> to auto-generate a formal complaint to municipal heads.
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Retained Action Buttons */}
            <div className="mt-3.5 pt-3 border-t border-slate-100 flex items-center justify-between">
              <button
                type="button"
                onClick={() => setShowGrievanceModal(true)}
                className="w-full text-xs font-bold py-2.5 px-4 rounded-xl bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200 flex items-center justify-center gap-2 cursor-pointer transition shadow-2xs"
                title="Generate formal escalation letter for municipal authorities"
              >
                <BiFile className="text-base" />
                Draft Grievance Letter
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* Community Feed with Filter Tabs */}
      <section className="bg-white border border-slate-200/90 rounded-3xl p-6 sm:p-8 shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
          <div>
            <h2 className="text-xl font-bold text-slate-900 m-0">Community Incident Feed</h2>
            <p className="text-xs text-slate-500 m-0 mt-0.5">
              {isNearby5km && userLocation
                ? `Showing incidents within 5 km of your GPS location (${reportsInCity.length} found)`
                : selectedCity === 'all'
                ? 'Showing incidents across all registered cities'
                : `Showing incidents reported in ${selectedCity}`}
            </p>
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
            {isNearby5km
              ? 'No civic reports found within 5 km of your location matching this filter'
              : selectedCity !== 'all'
              ? `No civic reports found in ${selectedCity} matching this filter`
              : 'No civic reports match this filter'}
          </div>
        ) : (
          <div className="grid cards">
            {visible.map((r) => (
              <ReportCard key={r.id} report={r} onChange={replace} onLocate={handleLocate} />
            ))}
          </div>
        )}
      </section>

      {/* Official Grievance Memorandum Modal */}
      {showGrievanceModal && (
        <div className="fixed inset-0 z-[1500] bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl border border-slate-200 shadow-2xl max-w-2xl w-full p-6 animate-in fade-in zoom-in-95 duration-200 flex flex-col max-h-[90vh]">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2.5">
                <span className="text-xl">📄</span>
                <div>
                  <h3 className="text-base sm:text-lg font-black text-slate-900 m-0">
                    Official Municipal Grievance Directive
                  </h3>
                  <p className="text-xs text-slate-500 m-0">
                    Formally formatted administrative escalation based on live AI telemetry
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowGrievanceModal(false)}
                className="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-600 flex items-center justify-center cursor-pointer transition"
                aria-label="Close"
              >
                <BiX className="text-xl" />
              </button>
            </div>

            <div className="my-4 flex-1 overflow-y-auto">
              <textarea
                readOnly
                value={generatedGrievanceLetter}
                rows={14}
                className="w-full text-xs font-mono p-4 rounded-2xl bg-slate-50 border border-slate-200 text-slate-800 leading-relaxed resize-none focus:outline-none"
              />
            </div>

            <div className="pt-3 border-t border-slate-100 flex flex-wrap items-center justify-between gap-3">
              <span className="text-xs text-slate-500">
                Ready to submit to municipal council or PWD portal.
              </span>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => downloadLetter(generatedGrievanceLetter)}
                  className="text-xs font-bold py-2 px-3.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 flex items-center gap-1.5 cursor-pointer shadow-xs transition"
                >
                  <BiFile />
                  Download .txt
                </button>
                <button
                  type="button"
                  onClick={() => copyToClipboard(generatedGrievanceLetter)}
                  className="text-xs font-bold py-2 px-4 rounded-xl bg-blue-600 hover:bg-blue-700 text-white flex items-center gap-1.5 cursor-pointer shadow-md transition"
                >
                  {copiedLetter ? <BiCheck className="text-sm" /> : <BiCopy className="text-sm" />}
                  {copiedLetter ? 'Copied!' : 'Copy Directive'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
