import { unzipSync, zipSync } from 'fflate';
import type { TemplateLayout, TripReportFieldKey } from '@mercon/shared-types';
import { TRIP_REPORT_FIELDS } from '@mercon/shared-types';
import {
  ParsedCell,
  ParsedRow,
  colNumberToLetter,
  parseSheetDataRows,
  rewriteRowNumber,
  shiftRowRefs,
  xmlEscapeText,
} from './xmlRowSplice';

const FIELD_TYPE: Record<TripReportFieldKey, string> = Object.fromEntries(
  TRIP_REPORT_FIELDS.map((f) => [f.key, f.type])
) as Record<TripReportFieldKey, string>;

const EXCEL_EPOCH_MS = Date.UTC(1899, 11, 30);

function toExcelSerial(value: unknown): number {
  const d = value instanceof Date ? value : new Date(String(value));
  return (d.getTime() - EXCEL_EPOCH_MS) / 86400000;
}

function cellStyleAttr(s: string | null): string {
  return s !== null ? ` s="${s}"` : '';
}

/**
 * Builds one `<c>` element for a generated data row, reusing the source band
 * cell's style index and column reference so fonts/fills/borders/number
 * formats carry over exactly — we never touch `styles.xml`, only pick which
 * `s="…"` index an existing style-defining cell already has.
 */
function buildCell(
  ref: string,
  sourceCell: ParsedCell,
  column: TemplateLayout['columns'][number] | undefined,
  record: Record<TripReportFieldKey, unknown> | null,
  rowDelta: number
): string {
  const s = cellStyleAttr(sourceCell.s);
  const source = column?.source ?? { kind: 'blank' as const };

  if (source.kind === 'blank' || !record) {
    return `<c r="${ref}"${s}/>`;
  }

  if (source.kind === 'const') {
    return `<c r="${ref}"${s} t="inlineStr"><is><t xml:space="preserve">${xmlEscapeText(source.value)}</t></is></c>`;
  }

  if (source.kind === 'formula') {
    const fMatch = /<f[^>]*>([\s\S]*?)<\/f>/.exec(sourceCell.xml);
    if (!fMatch) return `<c r="${ref}"${s}/>`;
    const shiftedFormula = shiftRowRefs(fMatch[1], rowDelta);
    return `<c r="${ref}"${s}><f>${shiftedFormula}</f></c>`;
  }

  // source.kind === 'field'
  const fieldKey = source.key;
  const value = record[fieldKey];
  if (value === null || value === undefined || value === '') {
    return `<c r="${ref}"${s}/>`;
  }

  const fieldType = FIELD_TYPE[fieldKey];
  if (fieldType === 'number' || fieldType === 'money') {
    const num = Number(value);
    if (Number.isNaN(num)) return `<c r="${ref}"${s}/>`;
    return `<c r="${ref}"${s}><v>${num}</v></c>`;
  }
  if (fieldType === 'date') {
    const serial = toExcelSerial(value);
    if (Number.isNaN(serial)) return `<c r="${ref}"${s}/>`;
    return `<c r="${ref}"${s}><v>${serial}</v></c>`;
  }
  // string
  return `<c r="${ref}"${s} t="inlineStr"><is><t xml:space="preserve">${xmlEscapeText(String(value))}</t></is></c>`;
}

function buildDataRow(
  rowNum: number,
  bandRow: ParsedRow,
  layout: TemplateLayout,
  record: Record<TripReportFieldKey, unknown>,
  bandRowNum: number
): string {
  const columnsByIndex = new Map(layout.columns.map((c) => [c.colIndex, c]));
  const rowDelta = rowNum - bandRowNum;
  const cellsXml = bandRow.cells
    .map((cell) => {
      const ref = `${colNumberToLetter(cell.col)}${rowNum}`;
      return buildCell(ref, cell, columnsByIndex.get(cell.col), record, rowDelta);
    })
    .join('');
  return `<row r="${rowNum}" spans="${bandRow.cells[0]?.col ?? 1}:${bandRow.cells[bandRow.cells.length - 1]?.col ?? 1}">${cellsXml}</row>`;
}

/** Style signature used only to find where the sample band ends in the uploaded file. */
function rowStyleSignature(row: ParsedRow | undefined): string {
  if (!row) return '';
  return row.cells.map((c) => `${c.col}:${c.s ?? ''}`).join('|');
}

function resolveSheetPath(files: Record<string, Uint8Array>, sheetName: string): string {
  const decoder = new TextDecoder();
  const workbookXml = decoder.decode(files['xl/workbook.xml']);
  const sheetTagMatch = new RegExp(`<sheet\\b[^>]*name="${escapeRegExp(sheetName)}"[^>]*/>`).exec(workbookXml);
  if (!sheetTagMatch) throw new Error(`Sheet "${sheetName}" not found in workbook.xml`);
  const ridMatch = /r:id="([^"]+)"/.exec(sheetTagMatch[0]);
  if (!ridMatch) throw new Error(`Sheet "${sheetName}" has no relationship id`);

  const relsXml = decoder.decode(files['xl/_rels/workbook.xml.rels']);
  const relTagMatch = new RegExp(`<Relationship\\b[^>]*Id="${ridMatch[1]}"[^>]*/>`).exec(relsXml);
  if (!relTagMatch) throw new Error(`Relationship "${ridMatch[1]}" not found`);
  const targetMatch = /Target="([^"]+)"/.exec(relTagMatch[0]);
  if (!targetMatch) throw new Error('Relationship has no Target');

  const target = targetMatch[1];
  return target.startsWith('/') ? target.slice(1) : `xl/${target}`;
}

function escapeRegExp(str: string): string {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/**
 * Shifts row numbers >= `fromRow` by `delta` inside a non-sheetData XML part
 * (dimension refs, mergeCell refs, autofilter refs, etc.), leaving refs to
 * earlier rows (headers/banners) untouched.
 */
function shiftRefsAtOrAfter(text: string, fromRow: number, delta: number): string {
  if (delta === 0) return text;
  return text.replace(/\$?[A-Z]{1,3}\$?\d+/g, (ref) => {
    const rowMatch = /\d+$/.exec(ref);
    if (!rowMatch) return ref;
    const rowNum = parseInt(rowMatch[0], 10);
    if (rowNum < fromRow) return ref;
    return shiftRowRefs(ref, delta);
  });
}

export interface GenerateOptions {
  tokens?: Record<string, string>;
}

/**
 * Regenerates the data rows of an uploaded template with real records while
 * leaving every other byte of the workbook untouched. Never round-trips
 * through a spreadsheet library — the ZIP is unpacked, exactly one
 * worksheet's `<sheetData>` is rewritten, and everything else (styles,
 * theme, drawings, charts, media) is re-zipped verbatim.
 */
export function generateFromTemplate(
  fileBuf: Buffer,
  layout: TemplateLayout,
  rows: Record<TripReportFieldKey, unknown>[],
  options: GenerateOptions = {}
): Buffer {
  const files = unzipSync(new Uint8Array(fileBuf));
  const sheetPath = resolveSheetPath(files, layout.sheetName);
  const decoder = new TextDecoder();
  const encoder = new TextEncoder();
  let sheetXml = decoder.decode(files[sheetPath]);

  const sheetDataMatch = /<sheetData\b[^>]*>([\s\S]*?)<\/sheetData>|<sheetData\b[^>]*\/>/.exec(sheetXml);
  if (!sheetDataMatch) throw new Error(`Sheet "${layout.sheetName}" has no <sheetData>`);

  const allRows = parseSheetDataRows(sheetDataMatch[1] ?? '');
  const beforeRows = allRows.filter((r) => r.r < layout.dataStartRow);
  const bandRows: ParsedRow[] = [];
  for (let i = 0; i < layout.bandSize; i++) {
    const found = allRows.find((r) => r.r === layout.dataStartRow + i);
    if (found) bandRows.push(found);
  }
  if (bandRows.length === 0) {
    throw new Error(`No band rows found at row ${layout.dataStartRow} in sheet "${layout.sheetName}"`);
  }

  // Consume any further existing rows that still match the band's style
  // pattern (redundant sample rows) — they're discarded and replaced by
  // freshly generated rows. The first row that breaks the pattern starts
  // the "after" section (e.g. a totals row) and is preserved, shifted.
  let consumedThrough = layout.dataStartRow + bandRows.length - 1;
  for (const row of allRows) {
    if (row.r <= consumedThrough) continue;
    const expectedBandRow = bandRows[(row.r - layout.dataStartRow) % layout.bandSize];
    if (rowStyleSignature(row) === rowStyleSignature(expectedBandRow) && row.r === consumedThrough + 1) {
      consumedThrough = row.r;
    } else {
      break;
    }
  }
  const afterRows = allRows.filter((r) => r.r > consumedThrough);

  const delta = rows.length - (consumedThrough - layout.dataStartRow + 1);

  const generatedRowsXml = rows
    .map((record, i) => {
      const bandRow = bandRows[i % bandRows.length];
      const newR = layout.dataStartRow + i;
      return buildDataRow(newR, bandRow, layout, record, bandRow.r);
    })
    .join('');

  const shiftedAfterRowsXml = afterRows
    .map((row) => {
      const newR = row.r + delta;
      const shifted = rewriteRowNumber(row, newR);
      // Shift any relative formula references inside this row's own cells too.
      const cellsXml = shifted.cells
        .map((c) => c.xml.replace(/<f>([\s\S]*?)<\/f>/, (_m, f) => `<f>${shiftRowRefs(f, delta)}</f>`))
        .join('');
      return `<row r="${newR}" spans="${shifted.cells[0]?.col ?? 1}:${shifted.cells[shifted.cells.length - 1]?.col ?? 1}">${cellsXml}</row>`;
    })
    .join('');

  const beforeRowsXml = beforeRows.map((r) => r.xml).join('');
  const newSheetDataInner = beforeRowsXml + generatedRowsXml + shiftedAfterRowsXml;

  sheetXml = sheetXml.replace(sheetDataMatch[0], `<sheetData>${newSheetDataInner}</sheetData>`);

  // Row-position-dependent refs living outside <sheetData> in the same part.
  sheetXml = sheetXml.replace(/(<dimension\b[^>]*ref=")([^"]+)(")/, (_m, pre, ref, post) => {
    const [start, end] = ref.split(':');
    if (!end) return `${pre}${ref}${post}`;
    return `${pre}${start}:${shiftRefsAtOrAfter(end, layout.dataStartRow, delta)}${post}`;
  });
  sheetXml = sheetXml.replace(/<mergeCell\b[^>]*ref="([^"]+)"[^>]*\/>/g, (whole, ref) => {
    return whole.replace(ref, shiftRefsAtOrAfter(ref, layout.dataStartRow, delta));
  });
  sheetXml = sheetXml.replace(/(<autoFilter\b[^>]*ref=")([^"]+)(")/, (_m, pre, ref, post) => {
    return `${pre}${shiftRefsAtOrAfter(ref, layout.dataStartRow, delta)}${post}`;
  });
  sheetXml = sheetXml.replace(/(<conditionalFormatting\b[^>]*sqref=")([^"]+)(")/g, (_m, pre, ref, post) => {
    return `${pre}${shiftRefsAtOrAfter(ref, layout.dataStartRow, delta)}${post}`;
  });
  sheetXml = sheetXml.replace(/(<dataValidation\b[^>]*sqref=")([^"]+)(")/g, (_m, pre, ref, post) => {
    return `${pre}${shiftRefsAtOrAfter(ref, layout.dataStartRow, delta)}${post}`;
  });

  // Token substitution: any cell whose text is exactly "{{token}}" gets
  // replaced in place, style untouched.
  if (options.tokens) {
    for (const [token, value] of Object.entries(options.tokens)) {
      const needle = `{{${token}}}`;
      sheetXml = sheetXml.split(needle).join(xmlEscapeText(value));
    }
  }

  files[sheetPath] = encoder.encode(sheetXml);

  // Force Excel to recalculate formulas on open, since cached <v> values for
  // shifted/cloned formulas were dropped.
  if (files['xl/workbook.xml']) {
    let workbookXml = decoder.decode(files['xl/workbook.xml']);
    if (/<calcPr\b/.test(workbookXml)) {
      workbookXml = workbookXml.replace(/<calcPr\b([^>]*)\/>/, (m, attrs) => {
        return /fullCalcOnLoad=/.test(attrs)
          ? m.replace(/fullCalcOnLoad="[^"]*"/, 'fullCalcOnLoad="1"')
          : `<calcPr${attrs} fullCalcOnLoad="1"/>`;
      });
    } else {
      workbookXml = workbookXml.replace('</workbook>', '<calcPr fullCalcOnLoad="1"/></workbook>');
    }
    files['xl/workbook.xml'] = encoder.encode(workbookXml);
  }

  return Buffer.from(zipSync(files, { level: 6 }));
}
