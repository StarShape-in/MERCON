import { User as UserIcon, FolderCog } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from './dialog';

interface CreateFolderChoiceModalProps {
  isOpen: boolean;
  onClose: () => void;
  onChooseOwner: () => void;
  onChooseGeneral: () => void;
}

/**
 * "Create Folder" is not one workflow — a Driver/Vehicle already has a
 * document folder implicitly (see OwnerFolderDetail), so choosing "Owner
 * Folder" here just opens that existing folder rather than creating a new
 * Folder record. Only "General Folder" creates a real Folder row, for
 * documents that don't belong to a single Driver/Vehicle (Company, Operations…).
 */
export default function CreateFolderChoiceModal({ isOpen, onClose, onChooseOwner, onChooseGeneral }: CreateFolderChoiceModalProps) {
  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="w-full max-w-md rounded-2xl p-0 border-slate-200 dark:border-slate-800 shadow-xl overflow-hidden">
        <DialogHeader className="px-6 py-4 border-b border-slate-100 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-900">
          <DialogTitle className="text-base font-extrabold text-slate-900 dark:text-slate-100">Create Folder</DialogTitle>
        </DialogHeader>
        <div className="p-6 grid grid-cols-1 sm:grid-cols-2 gap-3">
          <button
            onClick={onChooseOwner}
            className="p-4 rounded-2xl border border-slate-200 dark:border-slate-700 hover:border-brand hover:bg-brand-light/40 dark:hover:bg-brand/10 text-left transition-all"
          >
            <UserIcon className="w-6 h-6 text-brand mb-3" />
            <h4 className="text-xs font-extrabold text-slate-900 dark:text-slate-100">Owner Folder</h4>
            <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1">
              Open a Driver's or Vehicle's own document folder — already exists automatically, no setup needed.
            </p>
          </button>
          <button
            onClick={onChooseGeneral}
            className="p-4 rounded-2xl border border-slate-200 dark:border-slate-700 hover:border-brand hover:bg-brand-light/40 dark:hover:bg-brand/10 text-left transition-all"
          >
            <FolderCog className="w-6 h-6 text-slate-600 dark:text-slate-300 mb-3" />
            <h4 className="text-xs font-extrabold text-slate-900 dark:text-slate-100">General Folder</h4>
            <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1">
              A new organizational folder for documents not owned by one Driver/Vehicle — Company, Operations, Contracts…
            </p>
          </button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
