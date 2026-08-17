import { useEffect, useMemo, useRef, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import {
  UploadCloud, Loader2, CheckCircle2, AlertTriangle, HelpCircle, XCircle,
  Copy, FileText, ChevronDown, ChevronRight, X,
} from 'lucide-react';
import { toast } from 'sonner';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Combobox, type ComboboxOption } from '@/components/ui/combobox';
import { DatePicker } from '@/components/ui/date-picker';
import { documentService, type DocumentImportItem, type MatchConfidence } from '@/services/documentService';
import { documentTypeService } from '@/services/documentTypeService';
import { driverService } from '@/services/driverService';
import { vehicleService } from '@/services/vehicleService';
import { resolveFileUrl } from '@/lib/documents';
import { cn } from '@/lib/utils';

/**
 * The single review step for a staged import.
 *
 * Design intent: the user should read the *exceptions*, not all N rows. Rows
 * are ordered worst-first (needs input → duplicates → low confidence → ready),
 * everything confidently matched is pre-selected, and the primary button
 * confirms the whole selection at once. A 50-file drop where the AI got 47
 * right should be three decisions, not fifty.
 */

const CONFIDENCE_RANK: Record<MatchConfidence, number> = { NONE: 0, LOW: 1, MEDIUM: 2, HIGH: 3 };

const STATUS_CHIP: Record<string, { label: string; className: string; icon: any }> = {
  Ready:      { label: 'Matched',     className: 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/30 dark:text-emerald-400', icon: CheckCircle2 },
  NeedsInput: { label: 'Needs input', className: 'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/30 dark:text-amber-400', icon: HelpCircle },
  Failed:     { label: 'Failed',      className: 'bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-950/30 dark:text-rose-400', icon: XCircle },
  Analyzing:  { label: 'Reading…',    className: 'bg-slate-100 text-slate-500 border-slate-200 dark:bg-slate-800 dark:text-slate-400', icon: Loader2 },
  Confirmed:  { label: 'Imported',    className: 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/30 dark:text-emerald-400', icon: CheckCircle2 },
  Skipped:    { label: 'Skipped',     className: 'bg-slate-100 text-slate-400 border-slate-200 dark:bg-slate-800', icon: X },
};

interface ImportReviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  onImported?: () => void;
}

export default function ImportReviewModal({ isOpen, onClose, onImported }: ImportReviewModalProps) {
  const queryClient = useQueryClient();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [importId, setImportId] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [isConfirming, setIsConfirming] = useState(false);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [dupActions, setDupActions] = useState<Record<string, 'replace' | 'addFile' | 'skip'>>({});
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const seededRef = useRef(false);

  // Poll while anything is still being read by the AI.
  const { data: imp } = useQuery({
    queryKey: ['documentImport', importId],
    queryFn: () => documentService.getImport(importId!),
    enabled: !!importId && isOpen,
    refetchInterval: (q) => (q.state.data && !q.state.data.isComplete ? 1500 : false),
  });

  const { data: docTypes = [] } = useQuery({
    queryKey: ['documentTypes', 'all'],
    queryFn: async () => (await documentTypeService.getAll({ isActive: true })).data,
    enabled: isOpen,
  });
  const { data: drivers = [] } = useQuery({
    queryKey: ['drivers', 'lookup'],
    queryFn: async () => (await driverService.getAll()).data,
    enabled: isOpen,
  });
  const { data: vehicles = [] } = useQuery({
    queryKey: ['vehicles', 'lookup'],
    queryFn: async () => (await vehicleService.getAll()).data,
    enabled: isOpen,
  });

  // Pre-select everything the matcher is confident about, once, as soon as
  // analysis finishes — the "confirm the happy path in one click" behaviour.
  useEffect(() => {
    if (!imp?.isComplete || seededRef.current) return;
    seededRef.current = true;
    setSelected(new Set(
      imp.items
        .filter((i) => i.status === 'Ready' && (i.confidence === 'HIGH' || i.confidence === 'MEDIUM') && !i.duplicateOfDocumentId)
        .map((i) => i.id),
    ));
  }, [imp?.isComplete, imp?.items]);

  const ownerOptions = useMemo<ComboboxOption[]>(() => [
    ...vehicles.map((v: any) => ({ value: `Vehicle:${v.id}`, label: v.plate_number || v.ref_id, group: `Vehicles (${vehicles.length})` })),
    ...drivers.map((d: any) => ({ value: `Driver:${d.id}`, label: `${d.first_name} ${d.last_name}`.trim(), group: `Drivers (${drivers.length})` })),
  ], [vehicles, drivers]);

  const reset = () => {
    setImportId(null);
    setSelected(new Set());
    setDupActions({});
    setExpandedId(null);
    seededRef.current = false;
  };

  const handleClose = () => {
    if (isUploading || isConfirming) return;
    reset();
    onClose();
  };

  const handleFiles = async (files: File[]) => {
    if (files.length === 0) return;
    setIsUploading(true);
    try {
      const created = await documentService.createImport(files);
      setImportId(created.id);
      toast.success(`${created.itemCount} file(s) uploaded — reading them now`);
    } catch (err: any) {
      toast.error(err.response?.data?.error?.message || 'Upload failed');
    } finally {
      setIsUploading(false);
    }
  };

  const patchItem = async (item: DocumentImportItem, patch: Parameters<typeof documentService.updateImportItem>[2]) => {
    if (!importId) return;
    try {
      await documentService.updateImportItem(importId, item.id, patch);
      await queryClient.invalidateQueries({ queryKey: ['documentImport', importId] });
    } catch {
      toast.error('Could not update that row');
    }
  };

  const handleConfirm = async () => {
    if (!importId || selected.size === 0) return;
    setIsConfirming(true);
    try {
      const result = await documentService.confirmImport(importId, [...selected], dupActions);
      const parts = [
        result.created ? `${result.created} imported` : null,
        result.replaced ? `${result.replaced} replaced` : null,
        result.filesAdded ? `${result.filesAdded} added as extra file` : null,
        result.skipped ? `${result.skipped} skipped` : null,
      ].filter(Boolean);
      toast.success(parts.join(' · ') || 'Nothing to import');
      if (result.blocked.length > 0) {
        toast.warning(`${result.blocked.length} row(s) still need an owner or type`);
      }
      await queryClient.invalidateQueries({ queryKey: ['documents'] });
      await queryClient.invalidateQueries({ queryKey: ['ownerFolders'] });
      onImported?.();

      if (result.remaining === 0) {
        reset();
        onClose();
      } else {
        setSelected(new Set());
        await queryClient.invalidateQueries({ queryKey: ['documentImport', importId] });
      }
    } catch (err: any) {
      toast.error(err.response?.data?.error?.message || 'Import failed');
    } finally {
      setIsConfirming(false);
    }
  };

  // Worst-first: the rows needing a human decision must never be buried under
  // the ones that don't.
  const sortedItems = useMemo(() => {
    if (!imp) return [];
    const rank = (i: DocumentImportItem) => {
      if (i.status === 'Confirmed' || i.status === 'Skipped') return 9;
      if (i.status === 'Failed') return 0;
      if (i.status === 'NeedsInput') return 1;
      if (i.duplicateOfDocumentId) return 2;
      return 3 + CONFIDENCE_RANK[(i.confidence || 'NONE') as MatchConfidence];
    };
    return [...imp.items].sort((a, b) => rank(a) - rank(b));
  }, [imp]);

  const actionable = sortedItems.filter((i) => !['Confirmed', 'Skipped'].includes(i.status));

  return (
    <Dialog open={isOpen} onOpenChange={(o) => !o && handleClose()}>
      <DialogContent className="w-full max-w-5xl rounded-2xl p-0 overflow-hidden max-h-[92vh] flex flex-col">
        <DialogHeader className="px-5 pt-5 pb-3 border-b border-slate-100 dark:border-slate-800">
          <DialogTitle className="text-base font-extrabold flex items-center gap-2">
            <UploadCloud className="w-4 h-4 text-brand" /> Import Documents
          </DialogTitle>
          {imp && (
            <p className="text-xs text-slate-500 dark:text-slate-400">
              {imp.isComplete
                ? <>AI read {imp.counts.total} file(s) — <b>{imp.counts.ready} matched</b>{imp.counts.needsInput > 0 && <>, <b className="text-amber-600">{imp.counts.needsInput} need input</b></>}{imp.counts.duplicates > 0 && <>, <b className="text-amber-600">{imp.counts.duplicates} duplicate(s)</b></>}{imp.counts.failed > 0 && <>, <b className="text-rose-600">{imp.counts.failed} failed</b></>}</>
                : <>Reading {imp.analyzing} of {imp.counts.total} file(s) with AI…</>}
            </p>
          )}
        </DialogHeader>

        {/* ── Dropzone (before any files are staged) ─────────────────────── */}
        {!importId ? (
          <div className="p-6">
            <div
              onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
              onDragLeave={() => setIsDragging(false)}
              onDrop={(e) => {
                e.preventDefault();
                setIsDragging(false);
                handleFiles(Array.from(e.dataTransfer.files));
              }}
              onClick={() => fileInputRef.current?.click()}
              className={cn(
                'border-2 border-dashed rounded-2xl p-10 text-center cursor-pointer transition-colors',
                isDragging ? 'border-brand bg-brand-light/40' : 'border-slate-300 dark:border-slate-700 hover:border-brand hover:bg-slate-50 dark:hover:bg-slate-800/50',
              )}
            >
              {isUploading ? (
                <div className="flex flex-col items-center gap-2 text-slate-500">
                  <Loader2 className="w-8 h-8 animate-spin text-brand" />
                  <p className="text-sm font-bold">Uploading…</p>
                </div>
              ) : (
                <div className="flex flex-col items-center gap-2">
                  <UploadCloud className="w-10 h-10 text-slate-300 dark:text-slate-600" />
                  <p className="text-sm font-extrabold text-slate-800 dark:text-slate-200">Drop documents here</p>
                  <p className="text-xs text-slate-500 dark:text-slate-400 max-w-sm">
                    One file or a hundred. AI reads each one and works out which driver or vehicle it belongs to —
                    you confirm before anything is saved.
                  </p>
                  <p className="text-[11px] text-slate-400 mt-1">PDF, JPG, PNG or WEBP</p>
                </div>
              )}
            </div>
            <input
              ref={fileInputRef}
              type="file"
              multiple
              accept=".pdf,.png,.jpg,.jpeg,.webp"
              className="hidden"
              onChange={(e) => { handleFiles(Array.from(e.target.files || [])); e.target.value = ''; }}
            />
          </div>
        ) : (
          <>
            {/* ── Review table ────────────────────────────────────────────── */}
            <div className="flex-1 overflow-y-auto px-4 py-3 space-y-1.5">
              {sortedItems.map((item) => {
                const chip = STATUS_CHIP[item.status] || STATUS_CHIP.Analyzing;
                const ChipIcon = chip.icon;
                const isDone = item.status === 'Confirmed' || item.status === 'Skipped';
                const isExpanded = expandedId === item.id;
                const dupAction = dupActions[item.id];

                return (
                  <div
                    key={item.id}
                    className={cn(
                      'rounded-xl border transition-colors',
                      isDone ? 'border-slate-100 dark:border-slate-800 opacity-50'
                        : item.status === 'NeedsInput' || item.duplicateOfDocumentId ? 'border-amber-200 dark:border-amber-900/60 bg-amber-50/30 dark:bg-amber-950/10'
                        : item.status === 'Failed' ? 'border-rose-200 dark:border-rose-900/60 bg-rose-50/30 dark:bg-rose-950/10'
                        : 'border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900',
                    )}
                  >
                    <div className="flex items-center gap-3 px-3 py-2.5">
                      <input
                        type="checkbox"
                        disabled={isDone || item.status === 'Analyzing'}
                        checked={selected.has(item.id)}
                        onChange={(e) => {
                          const next = new Set(selected);
                          e.target.checked ? next.add(item.id) : next.delete(item.id);
                          setSelected(next);
                        }}
                        className="w-4 h-4 rounded border-slate-300 text-brand focus:ring-brand shrink-0 disabled:opacity-40"
                      />

                      <FileText className="w-4 h-4 text-slate-400 shrink-0" />

                      <div className="min-w-0 flex-1">
                        <p className="text-xs font-bold text-slate-900 dark:text-slate-100 truncate">{item.filename}</p>
                        <p className="text-[11px] text-slate-400 truncate">
                          {item.status === 'Analyzing' ? 'Reading with AI…' : item.error || item.reason || '—'}
                        </p>
                      </div>

                      {/* Owner + type, editable inline */}
                      {!isDone && item.status !== 'Analyzing' && (
                        <div className="flex items-center gap-1.5 shrink-0">
                          <Combobox
                            options={ownerOptions}
                            value={item.ownerId ? `${item.ownerType}:${item.ownerId}` : ''}
                            onChange={(v) => {
                              const [t, id] = String(v).split(':');
                              patchItem(item, { ownerType: t as 'Driver' | 'Vehicle', ownerId: id });
                            }}
                            placeholder="Pick owner"
                            className="w-40 h-8 text-xs"
                          />
                          <Combobox
                            options={docTypes
                              .filter((t: any) => !item.ownerType || t.ownerType === item.ownerType)
                              .map((t: any) => ({ value: t.id, label: t.name }))}
                            value={item.documentType?.id || ''}
                            onChange={(v) => patchItem(item, { documentTypeId: String(v) })}
                            placeholder="Pick type"
                            className="w-36 h-8 text-xs"
                          />
                        </div>
                      )}

                      <Badge variant="outline" className={cn('text-[10px] font-bold shrink-0 gap-1', chip.className)}>
                        <ChipIcon className={cn('w-3 h-3', item.status === 'Analyzing' && 'animate-spin')} />
                        {chip.label}
                      </Badge>

                      <button
                        onClick={() => setExpandedId(isExpanded ? null : item.id)}
                        className="text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 shrink-0"
                      >
                        {isExpanded ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
                      </button>
                    </div>

                    {/* Duplicate resolution — shown inline so it can't be missed */}
                    {item.duplicateOfDocumentId && !isDone && (
                      <div className="px-3 pb-2.5 flex items-center gap-2 flex-wrap">
                        <span className="text-[11px] text-amber-800 dark:text-amber-300 flex items-center gap-1.5">
                          <Copy className="w-3.5 h-3.5" />
                          {item.ownerName} already has a {item.documentType?.name}
                          {item.duplicateExpiry && <> (expires {new Date(item.duplicateExpiry).toLocaleDateString()})</>}
                        </span>
                        {(['replace', 'addFile', 'skip'] as const).map((a) => (
                          <button
                            key={a}
                            onClick={() => setDupActions({ ...dupActions, [item.id]: a })}
                            className={cn(
                              'text-[10px] font-bold px-2 py-1 rounded-md border transition-colors',
                              dupAction === a
                                ? 'bg-amber-600 text-white border-amber-600'
                                : 'bg-white dark:bg-slate-900 border-amber-300 dark:border-amber-800 text-amber-800 dark:text-amber-300 hover:bg-amber-100',
                            )}
                          >
                            {a === 'replace' ? 'Replace' : a === 'addFile' ? 'Add as extra file' : 'Skip'}
                          </button>
                        ))}
                      </div>
                    )}

                    {/* Extracted detail */}
                    {isExpanded && (
                      <div className="px-3 pb-3 pt-1 border-t border-slate-100 dark:border-slate-800 grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <div className="rounded-lg overflow-hidden bg-slate-900 h-32 flex items-center justify-center">
                          {(item.mime_type || '').startsWith('image/')
                            ? <img src={resolveFileUrl(item.file_url)} alt="" className="max-h-full max-w-full object-contain" />
                            : <FileText className="w-8 h-8 text-slate-600" />}
                        </div>
                        <div className="space-y-1.5 text-[11px]">
                          <Field label="Document #" value={item.document_number} />
                          <Field label="Issuer" value={item.issuing_authority} />
                          <div className="flex items-center gap-2">
                            <span className="text-slate-500 w-20 shrink-0">Expiry</span>
                            <DatePicker
                              value={item.expiry_date ? item.expiry_date.slice(0, 10) : ''}
                              onChange={(_d, dateString) => patchItem(item, { expiry_date: dateString || null })}
                              className="h-8 text-xs flex-1"
                            />
                          </div>
                          {item.confidence && (
                            <Field label="Confidence" value={item.confidence} />
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>

            {/* ── Footer ──────────────────────────────────────────────────── */}
            <div className="border-t border-slate-100 dark:border-slate-800 px-4 py-3 flex items-center justify-between gap-3 shrink-0">
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setSelected(new Set(actionable.map((i) => i.id)))}
                  className="text-xs font-bold text-brand hover:underline"
                >
                  Select all
                </button>
                <span className="text-slate-300">·</span>
                <button
                  onClick={() => setSelected(new Set())}
                  className="text-xs font-bold text-slate-500 hover:underline"
                >
                  Clear
                </button>
                <span className="text-xs text-slate-400 ml-1">{selected.size} selected</span>
              </div>

              <div className="flex items-center gap-2">
                <Button variant="outline" size="sm" className="text-xs font-bold" onClick={handleClose} disabled={isConfirming}>
                  {actionable.length > 0 ? 'Finish later' : 'Close'}
                </Button>
                <Button
                  size="sm"
                  className="text-xs font-bold bg-brand hover:bg-brand-hover text-white gap-1.5"
                  onClick={handleConfirm}
                  disabled={selected.size === 0 || isConfirming || !imp?.isComplete}
                >
                  {isConfirming ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <CheckCircle2 className="w-3.5 h-3.5" />}
                  Import {selected.size > 0 ? selected.size : ''} document{selected.size === 1 ? '' : 's'}
                </Button>
              </div>
            </div>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}

function Field({ label, value }: { label: string; value: string | null }) {
  return (
    <div className="flex items-center gap-2">
      <span className="text-slate-500 w-20 shrink-0">{label}</span>
      <span className="font-mono font-bold text-slate-900 dark:text-slate-100 truncate">{value || '—'}</span>
    </div>
  );
}
