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
  let maxHits = 0;

  for (const worksheet of workbook.worksheets) {
    const maxScanRow = Math.min(worksheet.rowCount, 25);
    for (let r = 1; r <= maxScanRow; r++) {
      const row = worksheet.getRow(r);
      const headers: { colIndex: number; text: string }[] = [];
      row.eachCell({ includeEmpty: false }, (cell, colNumber) => {
        const text = String(cell.value?.toString() ?? '').trim();
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
          sampleValue: String(sampleCell.value?.toString() ?? ''),
          suggestedField,
        };
      });

      if (hits >= 2 && hits > maxHits) {
        maxHits = hits;
        const dataStartRow = r + 1;
        const bandSize = detectBandSize(worksheet, dataStartRow);
        bestSheet = {
          sheetName: worksheet.name,
          headerRowIdx: r,
          dataStartRow,
          bandSize,
          columns,
        };
      }
    }
  }

  return { allSheets, bestSheet };
}

/**
 * How many rows a striped/banded template repeats its style over, found by
 * comparing each row's per-cell style-id signature against the first data
 * row. Uninspected beyond 8 rows — real templates band at 1 or 2, rarely more.
 */
function detectBandSize(worksheet: ExcelJS.Worksheet, dataStartRow: number): number {
  const signature = (rowIdx: number): string => {
    const row = worksheet.getRow(rowIdx);
    const parts: string[] = [];
    row.eachCell({ includeEmpty: true }, (cell) => {
      parts.push(String((cell as any).style?.id ?? cell.numFmt ?? ''));
    });
    return parts.join('|');
  };

  const firstSig = signature(dataStartRow);
  const maxBand = 8;
  for (let band = 2; band <= maxBand; band++) {
    if (signature(dataStartRow + band) === firstSig) return band;
  }
  return 1;
}
