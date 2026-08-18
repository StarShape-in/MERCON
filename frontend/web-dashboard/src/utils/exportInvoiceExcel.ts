import ExcelJS from 'exceljs';
import { BillingLedgerTrip, CustomerBillingRow } from '@/services/tripService';
import { formatInDeploymentTz } from '@/lib/datetime';

const DEFAULT_TZ = 'Asia/Riyadh';

// ─── Constants & Company Metadata ─────────────────────────────────────────────
const MERCON_INFO = {
  name: 'MERCON LOGISTICS SERVICES',
  nameAr: 'شركة ميركون للخدمات اللوجستية',
  vatNo: '312709215800003',
  vendorNo: 'MERCON',
  bankName: 'SAUDI BRITISH BANK (SAB)',
  bankNameAr: 'البنك السعودي البريطاني (ساب)',
  beneficiary: 'Mercon logistics service',
  accountNo: '6111110701001',
  iban: 'SA1645000000611110701001',
  contactEmail: 'billing@mercon.com',
  contactPhone: '+966 11 000 0000',
  address: 'Riyadh, Kingdom of Saudi Arabia',
};

// ─── English & Arabic Number to Words Converters ───────────────────────────────
function getEnglishWordsBelowThousand(n: number): string {
  const ones = ['', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine', 'Ten',
    'Eleven', 'Twelve', 'Thirteen', 'Fourteen', 'Fifteen', 'Sixteen', 'Seventeen', 'Eighteen', 'Nineteen'];
  const tens = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety'];

  let str = '';
  if (n >= 100) {
    str += ones[Math.floor(n / 100)] + ' Hundred';
    n %= 100;
    if (n > 0) str += ' and ';
  }
  if (n >= 20) {
    str += tens[Math.floor(n / 10)];
    if (n % 10 > 0) str += ' ' + ones[n % 10];
  } else if (n > 0) {
    str += ones[n];
  }
  return str.trim();
}

export function convertAmountToEnglishWords(amount: number): string {
  if (!amount || amount === 0) return 'Zero Saudi Riyals Only';
  const whole = Math.floor(amount);
  const halalas = Math.round((amount - whole) * 100);

  const thousands = ['', 'Thousand', 'Million', 'Billion'];
  let temp = whole;
  let chunkIdx = 0;
  const parts: string[] = [];

  while (temp > 0) {
    const chunk = temp % 1000;
    if (chunk > 0) {
      const chunkStr = getEnglishWordsBelowThousand(chunk);
      const scaleStr = thousands[chunkIdx] ? ' ' + thousands[chunkIdx] : '';
      parts.unshift(chunkStr + scaleStr);
    }
    temp = Math.floor(temp / 1000);
    chunkIdx++;
  }

  let result = (parts.join(' ') || 'Zero') + ' Saudi Riyals';
  if (halalas > 0) {
    result += ` and ${getEnglishWordsBelowThousand(halalas)} Halalas`;
  }
  return result + ' Only';
}

function getArabicWordsBelowThousand(n: number): string {
  const ones = ['', 'واحد', 'اثنان', 'ثلاثة', 'أربعة', 'خمسة', 'ستة', 'سبعة', 'ثمانية', 'تسعة', 'عشرة'];
  const teens = ['', 'أحد عشر', 'اثنا عشر', 'ثلاثة عشر', 'أربعة عشر', 'خمسة عشر', 'ستة عشر', 'سبعة عشر', 'ثمانية عشر', 'تسعة عشر'];
  const tens = ['', '', 'عشرون', 'ثلاثون', 'أربعون', 'خمسون', 'ستون', 'سبعون', 'ثمانون', 'تسعون'];
  const hundreds = ['', 'مائة', 'مئتان', 'ثلاثمائة', 'أربعمائة', 'خمسمائة', 'ستمائة', 'سبعمائة', 'ثمانمائة', 'تسعمائة'];

  const parts: string[] = [];
  if (n >= 100) {
    parts.push(hundreds[Math.floor(n / 100)]);
    n %= 100;
  }
  if (n >= 20) {
    const u = n % 10;
    const t = Math.floor(n / 10);
    if (u > 0) {
      parts.push(ones[u] + ' و' + tens[t]);
    } else {
      parts.push(tens[t]);
    }
  } else if (n >= 11) {
    parts.push(teens[n - 10]);
  } else if (n > 0) {
    parts.push(ones[n]);
  }
  return parts.join(' و');
}

export function convertAmountToArabicWords(amount: number): string {
  if (!amount || amount === 0) return 'صفر ريال سعودي فقط';
  const whole = Math.floor(amount);
  const halalas = Math.round((amount - whole) * 100);

  const parts: string[] = [];
  const millions = Math.floor(whole / 1000000);
  const thousands = Math.floor((whole % 1000000) / 1000);
  const remainder = whole % 1000;

  if (millions > 0) {
    if (millions === 1) parts.push('مليون');
    else if (millions === 2) parts.push('مليونان');
    else if (millions >= 3 && millions <= 10) parts.push(getArabicWordsBelowThousand(millions) + ' ملايين');
    else parts.push(getArabicWordsBelowThousand(millions) + ' مليوناً');
  }

  if (thousands > 0) {
    if (thousands === 1) parts.push('ألف');
    else if (thousands === 2) parts.push('ألفان');
    else if (thousands >= 3 && thousands <= 10) parts.push(getArabicWordsBelowThousand(thousands) + ' آلاف');
    else parts.push(getArabicWordsBelowThousand(thousands) + ' ألفاً');
  }

  if (remainder > 0) {
    parts.push(getArabicWordsBelowThousand(remainder));
  }

  let result = (parts.join(' و') || 'صفر') + ' ريالاً سعودياً';
  if (halalas > 0) {
    result += ` و${getArabicWordsBelowThousand(halalas)} هللة`;
  }
  return result + ' فقط';
}

// ─── Helpers to extract Trip values ───────────────────────────────────────────
function getOrigin(trip: BillingLedgerTrip): string {
  const p = trip.stops?.find((s: any) => s.stop_type === 'Pickup');
  return p?.location?.name || p?.location_name || 'Riyadh Hub';
}

function getDestination(trip: BillingLedgerTrip): string {
  const d = trip.stops?.filter((s: any) => s.stop_type === 'Dropoff') || [];
  const last = d[d.length - 1];
  return last?.location?.name || last?.location_name || 'Customer Depot';
}

function getVehiclePlate(trip: BillingLedgerTrip): string {
  return trip.vehicle?.plate_number || (trip as any).vehicle_plate || 'MERCON-FLEET';
}

function getVehicleType(trip: BillingLedgerTrip): string {
  return (trip as any).vehicle_type || trip.vehicle?.asset_type || '10 TON';
}

function getTripRate(trip: BillingLedgerTrip): number {
  if (trip.billing_amount && Number(trip.billing_amount) > 0) return Number(trip.billing_amount);
  if (trip.trip_charges && Number(trip.trip_charges) > 0) return Number(trip.trip_charges);
  if (trip.invoices?.[0]?.total_amount && Number(trip.invoices[0].total_amount) > 0) return Number(trip.invoices[0].total_amount);
  if (trip.rateCard?.base_price && Number(trip.rateCard.base_price) > 0) return Number(trip.rateCard.base_price);
  return 450.00; // fallback standard unit rate
}

function getTripDateFormatted(trip: BillingLedgerTrip, tz: string = DEFAULT_TZ): string {
  const d = trip.planned_start ? new Date(trip.planned_start) : new Date(trip.createdAt);
  if (isNaN(d.getTime())) return '';
  return formatInDeploymentTz(d, tz, 'd MMM yyyy');
}

function getShortDate(trip: BillingLedgerTrip, tz: string = DEFAULT_TZ): string {
  const d = trip.planned_start ? new Date(trip.planned_start) : new Date(trip.createdAt);
  if (isNaN(d.getTime())) return '';
  return formatInDeploymentTz(d, tz, 'd-MMM');
}

export type InvoiceExcelFormat = 'ALL' | 'TRIP_BILLING' | 'TAX_INVOICE' | 'VEHICLE_MONTHLY';

// ─── 1. Build Trip Confirmation Billing Sheet (Template 3 / Extra Trips) ───────
function buildTripBillingSheet(
  workbook: ExcelJS.Workbook,
  row: CustomerBillingRow,
  trips: BillingLedgerTrip[],
  periodLabel: string = 'CURRENT PERIOD',
  tz: string = DEFAULT_TZ
) {
  const sheet = workbook.addWorksheet('Trip Confirmation Billing', {
    views: [{ showGridLines: true }],
  });

  // Title Banner
  const title = `${row.customer.name.toUpperCase()} VEHICLE RENTAL / TRIP BILLING DETAILS OF ${periodLabel.toUpperCase()}`;
  sheet.mergeCells('B2', 'L2');
  const titleCell = sheet.getCell('B2');
  titleCell.value = title;
  titleCell.font = { name: 'Arial', size: 12, bold: true, color: { argb: 'FF0F172A' } };
  titleCell.alignment = { horizontal: 'center', vertical: 'middle' };
  sheet.getRow(2).height = 28;

  // Header Row
  const headerRowIdx = 4;
  const headers = [
    'VENDOR NAME',
    'DATE',
    'FROM',
    'DESTINATION',
    'Rental Method',
    'VEHICLE TYPE',
    'Vehicle Number',
    'UUID / TRIP REF',
    'CHARGES',
    'VAT',
    'INC VAT',
  ];

  const headerRow = sheet.getRow(headerRowIdx);
  headerRow.height = 26;

  headers.forEach((h, i) => {
    const colIdx = i + 2; // Start from Column B
    const cell = headerRow.getCell(colIdx);
    cell.value = h;
    cell.font = { name: 'Arial', size: 10, bold: true, color: { argb: 'FFFFFFFF' } };
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF0070C0' } }; // Vivid Blue Header
    cell.alignment = { horizontal: 'center', vertical: 'middle', wrapText: true };
    cell.border = {
      top: { style: 'thin', color: { argb: 'FF004C82' } },
      bottom: { style: 'medium', color: { argb: 'FF004C82' } },
      left: { style: 'thin', color: { argb: 'FFCBD5E1' } },
      right: { style: 'thin', color: { argb: 'FFCBD5E1' } },
    };
  });

  // Data Rows
  let startDataRow = 5;
  trips.forEach((trip, idx) => {
    const rIdx = startDataRow + idx;
    const r = sheet.getRow(rIdx);
    r.height = 20;

    const basePrice = getTripRate(trip);
    const vat = Math.round(basePrice * 0.15 * 100) / 100;
    const total = Math.round((basePrice + vat) * 100) / 100;
    const rentalMethod = (trip as any).rate_category || 'EXTRA';

    const rowData = [
      trip.carrier_name || 'MERCON',
      getShortDate(trip, tz) || getTripDateFormatted(trip, tz),
      getOrigin(trip),
      getDestination(trip),
      rentalMethod,
      getVehicleType(trip),
      getVehiclePlate(trip),
      trip.ref_id || `TRIP-${idx + 1}`,
      basePrice,
      vat,
      total,
    ];

    rowData.forEach((val, cIdx) => {
      const colIdx = cIdx + 2;
      const cell = r.getCell(colIdx);
      cell.value = val;
      cell.font = { name: 'Arial', size: 9.5, color: { argb: 'FF1E293B' } };
      cell.border = {
        top: { style: 'thin', color: { argb: 'FFE2E8F0' } },
        bottom: { style: 'thin', color: { argb: 'FFE2E8F0' } },
        left: { style: 'thin', color: { argb: 'FFE2E8F0' } },
        right: { style: 'thin', color: { argb: 'FFE2E8F0' } },
      };

      // Alignments & Number formatting
      if (cIdx === 0 || cIdx === 4 || cIdx === 5 || cIdx === 6 || cIdx === 7) {
        cell.alignment = { horizontal: 'center', vertical: 'middle' };
      } else if (cIdx === 1) {
        cell.alignment = { horizontal: 'center', vertical: 'middle' };
      } else if (cIdx === 2 || cIdx === 3) {
        cell.alignment = { horizontal: 'left', vertical: 'middle' };
      } else if (cIdx >= 8) {
        cell.alignment = { horizontal: 'right', vertical: 'middle' };
        cell.numFmt = '#,##0.00';
        if (cIdx === 8) {
          cell.font = { name: 'Arial', size: 9.5, bold: true, color: { argb: 'FFC00000' } }; // Red accent for charges
        }
      }

      // Alternate row shading
      if (idx % 2 === 1) {
        cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF8FAFC' } };
      }
    });
  });

  // Total Summary Row
  const totalRowIdx = startDataRow + trips.length;
  const totalRow = sheet.getRow(totalRowIdx);
  totalRow.height = 24;

  const totalLabelCell = totalRow.getCell(2);
  totalLabelCell.value = 'TOTAL';
  totalLabelCell.font = { name: 'Arial', size: 10, bold: true, color: { argb: 'FF0F172A' } };
  totalLabelCell.alignment = { horizontal: 'center', vertical: 'middle' };

  // Set borders across total row
  for (let c = 2; c <= 12; c++) {
    const cell = totalRow.getCell(c);
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF1F5F9' } };
    cell.border = {
      top: { style: 'medium', color: { argb: 'FF475569' } },
      bottom: { style: 'double', color: { argb: 'FF0F172A' } },
      left: { style: 'thin', color: { argb: 'FFE2E8F0' } },
      right: { style: 'thin', color: { argb: 'FFE2E8F0' } },
    };
  }

  // Formula cells for Charges, VAT, Inc VAT
  const chargesColLetter = 'J'; // CHARGES (col 10)
  const vatColLetter = 'K';     // VAT (col 11)
  const incVatColLetter = 'L';  // INC VAT (col 12)

  const endDataRow = totalRowIdx - 1;
  const dataRangeCharges = `${chargesColLetter}${startDataRow}:${chargesColLetter}${endDataRow}`;
  const dataRangeVat = `${vatColLetter}${startDataRow}:${vatColLetter}${endDataRow}`;
  const dataRangeIncVat = `${incVatColLetter}${startDataRow}:${incVatColLetter}${endDataRow}`;

  const chargesCell = totalRow.getCell(10);
  chargesCell.value = { formula: `SUM(${dataRangeCharges})` };
  chargesCell.numFmt = '#,##0.00';
  chargesCell.font = { name: 'Arial', size: 10, bold: true, color: { argb: 'FFC00000' } };
  chargesCell.alignment = { horizontal: 'right', vertical: 'middle' };

  const vatCell = totalRow.getCell(11);
  vatCell.value = { formula: `SUM(${dataRangeVat})` };
  vatCell.numFmt = '#,##0.00';
  vatCell.font = { name: 'Arial', size: 10, bold: true, color: { argb: 'FF0F172A' } };
  vatCell.alignment = { horizontal: 'right', vertical: 'middle' };

  const incVatCell = totalRow.getCell(12);
  incVatCell.value = { formula: `SUM(${dataRangeIncVat})` };
  incVatCell.numFmt = '#,##0.00';
  incVatCell.font = { name: 'Arial', size: 10, bold: true, color: { argb: 'FF0F172A' } };
  incVatCell.alignment = { horizontal: 'right', vertical: 'middle' };

  // Set Column Widths
  sheet.getColumn(1).width = 4;
  sheet.getColumn(2).width = 16; // Vendor Name
  sheet.getColumn(3).width = 13; // Date
  sheet.getColumn(4).width = 24; // From
  sheet.getColumn(5).width = 28; // Destination
  sheet.getColumn(6).width = 16; // Rental Method
  sheet.getColumn(7).width = 16; // Vehicle Type
  sheet.getColumn(8).width = 18; // Vehicle Number
  sheet.getColumn(9).width = 22; // UUID Number
  sheet.getColumn(10).width = 16; // Charges
  sheet.getColumn(11).width = 14; // VAT
  sheet.getColumn(12).width = 16; // INC VAT
}

// ─── 2. Build Official Tax Invoice Statement Sheet (Template 2 / INV JUNE.xlsm) ───
function buildTaxInvoiceSheet(
  workbook: ExcelJS.Workbook,
  row: CustomerBillingRow,
  trips: BillingLedgerTrip[],
  invoiceNo: string = '092/26/MLS',
  tz: string = DEFAULT_TZ
) {
  const sheet = workbook.addWorksheet('Official Tax Invoice', {
    views: [{ showGridLines: true }],
  });

  const thinBorder: Partial<ExcelJS.Borders> = {
    top: { style: 'thin', color: { argb: 'FF000000' } },
    bottom: { style: 'thin', color: { argb: 'FF000000' } },
    left: { style: 'thin', color: { argb: 'FF000000' } },
    right: { style: 'thin', color: { argb: 'FF000000' } },
  };

  // Header Box Left: Customer Info
  sheet.mergeCells('B2', 'E2');
  const custCell = sheet.getCell('B2');
  custCell.value = `Customer:  ${row.customer.name}`;
  custCell.font = { name: 'Arial', size: 10, bold: true };
  sheet.mergeCells('B3', 'E3');
  sheet.getCell('B3').value = row.customer.contact_email ? `Email: ${row.customer.contact_email}` : 'Corporate Logistics Account';
  sheet.getCell('B3').font = { name: 'Arial', size: 9 };

  sheet.mergeCells('B4', 'E4');
  sheet.getCell('B4').value = `Attention: ${row.customer.contact_phone || 'Accounts Payable'}`;
  sheet.getCell('B4').font = { name: 'Arial', size: 9 };

  sheet.mergeCells('B5', 'E5');
  const custVat = (row.customer as any).vat_number || '3.11677E+14';
  sheet.getCell('B5').value = `Customer VAT No:  ${custVat}`;
  sheet.getCell('B5').font = { name: 'Arial', size: 9, bold: true };

  // Header Box Right: Invoice & MERCON Info
  const todayStr = formatInDeploymentTz(new Date(), tz, 'd/MM/yyyy');
  sheet.mergeCells('F2', 'H2');
  sheet.getCell('F2').value = `Date / التاريخ: ${todayStr}`;
  sheet.getCell('F2').font = { name: 'Arial', size: 9, bold: true };
  sheet.getCell('F2').alignment = { horizontal: 'right' };

  sheet.mergeCells('F3', 'H3');
  sheet.getCell('F3').value = `Invoice No / رقم الفاتورة: ${invoiceNo}`;
  sheet.getCell('F3').font = { name: 'Arial', size: 9, bold: true };
  sheet.getCell('F3').alignment = { horizontal: 'right' };

  sheet.mergeCells('F4', 'H4');
  sheet.getCell('F4').value = `Vendor No / رقم المورد: ${MERCON_INFO.vendorNo}`;
  sheet.getCell('F4').font = { name: 'Arial', size: 9 };
  sheet.getCell('F4').alignment = { horizontal: 'right' };

  sheet.mergeCells('F5', 'H5');
  sheet.getCell('F5').value = `VAT No / الرقم الضريبي: ${MERCON_INFO.vatNo}`;
  sheet.getCell('F5').font = { name: 'Arial', size: 9, bold: true };
  sheet.getCell('F5').alignment = { horizontal: 'right' };

  // Apply outer borders to header block
  for (let r = 2; r <= 5; r++) {
    for (let c = 2; c <= 8; c++) {
      sheet.getCell(r, c).border = {
        top: r === 2 ? { style: 'thin', color: { argb: 'FF000000' } } : undefined,
        bottom: r === 5 ? { style: 'thin', color: { argb: 'FF000000' } } : undefined,
        left: c === 2 ? { style: 'thin', color: { argb: 'FF000000' } } : undefined,
        right: c === 8 ? { style: 'thin', color: { argb: 'FF000000' } } : undefined,
      };
    }
  }

  // Invoice Items Table Header
  const tableHeaderRow = 7;
  const tableHeaders = [
    { label: 'No\nالرقم', col: 2 },
    { label: 'Date\nالتاريخ', col: 3 },
    { label: 'Description\nوصف', col: 4 },
    { label: 'TWB No\nرقم بيان', col: 5 },
    { label: 'Shipment\nشحنة', col: 6 },
    { label: 'VAT 15%\nضريبة القيمة المضافة', col: 7 },
    { label: 'Total Amount\nالمبلغ الإجمالي', col: 8 },
  ];

  sheet.getRow(tableHeaderRow).height = 30;
  tableHeaders.forEach(th => {
    const cell = sheet.getCell(tableHeaderRow, th.col);
    cell.value = th.label;
    cell.font = { name: 'Arial', size: 9, bold: true, color: { argb: 'FF000000' } };
    cell.alignment = { horizontal: 'center', vertical: 'middle', wrapText: true };
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF1F5F9' } };
    cell.border = thinBorder;
  });

  // Table Rows
  let startItemRow = 8;
  let totalShipment = 0;
  let totalVat = 0;

  trips.forEach((trip, idx) => {
    const rIdx = startItemRow + idx;
    const rowObj = sheet.getRow(rIdx);
    rowObj.height = 20;

    const basePrice = getTripRate(trip);
    const vat = Math.round(basePrice * 0.15 * 100) / 100;
    const total = Math.round((basePrice + vat) * 100) / 100;
    totalShipment += basePrice;
    totalVat += vat;

    const desc = `${getVehicleType(trip)} ${getOrigin(trip)} TO ${getDestination(trip)}`.toUpperCase();
    const twbNo = trip.ref_id || getVehiclePlate(trip);

    sheet.getCell(rIdx, 2).value = idx + 1;
    sheet.getCell(rIdx, 3).value = getTripDateFormatted(trip, tz);
    sheet.getCell(rIdx, 4).value = desc;
    sheet.getCell(rIdx, 5).value = twbNo;
    sheet.getCell(rIdx, 6).value = basePrice;
    sheet.getCell(rIdx, 7).value = vat;
    sheet.getCell(rIdx, 8).value = total;

    // Format table cells
    for (let c = 2; c <= 8; c++) {
      const cell = sheet.getCell(rIdx, c);
      cell.font = { name: 'Arial', size: 9, color: { argb: 'FF000000' } };
      cell.border = thinBorder;

      if (c === 2 || c === 3 || c === 5) {
        cell.alignment = { horizontal: 'center', vertical: 'middle' };
      } else if (c === 4) {
        cell.alignment = { horizontal: 'left', vertical: 'middle' };
      } else if (c >= 6) {
        cell.alignment = { horizontal: 'right', vertical: 'middle' };
        cell.numFmt = '#,##0.00';
      }
    }
  });

  const grandTotal = totalShipment + totalVat;
  const currentR = startItemRow + trips.length;

  // Sub Total Row
  sheet.mergeCells(currentR, 2, currentR, 5);
  sheet.getCell(currentR, 2).value = 'Sub Total';
  sheet.getCell(currentR, 2).font = { name: 'Arial', size: 9.5, bold: true };
  sheet.getCell(currentR, 2).alignment = { horizontal: 'right', vertical: 'middle' };
  sheet.getCell(currentR, 6).value = { formula: `SUM(F${startItemRow}:F${currentR - 1})` };
  sheet.getCell(currentR, 6).numFmt = '#,##0.00';
  sheet.getCell(currentR, 6).font = { name: 'Arial', size: 9.5, bold: true };
  sheet.getCell(currentR, 6).alignment = { horizontal: 'right' };
  sheet.getCell(currentR, 7).value = { formula: `SUM(G${startItemRow}:G${currentR - 1})` };
  sheet.getCell(currentR, 7).numFmt = '#,##0.00';
  sheet.getCell(currentR, 7).font = { name: 'Arial', size: 9.5, bold: true };
  sheet.getCell(currentR, 7).alignment = { horizontal: 'right' };
  sheet.getCell(currentR, 8).value = { formula: `SUM(H${startItemRow}:H${currentR - 1})` };
  sheet.getCell(currentR, 8).numFmt = '#,##0.00';
  sheet.getCell(currentR, 8).font = { name: 'Arial', size: 9.5, bold: true };
  sheet.getCell(currentR, 8).alignment = { horizontal: 'right' };

  for (let c = 2; c <= 8; c++) sheet.getCell(currentR, c).border = thinBorder;

  // VAT 15% Label Row
  const vatR = currentR + 1;
  sheet.mergeCells(vatR, 2, vatR, 5);
  sheet.getCell(vatR, 2).value = 'VAT 15%  /  الضريبة';
  sheet.getCell(vatR, 2).font = { name: 'Arial', size: 9.5, bold: true };
  sheet.getCell(vatR, 2).alignment = { horizontal: 'right', vertical: 'middle' };
  sheet.getCell(vatR, 6).value = '';
  sheet.getCell(vatR, 7).value = { formula: `F${currentR}*0.15` };
  sheet.getCell(vatR, 7).numFmt = '#,##0.00';
  sheet.getCell(vatR, 7).font = { name: 'Arial', size: 9.5, bold: true };
  sheet.getCell(vatR, 7).alignment = { horizontal: 'right' };
  sheet.getCell(vatR, 8).value = { formula: `F${currentR}*0.15` };
  sheet.getCell(vatR, 8).numFmt = '#,##0.00';
  sheet.getCell(vatR, 8).font = { name: 'Arial', size: 9.5, bold: true };
  sheet.getCell(vatR, 8).alignment = { horizontal: 'right' };
  for (let c = 2; c <= 8; c++) sheet.getCell(vatR, c).border = thinBorder;

  // Amount in Words Rows
  const engWordsR = vatR + 1;
  sheet.mergeCells(engWordsR, 2, engWordsR, 6);
  sheet.getCell(engWordsR, 2).value = convertAmountToEnglishWords(grandTotal);
  sheet.getCell(engWordsR, 2).font = { name: 'Arial', size: 9, italic: true };
  sheet.getCell(engWordsR, 7).value = 'TOTAL';
  sheet.getCell(engWordsR, 7).font = { name: 'Arial', size: 10, bold: true };
  sheet.getCell(engWordsR, 7).alignment = { horizontal: 'center' };
  sheet.getCell(engWordsR, 8).value = `SAR ${grandTotal.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  sheet.getCell(engWordsR, 8).font = { name: 'Arial', size: 10, bold: true };
  sheet.getCell(engWordsR, 8).alignment = { horizontal: 'right' };
  for (let c = 2; c <= 8; c++) sheet.getCell(engWordsR, c).border = thinBorder;

  const arWordsR = engWordsR + 1;
  sheet.mergeCells(arWordsR, 2, arWordsR, 6);
  sheet.getCell(arWordsR, 2).value = convertAmountToArabicWords(grandTotal);
  sheet.getCell(arWordsR, 2).font = { name: 'Arial', size: 9, italic: true };
  sheet.getCell(arWordsR, 2).alignment = { horizontal: 'right' };
  sheet.getCell(arWordsR, 7).value = 'الإجمالي';
  sheet.getCell(arWordsR, 7).font = { name: 'Arial', size: 10, bold: true };
  sheet.getCell(arWordsR, 7).alignment = { horizontal: 'center' };
  sheet.getCell(arWordsR, 8).value = grandTotal;
  sheet.getCell(arWordsR, 8).numFmt = '#,##0.00';
  sheet.getCell(arWordsR, 8).font = { name: 'Arial', size: 10, bold: true };
  sheet.getCell(arWordsR, 8).alignment = { horizontal: 'right' };
  for (let c = 2; c <= 8; c++) sheet.getCell(arWordsR, c).border = thinBorder;

  // Thank you note
  const thanksR = arWordsR + 2;
  sheet.mergeCells(thanksR, 2, thanksR, 8);
  sheet.getCell(thanksR, 2).value = 'Thank you for your business through Mercon logistics services - We appreciate your business!!';
  sheet.getCell(thanksR, 2).font = { name: 'Arial', size: 9.5, italic: true, bold: true, color: { argb: 'FF1E293B' } };
  sheet.getCell(thanksR, 2).alignment = { horizontal: 'center' };

  // Bank Details Block
  const bankR = thanksR + 2;
  sheet.mergeCells(bankR, 2, bankR, 4);
  sheet.getCell(bankR, 2).value = 'Bank Details';
  sheet.getCell(bankR, 2).font = { name: 'Arial', size: 9.5, bold: true };
  sheet.mergeCells(bankR, 5, bankR, 8);
  sheet.getCell(bankR, 5).value = `Bank Name: ${MERCON_INFO.bankName}`;
  sheet.getCell(bankR, 5).font = { name: 'Arial', size: 9.5, bold: true };

  sheet.mergeCells(bankR + 1, 2, bankR + 1, 4);
  sheet.getCell(bankR + 1, 2).value = `Beneficiary Name : ${MERCON_INFO.beneficiary}`;
  sheet.getCell(bankR + 1, 2).font = { name: 'Arial', size: 9 };
  sheet.mergeCells(bankR + 1, 5, bankR + 1, 8);
  sheet.getCell(bankR + 1, 5).value = `Account No: ${MERCON_INFO.accountNo}`;
  sheet.getCell(bankR + 1, 5).font = { name: 'Arial', size: 9 };

  sheet.mergeCells(bankR + 2, 2, bankR + 2, 8);
  sheet.getCell(bankR + 2, 2).value = `IBAN: ${MERCON_INFO.iban}`;
  sheet.getCell(bankR + 2, 2).font = { name: 'Arial', size: 9, bold: true };

  for (let r = bankR; r <= bankR + 2; r++) {
    for (let c = 2; c <= 8; c++) sheet.getCell(r, c).border = thinBorder;
  }

  // Signatures Row
  const sigR = bankR + 4;
  sheet.mergeCells(sigR, 2, sigR, 4);
  sheet.getCell(sigR, 2).value = 'Received BY:\nDate:';
  sheet.getCell(sigR, 2).font = { name: 'Arial', size: 9 };
  sheet.mergeCells(sigR, 5, sigR, 8);
  sheet.getCell(sigR, 5).value = 'Accounts Manager:\nDate:';
  sheet.getCell(sigR, 5).font = { name: 'Arial', size: 9 };
  for (let c = 2; c <= 8; c++) sheet.getCell(sigR, c).border = thinBorder;

  // Column Widths
  sheet.getColumn(1).width = 4;
  sheet.getColumn(2).width = 6;  // No
  sheet.getColumn(3).width = 14; // Date
  sheet.getColumn(4).width = 34; // Description
  sheet.getColumn(5).width = 18; // TWB No
  sheet.getColumn(6).width = 15; // Shipment
  sheet.getColumn(7).width = 15; // VAT
  sheet.getColumn(8).width = 18; // Total Amount
}

// ─── 3. Build Monthly Vehicle Summary Sheet (Template 1 / Red Header) ─────────
function buildMonthlyVehicleSheet(
  workbook: ExcelJS.Workbook,
  row: CustomerBillingRow,
  trips: BillingLedgerTrip[]
) {
  const sheet = workbook.addWorksheet('Monthly Vehicle Rental', {
    views: [{ showGridLines: true }],
  });

  const headers = [
    'Plate',
    'Type of vehicle',
    'Vendor',
    'Status',
    'Monthly Rate',
    'Cooling/Dry',
    'From',
    'To',
    'Using For',
    'NO OF Vehicles',
    'Used Days / Trips',
    'Price',
    'Vat',
    'Total',
  ];

  const headerRowIdx = 2;
  const headerRow = sheet.getRow(headerRowIdx);
  headerRow.height = 26;

  headers.forEach((h, i) => {
    const colIdx = i + 2;
    const cell = headerRow.getCell(colIdx);
    cell.value = h;
    cell.font = { name: 'Arial', size: 9.5, bold: true, color: { argb: 'FFFFFFFF' } };
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFC00000' } }; // Red Header
    cell.alignment = { horizontal: 'center', vertical: 'middle', wrapText: true };
    cell.border = {
      top: { style: 'thin', color: { argb: 'FF800000' } },
      bottom: { style: 'medium', color: { argb: 'FF800000' } },
      left: { style: 'thin', color: { argb: 'FFCBD5E1' } },
      right: { style: 'thin', color: { argb: 'FFCBD5E1' } },
    };
  });

  // Group trips by Vehicle Plate or Route
  const vehicleMap = new Map<string, {
    plate: string;
    vehicleType: string;
    origin: string;
    destination: string;
    status: string;
    cargoType: string;
    usingFor: string;
    tripCount: number;
    totalPrice: number;
  }>();

  trips.forEach(t => {
    const plate = getVehiclePlate(t);
    const origin = getOrigin(t);
    const dest = getDestination(t);
    const key = `${plate}_${origin}_${dest}`;

    const price = getTripRate(t);
    const existing = vehicleMap.get(key);
    if (existing) {
      existing.tripCount += 1;
      existing.totalPrice += price;
    } else {
      vehicleMap.set(key, {
        plate,
        vehicleType: getVehicleType(t),
        origin,
        destination: dest,
        status: t.status === 'Invoiced' ? 'Active' : 'Pending',
        cargoType: (t as any).cargo_type?.toLowerCase().includes('cool') ? 'Cooling' : 'Dry',
        usingFor: (t as any).rate_category || 'Branch-Line',
        tripCount: 1,
        totalPrice: price,
      });
    }
  });

  let startDataRow = 3;
  const groups = Array.from(vehicleMap.values());

  groups.forEach((g, idx) => {
    const rIdx = startDataRow + idx;
    const r = sheet.getRow(rIdx);
    r.height = 20;

    const basePrice = g.totalPrice;
    const vat = Math.round(basePrice * 0.15 * 100) / 100;
    const total = Math.round((basePrice + vat) * 100) / 100;

    const rowData = [
      g.plate,
      g.vehicleType,
      'MERCON',
      g.status,
      basePrice,
      g.cargoType,
      g.origin,
      g.destination,
      g.usingFor,
      1,
      g.tripCount,
      basePrice,
      vat,
      total,
    ];

    rowData.forEach((val, cIdx) => {
      const colIdx = cIdx + 2;
      const cell = r.getCell(colIdx);
      cell.value = val;
      cell.font = { name: 'Arial', size: 9, color: { argb: 'FF1E293B' } };
      cell.border = {
        top: { style: 'thin', color: { argb: 'FFE2E8F0' } },
        bottom: { style: 'thin', color: { argb: 'FFE2E8F0' } },
        left: { style: 'thin', color: { argb: 'FFE2E8F0' } },
        right: { style: 'thin', color: { argb: 'FFE2E8F0' } },
      };

      if (cIdx === 0 || cIdx === 1 || cIdx === 2 || cIdx === 3 || cIdx === 5 || cIdx === 8 || cIdx === 9 || cIdx === 10) {
        cell.alignment = { horizontal: 'center', vertical: 'middle' };
      } else if (cIdx === 6 || cIdx === 7) {
        cell.alignment = { horizontal: 'left', vertical: 'middle' };
      } else if (cIdx === 4 || cIdx >= 11) {
        cell.alignment = { horizontal: 'right', vertical: 'middle' };
        cell.numFmt = '#,##0.00';
      }

      if (idx % 2 === 1) {
        cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF8FAFC' } };
      }
    });
  });

  // Total Summary Row
  const totalRowIdx = startDataRow + groups.length;
  const totalRow = sheet.getRow(totalRowIdx);
  totalRow.height = 24;

  const totalLabelCell = totalRow.getCell(2);
  totalLabelCell.value = 'TOTAL';
  totalLabelCell.font = { name: 'Arial', size: 9.5, bold: true };
  totalLabelCell.alignment = { horizontal: 'center', vertical: 'middle' };

  for (let c = 2; c <= 15; c++) {
    const cell = totalRow.getCell(c);
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF1F5F9' } };
    cell.border = {
      top: { style: 'medium', color: { argb: 'FF475569' } },
      bottom: { style: 'double', color: { argb: 'FF0F172A' } },
      left: { style: 'thin', color: { argb: 'FFE2E8F0' } },
      right: { style: 'thin', color: { argb: 'FFE2E8F0' } },
    };
  }

  const endDataRow = totalRowIdx - 1;
  const priceCell = totalRow.getCell(13);
  priceCell.value = { formula: `SUM(M${startDataRow}:M${endDataRow})` };
  priceCell.numFmt = '#,##0.00';
  priceCell.font = { name: 'Arial', size: 9.5, bold: true };
  priceCell.alignment = { horizontal: 'right' };

  const vatCell = totalRow.getCell(14);
  vatCell.value = { formula: `SUM(N${startDataRow}:N${endDataRow})` };
  vatCell.numFmt = '#,##0.00';
  vatCell.font = { name: 'Arial', size: 9.5, bold: true };
  vatCell.alignment = { horizontal: 'right' };

  const totalCell = totalRow.getCell(15);
  totalCell.value = { formula: `SUM(O${startDataRow}:O${endDataRow})` };
  totalCell.numFmt = '#,##0.00';
  totalCell.font = { name: 'Arial', size: 9.5, bold: true };
  totalCell.alignment = { horizontal: 'right' };

  // Set Column Widths
  sheet.getColumn(1).width = 4;
  sheet.getColumn(2).width = 16; // Plate
  sheet.getColumn(3).width = 14; // Type of vehicle
  sheet.getColumn(4).width = 12; // Vendor
  sheet.getColumn(5).width = 12; // Status
  sheet.getColumn(6).width = 14; // Monthly Rate
  sheet.getColumn(7).width = 13; // Cooling/Dry
  sheet.getColumn(8).width = 16; // From
  sheet.getColumn(9).width = 16; // To
  sheet.getColumn(10).width = 15; // Using For
  sheet.getColumn(11).width = 14; // NO OF Vehicles
  sheet.getColumn(12).width = 16; // Used Days
  sheet.getColumn(13).width = 15; // Price
  sheet.getColumn(14).width = 13; // Vat
  sheet.getColumn(15).width = 16; // Total
}

// ─── Main Export Function ─────────────────────────────────────────────────────
export async function exportCustomerInvoiceExcel(
  row: CustomerBillingRow,
  trips: BillingLedgerTrip[],
  format: InvoiceExcelFormat = 'ALL',
  periodLabel: string = 'Current Billing Period',
  tz: string = DEFAULT_TZ
) {
  if (!row || !trips || trips.length === 0) return;

  const workbook = new ExcelJS.Workbook();
  workbook.creator = 'MERCON Logistics Invoicing Module';
  workbook.created = new Date();

  const safeCustomerName = row.customer.name.replace(/[\\*?:/[\]]/g, '_').trim();
  const dateSuffix = new Date().toISOString().slice(0, 10);

  if (format === 'ALL' || format === 'TRIP_BILLING') {
    buildTripBillingSheet(workbook, row, trips, periodLabel, tz);
  }
  if (format === 'ALL' || format === 'TAX_INVOICE') {
    const invNo = `INV/${new Date().getFullYear()}/${row.customer.name.slice(0, 3).toUpperCase()}-${trips.length}`;
    buildTaxInvoiceSheet(workbook, row, trips, invNo, tz);
  }
  if (format === 'ALL' || format === 'VEHICLE_MONTHLY') {
    buildMonthlyVehicleSheet(workbook, row, trips);
  }

  const filename = format === 'TRIP_BILLING'
    ? `${safeCustomerName}_Trip_Billing_${dateSuffix}.xlsx`
    : format === 'TAX_INVOICE'
    ? `${safeCustomerName}_Tax_Invoice_${dateSuffix}.xlsx`
    : format === 'VEHICLE_MONTHLY'
    ? `${safeCustomerName}_Monthly_Vehicle_Rental_${dateSuffix}.xlsx`
    : `${safeCustomerName}_Invoice_Statement_Package_${dateSuffix}.xlsx`;

  const buffer = await workbook.xlsx.writeBuffer();
  const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.setAttribute('download', filename);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

// ─── Export All Ledger Companies to Excel ─────────────────────────────────────
export async function exportAllLedgerExcel(rows: CustomerBillingRow[], tz: string = DEFAULT_TZ) {
  if (!rows || rows.length === 0) return;

  const workbook = new ExcelJS.Workbook();
  workbook.creator = 'MERCON Logistics Invoicing Module';
  workbook.created = new Date();

  // Sheet 1: Master Company Billing Ledger
  const summarySheet = workbook.addWorksheet('Company Ledger Summary', {
    views: [{ showGridLines: true }],
  });

  const headers = [
    'Company Name',
    'Contact Phone',
    'Total Trips',
    'Completed (Pending)',
    'Invoiced Trips',
    'Total Estimated Amount (SAR)',
  ];

  summarySheet.mergeCells('B2', 'G2');
  const titleCell = summarySheet.getCell('B2');
  titleCell.value = 'MERCON LOGISTICS - MASTER COMPANY BILLING LEDGER';
  titleCell.font = { name: 'Arial', size: 12, bold: true, color: { argb: 'FF0F172A' } };
  titleCell.alignment = { horizontal: 'center', vertical: 'middle' };
  summarySheet.getRow(2).height = 28;

  const headerRow = summarySheet.getRow(4);
  headerRow.height = 24;
  headers.forEach((h, i) => {
    const cell = headerRow.getCell(i + 2);
    cell.value = h;
    cell.font = { name: 'Arial', size: 10, bold: true, color: { argb: 'FFFFFFFF' } };
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFE8450F' } }; // MERCON Orange
    cell.alignment = { horizontal: 'center', vertical: 'middle' };
    cell.border = {
      top: { style: 'thin', color: { argb: 'FFB93A0C' } },
      bottom: { style: 'medium', color: { argb: 'FFB93A0C' } },
      left: { style: 'thin', color: { argb: 'FFCBD5E1' } },
      right: { style: 'thin', color: { argb: 'FFCBD5E1' } },
    };
  });

  let rIdx = 5;
  rows.forEach((r, idx) => {
    const rowObj = summarySheet.getRow(rIdx);
    rowObj.height = 20;

    let companyTotal = 0;
    r.trips.forEach(t => { companyTotal += getTripRate(t); });

    const rowData = [
      r.customer.name,
      r.customer.contact_phone || '—',
      r.total_trips,
      r.completed,
      r.invoiced,
      companyTotal,
    ];

    rowData.forEach((val, cIdx) => {
      const cell = rowObj.getCell(cIdx + 2);
      cell.value = val;
      cell.font = { name: 'Arial', size: 9.5, color: { argb: 'FF1E293B' } };
      cell.border = {
        top: { style: 'thin', color: { argb: 'FFE2E8F0' } },
        bottom: { style: 'thin', color: { argb: 'FFE2E8F0' } },
        left: { style: 'thin', color: { argb: 'FFE2E8F0' } },
        right: { style: 'thin', color: { argb: 'FFE2E8F0' } },
      };

      if (cIdx === 0) cell.alignment = { horizontal: 'left', vertical: 'middle' };
      else if (cIdx === 1) cell.alignment = { horizontal: 'center', vertical: 'middle' };
      else if (cIdx >= 2 && cIdx <= 4) cell.alignment = { horizontal: 'center', vertical: 'middle' };
      else if (cIdx === 5) {
        cell.alignment = { horizontal: 'right', vertical: 'middle' };
        cell.numFmt = '#,##0.00';
      }

      if (idx % 2 === 1) {
        cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF8FAFC' } };
      }
    });
    rIdx++;
  });

  summarySheet.getColumn(1).width = 4;
  summarySheet.getColumn(2).width = 28;
  summarySheet.getColumn(3).width = 18;
  summarySheet.getColumn(4).width = 14;
  summarySheet.getColumn(5).width = 20;
  summarySheet.getColumn(6).width = 16;
  summarySheet.getColumn(7).width = 28;

  // Sheet 2: All Itemized Trips
  const allTrips: BillingLedgerTrip[] = [];
  rows.forEach(r => allTrips.push(...r.trips));
  buildTripBillingSheet(workbook, { customer: { id: 'all', name: 'ALL CUSTOMERS' } } as any, allTrips, 'ALL TIME', tz);

  const filename = `MERCON_Company_Billing_Ledger_${new Date().toISOString().slice(0, 10)}.xlsx`;
  const buffer = await workbook.xlsx.writeBuffer();
  const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.setAttribute('download', filename);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

