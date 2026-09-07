import React, { useState } from 'react';
import {
  X, AlertTriangle, Play, Pause, Volume2, VolumeX,
  MapPin, CheckCircle2, Video as VideoIcon, Camera,
  Clock, ArrowRight, Activity, ShieldCheck, ExternalLink
} from 'lucide-react';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { WhatsAppIcon } from '@/components/ui/whatsapp-icon';

export interface StructuredDelayAlert {
  id: string;
  stepNum: number;
  type: 'active_bottleneck' | 'cascading_impact';
  typeBadge: string;
  typeBadgeColor: string;
  title: string;
  stopName: string;
  delay: string;
  time: string;
  originalEta?: string;
  revisedEta?: string;
  speed?: string;
  locationDetails: string;
  reason: string;
  explanation: string;
  image: string;
}

interface TripDelayNotificationModalProps {
  isOpen: boolean;
  onClose: () => void;
  trip: any;
  alerts?: StructuredDelayAlert[];
}

const DEFAULT_STRUCTURED_DELAYS: StructuredDelayAlert[] = [
  {
    id: 'delay-cause',
    stepNum: 1,
    type: 'active_bottleneck',
    typeBadge: '1. CURRENT BOTTLENECK · ACTIVE NOW',
    typeBadgeColor: 'bg-rose-100 text-rose-700 border-rose-200',
    title: 'Al Wadi Highway Congestion',
    stopName: 'Al Wadi (In Transit)',
    delay: '+ 45 min',
    time: '1:15 PM',
    speed: '12 km/h (Slow moving)',
    locationDetails: 'Al Wadi Highway Bypass (KM 142)',
    reason: 'Heavy Road Construction & Lane Reduction Queue',
    explanation:
      'The truck is currently stuck in an unexpected highway construction bottleneck near Al Wadi. Speed has dropped to 12 km/h, adding 45 minutes to the travel time.',
    image: '/evidence/og_stop.png',
  },
  {
    id: 'delay-effect',
    stepNum: 2,
    type: 'cascading_impact',
    typeBadge: '2. DOWNSTREAM IMPACT · REVISED ETA',
    typeBadgeColor: 'bg-amber-100 text-amber-800 border-amber-200',
    title: 'Al Majmaah Delivery Delay',
    stopName: 'Al Majmaah (Next Stop)',
    delay: '+ 30 min',
    time: '3:20 PM',
    originalEta: '2:50 PM',
    revisedEta: '3:20 PM',
    speed: 'Scheduled Delivery',
    locationDetails: 'Al Majmaah Logistics Gate 2',
    reason: 'Cascading Arrival Delay from Al Wadi Traffic',
    explanation:
      'Because the truck lost 45 minutes at Al Wadi, the scheduled arrival at Al Majmaah is pushed back by 30 minutes. Expected delivery is now at 3:20 PM.',
    image: '/evidence/02_stop.png',
  },
];

export default function TripDelayNotificationModal({
  isOpen,
  onClose,
  trip,
  alerts = DEFAULT_STRUCTURED_DELAYS,
}: TripDelayNotificationModalProps) {
  const [activeAlertIdx, setActiveAlertIdx] = useState(0);
  const [isPlaying, setIsPlaying] = useState(true);
  const [isMuted, setIsMuted] = useState(true);
  const [mediaTab, setMediaTab] = useState<'video' | 'photo'>('video');
  const [isAcknowledged, setIsAcknowledged] = useState(false);
  const [snoozeText, setSnoozeText] = useState<string | null>(null);

  const activeAlert = alerts[activeAlertIdx] || DEFAULT_STRUCTURED_DELAYS[0];
  const tripRef = trip?.ref_id || trip?.id || 'TRP-0240';
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
      ``,
      `*Current Incident:* ${alerts[0]?.delay || '+45 min'} at ${alerts[0]?.stopName || 'Al Wadi'} (${alerts[0]?.reason || 'Traffic congestion'})`,
      `*Revised Delivery ETA:* ${alerts[1]?.revisedEta || '3:20 PM'} at ${alerts[1]?.stopName || 'Al Majmaah'} (+30m impact)`,
      ``,
      `Our operations dispatch is tracking the vehicle in real-time. We will keep you updated.`,
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
    setSnoozeText(`Reminder snoozed for ${mins} mins`);
    setTimeout(() => {
      setSnoozeText(null);
      onClose();
    }, 1000);
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-4xl w-full p-0 overflow-hidden bg-white border border-slate-200 rounded-3xl shadow-2xl focus:outline-none">
        <div className="flex flex-col md:flex-row w-full max-h-[90vh] overflow-y-auto">
          
          {/* ── 1. LEFT SIDEBAR: OPERATIONS ASSISTANT MASCOT ── */}
          <div className="hidden md:flex w-[210px] shrink-0 bg-gradient-to-b from-amber-50/80 via-slate-50 to-slate-100 border-r border-slate-200 p-4 flex-col justify-between items-center text-center">
            
            {/* Top Assistant Badge */}
            <div className="w-full">
              <div className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-white border border-slate-200 shadow-2xs text-[10px] font-extrabold text-slate-700">
                <Activity size={11} className="text-[#FA634E]" />
                <span>MERCON AI Dispatch</span>
              </div>
            </div>

            {/* Mascot Character Illustration */}
            <div className="relative my-2 w-[150px] h-[210px] flex items-end justify-center">
              <img
                src="/assistant/was there any labor charge for this trip.png"
                alt="Operations Assistant Character"
                className="w-full h-full object-contain object-bottom filter drop-shadow-md select-none pointer-events-none"
              />
              <span className="absolute -top-1 right-2 w-3.5 h-3.5 rounded-full bg-rose-500 border-2 border-white animate-pulse" />
            </div>

            {/* Bottom Context Card */}
            <div className="w-full p-2.5 rounded-xl bg-white border border-slate-200/80 shadow-2xs text-left space-y-1">
              <span className="text-[9.5px] uppercase font-black text-slate-400 block tracking-wider">
                MONITORING TRIP
              </span>
              <div className="font-mono font-black text-xs text-slate-900 truncate">
                {tripRef}
              </div>
              <div className="text-[10px] text-slate-500 truncate">
                Driver: <span className="font-bold text-slate-700">{driverName}</span>
              </div>
            </div>

          </div>

          {/* ── 2. MAIN CARD: CAUSE & IMPACT PROGRESSION ── */}
          <div className="flex-1 min-w-0 flex flex-col justify-between bg-white">
            
            {/* Header Bar */}
            <div className="flex items-center justify-between px-5 py-3.5 border-b border-slate-100 bg-gradient-to-r from-rose-50/40 via-white to-white">
              <div className="flex items-center gap-2.5 min-w-0">
                <div className="w-9 h-9 rounded-xl bg-rose-100 text-rose-600 flex items-center justify-center shrink-0 border border-rose-200 shadow-2xs">
                  <AlertTriangle size={18} className="stroke-[2.5]" />
                </div>
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <h3 className="font-black text-base text-slate-900 leading-tight">
                      Hey Ian! 👋
                    </h3>
                    <span className="px-2 py-0.5 rounded-md bg-rose-500 text-white font-black text-[9.5px] uppercase tracking-wider">
                      Trip Delay Alert
                    </span>
                  </div>
                  <p className="text-xs text-slate-500 font-medium truncate">
                    Here is the breakdown of why Trip <strong className="text-rose-600 font-bold">{tripRef}</strong> is delayed:
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={onClose}
                aria-label="Close dialog"
                className="w-8 h-8 rounded-full flex items-center justify-center text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors cursor-pointer shrink-0"
              >
                <X size={18} />
              </button>
            </div>

            {/* ── CAUSE ➔ EFFECT SEGMENTED PROGRESSION BAR ── */}
            <div className="px-5 py-2.5 bg-slate-50/90 border-b border-slate-200/80">
              <div className="flex items-center justify-between pb-1.5">
                <span className="text-[10px] font-black uppercase tracking-wider text-slate-500 flex items-center gap-1">
                  <span>Delay Progression: Cause & Effect</span>
                </span>
                <span className="text-[10.5px] text-slate-500 font-medium">
                  Select a step below to inspect
                </span>
              </div>

              <div className="grid grid-cols-2 gap-2.5">
                
                {/* Tab 1: Cause (Active Bottleneck) */}
                <button
                  type="button"
                  onClick={() => setActiveAlertIdx(0)}
                  className={`p-2.5 rounded-2xl text-left transition-all border cursor-pointer relative overflow-hidden ${
                    activeAlertIdx === 0
                      ? 'bg-white border-rose-400 shadow-sm ring-2 ring-rose-500/20'
                      : 'bg-white/70 border-slate-200 hover:bg-white hover:border-slate-300'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="text-[9px] font-extrabold uppercase tracking-wider px-1.5 py-0.5 rounded bg-rose-100 text-rose-700 border border-rose-200">
                      Step 1 · Current Cause
                    </span>
                    <span className="font-mono font-black text-xs text-rose-600 bg-rose-50 px-1.5 py-0.2 rounded">
                      + 45 min
                    </span>
                  </div>

                  <div className="font-extrabold text-xs text-slate-900 pt-1.5 truncate">
                    Al Wadi (Active Highway Jam)
                  </div>
                  <div className="text-[10.5px] text-slate-500 truncate flex items-center gap-1 pt-0.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-rose-500 animate-ping shrink-0" />
                    <span>Live Bottleneck · 12 km/h</span>
                  </div>

                  {activeAlertIdx === 0 && (
                    <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-rose-500" />
                  )}
                </button>

                {/* Tab 2: Effect (Downstream Impact) */}
                <button
                  type="button"
                  onClick={() => setActiveAlertIdx(1)}
                  className={`p-2.5 rounded-2xl text-left transition-all border cursor-pointer relative overflow-hidden ${
                    activeAlertIdx === 1
                      ? 'bg-white border-amber-400 shadow-sm ring-2 ring-amber-500/20'
                      : 'bg-white/70 border-slate-200 hover:bg-white hover:border-slate-300'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="text-[9px] font-extrabold uppercase tracking-wider px-1.5 py-0.5 rounded bg-amber-100 text-amber-800 border border-amber-200">
                      Step 2 · Next Stop Impact
                    </span>
                    <span className="font-mono font-black text-xs text-amber-600 bg-amber-50 px-1.5 py-0.2 rounded">
                      + 30 min
                    </span>
                  </div>

                  <div className="font-extrabold text-xs text-slate-900 pt-1.5 truncate">
                    Al Majmaah (Next Delivery)
                  </div>
                  <div className="text-[10.5px] text-slate-500 truncate flex items-center gap-1 pt-0.5">
                    <Clock size={10} className="text-amber-600 shrink-0" />
                    <span>New ETA: 3:20 PM (was 2:50 PM)</span>
                  </div>

                  {activeAlertIdx === 1 && (
                    <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-amber-500" />
                  )}
                </button>

              </div>
            </div>

            {/* ── DETAIL & EVIDENCE BODY ── */}
            <div className="p-4 sm:p-5 space-y-3.5">
              
              {/* Context Explanation Card */}
              <div
                className={`p-3.5 rounded-2xl border transition-colors ${
                  activeAlert.type === 'active_bottleneck'
                    ? 'bg-rose-50/60 border-rose-200/80'
                    : 'bg-amber-50/60 border-amber-200/80'
                }`}
              >
                <div className="flex flex-wrap items-center justify-between gap-2 pb-1.5 border-b border-black/5">
                  <div className="flex items-center gap-2">
                    <span
                      className={`text-[9.5px] font-black uppercase px-2 py-0.5 rounded border ${
                        activeAlert.type === 'active_bottleneck'
                          ? 'bg-rose-100 text-rose-700 border-rose-300'
                          : 'bg-amber-100 text-amber-800 border-amber-300'
                      }`}
                    >
                      {activeAlert.type === 'active_bottleneck' ? 'CURRENT INCIDENT' : 'ESTIMATED ARRIVAL IMPACT'}
                    </span>
                    <h4 className="font-black text-sm text-slate-900">
                      {activeAlert.title}
                    </h4>
                  </div>

                  <div className="flex items-center gap-2 text-xs font-mono">
                    <span className="font-black text-rose-600 text-sm">{activeAlert.delay}</span>
                    <span className="text-slate-300">•</span>
                    <span className="text-slate-600 font-bold">{activeAlert.time}</span>
                  </div>
                </div>

                {/* Explanation paragraph */}
                <p className="text-xs text-slate-700 font-medium leading-relaxed pt-2">
                  {activeAlert.explanation}
                </p>

                {/* Meta details footer */}
                <div className="flex flex-wrap items-center gap-4 pt-2 text-[11px] text-slate-600 font-medium">
                  <div className="flex items-center gap-1">
                    <MapPin size={12} className="text-rose-500" />
                    <span>{activeAlert.locationDetails}</span>
                  </div>
                  {activeAlert.revisedEta && (
                    <div className="flex items-center gap-1 font-mono text-amber-700 font-bold">
                      <Clock size={12} />
                      <span>Scheduled: {activeAlert.originalEta} ➔ Revised: {activeAlert.revisedEta}</span>
                    </div>
                  )}
                </div>
              </div>

              {/* ── MEDIA EVIDENCE VIEWER (Video & Photo Tabs) ── */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <div className="inline-flex rounded-xl bg-slate-100 p-0.5 border border-slate-200">
                    <button
                      type="button"
                      onClick={() => setMediaTab('video')}
                      className={`px-3 py-1 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
                        mediaTab === 'video'
                          ? 'bg-white text-slate-900 shadow-2xs'
                          : 'text-slate-500 hover:text-slate-800'
                      }`}
                    >
                      <VideoIcon size={13} className="text-rose-500" />
                      <span>Dashcam Video</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setMediaTab('photo')}
                      className={`px-3 py-1 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
                        mediaTab === 'photo'
                          ? 'bg-white text-slate-900 shadow-2xs'
                          : 'text-slate-500 hover:text-slate-800'
                      }`}
                    >
                      <Camera size={13} className="text-blue-500" />
                      <span>Scene Photo</span>
                    </button>
                  </div>

                  <span className="text-[11px] text-slate-500 font-mono">
                    Vehicle: <strong className="text-slate-800">TRK-4244</strong>
                  </span>
                </div>

                {/* Video / Photo Container */}
                <div className="relative w-full h-[185px] sm:h-[210px] rounded-2xl overflow-hidden bg-slate-950 border border-slate-800 shadow-inner group">
                  {mediaTab === 'video' ? (
                    <>
                      {/* Video Stream Simulation */}
                      <div className="absolute inset-0 flex items-center justify-center overflow-hidden">
                        <img
                          src="/saudi_highway_panorama.png"
                          alt="Live highway dashcam view"
                          className={`w-full h-full object-cover brightness-80 transition-transform duration-700 ${
                            isPlaying ? 'scale-105 filter saturate-110' : 'scale-100 filter grayscale-30'
                          }`}
                        />
                        <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-transparent to-black/60" />
                      </div>

                      {/* HUD Top Bar */}
                      <div className="absolute top-2.5 left-3 right-3 flex items-center justify-between text-white text-[10px] font-mono z-10">
                        <div className="flex items-center gap-2">
                          <div className="flex items-center gap-1 bg-rose-600/90 backdrop-blur-xs px-2 py-0.5 rounded-md text-[9.5px] font-bold">
                            <span className="w-1.5 h-1.5 rounded-full bg-white animate-ping" />
                            <span>REC · LIVE</span>
                          </div>
                          <span className="bg-black/50 backdrop-blur-xs px-2 py-0.5 rounded-md text-[9px] text-slate-200">
                            CAM-01 (CABIN DASHCAM)
                          </span>
                        </div>
                        <div className="bg-black/60 backdrop-blur-xs px-2 py-0.5 rounded-md text-[9.5px] text-amber-300 font-bold">
                          {activeAlert.speed || '12 km/h · CONGESTION'}
                        </div>
                      </div>

                      {/* HUD Bottom Bar */}
                      <div className="absolute bottom-2.5 left-3 right-3 flex items-center justify-between text-white text-[10px] font-mono z-10">
                        <span className="bg-black/70 backdrop-blur-xs px-2 py-0.5 rounded-md text-slate-300 text-[9px]">
                          24.7136° N, 46.6753° E · {activeAlert.locationDetails}
                        </span>

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
                          <div className="w-12 h-12 rounded-full bg-white/95 text-rose-600 flex items-center justify-center shadow-lg hover:scale-110 transition-transform">
                            <Play size={20} className="ml-1" />
                          </div>
                        </div>
                      )}
                    </>
                  ) : (
                    <div className="relative w-full h-full flex items-center justify-center bg-slate-900">
                      <img
                        src={activeAlert.image || '/evidence/og_stop.png'}
                        alt={activeAlert.title}
                        className="w-full h-full object-cover"
                      />
                      <div className="absolute bottom-2 left-3 bg-black/70 backdrop-blur-xs px-2 py-0.5 rounded-md text-white text-[9.5px] font-mono">
                        Incident Evidence · {activeAlert.locationDetails}
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Status acknowledgement feedback */}
              {isAcknowledged && (
                <div className="p-2.5 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-bold flex items-center gap-2 animate-in fade-in">
                  <CheckCircle2 size={16} className="text-emerald-600 shrink-0" />
                  <span>Delay acknowledged and logged in dispatch control center.</span>
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
                  className="flex-1 h-9.5 rounded-xl bg-[#10B981] hover:bg-[#059669] text-white text-xs font-bold gap-1.5 shadow-sm cursor-pointer border-none"
                >
                  <WhatsAppIcon className="w-4 h-4 text-white" />
                  <span>Notify Customer</span>
                </Button>

                {/* Acknowledge Delay */}
                <Button
                  onClick={handleAcknowledge}
                  className="flex-1 h-9.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold shadow-sm cursor-pointer"
                >
                  <CheckCircle2 size={14} className="mr-1 text-emerald-400" />
                  <span>Acknowledge Delay</span>
                </Button>

                {/* Remind Later Options */}
                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    onClick={() => handleRemindLater(15)}
                    className="h-9.5 px-3 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 text-xs font-semibold cursor-pointer whitespace-nowrap"
                  >
                    15m
                  </button>
                  <button
                    type="button"
                    onClick={() => handleRemindLater(30)}
                    className="h-9.5 px-3 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 text-xs font-semibold cursor-pointer whitespace-nowrap"
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
