import React, { useState } from 'react';
import {
  MapPin, Clock, Eye, Camera, ChevronDown, Check,
  ArrowUpRight, PackageCheck, Flag, Sparkles, Image as ImageIcon
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
} from '@/components/ui/dropdown-menu';

interface TripPhotoEvidenceProps {
  documents?: any[];
  stops?: any[];
  onPreview: (img: { url: string; title: string; date?: string; location?: string }) => void;
}

function resolveDocUrl(url?: string | null): string {
  if (!url) return '';
  const trimmed = url.trim();
  if (trimmed.startsWith('data:') || trimmed.startsWith('blob:')) return trimmed;
  if (trimmed.startsWith('http://') || trimmed.startsWith('https://')) return trimmed;
  if (!trimmed.startsWith('/') && trimmed.length > 30 && !trimmed.includes(' ')) {
    return `data:image/png;base64,${trimmed}`;
  }
  const base = import.meta.env.VITE_API_URL ? import.meta.env.VITE_API_URL.replace(/\/api\/?$/, '') : '';
  return `${base}${trimmed.startsWith('/') ? '' : '/'}${trimmed}`;
}

interface PhotoCardItem {
  id: string;
  title: string;
  type: 'arrival' | 'proof' | 'stop';
  status: string;
  location: string;
  time: string;
  sampleImg: string;
  isRealDoc?: boolean;
}

interface LocationGroup {
  seq: string;
  seqNumber: number;
  city: string;
  badgeText: string;
  badgeColor: string;
  seqBgColor: string;
  photos: PhotoCardItem[];
}

interface LegSection {
  id: string;
  title: string;
  icon: string;
  pillColor: string;
  locations: LocationGroup[];
}

const DEFAULT_EVIDENCE_DATA: LegSection[] = [
  {
    id: 'outbound',
    title: 'OUTBOUND LEG',
    icon: '↗',
    pillColor: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    locations: [
      {
        seq: '01',
        seqNumber: 1,
        city: 'Riyadh',
        badgeText: 'PICKUP',
        badgeColor: 'bg-emerald-50 text-emerald-700 border-emerald-200',
        seqBgColor: 'bg-emerald-600 text-white',
        photos: [
          {
            id: 'p1_arrival',
            title: 'Pickup Arrival Photo',
            type: 'arrival',
            status: 'Received',
            location: 'Riyadh',
            time: 'Sep 02, 2026 • 08:53 AM',
            sampleImg: '/evidence/og_start_loading.png',
          },
          {
            id: 'p1_proof',
            title: 'Pickup Loading Proof',
            type: 'proof',
            status: 'Received',
            location: 'Riyadh',
            time: 'Sep 02, 2026 • 09:15 AM',
            sampleImg: '/evidence/og_loading.png',
          },
        ],
      },
      {
        seq: '02',
        seqNumber: 2,
        city: 'Al Abha',
        badgeText: 'STOP 1',
        badgeColor: 'bg-orange-50 text-orange-700 border-orange-200',
        seqBgColor: 'bg-orange-500 text-white',
        photos: [
          {
            id: 'p2_stop',
            title: 'Stop Photo',
            type: 'stop',
            status: 'Received',
            location: 'Al Abha',
            time: 'Sep 02, 2026 • 11:20 AM',
            sampleImg: '/evidence/og_stop.png',
          },
        ],
      },
      {
        seq: '03',
        seqNumber: 3,
        city: 'Khamis Mushait',
        badgeText: 'DELIVERY',
        badgeColor: 'bg-emerald-50 text-emerald-700 border-emerald-200',
        seqBgColor: 'bg-emerald-600 text-white',
        photos: [
          {
            id: 'p3_arrival',
            title: 'Delivery Arrival Photo',
            type: 'arrival',
            status: 'Received',
            location: 'Khamis Mushait',
            time: 'Sep 02, 2026 • 02:16 PM',
            sampleImg: '/evidence/og_delivery.png',
          },
          {
            id: 'p3_proof',
            title: 'Delivery Completion Proof',
            type: 'proof',
            status: 'Received',
            location: 'Khamis Mushait',
            time: 'Sep 02, 2026 • 03:45 PM',
            sampleImg: '/evidence/og_completed.png',
          },
        ],
      },
    ],
  },
  {
    id: 'return',
    title: 'RETURN LEG',
    icon: '↩',
    pillColor: 'bg-blue-50 text-blue-700 border-blue-200',
    locations: [
      {
        seq: '04',
        seqNumber: 4,
        city: 'Khamis Mushait',
        badgeText: 'RETURN LOADING',
        badgeColor: 'bg-blue-50 text-blue-700 border-blue-200',
        seqBgColor: 'bg-blue-600 text-white',
        photos: [
          {
            id: 'p4_arrival',
            title: 'Return Loading Arrival',
            type: 'arrival',
            status: 'Received',
            location: 'Khamis Mushait',
            time: 'Sep 02, 2026 • 06:10 PM',
            sampleImg: '/evidence/og_start_loading.png',
          },
          {
            id: 'p4_proof',
            title: 'Return Loading Proof',
            type: 'proof',
            status: 'Received',
            location: 'Khamis Mushait',
            time: 'Sep 02, 2026 • 06:48 PM',
            sampleImg: '/evidence/og_loading.png',
          },
        ],
      },
      {
        seq: '05',
        seqNumber: 5,
        city: 'Muhayil',
        badgeText: 'RETURN STOP 1',
        badgeColor: 'bg-purple-50 text-purple-700 border-purple-200',
        seqBgColor: 'bg-purple-600 text-white',
        photos: [
          {
            id: 'p5_stop',
            title: 'Return Stop Photo',
            type: 'stop',
            status: 'Received',
            location: 'Muhayil',
            time: 'Sep 02, 2026 • 07:25 PM',
            sampleImg: '/evidence/og_stop.png',
          },
        ],
      },
      {
        seq: '06',
        seqNumber: 6,
        city: 'Riyadh',
        badgeText: 'RETURN DELIVERY',
        badgeColor: 'bg-blue-50 text-blue-700 border-blue-200',
        seqBgColor: 'bg-blue-600 text-white',
        photos: [
          {
            id: 'p6_arrival',
            title: 'Return Delivery Arrival',
            type: 'arrival',
            status: 'Received',
            location: 'Riyadh',
            time: 'Sep 02, 2026 • 08:12 PM',
            sampleImg: '/evidence/og_delivery.png',
          },
          {
            id: 'p6_proof',
            title: 'Return Delivery Proof',
            type: 'proof',
            status: 'Received',
            location: 'Riyadh',
            time: 'Sep 02, 2026 • 08:40 PM',
            sampleImg: '/evidence/og_completed.png',
          },
        ],
      },
    ],
  },
];

export default function TripPhotoEvidence({
  documents = [],
  stops = [],
  onPreview,
}: TripPhotoEvidenceProps) {
  const [selectedLocation, setSelectedLocation] = useState<string>('all');

  // Match real uploaded documents from driver app
  const podDocs = documents.filter((d) => d.doc_type === 'POD');
  const cargoDocs = documents.filter((d) => d.doc_type === 'Waybill' || d.doc_type === 'Other');
  const stopDocs = documents.filter((d) => d.ai_extracted_json?.operation?.includes('stop'));

  const effectiveEvidence: LegSection[] = DEFAULT_EVIDENCE_DATA.map((leg) => {
    return {
      ...leg,
      locations: leg.locations.map((loc) => {
        const updatedPhotos = loc.photos.map((p, pIdx) => {
          let matchingDoc = null;
          if (p.type === 'proof' && (loc.seq === '03' || loc.seq === '06') && podDocs.length > 0) {
            matchingDoc = loc.seq === '03' ? podDocs[0] : (podDocs[1] || podDocs[0]);
          } else if (p.type === 'proof' && (loc.seq === '01' || loc.seq === '04') && cargoDocs.length > 0) {
            matchingDoc = loc.seq === '01' ? cargoDocs[0] : (cargoDocs[1] || cargoDocs[0]);
          } else if (p.type === 'stop' && stopDocs.length > 0) {
            matchingDoc = stopDocs[0];
          }

          if (matchingDoc && matchingDoc.file_url) {
            return {
              ...p,
              sampleImg: resolveDocUrl(matchingDoc.file_url),
              time: matchingDoc.createdAt ? new Date(matchingDoc.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : p.time,
              status: 'Uploaded',
              isRealDoc: true,
            };
          }
          return p;
        });

        return {
          ...loc,
          photos: updatedPhotos,
        };
      }),
    };
  });

  const totalPhotosCount = effectiveEvidence.reduce(
    (acc, leg) => acc + leg.locations.reduce((lAcc, loc) => lAcc + loc.photos.length, 0),
    0
  );

  return (
    <div className="w-full bg-white rounded-2xl border border-[#E5E7EB] shadow-[0_1px_3px_rgba(0,0,0,0.04)] px-4 sm:px-5 py-3.5 flex flex-col gap-2.5">
      
      {/* ── HEADER ROW ── */}
      <div className="flex items-center justify-between pb-2 border-b border-[#F3F4F6] shrink-0">
        <div>
          <h3 className="font-extrabold text-[13.5px] sm:text-[14px] text-[#111827] leading-tight">
            Trip Photo Evidence
          </h3>
          <p className="text-[10.5px] text-[#6B7280] font-normal">
            Photos uploaded by the driver at each trip location
          </p>
        </div>

        <div className="flex items-center gap-2">
          {/* Filter Dropdown */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="outline"
                size="sm"
                className="h-7 px-2.5 rounded-lg border-[#E5E7EB] text-[#374151] hover:bg-slate-50 text-[11px] font-semibold gap-1 shadow-none cursor-pointer bg-white"
              >
                <span>
                  {selectedLocation === 'all'
                    ? 'All Locations'
                    : selectedLocation}
                </span>
                <ChevronDown size={12} className="text-[#9CA3AF]" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-44">
              <DropdownMenuItem onClick={() => setSelectedLocation('all')}>
                All Locations
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => setSelectedLocation('01 Riyadh')}>
                01 Riyadh (Pickup)
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => setSelectedLocation('02 Al Abha')}>
                02 Al Abha (Stop 1)
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => setSelectedLocation('03 Khamis Mushait')}>
                03 Khamis Mushait (Delivery)
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => setSelectedLocation('04 Khamis Mushait')}>
                04 Khamis Mushait (Return)
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => setSelectedLocation('05 Muhayil')}>
                05 Muhayil (Return Stop)
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => setSelectedLocation('06 Riyadh')}>
                06 Riyadh (Return Delivery)
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>

          {/* Photos Count Badge */}
          <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[11px] font-bold bg-slate-100 text-slate-700 border border-slate-200">
            <Camera size={12} className="text-slate-500" />
            <span>{totalPhotosCount} Photos</span>
          </div>
        </div>
      </div>

      {/* ── TWO HORIZONTAL LEGS CONTENT CONTAINER ── */}
      <div className="flex flex-col gap-2.5 pt-1">
        {effectiveEvidence.map((leg) => {
          const filteredLocations =
            selectedLocation === 'all'
              ? leg.locations
              : leg.locations.filter((loc) =>
                  `${loc.seq} ${loc.city}`.toLowerCase().includes(selectedLocation.toLowerCase())
                );

          if (filteredLocations.length === 0) return null;

          const isSingleFiltered = filteredLocations.length === 1;

          return (
            <div key={leg.id} className="flex-1 min-h-0 flex flex-col justify-between">
              
              {/* Leg Title Badge Row */}
              <div className="flex items-center gap-2 pb-1 shrink-0">
                <span
                  className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[9px] font-extrabold uppercase tracking-wider border ${leg.pillColor}`}
                >
                  <span>{leg.icon}</span>
                  <span>{leg.title}</span>
                </span>
                <div className="h-px bg-slate-100 flex-1" />
              </div>

              {/* Locations Grid in this Leg (5 equal columns: 2 cols for stop 1, 1 col for stop 2, 2 cols for stop 3) */}
              <div
                className={`${
                  isSingleFiltered
                    ? 'flex'
                    : 'grid grid-cols-5 gap-2.5'
                } items-stretch`}
              >
                {filteredLocations.map((loc) => {
                  const colSpan = isSingleFiltered
                    ? 'w-full'
                    : loc.photos.length === 1
                    ? 'col-span-1'
                    : 'col-span-2';

                  return (
                    <div
                      key={loc.seq}
                      className={`${colSpan} bg-slate-50/70 border border-slate-200/80 rounded-xl p-2 flex flex-col justify-between`}
                    >
                      {/* Location Header */}
                      <div className="flex items-center justify-between gap-1 pb-1 shrink-0 border-b border-slate-200/60">
                        <div className="flex items-center gap-1.5 min-w-0">
                          <span
                            className={`w-4.5 h-4.5 rounded-full flex items-center justify-center font-black text-[9px] shrink-0 ${loc.seqBgColor}`}
                          >
                            {loc.seq}
                          </span>
                          <span className="font-extrabold text-[11px] text-[#111827] truncate">
                            {loc.city}
                          </span>
                        </div>
                        <span
                          className={`px-1.5 py-0.2 rounded text-[8px] font-black uppercase tracking-wider border shrink-0 ${loc.badgeColor}`}
                        >
                          {loc.badgeText}
                        </span>
                      </div>

                      {/* Photo Cards Container */}
                      <div
                        className={`grid ${
                          loc.photos.length === 1 ? 'grid-cols-1' : 'grid-cols-2'
                        } gap-1.5 pt-1.5 items-stretch`}
                      >
                        {loc.photos.map((photo) => {
                          const isArrival = photo.type === 'arrival';
                          const isStop = photo.type === 'stop';

                          return (
                            <div
                              key={photo.id}
                              className="bg-white border border-[#E5E7EB] hover:border-blue-300 rounded-lg p-1.5 flex flex-col justify-between transition-all hover:shadow-2xs group min-w-0"
                            >
                              {/* Photo Header: Icon + Title + Received Badge */}
                              <div className="flex items-center justify-between gap-1 pb-0.5 shrink-0">
                                <div className="flex items-center gap-1 min-w-0">
                                  {isArrival ? (
                                    <ArrowUpRight
                                      size={10}
                                      className="text-purple-600 shrink-0 stroke-[2.5]"
                                    />
                                  ) : isStop ? (
                                    <Flag
                                      size={10}
                                      className="text-blue-600 shrink-0 stroke-[2.5]"
                                    />
                                  ) : (
                                    <PackageCheck
                                      size={10}
                                      className="text-emerald-600 shrink-0 stroke-[2.5]"
                                    />
                                  )}
                                  <span
                                    className="font-bold text-[8.5px] sm:text-[9px] text-[#1F2937] truncate"
                                    title={photo.title}
                                  >
                                    {photo.title}
                                  </span>
                                </div>
                                <span className="px-1 py-0.2 rounded text-[7.5px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200 shrink-0 leading-none">
                                  {photo.status}
                                </span>
                              </div>

                              {/* Thumbnail Image */}
                              <div
                                onClick={() =>
                                  onPreview({
                                    url: photo.sampleImg,
                                    title: photo.title,
                                    location: photo.location,
                                    date: photo.time,
                                  })
                                }
                                className="relative w-full h-[58px] sm:h-[68px] rounded-lg overflow-hidden bg-slate-100 border border-slate-200/80 my-0.5 cursor-pointer group shrink-0"
                              >
                                <img
                                  src={photo.sampleImg}
                                  alt={photo.title}
                                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-200"
                                  onError={(e) => {
                                    (e.target as HTMLElement).style.display = 'none';
                                  }}
                                />
                                <div className="absolute inset-0 bg-black/25 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-white">
                                  <Eye size={12} />
                                </div>
                              </div>

                              {/* Photo Metadata Footer */}
                              <div className="pt-0.5 space-y-0.5 shrink-0">
                                <div className="flex items-center gap-1 text-[8px] text-[#4B5563] truncate leading-none">
                                  <MapPin size={8} className="text-blue-500 shrink-0" />
                                  <span className="truncate">{photo.location}</span>
                                </div>
                                <div className="flex items-center gap-1 text-[7.5px] font-mono text-[#6B7280] truncate leading-none">
                                  <Clock size={8} className="text-[#9CA3AF] shrink-0" />
                                  <span className="truncate">{photo.time}</span>
                                </div>

                                <button
                                  type="button"
                                  onClick={() =>
                                    onPreview({
                                      url: photo.sampleImg,
                                      title: photo.title,
                                      location: photo.location,
                                      date: photo.time,
                                    })
                                  }
                                  className="flex items-center gap-0.5 text-[8.5px] font-bold text-blue-600 hover:text-blue-700 pt-0.5 cursor-pointer leading-tight"
                                >
                                  <Eye size={9} />
                                  <span>View Photo</span>
                                </button>
                              </div>

                            </div>
                          );
                        })}
                      </div>

                    </div>
                  );
                })}
              </div>

            </div>
          );
        })}
      </div>

    </div>
  );
}