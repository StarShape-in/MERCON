import ExcelJS from 'exceljs';

/**
 * Reads the fleet import workbooks in the browser, so the operator sees exactly
 * which rows are wrong *before* anything is written. The parsed rows are posted
 * as JSON, matching the contract the trips bulk-import already uses — no file
 * upload handling or spreadsheet library on the server.
 *
 * Column headers come from the templates in `docs/templates/`, but the owner's
 * filled-in file often has them lightly edited ("Primary Phone" vs "Primary
 * Phone *"), so matching is done on a normalised header and accepts several
 * spellings per field rather than one exact string.
 */

const normalise = (header: string) =>
  String(header ?? '')
    .toLowerCase()
    .replace(/\*/g, '')
    .replace(/\(.*?\)/g, '')   // drop unit hints like "(KG)"
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();

/** Field name → the header spellings that map to it, most specific first. */
export type ColumnMap = Record<string, string[]>;

export const DRIVER_COLUMNS: ColumnMap = {
  ref_id: ['driver ref id', 'driver ref', 'ref id', 'driver id'],
  first_name: ['first name'],
  last_name: ['last name', 'family name'],
  phone_primary: ['primary phone', 'phone', 'mobile', 'contact number'],
  license_number: ['license number', 'licence number', 'license no'],
  license_expiry: ['license expiry date', 'license expiry', 'licence expiry'],
  assigned_vehicle_plate: ['assigned vehicle plate', 'assigned vehicle', 'vehicle plate', 'plate'],
};

export const VEHICLE_COLUMNS: ColumnMap = {
  ref_id: ['vehicle ref id', 'vehicle ref', 'ref id', 'vehicle id'],
  plate_number: ['plate number', 'plate', 'registration plate'],
  asset_type: ['asset type', 'vehicle type', 'body type'],
  capacity_kg: ['capacity kg', 'capacity'],
  current_odometer: ['current odometer km', 'current odometer', 'odometer'],
  icces_device_id: ['icces device id', 'icces device', 'icces id'],
  trailer_number: ['trailer number', 'trailer no'],
  trailer_type: ['trailer type'],
  trailer_capacity_kg: ['trailer capacity kg', 'trailer capacity'],
  assigned_driver: ['assigned driver phone name', 'assigned driver', 'driver phone', 'driver'],
};

export const CUSTOMER_COLUMNS: ColumnMap = {
  ref_id: ['customer ref id', 'customer ref', 'ref id', 'customer id'],
  name: ['company name', 'company name *', 'company', 'legal entity name', 'customer name', 'name'],
  trade_alias: ['trade name brand', 'trade name', 'trade alias', 'brand'],
  industry: ['industry', 'industry sector'],
  cr_number: ['commercial reg cr no', 'commercial reg no', 'cr number', 'cr no'],
  vat_number: ['vat tax number', 'vat number', 'tax number', 'vat no'],
  contact_person: ['contact 1 name', 'primary contact name', 'contact representative', 'contact person', 'representative'],
  contact_phone: ['contact 1 phone *', 'contact 1 phone', 'primary phone *', 'primary phone', 'contact phone', 'phone', 'mobile', 'contact number'],
  email: ['contact 1 email', 'primary email', 'billing email', 'email address', 'email'],
  contact_title: ['contact 1 title', 'primary contact title', 'job title', 'designation', 'title'],
  secondary_person: ['contact 2 name', 'secondary contact name', 'secondary contact', 'contact 2 name'],
  secondary_phone: ['contact 2 phone', 'secondary phone'],
  secondary_email: ['contact 2 email', 'secondary email'],
  secondary_title: ['contact 2 title', 'secondary contact title'],
  tertiary_person: ['contact 3 name', 'tertiary contact name', 'contact 3 name'],
  tertiary_phone: ['contact 3 phone', 'tertiary phone'],
  tertiary_email: ['contact 3 email', 'tertiary email'],
  tertiary_title: ['contact 3 title', 'tertiary contact title'],
  billing_address: ['billing address notes', 'billing address', 'address', 'notes'],
};

export const RATE_CARD_COLUMNS: ColumnMap = {
  customer_name: ['customer', 'customer name', 'company', 'company name', 'carrier'],
  rate_category: ['rate category', 'category', 'rate type', 'quote type'],
  origin: ['origin', 'from', 'starting city', 'pickup', 'pickup city'],
  via: ['via', 'connecting city', 'connecting stop', 'stop'],
  destination: ['destination', 'to', 'destination city', 'drop off', 'dropoff', 'drop off city'],
  vehicle_type: ['vehicle type', 'vehicle', 'truck type', 'body type'],
  price: ['price', 'rate', 'base price', 'amount'],
  currency: ['currency', 'ccy'],
  default_trip_charge: ['default trip charge', 'trip charge', 'driver payout', 'payout rate', 'driver cost'],
};

export const THIRD_PARTY_COLUMNS: ColumnMap = {
  name: ['provider name', 'company name', 'company', 'provider', 'supplier name', 'supplier', 'name'],
  contact_person: ['contact person', 'contact name', 'primary contact', 'representative'],
  phone: ['phone', 'phone number', 'mobile', 'contact phone', 'contact number'],
  email: ['email', 'email address', 'contact email'],
  tax_id: ['tax id', 'tax number', 'cr number', 'vat number', 'commercial reg id'],
  address: ['address', 'office address', 'yard address', 'location'],
  notes: ['notes', 'remarks', 'terms', 'comments'],
};

export const TRIP_COLUMNS: ColumnMap = {
  customer_name: ['customer', 'customer name', 'company', 'company name', 'client'],
  planned_start: ['date', 'trip date', 'planned start', 'planned date', 'start date', 'scheduled date'],
  driver_name: ['driver', 'driver name', 'assigned driver', 'driver full name'],
  vehicle_plate: ['vehicle plate', 'vehicle', 'plate', 'truck plate', 'plate number'],
  rate_category: ['rate category', 'category', 'rate type', 'trip type'],
  vehicle_type: ['vehicle type', 'truck type', 'body type', 'asset type'],
  origin: ['origin', 'from', 'pickup', 'pickup city', 'starting point'],
  destination: ['destination', 'to', 'dropoff', 'drop off', 'delivery city'],
  billing_amount: ['amount', 'price', 'rate', 'billing amount', 'charges'],
};

export interface ParsedSheet {
  rows: Record<string, string | number>[];
  /** Fields the template defines that this file has no column for. */
  missingColumns: string[];
  /** Headers in the file we didn't recognise — surfaced so a renamed column isn't silently dropped. */
  unmappedHeaders: string[];
  sheetName: string;
}

/**
 * A cell can come back as a string, a number, a Date, or a rich-text/formula
 * object. Flatten all of that to something the API can validate.
 */
function cellToValue(value: ExcelJS.CellValue): string | number | null {
  if (value === null || value === undefined) return null;
  if (value instanceof Date) {
    // Dates go to the API as YYYY-MM-DD. Using the local date parts rather than
    // toISOString(), which shifts to UTC and can move a date back a day.
    const y = value.getFullYear();
    const m = String(value.getMonth() + 1).padStart(2, '0');
    const d = String(value.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
  }
  if (typeof value === 'number' || typeof value === 'string') return value;
  if (typeof value === 'object') {
    const anyVal = value as any;
    if ('text' in anyVal) return String(anyVal.text);
    if ('result' in anyVal) return anyVal.result ?? null;      // formula cell
    if ('richText' in anyVal) return anyVal.richText.map((r: any) => r.text).join('');
    if ('hyperlink' in anyVal) return String(anyVal.text ?? anyVal.hyperlink);
  }
  return String(value);
}

/**
 * Find the header row. The templates put a banner and instructions above the
 * table, so the headers are not row 1 — locate the first row that matches at
 * least two known column names instead of assuming a position.
 */
function findHeaderRow(sheet: ExcelJS.Worksheet, columns: ColumnMap): number | null {
  const known = new Set(Object.values(columns).flat());
  let best: { row: number; hits: number } | null = null;

  for (let r = 1; r <= Math.min(sheet.rowCount, 25); r++) {
    const row = sheet.getRow(r);
    let hits = 0;
    row.eachCell({ includeEmpty: false }, (cell) => {
      if (known.has(normalise(String(cellToValue(cell.value) ?? '')))) hits++;
    });
    if (hits >= 2 && (!best || hits > best.hits)) best = { row: r, hits };
  }

  return best?.row ?? null;
}

export async function parseSheet(
  file: File,
  columns: ColumnMap,
  /** Prefer a sheet whose name contains this, e.g. "driver". */
  preferSheet?: string
): Promise<ParsedSheet> {
  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.load(await file.arrayBuffer());

  // The master template holds Instructions / Drivers / Vehicles / Reference in
  // one file, so pick the right sheet rather than always taking the first.
  const sheet =
    (preferSheet
      ? workbook.worksheets.find((w) => w.name.toLowerCase().includes(preferSheet))
      : undefined) ??
    workbook.worksheets.find((w) => findHeaderRow(w, columns) !== null) ??
    workbook.worksheets[0];

  if (!sheet) throw new Error('That file has no readable sheets.');

  const headerRowNumber = findHeaderRow(sheet, columns);
  if (headerRowNumber === null) {
    // Smart detection: check if they uploaded the wrong entity template (e.g. Drivers vs Vehicles)
    const isLookingForDrivers = columns === DRIVER_COLUMNS;
    const oppositeColumns = isLookingForDrivers ? VEHICLE_COLUMNS : DRIVER_COLUMNS;
    const oppositeLabel = isLookingForDrivers ? 'Vehicles' : 'Drivers';
    const targetLabel = isLookingForDrivers ? 'Drivers' : 'Vehicles';

    const oppositeSheet = workbook.worksheets.find((w) => findHeaderRow(w, oppositeColumns) !== null);
    if (oppositeSheet) {
      throw new Error(
        `This file looks like a ${oppositeLabel} template. Please make sure to download and upload the correct ${targetLabel} template.`
      );
    }

    throw new Error(
      `Couldn't find the column headers on sheet "${sheet.name}". Use the MERCON template, or check the header row wasn't deleted.`
    );
  }

  // Map each spreadsheet column index to one of our field names.
  const headerRow = sheet.getRow(headerRowNumber);
  const indexToField = new Map<number, string>();
  const unmappedHeaders: string[] = [];

  headerRow.eachCell({ includeEmpty: false }, (cell, colNumber) => {
    const header = normalise(String(cellToValue(cell.value) ?? ''));
    if (!header) return;
    const field = Object.entries(columns).find(([, aliases]) => aliases.includes(header))?.[0];
    if (field && !Array.from(indexToField.values()).includes(field)) {
      indexToField.set(colNumber, field);
    } else if (!field) {
      unmappedHeaders.push(String(cellToValue(cell.value) ?? ''));
    }
  });

  const foundFields = new Set(indexToField.values());
  const missingColumns = Object.keys(columns).filter((f) => !foundFields.has(f));

  const rows: Record<string, string | number>[] = [];
  for (let r = headerRowNumber + 1; r <= sheet.rowCount; r++) {
    const row = sheet.getRow(r);
    const parsed: Record<string, string | number> = {};

    indexToField.forEach((field, colNumber) => {
      const value = cellToValue(row.getCell(colNumber).value);
      if (value === null || String(value).trim() === '') return;
      parsed[field] = typeof value === 'number' ? value : String(value).trim();
    });

    // Skip blank spacer rows without skipping a row that merely has gaps.
    if (Object.keys(parsed).length > 0) rows.push(parsed);
  }

  return { rows, missingColumns, unmappedHeaders, sheetName: sheet.name };
}
