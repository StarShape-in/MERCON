import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Bell, AlertCircle, Clock, ChevronRight, RefreshCw, Car, User, CheckCircle2, ArrowUpRight
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
  entityName: string;
  entitySub: string;
  expiryDate: string;
  daysRemaining: number;
  category: 'vehicle' | 'driver' | 'inspection';
}

const REMINDERS_DATA: ReminderItem[] = [
  {
    id: 'REM-101',
    docType: 'MVPI Periodic Inspection',
    entityType: 'Vehicle',
    entityName: 'VSA-3871 (Volvo FH16)',
    entitySub: 'Dammam Hub',
    expiryDate: '09 Aug 2026',
    daysRemaining: -2,
    category: 'inspection',
  },
  {
    id: 'REM-102',
    docType: 'Heavy Driving License',
    entityType: 'Driver',
    entityName: 'Mohammed Al-Ghamdi',
    entitySub: 'Senior Route Driver',
    expiryDate: '14 Aug 2026',
    daysRemaining: 3,
    category: 'driver',
  },
  {
    id: 'REM-103',
    docType: 'Comprehensive Insurance',
    entityType: 'Vehicle',
    entityName: 'VRA-3358 (Mercedes Actros)',
    entitySub: 'Riyadh Fleet',
    expiryDate: '16 Aug 2026',
    daysRemaining: 5,
    category: 'vehicle',
  },
  {
    id: 'REM-104',
    docType: 'Medical Certificate',
    entityType: 'Driver',
    entityName: 'Tariq Mansoor',
    entitySub: 'Heavy Cargo Driver',
    expiryDate: '20 Aug 2026',
    daysRemaining: 8,
    category: 'driver',
  },
  {
    id: 'REM-105',
    docType: 'TGA Transport Permit',
    entityType: 'Vehicle',
    entityName: 'DRA-6484 (MAN TGX)',
    entitySub: 'Cargo Division',
    expiryDate: '25 Aug 2026',
    daysRemaining: 14,
    category: 'vehicle',
  },
];

type FilterType = 'all' | 'critical' | 'vehicle' | 'driver';

export default function ImportantReminders() {
  const navigate = useNavigate();
  const [activeFilter, setActiveFilter] = useState<FilterType>('all');
  const [selectedItem, setSelectedItem] = useState<ReminderItem | null>(null);
  const [newExpiryDate, setNewExpiryDate] = useState('');
  const [isSaved, setIsSaved] = useState(false);

  const filteredItems = useMemo(() => {
    return REMINDERS_DATA.filter(item => {
      if (activeFilter === 'critical') return item.daysRemaining <= 7;
      if (activeFilter === 'vehicle') return item.entityType === 'Vehicle';
      if (activeFilter === 'driver') return item.entityType === 'Driver';
      return true;
    });
  }, [activeFilter]);

  const urgentCount = REMINDERS_DATA.filter(r => r.daysRemaining <= 7).length;

  const handleRenew = (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaved(true);
    setTimeout(() => {
      setIsSaved(false);
      setSelectedItem(null);
    }, 800);
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

      {/* Subtle Segmented Filter Bar */}
      <div className="px-5 py-2.5 bg-slate-50/60 border-b border-slate-100 flex items-center gap-1.5 overflow-x-auto">
        <button
          onClick={() => setActiveFilter('all')}
          className={`px-3 py-1 rounded-lg text-xs font-bold transition-all ${
            activeFilter === 'all'
              ? 'bg-white text-slate-900 shadow-2xs border border-slate-200'
              : 'text-slate-500 hover:text-slate-800'
          }`}
        >
          All ({REMINDERS_DATA.length})
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

      {/* Clean Item List */}
      <div className="divide-y divide-slate-100 max-h-[380px] overflow-y-auto">
        {filteredItems.length === 0 ? (
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

                {/* Right: Expiry badge & Quick Action */}
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
                      setNewExpiryDate('2027-08-14');
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
            <form onSubmit={handleRenew} className="space-y-4 pt-2">
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
                  className="bg-[#E8450F] hover:bg-[#d03b0a] text-white text-xs font-bold"
                >
                  {isSaved ? 'Saved!' : 'Update Expiry'}
                </Button>
              </DialogFooter>
            </form>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
