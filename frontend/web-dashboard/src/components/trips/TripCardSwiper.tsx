import { useState, useCallback, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import useEmblaCarousel from 'embla-carousel-react';
import { 
  ChevronLeft, ChevronRight, Truck, User, ArrowRight, 
  Gauge, ExternalLink, Navigation, ShieldAlert, MapPin, Sparkles 
} from 'lucide-react';

import { useSimulatedTelemetry } from '@/hooks/useSimulatedTelemetry';
import { SimulatedTruckTelemetry } from '@/services/telemetrySimulator';
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

  const [emblaRef, emblaApi] = useEmblaCarousel({
    align: 'start',
    loop: true,
    skipSnaps: false,
    dragFree: false,
  });

  const [selectedIndex, setSelectedIndex] = useState(0);
  const [scrollSnaps, setScrollSnaps] = useState<number[]>([]);

  const scrollPrev = useCallback(() => emblaApi && emblaApi.scrollPrev(), [emblaApi]);
  const scrollNext = useCallback(() => emblaApi && emblaApi.scrollNext(), [emblaApi]);

  const onSelect = useCallback(() => {
    if (!emblaApi) return;
    setSelectedIndex(emblaApi.selectedScrollSnap());
  }, [emblaApi]);

  useEffect(() => {
    if (!emblaApi) return;
    onSelect();
    setScrollSnaps(emblaApi.scrollSnapList());
    emblaApi.on('select', onSelect);
    emblaApi.on('reInit', onSelect);
  }, [emblaApi, onSelect]);

  return (
    <Card className="border-black/[0.06] shadow-md rounded-[24px] bg-white overflow-hidden shrink-0">
      <CardHeader className="border-b border-black/[0.04] pb-4">
        <div className="flex items-center justify-between">
          <div>
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-[#FF5500] animate-ping" />
              <CardTitle className="text-base font-extrabold text-[#111] tracking-tight">Active Freight Trips Swiper</CardTitle>
              <Badge variant="outline" className="text-[10px] font-mono border-orange-300 bg-orange-50 text-[#FF5500]">
                {fleet.length} LIVE CARDS
              </Badge>
            </div>
            <CardDescription className="text-xs text-[#6E6E80] mt-0.5">
              Swipe horizontally across active truck manifests to view individual micro-maps and driver details
            </CardDescription>
          </div>

          {/* Carousel Navigation Buttons */}
          <div className="flex items-center gap-2">
            <span className="text-xs font-mono font-bold text-gray-500 mr-1 hidden sm:inline-block">
              {selectedIndex + 1} / {fleet.length}
            </span>

            <Button
              size="icon"
              variant="outline"
              onClick={scrollPrev}
              className="h-8 w-8 rounded-full border-black/[0.08] hover:bg-[#F5F5F7]"
              title="Previous trip"
            >
              <ChevronLeft size={16} />
            </Button>
            <Button
              size="icon"
              variant="outline"
              onClick={scrollNext}
              className="h-8 w-8 rounded-full border-black/[0.08] hover:bg-[#F5F5F7]"
              title="Next trip"
            >
              <ChevronRight size={16} />
            </Button>
          </div>
        </div>
      </CardHeader>

      <CardContent className="p-5">
        
        {/* Embla Carousel Viewport */}
        <div className="overflow-hidden" ref={emblaRef}>
          <div className="flex gap-4">
            {fleet.map((truck) => (
              <div
                key={truck.tripId}
                className="flex-[0_0_100%] min-w-0 sm:flex-[0_0_80%] lg:flex-[0_0_48%] xl:flex-[0_0_32%] transition-all"
              >
                <div
                  onClick={() => navigate(`/trips/${truck.tripId}`)}
                  className="bg-[#FAFAFA] hover:bg-white border border-black/[0.08] hover:border-[#FF5500]/40 rounded-2xl p-4 shadow-xs hover:shadow-xl transition-all duration-300 cursor-pointer space-y-3 group"
                >
                  
                  {/* Card Top Header */}
                  <div className="flex items-center justify-between">
                    <div>
                      <span className="text-[10px] font-mono font-bold text-[#FF5500] uppercase tracking-wider">{truck.refId}</span>
                      <p className="text-sm font-extrabold text-[#111] leading-tight mt-0.5 group-hover:text-[#FF5500] transition-colors flex items-center gap-1">
                        <span>{truck.plateNumber}</span>
                        <ArrowRight size={13} className="opacity-0 group-hover:opacity-100 -translate-x-1 group-hover:translate-x-0 transition-all text-[#FF5500]" />
                      </p>
                    </div>
                    <StatusBadge status={truck.status} />
                  </div>

                  {/* Micro Route Map */}
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

                  {/* Corridor Path */}
                  <div className="bg-white p-2.5 rounded-xl border border-black/[0.05] space-y-1">
                    <p className="text-[9px] text-gray-400 font-bold uppercase tracking-wider">Corridor</p>
                    <p className="text-xs font-bold text-[#111] truncate">{truck.originName}</p>
                    <div className="flex items-center gap-1 text-[10px] text-[#FF5500] font-semibold">
                      <span>↓ {truck.destinationName}</span>
                    </div>
                  </div>

                  {/* Driver & Vehicle Details Grid */}
                  <div className="grid grid-cols-2 gap-2 text-xs">
                    <div className="bg-white p-2.5 rounded-xl border border-black/[0.05]">
                      <p className="text-[9px] text-gray-400 font-bold uppercase flex items-center gap-1">
                        <User size={10} /> Driver
                      </p>
                      <p className="font-bold text-[#111] truncate mt-0.5">{truck.driverName}</p>
                      <p className="text-[10px] text-gray-500 truncate">{truck.driverPhone}</p>
                    </div>

                    <div className="bg-white p-2.5 rounded-xl border border-black/[0.05]">
                      <p className="text-[9px] text-gray-400 font-bold uppercase flex items-center gap-1">
                        <Truck size={10} /> Vehicle
                      </p>
                      <p className="font-bold text-[#111] truncate mt-0.5">{truck.plateNumber}</p>
                      <p className="text-[10px] text-gray-500 truncate">{truck.assetType}</p>
                    </div>
                  </div>

                  {/* Progress & Speed Overlay */}
                  <div className="space-y-1.5 pt-1">
                    <div className="flex justify-between items-center text-xs font-bold">
                      <span className="text-[#FF5500] flex items-center gap-1">
                        <Gauge size={12} /> {truck.speedKmH} km/h
                      </span>
                      <span className="text-gray-600">{truck.progressPercentage}% Completed</span>
                    </div>
                    <Progress value={truck.progressPercentage} className="h-1.5 bg-gray-200" />
                  </div>

                  {/* Card Bottom CTA */}
                  <Button
                    size="sm"
                    className="w-full h-8 bg-[#1C1C2E] group-hover:bg-[#FF5500] text-white text-xs font-bold gap-1 rounded-xl transition-all"
                  >
                    <span>View Full Trip & Tracking</span>
                    <ExternalLink size={12} />
                  </Button>

                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Carousel Dots Pagination */}
        <div className="flex justify-center gap-1.5 mt-4">
          {scrollSnaps.map((_, idx) => (
            <button
              key={idx}
              onClick={() => emblaApi && emblaApi.scrollTo(idx)}
              className={`h-2 rounded-full transition-all ${
                idx === selectedIndex ? 'w-6 bg-[#FF5500]' : 'w-2 bg-gray-300 hover:bg-gray-400'
              }`}
            />
          ))}
        </div>

      </CardContent>
    </Card>
  );
}
