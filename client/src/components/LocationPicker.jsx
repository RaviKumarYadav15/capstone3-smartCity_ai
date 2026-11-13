import { MapContainer, TileLayer, CircleMarker, useMapEvents, useMap } from 'react-leaflet';
import { useEffect } from 'react';

function ClickHandler({ onPick }) { useMapEvents({ click: (e) => onPick([e.latlng.lat, e.latlng.lng]) }); return null; }
function Recenter({ position }) { const map = useMap(); useEffect(() => { map.setView(position, Math.max(map.getZoom(), 14)); }, [position, map]); return null; }

export default function LocationPicker({ position, onPick }) {
  return (
    <MapContainer center={position} zoom={13} className="mini-map">
      <TileLayer attribution="© OpenStreetMap contributors" url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
      <ClickHandler onPick={onPick} />
      <Recenter position={position} />
      <CircleMarker center={position} radius={9} pathOptions={{ color: '#fff', fillColor: '#38bdf8', fillOpacity: 1 }} />
    </MapContainer>
  );
}
