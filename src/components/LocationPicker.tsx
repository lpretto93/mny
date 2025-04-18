import { useEffect, useState } from 'react';
import { MapContainer, TileLayer, Marker, useMapEvents } from 'react-leaflet';
import { LatLng, Icon, LeafletMouseEvent } from 'leaflet';
import 'leaflet/dist/leaflet.css';

// Fix for default marker icon
const icon = new Icon({
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
});

interface LocationPickerProps {
  location: { lat: number; lng: number };
  onLocationChange: (location: { lat: number; lng: number }) => void;
}

function LocationMarker({ location, onLocationChange }: LocationPickerProps) {
  const map = useMapEvents({
    click(e: LeafletMouseEvent) {
      onLocationChange(e.latlng);
      map.flyTo(e.latlng, map.getZoom());
    },
  });

  return location.lat !== 0 ? (
    <Marker position={location as LatLng} icon={icon} />
  ) : null;
}

export default function LocationPicker({ location, onLocationChange }: LocationPickerProps) {
  const [defaultCenter] = useState({ lat: 51.505, lng: -0.09 });

  useEffect(() => {
    if (location.lat !== 0 && location.lng !== 0) {
      defaultCenter.lat = location.lat;
      defaultCenter.lng = location.lng;
    }
  }, [location]);

  return (
    <div className="h-[300px] w-full rounded-lg overflow-hidden">
      <MapContainer
        center={location.lat !== 0 ? location : defaultCenter}
        zoom={13}
        className="h-full w-full"
      >
        <TileLayer
          attribution='&copy; <a href="https://openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        <LocationMarker location={location} onLocationChange={onLocationChange} />
      </MapContainer>
    </div>
  );
}