// @ts-ignore
import * as XLSX from 'xlsx';
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
  rate_category: ['operation type', 'operation', 'line type', 'rate category', 'category', 'rate type', 'quote type'],
  billing_type: ['billing type', 'billing', 'billing frequency', 'commitment'],
  pricing_basis: ['pricing basis', 'pricing model', 'pricing', 'basis'],
  origin: ['origin', 'from', 'starting city', 'pickup', 'pickup city'],
  origin_label: ['origin label', 'origin facility', 'pickup facility', 'pickup label'],
  via: ['via', 'connecting city', 'connecting stop', 'stop'],
  destination: ['destination', 'destination / waypoints', 'parsed stop sequence', 'to', 'destination city', 'drop off', 'dropoff', 'drop off city'],
  destination_label: ['destination label', 'destination facility', 'dropoff facility', 'dropoff label'],
  vehicle_type: ['vehicle class', 'vehicle type', 'vehicle', 'truck type', 'body type'],
  price: ['billing rate', 'billing rate sar', 'price', 'rate', 'base price', 'amount'],
  currency: ['currency', 'ccy'],
  driver_payout: ['driver payout', 'driver payout sar', 'driver charge', 'default trip charge', 'trip charge', 'payout rate', 'driver cost'],
};

export const LOCATION_COLUMNS: ColumnMap = {
  name: ['location name', 'location name *', 'full resolved facility name', 'facility name', 'label', 'location', 'name', 'place name', 'saved place'],
  customer_name: ['customer', 'customer name', 'company', 'company name', 'customer *', 'company name *', 'client'],
  code: ['location code', 'location code *', 'august location label', 'august sheet label', 'short code', 'code', 'code *'],
  address: ['address', 'exact postal address', 'street / facility address', 'facility address', 'full address', 'area'],
  city: ['city', 'town'],
  postal_code: ['postal code', 'postal code *', 'zip code', 'zip'],
  lat: ['latitude', 'latitude *', 'lat'],
  lng: ['longitude', 'longitude *', 'lng', 'long'],
  coordinate_precision: ['coordinate precision', 'confidence level', 'precision status', 'precision', 'confidence', 'geocode source'],
  codes: ['codes', 'short codes', 'august sheet label', 'sheet label', 'monthly sheet codes', 'aliases'],
};

export const SURCHARGE_COLUMNS: ColumnMap = {
  customer_name: ['customer', 'customer name', 'company', 'company name'],
  charge_type: ['charge type', 'fee', 'fee type', 'charge'],
  unit: ['unit', 'per', 'basis'],
  vehicle_type: ['vehicle type', 'vehicle', 'truck type'],
  applies_to: ['applies to', 'lane', 'route', 'origin destination'],
  rate: ['rate', 'price', 'amount', 'fee amount'],
  currency: ['currency', 'ccy'],
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
  vehicle_plate: ['vehicle plate', 'vehicle', 'plate', 'truck plate', 'plate number', 'vehicle no'],
  rate_category: ['rate category', 'category', 'rate type', 'trip type'],
  vehicle_type: ['vehicle type', 'truck type', 'body type', 'asset type'],
  billing_type: ['billing type', 'billing', 'billing frequency', 'commitment'],
  origin: ['origin', 'from', 'pickup', 'pickup city', 'starting point'],
  destination: ['destination', 'to', 'dropoff', 'drop off', 'delivery city'],
  billing_amount: ['amount', 'price', 'rate', 'billing amount', 'charges'],
  trip_charges: ['trip charges', 'driver payout', 'driver charge', 'payout'],
  status: ['status', 'trip status'],
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
function cellToValue(value: any): string | number | null {
  if (value === null || value === undefined) return null;
  if (value instanceof Date) {
    if (isNaN(value.getTime())) return null;
    const y = value.getFullYear();
    const m = String(value.getMonth() + 1).padStart(2, '0');
    const d = String(value.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
  }
  if (typeof value === 'number' || typeof value === 'string') return value;
  if (typeof value === 'object') {
    if ('text' in value) return String(value.text);
    if ('result' in value) return value.result ?? null;
    if ('richText' in value && Array.isArray(value.richText)) return value.richText.map((r: any) => r.text).join('');
    if ('hyperlink' in value) return String(value.text ?? value.hyperlink);
  }
  return String(value);
}

function findHeaderRowInMatrix(matrix: any[][], columns: ColumnMap): number | null {
  const known = new Set(Object.values(columns).flat());
  let best: { row: number; hits: number } | null = null;

  for (let r = 0; r < Math.min(matrix.length, 30); r++) {
    const row = matrix[r] || [];
    let hits = 0;
    for (const cell of row) {
      if (cell !== null && cell !== undefined) {
        if (known.has(normalise(String(cellToValue(cell) ?? '')))) hits++;
      }
    }
    if (hits >= 2 && (!best || hits > best.hits)) best = { row: r, hits };
  }

  return best?.row ?? null;
}

function findHeaderRowExcelJS(sheet: ExcelJS.Worksheet, columns: ColumnMap): number | null {
  const known = new Set(Object.values(columns).flat());
  let best: { row: number; hits: number } | null = null;

  const maxRowsToScan = Math.min(sheet.rowCount, 30);
  for (let r = 1; r <= maxRowsToScan; r++) {
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
  const buffer = await file.arrayBuffer();

  // Primary parsing engine: SheetJS (xlsx) - handles all OpenXML variances cleanly
  try {
    const workbook = XLSX.read(buffer, { type: 'array', cellDates: true });
    const sheetNames = workbook.SheetNames || [];

    if (sheetNames.length > 0) {
      let targetSheetName = sheetNames[0];
      if (preferSheet) {
        const matched = sheetNames.find((s) => s.toLowerCase().includes(preferSheet.toLowerCase()));
        if (matched) targetSheetName = matched;
      }

      if (!preferSheet || !targetSheetName) {
        let bestSheetName = targetSheetName;
        for (const sName of sheetNames) {
          const ws = workbook.Sheets[sName];
          if (!ws) continue;
          const matrix: any[][] = XLSX.utils.sheet_to_json(ws, { header: 1, raw: false, defval: null });
          if (findHeaderRowInMatrix(matrix, columns) !== null) {
            bestSheetName = sName;
            break;
          }
        }
        targetSheetName = bestSheetName;
      }

      const ws = workbook.Sheets[targetSheetName];
      if (ws) {
        const matrix: any[][] = XLSX.utils.sheet_to_json(ws, { header: 1, raw: false, defval: null });
        const headerRowIdx = findHeaderRowInMatrix(matrix, columns);

        if (headerRowIdx === null) {
          const isLookingForDrivers = columns === DRIVER_COLUMNS;
          const oppositeColumns = isLookingForDrivers ? VEHICLE_COLUMNS : DRIVER_COLUMNS;
          const oppositeLabel = isLookingForDrivers ? 'Vehicles' : 'Drivers';
          const targetLabel = isLookingForDrivers ? 'Drivers' : 'Vehicles';

          for (const sName of sheetNames) {
            const oppWs = workbook.Sheets[sName];
            if (!oppWs) continue;
            const oppMatrix: any[][] = XLSX.utils.sheet_to_json(oppWs, { header: 1, raw: false, defval: null });
            if (findHeaderRowInMatrix(oppMatrix, oppositeColumns) !== null) {
              throw new Error(
                `This file looks like a ${oppositeLabel} template. Please make sure to download and upload the correct ${targetLabel} template.`
              );
            }
          }

          throw new Error(
            `Couldn't find the column headers on sheet "${targetSheetName}". Use the MERCON template, or check the header row wasn't deleted.`
          );
        }

        const headerRow = matrix[headerRowIdx] || [];
        const indexToField = new Map<number, string>();
        const unmappedHeaders: string[] = [];

        headerRow.forEach((cellVal, colIdx) => {
          const header = normalise(String(cellToValue(cellVal) ?? ''));
          if (!header) return;
          const field = Object.entries(columns).find(([, aliases]) => aliases.includes(header))?.[0];
          if (field && !Array.from(indexToField.values()).includes(field)) {
            indexToField.set(colIdx, field);
          } else if (!field) {
            unmappedHeaders.push(String(cellToValue(cellVal) ?? ''));
          }
        });

        const foundFields = new Set(indexToField.values());
        const missingColumns = Object.keys(columns).filter((f) => !foundFields.has(f));

        const rows: Record<string, string | number>[] = [];
        for (let r = headerRowIdx + 1; r < matrix.length; r++) {
          const rowCells = matrix[r] || [];
          const parsed: Record<string, string | number> = {};

          indexToField.forEach((field, colIdx) => {
            const val = cellToValue(rowCells[colIdx]);
            if (val === null || String(val).trim() === '') return;
            parsed[field] = typeof val === 'number' ? val : String(val).trim();
          });

          if (Object.keys(parsed).length > 0) rows.push(parsed);
        }

        return { rows, missingColumns, unmappedHeaders, sheetName: targetSheetName };
      }
    }
  } catch (err: any) {
    if (err?.message?.includes('template') || err?.message?.includes('Couldn\'t find')) {
      throw err;
    }
    console.warn('SheetJS error, falling back to ExcelJS:', err);
  }

  // Fallback engine: ExcelJS
  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.load(buffer);

  const sheet =
    (preferSheet
      ? workbook.worksheets.find((w) => w.name.toLowerCase().includes(preferSheet))
      : undefined) ??
    workbook.worksheets.find((w) => findHeaderRowExcelJS(w, columns) !== null) ??
    workbook.worksheets[0];

  if (!sheet) throw new Error('That file has no readable sheets.');

  const headerRowNumber = findHeaderRowExcelJS(sheet, columns);
  if (headerRowNumber === null) {
    throw new Error(
      `Couldn't find the column headers on sheet "${sheet.name}". Use the MERCON template, or check the header row wasn't deleted.`
    );
  }

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

    if (Object.keys(parsed).length > 0) rows.push(parsed);
  }

  return { rows, missingColumns, unmappedHeaders, sheetName: sheet.name };
}
