const fs = require('fs');
const path = require('path');
const ExcelJS = require('exceljs');

const data = JSON.parse(fs.readFileSync(path.join(__dirname, 'inspect_simple.json'), 'utf8'));

const drivers = data.drivers;
const docs = data.docs;
const today = new Date('2026-08-25T00:00:00.000Z');

const formatDate = (dStr) => {
  if (!dStr) return 'N/A';
  return dStr.split('T')[0];
};

const calcDays = (dStr) => {
  if (!dStr) return null;
  const expD = new Date(dStr);
  return Math.ceil((expD.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
};

const getNumericBadge = (days) => {
  if (days === null) return { code: 0, label: '0 (Valid)', status: 'Valid' };
  if (days < 0) return { code: 1, label: `1 (Expired: ${Math.abs(days)}d ago)`, status: 'Expired' };
  if (days <= 60) return { code: 2, label: `2 (About to Expire: ${days}d left)`, status: 'About to Expire' };
  return { code: 0, label: `0 (Valid: ${days}d left)`, status: 'Valid' };
};

// Process driver audit list
const auditList = drivers.map(d => {
  const dDocs = docs.filter(doc => doc.entity_id === d.id);

  const findDoc = (typeNames) => {
    const matched = dDocs.filter(doc => {
      const name = (doc.doc_type_name || doc.doc_type_code || doc.doc_type || '').toLowerCase();
      return typeNames.some(t => name.includes(t.toLowerCase()));
    });
    if (matched.length === 0) return null;
    matched.sort((a, b) => new Date(b.expiry_date || 0) - new Date(a.expiry_date || 0));
    return matched[0];
  };

  const licenseDoc = findDoc(['driverlicense', 'license', 'driver license']);
  const iqamaDoc = findDoc(['iqama', 'icama']);
  const cardDoc = findDoc(['drivercard', 'driver card', 'card']);
  const passportDoc = findDoc(['passport']);

  const licenseExp = licenseDoc?.expiry_date || (d.license_expiry ? d.license_expiry : null);
  const licenseDays = calcDays(licenseExp);
  const licenseInfo = {
    number: d.license_number || 'N/A',
    expiry: formatDate(licenseExp),
    daysLeft: licenseDays,
    badge: getNumericBadge(licenseDays)
  };

  const iqamaExp = iqamaDoc?.expiry_date;
  const iqamaDays = calcDays(iqamaExp);
  const iqamaInfo = {
    expiry: formatDate(iqamaExp),
    daysLeft: iqamaDays,
    badge: getNumericBadge(iqamaDays)
  };

  const cardExp = cardDoc?.expiry_date;
  const cardDays = calcDays(cardExp);
  const cardInfo = {
    expiry: formatDate(cardExp),
    daysLeft: cardDays,
    badge: getNumericBadge(cardDays)
  };

  const passportExp = passportDoc?.expiry_date;
  const passportDays = calcDays(passportExp);
  const passportInfo = {
    expiry: formatDate(passportExp),
    daysLeft: passportDays,
    badge: getNumericBadge(passportDays)
  };

  const codes = [licenseInfo.badge.code, iqamaInfo.badge.code, cardInfo.badge.code, passportInfo.badge.code];
  let overallCode = 0;
  let overallLabel = '0 (Compliant)';

  if (codes.includes(1)) {
    overallCode = 1;
    overallLabel = '1 (Contains Expired Docs)';
  } else if (codes.includes(2)) {
    overallCode = 2;
    overallLabel = '2 (Contains Docs About to Expire)';
  }

  return {
    id: d.id,
    ref_id: d.ref_id || 'N/A',
    name: `${d.first_name || ''} ${d.last_name || ''}`.trim(),
    phone: d.phone_primary || 'N/A',
    vehicle: d.assigned_vehicle || 'Unassigned',
    status: d.status || 'Available',
    license: licenseInfo,
    iqama: iqamaInfo,
    card: cardInfo,
    passport: passportInfo,
    overallCode,
    overallLabel
  };
});

// Build Excel Workbook
const wb = new ExcelJS.Workbook();
wb.creator = 'MERCON Logistics Engine';
wb.created = new Date();

// -------------------------------------------------------------
// SHEET 1: NAMED "Sheet 1" (AS EXPLICITLY REQUESTED)
// -------------------------------------------------------------
const sheet1 = wb.addWorksheet('Sheet 1', { views: [{ showGridLines: true }] });

// Title Block
sheet1.mergeCells('A1:O1');
const titleCell = sheet1.getCell('A1');
titleCell.value = '🚚 MERCON DRIVER DOCUMENTS AUDIT (1 = EXPIRED | 2 = ABOUT TO EXPIRE)';
titleCell.font = { name: 'Calibri', size: 15, bold: true, color: { argb: 'FFFFFFFF' } };
titleCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF1E293B' } };
titleCell.alignment = { horizontal: 'left', vertical: 'middle', indent: 1 };
sheet1.getRow(1).height = 36;

// Subtitle Legend
sheet1.mergeCells('A2:O2');
const subCell = sheet1.getCell('A2');
subCell.value = `Audit Date: 2026-08-25  |  STATUS CODES:  [ 1 ] = Expired Document  |  [ 2 ] = About to Expire (<= 60 days)  |  [ 0 ] = Valid Document`;
subCell.font = { name: 'Calibri', size: 10, bold: true, color: { argb: 'FF0F172A' } };
subCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFE2E8F0' } };
subCell.alignment = { horizontal: 'left', vertical: 'middle', indent: 1 };
sheet1.getRow(2).height = 24;

sheet1.addRow([]);

const headers1 = [
  'Ref ID',
  'Driver Name',
  'Phone Number',
  'Assigned Vehicle',
  'Driver Status',
  'Overall Code',
  'License Number',
  'License Expiry',
  'License Code (1/2)',
  'IQAMA Expiry',
  'IQAMA Code (1/2)',
  'Driver Card Expiry',
  'Card Code (1/2)',
  'Passport Expiry',
  'Passport Code (1/2)'
];

const hRow1 = sheet1.addRow(headers1);
hRow1.height = 28;
hRow1.eachCell(cell => {
  cell.font = { name: 'Calibri', size: 11, bold: true, color: { argb: 'FFFFFFFF' } };
  cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF0F172A' } };
  cell.alignment = { horizontal: 'center', vertical: 'middle', wrapText: true };
  cell.border = {
    top: { style: 'thin', color: { argb: 'FF334155' } },
    bottom: { style: 'medium', color: { argb: 'FF0284C7' } },
    left: { style: 'thin', color: { argb: 'FF334155' } },
    right: { style: 'thin', color: { argb: 'FF334155' } }
  };
});

auditList.forEach(a => {
  const row = sheet1.addRow([
    a.ref_id,
    a.name,
    a.phone,
    a.vehicle,
    a.status,
    a.overallLabel,
    a.license.number,
    a.license.expiry,
    a.license.badge.label,
    a.iqama.expiry,
    a.iqama.badge.label,
    a.card.expiry,
    a.card.badge.label,
    a.passport.expiry,
    a.passport.badge.label
  ]);
  row.height = 24;

  row.eachCell((cell, colIdx) => {
    cell.font = { name: 'Calibri', size: 10 };
    cell.alignment = { vertical: 'middle' };
    cell.border = {
      top: { style: 'thin', color: { argb: 'FFE2E8F0' } },
      bottom: { style: 'thin', color: { argb: 'FFE2E8F0' } },
      left: { style: 'thin', color: { argb: 'FFE2E8F0' } },
      right: { style: 'thin', color: { argb: 'FFE2E8F0' } }
    };

    if ([1, 3, 4, 5, 7, 8, 10, 12, 14].includes(colIdx)) {
      cell.alignment = { horizontal: 'center', vertical: 'middle' };
    }

    if (colIdx === 6) {
      cell.alignment = { horizontal: 'center', vertical: 'middle' };
      cell.font = { name: 'Calibri', size: 10, bold: true };
      if (a.overallCode === 1) {
        cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFEE2E2' } };
        cell.font = { ...cell.font, color: { argb: 'FFB91C1C' } };
      } else if (a.overallCode === 2) {
        cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFEF3C7' } };
        cell.font = { ...cell.font, color: { argb: 'FFB45309' } };
      } else {
        cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFDCFCE7' } };
        cell.font = { ...cell.font, color: { argb: 'FF15803D' } };
      }
    }

    if ([9, 11, 13, 15].includes(colIdx)) {
      const val = String(cell.value || '');
      cell.alignment = { horizontal: 'center', vertical: 'middle' };
      if (val.startsWith('1')) {
        cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFEE2E2' } };
        cell.font = { name: 'Calibri', size: 10, bold: true, color: { argb: 'FF991B1B' } };
      } else if (val.startsWith('2')) {
        cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFEF3C7' } };
        cell.font = { name: 'Calibri', size: 10, bold: true, color: { argb: 'FFD97706' } };
      } else {
        cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF0FDF4' } };
        cell.font = { name: 'Calibri', size: 10, color: { argb: 'FF166534' } };
      }
    }
  });
});

sheet1.columns.forEach((col, idx) => {
  let maxLen = headers1[idx] ? headers1[idx].length : 12;
  col.eachCell?.({ includeEmpty: false }, c => {
    const s = c.value ? c.value.toString() : '';
    if (s.length > maxLen) maxLen = s.length;
  });
  col.width = Math.min(Math.max(maxLen + 3, 14), 36);
});

// -------------------------------------------------------------
// TAB 2: EXPIRED DOCS (CODE 1)
// -------------------------------------------------------------
const sheet2 = wb.addWorksheet('Expired Docs (Code 1)', { views: [{ showGridLines: true }] });

sheet2.mergeCells('A1:G1');
const t2 = sheet2.getCell('A1');
t2.value = '🚨 EXPIRED DOCUMENTS (CODE 1) - IMMEDIATE ACTION REQUIRED';
t2.font = { name: 'Calibri', size: 14, bold: true, color: { argb: 'FFFFFFFF' } };
t2.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFB91C1C' } };
t2.alignment = { horizontal: 'left', vertical: 'middle', indent: 1 };
sheet2.getRow(1).height = 36;

const headers2 = ['Ref ID', 'Driver Name', 'Phone Number', 'Document Type', 'Status Code', 'Expiry Date', 'Days Expired'];
const hRow2 = sheet2.addRow(headers2);
hRow2.height = 26;
hRow2.eachCell(cell => {
  cell.font = { name: 'Calibri', size: 11, bold: true, color: { argb: 'FFFFFFFF' } };
  cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF991B1B' } };
  cell.alignment = { horizontal: 'center', vertical: 'middle' };
});

auditList.forEach(a => {
  const docsList = [
    { name: 'Driver License', info: a.license },
    { name: 'IQAMA / Icama', info: a.iqama },
    { name: 'Driver Card', info: a.card },
    { name: 'Passport', info: a.passport }
  ];

  docsList.forEach(d => {
    if (d.info.badge.code === 1) {
      const row = sheet2.addRow([
        a.ref_id,
        a.name,
        a.phone,
        d.name,
        1,
        d.info.expiry,
        `${Math.abs(d.info.daysLeft)} days ago`
      ]);
      row.height = 22;
      row.eachCell((cell, idx) => {
        cell.font = { name: 'Calibri', size: 10 };
        cell.border = {
          top: { style: 'thin', color: { argb: 'FFE2E8F0' } },
          bottom: { style: 'thin', color: { argb: 'FFE2E8F0' } },
          left: { style: 'thin', color: { argb: 'FFE2E8F0' } },
          right: { style: 'thin', color: { argb: 'FFE2E8F0' } }
        };
        if ([1, 3, 5, 6, 7].includes(idx)) cell.alignment = { horizontal: 'center', vertical: 'middle' };
        if (idx === 5) {
          cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFEE2E2' } };
          cell.font = { name: 'Calibri', size: 10, bold: true, color: { argb: 'FF991B1B' } };
        }
      });
    }
  });
});

sheet2.columns.forEach((col, idx) => {
  let maxLen = headers2[idx] ? headers2[idx].length : 12;
  col.eachCell?.({ includeEmpty: false }, c => {
    const s = c.value ? c.value.toString() : '';
    if (s.length > maxLen) maxLen = s.length;
  });
  col.width = Math.min(Math.max(maxLen + 4, 14), 36);
});

// -------------------------------------------------------------
// TAB 3: ABOUT TO EXPIRE (CODE 2)
// -------------------------------------------------------------
const sheet3 = wb.addWorksheet('About To Expire (Code 2)', { views: [{ showGridLines: true }] });

sheet3.mergeCells('A1:G1');
const t3 = sheet3.getCell('A1');
t3.value = '⏳ DOCUMENTS ABOUT TO EXPIRE (CODE 2) - WITHIN 60 DAYS';
t3.font = { name: 'Calibri', size: 14, bold: true, color: { argb: 'FFFFFFFF' } };
t3.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFC2410C' } };
t3.alignment = { horizontal: 'left', vertical: 'middle', indent: 1 };
sheet3.getRow(1).height = 36;

const headers3 = ['Ref ID', 'Driver Name', 'Phone Number', 'Document Type', 'Status Code', 'Expiry Date', 'Days Remaining'];
const hRow3 = sheet3.addRow(headers3);
hRow3.height = 26;
hRow3.eachCell(cell => {
  cell.font = { name: 'Calibri', size: 11, bold: true, color: { argb: 'FFFFFFFF' } };
  cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFC2410C' } };
  cell.alignment = { horizontal: 'center', vertical: 'middle' };
});

auditList.forEach(a => {
  const docsList = [
    { name: 'Driver License', info: a.license },
    { name: 'IQAMA / Icama', info: a.iqama },
    { name: 'Driver Card', info: a.card },
    { name: 'Passport', info: a.passport }
  ];

  docsList.forEach(d => {
    if (d.info.badge.code === 2) {
      const row = sheet3.addRow([
        a.ref_id,
        a.name,
        a.phone,
        d.name,
        2,
        d.info.expiry,
        `${d.info.daysLeft} days left`
      ]);
      row.height = 22;
      row.eachCell((cell, idx) => {
        cell.font = { name: 'Calibri', size: 10 };
        cell.border = {
          top: { style: 'thin', color: { argb: 'FFE2E8F0' } },
          bottom: { style: 'thin', color: { argb: 'FFE2E8F0' } },
          left: { style: 'thin', color: { argb: 'FFE2E8F0' } },
          right: { style: 'thin', color: { argb: 'FFE2E8F0' } }
        };
        if ([1, 3, 5, 6, 7].includes(idx)) cell.alignment = { horizontal: 'center', vertical: 'middle' };
        if (idx === 5) {
          cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFEF3C7' } };
          cell.font = { name: 'Calibri', size: 10, bold: true, color: { argb: 'FFD97706' } };
        }
      });
    }
  });
});

sheet3.columns.forEach((col, idx) => {
  let maxLen = headers3[idx] ? headers3[idx].length : 12;
  col.eachCell?.({ includeEmpty: false }, c => {
    const s = c.value ? c.value.toString() : '';
    if (s.length > maxLen) maxLen = s.length;
  });
  col.width = Math.min(Math.max(maxLen + 4, 14), 36);
});

// Save Excel file safely with fallback if file is locked
const saveWorkbook = async () => {
  const fileNamePrimary = 'MERCON_Driver_Documents_Audit_Sheet1.xlsx';
  const fileNameSecondary = 'MERCON_Driver_Documents_Audit_Coded.xlsx';

  const workspacePathPrimary = path.join('d:\\Mercon', fileNamePrimary);
  const workspacePathSecondary = path.join('d:\\Mercon', fileNameSecondary);
  const artifactFolder = 'C:\\Users\\ILAN\\.gemini\\antigravity\\brain\\81a0fd7f-ead1-41d3-a250-fa8ce18e2963';
  const artifactPathPrimary = path.join(artifactFolder, fileNamePrimary);
  const artifactPathSecondary = path.join(artifactFolder, fileNameSecondary);

  await wb.xlsx.writeFile(workspacePathPrimary);
  if (fs.existsSync(artifactFolder)) {
    await wb.xlsx.writeFile(artifactPathPrimary);
  }

  try {
    await wb.xlsx.writeFile(workspacePathSecondary);
    if (fs.existsSync(artifactFolder)) {
      await wb.xlsx.writeFile(artifactPathSecondary);
    }
  } catch (e) {
    console.log('Secondary file was locked by Excel, saved to primary file.');
  }

  console.log(`\n=============================================================`);
  console.log(`✅ EXCEL REPORT SAVED WITH FIRST TAB AS "Sheet 1"!`);
  console.log(`=============================================================`);
  console.log(`Primary File Path:   ${workspacePathPrimary}`);
  console.log(`Artifact File Path:  ${artifactPathPrimary}`);
};

saveWorkbook().catch(err => {
  console.error('Error saving Excel file:', err);
  process.exit(1);
});
