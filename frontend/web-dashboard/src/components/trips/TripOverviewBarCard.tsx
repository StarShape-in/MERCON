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

const DEFAULT_ALERTS = [
  { id: '1', label: 'Delay at Al Wadi', delay: '+ 45 min', time: '1:15 PM', severe: true, image: '/evidence/og_stop.png' },
  { id: '2', label: 'Est. delay at Al Majmaah', delay: '+ 30 min', time: '3:20 PM', severe: true, image: '/evidence/02_stop.png' },
  { id: '3', label: 'Poss. delay at Al Abha', delay: '+ 20 min', time: '7:10 PM', severe: false, image: '/evidence/05_return_stop.png' },
];

export default function TripOverviewBarCard({ trip, onViewAllAlerts, onPreviewImage }: TripOverviewBarCardProps) {
  const navigate = useNavigate();
  const [isDelayModalOpen, setIsDelayModalOpen] = useState(false);
  const [selectedAlert, setSelectedAlert] = useState<any>(DEFAULT_ALERTS[0]);

  // 1. Vehicle info (Truck No & Ton)
  const truckNo = trip.is_third_party
    ? trip.third_party_vehicle_plate || 'TRK-1187'
    : trip.vehicle?.plate_number || 'TRK-1187';

  const rawTon = trip.quotation_vehicle_class
    || (trip.vehicle?.capacity_kg ? `${Math.round(trip.vehicle.capacity_kg / 1000)} TON` : null)
    || trip.rateCard?.vehicle_type
    || trip.vehicle_type
    || '10 TON';
  const truckTon = rawTon.toUpperCase().includes('TON') ? rawTon : `${rawTon} TON`;

  // 2. Driver info (Name, Photo & Direct Call button)
  const driverName = trip.is_third_party
    ? trip.third_party_driver_name || 'Khalid Ahmed'
    : trip.driver
    ? `${trip.driver.first_name} ${trip.driver.last_name}`
    : 'Khalid Ahmed';
  const driverPhone = trip.driver?.phone_primary || trip.third_party_driver_phone || '+966 54 321 9876';
  const driverAvatar = (trip.driver as any)?.avatar_url;

  // 3. Company / Customer info (Name & Logo only)
  const companyName = trip.customer?.company_name || trip.customer?.name || 'ABC Logistics Co.';
  const companyLogo = trip.customer?.logo_url || trip.customer?.avatar_url;

  // 4. Alerts
  const alerts = DEFAULT_ALERTS;
  const hasAlerts = alerts && alerts.length > 0;

  return (
    <>
    <div className="w-full bg-white rounded-2xl border border-[#E5E7EB] shadow-[0_1px_3px_rgba(0,0,0,0.04)] grid grid-cols-1 md:grid-cols-4 divide-y md:divide-y-0 md:divide-x divide-[#E5E7EB] overflow-hidden">
      
      {/* ── COL 1: TRUCK (TRUCK NO & TON) — 25% ── */}
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

        {/* Direct Call Button */}
        <a
          href={`tel:${driverPhone.replace(/[^0-9+]/g, '')}`}
          className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-xs transition-all cursor-pointer shrink-0"
          title={`Call ${driverName}`}
        >
          <Phone size={12} className="fill-white" />
          <span className="font-black text-[11px]">Call</span>
        </a>
      </div>

      {/* ── COL 3: COMPANY (NAME & LOGO ONLY) — 25% ── */}
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

      {/* ── COL 4: DELAY ALERTS — 25% ── */}
      <div className="p-2 sm:px-3.5 sm:py-2 flex items-center gap-2.5 min-w-0">
        {/* Operations Assistant Character for Delay Alert */}
        <div
          onClick={() => {
            setSelectedAlert(alerts[0] || DEFAULT_ALERTS[0]);
            setIsDelayModalOpen(true);
          }}
          className="w-10 h-10 rounded-xl bg-amber-50 border border-amber-200/80 flex items-center justify-center p-0.5 shrink-0 overflow-hidden shadow-2xs cursor-pointer group hover:border-amber-400 transition-colors relative"
          title="Click to view delay alert & dashcam"
        >
          <img
            src="/assistant/was there any labor charge for this trip.png"
            alt="Delay Alert Assistant"
            className="w-full h-full object-contain object-bottom group-hover:scale-110 transition-transform"
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
              {hasAlerts && (
                <span className="w-3.5 h-3.5 rounded-full bg-rose-500 text-white font-black text-[9px] flex items-center justify-center leading-none shrink-0">
                  {alerts.length}
                </span>
              )}
            </div>

            <button
              type="button"
              onClick={() => {
                setSelectedAlert(alerts[0] || DEFAULT_ALERTS[0]);
                setIsDelayModalOpen(true);
              }}
              className="text-[10px] font-bold text-blue-600 hover:text-blue-700 flex items-center gap-0.5 cursor-pointer shrink-0"
            >
              <span>View Alert</span>
              <ChevronRight size={10} className="stroke-[2.5]" />
            </button>
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
                  </div>

                  <div className="flex items-center gap-1 shrink-0 font-mono text-[9.5px]">
                    <span
                      className={`font-black ${
                        alert.severe ? 'text-rose-600' : 'text-amber-600'
                      }`}
                    >
                      {alert.delay}
                    </span>
                    <span className="text-[#9CA3AF] text-[9px] font-bold">{alert.time}</span>
                  </div>
                </div>
              ))
            ) : (
              <div className="flex items-center gap-1.5 py-0.5 text-emerald-600 text-[11px] font-bold">
                <CheckCircle2 size={12} className="stroke-[2.5]" />
                <span>All stops on schedule</span>
              </div>
            )}
          </div>
        </div>
      </div>

    </div>

    {/* ── SIMPLE DELAY NOTIFICATION MODAL WITH ASSISTANT GUY & LIVE DASHCAM ── */}
    <TripDelayNotificationModal
      isOpen={isDelayModalOpen}
      onClose={() => setIsDelayModalOpen(false)}
      trip={trip}
      alert={selectedAlert}
    />
    </>
  );
}
