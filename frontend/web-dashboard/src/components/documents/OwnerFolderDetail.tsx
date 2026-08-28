import { useState, useMemo, useEffect } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import {
  UploadCloud, CheckCircle2, AlertTriangle, XCircle, FileQuestion, Eye, Loader2, Files,
  Download, Trash2, Plus, ExternalLink, RefreshCw, FileText, Hash, Building2,
  Calendar, History, Clock, Sparkles, Edit2, Save, FilePlus
} from 'lucide-react';
import { toast } from 'sonner';

import { documentService, type OwnerFolderSlot, type MerconDocument } from '@/services/documentService';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { DatePicker } from '@/components/ui/date-picker';
import UploadDocumentModal from '@/components/ui/UploadDocumentModal';
import ImportReviewModal from '@/components/documents/ImportReviewModal';
import ConfirmModal from '@/components/ui/ConfirmModal';
import DocumentCanvasViewer from '@/components/ui/DocumentCanvasViewer';
import {
  formatBilingualAuthority, resolveFileUrl, CENTRAL_SLOT_STATUS,
  getSlotStatusFromDoc, formatDocDate, SlotStatusCode
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

  // Intentional initial state: null selectedSlotId (no selection until operator clicks a row)
  const [selectedSlotId, setSelectedSlotId] = useState<string | null>(null);
  const [uploadSlot, setUploadSlot] = useState<OwnerFolderSlot | null>(null);
  const [isReplaceOpen, setIsReplaceOpen] = useState(false);
  const [isBatchImportOpen, setIsBatchImportOpen] = useState(false);
  const [droppedFiles, setDroppedFiles] = useState<File[]>([]);
  const [deleteDocId, setDeleteDocId] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // Edit Date State for Inspector
  const [isEditingDates, setIsEditingDates] = useState(false);
  const [editIssueDate, setEditIssueDate] = useState('');
  const [editExpiryDate, setEditExpiryDate] = useState('');
  const [isSavingDates, setIsSavingDates] = useState(false);
  const [showHistory, setShowHistory] = useState(false);

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
    if (!folder?.slots || !selectedSlotId) return null;
    return folder.slots.find((s) => s.documentType.id === selectedSlotId) || null;
  }, [folder?.slots, selectedSlotId]);

  // Auto-select first slot when folder loads if no slot is selected yet
  useEffect(() => {
    if (folder?.slots && folder.slots.length > 0 && !selectedSlotId) {
      const firstIssue = folder.slots.find((s) => {
        const code = getSlotStatusFromDoc(s.document);
        return code !== 'VALID' && code !== 'NO_EXPIRY';
      });
      if (firstIssue) {
        setSelectedSlotId(firstIssue.documentType.id);
      } else {
        const firstDocSlot = folder.slots.find((s) => !!s.document);
        setSelectedSlotId(firstDocSlot ? firstDocSlot.documentType.id : folder.slots[0].documentType.id);
      }
    }
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

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-slate-400 gap-3">
        <Loader2 className="w-8 h-8 animate-spin text-brand" />
        <p className="text-xs font-bold">Loading compliance workspace...</p>
      </div>
    );
  }

  if (!folder) return null;

  const totalSlots = folder.slots.length;
  const compliantCount = folder.slots.filter((s) => {
    const code = getSlotStatusFromDoc(s.document);
    return code === 'VALID' || code === 'NO_EXPIRY';
  }).length;
  const issueSlots = folder.slots.filter((s) => {
    const code = getSlotStatusFromDoc(s.document);
    return code !== 'VALID' && code !== 'NO_EXPIRY';
  });
  const isFullyCompliant = issueSlots.length === 0;

  const requiredSlots = folder.slots.filter((s) => s.documentType.requirementStatus === 'MANDATORY');
  const additionalSlots = folder.slots.filter((s) => s.documentType.requirementStatus !== 'MANDATORY');

  const activeDocFiles = activeDoc?.files && activeDoc.files.length > 0
    ? activeDoc.files
    : activeDoc ? [{ id: 'primary', file_url: activeDoc.file_url, mime_type: activeDoc.mime_type, label: 'Primary File' }] : [];

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

  const handleDeleteDocument = async () => {
    if (!deleteDocId) return;
    setIsDeleting(true);
    try {
      toast.loading('Deleting document record...', { id: 'delete-doc' });
      await documentService.delete(deleteDocId);
      toast.success('Document deleted successfully from vault', { id: 'delete-doc' });
      setDeleteDocId(null);
      await refresh();
    } catch (err: any) {
      toast.error(err.response?.data?.error?.message || 'Failed to delete document', { id: 'delete-doc' });
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <div className="h-full flex flex-col space-y-3 overflow-hidden">
      
      {/* ── 1. Compact Single-Line Compliance Summary Strip ──────────────── */}
      <div className="rounded-xl border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900 px-3.5 py-2.5 shadow-2xs flex flex-wrap items-center justify-between gap-2 shrink-0 text-xs">
        <div className="flex items-center gap-2 flex-wrap font-semibold text-slate-700 dark:text-slate-300">
          <span className="font-black text-slate-400 uppercase text-[10px] tracking-wider font-mono">Compliance</span>
          <span className="text-slate-300 dark:text-slate-700">·</span>
          <span className={cn('font-bold', isFullyCompliant ? 'text-emerald-600' : 'text-rose-600')}>
            {isFullyCompliant ? '🟢 Fully Compliant' : `🔴 ${issueSlots.length} Issue${issueSlots.length > 1 ? 's' : ''}`}
          </span>
          <span className="text-slate-300 dark:text-slate-700">·</span>
          <span className="font-mono text-slate-500 font-bold">{compliantCount}/{totalSlots} compliant</span>
        </div>

        {/* Attention items inline list */}
        <div className="flex items-center gap-2 flex-wrap text-xs">
          {isFullyCompliant ? (
            <span className="text-emerald-600 dark:text-emerald-400 font-bold flex items-center gap-1">
              <CheckCircle2 className="w-3.5 h-3.5" /> All required compliance documents are valid
            </span>
          ) : (
            issueSlots.map((s) => (
              <span key={s.documentType.id} className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-rose-50 dark:bg-rose-950/30 text-rose-700 dark:text-rose-300 text-[11px] font-semibold">
                <strong className="font-extrabold">{s.documentType.name}</strong>
                <span>{s.status === 'MISSING' ? 'missing' : `expired (${formatDocDate(s.document?.expiry_date)})`}</span>
              </span>
            ))
          )}
        </div>
      </div>

      {/* ── 2. Master / Detail Viewport-Anchored Grid ────────────────────── */}
      <div className="flex-1 min-h-0 grid grid-cols-1 lg:grid-cols-12 gap-4 h-full overflow-hidden">
        
        {/* LEFT COLUMN: Document List (5 / 12 width) — Internal Scroll */}
        <div className="lg:col-span-5 h-full flex flex-col overflow-y-auto pr-1 scrollbar-thin">
          <div className="rounded-2xl border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900 p-3.5 shadow-2xs space-y-4">
            
            {/* Required Compliance Section */}
            <div className="space-y-2">
              <div className="flex items-center justify-between px-1">
                <h4 className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider">
                  Required Compliance
                </h4>
                <span className="text-[10px] font-mono text-slate-400">{requiredSlots.length} Requirements</span>
              </div>

              <div className="divide-y divide-slate-100 dark:divide-slate-800/80 overflow-hidden rounded-xl border border-slate-100 dark:border-slate-800 bg-slate-50/40 dark:bg-slate-900/40">
                {requiredSlots.map((slot) => {
                  const statusCode = getSlotStatusFromDoc(slot.document);
                  const IconConfig = STATUS_ICONS[statusCode] || STATUS_ICONS.MISSING;
                  const StatusIcon = IconConfig.icon;
                  const isSelected = activeSlot?.documentType.id === slot.documentType.id;
                  const hasDoc = !!slot.document;
                  const formattedDate = slot.document?.expiry_date ? formatDocDate(slot.document.expiry_date) : null;

                  const getSubText = () => {
                    if (statusCode === 'MISSING') return 'Missing · Required';
                    if (statusCode === 'NO_EXPIRY') return 'Valid · No expiry';
                    if (statusCode === 'VALID') return formattedDate ? `Valid · ${formattedDate}` : 'Valid document';
                    if (statusCode === 'EXPIRED') return formattedDate ? `Expired · ${formattedDate}` : 'Expired';
                    return formattedDate ? `Expiring · ${formattedDate}` : 'Due soon';
                  };

                  return (
                    <div
                      key={slot.documentType.id}
                      onClick={() => setSelectedSlotId(slot.documentType.id)}
                      className={cn(
                        'flex items-center justify-between gap-3 px-3 py-2.5 cursor-pointer transition-all group',
                        isSelected
                          ? 'bg-brand/10 dark:bg-brand/20 border-l-4 border-l-brand'
                          : 'hover:bg-slate-100/60 dark:hover:bg-slate-800/50'
                      )}
                    >
                      <div className="flex items-center gap-2.5 min-w-0 flex-1">
                        <StatusIcon className={cn('w-4 h-4 shrink-0', IconConfig.className)} />
                        <div className="min-w-0">
                          <p className={cn('text-xs font-bold truncate', isSelected ? 'text-brand font-black' : 'text-slate-900 dark:text-slate-100')}>
                            {slot.documentType.name}
                          </p>
                          <p className={cn('text-[11px]', statusCode === 'MISSING' || statusCode === 'EXPIRED' ? 'text-rose-600 dark:text-rose-400 font-semibold' : 'text-slate-400')}>
                            {getSubText()}
                          </p>
                        </div>
                      </div>

                      {/* Missing Slot Direct Action */}
                      {!hasDoc && (
                        <div onClick={(e) => e.stopPropagation()}>
                          <Button
                            size="sm"
                            variant="outline"
                            className="h-7 px-2.5 text-[11px] font-extrabold text-brand border-brand/30 hover:bg-brand/10 cursor-pointer"
                            onClick={() => setUploadSlot(slot)}
                          >
                            <UploadCloud className="w-3.5 h-3.5 mr-1" /> Upload
                          </Button>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Additional Documents Section */}
            <div className="space-y-2 pt-2 border-t border-slate-100 dark:border-slate-800">
              <div className="flex items-center justify-between px-1">
                <h4 className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider">
                  Additional Documents
                </h4>
                <span className="text-[10px] font-mono text-slate-400">{additionalSlots.length} Optional</span>
              </div>

              <div className="divide-y divide-slate-100 dark:divide-slate-800/80 overflow-hidden rounded-xl border border-slate-100 dark:border-slate-800 bg-slate-50/40 dark:bg-slate-900/40">
                {additionalSlots.map((slot) => {
                  const statusCode = getSlotStatusFromDoc(slot.document);
                  const IconConfig = STATUS_ICONS[statusCode] || STATUS_ICONS.MISSING;
                  const StatusIcon = IconConfig.icon;
                  const isSelected = activeSlot?.documentType.id === slot.documentType.id;
                  const hasDoc = !!slot.document;
                  const formattedDate = slot.document?.expiry_date ? formatDocDate(slot.document.expiry_date) : null;

                  return (
                    <div
                      key={slot.documentType.id}
                      onClick={() => setSelectedSlotId(slot.documentType.id)}
                      className={cn(
                        'flex items-center justify-between gap-3 px-3 py-2.5 cursor-pointer transition-all group',
                        isSelected
                          ? 'bg-brand/10 dark:bg-brand/20 border-l-4 border-l-brand'
                          : 'hover:bg-slate-100/60 dark:hover:bg-slate-800/50'
                      )}
                    >
                      <div className="flex items-center gap-2.5 min-w-0 flex-1">
                        <StatusIcon className={cn('w-4 h-4 shrink-0', IconConfig.className)} />
                        <div className="min-w-0">
                          <p className={cn('text-xs font-bold truncate', isSelected ? 'text-brand font-black' : 'text-slate-900 dark:text-slate-100')}>
                            {slot.documentType.name}
                          </p>
                          <p className="text-[11px] text-slate-400">
                            {hasDoc ? (formattedDate ? `Valid · ${formattedDate}` : 'Valid · No expiry') : 'Optional record'}
                          </p>
                        </div>
                      </div>

                      {!hasDoc && (
                        <div onClick={(e) => e.stopPropagation()}>
                          <Button
                            size="sm"
                            variant="outline"
                            className="h-7 px-2.5 text-[11px] font-bold text-slate-600 border-slate-200 hover:bg-slate-50 cursor-pointer"
                            onClick={() => setUploadSlot(slot)}
                          >
                            <UploadCloud className="w-3.5 h-3.5 mr-1" /> Upload
                          </Button>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>

              {/* + Add Custom Document Action */}
              <button
                type="button"
                onClick={onOpenAddCustomDoc}
                className="w-full py-2.5 px-3 rounded-xl border border-dashed border-slate-300 dark:border-slate-700 hover:border-brand text-slate-600 dark:text-slate-300 hover:text-brand text-xs font-bold flex items-center justify-center gap-1.5 transition-all cursor-pointer bg-slate-50/50 dark:bg-slate-900/50 mt-2"
              >
                <FilePlus className="w-4 h-4 text-brand" />
                <span>+ Add Custom Document</span>
              </button>
            </div>

          </div>
        </div>

        {/* RIGHT COLUMN: Sticky Inspector (7 / 12 width) — Internal Scroll */}
        <div className="lg:col-span-7 h-full flex flex-col overflow-y-auto pr-1 scrollbar-thin">
          {activeSlot ? (
            <div className="rounded-2xl border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900 overflow-hidden shadow-2xs flex flex-col space-y-3 p-4">
              
              {/* Inspector Header */}
              <div className="flex items-start justify-between gap-3 pb-3 border-b border-slate-100 dark:border-slate-800">
                <div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <h2 className="text-base font-black text-slate-900 dark:text-slate-100 tracking-tight">
                      {activeSlot.documentType.name}
                    </h2>
                    
                    {/* Three-Layer Status Distinction: Requirement · Verification · Validity */}
                    <Badge variant="outline" className="text-[10px] font-bold bg-slate-100 text-slate-600 border-slate-200">
                      {activeSlot.documentType.requirementStatus === 'MANDATORY' ? 'Required' : 'Optional'}
                    </Badge>

                    {activeDoc && (
                      <Badge variant="outline" className="text-[10px] font-bold bg-emerald-50 text-emerald-700 border-emerald-200">
                        {activeDoc.status || 'Verified'}
                      </Badge>
                    )}

                    {activeDoc ? (
                      <Badge variant="outline" className={cn('text-[10px] font-extrabold', (CENTRAL_SLOT_STATUS[getSlotStatusFromDoc(activeDoc)] || CENTRAL_SLOT_STATUS.VALID).className)}>
                        {(CENTRAL_SLOT_STATUS[getSlotStatusFromDoc(activeDoc)] || CENTRAL_SLOT_STATUS.VALID).label}
                      </Badge>
                    ) : (
                      <Badge variant="outline" className="bg-rose-50 text-rose-700 border-rose-200 font-extrabold text-[10px]">
                        🔴 Missing
                      </Badge>
                    )}
                  </div>
                  <p className="text-xs text-slate-400 mt-1">
                    {activeDoc
                      ? activeDoc.expiry_date
                        ? `Expiry: ${formatInDeploymentTz(activeDoc.expiry_date, tz, 'dd/MM/yyyy')}`
                        : 'No expiry date required'
                      : 'Required document file not yet uploaded'}
                  </p>
                </div>

                {activeDoc && (
                  <Button
                    size="sm"
                    variant="outline"
                    className="h-8 text-xs font-bold gap-1 border-slate-200 dark:border-slate-700 text-brand hover:bg-brand-light cursor-pointer shrink-0"
                    onClick={() => navigate(`/documents/doc/${activeDoc.id}`)}
                  >
                    <ExternalLink className="w-3.5 h-3.5" /> Full View
                  </Button>
                )}
              </div>

              {/* Inspector Content */}
              {activeDoc ? (
                <div className="space-y-4">
                  
                  {/* DOCUMENT-TYPE-AWARE METADATA */}
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between">
                      <h4 className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider">Document Information</h4>
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

                    <div className="rounded-xl border border-slate-200 dark:border-slate-800 divide-y divide-slate-100 dark:divide-slate-800 text-xs">
                      {activeDoc.ai_extracted_json?.document_number && (
                        <InspectorRow label="Document Number" value={activeDoc.ai_extracted_json.document_number} mono />
                      )}
                      {activeDoc.ai_extracted_json?.issuing_authority && (
                        <InspectorRow label="Issuer" value={formatBilingualAuthority(activeDoc.ai_extracted_json.issuing_authority)} />
                      )}

                      {/* Issue Date Display / Edit */}
                      {(activeSlot.documentType.requiresIssueDate || activeDoc.issue_date || isEditingDates) && (
                        <div className="flex items-center justify-between px-3.5 py-2">
                          <span className="text-slate-500 dark:text-slate-400 font-medium">Issue Date</span>
                          {isEditingDates ? (
                            <div className="w-44">
                              <DatePicker
                                value={editIssueDate}
                                onChange={(_, dateStr) => setEditIssueDate(dateStr)}
                                placeholder="Select issue date..."
                              />
                            </div>
                          ) : (
                            <span className="font-bold text-slate-900 dark:text-slate-100 font-mono">
                              {activeDoc.issue_date ? formatInDeploymentTz(activeDoc.issue_date, tz, 'dd/MM/yyyy') : 'Not Set'}
                            </span>
                          )}
                        </div>
                      )}

                      {/* Expiry Date Display / Edit */}
                      <div className="flex items-center justify-between px-3.5 py-2">
                        <span className="text-slate-500 dark:text-slate-400 font-medium">Expiry Date</span>
                        {isEditingDates ? (
                          <div className="w-44">
                            <DatePicker
                              value={editExpiryDate}
                              onChange={(_, dateStr) => setEditExpiryDate(dateStr)}
                              placeholder="Select expiry date..."
                            />
                          </div>
                        ) : (
                          <span className="font-bold text-slate-900 dark:text-slate-100 font-mono">
                            {activeDoc.expiry_date
                              ? formatInDeploymentTz(activeDoc.expiry_date, tz, 'dd/MM/yyyy')
                              : activeSlot.documentType.requiresExpiryDate
                              ? <span className="text-rose-600 font-bold">Expiry Date Missing (Required)</span>
                              : 'No expiry'}
                          </span>
                        )}
                      </div>

                      {/* Save / Cancel buttons when editing dates */}
                      {isEditingDates && (
                        <div className="p-2 bg-slate-50 dark:bg-slate-800/60 flex items-center justify-end gap-2">
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            className="h-7 text-xs font-bold text-slate-600 cursor-pointer"
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

                      <InspectorRow label="Uploaded Date" value={formatInDeploymentTz(activeDoc.createdAt, tz, 'dd/MM/yyyy')} />
                    </div>
                  </div>

                  {/* DOCUMENT PREVIEW CONTAINER (Contrained height ~ 280px) */}
                  <div className="space-y-1">
                    <h4 className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider">Document Preview</h4>
                    <DocumentCanvasViewer
                      files={activeDocFiles}
                      title={activeSlot.documentType.name}
                      canvasHeightClassName="h-60"
                    />
                  </div>

                  {/* ACTIONS */}
                  <div className="pt-2 border-t border-slate-100 dark:border-slate-800 grid grid-cols-4 gap-1.5">
                    <a
                      href={resolveFileUrl(activeDocFiles[0]?.file_url || activeDoc.file_url)}
                      download
                      className="h-8.5 rounded-xl border border-slate-200 dark:border-slate-700 text-xs font-bold text-slate-700 dark:text-slate-200 flex items-center justify-center gap-1 hover:bg-slate-50 dark:hover:bg-slate-800"
                    >
                      <Download className="w-3.5 h-3.5" /> Download
                    </a>
                    <Button
                      variant="outline"
                      size="sm"
                      className="h-8.5 text-xs font-bold gap-1 border-indigo-200 text-indigo-600 hover:bg-indigo-50 dark:border-indigo-800 dark:hover:bg-indigo-950/40 cursor-pointer"
                      onClick={() => setIsReplaceOpen(true)}
                    >
                      <RefreshCw className="w-3.5 h-3.5" /> Replace
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      className="h-8.5 text-xs font-bold gap-1 border-rose-200 text-rose-600 hover:bg-rose-50 dark:border-rose-800 dark:hover:bg-rose-950/40 cursor-pointer"
                      onClick={() => setDeleteDocId(activeDoc.id)}
                    >
                      <Trash2 className="w-3.5 h-3.5" /> Delete
                    </Button>
                    <Button
                      variant="default"
                      size="sm"
                      className="h-8.5 text-xs font-bold gap-1 bg-brand hover:bg-brand-hover text-white cursor-pointer"
                      onClick={() => navigate(`/documents/doc/${activeDoc.id}`)}
                    >
                      <ExternalLink className="w-3.5 h-3.5" /> Full View
                    </Button>
                  </div>

                  {/* ACTIVITY & HISTORY */}
                  <div className="rounded-xl border border-slate-200 dark:border-slate-800 overflow-hidden">
                    <button
                      type="button"
                      onClick={() => setShowHistory((prev) => !prev)}
                      className="w-full px-3.5 py-2 bg-slate-50 dark:bg-slate-800/60 flex items-center justify-between text-xs font-bold text-slate-700 dark:text-slate-300 cursor-pointer"
                    >
                      <span className="flex items-center gap-1.5">
                        <History className="w-3.5 h-3.5 text-indigo-500" />
                        <span>Activity & Audit History</span>
                      </span>
                      <span className="text-[10px] text-slate-400">{showHistory ? 'Hide' : 'Show'}</span>
                    </button>
                    {showHistory && (
                      <div className="p-3 space-y-2 bg-white dark:bg-slate-900 border-t border-slate-100 dark:border-slate-800 text-xs">
                        <div className="flex items-start gap-2 text-slate-600 dark:text-slate-400">
                          <Clock className="w-3.5 h-3.5 text-indigo-500 mt-0.5 shrink-0" />
                          <div>
                            <p className="font-bold text-slate-800 dark:text-slate-200">Document Uploaded</p>
                            <p className="text-[10px] text-slate-400 font-mono">
                              {formatInDeploymentTz(activeDoc.createdAt, tz, 'dd/MM/yyyy h:mm a')}
                            </p>
                          </div>
                        </div>
                        {activeDoc.ai_extracted_json && (
                          <div className="flex items-start gap-2 text-slate-600 dark:text-slate-400 pt-2 border-t border-slate-100 dark:border-slate-800">
                            <Sparkles className="w-3.5 h-3.5 text-amber-500 mt-0.5 shrink-0" />
                            <div>
                              <p className="font-bold text-slate-800 dark:text-slate-200">AI Vision Metadata Scanned</p>
                              <p className="text-[10px] text-slate-400">Confidence: {Math.round((activeDoc.ai_extracted_json.confidence || 0.9) * 100)}%</p>
                            </div>
                          </div>
                        )}
                        {activeDocFiles.length > 1 && (
                          <div className="flex items-start gap-2 text-slate-600 dark:text-slate-400 pt-2 border-t border-slate-100 dark:border-slate-800">
                            <Files className="w-3.5 h-3.5 text-emerald-500 mt-0.5 shrink-0" />
                            <div>
                              <p className="font-bold text-slate-800 dark:text-slate-200">Attachment Revision</p>
                              <p className="text-[10px] text-slate-400">{activeDocFiles.length} file pages attached</p>
                            </div>
                          </div>
                        )}
                      </div>
                    )}
                  </div>

                </div>
              ) : (
                /* MISSING DOCUMENT STATE */
                <div className="py-12 px-6 flex flex-col items-center justify-center text-center space-y-3">
                  <div className="w-12 h-12 rounded-2xl bg-rose-50 dark:bg-rose-950/40 text-rose-600 flex items-center justify-center border border-rose-200 dark:border-rose-900">
                    <FileQuestion className="w-6 h-6" />
                  </div>
                  <div>
                    <h3 className="text-base font-black text-slate-900 dark:text-slate-100">{activeSlot.documentType.name}</h3>
                    <Badge variant="outline" className="bg-rose-50 text-rose-700 border-rose-200 text-xs font-bold mt-1">Missing</Badge>
                    <p className="text-xs text-slate-500 mt-2 max-w-sm">
                      This required document has not been uploaded for this {ownerType.toLowerCase()}.
                    </p>
                  </div>
                  <Button
                    size="sm"
                    onClick={() => setUploadSlot(activeSlot)}
                    className="h-9 px-5 text-xs font-extrabold gap-1.5 bg-brand hover:bg-brand-hover text-white shadow-xs rounded-xl cursor-pointer"
                  >
                    <UploadCloud className="w-4 h-4" /> Upload {activeSlot.documentType.name}
                  </Button>
                </div>
              )}

            </div>
          ) : (
            /* INTENTIONAL NO-SELECTION STATE */
            <div className="h-full flex flex-col items-center justify-center p-8 text-center rounded-2xl border border-dashed border-slate-300 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-400 space-y-3 min-h-[400px]">
              <div className="w-12 h-12 rounded-2xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-400">
                <FileText className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-slate-700 dark:text-slate-200">Select a document</h3>
                <p className="text-xs text-slate-400 mt-1 max-w-xs">
                  Choose a compliance document from the left list to inspect its details.
                </p>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Universal Import & Upload Modal */}
      {(uploadSlot || isReplaceOpen || isBatchImportOpen) && (
        <ImportReviewModal
          isOpen={!!(uploadSlot || isReplaceOpen || isBatchImportOpen)}
          onClose={() => {
            setUploadSlot(null);
            setIsReplaceOpen(false);
            setIsBatchImportOpen(false);
            setDroppedFiles([]);
          }}
          lockOwnerType={ownerType}
          lockOwnerId={ownerId}
          ownerDisplayName={folder.ownerName}
          initialFiles={droppedFiles}
          onImported={refresh}
        />
      )}

      {/* Confirm Delete Document Modal */}
      <ConfirmModal
        isOpen={!!deleteDocId}
        onClose={() => setDeleteDocId(null)}
        onConfirm={handleDeleteDocument}
        title="Delete Document Record"
        message="Are you sure you want to permanently delete this document from the vault? This action cannot be undone."
        confirmLabel="Delete Document"
        isDestructive={true}
        isLoading={isDeleting}
      />
    </div>
  );
}

function InspectorRow({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
  return (
    <div className="flex items-center justify-between px-3.5 py-2">
      <span className="text-slate-500 dark:text-slate-400 font-medium">{label}</span>
      <span className={cn('font-bold text-slate-900 dark:text-slate-100 text-right', mono && 'font-mono')}>{value}</span>
    </div>
  );
}
