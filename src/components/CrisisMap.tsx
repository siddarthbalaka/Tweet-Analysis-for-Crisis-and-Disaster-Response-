import { useEffect, useState } from "react";
import { MapContainer, TileLayer, Marker, Popup } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";

// Fix default marker icon issues in React-Leaflet + Vite
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl:
    "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png",
  iconUrl:
    "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png",
  shadowUrl:
    "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png",
});

// Type definition for an incident
interface Incident {
  id: number;
  type: string;
  severity: string;
  location: string;
  coordinates: [number, number];
  description: string;
  timestamp: string;
}

// Custom colored icons by severity
const getMarkerIcon = (severity: string) =>
  L.icon({
    iconUrl:
      severity === "critical"
        ? "https://maps.google.com/mapfiles/ms/icons/red-dot.png"
        : severity === "high"
        ? "https://maps.google.com/mapfiles/ms/icons/orange-dot.png"
        : severity === "medium"
        ? "https://maps.google.com/mapfiles/ms/icons/yellow-dot.png"
        : "https://maps.google.com/mapfiles/ms/icons/green-dot.png",
    iconSize: [32, 32],
    iconAnchor: [16, 32],
    popupAnchor: [0, -32],
  });

const CrisisMap = () => {
  const [incidents, setIncidents] = useState<Incident[]>([]);

  // Fetch from your local json-server API
  useEffect(() => {
    fetch("http://localhost:5001/incidents")
      .then((res) => res.json())
      .then((data) => setIncidents(data))
      .catch((err) => console.error("Error fetching incidents:", err));
  }, []);

  return (
    <MapContainer
      center={[37.0902, -95.7129]} // USA center
      zoom={4}
      style={{ height: "500px", width: "100%" }}
    >
      <TileLayer
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        attribution='&copy; <a href="http://osm.org/copyright">OpenStreetMap</a> contributors'
      />

      {incidents.map((incident) => (
        <Marker
          key={incident.id}
          position={incident.coordinates}
          icon={getMarkerIcon(incident.severity)}
        >
          <Popup>
            <strong>{incident.type}</strong> ({incident.severity}) <br />
            📍 {incident.location} <br />
            📝 {incident.description} <br />
            ⏰ {new Date(incident.timestamp).toLocaleString()}
          </Popup>
        </Marker>
      ))}
    </MapContainer>
  );
};

export default CrisisMap;
