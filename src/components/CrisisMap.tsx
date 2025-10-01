// src/components/CrisisMap.tsx
import React, { useEffect, useRef, useState } from "react";
import mapboxgl from "mapbox-gl";
import "mapbox-gl/dist/mapbox-gl.css";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { MapPin, Settings, Eye, EyeOff } from "lucide-react";
import { scoreToSeverity, severityStyles } from "@/lib/severity";

interface CrisisIncident {
  id: string;
  type: "flood" | "fire" | "earthquake" | "storm" | "medical" | "other";
  severity: "critical" | "high" | "medium" | "low";
  coordinates: [number, number];
  location: string;
  description: string;
  timestamp: string;
}

interface CrisisMapProps {
  incidents?: CrisisIncident[];
}

const CrisisMap: React.FC<CrisisMapProps> = ({ incidents = [] }) => {
  const mapContainer = useRef<HTMLDivElement>(null);
  const map = useRef<mapboxgl.Map | null>(null);
  const [mapboxToken, setMapboxToken] = useState<string>("");
  const [isMapReady, setIsMapReady] = useState(false);
  const [showTokenInput, setShowTokenInput] = useState(true);
  const markersRef = useRef<mapboxgl.Marker[]>([]);

  // Mock incidents if none provided
  const defaultIncidents: CrisisIncident[] = [
    {
      id: "1",
      type: "flood",
      severity: "critical",
      coordinates: [-74.006, 40.7128],
      location: "New York, NY",
      description: "Major flooding on Highway 101",
      timestamp: "2 min ago",
    },
    {
      id: "2",
      type: "fire",
      severity: "high",
      coordinates: [-73.9855, 40.758],
      location: "Manhattan, NY",
      description: "House fire at 123 Main Street",
      timestamp: "5 min ago",
    },
    {
      id: "3",
      type: "earthquake",
      severity: "low",
      coordinates: [-74.0445, 40.6892],
      location: "Brooklyn, NY",
      description: "Minor earthquake felt across region",
      timestamp: "12 min ago",
    },
    {
      id: "4",
      type: "storm",
      severity: "high",
      coordinates: [-73.968, 40.7489],
      location: "Queens, NY",
      description: "Severe thunderstorm warning issued",
      timestamp: "15 min ago",
    },
    {
      id: "5",
      type: "medical",
      severity: "medium",
      coordinates: [-73.9934, 40.7505],
      location: "Central Station",
      description: "Medical emergency at transit hub",
      timestamp: "22 min ago",
    },
  ];

  const currentIncidents = incidents.length > 0 ? incidents : defaultIncidents;

  // map init
  const initializeMap = () => {
    if (!mapContainer.current || !mapboxToken.trim()) return;

    mapboxgl.accessToken = mapboxToken.trim();

    map.current = new mapboxgl.Map({
      container: mapContainer.current,
      style: "mapbox://styles/mapbox/light-v11",
      center: [-73.9857, 40.7484], // NYC center
      zoom: 11,
      pitch: 45,
    });

    map.current.addControl(new mapboxgl.NavigationControl({ visualizePitch: true }), "top-right");

    map.current.on("load", () => {
      setIsMapReady(true);
      addIncidentMarkers();
    });
  };

  // add color-only markers (no emoji)
  const addIncidentMarkers = () => {
    if (!map.current) return;

    // clear existing
    markersRef.current.forEach((m) => m.remove());
    markersRef.current = [];

    currentIncidents.forEach((incident) => {
      // map your 4-level incident.severity -> our 3-level (urgent/medium/low)
      const sevScore =
        incident.severity === "critical" || incident.severity === "high"
          ? 0.95
          : incident.severity === "medium"
          ? 0.65
          : 0.25;

      const sevKey = scoreToSeverity(sevScore); // "urgent" | "medium" | "low"
      const sevHex = severityStyles[sevKey].hex;

      // popup (no emoji)
      const popup = new mapboxgl.Popup({
        offset: 25,
        closeButton: true,
        closeOnClick: false,
      }).setHTML(`
        <div style="padding:12px; min-width:250px;">
          <div style="display:flex; align-items:center; gap:8px; margin-bottom:8px;">
            <span style="padding:2px 6px; font-size:10px; font-weight:700; color:#fff; border-radius:4px; background:${sevHex};">
              ${severityStyles[sevKey].label}
            </span>
            <span style="font-size:10px; text-transform:uppercase; color:#6b7280;">
              ${incident.type}
            </span>
          </div>
          <h3 style="font-weight:600; color:#111827; margin:0 0 4px 0;">${incident.location}</h3>
          <p style="font-size:12px; color:#4b5563; margin:0 0 8px 0;">${incident.description}</p>
          <div style="display:flex; align-items:center; gap:8px; font-size:11px; color:#6b7280;">
            <span>🕒 ${incident.timestamp}</span>
            <span>📍 ${incident.coordinates[1].toFixed(4)}, ${incident.coordinates[0].toFixed(4)}</span>
          </div>
        </div>
      `);

      // simple colored pin
      const marker = new mapboxgl.Marker({ color: sevHex })
        .setLngLat(incident.coordinates)
        .setPopup(popup)
        .addTo(map.current!);

      markersRef.current.push(marker);
    });
  };

  // effects
  useEffect(() => {
    if (mapboxToken && !map.current) initializeMap();
  }, [mapboxToken]);

  useEffect(() => {
    if (isMapReady) addIncidentMarkers();
  }, [currentIncidents, isMapReady]);

  useEffect(() => {
    return () => {
      map.current?.remove();
    };
  }, []);

  // token screen
  if (showTokenInput && !mapboxToken) {
    return (
      <Card className="bg-card border border-border h-[500px] flex items-center justify-center">
        <CardContent className="text-center max-w-md">
          <MapPin className="h-12 w-12 text-primary mx-auto mb-4" />
          <CardTitle className="mb-4">Configure Crisis Map</CardTitle>
          <p className="text-muted-foreground mb-4">
            Enter your Mapbox public token to display real-time incident locations.
          </p>
          <div className="space-y-3">
            <Input
              type="text"
              placeholder="pk.eyJ1IjoieW91ci11c2VybmFtZSI..."
              value={mapboxToken}
              onChange={(e) => setMapboxToken(e.target.value)}
              className="font-mono text-sm"
            />
            <Button onClick={() => mapboxToken && initializeMap()} disabled={!mapboxToken.trim()} className="w-full">
              Initialize Map
            </Button>
          </div>
          <p className="text-xs text-muted-foreground mt-4">
            Get your token at{" "}
            <a href="https://mapbox.com/" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">
              mapbox.com
            </a>
          </p>
        </CardContent>
      </Card>
    );
  }

  // normal card
  return (
    <Card className="bg-card border border-border">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <MapPin className="h-5 w-5 text-primary" />
            <CardTitle className="text-foreground">Crisis Incident Map</CardTitle>
          </div>
          <div className="flex items-center gap-2">
            <Badge variant="outline" className="text-xs">
              {currentIncidents.length} incidents
            </Badge>
            <Button variant="outline" size="sm" onClick={() => setShowTokenInput(!showTokenInput)}>
              {showTokenInput ? <EyeOff className="h-4 w-4" /> : <Settings className="h-4 w-4" />}
            </Button>
          </div>
        </div>

        {showTokenInput && (
          <div className="flex gap-2 mt-3">
            <Input
              type="text"
              placeholder="Update Mapbox token..."
              value={mapboxToken}
              onChange={(e) => setMapboxToken(e.target.value)}
              className="font-mono text-xs"
            />
            <Button size="sm" onClick={() => initializeMap()}>
              Update
            </Button>
          </div>
        )}
      </CardHeader>
      <CardContent className="p-0">
        <div className="relative">
          <div
            ref={mapContainer}
            className="w-full h-[500px] rounded-b-lg"
            style={{ background: mapboxToken ? "transparent" : "#f8f9fa" }}
          />

          {/* 3-level legend (Urgent/Medium/Low) */}
          <div className="absolute bottom-4 left-4 bg-white/95 backdrop-blur-sm rounded-lg p-3 shadow-lg border">
            <h4 className="text-xs font-semibold text-gray-700 mb-2">Severity Levels</h4>
            <div className="space-y-1 text-xs">
              {(["urgent", "medium", "low"] as const).map((key) => (
                <div key={key} className="flex items-center gap-2">
                  <div
                    className="w-3 h-3 rounded-full border border-white"
                    style={{ backgroundColor: severityStyles[key].hex }}
                  />
                  <span className="text-gray-600">{severityStyles[key].label}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Live indicator */}
          <div className="absolute top-4 left-4 bg-white/95 backdrop-blur-sm rounded-lg px-3 py-2 shadow-lg border">
            <div className="flex items-center gap-2 text-xs">
              <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
              <span className="text-gray-600 font-medium">Live Tracking</span>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default CrisisMap;
