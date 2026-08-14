import ExcelJS from 'exceljs';
import { DRIVER_COLUMNS, VEHICLE_COLUMNS, CUSTOMER_COLUMNS, TRIP_COLUMNS, ColumnMap } from './importUtils';

export interface TemplateColumn {
  colIndex: number; // 1-based index in sheet
  headerText: string;
  mappedField: string | null;
}

export interface TemplateSheetInfo {
  sheetName: string;
  headerRowIdx: number;
  columns: TemplateColumn[];
}

export interface TemplateInspectionResult {
  sheetInfo: TemplateSheetInfo | null;
  detectedEntity: 'drivers' | 'trips' | 'vehicles' | 'customers' | 'unknown';
  allSheets: string[];
}

export interface SavedTemplatePreset {
  id: string;
  companyId: string;
  companyName: string;
  templateName: string;
  updatedAt: string;
  dataBase64: string; // Base64 encoded template workbook
}

const STORAGE_KEY = 'mercon_saved_company_excel_templates';

export function getSavedCompanyTemplates(): SavedTemplatePreset[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch (e) {
    console.error('Failed to read saved templates from storage:', e);
    return [];
  }
}

export function saveCompanyTemplatePreset(preset: Omit<SavedTemplatePreset, 'id' | 'updatedAt'>): SavedTemplatePreset {
  const existing = getSavedCompanyTemplates();
  const id = `tpl_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
  const newPreset: SavedTemplatePreset = {
    ...preset,
    id,
    updatedAt: new Date().toISOString(),
  };

  // Replace if existing for same company and name
  const filtered = existing.filter(p => !(p.companyId === preset.companyId && p.templateName === preset.templateName));
  const updated = [newPreset, ...filtered];
  
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
  } catch (e) {
    console.warn('Storage quota exceeded when saving template, keeping in-memory:', e);
  }

  return newPreset;
}

export function base64ToArrayBuffer(base64: string): ArrayBuffer {
  const binaryString = window.atob(base64);
  const len = binaryString.length;
  const bytes = new Uint8Array(len);
  for (let i = 0; i < len; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  return bytes.buffer;
}

export function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const res = String(reader.result || '');
      const base64 = res.split(',')[1] || res;
      resolve(base64);
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

const normaliseHeader = (header: string) =>
  String(header ?? '')
    .toLowerCase()
    .replace(/\*/g, '')
    .replace(/\(.*?\)/g, '')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();

function findBestFieldMatch(header: string, entityColumns: ColumnMap): string | null {
  const norm = normaliseHeader(header);
  if (!norm) return null;

  for (const [field, aliases] of Object.entries(entityColumns) as [string, string[]][]) {
    if (aliases.includes(norm)) return field;
  }
  // Fallback fuzzy search: check if normalized header contains alias or vice versa
  for (const [field, aliases] of Object.entries(entityColumns) as [string, string[]][]) {
    if (aliases.some((alias: string) => norm.includes(alias) || alias.includes(norm))) {
      return field;
    }
  }

  // Extra specific mappings for Company Trip Reports
  if (norm.includes('job') || norm.includes('s l') || norm.includes('ref')) return 'ref_id';
  if (norm.includes('driver')) return 'driver_name';
  if (norm.includes('vehicle') || norm.includes('plate')) return 'vehicle_plate';
  if (norm.includes('carrier') || norm.includes('3rd party') || norm.includes('provider')) return 'carrier_name';
  if (norm.includes('sender') || norm.includes('customer')) return 'customer_name';
  if (norm.includes('receiver') || norm.includes('consignee')) return 'receiver';
  if (norm.includes('waiting') || norm.includes('labor')) return 'waiting_labor_charges';
  if (norm.includes('stop')) return 'additional_stop_charges';
  if (norm.includes('billing')) return 'billing_amount';
  if (norm.includes('total')) return 'total_amount';
  if (norm.includes('charge') || norm.includes('trip charge')) return 'trip_charges';
  if (norm.includes('balance') || norm.includes('net')) return 'balance_amount';
  if (norm.includes('company')) return 'company_name';

  return null;
}

const ALL_ENTITY_MAPS: Record<string, ColumnMap> = {
  trips: TRIP_COLUMNS,
  drivers: DRIVER_COLUMNS,
  vehicles: VEHICLE_COLUMNS,
  customers: CUSTOMER_COLUMNS,
};

/**
 * Inspect an uploaded template file to extract worksheet information, header row index,
 * column headers, and auto-detect the entity type.
 */
export async function inspectExcelTemplate(file: File | ArrayBuffer): Promise<TemplateInspectionResult> {
  const workbook = new ExcelJS.Workbook();
  const buffer = file instanceof File ? await file.arrayBuffer() : file;
  await workbook.xlsx.load(buffer);

  const allSheets = workbook.worksheets.map(ws => ws.name);

  let bestSheetInfo: TemplateSheetInfo | null = null;
  let detectedEntity: 'drivers' | 'trips' | 'vehicles' | 'customers' | 'unknown' = 'unknown';
  let maxHits = 0;

  for (const worksheet of workbook.worksheets) {
    // Scan top 25 rows for a header row
    for (let r = 1; r <= Math.min(worksheet.rowCount, 25); r++) {
      const row = worksheet.getRow(r);
      const rowHeaders: { colIndex: number; text: string }[] = [];

      row.eachCell({ includeEmpty: false }, (cell, colNumber) => {
        const text = String(cell.value?.toString() ?? '').trim();
        if (text) rowHeaders.push({ colIndex: colNumber, text });
      });

      if (rowHeaders.length < 2) continue;

      // Evaluate match quality across candidate entities
      for (const [entityType, colMap] of Object.entries(ALL_ENTITY_MAPS)) {
        let hits = 0;
        const matchedCols: TemplateColumn[] = [];

        for (const h of rowHeaders) {
          const matchedField = findBestFieldMatch(h.text, colMap);
          if (matchedField) hits++;
          matchedCols.push({
            colIndex: h.colIndex,
            headerText: h.text,
            mappedField: matchedField,
          });
        }

        if (hits >= 2 && hits > maxHits) {
          maxHits = hits;
          detectedEntity = entityType as any;
          bestSheetInfo = {
            sheetName: worksheet.name,
            headerRowIdx: r,
            columns: matchedCols,
          };
        }
      }
    }
  }

  return {
    sheetInfo: bestSheetInfo,
    detectedEntity,
    allSheets,
  };
}

/**
 * Maps entity data object fields into string/number values suitable for Excel cell write.
 */
function extractEntityFieldValue(record: Record<string, any>, fieldName: string, rowIndex?: number): any {
  if (!record) return '';

  switch (fieldName) {
    case 'sl':
    case 's_l':
    case 'serial':
      return rowIndex !== undefined ? rowIndex + 1 : '';
    case 'ref_id':
    case 'job_no':
      return record.ref_id || record.id || record.job_no || '';
    case 'first_name':
      return record.first_name || (record.name ? String(record.name).split(' ')[0] : '');
    case 'last_name':
      return record.last_name || (record.name ? String(record.name).split(' ').slice(1).join(' ') : '');
    case 'phone_primary':
    case 'driver_phone':
    case 'mobile':
      return record.phone_primary || record.contact_phone || record.driver_phone || record.phone || '';
    case 'license_number':
      return record.license_number || record.license_no || '';
    case 'license_expiry':
      return record.license_expiry ? String(record.license_expiry).slice(0, 10) : '';
    case 'assigned_vehicle_plate':
    case 'vehicle_plate':
    case 'vehicle':
      return record.assigned_vehicle_plate || record.vehicle_plate || record.vehicle || '';
    case 'plate_number':
      return record.plate_number || record.vehicle || '';
    case 'asset_type':
    case 'vehicle_type':
      return record.asset_type || record.vehicle_type || '10 TON';
    case 'capacity_kg':
      return record.capacity_kg ? Number(record.capacity_kg) : '';
    case 'current_odometer':
      return record.current_odometer ? Number(record.current_odometer) : '';
    case 'icces_device_id':
      return record.icces_device_id || '';
    case 'name':
    case 'customer_name':
    case 'customer':
      return record.customer || record.customer_name || record.company_name || record.name || '';
    case 'receiver':
      return record.receiver || record.destination || '';
    case 'trade_alias':
      return record.trade_alias || '';
    case 'cr_number':
      return record.cr_number || '';
    case 'vat_number':
      return record.vat_number || '';
    case 'contact_person':
    case 'driver_name':
    case 'driver':
      return record.driver || record.driver_name || record.contact_person || `${record.first_name || ''} ${record.last_name || ''}`.trim();
    case 'contact_phone':
      return record.contact_phone || record.phone_primary || record.driver_phone || '';
    case 'email':
      return record.email || '';
    case 'date':
      return record.date ? String(record.date).slice(0, 10) : record.planned_start ? String(record.planned_start).slice(0, 10) : '';
    case 'carrier_name':
      return record.carrier_name || 'MERCON LOGISTICS';
    case 'billing_amount':
      return record.billing_amount !== undefined ? Number(record.billing_amount) : '';
    case 'total_amount':
      return record.total_amount !== undefined ? Number(record.total_amount) : '';
    case 'trip_charges':
      return record.trip_charges !== undefined ? Number(record.trip_charges) : '';
    case 'balance_amount':
      return record.balance_amount !== undefined ? Number(record.balance_amount) : '';
    case 'waiting_labor_charges':
      return record.waiting_labor_charges !== undefined ? Number(record.waiting_labor_charges) : 0;
    case 'additional_stop_charges':
      return record.additional_stop_charges !== undefined ? Number(record.additional_stop_charges) : 0;
    case 'company_name':
      return record.company_name || record.customer || '';
    default:
      if (record[fieldName] !== undefined) return record[fieldName];
      const lowerField = fieldName.toLowerCase();
      const matchKey = Object.keys(record).find(k => k.toLowerCase() === lowerField);
      return matchKey ? record[matchKey] : '';
  }
}

/**
 * Generate a styled Excel file using the user-provided template file and DB records.
 */
export async function generateCustomTemplateExcel(
  templateFile: File | ArrayBuffer,
  dataRecords: Record<string, any>[],
  outputFilename: string = 'mercon_company_trip_report.xlsx',
  options: {
    targetSheetName?: string;
    customMapping?: Record<number, string>; // colIndex -> dbFieldName
  } = {}
): Promise<void> {
  const workbook = new ExcelJS.Workbook();
  const buffer = templateFile instanceof File ? await templateFile.arrayBuffer() : templateFile;
  await workbook.xlsx.load(buffer);

  // Determine target worksheet
  let sheet: ExcelJS.Worksheet | undefined;
  if (options.targetSheetName) {
    sheet = workbook.getWorksheet(options.targetSheetName);
  }

  if (!sheet) {
    const inspection = await inspectExcelTemplate(buffer);
    if (inspection.sheetInfo) {
      sheet = workbook.getWorksheet(inspection.sheetInfo.sheetName);
    }
  }

  if (!sheet) {
    sheet = workbook.worksheets[0];
  }

  if (!sheet) {
    throw new Error('Template file has no valid worksheets.');
  }

  // Find header row
  let headerRowIdx = 1;
  let colMapping = new Map<number, string>(); // colIndex -> dbFieldName

  const inspection = await inspectExcelTemplate(buffer);
  if (inspection.sheetInfo && inspection.sheetInfo.sheetName === sheet.name) {
    headerRowIdx = inspection.sheetInfo.headerRowIdx;
    for (const col of inspection.sheetInfo.columns) {
      if (col.mappedField) {
        colMapping.set(col.colIndex, col.mappedField);
      }
    }
  } else {
    for (let r = 1; r <= Math.min(sheet.rowCount, 25); r++) {
      const row = sheet.getRow(r);
      let hits = 0;
      row.eachCell({ includeEmpty: false }, (cell, colNumber) => {
        const text = cell.value?.toString() || '';
        const match = findBestFieldMatch(text, TRIP_COLUMNS) || findBestFieldMatch(text, DRIVER_COLUMNS);
        if (match) {
          hits++;
          colMapping.set(colNumber, match);
        }
      });
      if (hits >= 2) {
        headerRowIdx = r;
        break;
      }
    }
  }

  if (options.customMapping) {
    for (const [colIdxStr, field] of Object.entries(options.customMapping)) {
      colMapping.set(Number(colIdxStr), field);
    }
  }

  const sampleStyleRow = sheet.getRow(headerRowIdx + 1);
  const startDataRowIdx = headerRowIdx + 1;
  const existingRowCount = sheet.rowCount;

  // Clear sample rows
  for (let r = existingRowCount; r >= startDataRowIdx; r--) {
    sheet.getRow(r).values = [];
  }

  // Inject DB records
  dataRecords.forEach((record, rIdx) => {
    const targetRowIdx = startDataRowIdx + rIdx;
    const excelRow = sheet!.getRow(targetRowIdx);

    colMapping.forEach((fieldName, colIndex) => {
      const cell = excelRow.getCell(colIndex);
      const val = extractEntityFieldValue(record, fieldName, rIdx);

      cell.value = val === null || val === undefined || val === '' ? null : val;

      const sampleCell = sampleStyleRow.getCell(colIndex);
      if (sampleCell) {
        if (sampleCell.font) cell.font = JSON.parse(JSON.stringify(sampleCell.font));
        if (sampleCell.fill) cell.fill = JSON.parse(JSON.stringify(sampleCell.fill));
        if (sampleCell.border) cell.border = JSON.parse(JSON.stringify(sampleCell.border));
        if (sampleCell.alignment) cell.alignment = JSON.parse(JSON.stringify(sampleCell.alignment));
        if (sampleCell.numFmt) cell.numFmt = sampleCell.numFmt;
      }
    });

    excelRow.height = sampleStyleRow.height || 20;
    excelRow.commit();
  });

  const outBuffer = await workbook.xlsx.writeBuffer();
  const blob = new Blob([outBuffer], {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.setAttribute('download', outputFilename);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
