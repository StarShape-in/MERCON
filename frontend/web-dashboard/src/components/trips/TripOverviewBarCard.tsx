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

  const rawTon = trip.financials?.quotation_vehicle_class
    || trip.quotation_vehicle_class
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
  const companyName = trip.customer?.name || 'Customer';
  const companyLogo = trip.customer?.logo_url;

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
    <div className="w-full bg-white dark:bg-slate-900 rounded-2xl border border-[#E5E7EB] dark:border-slate-800 shadow-[0_1px_3px_rgba(0,0,0,0.04)] grid grid-cols-1 md:grid-cols-4 divide-y md:divide-y-0 md:divide-x divide-[#E5E7EB] dark:divide-slate-800 overflow-hidden">
      
      {/* ── COL 1: COMPANY (NAME & LOGO ONLY) — 25% ── */}
      <div className="p-3.5 sm:px-5 sm:py-4 flex items-center gap-3.5 min-w-0 min-h-[76px]">
        <div className="w-11 h-11 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 flex items-center justify-center p-1.5 text-[#374151] dark:text-slate-300 shrink-0 overflow-hidden shadow-2xs">
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
            <Building2 size={22} className="text-[#374151] dark:text-slate-300" />
          )}
        </div>

        <div className="min-w-0 flex-1 space-y-0.5">
          <span className="text-[10px] uppercase font-black text-slate-400 block tracking-widest">
            COMPANY
          </span>
          <h3
            onClick={() => trip.customer?.id && navigate(`/customers/${trip.customer.id}`)}
            className="font-black text-[14px] text-[#111827] dark:text-white truncate cursor-pointer hover:text-blue-600 transition-colors flex items-center gap-1 leading-tight"
            title={companyName}
          >
            <span className="truncate">{companyName}</span>
            <ExternalLink size={12} className="text-[#9CA3AF] shrink-0" />
          </h3>
        </div>
      </div>

      {/* ── COL 2: DRIVER (NAME, PHOTO & DIRECT CALL BUTTON) — 25% ── */}
      <div className="p-3.5 sm:px-5 sm:py-4 flex items-center justify-between gap-3 min-w-0 min-h-[76px]">
        <div className="flex items-center gap-3 min-w-0">
          <Avatar className="w-11 h-11 rounded-full border-2 border-emerald-100 dark:border-emerald-950 bg-slate-100 dark:bg-slate-800 shrink-0 shadow-2xs">
            {driverAvatar && <AvatarImage src={resolveFileUrl(driverAvatar)} alt={driverName} className="object-cover" />}
            <AvatarFallback className="text-xs font-black bg-slate-200 dark:bg-slate-700 text-slate-800 dark:text-slate-200">
              {driverName.substring(0, 2).toUpperCase()}
            </AvatarFallback>
          </Avatar>

          <div className="min-w-0 space-y-0.5">
            <span className="text-[10px] uppercase font-black text-slate-400 block tracking-widest">
              {trip.is_third_party ? '3PL DRIVER' : 'DRIVER'}
            </span>
            <h4 className="font-black text-[14px] text-[#111827] dark:text-white truncate leading-tight">
              {driverName}
            </h4>
            {trip.coDriver && (
              <div className="flex items-center gap-1 mt-0.5">
                <span className="text-[9px] font-bold text-slate-400">CO:</span>
                <span className="text-[11px] font-semibold text-slate-600 dark:text-slate-300 truncate">
                  {`${trip.coDriver.first_name || ''} ${trip.coDriver.last_name || ''}`.trim()}
                </span>
              </div>
            )}
          </div>
        </div>

        {/* Direct Call Button (only when driver phone is available) */}
        {driverPhone ? (
          <a
            href={`tel:${driverPhone.replace(/[^0-9+]/g, '')}`}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-black text-xs shadow-xs transition-all cursor-pointer shrink-0"
            title={`Call ${driverName}`}
          >
            <Phone size={13} className="fill-white" />
            <span className="font-black text-[11px]">Call</span>
          </a>
        ) : null}
      </div>

      {/* ── COL 3: TRUCK (TRUCK NO & TON) — 25% ── */}
      <div className="p-3.5 sm:px-5 sm:py-4 flex items-center justify-between gap-3 min-w-0 min-h-[76px]">
        <div className="flex items-center gap-3 min-w-0">
          <div className="w-11 h-11 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 flex items-center justify-center p-1 shrink-0 overflow-hidden shadow-2xs">
            <img
              src="/mercon_truck_3d.png"
              alt={truckNo}
              className="w-full h-full object-contain"
              onError={(e) => {
                (e.target as HTMLElement).style.display = 'none';
              }}
            />
          </div>

          <div className="min-w-0 space-y-0.5">
            <span className="text-[10px] uppercase font-black text-slate-400 block tracking-widest">
              {trip.is_third_party ? '3PL TRUCK' : 'TRUCK'}
            </span>
            <h3 className="font-mono font-black text-[15px] text-[#111827] dark:text-white truncate leading-tight">
              {truckNo}
            </h3>
          </div>
        </div>

        <div className="inline-flex items-center px-2.5 py-1 rounded-lg text-xs font-black bg-blue-50 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300 border border-blue-200/80 dark:border-blue-800/80 leading-none shrink-0 self-center">
          {truckTon}
        </div>
      </div>

      {/* ── COL 4: DELAY ALERTS — 25% ── */}
      <div className="p-3.5 sm:px-5 sm:py-4 flex items-center gap-3 min-w-0 min-h-[76px]">
        {/* Status Icon Container */}
        <div
          onClick={() => {
            if (hasAlerts) {
              setSelectedAlert(alerts[0]);
              setIsDelayModalOpen(true);
            }
          }}
          className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 shadow-2xs relative transition-colors ${
            hasAlerts
              ? 'bg-rose-50 border border-rose-200/80 text-rose-600 cursor-pointer group hover:border-rose-400'
              : 'bg-emerald-50/80 border border-emerald-200/80 text-emerald-600'
          }`}
          title={hasAlerts ? 'Click to view delay alert & footage' : 'All stops on schedule'}
        >
          {hasAlerts ? (
            <AlertTriangle size={18} className="stroke-[2.2]" />
          ) : (
            <CheckCircle2 size={18} className="stroke-[2.2]" />
          )}
          {hasAlerts && (
            <span className="absolute top-0.5 right-0.5 w-2.5 h-2.5 rounded-full bg-rose-500 ring-2 ring-white animate-pulse" />
          )}
        </div>

        <div className="min-w-0 flex-1 space-y-0.5">
          {/* Alerts Header */}
          <div className="flex items-center justify-between pb-0.5 border-b border-[#F3F4F6]">
            <div className="flex items-center gap-1 min-w-0">
              <span className="text-[9.5px] uppercase font-black text-slate-400 block tracking-wider truncate">
                DELAY ALERTS
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

          {/* Alerts Content */}
          <div className="pt-0.5">
            {hasAlerts ? (
              alerts.slice(0, 1).map((alert) => (
                <div
                  key={alert.id}
                  onClick={() => {
                    setSelectedAlert(alert);
                    setIsDelayModalOpen(true);
                  }}
                  className="flex items-center justify-between text-[10px] leading-tight cursor-pointer hover:bg-slate-50 rounded px-0.5 py-0.5 transition-colors group"
                  title="Click to view alert details"
                >
                  <div className="flex items-center gap-1 min-w-0">
                    <span
                      className={`w-1.5 h-1.5 rounded-full shrink-0 ${
                        alert.severe ? 'bg-rose-500' : 'bg-amber-500'
                      }`}
                    />
                    <span className="font-bold text-[#111827] truncate group-hover:text-blue-600">
                      {alert.label}
                    </span>
                  </div>

                  <div className="flex items-center gap-1 shrink-0 font-mono text-[9.5px]">
                    <span
                      className={`font-black ${
                        alert.severe ? 'text-rose-600' : 'text-amber-600'
                      }`}
                    >
                      {alert.delay}
                    </span>
                  </div>
                </div>
              ))
            ) : (
              <div className="flex items-center gap-1.5 py-0.5 text-emerald-700 text-[12px] font-extrabold truncate">
                <span>All stops on schedule</span>
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
