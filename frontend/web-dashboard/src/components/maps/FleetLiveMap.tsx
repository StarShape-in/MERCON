import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { 
  Play, Pause, FastForward, Search, Navigation, 
  ExternalLink, Truck, ShieldCheck, MapPin, Gauge, Activity, ListFilter, SlidersHorizontal
} from 'lucide-react';

import { SimulatedTruckTelemetry } from '@/services/telemetrySimulator';
import { useSimulatedTelemetry } from '@/hooks/useSimulatedTelemetry';

// Shadcn UI components
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '@/components/ui/select';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Tooltip, TooltipTrigger, TooltipContent, TooltipProvider } from '@/components/ui/tooltip';
import { Progress } from '@/components/ui/progress';
import { Table, TableHeader, TableBody, TableHead, TableRow, TableCell } from '@/components/ui/table';
import StatusBadge from '@/components/ui/StatusBadge';

// Custom SVG HTML marker generator for simulated trucks
function createTruckDivIcon(truck: SimulatedTruckTelemetry) {
  let color = '#E8450F'; // Default brand orange
  let pulseAnimation = 'animate-pulse';
  
  if (truck.status === 'AtPickup') {
    color = '#2563EB'; // Blue
    pulseAnimation = '';
  } else if (truck.status === 'Idle') {
    color = '#6E6E80'; // Muted
    pulseAnimation = '';
  } else if (truck.status === 'Completed') {
    color = '#16A34A'; // Green
    pulseAnimation = '';
  }

  const svgIconHtml = `
    <div style="position: relative; width: 42px; height: 42px; display: flex; align-items: center; justify-content: center;">
      ${truck.status === 'InTransit' ? `<div class="${pulseAnimation}" style="position: absolute; width: 42px; height: 42px; border-radius: 50%; background-color: ${color}33; border: 1.5px solid ${color};"></div>` : ''}
      <div style="width: 32px; height: 32px; border-radius: 50%; background-color: ${color}; color: white; display: flex; align-items: center; justify-content: center; box-shadow: 0 4px 10px rgba(0,0,0,0.35); border: 2px solid white; transform: rotate(${truck.heading}deg); transition: transform 0.3s ease;">
        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polygon points="3 11 22 2 13 21 11 13 3 11"/></svg>
      </div>
      <div style="position: absolute; bottom: -4px; background: #1C1C2E; color: white; font-size: 8px; font-weight: 800; padding: 1px 4px; border-radius: 4px; white-space: nowrap; border: 1px solid rgba(255,255,255,0.2);">
        ${truck.plateNumber}
      </div>
    </div>
  `;

  return L.divIcon({
    html: svgIconHtml,
    className: '',
    iconSize: [42, 42],
    iconAnchor: [21, 21],
  });
}

export default function FleetLiveMap() {
  const navigate = useNavigate();
  const { fleet, isPlaying, speedMultiplier, togglePlay, changeSpeedMultiplier } = useSimulatedTelemetry(1);
  
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');

  // Filter fleet based on user input
  const filteredFleet = fleet.filter((truck) => {
    const matchesSearch =
      truck.plateNumber.toLowerCase().includes(searchQuery.toLowerCase()) ||
      truck.driverName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      truck.refId.toLowerCase().includes(searchQuery.toLowerCase());

    const matchesStatus =
      statusFilter === 'ALL' || truck.status.toUpperCase() === statusFilter.toUpperCase();

    return matchesSearch && matchesStatus;
  });

  return (
    <TooltipProvider>
      <Card className="border-black/[0.06] shadow-sm rounded-[24px] bg-white overflow-hidden shrink-0">
        <CardHeader className="border-b border-black/[0.04] pb-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-green-500 animate-ping" />
                <CardTitle className="text-base font-bold text-[#111]">Live Fleet Location Radar</CardTitle>
                <Badge variant="outline" className="text-[10px] font-mono border-green-200 bg-green-50 text-green-700">
                  REALTIME SIMULATOR
                </Badge>
              </div>
              <CardDescription className="text-xs text-[#6E6E80] mt-0.5">
                Interactive real-time positioning across Saudi Arabian freight expressways
              </CardDescription>
            </div>

            {/* Controls & Toolbar */}
            <div className="flex flex-wrap items-center gap-2">
              
              {/* Search input */}
              <div className="relative">
                <Search size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-[#6E6E80]" />
                <Input
                  type="text"
                  placeholder="Filter truck, driver..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="h-8 pl-8 pr-3 text-xs w-40 sm:w-48 bg-[#F5F5F7] border-transparent focus-visible:bg-white focus-visible:ring-[#E8450F]"
                />
              </div>

              {/* Shadcn Select Filter */}
              <Select value={statusFilter} onValueChange={(val) => setStatusFilter(val)}>
                <SelectTrigger className="h-8 text-xs w-36 bg-[#F5F5F7] border-transparent font-semibold">
                  <SelectValue placeholder="All Statuses" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ALL">All Statuses ({fleet.length})</SelectItem>
                  <SelectItem value="INTRANSIT">In Transit ({fleet.filter(f => f.status === 'InTransit').length})</SelectItem>
                  <SelectItem value="ATPICKUP">At Pickup ({fleet.filter(f => f.status === 'AtPickup').length})</SelectItem>
                  <SelectItem value="IDLE">Idle / Rest ({fleet.filter(f => f.status === 'Idle').length})</SelectItem>
                  <SelectItem value="COMPLETED">Completed ({fleet.filter(f => f.status === 'Completed').length})</SelectItem>
                </SelectContent>
              </Select>

              {/* Play/Pause Button */}
              <Tooltip>
                <TooltipTrigger>
                  <Button
                    size="sm"
                    variant={isPlaying ? "default" : "secondary"}
                    onClick={togglePlay}
                    className={`h-8 text-xs font-bold gap-1.5 ${
                      isPlaying ? 'bg-[#1C1C2E] hover:bg-black text-white' : 'bg-green-600 hover:bg-green-700 text-white'
                    }`}
                  >
                    {isPlaying ? <Pause size={12} /> : <Play size={12} />}
                    <span>{isPlaying ? 'Pause' : 'Play'}</span>
                  </Button>
                </TooltipTrigger>
                <TooltipContent>
                  <p className="text-xs">Toggle simulated GPS animation loop</p>
                </TooltipContent>
              </Tooltip>

              {/* Speed Multiplier Button */}
              <Tooltip>
                <TooltipTrigger>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => changeSpeedMultiplier(speedMultiplier === 1 ? 2 : speedMultiplier === 2 ? 5 : 1)}
                    className="h-8 text-xs font-bold gap-1 border-black/[0.08] hover:bg-[#F5F5F7]"
                  >
                    <FastForward size={12} className="text-[#E8450F]" />
                    <span>{speedMultiplier}x Speed</span>
                  </Button>
                </TooltipTrigger>
                <TooltipContent>
                  <p className="text-xs">Adjust simulation speed (1x, 2x, 5x)</p>
                </TooltipContent>
              </Tooltip>

            </div>
          </div>
        </CardHeader>

        <CardContent className="p-5 space-y-4">
          
          {/* View Mode Tabs (Radar Map | Fleet Matrix | Live Log Stream) */}
          <Tabs defaultValue="map" className="w-full">
            <div className="flex items-center justify-between mb-3">
              <TabsList className="bg-[#F5F5F7] p-1 rounded-xl">
                <TabsTrigger value="map" className="text-xs font-bold rounded-lg px-3 py-1 data-[state=active]:bg-white data-[state=active]:shadow-sm">
                  🗺️ Radar Map View
                </TabsTrigger>
                <TabsTrigger value="matrix" className="text-xs font-bold rounded-lg px-3 py-1 data-[state=active]:bg-white data-[state=active]:shadow-sm">
                  📋 Active Fleet Matrix
                </TabsTrigger>
                <TabsTrigger value="logs" className="text-xs font-bold rounded-lg px-3 py-1 data-[state=active]:bg-white data-[state=active]:shadow-sm">
                  📡 Telemetry Feed
                </TabsTrigger>
              </TabsList>

              <div className="hidden md:flex items-center gap-3 text-xs font-semibold text-[#6E6E80]">
                <span className="flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-full bg-[#E8450F] animate-ping" />
                  In Transit ({fleet.filter(f => f.status === 'InTransit').length})
                </span>
                <span className="flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-full bg-[#2563EB]" />
                  At Pickup ({fleet.filter(f => f.status === 'AtPickup').length})
                </span>
                <span className="flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-full bg-[#6E6E80]" />
                  Idle ({fleet.filter(f => f.status === 'Idle').length})
                </span>
              </div>
            </div>

            {/* TAB 1: RADAR MAP */}
            <TabsContent value="map" className="mt-0">
              <div className="h-[460px] rounded-[20px] overflow-hidden border border-black/[0.06] relative z-0 shadow-inner">
                <MapContainer
                  center={[24.5000, 44.5000]}
                  zoom={6}
                  scrollWheelZoom={true}
                  style={{ height: '100%', width: '100%', zIndex: 0 }}
                >
                  <TileLayer
                    attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                    url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                  />

                  {filteredFleet.map((truck) => (
                    <Marker
                      key={truck.tripId}
                      position={[truck.currentCoords.lat, truck.currentCoords.lng]}
                      icon={createTruckDivIcon(truck)}
                    >
                      <Popup className="fleet-map-popup" maxWidth={320}>
                        <div className="p-1 space-y-3 font-sans">
                          
                          <div className="flex items-center justify-between border-b border-gray-100 pb-2">
                            <div>
                              <span className="text-[10px] text-gray-400 font-bold uppercase tracking-wider">{truck.refId}</span>
                              <p className="text-sm font-extrabold text-[#111] leading-tight">{truck.plateNumber}</p>
                            </div>
                            <StatusBadge status={truck.status} />
                          </div>

                          <div className="grid grid-cols-2 gap-2 text-xs">
                            <div className="bg-[#F8F9FA] p-2 rounded-lg">
                              <p className="text-[9px] text-gray-400 font-bold uppercase">Driver</p>
                              <p className="font-bold text-[#111] truncate">{truck.driverName}</p>
                              <p className="text-[10px] text-gray-500">{truck.driverPhone}</p>
                            </div>
                            <div className="bg-[#F8F9FA] p-2 rounded-lg">
                              <p className="text-[9px] text-gray-400 font-bold uppercase">Speed & Progress</p>
                              <p className="font-bold text-[#E8450F] flex items-center gap-1">
                                <Gauge size={11} /> {truck.speedKmH} km/h
                              </p>
                              <p className="text-[10px] text-gray-500 font-medium">{truck.progressPercentage}% Completed</p>
                            </div>
                          </div>

                          <div className="text-xs bg-[#FFF5F2] border border-[#E8450F]/10 p-2 rounded-lg">
                            <p className="text-[9px] text-[#E8450F] font-bold uppercase tracking-wider">Logistics Route</p>
                            <p className="font-semibold text-[#111] mt-0.5 truncate">{truck.originName}</p>
                            <p className="text-[10px] text-gray-400 font-bold my-0.5">↓ Destination</p>
                            <p className="font-semibold text-[#111] truncate">{truck.destinationName}</p>
                          </div>

                          <div className="pt-1 flex gap-2">
                            <Button
                              size="sm"
                              variant="default"
                              onClick={() => navigate(`/trips/${truck.tripId}`)}
                              className="flex-1 h-8 bg-[#1C1C2E] hover:bg-black text-white text-xs font-bold gap-1"
                            >
                              <ExternalLink size={12} />
                              <span>Trip Details</span>
                            </Button>
                            <Button
                              size="sm"
                              onClick={() => navigate(`/trips/${truck.tripId}/track`)}
                              className="flex-1 h-8 bg-[#E8450F] hover:bg-[#d03d0c] text-white text-xs font-bold gap-1"
                            >
                              <Navigation size={12} />
                              <span>Live Track</span>
                            </Button>
                          </div>

                        </div>
                      </Popup>
                    </Marker>
                  ))}
                </MapContainer>

                {/* Floating Bottom Status Bar */}
                <div className="absolute bottom-3 left-3 right-3 sm:right-auto z-[400] bg-[#1C1C2E]/95 backdrop-blur text-white px-3.5 py-2 rounded-xl shadow-lg border border-white/10 text-xs flex items-center gap-3">
                  <ShieldCheck size={14} className="text-green-400 shrink-0" />
                  <span className="font-semibold">Simulated GPS Telemetry Active ({speedMultiplier}x Speed)</span>
                </div>
              </div>
            </TabsContent>

            {/* TAB 2: FLEET MATRIX TABLE */}
            <TabsContent value="matrix" className="mt-0">
              <div className="border border-black/[0.06] rounded-xl overflow-hidden min-h-[460px]">
                <Table>
                  <TableHeader className="bg-[#FAFAFA]">
                    <TableRow>
                      <TableHead className="text-[10px] uppercase font-bold text-[#9898A4]">Manifest ID</TableHead>
                      <TableHead className="text-[10px] uppercase font-bold text-[#9898A4]">Plate & Asset</TableHead>
                      <TableHead className="text-[10px] uppercase font-bold text-[#9898A4]">Driver Name</TableHead>
                      <TableHead className="text-[10px] uppercase font-bold text-[#9898A4]">Status</TableHead>
                      <TableHead className="text-[10px] uppercase font-bold text-[#9898A4]">Speed</TableHead>
                      <TableHead className="text-[10px] uppercase font-bold text-[#9898A4]">Progress</TableHead>
                      <TableHead className="text-[10px] uppercase font-bold text-[#9898A4] text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredFleet.map((truck) => (
                      <TableRow key={truck.tripId} className="hover:bg-[#FAFAFA]">
                        <TableCell className="font-mono text-xs font-bold text-[#E8450F]">{truck.refId}</TableCell>
                        <TableCell className="text-xs">
                          <p className="font-bold text-[#111]">{truck.plateNumber}</p>
                          <p className="text-[10px] text-gray-500">{truck.assetType}</p>
                        </TableCell>
                        <TableCell className="text-xs font-semibold text-[#111]">{truck.driverName}</TableCell>
                        <TableCell><StatusBadge status={truck.status} /></TableCell>
                        <TableCell className="text-xs font-bold text-[#111]">{truck.speedKmH} km/h</TableCell>
                        <TableCell className="w-36">
                          <div className="space-y-1">
                            <div className="flex justify-between text-[10px] font-bold text-gray-500">
                              <span>{truck.progressPercentage}%</span>
                              <span>{truck.distanceRemainingKm} km left</span>
                            </div>
                            <Progress value={truck.progressPercentage} className="h-1.5 bg-gray-100" />
                          </div>
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-1.5">
                            <Button size="sm" variant="ghost" className="h-7 text-xs font-bold" onClick={() => navigate(`/trips/${truck.tripId}`)}>
                              View
                            </Button>
                            <Button size="sm" className="h-7 text-xs font-bold bg-[#E8450F] hover:bg-[#d03d0c]" onClick={() => navigate(`/trips/${truck.tripId}/track`)}>
                              Track
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </TabsContent>

            {/* TAB 3: TELEMETRY LOGS */}
            <TabsContent value="logs" className="mt-0">
              <div className="bg-[#1C1C2E] text-white rounded-xl p-4 font-mono text-xs space-y-3 min-h-[460px] overflow-y-auto border border-white/10">
                <div className="flex items-center justify-between border-b border-white/10 pb-2">
                  <span className="text-[#E8450F] font-bold flex items-center gap-1.5">
                    <Activity size={14} className="animate-spin" /> LIVE TELEMETRY SIMULATION STREAM
                  </span>
                  <span className="text-[10px] text-gray-400">POLLING AT {speedMultiplier * 1000}ms</span>
                </div>
                {fleet.map((truck) => (
                  <div key={truck.tripId} className="bg-white/5 p-3 rounded-lg border border-white/5 flex flex-col sm:flex-row justify-between sm:items-center gap-2">
                    <div>
                      <span className="text-[#E8450F] font-bold">[{truck.refId}]</span> <span className="text-white font-bold">{truck.plateNumber}</span> - {truck.driverName}
                      <p className="text-[11px] text-gray-400 mt-0.5">
                        Route: {truck.originName} ➔ {truck.destinationName}
                      </p>
                    </div>
                    <div className="text-right text-[11px]">
                      <p className="text-green-400 font-bold">GPS: {truck.currentCoords.lat.toFixed(5)}, {truck.currentCoords.lng.toFixed(5)}</p>
                      <p className="text-gray-400">Speed: {truck.speedKmH} km/h • Heading: {truck.heading}°</p>
                    </div>
                  </div>
                ))}
              </div>
            </TabsContent>

          </Tabs>

        </CardContent>
      </Card>
    </TooltipProvider>
  );
}
