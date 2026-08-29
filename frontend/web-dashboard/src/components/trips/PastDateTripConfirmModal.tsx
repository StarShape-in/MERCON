import React, { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { AlertCircle, CalendarDays, CheckCircle2, Truck, FileText, Info } from 'lucide-react';
import { PastDateAnalysis } from '@/utils/pastDateTripUtils';
import { TripStatus } from '@/services/tripService';

interface PastDateTripConfirmModalProps {
  open: boolean;
  onClose: () => void;
  onConfirm: (selectedStatus: TripStatus) => void;
  analysis: PastDateAnalysis | null;
  isSubmitting?: boolean;
}

export default function PastDateTripConfirmModal({
  open,
  onClose,
  onConfirm,
  analysis,
  isSubmitting = false,
}: PastDateTripConfirmModalProps) {
  const [selectedStatus, setSelectedStatus] = useState<TripStatus>('Completed');

  if (!analysis || !analysis.hasPastTrips) return null;

  const { pastTripsCount, totalTripsCount, hasOlderThanYesterday, oldestPastDate, samplePastDate } = analysis;

  const handleConfirm = () => {
    // Safety check: if older than yesterday, force status away from InTransit if somehow selected
    let statusToApply = selectedStatus;
    if (hasOlderThanYesterday && statusToApply === 'InTransit') {
      statusToApply = 'Completed';
    }
    onConfirm(statusToApply);
  };

  return (
    <Dialog open={open} onOpenChange={(val) => { if (!val && !isSubmitting) onClose(); }}>
      <DialogContent className="sm:max-w-[540px] p-0 overflow-hidden border-slate-200 dark:border-slate-800 shadow-2xl rounded-2xl bg-white dark:bg-slate-900">
        {/* Header Banner */}
        <div className="bg-amber-50 dark:bg-amber-950/40 border-b border-amber-200/80 dark:border-amber-900/50 p-6">
          <div className="flex items-start gap-4">
            <AlertCircle className="w-7 h-7 text-amber-600 shrink-0" />
            <div>
              <div className="flex items-center gap-2 mb-1">
                <DialogTitle className="text-lg font-bold text-amber-900 dark:text-amber-200">
                  Previous Date Trips Confirmation
                </DialogTitle>
                <Badge className="bg-amber-100 text-amber-800 border-amber-300 font-semibold text-[11px]">
                  Action Required
                </Badge>
              </div>
              <DialogDescription className="text-xs text-amber-800/90 dark:text-amber-300/80 leading-relaxed">
                {pastTripsCount === 1 ? (
                  <>You are creating 1 trip for a previous date (<strong>{samplePastDate}</strong>). </>
                ) : (
                  <>You are creating <strong>{pastTripsCount}</strong> trip(s) for previous dates (out of {totalTripsCount} total). </>
                )}
                Because these dates have already passed, trips <strong>can never be set as Scheduled</strong>. Please confirm their actual status.
              </DialogDescription>
            </div>
          </div>
        </div>

        {/* Form Content */}
        <div className="p-6 space-y-5">
          {hasOlderThanYesterday && (
            <div className="flex items-start gap-2.5 p-3 rounded-xl bg-slate-100 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/60 text-xs text-slate-700 dark:text-slate-300">
              <Info className="w-4 h-4 text-indigo-500 shrink-0 mt-0.5" />
              <div>
                <strong>Date restriction applied:</strong> Dates older than 1 day ago (e.g., <strong>{oldestPastDate}</strong>) cannot be set to <em>In Transit</em>. They will be marked as <strong>Completed</strong>.
              </div>
            </div>
          )}

          <div className="space-y-2.5">
            <label className="text-xs font-bold text-slate-700 dark:text-slate-300 tracking-wide uppercase">
              Select Status for Previous Date Trips
            </label>

            <div className="grid gap-3">
              {/* Completed Option */}
              <div
                onClick={() => setSelectedStatus('Completed')}
                className={`p-4 rounded-xl border-2 cursor-pointer transition-all flex items-start gap-3.5 ${
                  selectedStatus === 'Completed'
                    ? 'border-emerald-500 bg-emerald-50/50 dark:bg-emerald-950/20 shadow-sm'
                    : 'border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700'
                }`}
              >
                <div className={`mt-0.5 w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0 ${
                  selectedStatus === 'Completed' ? 'border-emerald-600 bg-emerald-600' : 'border-slate-300 dark:border-slate-600'
                }`}>
                  {selectedStatus === 'Completed' && <div className="w-2 h-2 rounded-full bg-white" />}
                </div>
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                    <span className="text-sm font-bold text-slate-900 dark:text-slate-100">Completed</span>
                    <Badge className="bg-emerald-100 text-emerald-700 border-emerald-200 text-[10px] py-0">Recommended</Badge>
                  </div>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                    The trip was already executed on that date and is finished. Ready for settlement.
                  </p>
                </div>
              </div>

              {/* In Transit Option */}
              <div
                onClick={() => {
                  if (!hasOlderThanYesterday) setSelectedStatus('InTransit');
                }}
                className={`p-4 rounded-xl border-2 transition-all flex items-start gap-3.5 ${
                  hasOlderThanYesterday
                    ? 'opacity-50 border-slate-200 dark:border-slate-800 cursor-not-allowed bg-slate-50 dark:bg-slate-900/50'
                    : selectedStatus === 'InTransit'
                    ? 'border-blue-500 bg-blue-50/50 dark:bg-blue-950/20 shadow-sm cursor-pointer'
                    : 'border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700 cursor-pointer'
                }`}
              >
                <div className={`mt-0.5 w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0 ${
                  selectedStatus === 'InTransit' ? 'border-blue-600 bg-blue-600' : 'border-slate-300 dark:border-slate-600'
                }`}>
                  {selectedStatus === 'InTransit' && <div className="w-2 h-2 rounded-full bg-white" />}
                </div>
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <Truck className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                    <span className="text-sm font-bold text-slate-900 dark:text-slate-100">In Transit</span>
                    {hasOlderThanYesterday ? (
                      <Badge variant="outline" className="text-[10px] py-0 text-slate-400 border-slate-300">
                        Not allowed for older dates (&gt;1 day ago)
                      </Badge>
                    ) : (
                      <Badge className="bg-blue-100 text-blue-700 border-blue-200 text-[10px] py-0">Yesterday Only</Badge>
                    )}
                  </div>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                    Trip started yesterday or overnight and is currently active on the road.
                  </p>
                </div>
              </div>

              {/* Draft Option */}
              <div
                onClick={() => setSelectedStatus('Draft')}
                className={`p-4 rounded-xl border-2 cursor-pointer transition-all flex items-start gap-3.5 ${
                  selectedStatus === 'Draft'
                    ? 'border-indigo-500 bg-indigo-50/50 dark:bg-indigo-950/20 shadow-sm'
                    : 'border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700'
                }`}
              >
                <div className={`mt-0.5 w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0 ${
                  selectedStatus === 'Draft' ? 'border-indigo-600 bg-indigo-600' : 'border-slate-300 dark:border-slate-600'
                }`}>
                  {selectedStatus === 'Draft' && <div className="w-2 h-2 rounded-full bg-white" />}
                </div>
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <FileText className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
                    <span className="text-sm font-bold text-slate-900 dark:text-slate-100">Draft</span>
                  </div>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                    Save as un-dispatched draft record for review.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="p-4 bg-slate-50 dark:bg-slate-900/80 border-t border-slate-200 dark:border-slate-800 flex items-center justify-end gap-3">
          <Button
            type="button"
            variant="outline"
            onClick={onClose}
            disabled={isSubmitting}
            className="rounded-xl border-slate-300 dark:border-slate-700"
          >
            Cancel Creation
          </Button>
          <Button
            type="button"
            onClick={handleConfirm}
            disabled={isSubmitting}
            className="rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-semibold shadow-md shadow-indigo-500/20"
          >
            {isSubmitting ? 'Creating Trips...' : 'Confirm Status & Create Trips'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
