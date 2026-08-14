import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { reportBuilderService, ReportQuerySpec } from '@/services/reportBuilderService';

interface SaveReportModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  spec: ReportQuerySpec;
  visualization?: string;
  onSaved?: () => void;
}

export const SaveReportModal: React.FC<SaveReportModalProps> = ({
  open,
  onOpenChange,
  spec,
  visualization = 'table',
  onSaved,
}) => {
  const [name, setName] = useState('');
  const [category, setCategory] = useState('Operations');
  const [isTemplate, setIsTemplate] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    setSaving(true);
    setError(null);
    try {
      await reportBuilderService.saveReport({
        name: name.trim(),
        category,
        spec,
        visualization,
        isTemplate,
      });
      onOpenChange(false);
      setName('');
      if (onSaved) onSaved();
    } catch (err: any) {
      setError(err?.response?.data?.error?.message || err.message || 'Failed to save report');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="text-lg font-bold text-slate-900">Save Report Configuration</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSave} className="space-y-4 py-2">
          {error && (
            <div className="p-3 text-xs bg-red-50 text-red-600 border border-red-200 rounded-xl">
              {error}
            </div>
          )}

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Report Name *</label>
            <Input
              type="text"
              required
              placeholder="e.g. Monthly Driver Revenue & Performance"
              className="text-xs bg-white border-slate-300"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Category</label>
            <select
              className="w-full text-xs bg-white border border-slate-300 rounded-xl px-3 py-2 focus:outline-none focus:border-[#E8450F]"
              value={category}
              onChange={(e) => setCategory(e.target.value)}
            >
              <option value="Operations">Operations</option>
              <option value="Drivers">Drivers</option>
              <option value="Vehicles">Vehicles</option>
              <option value="Finance">Finance</option>
              <option value="Customers">Customers</option>
              <option value="Custom">Custom</option>
            </select>
          </div>

          <div className="flex items-center gap-2 pt-1">
            <input
              type="checkbox"
              id="isTemplate"
              className="rounded border-slate-300 text-[#E8450F] focus:ring-[#E8450F]"
              checked={isTemplate}
              onChange={(e) => setIsTemplate(e.target.checked)}
            />
            <label htmlFor="isTemplate" className="text-xs font-medium text-slate-700 select-none">
              Save as reusable report template
            </label>
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
              disabled={saving || !name.trim()}
              className="text-xs font-semibold bg-[#E8450F] hover:bg-[#c43809] text-white shadow-2xs"
            >
              {saving ? 'Saving...' : 'Save Report'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};
