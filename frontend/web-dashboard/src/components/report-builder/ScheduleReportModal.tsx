import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { reportBuilderService, SavedReport } from '@/services/reportBuilderService';

interface ScheduleReportModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  savedReport?: SavedReport;
  onScheduled?: () => void;
}

export const ScheduleReportModal: React.FC<ScheduleReportModalProps> = ({
  open,
  onOpenChange,
  savedReport,
  onScheduled,
}) => {
  const [frequency, setFrequency] = useState<'daily' | 'weekly' | 'monthly'>('weekly');
  const [dayOfMonth, setDayOfMonth] = useState<number>(1);
  const [time, setTime] = useState('08:00');
  const [recipients, setRecipients] = useState('');
  const [delivery, setDelivery] = useState<string[]>(['email']);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!savedReport?.id) {
      setError('Please save the report before setting up a schedule.');
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      const emailList = recipients
        .split(',')
        .map((r) => r.trim())
        .filter(Boolean);
      await reportBuilderService.createScheduledReport({
        savedReportId: savedReport.id,
        frequency,
        dayOfMonth: frequency === 'monthly' ? dayOfMonth : null,
        time,
        recipients: emailList,
        delivery,
        isActive: true,
      });
      onOpenChange(false);
      if (onScheduled) onScheduled();
    } catch (err: any) {
      setError(err?.response?.data?.error?.message || err.message || 'Failed to create schedule');
    } finally {
      setSubmitting(false);
    }
  };

  const toggleDelivery = (method: string) => {
    if (delivery.includes(method)) {
      setDelivery(delivery.filter((d) => d !== method));
    } else {
      setDelivery([...delivery, method]);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="text-lg font-bold text-slate-900">
            Schedule Report Delivery
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 py-2">
          {error && (
            <div className="p-3 text-xs bg-red-50 text-red-600 border border-red-200 rounded-xl">
              {error}
            </div>
          )}

          <div className="text-xs bg-slate-50 p-2.5 rounded-xl border border-slate-200">
            <span className="font-semibold text-slate-700">Target Report: </span>
            <span className="text-slate-900 font-bold">{savedReport?.name || 'Unsaved Active Report'}</span>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Frequency</label>
              <select
                className="w-full text-xs bg-white border border-slate-300 rounded-xl px-3 py-2 focus:outline-none focus:border-[#E8450F]"
                value={frequency}
                onChange={(e: any) => setFrequency(e.target.value)}
              >
                <option value="daily">Daily</option>
                <option value="weekly">Weekly (Mondays)</option>
                <option value="monthly">Monthly</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Execution Time</label>
              <Input
                type="time"
                className="text-xs bg-white border-slate-300"
                value={time}
                onChange={(e) => setTime(e.target.value)}
              />
            </div>
          </div>

          {frequency === 'monthly' && (
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Day of Month</label>
              <Input
                type="number"
                min={1}
                max={28}
                className="text-xs bg-white border-slate-300"
                value={dayOfMonth}
                onChange={(e) => setDayOfMonth(Number(e.target.value))}
              />
            </div>
          )}

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Recipients (Comma-separated emails)
            </label>
            <Input
              type="text"
              placeholder="admin@mercon.com, ops@mercon.com"
              className="text-xs bg-white border-slate-300"
              value={recipients}
              onChange={(e) => setRecipients(e.target.value)}
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1.5">Delivery Channels</label>
            <div className="flex flex-wrap gap-2">
              {['email', 'dashboard', 'pdf', 'excel'].map((channel) => {
                const active = delivery.includes(channel);
                return (
                  <button
                    key={channel}
                    type="button"
                    onClick={() => toggleDelivery(channel)}
                    className={`text-xs px-3 py-1.5 rounded-lg border font-medium capitalize transition-colors cursor-pointer ${
                      active
                        ? 'bg-orange-50 text-[#E8450F] border-orange-300 font-semibold'
                        : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
                    }`}
                  >
                    {channel}
                  </button>
                );
              })}
            </div>
          </div>

          <DialogFooter className="pt-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              className="text-xs font-medium text-slate-600 hover:text-slate-900"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={submitting}
              className="text-xs font-semibold bg-[#E8450F] hover:bg-[#c43809] text-white shadow-2xs"
            >
              {submitting ? 'Saving...' : 'Save Schedule'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};
