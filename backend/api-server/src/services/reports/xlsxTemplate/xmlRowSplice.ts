/**
 * Low-level OOXML row/cell parsing shared by splice.ts. Kept separate so the
 * regex-based parsing (deliberately not a full XML parser — sheetData rows
 * never nest, so this is sufficient and much cheaper than pulling in a DOM
 * library) is easy to unit-test on its own.
 */

export interface ParsedCell {
  ref: string; // e.g. "B7"
  col: number; // 1-based column index
  s: string | null; // style index attribute, verbatim
  xml: string; // full original <c>...</c> or <c/>
}

export interface ParsedRow {
  r: number;
  xml: string; // full original <row>...</row> or <row/>
  cells: ParsedCell[];
}

const ROW_RE = /<row\b[^>]*\/>|<row\b[^>]*>[\s\S]*?<\/row>/g;
const CELL_RE = /<c\b[^>]*\/>|<c\b[^>]*>[\s\S]*?<\/c>/g;

export function colLetterToNumber(letters: string): number {
  let n = 0;
  for (const ch of letters) n = n * 26 + (ch.charCodeAt(0) - 64);
  return n;
}

export function colNumberToLetter(num: number): string {
  let n = num;
  let letters = '';
  while (n > 0) {
    const rem = (n - 1) % 26;
    letters = String.fromCharCode(65 + rem) + letters;
    n = Math.floor((n - 1) / 26);
  }
  return letters;
}

export function parseCellRef(ref: string): { col: number; row: number } {
  const m = /^([A-Z]+)(\d+)$/.exec(ref);
  if (!m) throw new Error(`Malformed cell reference: ${ref}`);
  return { col: colLetterToNumber(m[1]), row: parseInt(m[2], 10) };
}

function attr(tag: string, name: string): string | null {
  const m = new RegExp(`\\b${name}="([^"]*)"`).exec(tag);
  return m ? m[1] : null;
}

export function parseSheetDataRows(sheetDataInner: string): ParsedRow[] {
  const rows: ParsedRow[] = [];
  const matches = sheetDataInner.match(ROW_RE) ?? [];
  for (const rowXml of matches) {
    const openTagMatch = /^<row\b[^>]*?\/?>/.exec(rowXml);
    const openTag = openTagMatch ? openTagMatch[0] : rowXml;
    const rAttr = attr(openTag, 'r');
    if (!rAttr) continue; // rows without an explicit index are not addressable; skip
    const cells: ParsedCell[] = [];
    const cellMatches = rowXml.match(CELL_RE) ?? [];
    for (const cellXml of cellMatches) {
      const cellOpenMatch = /^<c\b[^>]*?\/?>/.exec(cellXml);
      const cellOpen = cellOpenMatch ? cellOpenMatch[0] : cellXml;
      const ref = attr(cellOpen, 'r');
      if (!ref) continue;
      const { col } = parseCellRef(ref);
      cells.push({ ref, col, s: attr(cellOpen, 's'), xml: cellXml });
    }
    cells.sort((a, b) => a.col - b.col);
    rows.push({ r: parseInt(rAttr, 10), xml: rowXml, cells });
  }
  return rows;
}

export function xmlEscapeText(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/\r\n/g, '\n');
}

/**
 * Row-insert semantics: shifts references that point at or below `fromRow`,
 * leaving references above it alone — and unlike a copy, `$`-anchored rows
 * move too, because Excel re-points absolute references when rows are
 * inserted or deleted.
 *
 * This is what a totals row needs. Blindly shifting every ref turns a
 * `SUM(M1:M37)` whose M1 anchor sits in the header into `SUM(M14:M50)`,
 * quietly dropping the first rows of the block from a customer's invoice
 * total.
 */
export function shiftRowRefsAtOrAfter(text: string, fromRow: number, delta: number): string {
  if (delta === 0) return text;
  return text.replace(/(\$?)([A-Z]{1,3})(\$?)(\d+)/g, (whole, colDollar, colLetters, rowDollar, rowDigits) => {
    const row = parseInt(rowDigits, 10);
    if (row < fromRow) return whole;
    return `${colDollar}${colLetters}${rowDollar}${row + delta}`;
  });
}

/**
 * Copy semantics: shifts relative row references by `delta` and leaves
 * absolute `$row` references pinned, exactly as Excel does when a formula is
 * copied from one row to another. Used when cloning a band row.
 */
export function shiftRowRefs(text: string, delta: number): string {
  if (delta === 0) return text;
  return text.replace(/(\$?)([A-Z]{1,3})(\$?)(\d+)/g, (whole, colDollar, colLetters, rowDollar, rowDigits) => {
    if (rowDollar === '$') return whole; // absolute row reference — never shifted
    const newRow = parseInt(rowDigits, 10) + delta;
    return `${colDollar}${colLetters}${rowDollar}${newRow}`;
  });
}

/**
 * Master definitions of shared formulas, keyed by their `si` index.
 *
 * Excel compresses a column of identical formulas into one "master" cell that
 * carries the text (`<f t="shared" ref="M2:M13" si="0">+L2*15/100</f>`) and a
 * run of followers that carry only a pointer (`<f t="shared" si="0"/>`). A
 * cloned follower is therefore formula-less on its own, and if the master
 * happens to sit inside the block being replaced the whole group dangles — so
 * every formula we emit is resolved back to standalone text instead.
 */
export function parseSharedFormulas(sheetDataInner: string): Map<string, { row: number; text: string }> {
  const masters = new Map<string, { row: number; text: string }>();
  const masterRe = /<c\b[^>]*\br="([A-Z]+)(\d+)"[^>]*>\s*<f\b[^>]*\bt="shared"[^>]*\bsi="(\d+)"[^>]*>([\s\S]*?)<\/f>/g;
  let m: RegExpExecArray | null;
  while ((m = masterRe.exec(sheetDataInner)) !== null) {
    const [, , rowDigits, si, text] = m;
    if (text.trim() && !masters.has(si)) {
      masters.set(si, { row: parseInt(rowDigits, 10), text });
    }
  }
  return masters;
}

/**
 * The formula a cell effectively holds, expressed for the row it currently
 * sits on — resolving shared-formula followers against their master. Returns
 * null when the cell has no formula.
 */
export function effectiveFormula(
  cellXml: string,
  cellRow: number,
  shared: Map<string, { row: number; text: string }>
): string | null {
  const withText = /<f\b[^>]*>([\s\S]*?)<\/f>/.exec(cellXml);
  if (withText && withText[1].trim()) return withText[1];

  // Self-closing or empty <f>: only useful if it points at a shared master.
  const siMatch = /<f\b[^>]*\bsi="(\d+)"[^>]*\/?>/.exec(cellXml);
  if (siMatch) {
    const master = shared.get(siMatch[1]);
    if (master) return shiftRowRefs(master.text, cellRow - master.row);
  }
  return null;
}

/** Rewrites a row's `r=` and every cell's `r=` to a new row number, keeping everything else. */
export function rewriteRowNumber(row: ParsedRow, newR: number): ParsedRow {
  const newXml = row.xml.replace(/(<row\b[^>]*\br=")\d+(")/, `$1${newR}$2`);
  const newCells = row.cells.map((c) => {
    const { col } = parseCellRef(c.ref);
    const newRef = `${colNumberToLetter(col)}${newR}`;
    const newCellXml = c.xml.replace(/(<c\b[^>]*\br=")[^"]+(")/, `$1${newRef}$2`);
    return { ...c, ref: newRef, xml: newCellXml };
  });
  return { r: newR, xml: newXml, cells: newCells };
}
