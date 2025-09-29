import React, { useEffect, useRef, useState } from 'react';
import mapboxgl from 'mapbox-gl';
import 'mapbox-gl/dist/mapbox-gl.css';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { MapPin, Settings, Eye, EyeOff } from "lucide-react";

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
  const [mapboxToken, setMapboxToken] = useState<string>('');
  const [isMapReady, setIsMapReady] = useState(false);
  const [showTokenInput, setShowTokenInput] = useState(true);
  const markersRef = useRef<mapboxgl.Marker[]>([]);

  // Mock incidents if none provided
  const defaultIncidents: CrisisIncident[] = [
    {
      id: "1",
      type: "flood",
      severity: "critical",
      coordinates: [-74.0060, 40.7128],
      location: "New York, NY",
      description: "Major flooding on Highway 101",
      timestamp: "2 min ago"
    },
    {
      id: "2", 
      type: "fire",
      severity: "high",
      coordinates: [-73.9855, 40.7580],
      location: "Manhattan, NY",
      description: "House fire at 123 Main Street",
      timestamp: "5 min ago"
    },
    {
      id: "3",
      type: "earthquake",
      severity: "low", 
      coordinates: [-74.0445, 40.6892],
      location: "Brooklyn, NY",
      description: "Minor earthquake felt across region",
      timestamp: "12 min ago"
    },
    {
      id: "4",
      type: "storm",
      severity: "high",
      coordinates: [-73.9680, 40.7489],
      location: "Queens, NY", 
      description: "Severe thunderstorm warning issued",
      timestamp: "15 min ago"
    },
    {
      id: "5",
      type: "medical",
      severity: "medium",
      coordinates: [-73.9934, 40.7505],
      location: "Central Station",
      description: "Medical emergency at transit hub",
      timestamp: "22 min ago"
    }
  ];

  const currentIncidents = incidents.length > 0 ? incidents : defaultIncidents;

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case "critical": return "#dc2626"; // red-600
      case "high": return "#ea580c";     // orange-600
      case "medium": return "#ca8a04";   // yellow-600
      case "low": return "#16a34a";      // green-600
      default: return "#6b7280";         // gray-500
    }
  };

  const getDisasterEmoji = (type: string) => {
    switch (type) {
      case "flood": return "🌊";
      case "fire": return "🔥";
      case "earthquake": return "🌍";
      case "storm": return "⚡";
      case "medical": return "🚑";
      default: return "⚠️";
    }
  };

  const initializeMap = () => {
    if (!mapContainer.current || !mapboxToken.trim()) return;

    mapboxgl.accessToken = mapboxToken.trim();
    
    map.current = new mapboxgl.Map({
      container: mapContainer.current,
      style: 'mapbox://styles/mapbox/light-v11',
      center: [-73.9857, 40.7484], // NYC center
      zoom: 11,
      pitch: 45,
    });

    // Add navigation controls
    map.current.addControl(
      new mapboxgl.NavigationControl({
        visualizePitch: true,
      }),
      'top-right'
    );

    map.current.on('load', () => {
      setIsMapReady(true);
      addIncidentMarkers();
    });
  };

  const addIncidentMarkers = () => {
    if (!map.current) return;

    // Clear existing markers
    markersRef.current.forEach(marker => marker.remove());
    markersRef.current = [];

    currentIncidents.forEach((incident) => {
      // Create custom marker element
      const markerElement = document.createElement('div');
      markerElement.className = 'crisis-marker';
      markerElement.style.cssText = `
        width: 40px;
        height: 40px;
        border-radius: 50%;
        background-color: ${getSeverityColor(incident.severity)};
        border: 3px solid white;
        display: flex;
        align-items: center;
        justify-content: center;
        font-size: 16px;
        cursor: pointer;
        box-shadow: 0 4px 8px rgba(0,0,0,0.3);
        animation: markerPulse 2s infinite;
      `;
      
      // Add keyframes for marker animation
      if (!document.getElementById('marker-keyframes')) {
        const style = document.createElement('style');
        style.id = 'marker-keyframes';
        style.textContent = `
          @keyframes markerPulse {
            0% { transform: scale(1); }
            50% { transform: scale(1.1); }
            100% { transform: scale(1); }
          }
        `;
        document.head.appendChild(style);
      }
      markerElement.innerHTML = getDisasterEmoji(incident.type);

      // Create popup
      const popup = new mapboxgl.Popup({
        offset: 25,
        closeButton: true,
        closeOnClick: false
      }).setHTML(`
        <div class="p-3 min-w-[250px]">
          <div class="flex items-center gap-2 mb-2">
            <span class="text-lg">${getDisasterEmoji(incident.type)}</span>
            <span class="px-2 py-1 text-xs font-bold text-white rounded" 
                  style="background-color: ${getSeverityColor(incident.severity)}">
              ${incident.severity.toUpperCase()}
            </span>
          </div>
          <h3 class="font-semibold text-gray-900 mb-1">${incident.location}</h3>
          <p class="text-sm text-gray-600 mb-2">${incident.description}</p>
          <div class="flex items-center gap-2 text-xs text-gray-500">
            <span>🕒 ${incident.timestamp}</span>
            <span>📍 ${incident.coordinates[1].toFixed(4)}, ${incident.coordinates[0].toFixed(4)}</span>
          </div>
        </div>
      `);

      // Create marker
      const marker = new mapboxgl.Marker(markerElement)
        .setLngLat(incident.coordinates)
        .setPopup(popup)
        .addTo(map.current!);

      markersRef.current.push(marker);
    });
  };

  useEffect(() => {
    if (mapboxToken && !map.current) {
      initializeMap();
    }
  }, [mapboxToken]);

  useEffect(() => {
    if (isMapReady) {
      addIncidentMarkers();
    }
  }, [currentIncidents, isMapReady]);

  // Cleanup
  useEffect(() => {
    return () => {
      map.current?.remove();
    };
  }, []);

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
            <Button 
              onClick={() => mapboxToken && initializeMap()} 
              disabled={!mapboxToken.trim()}
              className="w-full"
            >
              Initialize Map
            </Button>
          </div>
          <p className="text-xs text-muted-foreground mt-4">
            Get your token at{' '}
            <a 
              href="https://mapbox.com/" 
              target="_blank" 
              rel="noopener noreferrer"
              className="text-primary hover:underline"
            >
              mapbox.com
            </a>
          </p>
        </CardContent>
      </Card>
    );
  }

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
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowTokenInput(!showTokenInput)}
            >
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
            style={{
              background: mapboxToken ? 'transparent' : '#f8f9fa'
            }}
          />
          
          {/* Legend */}
          <div className="absolute bottom-4 left-4 bg-white/95 backdrop-blur-sm rounded-lg p-3 shadow-lg border">
            <h4 className="text-xs font-semibold text-gray-700 mb-2">Severity Levels</h4>
            <div className="space-y-1">
              {['critical', 'high', 'medium', 'low'].map((severity) => (
                <div key={severity} className="flex items-center gap-2 text-xs">
                  <div 
                    className="w-3 h-3 rounded-full border border-white"
                    style={{ backgroundColor: getSeverityColor(severity) }}
                  />
                  <span className="capitalize text-gray-600">{severity}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Live indicator */}
          <div className="absolute top-4 left-4 bg-white/95 backdrop-blur-sm rounded-lg px-3 py-2 shadow-lg border">
            <div className="flex items-center gap-2 text-xs">
              <div className="w-2 h-2 bg-success rounded-full animate-pulse"></div>
              <span className="text-gray-600 font-medium">Live Tracking</span>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default CrisisMap;