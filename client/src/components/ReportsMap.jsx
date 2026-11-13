import { useEffect, useRef } from 'react';
import { MapContainer, TileLayer, CircleMarker, Popup, useMap } from 'react-leaflet';
import { DEFAULT_CENTER, EMOJI, SEVERITY_COLOR } from '../utils/format.js';

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

function MapController({ targetLocation, targetId, markerRefs }) {
  const map = useMap();
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
  return null;
}

export default function ReportsMap({ reports, layer, targetLocation, targetId }) {
  const markerRefs = useRef({});
  const first = reports[0];
  const center = targetLocation || (first ? [first.lat, first.lng] : DEFAULT_CENTER);
  const l = LAYERS[layer] || LAYERS.osm;

  return (
    <MapContainer center={center} zoom={13} className="map">
      <TileLayer key={layer} attribution={l.attr} url={l.url} />
      <MapController targetLocation={targetLocation} targetId={targetId} markerRefs={markerRefs} />
      {reports.map((r) => {
        const isTarget = r.id === targetId;
        return (
          <CircleMarker
            key={r.id}
            ref={(ref) => {
              if (ref) markerRefs.current[r.id] = ref;
            }}
            center={[r.lat, r.lng]}
            radius={isTarget ? 15 : 11}
            pathOptions={{
              color: isTarget ? '#0284c7' : '#ffffff',
              weight: isTarget ? 3.5 : 2.5,
              fillColor: SEVERITY_COLOR[r.severity] || '#059669',
              fillOpacity: isTarget ? 1 : 0.95,
            }}
          >
            <Popup>
              <div className="p-1 min-w-[180px]">
                <strong className="text-slate-900 font-bold block mb-1">
                  {EMOJI[r.category]} {r.category}
                </strong>
                <p className="text-xs text-slate-600 m-0 mb-1.5 leading-relaxed">
                  {r.description.slice(0, 140)}{r.description.length > 140 ? '…' : ''}
                </p>
                <div className="flex items-center justify-between text-xs text-slate-500 font-semibold pt-1 border-t border-slate-100">
                  <span className="capitalize">{r.severity} Priority</span>
                  <span className="capitalize px-1.5 py-0.5 rounded bg-slate-100 text-slate-700">{r.status.replace(/_/g, ' ')}</span>
                </div>
              </div>
            </Popup>
          </CircleMarker>
        );
      })}
    </MapContainer>
  );
}
