import { useCallback, useEffect, useMemo, useState } from 'react';
import { api } from '../api.js';
import { useToast } from '../components/Toast.jsx';
import ReportsMap, { LAYERS } from '../components/ReportsMap.jsx';
import ReportCard from '../components/ReportCard.jsx';
import { getDistanceKm, reverseGeocode } from '../utils/geocode.js';
import { BiCurrentLocation } from 'react-icons/bi';

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

  // Large 3D Locate Me click handler
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
        setIsNearby5km(true);
        toast.success('Centered on your live location — showing 5 km nearby hazards');

        // Check if user's location matches any existing detected city
        try {
          const geo = await reverseGeocode(coords[0], coords[1]);
          if (geo?.city) {
            const match = detectedCities.find((c) => c.name.toLowerCase() === geo.city.toLowerCase());
            if (match) {
              setSelectedCity(match.name);
              localStorage.setItem('smartcity_preferred_city', match.name);
            }
          }
        } catch {}
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
    if (selectedCity === 'all' && !isNearby5km && reportsInCity.length > 1) {
      return reportsInCity.map((r) => [r.lat, r.lng]);
    }
    return null;
  }, [selectedCity, isNearby5km, reportsInCity]);

  const replace = (updated) => setReports((list) => list.map((r) => (r.id === updated.id ? updated : r)));

  return (
    <>
      {/* Top 2-Column Section: Map on Left, Two Status Rows on Right */}
      <section className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch">
        {/* Left Column: City Issues Map */}
        <div id="live-incident-map" className="lg:col-span-7 xl:col-span-8 bg-white border border-slate-200/90 rounded-3xl p-5 sm:p-6 shadow-sm flex flex-col justify-between">
          {/* Header Row: Title on Left, Simple Dropdowns on Right */}
          <div className="flex flex-wrap items-center justify-between gap-4 mb-3">
            <div>
              <h1 className="text-xl sm:text-2xl font-black text-slate-900 m-0">City Issues Map</h1>
              <p className="text-xs text-slate-500 m-0 mt-0.5">Real-time public incident, hazard & infrastructure tracking</p>
            </div>
            
            <div className="flex items-center gap-2">
              {/* Clean City Dropdown without Active Tag */}
              <select
                value={selectedCity}
                onChange={(e) => handleCityChange(e.target.value)}
                aria-label="Select City"
                className="text-xs font-semibold py-1.5 px-3 rounded-full border border-slate-200 bg-slate-50 hover:bg-white text-slate-700 cursor-pointer shadow-2xs focus:outline-none focus:ring-2 focus:ring-blue-500/20"
              >
                <option value="all">🌐 All Cities ({reports.length})</option>
                {detectedCities.map((c) => (
                  <option key={c.name} value={c.name}>
                    📍 {c.name} ({c.count})
                  </option>
                ))}
              </select>

              {/* Map Tile Style */}
              <select
                value={layer}
                onChange={(e) => setLayer(e.target.value)}
                aria-label="Map Tile Style"
                className="text-xs font-semibold py-1.5 px-3 rounded-full border border-slate-200 bg-slate-50 hover:bg-white text-slate-700 cursor-pointer shadow-2xs focus:outline-none focus:ring-2 focus:ring-blue-500/20"
              >
                {Object.entries(LAYERS).map(([k, v]) => (
                  <option key={k} value={k}>{v.name}</option>
                ))}
              </select>
            </div>
          </div>

          {error && <p className="error p-3 rounded-xl bg-red-50 border border-red-200 my-2 text-xs">{error}</p>}
          
          {/* Map Frame with Large 3D Floating Locate Button */}
          <div className="relative rounded-2xl overflow-hidden border border-slate-200 flex-1 min-h-[380px] sm:min-h-[440px]">
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

            {/* Floating 3D Locate Me Button & Nearby 5 km Option */}
            <div className="absolute bottom-5 right-5 z-[500] flex items-center gap-2.5">
              {/* Nearby 5 km Option Pill (Visible when user location is known or after clicking locate) */}
              {userLocation && (
                <div className="bg-white/95 backdrop-blur-md px-3 py-1.5 rounded-full border border-slate-200/90 shadow-[0_4px_14px_rgba(0,0,0,0.14)] flex items-center gap-1.5 text-xs">
                  <span className="text-[11px] font-bold text-slate-700 flex items-center gap-1">
                    <span>🎯</span>
                    <span className="hidden sm:inline">Nearby:</span>
                  </span>
                  <button
                    type="button"
                    onClick={() => setIsNearby5km(!isNearby5km)}
                    className={`text-xs font-bold px-3 py-1 rounded-full transition-all cursor-pointer border ${
                      isNearby5km
                        ? 'bg-blue-600 text-white border-blue-600 shadow-xs'
                        : 'bg-slate-100 hover:bg-slate-200 text-slate-700 border-slate-200'
                    }`}
                  >
                    {isNearby5km ? `✓ 5 km Active (${nearby5kmCount})` : `5 km (${nearby5kmCount})`}
                  </button>
                </div>
              )}

              {/* Large 3D Circular Locate Me Button */}
              <button
                type="button"
                onClick={handleLocateUser}
                disabled={locatingUser}
                title="Locate my position (3D GPS Auto-Center)"
                aria-label="Locate my position"
                className={`w-14 h-14 sm:w-16 sm:h-16 rounded-full transition-all cursor-pointer flex flex-col items-center justify-center group disabled:opacity-60 select-none ${
                  isNearby5km
                    ? 'bg-gradient-to-b from-blue-500 to-blue-600 text-white border-2 border-blue-400 shadow-[0_6px_0_#1d4ed8,0_12px_22px_rgba(37,99,235,0.35)] active:translate-y-1 active:shadow-[0_2px_0_#1d4ed8,0_4px_10px_rgba(37,99,235,0.3)]'
                    : 'bg-gradient-to-b from-white via-slate-50 to-slate-100 text-blue-600 border-2 border-slate-300 shadow-[0_6px_0_#94a3b8,0_12px_22px_rgba(0,0,0,0.2)] active:translate-y-1 active:shadow-[0_2px_0_#94a3b8,0_4px_10px_rgba(0,0,0,0.15)] hover:from-white hover:to-blue-50'
                }`}
              >
                {locatingUser ? (
                  <span className="w-6 h-6 border-3 border-blue-600/30 border-t-blue-600 rounded-full animate-spin"></span>
                ) : (
                  <>
                    <BiCurrentLocation className={`text-2xl sm:text-3xl transition-transform group-hover:scale-110 ${isNearby5km ? 'text-white' : 'text-blue-600'}`} />
                    <span className={`text-[9px] font-black uppercase tracking-tight -mt-0.5 ${isNearby5km ? 'text-blue-100' : 'text-slate-600'}`}>
                      Locate
                    </span>
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
          {/* Row 1: Area Health Index */}
          {stats && (
            <div className="bg-white border border-slate-200/90 rounded-3xl p-5 sm:p-6 shadow-sm flex-1 flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between mb-2">
                  <h2 className="text-base sm:text-lg font-bold text-slate-900 m-0">
                    {isNearby5km ? 'Nearby Health Index' : selectedCity !== 'all' ? `${selectedCity} Health Index` : 'Area Health Index'}
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
    </>
  );
}
