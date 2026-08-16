import { test } from 'node:test';
import assert from 'node:assert/strict';
import ExcelJS from 'exceljs';
import { inspectTemplate } from './inspect';

const BLUE = { type: 'pattern' as const, pattern: 'solid' as const, fgColor: { argb: 'FF00B0F0' } };

/**
 * Builds a workbook matching the real bug's exact shape: a header whose
 * label is vertically merged across two rows (e.g. "DATE" spanning rows
 * 2-3, common when a template's header has a decorative border/shadow
 * split across two XML rows), filled blue, followed by real data with no
 * fill — same structure as the customer file that exposed this bug.
 */
async function buildMergedHeaderWorkbook(): Promise<Buffer> {
  const workbook = new ExcelJS.Workbook();
  const ws = workbook.addWorksheet('Sheet1');

  ws.getCell('B2').value = 'DATE';
  ws.getCell('C2').value = 'FROM';
  ws.getCell('D2').value = 'DESTINATION';
  ws.mergeCells('B2:B3');
  ws.mergeCells('C2:C3');
  ws.mergeCells('D2:D3');
  for (const ref of ['B2', 'C2', 'D2']) ws.getCell(ref).fill = BLUE;

  ws.getCell('B4').value = new Date('2026-01-01T00:00:00.000Z');
  ws.getCell('C4').value = 'Riyadh';
  ws.getCell('D4').value = 'Jeddah';

  ws.getCell('B5').value = new Date('2026-01-02T00:00:00.000Z');
  ws.getCell('C5').value = 'Dammam';
  ws.getCell('D5').value = 'Mecca';

  return workbook.xlsx.writeBuffer() as unknown as Promise<Buffer>;
}

test('a header vertically merged across two rows does not get treated as the data band', async () => {
  const buf = await buildMergedHeaderWorkbook();
  const insp = await inspectTemplate(buf);

  assert.ok(insp.bestSheet, 'should detect a header row');
  assert.equal(insp.bestSheet!.headerRowIdx, 2);
  // The merge bottoms out at row 3 — data must start at row 4, not row 3
  // (headerRowIdx + 1), which would still be inside the merged, blue header.
  assert.equal(insp.bestSheet!.dataStartRow, 4);
});

test('sample values are read from the corrected data row, not the tail of the merged header', async () => {
  const buf = await buildMergedHeaderWorkbook();
  const insp = await inspectTemplate(buf);

  const dateCol = insp.bestSheet!.columns.find((c) => c.headerText === 'DATE')!;
  // Before the fix this would read row 3 (still merged with row 2), whose
  // cell reports the same "DATE" text as the header itself.
  assert.notEqual(dateCol.sampleValue, 'DATE');
  assert.ok(dateCol.sampleValue.length > 0);
});

test('a plain single-row header (no merge) is unaffected', async () => {
  const workbook = new ExcelJS.Workbook();
  const ws = workbook.addWorksheet('Sheet1');
  ws.getCell('A1').value = 'DATE';
  ws.getCell('B1').value = 'FROM';
  ws.getCell('C1').value = 'DESTINATION';
  ws.getCell('A2').value = new Date('2026-01-01T00:00:00.000Z');
  ws.getCell('B2').value = 'Riyadh';
  ws.getCell('C2').value = 'Jeddah';
  const buf = (await workbook.xlsx.writeBuffer()) as unknown as Buffer;

  const insp = await inspectTemplate(buf);
  assert.equal(insp.bestSheet!.headerRowIdx, 1);
  assert.equal(insp.bestSheet!.dataStartRow, 2);
});
