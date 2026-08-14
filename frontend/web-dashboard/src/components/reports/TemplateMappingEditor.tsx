import { TRIP_REPORT_FIELDS, type TemplateLayout } from '@mercon/shared-types';
import type { TemplateInspection } from '@/services/reportTemplateService';
import { CheckCircle2, CircleDashed } from 'lucide-react';

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
      <div className="text-sm text-slate-500 bg-slate-50 border border-slate-200 rounded-lg p-4">
        Could not detect a header row with at least 2 recognizable columns. Try a different sheet or file.
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

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between text-xs text-slate-500">
        <span>
          Sheet <strong className="text-slate-800">{sheet.sheetName}</strong> — header at row {sheet.headerRowIdx}
        </span>
        <span className="font-semibold text-brand">{mappedCount} of {sheet.columns.length} columns mapped</span>
      </div>

      {/* The sample-data range. Everything inside it is replaced by generated
          rows; anything below (totals, notes, signatures) is kept and shifted
          down. Getting the end row wrong leaves the customer's own sample rows
          sitting underneath the real data, so it is editable, not inferred. */}
      <div className="flex flex-wrap items-end gap-3 bg-slate-50 border border-slate-200 rounded-lg p-3">
        <div>
          <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-500 mb-1">Data rows from</label>
          <input
            type="number"
            min={1}
            value={layout.dataStartRow}
            onChange={(e) => onChange({ ...layout, dataStartRow: Math.max(1, Number(e.target.value) || 1) })}
            className="w-24 bg-white border border-slate-200 rounded-md px-2 py-1 text-xs outline-none focus:border-brand"
          />
        </div>
        <div>
          <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-500 mb-1">to (inclusive)</label>
          <input
            type="number"
            min={layout.dataStartRow}
            value={layout.dataEndRow}
            onChange={(e) => onChange({ ...layout, dataEndRow: Math.max(layout.dataStartRow, Number(e.target.value) || layout.dataStartRow) })}
            className="w-24 bg-white border border-slate-200 rounded-md px-2 py-1 text-xs outline-none focus:border-brand"
          />
        </div>
        <p className="text-[11px] text-slate-500 flex-1 min-w-[220px] leading-relaxed">
          These rows are the template's sample data and get replaced. Rows below them (totals, notes) are kept and shift down.
        </p>
      </div>

      <div className="border border-slate-200 rounded-lg overflow-hidden">
        <table className="w-full text-xs">
          <thead className="bg-slate-50 text-slate-500 uppercase tracking-wide">
            <tr>
              <th className="text-left px-3 py-2 font-semibold">Column</th>
              <th className="text-left px-3 py-2 font-semibold">Template header</th>
              <th className="text-left px-3 py-2 font-semibold">Sample value</th>
              <th className="text-left px-3 py-2 font-semibold">Maps to</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {sheet.columns.map((col) => {
              const mapping = layout.columns.find((c) => c.colIndex === col.colIndex);
              const source = mapping?.source ?? (col.suggestedField ? { kind: 'field' as const, key: col.suggestedField } : { kind: 'blank' as const });
              const selectValue =
                source.kind === 'field' ? `field:${source.key}` : source.kind === 'const' ? 'const' : source.kind === 'formula' ? 'formula' : 'blank';

              return (
                <tr key={col.colIndex} className="hover:bg-slate-50/60">
                  <td className="px-3 py-2 font-mono text-slate-400">{colLetter(col.colIndex)}</td>
                  <td className="px-3 py-2 font-medium text-slate-800">{col.headerText}</td>
                  <td className="px-3 py-2 text-slate-500 truncate max-w-[160px]">{col.sampleValue || '—'}</td>
                  <td className="px-3 py-2">
                    <div className="flex items-center gap-2">
                      {source.kind === 'field' ? (
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                      ) : (
                        <CircleDashed className="w-3.5 h-3.5 text-slate-300 shrink-0" />
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
                        className="flex-1 bg-white border border-slate-200 rounded-md px-2 py-1 text-xs font-medium text-slate-800 outline-none focus:border-brand"
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
                          className="w-28 bg-white border border-slate-200 rounded-md px-2 py-1 text-xs outline-none focus:border-brand"
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
  );
}
