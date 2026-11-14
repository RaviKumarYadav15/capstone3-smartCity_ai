import { useCallback, useEffect, useMemo, useState } from 'react';
import { api } from '../api.js';
import { useToast } from '../components/Toast.jsx';
import ReportsMap, { LAYERS } from '../components/ReportsMap.jsx';
import ReportCard from '../components/ReportCard.jsx';
import { getDistanceKm, reverseGeocode } from '../utils/geocode.js';

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

  // Multi-city & live location states
  const [selectedCity, setSelectedCity] = useState(() => {
    try {
      return localStorage.getItem('smartcity_preferred_city') || 'all';
    } catch {
      return 'all';
    }
  });
  const [userLocation, setUserLocation] = useState(null);
  const [locatingUser, setLocatingUser] = useState(false);
  const [cityCenter, setCityCenter] = useState(null);
  const [cityZoom, setCityZoom] = useState(13);

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

  // Center on saved city when reports/cities are loaded
  useEffect(() => {
    if (selectedCity && selectedCity !== 'all' && selectedCity !== 'near_me' && detectedCities.length > 0) {
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
    setTargetLocation(null);
    setTargetId(null);
    try {
      localStorage.setItem('smartcity_preferred_city', newCity);
    } catch {}

    if (newCity === 'all') {
      setCityCenter(null);
      setCityZoom(6);
    } else if (newCity === 'near_me') {
      if (userLocation) {
        setCityCenter(userLocation);
        setCityZoom(13);
      } else {
        handleLocateUser();
      }
    } else {
      const found = detectedCities.find((c) => c.name.toLowerCase() === newCity.toLowerCase());
      if (found) {
        setCityCenter(found.center);
        setCityZoom(13);
      }
    }
  };

  // Live geolocation detection
  const handleLocateUser = () => {
    if (!navigator.geolocation) {
      toast.error('Geolocation is not supported by your browser');
      return;
    }
    setLocatingUser(true);
    navigator.geolocation.getCurrentPosition(
      async (p) => {
        setLocatingUser(false);
        const coords = [p.coords.latitude, p.coords.longitude];
        setUserLocation(coords);
        setCityCenter(coords);
        setCityZoom(14);
        setTargetLocation(null);
        setTargetId(null);
        toast.success('Centered on your live GPS location');

        // Check if user's location matches any existing detected city
        try {
          const geo = await reverseGeocode(coords[0], coords[1]);
          if (geo?.city) {
            const match = detectedCities.find((c) => c.name.toLowerCase() === geo.city.toLowerCase());
            if (match) {
              setSelectedCity(match.name);
              localStorage.setItem('smartcity_preferred_city', match.name);
            } else {
              setSelectedCity('near_me');
            }
          } else {
            setSelectedCity('near_me');
          }
        } catch {
          setSelectedCity('near_me');
        }
      },
      () => {
        setLocatingUser(false);
        toast.error('Could not get GPS location — please allow location permission');
      },
      { enableHighAccuracy: true, timeout: 8000 }
    );
  };

  // Filter reports by selected city or near-me radius
  const reportsInCity = useMemo(() => {
    if (selectedCity === 'all') return reports;
    if (selectedCity === 'near_me' && userLocation) {
      return reports.filter((r) => {
        const dist = getDistanceKm(userLocation[0], userLocation[1], r.lat, r.lng);
        return dist <= 35; // 35 km radius
      });
    }
    return reports.filter((r) => {
      const c = r.address?.city?.toLowerCase() || '';
      return (
        c === selectedCity.toLowerCase() ||
        (r.address?.formatted && r.address.formatted.toLowerCase().includes(selectedCity.toLowerCase()))
      );
    });
  }, [reports, selectedCity, userLocation]);

  const visible = reportsInCity.filter(
    (r) =>
      filter === 'all' ||
      r.severity === filter ||
      r.status === filter ||
      (filter === 'new' && r.status === 'reported')
  );

  const counts = {
    all: reportsInCity.length,
    critical: reportsInCity.filter((r) => r.severity === 'critical').length,
    high: reportsInCity.filter((r) => r.severity === 'high').length,
    new: reportsInCity.filter((r) => r.status === 'reported').length,
    resolved: reportsInCity.filter((r) => r.status === 'resolved').length,
  };

  const fitBoundsCoords = useMemo(() => {
    if (selectedCity === 'all' && reportsInCity.length > 1) {
      return reportsInCity.map((r) => [r.lat, r.lng]);
    }
    return null;
  }, [selectedCity, reportsInCity]);

  const replace = (updated) => setReports((list) => list.map((r) => (r.id === updated.id ? updated : r)));

  return (
    <>
      {/* Top 2-Column Section: Map on Left, Two Status Rows on Right */}
      <section className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch">
        {/* Left Column: City Issues Map */}
        <div id="live-incident-map" className="lg:col-span-7 xl:col-span-8 bg-white border border-slate-200/90 rounded-3xl p-5 sm:p-6 shadow-sm flex flex-col justify-between">
          <div className="flex flex-wrap items-center justify-between gap-4 mb-3">
            <div>
              <h1 className="text-xl sm:text-2xl font-black text-slate-900 m-0">City Issues Map</h1>
              <p className="text-xs text-slate-500 m-0 mt-0.5">Real-time public incident, hazard & infrastructure tracking</p>
            </div>
            {selectedCity !== 'all' && (
              <span className="text-xs font-bold px-3 py-1 bg-blue-50 text-blue-700 border border-blue-200 rounded-full flex items-center gap-1.5 shadow-2xs">
                <span>📍</span>
                <span>Active: <strong>{selectedCity === 'near_me' ? 'Near My Location' : selectedCity}</strong></span>
              </span>
            )}
          </div>

          {/* City Selector & Locate Me Action Bar */}
          <div className="flex flex-wrap items-center justify-between gap-2.5 mb-3 bg-slate-50/90 p-2.5 rounded-2xl border border-slate-200/90 shadow-2xs">
            {/* City Selector Dropdown */}
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-xs font-bold text-slate-700 flex items-center gap-1">
                <span>🏙️</span>
                <span className="hidden sm:inline">Active City:</span>
              </span>

              <select
                value={selectedCity}
                onChange={(e) => handleCityChange(e.target.value)}
                className="text-xs font-bold py-1.5 px-3 rounded-xl border border-slate-300 bg-white text-slate-800 shadow-2xs hover:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20 cursor-pointer"
              >
                <option value="all">🌐 All Cities ({reports.length} Total Reports)</option>
                {userLocation && <option value="near_me">📍 Near My Live Location ({reportsInCity.length} Nearby)</option>}
                {detectedCities.map((c) => (
                  <option key={c.name} value={c.name}>
                    📍 {c.name} ({c.count} {c.count === 1 ? 'report' : 'reports'})
                  </option>
                ))}
              </select>

              {selectedCity !== 'all' && (
                <button
                  type="button"
                  onClick={() => handleCityChange('all')}
                  className="text-[11px] font-semibold text-blue-600 hover:text-blue-800 px-2 py-1 rounded-lg hover:bg-blue-50 cursor-pointer transition flex items-center gap-1"
                >
                  <span>✕</span>
                  <span>Show All Cities</span>
                </button>
              )}
            </div>

            {/* Locate Me Button & Map Style */}
            <div className="flex items-center gap-2 flex-wrap ml-auto">
              <button
                type="button"
                onClick={handleLocateUser}
                disabled={locatingUser}
                className="text-xs font-bold py-1.5 px-3.5 rounded-full bg-blue-50 hover:bg-blue-100 text-blue-700 border border-blue-200 transition-all flex items-center gap-1.5 cursor-pointer shadow-2xs disabled:opacity-60"
                title="Locate my position and view nearby civic issues"
              >
                {locatingUser ? (
                  <>
                    <span className="w-3 h-3 border-2 border-blue-600/30 border-t-blue-600 rounded-full animate-spin"></span>
                    <span>Locating GPS...</span>
                  </>
                ) : (
                  <>
                    <span>📍</span>
                    <span>{userLocation ? 'Re-center On Me' : 'Locate Me'}</span>
                  </>
                )}
              </button>

              <select
                value={layer}
                onChange={(e) => setLayer(e.target.value)}
                className="text-xs font-semibold py-1.5 px-3 rounded-full border border-slate-200 bg-white cursor-pointer shadow-2xs hover:bg-slate-50"
                title="Change Map Tile Style"
              >
                {Object.entries(LAYERS).map(([k, v]) => (
                  <option key={k} value={k}>{v.name}</option>
                ))}
              </select>
            </div>
          </div>

          {error && <p className="error p-3 rounded-xl bg-red-50 border border-red-200 my-2 text-xs">{error}</p>}
          
          <div className="rounded-2xl overflow-hidden border border-slate-200 flex-1 min-h-[380px] sm:min-h-[440px]">
            <ReportsMap
              reports={visible}
              layer={layer}
              targetLocation={targetLocation}
              targetId={targetId}
              centerLocation={cityCenter}
              userLocation={userLocation}
              zoom={cityZoom}
              fitBoundsCoords={fitBoundsCoords}
            />
          </div>

          <div className="flex items-center justify-between text-xs text-slate-500 mt-3 px-1 flex-wrap gap-2">
            <span>
              {selectedCity === 'all'
                ? `Showing all ${reports.length} civic reports across all regions`
                : selectedCity === 'near_me'
                ? `Showing ${reportsInCity.length} reports near your current location (within 35 km)`
                : `Showing ${reportsInCity.length} reports filtered for ${selectedCity}`}
            </span>
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
                  <h2 className="text-base sm:text-lg font-bold text-slate-900 m-0">
                    {selectedCity !== 'all' && selectedCity !== 'near_me' ? `${selectedCity} Health Index` : 'Area Health Index'}
                  </h2>
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
            <p className="text-xs text-slate-500 m-0 mt-0.5">
              {selectedCity === 'all'
                ? 'Showing incidents across all registered cities'
                : selectedCity === 'near_me'
                ? 'Showing incidents within 35 km of your live location'
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
            {selectedCity !== 'all'
              ? `No civic reports found in ${selectedCity === 'near_me' ? 'your area' : selectedCity} matching this filter`
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
    </>
  );
}
