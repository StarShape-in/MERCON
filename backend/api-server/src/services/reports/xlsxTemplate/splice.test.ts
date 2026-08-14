import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'fs';
import path from 'path';
import { unzipSync } from 'fflate';
import ExcelJS from 'exceljs';
import type { TemplateLayout } from '@mercon/shared-types';
import { generateFromTemplate } from './splice';
import { shiftRowRefs } from './xmlRowSplice';

// Real customer-supplied workbook (JDL / IMILE / SHIPA / ARKAN / AKS sheets),
// used as-is rather than a synthetic fixture so the fidelity claim is tested
// against an actual branded file, not something built to be easy to pass.
const FIXTURE_PATH = path.resolve(__dirname, '../../../../../../docs/templates/COMPANY QUOTATION (1).xlsx');

function loadFixture(): Buffer {
  return fs.readFileSync(FIXTURE_PATH);
}

const layout: TemplateLayout = {
  sheetName: 'JDL ',
  headerRowIdx: 2,
  dataStartRow: 4,
  bandSize: 1,
  columns: [
    { colIndex: 1, headerText: 'NO.', source: { kind: 'field', key: 'serial' } },
    { colIndex: 2, headerText: 'ORIGIN', source: { kind: 'field', key: 'customer_name' } },
  ],
};

const records = [
  { serial: 1, customer_name: 'Test A' },
  { serial: 2, customer_name: 'Test B' },
  { serial: 3, customer_name: 'Test C' },
] as any;

test('generateFromTemplate leaves every ZIP part untouched except the target sheet and workbook.xml', () => {
  const original = loadFixture();
  const generated = generateFromTemplate(original, layout, records);

  const origFiles = unzipSync(new Uint8Array(original));
  const genFiles = unzipSync(new Uint8Array(generated));

  assert.deepEqual(Object.keys(origFiles).sort(), Object.keys(genFiles).sort());

  const allowedToChange = new Set(['xl/worksheets/sheet1.xml', 'xl/workbook.xml']);
  for (const key of Object.keys(origFiles)) {
    const same = Buffer.compare(Buffer.from(origFiles[key]), Buffer.from(genFiles[key])) === 0;
    if (!allowedToChange.has(key)) {
      assert.ok(same, `expected ${key} to be byte-identical to the source file, but it changed`);
    }
  }
  // Sanity: the target sheet must actually have changed (otherwise this
  // assertion set would trivially pass for a no-op implementation).
  assert.notEqual(
    Buffer.compare(Buffer.from(origFiles['xl/worksheets/sheet1.xml']), Buffer.from(genFiles['xl/worksheets/sheet1.xml'])),
    0
  );
});

test('generated rows land at dataStartRow with the band row\'s style ids preserved', () => {
  const original = loadFixture();
  const generated = generateFromTemplate(original, layout, records);
  const files = unzipSync(new Uint8Array(generated));
  const decoder = new TextDecoder();
  const sheetXml = decoder.decode(files['xl/worksheets/sheet1.xml']);

  // Band row (row 4) style ids: A=26, B=27.
  for (const [rowNum, expectedSerial, expectedName] of [
    [4, 1, 'Test A'],
    [5, 2, 'Test B'],
    [6, 3, 'Test C'],
  ] as const) {
    const rowMatch = new RegExp(`<row r="${rowNum}"[^>]*>([\\s\\S]*?)</row>`).exec(sheetXml);
    assert.ok(rowMatch, `row ${rowNum} should exist`);
    const rowInner = rowMatch![1];

    const aCell = new RegExp(`<c r="A${rowNum}" s="([^"]+)"><v>${expectedSerial}</v></c>`).exec(rowInner);
    assert.ok(aCell, `A${rowNum} should carry the band row's style id and the generated serial value`);
    assert.equal(aCell![1], '26');

    const bCell = new RegExp(`<c r="B${rowNum}" s="([^"]+)" t="inlineStr"><is><t[^>]*>${expectedName}</t></is></c>`).exec(
      rowInner
    );
    assert.ok(bCell, `B${rowNum} should carry the band row's style id and the generated name value`);
    assert.equal(bCell![1], '27');
  }
});

test('trailing content after the band is preserved and shifted by the row-count delta', () => {
  const original = loadFixture();
  const generated = generateFromTemplate(original, layout, records);

  const origFiles = unzipSync(new Uint8Array(original));
  const genFiles = unzipSync(new Uint8Array(generated));
  const decoder = new TextDecoder();
  const origSheet = decoder.decode(origFiles['xl/worksheets/sheet1.xml']);
  const genSheet = decoder.decode(genFiles['xl/worksheets/sheet1.xml']);

  // Original row 5 (r="5") is not part of the 1-row band (its border style
  // differs from row 4's), so it becomes "after" content and must reappear
  // shifted by the same delta as every other trailing row: 3 generated rows
  // replaced exactly 1 original band row, so delta = +2.
  const origRow5 = /<row r="5"[^>]*>([\s\S]*?)<\/row>/.exec(origSheet)![1];
  const shiftedRow7 = /<row r="7"[^>]*>([\s\S]*?)<\/row>/.exec(genSheet)![1];

  // Cell refs and the row's own `r` are rewritten; everything else (styles,
  // shared-string indices, values) must match verbatim.
  const stripRefs = (inner: string) => inner.replace(/ r="[A-Z]+\d+"/g, '');
  assert.equal(stripRefs(shiftedRow7), stripRefs(origRow5));
});

test('output re-parses cleanly with ExcelJS', async () => {
  const original = loadFixture();
  const generated = generateFromTemplate(original, layout, records);

  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.load(generated as any);
  const sheet = workbook.getWorksheet('JDL ');
  assert.ok(sheet);
  assert.equal(sheet!.getCell('A4').value, 1);
  assert.equal(sheet!.getCell('B4').value, 'Test A');
});

test('shiftRowRefs shifts relative row references but leaves $-anchored rows alone', () => {
  assert.equal(shiftRowRefs('SUM(A2:A10)', 3), 'SUM(A5:A13)');
  assert.equal(shiftRowRefs('A$1+B2', 5), 'A$1+B7');
  assert.equal(shiftRowRefs('$A$1', 5), '$A$1');
  assert.equal(shiftRowRefs('A1', 0), 'A1');
});
