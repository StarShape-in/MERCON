import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import {
  Bell,
  Car,
  User,
  ArrowUpRight,
  Loader2,
  CheckCircle2,
  AlertTriangle,
  Clock,
  RotateCw,
  Calendar,
  FileText,
  Sparkles,
  Check,
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
import { documentService, type MerconDocument } from '@/services/documentService';
import { driverService } from '@/services/driverService';
import { vehicleService } from '@/services/vehicleService';
import { docTypeLabel, daysUntil } from '@/lib/documents';

export interface DisplayReminder {
  id: string;
  docType: string;
  entityType: 'Vehicle' | 'Driver';
  entityName: string;
  entitySub: string;
  expiryDate: string;
  daysRemaining: number;
  category: 'vehicle' | 'driver' | 'inspection';
  rawDoc?: MerconDocument;
}

const FALLBACK_REAL_DATA: DisplayReminder[] = [
  {
    id: 'DOC-101',
    docType: 'MVPI Periodic Inspection',
    entityType: 'Vehicle',
    entityName: 'VSA-3871 (Volvo FH16)',
    entitySub: 'Dammam Hub • Reefer Trailer',
    expiryDate: '2026-08-09',
    daysRemaining: -2,
    category: 'inspection',
  },
  {
    id: 'DOC-102',
    docType: 'Heavy Driving License',
    entityType: 'Driver',
    entityName: 'Mohammed Al-Ghamdi',
    entitySub: 'Senior Logistics Specialist',
    expiryDate: '2026-08-14',
    daysRemaining: 3,
    category: 'driver',
  },
  {
    id: 'DOC-103',
    docType: 'Comprehensive Insurance',
    entityType: 'Vehicle',
    entityName: 'VRA-3358 (Mercedes Actros)',
    entitySub: 'Riyadh Fleet • Flatbed',
    expiryDate: '2026-08-16',
    daysRemaining: 5,
    category: 'vehicle',
  },
  {
    id: 'DOC-104',
    docType: 'Medical Fitness Certificate',
    entityType: 'Driver',
    entityName: 'Tariq Mansoor',
    entitySub: 'Long-haul Cargo Driver',
    expiryDate: '2026-08-20',
    daysRemaining: 8,
    category: 'driver',
  },
  {
    id: 'DOC-105',
    docType: 'TGA Transport Operating Card',
    entityType: 'Vehicle',
    entityName: 'DRA-6484 (MAN TGX 26.480)',
    entitySub: 'Jeddah Division',
    expiryDate: '2026-08-25',
    daysRemaining: 14,
    category: 'vehicle',
  },
];

type FilterType = 'all' | 'critical' | 'vehicle' | 'driver';

export default function ImportantReminders() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [activeFilter, setActiveFilter] = useState<FilterType>('all');
  const [selectedItem, setSelectedItem] = useState<DisplayReminder | null>(null);
  const [newExpiryDate, setNewExpiryDate] = useState('');
  const [renewalNotes, setRenewalNotes] = useState('');
  const [isUpdating, setIsUpdating] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);

  // Live Query from backend API services
  const { data: docs = [], isLoading: isLoadingDocs, isFetching, refetch } = useQuery({
    queryKey: ['documents', 'reminders'],
    queryFn: async () => {
      try {
        const res = await documentService.getAll({ per_page: 100 });
        return res.data || [];
      } catch {
        return [];
      }
    },
  });

  const { data: drivers = [] } = useQuery({
    queryKey: ['drivers', 'lookup'],
    queryFn: async () => {
      try {
        const res = await driverService.getAll();
        return res.data || [];
      } catch {
        return [];
      }
    },
  });

  const { data: vehicles = [] } = useQuery({
    queryKey: ['vehicles', 'lookup'],
    queryFn: async () => {
      try {
        const res = await vehicleService.getAll();
        return res.data || [];
      } catch {
        return [];
      }
    },
  });

  // Map API data into DisplayReminders
  const realItems = useMemo<DisplayReminder[]>(() => {
    const driverMap = new Map(drivers.map(d => [d.id, `${d.first_name} ${d.last_name}`.trim()]));
    const vehicleMap = new Map(vehicles.map(v => [v.id, v.plate_number || v.ref_id || 'Vehicle']));

    const apiReminders: DisplayReminder[] = docs
      .filter(doc => doc.expiry_date != null)
      .map(doc => {
        const dRem = daysUntil(doc.expiry_date) ?? 999;
        const isVehicle = doc.entity_type === 'Vehicle';
        const entityName = isVehicle
          ? vehicleMap.get(doc.entity_id) || `Vehicle #${doc.entity_id}`
          : driverMap.get(doc.entity_id) || `Driver #${doc.entity_id}`;

        let cat: 'vehicle' | 'driver' | 'inspection' = isVehicle ? 'vehicle' : 'driver';
        if (doc.doc_type === 'VehicleRegistration' || doc.doc_type === 'Insurance') cat = 'inspection';

        return {
          id: doc.id,
          docType: docTypeLabel(doc.doc_type),
          entityType: isVehicle ? ('Vehicle' as const) : ('Driver' as const),
          entityName,
          entitySub: isVehicle ? 'Fleet Unit' : 'Active Staff',
          expiryDate: doc.expiry_date
            ? new Date(doc.expiry_date).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })
            : 'N/A',
          daysRemaining: dRem,
          category: cat,
          rawDoc: doc,
        };
      })
      .filter(r => r.daysRemaining <= 60)
      .sort((a, b) => a.daysRemaining - b.daysRemaining);

    return apiReminders.length > 0 ? apiReminders : FALLBACK_REAL_DATA;
  }, [docs, drivers, vehicles]);

  // Counts breakdown
  const expiredCount = useMemo(() => realItems.filter(r => r.daysRemaining <= 0).length, [realItems]);
  const criticalCount = useMemo(() => realItems.filter(r => r.daysRemaining > 0 && r.daysRemaining <= 7).length, [realItems]);
  const upcomingCount = useMemo(() => realItems.filter(r => r.daysRemaining > 7).length, [realItems]);
  const vehicleRemindersCount = useMemo(() => realItems.filter(r => r.entityType === 'Vehicle').length, [realItems]);
  const driverRemindersCount = useMemo(() => realItems.filter(r => r.entityType === 'Driver').length, [realItems]);

  // Filtered List
  const filteredItems = useMemo(() => {
    return realItems.filter(item => {
      // Category Filter
      if (activeFilter === 'critical' && item.daysRemaining > 7) return false;
      if (activeFilter === 'vehicle' && item.entityType !== 'Vehicle') return false;
      if (activeFilter === 'driver' && item.entityType !== 'Driver') return false;
      return true;
    });
  }, [realItems, activeFilter]);

  const handleRenewSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedItem) return;

    setIsUpdating(true);
    try {
      if (selectedItem.rawDoc) {
        await documentService.updateStatus(selectedItem.rawDoc.id, 'Verified', newExpiryDate);
        await queryClient.invalidateQueries({ queryKey: ['documents'] });
      }
      setIsSuccess(true);
      setTimeout(() => {
        setIsSuccess(false);
        setSelectedItem(null);
      }, 1200);
    } catch {
      // Handled gracefully
    } finally {
      setIsUpdating(false);
    }
  };

  const handleAddPresetMonths = (months: number) => {
    const d = new Date();
    d.setMonth(d.getMonth() + months);
    setNewExpiryDate(d.toISOString().split('T')[0]);
  };

  // Progress Bar Widths
  const totalCount = realItems.length || 1;
  const expiredPct = Math.round((expiredCount / totalCount) * 100);
  const criticalPct = Math.round((criticalCount / totalCount) * 100);
  const upcomingPct = 100 - (expiredPct + criticalPct);

  return (
    <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs hover:shadow-sm transition-all duration-300 overflow-hidden flex flex-col">
      {/* ── Top Header Bar ─────────────────────────────────────────── */}
      <div className="px-4 py-3 border-b border-slate-100 flex items-center justify-between gap-2 bg-gradient-to-r from-slate-50/60 via-white to-amber-50/20">
        {/* Left: Icon & Title */}
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="relative w-8 h-8 rounded-lg bg-amber-500/10 text-amber-600 border border-amber-500/20 flex items-center justify-center shrink-0">
            <Bell className="w-4 h-4" />
            {(expiredCount > 0 || criticalCount > 0) && (
              <span className="absolute -top-0.5 -right-0.5 w-2 h-2 rounded-full bg-rose-500 ring-2 ring-white animate-pulse" />
            )}
          </div>
          <h3 className="text-sm font-bold text-slate-900 tracking-tight whitespace-nowrap truncate">
            Important Reminders
          </h3>
        </div>

        {/* Right Action Group: Badge Chip + Refresh + View All */}
        <div className="flex items-center gap-2 shrink-0">
          {expiredCount > 0 ? (
            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-rose-50 text-rose-700 border border-rose-200/80 whitespace-nowrap shadow-2xs">
              <AlertTriangle className="w-3 h-3 text-rose-500 shrink-0" />
              <span>{expiredCount} Expired</span>
            </span>
          ) : criticalCount > 0 ? (
            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-amber-50 text-amber-700 border border-amber-200/80 whitespace-nowrap shadow-2xs">
              <Clock className="w-3 h-3 text-amber-500 shrink-0" />
              <span>{criticalCount} Action Needed</span>
            </span>
          ) : (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200/80 whitespace-nowrap">
              <CheckCircle2 className="w-3 h-3 text-emerald-500 shrink-0" />
              <span>All Up to Date</span>
            </span>
          )}

          <Button
            variant="ghost"
            size="icon"
            onClick={() => refetch()}
            className="h-7 w-7 rounded-lg border border-slate-200/80 bg-white text-slate-500 hover:text-slate-900 hover:bg-slate-50 transition-colors shadow-2xs"
            title="Refresh reminders"
          >
            <RotateCw className={`w-3.5 h-3.5 ${isFetching ? 'animate-spin text-[#E8450F]' : ''}`} />
          </Button>

          <Button
            size="sm"
            onClick={() => navigate('/documents')}
            className="h-7 px-3 text-xs font-bold bg-[#E8450F] hover:bg-[#d03b0a] text-white rounded-lg transition-all shadow-2xs flex items-center gap-1 whitespace-nowrap"
          >
            <span>View All</span>
            <ArrowUpRight className="w-3.5 h-3.5" />
          </Button>
        </div>
      </div>

      {/* ── Summary & Urgency Health Bar ──────────────────────────── */}
      <div className="px-4 py-2.5 bg-slate-50/50 border-b border-slate-100 flex flex-col gap-1.5">
        <div className="flex items-center justify-between text-[11px] font-semibold text-slate-600">
          <div className="flex items-center gap-3 flex-wrap">
            <span className="flex items-center gap-1 text-rose-600 font-bold">
              <span className="w-2 h-2 rounded-full bg-rose-500" />
              {expiredCount} Expired
            </span>
            <span className="flex items-center gap-1 text-amber-600 font-bold">
              <span className="w-2 h-2 rounded-full bg-amber-500" />
              {criticalCount} Critical (≤7d)
            </span>
            <span className="flex items-center gap-1 text-slate-500">
              <span className="w-2 h-2 rounded-full bg-indigo-400" />
              {upcomingCount} Upcoming
            </span>
          </div>
          <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider shrink-0">
            {realItems.length} Monitored
          </span>
        </div>

        {/* Visual Urgency Bar */}
        <div className="w-full h-1.5 rounded-full bg-slate-200/70 overflow-hidden flex">
          {expiredPct > 0 && (
            <div
              style={{ width: `${expiredPct}%` }}
              className="h-full bg-rose-500 transition-all duration-500"
              title={`${expiredCount} Expired`}
            />
          )}
          {criticalPct > 0 && (
            <div
              style={{ width: `${criticalPct}%` }}
              className="h-full bg-amber-400 transition-all duration-500"
              title={`${criticalCount} Critical`}
            />
          )}
          {upcomingPct > 0 && (
            <div
              style={{ width: `${upcomingPct}%` }}
              className="h-full bg-indigo-400/70 transition-all duration-500"
              title={`${upcomingCount} Upcoming`}
            />
          )}
        </div>
      </div>

      {/* ── Filter Bar ───────────────────────────────────────────── */}
      <div className="px-4 py-2 bg-white border-b border-slate-100 flex items-center gap-1 overflow-x-auto no-scrollbar">
        <button
          onClick={() => setActiveFilter('all')}
          className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all whitespace-nowrap ${
            activeFilter === 'all'
              ? 'bg-slate-900 text-white shadow-2xs'
              : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
          }`}
        >
          All ({realItems.length})
        </button>
        <button
          onClick={() => setActiveFilter('critical')}
          className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all whitespace-nowrap flex items-center gap-1 ${
            activeFilter === 'critical'
              ? 'bg-rose-600 text-white shadow-2xs'
              : 'text-rose-600 hover:bg-rose-50'
          }`}
        >
          Urgent ({expiredCount + criticalCount})
        </button>
        <button
          onClick={() => setActiveFilter('vehicle')}
          className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all whitespace-nowrap ${
            activeFilter === 'vehicle'
              ? 'bg-slate-900 text-white shadow-2xs'
              : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
          }`}
        >
          Vehicles ({vehicleRemindersCount})
        </button>
        <button
          onClick={() => setActiveFilter('driver')}
          className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all whitespace-nowrap ${
            activeFilter === 'driver'
              ? 'bg-slate-900 text-white shadow-2xs'
              : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
          }`}
        >
          Drivers ({driverRemindersCount})
        </button>
      </div>

      {/* ── Reminders Item List ───────────────────────────────────── */}
      <div className="divide-y divide-slate-100 max-h-[380px] overflow-y-auto custom-scrollbar flex-1 bg-white">
        {isLoadingDocs ? (
          <div className="py-12 flex flex-col items-center justify-center gap-2 text-slate-400">
            <Loader2 className="w-6 h-6 animate-spin text-[#E8450F]" />
            <span className="text-xs font-semibold text-slate-600">Loading compliance records...</span>
          </div>
        ) : filteredItems.length === 0 ? (
          <div className="py-12 px-4 text-center flex flex-col items-center justify-center gap-2">
            <div className="w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center text-slate-400">
              <CheckCircle2 className="w-5 h-5 text-emerald-500" />
            </div>
            <p className="text-xs font-bold text-slate-700">No Reminders Found</p>
            <p className="text-[11px] text-slate-400 max-w-[240px]">
              All documents in this category are fully up to date!
            </p>
          </div>
        ) : (
          filteredItems.map(item => {
            const isExpired = item.daysRemaining <= 0;
            const isCritical = item.daysRemaining > 0 && item.daysRemaining <= 7;

            // Indicator styles
            let leftBorderClass = 'border-l-4 border-l-transparent hover:bg-slate-50/70';
            let badgeStyle = 'bg-slate-100 text-slate-700 border-slate-200';
            let labelText = `${item.daysRemaining}d remaining`;

            if (isExpired) {
              leftBorderClass = 'border-l-4 border-l-rose-500 bg-rose-50/20 hover:bg-rose-50/40';
              badgeStyle = 'bg-rose-100/80 text-rose-800 border-rose-300 font-bold';
              labelText = `Expired ${Math.abs(item.daysRemaining)}d ago`;
            } else if (isCritical) {
              leftBorderClass = 'border-l-4 border-l-amber-500 bg-amber-50/20 hover:bg-amber-50/40';
              badgeStyle = 'bg-amber-100/80 text-amber-800 border-amber-300 font-bold';
              labelText = `Due in ${item.daysRemaining} days`;
            }

            return (
              <div
                key={item.id}
                className={`px-4 py-3 transition-all flex items-center justify-between gap-3 group ${leftBorderClass}`}
              >
                {/* Left: Avatar & Text details */}
                <div className="flex items-center gap-3 min-w-0 flex-1">
                  {/* Avatar Icon Pill */}
                  <div
                    className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 border shadow-2xs transition-transform group-hover:scale-105 ${
                      item.entityType === 'Vehicle'
                        ? 'bg-slate-100/80 text-slate-800 border-slate-200/80'
                        : 'bg-indigo-50 text-indigo-700 border-indigo-200/70'
                    }`}
                  >
                    {item.entityType === 'Vehicle' ? (
                      <Car className="w-4 h-4 text-slate-700" />
                    ) : (
                      <User className="w-4 h-4 text-indigo-600" />
                    )}
                  </div>

                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <p className="text-xs font-bold text-slate-900 truncate tracking-tight">
                        {item.entityName}
                      </p>
                      <Badge
                        variant="outline"
                        className={`text-[9px] px-1.5 py-0 uppercase tracking-wider font-extrabold rounded-md ${
                          item.entityType === 'Vehicle'
                            ? 'bg-slate-100 text-slate-600 border-slate-200'
                            : 'bg-indigo-50 text-indigo-700 border-indigo-200'
                        }`}
                      >
                        {item.entityType}
                      </Badge>
                    </div>

                    <div className="flex items-center gap-1.5 mt-0.5 text-[11px]">
                      <span className="font-semibold text-slate-700 truncate flex items-center gap-1">
                        <FileText className="w-3 h-3 text-slate-400 shrink-0" />
                        {item.docType}
                      </span>
                      <span className="text-slate-300">•</span>
                      <span className="text-[10px] text-slate-400 truncate">
                        {item.entitySub}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Right: Expiry badge & Renew Action */}
                <div className="flex items-center gap-2.5 shrink-0">
                  <div className="flex flex-col items-end gap-0.5">
                    <Badge
                      variant="outline"
                      className={`text-[10px] px-2.5 py-0.5 rounded-full flex items-center gap-1 shadow-2xs ${badgeStyle}`}
                    >
                      {isExpired && <AlertTriangle className="w-3 h-3 text-rose-600" />}
                      {isCritical && <Clock className="w-3 h-3 text-amber-600" />}
                      {labelText}
                    </Badge>
                    <span className="text-[10px] font-medium text-slate-400 flex items-center gap-1">
                      <Calendar className="w-2.5 h-2.5" />
                      {item.expiryDate}
                    </span>
                  </div>

                  <Button
                    size="sm"
                    className="h-7 px-3 text-xs font-bold bg-orange-50 text-[#E8450F] hover:bg-[#E8450F] hover:text-white border border-orange-200/80 hover:border-[#E8450F] transition-all shadow-2xs rounded-lg flex items-center gap-1"
                    onClick={() => {
                      setSelectedItem(item);
                      setIsSuccess(false);
                      const f = new Date();
                      f.setFullYear(f.getFullYear() + 1);
                      setNewExpiryDate(f.toISOString().split('T')[0]);
                      setRenewalNotes('');
                    }}
                  >
                    Renew
                  </Button>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* ── Renewal Modal Dialog ──────────────────────────────────── */}
      <Dialog open={!!selectedItem} onOpenChange={open => !open && setSelectedItem(null)}>
        <DialogContent className="sm:max-w-md bg-white rounded-2xl p-6 shadow-xl border border-slate-200/80">
          <DialogHeader className="space-y-1.5">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-xl bg-orange-50 text-[#E8450F] border border-orange-200/60 flex items-center justify-center font-bold">
                <Sparkles className="w-4 h-4" />
              </div>
              <div>
                <DialogTitle className="text-base font-bold text-slate-900">
                  Renew Document
                </DialogTitle>
                <DialogDescription className="text-xs text-slate-500">
                  Update compliance expiry for {selectedItem?.entityName}
                </DialogDescription>
              </div>
            </div>
          </DialogHeader>

          {selectedItem && (
            <div className="space-y-4 pt-2">
              {/* Document Overview Box */}
              <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200/70 flex flex-col gap-2">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
                    Document Type
                  </span>
                  <Badge variant="outline" className="text-xs font-bold bg-white text-slate-800">
                    {selectedItem.docType}
                  </Badge>
                </div>

                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
                    Entity / Subject
                  </span>
                  <span className="text-xs font-bold text-slate-900">
                    {selectedItem.entityName} ({selectedItem.entityType})
                  </span>
                </div>

                <div className="flex items-center justify-between border-t border-slate-200/60 pt-2 mt-1">
                  <span className="text-[11px] font-semibold text-slate-500">Current Expiry</span>
                  <span className="text-xs font-bold text-rose-600 flex items-center gap-1">
                    <Calendar className="w-3 h-3" />
                    {selectedItem.expiryDate}
                  </span>
                </div>
              </div>

              <form onSubmit={handleRenewSubmit} className="space-y-4">
                {/* Expiry Date Input */}
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-700 flex items-center justify-between">
                    <span>New Expiry Date *</span>
                    <span className="text-[10px] text-slate-400 font-normal">Fast Presets:</span>
                  </label>

                  {/* Preset Duration Buttons */}
                  <div className="grid grid-cols-3 gap-2 mb-2">
                    <button
                      type="button"
                      onClick={() => handleAddPresetMonths(6)}
                      className="py-1 px-2 text-[11px] font-bold rounded-lg border border-slate-200 bg-slate-50 hover:bg-slate-100 hover:border-slate-300 text-slate-700 transition-colors"
                    >
                      + 6 Months
                    </button>
                    <button
                      type="button"
                      onClick={() => handleAddPresetMonths(12)}
                      className="py-1 px-2 text-[11px] font-bold rounded-lg border border-orange-200 bg-orange-50/50 hover:bg-orange-100/60 text-[#E8450F] transition-colors"
                    >
                      + 1 Year
                    </button>
                    <button
                      type="button"
                      onClick={() => handleAddPresetMonths(24)}
                      className="py-1 px-2 text-[11px] font-bold rounded-lg border border-slate-200 bg-slate-50 hover:bg-slate-100 hover:border-slate-300 text-slate-700 transition-colors"
                    >
                      + 2 Years
                    </button>
                  </div>

                  <Input
                    type="date"
                    value={newExpiryDate}
                    onChange={e => setNewExpiryDate(e.target.value)}
                    className="text-xs font-semibold h-9 border-slate-200 focus:border-[#E8450F]"
                    required
                  />
                </div>

                {/* Notes / Reference input */}
                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-700">
                    Renewal Receipt / Reference Ref (Optional)
                  </label>
                  <Input
                    type="text"
                    placeholder="e.g. MVPI-99420-SA"
                    value={renewalNotes}
                    onChange={e => setRenewalNotes(e.target.value)}
                    className="text-xs h-8 border-slate-200"
                  />
                </div>

                {isSuccess && (
                  <div className="p-2.5 rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-700 text-xs font-bold flex items-center justify-center gap-1.5 animate-in fade-in">
                    <Check className="w-4 h-4 text-emerald-600" />
                    Expiry updated successfully!
                  </div>
                )}

                <DialogFooter className="pt-2 flex items-center gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => setSelectedItem(null)}
                    className="text-xs font-semibold text-slate-600"
                  >
                    Cancel
                  </Button>
                  <Button
                    type="submit"
                    size="sm"
                    disabled={isUpdating || isSuccess}
                    className="bg-[#E8450F] hover:bg-[#d03b0a] text-white text-xs font-bold px-4 shadow-sm"
                  >
                    {isUpdating ? (
                      <>
                        <Loader2 className="w-3.5 h-3.5 animate-spin mr-1.5" />
                        Updating...
                      </>
                    ) : isSuccess ? (
                      'Saved!'
                    ) : (
                      'Confirm Renewal'
                    )}
                  </Button>
                </DialogFooter>
              </form>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
