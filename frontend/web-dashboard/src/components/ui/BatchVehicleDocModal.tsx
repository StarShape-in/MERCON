import { useState, useRef } from 'react';
import { UploadCloud, CheckCircle2, AlertTriangle, Loader2, Truck, FolderOpen, FileText, HardDrive } from 'lucide-react';
import { useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { documentService } from '@/services/documentService';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from './dialog';
import { Button } from './button';
import { Input } from './input';
import { Badge } from './badge';
import { Tabs, TabsList, TabsTrigger, TabsContent } from './tabs';

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
  const folderInputRef = useRef<HTMLInputElement>(null);

  const [activeTab, setActiveTab] = useState<'upload' | 'local'>('upload');
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [folderName, setFolderName] = useState<string>('');
  const [folderSummary, setFolderSummary] = useState<Record<string, number>>({});
  const [folderPath, setFolderPath] = useState('C:\\Users\\ILAN\\Downloads\\Trucks Docs\\Trucks Docs');
  
  const [isLoading, setIsLoading] = useState(false);
  const [result, setResult] = useState<any | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Handle native browser folder selection (webkitdirectory)
  const handleFolderSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const rawFiles = e.target.files;
    if (!rawFiles || rawFiles.length === 0) return;

    const filesArray = Array.from(rawFiles);
    // Filter out .rar / .zip files or hidden OS files
    const validFiles = filesArray.filter((file) => {
      const ext = file.name.slice(file.name.lastIndexOf('.')).toLowerCase();
      return ext !== '.rar' && ext !== '.zip' && !file.name.startsWith('.');
    });

    if (validFiles.length === 0) {
      toast.error('No valid PDF or image files found in the selected folder');
      return;
    }

    // Infer main folder name and breakdown by subfolder
    const firstRel = validFiles[0].webkitRelativePath || validFiles[0].name;
    const firstParts = firstRel.replace(/\\/g, '/').split('/');
    const rootName = firstParts.length > 1 ? firstParts[0] : 'Selected Folder';

    const summary: Record<string, number> = {};
    validFiles.forEach((file) => {
      const rel = file.webkitRelativePath || file.name;
      const parts = rel.replace(/\\/g, '/').split('/').filter(Boolean);
      let vehicleId = 'General';
      if (parts.length >= 3) {
        vehicleId = parts[1];
      } else if (parts.length === 2) {
        vehicleId = parts[0];
      }
      summary[vehicleId] = (summary[vehicleId] || 0) + 1;
    });

    setFolderName(rootName);
    setSelectedFiles(validFiles);
    setFolderSummary(summary);
    setError(null);
    setResult(null);
  };

  // Upload folder via multipart browser FormData
  const handleUploadFolder = async () => {
    if (selectedFiles.length === 0) return;
    setIsLoading(true);
    setError(null);
    setResult(null);

    try {
      const formData = new FormData();
      const relativePaths: string[] = [];

      selectedFiles.forEach((file) => {
        formData.append('files', file);
        relativePaths.push(file.webkitRelativePath || file.name);
      });

      formData.append('relative_paths', JSON.stringify(relativePaths));

      const res = await documentService.batchUploadFolder(formData);
      setResult(res.data);
      toast.success(res.message || 'Successfully uploaded and assigned vehicle documents!');
      await queryClient.invalidateQueries({ queryKey: ['documents'] });
      await queryClient.invalidateQueries({ queryKey: ['vehicles'] });
      await queryClient.invalidateQueries({ queryKey: ['folders'] });
      if (onSuccess) onSuccess();
    } catch (err: any) {
      const msg = err.response?.data?.error?.message || err.message || 'Failed to upload truck documents folder';
      setError(msg);
      toast.error(msg);
    } finally {
      setIsLoading(false);
    }
  };

  // Import directly from local server disk path
  const handleImportLocalPath = async () => {
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
    setSelectedFiles([]);
    setFolderName('');
    setFolderSummary({});
    setResult(null);
    setError(null);
    onClose();
  };

  const vehicleFoldersCount = Object.keys(folderSummary).length;

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
                Upload entire vehicle document folder structures. Auto-assigns Istimara, Fahas & Insurance directly to vehicles.
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <div className="p-6 space-y-4">
          <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as any)} className="w-full">
            <TabsList className="grid grid-cols-2 w-full bg-slate-100 dark:bg-slate-800 p-1 rounded-xl">
              <TabsTrigger value="upload" className="text-xs font-bold gap-1.5 rounded-lg">
                <FolderOpen size={14} /> Upload Folder (Browser)
              </TabsTrigger>
              <TabsTrigger value="local" className="text-xs font-bold gap-1.5 rounded-lg">
                <HardDrive size={14} /> Local Server Path
              </TabsTrigger>
            </TabsList>

            {/* TAB 1: Native Browser Folder Chooser */}
            <TabsContent value="upload" className="space-y-4 pt-3">
              <input
                type="file"
                ref={folderInputRef}
                // @ts-ignore
                webkitdirectory=""
                directory=""
                multiple
                onChange={handleFolderSelect}
                className="hidden"
              />

              <div
                onClick={() => folderInputRef.current?.click()}
                className="border-2 border-dashed border-slate-200 dark:border-slate-700 hover:border-[#E8450F] dark:hover:border-[#E8450F] bg-slate-50/60 dark:bg-slate-900/60 hover:bg-[#FFF0EB]/40 dark:hover:bg-[#E8450F]/10 rounded-2xl p-6 flex flex-col items-center justify-center cursor-pointer transition-all gap-2 text-center group"
              >
                <div className="w-12 h-12 rounded-2xl bg-white dark:bg-slate-800 shadow-2xs border border-slate-200 dark:border-slate-700 flex items-center justify-center text-[#E8450F] group-hover:scale-105 transition-transform">
                  <FolderOpen className="w-6 h-6" />
                </div>
                <div>
                  <h4 className="text-xs font-extrabold text-slate-900 dark:text-slate-100">
                    {folderName ? `Selected: ${folderName}` : 'Click to Select Truck Docs Folder'}
                  </h4>
                  <p className="text-[11px] text-slate-400 mt-0.5">
                    Select your main folder (e.g. <span className="font-mono text-slate-600 dark:text-slate-300 font-bold">Trucks Docs</span>) containing vehicle subfolders (2541, 3071, etc.)
                  </p>
                </div>

                {selectedFiles.length > 0 && (
                  <Badge variant="outline" className="bg-[#FFF0EB] text-[#E8450F] border-[#E8450F]/30 text-[10px] font-bold mt-1">
                    {selectedFiles.length} valid files across {vehicleFoldersCount} vehicle folders
                  </Badge>
                )}
              </div>

              {/* Detected vehicle folder preview */}
              {selectedFiles.length > 0 && (
                <div className="space-y-1.5 border border-slate-100 dark:border-slate-800 rounded-xl p-3 bg-slate-50/50 dark:bg-slate-900/50">
                  <div className="flex items-center justify-between text-[11px] font-bold text-slate-600 dark:text-slate-400">
                    <span>Detected Vehicle Subfolders ({vehicleFoldersCount})</span>
                    <span className="font-mono text-[#E8450F]">{selectedFiles.length} files</span>
                  </div>
                  <div className="max-h-28 overflow-y-auto space-y-1 pr-1">
                    {Object.entries(folderSummary).map(([vehId, count]) => (
                      <div key={vehId} className="flex items-center justify-between text-xs py-1 px-2.5 rounded-lg bg-white dark:bg-slate-800 border border-slate-200/60 dark:border-slate-700">
                        <span className="font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                          <Truck size={12} className="text-slate-400" />
                          <span>Vehicle #{vehId}</span>
                        </span>
                        <span className="font-mono text-[10px] font-bold bg-indigo-50 text-indigo-700 px-2 py-0.2 rounded-md">
                          {count} documents
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </TabsContent>

            {/* TAB 2: Server Local Disk Path */}
            <TabsContent value="local" className="space-y-3 pt-3">
              <div className="space-y-2">
                <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                  Server Directory Absolute Path
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
                  Path to directory on server disk containing subfolders named by vehicle plate numbers.
                </p>
              </div>
            </TabsContent>
          </Tabs>

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
                <div className="max-h-36 overflow-y-auto space-y-1.5 pr-1 border-t border-emerald-200/50 dark:border-emerald-800/50 pt-2">
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

          {activeTab === 'upload' ? (
            <Button
              size="sm"
              onClick={handleUploadFolder}
              disabled={isLoading || selectedFiles.length === 0}
              className="text-xs bg-[#E8450F] hover:bg-[#d03d0c] text-white font-bold shadow-xs gap-1.5 px-4"
            >
              {isLoading ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  <span>Uploading & Assigning...</span>
                </>
              ) : (
                <>
                  <UploadCloud className="w-4 h-4" />
                  <span>Upload & Assign ({selectedFiles.length} files)</span>
                </>
              )}
            </Button>
          ) : (
            <Button
              size="sm"
              onClick={handleImportLocalPath}
              disabled={isLoading || !folderPath.trim()}
              className="text-xs bg-[#E8450F] hover:bg-[#d03d0c] text-white font-bold shadow-xs gap-1.5 px-4"
            >
              {isLoading ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  <span>Importing...</span>
                </>
              ) : (
                <>
                  <UploadCloud className="w-4 h-4" />
                  <span>Start Server Path Import</span>
                </>
              )}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
