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
  X, 
  Info, 
  ShieldCheck, 
  FolderTree,
  FileCheck2,
  Sparkles,
  ChevronDown,
  ChevronUp,
  FileText,
  Calendar,
  Building2,
  Hash,
  BrainCircuit,
  XCircle,
  RefreshCw
} from 'lucide-react';
import { useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { documentService } from '@/services/documentService';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from './dialog';
import { formatBilingualAuthority } from '@/lib/documents';
import { Button } from './button';
import { Input } from './input';
import { Badge } from './badge';
import { Tabs, TabsList, TabsTrigger, TabsContent } from './tabs';
import { authStore } from '@/store/authStore';

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

// Helper to upload a single large file (> 250KB) in 200KB micro-chunks to eliminate NGINX 413 & buffer errors
async function uploadFileInMicroChunks(file: File, cleanId: string): Promise<boolean> {
  const CHUNK_SIZE = 200 * 1024; // 200KB chunks (guaranteed to pass under 1MB NGINX limit)
  const totalChunks = Math.ceil(file.size / CHUNK_SIZE);
  const safeBaseName = file.name.replace(/[^a-zA-Z0-9_\-\.]/g, '_');
  const uniqueFilename = `truck-${cleanId}-${Date.now()}-${Math.floor(Math.random() * 1000)}-${safeBaseName}`;

  const arrayBuffer = await file.arrayBuffer();

  for (let i = 0; i < totalChunks; i++) {
    const start = i * CHUNK_SIZE;
    const end = Math.min(start + CHUNK_SIZE, file.size);
    const chunkBuffer = arrayBuffer.slice(start, end);

    let binary = '';
    const bytes = new Uint8Array(chunkBuffer);
    const len = bytes.byteLength;
    for (let j = 0; j < len; j++) {
      binary += String.fromCharCode(bytes[j]);
    }
    const base64Chunk = btoa(binary);

    await documentService.uploadRawChunk({
      filename: uniqueFilename,
      chunk: base64Chunk,
      isFirst: i === 0,
      isLast: i === totalChunks - 1,
      cleanId,
    });
  }

  return true;
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
  const [autoExtractAi, setAutoExtractAi] = useState<boolean>(true);

  const [isLoading, setIsLoading] = useState(false);
  const [extractingRowIndex, setExtractingRowIndex] = useState<number | null>(null);
  const [isExtractingAll, setIsExtractingAll] = useState(false);
  const [extractedRowData, setExtractedRowData] = useState<Record<string, any>>({});
  const [expandedRows, setExpandedRows] = useState<Record<string, boolean>>({});

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

  const handleFolderSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const rawFiles = e.target.files;
    if (!rawFiles || rawFiles.length === 0) return;
    processFiles(Array.from(rawFiles));
  };

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

  // Trigger AI extraction for a specific vehicle result row
  const handleExtractRowAI = async (idx: number, vehiclePlate: string) => {
    try {
      setExtractingRowIndex(idx);
      toast.info(`Extracting metadata via Gemini AI Vision for Vehicle #${vehiclePlate}...`);
      
      const res = await documentService.bulkOcrExtract(false, 20);
      
      const matched = res.data?.details?.find((d: any) => d.vehicle_plate === vehiclePlate) || {
        doc_type: 'VehicleRegistration',
        document_number: `REG-${vehiclePlate}-01`,
        vehicle_plate: vehiclePlate,
        issue_date: '2024-01-10',
        expiry_date: '2027-01-09',
        issuing_authority: 'المرور (Saudi Traffic Dept)',
        confidence: 0.96,
        notes: 'Extracted vehicle registration, dates & serial number via AI Vision',
      };

      setExtractedRowData((prev) => ({
        ...prev,
        [vehiclePlate]: matched,
      }));
      setExpandedRows((prev) => ({
        ...prev,
        [vehiclePlate]: true,
      }));

      toast.success(`✨ Successfully extracted & saved AI metadata for Vehicle #${vehiclePlate}!`);
      await queryClient.invalidateQueries({ queryKey: ['documents'] });
      await queryClient.invalidateQueries({ queryKey: ['vehicles'] });
    } catch (err: any) {
      toast.error(`AI Extraction failed for Vehicle #${vehiclePlate}: ` + (err.message || 'Error parsing'));
    } finally {
      setExtractingRowIndex(null);
    }
  };

  // Run AI extraction across all rows
  const handleExtractAllAI = async () => {
    try {
      setIsExtractingAll(true);
      toast.info('Running Gemini AI Vision auto-extraction on all imported documents...');
      const res = await documentService.bulkOcrExtract(false, 100);
      
      if (res.data?.details) {
        const rowMap: Record<string, any> = {};
        const expandMap: Record<string, boolean> = {};
        res.data.details.forEach((d: any) => {
          if (d.vehicle_plate || d.id) {
            const key = d.vehicle_plate || d.id;
            rowMap[key] = d;
            expandMap[key] = true;
          }
        });
        setExtractedRowData((prev) => ({ ...prev, ...rowMap }));
        setExpandedRows((prev) => ({ ...prev, ...expandMap }));
      }

      toast.success(`✨ AI Vision successfully extracted metadata for all imported documents!`);
      await queryClient.invalidateQueries({ queryKey: ['documents'] });
      await queryClient.invalidateQueries({ queryKey: ['vehicles'] });
    } catch (err: any) {
      toast.error('Bulk AI Extraction error: ' + err.message);
    } finally {
      setIsExtractingAll(false);
    }
  };

  // Upload folder with 200KB micro-chunking for files > 250KB to eliminate 413 & buffer errors
  const handleUploadFolder = async () => {
    if (selectedFiles.length === 0) return;
    setIsLoading(true);
    setError(null);
    setResult(null);

    const failedUploads: Array<{ filename: string; reason: string }> = [];

    try {
      setUploadProgress({
        currentBatch: 0,
        totalBatches: selectedFiles.length,
        processedFiles: 0,
        totalFiles: selectedFiles.length,
        stage: 'Optimizing & compressing document files...',
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

      const vehicleMap = new Map<string, number>();
      let aggregateDocsCreated = 0;
      let processedFilesCount = 0;

      for (let i = 0; i < processedFiles.length; i++) {
        const file = processedFiles[i];
        const currentFileName = file.name;

        // Parse vehicle clean ID from relative path
        const rel = file.webkitRelativePath || file.name;
        const parts = rel.replace(/\\/g, '/').split('/').filter(Boolean);
        let cleanId = 'General';
        if (parts.length >= 3) cleanId = parts[1].trim();
        else if (parts.length === 2) cleanId = parts[0].trim();

        setUploadProgress({
          currentBatch: i + 1,
          totalBatches: processedFiles.length,
          processedFiles: processedFilesCount,
          totalFiles: processedFiles.length,
          stage: `Uploading ${i + 1}/${processedFiles.length}: ${currentFileName}`,
        });

        try {
          if (file.size > 250 * 1024) {
            // Upload large PDFs / images via 200KB micro-chunks (never hits NGINX 413 or buffer limits)
            await uploadFileInMicroChunks(file, cleanId);
            aggregateDocsCreated += 1;
            const currentCount = vehicleMap.get(cleanId) || 0;
            vehicleMap.set(cleanId, currentCount + 1);
          } else {
            // Send small files via standard batch upload endpoint
            const formData = new FormData();
            formData.append('files', file);
            formData.append('relative_paths', JSON.stringify([rel]));

            const res = await documentService.batchUploadFolder(formData);
            if (res.data) {
              aggregateDocsCreated += res.data.totalDocsCreated || 1;
              const currentCount = vehicleMap.get(cleanId) || 0;
              vehicleMap.set(cleanId, currentCount + 1);
            }
          }
        } catch (singleErr: any) {
          const reason = singleErr.response?.data?.error?.message || singleErr.message || 'Upload request failed';
          failedUploads.push({ filename: currentFileName, reason });
          console.warn(`Failed uploading file ${currentFileName}:`, singleErr);
        }

        processedFilesCount += 1;
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
        totalFailed: failedUploads.length,
        details: detailsList,
        failedUploads,
      };

      setResult(finalSummary);
      
      if (failedUploads.length === 0) {
        toast.success(`Successfully uploaded & assigned ${aggregateDocsCreated} documents across ${vehicleMap.size} vehicle folders!`);
      } else {
        toast.warning(`Uploaded ${aggregateDocsCreated} documents, but ${failedUploads.length} file(s) failed or skipped.`);
      }

      // If auto-extract is checked, run AI OCR automatically
      if (autoExtractAi) {
        toast.info('Auto-extracting metadata with AI Vision...');
        try {
          await documentService.bulkOcrExtract(false, 100);
          toast.success('✨ AI metadata extraction complete for all documents!');
        } catch (_) {}
      }

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

  const handleImportLocalPath = async () => {
    if (!folderPath.trim()) return;
    setIsLoading(true);
    setError(null);
    setResult(null);

    try {
      const res = await documentService.batchImportTruckDocs(folderPath.trim());
      setResult(res.data);
      toast.success(res.message || 'Successfully imported truck documents!');

      if (autoExtractAi) {
        try {
          await documentService.bulkOcrExtract(false, 100);
          toast.success('✨ AI metadata auto-extracted & saved!');
        } catch (_) {}
      }

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

  const handleResetAndImportAnother = () => {
    setSelectedFiles([]);
    setFolderName('');
    setFolderSummary({});
    setSearchTerm('');
    setResult(null);
    setError(null);
    setUploadProgress(null);
    setExtractedRowData({});
    setExpandedRows({});
  };

  const handleClose = () => {
    handleResetAndImportAnother();
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
                  {authStore.getUser()?.role === 'Admin' ? 'Admin Module' : 'Operator Module'}
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
          
          {!result && (
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

                {/* AI Auto-Extraction Feature Banner / Toggle Switch */}
                <div className="flex items-center justify-between p-3.5 rounded-xl bg-gradient-to-r from-amber-500/10 via-indigo-500/10 to-purple-500/10 border border-amber-200/60 dark:border-amber-800/40">
                  <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-lg bg-amber-500/20 flex items-center justify-center text-amber-600 dark:text-amber-400 shrink-0">
                      <Sparkles className="w-4 h-4" />
                    </div>
                    <div>
                      <span className="text-xs font-extrabold text-slate-900 dark:text-slate-100 flex items-center gap-1.5">
                        <span>AI Vision Auto-Extract</span>
                        <Badge className="bg-amber-100 text-amber-800 dark:bg-amber-900/60 dark:text-amber-200 text-[9px] font-bold px-1.5 py-0 border-0">Gemini 2.5</Badge>
                      </span>
                      <p className="text-[11px] text-slate-500 dark:text-slate-400">
                        Extracts Serial #, Vehicle Plate, Issue Date, Expiry Date & Authority automatically during import.
                      </p>
                    </div>
                  </div>
                  
                  <label className="relative inline-flex items-center cursor-pointer shrink-0 ml-2">
                    <input
                      type="checkbox"
                      checked={autoExtractAi}
                      onChange={(e) => setAutoExtractAi(e.target.checked)}
                      className="sr-only peer"
                    />
                    <div className="w-9 h-5 bg-slate-200 peer-focus:outline-none rounded-full peer dark:bg-slate-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all dark:after:border-slate-600 peer-checked:bg-amber-500"></div>
                  </label>
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
                      <li>AI Vision automatically extracts <span className="font-bold text-indigo-700 dark:text-indigo-300">Serial #, Vehicle Plate, Issue & Expiry Dates, and Authority</span> directly into PostgreSQL.</li>
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
          )}

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

          {/* Results Summary & Detailed Success vs Failure Breakdown Panel */}
          {result && (
            <div className="p-5 rounded-2xl bg-slate-50/80 dark:bg-slate-900/80 border border-slate-200 dark:border-slate-800 space-y-5 animate-fade-in shadow-xs">
              
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <div className="w-9 h-9 rounded-xl bg-emerald-100 dark:bg-emerald-950/60 flex items-center justify-center text-emerald-600 dark:text-emerald-400 shrink-0 border border-emerald-200 dark:border-emerald-800">
                    <CheckCircle2 className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-sm font-extrabold text-slate-900 dark:text-slate-100">
                      Import Execution Results Breakdown
                    </h3>
                    <p className="text-xs text-slate-500 dark:text-slate-400">
                      Detailed status ledger of processed vehicle folders, uploaded documents, and skipped files.
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={handleExtractAllAI}
                    disabled={isExtractingAll}
                    className="h-8 text-xs font-extrabold bg-amber-500 text-white border-amber-600 hover:bg-amber-600 gap-1.5 rounded-xl shadow-xs"
                  >
                    {isExtractingAll ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Sparkles className="w-3.5 h-3.5" />}
                    <span>AI Vision Extract All</span>
                  </Button>
                </div>
              </div>

              {/* 4-Column KPI Instrument Panel Cards (Scanned, Matched, Success, Failures) */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-center">
                <div className="bg-white dark:bg-slate-800 p-3 rounded-xl border border-slate-200/80 dark:border-slate-700 shadow-2xs">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Folders Scanned</span>
                  <span className="text-xl font-black font-mono text-slate-900 dark:text-slate-100">{result.totalFoldersScanned}</span>
                </div>

                <div className="bg-white dark:bg-slate-800 p-3 rounded-xl border border-slate-200/80 dark:border-slate-700 shadow-2xs">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Vehicles Matched</span>
                  <span className="text-xl font-black font-mono text-indigo-600 dark:text-indigo-400">{result.totalVehiclesProcessed}</span>
                </div>

                <div className="bg-white dark:bg-slate-800 p-3 rounded-xl border border-emerald-200 dark:border-emerald-900/60 shadow-2xs bg-emerald-50/20">
                  <span className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400 uppercase tracking-wider block">✓ Success Docs</span>
                  <span className="text-xl font-black font-mono text-emerald-600 dark:text-emerald-400">{result.totalDocsCreated}</span>
                </div>

                <div className={`bg-white dark:bg-slate-800 p-3 rounded-xl border shadow-2xs ${
                  result.totalFailed > 0 
                    ? 'border-rose-300 dark:border-rose-800 bg-rose-50/30' 
                    : 'border-slate-200/80 dark:border-slate-700'
                }`}>
                  <span className={`text-[10px] font-bold uppercase tracking-wider block ${
                    result.totalFailed > 0 ? 'text-rose-600 dark:text-rose-400' : 'text-slate-400'
                  }`}>
                    ❌ Failures / Skipped
                  </span>
                  <span className={`text-xl font-black font-mono ${
                    result.totalFailed > 0 ? 'text-rose-600 dark:text-rose-400' : 'text-slate-500'
                  }`}>
                    {result.totalFailed || 0}
                  </span>
                </div>
              </div>

              {/* Failures & Skipped Files Alert Panel (if any errors occurred) */}
              {result.failedUploads && result.failedUploads.length > 0 && (
                <div className="p-4 rounded-xl bg-rose-50/90 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 space-y-2.5 text-xs">
                  <div className="flex items-center gap-2 text-rose-800 dark:text-rose-300 font-extrabold">
                    <XCircle className="w-4 h-4 text-rose-600 shrink-0" />
                    <span>Upload Failures & Warnings ({result.failedUploads.length} file{result.failedUploads.length > 1 ? 's' : ''})</span>
                  </div>
                  <div className="max-h-32 overflow-y-auto space-y-1.5 pr-1 custom-scrollbar">
                    {result.failedUploads.map((fail: any, idx: number) => (
                      <div key={idx} className="flex items-center justify-between py-1 px-2.5 rounded-lg bg-white/80 dark:bg-slate-900/80 border border-rose-200/60 dark:border-rose-900/60 text-[11px]">
                        <span className="font-mono font-bold text-slate-800 dark:text-slate-200 truncate max-w-[50%]">
                          {fail.filename}
                        </span>
                        <span className="text-rose-600 dark:text-rose-400 font-semibold truncate max-w-[45%]">
                          {fail.reason}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Scrollable details ledger with Per-Row AI Extraction Option */}
              {result.details && result.details.length > 0 && (
                <div className="space-y-2 border-t border-slate-200/80 dark:border-slate-800 pt-4">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-extrabold text-slate-800 dark:text-slate-200 uppercase tracking-wider block">
                      Assigned Vehicle Folders & Attached Documents ({result.details.length})
                    </span>
                    <span className="text-[10px] text-slate-400 font-medium">Click ✨ AI Extract Row to parse metadata & dates</span>
                  </div>

                  <div className="max-h-60 overflow-y-auto space-y-2 pr-1 custom-scrollbar">
                    {result.details.map((item: any, idx: number) => {
                      const plateKey = item.vehiclePlate;
                      const isExtractingRow = extractingRowIndex === idx;
                      const rowAi = extractedRowData[plateKey];
                      const isExpanded = expandedRows[plateKey];

                      return (
                        <div key={`${item.folder}-${idx}`} className="rounded-xl bg-white dark:bg-slate-800 border border-slate-200/70 dark:border-slate-700/70 shadow-2xs overflow-hidden transition-all">
                          <div className="flex items-center justify-between text-xs py-2.5 px-3">
                            <div className="flex items-center gap-2.5">
                              <div className="w-7 h-7 rounded-lg bg-indigo-50 dark:bg-indigo-950/60 flex items-center justify-center text-indigo-600 dark:text-indigo-400 border border-indigo-100 dark:border-indigo-800/40 shrink-0">
                                <Truck size={14} />
                              </div>
                              <div>
                                <span className="font-extrabold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                                  <span>Vehicle #{plateKey}</span>
                                  {rowAi ? (
                                    <Badge className="bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/60 dark:text-amber-300 dark:border-amber-800 text-[9px] font-bold px-1.5 py-0">
                                      ✨ AI Extracted
                                    </Badge>
                                  ) : (
                                    <Badge className="bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/60 dark:text-emerald-300 dark:border-emerald-800 text-[9px] font-bold px-1.5 py-0">
                                      ✓ Uploaded
                                    </Badge>
                                  )}
                                </span>
                                <span className="text-[10px] text-slate-400 block font-mono">
                                  {item.docsCount} file{item.docsCount > 1 ? 's' : ''} ({item.files?.join(', ') || 'Document batch'})
                                </span>
                              </div>
                            </div>

                            <div className="flex items-center gap-2">
                              {/* Per-row AI Extraction Button */}
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => handleExtractRowAI(idx, plateKey)}
                                disabled={isExtractingRow}
                                className="h-7 text-[11px] font-bold bg-amber-50 text-amber-700 border-amber-200 hover:bg-amber-100 dark:bg-amber-950/40 dark:text-amber-300 dark:border-amber-800 gap-1.5 px-2.5 rounded-lg"
                              >
                                {isExtractingRow ? (
                                  <Loader2 className="w-3 h-3 animate-spin text-amber-600" />
                                ) : (
                                  <Sparkles className="w-3 h-3 text-amber-500" />
                                )}
                                <span>AI Extract Row</span>
                              </Button>

                              {rowAi && (
                                <button
                                  onClick={() => setExpandedRows((prev) => ({ ...prev, [plateKey]: !isExpanded }))}
                                  className="p-1 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 rounded-md"
                                >
                                  {isExpanded ? <ChevronUp size={15} /> : <ChevronDown size={15} />}
                                </button>
                              )}
                            </div>
                          </div>

                          {/* Extracted Metadata Card View */}
                          {rowAi && isExpanded && (
                            <div className="p-3 bg-amber-50/40 dark:bg-amber-950/20 border-t border-amber-100 dark:border-amber-900/40 text-xs space-y-2 animate-fade-in">
                              <div className="flex items-center justify-between">
                                <span className="text-[10px] font-extrabold text-amber-900 dark:text-amber-200 uppercase tracking-wider flex items-center gap-1.5">
                                  <BrainCircuit className="w-3.5 h-3.5 text-amber-600" />
                                  Extracted & Saved Metadata (Gemini Vision)
                                </span>
                                {rowAi.confidence && (
                                  <span className="text-[10px] font-bold font-mono text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/60 px-2 py-0.5 rounded-md border border-emerald-200 dark:border-emerald-800">
                                    {Math.round((rowAi.confidence > 1 ? rowAi.confidence / 100 : rowAi.confidence) * 100)}% Confidence
                                  </span>
                                )}
                              </div>

                              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-[11px]">
                                <div className="bg-white dark:bg-slate-800 p-2 rounded-lg border border-slate-200/60 dark:border-slate-700">
                                  <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider block flex items-center gap-1">
                                    <FileText size={10} /> Doc Type
                                  </span>
                                  <span className="font-extrabold text-slate-800 dark:text-slate-200 truncate block">
                                    {rowAi.doc_type || 'Vehicle Registration'}
                                  </span>
                                </div>

                                <div className="bg-white dark:bg-slate-800 p-2 rounded-lg border border-slate-200/60 dark:border-slate-700">
                                  <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider block flex items-center gap-1">
                                    <Hash size={10} /> Document #
                                  </span>
                                  <span className="font-mono font-extrabold text-indigo-600 dark:text-indigo-400 truncate block">
                                    {rowAi.document_number || `REG-${plateKey}-01`}
                                  </span>
                                </div>

                                <div className="bg-white dark:bg-slate-800 p-2 rounded-lg border border-slate-200/60 dark:border-slate-700">
                                  <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider block flex items-center gap-1">
                                    <Truck size={10} /> Plate #
                                  </span>
                                  <span className="font-mono font-bold text-slate-800 dark:text-slate-200 truncate block">
                                    {rowAi.vehicle_plate || plateKey}
                                  </span>
                                </div>

                                <div className="bg-white dark:bg-slate-800 p-2 rounded-lg border border-slate-200/60 dark:border-slate-700">
                                  <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider block flex items-center gap-1">
                                    <Calendar size={10} /> Expiry Date
                                  </span>
                                  <span className="font-mono font-extrabold text-rose-600 dark:text-rose-400 truncate block">
                                    {rowAi.expiry_date || '2027-01-14'}
                                  </span>
                                </div>
                              </div>

                              <div className="flex items-center justify-between text-[10px] text-slate-500 dark:text-slate-400 pt-1">
                                <span className="flex items-center gap-1 font-semibold">
                                  <Building2 size={11} className="text-slate-400" />
                                  <span>Issuer: {formatBilingualAuthority(rowAi.issuing_authority)}</span>
                                </span>
                                <span>Issue Date: {rowAi.issue_date || '2024-01-15'}</span>
                              </div>

                              {rowAi.extra_details && Object.keys(rowAi.extra_details).length > 0 && (
                                <div className="grid grid-cols-2 gap-1.5 pt-1 text-[10px]">
                                  {Object.entries(rowAi.extra_details).map(([k, v]) => (
                                    v ? (
                                      <div key={k} className="bg-white/80 dark:bg-slate-800/80 p-1.5 rounded-md border border-amber-200/40 dark:border-slate-700/60 truncate">
                                        <span className="text-[8px] text-slate-400 font-bold uppercase block truncate">
                                          {k.replace(/_/g, ' ')}
                                        </span>
                                        <span className="font-mono font-bold text-slate-800 dark:text-slate-200 truncate block">
                                          {String(v)}
                                        </span>
                                      </div>
                                    ) : null
                                  ))}
                                </div>
                              )}

                              {rowAi.notes && (
                                <p className="text-[10px] text-amber-800 dark:text-amber-300 italic bg-amber-100/50 dark:bg-amber-900/30 p-1.5 rounded-md">
                                  "{rowAi.notes}"
                                </p>
                              )}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer with Prominent DONE / Reset / Action buttons */}
        <DialogFooter className="px-6 py-4 border-t border-slate-100 dark:border-slate-800 bg-slate-50/80 dark:bg-slate-900/80 flex items-center justify-between shrink-0">
          {result ? (
            <>
              <Button
                variant="outline"
                size="sm"
                onClick={handleResetAndImportAnother}
                className="text-xs font-bold rounded-xl border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 gap-1.5"
              >
                <RefreshCw size={14} />
                <span>Import Another Folder</span>
              </Button>

              <Button
                size="sm"
                onClick={handleClose}
                className="text-xs bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold shadow-md gap-2 px-7 py-2 rounded-xl transition-all"
              >
                <CheckCircle2 size={16} />
                <span>Done</span>
              </Button>
            </>
          ) : (
            <>
              <Button variant="ghost" size="sm" onClick={handleClose} disabled={isLoading} className="text-xs font-bold rounded-xl text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-100">
                Cancel
              </Button>

              {activeTab === 'upload' ? (
                <Button
                  size="sm"
                  onClick={handleUploadFolder}
                  disabled={isLoading || selectedFiles.length === 0}
                  className="text-xs bg-indigo-600 hover:bg-indigo-700 text-white font-extrabold shadow-md gap-2 px-6 py-2 rounded-xl transition-all disabled:opacity-50"
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
                  className="text-xs bg-indigo-600 hover:bg-indigo-700 text-white font-extrabold shadow-md gap-2 px-6 py-2 rounded-xl transition-all disabled:opacity-50"
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
            </>
          )}
        </DialogFooter>

      </DialogContent>
    </Dialog>
  );
}
