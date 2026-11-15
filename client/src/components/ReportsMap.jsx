import { useEffect, useRef } from 'react';
import { MapContainer, TileLayer, CircleMarker, Circle, Popup, useMap } from 'react-leaflet';
import { DEFAULT_CENTER, EMOJI, SEVERITY_COLOR, formatDateTime } from '../utils/format.js';

export const LAYERS = {
  osm: {
    name: 'OpenStreetMap (Standard)',
    url: 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',
    attr: '© OpenStreetMap contributors',
  },
  esriStreet: {
    name: 'Clean Street (Esri)',
    url: 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Street_Map/MapServer/tile/{z}/{y}/{x}',
    attr: 'Tiles © Esri',
  },
  satellite: {
    name: 'Satellite View (Esri)',
    url: 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
    attr: 'Source: Esri, Maxar, Earthstar Geographics',
  },
  topo: {
    name: 'Topographic (OpenTopo)',
    url: 'https://{s}.tile.opentopomap.org/{z}/{x}/{y}.png',
    attr: '© OpenStreetMap contributors, SRTM | © OpenTopoMap',
  },
};

function MapController({ targetLocation, targetId, markerRefs, centerLocation, zoom, fitBoundsCoords }) {
  const map = useMap();

  // 1. Target location selected (e.g. from ReportCard "Locate" click)
  useEffect(() => {
    if (targetLocation) {
      map.flyTo(targetLocation, 16, { duration: 1.2 });
      if (targetId && markerRefs.current[targetId]) {
        const timer = setTimeout(() => {
          markerRefs.current[targetId]?.openPopup();
        }, 800);
        return () => clearTimeout(timer);
      }
    }
  }, [targetLocation, targetId, map, markerRefs]);

  // 2. City center or user live location changed
  useEffect(() => {
    if (centerLocation && !targetLocation) {
      map.flyTo(centerLocation, zoom || 13, { duration: 1.2 });
    }
  }, [centerLocation, zoom, targetLocation, map]);

  // 3. Fit bounds across nationwide/all reports when "All Cities" is active
  useEffect(() => {
    if (fitBoundsCoords && fitBoundsCoords.length > 1 && !targetLocation && !centerLocation) {
      try {
        map.fitBounds(fitBoundsCoords, { padding: [40, 40], maxZoom: 14 });
      } catch {}
    }
  }, [fitBoundsCoords, targetLocation, centerLocation, map]);

  return null;
}

export default function ReportsMap({
  reports,
  layer,
  targetLocation,
  targetId,
  centerLocation,
  userLocation,
  isNearby5km,
  zoom = 13,
  fitBoundsCoords,
}) {
  const markerRefs = useRef({});
  const first = reports[0];
  const center =
    targetLocation ||
    centerLocation ||
    userLocation ||
    (first ? [first.lat, first.lng] : DEFAULT_CENTER);
  const l = LAYERS[layer] || LAYERS.osm;

  return (
    <MapContainer center={center} zoom={zoom} className="map">
      <TileLayer key={layer} attribution={l.attr} url={l.url} />
      <MapController
        targetLocation={targetLocation}
        targetId={targetId}
        markerRefs={markerRefs}
        centerLocation={centerLocation}
        zoom={zoom}
        fitBoundsCoords={fitBoundsCoords}
      />

      {/* 5 km Radius Perimeter Circle when 5km mode is active */}
      {isNearby5km && userLocation && (
        <Circle
          center={userLocation}
          radius={5000}
          pathOptions={{
            color: '#2563eb',
            weight: 2,
            dashArray: '6, 6',
            fillColor: '#3b82f6',
            fillOpacity: 0.08,
          }}
        />
      )}

      {/* Live User Location Pin */}
      {userLocation && (
        <CircleMarker
          center={userLocation}
          radius={12}
          pathOptions={{
            color: '#ffffff',
            weight: 3,
            fillColor: '#2563eb',
            fillOpacity: 0.95,
          }}
        >
          <Popup>
            <div className="p-1 min-w-[160px]">
              <strong className="text-blue-700 font-bold block mb-0.5">📍 You Are Here</strong>
              <p className="text-xs text-slate-600 m-0 leading-relaxed">
                Your live GPS coordinates. Showing civic infrastructure near you.
              </p>
            </div>
          </Popup>
        </CircleMarker>
      )}

      {reports.map((r) => {
        const isTarget = r.id === targetId;
        const isResolved = r.status === 'resolved';
        const isVerified = r.status === 'verified';

        // Resolved issues turn emerald green (matching the interactive map guide legend),
        // community-verified issues turn blue, active issues follow severity color
        const markerFillColor = isResolved
          ? '#10b981'
          : isVerified
          ? '#2563eb'
          : SEVERITY_COLOR[r.severity] || '#059669';

        const markerStrokeColor = isTarget
          ? '#0284c7'
          : isResolved
          ? '#047857'
          : isVerified
          ? '#1d4ed8'
          : '#ffffff';

        return (
          <CircleMarker
            key={`${r.id}-${r.status}-${isTarget}`}
            ref={(ref) => {
              if (ref) markerRefs.current[r.id] = ref;
            }}
            center={[r.lat, r.lng]}
            radius={isTarget ? 15 : isResolved ? 10 : 11}
            pathOptions={{
              color: markerStrokeColor,
              weight: isTarget ? 3.5 : 2.5,
              fillColor: markerFillColor,
              fillOpacity: isResolved ? 0.9 : 0.95,
            }}
          >
            <Popup>
              <div className="p-1 min-w-[200px]">
                <div className="flex items-center justify-between gap-1.5 mb-1.5">
                  <strong className="text-slate-900 font-bold block text-xs sm:text-sm">
                    {EMOJI[r.category]} {r.category}
                  </strong>
                  <span
                    className={`capitalize px-2 py-0.5 rounded-full text-[10px] font-bold tracking-wider shrink-0 ${
                      isResolved
                        ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                        : isVerified
                        ? 'bg-blue-100 text-blue-800 border border-blue-300'
                        : 'bg-slate-100 text-slate-700 border border-slate-200'
                    }`}
                  >
                    {isResolved ? '✓ Resolved' : isVerified ? '✓ Verified' : r.status.replace(/_/g, ' ')}
                  </span>
                </div>
                <p className="text-xs text-slate-600 m-0 mb-2 leading-relaxed">
                  {r.description.slice(0, 140)}{r.description.length > 140 ? '…' : ''}
                </p>
                <div className="flex items-center justify-between text-xs text-slate-500 font-semibold pt-1.5 border-t border-slate-100">
                  <span className="capitalize">{r.severity} Priority</span>
                  <span className="text-[10px] text-slate-400 font-normal">
                    {formatDateTime(r.createdAt)}
                  </span>
                </div>
                {isResolved && r.resolvedAt && (
                  <div className="text-[10px] text-emerald-700 font-semibold mt-1">
                    ✓ Closed on {formatDateTime(r.resolvedAt)}
                  </div>
                )}
                {r.resolutionNotes && (
                  <div className="mt-1.5 p-1.5 rounded-lg bg-emerald-50 border border-emerald-200 text-[11px] text-emerald-900 leading-snug">
                    <strong className="text-emerald-800">Resolution:</strong> {r.resolutionNotes}
                  </div>
                )}
              </div>
            </Popup>
          </CircleMarker>
        );
      })}
    </MapContainer>
  );
}
