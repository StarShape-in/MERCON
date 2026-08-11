import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Bell, AlertTriangle, ArrowUpRight, CheckCircle2,
  Search, RefreshCw, Send, Calendar, Car, User, X, Check, Upload, Info
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';

export interface ReminderItem {
  id: string;
  docType: string;
  entityType: 'Vehicle' | 'Driver';
  entityId: string;
  entityName: string;
  entitySub: string;
  issueDate: string;
  expiryDate: string;
  daysRemaining: number;
  totalDurationDays: number;
  category: 'vehicle' | 'driver' | 'inspection';
  status: 'Expired' | 'Critical' | 'Warning' | 'Upcoming';
  notes: string;
  snoozed?: boolean;
}

const INITIAL_REMINDERS: ReminderItem[] = [
  {
    id: 'REM-101',
    docType: 'Vehicle Periodic Inspection (MVPI)',
    entityType: 'Vehicle',
    entityId: 'VSA-3871',
    entityName: 'VSA-3871 (Volvo FH16)',
    entitySub: 'Reefer Trailer #402 • Dammam Hub',
    issueDate: '2025-08-09',
    expiryDate: '2026-08-09',
    daysRemaining: -2,
    totalDurationDays: 365,
    category: 'inspection',
    status: 'Expired',
    notes: 'Overdue for mandatory annual safety check. Vehicle dispatch restricted.',
  },
  {
    id: 'REM-102',
    docType: 'Heavy Transport Driving License',
    entityType: 'Driver',
    entityId: 'DRV-4091',
    entityName: 'Mohammed Al-Ghamdi',
    entitySub: 'Senior Route Driver • ID: 1089241',
    issueDate: '2024-08-14',
    expiryDate: '2026-08-14',
    daysRemaining: 3,
    totalDurationDays: 730,
    category: 'driver',
    status: 'Critical',
    notes: 'Renewal request pending Absher Traffic Dept verification.',
  },
  {
    id: 'REM-103',
    docType: 'Comprehensive Fleet Insurance',
    entityType: 'Vehicle',
    entityId: 'VRA-3358',
    entityName: 'VRA-3358 (Mercedes Actros)',
    entitySub: 'Flatbed Trailer • Riyadh Logistics',
    issueDate: '2025-08-16',
    expiryDate: '2026-08-16',
    daysRemaining: 5,
    totalDurationDays: 365,
    category: 'vehicle',
    status: 'Warning',
    notes: 'Tawuniya policy quotation ready for admin approval & payment.',
  },
  {
    id: 'REM-104',
    docType: 'Driver Medical Fitness Certificate',
    entityType: 'Driver',
    entityId: 'DRV-2204',
    entityName: 'Tariq Mansoor',
    entitySub: 'Heavy Cargo Driver • ID: 1044912',
    issueDate: '2025-08-20',
    expiryDate: '2026-08-20',
    daysRemaining: 8,
    totalDurationDays: 365,
    category: 'driver',
    status: 'Warning',
    notes: 'Health center appointment confirmed for Aug 15.',
  },
  {
    id: 'REM-105',
    docType: 'TGA Transport Operating Card',
    entityType: 'Vehicle',
    entityId: 'DRA-6484',
    entityName: 'DRA-6484 (MAN TGX 26.480)',
    entitySub: 'Curtainsider • Cargo Division',
    issueDate: '2025-08-25',
    expiryDate: '2026-08-25',
    daysRemaining: 14,
    totalDurationDays: 365,
    category: 'vehicle',
    status: 'Upcoming',
    notes: 'Transport General Authority auto-renewal queued.',
  },
  {
    id: 'REM-106',
    docType: 'Hazmat Special Handling Permit',
    entityType: 'Driver',
    entityId: 'DRV-1188',
    entityName: 'Liaqat Ali',
    entitySub: 'Dangerous Goods Specialist',
    issueDate: '2025-09-02',
    expiryDate: '2026-09-02',
    daysRemaining: 22,
    totalDurationDays: 365,
    category: 'driver',
    status: 'Upcoming',
    notes: 'Refresher safety course completion required before renewal.',
  },
];

type CategoryFilter = 'all' | 'critical' | 'vehicle' | 'driver' | 'inspection';

export default function ImportantReminders() {
  const navigate = useNavigate();
  const [reminders, setReminders] = useState<ReminderItem[]>(INITIAL_REMINDERS);
  const [activeFilter, setActiveFilter] = useState<CategoryFilter>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Quick Renew Modal State
  const [selectedReminder, setSelectedReminder] = useState<ReminderItem | null>(null);
  const [newExpiryDate, setNewExpiryDate] = useState('');
  const [referenceNo, setReferenceNo] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Filtered Reminders
  const filteredReminders = useMemo(() => {
    return reminders.filter(item => {
      if (item.snoozed) return false;

      // Category filter
      if (activeFilter === 'critical') {
        if (item.daysRemaining > 7) return false;
      } else if (activeFilter === 'vehicle') {
        if (item.entityType !== 'Vehicle') return false;
      } else if (activeFilter === 'driver') {
        if (item.entityType !== 'Driver') return false;
      } else if (activeFilter === 'inspection') {
        if (item.category !== 'inspection') return false;
      }

      // Search query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchName = item.entityName.toLowerCase().includes(q);
        const matchDoc = item.docType.toLowerCase().includes(q);
        const matchSub = item.entitySub.toLowerCase().includes(q);
        const matchId = item.entityId.toLowerCase().includes(q);
        if (!matchName && !matchDoc && !matchSub && !matchId) return false;
      }

      return true;
    });
  }, [reminders, activeFilter, searchQuery]);

  const criticalCount = useMemo(() => {
    return reminders.filter(r => !r.snoozed && r.daysRemaining <= 7).length;
  }, [reminders]);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3500);
  };

  const handleSnooze = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setReminders(prev => prev.map(r => r.id === id ? { ...r, snoozed: true } : r));
    showToast('Reminder snoozed for 7 days');
  };

  const handleNotify = (item: ReminderItem, e: React.MouseEvent) => {
    e.stopPropagation();
    showToast(`Urgent alert sent to ${item.entityName} (${item.entityId})`);
  };

  const handleOpenRenewModal = (item: ReminderItem, e: React.MouseEvent) => {
    e.stopPropagation();
    setSelectedReminder(item);
    // Set default date to +1 year from today
    const future = new Date();
    future.setFullYear(future.getFullYear() + 1);
    setNewExpiryDate(future.toISOString().split('T')[0]);
    setReferenceNo(`REG-${Math.floor(100000 + Math.random() * 900000)}`);
  };

  const handleSaveRenewal = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedReminder) return;

    setIsSubmitting(true);
    setTimeout(() => {
      setReminders(prev => prev.map(r => {
        if (r.id === selectedReminder.id) {
          return {
            ...r,
            expiryDate: newExpiryDate,
            daysRemaining: 365,
            status: 'Upcoming',
            notes: `Renewed on ${new Date().toLocaleDateString()}. Ref: ${referenceNo}`,
          };
        }
        return r;
      }));

      setIsSubmitting(false);
      setSelectedReminder(null);
      showToast(`Successfully renewed ${selectedReminder.docType} for ${selectedReminder.entityName}!`);
    }, 600);
  };

  return (
    <div className="bg-white rounded-[20px] border border-black/[0.08] shadow-sm overflow-hidden flex flex-col transition-all">
      {/* Toast Banner */}
      {toastMessage && (
        <div className="bg-emerald-600 text-white text-xs font-semibold px-4 py-2 flex items-center justify-between animate-in fade-in slide-in-from-top-2">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-200" />
            <span>{toastMessage}</span>
          </div>
          <button onClick={() => setToastMessage(null)} className="hover:opacity-80">
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* ── 1. Top Section Header ────────────────────────────────────────── */}
      <div className="p-4 sm:p-5 border-b border-slate-100 bg-slate-50/50 flex flex-col gap-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="relative">
              <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-amber-500 to-orange-400 flex items-center justify-center shadow-xs text-white">
                <Bell className="w-4 h-4" />
              </div>
              {criticalCount > 0 && (
                <span className="absolute -top-1 -right-1 flex h-3.5 w-3.5 items-center justify-center rounded-full bg-rose-600 text-[9px] font-black text-white ring-2 ring-white">
                  {criticalCount}
                </span>
              )}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-sm font-extrabold text-slate-900 tracking-tight">
                  Actionable Reminders & Expirations
                </h3>
                {criticalCount > 0 && (
                  <Badge variant="outline" className="bg-rose-50 text-rose-600 border-rose-200 text-[10px] font-extrabold animate-pulse">
                    {criticalCount} Urgent
                  </Badge>
                )}
              </div>
              <p className="text-[11px] font-medium text-slate-500">
                Track driver licenses, vehicle inspections, permits & insurance deadlines
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              className="h-8 px-2.5 text-[11px] font-extrabold text-slate-700 hover:bg-slate-100 border-slate-200 shadow-2xs gap-1"
              onClick={() => navigate('/documents/expiries')}
            >
              <span>Expiry Radar</span>
              <ArrowUpRight className="w-3.5 h-3.5 text-[#E8450F]" />
            </Button>
          </div>
        </div>

        {/* Filter Pills & Quick Search */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2.5 pt-1">
          {/* Filter Pills */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0 scrollbar-none">
            <button
              onClick={() => setActiveFilter('all')}
              className={`px-3 py-1 rounded-lg text-[11px] font-extrabold transition-all flex items-center gap-1.5 whitespace-nowrap ${
                activeFilter === 'all'
                  ? 'bg-slate-900 text-white shadow-xs'
                  : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-100'
              }`}
            >
              <span>All Items</span>
              <span className={`px-1.5 py-0.2 rounded-full text-[9px] ${activeFilter === 'all' ? 'bg-slate-700 text-slate-200' : 'bg-slate-100 text-slate-600'}`}>
                {reminders.filter(r => !r.snoozed).length}
              </span>
            </button>

            <button
              onClick={() => setActiveFilter('critical')}
              className={`px-3 py-1 rounded-lg text-[11px] font-extrabold transition-all flex items-center gap-1.5 whitespace-nowrap ${
                activeFilter === 'critical'
                  ? 'bg-rose-600 text-white shadow-xs'
                  : 'bg-rose-50/70 border border-rose-200 text-rose-700 hover:bg-rose-100/80'
              }`}
            >
              <AlertTriangle className="w-3 h-3" />
              <span>Critical</span>
              <span className={`px-1.5 py-0.2 rounded-full text-[9px] ${activeFilter === 'critical' ? 'bg-rose-800 text-rose-100' : 'bg-rose-100 text-rose-700'}`}>
                {criticalCount}
              </span>
            </button>

            <button
              onClick={() => setActiveFilter('vehicle')}
              className={`px-3 py-1 rounded-lg text-[11px] font-extrabold transition-all flex items-center gap-1.5 whitespace-nowrap ${
                activeFilter === 'vehicle'
                  ? 'bg-indigo-600 text-white shadow-xs'
                  : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-100'
              }`}
            >
              <Car className="w-3 h-3" />
              <span>Vehicles</span>
            </button>

            <button
              onClick={() => setActiveFilter('driver')}
              className={`px-3 py-1 rounded-lg text-[11px] font-extrabold transition-all flex items-center gap-1.5 whitespace-nowrap ${
                activeFilter === 'driver'
                  ? 'bg-indigo-600 text-white shadow-xs'
                  : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-100'
              }`}
            >
              <User className="w-3 h-3" />
              <span>Drivers</span>
            </button>

            <button
              onClick={() => setActiveFilter('inspection')}
              className={`px-3 py-1 rounded-lg text-[11px] font-extrabold transition-all flex items-center gap-1.5 whitespace-nowrap ${
                activeFilter === 'inspection'
                  ? 'bg-indigo-600 text-white shadow-xs'
                  : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-100'
              }`}
            >
              <RefreshCw className="w-3 h-3" />
              <span>Inspections</span>
            </button>
          </div>

          {/* Quick Search */}
          <div className="relative w-full sm:w-44">
            <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
            <Input
              type="text"
              placeholder="Search reminder..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="h-8 pl-8 pr-2 text-[11px] bg-white border-slate-200 rounded-lg shadow-2xs font-semibold focus:border-indigo-500"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
              >
                <X className="w-3 h-3" />
              </button>
            )}
          </div>
        </div>
      </div>

      {/* ── 2. Real Reminder Items List ──────────────────────────────────── */}
      <div className="p-3 sm:p-4 divide-y divide-slate-100 space-y-3 max-h-[460px] overflow-y-auto scrollbar-thin scrollbar-thumb-slate-200">
        {filteredReminders.length === 0 ? (
          <div className="py-12 flex flex-col items-center justify-center text-center px-4">
            <div className="w-12 h-12 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center mb-3">
              <CheckCircle2 className="w-6 h-6" />
            </div>
            <h4 className="text-sm font-extrabold text-slate-800 mb-1">No Active Reminders Found</h4>
            <p className="text-xs text-slate-500 max-w-xs">
              All compliance items for this filter are up to date or snoozed.
            </p>
          </div>
        ) : (
          filteredReminders.map(item => {
            const isExpired = item.daysRemaining <= 0;
            const isCritical = item.daysRemaining > 0 && item.daysRemaining <= 7;
            const isWarning = item.daysRemaining > 7 && item.daysRemaining <= 15;

            // Border & accent styling
            let cardBg = 'bg-white hover:bg-slate-50/70 border-slate-200/80';
            let badgeBg = 'bg-slate-100 text-slate-700 border-slate-200';
            let statusText = `${item.daysRemaining} days left`;
            let barColor = 'bg-slate-400';

            if (isExpired) {
              cardBg = 'bg-rose-50/40 hover:bg-rose-50/70 border-rose-200';
              badgeBg = 'bg-rose-500 text-white border-rose-600 font-extrabold';
              statusText = `EXPIRED (${Math.abs(item.daysRemaining)} days ago)`;
              barColor = 'bg-rose-600';
            } else if (isCritical) {
              cardBg = 'bg-amber-50/40 hover:bg-amber-50/70 border-amber-200';
              badgeBg = 'bg-amber-500 text-white border-amber-600 font-extrabold';
              statusText = `Urgent (${item.daysRemaining} days remaining)`;
              barColor = 'bg-amber-500';
            } else if (isWarning) {
              cardBg = 'bg-orange-50/30 hover:bg-orange-50/60 border-orange-200/70';
              badgeBg = 'bg-orange-100 text-orange-800 border-orange-200';
              barColor = 'bg-orange-400';
            }

            return (
              <div
                key={item.id}
                className={`rounded-xl border p-3.5 transition-all flex flex-col gap-3 group relative shadow-2xs ${cardBg}`}
              >
                {/* Item Top Row */}
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-start gap-3">
                    {/* Entity Icon Badge */}
                    <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 border shadow-2xs ${
                      item.entityType === 'Vehicle'
                        ? 'bg-slate-900 text-white border-slate-800'
                        : 'bg-indigo-50 text-indigo-700 border-indigo-200'
                    }`}>
                      {item.entityType === 'Vehicle' ? (
                        <Car className="w-4 h-4" />
                      ) : (
                        <User className="w-4 h-4" />
                      )}
                    </div>

                    {/* Details */}
                    <div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-xs font-black text-slate-900 group-hover:text-indigo-600 transition-colors">
                          {item.entityName}
                        </span>
                        <Badge variant="outline" className="text-[9px] font-extrabold px-1.5 py-0 bg-slate-100 text-slate-600 border-slate-200">
                          {item.entityType}
                        </Badge>
                      </div>

                      <p className="text-xs font-bold text-slate-700 mt-0.5">
                        {item.docType}
                      </p>

                      <p className="text-[10px] text-slate-500 font-medium">
                        {item.entitySub}
                      </p>
                    </div>
                  </div>

                  {/* Countdown Badge & Expiry Date */}
                  <div className="text-end shrink-0">
                    <Badge variant="outline" className={`text-[10px] py-0.5 px-2 ${badgeBg}`}>
                      {statusText}
                    </Badge>
                    <p className="text-[10px] font-bold text-slate-400 mt-1 flex items-center justify-end gap-1">
                      <Calendar className="w-3 h-3 text-slate-400" />
                      Due: {item.expiryDate}
                    </p>
                  </div>
                </div>

                {/* Progress Urgency Bar */}
                <div className="w-full bg-slate-100 h-1.5 rounded-full overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all ${barColor}`}
                    style={{
                      width: `${Math.min(100, Math.max(8, isExpired ? 100 : Math.round((1 - item.daysRemaining / 30) * 100)))}%`
                    }}
                  />
                </div>

                {/* Notes Snippet */}
                {item.notes && (
                  <p className="text-[11px] font-medium text-slate-600 bg-slate-100/70 rounded-lg px-2.5 py-1.5 flex items-center gap-1.5 border border-slate-200/50">
                    <Info className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                    <span className="truncate">{item.notes}</span>
                  </p>
                )}

                {/* Action Buttons Row */}
                <div className="flex items-center justify-between pt-1 border-t border-black/[0.04]">
                  <div className="flex items-center gap-1 text-[10px] font-semibold text-slate-400">
                    <span>ID: {item.entityId}</span>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      onClick={(e) => handleSnooze(item.id, e)}
                      className="text-[10px] font-extrabold text-slate-500 hover:text-slate-800 px-2 py-1 rounded-md hover:bg-slate-100 transition-colors"
                      title="Snooze reminder for 7 days"
                    >
                      Snooze
                    </button>

                    <button
                      onClick={(e) => handleNotify(item, e)}
                      className="text-[10px] font-extrabold text-indigo-600 hover:text-indigo-800 px-2 py-1 rounded-md hover:bg-indigo-50 transition-colors flex items-center gap-1"
                      title="Send SMS / App notification"
                    >
                      <Send className="w-3 h-3" />
                      Alert
                    </button>

                    <Button
                      size="sm"
                      className={`h-7 px-3 text-[10px] font-extrabold rounded-lg shadow-2xs gap-1 ${
                        isExpired
                          ? 'bg-rose-600 hover:bg-rose-700 text-white'
                          : 'bg-[#E8450F] hover:bg-[#c93b0b] text-white'
                      }`}
                      onClick={(e) => handleOpenRenewModal(item, e)}
                    >
                      <RefreshCw className="w-3 h-3" />
                      <span>Renew Now</span>
                    </Button>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* ── 3. Quick Renewal Modal ────────────────────────────────────────── */}
      <Dialog open={!!selectedReminder} onOpenChange={open => !open && setSelectedReminder(null)}>
        <DialogContent className="sm:max-w-md bg-white rounded-2xl p-6">
          <DialogHeader>
            <DialogTitle className="text-base font-extrabold text-slate-900 flex items-center gap-2">
              <RefreshCw className="w-4 h-4 text-[#E8450F]" />
              <span>Renew Compliance Document</span>
            </DialogTitle>
            <DialogDescription className="text-xs text-slate-500">
              Update the expiration date and reference info for <span className="font-extrabold text-slate-800">{selectedReminder?.entityName}</span>.
            </DialogDescription>
          </DialogHeader>

          {selectedReminder && (
            <form onSubmit={handleSaveRenewal} className="space-y-4 py-2">
              <div className="bg-slate-50 rounded-xl p-3 border border-slate-200/80">
                <p className="text-xs font-extrabold text-slate-800">{selectedReminder.docType}</p>
                <p className="text-[11px] text-slate-500 font-medium">{selectedReminder.entitySub}</p>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-700">New Expiration Date</label>
                <Input
                  type="date"
                  value={newExpiryDate}
                  onChange={e => setNewExpiryDate(e.target.value)}
                  required
                  className="text-xs font-semibold"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-700">Reference / Permit No. (Optional)</label>
                <Input
                  type="text"
                  placeholder="e.g. REG-984021"
                  value={referenceNo}
                  onChange={e => setReferenceNo(e.target.value)}
                  className="text-xs font-semibold"
                />
              </div>

              <div className="border-2 border-dashed border-slate-200 rounded-xl p-4 text-center bg-slate-50/50 hover:bg-slate-50 cursor-pointer transition-colors">
                <Upload className="w-5 h-5 mx-auto text-slate-400 mb-1" />
                <p className="text-xs font-bold text-slate-700">Attach Scanned Document (PDF/JPG)</p>
                <p className="text-[10px] text-slate-400">Drag & drop or click to browse</p>
              </div>

              <DialogFooter className="gap-2 sm:gap-0 pt-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setSelectedReminder(null)}
                  className="text-xs font-bold"
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  size="sm"
                  disabled={isSubmitting}
                  className="bg-[#E8450F] hover:bg-[#c8390a] text-white text-xs font-bold gap-1.5"
                >
                  {isSubmitting ? (
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                  ) : (
                    <Check className="w-3.5 h-3.5" />
                  )}
                  Save & Update Status
                </Button>
              </DialogFooter>
            </form>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
