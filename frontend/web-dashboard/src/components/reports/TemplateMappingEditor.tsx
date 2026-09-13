import { useState, useMemo } from 'react';
import { TRIP_REPORT_FIELDS, type TemplateLayout, type TripReportFieldKey } from '@mercon/shared-types';
import type { TemplateInspection } from '@/services/reportTemplateService';
import { 
  CheckCircle2, 
  CircleDashed, 
  FileSearch, 
  Sparkles, 
  RotateCcw, 
  HelpCircle, 
  Layers, 
  FileSpreadsheet, 
  ArrowRight,
  Calculator,
  Tag
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { Combobox, ComboboxOption } from '@/components/ui/combobox';

const MAPPING_OPTIONS: ComboboxOption[] = [
  { value: 'blank', label: '— Leave Blank (Empty Column) —', group: '⚙️ Special Actions' },
  { value: 'formula', label: 'Keep Original Template Formula', group: '⚙️ Special Actions' },
  { value: 'const', label: 'Fixed Text Constant...', group: '⚙️ Special Actions' },

  // Grouped MERCON Database Fields
  { value: 'field:ref_id', label: 'Trip / Job Reference No.', group: '📋 Trip Details', keywords: 'waybill trip job reference number ref' },
  { value: 'field:date', label: 'Trip Date', group: '📋 Trip Details', keywords: 'date time created' },
  { value: 'field:status', label: 'Trip Duty Status', group: '📋 Trip Details', keywords: 'status state condition' },
  { value: 'field:rate_category', label: 'Rate Category / Service Type', group: '📋 Trip Details', keywords: 'rate category type' },
  { value: 'field:serial', label: 'Row Serial Number (1, 2, 3...)', group: '📋 Trip Details', keywords: 'serial index row number' },

  { value: 'field:customer_name', label: 'Customer / Sender Company', group: '👤 Parties & Transport', keywords: 'customer sender company client' },
  { value: 'field:receiver', label: 'Receiver / Consignee Name', group: '👤 Parties & Transport', keywords: 'receiver consignee recipient' },
  { value: 'field:driver_name', label: 'Driver Full Name', group: '👤 Parties & Transport', keywords: 'driver captain name' },
  { value: 'field:driver_phone', label: 'Driver Mobile / Phone', group: '👤 Parties & Transport', keywords: 'phone mobile contact' },
  { value: 'field:vehicle_plate', label: 'Vehicle Plate Number', group: '👤 Parties & Transport', keywords: 'plate vehicle truck' },
  { value: 'field:vehicle_type', label: 'Vehicle Class / Asset Type', group: '👤 Parties & Transport', keywords: 'type class capacity ton' },
  { value: 'field:carrier_name', label: 'Carrier / 3rd Party Subcontractor', group: '👤 Parties & Transport', keywords: 'carrier vendor 3rd party subcontractor' },

  { value: 'field:origin', label: 'Pickup Location (Origin)', group: '📍 Locations & Stops', keywords: 'pickup origin from location city' },
  { value: 'field:destination', label: 'Dropoff Location (Destination)', group: '📍 Locations & Stops', keywords: 'dropoff destination to location city' },

  { value: 'field:billing_amount', label: 'Billing Amount (Base Rate)', group: '💰 Billing & Financials', keywords: 'billing amount rate price base' },
  { value: 'field:total_amount', label: 'Total Amount (Grand Total)', group: '💰 Billing & Financials', keywords: 'total amount sum grand' },
  { value: 'field:trip_charges', label: 'Driver Charge', group: '💰 Billing & Financials', keywords: 'driver charge payout trip charge fee' },
  { value: 'field:total_charges', label: 'Extra Surcharges (Waiting, Stops)', group: '💰 Billing & Financials', keywords: 'extra surcharge waiting detention stop' },
  { value: 'field:balance_amount', label: 'Balance Amount', group: '💰 Billing & Financials', keywords: 'balance margin net' },
];

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

function autoSuggestField(headerText: string): TripReportFieldKey | null {
  if (!headerText) return null;
  const h = headerText.toLowerCase().trim();
  
  // 1. Trip Ref ID / UUID / Job No / Departure ID
  if (h.includes('uuid') || h.includes('departure') || h.includes('waybill') || h.includes('job') || h.includes('ref') || h.includes('serial') || h.includes('tracking') || h.includes('id')) return 'ref_id';
  
  // 2. Date
  if (h.includes('date') || h.includes('time')) return 'date';
  
  // 3. Customer / Vendor / Sender / Carrier
  if (h.includes('customer') || h.includes('client') || h.includes('sender') || h.includes('company')) return 'customer_name';
  if (h.includes('vendor') || h.includes('carrier') || h.includes('subcontractor') || h.includes('3rd') || h.includes('provider') || h.includes('supplier')) return 'carrier_name';

  // 4. Driver
  if (h.includes('driver') || h.includes('captain')) return 'driver_name';
  if (h.includes('phone') || h.includes('mobile') || h.includes('contact')) return 'driver_phone';

  // 5. Vehicle Plate / Vehicle Type (Catching typos like "Vehcile Number" / "Vehcile Type")
  if (h.includes('plate') || h.includes('reg') || (h.includes('veh') && (h.includes('num') || h.includes('no')))) return 'vehicle_plate';
  if (h.includes('type') || h.includes('class') || h.includes('capacity') || h.includes('ton') || h.includes('fit') || (h.includes('veh') && h.includes('type'))) return 'vehicle_type';

  // 6. Rental Method / Category
  if (h.includes('rental') || h.includes('method') || h.includes('category') || h.includes('contract') || h.includes('duty')) return 'rate_category';

  // 7. Pickup / Origin / From
  if (h.includes('pickup') || h.includes('origin') || h.includes('from') || h.includes('start') || h.includes('source')) return 'origin';

  // 8. Dropoff / Destination / To / Consignee
  if (h.includes('drop') || h.includes('destination') || h.includes('to') || h.includes('end') || h.includes('target')) return 'destination';
  if (h.includes('consignee') || h.includes('receiver')) return 'receiver';

  // 9. Charges / Billing Amount / VAT / Inc VAT / Total
  if (h.includes('inc vat') || h.includes('total') || h.includes('sum') || h.includes('gross') || h.includes('net') || h.includes('final')) return 'total_amount';
  if (h.includes('vat') || h.includes('tax') || h.includes('surcharge') || h.includes('extra')) return 'total_charges';
  if (h.includes('charge') || h.includes('bill') || h.includes('rate') || h.includes('amount') || h.includes('price') || h.includes('cost') || h.includes('fare')) return 'billing_amount';

  // 10. Status
  if (h.includes('status') || h.includes('state')) return 'status';

  return null;
}

export default function TemplateMappingEditor({ inspection, layout, onChange }: TemplateMappingEditorProps) {
  const sheet = inspection.bestSheet;

  if (!sheet) {
    return (
      <div className="flex flex-col items-center justify-center gap-2 max-w-sm mx-auto py-12 text-center">
        <FileSearch className="w-10 h-10 text-slate-300 dark:text-slate-600 shrink-0" />
        <p className="text-sm font-bold text-slate-900 dark:text-slate-100 mt-2">No header row detected in Excel file</p>
        <p className="text-xs text-slate-500 dark:text-slate-400">
          Could not auto-detect a row with header titles. Please check the Excel workbook layout.
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

  const handleAutoMapAll = () => {
    const newCols = sheet.columns.map((col) => {
      const suggested = autoSuggestField(col.headerText);
      return {
        colIndex: col.colIndex,
        headerText: col.headerText,
        source: suggested ? ({ kind: 'field' as const, key: suggested }) : ({ kind: 'blank' as const })
      };
    });
    onChange({ ...layout, columns: newCols });
  };

  const handleClearAll = () => {
    const newCols = sheet.columns.map((col) => ({
      colIndex: col.colIndex,
      headerText: col.headerText,
      source: { kind: 'blank' as const }
    }));
    onChange({ ...layout, columns: newCols });
  };

  const mappedCount = layout.columns.filter((c) => c.source.kind === 'field').length;
  const mappedPct = Math.round((mappedCount / (sheet.columns.length || 1)) * 100);

  return (
    <div className="space-y-4">
      {/* ── 1. Top Header & Action Controls ────────────────────────────────── */}
      <div className="bg-slate-50 dark:bg-slate-900/90 rounded-xl p-4 border border-slate-200/60 dark:border-slate-800 space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <FileSpreadsheet className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
            <span className="text-xs font-bold text-slate-800 dark:text-slate-200">
              Sheet: <span className="font-mono text-[#FA634E]">{sheet.sheetName}</span>
            </span>
            <span className="text-slate-300 dark:text-slate-700">·</span>
            <span className="text-xs text-slate-500 font-medium">Header Row {sheet.headerRowIdx}</span>
          </div>

          <div className="flex items-center gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handleAutoMapAll}
              className="h-7 text-xs font-bold gap-1.5 border-emerald-300 text-emerald-700 hover:bg-emerald-50 dark:border-emerald-800 dark:text-emerald-400 dark:hover:bg-emerald-950/40 bg-white"
              title="Automatically match Excel headers to MERCON database fields"
            >
              <Sparkles className="w-3.5 h-3.5 text-emerald-500" /> Smart Auto-Map
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={handleClearAll}
              className="h-7 text-xs font-semibold text-slate-500 hover:text-slate-800 dark:hover:text-slate-200"
            >
              <RotateCcw className="w-3 h-3 mr-1 text-slate-400" /> Clear
            </Button>
          </div>
        </div>

        {/* Progress Bar Meter */}
        <div className="space-y-1.5 pt-1">
          <div className="flex items-center justify-between text-[11px] font-bold">
            <span className="text-slate-600 dark:text-slate-400">
              Field Mapping Progress: <span className="text-slate-900 dark:text-slate-100 font-mono">{mappedCount} of {sheet.columns.length} Columns Mapped</span>
            </span>
            <span className={cn(
              "font-mono font-extrabold text-[11px]",
              mappedPct === 100 ? "text-emerald-600 dark:text-emerald-400" : "text-amber-600 dark:text-amber-400"
            )}>
              {mappedPct}% Complete
            </span>
          </div>
          <div className="h-2 w-full bg-slate-200/80 dark:bg-slate-800 rounded-full overflow-hidden">
            <div 
              className={cn(
                "h-full transition-all duration-300 rounded-full",
                mappedPct === 100 ? "bg-emerald-500" : "bg-gradient-to-r from-amber-500 to-emerald-500"
              )}
              style={{ width: `${mappedPct}%` }}
            />
          </div>
        </div>
      </div>

      {/* ── 2. Data Rows Range Band Box ────────────────────────────────────── */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-3.5 flex flex-wrap items-center justify-between gap-4 shadow-2xs">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-orange-50 text-[#FA634E] dark:bg-orange-950/30 shrink-0">
            <Layers className="w-4 h-4" />
          </div>
          <div>
            <span className="text-xs font-bold text-slate-800 dark:text-slate-200 block">Excel Data Replacement Range</span>
            <span className="text-[11px] text-slate-500 block">Sample rows inside this range will be replaced with real generated trip data.</span>
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <div className="flex items-center gap-1.5 bg-slate-50 dark:bg-slate-800 px-2.5 py-1 rounded-lg border border-slate-200 dark:border-slate-700">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Start Row:</span>
            <input
              type="number"
              min={1}
              value={layout.dataStartRow}
              onChange={(e) => onChange({ ...layout, dataStartRow: Math.max(1, Number(e.target.value) || 1) })}
              className="w-14 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded px-1.5 py-0.5 text-xs font-mono font-bold text-slate-900 dark:text-slate-100 outline-none text-center"
            />
          </div>
          <ArrowRight className="w-3.5 h-3.5 text-slate-400" />
          <div className="flex items-center gap-1.5 bg-slate-50 dark:bg-slate-800 px-2.5 py-1 rounded-lg border border-slate-200 dark:border-slate-700">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">End Row:</span>
            <input
              type="number"
              min={layout.dataStartRow}
              value={layout.dataEndRow}
              onChange={(e) => onChange({ ...layout, dataEndRow: Math.max(layout.dataStartRow, Number(e.target.value) || layout.dataStartRow) })}
              className="w-14 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded px-1.5 py-0.5 text-xs font-mono font-bold text-slate-900 dark:text-slate-100 outline-none text-center"
            />
          </div>
        </div>
      </div>

      {/* ── 3. Visual Interactive Column Mapping Cards Table ────────────────── */}
      <div className="border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden shadow-2xs">
        <div className="overflow-auto max-h-[440px]">
          <table className="w-full text-xs text-left">
            <thead className="bg-slate-50 dark:bg-slate-900/90 text-slate-500 dark:text-slate-400 uppercase tracking-wide sticky top-0 z-10 border-b border-slate-200 dark:border-slate-800 text-[10px] font-black">
              <tr>
                <th className="px-3.5 py-2.5 w-16">Col</th>
                <th className="px-3.5 py-2.5 w-[220px]">Excel Header</th>
                <th className="px-3.5 py-2.5 w-[160px]">Sample Value</th>
                <th className="px-3.5 py-2.5">Mapped MERCON Field</th>
                <th className="px-3.5 py-2.5 text-right w-28">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800 bg-white dark:bg-slate-950">
              {sheet.columns.map((col) => {
                const mapping = layout.columns.find((c) => c.colIndex === col.colIndex);
                const source = mapping?.source ?? (col.suggestedField ? { kind: 'field' as const, key: col.suggestedField } : { kind: 'blank' as const });
                const selectValue =
                  source.kind === 'field' ? `field:${source.key}` : source.kind === 'const' ? 'const' : source.kind === 'formula' ? 'formula' : 'blank';
                const isMapped = source.kind === 'field';
                const isFormula = source.kind === 'formula';
                const isConst = source.kind === 'const';

                return (
                  <tr
                    key={col.colIndex}
                    className={cn(
                      "hover:bg-slate-50/70 dark:hover:bg-slate-900/40 transition-colors",
                      !isMapped && !isFormula && !isConst && "bg-amber-50/20 dark:bg-amber-950/10"
                    )}
                  >
                    {/* Excel Column Badge */}
                    <td className="px-3.5 py-2.5 font-mono">
                      <span className="px-2 py-0.5 rounded-md bg-emerald-100 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300 font-extrabold text-[11px] border border-emerald-200 dark:border-emerald-900">
                        {colLetter(col.colIndex)}
                      </span>
                    </td>

                    {/* Template Header Title */}
                    <td className="px-3.5 py-2.5 font-bold text-slate-900 dark:text-slate-100 max-w-[220px] truncate" title={col.headerText}>
                      {col.headerText || <span className="text-slate-400 italic">Header {colLetter(col.colIndex)}</span>}
                    </td>

                    {/* Sample Value */}
                    <td className="px-3.5 py-2.5 text-slate-500 dark:text-slate-400 font-mono text-[11px] max-w-[160px] truncate" title={col.sampleValue || undefined}>
                      {col.sampleValue ? (
                        <span className="bg-slate-100 dark:bg-slate-800 px-1.5 py-0.5 rounded text-slate-700 dark:text-slate-300">
                          {col.sampleValue}
                        </span>
                      ) : (
                        <span className="text-slate-300 dark:text-slate-600">—</span>
                      )}
                    </td>

                    {/* Mapped Destination Combobox Selector */}
                    <td className="px-3.5 py-2.5">
                      <div className="flex items-center gap-2">
                        <div className="flex-1 max-w-[340px]">
                          <Combobox
                            options={MAPPING_OPTIONS}
                            value={selectValue}
                            onChange={(val) => {
                              if (val === 'blank') updateColumn(col.colIndex, { kind: 'blank' });
                              else if (val === 'formula') updateColumn(col.colIndex, { kind: 'formula' });
                              else if (val === 'const') updateColumn(col.colIndex, { kind: 'const', value: '' });
                              else updateColumn(col.colIndex, { kind: 'field', key: val.replace('field:', '') as any });
                            }}
                            placeholder="Select MERCON Field..."
                            searchPlaceholder="Search field (e.g. Rate, Driver, Plate)..."
                            triggerClassName={cn(
                              "w-full h-8 text-xs font-semibold rounded-lg transition-all",
                              isMapped
                                ? "bg-emerald-50/50 dark:bg-emerald-950/30 border-emerald-300 dark:border-emerald-800 text-emerald-900 dark:text-emerald-200"
                                : "bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-700"
                            )}
                          />
                        </div>

                        {isConst && (
                          <input
                            type="text"
                            value={source.value}
                            onChange={(e) => updateColumn(col.colIndex, { kind: 'const', value: e.target.value })}
                            placeholder="Type value..."
                            className="w-32 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg px-2.5 py-1 text-xs font-semibold outline-none focus:border-[#FA634E]"
                          />
                        )}
                      </div>
                    </td>

                    {/* Status Badge */}
                    <td className="px-3.5 py-2.5 text-right font-mono">
                      {isMapped ? (
                        <Badge className="bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800 font-bold text-[10px] shadow-none gap-1">
                          <CheckCircle2 className="w-3 h-3 text-emerald-500" /> Mapped
                        </Badge>
                      ) : isFormula ? (
                        <Badge className="bg-blue-50 dark:bg-blue-950/40 text-blue-700 dark:text-blue-400 border border-blue-200 dark:border-blue-800 font-bold text-[10px] shadow-none gap-1">
                          <Calculator className="w-3 h-3 text-blue-500" /> Formula
                        </Badge>
                      ) : isConst ? (
                        <Badge className="bg-purple-50 dark:bg-purple-950/40 text-purple-700 dark:text-purple-400 border border-purple-200 dark:border-purple-800 font-bold text-[10px] shadow-none gap-1">
                          <Tag className="w-3 h-3 text-purple-500" /> Fixed
                        </Badge>
                      ) : (
                        <Badge variant="outline" className="text-slate-400 border-slate-200 dark:border-slate-800 font-semibold text-[10px] shadow-none">
                          Unmapped
                        </Badge>
                      )}
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
