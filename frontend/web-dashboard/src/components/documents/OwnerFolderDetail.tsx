import { useState, useMemo, useEffect } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import {
  UploadCloud, CheckCircle2, AlertTriangle, XCircle, FileQuestion, Eye, Loader2, Files,
  Search, Filter, LayoutGrid, Table as TableIcon, Columns, Sparkles, ExternalLink, Download,
  Trash2, Plus, ArrowUpRight, RotateCw, ZoomIn, ZoomOut, RefreshCw, FileText, Hash, Building2,
  Calendar, Check, AlertCircle, ShieldAlert, FolderPlus
} from 'lucide-react';
import { toast } from 'sonner';

import { documentService, type OwnerFolderSlot, type MerconDocument } from '@/services/documentService';
import { driverService } from '@/services/driverService';
import { vehicleService } from '@/services/vehicleService';
import DriverAvatar from '@/components/ui/DriverAvatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import UploadDocumentModal from '@/components/ui/UploadDocumentModal';
import ImportReviewModal from '@/components/documents/ImportReviewModal';
import { documentDisplayName, getExpiryStatus, formatBilingualAuthority, resolveFileUrl } from '@/lib/documents';
import { isImageFile, isPdfFile } from '@/components/ui/DocumentViewerModal';
import { cn } from '@/lib/utils';
import { useDeploymentTimezone, formatInDeploymentTz } from '@/lib/datetime';

const STATUS_CONFIG: Record<string, { label: string; className: string; icon: any }> = {
  VALID:         { label: 'Valid',         className: 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-400 dark:border-emerald-800/50', icon: CheckCircle2 },
  EXPIRING_SOON: { label: 'Expiring Soon', className: 'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/40 dark:text-amber-400 dark:border-amber-800/50', icon: AlertTriangle },
  EXPIRED:       { label: 'Expired',       className: 'bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-950/40 dark:text-rose-400 dark:border-rose-800/50', icon: XCircle },
  MISSING:       { label: 'Missing',       className: 'bg-slate-100 text-slate-500 border-slate-200 dark:bg-slate-800 dark:text-slate-400 dark:border-slate-700', icon: FileQuestion },
};

interface OwnerFolderDetailProps {
  ownerType: 'Driver' | 'Vehicle';
  ownerId: string;
}

type ViewMode = 'split' | 'table' | 'grid';

export default function OwnerFolderDetail({ ownerType, ownerId }: OwnerFolderDetailProps) {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const tz = useDeploymentTimezone();

  const [viewMode, setViewMode] = useState<ViewMode>('split');
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [requirementFilter, setRequirementFilter] = useState<string>('ALL');

  const [uploadSlot, setUploadSlot] = useState<OwnerFolderSlot | null>(null);
  const [selectedSlotId, setSelectedSlotId] = useState<string | null>(null);
  const [activeFileIdx, setActiveFileIdx] = useState(0);
  const [previewError, setPreviewError] = useState(false);
  const [previewRetryKey, setPreviewRetryKey] = useState(0);

  const [zoomLevel, setZoomLevel] = useState(1);
  const [rotation, setRotation] = useState(0);
  const [isRescanning, setIsRescanning] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isBatchImportOpen, setIsBatchImportOpen] = useState(false);
  const [droppedFiles, setDroppedFiles] = useState<File[]>([]);
  const [isDraggingOver, setIsDraggingOver] = useState(false);

  const extractFilesFromDrop = async (dataTransfer: DataTransfer): Promise<File[]> => {
    const fileEntries: File[] = [];
    const items = Array.from(dataTransfer.items || []);

    const processEntry = async (entry: any) => {
      if (entry.isFile) {
        await new Promise<void>((resolve) => {
          entry.file((file: File) => {
            if (file.name && !file.name.startsWith('.')) {
              fileEntries.push(file);
            }
            resolve();
          }, () => resolve());
        });
      } else if (entry.isDirectory) {
        const dirReader = entry.createReader();
        const entries: any[] = await new Promise((resolve) => {
          dirReader.readEntries((results: any[]) => resolve(results), () => resolve([]));
        });
        for (const childEntry of entries) {
          await processEntry(childEntry);
        }
      }
    };

    const queue: Promise<void>[] = [];
    for (const item of items) {
      if (item.kind === 'file') {
        const entry = item.webkitGetAsEntry ? item.webkitGetAsEntry() : null;
        if (entry) {
          queue.push(processEntry(entry));
        } else {
          const file = item.getAsFile();
          if (file) fileEntries.push(file);
        }
      }
    }

    await Promise.all(queue);
    return fileEntries.length > 0 ? fileEntries : Array.from(dataTransfer.files || []);
  };

  const addFileInputId = 'preview-pane-add-file-input';

  const queryKey = ['documents', 'owner', ownerType, ownerId];
  const { data: folder, isLoading } = useQuery({
    queryKey,
    queryFn: () => documentService.getOwnerFolder(ownerType, ownerId),
    enabled: !!ownerId,
  });

  const { data: driver } = useQuery({
    queryKey: ['driver', ownerId],
    queryFn: () => driverService.getById(ownerId),
    enabled: !!ownerId && ownerType === 'Driver',
  });

  const { data: vehicle } = useQuery({
    queryKey: ['vehicle', ownerId],
    queryFn: () => vehicleService.getById(ownerId),
    enabled: !!ownerId && ownerType === 'Vehicle',
  });

  const refresh = async () => {
    await queryClient.invalidateQueries({ queryKey });
    await queryClient.invalidateQueries({ queryKey: ['documents'] });
  };

  // Filter slots based on search and filters
  const filteredSlots = useMemo(() => {
    if (!folder?.slots) return [];
    return folder.slots.filter((slot) => {
      const docName = slot.documentType.name.toLowerCase();
      const docNum = slot.document?.ai_extracted_json?.document_number?.toLowerCase() || '';
      const query = searchQuery.toLowerCase().trim();

      const matchesSearch = !query || docName.includes(query) || docNum.includes(query);
      const matchesStatus = statusFilter === 'ALL' || slot.status === statusFilter;
      const matchesRequirement = requirementFilter === 'ALL' || slot.documentType.requirementStatus === requirementFilter;

      return matchesSearch && matchesStatus && matchesRequirement;
    });
  }, [folder?.slots, searchQuery, statusFilter, requirementFilter]);

  // Set default selected slot for split view if none selected
  const activeSlot = useMemo(() => {
    if (!folder?.slots) return null;
    if (selectedSlotId) {
      const found = folder.slots.find((s) => s.documentType.id === selectedSlotId);
      if (found) return found;
    }
    // Default to first slot with a document, or first slot
    return folder.slots.find((s) => s.document) || folder.slots[0] || null;
  }, [folder?.slots, selectedSlotId]);

  const activeDoc = activeSlot?.document || null;

  useEffect(() => setPreviewError(false), [activeDoc?.id, activeFileIdx, previewRetryKey]);

  // Active files inside selected doc
  const activeDocFiles = activeDoc?.files && activeDoc.files.length > 0
    ? activeDoc.files
    : activeDoc ? [{ id: 'primary', file_url: activeDoc.file_url, mime_type: activeDoc.mime_type, label: 'Primary File' }] : [];
  const activeFile = activeDocFiles[activeFileIdx] || activeDocFiles[0];

  const handleZoomIn = () => setZoomLevel((z) => Math.min(z + 0.25, 3));
  const handleZoomOut = () => setZoomLevel((z) => Math.max(z - 0.25, 0.5));
  const handleRotate = () => setRotation((r) => (r + 90) % 360);
  const handleResetView = () => {
    setZoomLevel(1);
    setRotation(0);
  };

  const handleAddFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file || !activeDoc) return;
    try {
      toast.loading('Adding file...', { id: 'pane-add-file' });
      await documentService.addFile(activeDoc.id, file);
      toast.success('File added', { id: 'pane-add-file' });
      await refresh();
    } catch (err: any) {
      toast.error(err.response?.data?.error?.message || 'Failed to add file', { id: 'pane-add-file' });
    }
  };

  const handleRescan = async () => {
    if (!activeDoc) return;
    setIsRescanning(true);
    try {
      toast.loading('Re-scanning with AI Vision...', { id: 'rescan-pane' });
      await documentService.extractDocumentOcr(activeDoc.id);
      toast.success('AI metadata updated', { id: 'rescan-pane' });
      await refresh();
    } catch (err: any) {
      toast.error(err.response?.data?.error?.message || 'Re-scan failed', { id: 'rescan-pane' });
    } finally {
      setIsRescanning(false);
    }
  };

  const handleDeleteDocument = async (docId: string) => {
    if (!confirm('Delete this document? This action cannot be undone.')) return;
    setIsDeleting(true);
    try {
      await documentService.delete(docId);
      toast.success('Document deleted successfully');
      await queryClient.invalidateQueries({ queryKey: ['documents'] });
      await queryClient.invalidateQueries({ queryKey: ['ownerFolders'] });
      await queryClient.invalidateQueries({ queryKey: ['driver-folder-slots'] });
      await queryClient.invalidateQueries({ queryKey: ['vehicle-folder-slots'] });
      await queryClient.invalidateQueries({ queryKey: ['driver', ownerId] });
      await queryClient.invalidateQueries({ queryKey: ['vehicle', ownerId] });
      await refresh();
    } catch {
      toast.error('Failed to delete document');
    } finally {
      setIsDeleting(false);
    }
  };

  const handleDeleteActiveDoc = () => {
    if (activeDoc) handleDeleteDocument(activeDoc.id);
  };

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-slate-400 gap-3">
        <Loader2 className="w-8 h-8 animate-spin text-brand" />
        <p className="text-sm font-semibold">Loading owner document vault...</p>
      </div>
    );
  }

  if (!folder) return null;

  // KPI Calculations
  const totalSlots = folder.slots.length;
  const mandatoryTotal = folder.mandatoryTotal;
  const mandatoryComplete = folder.mandatoryComplete;
  const compliancePercentage = mandatoryTotal > 0 ? Math.round((mandatoryComplete / mandatoryTotal) * 100) : 100;
  const validCount = folder.slots.filter((s) => s.status === 'VALID').length;
  const expiringCount = folder.slots.filter((s) => s.status === 'EXPIRING_SOON').length;
  const expiredOrMissingCount = folder.slots.filter((s) => s.status === 'EXPIRED' || s.status === 'MISSING').length;

  const mandatorySlots = filteredSlots.filter((s) => s.documentType.requirementStatus === 'MANDATORY');
  const optionalSlots = filteredSlots.filter((s) => s.documentType.requirementStatus === 'OPTIONAL');

  return (
    <div
      onDragOver={(e) => { e.preventDefault(); setIsDraggingOver(true); }}
      onDragLeave={() => setIsDraggingOver(false)}
      onDrop={async (e) => {
        e.preventDefault();
        setIsDraggingOver(false);
        const files = await extractFilesFromDrop(e.dataTransfer);
        if (files.length > 0) {
          setDroppedFiles(files);
          setIsBatchImportOpen(true);
        }
      }}
      className="space-y-6 relative"
    >
      {isDraggingOver && (
        <div className="absolute inset-0 z-50 bg-indigo-950/85 backdrop-blur-xs rounded-2xl border-4 border-dashed border-indigo-400 flex flex-col items-center justify-center text-white p-6 text-center animate-in fade-in duration-150 shadow-2xl">
          <FolderPlus className="w-16 h-16 mb-3 text-indigo-300 animate-bounce" />
          <h3 className="text-xl font-black">Drop Folder or Multiple Files Here</h3>
          <p className="text-sm font-medium text-indigo-200 mt-1 max-w-md">
            AI Vision will automatically read each document, verify if it belongs to {folder.ownerName}, and identify document types.
          </p>
        </div>
      )}
      


      {/* 3. Main View Mode Area */}
      
      {/* MODE 1: SPLIT PREVIEW MODE (Default) */}
      {viewMode === 'split' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch">
          
          {/* Left Column: Slot List (5/12 width) */}
          <div className="lg:col-span-5 flex flex-col">
            <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-xs p-4 flex-1 flex flex-col gap-4 min-h-[580px]">
              <div className="flex-1 overflow-y-auto space-y-5 scrollbar-thin">
                {/* Mandatory Section */}
                {mandatorySlots.length > 0 && (
                  <SlotSection
                    title="Mandatory Compliance Requirements"
                    slots={mandatorySlots}
                    selectedSlotId={activeSlot?.documentType.id || null}
                    onSelectSlot={(slot) => { setSelectedSlotId(slot.documentType.id); setActiveFileIdx(0); handleResetView(); }}
                    onUpload={setUploadSlot}
                  />
                )}

                {/* Optional Section */}
                {optionalSlots.length > 0 && (
                  <SlotSection
                    title="Optional Documents & Records"
                    slots={optionalSlots}
                    selectedSlotId={activeSlot?.documentType.id || null}
                    onSelectSlot={(slot) => { setSelectedSlotId(slot.documentType.id); setActiveFileIdx(0); handleResetView(); }}
                    onUpload={setUploadSlot}
                  />
                )}

                {filteredSlots.length === 0 && (
                  <div className="p-8 text-center rounded-2xl border border-dashed border-slate-300 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-900/50">
                    <FileQuestion className="w-8 h-8 mx-auto text-slate-400 mb-2" />
                    <p className="text-xs font-bold text-slate-600 dark:text-slate-300">No matching document slots found</p>
                    <p className="text-[11px] text-slate-400 mt-1">Try resetting your search or status filters.</p>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Right Column: Embedded Live Previewer Pane (7/12 width) */}
          <div className="lg:col-span-7 space-y-4">
            {activeSlot ? (
              <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 overflow-hidden shadow-xs flex flex-col min-h-[580px]">
                
                {/* Preview Header */}
                <div className="p-4 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between gap-3 bg-slate-50/50 dark:bg-slate-900/50">
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="text-sm font-black text-slate-900 dark:text-slate-100">
                        {activeSlot.documentType.name}
                      </h3>
                      {activeSlot.document && (
                        <Badge variant="outline" className={cn('text-[10px] font-bold', STATUS_CONFIG[activeSlot.status].className)}>
                          {STATUS_CONFIG[activeSlot.status].label}
                        </Badge>
                      )}
                    </div>
                    {activeSlot.document?.expiry_date && (
                      <p className="text-xs text-slate-400 mt-0.5">
                        Expires: {formatInDeploymentTz(activeSlot.document.expiry_date, tz, 'MM/dd/yyyy')}
                      </p>
                    )}
                  </div>

                  {activeSlot.document && (
                    <Button
                      size="sm"
                      variant="outline"
                      className="h-8 text-xs font-bold gap-1 border-slate-200 dark:border-slate-700 text-indigo-600 dark:text-indigo-400"
                      onClick={() => navigate(`/documents/doc/${activeSlot.document!.id}`)}
                    >
                      Full Page View <ArrowUpRight className="w-3.5 h-3.5" />
                    </Button>
                  )}
                </div>

                {/* Canvas & Content */}
                {activeSlot.document ? (
                  <div className="flex-1 flex flex-col">
                    
                    {/* Toolbar for image/pdf controls */}
                    <div className="px-4 py-2 bg-slate-950 text-slate-300 flex items-center justify-between text-xs">
                      <span className="text-slate-400 text-[11px]">
                        File {activeFileIdx + 1} of {activeDocFiles.length}
                      </span>

                      <div className="flex items-center gap-1">
                        {isImageFile(activeFile?.file_url, activeFile?.mime_type) && (
                          <>
                            <button onClick={handleZoomOut} className="p-1 hover:text-white" title="Zoom Out"><ZoomOut className="w-3.5 h-3.5" /></button>
                            <span className="font-mono text-[10px] w-8 text-center text-slate-400">{Math.round(zoomLevel * 100)}%</span>
                            <button onClick={handleZoomIn} className="p-1 hover:text-white" title="Zoom In"><ZoomIn className="w-3.5 h-3.5" /></button>
                            <button onClick={handleRotate} className="p-1 hover:text-white" title="Rotate"><RotateCw className="w-3.5 h-3.5" /></button>
                            <button onClick={handleResetView} className="p-1 hover:text-white" title="Reset"><RefreshCw className="w-3.5 h-3.5" /></button>
                          </>
                        )}
                        <a
                          href={resolveFileUrl(activeFile?.file_url)}
                          target="_blank"
                          rel="noreferrer"
                          className="p-1 hover:text-white text-indigo-300 ml-2 flex items-center gap-1 text-[11px]"
                          title="Open External"
                        >
                          <ExternalLink className="w-3.5 h-3.5" />
                        </a>
                      </div>
                    </div>

                    {/* Viewport Canvas */}
                    <div className="flex-1 min-h-[340px] bg-slate-900 flex items-center justify-center p-3 relative overflow-hidden">
                      {previewError ? (
                        <div className="flex flex-col items-center gap-2 text-slate-400 py-10 px-4 text-center">
                          <FileText className="w-10 h-10" />
                          <p className="text-xs">Preview failed to load — this can happen on a slow connection.</p>
                          <button
                            type="button"
                            onClick={() => setPreviewRetryKey((k) => k + 1)}
                            className="text-xs font-bold text-indigo-400 hover:text-indigo-300"
                          >
                            Retry
                          </button>
                        </div>
                      ) : isImageFile(activeFile?.file_url, activeFile?.mime_type) ? (
                        <div className="transition-transform duration-150 flex items-center justify-center" style={{ transform: `scale(${zoomLevel}) rotate(${rotation}deg)` }}>
                          <img key={previewRetryKey} src={resolveFileUrl(activeFile.file_url)} alt="" className="max-h-[320px] object-contain rounded" onError={() => setPreviewError(true)} />
                        </div>
                      ) : isPdfFile(activeFile?.file_url, activeFile?.mime_type) ? (
                        <iframe key={previewRetryKey} src={resolveFileUrl(activeFile.file_url)} title="Doc Preview" className="w-full h-[320px] rounded border-0 bg-white" onError={() => setPreviewError(true)} />
                      ) : (
                        <div className="flex flex-col items-center gap-2 text-slate-400 py-10">
                          <FileText className="w-10 h-10" />
                          <a href={resolveFileUrl(activeFile.file_url)} target="_blank" rel="noreferrer" className="text-xs font-bold text-indigo-400 flex items-center gap-1">
                            Open Attachment <ExternalLink className="w-3.5 h-3.5" />
                          </a>
                        </div>
                      )}
                    </div>

                    {/* Multi-file Carousel */}
                    {activeDocFiles.length > 0 && (
                      <div className="p-2.5 bg-slate-950 border-t border-slate-800 flex items-center gap-2 overflow-x-auto">
                        {activeDocFiles.map((f, idx) => (
                          <button
                            key={f.id}
                            onClick={() => { setActiveFileIdx(idx); handleResetView(); }}
                            className={cn(
                              'w-12 h-12 rounded-lg border-2 shrink-0 overflow-hidden bg-slate-900 flex items-center justify-center',
                              idx === activeFileIdx ? 'border-indigo-500 shadow-sm' : 'border-slate-800 opacity-60 hover:opacity-100'
                            )}
                          >
                            {isImageFile(f.file_url, f.mime_type) ? (
                              <img src={resolveFileUrl(f.file_url)} alt="" className="w-full h-full object-cover" />
                            ) : (
                              <FileText className="w-4 h-4 text-slate-400" />
                            )}
                          </button>
                        ))}
                        {activeDoc?.documentType?.allowsMultipleFiles !== false && (
                          <>
                            <label
                              htmlFor={addFileInputId}
                              className="w-12 h-12 rounded-lg border-2 border-dashed border-slate-700 hover:border-indigo-500 shrink-0 flex items-center justify-center cursor-pointer text-slate-400 hover:text-indigo-400"
                              title="Add Page"
                            >
                              <Plus className="w-4 h-4" />
                            </label>
                            <input id={addFileInputId} type="file" accept=".pdf,.png,.jpg,.jpeg,.webp,.heic,.heif,.gif,.doc,.docx,.xls,.xlsx,.txt,.rtf,.csv" className="hidden" onChange={handleAddFile} />
                          </>
                        )}
                      </div>
                    )}

                    {/* AI OCR Metadata */}
                    {activeDoc?.ai_extracted_json && (() => {
                      const aiJson = activeDoc.ai_extracted_json;
                      return (
                        <div className="p-3 bg-amber-50/50 dark:bg-amber-950/20 border-t border-amber-200/60 dark:border-amber-900/40 text-xs space-y-1.5">
                          <div className="flex items-center justify-between">
                            <span className="font-extrabold text-amber-800 dark:text-amber-400 text-[10px] uppercase flex items-center gap-1">
                              <Sparkles className="w-3.5 h-3.5" /> AI Vision OCR Analysis
                            </span>
                            {typeof aiJson.confidence === 'number' && (
                              <span className="font-mono font-bold text-emerald-600 text-[10px]">
                                {Math.round(aiJson.confidence * 100)}% Confidence
                              </span>
                            )}
                          </div>
                          <div className="grid grid-cols-2 gap-2 text-[11px]">
                            {aiJson.document_number && (
                              <div><span className="text-slate-400">Doc #:</span> <strong className="font-mono text-slate-800 dark:text-slate-200">{aiJson.document_number}</strong></div>
                            )}
                            {aiJson.issuing_authority && (
                              <div><span className="text-slate-400">Issuer:</span> <strong className="text-slate-800 dark:text-slate-200">{formatBilingualAuthority(aiJson.issuing_authority)}</strong></div>
                            )}
                          </div>
                        </div>
                      );
                    })()}

                    {/* Quick Action Footer */}
                    <div className="p-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between gap-2 bg-white dark:bg-slate-900">
                      <div className="flex items-center gap-2">
                        <a
                          href={resolveFileUrl(activeFile?.file_url)}
                          download
                          className="h-8 px-3 rounded-lg border border-slate-200 dark:border-slate-700 text-xs font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1 hover:bg-slate-50 dark:hover:bg-slate-800"
                        >
                          <Download className="w-3.5 h-3.5" /> Download
                        </a>
                        <Button
                          variant="outline"
                          size="sm"
                          className="h-8 text-xs font-bold gap-1 border-amber-200 dark:border-amber-900 text-amber-700 dark:text-amber-400"
                          onClick={handleRescan}
                          disabled={isRescanning}
                        >
                          {isRescanning ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Sparkles className="w-3.5 h-3.5" />} Re-Scan
                        </Button>
                      </div>

                      <Button
                        variant="outline"
                        size="sm"
                        className="h-8 text-xs font-bold gap-1 border-rose-200 text-rose-600 hover:bg-rose-50 dark:border-rose-900 dark:hover:bg-rose-950/40"
                        onClick={handleDeleteActiveDoc}
                        disabled={isDeleting}
                      >
                        {isDeleting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Trash2 className="w-3.5 h-3.5" />} Delete
                      </Button>
                    </div>

                  </div>
                ) : (
                  <div className="flex-1 flex flex-col items-center justify-center p-8 text-center gap-3 text-slate-400">
                    <FileQuestion className="w-12 h-12 text-slate-300 dark:text-slate-700" />
                    <div>
                      <h4 className="text-sm font-bold text-slate-700 dark:text-slate-300">Document Missing</h4>
                      <p className="text-xs text-slate-400 mt-1 max-w-xs">This required slot has no uploaded document file attached.</p>
                    </div>
                  </div>
                )}

              </div>
            ) : (
              <div className="h-full min-h-[580px] rounded-2xl border border-dashed border-slate-300 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-900/50 flex flex-col items-center justify-center p-8 text-center text-slate-400 gap-2">
                <FileText className="w-10 h-10 text-slate-300" />
                <p className="text-xs font-bold">Select a document slot from the left list to preview</p>
              </div>
            )}
          </div>
        </div>
      )}


      {/* MODE 2: TABLE LEDGER MODE */}
      {viewMode === 'table' && (
        <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 overflow-hidden shadow-xs">
          <div className="px-5 py-3 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
            <h3 className="text-xs font-black uppercase tracking-wider text-slate-500">
              Document Ledger ({filteredSlots.length} Slots)
            </h3>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 dark:bg-slate-800/50 text-slate-500 uppercase tracking-wider font-extrabold text-[10px] border-b border-slate-100 dark:border-slate-800">
                <tr>
                  <th className="py-3 px-4">Document Type</th>
                  <th className="py-3 px-4">Requirement</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4">Document #</th>
                  <th className="py-3 px-4">Expiry Date</th>
                  <th className="py-3 px-4">Files</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {filteredSlots.map((slot) => {
                  const status = STATUS_CONFIG[slot.status];
                  const StatusIcon = status.icon;
                  const fileCount = slot.document?.files?.length ?? (slot.document ? 1 : 0);
                  return (
                    <tr key={slot.documentType.id} className="hover:bg-slate-50/80 dark:hover:bg-slate-800/50 transition-colors">
                      <td className="py-3 px-4 font-extrabold text-slate-900 dark:text-slate-100">
                        {slot.documentType.name}
                      </td>
                      <td className="py-3 px-4">
                        <Badge variant="outline" className="text-[10px] font-bold">
                          {slot.documentType.requirementStatus}
                        </Badge>
                      </td>
                      <td className="py-3 px-4">
                        <Badge variant="outline" className={cn('text-[10px] font-bold gap-1', status.className)}>
                          <StatusIcon className="w-3 h-3" />
                          {status.label}
                        </Badge>
                      </td>
                      <td className="py-3 px-4 font-mono font-bold text-slate-700 dark:text-slate-300">
                        {slot.document?.ai_extracted_json?.document_number || '—'}
                      </td>
                      <td className="py-3 px-4 font-medium text-slate-600 dark:text-slate-400">
                        {slot.document?.expiry_date ? formatInDeploymentTz(slot.document.expiry_date, tz, 'MM/dd/yyyy') : '—'}
                      </td>
                      <td className="py-3 px-4">
                        {fileCount > 0 ? (
                          <span className="text-[11px] font-bold text-slate-600 dark:text-slate-300 flex items-center gap-1">
                            <Files className="w-3 h-3" /> {fileCount}
                          </span>
                        ) : '—'}
                      </td>
                      <td className="py-3 px-4 text-right">
                        {slot.document ? (
                          <div className="flex items-center justify-end gap-1">
                            <Button
                              size="sm"
                              variant="ghost"
                              className="h-7 text-xs font-bold text-indigo-600 dark:text-indigo-400"
                              onClick={() => navigate(`/documents/doc/${slot.document!.id}`)}
                            >
                              <Eye className="w-3.5 h-3.5 mr-1" /> View Details
                            </Button>
                            <Button
                              size="sm"
                              variant="ghost"
                              className="h-7 px-2 text-xs font-bold text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40"
                              onClick={() => handleDeleteDocument(slot.document!.id)}
                              disabled={isDeleting}
                              title="Delete Document"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </Button>
                          </div>
                        ) : (
                          <Button
                            size="sm"
                            variant="outline"
                            className="h-7 px-2.5 text-[11px] font-bold gap-1"
                            onClick={() => setIsBatchImportOpen(true)}
                          >
                            <UploadCloud className="w-3.5 h-3.5" /> Upload
                          </Button>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Upload Modal Handler */}
      {uploadSlot && (
        <UploadDocumentModal
          isOpen={!!uploadSlot}
          onClose={() => setUploadSlot(null)}
          entityType={ownerType}
          entityId={ownerId}
          documentTypeId={uploadSlot.documentType.id}
          documentTypeName={uploadSlot.documentType.name}
          lockOwner
          ownerDisplayName={folder.ownerName}
          onUploadSuccess={refresh}
        />
      )}

      {isBatchImportOpen && (
        <ImportReviewModal
          isOpen={isBatchImportOpen}
          onClose={() => { setIsBatchImportOpen(false); setDroppedFiles([]); }}
          lockOwnerType={ownerType}
          lockOwnerId={ownerId}
          ownerDisplayName={folder.ownerName}
          initialFiles={droppedFiles}
          onImported={refresh}
        />
      )}
    </div>
  );
}

function SlotSection({
  title, slots, selectedSlotId, onSelectSlot, onUpload,
}: {
  title: string;
  slots: OwnerFolderSlot[];
  selectedSlotId: string | null;
  onSelectSlot: (slot: OwnerFolderSlot) => void;
  onUpload: (slot: OwnerFolderSlot) => void;
}) {
  const tz = useDeploymentTimezone();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const refresh = async () => {
    await queryClient.invalidateQueries({ queryKey: ['documents'] });
    await queryClient.invalidateQueries({ queryKey: ['folders'] });
  };

  if (slots.length === 0) return null;
  return (
    <div className="space-y-2">
      <h4 className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider px-1">{title}</h4>
      <div className="divide-y divide-slate-100 dark:divide-slate-800 overflow-hidden bg-slate-50/50 dark:bg-slate-900/30 rounded-xl border border-slate-100 dark:border-slate-800/80">
        {slots.map((slot) => {
          const status = STATUS_CONFIG[slot.status];
          const StatusIcon = status.icon;
          const fileCount = slot.document?.files?.length ?? (slot.document ? 1 : 0);
          const isSelected = slot.documentType.id === selectedSlotId;

          return (
            <div
              key={slot.documentType.id}
              onClick={() => onSelectSlot(slot)}
              className={cn(
                'flex items-center justify-between gap-3 px-4 py-3.5 cursor-pointer transition-all',
                isSelected ? 'bg-indigo-50/70 dark:bg-indigo-950/40 border-l-4 border-l-indigo-600' : 'hover:bg-slate-50 dark:hover:bg-slate-800/50'
              )}
            >
              <div className="flex items-center gap-3 min-w-0 flex-1">
                <StatusIcon className={cn('w-4 h-4 shrink-0', status.className.split(' ')[1])} />
                <div className="min-w-0">
                  <p className={cn('text-xs font-bold truncate', isSelected ? 'text-indigo-950 dark:text-indigo-200' : 'text-slate-900 dark:text-slate-100')}>
                    {slot.documentType.name}
                  </p>
                  {slot.document?.expiry_date ? (
                    <p className="text-[11px] text-slate-400">
                      Expires {formatInDeploymentTz(slot.document.expiry_date, tz, 'MM/dd/yyyy')}
                    </p>
                  ) : slot.document ? (
                    <p className="text-[11px] text-slate-400">Uploaded: {formatInDeploymentTz(slot.document.createdAt, tz, 'MM/dd/yyyy')}</p>
                  ) : (
                    <p className="text-[11px] text-rose-500 font-bold">Missing file</p>
                  )}
                </div>
              </div>

              <div className="flex items-center gap-3 shrink-0" onClick={(e) => e.stopPropagation()}>
                {fileCount > 1 && (
                  <span className="text-[10px] text-slate-400 flex items-center gap-1 font-bold">
                    <Files className="w-3 h-3" />{fileCount}
                  </span>
                )}
                
                <div className="w-24 flex justify-end shrink-0">
                  <Badge variant="outline" className={cn('text-[10px] font-bold w-full justify-center', slot.document ? status.className : 'bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-950/40 dark:text-rose-400')}>
                    {slot.document ? status.label : 'Missing'}
                  </Badge>
                </div>

                <div className="flex items-center gap-1.5 shrink-0">
                  {slot.document ? (
                    <>
                      <Button
                        size="sm"
                        variant="outline"
                        className="h-7 px-2.5 text-[11px] font-bold gap-1 border-indigo-200 text-indigo-600 hover:bg-indigo-50"
                        onClick={() => onSelectSlot(slot)}
                      >
                        <Eye className="w-3.5 h-3.5" /> View
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        className="h-7 px-2 text-[11px] font-bold gap-1 border-slate-200 text-slate-600 hover:bg-slate-50"
                        onClick={() => onUpload(slot)}
                      >
                        <UploadCloud className="w-3.5 h-3.5" /> Upload
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        className="h-7 px-2 text-[11px] font-bold gap-1 border-rose-200 text-rose-600 hover:bg-rose-50"
                        onClick={async () => {
                          if (confirm(`Delete this document (${slot.documentType.name})? This action cannot be undone.`)) {
                            try {
                              toast.loading('Deleting document...', { id: 'delete-doc' });
                              await documentService.delete(slot.document!.id);
                              toast.success('Document deleted successfully', { id: 'delete-doc' });
                              window.location.reload();
                            } catch {
                              toast.error('Failed to delete document', { id: 'delete-doc' });
                            }
                          }
                        }}
                      >
                        <Trash2 className="w-3.5 h-3.5" /> Delete
                      </Button>
                    </>
                  ) : (
                    <Button
                      size="sm"
                      variant="outline"
                      className="h-7 px-2 text-[11px] font-bold gap-1 border-rose-200 text-rose-600 hover:bg-rose-50"
                      onClick={() => onUpload(slot)}
                    >
                      <UploadCloud className="w-3.5 h-3.5" /> Upload
                    </Button>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
