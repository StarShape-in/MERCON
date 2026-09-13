import React, { useState, useMemo } from 'react';
import {
  Clock, Eye, Camera, ChevronDown,
  ArrowUpRight, PackageCheck, Flag, FileText,
  Play, Video, AlertTriangle, UploadCloud,
  MessageCircle, Layers, Grid, ListFilter, Share2, Sparkles, Filter, CheckCircle2
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
} from '@/components/ui/dropdown-menu';
import { GeotagEvidenceData } from './GeotagEvidenceCard';
import { EvidenceLightboxModal, LightboxPhotoItem } from './EvidenceLightboxModal';
import { openPhotoEvidenceWhatsapp } from '@/utils/whatsappFormatter';

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
  onUpload?: () => void;
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
  onUpload,
}: TripPhotoEvidenceProps) {
  const [selectedLocation, setSelectedLocation] = useState<string>('all');
  const [viewMode, setViewMode] = useState<'stacks' | 'grid' | 'timeline'>('stacks');
  const [categoryFilter, setCategoryFilter] = useState<'all' | 'pod' | 'loading' | 'delay'>('all');
  const [lightboxOpen, setLightboxOpen] = useState<boolean>(false);
  const [lightboxIndex, setLightboxIndex] = useState<number>(0);
  const [lightboxPhotos, setLightboxPhotos] = useState<LightboxPhotoItem[]>([]);

  const handleOpenLightbox = (photosToView: PhotoCardItem[], startIndex = 0) => {
    const validItems: LightboxPhotoItem[] = photosToView
      .filter((p) => !!p.sampleImg)
      .map((p) => ({
        id: p.id,
        url: p.sampleImg,
        title: p.title,
        time: p.time,
        location: p.location,
        status: p.status,
        isVideo: p.isVideo,
        isDelayEvidence: p.isDelayEvidence,
        geotag: p.geotag ? {
          latitude: p.geotag.latitude,
          longitude: p.geotag.longitude,
          address: p.geotag.fullAddress,
          city: p.geotag.locationName,
          timestamp: p.geotag.timestamp,
        } : undefined,
      }));

    if (validItems.length > 0) {
      setLightboxPhotos(validItems);
      setLightboxIndex(Math.min(startIndex, validItems.length - 1));
      setLightboxOpen(true);
    }
  };

  const handleShareAllWhatsapp = () => {
    const geotagCoords = trip?.stops?.[0]?.location_lat && trip?.stops?.[0]?.location_lng
      ? `${trip.stops[0].location_lat}, ${trip.stops[0].location_lng}`
      : undefined;

    openPhotoEvidenceWhatsapp({
      tripRef: trip?.ref_id || 'TRIP',
      customerName: trip?.customer?.name,
      customerPhone: trip?.customer?.contact_phone || trip?.customer?.whatsapp_number,
      stopName: `${stops.length} Locations / Stops`,
      photoCount: documents.length || 40,
      evidenceCategory: 'Full Trip Photo Gallery',
      uploadTime: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      geotagCoords,
      publicGalleryUrl: `${window.location.origin}/trips/evidence-gallery?ref=${encodeURIComponent(trip?.ref_id || 'TRIP')}`,
    });
  };

  const handleShareStopWhatsapp = (loc: LocationGroup) => {
    const validPhotos = loc.photos.filter((p) => !!p.sampleImg);
    const firstGeotag = validPhotos.find((p) => p.geotag?.latitude)?.geotag;
    const geotagCoords = firstGeotag?.latitude && firstGeotag?.longitude
      ? `${firstGeotag.latitude}, ${firstGeotag.longitude}`
      : undefined;

    openPhotoEvidenceWhatsapp({
      tripRef: trip?.ref_id || 'TRIP',
      customerName: trip?.customer?.name,
      customerPhone: trip?.customer?.contact_phone || trip?.customer?.whatsapp_number,
      stopName: `${loc.seq} ${loc.city} (${loc.badgeText})`,
      photoCount: validPhotos.length,
      evidenceCategory: `${loc.badgeText} Evidence`,
      uploadTime: validPhotos[0]?.time || new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      geotagCoords,
      publicGalleryUrl: `${window.location.origin}/trips/evidence-gallery?ref=${encodeURIComponent(trip?.ref_id || 'TRIP')}`,
    });
  };


  const photoDocs = useMemo(() => {
    return (documents || []).filter((d: any) => {
      if (checkIsDelay(d) || checkIsVideo(d) || d.doc_type === 'DelayEvidence' || d.doc_type === 'Emergency') {
        return false;
      }
      const isImg = d.mime_type?.startsWith('image/') || /\.(jpe?g|png|webp)$/i.test(d.file_url || '');
      const isTripDoc = d.doc_type === 'POD' || d.doc_type === 'Waybill' || d.doc_type === 'Other' || d.doc_type === 'Delivery';
      return (isImg || isTripDoc) && !!d.file_url;
    });
  }, [documents]);

  if (photoDocs.length === 0) {
    return (
      <div className="bg-white border border-[#E5E7EB] rounded-2xl p-6 shadow-xs flex flex-col items-center justify-center text-center h-full min-h-[320px]">
        <div className="w-12 h-12 rounded-full bg-slate-100 flex items-center justify-center mb-3">
          <Camera size={24} className="text-slate-400" />
        </div>
        <h3 className="text-sm font-bold text-[#1F2937] mb-1">No Cargo or POD Photos Uploaded</h3>
        <p className="text-xs text-[#6B7280] max-w-sm mb-4">
          {trip?.status === 'Draft' || trip?.status === 'Scheduled'
            ? 'This trip is currently scheduled. Photos recorded during pickup or delivery will appear here automatically.'
            : 'No cargo, arrival, or proof-of-delivery photos have been attached to this trip yet.'}
        </p>
        {onUpload && (
          <Button
            onClick={onUpload}
            variant="outline"
            size="sm"
            className="h-8.5 px-4 rounded-xl border-[#E5E7EB] text-[#374151] hover:bg-slate-50 text-xs font-semibold gap-2 shadow-none cursor-pointer bg-white"
          >
            <UploadCloud size={14} className="text-[#6B7280]" />
            <span>Upload Document / Photo</span>
          </Button>
        )}
      </div>
    );
  }

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

        if (arrivalDoc) {
          photos.push({
            id: `${seqStr}_arrival`,
            title: resolveCardTitle(isReturn ? 'Return Loading Arrival' : 'Pickup Arrival Photo', arrivalDoc),
            type: 'arrival',
            status: 'Received',
            location: city,
            time: arrivalDoc.createdAt ? formatDocTime(arrivalDoc.createdAt) : stopArrivalTime,
            sampleImg: resolveDocUrl(arrivalDoc.file_url),
            isRealDoc: true,
            geotag: extractPhotoGeotag(arrivalDoc, st, trip, city),
            isVideo: checkIsVideo(arrivalDoc),
            isDelayEvidence: checkIsDelay(arrivalDoc),
          });
        }

        // Loading photos: remaining candidate docs (excluding arrivalDoc)
        const loadingDocs = candidatePickupDocs.filter((d: any) => d !== arrivalDoc && !d.ai_extracted_json?.operation?.includes('arrival'));
        loadingDocs.forEach((doc: any, i: number) => {
          photos.push({
            id: `${seqStr}_load_${i + 1}`,
            title: resolveCardTitle(isReturn ? `Return Loading ${i + 1}` : `Loading Photo ${i + 1}`, doc),
            type: 'proof',
            status: 'Received',
            location: city,
            time: doc.createdAt ? formatDocTime(doc.createdAt) : stopArrivalTime,
            sampleImg: resolveDocUrl(doc.file_url),
            isRealDoc: true,
            geotag: extractPhotoGeotag(doc, st, trip, city),
            isVideo: checkIsVideo(doc),
            isDelayEvidence: checkIsDelay(doc),
          });
        });
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

        if (arrivalDoc) {
          photos.push({
            id: `${seqStr}_arrival`,
            title: resolveCardTitle(isReturn ? 'Return Stop Arrival' : 'Stop Arrival Photo', arrivalDoc),
            type: 'arrival',
            status: 'Received',
            location: city,
            time: arrivalDoc.createdAt ? formatDocTime(arrivalDoc.createdAt) : stopArrivalTime,
            sampleImg: resolveDocUrl(arrivalDoc.file_url),
            isRealDoc: true,
            geotag: extractPhotoGeotag(arrivalDoc, st, trip, city),
            isVideo: checkIsVideo(arrivalDoc),
            isDelayEvidence: checkIsDelay(arrivalDoc),
          });
        }

        const stopPhotoList = candidateStopDocs.filter((d: any) => d !== arrivalDoc && !d.ai_extracted_json?.operation?.includes('arrival'));
        stopPhotoList.forEach((doc: any, i: number) => {
          photos.push({
            id: `${seqStr}_stop_${i + 1}`,
            title: resolveCardTitle(isReturn ? `Return Stop ${i + 1}` : `Stop Photo ${i + 1}`, doc),
            type: 'stop',
            status: 'Received',
            location: city,
            time: doc.createdAt ? formatDocTime(doc.createdAt) : stopArrivalTime,
            sampleImg: resolveDocUrl(doc.file_url),
            isRealDoc: true,
            geotag: extractPhotoGeotag(doc, st, trip, city),
            isVideo: checkIsVideo(doc),
            isDelayEvidence: checkIsDelay(doc),
          });
        });
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

        if (arrivalDoc) {
          photos.push({
            id: `${seqStr}_arrival`,
            title: resolveCardTitle(isReturn ? 'Return Delivery Arrival' : 'Delivery Arrival Photo', arrivalDoc),
            type: 'arrival',
            status: 'Received',
            location: city,
            time: arrivalDoc.createdAt ? formatDocTime(arrivalDoc.createdAt) : stopArrivalTime,
            sampleImg: resolveDocUrl(arrivalDoc.file_url),
            isRealDoc: true,
            geotag: extractPhotoGeotag(arrivalDoc, st, trip, city),
            isVideo: checkIsVideo(arrivalDoc),
            isDelayEvidence: checkIsDelay(arrivalDoc),
          });
        }

        // Slots 2, 3, 4: Delivery Photos
        const deliveryDocs = candidateDeliveryDocs.filter((d: any) => d !== arrivalDoc && !d.ai_extracted_json?.operation?.includes('arrival'));
        deliveryDocs.forEach((doc: any, i: number) => {
          photos.push({
            id: `${seqStr}_del_${i + 1}`,
            title: resolveCardTitle(isReturn ? `Return Delivery ${i + 1}` : `Delivery Photo ${i + 1}`, doc),
            type: 'document',
            status: 'Received',
            location: city,
            time: doc.createdAt ? formatDocTime(doc.createdAt) : stopArrivalTime,
            sampleImg: resolveDocUrl(doc.file_url),
            isRealDoc: true,
            geotag: extractPhotoGeotag(doc, st, trip, city),
            isVideo: checkIsVideo(doc),
            isDelayEvidence: checkIsDelay(doc),
          });
        });
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
      <div className="flex flex-wrap items-center justify-between gap-2 pb-2 border-b border-[#F3F4F6] shrink-0">
        
        {/* Title & View Mode Selector */}
        <div className="flex items-center gap-3">
          <h3 className="font-extrabold text-[13.5px] sm:text-[14px] text-[#111827] leading-tight">
            Trip Photo Evidence
          </h3>

          {/* View Mode Toggle Segmented Pills */}
          <div className="bg-slate-100/80 p-0.5 rounded-lg border border-slate-200/60 flex items-center gap-0.5">
            <button
              onClick={() => setViewMode('stacks')}
              className={`px-2 py-1 rounded-md text-[10px] font-bold flex items-center gap-1 transition-all cursor-pointer ${
                viewMode === 'stacks'
                  ? 'bg-white text-slate-900 shadow-2xs font-extrabold'
                  : 'text-slate-500 hover:text-slate-800'
              }`}
              title="Compact Grouped Photo Stacks"
            >
              <Layers size={11} className={viewMode === 'stacks' ? 'text-[#FA634E]' : ''} />
              <span>Compact Stacks</span>
            </button>

            <button
              onClick={() => setViewMode('grid')}
              className={`px-2 py-1 rounded-md text-[10px] font-bold flex items-center gap-1 transition-all cursor-pointer ${
                viewMode === 'grid'
                  ? 'bg-white text-slate-900 shadow-2xs font-extrabold'
                  : 'text-slate-500 hover:text-slate-800'
              }`}
              title="Expanded Grid View"
            >
              <Grid size={11} className={viewMode === 'grid' ? 'text-[#FA634E]' : ''} />
              <span>Grid Matrix</span>
            </button>

            <button
              onClick={() => setViewMode('timeline')}
              className={`px-2 py-1 rounded-md text-[10px] font-bold flex items-center gap-1 transition-all cursor-pointer ${
                viewMode === 'timeline'
                  ? 'bg-white text-slate-900 shadow-2xs font-extrabold'
                  : 'text-slate-500 hover:text-slate-800'
              }`}
              title="Chronological Timeline View"
            >
              <Clock size={11} className={viewMode === 'timeline' ? 'text-[#FA634E]' : ''} />
              <span>Timeline</span>
            </button>
          </div>
        </div>

        {/* Right Header Controls: WhatsApp Share, Filters, Count Badge */}
        <div className="flex items-center gap-2">
          
          {/* Quick WhatsApp Dispatch Button */}
          <Button
            size="sm"
            onClick={handleShareAllWhatsapp}
            className="h-7 px-2.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-[11px] gap-1 shadow-none cursor-pointer border border-emerald-500/20"
          >
            <MessageCircle size={12} />
            <span className="hidden sm:inline">Send to WhatsApp</span>
          </Button>

          {/* Dynamic Location Filter Dropdown */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="outline"
                size="sm"
                className="h-7 px-2.5 rounded-lg border-[#E5E7EB] text-[#374151] hover:bg-slate-50 text-[11px] font-semibold gap-1 shadow-none cursor-pointer bg-white"
              >
                <span>
                  {selectedLocation === 'all' ? 'All Locations' : selectedLocation}
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

      {/* ── LEGS & LOCATIONS CONTAINER ── */}
      <div className="flex flex-col gap-3 pt-1 flex-1 justify-between">
        {effectiveEvidence.map((leg) => {
          const filteredLocations =
            selectedLocation === 'all'
              ? leg.locations
              : leg.locations.filter((loc) =>
                  `${loc.seq} ${loc.city}`.toLowerCase().includes(selectedLocation.toLowerCase())
                );

          if (filteredLocations.length === 0) return null;

          return (
            <div key={leg.id} className="flex-1 min-h-0 flex flex-col justify-between gap-1.5">
              
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

              {/* ── MODE 1: COMPACT STACKED PREVIEW (DEFAULT) ── */}
              {viewMode === 'stacks' && (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2.5 items-stretch w-full">
                  {filteredLocations.map((loc) => {
                    const validPhotos = loc.photos.filter((p) => !!p.sampleImg);
                    const hasPhotos = validPhotos.length > 0;
                    const mainPhoto = validPhotos[0];
                    const extraCount = Math.max(0, validPhotos.length - 1);

                    return (
                      <div
                        key={loc.seq}
                        className="bg-slate-50/80 hover:bg-slate-50 border border-slate-200/90 rounded-xl p-2.5 flex flex-col justify-between transition-all hover:border-slate-300 hover:shadow-xs group"
                      >
                        {/* Location Header with Quick WhatsApp Trigger */}
                        <div className="flex items-center justify-between gap-1 pb-2 shrink-0 border-b border-slate-200/60">
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

                          <div className="flex items-center gap-1">
                            <span
                              className={`px-1.5 py-0.2 rounded text-[8px] font-black uppercase tracking-wider border shrink-0 ${loc.badgeColor}`}
                            >
                              {loc.badgeText}
                            </span>
                            <button
                              onClick={() => handleShareStopWhatsapp(loc)}
                              title="Share stop photos via WhatsApp"
                              className="p-1 rounded text-emerald-600 hover:bg-emerald-50 transition-colors cursor-pointer"
                            >
                              <MessageCircle size={13} />
                            </button>
                          </div>
                        </div>

                        {/* Stacked Thumbnail Preview Box */}
                        <div className="pt-2 flex-1 flex flex-col items-center justify-center">
                          {hasPhotos ? (
                            <div
                              onClick={() => handleOpenLightbox(loc.photos, 0)}
                              className="relative w-full aspect-16/10 rounded-lg overflow-hidden bg-slate-900 border border-slate-300 shadow-xs cursor-pointer group/stack flex items-center justify-center"
                            >
                              {/* Primary Main Photo Thumbnail */}
                              {mainPhoto.isVideo ? (
                                <video
                                  src={mainPhoto.sampleImg.includes('#t=') ? mainPhoto.sampleImg : `${mainPhoto.sampleImg}#t=0.001`}
                                  preload="metadata"
                                  muted
                                  className="w-full h-full object-cover group-hover/stack:scale-105 transition-transform duration-300"
                                />
                              ) : (
                                <img
                                  src={mainPhoto.sampleImg}
                                  alt={mainPhoto.title}
                                  className="w-full h-full object-cover group-hover/stack:scale-105 transition-transform duration-300"
                                />
                              )}

                              {/* Stack Overlay Layer */}
                              <div className="absolute inset-0 bg-gradient-to-t from-black/75 via-black/10 to-transparent flex flex-col justify-between p-2 text-white">
                                <div className="flex items-center justify-between gap-1">
                                  <Badge className="bg-black/60 backdrop-blur-xs text-white border-white/20 text-[9px] font-bold px-1.5 py-0.5">
                                    {mainPhoto.title}
                                  </Badge>
                                  {extraCount > 0 && (
                                    <div className="bg-[#FA634E] text-white font-extrabold text-[10px] px-2 py-0.5 rounded-full shadow-md">
                                      +{extraCount} more
                                    </div>
                                  )}
                                </div>

                                <div className="flex items-center justify-between text-[10px] font-medium text-slate-200">
                                  <span className="flex items-center gap-1 font-mono text-[9px]">
                                    <Clock size={10} className="text-amber-400" />
                                    {mainPhoto.time}
                                  </span>
                                  <span className="font-bold text-white flex items-center gap-1 group-hover/stack:underline">
                                    <Eye size={12} />
                                    Inspect ({validPhotos.length})
                                  </span>
                                </div>
                              </div>
                            </div>
                          ) : (
                            <div className="w-full aspect-16/10 rounded-lg bg-slate-100/70 border border-dashed border-slate-200 flex flex-col items-center justify-center gap-1 text-slate-400 p-3 text-center">
                              <Camera size={18} className="text-slate-300" />
                              <span className="text-[10px] font-semibold text-slate-500">No photos uploaded yet</span>
                              <span className="text-[9px] text-slate-400">Awaiting driver arrival</span>
                            </div>
                          )}
                        </div>

                        {/* Location Summary Footer */}
                        <div className="pt-2 flex items-center justify-between text-[9px] font-bold text-slate-500 border-t border-slate-200/50 mt-2">
                          <span className="text-slate-600 font-semibold">
                            {validPhotos.length} {validPhotos.length === 1 ? 'Evidence Photo' : 'Photos Recorded'}
                          </span>
                          {hasPhotos && (
                            <button
                              onClick={() => handleOpenLightbox(loc.photos, 0)}
                              className="text-[#FA634E] hover:underline font-extrabold flex items-center gap-0.5 cursor-pointer"
                            >
                              <span>View Gallery</span>
                              <ArrowUpRight size={10} />
                            </button>
                          )}
                        </div>

                      </div>
                    );
                  })}
                </div>
              )}

              {/* ── MODE 2: EXPANDED GRID MATRIX ── */}
              {viewMode === 'grid' && (
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
                          <div className="flex items-center gap-1">
                            <span
                              className={`px-1.5 py-0.2 rounded text-[8px] font-black uppercase tracking-wider border shrink-0 ${loc.badgeColor}`}
                            >
                              {loc.badgeText}
                            </span>
                            <button
                              onClick={() => handleShareStopWhatsapp(loc)}
                              className="p-0.5 rounded text-emerald-600 hover:bg-emerald-50 transition-colors cursor-pointer"
                            >
                              <MessageCircle size={12} />
                            </button>
                          </div>
                        </div>

                        {/* Expanded Photo Cards Matrix */}
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
                          {loc.photos.map((photo, pIdx) => {
                            const isArrival = photo.type === 'arrival';
                            const isStop = photo.type === 'stop';
                            const isDoc = photo.type === 'document';

                            return (
                              <div
                                key={photo.id}
                                className="bg-white border border-[#E5E7EB] hover:border-blue-300 rounded-lg p-1.5 flex flex-col gap-1 transition-all hover:shadow-2xs group min-w-0"
                              >
                                <div className="flex items-center justify-between gap-1 pb-0.5 shrink-0">
                                  <div className="flex items-center gap-1 min-w-0">
                                    {photo.isDelayEvidence ? (
                                      <AlertTriangle size={10} className="text-amber-600 shrink-0 stroke-[2.5]" />
                                    ) : photo.isVideo ? (
                                      <Video size={10} className="text-purple-600 shrink-0 stroke-[2.5]" />
                                    ) : isArrival ? (
                                      <ArrowUpRight size={10} className="text-purple-600 shrink-0 stroke-[2.5]" />
                                    ) : isDoc ? (
                                      <FileText size={10} className="text-emerald-600 shrink-0 stroke-[2.5]" />
                                    ) : (
                                      <PackageCheck size={10} className="text-amber-600 shrink-0 stroke-[2.5]" />
                                    )}
                                    <span className="font-bold text-[8.5px] text-[#1F2937] truncate" title={photo.title}>
                                      {photo.title}
                                    </span>
                                  </div>
                                  <span className="px-1 py-0.2 rounded text-[7.5px] font-bold border shrink-0 bg-emerald-50 text-emerald-700 border-emerald-200">
                                    {photo.status}
                                  </span>
                                </div>

                                {photo.sampleImg ? (
                                  <div
                                    onClick={() => handleOpenLightbox(loc.photos, pIdx)}
                                    className="relative w-full aspect-square rounded-md overflow-hidden bg-slate-100 border border-slate-200/80 cursor-pointer group shrink-0"
                                  >
                                    <img
                                      src={photo.sampleImg}
                                      alt={photo.title}
                                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-200"
                                    />
                                    <div className="absolute inset-0 bg-black/25 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-white">
                                      <Eye size={14} />
                                    </div>
                                  </div>
                                ) : (
                                  <div className="relative w-full aspect-square rounded-md bg-slate-50 border border-dashed border-slate-200 flex flex-col items-center justify-center gap-1 text-slate-400 shrink-0">
                                    <Camera size={14} className="text-slate-300" />
                                    <span className="text-[7.5px] font-medium text-slate-400">No photo uploaded</span>
                                  </div>
                                )}

                                <div className="pt-0.5 flex items-center justify-between text-[8px] text-slate-500 shrink-0">
                                  <span className="font-mono text-[#6B7280]">{photo.time}</span>
                                  {photo.sampleImg && (
                                    <button
                                      type="button"
                                      onClick={() => handleOpenLightbox(loc.photos, pIdx)}
                                      className="font-bold text-blue-600 hover:text-blue-700 cursor-pointer flex items-center gap-0.5"
                                    >
                                      <Eye size={9} />
                                      <span>View</span>
                                    </button>
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
              )}

              {/* ── MODE 3: CHRONOLOGICAL TIMELINE STREAM ── */}
              {viewMode === 'timeline' && (
                <div className="flex flex-col gap-2 pt-1">
                  {filteredLocations.flatMap((loc) => loc.photos).filter((p) => !!p.sampleImg).map((photo, idx) => (
                    <div
                      key={photo.id || idx}
                      className="bg-slate-50 border border-slate-200 rounded-xl p-3 flex items-center justify-between gap-4 hover:bg-slate-100/80 transition-colors"
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <div
                          onClick={() => handleOpenLightbox(allLocationsList.flatMap(l => l.photos), idx)}
                          className="w-14 h-14 rounded-lg overflow-hidden bg-slate-900 border border-slate-300 cursor-pointer shrink-0"
                        >
                          <img src={photo.sampleImg} alt="" className="w-full h-full object-cover" />
                        </div>
                        <div className="min-w-0">
                          <h4 className="font-extrabold text-xs text-slate-900 truncate">
                            {photo.title}
                          </h4>
                          <p className="text-[11px] text-slate-600 truncate">
                            📍 {photo.location} • <span className="font-mono text-slate-500">{photo.time}</span>
                          </p>
                          {photo.geotag?.latitude != null && photo.geotag?.longitude != null && (
                            <span className="inline-flex items-center gap-1 text-[10px] text-emerald-700 font-mono">
                              <CheckCircle2 size={10} />
                              Geotag: {photo.geotag.latitude.toFixed(4)}, {photo.geotag.longitude.toFixed(4)}
                            </span>
                          )}
                        </div>
                      </div>

                      <div className="flex items-center gap-2 shrink-0">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleOpenLightbox(allLocationsList.flatMap(l => l.photos), idx)}
                          className="h-8 px-2.5 text-xs font-bold gap-1 cursor-pointer bg-white"
                        >
                          <Eye size={12} />
                          <span>Inspect</span>
                        </Button>
                        <Button
                          size="sm"
                          onClick={() => openPhotoEvidenceWhatsapp({
                            tripRef: trip?.ref_id || 'TRIP',
                            stopName: photo.location,
                            evidenceCategory: photo.title,
                            uploadTime: photo.time,
                          })}
                          className="h-8 px-2.5 text-xs font-bold gap-1 cursor-pointer bg-emerald-600 hover:bg-emerald-700 text-white"
                        >
                          <MessageCircle size={12} />
                          <span>WhatsApp</span>
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}

            </div>
          );
        })}
      </div>

      {/* ── LIGHTBOX MODAL ── */}
      <EvidenceLightboxModal
        isOpen={lightboxOpen}
        onClose={() => setLightboxOpen(false)}
        photos={lightboxPhotos}
        initialIndex={lightboxIndex}
        tripRef={trip?.ref_id || 'TRIP'}
        customerName={trip?.customer?.name}
        customerPhone={trip?.customer?.contact_phone || trip?.customer?.whatsapp_number}
      />

    </div>
  );
}

