import { TRIP_REPORT_FIELDS, type TemplateLayout } from '@mercon/shared-types';
import type { TemplateInspection } from '@/services/reportTemplateService';
import { CheckCircle2, CircleDashed, FileSearch } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

interface TemplateMappingEditorProps {
  inspection: TemplateInspection;
  layout: TemplateLayout;
  onChange: (layout: TemplateLayout) => void;
}

const colLetter = (n: number): string => {
  let s = '';
  let num = n;
  while (num > 0) {
    const rem = (num - 1) % 26;
    s = String.fromCharCode(65 + rem) + s;
    num = Math.floor((num - 1) / 26);
  }
  return s;
};

/**
 * The confirmation step the original generator never had: every detected
 * template column gets a human-picked destination before it's saved as the
 * template's layout. Auto-detection (from the backend inspect step) only
 * pre-fills the dropdown — nothing here re-guesses at generation time.
 */
export default function TemplateMappingEditor({ inspection, layout, onChange }: TemplateMappingEditorProps) {
  const sheet = inspection.bestSheet;
  if (!sheet) {
    return (
      <div className="flex flex-col items-center justify-center gap-2 max-w-sm mx-auto py-10 text-center">
        <div className="w-14 h-14 rounded-2xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-400">
          <FileSearch size={28} className="stroke-[1.5]" />
        </div>
        <p className="text-sm font-bold text-slate-900 dark:text-slate-100 mt-2">No header row detected</p>
        <p className="text-xs text-slate-500 dark:text-slate-400">
          Could not find a row with at least 2 recognizable columns. Try a different sheet or file.
        </p>
      </div>
    );
  }

  const updateColumn = (colIndex: number, source: TemplateLayout['columns'][number]['source']) => {
    const columns = layout.columns.some((c) => c.colIndex === colIndex)
      ? layout.columns.map((c) => (c.colIndex === colIndex ? { ...c, source } : c))
      : [...layout.columns, { colIndex, headerText: sheet.columns.find((c) => c.colIndex === colIndex)?.headerText ?? '', source }];
    onChange({ ...layout, columns });
  };

  const mappedCount = layout.columns.filter((c) => c.source.kind === 'field').length;
  const allMapped = mappedCount === sheet.columns.length;

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between gap-3 text-xs text-slate-500 dark:text-slate-400">
        <span className="truncate min-w-0" title={sheet.sheetName}>
          Sheet <strong className="text-slate-800 dark:text-slate-200">{sheet.sheetName}</strong> — header at row {sheet.headerRowIdx}
        </span>
        <Badge
          variant="outline"
          className={cn(
            'shrink-0 text-[11px] font-mono font-bold px-2 py-0.5',
            allMapped
              ? 'bg-emerald-50 dark:bg-emerald-950/30 text-emerald-700 dark:text-emerald-400 border-emerald-200 dark:border-emerald-900'
              : 'bg-amber-50 dark:bg-amber-950/30 text-amber-700 dark:text-amber-400 border-amber-200 dark:border-amber-900'
          )}
        >
          {mappedCount} / {sheet.columns.length} mapped
        </Badge>
      </div>

      {/* The sample-data range. Everything inside it is replaced by generated
          rows; anything below (totals, notes, signatures) is kept and shifted
          down. Getting the end row wrong leaves the customer's own sample rows
          sitting underneath the real data, so it is editable, not inferred. */}
      <div className="bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-700 rounded-xl p-3 space-y-2.5">
        <div className="flex items-end gap-3 flex-wrap">
          <div>
            <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1">Data rows from</label>
            <input
              type="number"
              min={1}
              value={layout.dataStartRow}
              onChange={(e) => onChange({ ...layout, dataStartRow: Math.max(1, Number(e.target.value) || 1) })}
              className="w-28 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-2 text-sm font-medium text-slate-800 dark:text-slate-100 outline-none focus:border-brand"
            />
          </div>
          <div>
            <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1">to (inclusive)</label>
            <input
              type="number"
              min={layout.dataStartRow}
              value={layout.dataEndRow}
              onChange={(e) => onChange({ ...layout, dataEndRow: Math.max(layout.dataStartRow, Number(e.target.value) || layout.dataStartRow) })}
              className="w-28 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-2 text-sm font-medium text-slate-800 dark:text-slate-100 outline-none focus:border-brand"
            />
          </div>
        </div>
        <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-relaxed">
          These rows are the template's sample data and get replaced. Rows below them (totals, notes) are kept and shift down.
        </p>
      </div>

      <div className="border border-slate-200 dark:border-slate-700 rounded-xl overflow-hidden">
        <div className="overflow-auto max-h-[420px]">
          <table className="w-full text-xs">
            <thead className="bg-slate-50 dark:bg-slate-900/80 text-slate-500 dark:text-slate-400 uppercase tracking-wide sticky top-0 z-10">
              <tr>
                <th className="text-left px-3 py-2 font-semibold">Column</th>
                <th className="text-left px-3 py-2 font-semibold">Template header</th>
                <th className="text-left px-3 py-2 font-semibold">Sample value</th>
                <th className="text-left px-3 py-2 font-semibold">Maps to</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {sheet.columns.map((col) => {
                const mapping = layout.columns.find((c) => c.colIndex === col.colIndex);
                const source = mapping?.source ?? (col.suggestedField ? { kind: 'field' as const, key: col.suggestedField } : { kind: 'blank' as const });
                const selectValue =
                  source.kind === 'field' ? `field:${source.key}` : source.kind === 'const' ? 'const' : source.kind === 'formula' ? 'formula' : 'blank';
                const isUnmapped = source.kind === 'blank';

                return (
                  <tr
                    key={col.colIndex}
                    className={cn(
                      'hover:bg-slate-50/60 dark:hover:bg-slate-800/40',
                      isUnmapped && 'bg-amber-50/40 dark:bg-amber-950/10'
                    )}
                  >
                    <td className="px-3 py-2 font-mono text-slate-400 dark:text-slate-500">{colLetter(col.colIndex)}</td>
                    <td className="px-3 py-2 font-medium text-slate-800 dark:text-slate-200 max-w-[220px] truncate" title={col.headerText}>
                      {col.headerText}
                    </td>
                    <td className="px-3 py-2 text-slate-500 dark:text-slate-400 max-w-[160px] truncate" title={col.sampleValue || undefined}>
                      {col.sampleValue || '—'}
                    </td>
                    <td className="px-3 py-2">
                      <div className="flex items-center gap-2">
                        {source.kind === 'field' ? (
                          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                        ) : (
                          <CircleDashed className="w-3.5 h-3.5 text-slate-300 dark:text-slate-600 shrink-0" />
                        )}
                        <select
                          value={selectValue}
                          onChange={(e) => {
                            const val = e.target.value;
                            if (val === 'blank') updateColumn(col.colIndex, { kind: 'blank' });
                            else if (val === 'formula') updateColumn(col.colIndex, { kind: 'formula' });
                            else if (val === 'const') updateColumn(col.colIndex, { kind: 'const', value: '' });
                            else updateColumn(col.colIndex, { kind: 'field', key: val.replace('field:', '') as any });
                          }}
                          className="flex-1 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-md px-2 py-1 text-xs font-medium text-slate-800 dark:text-slate-100 outline-none focus:border-brand"
                        >
                          <option value="blank">— leave blank —</option>
                          <option value="formula">Keep template formula</option>
                          <option value="const">Fixed text…</option>
                          {TRIP_REPORT_FIELDS.map((f) => (
                            <option key={f.key} value={`field:${f.key}`}>
                              {f.label}
                            </option>
                          ))}
                        </select>
                        {source.kind === 'const' && (
                          <input
                            type="text"
                            value={source.value}
                            onChange={(e) => updateColumn(col.colIndex, { kind: 'const', value: e.target.value })}
                            placeholder="Fixed value"
                            className="w-28 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-md px-2 py-1 text-xs outline-none focus:border-brand"
                          />
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
