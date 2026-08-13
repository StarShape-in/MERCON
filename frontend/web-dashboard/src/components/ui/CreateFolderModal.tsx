import { useState } from 'react';
import { FolderPlus, Loader2 } from 'lucide-react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { folderService, CreateFolderPayload } from '@/services/folderService';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from './dialog';
import { Button } from './button';

interface CreateFolderModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

const COLOR_OPTIONS = [
  { label: 'Brand Orange', hex: '#E8450F' },
  { label: 'Royal Blue', hex: '#2563EB' },
  { label: 'Emerald Green', hex: '#059669' },
  { label: 'Purple Violet', hex: '#7C3AED' },
  { label: 'Amber Gold', hex: '#D97706' },
  { label: 'Slate Gray', hex: '#475569' },
];

const CATEGORY_OPTIONS = ['Drivers', 'Vehicles', 'Operations', 'Company', 'General'];

export default function CreateFolderModal({ isOpen, onClose, onSuccess }: CreateFolderModalProps) {
  const queryClient = useQueryClient();
  const [name, setName] = useState('');
  const [category, setCategory] = useState('General');
  const [description, setDescription] = useState('');
  const [selectedColor, setSelectedColor] = useState('#E8450F');
  const [error, setError] = useState<string | null>(null);

  const createMutation = useMutation({
    mutationFn: (payload: CreateFolderPayload) => folderService.create(payload),
    onSuccess: () => {
      toast.success('Folder created successfully');
      queryClient.invalidateQueries({ queryKey: ['folders'] });
      queryClient.invalidateQueries({ queryKey: ['documents'] });
      if (onSuccess) onSuccess();
      handleClose();
    },
    onError: (err: any) => {
      setError(err.response?.data?.error?.message || err.message || 'Failed to create folder');
    }
  });

  const handleClose = () => {
    setName('');
    setCategory('General');
    setDescription('');
    setSelectedColor('#E8450F');
    setError(null);
    onClose();
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setError('Please enter a folder name');
      return;
    }
    createMutation.mutate({
      name: name.trim(),
      category,
      description: description.trim() || undefined,
      color: selectedColor
    });
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && !createMutation.isPending && handleClose()}>
      <DialogContent className="w-full max-w-md rounded-2xl p-0 border-slate-200 dark:border-slate-800 shadow-xl overflow-hidden">
        <DialogHeader className="px-6 py-4 border-b border-slate-100 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-900">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-[#FFF0EB] dark:bg-[#E8450F]/10 flex items-center justify-center text-[#E8450F]">
              <FolderPlus className="w-5 h-5" />
            </div>
            <DialogTitle className="text-base font-extrabold text-slate-900 dark:text-slate-100">
              Create New Folder
            </DialogTitle>
          </div>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {error && (
            <div className="p-3 text-xs text-rose-600 bg-rose-50 dark:bg-rose-950/30 rounded-xl border border-rose-200 dark:border-rose-800">
              {error}
            </div>
          )}

          {/* Folder Name */}
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
              Folder Name <span className="text-rose-500">*</span>
            </label>
            <input
              type="text"
              required
              placeholder="e.g. Q3 Transport Licenses"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full h-9 px-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs font-semibold text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-[#E8450F]/30"
            />
          </div>

          {/* Category Selector */}
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
              Module Category
            </label>
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              className="w-full h-9 px-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs font-semibold text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-[#E8450F]/30"
            >
              {CATEGORY_OPTIONS.map((cat) => (
                <option key={cat} value={cat}>{cat} Category</option>
              ))}
            </select>
          </div>

          {/* Description */}
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
              Description <span className="text-slate-400 font-normal">(Optional)</span>
            </label>
            <textarea
              rows={2}
              placeholder="Brief description of stored documents..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full p-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-[#E8450F]/30 resize-none"
            />
          </div>

          {/* Color tag */}
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
              Folder Color Tag
            </label>
            <div className="flex items-center gap-2">
              {COLOR_OPTIONS.map((c) => (
                <button
                  type="button"
                  key={c.hex}
                  onClick={() => setSelectedColor(c.hex)}
                  className={`w-7 h-7 rounded-full border-2 transition-transform ${
                    selectedColor === c.hex ? 'scale-110 border-slate-900 dark:border-white shadow-xs' : 'border-transparent opacity-80 hover:opacity-100'
                  }`}
                  style={{ backgroundColor: c.hex }}
                  title={c.label}
                />
              ))}
            </div>
          </div>

          <DialogFooter className="pt-4 border-t border-slate-100 dark:border-slate-800 flex justify-end gap-2">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={handleClose}
              disabled={createMutation.isPending}
              className="text-xs"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              size="sm"
              disabled={createMutation.isPending}
              className="bg-[#E8450F] hover:bg-[#d03d0c] text-white text-xs font-bold gap-1.5 px-4"
            >
              {createMutation.isPending ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" /> Creating...
                </>
              ) : (
                'Create Folder'
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
