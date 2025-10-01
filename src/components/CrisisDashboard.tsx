import { useState, useEffect, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { SeverityBadge } from "@/components/ui/severity-badge";
import { borderClassFor } from "@/lib/severity";
import { CopyLinkButton } from "@/components/ui/copy-link-button";
import { cn } from "@/lib/utils";
import CrisisMap from "@/components/CrisisMap";
import { User } from "lucide-react";
import { useNavigate } from "react-router-dom";


import {
  AlertTriangle,
  MapPin,
  Activity,
  Bell,
  TrendingUp,
  Zap,
} from "lucide-react";
interface CrisisDashboardProps {
  username?: string; // optional prop
}

interface CrisisPost {
  id: string;
  content: string;
  author: string;
  timestamp: string;
  location: string;
  disasterType: "flood" | "fire" | "earthquake" | "storm" | "medical" | "other";
  severity: "critical" | "high" | "medium" | "low";
  coordinates: [number, number];
}

interface DisasterStats {
  type: string;
  count: number;
  trend: number;
}

  const CrisisDashboard = ({ username }: CrisisDashboardProps) => {
    const navigate = useNavigate();  // ✅ move inside component
    const isLoggedIn = Boolean(username && username.trim());
  
  // Convert each post to a 0..1 score we can color by
  const getScore = (p: any) => {
    if (typeof p.score === "number") return p.score;
    if (typeof p.modelScore === "number") return p.modelScore;
    if (typeof p.confidence === "number") return p.confidence;
    const sev = String(p.severity ?? "").toLowerCase();
    if (sev === "critical" || sev === "high") return 0.95; // urgent
    if (sev === "medium") return 0.65;                     // medium
    return 0.25;                                           // low
  };

  const [posts, setPosts] = useState<CrisisPost[]>([]);
  const [selectedFilter, setSelectedFilter] = useState<string>("all");
  const [searchTerm, setSearchTerm] = useState("");
  const [stats, setStats] = useState<DisasterStats[]>([]);
  const [activeTab, setActiveTab] = useState<"feed" | "help">("feed");
  const [acknowledged, setAcknowledged] = useState<{
    [key: string]: { time: string; responder: string };
  }>({});

  const handleAcknowledge = (id: string) => {
    const responder = prompt("Enter your name:");
    if (!responder) return;
    const time = new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
    setAcknowledged((prev) => ({ ...prev, [id]: { time, responder } }));
  };


  // New controls (demo-friendly)
  const [typeFilter, setTypeFilter] = useState<string>("all");
  const [timeWindow, setTimeWindow] = useState<number>(60);
  const [minConfidence, setMinConfidence] = useState<number>(50);
  
  
  console.log("Rendering Dashboard, username:", username);

  // Mock data
  useEffect(() => {
    const mockPosts: CrisisPost[] = [
      {
        id: "1",
        content:
          "Major flooding on Highway 101 near downtown. Water level rising rapidly. Multiple vehicles stranded.",
        author: "@emergency_watcher",
        timestamp: "2 minutes ago",
        location: "Downtown District",
        disasterType: "flood",
        severity: "critical",
        coordinates: [40.7128, -74.006],
      },
      {
        id: "2",
        content:
          "House fire reported at 123 Main Street. Fire department en route. Smoke visible from several blocks away.",
        author: "@local_resident",
        timestamp: "5 minutes ago",
        location: "Main Street",
        disasterType: "fire",
        severity: "high",
        coordinates: [40.758, -73.9855],
      },
      {
        id: "3",
        content:
          "Minor earthquake felt across the region. No immediate damage reports. Magnitude estimated at 3.2.",
        author: "@seismic_monitor",
        timestamp: "12 minutes ago",
        location: "Regional",
        disasterType: "earthquake",
        severity: "low",
        coordinates: [40.6892, -74.0445],
      },
      {
        id: "4",
        content:
          "Severe thunderstorm warning issued. Strong winds and hail expected. Take shelter immediately.",
        author: "@weather_alert",
        timestamp: "15 minutes ago",
        location: "Metro Area",
        disasterType: "storm",
        severity: "high",
        coordinates: [40.7489, -73.968],
      },
      {
        id: "5",
        content:
          "Medical emergency at Central Station. Paramedics on scene. Area cordoned off for safety.",
        author: "@transit_update",
        timestamp: "22 minutes ago",
        location: "Central Station",
        disasterType: "medical",
        severity: "medium",
        coordinates: [40.7505, -73.9934],
      },
    ];

    const mockStats: DisasterStats[] = [
      { type: "Flood", count: 12, trend: 25 },
      { type: "Fire", count: 8, trend: -10 },
      { type: "Storm", count: 15, trend: 45 },
      { type: "Medical", count: 6, trend: 5 },
      { type: "Earthquake", count: 3, trend: -20 },
    ];

    setPosts(mockPosts);
    setStats(mockStats);
  }, []);

  // Confidence proxy (demo): map severity → confidence %
  const severityConfidence: Record<CrisisPost["severity"], number> = {
    critical: 90,
    high: 75,
    medium: 60,
    low: 40,
  };

  const filteredPosts = posts.filter((post) => {
    const matchesLeftFilter =
      selectedFilter === "all" || post.disasterType === selectedFilter;
    const matchesTypeFilter =
      typeFilter === "all" || post.disasterType === typeFilter;
    const q = searchTerm.toLowerCase();
    const matchesSearch =
      post.content.toLowerCase().includes(q) ||
      post.location.toLowerCase().includes(q);
    const matchesConfidence = severityConfidence[post.severity] >= minConfidence;

    return (
      matchesLeftFilter && matchesTypeFilter && matchesSearch && matchesConfidence
    );
  });

  // Trending (simple count by type from filtered posts)
  const trending = useMemo(() => {
    const byType: Record<string, number> = {};
    filteredPosts.forEach((p) => {
      byType[p.disasterType] = (byType[p.disasterType] || 0) + 1;
    });
    return Object.entries(byType)
      .map(([type, count]) => ({ type, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 3);
  }, [filteredPosts]);

  // At-a-glance
  const atGlance = useMemo(() => {
    const types = new Set(filteredPosts.map((p) => p.disasterType)).size;
    const avg =
      filteredPosts.length === 0
        ? 0
        : Math.round(
            filteredPosts.reduce((s, p) => s + severityConfidence[p.severity], 0) /
              filteredPosts.length
          );
    return { posts: filteredPosts.length, types, avgConfidence: avg };
  }, [filteredPosts]);

  const helpRequests = filteredPosts.filter(
    (post) => post.severity === "critical" || post.severity === "high"
  );

  return (
    <div className="min-h-screen bg-gray-50">
      {/* HERO HEADER */}
      <div className="relative h-72 w-full mb-10 overflow-hidden">
        <img
          src="/header-bg.jpg"
          alt="Crisis background"
          className="absolute inset-0 w-full h-full object-cover"
        />
        <div className="absolute inset-0 bg-black/30" />
        <div className="absolute inset-0 bg-gradient-to-r from-red-300/55 to-red-200/35" />
        <div className="relative z-10 h-full flex items-center justify-between px-8">
          <div>
            <h1 className="text-6xl font-extrabold text-red-900 drop-shadow">
              Crisis Response Dashboard
            </h1>
            <p className="text-red-100 mt-2 text-lg">
              Real-time social media monitoring for emergency response
            </p>
          
        </div>
        <div className="flex items-center gap-3"></div>
          {/* Alerts button */}
  <Button
    variant="secondary"
    className="bg-white/20 text-white hover:bg-white/30"
  >
    <Bell className="h-4 w-4 mr-2" />
    Alerts (3)
  </Button>

  {/* Login/Switch User button */}
  <Button
    variant="secondary"
    className="bg-white/20 text-white hover:bg-white/30"
    onClick={() => navigate("/login")}
  >
    <User className="h-4 w-4 mr-2" />
    Login
  </Button>
</div>
      </div>

      {/* KPI CARDS */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-10 px-6">
        <Card className="bg-white border border-red-200 shadow-sm rounded-xl">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-red-600">Active Incidents</p>
                <p className="text-3xl font-bold text-red-800">23</p>
              </div>
              <Activity className="h-9 w-9 text-red-600" />
            </div>
            <p className="text-xs text-red-500 mt-2">↑ 12% from last hour</p>
          </CardContent>
        </Card>

        <Card className="bg-white border border-red-300 shadow-sm rounded-xl">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-red-600">Critical Alerts</p>
                <p className="text-3xl font-bold text-red-700">5</p>
              </div>
              <AlertTriangle className="h-9 w-9 text-red-700" />
            </div>
            <p className="text-xs text-red-500 mt-2">↑ 2 new alerts</p>
          </CardContent>
        </Card>

        <Card className="bg-white border border-red-200 shadow-sm rounded-xl">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-red-600">Posts Analyzed</p>
                <p className="text-3xl font-bold text-red-800">1,247</p>
              </div>
              <TrendingUp className="h-9 w-9 text-red-600" />
            </div>
            <p className="text-xs text-red-500 mt-2">↑ 15% accuracy</p>
          </CardContent>
        </Card>
      </div>

      {/* CONTROLS + MAP + TRENDING ROW */}
      <div className="px-6 grid grid-cols-1 lg:grid-cols-3 gap-6 mb-10">
        {/* Trending / At-a-glance */}
        <div className="space-y-6">
          <Card className="bg-white border border-red-200 shadow-sm rounded-xl">
            <CardHeader className="pb-2">
              <CardTitle className="text-red-800">
                Trending (last {timeWindow}m)
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {trending.length === 0 ? (
                <p className="text-sm text-red-500">No trends in view.</p>
              ) : (
                trending.map((t) => (
                  <div
                    key={t.type}
                    className="flex items-center justify-between text-red-700"
                  >
                    <span className="capitalize">{t.type}</span>
                    <span className="text-sm">{t.count}</span>
                  </div>
                ))
              )}
            </CardContent>
          </Card>

          <Card className="bg-white border border-red-200 shadow-sm rounded-xl">
            <CardHeader className="pb-2">
              <CardTitle className="text-red-800">At a glance</CardTitle>
            </CardHeader>
            <CardContent className="grid grid-cols-3 gap-3">
              <div className="rounded-md border border-red-200 p-3 text-center">
                <p className="text-xs text-red-600">posts in view</p>
                <p className="text-xl font-bold text-red-800">{atGlance.posts}</p>
              </div>
              <div className="rounded-md border border-red-200 p-3 text-center">
                <p className="text-xs text-red-600">types</p>
                <p className="text-xl font-bold text-red-800">{atGlance.types}</p>
              </div>
              <div className="rounded-md border border-red-200 p-3 text-center">
                <p className="text-xs text-red-600">avg confidence</p>
                <p className="text-xl font-bold text-red-800">
                  {atGlance.avgConfidence}%
                </p>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Map (Heatmap) */}
        <Card className="lg:col-span-2 bg-white border border-red-200 shadow-sm rounded-xl">
          <CardHeader className="pb-2">
            <CardTitle className="text-red-800">Heatmap</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="rounded-md overflow-hidden border border-red-100">
              <CrisisMap
              />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* FEED + RIGHT SIDEBAR */}
      <div className="px-6 grid grid-cols-1 lg:grid-cols-3 gap-6 pb-12">
        {/* FEED */}
        <div className="lg:col-span-2">
          <Card className="bg-white border border-red-200 shadow-sm rounded-xl">
            <CardHeader>
              <CardTitle className="text-red-800">
                {activeTab === "feed" ? "Live Crisis Feed" : "Urgent Help Requests"}
              </CardTitle>
              <div className="flex gap-2 mt-3">
                <Button
                  onClick={() => setActiveTab("feed")}
                  className={`px-4 py-2 rounded-lg ${
                    activeTab === "feed"
                      ? "bg-red-600 text-white"
                      : "border border-red-300 text-red-700 hover:bg-red-50"
                  }`}
                >
                  Live Feed
                </Button>
                <Button
                  onClick={() => setActiveTab("help")}
                  className={`px-4 py-2 rounded-lg ${
                    activeTab === "help"
                      ? "bg-red-600 text-white"
                      : "border border-red-300 text-red-700 hover:bg-red-50"
                  }`}
                >
                  Help Requests
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <ScrollArea className="h-[600px] pr-4">
                <div className="space-y-4">
                  {(activeTab === "feed" ? filteredPosts : helpRequests).map((post) => (
                    <div
                      key={post.id}
                      className={cn(
                        "border rounded-lg p-4 shadow-sm",
                        activeTab === "help" ? "bg-red-50" : "bg-white",
                        borderClassFor(getScore(post)) // colored left border
                      )}
                    >
                      <div className="flex items-start justify-between mb-3">
                        <div>
                          <SeverityBadge score={getScore(post)} />
                          <p className="text-sm text-red-500 mt-1">
                            {post.author} • {post.timestamp}
                          </p>
                        </div>

                        <div className="flex items-center gap-2">
                          {post.id && <CopyLinkButton id={String(post.id)} />}
                          <div className="flex items-center gap-1 text-red-500">
                            <MapPin className="h-4 w-4" />
                            <span className="text-sm">{post.location}</span>
                          </div>
                        </div>
                      </div>

                      <p className="text-red-900 leading-relaxed">{post.content}</p>

                      {activeTab === "help" && (
                        <>
                          {acknowledged[post.id] ? (
                            <p className="mt-3 text-green-600 font-medium">
                              ✅ Acknowledged by {acknowledged[post.id].responder} at {acknowledged[post.id].time}
                            </p>
                          ) : (
                            <Button
                              className="mt-3 bg-red-600 text-white hover:bg-red-700"
                              onClick={() => handleAcknowledge(post.id)}
                            >
                              Respond
                            </Button>
                          )}
                        </>
                      )}
                    </div>
                  ))}

                  {activeTab === "help" && helpRequests.length === 0 && (
                    <p className="text-sm text-red-500">No urgent help requests.</p>
                  )}
                </div>
              </ScrollArea>
            </CardContent>
          </Card>
        </div>
        {/* MAP */}
        
        {/* RIGHT SIDEBAR */}
        <div className="space-y-6">
          <Card className="bg-white border border-red-200 shadow-sm rounded-xl">
            <CardHeader>
              <CardTitle className="text-red-800">Disaster Analytics</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {stats.map((stat) => (
                  <div key={stat.type} className="flex items-center justify-between">
                    <p className="font-medium text-red-700">{stat.type}</p>
                    <div
                      className={`flex items-center gap-1 text-sm ${
                        stat.trend > 0 ? "text-red-600" : "text-red-400"
                      }`}
                    >
                      <TrendingUp
                        className={`h-3 w-3 ${stat.trend < 0 ? "rotate-180" : ""}`}
                      />
                      <span>{Math.abs(stat.trend)}%</span>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          <Card className="bg-white border border-red-200 shadow-sm rounded-xl">
            <CardHeader>
              <CardTitle className="text-red-800">Quick Actions</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <Button className="w-full bg-red-600 hover:bg-red-700 text-white">
                <AlertTriangle className="h-4 w-4 mr-2" />
                Create Alert
              </Button>
              <Button className="w-full bg-red-500 hover:bg-red-600 text-white">
                <Activity className="h-4 w-4 mr-2" />
                Analytics Report
              </Button>
              <Button className="w-full bg-red-400 hover:bg-red-500 text-white">
                <Zap className="h-4 w-4 mr-2" />
                AI Insights
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default CrisisDashboard;

