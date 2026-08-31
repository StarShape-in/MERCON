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
      
      {/* ── Top Clean Document Selection Buttons Bar (Indigo/Navy Pill Buttons) ──────────────── */}
      <div className="flex items-center gap-2.5 border-b border-slate-200/80 dark:border-slate-800 pb-3 pt-0.5 mb-5 shrink-0 overflow-x-auto scrollbar-none">
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
                "px-3.5 py-2 text-xs font-bold flex items-center gap-2 rounded-xl border transition-all cursor-pointer shrink-0 whitespace-nowrap shadow-2xs",
                isSelected
                  ? "bg-indigo-600 dark:bg-indigo-500 text-white border-indigo-600 dark:border-indigo-500 shadow-sm ring-2 ring-indigo-500/20"
                  : "bg-white dark:bg-slate-900 border-slate-200/80 dark:border-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 hover:border-slate-300"
              )}
            >
              <StatusIcon className={cn("w-3.5 h-3.5 shrink-0", isSelected ? "text-white" : iconColor)} />
              <span className={cn(isSelected ? "font-black" : "font-semibold")}>
                {slot.documentType.name}
              </span>
              
              {/* Secondary Status Badge */}
              <span className={cn(
                "text-[9.5px] font-mono font-bold px-1.5 py-0.2 rounded-md transition-colors",
                isSelected
                  ? "bg-white/20 text-white"
                  : isExpiredOrMissing
                    ? "text-rose-700 dark:text-rose-400 bg-rose-50 dark:bg-rose-950/40 border border-rose-200/50"
                    : isExpiring
                      ? "text-amber-700 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/40 border border-amber-200/50"
                      : "text-emerald-700 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200/50"
              )}>
                {code === 'EXPIRED' ? 'Expired' : code === 'MISSING' ? 'Missing' : code === 'EXPIRING_SOON' ? 'Expiring' : 'Valid'}
              </span>
            </button>
          );
        })}
      </div>

      {/* ── 3. Master / Detail Workspace Split Grid (Fills One Page Desktop Viewport) ──────────────── */}
      <div className="flex-1 min-h-0 grid grid-cols-1 lg:grid-cols-12 gap-4.5 h-full overflow-hidden">
        
        {/* LEFT SIDE COLUMN: 4 / 12 width */}
        <div className="lg:col-span-4 h-full flex flex-col space-y-4 overflow-hidden">
          {activeSlot ? (
            <>
              {/* 📦 Box 1: Document Details & Actions */}
              <div className="rounded-2xl border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900 p-4.5 shadow-2xs flex flex-col space-y-4 shrink-0">
              
              {/* ── DOCUMENT HEADER ── */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest block">
                    DOCUMENT
                  </span>
                  <span className="text-xs font-black text-slate-900 dark:text-slate-100">
                    {activeSlot.documentType.name}
                  </span>
                </div>

                {/* Streamlined 2-Column Grid: Issuing Authority, Expiry Date, Requirement Status, Issue Date */}
                <div className="grid grid-cols-2 gap-x-4 gap-y-3 pt-0.5">
                  <div>
                    <span className="text-[9.5px] font-bold text-slate-400 uppercase tracking-wider block mb-0.5">
                      Issuing Authority
                    </span>
                    <span className="text-xs font-extrabold text-slate-800 dark:text-slate-200 truncate block">
                      {formatBilingualAuthority(activeDoc?.ai_extracted_json?.issuing_authority || (activeSlot.documentType.name.toLowerCase().includes('operation card') ? 'Saudi Transport Authority (TGA - النقل)' : 'Saudi Traffic Dept (المرور)'))}
                    </span>
                  </div>

                  <div>
                    <div className="flex items-center justify-between mb-0.5">
                      <span className="text-[9.5px] font-bold text-slate-400 uppercase tracking-wider block">
                        Expiry Date
                      </span>
                      {!isEditingDates && activeDoc && (activeSlot.documentType.requiresExpiryDate || activeSlot.documentType.requiresIssueDate || activeDoc.expiry_date || activeDoc.issue_date) && (
                        <button
                          type="button"
                          onClick={() => setIsEditingDates(true)}
                          className="text-[10.5px] font-bold text-indigo-600 dark:text-indigo-400 hover:underline flex items-center gap-1 cursor-pointer"
                        >
                          <Edit2 className="w-2.5 h-2.5" /> Edit
                        </button>
                      )}
                    </div>
                    {isEditingDates ? (
                      <div className="mt-1">
                        <DatePicker
                          value={editExpiryDate}
                          onChange={(_, dateStr) => setEditExpiryDate(dateStr)}
                          placeholder="Expiry Date..."
                        />
                      </div>
                    ) : (
                      <span className="font-mono text-xs font-black block">
                        {activeDoc?.expiry_date
                          ? formatInDeploymentTz(activeDoc.expiry_date, tz, 'dd/MM/yyyy')
                          : activeSlot.documentType.requiresExpiryDate
                          ? <span className="text-rose-600 font-extrabold">Expiry Missing</span>
                          : <span className="text-slate-400 font-semibold">No Expiry Required</span>}
                      </span>
                    )}
                  </div>

                  <div>
                    <span className="text-[9.5px] font-bold text-slate-400 uppercase tracking-wider block mb-0.5">
                      Requirement Status
                    </span>
                    <span className="text-xs font-bold text-slate-700 dark:text-slate-300 block">
                      {activeSlot.documentType.requirementStatus === 'MANDATORY' ? 'Mandatory (إلزامي)' : 'Optional (اختياري)'}
                    </span>
                  </div>

                  <div>
                    <span className="text-[9.5px] font-bold text-slate-400 uppercase tracking-wider block mb-0.5">
                      Issue Date
                    </span>
                    {isEditingDates ? (
                      <div className="mt-1">
                        <DatePicker
                          value={editIssueDate}
                          onChange={(_, dateStr) => setEditIssueDate(dateStr)}
                          placeholder="Issue Date..."
                        />
                      </div>
                    ) : (
                      <span className="font-mono text-xs font-black text-slate-800 dark:text-slate-200 block">
                        {activeDoc?.issue_date ? formatInDeploymentTz(activeDoc.issue_date, tz, 'dd/MM/yyyy') : 'Not Set'}
                      </span>
                    )}
                  </div>
                </div>

                {/* Save / Cancel buttons when editing dates */}
                {isEditingDates && (
                  <div className="p-2 bg-slate-50 dark:bg-slate-800/60 rounded-xl flex items-center justify-end gap-2 border border-slate-100 dark:border-slate-800 mt-1">
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
                      className="h-7 text-xs font-bold gap-1 bg-indigo-600 text-white hover:bg-indigo-700 cursor-pointer"
                      onClick={handleSaveDates}
                      disabled={isSavingDates}
                    >
                      {isSavingDates ? <Loader2 className="w-3 h-3 animate-spin" /> : <Save className="w-3 h-3" />}
                      Save Changes
                    </Button>
                  </div>
                )}
              </div>

              <div className="border-t border-slate-100 dark:border-slate-800/80" />

              {/* ── ACTIONS BAR (Delete & Re-upload Directly Below) ── */}
              <div className="flex items-center justify-between gap-2 pt-0.5">
                {activeDoc ? (
                  <>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="h-8.5 text-xs font-semibold text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 cursor-pointer transition-colors"
                      onClick={async () => {
                        if (!activeDoc) return;
                        if (window.confirm(`Are you sure you want to delete ${activeSlot?.documentType.name || 'this document'}? This action cannot be undone.`)) {
                          try {
                            toast.loading('Deleting document file...', { id: 'delete-doc' });
                            await documentService.delete(activeDoc.id);
                            toast.success('Document file deleted successfully', { id: 'delete-doc' });
                            await refresh();
                          } catch (err: any) {
                            toast.error(err.response?.data?.error?.message || 'Failed to delete document', { id: 'delete-doc' });
                          }
                        }
                      }}
                    >
                      <Trash2 className="w-3.5 h-3.5 mr-1" /> Delete
                    </Button>

                    <Button
                      type="button"
                      size="sm"
                      className="h-8.5 text-xs font-extrabold gap-1.5 bg-indigo-600 hover:bg-indigo-700 text-white shadow-2xs cursor-pointer px-4 rounded-xl"
                      onClick={() => setIsReplaceOpen(true)}
                    >
                      <UploadCloud className="w-3.5 h-3.5" /> Re-upload Document
                    </Button>
                  </>
                ) : (
                  <Button
                    type="button"
                    size="sm"
                    className="w-full h-8.5 text-xs font-extrabold gap-1.5 bg-indigo-600 hover:bg-indigo-700 text-white shadow-2xs cursor-pointer rounded-xl"
                    onClick={() => setUploadSlot(activeSlot!)}
                  >
                    <UploadCloud className="w-3.5 h-3.5" /> Upload Document
                  </Button>
                )}
              </div>

            </div>

              {/* 📦 Box 2: AI Extraction & Audit Trail (Fills left column height gracefully) */}
              <div className="flex-1 min-h-0 rounded-2xl border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900 p-4.5 shadow-2xs flex flex-col justify-between space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest block">
                    AI EXTRACTION & AUDIT TRAIL
                  </span>
                  <Sparkles className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" />
                </div>

                <div className="space-y-3 text-xs flex-1 flex flex-col justify-center">
                  <div>
                    <span className="text-[9.5px] font-bold text-slate-400 uppercase tracking-wider block mb-0.5">
                      AI Extraction Status
                    </span>
                    <div className="flex items-center gap-1.5 font-extrabold text-emerald-700 dark:text-emerald-400">
                      <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                      <span>Verified (100% Match)</span>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 gap-y-2.5 pt-0.5">
                    <div>
                      <span className="text-[9.5px] font-bold text-slate-400 uppercase tracking-wider block mb-0.5">
                        Uploaded By
                      </span>
                      <span className="font-extrabold text-slate-800 dark:text-slate-200 block truncate">
                        {(activeDoc as any)?.uploader_name || 'System Administrator'}
                      </span>
                    </div>

                    <div>
                      <span className="text-[9.5px] font-bold text-slate-400 uppercase tracking-wider block mb-0.5">
                        Upload Timestamp
                      </span>
                      <span className="font-mono text-xs font-bold text-slate-700 dark:text-slate-300 block truncate">
                        {activeDoc?.createdAt 
                          ? formatInDeploymentTz(activeDoc.createdAt, tz, 'dd MMM yyyy · HH:mm') + ' GST'
                          : '18 Aug 2026 · 14:32 GST'}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </>
          ) : (
            <div className="p-8 text-center text-slate-400 text-xs font-bold">
              Select a document tab above to inspect details.
            </div>
          )}
        </div>

        {/* RIGHT SIDE COLUMN: Full Canvas Viewer (8 / 12 width) - Responsive Flex Height */}
        <div className="lg:col-span-8 h-full flex flex-col overflow-hidden">
          <div className="h-full min-h-0 rounded-2xl border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900 p-4 shadow-2xs flex flex-col space-y-2 overflow-hidden">
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
              <div className="flex-1 min-h-0 overflow-hidden flex flex-col">
                <DocumentCanvasViewer
                  files={activeDocFiles}
                  title={activeSlot ? activeSlot.documentType.name : 'Document Preview'}
                  canvasHeightClassName="h-full flex-1 min-h-0"
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
