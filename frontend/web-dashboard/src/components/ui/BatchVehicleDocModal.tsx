import { useState, useRef, useMemo } from 'react';
import { 
  UploadCloud, 
  CheckCircle2, 
  AlertTriangle, 
  Loader2, 
  Truck, 
  FolderOpen, 
  HardDrive, 
  Search, 
  FileText, 
  X, 
  Info, 
  ShieldCheck, 
  RefreshCw,
  FolderTree,
  FileCheck2
} from 'lucide-react';
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

// Canvas image compressor: reduces camera/scanner photos (8MB -> ~300KB)
async function compressFileIfNeeded(file: File, maxSizeBytes = 450 * 1024): Promise<File> {
  const isImage = file.type.startsWith('image/') || /\.(jpg|jpeg|png|webp)$/i.test(file.name);
  if (!isImage || file.size <= maxSizeBytes) {
    return file;
  }

  return new Promise((resolve) => {
    const img = new Image();
    const url = URL.createObjectURL(file);

    img.onload = () => {
      URL.revokeObjectURL(url);
      const canvas = document.createElement('canvas');
      let width = img.width;
      let height = img.height;

      const maxDim = 1600;
      if (width > maxDim || height > maxDim) {
        if (width > height) {
          height = Math.round((height * maxDim) / width);
          width = maxDim;
        } else {
          width = Math.round((width * maxDim) / height);
          height = maxDim;
        }
      }

      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext('2d');
      if (!ctx) {
        resolve(file);
        return;
      }

      ctx.drawImage(img, 0, 0, width, height);
      canvas.toBlob(
        (blob) => {
          if (blob && blob.size < file.size) {
            const compressedFile = new File([blob], file.name, {
              type: 'image/jpeg',
              lastModified: Date.now(),
            });
            resolve(compressedFile);
          } else {
            resolve(file);
          }
        },
        'image/jpeg',
        0.75
      );
    };

    img.onerror = () => resolve(file);
    img.src = url;
  });
}

// Strictly cap payload size to <= 350KB per HTTP POST request (guarantees passing under NGINX HTTPS default 1MB limit)
function createUltraLeanBatches(files: File[], maxBatchBytes = 350 * 1024, maxFilesPerBatch = 1) {
  const batches: File[][] = [];
  let currentBatch: File[] = [];
  let currentBatchSize = 0;

  for (const file of files) {
    if (
      currentBatch.length > 0 &&
      (currentBatch.length >= maxFilesPerBatch || currentBatchSize + file.size > maxBatchBytes)
    ) {
      batches.push(currentBatch);
      currentBatch = [];
      currentBatchSize = 0;
    }

    currentBatch.push(file);
    currentBatchSize += file.size;
  }

  if (currentBatch.length > 0) {
    batches.push(currentBatch);
  }

  return batches;
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
  const [folderSummary, setFolderSummary] = useState<Record<string, File[]>>({});
  const [folderPath, setFolderPath] = useState('C:\\Users\\ILAN\\Downloads\\Trucks Docs\\Trucks Docs');
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [isDragging, setIsDragging] = useState<boolean>(false);

  const [isLoading, setIsLoading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<{ currentBatch: number; totalBatches: number; processedFiles: number; totalFiles: number; stage: string } | null>(null);
  const [result, setResult] = useState<any | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Helper to parse file list into vehicle folders
  const processFiles = (filesArray: File[]) => {
    const validFiles = filesArray.filter((file) => {
      const ext = file.name.slice(file.name.lastIndexOf('.')).toLowerCase();
      return ext !== '.rar' && ext !== '.zip' && !file.name.startsWith('.');
    });

    if (validFiles.length === 0) {
      toast.error('No valid PDF or image files found in the selected folder');
      return;
    }

    const firstRel = validFiles[0].webkitRelativePath || validFiles[0].name;
    const firstParts = firstRel.replace(/\\/g, '/').split('/');
    const rootName = firstParts.length > 1 ? firstParts[0] : 'Selected Folder';

    const grouped: Record<string, File[]> = {};
    validFiles.forEach((file) => {
      const rel = file.webkitRelativePath || file.name;
      const parts = rel.replace(/\\/g, '/').split('/').filter(Boolean);
      let vehicleId = 'General';
      if (parts.length >= 3) {
        vehicleId = parts[1];
      } else if (parts.length === 2) {
        vehicleId = parts[0];
      }
      const cleanVeh = vehicleId.trim();
      if (!grouped[cleanVeh]) {
        grouped[cleanVeh] = [];
      }
      grouped[cleanVeh].push(file);
    });

    setFolderName(rootName);
    setSelectedFiles(validFiles);
    setFolderSummary(grouped);
    setError(null);
    setResult(null);
  };

  // Native folder selection
  const handleFolderSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const rawFiles = e.target.files;
    if (!rawFiles || rawFiles.length === 0) return;
    processFiles(Array.from(rawFiles));
  };

  // Drag & drop folder handling
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  };

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);

    const items = e.dataTransfer.items;
    if (!items) return;

    const files: File[] = [];

    const readEntry = async (entry: any, path = '') => {
      if (entry.isFile) {
        return new Promise<void>((resolve) => {
          entry.file((file: File) => {
            Object.defineProperty(file, 'webkitRelativePath', {
              value: path + file.name,
            });
            files.push(file);
            resolve();
          });
        });
      } else if (entry.isDirectory) {
        const dirReader = entry.createReader();
        const entries = await new Promise<any[]>((resolve) => {
          dirReader.readEntries((res: any[]) => resolve(res));
        });
        for (const childEntry of entries) {
          await readEntry(childEntry, path + entry.name + '/');
        }
      }
    };

    const promises = [];
    for (let i = 0; i < items.length; i++) {
      const item = items[i];
      if (item.kind === 'file') {
        const entry = item.webkitGetAsEntry ? item.webkitGetAsEntry() : (item as any).getAsEntry?.();
        if (entry) {
          promises.push(readEntry(entry));
        } else {
          const file = item.getAsFile();
          if (file) files.push(file);
        }
      }
    }

    await Promise.all(promises);
    if (files.length > 0) {
      processFiles(files);
    }
  };

  // Upload folder via 1-file micro-batches + client image compression
  const handleUploadFolder = async () => {
    if (selectedFiles.length === 0) return;
    setIsLoading(true);
    setError(null);
    setResult(null);

    try {
      setUploadProgress({
        currentBatch: 0,
        totalBatches: selectedFiles.length,
        processedFiles: 0,
        totalFiles: selectedFiles.length,
        stage: 'Optimizing and compressing images...',
      });

      const processedFiles: File[] = [];
      for (let i = 0; i < selectedFiles.length; i++) {
        const file = selectedFiles[i];
        const compressed = await compressFileIfNeeded(file);
        Object.defineProperty(compressed, 'webkitRelativePath', {
          value: file.webkitRelativePath || file.name,
        });
        processedFiles.push(compressed);
      }

      const fileBatches = createUltraLeanBatches(processedFiles, 350 * 1024, 1);
      const totalBatches = fileBatches.length;

      const vehicleMap = new Map<string, number>();
      let aggregateDocsCreated = 0;
      let processedFilesCount = 0;

      for (let i = 0; i < totalBatches; i++) {
        const batch = fileBatches[i];
        const currentFileName = batch[0]?.name || `File #${i + 1}`;

        setUploadProgress({
          currentBatch: i + 1,
          totalBatches,
          processedFiles: processedFilesCount,
          totalFiles: selectedFiles.length,
          stage: `Uploading ${i + 1}/${totalBatches}: ${currentFileName}`,
        });

        const formData = new FormData();
        const relativePaths: string[] = [];

        batch.forEach((file) => {
          formData.append('files', file);
          relativePaths.push(file.webkitRelativePath || file.name);
        });

        formData.append('relative_paths', JSON.stringify(relativePaths));

        try {
          const res = await documentService.batchUploadFolder(formData);
          if (res.data) {
            aggregateDocsCreated += res.data.totalDocsCreated || batch.length;
            if (res.data.details && Array.isArray(res.data.details)) {
              res.data.details.forEach((d: any) => {
                const currentCount = vehicleMap.get(d.vehiclePlate) || 0;
                vehicleMap.set(d.vehiclePlate, currentCount + d.docsCount);
              });
            }
          }
        } catch (singleErr: any) {
          console.warn(`Failed uploading file ${currentFileName}:`, singleErr);
        }

        processedFilesCount += batch.length;
      }

      const detailsList = Array.from(vehicleMap.entries()).map(([plate, count]) => ({
        folder: plate,
        vehiclePlate: plate,
        docsCount: count,
      }));

      const finalSummary = {
        totalFoldersScanned: vehicleMap.size,
        totalVehiclesProcessed: vehicleMap.size,
        totalDocsCreated: aggregateDocsCreated,
        details: detailsList,
      };

      setResult(finalSummary);
      toast.success(`Successfully uploaded and assigned ${aggregateDocsCreated} documents across ${vehicleMap.size} vehicle folders!`);
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
      setUploadProgress(null);
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
    setSearchTerm('');
    setResult(null);
    setError(null);
    setUploadProgress(null);
    onClose();
  };

  const vehicleFoldersEntries = useMemo(() => {
    return Object.entries(folderSummary).filter(([vehId]) =>
      vehId.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [folderSummary, searchTerm]);

  const vehicleFoldersCount = Object.keys(folderSummary).length;

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && handleClose()}>
      <DialogContent className="max-w-4xl sm:max-w-4xl w-[95vw] sm:w-[90vw] max-h-[90vh] p-0 overflow-hidden border-slate-200 dark:border-slate-800 rounded-2xl flex flex-col shadow-2xl">
        
        {/* Header */}
        <DialogHeader className="px-6 py-4 border-b border-slate-100 dark:border-slate-800 bg-slate-50/80 dark:bg-slate-900/80 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-indigo-50 dark:bg-indigo-950/60 flex items-center justify-center text-indigo-600 dark:text-indigo-400 shrink-0 border border-indigo-200/60 dark:border-indigo-800/60 shadow-xs">
              <Truck className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <DialogTitle className="text-base font-extrabold text-slate-900 dark:text-slate-100">
                  Batch Import Truck Documents
                </DialogTitle>
                <Badge className="bg-indigo-50 text-indigo-700 border-indigo-200 dark:bg-indigo-950/60 dark:text-indigo-300 dark:border-indigo-800 font-bold text-[10px] px-2 py-0.5 rounded-full">
                  Operations Module
                </Badge>
              </div>
              <DialogDescription className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                Bulk upload truck document folder structures. Automatically detects & assigns Istimara, Fahas & Insurance to vehicles.
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        {/* Scrollable Modal Body */}
        <div className="p-6 overflow-y-auto max-h-[calc(90vh-130px)] space-y-5 flex-1 custom-scrollbar">
          
          <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as any)} className="w-full">
            <TabsList className="grid grid-cols-2 w-full bg-slate-100/80 dark:bg-slate-800/80 p-1 rounded-xl border border-slate-200/50 dark:border-slate-700/50">
              <TabsTrigger value="upload" className="text-xs font-bold gap-2 rounded-lg py-2 data-[state=active]:bg-white dark:data-[state=active]:bg-slate-900 data-[state=active]:shadow-xs transition-all">
                <FolderOpen size={15} className="text-indigo-600 dark:text-indigo-400" />
                <span>Upload Folder (Browser Dropzone)</span>
              </TabsTrigger>
              <TabsTrigger value="local" className="text-xs font-bold gap-2 rounded-lg py-2 data-[state=active]:bg-white dark:data-[state=active]:bg-slate-900 data-[state=active]:shadow-xs transition-all">
                <HardDrive size={15} className="text-indigo-600 dark:text-indigo-400" />
                <span>Local Server Path Import</span>
              </TabsTrigger>
            </TabsList>

            {/* TAB 1: Native Browser Folder Chooser & Drag/Drop */}
            <TabsContent value="upload" className="space-y-4 pt-4">
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

              {/* Drag & Drop Zone */}
              <div
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
                onClick={() => folderInputRef.current?.click()}
                className={`border-2 border-dashed rounded-2xl p-7 flex flex-col items-center justify-center cursor-pointer transition-all gap-3 text-center group relative overflow-hidden ${
                  isDragging
                    ? 'border-indigo-500 bg-indigo-50/60 dark:bg-indigo-950/40 ring-4 ring-indigo-500/10 scale-[0.99]'
                    : folderName
                    ? 'border-indigo-300 dark:border-indigo-800 bg-indigo-50/30 dark:bg-indigo-950/20'
                    : 'border-slate-200 dark:border-slate-700 hover:border-indigo-400 dark:hover:border-indigo-600 bg-slate-50/50 dark:bg-slate-900/50 hover:bg-indigo-50/20 dark:hover:bg-indigo-950/10'
                }`}
              >
                <div className="w-14 h-14 rounded-2xl bg-white dark:bg-slate-800 shadow-sm border border-slate-200 dark:border-slate-700 flex items-center justify-center text-indigo-600 dark:text-indigo-400 group-hover:scale-110 transition-transform">
                  {folderName ? <FolderTree className="w-7 h-7" /> : <UploadCloud className="w-7 h-7" />}
                </div>

                <div>
                  <h4 className="text-sm font-extrabold text-slate-900 dark:text-slate-100">
                    {folderName ? `Selected Folder: ${folderName}` : 'Drag & Drop Folder or Click to Browse'}
                  </h4>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 max-w-md mx-auto">
                    Select your root folder containing vehicle plate subfolders (e.g., <span className="font-mono font-bold text-slate-700 dark:text-slate-200">2541, 3071</span>). PDFs and images will be parsed automatically.
                  </p>
                </div>

                {selectedFiles.length > 0 ? (
                  <div className="flex items-center gap-2 mt-1">
                    <Badge variant="outline" className="bg-indigo-50 text-indigo-700 border-indigo-200 dark:bg-indigo-950/80 dark:text-indigo-300 dark:border-indigo-800 text-xs font-bold px-3 py-1 rounded-full">
                      ✓ {selectedFiles.length} valid files found in {vehicleFoldersCount} truck subfolders
                    </Badge>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={(e) => {
                        e.stopPropagation();
                        setSelectedFiles([]);
                        setFolderName('');
                        setFolderSummary({});
                      }}
                      className="h-7 px-2 text-xs text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 rounded-lg"
                    >
                      <X className="w-3.5 h-3.5 mr-1" /> Clear
                    </Button>
                  </div>
                ) : (
                  <div className="flex items-center gap-3 text-[11px] text-slate-400 dark:text-slate-500 font-medium">
                    <span className="flex items-center gap-1"><FileCheck2 size={13} /> PDF, JPG, PNG, WEBP</span>
                    <span>•</span>
                    <span>Auto compression enabled</span>
                  </div>
                )}
              </div>

              {/* Progress Bar when uploading */}
              {isLoading && uploadProgress && (
                <div className="space-y-3 p-4 rounded-xl bg-indigo-50/80 dark:bg-indigo-950/50 border border-indigo-200 dark:border-indigo-800 text-xs animate-fade-in shadow-sm">
                  <div className="flex items-center justify-between font-bold text-indigo-950 dark:text-indigo-100">
                    <span className="flex items-center gap-2 truncate max-w-[80%]">
                      <Loader2 className="w-4 h-4 animate-spin text-indigo-600 dark:text-indigo-400 shrink-0" />
                      <span className="truncate">{uploadProgress.stage}</span>
                    </span>
                    <span className="font-mono text-indigo-600 dark:text-indigo-400 bg-indigo-100 dark:bg-indigo-900/60 px-2.5 py-0.5 rounded-full text-xs font-extrabold">
                      {Math.round((uploadProgress.currentBatch / Math.max(uploadProgress.totalBatches, 1)) * 100)}%
                    </span>
                  </div>
                  <div className="w-full h-2.5 bg-indigo-200/80 dark:bg-indigo-900/80 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-gradient-to-r from-indigo-500 to-indigo-600 transition-all duration-300 rounded-full shadow-xs"
                      style={{ width: `${(uploadProgress.currentBatch / Math.max(uploadProgress.totalBatches, 1)) * 100}%` }}
                    />
                  </div>
                  <div className="flex justify-between items-center text-[11px] text-indigo-700/80 dark:text-indigo-300/80 font-mono">
                    <span>Batch {uploadProgress.currentBatch} of {uploadProgress.totalBatches}</span>
                    <span>{uploadProgress.processedFiles} / {uploadProgress.totalFiles} files processed</span>
                  </div>
                </div>
              )}

              {/* Detected Vehicle Folders Grid & Search Filter */}
              {selectedFiles.length > 0 && !isLoading && (
                <div className="space-y-3 border border-slate-200/80 dark:border-slate-800 rounded-2xl p-4 bg-slate-50/40 dark:bg-slate-900/40">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-2 border-b border-slate-100 dark:border-slate-800">
                    <div className="flex items-center gap-2">
                      <Truck className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
                      <span className="text-xs font-extrabold text-slate-800 dark:text-slate-200 uppercase tracking-wider">
                        Detected Vehicle Subfolders ({vehicleFoldersCount})
                      </span>
                    </div>

                    {/* Filter Input */}
                    {vehicleFoldersCount > 4 && (
                      <div className="relative w-full sm:w-56">
                        <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
                        <Input
                          type="text"
                          placeholder="Filter plate / folder..."
                          value={searchTerm}
                          onChange={(e) => setSearchTerm(e.target.value)}
                          className="h-7 pl-8 pr-2 text-xs bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 rounded-lg"
                        />
                      </div>
                    )}
                  </div>

                  {/* 3-Column Responsive Grid */}
                  <div className="max-h-64 overflow-y-auto pr-1 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2.5 custom-scrollbar">
                    {vehicleFoldersEntries.map(([vehId, files]) => (
                      <div
                        key={vehId}
                        className="flex items-center justify-between text-xs p-2.5 rounded-xl bg-white dark:bg-slate-800 border border-slate-200/70 dark:border-slate-700/70 shadow-2xs hover:border-indigo-300 dark:hover:border-indigo-700 transition-colors"
                      >
                        <div className="flex items-center gap-2 truncate">
                          <div className="w-7 h-7 rounded-lg bg-indigo-50 dark:bg-indigo-950/60 flex items-center justify-center text-indigo-600 dark:text-indigo-400 shrink-0 border border-indigo-100 dark:border-indigo-800/40">
                            <Truck size={14} />
                          </div>
                          <div className="truncate">
                            <span className="font-extrabold text-slate-900 dark:text-slate-100 block truncate text-xs">
                              {vehId === 'General' ? 'Unassigned' : `Vehicle #${vehId}`}
                            </span>
                            <span className="text-[10px] text-slate-400 block truncate">
                              {files.length} document{files.length > 1 ? 's' : ''}
                            </span>
                          </div>
                        </div>
                        <Badge variant="secondary" className="font-mono text-[10px] font-extrabold bg-slate-100 text-slate-700 dark:bg-slate-700 dark:text-slate-200 px-2 py-0.5 shrink-0 rounded-md">
                          {files.length} files
                        </Badge>
                      </div>
                    ))}

                    {vehicleFoldersEntries.length === 0 && (
                      <div className="col-span-full py-6 text-center text-xs text-slate-400">
                        No vehicle subfolders match "{searchTerm}"
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Usage Guide */}
              {selectedFiles.length === 0 && !isLoading && (
                <div className="rounded-xl border border-indigo-100 dark:border-indigo-950 bg-indigo-50/40 dark:bg-indigo-950/20 p-4 text-xs space-y-2 text-indigo-900 dark:text-indigo-200">
                  <div className="flex items-center gap-2 font-bold text-indigo-950 dark:text-indigo-100">
                    <Info className="w-4 h-4 text-indigo-600 shrink-0" />
                    <span>How Batch Import Works</span>
                  </div>
                  <ul className="list-disc list-inside space-y-1 text-slate-600 dark:text-slate-400 pl-1 text-[11px] leading-relaxed">
                    <li>Organize your documents in a parent folder with subfolders named by vehicle plate number (e.g. <span className="font-mono font-bold text-indigo-700 dark:text-indigo-300">Trucks Docs / 2541 / istimara.pdf</span>).</li>
                    <li>Files are processed locally and compressed if needed before uploading to avoid size limits.</li>
                    <li>Documents are automatically mapped to document types (<span className="font-bold text-slate-700 dark:text-slate-300">Istimara, Fahas, Insurance</span>) and linked directly to each truck.</li>
                  </ul>
                </div>
              )}
            </TabsContent>

            {/* TAB 2: Server Local Disk Path */}
            <TabsContent value="local" className="space-y-4 pt-4">
              <div className="space-y-2 p-4 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
                <label className="text-xs font-bold text-slate-800 dark:text-slate-200 flex items-center gap-2">
                  <HardDrive size={15} className="text-indigo-600" />
                  Server Directory Absolute Path
                </label>
                <Input
                  type="text"
                  value={folderPath}
                  onChange={(e) => setFolderPath(e.target.value)}
                  placeholder="C:\Users\ILAN\Downloads\Trucks Docs\Trucks Docs"
                  disabled={isLoading}
                  className="text-xs font-mono bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 rounded-xl"
                />
                <p className="text-[11px] text-slate-400 mt-1">
                  Specify the absolute path on the host server disk. The backend will scan subfolders matching vehicle plate numbers directly.
                </p>
              </div>

              <div className="rounded-xl border border-slate-200 dark:border-slate-800 p-4 bg-slate-50/50 dark:bg-slate-900/50 text-xs space-y-2">
                <div className="flex items-center gap-2 font-bold text-slate-800 dark:text-slate-200">
                  <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0" />
                  <span>Direct Server Execution</span>
                </div>
                <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-relaxed">
                  Best for bulk imports of thousands of documents already stored on the server's local file system or mounted storage drives.
                </p>
              </div>
            </TabsContent>
          </Tabs>

          {/* Error Alert */}
          {error && (
            <div className="p-4 rounded-xl bg-rose-50 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-800 text-xs text-rose-700 dark:text-rose-300 flex items-start gap-2.5 animate-fade-in">
              <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5 text-rose-600" />
              <div className="space-y-0.5">
                <span className="font-bold block">Import Warning / Error</span>
                <span>{error}</span>
              </div>
            </div>
          )}

          {/* Results Summary & KPI Instrument Panel */}
          {result && (
            <div className="p-5 rounded-2xl bg-emerald-50/60 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800 space-y-4 animate-fade-in shadow-xs">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-emerald-900 dark:text-emerald-200 font-extrabold text-sm">
                  <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
                  <span>Import Completed Successfully!</span>
                </div>
                <Badge className="bg-emerald-100 text-emerald-800 dark:bg-emerald-900/80 dark:text-emerald-200 font-mono font-bold text-xs px-2.5 py-0.5 rounded-full border-0">
                  DONE
                </Badge>
              </div>

              {/* KPI Instrument Panel Cards */}
              <div className="grid grid-cols-3 gap-3 text-center">
                <div className="bg-white dark:bg-slate-800 p-3 rounded-xl border border-emerald-100 dark:border-slate-700 shadow-2xs">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Folders Scanned</span>
                  <span className="text-xl font-black font-mono text-slate-900 dark:text-slate-100">{result.totalFoldersScanned}</span>
                </div>

                <div className="bg-white dark:bg-slate-800 p-3 rounded-xl border border-emerald-100 dark:border-slate-700 shadow-2xs">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Vehicles Matched</span>
                  <span className="text-xl font-black font-mono text-indigo-600 dark:text-indigo-400">{result.totalVehiclesProcessed}</span>
                </div>

                <div className="bg-white dark:bg-slate-800 p-3 rounded-xl border border-emerald-100 dark:border-slate-700 shadow-2xs">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Documents Created</span>
                  <span className="text-xl font-black font-mono text-emerald-600 dark:text-emerald-400">{result.totalDocsCreated}</span>
                </div>
              </div>

              {/* Scrollable details ledger */}
              {result.details && result.details.length > 0 && (
                <div className="space-y-2 border-t border-emerald-200/60 dark:border-emerald-800/60 pt-3">
                  <span className="text-[11px] font-extrabold text-slate-700 dark:text-slate-300 uppercase tracking-wider block">
                    Assigned Documents per Vehicle ({result.details.length})
                  </span>
                  <div className="max-h-44 overflow-y-auto space-y-1.5 pr-1 custom-scrollbar">
                    {result.details.map((item: any, idx: number) => (
                      <div key={`${item.folder}-${idx}`} className="flex items-center justify-between text-xs py-2 px-3 rounded-xl bg-white dark:bg-slate-800 border border-slate-200/60 dark:border-slate-700 shadow-2xs">
                        <span className="font-extrabold text-slate-800 dark:text-slate-200 flex items-center gap-2">
                          <Truck size={14} className="text-indigo-600 dark:text-indigo-400" />
                          <span>Vehicle #{item.vehiclePlate}</span>
                        </span>
                        <Badge variant="outline" className="font-mono text-[11px] font-bold bg-indigo-50 text-indigo-700 border-indigo-200 dark:bg-indigo-950 dark:text-indigo-300 dark:border-indigo-800 px-2.5 py-0.5 rounded-md">
                          {item.docsCount} files attached
                        </Badge>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <DialogFooter className="px-6 py-3.5 border-t border-slate-100 dark:border-slate-800 bg-slate-50/80 dark:bg-slate-900/80 flex items-center justify-between shrink-0">
          <Button variant="ghost" size="sm" onClick={handleClose} disabled={isLoading} className="text-xs font-bold rounded-xl text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-100">
            {result ? 'Close' : 'Cancel'}
          </Button>

          {activeTab === 'upload' ? (
            <Button
              size="sm"
              onClick={handleUploadFolder}
              disabled={isLoading || selectedFiles.length === 0}
              className="text-xs bg-indigo-600 hover:bg-indigo-700 text-white font-extrabold shadow-md gap-2 px-5 py-2 rounded-xl transition-all disabled:opacity-50"
            >
              {isLoading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>
                    {uploadProgress ? `Processing Batch ${uploadProgress.currentBatch}/${uploadProgress.totalBatches}...` : 'Uploading...'}
                  </span>
                </>
              ) : (
                <>
                  <UploadCloud className="w-4.5 h-4.5" />
                  <span>Upload & Assign ({selectedFiles.length} files)</span>
                </>
              )}
            </Button>
          ) : (
            <Button
              size="sm"
              onClick={handleImportLocalPath}
              disabled={isLoading || !folderPath.trim()}
              className="text-xs bg-indigo-600 hover:bg-indigo-700 text-white font-extrabold shadow-md gap-2 px-5 py-2 rounded-xl transition-all disabled:opacity-50"
            >
              {isLoading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Importing...</span>
                </>
              ) : (
                <>
                  <UploadCloud className="w-4 h-4.5" />
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
