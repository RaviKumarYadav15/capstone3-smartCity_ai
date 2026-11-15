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
  const [showGuideModal, setShowGuideModal] = useState(false);
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
    const onFocus = () => load();
    window.addEventListener('focus', onFocus);
    return () => {
      clearInterval(t);
      window.removeEventListener('focus', onFocus);
    };
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

  const visible = reportsInCity.filter((r) => {
    if (filter === 'all') return true;
    if (filter === 'active' || filter === 'unresolved') return r.status !== 'resolved';
    if (filter === 'resolved') return r.status === 'resolved';
    if (filter === 'critical') return r.severity === 'critical' && r.status !== 'resolved';
    if (filter === 'high') return r.severity === 'high' && r.status !== 'resolved';
    if (filter === 'medium') return r.severity === 'medium' && r.status !== 'resolved';
    if (filter === 'low') return r.severity === 'low' && r.status !== 'resolved';
    if (filter === 'new') return r.status === 'reported';
    if (filter === r.category) return r.status !== 'resolved';
    return r.status === filter || r.severity === filter;
  });

  const counts = {
    all: reportsInCity.length,
    active: reportsInCity.filter((r) => r.status !== 'resolved').length,
    unresolved: reportsInCity.filter((r) => r.status !== 'resolved').length,
    critical: reportsInCity.filter((r) => r.severity === 'critical' && r.status !== 'resolved').length,
    high: reportsInCity.filter((r) => r.severity === 'high' && r.status !== 'resolved').length,
    medium: reportsInCity.filter((r) => r.severity === 'medium' && r.status !== 'resolved').length,
    low: reportsInCity.filter((r) => r.severity === 'low' && r.status !== 'resolved').length,
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
      {/* Top Header Row: Title & Subtitle on Left, City Selector & GUIDE on Right */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-black text-slate-900 m-0">City Issues Map</h1>
          <p className="text-xs text-slate-500 m-0 mt-0.5">Real-time public incident, hazard & infrastructure tracking</p>
        </div>

        <div className="flex items-center gap-2.5 flex-wrap sm:flex-nowrap">
          <select
            value={selectedCity}
            onChange={(e) => handleCityChange(e.target.value)}
            aria-label="Select City"
            className="text-xs sm:text-sm font-bold py-2 px-4 rounded-full border border-slate-300 bg-white hover:bg-slate-50 text-slate-800 cursor-pointer shadow-xs focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition-all truncate max-w-[240px]"
          >
            <option value="all">🌐 All Cities ({reports.length} Total)</option>
            {detectedCities.map((c) => (
              <option key={c.name} value={c.name}>
                📍 {c.name} ({c.count})
              </option>
            ))}
          </select>

          {/* Pulsing GUIDE Button on the Right Side */}
          <button
            type="button"
            onClick={() => setShowGuideModal(true)}
            className="shrink-0 text-xs sm:text-sm font-black py-2 px-4 rounded-full border border-blue-300 bg-white hover:bg-blue-50 text-blue-700 cursor-pointer shadow-xs transition-all flex items-center gap-2 select-none"
            title="Open Citizen SOP & Interactive Map Guide"
          >
            <span className="relative flex h-2.5 w-2.5">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-500 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-blue-600"></span>
            </span>
            GUIDE
          </button>
        </div>
      </div>

      {error && <p className="error p-3 rounded-xl bg-red-50 border border-red-200 my-2 text-xs">{error}</p>}

      {/* Unified Map & Issues Breakdown Container on the Same Horizontal Level */}
      <section className="bg-white border border-slate-200/90 rounded-3xl p-4 sm:p-5 shadow-sm">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-stretch">
          {/* Left Side: Map Column (Accommodates Height of Issues Breakdown) */}
          <div id="live-incident-map" className="lg:col-span-7 xl:col-span-8 flex flex-col justify-between h-full">
            {/* Map Toolbar Strip (Positioned Directly Above the Map Frame for Clean, Spacious Layout) */}
            <div className="flex flex-wrap items-center justify-between gap-2.5 mb-3">
              {/* Left: Status Filter Pills (Unresolved with drilldown, and Resolved) */}
              <div className="flex items-center gap-2 flex-wrap">
                {/* Unresolved Control with Dropdown */}
                <div
                  className={`rounded-xl border shadow-2xs transition-all flex items-center overflow-hidden ${
                    filter === 'active' || filter === 'unresolved' || ['critical', 'high', 'medium', 'low', ...categoryStats.map((c) => c.category)].includes(filter)
                      ? 'bg-amber-500 text-white border-amber-600 ring-2 ring-amber-400/30'
                      : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
                  }`}
                >
                  {/* Direct click button to show all Unresolved */}
                  <button
                    type="button"
                    onClick={() => setFilter((prev) => (prev === 'active' || prev === 'unresolved' ? 'all' : 'active'))}
                    className={`py-1.5 px-3 text-xs font-bold flex items-center gap-1.5 cursor-pointer whitespace-nowrap ${
                      filter === 'active' || filter === 'unresolved' || ['critical', 'high', 'medium', 'low', ...categoryStats.map((c) => c.category)].includes(filter)
                        ? 'text-white'
                        : 'text-slate-800'
                    }`}
                    title={filter === 'active' ? 'Click to show all reports' : 'Click to show all Unresolved issues'}
                  >
                    <span>⚠️</span>
                    <span>Unresolved ({counts.active})</span>
                  </button>

                  {/* Dropdown selector for all criticalities and categories */}
                  <select
                    value={
                      ['critical', 'high', 'medium', 'low', ...categoryStats.map((c) => c.category)].includes(filter)
                        ? filter
                        : filter === 'active' || filter === 'unresolved'
                        ? 'active'
                        : ''
                    }
                    onChange={(e) => {
                      if (e.target.value) setFilter(e.target.value);
                    }}
                    aria-label="Filter Unresolved issues"
                    className={`text-xs font-semibold py-1.5 pr-2.5 pl-1 border-l cursor-pointer focus:outline-none transition ${
                      filter === 'active' || filter === 'unresolved' || ['critical', 'high', 'medium', 'low', ...categoryStats.map((c) => c.category)].includes(filter)
                        ? 'bg-amber-600/60 text-white border-amber-400/40 hover:bg-amber-600/80'
                        : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                    }`}
                    title="Filter Unresolved by Criticality or Category"
                  >
                    <option value="active" className="text-slate-800 bg-white">
                      All Unresolved ({counts.active})
                    </option>
                    <option disabled className="text-slate-400 bg-white font-bold text-[10px]">
                      ── By Criticality ──
                    </option>
                    <option value="critical" className="text-slate-800 bg-white">
                      🔴 Critical ({severityStats.critical})
                    </option>
                    <option value="high" className="text-slate-800 bg-white">
                      🟠 High ({severityStats.high})
                    </option>
                    <option value="medium" className="text-slate-800 bg-white">
                      🟡 Medium ({severityStats.medium})
                    </option>
                    <option value="low" className="text-slate-800 bg-white">
                      🟢 Low ({severityStats.low})
                    </option>
                    {categoryStats.length > 0 && (
                      <>
                        <option disabled className="text-slate-400 bg-white font-bold text-[10px]">
                          ── By Category ──
                        </option>
                        {categoryStats.map((c) => (
                          <option key={c.category} value={c.category} className="text-slate-800 bg-white">
                            {EMOJI[c.category] || '⚠️'} {c.category} ({c.active})
                          </option>
                        ))}
                      </>
                    )}
                  </select>
                </div>

                {/* Resolved Control */}
                <button
                  type="button"
                  onClick={() => setFilter((prev) => (prev === 'resolved' ? 'all' : 'resolved'))}
                  className={`py-1.5 px-3 rounded-xl text-xs font-bold border shadow-2xs transition-all cursor-pointer flex items-center gap-1.5 whitespace-nowrap ${
                    filter === 'resolved'
                      ? 'bg-emerald-600 text-white border-emerald-700 ring-2 ring-emerald-400/30'
                      : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
                  }`}
                  title={filter === 'resolved' ? 'Click to show all reports' : 'Click to show only Resolved issues on the map'}
                >
                  <span>🟢</span>
                  <span>Resolved</span>
                  <span
                    className={`text-[11px] font-mono px-1.5 py-0.2 rounded-full font-bold ml-0.5 ${
                      filter === 'resolved' ? 'bg-white/25 text-white' : 'bg-emerald-100 text-emerald-800'
                    }`}
                  >
                    {counts.resolved}
                  </span>
                </button>
              </div>

              {/* Right: Map Utilities (Locate 5km, Layer Selector, Visible count) */}
              <div className="flex items-center gap-2 flex-wrap">
                {/* Locate 5km Around Me Button */}
                <button
                  type="button"
                  onClick={handleLocateToggle}
                  disabled={locatingUser}
                  title={isNearby5km ? 'Click to reset back to full view' : 'Locate 5km Around Me'}
                  aria-label="Locate 5km Around Me"
                  className={`shrink-0 transition-all cursor-pointer flex items-center gap-1.5 py-1.5 px-3 rounded-xl text-xs font-bold border shadow-2xs select-none whitespace-nowrap ${
                    isNearby5km
                      ? 'bg-blue-600 text-white border-blue-700'
                      : 'bg-white hover:bg-slate-50 text-slate-800 border-slate-200'
                  }`}
                >
                  {locatingUser ? (
                    <>
                      <span className="w-3.5 h-3.5 border-2 border-blue-600/30 border-t-blue-600 rounded-full animate-spin"></span>
                      <span>Locating...</span>
                    </>
                  ) : (
                    <>
                      <BiCurrentLocation className={`text-base ${isNearby5km ? 'text-white animate-pulse' : 'text-blue-600'}`} />
                      <span className="hidden sm:inline">Locate 5km</span>
                      <span className="sm:hidden">5km</span>
                      {isNearby5km && nearby5kmCount > 0 && (
                        <span className="bg-white/25 text-white text-[10px] font-black px-1.5 py-0.2 rounded-full">
                          {nearby5kmCount}
                        </span>
                      )}
                    </>
                  )}
                </button>

                {/* Layer selector */}
                <select
                  value={layer}
                  onChange={(e) => setLayer(e.target.value)}
                  aria-label="Map Tile Style"
                  className="shrink-0 text-xs font-semibold py-1.5 px-2.5 rounded-xl border border-slate-200 bg-white text-slate-700 cursor-pointer shadow-2xs hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-blue-500/20 transition max-w-[140px] sm:max-w-[170px] truncate"
                >
                  {Object.entries(LAYERS).map(([k, v]) => (
                    <option key={k} value={k}>
                      {v.name}
                    </option>
                  ))}
                </select>

                {/* Visible Count Badge */}
                <span className="shrink-0 text-xs font-bold text-slate-700 bg-slate-100 px-2.5 py-1.5 rounded-xl border border-slate-200 shadow-2xs whitespace-nowrap">
                  {visible.length} visible
                </span>
              </div>
            </div>

            {/* Map Frame (Clean, Spacious Canvas) */}
            <div className="relative rounded-2xl overflow-hidden border border-slate-200 w-full flex-1 min-h-[380px] sm:min-h-[420px] isolate">
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
            </div>

            <div className="flex items-center justify-between text-xs text-slate-500 mt-2 px-1 flex-wrap gap-2">
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

          {/* Right Side: Issues Breakdown Column */}
          <div className="lg:col-span-5 xl:col-span-4 border-t lg:border-t-0 lg:border-l border-slate-100 lg:pl-5 flex flex-col justify-between h-full">
            <div>
              <div className="mb-3">
                <h2 className="text-lg font-bold text-slate-900 m-0">
                  {isNearby5km
                    ? 'Nearby Issues Breakdown'
                    : selectedCity !== 'all'
                    ? `${selectedCity} Issues Breakdown`
                    : 'Issues Breakdown'}
                </h2>
                <p className="text-xs text-slate-500 m-0 mt-0.5">
                  {counts.all} Total Registered ({counts.active} Open · {counts.resolved} Resolved)
                </p>
              </div>

              {/* Criticality Breakdown (2-Row Informational Badges) */}
              <div className="mb-3.5">
                <div className="text-[11px] font-bold uppercase tracking-wider text-slate-500 mb-2 flex items-center justify-between">
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
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  {/* Critical Card */}
                  <div
                    className="p-2.5 rounded-2xl border bg-red-50/80 text-red-700 border-red-200 select-none cursor-default shadow-2xs flex flex-col justify-between"
                    title="Critical Hazards"
                  >
                    {/* Row 1: Two Columns (Col 1: Red Logo, Col 2: Number) */}
                    <div className="flex items-center justify-between">
                      <span className="text-base leading-none">🔴</span>
                      <span className="font-mono text-base font-black text-red-700 leading-none">
                        {severityStats.critical}
                      </span>
                    </div>
                    {/* Row 2: One Column (Text: Critical) */}
                    <div className="text-[11px] font-bold uppercase tracking-wider text-red-800 mt-1.5">
                      Critical
                    </div>
                  </div>

                  {/* High Card */}
                  <div
                    className="p-2.5 rounded-2xl border bg-amber-50/80 text-amber-800 border-amber-200 select-none cursor-default shadow-2xs flex flex-col justify-between"
                    title="High Priority"
                  >
                    {/* Row 1: Two Columns (Col 1: Orange Logo, Col 2: Number) */}
                    <div className="flex items-center justify-between">
                      <span className="text-base leading-none">🟠</span>
                      <span className="font-mono text-base font-black text-amber-800 leading-none">
                        {severityStats.high}
                      </span>
                    </div>
                    {/* Row 2: One Column (Text: High) */}
                    <div className="text-[11px] font-bold uppercase tracking-wider text-amber-900 mt-1.5">
                      High
                    </div>
                  </div>

                  {/* Medium Card */}
                  <div
                    className="p-2.5 rounded-2xl border bg-yellow-50/80 text-yellow-800 border-yellow-200 select-none cursor-default shadow-2xs flex flex-col justify-between"
                    title="Medium Priority"
                  >
                    {/* Row 1: Two Columns (Col 1: Yellow Logo, Col 2: Number) */}
                    <div className="flex items-center justify-between">
                      <span className="text-base leading-none">🟡</span>
                      <span className="font-mono text-base font-black text-yellow-800 leading-none">
                        {severityStats.medium}
                      </span>
                    </div>
                    {/* Row 2: One Column (Text: Medium) */}
                    <div className="text-[11px] font-bold uppercase tracking-wider text-yellow-900 mt-1.5">
                      Medium
                    </div>
                  </div>

                  {/* Low Card */}
                  <div
                    className="p-2.5 rounded-2xl border bg-emerald-50/80 text-emerald-800 border-emerald-200 select-none cursor-default shadow-2xs flex flex-col justify-between"
                    title="Low Priority"
                  >
                    {/* Row 1: Two Columns (Col 1: Green Logo, Col 2: Number) */}
                    <div className="flex items-center justify-between">
                      <span className="text-base leading-none">🟢</span>
                      <span className="font-mono text-base font-black text-emerald-800 leading-none">
                        {severityStats.low}
                      </span>
                    </div>
                    {/* Row 2: One Column (Text: Low) */}
                    <div className="text-[11px] font-bold uppercase tracking-wider text-emerald-900 mt-1.5">
                      Low
                    </div>
                  </div>
                </div>
              </div>

              {/* Category Breakdown Table */}
              <div>
                <div className="text-[11px] font-bold uppercase tracking-wider text-slate-500 mb-1.5 flex items-center justify-between">
                  <span>Category Breakdown:</span>
                  <span className="text-[10px] text-slate-400 font-normal">Click row to filter map</span>
                </div>
                {categoryStats.length === 0 ? (
                  <p className="text-xs text-slate-400 italic py-2">No reports recorded in this area yet.</p>
                ) : (
                  <div className="overflow-x-auto max-h-[290px] overflow-y-auto border border-slate-100 rounded-xl">
                    <table className="w-full text-xs text-left">
                      <thead className="text-[10px] uppercase font-bold text-slate-500 bg-slate-50 border-b border-slate-100 sticky top-0">
                        <tr>
                          <th className="py-2 px-2.5">Category</th>
                          <th className="py-2 px-2 text-center text-amber-700">Open</th>
                          <th className="py-2 px-2 text-center text-emerald-700">Resolved</th>
                          <th className="py-2 px-2 text-right">Total</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {categoryStats.map((c) => {
                          const isSelected = filter === c.category;
                          return (
                            <tr
                              key={c.category}
                              onClick={() => setFilter((prev) => (prev === c.category ? 'all' : c.category))}
                              className={`cursor-pointer transition-colors ${
                                isSelected ? 'bg-blue-50/80 font-bold' : 'hover:bg-slate-50'
                              }`}
                            >
                              <td className="py-2 px-2.5 flex items-center gap-1.5 truncate max-w-[150px]">
                                <span>{EMOJI[c.category] || '⚠️'}</span>
                                <span className="truncate">{c.category}</span>
                              </td>
                              <td className="py-2 px-2 text-center font-mono font-semibold text-amber-700">{c.active}</td>
                              <td className="py-2 px-2 text-center font-mono font-semibold text-emerald-700">{c.resolved}</td>
                              <td className="py-2 px-2 text-right font-mono font-bold text-slate-800">{c.total}</td>
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

      {/* Interactive Guide & Citizen SOP Modal Pop-up */}
      {showGuideModal && (
        <div className="fixed inset-0 z-[1500] bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-xl w-full p-6 shadow-2xl border border-slate-200 animate-in fade-in zoom-in-95 duration-200 max-h-[90vh] overflow-y-auto flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between mb-4 pb-3 border-b border-slate-100">
                <div className="flex items-center gap-2.5">
                  <span className="text-2xl">🗺️</span>
                  <div>
                    <h2 className="text-lg font-bold text-slate-900 m-0">Interactive Map Guide</h2>
                    <p className="text-xs text-slate-500 m-0">Citizen Standard Operating Procedure (SOP)</p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setShowGuideModal(false)}
                  className="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-600 flex items-center justify-center cursor-pointer transition"
                  aria-label="Close"
                >
                  <BiX className="text-xl" />
                </button>
              </div>

              {/* Map Significance (Visual Legend) */}
              <div className="mb-5">
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-2">
                  Map Significance (Visual Legend):
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                  <div className="flex items-start gap-2 p-2.5 rounded-xl bg-red-50/70 border border-red-200/80">
                    <span className="text-base shrink-0">🔴</span>
                    <div>
                      <strong className="text-red-700">Critical:</strong> Immediate safety hazard (open manhole, live wire, collapsed road). Top priority routing.
                    </div>
                  </div>
                  <div className="flex items-start gap-2 p-2.5 rounded-xl bg-amber-50/70 border border-amber-200/80">
                    <span className="text-base shrink-0">🟠</span>
                    <div>
                      <strong className="text-amber-800">High / Moderate:</strong> Severe infrastructure defect requiring scheduled municipal maintenance.
                    </div>
                  </div>
                  <div className="flex items-start gap-2 p-2.5 rounded-xl bg-blue-50/70 border border-blue-200/80">
                    <span className="text-base shrink-0">🔵</span>
                    <div>
                      <strong className="text-blue-700">Verified:</strong> Authenticated on-ground by 3 local citizens within 250m proximity.
                    </div>
                  </div>
                  <div className="flex items-start gap-2 p-2.5 rounded-xl bg-emerald-50/70 border border-emerald-200/80">
                    <span className="text-base shrink-0">🟢</span>
                    <div>
                      <strong className="text-emerald-700">Resolved:</strong> Municipal repair verified completed and officially closed.
                    </div>
                  </div>
                </div>
              </div>

              {/* 3-Step Civic SOP */}
              <div className="mb-5">
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-2">
                  3-Step Civic SOP (How to interact with this page):
                </h3>
                <div className="flex flex-col gap-2 text-xs text-slate-700">
                  <div className="flex items-start gap-2.5 p-2.5 rounded-xl bg-slate-50 border border-slate-200/80">
                    <span className="font-black text-blue-600 font-mono text-sm shrink-0">1.</span>
                    <div>
                      <strong className="text-slate-900">Locate:</strong> Select your city dropdown or click <em className="text-blue-700 font-semibold">"Locate 5km Around Me"</em> at the top of the map to filter nearby issues.
                    </div>
                  </div>
                  <div className="flex items-start gap-2.5 p-2.5 rounded-xl bg-slate-50 border border-slate-200/80">
                    <span className="font-black text-blue-600 font-mono text-sm shrink-0">2.</span>
                    <div>
                      <strong className="text-slate-900">Eyewitness Verify:</strong> When near an unverified defect (&lt; 250m), click <em className="text-blue-700 font-semibold">Verify</em> to authenticate it on-ground. 3 community verifications trigger expedited authority action.
                    </div>
                  </div>
                  <div className="flex items-start gap-2.5 p-2.5 rounded-xl bg-slate-50 border border-slate-200/80">
                    <span className="font-black text-blue-600 font-mono text-sm shrink-0">3.</span>
                    <div>
                      <strong className="text-slate-900">Escalate:</strong> If an urgent issue remains unattended, click <em className="text-indigo-700 font-semibold">Draft Grievance Letter</em> below to auto-generate a formal directive for municipal heads.
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Action Bar */}
            <div className="pt-3 border-t border-slate-100 flex items-center gap-3">
              <button
                type="button"
                onClick={() => {
                  setShowGuideModal(false);
                  setShowGrievanceModal(true);
                }}
                className="flex-1 text-xs font-bold py-2.5 px-4 rounded-xl bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200 flex items-center justify-center gap-2 cursor-pointer transition shadow-2xs"
              >
                <BiFile className="text-base" />
                Draft Grievance Letter
              </button>
              <button
                type="button"
                onClick={() => setShowGuideModal(false)}
                className="text-xs font-bold py-2.5 px-4 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-200 cursor-pointer transition"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

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
