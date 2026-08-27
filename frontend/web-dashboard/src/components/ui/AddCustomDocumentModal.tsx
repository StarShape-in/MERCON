import { useState } from 'react';
import { Plus, FilePlus, Loader2, AlertCircle } from 'lucide-react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { documentTypeService, DocOwnerType } from '@/services/documentTypeService';
import Btn from './Btn';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from './dialog';
import { toast } from 'sonner';

interface AddCustomDocumentModalProps {
  isOpen: boolean;
  onClose: () => void;
  ownerType: DocOwnerType | string;
  onSuccess?: () => void;
}

export default function AddCustomDocumentModal({
  isOpen,
  onClose,
  ownerType,
  onSuccess,
}: AddCustomDocumentModalProps) {
  const queryClient = useQueryClient();

  const [name, setName] = useState('');
  const [isRequired, setIsRequired] = useState(true);
  const [hasExpiry, setHasExpiry] = useState(true);
  const [description, setDescription] = useState('');
  const [error, setError] = useState<string | null>(null);

  const normalizedOwnerType: DocOwnerType =
    ownerType === 'vehicles' || ownerType === 'Vehicle'
      ? 'Vehicle'
      : ownerType === 'drivers' || ownerType === 'Driver'
      ? 'Driver'
      : 'Vehicle';

  const createMutation = useMutation({
    mutationFn: async () => {
      const code = `CUSTOM_${name.toUpperCase().replace(/[^A-Z0-9]/g, '_')}_${Date.now().toString().slice(-4)}`;
      return documentTypeService.create({
        name: name.trim(),
        code,
        ownerType: normalizedOwnerType,
        requirementStatus: isRequired ? 'MANDATORY' : 'OPTIONAL',
        requiresExpiryDate: hasExpiry,
        requiresIssueDate: false,
        description: description.trim() || null,
        allowsMultipleFiles: true,
        allowedFileTypes: ['pdf', 'jpg', 'png', 'webp'],
      });
    },
    onSuccess: () => {
      toast.success(`Custom requirement "${name}" created successfully`);
      queryClient.invalidateQueries({ queryKey: ['documents'] });
      queryClient.invalidateQueries({ queryKey: ['document-types'] });
      if (onSuccess) onSuccess();
      handleClose();
    },
    onError: (err: any) => {
      setError(err.response?.data?.error?.message || err.message || 'Failed to create document requirement');
    },
  });

  const handleClose = () => {
    setName('');
    setIsRequired(true);
    setHasExpiry(true);
    setDescription('');
    setError(null);
    onClose();
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setError('Please enter a document name.');
      return;
    }
    createMutation.mutate();
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && handleClose()}>
      <DialogContent className="w-full max-w-md rounded-2xl p-0 border-slate-200 dark:border-slate-800 shadow-xl overflow-hidden flex flex-col">
        <DialogHeader className="px-6 py-4 border-b border-slate-100 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-900 m-0">
          <DialogTitle className="text-base font-extrabold text-slate-900 dark:text-slate-100 flex items-center gap-2">
            <FilePlus className="w-4 h-4 text-brand" /> Add Document Requirement
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div>
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
              Document Name
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => {
                setName(e.target.value);
                setError(null);
              }}
              placeholder="e.g. Special Route Permit, Hazard Clearance"
              className="w-full h-9 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3 text-xs font-semibold outline-none focus:ring-2 focus:ring-brand/30"
              autoFocus
            />
          </div>

          <div className="grid grid-cols-2 gap-4 pt-1">
            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                Requirement Level
              </label>
              <div className="space-y-1.5">
                <label className="flex items-center gap-2 cursor-pointer text-xs font-medium text-slate-700 dark:text-slate-300">
                  <input
                    type="radio"
                    name="required"
                    checked={isRequired}
                    onChange={() => setIsRequired(true)}
                    className="text-brand focus:ring-brand"
                  />
                  <span>Required</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer text-xs font-medium text-slate-700 dark:text-slate-300">
                  <input
                    type="radio"
                    name="required"
                    checked={!isRequired}
                    onChange={() => setIsRequired(false)}
                    className="text-brand focus:ring-brand"
                  />
                  <span>Optional</span>
                </label>
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                Has Expiry Date?
              </label>
              <div className="space-y-1.5">
                <label className="flex items-center gap-2 cursor-pointer text-xs font-medium text-slate-700 dark:text-slate-300">
                  <input
                    type="radio"
                    name="hasExpiry"
                    checked={hasExpiry}
                    onChange={() => setHasExpiry(true)}
                    className="text-brand focus:ring-brand"
                  />
                  <span>Yes</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer text-xs font-medium text-slate-700 dark:text-slate-300">
                  <input
                    type="radio"
                    name="hasExpiry"
                    checked={!hasExpiry}
                    onChange={() => setHasExpiry(false)}
                    className="text-brand focus:ring-brand"
                  />
                  <span>No</span>
                </label>
              </div>
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
              Description <span className="font-normal text-slate-400">(Optional)</span>
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Operational context, issuing authority or compliance notes..."
              rows={3}
              className="w-full bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-3 text-xs font-medium outline-none focus:ring-2 focus:ring-brand/30"
            />
          </div>

          {error && (
            <div className="flex items-start gap-2 p-3 bg-rose-50 text-rose-600 rounded-xl text-xs">
              <AlertCircle size={14} className="mt-0.5 shrink-0" />
              <p>{error}</p>
            </div>
          )}

          <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100 dark:border-slate-800">
            <Btn label="Cancel" variant="outline" onClick={handleClose} disabled={createMutation.isPending} />
            <Btn
              label="Add Document"
              onClick={handleSubmit}
              disabled={createMutation.isPending}
              icon={createMutation.isPending ? <Loader2 size={16} className="animate-spin" /> : <Plus size={16} />}
            />
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
