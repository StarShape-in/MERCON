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
      
      {/* ── Top Clean Document Navigation Bar ──────────────── */}
      <div className="flex items-center gap-1 sm:gap-2 border-b border-slate-200/80 dark:border-slate-800 pb-0 pt-0.5 mb-2 shrink-0 overflow-x-auto scrollbar-none">
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
                "px-3 py-2 text-xs font-semibold flex items-center gap-2 border-b-2 transition-all cursor-pointer shrink-0 whitespace-nowrap -mb-px",
                isSelected
                  ? "border-[#FA634E] text-slate-900 dark:text-slate-100 font-black"
                  : "border-transparent text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200 hover:border-slate-300 dark:hover:border-slate-700"
              )}
            >
              <StatusIcon className={cn("w-3.5 h-3.5 shrink-0", iconColor)} />
              <span className={cn(isSelected ? "text-slate-900 dark:text-slate-100 font-black" : "text-slate-700 dark:text-slate-300")}>
                {slot.documentType.name}
              </span>
              
              {/* Secondary Status Badge */}
              <span className={cn(
                "text-[9.5px] font-mono font-bold px-1.5 py-0.2 rounded-md",
                isExpiredOrMissing
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

      {/* ── 3. Master / Detail Workspace Split Grid ──────────────── */}
      <div className="flex-1 min-h-0 grid grid-cols-1 lg:grid-cols-12 gap-4 h-full overflow-hidden">
        
        {/* LEFT SIDE COLUMN: Single Coherent Enterprise ERP Document Details Panel (4 / 12 width) */}
        <div className="lg:col-span-4 h-full flex flex-col justify-between overflow-hidden">
          {activeSlot ? (
            /* Single Outer Coherent Panel Box (No nested cards inside) */
            <div className="rounded-2xl border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900 p-4 sm:p-4.5 shadow-2xs h-full flex flex-col justify-between overflow-hidden">
              
              {/* Scrollable Content Area for the 3 Logical Sections */}
              <div className="flex-1 min-h-0 overflow-y-auto space-y-4 pr-1 scrollbar-thin">
                
                {/* ── DOCUMENT ── */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest">
                      DOCUMENT
                    </span>
                    <span className="text-xs font-black text-slate-900 dark:text-slate-100">
                      {activeSlot.documentType.name}
                    </span>
                  </div>

                  {/* 2-Column Key-Value Grid */}
                  <div className="grid grid-cols-2 gap-x-4 gap-y-2.5 pt-0.5">
                    <div>
                      <span className="text-[9.5px] font-bold text-slate-400 uppercase tracking-wider block mb-0.5">
                        Doc Number / Ref
                      </span>
                      <span className="font-mono text-xs font-black text-slate-900 dark:text-slate-100 tracking-tight block truncate">
                        {activeDoc?.ai_extracted_json?.document_number || (activeDoc as any)?.document_number || '7024295474'}
                      </span>
                    </div>

                    <div>
                      <span className="text-[9.5px] font-bold text-slate-400 uppercase tracking-wider block mb-0.5">
                        Issuing Authority
                      </span>
                      <span className="text-xs font-extrabold text-slate-800 dark:text-slate-200 truncate block">
                        {formatBilingualAuthority(activeDoc?.ai_extracted_json?.issuing_authority || 'Saudi Traffic Dept (المرور)')}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="border-t border-slate-100 dark:border-slate-800/80" />

                {/* ── VALIDITY ── */}
                <div className="space-y-2.5">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest">
                        VALIDITY
                      </span>
                      {activeDoc ? (
                        <Badge variant="outline" className={cn('text-[9.5px] font-extrabold px-1.5 py-0.2 shadow-3xs', (CENTRAL_SLOT_STATUS[getSlotStatusFromDoc(activeDoc)] || CENTRAL_SLOT_STATUS.VALID).className)}>
                          {(CENTRAL_SLOT_STATUS[getSlotStatusFromDoc(activeDoc)] || CENTRAL_SLOT_STATUS.VALID).label}
                        </Badge>
                      ) : (
                        <Badge variant="outline" className="bg-rose-50 text-rose-700 border-rose-200 font-extrabold text-[9.5px] px-1.5 py-0.2">
                          🔴 Missing
                        </Badge>
                      )}
                    </div>

                    {!isEditingDates && activeDoc && (activeSlot.documentType.requiresExpiryDate || activeSlot.documentType.requiresIssueDate || activeDoc.expiry_date || activeDoc.issue_date) && (
                      <button
                        type="button"
                        onClick={() => setIsEditingDates(true)}
                        className="text-xs font-bold text-[#FA634E] hover:underline flex items-center gap-1 cursor-pointer"
                      >
                        <Edit2 className="w-3 h-3" /> Edit Dates
                      </button>
                    )}
                  </div>

                  {/* Dates Key-Value Grid */}
                  <div className="grid grid-cols-2 gap-x-4 gap-y-2">
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

                    <div>
                      <span className="text-[9.5px] font-bold text-slate-400 uppercase tracking-wider block mb-0.5">
                        Expiry Date
                      </span>
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
                        className="h-7 text-xs font-bold gap-1 bg-[#FA634E] text-white hover:bg-[#FA634E]/90 cursor-pointer"
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

                {/* ── OTHER VEHICLE DOCUMENTS ── */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest block">
                      OTHER VEHICLE DOCUMENTS
                    </span>
                    <span className="text-[10px] font-mono text-slate-400 font-bold">
                      {folder.slots.length} Records
                    </span>
                  </div>

                  {/* Compact Table/List Rows (No inner cards!) */}
                  <div className="divide-y divide-slate-100 dark:divide-slate-800/80 pr-0.5">
                    {folder.slots.map((s) => {
                      const isSelected = activeSlot?.documentType.id === s.documentType.id;
                      const d = s.document;
                      const code = getSlotStatusFromDoc(d);
                      const isExpiredOrMissing = code === 'EXPIRED' || code === 'MISSING' || code === 'CRITICAL';
                      const isExpiring = code === 'EXPIRING_SOON';

                      const expFormatted = d?.expiry_date 
                        ? formatInDeploymentTz(d.expiry_date, tz, 'dd/MM/yyyy') 
                        : s.documentType.requiresExpiryDate 
                        ? 'No Date' 
                        : 'No Expiry';

                      return (
                        <div
                          key={s.documentType.id}
                          onClick={() => setSelectedSlotId(s.documentType.id)}
                          className={cn(
                            "py-2 px-2 flex items-center justify-between gap-3 text-xs cursor-pointer transition-all hover:bg-slate-50 dark:hover:bg-slate-800/50 rounded-lg my-0.5",
                            isSelected 
                              ? "bg-slate-50 dark:bg-slate-800/80 font-black text-slate-900 border-l-2 border-l-[#FA634E]" 
                              : "text-slate-700 dark:text-slate-300"
                          )}
                        >
                          <div className="flex items-center gap-2 min-w-0">
                            <span className={cn(
                              "w-2 h-2 rounded-full shrink-0",
                              isExpiredOrMissing ? "bg-rose-500" : isExpiring ? "bg-amber-500" : "bg-emerald-500"
                            )} />
                            <span className={cn(
                              "text-xs truncate",
                              isSelected ? "font-black text-slate-900 dark:text-slate-100" : "font-extrabold text-slate-800 dark:text-slate-200"
                            )}>
                              {s.documentType.name}
                            </span>
                          </div>

                          <div className="flex items-center gap-2 shrink-0">
                            <span className={cn(
                              "text-[10px] font-mono font-bold px-1.5 py-0.2 rounded-md",
                              isExpiredOrMissing
                                ? "text-rose-700 dark:text-rose-400 bg-rose-50 dark:bg-rose-950/40"
                                : isExpiring
                                  ? "text-amber-700 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/40"
                                  : "text-emerald-700 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/40"
                            )}>
                              {code === 'EXPIRED' ? 'Expired' : code === 'MISSING' ? 'Missing' : code === 'EXPIRING_SOON' ? 'Expiring' : 'Valid'}
                            </span>

                            <span className="font-mono text-[11px] text-slate-500 dark:text-slate-400 w-20 text-right">
                              {expFormatted}
                            </span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

              </div>

              {/* Bottom Actions Bar (Inside same single panel) */}
              <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between gap-2 shrink-0 mt-3">
                {activeDoc ? (
                  <>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="h-8 text-xs font-semibold text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 cursor-pointer transition-colors"
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
                      className="h-8 text-xs font-extrabold gap-1.5 bg-[#FA634E] hover:bg-[#FA634E]/90 text-white shadow-2xs cursor-pointer px-4"
                      onClick={() => setIsReplaceOpen(true)}
                    >
                      <UploadCloud className="w-3.5 h-3.5" /> Re-upload Document
                    </Button>
                  </>
                ) : (
                  <Button
                    type="button"
                    size="sm"
                    className="w-full h-8.5 text-xs font-extrabold gap-1.5 bg-[#FA634E] hover:bg-[#FA634E]/90 text-white shadow-2xs cursor-pointer"
                    onClick={() => setUploadSlot(activeSlot!)}
                  >
                    <UploadCloud className="w-3.5 h-3.5" /> Upload Document
                  </Button>
                )}
              </div>

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
