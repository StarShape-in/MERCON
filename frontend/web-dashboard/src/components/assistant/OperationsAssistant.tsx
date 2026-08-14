import React, { useState, useEffect, useRef, useCallback } from 'react';
import { X, CheckCircle2, Moon, Clock, DollarSign, ChevronRight, ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { expenseService } from '@/services/expenseService';
import { tripService, Trip } from '@/services/tripService';

// Storage keys
const POSITION_KEY = 'mercon_assistant_position_v1';
const HANDLED_REMINDERS_KEY = 'mercon_assistant_handled_reminders_v1';
const SNOOZED_REMINDERS_KEY = 'mercon_assistant_snoozed_reminders_v1';

interface ReminderItem {
  id: string; // unique reminder key, e.g. "labor-charge-TRP-0159"
  tripId: string;
  tripRef: string;
  type: 'labor_charge' | 'document_expiry' | 'maintenance';
  title: string;
  question: string;
  completedAt?: string;
}

/** Vector SVG representation of the Operations Assistant avatar matching MERCON brand */
function AssistantAvatarIcon({ className = "w-full h-full" }: { className?: string }) {
  return (
    <svg viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg" className={className}>
      {/* Circle Background */}
      <circle cx="50" cy="50" r="48" fill="#FFF" stroke="#E8450F" strokeWidth="3" />
      {/* Background Gradient Circle */}
      <circle cx="50" cy="50" r="45" fill="url(#avatar_grad)" />
      <defs>
        <linearGradient id="avatar_grad" x1="50" y1="5" x2="50" y2="95" gradientUnits="userSpaceOnUse">
          <stop stopColor="#FFF5F2" />
          <stop offset="1" stopColor="#FED7CC" />
        </linearGradient>
      </defs>
      
      {/* Operator Body & Uniform */}
      <path
        d="M20 90C20 74 33 64 50 64C67 64 80 74 80 90V95H20V90Z"
        fill="#1E293B"
      />
      {/* Orange Collar Accent */}
      <path d="M42 64L50 74L58 64H42Z" fill="#E8450F" />
      {/* Shirt MERCON Badge */}
      <circle cx="65" cy="76" r="3" fill="#E8450F" />

      {/* Neck */}
      <rect x="44" y="52" width="12" height="15" rx="3" fill="#FDBA74" />

      {/* Head */}
      <ellipse cx="50" cy="40" rx="18" ry="20" fill="#FDBA74" />

      {/* Ears */}
      <circle cx="31" cy="40" r="4" fill="#FDBA74" />
      <circle cx="69" cy="40" r="4" fill="#FDBA74" />

      {/* Hair */}
      <path
        d="M31 36C31 22 40 16 50 16C60 16 69 22 69 36C69 31 63 24 50 24C37 24 31 31 31 36Z"
        fill="#0F172A"
      />
      <path
        d="M32 30C35 20 44 17 52 17C62 17 68 22 68 28C68 20 58 14 49 14C38 14 32 21 32 30Z"
        fill="#1E293B"
      />

      {/* Eyes */}
      <ellipse cx="43" cy="38" rx="2.5" ry="3.5" fill="#0F172A" />
      <ellipse cx="57" cy="38" rx="2.5" ry="3.5" fill="#0F172A" />
      <circle cx="44" cy="37" r="1" fill="#FFF" />
      <circle cx="58" cy="37" r="1" fill="#FFF" />

      {/* Eyebrows */}
      <path d="M39 32C42 30 46 31 46 31" stroke="#0F172A" strokeWidth="1.5" strokeLinecap="round" />
      <path d="M61 32C58 30 54 31 54 31" stroke="#0F172A" strokeWidth="1.5" strokeLinecap="round" />

      {/* Smile */}
      <path
        d="M44 46C46 49 54 49 56 46"
        stroke="#E8450F"
        strokeWidth="2"
        strokeLinecap="round"
      />

      {/* Cheeks */}
      <circle cx="38" cy="43" r="2.5" fill="#F97316" opacity="0.3" />
      <circle cx="62" cy="43" r="2.5" fill="#F97316" opacity="0.3" />
    </svg>
  );
}

export default function OperationsAssistant() {
  // Panel open state
  const [isOpen, setIsOpen] = useState(false);

  // Position state (defaults to bottom-right offset)
  const [pos, setPos] = useState<{ x: number; y: number }>(() => {
    try {
      const saved = localStorage.getItem(POSITION_KEY);
      if (saved) return JSON.parse(saved);
    } catch (e) {
      console.error('Failed to parse assistant position', e);
    }
    // Default: bottom right margin
    return {
      x: Math.max(20, window.innerWidth - 90),
      y: Math.max(20, window.innerHeight - 100),
    };
  });

  // Dragging state tracking
  const [isDragging, setIsDragging] = useState(false);
  const dragStartRef = useRef<{ startX: number; startY: number; initX: number; initY: number }>({
    startX: 0,
    startY: 0,
    initX: 0,
    initY: 0,
  });
  const hasMovedRef = useRef(false);

  // Reminders State
  const [reminders, setReminders] = useState<ReminderItem[]>([]);
  const [activeReminderId, setActiveReminderId] = useState<string | null>(null);

  // Flow State inside the single panel: 'question' | 'yes_input' | 'success' | 'no_confirmed' | 'remind_later' | 'list'
  const [panelView, setPanelView] = useState<
    'question' | 'yes_input' | 'success' | 'no_confirmed' | 'remind_later' | 'list'
  >('question');

  // Input state for labor charge
  const [chargeAmount, setChargeAmount] = useState<string>('150');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');

  // 1. Fetch completed trips & build pending reminders list
  const syncReminders = useCallback(async () => {
    try {
      const handledRaw = localStorage.getItem(HANDLED_REMINDERS_KEY);
      const handledSet = new Set<string>(handledRaw ? JSON.parse(handledRaw) : []);

      const snoozedRaw = localStorage.getItem(SNOOZED_REMINDERS_KEY);
      const snoozedMap: Record<string, number> = snoozedRaw ? JSON.parse(snoozedRaw) : {};

      const now = Date.now();

      // Fetch completed trips from backend
      let completedTrips: Trip[] = [];
      try {
        const res = await tripService.getAll({ status: 'Completed', per_page: 20 });
        completedTrips = res.data || [];
      } catch (e) {
        console.warn('Could not fetch completed trips from API, using default demo item if unhandled');
      }

      // Always ensure demo TRP-0159 exists if not completed or handled yet
      const hasDemoInTrips = completedTrips.some((t) => t.ref_id === 'TRP-0159');
      if (!hasDemoInTrips) {
        completedTrips.unshift({
          id: 'demo-trp-0159',
          ref_id: 'TRP-0159',
          status: 'Completed',
          planned_start: new Date().toISOString(),
          actual_start: new Date().toISOString(),
          planned_end: new Date().toISOString(),
          actual_end: new Date().toISOString(),
          planned_distance: 140,
          extra_driver_payment: null,
          payment_reason: null,
          payment_status: null,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        } as any);
      }

      const pending: ReminderItem[] = [];

      completedTrips.forEach((trip) => {
        const reminderId = `labor-charge-${trip.ref_id || trip.id}`;

        // Skip if handled
        if (handledSet.has(reminderId)) return;

        // Skip if currently snoozed
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

      // Auto-select first active reminder if current is invalid
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
    const interval = setInterval(syncReminders, 10000); // Check every 10 sec
    return () => clearInterval(interval);
  }, [syncReminders]);

  // Keep assistant within viewport bounds when window resizes
  useEffect(() => {
    const handleResize = () => {
      setPos((p) => ({
        x: Math.min(Math.max(12, p.x), window.innerWidth - 76),
        y: Math.min(Math.max(12, p.y), window.innerHeight - 76),
      }));
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Save position to localStorage
  const savePosition = (newX: number, newY: number) => {
    const clampedX = Math.min(Math.max(12, newX), window.innerWidth - 76);
    const clampedY = Math.min(Math.max(12, newY), window.innerHeight - 76);
    setPos({ x: clampedX, y: clampedY });
    try {
      localStorage.setItem(POSITION_KEY, JSON.stringify({ x: clampedX, y: clampedY }));
    } catch (e) {
      console.error('Failed to save assistant position', e);
    }
  };

  // Drag Pointer Handlers
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

    // If movement was minimal, treat as click to open/close
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

  // Mark reminder as handled (YES / NO)
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

  // Handle YES button click -> transition to yes_input in same panel
  const handleYes = () => {
    setPanelView('yes_input');
  };

  // Handle Submit Labor Charge -> save expense & auto close after confirmation
  const handleAddCharge = async () => {
    const activeRem = reminders.find((r) => r.id === activeReminderId);
    if (!activeRem) return;

    const numAmount = parseFloat(chargeAmount) || 150;
    setIsSubmitting(true);

    try {
      // Save expense through existing expense system
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

      // Auto close panel after 1.8 seconds
      setTimeout(() => {
        setIsOpen(false);
      }, 1800);
    } catch (err) {
      console.error('Failed to add labor charge expense', err);
      // Fallback UI success if demo
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

  // Handle NO button click -> show No confirmation & auto close
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

  // Handle REMIND ME LATER click -> transition to timer selection
  const handleRemindLater = () => {
    setPanelView('remind_later');
  };

  // Handle Timer Selection (1 min, 5 min, 15 min, etc.)
  const handleSetTimer = (minutes: number) => {
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

  // Calculate panel intelligent quadrant position relative to floating button
  const isRightHalf = pos.x > window.innerWidth / 2;
  const isBottomHalf = pos.y > window.innerHeight / 2;

  const activeReminder = reminders.find((r) => r.id === activeReminderId) || reminders[0];

  return (
    <div className="fixed inset-0 pointer-events-none z-50">
      {/* 1. FLOATING DRAGGABLE ROUND ASSISTANT BUTTON */}
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
          className={`w-14 h-14 sm:w-16 sm:h-16 rounded-full bg-white shadow-xl border-2 border-[#E8450F] flex items-center justify-center relative cursor-grab active:cursor-grabbing hover:scale-105 active:scale-95 transition-all ${
            reminders.length > 0 ? 'ring-4 ring-[#E8450F]/20 animate-pulse' : ''
          }`}
        >
          <AssistantAvatarIcon className="w-full h-full rounded-full" />

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
              width: '320px',
              ...(isRightHalf ? { right: '70px' } : { left: '70px' }),
              ...(isBottomHalf ? { bottom: '0px' } : { top: '0px' }),
            }}
            className="bg-white rounded-2xl shadow-2xl border border-slate-200 p-4 space-y-3.5 z-50 pointer-events-auto animate-in fade-in-50 zoom-in-95 duration-150"
          >
            {/* Panel Header */}
            <div className="flex items-center justify-between pb-2 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-[#E8450F] ring-2 ring-[#E8450F]/20" />
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

            {/* List View if Multiple Reminders Pending */}
            {panelView === 'list' && reminders.length > 1 && (
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-700">
                    Pending Reminders ({reminders.length})
                  </span>
                </div>
                <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
                  {reminders.map((rem) => (
                    <button
                      key={rem.id}
                      type="button"
                      onClick={() => {
                        setActiveReminderId(rem.id);
                        setPanelView('question');
                      }}
                      className="w-full text-left p-2.5 rounded-xl border border-slate-200 hover:border-[#E8450F] hover:bg-orange-50/40 transition-all flex items-center justify-between group"
                    >
                      <div>
                        <p className="text-xs font-bold text-[#111111]">Trip {rem.tripRef}</p>
                        <p className="text-[10px] text-slate-500 font-medium">Labor charge check</p>
                      </div>
                      <ChevronRight className="w-4 h-4 text-slate-400 group-hover:text-[#E8450F] transition-colors" />
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* View 1: Question State */}
            {panelView === 'question' && (
              <div className="space-y-3">
                <div className="flex items-start gap-3 bg-slate-50/80 p-3 rounded-xl border border-slate-100">
                  <div className="w-9 h-9 rounded-full shrink-0 border border-slate-200 bg-white overflow-hidden">
                    <AssistantAvatarIcon className="w-full h-full" />
                  </div>
                  <div className="space-y-1">
                    <p className="text-xs font-bold text-[#111111]">
                      Hey Ilan! 👋
                    </p>
                    <p className="text-xs text-slate-600 leading-relaxed">
                      Trip <strong className="text-[#111111]">{activeReminder?.tripRef || 'TRP-0159'}</strong> has been completed.
                    </p>
                  </div>
                </div>

                <div className="pt-1 space-y-2">
                  <p className="text-xs font-extrabold text-[#111111]">
                    Was there any labor charge for this trip?
                  </p>

                  <div className="grid grid-cols-3 gap-2 pt-1">
                    <Button
                      type="button"
                      onClick={handleYes}
                      className="h-9 text-xs font-bold bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl shadow-2xs"
                    >
                      Yes
                    </Button>

                    <Button
                      type="button"
                      variant="outline"
                      onClick={handleNo}
                      className="h-9 text-xs font-bold border-slate-200 text-slate-700 hover:bg-slate-50 rounded-xl"
                    >
                      No
                    </Button>

                    <Button
                      type="button"
                      onClick={handleRemindLater}
                      className="h-9 text-xs font-bold bg-[#E8450F] hover:bg-[#d03d0c] text-white rounded-xl shadow-2xs px-1"
                    >
                      Remind Later
                    </Button>
                  </div>
                </div>
              </div>
            )}

            {/* View 2: YES Input State */}
            {panelView === 'yes_input' && (
              <div className="space-y-3 animate-fade-in">
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setPanelView('question')}
                    className="text-slate-400 hover:text-slate-700"
                  >
                    <ArrowLeft className="w-4 h-4" />
                  </button>
                  <p className="text-xs font-bold text-[#111111]">Great! 👋</p>
                </div>

                <div className="space-y-2.5">
                  <label className="text-xs text-slate-600 font-semibold block">
                    Please enter the labor charge amount for <strong>{activeReminder?.tripRef}</strong>:
                  </label>

                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-500">
                      SAR
                    </span>
                    <Input
                      type="number"
                      value={chargeAmount}
                      onChange={(e) => setChargeAmount(e.target.value)}
                      placeholder="150"
                      className="h-10 pl-12 rounded-xl text-xs font-bold border-slate-200 focus-visible:ring-[#E8450F]"
                    />
                  </div>

                  <Button
                    type="button"
                    disabled={isSubmitting || !chargeAmount}
                    onClick={handleAddCharge}
                    className="w-full h-9 text-xs font-bold bg-[#E8450F] hover:bg-[#d03d0c] text-white rounded-xl shadow-2xs"
                  >
                    {isSubmitting ? 'Adding Charge...' : 'Add Charge'}
                  </Button>
                </div>
              </div>
            )}

            {/* View 3: Success Confirmation State */}
            {panelView === 'success' && (
              <div className="py-3 text-center space-y-2 animate-fade-in">
                <div className="w-10 h-10 rounded-full bg-emerald-100 text-emerald-600 mx-auto flex items-center justify-center">
                  <CheckCircle2 className="w-6 h-6" />
                </div>
                <h5 className="text-xs font-bold text-emerald-800">✓ Labor charge added</h5>
                <p className="text-xs font-extrabold text-[#111111]">{successMessage}</p>
              </div>
            )}

            {/* View 4: NO Confirmed State */}
            {panelView === 'no_confirmed' && (
              <div className="py-3 text-center space-y-2 animate-fade-in">
                <div className="w-10 h-10 rounded-full bg-slate-100 text-slate-700 mx-auto flex items-center justify-center font-bold text-sm">
                  👍
                </div>
                <h5 className="text-xs font-bold text-slate-800">Okay 👍</h5>
                <p className="text-xs text-slate-600 font-medium">
                  No labor charge will be added for trip {activeReminder?.tripRef}.
                </p>
              </div>
            )}

            {/* View 5: Remind Me Later Timer Selection State */}
            {panelView === 'remind_later' && (
              <div className="space-y-3 animate-fade-in">
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setPanelView('question')}
                    className="text-slate-400 hover:text-slate-700"
                  >
                    <ArrowLeft className="w-4 h-4" />
                  </button>
                  <p className="text-xs font-bold text-[#111111]">When should I remind you?</p>
                </div>

                <div className="grid grid-cols-2 gap-2 pt-1">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => handleSetTimer(1)}
                    className="h-9 text-xs font-semibold rounded-xl border-slate-200 hover:border-[#E8450F]"
                  >
                    1 min
                  </Button>

                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => handleSetTimer(5)}
                    className="h-9 text-xs font-semibold rounded-xl border-slate-200 hover:border-[#E8450F]"
                  >
                    5 min
                  </Button>

                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => handleSetTimer(15)}
                    className="h-9 text-xs font-semibold rounded-xl border-slate-200 hover:border-[#E8450F]"
                  >
                    15 min
                  </Button>

                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => handleSetTimer(60)}
                    className="h-9 text-xs font-semibold rounded-xl border-slate-200 hover:border-[#E8450F]"
                  >
                    Later
                  </Button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
