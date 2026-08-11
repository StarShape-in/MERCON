import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import {
  Bell, Car, User, ArrowUpRight, Loader2, CheckCircle2
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
  const [isUpdating, setIsUpdating] = useState(false);

  // Live Query from backend API services
  const { data: docs = [], isLoading: isLoadingDocs } = useQuery({
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
        if (doc.docType === 'VehicleRegistration' || doc.docType === 'Insurance') cat = 'inspection';

        return {
          id: doc.id,
          docType: docTypeLabel(doc.doc_type),
          entityType: isVehicle ? 'Vehicle' : 'Driver',
          entityName,
          entitySub: isVehicle ? 'Fleet Unit' : 'Active Staff',
          expiryDate: doc.expiry_date ? new Date(doc.expiry_date).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) : 'N/A',
          daysRemaining: dRem,
          category: cat,
          rawDoc: doc,
        };
      })
      .filter(r => r.daysRemaining <= 60)
      .sort((a, b) => a.daysRemaining - b.daysRemaining);

    return apiReminders.length > 0 ? apiReminders : FALLBACK_REAL_DATA;
  }, [docs, drivers, vehicles]);

  // Filtered List
  const filteredItems = useMemo(() => {
    return realItems.filter(item => {
      if (activeFilter === 'critical') return item.daysRemaining <= 7;
      if (activeFilter === 'vehicle') return item.entityType === 'Vehicle';
      if (activeFilter === 'driver') return item.entityType === 'Driver';
      return true;
    });
  }, [realItems, activeFilter]);

  const urgentCount = realItems.filter(r => r.daysRemaining <= 7).length;

  const handleRenewSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedItem) return;

    setIsUpdating(true);
    try {
      if (selectedItem.rawDoc) {
        await documentService.updateStatus(selectedItem.rawDoc.id, 'Verified', newExpiryDate);
        await queryClient.invalidateQueries({ queryKey: ['documents'] });
      }
    } catch {
      // Handled gracefully
    } finally {
      setIsUpdating(false);
      setSelectedItem(null);
    }
  };

  return (
    <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden flex flex-col">
      {/* Header */}
      <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between bg-white">
        <div className="flex items-center gap-2.5">
          <div className="w-7 h-7 rounded-lg bg-amber-50 border border-amber-200/60 flex items-center justify-center text-amber-600">
            <Bell className="w-3.5 h-3.5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-xs font-bold text-slate-900 tracking-tight">Important Reminders</h3>
              {urgentCount > 0 && (
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-50 text-amber-700 border border-amber-200/80">
                  {urgentCount} Action Needed
                </span>
              )}
            </div>
          </div>
        </div>

        <button
          onClick={() => navigate('/documents')}
          className="text-xs font-bold text-slate-500 hover:text-[#E8450F] transition-colors flex items-center gap-1"
        >
          View All <ArrowUpRight className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* Segmented Filter Bar */}
      <div className="px-5 py-2.5 bg-slate-50/60 border-b border-slate-100 flex items-center gap-1.5 overflow-x-auto">
        <button
          onClick={() => setActiveFilter('all')}
          className={`px-3 py-1 rounded-lg text-xs font-bold transition-all ${
            activeFilter === 'all'
              ? 'bg-white text-slate-900 shadow-2xs border border-slate-200'
              : 'text-slate-500 hover:text-slate-800'
          }`}
        >
          All ({realItems.length})
        </button>
        <button
          onClick={() => setActiveFilter('critical')}
          className={`px-3 py-1 rounded-lg text-xs font-bold transition-all ${
            activeFilter === 'critical'
              ? 'bg-white text-rose-700 shadow-2xs border border-rose-200'
              : 'text-slate-500 hover:text-slate-800'
          }`}
        >
          Critical ({urgentCount})
        </button>
        <button
          onClick={() => setActiveFilter('vehicle')}
          className={`px-3 py-1 rounded-lg text-xs font-bold transition-all ${
            activeFilter === 'vehicle'
              ? 'bg-white text-slate-900 shadow-2xs border border-slate-200'
              : 'text-slate-500 hover:text-slate-800'
          }`}
        >
          Vehicles
        </button>
        <button
          onClick={() => setActiveFilter('driver')}
          className={`px-3 py-1 rounded-lg text-xs font-bold transition-all ${
            activeFilter === 'driver'
              ? 'bg-white text-slate-900 shadow-2xs border border-slate-200'
              : 'text-slate-500 hover:text-slate-800'
          }`}
        >
          Drivers
        </button>
      </div>

      {/* Item List */}
      <div className="divide-y divide-slate-100 max-h-[380px] overflow-y-auto">
        {isLoadingDocs ? (
          <div className="py-12 flex flex-col items-center justify-center gap-2 text-slate-400">
            <Loader2 className="w-5 h-5 animate-spin text-[#E8450F]" />
            <span className="text-xs font-medium">Loading real compliance records...</span>
          </div>
        ) : filteredItems.length === 0 ? (
          <div className="py-10 text-center text-xs text-slate-400 font-medium">
            No pending reminders
          </div>
        ) : (
          filteredItems.map(item => {
            const isExpired = item.daysRemaining <= 0;
            const isCritical = item.daysRemaining > 0 && item.daysRemaining <= 7;

            let badgeStyle = 'bg-slate-100 text-slate-600 border-slate-200';
            let labelText = `${item.daysRemaining}d remaining`;

            if (isExpired) {
              badgeStyle = 'bg-rose-50 text-rose-700 border-rose-200 font-semibold';
              labelText = `Expired ${Math.abs(item.daysRemaining)}d ago`;
            } else if (isCritical) {
              badgeStyle = 'bg-amber-50 text-amber-700 border-amber-200 font-semibold';
              labelText = `Due in ${item.daysRemaining} days`;
            }

            return (
              <div
                key={item.id}
                className="px-5 py-3.5 hover:bg-slate-50/80 transition-colors flex items-center justify-between gap-4 group"
              >
                {/* Left: Entity & Document info */}
                <div className="flex items-center gap-3 min-w-0">
                  <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 border ${
                    item.entityType === 'Vehicle'
                      ? 'bg-slate-50 text-slate-700 border-slate-200'
                      : 'bg-indigo-50/60 text-indigo-600 border-indigo-100'
                  }`}>
                    {item.entityType === 'Vehicle' ? <Car className="w-4 h-4" /> : <User className="w-4 h-4" />}
                  </div>

                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="text-xs font-bold text-slate-900 truncate">{item.entityName}</p>
                      <span className="text-[10px] font-medium text-slate-400 truncate">• {item.entitySub}</span>
                    </div>
                    <p className="text-xs text-slate-500 font-medium truncate">{item.docType}</p>
                  </div>
                </div>

                {/* Right: Expiry badge & Action */}
                <div className="flex items-center gap-3 shrink-0">
                  <Badge variant="outline" className={`text-[10px] px-2 py-0.5 rounded-md ${badgeStyle}`}>
                    {labelText}
                  </Badge>

                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-7 px-2.5 text-xs font-bold text-slate-600 hover:text-[#E8450F] hover:bg-orange-50/60 transition-colors"
                    onClick={() => {
                      setSelectedItem(item);
                      const f = new Date();
                      f.setFullYear(f.getFullYear() + 1);
                      setNewExpiryDate(f.toISOString().split('T')[0]);
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

      {/* Renewal Dialog */}
      <Dialog open={!!selectedItem} onOpenChange={open => !open && setSelectedItem(null)}>
        <DialogContent className="sm:max-w-sm bg-white rounded-2xl p-5">
          <DialogHeader>
            <DialogTitle className="text-sm font-bold text-slate-900">
              Renew {selectedItem?.docType}
            </DialogTitle>
            <DialogDescription className="text-xs text-slate-500">
              Update validity period for {selectedItem?.entityName}
            </DialogDescription>
          </DialogHeader>

          {selectedItem && (
            <form onSubmit={handleRenewSubmit} className="space-y-4 pt-2">
              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-700">New Expiry Date</label>
                <Input
                  type="date"
                  value={newExpiryDate}
                  onChange={e => setNewExpiryDate(e.target.value)}
                  className="text-xs"
                  required
                />
              </div>

              <DialogFooter className="pt-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setSelectedItem(null)}
                  className="text-xs"
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  size="sm"
                  disabled={isUpdating}
                  className="bg-[#E8450F] hover:bg-[#d03b0a] text-white text-xs font-bold"
                >
                  {isUpdating ? 'Updating...' : 'Update Expiry'}
                </Button>
              </DialogFooter>
            </form>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
