import React from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

export const JAKARTA_LOCATIONS = [
  { name: "Jakarta Pusat", lat: -6.1767, lon: 106.8263 },
  { name: "Jakarta Utara", lat: -6.1293, lon: 106.8762 },
  { name: "Jakarta Barat", lat: -6.1898, lon: 106.7911 },
  { name: "Jakarta Selatan", lat: -6.2497, lon: 106.7972 },
  { name: "Jakarta Timur", lat: -6.1983, lon: 106.9443 }
];

const createCustomIcon = (color, isActive) => {
  const colorMap = { safe: '#00e676', warn: '#ffb300', danger: '#ff3d71', neutral: '#64748b' };
  const hexColor = colorMap[color] || colorMap.neutral;
  
  const glowEffect = isActive 
    ? `box-shadow: 0 0 20px ${hexColor}, 0 0 40px ${hexColor}; transform: scale(1.15); border-color: #fff;` 
    : `opacity: 0.8; border-color: rgba(255,255,255,0.5);`;

  return L.divIcon({
    className: 'custom-pin',
    html: `
      <div style="
        background-color: ${hexColor};
        width: 20px; height: 20px;
        border-radius: 50%;
        border: 3px solid #ffffff; 
        transition: all 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275);
        ${glowEffect}
      "></div>
    `,
    iconSize: [26, 26], iconAnchor: [13, 13]
  });
};

function ChangeView({ center }) {
  const map = useMap();
  map.setView(center, 12);
  return null;
}

const MapView = ({ theme, onSelectLocation, currentCenter, riskLevel }) => {
  const isDark = theme === 'dark';
  // Gunakan CartoDB Dark Matter untuk tampilan gelap yang elegan
  const tileUrl = isDark 
    ? 'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png' 
    : 'https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png';

  const defaultCenter = [-6.2088, 106.8456];

  return (
    <MapContainer center={currentCenter || defaultCenter} zoom={11} style={{ height: "100%", width: "100%", background: 'transparent' }} zoomControl={false}>
      <ChangeView center={currentCenter || defaultCenter} />
      <TileLayer attribution='&copy; OpenStreetMap, &copy; CartoDB' url={tileUrl} />
      {JAKARTA_LOCATIONS.map((loc, idx) => {
        const isActive = currentCenter && currentCenter[0] === loc.lat && currentCenter[1] === loc.lon;
        const markerColor = isActive ? (riskLevel || 'safe') : 'neutral';
        return (
          <Marker key={idx} position={[loc.lat, loc.lon]} icon={createCustomIcon(markerColor, isActive)} eventHandlers={{ click: () => onSelectLocation(loc.lat, loc.lon, loc.name) }}>
            <Popup className="glass-popup">
              <div style={{textAlign:'center', fontFamily: 'var(--font-body)'}}>
                  <strong>{loc.name}</strong><br/>
                  <span style={{fontSize:'0.85rem', opacity:0.8}}>{isActive ? `Status: ${riskLevel.toUpperCase()}` : "Klik untuk Analisis"}</span>
              </div>
            </Popup>
          </Marker>
        );
      })}
    </MapContainer>
  );
};
export default MapView;