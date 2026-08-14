import { useState } from 'react';
import { FolderCheck, UploadCloud, CheckCircle2, AlertTriangle, Loader2, Truck, FileText } from 'lucide-react';
import { useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { documentService } from '@/services/documentService';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from './dialog';
import { Button } from './button';
import { Input } from './input';
import { Badge } from './badge';

interface BatchVehicleDocModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

export default function BatchVehicleDocModal({
  isOpen,
  onClose,
  onSuccess,
}: BatchVehicleDocModalProps) {
  const queryClient = useQueryClient();
  const [folderPath, setFolderPath] = useState('C:\\Users\\ILAN\\Downloads\\Trucks Docs\\Trucks Docs');
  const [isLoading, setIsLoading] = useState(false);
  const [result, setResult] = useState<any | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleImport = async () => {
    if (!folderPath.trim()) return;
    setIsLoading(true);
    setError(null);
    setResult(null);

    try {
      const res = await documentService.batchImportTruckDocs(folderPath.trim());
      setResult(res.data);
      toast.success(res.message || 'Successfully imported truck documents!');
      await queryClient.invalidateQueries({ queryKey: ['documents'] });
      await queryClient.invalidateQueries({ queryKey: ['vehicles'] });
      await queryClient.invalidateQueries({ queryKey: ['folders'] });
      if (onSuccess) onSuccess();
    } catch (err: any) {
      const msg = err.response?.data?.error?.message || err.message || 'Failed to batch import truck docs';
      setError(msg);
      toast.error(msg);
    } finally {
      setIsLoading(false);
    }
  };

  const handleClose = () => {
    setResult(null);
    setError(null);
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && handleClose()}>
      <DialogContent className="max-w-xl rounded-2xl p-0 overflow-hidden border-slate-200 dark:border-slate-800">
        <DialogHeader className="px-6 py-4 border-b border-slate-100 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-900">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-[#FFF0EB] dark:bg-[#E8450F]/10 flex items-center justify-center text-[#E8450F] shrink-0 border border-[#E8450F]/20">
              <Truck className="w-5 h-5" />
            </div>
            <div>
              <DialogTitle className="text-base font-extrabold text-slate-900 dark:text-slate-100">
                Batch Import Truck Documents
              </DialogTitle>
              <DialogDescription className="text-xs text-slate-500 mt-0.5">
                Auto-matches vehicle folders (e.g. 2541, 3071) and assigns Istimara, Fahas & Insurance files directly to vehicles.
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <div className="p-6 space-y-5">
          {/* Target Folder Input */}
          <div className="space-y-2">
            <label className="text-xs font-bold text-slate-700 dark:text-slate-300 flex items-center justify-between">
              <span>Local Machine Directory Path</span>
              <Badge variant="outline" className="text-[10px] bg-slate-100 text-slate-600 font-mono">
                31 Vehicle Subfolders Detected
              </Badge>
            </label>
            <Input
              type="text"
              value={folderPath}
              onChange={(e) => setFolderPath(e.target.value)}
              placeholder="C:\Users\ILAN\Downloads\Trucks Docs\Trucks Docs"
              disabled={isLoading}
              className="text-xs font-mono bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700"
            />
            <p className="text-[11px] text-slate-400">
              Inside this directory, each subfolder name (e.g. <span className="font-mono text-slate-600 dark:text-slate-300 font-bold">2541</span>) is automatically linked to that vehicle&apos;s plate number.
            </p>
          </div>

          {/* Error Alert */}
          {error && (
            <div className="p-3.5 rounded-xl bg-rose-50 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-800 text-xs text-rose-600 flex items-start gap-2">
              <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          {/* Results Summary Box */}
          {result && (
            <div className="p-4 rounded-2xl bg-emerald-50/70 dark:bg-emerald-950/30 border border-emerald-200/80 dark:border-emerald-800/60 space-y-3 animate-fade-in">
              <div className="flex items-center gap-2 text-emerald-800 dark:text-emerald-300 font-bold text-xs">
                <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                <span>Import Completed Successfully!</span>
              </div>

              <div className="grid grid-cols-3 gap-3 text-center">
                <div className="bg-white dark:bg-slate-800 p-2.5 rounded-xl border border-emerald-100 dark:border-slate-700">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Folders</span>
                  <span className="text-base font-extrabold font-mono text-slate-900 dark:text-slate-100">{result.totalFoldersScanned}</span>
                </div>

                <div className="bg-white dark:bg-slate-800 p-2.5 rounded-xl border border-emerald-100 dark:border-slate-700">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Vehicles</span>
                  <span className="text-base font-extrabold font-mono text-indigo-600">{result.totalVehiclesProcessed}</span>
                </div>

                <div className="bg-white dark:bg-slate-800 p-2.5 rounded-xl border border-emerald-100 dark:border-slate-700">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Documents</span>
                  <span className="text-base font-extrabold font-mono text-[#E8450F]">{result.totalDocsCreated}</span>
                </div>
              </div>

              {/* Scrollable details list */}
              {result.details && result.details.length > 0 && (
                <div className="max-h-40 overflow-y-auto space-y-1.5 pr-1 border-t border-emerald-200/50 dark:border-emerald-800/50 pt-2">
                  <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">Assigned Documents per Vehicle:</span>
                  {result.details.map((item: any) => (
                    <div key={item.folder} className="flex items-center justify-between text-xs py-1 px-2 rounded-lg bg-white/80 dark:bg-slate-800/80 border border-slate-100 dark:border-slate-700">
                      <span className="font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                        <Truck size={12} className="text-slate-400" />
                        <span>Vehicle #{item.vehiclePlate}</span>
                      </span>
                      <span className="font-mono text-[11px] font-extrabold bg-indigo-50 text-indigo-700 px-2 py-0.5 rounded-md">
                        {item.docsCount} files attached
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        <DialogFooter className="px-6 py-3 border-t border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900 flex items-center justify-between">
          <Button variant="ghost" size="sm" onClick={handleClose} disabled={isLoading} className="text-xs">
            {result ? 'Close' : 'Cancel'}
          </Button>

          <Button
            size="sm"
            onClick={handleImport}
            disabled={isLoading || !folderPath.trim()}
            className="text-xs bg-[#E8450F] hover:bg-[#d03d0c] text-white font-bold shadow-xs gap-1.5 px-4"
          >
            {isLoading ? (
              <>
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                <span>Importing & Assigning...</span>
              </>
            ) : (
              <>
                <UploadCloud className="w-4 h-4" />
                <span>Start Batch Import</span>
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
