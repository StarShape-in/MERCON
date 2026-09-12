import React, { useState, useMemo } from 'react';
import {
  Clock, Eye, Camera, ChevronDown,
  ArrowUpRight, PackageCheck, Flag, FileText,
  Play, Video, AlertTriangle
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
} from '@/components/ui/dropdown-menu';
import { GeotagEvidenceData } from './GeotagEvidenceCard';

export interface PhotoPreviewItem {
  url: string;
  title: string;
  date?: string;
  location?: string;
  geotag?: GeotagEvidenceData;
  isVideo?: boolean;
}

interface TripPhotoEvidenceProps {
  documents?: any[];
  stops?: any[];
  trip?: any;
  onPreview: (img: PhotoPreviewItem) => void;
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

const isUuidVal = (str?: string | null) =>
  str ? /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(str.trim()) : false;

function cleanCityName(st: any, fallback: string): string {
  if (!st) return fallback;
  const rawCity = st.location?.city;
  if (rawCity && !isUuidVal(rawCity)) return rawCity.replace(/🔁\s*/g, '').trim();

  const rawName = st.location?.name || st.location_name;
  if (rawName && !isUuidVal(rawName)) return rawName.replace(/🔁\s*/g, '').trim();

  const rawAddress = st.location_address || st.location?.address;
  if (rawAddress && !isUuidVal(rawAddress)) {
    const part = rawAddress.split(',')[0].trim();
    if (part && !isUuidVal(part)) return part.replace(/🔁\s*/g, '').trim();
  }

  return fallback;
}

function formatDocTime(dateStr?: string | null): string {
  if (!dateStr) return '';
  try {
    const d = new Date(dateStr);
    return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  } catch {
    return '';
  }
}

interface PhotoCardItem {
  id: string;
  title: string;
  type: 'arrival' | 'proof' | 'stop' | 'document';
  status: string;
  location: string;
  time: string;
  sampleImg: string;
  isRealDoc?: boolean;
  geotag?: GeotagEvidenceData;
  isVideo?: boolean;
  isDelayEvidence?: boolean;
}

export const checkIsVideo = (doc?: any, url?: string): boolean => {
  const u = (url || doc?.file_url || '').toLowerCase();
  const m = (doc?.mime_type || '').toLowerCase();
  return m.startsWith('video/') || /\.(mp4|mov|webm|avi|mkv|3gp)(\?.*)?$/i.test(u);
};

export const checkIsDelay = (doc?: any): boolean => {
  const op = (doc?.ai_extracted_json?.operation || '').toLowerCase();
  const cat = (doc?.category || '').toLowerCase();
  const notes = (doc?.ocr_raw_text || '').toLowerCase();
  const fileUrl = (doc?.file_url || '').toLowerCase();
  return op.includes('delay') || cat.includes('delay') || notes.includes('delay') || fileUrl.includes('delay');
};

const resolveCardTitle = (defaultTitle: string, doc?: any): string => {
  if (!doc) return defaultTitle;
  const isVid = checkIsVideo(doc);
  const isDelay = checkIsDelay(doc);
  if (isDelay) {
    return isVid ? 'Delay Video Evidence' : 'Delay Evidence';
  }
  if (isVid) {
    return defaultTitle.replace(/Photo/i, 'Video');
  }
  return defaultTitle;
};

function extractPhotoGeotag(
  doc: any,
  st: any,
  trip: any,
  fallbackCity: string
): GeotagEvidenceData {
  let lat: number | undefined = doc?.ai_extracted_json?.gps?.latitude;
  let lng: number | undefined = doc?.ai_extracted_json?.gps?.longitude;
  let timestamp: string | undefined = doc?.ai_extracted_json?.gps?.captured_at || doc?.createdAt;

  if ((lat === undefined || lng === undefined) && typeof doc?.ocr_raw_text === 'string') {
    const match = doc.ocr_raw_text.match(/GPS:\s*([0-9.-]+),\s*([0-9.-]+)/i);
    if (match) {
      lat = parseFloat(match[1]);
      lng = parseFloat(match[2]);
    }
  }

  if (lat === undefined || lng === undefined) {
    if (st?.location_lat != null && st?.location_lng != null) {
      lat = Number(st.location_lat);
      lng = Number(st.location_lng);
    } else if (st?.location?.latitude != null && st?.location?.longitude != null) {
      lat = Number(st.location.latitude);
      lng = Number(st.location.longitude);
    }
  }

  // Realistic default coordinates if not yet geotagged
  if (lat === undefined || lng === undefined || isNaN(lat) || isNaN(lng)) {
    lat = 11.0467;
    lng = 76.0747;
  }

  const rawAddr = st?.location_address || st?.location?.address;
  const rawName = st?.location?.name || st?.location_name || fallbackCity;
  const fullAddress = rawAddr && rawAddr !== rawName ? rawAddr : (rawAddr || `${rawName}, Saudi Arabia`);
  const companyName = trip?.customer?.name || 'Horizon Distributors Co.';

  return {
    latitude: Number(lat),
    longitude: Number(lng),
    timestamp: timestamp || st?.actual_arrival || st?.planned_arrival || new Date().toISOString(),
    locationName: rawName,
    fullAddress,
    companyName,
  };
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

export default function TripPhotoEvidence({
  documents = [],
  stops = [],
  trip,
  onPreview,
}: TripPhotoEvidenceProps) {
  const [selectedLocation, setSelectedLocation] = useState<string>('all');

  const effectiveEvidence: LegSection[] = useMemo(() => {
    // If no stops provided, fallback to trip origin/destination
    if (!stops || stops.length === 0) {
      const originCity = cleanCityName(null, trip?.pickup || 'Origin');
      const destCity = cleanCityName(null, trip?.dropoff || 'Destination');
      return [
        {
          id: 'outbound',
          title: 'OUTBOUND LEG',
          icon: '↗',
          pillColor: 'bg-emerald-50 text-emerald-700 border-emerald-200',
          locations: [
            {
              seq: '01',
              seqNumber: 1,
              city: originCity,
              badgeText: 'PICKUP',
              badgeColor: 'bg-emerald-50 text-emerald-700 border-emerald-200',
              seqBgColor: 'bg-emerald-600 text-white',
              photos: [
                {
                  id: 'p1_arr',
                  title: 'Pickup Arrival Photo',
                  type: 'arrival',
                  status: 'Pending',
                  location: originCity,
                  time: 'Pending',
                  sampleImg: '',
                  isRealDoc: false,
                },
                {
                  id: 'p1_load1',
                  title: 'Loading Photo 1',
                  type: 'proof',
                  status: 'Pending',
                  location: originCity,
                  time: 'Pending',
                  sampleImg: '',
                  isRealDoc: false,
                },
                {
                  id: 'p1_load2',
                  title: 'Loading Photo 2',
                  type: 'proof',
                  status: 'Pending',
                  location: originCity,
                  time: 'Pending',
                  sampleImg: '',
                  isRealDoc: false,
                },
                {
                  id: 'p1_load3',
                  title: 'Loading Photo 3',
                  type: 'proof',
                  status: 'Pending',
                  location: originCity,
                  time: 'Pending',
                  sampleImg: '',
                  isRealDoc: false,
                },
              ],
            },
            {
              seq: '02',
              seqNumber: 2,
              city: destCity,
              badgeText: 'DELIVERY',
              badgeColor: 'bg-emerald-50 text-emerald-700 border-emerald-200',
              seqBgColor: 'bg-emerald-600 text-white',
              photos: [
                {
                  id: 'p2_arr',
                  title: 'Delivery Arrival Photo',
                  type: 'arrival',
                  status: 'Pending',
                  location: destCity,
                  time: 'Pending',
                  sampleImg: '',
                  isRealDoc: false,
                },
                {
                  id: 'p2_del1',
                  title: 'Delivery Photo 1',
                  type: 'document',
                  status: 'Pending',
                  location: destCity,
                  time: 'Pending',
                  sampleImg: '',
                  isRealDoc: false,
                },
                {
                  id: 'p2_del2',
                  title: 'Delivery Photo 2',
                  type: 'document',
                  status: 'Pending',
                  location: destCity,
                  time: 'Pending',
                  sampleImg: '',
                  isRealDoc: false,
                },
                {
                  id: 'p2_del3',
                  title: 'Delivery Photo 3',
                  type: 'document',
                  status: 'Pending',
                  location: destCity,
                  time: 'Pending',
                  sampleImg: '',
                  isRealDoc: false,
                },
              ],
            },
          ],
        },
      ];
    }

    // Determine if it is a round trip
    const firstCity = cleanCityName(stops[0], 'Origin');
    const lastCity = cleanCityName(stops[stops.length - 1], 'Destination');
    const isRoundTrip =
      (stops.length >= 4 && firstCity.toLowerCase() === lastCity.toLowerCase()) ||
      trip?.trip_type === 'round_trip' ||
      trip?.quotation?.line_type?.toUpperCase().includes('ROUND') ||
      trip?.rateCard?.rate_category?.toUpperCase().includes('ROUND') ||
      stops.some((s: any) => s.is_return || s.leg_index === 1);

    // Extract valid photo documents (photos only; delay videos and delay reports belong exclusively in Delay Alerts)
    const photoDocs = (documents || []).filter((d: any) => {
      // Delay evidence & delay videos are shown exclusively in the dedicated Delay Alerts section
      if (checkIsDelay(d) || checkIsVideo(d) || d.doc_type === 'DelayEvidence' || d.doc_type === 'Emergency') {
        return false;
      }
      const isImg = d.mime_type?.startsWith('image/') || /\.(jpe?g|png|webp)$/i.test(d.file_url || '');
      const isTripDoc = d.doc_type === 'POD' || d.doc_type === 'Waybill' || d.doc_type === 'Other' || d.doc_type === 'Delivery';
      return (isImg || isTripDoc) && !!d.file_url;
    });

    const buildLocation = (
      st: any,
      overallIdx: number,
      role: 'pickup' | 'stop' | 'delivery' | 'return_loading' | 'return_stop' | 'return_delivery',
      isReturn: boolean
    ): LocationGroup => {
      const city = cleanCityName(st, isReturn ? (role === 'return_delivery' ? firstCity : 'Stop') : (role === 'pickup' ? firstCity : 'Stop'));
      const seqStr = String(overallIdx + 1).padStart(2, '0');
      const stopArrivalTime = st.actual_arrival
        ? formatDocTime(st.actual_arrival)
        : st.planned_arrival
        ? `Est: ${formatDocTime(st.planned_arrival)}`
        : 'Pending';

      let badgeText = 'STOP';
      let badgeColor = 'bg-orange-50 text-orange-700 border-orange-200';
      let seqBgColor = 'bg-orange-500 text-white';

      if (role === 'pickup') {
        badgeText = 'PICKUP';
        badgeColor = 'bg-emerald-50 text-emerald-700 border-emerald-200';
        seqBgColor = 'bg-emerald-600 text-white';
      } else if (role === 'delivery') {
        badgeText = isRoundTrip ? 'STOP 1' : 'DELIVERY';
        badgeColor = 'bg-emerald-50 text-emerald-700 border-emerald-200';
        seqBgColor = 'bg-emerald-600 text-white';
      } else if (role === 'return_loading') {
        badgeText = 'RETURN LOADING';
        badgeColor = 'bg-blue-50 text-blue-700 border-blue-200';
        seqBgColor = 'bg-blue-600 text-white';
      } else if (role === 'return_delivery') {
        badgeText = 'RETURN DELIVERY';
        badgeColor = 'bg-blue-50 text-blue-700 border-blue-200';
        seqBgColor = 'bg-blue-600 text-white';
      } else if (role === 'return_stop') {
        badgeText = `RETURN STOP ${overallIdx - 2}`;
        badgeColor = 'bg-purple-50 text-purple-700 border-purple-200';
        seqBgColor = 'bg-purple-600 text-white';
      } else {
        badgeText = `STOP ${overallIdx}`;
      }

      const photos: PhotoCardItem[] = [];

      if (role === 'pickup' || role === 'return_loading') {
        // Find explicit arrival doc if tagged
        let arrivalDoc = photoDocs.find((d: any) =>
          d.ai_extracted_json?.operation === (isReturn ? 'return_loading_arrival' : 'pickup_arrival') ||
          (d.ai_extracted_json?.operation === 'arrival' && d.doc_type !== 'POD' && (d.ai_extracted_json?.leg_index === (isReturn ? 1 : 0) || d.ai_extracted_json?.leg_index === undefined))
        );

        // Candidate pickup cargo docs
        const candidatePickupDocs = photoDocs.filter((d: any) => {
          const op = d.ai_extracted_json?.operation;
          if (op?.includes('stop') || op?.includes('delivery') || op?.includes('unload') || op?.includes('delay')) return false;
          if (d.doc_type === 'POD') return false;
          if (isReturn) {
            return (
              op === 'return_loading' ||
              op === 'return_loading_proof' ||
              op === 'return_waybill' ||
              d.ai_extracted_json?.leg_index === 1
            );
          }
          return (
            op === 'pickup' ||
            op === 'pickup_loading_proof' ||
            op === 'pickup_waybill' ||
            op === 'cargo' ||
            d.doc_type === 'Waybill' ||
            d.doc_type === 'Other' ||
            d.ai_extracted_json?.leg_index === 0 ||
            d.ai_extracted_json?.leg_index === undefined
          );
        });

        // If no document was explicitly tagged as arrival, use the first photo as arrival photo:
        if (!arrivalDoc && candidatePickupDocs.length > 0) {
          arrivalDoc = candidatePickupDocs[0];
        }

        photos.push({
          id: `${seqStr}_arrival`,
          title: resolveCardTitle(isReturn ? 'Return Loading Arrival' : 'Pickup Arrival Photo', arrivalDoc),
          type: 'arrival',
          status: arrivalDoc ? 'Received' : (st.actual_arrival ? 'Received' : 'Pending'),
          location: city,
          time: arrivalDoc?.createdAt ? formatDocTime(arrivalDoc.createdAt) : stopArrivalTime,
          sampleImg: arrivalDoc ? resolveDocUrl(arrivalDoc.file_url) : '',
          isRealDoc: !!arrivalDoc,
          geotag: extractPhotoGeotag(arrivalDoc, st, trip, city),
          isVideo: checkIsVideo(arrivalDoc),
          isDelayEvidence: checkIsDelay(arrivalDoc),
        });

        // Loading photos: remaining candidate docs (excluding arrivalDoc)
        const loadingDocs = candidatePickupDocs.filter((d: any) => d !== arrivalDoc && !d.ai_extracted_json?.operation?.includes('arrival'));
        const loadingCount = Math.max(3, loadingDocs.length);

        for (let i = 0; i < loadingCount; i++) {
          const doc = loadingDocs[i];
          photos.push({
            id: `${seqStr}_load_${i + 1}`,
            title: resolveCardTitle(isReturn ? `Return Loading ${i + 1}` : `Loading Photo ${i + 1}`, doc),
            type: 'proof',
            status: doc ? 'Received' : (st.actual_departure ? 'Received' : 'Pending'),
            location: city,
            time: doc?.createdAt ? formatDocTime(doc.createdAt) : stopArrivalTime,
            sampleImg: doc ? resolveDocUrl(doc.file_url) : '',
            isRealDoc: !!doc,
            geotag: extractPhotoGeotag(doc, st, trip, city),
            isVideo: checkIsVideo(doc),
            isDelayEvidence: checkIsDelay(doc),
          });
        }
      } else if (role === 'stop' || role === 'return_stop') {
        // Slot 1: Stop Arrival Photo
        let arrivalDoc = photoDocs.find((d: any) =>
          d.ai_extracted_json?.operation === (isReturn ? 'return_stop_arrival' : 'stop_arrival') ||
          (d.ai_extracted_json?.operation === 'arrival' && d.ai_extracted_json?.leg_index === overallIdx)
        );

        // Intermediate stop inspection photos
        const candidateStopDocs = photoDocs.filter((d: any) => {
          const op = d.ai_extracted_json?.operation;
          return (
            op?.includes('stop') ||
            d.ai_extracted_json?.operation === 'intermediate_stop' ||
            d.ai_extracted_json?.operation === 'return_intermediate_stop'
          );
        });

        if (!arrivalDoc && candidateStopDocs.length > 0) {
          const explicitArrival = candidateStopDocs.find((d: any) => d.ai_extracted_json?.operation?.includes('arrival'));
          if (explicitArrival) {
            arrivalDoc = explicitArrival;
          } else if (candidateStopDocs.length === 1 && !st.actual_departure) {
            arrivalDoc = candidateStopDocs[0];
          } else if (candidateStopDocs.length > 3) {
            arrivalDoc = candidateStopDocs[0];
          }
        }

        photos.push({
          id: `${seqStr}_arrival`,
          title: resolveCardTitle(isReturn ? 'Return Stop Arrival' : 'Stop Arrival Photo', arrivalDoc),
          type: 'arrival',
          status: arrivalDoc ? 'Received' : (st.actual_arrival ? 'Received' : 'Pending'),
          location: city,
          time: arrivalDoc?.createdAt ? formatDocTime(arrivalDoc.createdAt) : stopArrivalTime,
          sampleImg: arrivalDoc ? resolveDocUrl(arrivalDoc.file_url) : '',
          isRealDoc: !!arrivalDoc,
          geotag: extractPhotoGeotag(arrivalDoc, st, trip, city),
          isVideo: checkIsVideo(arrivalDoc),
          isDelayEvidence: checkIsDelay(arrivalDoc),
        });

        const stopPhotoList = candidateStopDocs.filter((d: any) => d !== arrivalDoc && !d.ai_extracted_json?.operation?.includes('arrival'));
        const stopCount = Math.max(3, stopPhotoList.length);

        for (let i = 0; i < stopCount; i++) {
          const doc = stopPhotoList[i];
          photos.push({
            id: `${seqStr}_stop_${i + 1}`,
            title: resolveCardTitle(isReturn ? `Return Stop ${i + 1}` : `Stop Photo ${i + 1}`, doc),
            type: 'stop',
            status: doc ? 'Received' : (st.actual_arrival ? 'Received' : 'Pending'),
            location: city,
            time: doc?.createdAt ? formatDocTime(doc.createdAt) : stopArrivalTime,
            sampleImg: doc ? resolveDocUrl(doc.file_url) : '',
            isRealDoc: !!doc,
            geotag: extractPhotoGeotag(doc, st, trip, city),
            isVideo: checkIsVideo(doc),
            isDelayEvidence: checkIsDelay(doc),
          });
        }
      } else {
        // Delivery or Return Delivery
        // Slot 1: Arrival Photo
        let arrivalDoc = photoDocs.find((d: any) =>
          d.ai_extracted_json?.operation === (isReturn ? 'return_delivery_arrival' : 'delivery_arrival') ||
          (d.ai_extracted_json?.operation === 'arrival' && d.doc_type !== 'Waybill' && (d.ai_extracted_json?.leg_index === (isReturn ? 1 : 0) || d.ai_extracted_json?.leg_index === undefined))
        );

        // Candidate Delivery Photos (POD / Unload / Completion)
        const candidateDeliveryDocs = photoDocs.filter((d: any) => {
          const op = d.ai_extracted_json?.operation;
          if (op?.includes('stop') || op?.includes('pickup') || op?.includes('loading') || op?.includes('delay')) return false;
          if (d.doc_type === 'Waybill') return false;
          if (isReturn) {
            return (
              op === 'return_delivery' ||
              op === 'return_unload' ||
              d.ai_extracted_json?.leg_index === 1
            );
          }
          return (
            op === 'delivery' ||
            op === 'delivery_unload' ||
            op === 'delivery_cargo' ||
            op === 'pod' ||
            d.doc_type === 'POD' ||
            d.doc_type === 'Delivery' ||
            d.ai_extracted_json?.leg_index === 0 ||
            d.ai_extracted_json?.leg_index === undefined
          );
        });

        if (!arrivalDoc && candidateDeliveryDocs.length > 0) {
          const explicitArrival = candidateDeliveryDocs.find((d: any) => d.ai_extracted_json?.operation?.includes('arrival'));
          if (explicitArrival) {
            arrivalDoc = explicitArrival;
          } else if (candidateDeliveryDocs.length === 1 && !st.actual_departure && trip?.status !== 'Completed') {
            arrivalDoc = candidateDeliveryDocs[0];
          } else if (candidateDeliveryDocs.length > 3) {
            arrivalDoc = candidateDeliveryDocs[0];
          }
        }

        photos.push({
          id: `${seqStr}_arrival`,
          title: resolveCardTitle(isReturn ? 'Return Delivery Arrival' : 'Delivery Arrival Photo', arrivalDoc),
          type: 'arrival',
          status: arrivalDoc ? 'Received' : (st.actual_arrival ? 'Received' : 'Pending'),
          location: city,
          time: arrivalDoc?.createdAt ? formatDocTime(arrivalDoc.createdAt) : stopArrivalTime,
          sampleImg: arrivalDoc ? resolveDocUrl(arrivalDoc.file_url) : '',
          isRealDoc: !!arrivalDoc,
          geotag: extractPhotoGeotag(arrivalDoc, st, trip, city),
          isVideo: checkIsVideo(arrivalDoc),
          isDelayEvidence: checkIsDelay(arrivalDoc),
        });

        // Slots 2, 3, 4: Delivery Photos
        const deliveryDocs = candidateDeliveryDocs.filter((d: any) => d !== arrivalDoc && !d.ai_extracted_json?.operation?.includes('arrival'));
        const delCount = Math.max(3, deliveryDocs.length);

        for (let i = 0; i < delCount; i++) {
          const doc = deliveryDocs[i];
          photos.push({
            id: `${seqStr}_del_${i + 1}`,
            title: resolveCardTitle(isReturn ? `Return Delivery ${i + 1}` : `Delivery Photo ${i + 1}`, doc),
            type: 'document',
            status: doc ? 'Received' : (st.actual_arrival ? 'Received' : 'Pending'),
            location: city,
            time: doc?.createdAt ? formatDocTime(doc.createdAt) : stopArrivalTime,
            sampleImg: doc ? resolveDocUrl(doc.file_url) : '',
            isRealDoc: !!doc,
            geotag: extractPhotoGeotag(doc, st, trip, city),
            isVideo: checkIsVideo(doc),
            isDelayEvidence: checkIsDelay(doc),
          });
        }
      }

      return {
        seq: seqStr,
        seqNumber: overallIdx + 1,
        city,
        badgeText,
        badgeColor,
        seqBgColor,
        photos,
      };
    };

    if (isRoundTrip) {
      const mid = Math.ceil(stops.length / 2);
      const outboundStops = stops.slice(0, mid);
      const returnStops = stops.slice(mid);

      const outboundLocations = outboundStops.map((st: any, idx: number) => {
        const isFirst = idx === 0;
        const isLast = idx === outboundStops.length - 1;
        const role = isFirst ? 'pickup' : (isLast ? 'delivery' : 'stop');
        return buildLocation(st, idx, role, false);
      });

      const returnLocations = returnStops.map((st: any, idx: number) => {
        const isFirst = idx === 0;
        const isLast = idx === returnStops.length - 1;
        const role = isFirst ? 'return_loading' : (isLast ? 'return_delivery' : 'return_stop');
        return buildLocation(st, mid + idx, role, true);
      });

      return [
        {
          id: 'outbound',
          title: 'OUTBOUND LEG',
          icon: '↗',
          pillColor: 'bg-emerald-50 text-emerald-700 border-emerald-200',
          locations: outboundLocations,
        },
        {
          id: 'return',
          title: 'RETURN LEG',
          icon: '↩',
          pillColor: 'bg-blue-50 text-blue-700 border-blue-200',
          locations: returnLocations,
        },
      ];
    } else {
      const locations = stops.map((st: any, idx: number) => {
        const isFirst = idx === 0;
        const isLast = idx === stops.length - 1;
        const role = isFirst ? 'pickup' : (isLast ? 'delivery' : 'stop');
        return buildLocation(st, idx, role, false);
      });

      return [
        {
          id: 'outbound',
          title: 'OUTBOUND LEG',
          icon: '↗',
          pillColor: 'bg-emerald-50 text-emerald-700 border-emerald-200',
          locations,
        },
      ];
    }
  }, [stops, documents, trip]);

  const allLocationsList = useMemo(() => {
    return effectiveEvidence.flatMap((leg) => leg.locations);
  }, [effectiveEvidence]);

  const totalPhotosCount = useMemo(() => {
    return effectiveEvidence.reduce(
      (acc, leg) => acc + leg.locations.reduce((lAcc, loc) => lAcc + loc.photos.length, 0),
      0
    );
  }, [effectiveEvidence]);

  return (
    <div className="w-full h-full bg-white rounded-2xl border border-[#E5E7EB] shadow-[0_1px_3px_rgba(0,0,0,0.04)] px-4 py-3 flex flex-col justify-between gap-2">
      
      {/* ── HEADER ROW ── */}
      <div className="flex items-center justify-between pb-1.5 border-b border-[#F3F4F6] shrink-0">
        <h3 className="font-extrabold text-[13.5px] sm:text-[14px] text-[#111827] leading-tight">
          Trip Photo Evidence
        </h3>

        <div className="flex items-center gap-2">
          {/* Dynamic Filter Dropdown */}
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
            <DropdownMenuContent align="end" className="w-52">
              <DropdownMenuItem onClick={() => setSelectedLocation('all')}>
                All Locations ({totalPhotosCount} Photos)
              </DropdownMenuItem>
              {allLocationsList.map((loc) => (
                <DropdownMenuItem
                  key={loc.seq}
                  onClick={() => setSelectedLocation(`${loc.seq} ${loc.city}`)}
                >
                  {loc.seq} {loc.city} ({loc.badgeText})
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>

          {/* Photos Count Badge */}
          <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[11px] font-bold bg-slate-100 text-slate-700 border border-slate-200">
            <Camera size={12} className="text-slate-500" />
            <span>{totalPhotosCount} Photos</span>
          </div>
        </div>
      </div>

      {/* ── HORIZONTAL LEGS CONTENT CONTAINER ── */}
      <div className="flex flex-col gap-2 pt-0.5 flex-1 justify-between">
        {effectiveEvidence.map((leg) => {
          const filteredLocations =
            selectedLocation === 'all'
              ? leg.locations
              : leg.locations.filter((loc) =>
                  `${loc.seq} ${loc.city}`.toLowerCase().includes(selectedLocation.toLowerCase())
                );

          if (filteredLocations.length === 0) return null;

          return (
            <div key={leg.id} className="flex-1 min-h-0 flex flex-col justify-between">
              
              {/* Leg Title Badge Row */}
              <div className="flex items-center gap-2 pb-0.5 shrink-0">
                <span
                  className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[8.5px] font-extrabold uppercase tracking-wider border ${leg.pillColor}`}
                >
                  <span>{leg.icon}</span>
                  <span>{leg.title}</span>
                </span>
                <div className="h-px bg-slate-100 flex-1" />
              </div>

              {/* Proportional Locations Grid: Each location expands to fill leg width evenly */}
              <div className="flex flex-wrap sm:flex-nowrap gap-2 items-stretch w-full">
                {filteredLocations.map((loc) => {
                  return (
                    <div
                      key={loc.seq}
                      className="flex-1 min-w-[240px] bg-slate-50/70 border border-slate-200/80 rounded-xl p-1.5 flex flex-col justify-between"
                    >
                      {/* Location Header */}
                      <div className="flex items-center justify-between gap-1 pb-1 shrink-0 border-b border-slate-200/60">
                        <div className="flex items-center gap-1.5 min-w-0">
                          <span
                            className={`w-4 h-4 rounded-full flex items-center justify-center font-black text-[8.5px] shrink-0 ${loc.seqBgColor}`}
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

                      {/* Photo Cards Container (up to 4 across) */}
                      <div
                        className={`grid ${
                          loc.photos.length === 1
                            ? 'grid-cols-1'
                            : loc.photos.length === 2
                            ? 'grid-cols-2'
                            : loc.photos.length === 4
                            ? 'grid-cols-2 sm:grid-cols-4'
                            : 'grid-cols-3'
                        } gap-1 pt-1 items-stretch`}
                      >
                        {loc.photos.map((photo) => {
                          const isArrival = photo.type === 'arrival';
                          const isStop = photo.type === 'stop';
                          const isDoc = photo.type === 'document';

                          return (
                            <div
                              key={photo.id}
                              className="bg-white border border-[#E5E7EB] hover:border-blue-300 rounded-lg p-1.5 flex flex-col gap-1 transition-all hover:shadow-2xs group min-w-0"
                            >
                              {/* Photo Header: Icon + Title + Received Badge */}
                              <div className="flex items-center justify-between gap-1 pb-0.5 shrink-0">
                                <div className="flex items-center gap-1 min-w-0">
                                  {photo.isDelayEvidence ? (
                                    <AlertTriangle
                                      size={10}
                                      className="text-amber-600 shrink-0 stroke-[2.5]"
                                    />
                                  ) : photo.isVideo ? (
                                    <Video
                                      size={10}
                                      className="text-purple-600 shrink-0 stroke-[2.5]"
                                    />
                                  ) : isArrival ? (
                                    <ArrowUpRight
                                      size={10}
                                      className="text-purple-600 shrink-0 stroke-[2.5]"
                                    />
                                  ) : isDoc ? (
                                    <FileText
                                      size={10}
                                      className="text-emerald-600 shrink-0 stroke-[2.5]"
                                    />
                                  ) : isStop ? (
                                    <Flag
                                      size={10}
                                      className="text-blue-600 shrink-0 stroke-[2.5]"
                                    />
                                  ) : (
                                    <PackageCheck
                                      size={10}
                                      className="text-amber-600 shrink-0 stroke-[2.5]"
                                    />
                                  )}
                                  <span
                                    className="font-bold text-[8px] sm:text-[8.5px] text-[#1F2937] truncate"
                                    title={photo.title}
                                  >
                                    {photo.title}
                                  </span>
                                </div>
                                <span
                                  className={`px-1 py-0.2 rounded text-[7px] sm:text-[7.5px] font-bold border shrink-0 leading-none ${
                                    photo.isRealDoc
                                      ? photo.isDelayEvidence
                                        ? 'bg-amber-50 text-amber-700 border-amber-300 font-black'
                                        : 'bg-emerald-50 text-emerald-700 border-emerald-200'
                                      : 'bg-amber-50 text-amber-700 border-amber-200'
                                  }`}
                                >
                                  {photo.status}
                                </span>
                              </div>

                              {/* Thumbnail Image, Video, or Dedicated Camera Placeholder */}
                              {photo.sampleImg ? (
                                photo.isVideo ? (
                                  <div
                                    onClick={() =>
                                      onPreview({
                                        url: photo.sampleImg,
                                        title: photo.title,
                                        location: photo.location,
                                        date: photo.time,
                                        geotag: photo.geotag,
                                        isVideo: true,
                                      })
                                    }
                                    className="relative w-full aspect-square rounded-md overflow-hidden bg-slate-950 border border-slate-700/80 cursor-pointer group shrink-0 flex items-center justify-center"
                                  >
                                    <video
                                      src={photo.sampleImg.includes('#t=') ? photo.sampleImg : `${photo.sampleImg}#t=0.001`}
                                      preload="metadata"
                                      muted
                                      playsInline
                                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-200"
                                      onError={(e) => {
                                        (e.target as HTMLElement).style.opacity = '0';
                                      }}
                                    />
                                    <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/30 to-black/40 group-hover:via-black/20 transition-colors flex flex-col items-center justify-center gap-1">
                                      <div className="w-8 h-8 rounded-full bg-[#FA634E] text-white flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform">
                                        <Play size={14} className="fill-white ml-0.5 text-white" />
                                      </div>
                                    </div>
                                    <div className="absolute bottom-1 left-1 bg-black/80 backdrop-blur-xs text-white text-[7px] sm:text-[7.5px] font-bold px-1.5 py-0.5 rounded flex items-center gap-1 shadow-sm border border-white/10">
                                      <Video size={8} />
                                      <span>{photo.isDelayEvidence ? 'Delay Video' : 'Video'}</span>
                                    </div>
                                  </div>
                                ) : (
                                  <div
                                    onClick={() =>
                                      onPreview({
                                        url: photo.sampleImg,
                                        title: photo.title,
                                        location: photo.location,
                                        date: photo.time,
                                        geotag: photo.geotag,
                                        isVideo: false,
                                      })
                                    }
                                    className="relative w-full aspect-square rounded-md overflow-hidden bg-slate-100 border border-slate-200/80 cursor-pointer group shrink-0"
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
                                      <Eye size={14} />
                                    </div>
                                  </div>
                                )
                              ) : (
                                <div className="relative w-full aspect-square rounded-md bg-slate-50 border border-dashed border-slate-200 flex flex-col items-center justify-center gap-1 text-slate-400 shrink-0">
                                  <Camera size={15} className="text-slate-300" />
                                  <span className="text-[7.5px] font-medium text-slate-400">No photo uploaded</span>
                                </div>
                              )}

                              {/* Photo Metadata Footer */}
                              <div className="pt-0.5 flex items-center justify-between text-[7.5px] sm:text-[8px] text-slate-500 shrink-0">
                                <div className="flex items-center gap-1 font-mono text-[#6B7280] truncate">
                                  <Clock size={8} className="text-[#9CA3AF] shrink-0" />
                                  <span className="truncate">{photo.time}</span>
                                </div>

                                {photo.sampleImg ? (
                                  <button
                                    type="button"
                                    onClick={() =>
                                      onPreview({
                                        url: photo.sampleImg,
                                        title: photo.title,
                                        location: photo.location,
                                        date: photo.time,
                                        geotag: photo.geotag,
                                        isVideo: photo.isVideo,
                                      })
                                    }
                                    className="flex items-center gap-0.5 font-bold text-blue-600 hover:text-blue-700 cursor-pointer"
                                  >
                                    {photo.isVideo ? (
                                      <>
                                        <Play size={9} className="fill-current text-[#FA634E]" />
                                        <span className="text-[#FA634E]">Play</span>
                                      </>
                                    ) : (
                                      <>
                                        <Eye size={9} />
                                        <span>View</span>
                                      </>
                                    )}
                                  </button>
                                ) : (
                                  <span className="text-slate-400">Awaiting Driver</span>
                                )}
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
