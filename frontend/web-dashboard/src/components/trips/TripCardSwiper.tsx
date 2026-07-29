import { useRef, useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  ChevronLeft, ChevronRight, Truck, User, ArrowRight, 
  Gauge, ExternalLink, Navigation 
} from 'lucide-react';

import { useSimulatedTelemetry } from '@/hooks/useSimulatedTelemetry';
import TripMicroMap from '@/components/trips/TripMicroMap';

// Shadcn UI primitives
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import StatusBadge from '@/components/ui/StatusBadge';

export default function TripCardSwiper() {
  const navigate = useNavigate();
  const { fleet } = useSimulatedTelemetry(1);
  const scrollRef = useRef<HTMLDivElement>(null);

  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(true);
  const [activeCardIndex, setActiveCardIndex] = useState(0);

  const checkScrollState = () => {
    if (!scrollRef.current) return;
    const { scrollLeft, scrollWidth, clientWidth } = scrollRef.current;
    setCanScrollLeft(scrollLeft > 5);
    setCanScrollRight(scrollLeft < scrollWidth - clientWidth - 5);

    const index = Math.round(scrollLeft / 290);
    setActiveCardIndex(Math.min(index, fleet.length - 1));
  };

  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    el.addEventListener('scroll', checkScrollState, { passive: true });
    checkScrollState();
    return () => el.removeEventListener('scroll', checkScrollState);
  }, [fleet.length]);

  const handleScroll = (direction: 'left' | 'right') => {
    if (!scrollRef.current) return;
    const scrollAmount = direction === 'left' ? -300 : 300;
    scrollRef.current.scrollBy({ left: scrollAmount, behavior: 'smooth' });
  };

  return (
    <Card className="border-black/[0.06] shadow-md rounded-[24px] bg-white overflow-hidden shrink-0">
      <CardHeader className="border-b border-black/[0.04] pb-3.5 pt-4">
        <div className="flex items-center justify-between">
          <div>
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-[#FF5500] animate-ping" />
              <CardTitle className="text-sm font-extrabold text-[#111] tracking-tight">Active Freight Trips Carousel</CardTitle>
              <Badge variant="outline" className="text-[10px] font-mono border-orange-300 bg-orange-50 text-[#FF5500]">
                {fleet.length} TRIPS
              </Badge>
            </div>
            <CardDescription className="text-xs text-[#6E6E80] mt-0.5">
              Swipe or scroll horizontally to inspect active manifest cards and click to view full details
            </CardDescription>
          </div>

          {/* Glitch-Free Arrow Navigation Controls */}
          <div className="flex items-center gap-1.5">
            <span className="text-xs font-mono font-bold text-gray-500 mr-1 hidden sm:inline-block">
              {activeCardIndex + 1} / {fleet.length}
            </span>

            <Button
              size="icon"
              variant="outline"
              onClick={() => handleScroll('left')}
              disabled={!canScrollLeft}
              className="h-7 w-7 rounded-full border-black/[0.08] hover:bg-[#F5F5F7] disabled:opacity-30"
              title="Scroll Left"
            >
              <ChevronLeft size={15} />
            </Button>

            <Button
              size="icon"
              variant="outline"
              onClick={() => handleScroll('right')}
              disabled={!canScrollRight}
              className="h-7 w-7 rounded-full border-black/[0.08] hover:bg-[#F5F5F7] disabled:opacity-30"
              title="Scroll Right"
            >
              <ChevronRight size={15} />
            </Button>
          </div>
        </div>
      </CardHeader>

      <CardContent className="p-4">
        
        {/* Hardware-Accelerated Native Glitch-Free Carousel Scroll Container */}
        <div
          ref={scrollRef}
          className="flex gap-3.5 overflow-x-auto snap-x snap-mandatory scrollbar-none py-1 px-0.5 select-none"
          style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
        >
          {fleet.map((truck) => (
            <div
              key={truck.tripId}
              onClick={() => navigate(`/trips/${truck.tripId}`)}
              className="w-[280px] shrink-0 snap-start bg-[#FAFAFA] hover:bg-white border border-black/[0.08] hover:border-[#FF5500]/40 rounded-2xl p-3 shadow-xs hover:shadow-lg transition-all duration-200 cursor-pointer space-y-2.5 group"
            >
              
              {/* Card Header: Ref ID & Status */}
              <div className="flex items-center justify-between">
                <div>
                  <span className="text-[9px] font-mono font-bold text-[#FF5500] uppercase tracking-wider">{truck.refId}</span>
                  <p className="text-xs font-black text-[#111] leading-tight group-hover:text-[#FF5500] transition-colors flex items-center gap-1">
                    <span>{truck.plateNumber}</span>
                    <ArrowRight size={12} className="opacity-0 group-hover:opacity-100 -translate-x-1 group-hover:translate-x-0 transition-all text-[#FF5500]" />
                  </p>
                </div>
                <StatusBadge status={truck.status} />
              </div>

              {/* Compact Route Micro-Map (h-[120px]) */}
              <TripMicroMap
                currentLat={truck.currentCoords.lat}
                currentLng={truck.currentCoords.lng}
                heading={truck.heading}
                pickupCoords={truck.pickupCoords}
                dropoffCoords={truck.dropoffCoords}
                routeKey={
                  truck.refId === 'TRP-8922' ? 'dammam-riyadh' :
                  truck.refId === 'TRP-8923' ? 'medina-mecca' :
                  truck.refId === 'TRP-8924' ? 'riyadh-tabuk' : 'riyadh-jeddah'
                }
              />

              {/* Origin ➔ Destination Corridor */}
              <div className="bg-white p-2 rounded-xl border border-black/[0.05]">
                <p className="text-[8px] text-gray-400 font-bold uppercase tracking-wider">Route Corridor</p>
                <div className="flex items-center justify-between text-[11px] font-bold text-[#111] mt-0.5">
                  <span className="truncate max-w-[110px]">{truck.originName.split(' ')[0]}</span>
                  <span className="text-[#FF5500] font-mono text-[10px]">➔</span>
                  <span className="truncate max-w-[110px] text-right">{truck.destinationName.split(' ')[0]}</span>
                </div>
              </div>

              {/* Driver & Vehicle Summary Row */}
              <div className="grid grid-cols-2 gap-1.5 text-[11px]">
                <div className="bg-white p-2 rounded-lg border border-black/[0.04]">
                  <p className="text-[8px] text-gray-400 font-bold uppercase flex items-center gap-0.5">
                    <User size={9} /> Driver
                  </p>
                  <p className="font-bold text-[#111] truncate mt-0.5 text-[10px]">{truck.driverName}</p>
                </div>

                <div className="bg-white p-2 rounded-lg border border-black/[0.04]">
                  <p className="text-[8px] text-gray-400 font-bold uppercase flex items-center gap-0.5">
                    <Truck size={9} /> Vehicle
                  </p>
                  <p className="font-bold text-[#111] truncate mt-0.5 text-[10px]">{truck.assetType}</p>
                </div>
              </div>

              {/* Speed & Progress Bar */}
              <div className="space-y-1 pt-0.5">
                <div className="flex justify-between items-center text-[10px] font-bold">
                  <span className="text-[#FF5500] flex items-center gap-1">
                    <Gauge size={11} /> {truck.speedKmH} km/h
                  </span>
                  <span className="text-gray-500">{truck.progressPercentage}%</span>
                </div>
                <Progress value={truck.progressPercentage} className="h-1 bg-gray-200" />
              </div>

              {/* CTA Action Button */}
              <Button
                size="sm"
                className="w-full h-7 bg-[#1C1C2E] group-hover:bg-[#FF5500] text-white text-[10px] font-bold gap-1 rounded-lg transition-all"
              >
                <span>View Full Details</span>
                <ExternalLink size={10} />
              </Button>

            </div>
          ))}
        </div>

      </CardContent>
    </Card>
  );
}
