import { MapContainer, TileLayer, CircleMarker, Popup } from 'react-leaflet';
import { DEFAULT_CENTER, EMOJI, SEVERITY_COLOR } from '../utils/format.js';

export const LAYERS = {
  light: { name: 'Clean Map (CARTO)', url: 'https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png', attr: '© OpenStreetMap contributors © CARTO' },
  osm: { name: 'OpenStreetMap (Standard)', url: 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', attr: '© OpenStreetMap contributors' },
};

export default function ReportsMap({ reports, layer }) {
  const first = reports[0];
  const center = first ? [first.lat, first.lng] : DEFAULT_CENTER;
  const l = LAYERS[layer] || LAYERS.light;
  return (
    <MapContainer center={center} zoom={13} className="map">
      <TileLayer key={layer} attribution={l.attr} url={l.url} />
      {reports.map((r) => (
        <CircleMarker
          key={r.id}
          center={[r.lat, r.lng]}
          radius={11}
          pathOptions={{
            color: '#ffffff',
            weight: 2.5,
            fillColor: SEVERITY_COLOR[r.severity] || '#059669',
            fillOpacity: 0.95,
          }}
        >
          <Popup>
            <div className="p-1">
              <strong className="text-slate-900 font-bold block mb-1">
                {EMOJI[r.category]} {r.category}
              </strong>
              <p className="text-xs text-slate-600 m-0 mb-1.5 leading-relaxed">
                {r.description.slice(0, 120)}{r.description.length > 120 ? '…' : ''}
              </p>
              <div className="flex items-center gap-1.5 text-xs text-slate-500 font-semibold">
                <span className="capitalize">{r.severity}</span>
                <span>•</span>
                <span className="capitalize">{r.status.replace(/_/g, ' ')}</span>
              </div>
            </div>
          </Popup>
        </CircleMarker>
      ))}
    </MapContainer>
  );
}
