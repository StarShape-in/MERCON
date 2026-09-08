import { useState } from 'react';
import { 
  Phone, MessageSquare, ArrowRight, CheckCircle2, 
  Search, SlidersHorizontal, LayoutGrid, Plus, 
  Clock, MapPin, Truck
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';

type SlotId = 'A1' | 'A2' | 'A3' | 'A4' | 'A5' | 'A6' |
              'B1' | 'B2' | 'B3' | 'B4' | 'B5' | 'B6' |
              'C1' | 'C2' | 'C3' | 'C4' | 'C5' | 'C6';

interface CargoSlot {
  id: SlotId;
  status: 'empty' | 'loaded';
  weight?: string;
  shipmentId?: string;
  color?: 'green' | 'blue' | 'gray';
}

interface Shipment {
  id: string;
  speed: 'Standard' | 'Express' | 'Same day';
  route: string;
  type: string;
  quantity: string;
  totalWeight: string;
  dimension: string;
  method: string;
}

const INITIAL_SLOTS: CargoSlot[] = [
  { id: 'A1', status: 'loaded', weight: '500kg', shipmentId: 'SHP-5839', color: 'green' },
  { id: 'A2', status: 'loaded', weight: '500kg', shipmentId: 'SHP-2212', color: 'green' },
  { id: 'A3', status: 'loaded', weight: '500kg', shipmentId: 'SHP-0090', color: 'gray' },
  { id: 'A4', status: 'empty' },
  { id: 'A5', status: 'empty' },
  { id: 'A6', status: 'empty' },
  { id: 'B1', status: 'loaded', weight: '500kg', shipmentId: 'SHP-1233', color: 'gray' },
  { id: 'B2', status: 'loaded', weight: '1,000kg', shipmentId: 'SHP-4434', color: 'green' },
  { id: 'B3', status: 'loaded', weight: '500kg', shipmentId: 'SHP-3324', color: 'green' },
  { id: 'B4', status: 'empty' },
  { id: 'B5', status: 'empty' },
  { id: 'B6', status: 'empty' },
  { id: 'C1', status: 'loaded', weight: '500kg', shipmentId: 'SHP-3030', color: 'gray' },
  { id: 'C2', status: 'loaded', weight: '1,000kg', shipmentId: 'SHP-8893', color: 'gray' },
  { id: 'C3', status: 'loaded', weight: '1,000kg', shipmentId: 'SHP-0040', color: 'blue' },
  { id: 'C4', status: 'loaded', weight: '1,000kg', shipmentId: 'SHP-3320', color: 'gray' },
  { id: 'C5', status: 'empty' },
  { id: 'C6', status: 'empty' },
];

const UNASSIGNED_SHIPMENTS: Shipment[] = [
  {
    id: 'SHP-9821',
    speed: 'Standard',
    route: 'NY → NJ',
    type: 'Pallet',
    quantity: '10 pallets',
    totalWeight: '500 Kg',
    dimension: '0.8x0.6x1 m',
    method: 'Pickup'
  },
  {
    id: 'SHP-9822',
    speed: 'Express',
    route: 'NY → NJ',
    type: 'Box',
    quantity: '15 boxes',
    totalWeight: '1,000 Kg',
    dimension: '0.4x0.2x1 m',
    method: 'Pickup'
  },
  {
    id: 'SHP-9823',
    speed: 'Same day',
    route: 'NY → NJ',
    type: 'Box',
    quantity: '12 boxes',
    totalWeight: '800 Kg',
    dimension: '1.5x1.2x0.4 m',
    method: 'Pickup'
  }
];

export default function CargoLoadingView() {
  const [selectedSlot, setSelectedSlot] = useState<SlotId | null>('A5');
  const [slots, setSlots] = useState<CargoSlot[]>(INITIAL_SLOTS);

  const handleAssign = (shipmentId: string) => {
    if (!selectedSlot) return;
    setSlots(prev => prev.map(slot => {
      if (slot.id === selectedSlot) {
        return { ...slot, status: 'loaded', shipmentId, weight: '500kg', color: 'blue' };
      }
      return slot;
    }));
    setSelectedSlot(null);
  };

  return (
    <div className="min-h-screen bg-[#FDFDFD] text-slate-900 font-sans p-6 pb-20">
      
      {/* ── Top Header ── */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-4">
          <h1 className="text-2xl font-black tracking-tight text-slate-900">TRC-204 Cargo details</h1>
          <Badge className="bg-amber-100 text-amber-700 border-amber-200 shadow-none font-bold px-3 py-1 text-xs rounded-full flex items-center gap-1.5 hover:bg-amber-100 hover:text-amber-700">
            <span className="w-1.5 h-1.5 bg-amber-500 rounded-full animate-pulse"></span>
            Loading
          </Badge>
        </div>
        <div className="flex items-center gap-3">
          <Button variant="outline" className="font-bold border-slate-200 gap-2 h-10 shadow-sm rounded-lg hover:bg-slate-50 text-slate-700">
            <Search className="w-4 h-4 text-slate-500" />
            View manifest
          </Button>
          <Button className="font-bold bg-emerald-600 hover:bg-emerald-700 text-white gap-2 h-10 shadow-sm rounded-lg">
            <Truck className="w-4 h-4" />
            Dispatch truck
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-12 gap-6">
        
        {/* ── Left Sidebar ── */}
        <div className="xl:col-span-3 flex flex-col gap-6">
          
          {/* Truck Information Card */}
          <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm">
            <h2 className="text-sm font-black text-slate-800 mb-4">Truck Information</h2>
            
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-slate-200 overflow-hidden">
                  <img src="https://i.pravatar.cc/150?u=marcus" alt="Driver" className="w-full h-full object-cover" />
                </div>
                <div>
                  <p className="text-[10px] uppercase font-bold text-slate-400">Driver</p>
                  <p className="text-sm font-black text-slate-800">Marcus Lee</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Button variant="outline" size="icon" className="w-8 h-8 rounded-full border-slate-200 text-slate-500">
                  <Phone className="w-3.5 h-3.5" />
                </Button>
                <Button variant="outline" size="icon" className="w-8 h-8 rounded-full border-slate-200 text-slate-500">
                  <MessageSquare className="w-3.5 h-3.5" />
                </Button>
              </div>
            </div>

            <div className="grid grid-cols-3 gap-2 mb-6 border-y border-slate-100 py-4">
              <div>
                <p className="text-[10px] text-slate-400 mb-1">Truck ID</p>
                <p className="text-xs font-black text-slate-800">TRC-204</p>
              </div>
              <div>
                <p className="text-[10px] text-slate-400 mb-1">Dock</p>
                <p className="text-xs font-black text-slate-800">Dock #3</p>
              </div>
              <div>
                <p className="text-[10px] text-slate-400 mb-1">Started</p>
                <p className="text-xs font-black text-slate-800">08:34 AM</p>
              </div>
            </div>

            <div className="flex items-center justify-between mb-6 px-2">
              <div className="text-center">
                <p className="text-sm font-black text-slate-800">NY</p>
                <p className="text-[10px] text-slate-400">New York</p>
              </div>
              <div className="flex-1 flex items-center justify-center relative px-2">
                <div className="w-full h-[3px] bg-slate-100 rounded-full overflow-hidden flex">
                  <div className="w-1/2 h-full bg-slate-300"></div>
                </div>
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-5 h-5 bg-slate-800 rounded-full flex items-center justify-center">
                  <ArrowRight className="w-3 h-3 text-white" />
                </div>
              </div>
              <div className="text-center">
                <p className="text-sm font-black text-slate-800">NJ</p>
                <p className="text-[10px] text-slate-400">New Jersey</p>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <Button variant="outline" className="text-xs font-bold border-slate-200 h-9 rounded-lg text-slate-700">Change driver</Button>
              <Button variant="outline" className="text-xs font-bold border-slate-200 h-9 rounded-lg text-slate-700">Edit route</Button>
            </div>
          </div>

          {/* Capacity & Load Card */}
          <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm">
            <h2 className="text-sm font-black text-slate-800 mb-6">Capacity & load</h2>
            <div className="flex items-center gap-6">
              <div className="relative w-28 h-28 shrink-0">
                <svg viewBox="0 0 100 100" className="w-full h-full -rotate-90">
                  <circle cx="50" cy="50" r="45" fill="none" stroke="#F1F5F9" strokeWidth="8" />
                  <circle cx="50" cy="50" r="45" fill="none" stroke="#0284C7" strokeWidth="8" strokeDasharray="283" strokeDashoffset="147" strokeLinecap="round" className="transition-all duration-1000" />
                </svg>
                <div className="absolute inset-0 flex flex-col items-center justify-center">
                  <span className="text-2xl font-black text-slate-800 leading-none">48%</span>
                  <span className="text-[10px] text-slate-400 font-bold mt-1">Weight</span>
                </div>
              </div>
              <div className="flex flex-col justify-center gap-4">
                <div>
                  <p className="text-[10px] text-slate-400 mb-0.5">Current load</p>
                  <p className="text-xl font-black text-slate-800 leading-none">6.5 <span className="text-xs text-slate-500 font-bold">tons</span></p>
                </div>
                <div>
                  <p className="text-[10px] text-slate-400 mb-0.5">Max. Capacity</p>
                  <p className="text-base font-black text-slate-800 leading-none">13.5 <span className="text-xs text-slate-500 font-bold">tons</span></p>
                </div>
              </div>
            </div>
          </div>

          {/* Loading Activity Log Card */}
          <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm flex-1">
            <h2 className="text-sm font-black text-slate-800 mb-5">Loading activity log</h2>
            <div className="relative border-l-2 border-slate-100 ml-3 space-y-6">
              
              <div className="relative pl-6">
                <div className="absolute -left-[11px] top-0 w-5 h-5 bg-white border-2 border-slate-200 rounded-full flex items-center justify-center">
                  <Clock className="w-2.5 h-2.5 text-slate-400" />
                </div>
                <p className="text-[10px] font-bold text-slate-400 mb-1">09:30 PM</p>
                <p className="text-xs font-bold text-slate-700 leading-relaxed">Shipment SHP-9281 assigned (12 boxes, 240kg) to A1</p>
              </div>

              <div className="relative pl-6">
                <div className="absolute -left-[11px] top-0 w-5 h-5 bg-white border-2 border-slate-200 rounded-full flex items-center justify-center">
                  <Clock className="w-2.5 h-2.5 text-slate-400" />
                </div>
                <p className="text-[10px] font-bold text-slate-400 mb-1">09:30 PM</p>
                <p className="text-xs font-bold text-slate-700 leading-relaxed">Shipment SHP-9281 assigned (12 boxes, 240kg) to A1</p>
              </div>

              <div className="relative pl-6">
                <div className="absolute -left-[11px] top-0 w-5 h-5 bg-white border-2 border-slate-200 rounded-full flex items-center justify-center">
                  <Clock className="w-2.5 h-2.5 text-slate-400" />
                </div>
                <p className="text-[10px] font-bold text-slate-400 mb-1">09:30 PM</p>
                <p className="text-xs font-bold text-slate-700">Driver Marcus Lee checked in</p>
              </div>

            </div>
          </div>

        </div>

        {/* ── Main Central & Bottom Area ── */}
        <div className="xl:col-span-9 flex flex-col gap-6">
          
          {/* Truck Cargo Visualizer */}
          <div className="w-full bg-slate-50/50 rounded-2xl border border-slate-200 relative overflow-hidden flex items-center justify-center shadow-inner p-4 sm:p-8">
            
            {/* Inner aspect-ratio locked container (16:9) */}
            <div className="relative w-full max-w-4xl aspect-video bg-no-repeat bg-center bg-contain mix-blend-multiply opacity-95" style={{ backgroundImage: "url('/truck-bg.jpg')" }}>
              
              {/* Cargo Grid Overlay - Precisely aligned to the trailer part of the image */}
              <div className="absolute top-[31%] left-[5%] w-[70.5%] h-[42.5%] grid grid-rows-3 grid-cols-6 gap-1.5 sm:gap-2">
                {slots.map(slot => (
                  <div 
                    key={slot.id}
                    onClick={() => slot.status === 'empty' && setSelectedSlot(slot.id)}
                    className={`
                      relative rounded-lg border-2 flex flex-col items-start justify-between p-1.5 sm:p-2 cursor-pointer transition-all overflow-hidden
                      ${slot.status === 'empty' 
                          ? (selectedSlot === slot.id 
                              ? 'bg-slate-100 border-slate-400 border-solid shadow-md z-10' 
                              : 'bg-white/90 backdrop-blur-sm border-slate-200 border-dashed hover:border-slate-300 hover:bg-white') 
                          : (slot.color === 'green' ? 'bg-white/95 border-emerald-400/50 shadow-xs' 
                             : slot.color === 'blue' ? 'bg-white/95 border-blue-400/50 shadow-xs'
                             : 'bg-white/95 border-slate-200 shadow-xs')}
                    `}
                  >
                    {/* Diagonal Stripe pattern for filled slots */}
                    {slot.status === 'loaded' && (
                      <div className="absolute inset-0 opacity-[0.03] pointer-events-none" style={{ backgroundImage: 'repeating-linear-gradient(45deg, #000 0, #000 1px, transparent 1px, transparent 8px)' }}></div>
                    )}

                    <div className="w-full flex justify-between items-start z-10">
                      <span className="text-[9px] sm:text-[10px] font-bold text-slate-500">{slot.id}</span>
                      {slot.status === 'loaded' && slot.color && (
                        <span className={`w-1.5 h-1.5 rounded-full ${slot.color === 'green' ? 'bg-emerald-500' : slot.color === 'blue' ? 'bg-blue-500' : 'bg-slate-300'}`}></span>
                      )}
                    </div>
                    
                    {slot.status === 'empty' ? (
                      <div className="flex-1 w-full flex items-center justify-center z-10">
                        <div className={`w-5 h-5 sm:w-6 sm:h-6 rounded-full flex items-center justify-center transition-colors ${selectedSlot === slot.id ? 'bg-slate-800 text-white' : 'bg-white border border-slate-200 text-slate-400 group-hover:border-slate-400 group-hover:text-slate-600'}`}>
                          <Plus className="w-3 h-3 sm:w-3.5 sm:h-3.5" />
                        </div>
                      </div>
                    ) : (
                      <div className="z-10 mt-0.5 sm:mt-1">
                        <p className="text-[9px] sm:text-[10px] font-bold text-slate-400">{slot.weight}</p>
                        <p className="text-[9px] sm:text-[10px] font-black text-slate-800 truncate leading-tight">{slot.shipmentId}</p>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Bottom Assignment Section */}
          <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm">
            <div className="flex items-center justify-between mb-5">
              <h2 className="text-sm font-black text-slate-800">
                {selectedSlot ? `Assign shipment to ${selectedSlot} slot` : 'Select an empty slot to assign shipment'}
              </h2>
              <div className="flex items-center gap-3">
                <div className="relative">
                  <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <Input placeholder="Search for shipment ID" className="pl-9 h-9 text-xs rounded-lg border-slate-200 w-64" />
                </div>
                <Button variant="outline" className="h-9 gap-2 text-xs border-slate-200 rounded-lg font-bold text-slate-700">
                  <SlidersHorizontal className="w-3.5 h-3.5" /> Sort by
                </Button>
                <Button variant="outline" className="h-9 gap-2 text-xs border-slate-200 rounded-lg font-bold text-slate-700">
                  <LayoutGrid className="w-3.5 h-3.5" /> Grid
                </Button>
              </div>
            </div>

            <div className={`grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 transition-opacity duration-300 ${!selectedSlot ? 'opacity-30 pointer-events-none grayscale-[50%]' : ''}`}>
              {UNASSIGNED_SHIPMENTS.map(ship => (
                <div key={ship.id} className="border border-slate-200 rounded-xl p-4 flex flex-col bg-white shadow-sm hover:border-slate-300 transition-colors">
                  <div className="flex justify-between items-center mb-4 pb-3 border-b border-slate-100">
                    <div className="flex items-center gap-2">
                      <div className="w-6 h-6 rounded bg-slate-100 flex items-center justify-center border border-slate-200">
                        <MapPin className="w-3.5 h-3.5 text-slate-500" />
                      </div>
                      <span className="font-black text-sm text-slate-800">{ship.id}</span>
                    </div>
                    <Badge variant="outline" className={`text-[10px] font-bold border rounded-full px-2.5 py-0.5 ${
                      ship.speed === 'Express' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' :
                      ship.speed === 'Same day' ? 'bg-blue-50 text-blue-700 border-blue-200' :
                      'bg-slate-50 text-slate-600 border-slate-200'
                    }`}>
                      {ship.speed}
                    </Badge>
                  </div>

                  <div className="grid grid-cols-3 gap-y-4 gap-x-2 mb-5">
                    <div>
                      <p className="text-[10px] font-bold text-slate-400 mb-1">Route</p>
                      <p className="text-xs font-black text-slate-800">{ship.route}</p>
                    </div>
                    <div>
                      <p className="text-[10px] font-bold text-slate-400 mb-1">Type</p>
                      <p className="text-xs font-black text-slate-800">{ship.type}</p>
                    </div>
                    <div>
                      <p className="text-[10px] font-bold text-slate-400 mb-1">Quantity</p>
                      <p className="text-xs font-black text-slate-800">{ship.quantity}</p>
                    </div>
                    <div>
                      <p className="text-[10px] font-bold text-slate-400 mb-1">Total weight</p>
                      <p className="text-xs font-black text-slate-800">{ship.totalWeight}</p>
                    </div>
                    <div>
                      <p className="text-[10px] font-bold text-slate-400 mb-1">Dimension</p>
                      <p className="text-xs font-black text-slate-800">{ship.dimension}</p>
                    </div>
                    <div>
                      <p className="text-[10px] font-bold text-slate-400 mb-1">Method</p>
                      <p className="text-xs font-black text-slate-800">{ship.method}</p>
                    </div>
                  </div>

                  <Button 
                    variant="outline" 
                    className="w-full font-bold gap-2 text-slate-700 border-slate-200 rounded-lg hover:bg-slate-50 mt-auto shadow-xs"
                    onClick={() => handleAssign(ship.id)}
                  >
                    <Plus className="w-4 h-4 text-slate-400" />
                    Assign to truck
                  </Button>
                </div>
              ))}
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}
