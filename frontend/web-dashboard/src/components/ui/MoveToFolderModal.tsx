import { useState } from 'react';
import { FolderInput, Loader2, Check } from 'lucide-react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { folderService, MerconFolder } from '@/services/folderService';
import { documentService } from '@/services/documentService';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from './dialog';
import { Button } from './button';

interface MoveToFolderModalProps {
  isOpen: boolean;
  onClose: () => void;
  documentIds: string[];
  onSuccess?: () => void;
}

export default function MoveToFolderModal({ isOpen, onClose, documentIds, onSuccess }: MoveToFolderModalProps) {
  const queryClient = useQueryClient();
  const [selectedFolderId, setSelectedFolderId] = useState<string | 'root'>('root');
  const [error, setError] = useState<string | null>(null);

  const { data: folders = [], isLoading } = useQuery({
    queryKey: ['folders'],
    queryFn: async () => (await folderService.getAll()).data,
    enabled: isOpen,
  });

  const moveMutation = useMutation({
    mutationFn: () => documentService.bulkMoveToFolder(
      documentIds,
      selectedFolderId === 'root' ? null : selectedFolderId
    ),
    onSuccess: () => {
      toast.success(`Successfully moved ${documentIds.length} document(s)`);
      queryClient.invalidateQueries({ queryKey: ['documents'] });
      queryClient.invalidateQueries({ queryKey: ['folders'] });
      if (onSuccess) onSuccess();
      handleClose();
    },
    onError: (err: any) => {
      setError(err.response?.data?.error?.message || err.message || 'Failed to move documents');
    }
  });

  const handleClose = () => {
    setSelectedFolderId('root');
    setError(null);
    onClose();
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (documentIds.length === 0) return;
    moveMutation.mutate();
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && !moveMutation.isPending && handleClose()}>
      <DialogContent className="w-full max-w-md rounded-2xl p-0 border-slate-200 dark:border-slate-800 shadow-xl overflow-hidden">
        <DialogHeader className="px-6 py-4 border-b border-slate-100 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-900">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-indigo-50 dark:bg-indigo-950/30 flex items-center justify-center text-indigo-600 border border-indigo-200/50">
              <FolderInput className="w-5 h-5" />
            </div>
            <div>
              <DialogTitle className="text-base font-extrabold text-slate-900 dark:text-slate-100">
                Move {documentIds.length} Document{documentIds.length !== 1 ? 's' : ''} to Folder
              </DialogTitle>
              <p className="text-xs text-slate-400 font-medium">Select a destination folder</p>
            </div>
          </div>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {error && (
            <div className="p-3 text-xs text-rose-600 bg-rose-50 dark:bg-rose-950/30 rounded-xl border border-rose-200 dark:border-rose-800">
              {error}
            </div>
          )}

          <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
            {/* Root / Unassigned Option */}
            <div
              onClick={() => setSelectedFolderId('root')}
              className={`p-3 rounded-xl border transition-all cursor-pointer flex items-center justify-between ${
                selectedFolderId === 'root'
                  ? 'border-[#E8450F] bg-[#FFF0EB]/40 dark:bg-[#E8450F]/10'
                  : 'border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 hover:border-slate-300'
              }`}
            >
              <div className="flex items-center gap-3">
                <div className="w-3 h-3 rounded-full bg-slate-400" />
                <div className="flex flex-col">
                  <span className="text-xs font-bold text-slate-900 dark:text-slate-100">No Folder (Root Ledger)</span>
                  <span className="text-[10px] text-slate-400">Keep file in unassigned root vault</span>
                </div>
              </div>
              {selectedFolderId === 'root' && <Check className="w-4 h-4 text-[#E8450F]" />}
            </div>

            {isLoading ? (
              <div className="py-8 text-center text-xs text-slate-400">Loading target folders...</div>
            ) : folders.length === 0 ? (
              <div className="py-4 text-center text-xs text-slate-400">No custom folders created yet.</div>
            ) : (
              folders.map((folder: MerconFolder) => {
                const isSelected = selectedFolderId === folder.id;
                return (
                  <div
                    key={folder.id}
                    onClick={() => setSelectedFolderId(folder.id)}
                    className={`p-3 rounded-xl border transition-all cursor-pointer flex items-center justify-between ${
                      isSelected
                        ? 'border-[#E8450F] bg-[#FFF0EB]/40 dark:bg-[#E8450F]/10'
                        : 'border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 hover:border-slate-300'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <div
                        className="w-3 h-3 rounded-full shrink-0"
                        style={{ backgroundColor: folder.color || '#E8450F' }}
                      />
                      <div className="flex flex-col min-w-0">
                        <span className="text-xs font-bold text-slate-900 dark:text-slate-100 truncate">{folder.name}</span>
                        <span className="text-[10px] text-slate-400 font-medium">{folder.category || 'General'} Category • {folder.document_count || 0} files</span>
                      </div>
                    </div>
                    {isSelected && <Check className="w-4 h-4 text-[#E8450F] shrink-0" />}
                  </div>
                );
              })
            )}
          </div>

          <DialogFooter className="pt-4 border-t border-slate-100 dark:border-slate-800 flex justify-end gap-2">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={handleClose}
              disabled={moveMutation.isPending}
              className="text-xs"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              size="sm"
              disabled={moveMutation.isPending || documentIds.length === 0}
              className="bg-[#E8450F] hover:bg-[#d03d0c] text-white text-xs font-bold gap-1.5 px-4"
            >
              {moveMutation.isPending ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" /> Moving...
                </>
              ) : (
                'Move to Folder'
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
