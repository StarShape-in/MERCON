import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'fs';
import path from 'path';
import { unzipSync, zipSync, strToU8 } from 'fflate';
import ExcelJS from 'exceljs';
import type { TemplateLayout } from '@mercon/shared-types';
import { generateFromTemplate } from './splice';
import { effectiveFormula, parseSharedFormulas, shiftRowRefs, shiftRowRefsAtOrAfter } from './xmlRowSplice';

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
  dataEndRow: 53,
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

  assert.deepEqual(
    Object.keys(origFiles).filter((k) => k !== 'xl/calcChain.xml').sort(),
    Object.keys(genFiles).sort()
  );

  // calcChain.xml is a formula-order cache that goes stale once rows move, so
  // it is deliberately dropped (along with its content-type override and
  // relationship) rather than shipped pointing at cells that moved.
  const allowedToChange = new Set([
    'xl/worksheets/sheet1.xml',
    'xl/workbook.xml',
    'xl/calcChain.xml',
    '[Content_Types].xml',
    'xl/_rels/workbook.xml.rels',
  ]);
  for (const key of Object.keys(origFiles)) {
    if (allowedToChange.has(key)) continue;
    const same = Buffer.compare(Buffer.from(origFiles[key]), Buffer.from(genFiles[key])) === 0;
    assert.ok(same, `expected ${key} to be byte-identical to the source file, but it changed`);
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

test('the whole sample block is replaced, and content below it is kept and shifted', () => {
  const original = loadFixture();
  const generated = generateFromTemplate(original, layout, records);

  const origFiles = unzipSync(new Uint8Array(original));
  const genFiles = unzipSync(new Uint8Array(generated));
  const decoder = new TextDecoder();
  const origSheet = decoder.decode(origFiles['xl/worksheets/sheet1.xml']);
  const genSheet = decoder.decode(genFiles['xl/worksheets/sheet1.xml']);

  // 3 records replace rows 4..53 (50 rows), so everything below shifts up by 47.
  const delta = records.length - (layout.dataEndRow - layout.dataStartRow + 1);
  assert.equal(delta, -47);

  // No leftover sample rows: the generated data occupies exactly rows 4..6,
  // and row 7 must already be the post-block content, not row 7 of the sample.
  const origRow54 = /<row r="54"[^>]*>([\s\S]*?)<\/row>/.exec(origSheet)![1];
  const shiftedRow = new RegExp(`<row r="${54 + delta}"[^>]*>([\\s\\S]*?)</row>`).exec(genSheet)![1];
  const stripRefs = (inner: string) => inner.replace(/ r="[A-Z]+\d+"/g, '');
  assert.equal(stripRefs(shiftedRow), stripRefs(origRow54));

  // And the sample block's distinctive values must be gone entirely.
  const generatedRowCount = (genSheet.match(/<row /g) ?? []).length;
  const originalRowCount = (origSheet.match(/<row /g) ?? []).length;
  assert.equal(generatedRowCount, originalRowCount + delta);
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

test('tokens are substituted in shared strings, not just inline sheet text', () => {
  // Excel stores ordinary text cells as shared strings, so a banner token the
  // customer typed into their template lives in sharedStrings.xml. Searching
  // only the worksheet XML silently leaves "{{period}}" in the delivered file.
  const original = loadFixture();
  const files = unzipSync(new Uint8Array(original));
  const decoder = new TextDecoder();
  const patched = decoder.decode(files['xl/sharedStrings.xml']).replace('<si><t>NO.</t></si>', '<si><t>{{period}}</t></si>');
  files['xl/sharedStrings.xml'] = strToU8(patched);

  const generated = generateFromTemplate(Buffer.from(zipSync(files)), layout, records, {
    tokens: { period: 'JUNE 2026' },
  });

  const sharedStrings = decoder.decode(unzipSync(new Uint8Array(generated))['xl/sharedStrings.xml']);
  assert.ok(!sharedStrings.includes('{{period}}'), 'token placeholder should not survive into the output');
  assert.ok(sharedStrings.includes('JUNE 2026'), 'token value should be present in the output');
});

test('the stale calcChain cache is dropped, along with its content-type and relationship', () => {
  const original = loadFixture();
  const generated = generateFromTemplate(original, layout, records);
  const decoder = new TextDecoder();

  assert.ok(unzipSync(new Uint8Array(original))['xl/calcChain.xml'], 'fixture should have a calcChain to begin with');

  const genFiles = unzipSync(new Uint8Array(generated));
  assert.equal(genFiles['xl/calcChain.xml'], undefined, 'calcChain part should be removed');
  assert.ok(
    !decoder.decode(genFiles['[Content_Types].xml']).includes('calcChain'),
    'the calcChain content-type override should be removed'
  );
  assert.ok(
    !decoder.decode(genFiles['xl/_rels/workbook.xml.rels']).includes('calcChain'),
    'the calcChain relationship should be removed'
  );
});

test('shared-formula followers resolve to standalone formulas', () => {
  // Real customer templates (an IMILE monthly invoice, for one) compress a
  // column of formulas into one master carrying the text plus followers that
  // carry only `<f t="shared" si="N"/>`. Cloning a follower verbatim yields a
  // cell with no formula at all — silently blank VAT/Total columns.
  const shared = parseSharedFormulas(
    '<c r="M2" s="8"><f t="shared" ref="M2:M13" si="0">+L2*15/100</f><v>713.25</v></c>' +
      '<c r="M3" s="8"><f t="shared" si="0"/><v>2610</v></c>'
  );
  assert.equal(shared.get('0')?.row, 2);
  assert.equal(shared.get('0')?.text, '+L2*15/100');

  // The master itself.
  assert.equal(effectiveFormula('<c r="M2"><f t="shared" ref="M2:M13" si="0">+L2*15/100</f></c>', 2, shared), '+L2*15/100');
  // A follower four rows down resolves to the same formula, translated.
  assert.equal(effectiveFormula('<c r="M6"><f t="shared" si="0"/></c>', 6, shared), '+L6*15/100');
  // A cell with no formula stays null rather than inventing one.
  assert.equal(effectiveFormula('<c r="M6"><v>12</v></c>', 6, shared), null);
});

test('shiftRowRefs shifts relative row references but leaves $-anchored rows alone', () => {
  assert.equal(shiftRowRefs('SUM(A2:A10)', 3), 'SUM(A5:A13)');
  assert.equal(shiftRowRefs('A$1+B2', 5), 'A$1+B7');
  assert.equal(shiftRowRefs('$A$1', 5), '$A$1');
  assert.equal(shiftRowRefs('A1', 0), 'A1');
});

test('shiftRowRefsAtOrAfter keeps a totals range anchored above the data block', () => {
  // A totals row reading SUM(M1:M37), where M1 is the header above the data
  // block and M37 is the last data row. Growing the block from 12 rows to 25
  // must move only the end of the range; shifting both would drop the first
  // rows out of a customer's invoice total.
  assert.equal(shiftRowRefsAtOrAfter('SUM(M1:M37)', 2, 13), 'SUM(M1:M50)');
  // Unlike copy semantics, an absolute row inside the block still tracks it,
  // because Excel re-points absolute refs when rows are inserted.
  assert.equal(shiftRowRefsAtOrAfter('$M$37', 2, 13), '$M$50');
  assert.equal(shiftRowRefsAtOrAfter('M1', 2, 13), 'M1');
  assert.equal(shiftRowRefsAtOrAfter('SUM(M1:M37)', 2, 0), 'SUM(M1:M37)');
});
