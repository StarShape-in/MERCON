import { useState, useMemo, useEffect } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import {
  UploadCloud, CheckCircle2, AlertTriangle, XCircle, FileQuestion, Eye, Loader2, Files,
  Download, Trash2, Plus, ExternalLink, RefreshCw, FileText, Hash, Building2,
  Calendar, History, Clock, Sparkles, Edit2, Save, FilePlus,
  ShieldCheck, Lock, Unlock, ShieldAlert, Info, ChevronRight, ArrowUpRight, Truck, User
} from 'lucide-react';
import { toast } from 'sonner';

import { documentService, type OwnerFolderSlot, type MerconDocument } from '@/services/documentService';
import { driverService } from '@/services/driverService';
import { vehicleService } from '@/services/vehicleService';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { DatePicker } from '@/components/ui/date-picker';
import UploadDocumentModal from '@/components/ui/UploadDocumentModal';
import ImportReviewModal from '@/components/documents/ImportReviewModal';
import DocumentCanvasViewer from '@/components/ui/DocumentCanvasViewer';
import {
  formatBilingualAuthority, resolveFileUrl, CENTRAL_SLOT_STATUS,
  getSlotStatusFromDoc, formatDocDate, SlotStatusCode, getOwnerCardSummary
} from '@/lib/documents';
import { cn } from '@/lib/utils';
import { useDeploymentTimezone, formatInDeploymentTz } from '@/lib/datetime';

const STATUS_ICONS: Record<SlotStatusCode, { icon: any; className: string }> = {
  VALID: { icon: CheckCircle2, className: 'text-emerald-600' },
  EXPIRING_SOON: { icon: AlertTriangle, className: 'text-amber-500' },
  EXPIRED: { icon: XCircle, className: 'text-rose-600' },
  CRITICAL: { icon: AlertTriangle, className: 'text-rose-600' },
  MISSING: { icon: FileQuestion, className: 'text-slate-400' },
  NO_EXPIRY: { icon: CheckCircle2, className: 'text-emerald-600' },
};

interface OwnerFolderDetailProps {
  ownerType: 'Driver' | 'Vehicle';
  ownerId: string;
  onOpenAddCustomDoc?: () => void;
}

export default function OwnerFolderDetail({ ownerType, ownerId, onOpenAddCustomDoc }: OwnerFolderDetailProps) {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const tz = useDeploymentTimezone();

  const [selectedSlotId, setSelectedSlotId] = useState<string | null>(null);
  const [uploadSlot, setUploadSlot] = useState<OwnerFolderSlot | null>(null);
  const [isReplaceOpen, setIsReplaceOpen] = useState(false);
  const [isBatchImportOpen, setIsBatchImportOpen] = useState(false);
  const [droppedFiles, setDroppedFiles] = useState<File[]>([]);

  // Edit Date State for Inspector
  const [isEditingDates, setIsEditingDates] = useState(false);
  const [editIssueDate, setEditIssueDate] = useState('');
  const [editExpiryDate, setEditExpiryDate] = useState('');
  const [isSavingDates, setIsSavingDates] = useState(false);
  const [isRescanning, setIsRescanning] = useState(false);

  // Queries for Owner Details (Driver & Vehicle)
  const { data: driver } = useQuery({
    queryKey: ['driver', ownerId],
    queryFn: () => driverService.getById(ownerId!),
    enabled: !!ownerId && ownerType === 'Driver',
  });

  const { data: vehicle } = useQuery({
    queryKey: ['vehicle', ownerId],
    queryFn: () => vehicleService.getById(ownerId!),
    enabled: !!ownerId && ownerType === 'Vehicle',
  });

  const queryKey = ['documents', 'owner', ownerType, ownerId];
  const { data: folder, isLoading } = useQuery({
    queryKey,
    queryFn: () => documentService.getOwnerFolder(ownerType, ownerId),
    enabled: !!ownerId,
  });

  const refresh = async () => {
    await queryClient.invalidateQueries({ queryKey });
    await queryClient.invalidateQueries({ queryKey: ['documents'] });
    await queryClient.invalidateQueries({ queryKey: ['vehicle', ownerId] });
    await queryClient.invalidateQueries({ queryKey: ['driver', ownerId] });
  };

  // Active selected slot
  const activeSlot = useMemo(() => {
    if (!folder?.slots) return null;
    const currentId = selectedSlotId || folder.slots[0]?.documentType.id;
    return folder.slots.find((s) => s.documentType.id === currentId) || folder.slots[0] || null;
  }, [folder?.slots, selectedSlotId]);

  const activeDoc = activeSlot?.document || null;

  // Initialize edit date inputs when active document changes
  useEffect(() => {
    setIsEditingDates(false);
    if (activeDoc) {
      setEditIssueDate(activeDoc.issue_date ? activeDoc.issue_date.slice(0, 10) : '');
      setEditExpiryDate(activeDoc.expiry_date ? activeDoc.expiry_date.slice(0, 10) : '');
    }
  }, [activeDoc?.id]);

  const handleRescan = async () => {
    if (!activeDoc) return;
    setIsRescanning(true);
    try {
      toast.loading('Running AI Vision OCR extraction...', { id: 'rescan' });
      await documentService.extractDocumentOcr(activeDoc.id);
      toast.success('AI Metadata updated', { id: 'rescan' });
      await refresh();
    } catch (err: any) {
      toast.error(err.response?.data?.error?.message || 'AI Vision scan failed', { id: 'rescan' });
    } finally {
      setIsRescanning(false);
    }
  };

  const handleSaveDates = async () => {
    if (!activeDoc) return;
    setIsSavingDates(true);
    try {
      toast.loading('Saving date changes...', { id: 'save-dates' });
      await documentService.updateDates(activeDoc.id, {
        issue_date: editIssueDate || null,
        expiry_date: editExpiryDate || null,
      });
      toast.success('Document dates updated & compliance recalculated', { id: 'save-dates' });
      setIsEditingDates(false);
      await refresh();
    } catch (err: any) {
      toast.error(err.response?.data?.error?.message || 'Failed to update dates', { id: 'save-dates' });
    } finally {
      setIsSavingDates(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-slate-400 gap-3">
        <Loader2 className="w-8 h-8 animate-spin text-brand" />
        <p className="text-xs font-bold">Loading document details workspace...</p>
      </div>
    );
  }

  if (!folder) return null;

  const cardSummary = getOwnerCardSummary(folder.slots || []);
  const issueSlots = folder.slots.filter((s) => {
    const code = getSlotStatusFromDoc(s.document);
    return code !== 'VALID' && code !== 'NO_EXPIRY';
  });
  const isFullyCompliant = issueSlots.length === 0;

  const activeDocFiles = activeDoc?.files && activeDoc.files.length > 0
    ? activeDoc.files
    : activeDoc ? [{ id: 'primary', file_url: activeDoc.file_url, mime_type: activeDoc.mime_type, label: 'Primary File' }] : [];

  return (
    <div className="h-full flex flex-col space-y-3 overflow-hidden">
      
      {/* ── Top Document Selection Tab Buttons Bar (Compact, Sleek & Well Spaced) ──────────────── */}
      <div className="flex items-center gap-2 overflow-x-auto pt-1 pb-1.5 mt-1 mb-3 shrink-0 scrollbar-none">
        {folder.slots.map((slot) => {
          const isSelected = activeSlot?.documentType.id === slot.documentType.id;
          const doc = slot.document;
          const code = getSlotStatusFromDoc(doc);
          const StatusIcon = STATUS_ICONS[code]?.icon || FileQuestion;
          const iconColor = STATUS_ICONS[code]?.className || 'text-slate-400';
          const isExpiredOrMissing = code === 'EXPIRED' || code === 'MISSING' || code === 'CRITICAL';
          const isExpiring = code === 'EXPIRING_SOON';

          return (
            <button
              key={slot.documentType.id}
              type="button"
              onClick={() => setSelectedSlotId(slot.documentType.id)}
              className={cn(
                "px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-2 border transition-all cursor-pointer shrink-0 whitespace-nowrap shadow-2xs",
                isSelected
                  ? "bg-[#FA634E] text-white border-[#FA634E] shadow-xs ring-2 ring-[#FA634E]/20 font-black"
                  : isExpiredOrMissing
                    ? "bg-rose-50/80 hover:bg-rose-100/80 text-rose-700 border-rose-200/80 dark:bg-rose-950/30 dark:text-rose-300 dark:border-rose-800"
                    : isExpiring
                      ? "bg-amber-50/80 hover:bg-amber-100/80 text-amber-700 border-amber-200/80 dark:bg-amber-950/30 dark:text-amber-300 dark:border-amber-800"
                      : "bg-white hover:bg-slate-50 text-slate-700 border-slate-200 dark:bg-slate-900 dark:text-slate-200 dark:border-slate-800"
              )}
            >
              <StatusIcon className={cn("w-3.5 h-3.5 shrink-0", isSelected ? "text-white" : iconColor)} />
              <span>{slot.documentType.name}</span>
              {code === 'EXPIRED' && (
                <span className={cn("text-[9px] font-mono px-1.5 py-0.2 rounded-md font-bold", isSelected ? "bg-white/25 text-white" : "bg-rose-100 text-rose-700")}>
                  Expired
                </span>
              )}
              {code === 'MISSING' && (
                <span className={cn("text-[9px] font-mono px-1.5 py-0.2 rounded-md font-bold", isSelected ? "bg-white/25 text-white" : "bg-slate-100 text-slate-500")}>
                  Missing
                </span>
              )}
              {code === 'EXPIRING_SOON' && (
                <span className={cn("text-[9px] font-mono px-1.5 py-0.2 rounded-md font-bold", isSelected ? "bg-white/25 text-white" : "bg-amber-100 text-amber-700")}>
                  Expiring
                </span>
              )}
              {(code === 'VALID' || code === 'NO_EXPIRY') && (
                <span className={cn("text-[9px] font-mono px-1.5 py-0.2 rounded-md font-bold", isSelected ? "bg-white/25 text-white" : "bg-emerald-50 text-emerald-600")}>
                  Valid
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* ── 3. Master / Detail Workspace Split Grid (Left Details Box, Right Canvas Preview Box) ── */}
      <div className="flex-1 min-h-0 grid grid-cols-1 lg:grid-cols-12 gap-4 h-full overflow-hidden">
        
        {/* LEFT SIDE BOX: Selected Document Details & Metadata Inspector (4 / 12 width) */}
        <div className="lg:col-span-4 h-full flex flex-col overflow-y-auto pr-1 scrollbar-thin">
          {activeSlot ? (
            <div className="rounded-2xl border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900 p-4 shadow-2xs flex flex-col space-y-4">
              
              {/* Header */}
              <div className="flex items-start justify-between gap-3 pb-3 border-b border-slate-100 dark:border-slate-800">
                <div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <h2 className="text-base font-black text-slate-900 dark:text-slate-100 tracking-tight leading-none">
                      {activeSlot.documentType.name}
                    </h2>
                    
                    {activeDoc ? (
                      <Badge variant="outline" className={cn('text-[10px] font-extrabold px-2 py-0.5 shadow-3xs', (CENTRAL_SLOT_STATUS[getSlotStatusFromDoc(activeDoc)] || CENTRAL_SLOT_STATUS.VALID).className)}>
                        {(CENTRAL_SLOT_STATUS[getSlotStatusFromDoc(activeDoc)] || CENTRAL_SLOT_STATUS.VALID).label}
                      </Badge>
                    ) : (
                      <Badge variant="outline" className="bg-rose-50 text-rose-700 border-rose-200 font-extrabold text-[10px] px-2 py-0.5 shadow-3xs">
                        🔴 Missing
                      </Badge>
                    )}
                  </div>
                  <p className="text-xs text-slate-450 mt-1">
                    {activeDoc
                      ? activeDoc.expiry_date
                        ? `Expiry: ${formatInDeploymentTz(activeDoc.expiry_date, tz, 'dd/MM/yyyy')}`
                        : 'No expiry date required'
                      : 'Document file not uploaded'}
                  </p>
                </div>

                {activeDoc && (
                  <Button
                    size="sm"
                    variant="outline"
                    className="h-7 px-2.5 text-[11px] font-bold text-brand border-brand/30 hover:bg-brand/10 cursor-pointer shrink-0 shadow-2xs"
                    onClick={() => navigate(`/documents/doc/${activeDoc.id}`)}
                  >
                    <ExternalLink className="w-3 h-3 mr-1" /> Open
                  </Button>
                )}
              </div>

              {/* Document Details Content */}
              {activeDoc ? (
                <div className="space-y-4">
                  {/* AI Vision Extracted OCR Card */}
                  {activeDoc.ai_extracted_json && (
                    <div className="rounded-xl border border-amber-250/50 dark:border-amber-900/40 bg-amber-50/40 dark:bg-amber-950/20 p-3.5 space-y-2.5">
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] font-extrabold text-amber-800 dark:text-amber-300 uppercase tracking-wider flex items-center gap-1.5">
                          <Sparkles className="w-3.5 h-3.5 text-amber-500" /> AI OCR Extraction
                        </span>
                        {typeof activeDoc.ai_extracted_json.confidence === 'number' && (
                          <span className="text-[10px] font-mono font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/60 px-2 py-0.5 rounded-full border border-emerald-200/50">
                            {Math.round(activeDoc.ai_extracted_json.confidence * 100)}% CONFIDENCE
                          </span>
                        )}
                      </div>

                      {activeDoc.ai_extracted_json.document_number && (
                        <div>
                          <span className="text-[9px] font-extrabold text-slate-400 uppercase tracking-wider block">Doc Number</span>
                          <span className="font-mono text-xs font-black text-slate-900 dark:text-slate-100 tracking-wider">
                            {activeDoc.ai_extracted_json.document_number}
                          </span>
                        </div>
                      )}

                      {activeDoc.ai_extracted_json.issuing_authority && (
                        <div>
                          <span className="text-[9px] font-extrabold text-slate-400 uppercase tracking-wider block">Issuing Authority</span>
                          <span className="text-xs font-bold text-slate-800 dark:text-slate-200">
                            {formatBilingualAuthority(activeDoc.ai_extracted_json.issuing_authority)}
                          </span>
                        </div>
                      )}

                      <Button
                        variant="outline"
                        size="sm"
                        className="w-full h-7 text-[11px] font-bold gap-1 border-amber-300 text-amber-800 hover:bg-amber-100/50 cursor-pointer mt-1"
                        onClick={handleRescan}
                        disabled={isRescanning}
                      >
                        {isRescanning ? <Loader2 className="w-3 h-3 animate-spin" /> : <Sparkles className="w-3 h-3" />}
                        Re-Scan Document
                      </Button>
                    </div>
                  )}

                  {/* Date Attributes & Editing Card */}
                  <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-3.5 space-y-3">
                    <div className="flex items-center justify-between">
                      <h3 className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider flex items-center gap-1">
                        <Info className="w-3 h-3 text-slate-400" /> Attributes & Validity
                      </h3>
                      {!isEditingDates && (activeSlot.documentType.requiresExpiryDate || activeSlot.documentType.requiresIssueDate || activeDoc.expiry_date || activeDoc.issue_date) && (
                        <button
                          type="button"
                          onClick={() => setIsEditingDates(true)}
                          className="text-xs font-bold text-brand hover:underline flex items-center gap-1 cursor-pointer"
                        >
                          <Edit2 className="w-3 h-3" /> Edit Dates
                        </button>
                      )}
                    </div>

                    <div className="space-y-2">
                      {/* Issue Date */}
                      <div className="p-2.5 rounded-xl border border-slate-100 dark:border-slate-800 bg-slate-50/40 dark:bg-slate-950/10 flex items-center justify-between">
                        <span className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider">Issue Date</span>
                        {isEditingDates ? (
                          <div className="w-36">
                            <DatePicker
                              value={editIssueDate}
                              onChange={(_, dateStr) => setEditIssueDate(dateStr)}
                              placeholder="Issue Date..."
                            />
                          </div>
                        ) : (
                          <span className="text-xs font-black text-slate-800 dark:text-slate-200 font-mono">
                            {activeDoc.issue_date ? formatInDeploymentTz(activeDoc.issue_date, tz, 'dd/MM/yyyy') : 'Not Set'}
                          </span>
                        )}
                      </div>

                      {/* Expiry Date */}
                      <div className="p-2.5 rounded-xl border border-slate-100 dark:border-slate-800 bg-slate-50/40 dark:bg-slate-950/10 flex items-center justify-between">
                        <span className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider">Expiry Date</span>
                        {isEditingDates ? (
                          <div className="w-36">
                            <DatePicker
                              value={editExpiryDate}
                              onChange={(_, dateStr) => setEditExpiryDate(dateStr)}
                              placeholder="Expiry Date..."
                            />
                          </div>
                        ) : (
                          <span className="text-xs font-black text-slate-800 dark:text-slate-200 font-mono">
                            {activeDoc.expiry_date
                              ? formatInDeploymentTz(activeDoc.expiry_date, tz, 'dd/MM/yyyy')
                              : activeSlot.documentType.requiresExpiryDate
                              ? <span className="text-rose-600 font-bold">Expiry Date Missing</span>
                              : 'No expiry'}
                          </span>
                        )}
                      </div>

                      {/* Save / Cancel buttons when editing dates */}
                      {isEditingDates && (
                        <div className="p-2 bg-slate-50 dark:bg-slate-800/60 rounded-xl flex items-center justify-end gap-2 border border-slate-100 dark:border-slate-800">
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            className="h-7 text-xs font-bold text-slate-650 cursor-pointer"
                            onClick={() => setIsEditingDates(false)}
                          >
                            Cancel
                          </Button>
                          <Button
                            type="button"
                            size="sm"
                            className="h-7 text-xs font-bold gap-1 bg-brand text-white hover:bg-brand-hover cursor-pointer"
                            onClick={handleSaveDates}
                            disabled={isSavingDates}
                          >
                            {isSavingDates ? <Loader2 className="w-3 h-3 animate-spin" /> : <Save className="w-3 h-3" />}
                            Save Changes
                          </Button>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Actions Bar */}
                  <div className="pt-2 border-t border-slate-100 dark:border-slate-800 grid grid-cols-2 gap-2">
                    <a
                      href={resolveFileUrl(activeDocFiles[0]?.file_url || activeDoc.file_url)}
                      download
                      className="h-8.5 rounded-xl border border-slate-200 dark:border-slate-700 text-xs font-bold text-slate-700 dark:text-slate-200 flex items-center justify-center gap-1.5 hover:bg-slate-50 dark:hover:bg-slate-800 shadow-3xs"
                    >
                      <Download className="w-3.5 h-3.5" /> Download File
                    </a>
                    <Button
                      variant="outline"
                      size="sm"
                      className="h-8.5 text-xs font-bold gap-1.5 border-slate-200 text-slate-700 hover:bg-slate-50 dark:border-slate-800 dark:text-slate-300 dark:hover:bg-slate-800 cursor-pointer shadow-3xs"
                      onClick={() => setIsReplaceOpen(true)}
                    >
                      <RefreshCw className="w-3.5 h-3.5 text-slate-400" /> Replace Document
                    </Button>
                  </div>
                </div>
              ) : (
                /* Missing Document Empty State Card in Left Box */
                <div className="p-6 text-center space-y-3 bg-slate-50/50 dark:bg-slate-900/50 rounded-xl border border-dashed border-slate-200 dark:border-slate-800">
                  <div className="w-12 h-12 rounded-2xl bg-rose-50 text-rose-600 flex items-center justify-center mx-auto border border-rose-200/60">
                    <FileQuestion className="w-6 h-6" />
                  </div>
                  <div>
                    <p className="text-xs font-extrabold text-slate-900 dark:text-slate-100">
                      No document uploaded for {activeSlot.documentType.name}
                    </p>
                    <p className="text-[11px] text-slate-400 mt-1">
                      Upload the required compliance document to complete this record.
                    </p>
                  </div>
                  <Button
                    size="sm"
                    className="h-8.5 px-4 text-xs font-extrabold gap-1.5 bg-brand hover:bg-brand-hover text-white shadow-xs rounded-xl cursor-pointer"
                    onClick={() => setUploadSlot(activeSlot)}
                  >
                    <UploadCloud className="w-3.5 h-3.5" /> Upload Document
                  </Button>
                </div>
              )}
            </div>
          ) : (
            <div className="p-8 text-center text-slate-400 text-xs font-bold">
              Select a document tab above to inspect details.
            </div>
          )}
        </div>

        {/* RIGHT SIDE BOX: Full Canvas Document Preview (8 / 12 width - larger width preview) */}
        <div className="lg:col-span-8 h-full flex flex-col overflow-hidden">
          <div className="h-full rounded-2xl border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900 p-4 shadow-2xs flex flex-col space-y-2 overflow-hidden">
            <div className="flex items-center justify-between shrink-0 pb-2 border-b border-slate-100 dark:border-slate-800">
              <span className="text-xs font-black text-slate-800 dark:text-slate-200 flex items-center gap-2">
                <FileText className="w-4 h-4 text-brand" />
                <span>{activeSlot ? activeSlot.documentType.name : 'Document Preview'}</span>
              </span>
              {activeDoc && (
                <span className="text-[11px] font-mono text-slate-400 font-bold">
                  {activeDocFiles.length} File{activeDocFiles.length > 1 ? 's' : ''} Attached
                </span>
              )}
            </div>

            {activeDoc ? (
              <div className="flex-1 min-h-0 overflow-hidden">
                <DocumentCanvasViewer
                  files={activeDocFiles}
                  title={activeSlot ? activeSlot.documentType.name : 'Document Preview'}
                  canvasHeightClassName="h-full min-h-[480px]"
                />
              </div>
            ) : (
              <div className="flex-1 flex flex-col items-center justify-center text-slate-400 space-y-3 bg-slate-50/40 dark:bg-slate-900/40 rounded-xl border border-slate-100 dark:border-slate-800">
                <FileText className="w-12 h-12 text-slate-300 dark:text-slate-700" />
                <p className="text-xs font-bold text-slate-600 dark:text-slate-400">
                  No preview available
                </p>
                <p className="text-[11px] text-slate-400">
                  Upload a document for {activeSlot?.documentType.name || 'this slot'} to view preview.
                </p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Upload Missing Document Modal */}
      {uploadSlot && (
        <UploadDocumentModal
          isOpen={!!uploadSlot}
          onClose={() => setUploadSlot(null)}
          entityType={ownerType}
          entityId={ownerId}
          documentTypeId={uploadSlot.documentType.id}
          lockOwner
          onUploadSuccess={refresh}
        />
      )}

      {/* Replace Document Modal */}
      {isReplaceOpen && activeDoc && (
        <UploadDocumentModal
          isOpen={isReplaceOpen}
          onClose={() => setIsReplaceOpen(false)}
          entityType={ownerType}
          entityId={ownerId}
          documentTypeId={activeSlot?.documentType.id}
          lockOwner
          onUploadSuccess={refresh}
        />
      )}

      {/* Batch Import Review Modal */}
      {isBatchImportOpen && (
        <ImportReviewModal
          isOpen={isBatchImportOpen}
          onClose={() => setIsBatchImportOpen(false)}
          initialFiles={droppedFiles}
          lockOwnerType={ownerType}
          lockOwnerId={ownerId}
          onImported={refresh}
        />
      )}
    </div>
  );
}
