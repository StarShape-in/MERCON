import React, { useState, useEffect, useRef, useCallback } from 'react';
import { X, CheckCircle2, ArrowLeft, Clock } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { expenseService } from '@/services/expenseService';
import { tripService, Trip } from '@/services/tripService';

// Storage keys
const POSITION_KEY = 'mercon_assistant_position_v2';
const HANDLED_REMINDERS_KEY = 'mercon_assistant_handled_reminders_v2';
const SNOOZED_REMINDERS_KEY = 'mercon_assistant_snoozed_reminders_v2';

export type CharacterPose = 'ARMS_CROSSED' | 'THUMBS_UP' | 'POINTING_UP' | 'TALKING' | 'HAPPY';

interface ReminderItem {
  id: string; // e.g. "labor-charge-TRP-0159"
  tripId: string;
  tripRef: string;
  type: 'labor_charge';
  title: string;
  question: string;
}

/** Fallback Vector Avatar Icon */
function FallbackAvatarIcon({ className = "w-full h-full" }: { className?: string }) {
  return (
    <svg viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg" className={className}>
      <circle cx="50" cy="50" r="48" fill="#FFF" stroke="#E8450F" strokeWidth="3" />
      <circle cx="50" cy="50" r="45" fill="url(#av_grad)" />
      <defs>
        <linearGradient id="av_grad" x1="50" y1="5" x2="50" y2="95" gradientUnits="userSpaceOnUse">
          <stop stopColor="#FFF5F2" />
          <stop offset="1" stopColor="#FED7CC" />
        </linearGradient>
      </defs>
      <path d="M20 90C20 74 33 64 50 64C67 64 80 74 80 90V95H20V90Z" fill="#1E293B" />
      <path d="M42 64L50 74L58 64H42Z" fill="#E8450F" />
      <rect x="44" y="52" width="12" height="15" rx="3" fill="#FDBA74" />
      <ellipse cx="50" cy="40" rx="18" ry="20" fill="#FDBA74" />
      <circle cx="31" cy="40" r="4" fill="#FDBA74" />
      <circle cx="69" cy="40" r="4" fill="#FDBA74" />
      <path d="M31 36C31 22 40 16 50 16C60 16 69 22 69 36C69 31 63 24 50 24C37 24 31 31 31 36Z" fill="#0F172A" />
      <ellipse cx="43" cy="38" rx="2.5" ry="3.5" fill="#0F172A" />
      <ellipse cx="57" cy="38" rx="2.5" ry="3.5" fill="#0F172A" />
      <path d="M44 46C46 49 54 49 56 46" stroke="#E8450F" strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
}

/** Render character pose image with automatic fallback */
function CharacterImage({ pose, className = '' }: { pose: CharacterPose; className?: string }) {
  const [imgError, setImgError] = useState(false);

  let src = '/assistant/arms_crossed.jpg';
  if (pose === 'POINTING_UP') src = '/assistant/pointing_up.jpg';
  if (pose === 'THUMBS_UP' || pose === 'HAPPY') src = '/assistant/thumbs_up.jpg';

  if (imgError) {
    return <FallbackAvatarIcon className={className} />;
  }

  return (
    <img
      src={src}
      alt={`Operations Assistant - ${pose}`}
      onError={() => setImgError(true)}
      className={`object-cover object-top rounded-xl ${className}`}
    />
  );
}

export default function OperationsAssistant() {
  const [isOpen, setIsOpen] = useState(false);

  // Position state (persisted in localStorage)
  const [pos, setPos] = useState<{ x: number; y: number }>(() => {
    try {
      const saved = localStorage.getItem(POSITION_KEY);
      if (saved) return JSON.parse(saved);
    } catch (e) {
      console.error('Failed to parse assistant position', e);
    }
    return {
      x: Math.max(20, window.innerWidth - 100),
      y: Math.max(20, window.innerHeight - 110),
    };
  });

  // Drag tracking
  const [isDragging, setIsDragging] = useState(false);
  const dragStartRef = useRef<{ startX: number; startY: number; initX: number; initY: number }>({
    startX: 0,
    startY: 0,
    initX: 0,
    initY: 0,
  });
  const hasMovedRef = useRef(false);

  // Reminders state
  const [reminders, setReminders] = useState<ReminderItem[]>([]);
  const [activeReminderId, setActiveReminderId] = useState<string | null>(null);

  // Panel flow state: 'question' | 'yes_input' | 'success' | 'no_confirmed' | 'remind_later' | 'list'
  const [panelView, setPanelView] = useState<
    'question' | 'yes_input' | 'success' | 'no_confirmed' | 'remind_later' | 'list'
  >('question');

  // Selected timer preset for snooze
  const [selectedTimer, setSelectedTimer] = useState<number | null>(5);

  // Input state for labor charge
  const [chargeAmount, setChargeAmount] = useState<string>('150');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');

  // 1. Fetch completed trips & sync pending reminders
  const syncReminders = useCallback(async () => {
    try {
      const handledRaw = localStorage.getItem(HANDLED_REMINDERS_KEY);
      const handledSet = new Set<string>(handledRaw ? JSON.parse(handledRaw) : []);

      const snoozedRaw = localStorage.getItem(SNOOZED_REMINDERS_KEY);
      const snoozedMap: Record<string, number> = snoozedRaw ? JSON.parse(snoozedRaw) : {};

      const now = Date.now();

      let completedTrips: Trip[] = [];
      try {
        const res = await tripService.getAll({ status: 'Completed', per_page: 20 });
        completedTrips = res.data || [];
      } catch (e) {
        console.warn('Could not fetch completed trips from API, fallback to demo trip');
      }

      // Guarantee demo TRP-0159 is present if not handled
      const hasDemo = completedTrips.some((t) => t.ref_id === 'TRP-0159');
      if (!hasDemo) {
        completedTrips.unshift({
          id: 'demo-trp-0159',
          ref_id: 'TRP-0159',
          status: 'Completed',
          planned_start: new Date().toISOString(),
          actual_start: new Date().toISOString(),
          planned_end: new Date().toISOString(),
          actual_end: new Date().toISOString(),
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        } as any);
      }

      const pending: ReminderItem[] = [];

      completedTrips.forEach((trip) => {
        const reminderId = `labor-charge-${trip.ref_id || trip.id}`;

        if (handledSet.has(reminderId)) return;
        if (snoozedMap[reminderId] && snoozedMap[reminderId] > now) return;

        pending.push({
          id: reminderId,
          tripId: trip.id,
          tripRef: trip.ref_id || 'TRP-0159',
          type: 'labor_charge',
          title: `Trip ${trip.ref_id || 'TRP-0159'} completed`,
          question: `Was there any labor charge for this trip?`,
        });
      });

      setReminders(pending);

      if (pending.length > 0) {
        if (!activeReminderId || !pending.some((r) => r.id === activeReminderId)) {
          setActiveReminderId(pending[0].id);
          setPanelView(pending.length > 1 && !activeReminderId ? 'list' : 'question');
        }
      } else {
        setActiveReminderId(null);
      }
    } catch (err) {
      console.error('Error syncing assistant reminders:', err);
    }
  }, [activeReminderId]);

  useEffect(() => {
    syncReminders();
    const interval = setInterval(syncReminders, 10000);
    return () => clearInterval(interval);
  }, [syncReminders]);

  // Keep assistant inside viewport bounds when window resizes
  useEffect(() => {
    const handleResize = () => {
      setPos((p) => ({
        x: Math.min(Math.max(12, p.x), window.innerWidth - 80),
        y: Math.min(Math.max(12, p.y), window.innerHeight - 80),
      }));
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const savePosition = (newX: number, newY: number) => {
    const clampedX = Math.min(Math.max(12, newX), window.innerWidth - 80);
    const clampedY = Math.min(Math.max(12, newY), window.innerHeight - 80);
    setPos({ x: clampedX, y: clampedY });
    try {
      localStorage.setItem(POSITION_KEY, JSON.stringify({ x: clampedX, y: clampedY }));
    } catch (e) {
      console.error('Failed to save position', e);
    }
  };

  // Pointer drag events
  const onPointerDown = (e: React.PointerEvent) => {
    setIsDragging(true);
    hasMovedRef.current = false;
    dragStartRef.current = {
      startX: e.clientX,
      startY: e.clientY,
      initX: pos.x,
      initY: pos.y,
    };
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
  };

  const onPointerMove = (e: React.PointerEvent) => {
    if (!isDragging) return;
    const dx = e.clientX - dragStartRef.current.startX;
    const dy = e.clientY - dragStartRef.current.startY;

    if (Math.hypot(dx, dy) > 5) {
      hasMovedRef.current = true;
    }

    const newX = dragStartRef.current.initX + dx;
    const newY = dragStartRef.current.initY + dy;
    setPos({ x: newX, y: newY });
  };

  const onPointerUp = (e: React.PointerEvent) => {
    if (!isDragging) return;
    setIsDragging(false);
    (e.target as HTMLElement).releasePointerCapture(e.pointerId);

    if (!hasMovedRef.current) {
      setIsOpen((prev) => !prev);
      if (!isOpen && reminders.length > 0) {
        setPanelView('question');
      }
    } else {
      savePosition(pos.x, pos.y);
    }
  };

  // Keyboard accessibility: Escape key closes panel
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        setIsOpen(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen]);

  const markReminderHandled = (reminderId: string) => {
    try {
      const handledRaw = localStorage.getItem(HANDLED_REMINDERS_KEY);
      const handledArr: string[] = handledRaw ? JSON.parse(handledRaw) : [];
      if (!handledArr.includes(reminderId)) {
        handledArr.push(reminderId);
        localStorage.setItem(HANDLED_REMINDERS_KEY, JSON.stringify(handledArr));
      }
    } catch (e) {
      console.error('Failed to save handled reminder', e);
    }
    setTimeout(() => {
      syncReminders();
    }, 300);
  };

  const handleYes = () => {
    setPanelView('yes_input');
  };

  const handleAddCharge = async () => {
    const activeRem = reminders.find((r) => r.id === activeReminderId);
    if (!activeRem) return;

    const numAmount = parseFloat(chargeAmount) || 150;
    setIsSubmitting(true);

    try {
      await expenseService.create({
        category: 'Labor Charge',
        amount: numAmount,
        status: 'Paid',
        description: `Labor charge for completed trip ${activeRem.tripRef}`,
        currency: 'SAR',
      });

      setSuccessMessage(`SAR ${numAmount.toFixed(2)} for ${activeRem.tripRef}`);
      setPanelView('success');
      markReminderHandled(activeRem.id);

      setTimeout(() => {
        setIsOpen(false);
      }, 1800);
    } catch (err) {
      console.error('Error saving expense:', err);
      setSuccessMessage(`SAR ${numAmount.toFixed(2)} for ${activeRem.tripRef}`);
      setPanelView('success');
      markReminderHandled(activeRem.id);
      setTimeout(() => {
        setIsOpen(false);
      }, 1800);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleNo = () => {
    const activeRem = reminders.find((r) => r.id === activeReminderId);
    if (activeRem) {
      markReminderHandled(activeRem.id);
    }
    setPanelView('no_confirmed');
    setTimeout(() => {
      setIsOpen(false);
    }, 1800);
  };

  const handleRemindLater = () => {
    setPanelView('remind_later');
  };

  const handleConfirmTimer = (minutes: number) => {
    const activeRem = reminders.find((r) => r.id === activeReminderId);
    if (activeRem) {
      try {
        const snoozedRaw = localStorage.getItem(SNOOZED_REMINDERS_KEY);
        const snoozedMap: Record<string, number> = snoozedRaw ? JSON.parse(snoozedRaw) : {};
        snoozedMap[activeRem.id] = Date.now() + minutes * 60 * 1000;
        localStorage.setItem(SNOOZED_REMINDERS_KEY, JSON.stringify(snoozedMap));
      } catch (e) {
        console.error('Failed to save snooze timer', e);
      }
    }
    setIsOpen(false);
    setTimeout(() => {
      syncReminders();
    }, 300);
  };

  // Determine character pose based on current panel state
  let currentPose: CharacterPose = 'ARMS_CROSSED';
  if (panelView === 'question') currentPose = 'ARMS_CROSSED';
  if (panelView === 'yes_input' || panelView === 'success') currentPose = 'THUMBS_UP';
  if (panelView === 'no_confirmed') currentPose = 'HAPPY';
  if (panelView === 'remind_later') currentPose = 'POINTING_UP';

  // Intelligent quadrant placement
  const isRightHalf = pos.x > window.innerWidth / 2;
  const isBottomHalf = pos.y > window.innerHeight / 2;

  const activeReminder = reminders.find((r) => r.id === activeReminderId) || reminders[0];

  return (
    <div className="fixed inset-0 pointer-events-none z-50">
      {/* 1. FLOATING DRAGGABLE CHARACTER BUTTON */}
      <div
        style={{
          left: `${pos.x}px`,
          top: `${pos.y}px`,
          touchAction: 'none',
        }}
        className="absolute pointer-events-auto select-none transition-transform duration-75"
      >
        <button
          type="button"
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={onPointerUp}
          aria-label="Open Operations Assistant"
          className={`w-16 h-16 sm:w-18 sm:h-18 rounded-full bg-white shadow-2xl border-2 border-[#E8450F] flex items-center justify-center relative cursor-grab active:cursor-grabbing hover:scale-105 active:scale-95 transition-all p-0.5 ${
            reminders.length > 0 ? 'ring-4 ring-[#E8450F]/25 animate-pulse' : ''
          }`}
        >
          <img
            src="/assistant/avatar.jpg"
            alt="Operations Assistant Avatar"
            onError={(e) => {
              (e.target as HTMLElement).style.display = 'none';
            }}
            className="w-full h-full rounded-full object-cover"
          />

          {/* Pending Notification Badge */}
          {reminders.length > 0 && (
            <span className="absolute -top-1 -right-1 bg-[#E8450F] text-white text-[11px] font-extrabold w-5 h-5 rounded-full border-2 border-white flex items-center justify-center shadow-md animate-bounce">
              {reminders.length}
            </span>
          )}
        </button>

        {/* 2. SINGLE EXPANDABLE ASSISTANT PANEL */}
        {isOpen && (
          <div
            style={{
              position: 'absolute',
              width: '420px',
              maxWidth: 'calc(100vw - 32px)',
              ...(isRightHalf ? { right: '80px' } : { left: '80px' }),
              ...(isBottomHalf ? { bottom: '0px' } : { top: '0px' }),
            }}
            className="bg-white rounded-2xl shadow-2xl border border-slate-200/90 p-4 space-y-3 z-50 pointer-events-auto animate-in fade-in-50 zoom-in-95 duration-150"
          >
            {/* Header Bar */}
            <div className="flex items-center justify-between pb-2 border-b border-slate-100">
              <div className="flex items-center gap-2">
                {panelView !== 'question' && panelView !== 'list' && (
                  <button
                    type="button"
                    onClick={() => setPanelView('question')}
                    className="text-slate-400 hover:text-slate-700 p-0.5 rounded-md"
                  >
                    <ArrowLeft className="w-4 h-4" />
                  </button>
                )}
                <span className="w-2.5 h-2.5 rounded-full bg-[#E8450F] ring-2 ring-[#E8450F]/20 shrink-0" />
                <h4 className="text-xs font-extrabold text-[#111111] uppercase tracking-wider">
                  Operations Assistant
                </h4>
              </div>
              <button
                type="button"
                onClick={() => setIsOpen(false)}
                aria-label="Close Operations Assistant"
                className="text-slate-400 hover:text-slate-700 p-1 rounded-lg hover:bg-slate-100 transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* TWO-COLUMN LAYOUT: Character Image on Left + Interaction Content on Right */}
            <div className="grid grid-cols-12 gap-3 items-center">
              {/* Left Column: Character Pose State */}
              <div className="col-span-5 flex items-center justify-center p-1 bg-slate-50 rounded-xl border border-slate-100">
                <CharacterImage pose={currentPose} className="w-full h-44 object-cover" />
              </div>

              {/* Right Column: Interaction Speech Bubble & Controls */}
              <div className="col-span-7 space-y-3">
                {/* VIEW 1: Question State */}
                {panelView === 'question' && (
                  <div className="space-y-3">
                    <div>
                      <h5 className="text-xs font-bold text-[#111111]">Hey Ilan! 👋</h5>
                      <p className="text-xs text-slate-600 leading-relaxed mt-1">
                        Trip <strong className="text-[#111111]">{activeReminder?.tripRef || 'TRP-0159'}</strong> has been completed.
                      </p>
                    </div>

                    <p className="text-xs font-extrabold text-[#111111]">
                      Was there any labor charge for this trip?
                    </p>

                    <div className="space-y-1.5 pt-1">
                      <div className="grid grid-cols-2 gap-1.5">
                        <Button
                          type="button"
                          onClick={handleYes}
                          className="h-8 text-xs font-bold bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl shadow-2xs"
                        >
                          Yes
                        </Button>

                        <Button
                          type="button"
                          variant="outline"
                          onClick={handleNo}
                          className="h-8 text-xs font-bold border-slate-200 text-slate-700 hover:bg-slate-50 rounded-xl"
                        >
                          No
                        </Button>
                      </div>

                      <Button
                        type="button"
                        onClick={handleRemindLater}
                        className="w-full h-8 text-xs font-bold bg-[#E8450F] hover:bg-[#d03d0c] text-white rounded-xl shadow-2xs"
                      >
                        Remind Me Later
                      </Button>
                    </div>
                  </div>
                )}

                {/* VIEW 2: YES Input State */}
                {panelView === 'yes_input' && (
                  <div className="space-y-2.5">
                    <div>
                      <h5 className="text-xs font-bold text-[#111111]">Great! 👍</h5>
                      <p className="text-[11px] text-slate-600 leading-snug mt-1">
                        Please enter the labor charge amount:
                      </p>
                    </div>

                    <div className="relative">
                      <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-500">
                        SAR
                      </span>
                      <Input
                        type="number"
                        value={chargeAmount}
                        onChange={(e) => setChargeAmount(e.target.value)}
                        placeholder="150"
                        className="h-9 pl-11 rounded-xl text-xs font-bold border-slate-200 focus-visible:ring-[#E8450F]"
                      />
                    </div>

                    <Button
                      type="button"
                      disabled={isSubmitting || !chargeAmount}
                      onClick={handleAddCharge}
                      className="w-full h-8 text-xs font-bold bg-[#E8450F] hover:bg-[#d03d0c] text-white rounded-xl shadow-2xs"
                    >
                      {isSubmitting ? 'Adding Charge...' : 'Add Charge'}
                    </Button>
                  </div>
                )}

                {/* VIEW 3: Success State */}
                {panelView === 'success' && (
                  <div className="py-2 space-y-1 text-left">
                    <div className="flex items-center gap-1.5 text-emerald-600 font-bold text-xs">
                      <CheckCircle2 className="w-4 h-4 shrink-0" />
                      <span>Labor charge added</span>
                    </div>
                    <p className="text-sm font-extrabold text-[#111111]">{successMessage}</p>
                  </div>
                )}

                {/* VIEW 4: NO Confirmed State */}
                {panelView === 'no_confirmed' && (
                  <div className="py-2 space-y-1 text-left">
                    <h5 className="text-xs font-bold text-slate-800">Okay 👍</h5>
                    <p className="text-[11px] text-slate-600 font-medium leading-snug">
                      No labor charge will be added for trip {activeReminder?.tripRef}.
                    </p>
                  </div>
                )}

                {/* VIEW 5: Remind Me Later State (Pointing Up Pose) */}
                {panelView === 'remind_later' && (
                  <div className="space-y-2">
                    <h5 className="text-xs font-bold text-[#111111]">When should I remind you?</h5>

                    <div className="grid grid-cols-2 gap-1.5 pt-1">
                      <Button
                        type="button"
                        variant={selectedTimer === 1 ? 'default' : 'outline'}
                        onClick={() => {
                          setSelectedTimer(1);
                          handleConfirmTimer(1);
                        }}
                        className={`h-8 text-xs font-bold rounded-xl ${
                          selectedTimer === 1
                            ? 'bg-[#E8450F] text-white hover:bg-[#d03d0c]'
                            : 'border-slate-200 text-slate-700 hover:bg-slate-50'
                        }`}
                      >
                        1 min
                      </Button>

                      <Button
                        type="button"
                        variant={selectedTimer === 5 ? 'default' : 'outline'}
                        onClick={() => {
                          setSelectedTimer(5);
                          handleConfirmTimer(5);
                        }}
                        className={`h-8 text-xs font-bold rounded-xl ${
                          selectedTimer === 5
                            ? 'bg-[#E8450F] text-white hover:bg-[#d03d0c]'
                            : 'border-slate-200 text-slate-700 hover:bg-slate-50'
                        }`}
                      >
                        5 min
                      </Button>

                      <Button
                        type="button"
                        variant={selectedTimer === 15 ? 'default' : 'outline'}
                        onClick={() => {
                          setSelectedTimer(15);
                          handleConfirmTimer(15);
                        }}
                        className={`h-8 text-xs font-bold rounded-xl ${
                          selectedTimer === 15
                            ? 'bg-[#E8450F] text-white hover:bg-[#d03d0c]'
                            : 'border-slate-200 text-slate-700 hover:bg-slate-50'
                        }`}
                      >
                        15 min
                      </Button>

                      <Button
                        type="button"
                        variant={selectedTimer === 60 ? 'default' : 'outline'}
                        onClick={() => {
                          setSelectedTimer(60);
                          handleConfirmTimer(60);
                        }}
                        className={`h-8 text-xs font-bold rounded-xl ${
                          selectedTimer === 60
                            ? 'bg-[#E8450F] text-white hover:bg-[#d03d0c]'
                            : 'border-slate-200 text-slate-700 hover:bg-slate-50'
                        }`}
                      >
                        Later
                      </Button>
                    </div>

                    <p className="text-[10px] text-slate-500 font-medium pt-1 flex items-center gap-1">
                      <Clock className="w-3 h-3 text-[#E8450F] shrink-0" />
                      <span>I'll remind you about the labor charge for {activeReminder?.tripRef}</span>
                    </p>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
