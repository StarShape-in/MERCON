import { useState } from 'react';
import {
  Radio,
  Navigation,
  Truck,
  Clock,
  ArrowRight,
  ChevronRight,
  Compass,
  MapPin,
  Flame,
  Activity,
  Layers,
  Sparkles,
  Maximize2,
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Link } from 'react-router-dom';

interface LiveTruck {
  id: string;
  ref_id: string;
  driverName: string;
  plateNumber: string;
  origin: string;
  destination: string;
  cargo: string;
  speed: number;
  progressPercent: number;
  eta: string;
  status: 'InTransit' | 'AtDelivery';
  statusLabel: string;
  fuel: number;
  temp: string;
  coords: { x: number; y: number }; // Relative coordinates on tactical radar
}

const LIVE_TRUCKS: LiveTruck[] = [
  {
    id: '1',
    ref_id: 'TRP-9481',
    driverName: 'Tariq Al-Otaibi',
    plateNumber: 'TRK-882',
    origin: 'Riyadh Hub',
    destination: 'Jeddah Port',
    cargo: 'High-Tech Cargo (14T)',
    speed: 86,
    progressPercent: 68,
    eta: '18:45 (in 1h 40m)',
    status: 'InTransit',
    statusLabel: 'Highway 40 Westbound',
    fuel: 78,
    temp: '4.2°C',
    coords: { x: 42, y: 55 },
  },
  {
    id: '2',
    ref_id: 'TRP-9482',
    driverName: 'Ahmed Mansoor',
    plateNumber: 'TRK-104',
    origin: 'Dammam Yard',
    destination: 'Jubail Industrial',
    cargo: 'Industrial Polymers (22T)',
    speed: 72,
    progressPercent: 91,
    eta: '16:15 (in 25m)',
    status: 'AtDelivery',
    statusLabel: 'Approaching Gate 4',
    fuel: 85,
    temp: 'Ambient',
    coords: { x: 78, y: 38 },
  },
  {
    id: '3',
    ref_id: 'TRP-9483',
    driverName: 'Zaid Al-Ghamdi',
    plateNumber: 'TRK-319',
    origin: 'Yanbu Terminal',
    destination: 'Medina Depot',
    cargo: 'Chilled Dairy (18T)',
    speed: 68,
    progressPercent: 35,
    eta: '20:10 (in 3h 15m)',
    status: 'InTransit',
    statusLabel: 'Passing Badr Pass',
    fuel: 62,
    temp: '2.8°C',
    coords: { x: 26, y: 44 },
  },
];

export default function SahalLiveOperations() {
  const [selectedTruck, setSelectedTruck] = useState<LiveTruck>(LIVE_TRUCKS[0]);
  const [viewMode, setViewMode] = useState<'map' | 'list'>('map');

  return (
    <div className="rounded-3xl border border-slate-200/80 dark:border-slate-800/80 bg-gradient-to-b from-white via-slate-50/50 to-white dark:from-slate-900 dark:via-slate-900/90 dark:to-slate-950 p-5 shadow-sm relative overflow-hidden flex flex-col justify-between">
      {/* Background ambient glow */}
      <div className="absolute top-0 right-0 w-60 h-60 bg-emerald-500/5 dark:bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />

      {/* Header bar */}
      <div className="relative z-10">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="relative flex items-center justify-center">
              <span className="animate-ping absolute inline-flex h-5 w-5 rounded-full bg-emerald-400 opacity-75" />
              <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-emerald-600 to-teal-400 text-white flex items-center justify-center font-bold relative shadow-md shadow-emerald-500/20">
                <Radio size={20} className="stroke-[2.5]" />
              </div>
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-black text-slate-900 dark:text-white tracking-tight">
                  Tactical Live Radar
                </h2>
                <Badge className="bg-emerald-500 text-white font-black text-[10px] px-2 py-0.5 animate-pulse">
                  18 Trucks En Route
                </Badge>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Live GPS telemetry & route vector map
              </p>
            </div>
          </div>

          {/* View Mode Toggle */}
          <div className="flex items-center gap-1 bg-slate-100 dark:bg-slate-800 p-1 rounded-xl text-xs font-semibold">
            <button
              onClick={() => setViewMode('map')}
              className={`px-2.5 py-1 rounded-lg transition-all ${
                viewMode === 'map'
                  ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-xs'
                  : 'text-slate-500 dark:text-slate-400'
              }`}
            >
              Radar Map
            </button>
            <button
              onClick={() => setViewMode('list')}
              className={`px-2.5 py-1 rounded-lg transition-all ${
                viewMode === 'list'
                  ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-xs'
                  : 'text-slate-500 dark:text-slate-400'
              }`}
            >
              Feed
            </button>
          </div>
        </div>

        {/* Tactical Dark Vector Radar Canvas */}
        {viewMode === 'map' ? (
          <div className="relative my-4 h-[180px] w-full rounded-2xl bg-slate-950 border border-slate-800 overflow-hidden shadow-inner flex items-center justify-center select-none group">
            {/* Grid Lines */}
            <div className="absolute inset-0 bg-[radial-gradient(#334155_1px,transparent_1px)] [background-size:16px_16px] opacity-40" />

            {/* Radar Circular Scanning Rings */}
            <div className="absolute w-40 h-40 rounded-full border border-emerald-500/20" />
            <div className="absolute w-72 h-72 rounded-full border border-emerald-500/10" />

            {/* Route Arteries SVG (Saudi Main Highway Corridors) */}
            <svg className="absolute inset-0 w-full h-full pointer-events-none" viewBox="0 0 100 100" preserveAspectRatio="none">
              {/* Riyadh to Jeddah */}
              <line x1="45" y1="50" x2="20" y2="65" stroke="#10B981" strokeWidth="1" strokeDasharray="2 2" strokeOpacity="0.6" />
              {/* Riyadh to Dammam */}
              <line x1="45" y1="50" x2="80" y2="40" stroke="#10B981" strokeWidth="1" strokeDasharray="2 2" strokeOpacity="0.6" />
              {/* Jeddah to Medina */}
              <line x1="20" y1="65" x2="25" y2="35" stroke="#10B981" strokeWidth="1" strokeDasharray="2 2" strokeOpacity="0.6" />
            </svg>

            {/* Saudi Major Hub Markers */}
            <div className="absolute top-[48%] left-[44%] text-[9px] font-bold text-slate-400 flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-slate-500" /> Riyadh
            </div>
            <div className="absolute top-[63%] left-[18%] text-[9px] font-bold text-slate-400 flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-slate-500" /> Jeddah
            </div>
            <div className="absolute top-[37%] left-[78%] text-[9px] font-bold text-slate-400 flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-slate-500" /> Dammam
            </div>

            {/* Moving Truck Pins with pulsing glows */}
            {LIVE_TRUCKS.map(truck => {
              const isSelected = selectedTruck.id === truck.id;
              return (
                <div
                  key={truck.id}
                  onClick={() => setSelectedTruck(truck)}
                  style={{ top: `${truck.coords.y}%`, left: `${truck.coords.x}%` }}
                  className="absolute -translate-x-1/2 -translate-y-1/2 cursor-pointer z-20 group/pin transition-all hover:scale-125"
                  title={`${truck.plateNumber} • ${truck.speed} km/h`}
                >
                  <span className={`absolute -inset-1 rounded-full animate-ping ${isSelected ? 'bg-emerald-400 opacity-80' : 'bg-teal-400 opacity-40'}`} />
                  <div
                    className={`px-2 py-0.5 rounded-full text-[9px] font-bold text-white flex items-center gap-1 shadow-lg ${
                      isSelected
                        ? 'bg-gradient-to-r from-emerald-500 to-teal-400 ring-2 ring-white/60'
                        : 'bg-slate-800 border border-slate-700'
                    }`}
                  >
                    <Truck size={10} />
                    <span>{truck.plateNumber}</span>
                  </div>
                </div>
              );
            })}

            {/* Radar Telemetry Watermark */}
            <div className="absolute bottom-2 left-3 text-[10px] font-mono text-emerald-500/80 font-bold flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
              LIVE TELEMETRY FEED • 24.7136° N, 46.6753° E
            </div>
          </div>
        ) : (
          <div className="my-4 space-y-2 max-h-[180px] overflow-y-auto pr-1">
            {LIVE_TRUCKS.map(truck => (
              <div
                key={truck.id}
                onClick={() => setSelectedTruck(truck)}
                className={`p-2.5 rounded-2xl border transition-all cursor-pointer ${
                  selectedTruck.id === truck.id
                    ? 'bg-emerald-500/10 border-emerald-500/30'
                    : 'bg-slate-100/50 dark:bg-slate-800/40 border-slate-200 dark:border-slate-800'
                }`}
              >
                <div className="flex items-center justify-between text-xs font-bold">
                  <span>{truck.ref_id} • {truck.driverName}</span>
                  <span className="text-emerald-500">{truck.speed} km/h</span>
                </div>
                <p className="text-[10px] text-slate-400">{truck.origin} ➔ {truck.destination}</p>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Selected Truck Telemetry HUD Drawer */}
      <div className="p-3.5 rounded-2xl bg-gradient-to-br from-slate-900 to-slate-950 text-white border border-slate-800 shadow-md relative z-10">
        <div className="flex items-center justify-between pb-2 border-b border-slate-800">
          <div className="flex items-center gap-2">
            <span className="font-mono text-xs font-bold text-emerald-400">
              {selectedTruck.ref_id}
            </span>
            <span className="text-[10px] font-semibold px-2 py-0.5 rounded-md bg-slate-800 text-slate-300">
              {selectedTruck.plateNumber}
            </span>
          </div>
          <div className="flex items-center gap-1 text-xs font-bold text-emerald-400">
            <Navigation size={12} className="rotate-45" />
            <span>{selectedTruck.speed} km/h</span>
          </div>
        </div>

        {/* Lane Route */}
        <div className="mt-2.5 flex items-center justify-between text-xs font-bold">
          <span className="truncate">{selectedTruck.origin}</span>
          <ArrowRight size={12} className="text-slate-500 shrink-0 mx-1.5" />
          <span className="truncate">{selectedTruck.destination}</span>
        </div>

        {/* Real-time Progress Bar */}
        <div className="mt-2 space-y-1">
          <div className="flex items-center justify-between text-[10px] text-slate-400">
            <span>{selectedTruck.statusLabel}</span>
            <span className="text-emerald-400 font-mono font-bold">
              {selectedTruck.progressPercent}% Completed
            </span>
          </div>
          <div className="h-2 w-full bg-slate-800 rounded-full overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-emerald-500 via-teal-400 to-cyan-400 rounded-full transition-all duration-700"
              style={{ width: `${selectedTruck.progressPercent}%` }}
            />
          </div>
        </div>

        {/* Telemetry Stats Footer */}
        <div className="mt-2.5 pt-2 border-t border-slate-800/80 grid grid-cols-3 gap-2 text-[10px]">
          <div>
            <span className="text-slate-400 block">Driver</span>
            <span className="font-bold text-slate-200 truncate block">
              {selectedTruck.driverName}
            </span>
          </div>
          <div>
            <span className="text-slate-400 block">Fuel Tank</span>
            <span className="font-bold text-emerald-400 font-mono block">
              {selectedTruck.fuel}% Full
            </span>
          </div>
          <div className="text-right">
            <span className="text-slate-400 block">Live ETA</span>
            <span className="font-bold text-indigo-400 block">{selectedTruck.eta}</span>
          </div>
        </div>
      </div>
    </div>
  );
}
