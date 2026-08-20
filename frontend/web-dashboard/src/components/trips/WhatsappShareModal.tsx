import { useState, useEffect, useMemo } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { WhatsAppIcon } from '@/components/ui/whatsapp-icon';
import { toast } from 'sonner';
import {
  Copy,
  Check,
  Send,
  Truck,
  Building2,
  AlertTriangle,
  Clock,
  Sparkles,
  Phone,
  User,
  Filter,
  Layers,
  FileText,
  RotateCcw,
} from 'lucide-react';
import { Trip, getTripPayloadCapacity } from '@/services/tripService';

export interface WhatsappShareModalProps {
  isOpen: boolean;
  onClose: () => void;
  mode?: 'fleet_summary' | 'single_trip' | 'company_summary';
  trips?: Trip[];
  selectedTrip?: Trip | null;
  selectedCompany?: string;
}

const getPickupName = (trip: Trip) => {
  const pickup = trip.stops?.find((s) => s.stop_type === 'Pickup') || trip.stops?.[0];
  if (!pickup) return '—';
  const name = pickup.location_name || pickup.location?.name || pickup.location_address || pickup.location?.address || '—';
  return name.replace(/🔁\s*/g, '').trim();
};

const getDropoffName = (trip: Trip) => {
  const dropoff =
    trip.stops?.find((s) => s.stop_type === 'Dropoff') ||
    (trip.stops && trip.stops.length > 1 ? trip.stops[trip.stops.length - 1] : undefined);
  if (!dropoff) return '—';
  const name = dropoff.location_name || dropoff.location?.name || dropoff.location_address || dropoff.location?.address || '—';
  return name.replace(/🔁\s*/g, '').trim();
};

const formatTimeShort = (isoStr?: string | null) => {
  if (!isoStr) return '—';
  try {
    const d = new Date(isoStr);
    return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: true });
  } catch {
    return '—';
  }
};

const formatTripStatusLabel = (status: string) => {
  switch (status) {
    case 'Draft':
      return '📅 Scheduled';
    case 'Dispatched':
      return '🚚 Dispatched (En Route to Pickup)';
    case 'AtPickup':
      return '📦 Loading (At Pickup)';
    case 'InTransit':
      return '🛣️ In Transit';
    case 'AtDelivery':
      return '🏁 At Delivery';
    case 'Delayed':
      return '⚠️ Delayed Alert';
    case 'Completed':
      return '✅ Completed';
    default:
      return status;
  }
};

export default function WhatsappShareModal({
  isOpen,
  onClose,
  mode = 'fleet_summary',
  trips = [],
  selectedTrip = null,
  selectedCompany = 'all',
}: WhatsappShareModalProps) {
  const [recipientType, setRecipientType] = useState<'customer' | 'driver' | 'custom'>('custom');
  const [customPhone, setCustomPhone] = useState('');
  const [editedMessageText, setEditedMessageText] = useState('');
  const [copied, setCopied] = useState(false);
  const [isEditing, setIsEditing] = useState(false);

  // Formatting toggles
  const [includeDriver, setIncludeDriver] = useState(true);
  const [includeVehicle, setIncludeVehicle] = useState(true);
  const [includeEta, setIncludeEta] = useState(true);
  const [includeDelays, setIncludeDelays] = useState(true);

  // Filter trips if company filter applied
  const relevantTrips = useMemo(() => {
    if (selectedTrip) return [selectedTrip];
    if (selectedCompany && selectedCompany !== 'all') {
      return trips.filter(
        (t) => (t.customer?.name || (t as any).customerName) === selectedCompany
      );
    }
    return trips;
  }, [trips, selectedTrip, selectedCompany]);

  // Status breakdown calculations
  const breakdown = useMemo(() => {
    const nowMs = Date.now();
    let dispatched = 0;
    let loading = 0;
    let inTransit = 0;
    let atDelivery = 0;
    let delayed = 0;

    relevantTrips.forEach((t) => {
      const isOverdue =
        ['Dispatched', 'AtPickup', 'InTransit', 'AtDelivery'].includes(t.status) &&
        t.planned_end != null &&
        new Date(t.planned_end).getTime() < nowMs;

      if (isOverdue || t.status === 'Delayed') {
        delayed++;
      }

      if (t.status === 'Dispatched') dispatched++;
      else if (t.status === 'AtPickup') loading++;
      else if (t.status === 'InTransit') inTransit++;
      else if (t.status === 'AtDelivery') atDelivery++;
    });

    return {
      total: relevantTrips.length,
      dispatched,
      loading,
      inTransit,
      atDelivery,
      delayed,
    };
  }, [relevantTrips]);

  // Generate initial default formatted message
  const generatedDefaultText = useMemo(() => {
    const today = new Date().toLocaleDateString('en-US', {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });

    if (mode === 'single_trip' && selectedTrip) {
      const pickup = getPickupName(selectedTrip);
      const dropoff = getDropoffName(selectedTrip);
      const driverName = selectedTrip.is_third_party
        ? selectedTrip.third_party_driver_name || selectedTrip.carrier_name || '3PL Driver'
        : selectedTrip.driver
        ? `${selectedTrip.driver.first_name} ${selectedTrip.driver.last_name || ''}`.trim()
        : 'Unassigned';
      const vehiclePlate = selectedTrip.is_third_party
        ? selectedTrip.third_party_vehicle_plate || '3PL Vehicle'
        : selectedTrip.vehicle?.plate_number || 'Unassigned';
      const customerName = selectedTrip.customer?.name || (selectedTrip as any).customerName || 'Logistics Partner';

      let text = `🚛 *MERCON LOGISTICS - DISPATCH STATUS UPDATE*\n`;
      text += `📅 *Date:* ${today}\n`;
      text += `🆔 *Trip ID:* \`${selectedTrip.ref_id || selectedTrip.id}\`\n`;
      text += `🏢 *Customer:* ${customerName}\n\n`;
      text += `📍 *Route:* ${pickup} ➔ ${dropoff}\n`;
      text += `📊 *Status:* ${formatTripStatusLabel(selectedTrip.status)}\n`;

      if (includeDriver) {
        text += `👤 *Driver:* ${driverName}\n`;
      }
      if (includeVehicle) {
        text += `🚚 *Vehicle Plate:* ${vehiclePlate}\n`;
      }
      if (includeEta && selectedTrip.planned_end) {
        text += `⏱️ *ETA:* ${formatTimeShort(selectedTrip.planned_end)}\n`;
      }

      if (selectedTrip.notes) {
        text += `\n📝 *Notes:* ${selectedTrip.notes}\n`;
      }

      text += `\n_Generated via MERCON Control Tower System_`;
      return text;
    }

    // Fleet Summary Mode or Company Summary Mode
    const companyHeader =
      selectedCompany && selectedCompany !== 'all'
        ? `🏢 *Company:* ${selectedCompany}\n`
        : `🏢 *Scope:* All Operations\n`;

    let text = `📊 *MERCON ACTIVE TRANSIT FLEET REPORT*\n`;
    text += `📅 *Date:* ${today}\n`;
    text += companyHeader;
    text += `📦 *Total Active Dispatches:* ${breakdown.total} trips\n\n`;

    text += `📈 *STATUS BREAKDOWN*\n`;
    text += `▪ 🚛 Dispatched: ${breakdown.dispatched}\n`;
    text += `▪ 📦 At Pickup / Loading: ${breakdown.loading}\n`;
    text += `▪ 🛣️ In Transit: ${breakdown.inTransit}\n`;
    text += `▪ 🏁 At Delivery: ${breakdown.atDelivery}\n`;
    if (includeDelays && breakdown.delayed > 0) {
      text += `▪ ⚠️ Delayed Alerts: ${breakdown.delayed}\n`;
    }
    text += `\n-----------------------------\n`;

    if (relevantTrips.length > 0) {
      text += `📋 *ACTIVE DISPATCH DETAILS*\n\n`;
      relevantTrips.slice(0, 10).forEach((t, index) => {
        const pickup = getPickupName(t);
        const dropoff = getDropoffName(t);
        const driverName = t.is_third_party
          ? t.third_party_driver_name || '3PL Driver'
          : t.driver
          ? `${t.driver.first_name} ${t.driver.last_name || ''}`.trim()
          : 'Unassigned';
        const vehiclePlate = t.vehicle?.plate_number || t.third_party_vehicle_plate || '—';

        text += `${index + 1}. *Trip ID ${t.ref_id || t.id}*\n`;
        text += `   📍 Route: ${pickup} ➔ ${dropoff}\n`;
        text += `   ⚡ Status: ${formatTripStatusLabel(t.status)}\n`;
        if (includeDriver) text += `   👤 Driver: ${driverName}\n`;
        if (includeVehicle) text += `   🚚 Vehicle: ${vehiclePlate}\n`;
        if (includeEta && t.planned_end) text += `   ⏱️ ETA: ${formatTimeShort(t.planned_end)}\n`;
        text += `\n`;
      });

      if (relevantTrips.length > 10) {
        text += `_... and ${relevantTrips.length - 10} more active dispatches in transit._\n\n`;
      }
    }

    text += `\n_MERCON Fleet Dispatch Center_`;
    return text;
  }, [
    mode,
    selectedTrip,
    relevantTrips,
    selectedCompany,
    breakdown,
    includeDriver,
    includeVehicle,
    includeEta,
    includeDelays,
  ]);

  // Sync edited message text when generated text changes (unless actively edited by user)
  useEffect(() => {
    if (!isEditing) {
      setEditedMessageText(generatedDefaultText);
    }
  }, [generatedDefaultText, isEditing]);

  // Auto set recipient phone when selectedTrip changes
  useEffect(() => {
    if (selectedTrip) {
      if (selectedTrip.driver?.phone_number) {
        setCustomPhone(selectedTrip.driver.phone_number);
        setRecipientType('driver');
      } else if (selectedTrip.customer?.contact_phone) {
        setCustomPhone(selectedTrip.customer.contact_phone);
        setRecipientType('customer');
      } else {
        setRecipientType('custom');
      }
    }
  }, [selectedTrip]);

  // Handle Copy
  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(editedMessageText);
      setCopied(true);
      toast.success('WhatsApp message text copied to clipboard!');
      setTimeout(() => setCopied(false), 2200);
    } catch {
      toast.error('Failed to copy message');
    }
  };

  // Handle WhatsApp Link launch
  const handleSendWhatsapp = (targetEnv: 'app' | 'web') => {
    const cleanPhone = customPhone.trim().replace(/\+/g, '').replace(/\D/g, '');
    const encodedText = encodeURIComponent(editedMessageText);

    let url = '';
    if (targetEnv === 'web') {
      url = cleanPhone
        ? `https://web.whatsapp.com/send?phone=${cleanPhone}&text=${encodedText}`
        : `https://web.whatsapp.com/send?text=${encodedText}`;
    } else {
      url = cleanPhone
        ? `https://api.whatsapp.com/send?phone=${cleanPhone}&text=${encodedText}`
        : `https://api.whatsapp.com/send?text=${encodedText}`;
    }

    window.open(url, '_blank', 'noopener,noreferrer');
    toast.success('Opening WhatsApp dispatcher window');
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-2xl max-h-[92vh] flex flex-col p-0 gap-0 overflow-hidden bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-2xl">
        
        {/* Header Bar */}
        <DialogHeader className="p-5 pb-4 border-b border-slate-100 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-900/80">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 flex items-center justify-center shrink-0">
                <WhatsAppIcon className="w-5 h-5 fill-emerald-600 dark:fill-emerald-400" />
              </div>
              <div>
                <DialogTitle className="text-lg font-black text-slate-900 dark:text-slate-100 flex items-center gap-2">
                  WhatsApp Status Dispatcher
                  <Badge className="bg-emerald-100 text-emerald-800 dark:bg-emerald-950/80 dark:text-emerald-300 font-bold text-[10px] px-2 py-0.5 border border-emerald-300 dark:border-emerald-800">
                    Live Preview
                  </Badge>
                </DialogTitle>
                <DialogDescription className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                  {mode === 'single_trip'
                    ? `Sharing Status for Trip #${selectedTrip?.ref_id || selectedTrip?.id}`
                    : selectedCompany !== 'all'
                    ? `Sharing Active Transit Summary for ${selectedCompany}`
                    : 'Sharing Executive Summary for All Active Transit Fleet'}
                </DialogDescription>
              </div>
            </div>
          </div>
        </DialogHeader>

        {/* Content Body */}
        <div className="flex-1 overflow-y-auto p-5 space-y-5">
          
          {/* Controls Bar: Recipient Phone & Toggles */}
          <div className="bg-slate-50 dark:bg-slate-800/60 p-3.5 rounded-xl border border-slate-200/80 dark:border-slate-700/80 space-y-3">
            
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <Phone className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
                <span className="text-xs font-extrabold text-slate-900 dark:text-slate-100">
                  Recipient WhatsApp Contact
                </span>
              </div>

              {selectedTrip && (
                <div className="flex items-center gap-1.5 bg-slate-200/60 dark:bg-slate-700/60 p-0.5 rounded-lg text-xs font-semibold">
                  <button
                    type="button"
                    onClick={() => {
                      setRecipientType('driver');
                      if (selectedTrip.driver?.phone_number) {
                        setCustomPhone(selectedTrip.driver.phone_number);
                      }
                    }}
                    className={`px-2 py-1 rounded-md text-[11px] font-bold transition-all ${
                      recipientType === 'driver'
                        ? 'bg-white dark:bg-slate-900 text-emerald-600 dark:text-emerald-400 shadow-xs'
                        : 'text-slate-600 dark:text-slate-300 hover:text-slate-900'
                    }`}
                  >
                    Driver
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setRecipientType('customer');
                      if (selectedTrip.customer?.contact_phone) {
                        setCustomPhone(selectedTrip.customer.contact_phone);
                      }
                    }}
                    className={`px-2 py-1 rounded-md text-[11px] font-bold transition-all ${
                      recipientType === 'customer'
                        ? 'bg-white dark:bg-slate-900 text-emerald-600 dark:text-emerald-400 shadow-xs'
                        : 'text-slate-600 dark:text-slate-300 hover:text-slate-900'
                    }`}
                  >
                    Customer
                  </button>
                  <button
                    type="button"
                    onClick={() => setRecipientType('custom')}
                    className={`px-2 py-1 rounded-md text-[11px] font-bold transition-all ${
                      recipientType === 'custom'
                        ? 'bg-white dark:bg-slate-900 text-emerald-600 dark:text-emerald-400 shadow-xs'
                        : 'text-slate-600 dark:text-slate-300 hover:text-slate-900'
                    }`}
                  >
                    Custom Number
                  </button>
                </div>
              )}
            </div>

            <div className="flex items-center gap-2">
              <Input
                type="text"
                placeholder="+966 5X XXX XXXX (or leave empty to pick contact in WhatsApp)"
                value={customPhone}
                onChange={(e) => setCustomPhone(e.target.value)}
                className="h-9 text-xs font-mono font-medium border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900"
              />
            </div>

            {/* Formatting switches */}
            <div className="pt-2 border-t border-slate-200/70 dark:border-slate-700/70 flex flex-wrap items-center gap-3 text-xs font-semibold text-slate-700 dark:text-slate-300">
              <span className="text-[11px] uppercase font-mono text-slate-400 font-extrabold tracking-wider mr-1">
                Options:
              </span>
              <label className="flex items-center gap-1.5 cursor-pointer hover:text-slate-900 dark:hover:text-slate-100">
                <input
                  type="checkbox"
                  checked={includeDriver}
                  onChange={(e) => setIncludeDriver(e.target.checked)}
                  className="rounded text-emerald-600 focus:ring-emerald-500 cursor-pointer"
                />
                <span>Include Driver</span>
              </label>
              <label className="flex items-center gap-1.5 cursor-pointer hover:text-slate-900 dark:hover:text-slate-100">
                <input
                  type="checkbox"
                  checked={includeVehicle}
                  onChange={(e) => setIncludeVehicle(e.target.checked)}
                  className="rounded text-emerald-600 focus:ring-emerald-500 cursor-pointer"
                />
                <span>Include Vehicle Plate</span>
              </label>
              <label className="flex items-center gap-1.5 cursor-pointer hover:text-slate-900 dark:hover:text-slate-100">
                <input
                  type="checkbox"
                  checked={includeEta}
                  onChange={(e) => setIncludeEta(e.target.checked)}
                  className="rounded text-emerald-600 focus:ring-emerald-500 cursor-pointer"
                />
                <span>Include ETA</span>
              </label>
              <label className="flex items-center gap-1.5 cursor-pointer hover:text-slate-900 dark:hover:text-slate-100">
                <input
                  type="checkbox"
                  checked={includeDelays}
                  onChange={(e) => setIncludeDelays(e.target.checked)}
                  className="rounded text-emerald-600 focus:ring-emerald-500 cursor-pointer"
                />
                <span>Include Delays</span>
              </label>
            </div>

          </div>

          {/* Interactive WhatsApp Chat Bubble Container */}
          <div className="space-y-2">
            <div className="flex items-center justify-between px-1">
              <span className="text-xs font-extrabold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-emerald-500" />
                Formatted Message Preview
              </span>
              <button
                type="button"
                onClick={() => {
                  setIsEditing(false);
                  setEditedMessageText(generatedDefaultText);
                  toast.info('Reset to default generated template');
                }}
                className="text-[11px] font-bold text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 flex items-center gap-1 cursor-pointer transition-colors"
                title="Reset edits to original formatted template"
              >
                <RotateCcw className="w-3 h-3" />
                Reset Template
              </button>
            </div>

            {/* Chat Bubble Sandbox */}
            <div className="relative rounded-2xl bg-[#efeae2] dark:bg-[#0b141a] p-4 border border-slate-300 dark:border-slate-800 shadow-inner min-h-[220px] flex flex-col justify-between overflow-hidden">
              {/* Wallpaper Pattern Subtle Overlay */}
              <div className="absolute inset-0 bg-repeat opacity-[0.04] pointer-events-none bg-[radial-gradient(#000_1px,transparent_1px)] dark:bg-[radial-gradient(#fff_1px,transparent_1px)] [background-size:16px_16px]" />

              {/* Chat Message Box */}
              <div className="relative z-10 self-end max-w-[92%] sm:max-w-[85%] bg-[#d9fdd3] dark:bg-[#005c4b] text-slate-900 dark:text-slate-100 p-3.5 rounded-2xl rounded-tr-xs shadow-md border border-emerald-200/60 dark:border-emerald-800/40">
                <textarea
                  value={editedMessageText}
                  onChange={(e) => {
                    setIsEditing(true);
                    setEditedMessageText(e.target.value);
                  }}
                  rows={9}
                  className="w-full bg-transparent border-0 focus:ring-0 resize-none font-mono text-xs leading-relaxed text-slate-900 dark:text-slate-100 focus:outline-none scrollbar-thin"
                  placeholder="Type your WhatsApp message..."
                />
                
                {/* Chat Bubble Footer Timestamp */}
                <div className="flex items-center justify-end gap-1 mt-1 text-[10px] font-bold text-emerald-800/70 dark:text-emerald-200/80">
                  <span>{new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                  <Check className="w-3 h-3 text-emerald-600 dark:text-emerald-300" />
                </div>
              </div>

            </div>
          </div>

        </div>

        {/* Footer Actions */}
        <div className="p-4 border-t border-slate-100 dark:border-slate-800 bg-slate-50/80 dark:bg-slate-900/80 flex flex-wrap items-center justify-between gap-3">
          
          <Button
            type="button"
            variant="outline"
            onClick={handleCopy}
            className="h-10 px-4 text-xs font-extrabold border-slate-300 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 flex items-center gap-2 cursor-pointer"
          >
            {copied ? (
              <>
                <Check className="w-4 h-4 text-emerald-600" />
                Copied!
              </>
            ) : (
              <>
                <Copy className="w-4 h-4 text-slate-500" />
                Copy Text
              </>
            )}
          </Button>

          <div className="flex items-center gap-2 ml-auto">
            <Button
              type="button"
              variant="ghost"
              onClick={onClose}
              className="h-10 px-4 text-xs font-semibold text-slate-600 dark:text-slate-400 hover:bg-slate-200/50 dark:hover:bg-slate-800 cursor-pointer"
            >
              Cancel
            </Button>

            <Button
              type="button"
              onClick={() => handleSendWhatsapp('web')}
              className="h-10 px-5 text-xs font-black bg-emerald-600 hover:bg-emerald-700 text-white shadow-md shadow-emerald-600/20 flex items-center gap-2 rounded-xl cursor-pointer transition-all active:scale-[0.98]"
            >
              <WhatsAppIcon className="w-4 h-4 fill-white" />
              <span>Send via WhatsApp</span>
              <Send className="w-3.5 h-3.5 ml-0.5 opacity-90" />
            </Button>
          </div>

        </div>

      </DialogContent>
    </Dialog>
  );
}
