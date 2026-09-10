import React, { useState } from 'react';
import {
  Phone, Building2, ExternalLink,
  AlertTriangle, ChevronRight, CheckCircle2
} from 'lucide-react';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { useNavigate } from 'react-router-dom';
import TripDelayNotificationModal from './TripDelayNotificationModal';

interface TripOverviewBarCardProps {
  trip: any;
  documents?: any[];
  onViewAllAlerts?: () => void;
  onPreviewImage?: (img: { url: string; title: string }) => void;
}

function resolveFileUrl(url?: string | null): string {
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

export interface DelayAlertItem {
  id: string;
  label: string;
  delay: string;
  time: string;
  severe: boolean;
  reason?: string;
  location?: string;
  videoUrl?: string;
  imageUrl?: string;
}

export function extractTripDelayAlerts(trip: any, documents: any[] = []): DelayAlertItem[] {
  if (!trip) return [];
  const alerts: DelayAlertItem[] = [];

  // 1. Check for delay video / media documents attached to this trip
  const delayMedia = (documents || []).filter((doc: any) => {
    const fileUrl = (doc?.file_url || '').toLowerCase();
    const mime = (doc?.mime_type || '').toLowerCase();
    const op = (doc?.ai_extracted_json?.operation || '').toLowerCase();
    const isVideo = mime.startsWith('video/') || /\.(mp4|mov|webm|avi|mkv)$/i.test(fileUrl);
    const isDelayTagged = op === 'delay' || fileUrl.includes('delay') || doc?.doc_type === 'Emergency';
    return isVideo || isDelayTagged;
  });

  const videoDoc = delayMedia.find((doc: any) => {
    const fileUrl = (doc?.file_url || '').toLowerCase();
    const mime = (doc?.mime_type || '').toLowerCase();
    return mime.startsWith('video/') || /\.(mp4|mov|webm|avi|mkv)$/i.test(fileUrl);
  });

  const imageDoc = delayMedia.find((doc: any) => {
    const fileUrl = (doc?.file_url || '').toLowerCase();
    const mime = (doc?.mime_type || '').toLowerCase();
    return mime.startsWith('image/') || /\.(jpg|jpeg|png|webp)$/i.test(fileUrl);
  });

  // 2. Check stops with explicit delay_reason or actual arrival delay
  const stops = Array.isArray(trip.stops) ? trip.stops : [];
  stops.forEach((stop: any, idx: number) => {
    const stopName = stop.location_name || stop.location?.name || `Stop ${idx + 1}`;
    const hasDelayReason = !!stop.delay_reason;
    let delayMinutes = 0;

    if (stop.actual_arrival && stop.planned_arrival) {
      const diffMs = new Date(stop.actual_arrival).getTime() - new Date(stop.planned_arrival).getTime();
      if (diffMs > 15 * 60 * 1000) {
        delayMinutes = Math.round(diffMs / 60000);
      }
    }

    if (hasDelayReason || delayMinutes > 0) {
      const reasonText = stop.delay_note || (stop.delay_reason ? String(stop.delay_reason) : 'Traffic delay');
      const timeStr = stop.delay_logged_at
        ? new Date(stop.delay_logged_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
        : stop.actual_arrival
        ? new Date(stop.actual_arrival).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
        : '';

      alerts.push({
        id: `stop-${stop.id || idx}`,
        label: `Delay at ${stopName}`,
        location: stopName,
        delay: delayMinutes > 0 ? `+ ${delayMinutes} min` : '+ Delayed',
        time: timeStr,
        severe: delayMinutes >= 30 || stop.delay_reason === 'VehicleBreakdown',
        reason: reasonText,
        videoUrl: videoDoc ? resolveFileUrl(videoDoc.file_url) : undefined,
        imageUrl: imageDoc ? resolveFileUrl(imageDoc.file_url) : undefined,
      });
    }
  });

  // 3. Check if trip status is Delayed or trip.notes has [DELAY REPORT]
  const isTripDelayed = trip.status === 'Delayed';
  const hasDelayNote = typeof trip.notes === 'string' && trip.notes.includes('[DELAY REPORT]');

  if ((isTripDelayed || hasDelayNote || delayMedia.length > 0) && alerts.length === 0) {
    const rawNote = trip.notes ? trip.notes.replace(/^\[DELAY REPORT\]:\s*/i, '').trim() : '';
    const reasonText = rawNote || 'Driver reported delay';
    const activeStop = stops.find((s: any) => s.status === 'Delayed' || (!s.actual_arrival && s.planned_arrival)) || stops[0];
    const locationName = activeStop?.location_name || activeStop?.location?.name || 'En Route';

    alerts.push({
      id: `trip-delay-${trip.id || '1'}`,
      label: `Delay at ${locationName}`,
      location: locationName,
      delay: '+ Delayed',
      time: trip.updatedAt ? new Date(trip.updatedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '',
      severe: true,
      reason: reasonText,
      videoUrl: videoDoc ? resolveFileUrl(videoDoc.file_url) : undefined,
      imageUrl: imageDoc ? resolveFileUrl(imageDoc.file_url) : undefined,
    });
  }

  return alerts;
}

export default function TripOverviewBarCard({ trip, documents = [], onViewAllAlerts, onPreviewImage }: TripOverviewBarCardProps) {
  const navigate = useNavigate();
  const [isDelayModalOpen, setIsDelayModalOpen] = useState(false);

  // 1. Vehicle info (Truck No & Ton)
  const truckNo = trip.is_third_party
    ? trip.third_party_vehicle_plate || 'Unassigned'
    : trip.vehicle?.plate_number || 'Unassigned';

  const rawTon = trip.quotation_vehicle_class
    || (trip.vehicle?.capacity_kg ? `${Math.round(trip.vehicle.capacity_kg / 1000)} TON` : null)
    || trip.rateCard?.vehicle_type
    || trip.vehicle_type
    || '10 TON';
  const truckTon = rawTon.toUpperCase().includes('TON') ? rawTon : `${rawTon} TON`;

  // 2. Driver info (Name, Photo & Direct Call button)
  const driverName = trip.is_third_party
    ? trip.third_party_driver_name || 'Driver'
    : trip.driver
    ? `${trip.driver.first_name || ''} ${trip.driver.last_name || ''}`.trim() || 'Driver'
    : 'Driver';
  const driverPhone = trip.driver?.phone_primary || trip.third_party_driver_phone || '';
  const driverAvatar = (trip.driver as any)?.avatar_url;

  // 3. Company / Customer info (Name & Logo only)
  const companyName = trip.customer?.company_name || trip.customer?.name || 'Customer';
  const companyLogo = trip.customer?.logo_url || trip.customer?.avatar_url;

  // 4. Alerts (derived from real trip and documents)
  const alerts = extractTripDelayAlerts(trip, documents);
  const hasAlerts = alerts && alerts.length > 0;
  const [selectedAlert, setSelectedAlert] = useState<DelayAlertItem | null>(alerts[0] || null);

  React.useEffect(() => {
    if (alerts.length > 0) {
      setSelectedAlert(alerts[0]);
    } else {
      setSelectedAlert(null);
    }
  }, [alerts.length, trip?.status, trip?.notes]);

  return (
    <>
    <div className="w-full bg-white rounded-2xl border border-[#E5E7EB] shadow-[0_1px_3px_rgba(0,0,0,0.04)] grid grid-cols-1 md:grid-cols-4 divide-y md:divide-y-0 md:divide-x divide-[#E5E7EB] overflow-hidden">
      
      {/* ── COL 1: COMPANY (NAME & LOGO ONLY) — 25% ── */}
      <div className="p-2 sm:px-3.5 sm:py-2 flex items-center gap-3 min-w-0">
        <div className="w-10 h-10 rounded-xl bg-slate-50 border border-slate-200 flex items-center justify-center p-1.5 text-[#374151] shrink-0 overflow-hidden shadow-2xs">
          {companyLogo ? (
            <img
              src={resolveFileUrl(companyLogo)}
              alt={companyName}
              className="w-full h-full object-contain"
              onError={(e) => {
                (e.target as HTMLElement).style.display = 'none';
              }}
            />
          ) : (
            <Building2 size={20} className="text-[#374151]" />
          )}
        </div>

        <div className="min-w-0 flex-1 space-y-0.5">
          <span className="text-[9.5px] uppercase font-black text-slate-400 block tracking-wider">
            COMPANY
          </span>
          <h3
            onClick={() => trip.customer?.id && navigate(`/customers/${trip.customer.id}`)}
            className="font-extrabold text-[13px] text-[#111827] truncate cursor-pointer hover:text-blue-600 transition-colors flex items-center gap-1 leading-tight"
            title={companyName}
          >
            <span className="truncate">{companyName}</span>
            <ExternalLink size={11} className="text-[#9CA3AF] shrink-0" />
          </h3>
        </div>
      </div>

      {/* ── COL 2: DRIVER (NAME, PHOTO & DIRECT CALL BUTTON) — 25% ── */}
      <div className="p-2 sm:px-3.5 sm:py-2 flex items-center justify-between gap-2.5 min-w-0">
        <div className="flex items-center gap-2.5 min-w-0">
          <Avatar className="w-10 h-10 rounded-full border-2 border-emerald-100 bg-slate-100 shrink-0 shadow-2xs">
            {driverAvatar && <AvatarImage src={resolveFileUrl(driverAvatar)} alt={driverName} className="object-cover" />}
            <AvatarFallback className="text-xs font-black bg-slate-200 text-slate-800">
              {driverName.substring(0, 2).toUpperCase()}
            </AvatarFallback>
          </Avatar>

          <div className="min-w-0 space-y-0.5">
            <span className="text-[9.5px] uppercase font-black text-slate-400 block tracking-wider">
              DRIVER
            </span>
            <h4 className="font-extrabold text-[13px] text-[#111827] truncate leading-tight">
              {driverName}
            </h4>
          </div>
        </div>

        {/* Direct Call Button (only when driver phone is available) */}
        {driverPhone ? (
          <a
            href={`tel:${driverPhone.replace(/[^0-9+]/g, '')}`}
            className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-xs transition-all cursor-pointer shrink-0"
            title={`Call ${driverName}`}
          >
            <Phone size={12} className="fill-white" />
            <span className="font-black text-[11px]">Call</span>
          </a>
        ) : null}
      </div>

      {/* ── COL 3: TRUCK (TRUCK NO & TON) — 25% ── */}
      <div className="p-2 sm:px-3.5 sm:py-2 flex items-center gap-3 min-w-0">
        <div className="w-10 h-10 rounded-xl bg-slate-50 border border-slate-200 flex items-center justify-center p-1 shrink-0 overflow-hidden shadow-2xs">
          <img
            src="/truck_3d_orange_transparent.png"
            alt={truckNo}
            className="w-full h-full object-contain"
            onError={(e) => {
              (e.target as HTMLElement).style.display = 'none';
            }}
          />
        </div>

        <div className="min-w-0 flex-1 space-y-0.5">
          <span className="text-[9.5px] uppercase font-black text-slate-400 block tracking-wider">
            TRUCK
          </span>
          <h3 className="font-mono font-black text-sm text-[#111827] truncate leading-tight">
            {truckNo}
          </h3>
          <div className="inline-flex items-center px-1.5 py-0.2 rounded text-[10px] font-black bg-blue-50 text-blue-700 border border-blue-200/80 leading-none mt-0.5">
            {truckTon}
          </div>
        </div>
      </div>

      {/* ── COL 4: DELAY ALERTS — 25% ── */}
      <div className="p-2 sm:px-3.5 sm:py-2 flex items-center gap-2.5 min-w-0">
        {/* Operations Assistant Character for Delay Alert */}
        <div
          onClick={() => {
            if (hasAlerts) {
              setSelectedAlert(alerts[0]);
              setIsDelayModalOpen(true);
            }
          }}
          className={`w-10 h-10 rounded-xl flex items-center justify-center p-0.5 shrink-0 overflow-hidden shadow-2xs relative transition-colors ${
            hasAlerts
              ? 'bg-amber-50 border border-amber-200/80 cursor-pointer group hover:border-amber-400'
              : 'bg-emerald-50/70 border border-emerald-200/70'
          }`}
          title={hasAlerts ? 'Click to view delay alert & footage' : 'All stops on schedule'}
        >
          <img
            src="/assistant/was there any labor charge for this trip.png"
            alt="Delay Alert Assistant"
            className={`w-full h-full object-contain object-bottom transition-transform ${
              hasAlerts ? 'group-hover:scale-110' : 'opacity-85'
            }`}
          />
          {hasAlerts && (
            <span className="absolute top-0.5 right-0.5 w-2.5 h-2.5 rounded-full bg-rose-500 ring-2 ring-white animate-pulse" />
          )}
        </div>

        <div className="min-w-0 flex-1 flex flex-col justify-between h-full">
          {/* Alerts Header */}
          <div className="flex items-center justify-between pb-0.5 border-b border-[#F3F4F6]">
            <div className="flex items-center gap-1 min-w-0">
              <span className="font-black text-[11px] text-[#111827] tracking-tight truncate">
                Delay Alerts
              </span>
              {hasAlerts ? (
                <span className="w-3.5 h-3.5 rounded-full bg-rose-500 text-white font-black text-[9px] flex items-center justify-center leading-none shrink-0">
                  {alerts.length}
                </span>
              ) : (
                <span className="px-1.5 py-0.2 rounded-full text-[9px] font-bold bg-emerald-100 text-emerald-700 leading-none">
                  0
                </span>
              )}
            </div>

            {hasAlerts && (
              <button
                type="button"
                onClick={() => {
                  setSelectedAlert(alerts[0]);
                  setIsDelayModalOpen(true);
                }}
                className="text-[10px] font-bold text-blue-600 hover:text-blue-700 flex items-center gap-0.5 cursor-pointer shrink-0"
              >
                <span>View Alert</span>
                <ChevronRight size={10} className="stroke-[2.5]" />
              </button>
            )}
          </div>

          {/* Alerts List */}
          <div className="space-y-0.5 pt-0.5">
            {hasAlerts ? (
              alerts.slice(0, 2).map((alert) => (
                <div
                  key={alert.id}
                  onClick={() => {
                    setSelectedAlert(alert);
                    setIsDelayModalOpen(true);
                  }}
                  className="flex items-center justify-between text-[10px] leading-tight cursor-pointer hover:bg-slate-50 rounded px-0.5 py-0.2 transition-colors group"
                  title="Click to view alert details"
                >
                  <div className="flex items-center gap-1 min-w-0">
                    <span
                      className={`w-1.5 h-1.5 rounded-full shrink-0 ${
                        alert.severe ? 'bg-rose-500' : 'bg-amber-500'
                      }`}
                    />
                    <span className="font-bold text-[#374151] truncate max-w-[95px] group-hover:text-blue-600">
                      {alert.label}
                    </span>
                    {alert.videoUrl && (
                      <span className="px-1 py-0.2 rounded text-[7.5px] font-black bg-rose-50 text-rose-600 border border-rose-200 shrink-0">
                        VIDEO
                      </span>
                    )}
                  </div>

                  <div className="flex items-center gap-1 shrink-0 font-mono text-[9.5px]">
                    <span
                      className={`font-black ${
                        alert.severe ? 'text-rose-600' : 'text-amber-600'
                      }`}
                    >
                      {alert.delay}
                    </span>
                    {alert.time && <span className="text-[#9CA3AF] text-[9px] font-bold">{alert.time}</span>}
                  </div>
                </div>
              ))
            ) : (
              <div className="flex items-center gap-1.5 py-1 text-emerald-600 text-[11px] font-bold">
                <CheckCircle2 size={12} className="stroke-[2.5] text-emerald-500 shrink-0" />
                <span className="truncate">All stops on schedule</span>
              </div>
            )}
          </div>
        </div>
      </div>

    </div>

    {/* ── SIMPLE DELAY NOTIFICATION MODAL WITH ASSISTANT GUY & REAL DELAY EVIDENCE ── */}
    <TripDelayNotificationModal
      isOpen={isDelayModalOpen}
      onClose={() => setIsDelayModalOpen(false)}
      trip={trip}
      alert={selectedAlert || alerts[0]}
    />
    </>
  );
}
