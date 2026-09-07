import React, { useState } from 'react';
import {
  X, AlertTriangle, Play, Pause, Volume2, VolumeX,
  MapPin, CheckCircle2, Video as VideoIcon, Camera
} from 'lucide-react';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { WhatsAppIcon } from '@/components/ui/whatsapp-icon';

interface TripDelayNotificationModalProps {
  isOpen: boolean;
  onClose: () => void;
  trip: any;
  alerts?: Array<{
    id: string;
    label: string;
    delay: string;
    time: string;
    severe: boolean;
    reason?: string;
    location?: string;
    videoUrl?: string;
    image?: string;
  }>;
}

const DEFAULT_DELAY_ALERTS = [
  {
    id: '1',
    label: 'Delay at Al Wadi',
    delay: '+ 45 min',
    time: '1:15 PM',
    severe: true,
    reason: 'Heavy Traffic & Road Construction Queue',
    location: 'Al Wadi Highway Bypass (KM 142)',
    image: '/evidence/og_stop.png',
  },
  {
    id: '2',
    label: 'Est. delay at Al Majmaah',
    delay: '+ 30 min',
    time: '3:20 PM',
    severe: true,
    reason: 'Loading Dock Backlog & Gate Verification',
    location: 'Al Majmaah Logistics Gate 2',
    image: '/evidence/02_stop.png',
  },
];

export default function TripDelayNotificationModal({
  isOpen,
  onClose,
  trip,
  alerts = DEFAULT_DELAY_ALERTS,
}: TripDelayNotificationModalProps) {
  const [activeAlertIdx, setActiveAlertIdx] = useState(0);
  const [isPlaying, setIsPlaying] = useState(true);
  const [isMuted, setIsMuted] = useState(true);
  const [mediaTab, setMediaTab] = useState<'video' | 'photo'>('video');
  const [isAcknowledged, setIsAcknowledged] = useState(false);
  const [snoozeText, setSnoozeText] = useState<string | null>(null);

  const activeAlert = alerts[activeAlertIdx] || DEFAULT_DELAY_ALERTS[0];
  const tripRef = trip?.ref_id || trip?.id || 'TRP-0239';
  const customerName = trip?.customer?.name || trip?.customer?.company_name || 'Customer';
  const driverName = trip?.is_third_party
    ? trip?.third_party_driver_name || 'Driver'
    : trip?.driver
    ? `${trip.driver.first_name} ${trip.driver.last_name}`
    : 'Driver';

  const handleShareWhatsApp = () => {
    const text = [
      `*MERCON Logistics — Trip Delay Notice*`,
      ``,
      `*Trip:* ${tripRef}`,
      `*Customer:* ${customerName}`,
      `*Driver:* ${driverName}`,
      `*Delay:* ${activeAlert.delay} at ${activeAlert.location || activeAlert.label}`,
      `*Reason:* ${activeAlert.reason || 'Traffic congestion'}`,
      `*Reported Time:* ${activeAlert.time}`,
      ``,
      `Our dispatch team is actively monitoring the vehicle. We will update you with revised ETA shortly.`,
    ].join('\n');

    const cleanPhone = trip?.customer?.contact_phone?.replace(/[^0-9]/g, '');
    const waUrl = cleanPhone
      ? `https://wa.me/${cleanPhone}?text=${encodeURIComponent(text)}`
      : `https://api.whatsapp.com/send?text=${encodeURIComponent(text)}`;

    window.open(waUrl, '_blank', 'noopener,noreferrer');
  };

  const handleAcknowledge = () => {
    setIsAcknowledged(true);
    setTimeout(() => {
      onClose();
      setIsAcknowledged(false);
    }, 1200);
  };

  const handleRemindLater = (mins: number) => {
    setSnoozeText(`Reminder set for ${mins} mins`);
    setTimeout(() => {
      setSnoozeText(null);
      onClose();
    }, 1000);
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-3xl w-full p-0 overflow-hidden bg-transparent border-none shadow-none focus:outline-none">
        <div className="flex flex-col sm:flex-row items-end gap-3 pointer-events-auto">
          
          {/* ── 1. 3D OPERATIONS ASSISTANT CHARACTER (Left Anchor) ── */}
          <div className="hidden sm:flex w-[145px] lg:w-[165px] h-[260px] lg:h-[300px] shrink-0 relative items-end">
            <img
              src="/assistant/was there any labor charge for this trip.png"
              alt="Operations Assistant Character"
              className="w-full h-full object-contain object-bottom filter drop-shadow-2xl select-none pointer-events-none"
            />
            {/* Pulsing Alert Pin Badge on Assistant */}
            <div className="absolute top-8 right-2 bg-rose-600 text-white p-1 rounded-full shadow-lg animate-bounce">
              <AlertTriangle size={14} className="stroke-[2.5]" />
            </div>
          </div>

          {/* ── 2. SPEECH BUBBLE & DELAY VIDEO CARD ── */}
          <div className="relative flex-1 w-full bg-white rounded-2xl border border-slate-200/90 shadow-2xl overflow-hidden">
            
            {/* Header / Dismiss Bar */}
            <div className="flex items-center justify-between px-5 pt-4 pb-2 border-b border-slate-100 bg-gradient-to-r from-rose-50/70 via-white to-white">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-full bg-rose-100 text-rose-700 flex items-center justify-center shrink-0 border border-rose-200">
                  <AlertTriangle size={16} className="stroke-[2.5]" />
                </div>
                <div>
                  <div className="flex items-center gap-1.5">
                    <h3 className="font-extrabold text-[15px] text-slate-900 leading-tight">
                      Hey Ian! 👋
                    </h3>
                    <span className="px-1.5 py-0.2 rounded-md bg-rose-500 text-white font-black text-[9px] uppercase tracking-wider">
                      Trip Delay Alert
                    </span>
                  </div>
                  <p className="text-[11.5px] text-slate-500 font-medium">
                    Trip <strong className="text-rose-600 font-bold">{tripRef}</strong> has an active delay notification
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={onClose}
                aria-label="Close modal"
                className="w-7 h-7 rounded-full flex items-center justify-center text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors cursor-pointer"
              >
                <X size={16} />
              </button>
            </div>

            {/* Delay Alert Selector Tabs (if multiple delays) */}
            {alerts.length > 1 && (
              <div className="px-5 pt-2 flex items-center gap-2 border-b border-slate-100 bg-slate-50/50">
                <span className="text-[10.5px] font-bold text-slate-400 uppercase tracking-wider">
                  Delays:
                </span>
                {alerts.map((a, idx) => (
                  <button
                    key={a.id}
                    type="button"
                    onClick={() => setActiveAlertIdx(idx)}
                    className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                      activeAlertIdx === idx
                        ? 'bg-rose-50 text-rose-700 border border-rose-200 shadow-2xs'
                        : 'text-slate-600 hover:bg-slate-100'
                    }`}
                  >
                    <span className="w-1.5 h-1.5 rounded-full bg-rose-500" />
                    <span>{a.label}</span>
                    <span className="font-mono text-[10px] text-rose-600 font-black">{a.delay}</span>
                  </button>
                ))}
              </div>
            )}

            {/* Content Body: Video Evidence + Delay Details */}
            <div className="p-4 sm:p-5 space-y-3.5">
              
              {/* Delay Description Banner */}
              <div className="p-3 rounded-xl bg-rose-50/60 border border-rose-100 flex items-start justify-between gap-3">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="font-mono font-black text-rose-600 text-sm">
                      {activeAlert.delay}
                    </span>
                    <span className="text-slate-300">•</span>
                    <div className="flex items-center gap-1 text-slate-700 text-xs font-bold">
                      <MapPin size={12} className="text-rose-500" />
                      <span>{activeAlert.location || activeAlert.label}</span>
                    </div>
                  </div>
                  <p className="text-xs text-slate-600 font-medium leading-relaxed">
                    <strong>Reason:</strong> {activeAlert.reason || 'Traffic congestion & transit bottleneck'}
                  </p>
                </div>

                <div className="text-right shrink-0">
                  <span className="text-[10px] text-slate-400 font-mono block">Reported Time</span>
                  <span className="text-xs font-mono font-bold text-slate-700">{activeAlert.time}</span>
                </div>
              </div>

              {/* ── DRIVER VIDEO EVIDENCE PLAYER ── */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="inline-flex rounded-lg bg-slate-100 p-0.5 border border-slate-200">
                      <button
                        type="button"
                        onClick={() => setMediaTab('video')}
                        className={`px-2.5 py-0.5 rounded-md text-[11px] font-bold transition-all flex items-center gap-1 cursor-pointer ${
                          mediaTab === 'video'
                            ? 'bg-white text-slate-900 shadow-2xs'
                            : 'text-slate-500 hover:text-slate-800'
                        }`}
                      >
                        <VideoIcon size={12} className="text-rose-500" />
                        <span>Dashcam Video</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => setMediaTab('photo')}
                        className={`px-2.5 py-0.5 rounded-md text-[11px] font-bold transition-all flex items-center gap-1 cursor-pointer ${
                          mediaTab === 'photo'
                            ? 'bg-white text-slate-900 shadow-2xs'
                            : 'text-slate-500 hover:text-slate-800'
                        }`}
                      >
                        <Camera size={12} className="text-blue-500" />
                        <span>Scene Photo</span>
                      </button>
                    </div>
                  </div>

                  <span className="text-[10.5px] font-mono text-slate-500">
                    Driver: <strong className="text-slate-800 font-bold">{driverName}</strong>
                  </span>
                </div>

                {/* Video / Photo Container */}
                <div className="relative w-full h-[180px] sm:h-[210px] rounded-xl overflow-hidden bg-slate-950 border border-slate-800 shadow-inner group">
                  {mediaTab === 'video' ? (
                    <>
                      {/* Video Stream / Road Canvas Simulation */}
                      <div className="absolute inset-0 flex items-center justify-center overflow-hidden">
                        <img
                          src="/saudi_highway_panorama.png"
                          alt="Live highway video feed"
                          className={`w-full h-full object-cover brightness-75 transition-transform duration-700 ${
                            isPlaying ? 'scale-105 filter saturate-110' : 'scale-100 filter grayscale-30'
                          }`}
                        />
                        {/* Traffic congestion blur overlay simulation */}
                        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-black/60" />
                      </div>

                      {/* HUD Top Bar: Recording Badge + Timestamp + Cam ID */}
                      <div className="absolute top-2.5 left-3 right-3 flex items-center justify-between text-white text-[10px] font-mono z-10">
                        <div className="flex items-center gap-2">
                          <div className="flex items-center gap-1 bg-rose-600/90 backdrop-blur-xs px-2 py-0.5 rounded text-[9.5px] font-bold">
                            <span className="w-1.5 h-1.5 rounded-full bg-white animate-ping" />
                            <span>REC · LIVE</span>
                          </div>
                          <span className="bg-black/40 backdrop-blur-xs px-1.5 py-0.5 rounded text-[9px] text-slate-200">
                            CAM-01 (CABIN / ROAD)
                          </span>
                        </div>
                        <div className="bg-black/50 backdrop-blur-xs px-2 py-0.5 rounded text-[9.5px] text-amber-300 font-bold">
                          12 km/h · CONGESTION
                        </div>
                      </div>

                      {/* HUD Bottom Bar: GPS + Telemetry */}
                      <div className="absolute bottom-2.5 left-3 right-3 flex items-center justify-between text-white text-[10px] font-mono z-10">
                        <span className="bg-black/60 backdrop-blur-xs px-2 py-0.5 rounded text-slate-300 text-[9px]">
                          24.7136° N, 46.6753° E · {activeAlert.location || 'Al Wadi KM 142'}
                        </span>
                        
                        {/* Play / Pause Toggle Button */}
                        <div className="flex items-center gap-1.5">
                          <button
                            type="button"
                            onClick={() => setIsPlaying(!isPlaying)}
                            className="w-6 h-6 rounded-full bg-white/20 hover:bg-white/30 backdrop-blur-xs flex items-center justify-center text-white cursor-pointer transition-colors"
                          >
                            {isPlaying ? <Pause size={10} /> : <Play size={10} className="ml-0.5" />}
                          </button>
                          <button
                            type="button"
                            onClick={() => setIsMuted(!isMuted)}
                            className="w-6 h-6 rounded-full bg-white/20 hover:bg-white/30 backdrop-blur-xs flex items-center justify-center text-white cursor-pointer transition-colors"
                          >
                            {isMuted ? <VolumeX size={10} /> : <Volume2 size={10} />}
                          </button>
                        </div>
                      </div>

                      {/* Play overlay button when paused */}
                      {!isPlaying && (
                        <div
                          onClick={() => setIsPlaying(true)}
                          className="absolute inset-0 bg-black/40 flex items-center justify-center cursor-pointer z-20"
                        >
                          <div className="w-12 h-12 rounded-full bg-white/90 text-rose-600 flex items-center justify-center shadow-lg hover:scale-110 transition-transform">
                            <Play size={20} className="ml-1" />
                          </div>
                        </div>
                      )}
                    </>
                  ) : (
                    <div className="relative w-full h-full flex items-center justify-center bg-slate-900">
                      <img
                        src={activeAlert.image || '/evidence/og_stop.png'}
                        alt={activeAlert.label}
                        className="w-full h-full object-cover"
                      />
                      <div className="absolute bottom-2 left-3 bg-black/70 backdrop-blur-xs px-2 py-0.5 rounded text-white text-[9.5px] font-mono">
                        Incident Photo · {activeAlert.location || 'Al Wadi'}
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Status acknowledgement feedback */}
              {isAcknowledged && (
                <div className="p-2.5 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-bold flex items-center gap-2 animate-in fade-in">
                  <CheckCircle2 size={16} className="text-emerald-600 shrink-0" />
                  <span>Delay noted and logged in dispatch control center.</span>
                </div>
              )}

              {snoozeText && (
                <div className="p-2.5 rounded-xl bg-amber-50 border border-amber-200 text-amber-800 text-xs font-bold flex items-center gap-2 animate-in fade-in">
                  <Clock size={16} className="text-amber-600 shrink-0" />
                  <span>{snoozeText}</span>
                </div>
              )}

              {/* ── ACTION BUTTONS ── */}
              <div className="pt-1 flex flex-wrap sm:flex-nowrap items-center gap-2">
                {/* Notify Customer via WhatsApp */}
                <Button
                  onClick={handleShareWhatsApp}
                  className="flex-1 h-9 rounded-xl bg-[#10B981] hover:bg-[#059669] text-white text-xs font-bold gap-1.5 shadow-sm cursor-pointer border-none"
                >
                  <WhatsAppIcon className="w-4 h-4 text-white" />
                  <span>Notify Customer</span>
                </Button>

                {/* Acknowledge Delay */}
                <Button
                  onClick={handleAcknowledge}
                  className="flex-1 h-9 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold shadow-sm cursor-pointer"
                >
                  <CheckCircle2 size={14} className="mr-1 text-emerald-400" />
                  <span>Acknowledge</span>
                </Button>

                {/* Remind Later Options */}
                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    onClick={() => handleRemindLater(15)}
                    className="h-9 px-2.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-600 text-xs font-semibold cursor-pointer whitespace-nowrap"
                  >
                    15m
                  </button>
                  <button
                    type="button"
                    onClick={() => handleRemindLater(30)}
                    className="h-9 px-2.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-600 text-xs font-semibold cursor-pointer whitespace-nowrap"
                  >
                    30m
                  </button>
                </div>
              </div>

            </div>

          </div>

        </div>
      </DialogContent>
    </Dialog>
  );
}
