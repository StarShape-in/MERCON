import React, { useState } from 'react';
import {
  Dialog,
  DialogContent,
} from '@/components/ui/dialog';
import {
  X,
  Play,
  Pause,
  Clock,
  CheckCircle2,
  AlertTriangle,
} from 'lucide-react';
import { Button } from '@/components/ui/button';

interface TripDelayNotificationModalProps {
  isOpen: boolean;
  onClose: () => void;
  trip?: any;
  alert?: {
    location?: string;
    delay?: string;
    reason?: string;
    time?: string;
  };
}

function WhatsAppIcon({ className = 'w-4 h-4' }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor">
      <path d="M12.031 6.172c-3.181 0-5.767 2.586-5.768 5.766-.001 1.298.38 2.27 1.019 3.287l-.582 2.128 2.182-.573c.978.58 1.911.928 3.145.929 3.178 0 5.767-2.587 5.768-5.766.001-3.187-2.575-5.77-5.764-5.771zm3.392 8.244c-.144.405-.837.774-1.17.824-.312.045-.694.075-2.037-.481-1.612-.667-2.651-2.316-2.732-2.424-.08-.107-.655-.872-.655-1.66 0-.789.414-1.178.561-1.337.147-.16.321-.2.428-.2.107 0 .214.002.307.007.098.005.23-.038.36.275.144.348.492 1.2.535 1.288.043.088.072.19.014.305-.058.115-.087.186-.173.286-.086.1-.182.223-.26.299-.086.084-.176.175-.076.347.1.172.445.734.954 1.188.656.585 1.209.767 1.381.853.172.086.272.072.373-.043.101-.115.429-.501.544-.673.115-.172.23-.143.388-.086.158.058 1.002.472 1.175.558.173.086.288.129.33.201.042.072.042.418-.102.823z" />
    </svg>
  );
}

export default function TripDelayNotificationModal({
  isOpen,
  onClose,
  trip,
  alert,
}: TripDelayNotificationModalProps) {
  const [isPlaying, setIsPlaying] = useState(false);
  const [isAcknowledged, setIsAcknowledged] = useState(false);

  const truckNo = trip?.is_third_party
    ? trip?.third_party_vehicle_plate || 'DRA-6455'
    : trip?.vehicle?.plate_number || 'DRA-6455';

  const driverName = trip?.is_third_party
    ? trip?.third_party_driver_name || 'Muhammad Yasin'
    : trip?.driver
    ? `${trip?.driver.first_name} ${trip?.driver.last_name}`
    : 'Muhammad Yasin';

  const locationName = alert?.location || 'Al Wadi';
  const delayDuration = alert?.delay || '+ 45 min';
  const delayTime = alert?.time || '1:15 PM';

  const handleNotifyWhatsApp = () => {
    const text = encodeURIComponent(
      `⚠️ *Trip Delay Notification — MERCON Logistics*\n\n` +
      `• *Trip Plate*: ${truckNo}\n` +
      `• *Driver*: ${driverName}\n` +
      `• *Location*: ${locationName}\n` +
      `• *Delay Impact*: ${delayDuration}\n` +
      `• *Reason*: Road congestion and highway maintenance queue.\n\n` +
      `Our operations dispatch team is monitoring the route.`
    );
    window.open(`https://wa.me/?text=${text}`, '_blank');
  };

  const handleAcknowledge = () => {
    setIsAcknowledged(true);
    setTimeout(() => {
      setIsAcknowledged(false);
      onClose();
    }, 900);
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent
        hideCloseButton
        className="sm:max-w-[560px] p-0 overflow-visible bg-transparent border-none shadow-none focus:outline-none [&>button:last-child]:hidden"
      >
        
        {/* Container: Character on left, speech card on right */}
        <div className="flex flex-col sm:flex-row items-center sm:items-end gap-3 pointer-events-auto">
          
          {/* ── THE DELAY ASSISTANT GUY ── */}
          <div className="w-[95px] sm:w-[120px] h-[125px] sm:h-[155px] shrink-0 select-none drop-shadow-xl flex items-end">
            <img
              src="/assistant/was there any labor charge for this trip.png"
              alt="Operations Assistant"
              className="w-full h-full object-contain object-bottom"
              draggable={false}
            />
          </div>

          {/* ── SPEECH CARD ── */}
          <div className="relative flex-1 w-full bg-white rounded-2xl border border-slate-200 shadow-2xl p-4 sm:p-5 flex flex-col gap-3">
            
            {/* Header: Status badge & close button */}
            <div className="flex items-center justify-between pb-1 border-b border-slate-100">
              <div className="flex items-center gap-1.5">
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10.5px] font-black bg-rose-50 text-rose-700 border border-rose-200">
                  <span className="w-1.5 h-1.5 rounded-full bg-rose-600 animate-pulse" />
                  <span>Delay Alert {delayDuration}</span>
                </span>
                <span className="text-[11px] font-mono text-slate-400">{delayTime}</span>
              </div>

              <button
                type="button"
                onClick={onClose}
                className="w-6 h-6 rounded-full flex items-center justify-center text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors cursor-pointer"
                title="Close"
              >
                <X size={14} />
              </button>
            </div>

            {/* Assistant message */}
            <div className="space-y-0.5">
              <h4 className="font-extrabold text-[13.5px] text-slate-900 leading-tight">
                Hey Ian! Traffic Delay at {locationName}
              </h4>
              <p className="text-[11.5px] text-slate-600 leading-snug">
                Truck <strong className="font-mono text-slate-800">{truckNo}</strong> ({driverName}) is delayed by{' '}
                <strong className="text-rose-600 font-bold">{delayDuration}</strong> due to highway congestion.
              </p>
            </div>

            {/* ── VIDEO / DASHCAM PREVIEW ── */}
            <div className="relative w-full h-[150px] sm:h-[165px] rounded-xl overflow-hidden bg-slate-950 border border-slate-800 shadow-inner group">
              <img
                src="/saudi_highway_panorama.png"
                alt="Live Dashcam Stream"
                className={`w-full h-full object-cover brightness-85 transition-transform duration-700 ${
                  isPlaying ? 'scale-105 filter saturate-110' : 'scale-100 filter grayscale-20'
                }`}
              />

              {/* HUD: Live status & telemetry */}
              <div className="absolute top-2 left-2.5 right-2.5 flex items-center justify-between text-white text-[9.5px] font-mono z-10">
                <div className="flex items-center gap-1.5 bg-black/50 backdrop-blur-xs px-2 py-0.5 rounded">
                  <span className="w-1.5 h-1.5 rounded-full bg-rose-500 animate-ping" />
                  <span className="font-bold text-rose-300">LIVE DASHCAM</span>
                </div>
                <div className="bg-black/50 backdrop-blur-xs px-2 py-0.5 rounded text-amber-300 font-bold">
                  12 km/h · {locationName}
                </div>
              </div>

              {/* Play / Pause Toggle Button */}
              <button
                type="button"
                onClick={() => setIsPlaying(!isPlaying)}
                className="absolute inset-0 flex items-center justify-center bg-black/25 hover:bg-black/10 transition-colors cursor-pointer group"
                title={isPlaying ? 'Pause' : 'Play video'}
              >
                <div className="w-10 h-10 rounded-full bg-white/90 text-slate-900 flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform">
                  {isPlaying ? (
                    <Pause size={16} />
                  ) : (
                    <Play size={16} className="ml-0.5 fill-slate-900" />
                  )}
                </div>
              </button>

              {/* Location footer pill */}
              <div className="absolute bottom-2 left-2.5 bg-black/60 backdrop-blur-xs px-2 py-0.5 rounded text-slate-200 text-[9px] font-mono">
                Route 65 · Al Wadi Sector
              </div>
            </div>

            {/* Acknowledgement banner */}
            {isAcknowledged && (
              <div className="p-2 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-[11px] font-bold flex items-center gap-2 animate-in fade-in">
                <CheckCircle2 size={14} className="text-emerald-600 shrink-0" />
                <span>Delay acknowledged and logged.</span>
              </div>
            )}

            {/* ── SIMPLE ACTIONS: 2 BUTTONS ── */}
            <div className="flex items-center gap-2 pt-0.5">
              {/* WhatsApp Notification Button */}
              <Button
                onClick={handleNotifyWhatsApp}
                className="flex-1 h-9 rounded-xl bg-[#10B981] hover:bg-[#059669] text-white text-xs font-bold gap-1.5 shadow-xs cursor-pointer border-none"
              >
                <WhatsAppIcon className="w-4 h-4 text-white" />
                <span>Notify Customer</span>
              </Button>

              {/* Acknowledge / Close Button */}
              <Button
                onClick={handleAcknowledge}
                className="flex-1 h-9 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold gap-1 shadow-xs cursor-pointer"
              >
                <CheckCircle2 size={13} className="text-emerald-400" />
                <span>Acknowledge</span>
              </Button>
            </div>

          </div>

        </div>

      </DialogContent>
    </Dialog>
  );
}
