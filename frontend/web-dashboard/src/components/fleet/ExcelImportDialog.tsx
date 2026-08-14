import { useEffect, useRef, useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import {
  UploadCloud, FileSpreadsheet, Loader2, CheckCircle2, XCircle,
  AlertTriangle, Download, ArrowLeft,
} from 'lucide-react';

import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { parseSheet, ParsedSheet } from '@/utils/importUtils';
import { cn } from '@/lib/utils';

export interface ImportRowResult {
  row: number;
  success: boolean;
  ref_id?: string;
  label?: string;
  action?: 'created' | 'updated';
  error?: string;
  warning?: string;
}

export interface ImportSummary {
  total: number;
  created: number;
  updated: number;
  failed: number;
  results: ImportRowResult[];
}

interface ExcelImportDialogProps {
  isOpen: boolean;
  onClose: () => void;
  /** "Drivers" / "Vehicles" — used in the copy. */
  entityLabel: string;
  /** Field → accepted header spellings, from importUtils. */
  columns: Record<string, string[]>;
  /** Which fields must be present, or the file can't be imported. */
  requiredFields: string[];
  /** Prefer the sheet whose name contains this, for the all-in-one template. */
  preferSheet: string;
  /** Public path to the matching template, offered when a file won't parse. */
  templateUrl: string;
  /** What existing rows are matched on, shown in the preview footnote — e.g. "phone number", "customer + lane + vehicle type". Defaults to "plate number". */
  matchLabel?: string;
  onImport: (rows: Record<string, string | number>[]) => Promise<ImportSummary>;
  /** Query keys to refresh after a successful import. */
  invalidateKeys: string[][];
}

/**
 * Upload → preview → confirm → results.
 *
 * The preview step is the point of this: the workbook is parsed in the browser
 * and the operator sees the row count, any columns we couldn't find, and any
 * headers we didn't recognise, all before a single record is written. A file
 * with a renamed column silently importing half its data would be much worse
 * than a file that refuses to import.
 */
export default function ExcelImportDialog({
  isOpen, onClose, entityLabel, columns, requiredFields, preferSheet,
  templateUrl, matchLabel, onImport, invalidateKeys,
}: ExcelImportDialogProps) {
  const queryClient = useQueryClient();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [file, setFile] = useState<File | null>(null);
  const [parsed, setParsed] = useState<ParsedSheet | null>(null);
  const [parseError, setParseError] = useState<string | null>(null);
  const [isParsing, setIsParsing] = useState(false);
  const [summary, setSummary] = useState<ImportSummary | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [validationDetails, setValidationDetails] = useState<Array<{ path: string; message: string }> | null>(null);

  const reset = () => {
    setFile(null);
    setParsed(null);
    setParseError(null);
    setValidationDetails(null);
    setSummary(null);
    setIsParsing(false);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  useEffect(() => { if (isOpen) reset(); }, [isOpen]);

  const handleFile = async (picked: File) => {
    setFile(picked);
    setParsed(null);
    setParseError(null);
    setIsParsing(true);
    try {
      setParsed(await parseSheet(picked, columns, preferSheet));
    } catch (e: any) {
      setParseError(e.message || 'Could not read that file.');
    } finally {
      setIsParsing(false);
    }
  };

  const importMutation = useMutation({
    mutationFn: () => onImport(parsed!.rows),
    onSuccess: (res) => {
      invalidateKeys.forEach((key) => queryClient.invalidateQueries({ queryKey: key }));
      setSummary(res);
    },
    onError: (err: any) => {
      const respErr = err.response?.data?.error;
      setParseError(
        respErr?.message || err.message || 'The import failed.'
      );
      if (respErr?.details && Array.isArray(respErr.details)) {
        setValidationDetails(respErr.details);
      } else {
        setValidationDetails(null);
      }
    },
  });

  const missingRequired = parsed
    ? parsed.missingColumns.filter((c) => requiredFields.includes(c))
    : [];
  const canImport = !!parsed && parsed.rows.length > 0 && missingRequired.length === 0;

  const warnings = summary?.results.filter((r) => r.warning) ?? [];
  const failures = summary?.results.filter((r) => !r.success) ?? [];

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-4xl max-w-[95vw] w-full rounded-2xl">
        <DialogHeader>
          <DialogTitle className="text-base font-extrabold flex items-center gap-2">
            <FileSpreadsheet className="w-4 h-4 text-emerald-600" />
            Import {entityLabel} from Excel
          </DialogTitle>
          <DialogDescription className="text-xs">
            {summary
              ? 'Import finished.'
              : 'Upload the completed MERCON template. You\'ll see what it contains before anything is saved.'}
          </DialogDescription>
        </DialogHeader>

        {/* ── Results ─────────────────────────────────────────────────── */}
        {summary ? (
          <div className="space-y-3">
            <div className="grid grid-cols-3 gap-2 text-center">
              <div className="rounded-xl border border-emerald-200 bg-emerald-50 dark:bg-emerald-950/30 p-3">
                <div className="text-xl font-extrabold text-emerald-700">{summary.created}</div>
                <div className="text-[10px] font-bold uppercase tracking-wider text-emerald-700/80">Created</div>
              </div>
              <div className="rounded-xl border border-indigo-200 bg-indigo-50 dark:bg-indigo-950/30 p-3">
                <div className="text-xl font-extrabold text-indigo-700">{summary.updated}</div>
                <div className="text-[10px] font-bold uppercase tracking-wider text-indigo-700/80">Updated</div>
              </div>
              <div className={cn(
                'rounded-xl border p-3',
                summary.failed > 0
                  ? 'border-rose-200 bg-rose-50 dark:bg-rose-950/30'
                  : 'border-slate-200 bg-slate-50 dark:bg-slate-800/40'
              )}>
                <div className={cn('text-xl font-extrabold', summary.failed > 0 ? 'text-rose-700' : 'text-slate-500')}>
                  {summary.failed}
                </div>
                <div className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Failed</div>
              </div>
            </div>

            {failures.length > 0 && (
              <div className="space-y-1.5">
                <p className="text-[11px] font-bold uppercase tracking-wider text-rose-700">
                  Rows not imported
                </p>
                <div className="max-h-40 overflow-y-auto space-y-1">
                  {failures.map((r) => (
                    <div key={r.row} className="flex items-start gap-2 rounded-lg border border-rose-100 bg-rose-50/60 px-2.5 py-1.5 text-[11px]">
                      <XCircle className="w-3.5 h-3.5 shrink-0 text-rose-600 mt-0.5" />
                      <span>
                        <span className="font-bold">Row {r.row}{r.label ? ` — ${r.label}` : ''}:</span>{' '}
                        <span className="text-rose-800">{r.error}</span>
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {warnings.length > 0 && (
              <div className="space-y-1.5">
                <p className="text-[11px] font-bold uppercase tracking-wider text-amber-700">
                  Imported, with something left undone
                </p>
                <div className="max-h-40 overflow-y-auto space-y-1">
                  {warnings.map((r) => (
                    <div key={r.row} className="flex items-start gap-2 rounded-lg border border-amber-100 bg-amber-50/60 px-2.5 py-1.5 text-[11px]">
                      <AlertTriangle className="w-3.5 h-3.5 shrink-0 text-amber-600 mt-0.5" />
                      <span>
                        <span className="font-bold">Row {r.row}{r.label ? ` — ${r.label}` : ''}:</span>{' '}
                        <span className="text-amber-800">{r.warning}</span>
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {failures.length === 0 && warnings.length === 0 && (
              <p className="flex items-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2.5 text-xs font-semibold text-emerald-800">
                <CheckCircle2 className="w-4 h-4 shrink-0" />
                Every row imported cleanly.
              </p>
            )}
          </div>
        ) : (
          <div className="space-y-3">
            {/* ── Drop zone ────────────────────────────────────────────── */}
            <div
              onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
              onDragLeave={() => setIsDragging(false)}
              onDrop={(e) => {
                e.preventDefault();
                setIsDragging(false);
                const dropped = e.dataTransfer.files?.[0];
                if (dropped) handleFile(dropped);
              }}
              onClick={() => fileInputRef.current?.click()}
              className={cn(
                'flex flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed p-6 cursor-pointer transition-colors',
                isDragging
                  ? 'border-brand bg-brand/5'
                  : 'border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800/40'
              )}
            >
              <UploadCloud className="w-7 h-7 text-slate-400" />
              <p className="text-xs font-bold text-slate-700 dark:text-slate-200">
                {file ? file.name : 'Drop the .xlsx here, or click to choose'}
              </p>
              <p className="text-[11px] text-slate-500">Excel workbooks only (.xlsx)</p>
              <input
                ref={fileInputRef}
                type="file"
                accept=".xlsx,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
                className="hidden"
                onChange={(e) => {
                  const picked = e.target.files?.[0];
                  if (picked) handleFile(picked);
                }}
              />
            </div>

            {!file && (
              <a
                href={templateUrl}
                download
                className="inline-flex items-center gap-1.5 text-[11px] font-bold text-brand hover:underline"
              >
                <Download className="w-3.5 h-3.5" /> Download the {entityLabel} template
              </a>
            )}

            {isParsing && (
              <p className="flex items-center gap-2 text-xs text-slate-500">
                <Loader2 className="w-3.5 h-3.5 animate-spin" /> Reading the file...
              </p>
            )}

            {parseError && (
              <div className="rounded-xl border border-rose-200 bg-rose-50 px-3 py-2.5 text-xs space-y-2">
                <p className="font-semibold text-rose-700">{parseError}</p>
                {validationDetails && validationDetails.length > 0 && (
                  <div className="max-h-32 overflow-y-auto space-y-1.5 mt-1 text-[11px] text-rose-800 bg-white/60 p-2.5 rounded-lg border border-rose-100 dark:bg-slate-900/60 dark:border-rose-950/40 dark:text-rose-400">
                    {validationDetails.map((det, idx) => (
                      <div key={idx} className="flex flex-col gap-0.5">
                        <span className="font-bold text-rose-900 dark:text-rose-300">
                          {det.path.replace('rows.', 'Row ').replace(/\.(\w+)/g, ' ➔ $1')}
                        </span>
                        <span className="opacity-90">{det.message}</span>
                      </div>
                    ))}
                  </div>
                )}
                <a
                  href={templateUrl}
                  download
                  className="inline-flex items-center gap-1.5 text-[11px] font-bold text-rose-700 hover:underline pt-1"
                >
                  <Download className="w-3.5 h-3.5" /> Download the {entityLabel} template
                </a>
              </div>
            )}

            {/* ── Preview ──────────────────────────────────────────────── */}
            {parsed && !parseError && (
              <div className="space-y-2.5">
                <div className="flex items-center justify-between gap-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/40 px-3 py-2.5">
                  <span className="text-xs font-bold text-slate-800 dark:text-slate-200">
                    {parsed.rows.length} row{parsed.rows.length === 1 ? '' : 's'} found
                  </span>
                  <Badge variant="outline" className="text-[10px] font-semibold">
                    Sheet: {parsed.sheetName}
                  </Badge>
                </div>

                {missingRequired.length > 0 && (
                  <div className="rounded-xl border border-rose-200 bg-rose-50 px-3 py-2.5 text-xs">
                    <p className="font-bold text-rose-700">Required columns are missing</p>
                    <p className="text-rose-800/80 mt-0.5">
                      Couldn't find: <strong>{missingRequired.join(', ')}</strong>. Nothing can be
                      imported until the file has these.
                    </p>
                  </div>
                )}

                {parsed.rows.length === 0 && (
                  <div className="rounded-xl border border-amber-200 bg-amber-50 px-3 py-2.5 text-xs">
                    <p className="font-bold text-amber-900">No data rows</p>
                    <p className="text-amber-800/80 mt-0.5">
                      The headers were found but every row below them is empty.
                    </p>
                  </div>
                )}

                {parsed.unmappedHeaders.length > 0 && (
                  <div className="rounded-xl border border-amber-200 bg-amber-50 px-3 py-2.5 text-xs">
                    <p className="font-bold text-amber-900">Columns that will be ignored</p>
                    <p className="text-amber-800/80 mt-0.5">
                      {parsed.unmappedHeaders.join(', ')} — not part of the template, so nothing is
                      read from them.
                    </p>
                  </div>
                )}

                {/* First few rows, so the operator can eyeball the mapping */}
                {parsed.rows.length > 0 && (
                  <div className="overflow-x-auto rounded-xl border border-slate-200 dark:border-slate-700">
                    <table className="w-full text-[11px]">
                      <thead className="bg-slate-50 dark:bg-slate-800/60">
                        <tr>
                          {Object.keys(parsed.rows[0]).map((field) => (
                            <th key={field} className="px-2.5 py-1.5 text-left font-bold text-slate-600 dark:text-slate-300 whitespace-nowrap">
                              {field.replace(/_/g, ' ')}
                            </th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {parsed.rows.slice(0, 3).map((row, i) => (
                          <tr key={i} className="border-t border-slate-100 dark:border-slate-800">
                            {Object.keys(parsed.rows[0]).map((field) => (
                              <td key={field} className="px-2.5 py-1.5 text-slate-700 dark:text-slate-300 whitespace-nowrap">
                                {String(row[field] ?? '—')}
                              </td>
                            ))}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                    {parsed.rows.length > 3 && (
                      <p className="px-2.5 py-1.5 text-[10px] text-slate-500 border-t border-slate-100 dark:border-slate-800">
                        …and {parsed.rows.length - 3} more
                      </p>
                    )}
                  </div>
                )}

                <p className="text-[11px] text-slate-500">
                  Existing records are matched on{' '}
                  <strong>{matchLabel || (entityLabel === 'Drivers' ? 'phone number' : 'plate number')}</strong> and
                  updated — re-uploading a corrected file won't create duplicates.
                </p>
              </div>
            )}
          </div>
        )}

        <DialogFooter>
          {summary ? (
            <>
              <Button variant="outline" size="sm" onClick={reset} className="h-9 gap-1.5 text-xs">
                <ArrowLeft className="w-3.5 h-3.5" /> Import another file
              </Button>
              <Button size="sm" onClick={onClose} className="h-9 text-xs font-bold bg-brand hover:bg-brand-hover text-white">
                Done
              </Button>
            </>
          ) : (
            <>
              <Button variant="outline" size="sm" onClick={onClose} className="h-9 text-xs">
                Cancel
              </Button>
              <Button
                size="sm"
                onClick={() => importMutation.mutate()}
                disabled={!canImport || importMutation.isPending}
                className="h-9 gap-1.5 text-xs font-bold bg-brand hover:bg-brand-hover text-white"
              >
                {importMutation.isPending && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                Import {parsed?.rows.length ? `${parsed.rows.length} ` : ''}{entityLabel.toLowerCase()}
              </Button>
            </>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
