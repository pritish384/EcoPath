"use client";

import { MapContainer, Marker, Popup, TileLayer } from "react-leaflet";
import type { LatLngExpression } from "leaflet";
import "leaflet/dist/leaflet.css";
import L from "leaflet";

// Fix default marker icons in Next/webpack.
const DefaultIcon = L.icon({
  iconUrl:
    "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
  iconRetinaUrl:
    "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
  shadowUrl:
    "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41],
});

L.Marker.prototype.options.icon = DefaultIcon;

export type LocationResult = {
  id: string;
  name: string;
  category: string;
  lat: number;
  lon: number;
  address?: string;
  hours?: string;
};

export function LocationMap({
  center,
  results,
}: {
  center: LatLngExpression;
  results: LocationResult[];
}) {
  return (
    <MapContainer
      center={center}
      zoom={12}
      scrollWheelZoom
      className="h-full w-full rounded-xl"
    >
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />
      {results.map((result) => (
        <Marker key={result.id} position={[result.lat, result.lon]}>
          <Popup>
            <div className="space-y-1">
              <p className="text-sm font-semibold">{result.name}</p>
              <p className="text-xs text-zinc-600">{result.category}</p>
              {result.address ? (
                <p className="text-xs text-zinc-600">{result.address}</p>
              ) : null}
              {result.hours ? (
                <p className="text-xs text-zinc-600">{result.hours}</p>
              ) : null}
            </div>
          </Popup>
        </Marker>
      ))}
    </MapContainer>
  );
}
