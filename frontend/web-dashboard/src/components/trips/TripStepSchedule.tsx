import React from 'react';
import { Clock, MapPin } from 'lucide-react';
import { TripScheduleSelector } from '@/components/trips/TripScheduleSelector';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

interface TransitInfo {
  totalMinutes: number;
  durationString: string;
  isInvalid: boolean;
  isTight: boolean;
  isOptimal: boolean;
}

interface TripStepScheduleProps {
  pickupLocationName: string;
  dropoffLocationName: string;
  pickupTime: string;
  dropoffTime: string;
  onPickupTimeChange: (time: string) => void;
  onDropoffTimeChange: (time: string) => void;
  onApplyDropoffOffset: (hours: number, setEod?: boolean) => void;
  transitInfo: TransitInfo | null;
}

export default function TripStepSchedule({
  pickupLocationName,
  dropoffLocationName,
  pickupTime,
  dropoffTime,
  onPickupTimeChange,
  onDropoffTimeChange,
  onApplyDropoffOffset,
  transitInfo,
}: TripStepScheduleProps) {
  return (
    <div className="space-y-4 animate-in fade-in-50 duration-200">
      <div>
        <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
          <Clock className="w-4 h-4 text-[#E8450F]" /> Schedule &amp; SLA Windows
        </h3>
        <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
          Set planned pickup date/time, delivery arrival window, and view transit SLA timing.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Pickup Schedule Card */}
        <Card className="rounded-2xl border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900 p-4 space-y-3 shadow-2xs">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="size-2.5 rounded-full bg-emerald-500 animate-pulse" />
              <span className="text-xs font-extrabold text-slate-900 dark:text-slate-100">
                1. Pickup Schedule
              </span>
            </div>
            <Badge variant="outline" className="bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300 border-emerald-200 text-[11px] font-semibold truncate max-w-[180px] gap-1">
              <MapPin className="w-3 h-3 shrink-0" />
              <span className="truncate">{pickupLocationName || 'Origin'}</span>
            </Badge>
          </div>

          <TripScheduleSelector
            tone="pickup"
            label="Scheduled Pickup Time"
            value={pickupTime}
            onChange={onPickupTimeChange}
            placeholder="Select pickup date and time"
          />
        </Card>

        {/* Dropoff Schedule Card */}
        <Card className="rounded-2xl border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900 p-4 space-y-3 shadow-2xs">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="size-2.5 rounded-full bg-orange-500 animate-pulse" />
              <span className="text-xs font-extrabold text-slate-900 dark:text-slate-100">
                2. Delivery Target Window
              </span>
            </div>
            <Badge variant="outline" className="bg-orange-50 text-[#E8450F] dark:bg-orange-950/40 dark:text-orange-300 border-orange-200 text-[11px] font-semibold truncate max-w-[180px] gap-1">
              <MapPin className="w-3 h-3 shrink-0" />
              <span className="truncate">{dropoffLocationName || 'Destination'}</span>
            </Badge>
          </div>

          <TripScheduleSelector
            tone="dropoff"
            label="Scheduled Delivery Time"
            value={dropoffTime}
            onChange={onDropoffTimeChange}
            placeholder="Select target delivery date and time"
            onApplyOffset={onApplyDropoffOffset}
          />
        </Card>
      </div>

      {/* Transit Timeline Summary Card */}
      {transitInfo && (
        <Card className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-linear-to-r from-slate-50 via-white to-slate-50 dark:from-slate-900 dark:via-slate-900/90 dark:to-slate-900 p-3.5 shadow-2xs">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3 text-xs">
            <div className="flex items-center gap-3">
              <div className="size-8 rounded-xl bg-indigo-50 dark:bg-indigo-950/60 border border-indigo-200/80 dark:border-indigo-800 flex items-center justify-center text-indigo-600 shrink-0">
                <Clock className="size-4" />
              </div>
              <div>
                <span className="font-extrabold text-slate-900 dark:text-slate-100 block">
                  Transit SLA Window &amp; Estimated Duration
                </span>
                <span className="text-[11px] text-slate-500 dark:text-slate-400 block">
                  Calculated arrival duration from origin pickup to destination delivery
                </span>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <Badge
                className={cn(
                  'font-extrabold text-xs px-3 py-1.5 rounded-xl border shadow-2xs',
                  transitInfo.isInvalid
                    ? 'bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-200 border-rose-300'
                    : transitInfo.isTight
                    ? 'bg-amber-100 text-amber-900 dark:bg-amber-950 dark:text-amber-200 border-amber-300'
                    : 'bg-emerald-100 text-emerald-900 dark:bg-emerald-950 dark:text-emerald-200 border-emerald-300'
                )}
              >
                {transitInfo.isInvalid ? '⚠️ Invalid Schedule (Delivery before pickup)' : `⏱️ ${transitInfo.durationString}`}
              </Badge>
            </div>
          </div>
        </Card>
      )}
    </div>
  );
}
