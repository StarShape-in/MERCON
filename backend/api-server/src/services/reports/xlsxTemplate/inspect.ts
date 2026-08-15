import ExcelJS from 'exceljs';
import type { TripReportFieldKey } from '@mercon/shared-types';
import { suggestField } from './aliases';

export interface InspectedColumn {
  colIndex: number;
  headerText: string;
  sampleValue: string;
  suggestedField: TripReportFieldKey | null;
}

export interface InspectedSheet {
  sheetName: string;
  headerRowIdx: number;
  dataStartRow: number;
  dataEndRow: number;
  bandSize: number;
  columns: InspectedColumn[];
}

export interface TemplateInspection {
  allSheets: string[];
  bestSheet: InspectedSheet | null;
}

/**
 * Reads an uploaded .xlsx purely for analysis — this ExcelJS workbook object
 * is discarded afterwards, never re-serialized. Generation is handled
 * entirely by splice.ts's byte-preserving ZIP engine, so nothing lossy about
 * ExcelJS's writer ever runs against a customer's template.
 */
export async function inspectTemplate(buf: Buffer): Promise<TemplateInspection> {
  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.load(buf as any);

  const allSheets = workbook.worksheets.map((ws) => ws.name);
  let bestSheet: InspectedSheet | null = null;
  // Diversity-aware, not just raw hit count: a row where every cell
  // happens to match the same field (e.g. a merged banner title read as
  // N duplicate "headers") must never outrank a real header row with
  // fewer but more varied matches — see the merge-cell skip below for why
  // that duplication can occur in the first place.
  let bestScore: { uniqueFields: number; hits: number } | null = null;

  for (const worksheet of workbook.worksheets) {
    const maxScanRow = Math.min(worksheet.rowCount, 25);
    for (let r = 1; r <= maxScanRow; r++) {
      const row = worksheet.getRow(r);
      const headers: { colIndex: number; text: string }[] = [];
      row.eachCell({ includeEmpty: false }, (cell, colNumber) => {
        // Follower cell of a merged range (e.g. a banner title merged
        // across many columns) — only the anchor cell carries real
        // content. ExcelJS's MergeValue makes every follower report the
        // anchor's value, and `includeEmpty:false` alone doesn't filter
        // these out since their type is Merge, not Null.
        if (cell.type === ExcelJS.ValueType.Merge) return;
        const text = cellDisplayText(cell);
        if (text) headers.push({ colIndex: colNumber, text });
      });
      if (headers.length < 2) continue;

      let hits = 0;
      const columns: InspectedColumn[] = headers.map((h) => {
        const suggestedField = suggestField(h.text);
        if (suggestedField) hits++;
        const sampleCell = worksheet.getRow(r + 1).getCell(h.colIndex);
        return {
          colIndex: h.colIndex,
          headerText: h.text,
          sampleValue: cellDisplayText(sampleCell),
          suggestedField,
        };
      });
      if (hits < 2) continue;

      const uniqueFields = new Set(
        columns.map((c) => c.suggestedField).filter((f): f is TripReportFieldKey => f !== null)
      ).size;
      const better =
        !bestScore ||
        uniqueFields > bestScore.uniqueFields ||
        (uniqueFields === bestScore.uniqueFields && hits > bestScore.hits);

      if (better) {
        bestScore = { uniqueFields, hits };
        const dataStartRow = r + 1;
        bestSheet = {
          sheetName: worksheet.name,
          headerRowIdx: r,
          dataStartRow,
          dataEndRow: detectDataEndRow(worksheet, dataStartRow),
          bandSize: detectBandSize(worksheet, dataStartRow),
          columns,
        };
      }
    }
  }

  return { allSheets, bestSheet };
}

/**
 * ExcelJS represents a formula cell's `.value` as `{formula, result}`, not a
 * primitive — `.toString()` on that object yields the literal string
 * "[object Object]". Read `.result` instead so formula columns (e.g. a VAT
 * column computed as `=K4*15/100`) show their computed value.
 */
function cellDisplayText(cell: ExcelJS.Cell): string {
  const v = cell.value as any;
  if (v && typeof v === 'object' && !(v instanceof Date) && 'result' in v) {
    return String(v.result ?? '').trim();
  }
  return String(v?.toString() ?? '').trim();
}

function rowHasAnyValue(worksheet: ExcelJS.Worksheet, rowIdx: number): boolean {
  let found = false;
  worksheet.getRow(rowIdx).eachCell({ includeEmpty: false }, (cell) => {
    if (cell.type === ExcelJS.ValueType.Merge) return; // same merge-follower issue as the header scanner above
    if (cellDisplayText(cell) !== '') found = true;
  });
  return found;
}

/**
 * The last row of the template's sample data block: scan down from the first
 * data row and stop at the first row with no values at all. Everything in
 * [dataStartRow, dataEndRow] gets replaced at generation time, so getting this
 * right is what stops the customer's own sample rows from surviving
 * underneath the real data. The operator can correct it in the mapping editor.
 */
function detectDataEndRow(worksheet: ExcelJS.Worksheet, dataStartRow: number): number {
  let last = dataStartRow;
  const limit = Math.max(worksheet.rowCount, dataStartRow);
  for (let r = dataStartRow; r <= limit; r++) {
    if (rowHasAnyValue(worksheet, r)) last = r;
    else if (r > dataStartRow) break;
  }
  return last;
}

/**
 * How many rows a striped/banded template repeats its style over, found by
 * comparing each row's per-cell style signature against the first data row.
 * Not scanned beyond 8 rows — real templates band at 1 or 2, rarely more.
 */
function detectBandSize(worksheet: ExcelJS.Worksheet, dataStartRow: number): number {
  const signature = (rowIdx: number): string => {
    const row = worksheet.getRow(rowIdx);
    const parts: string[] = [];
    row.eachCell({ includeEmpty: true }, (cell) => {
      // cell.style is the resolved style object; there is no `.id` on it, so
      // stringifying the object is what actually distinguishes banded rows.
      parts.push(JSON.stringify(cell.style ?? {}));
    });
    return parts.join('|');
  };

  const firstSig = signature(dataStartRow);
  if (!firstSig) return 1;
  for (let band = 2; band <= 8; band++) {
    if (signature(dataStartRow + band) === firstSig && signature(dataStartRow + 1) !== firstSig) {
      return band;
    }
  }
  return 1;
}
