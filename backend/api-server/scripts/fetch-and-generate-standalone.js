const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');
const ExcelJS = require('exceljs');

const sshPath = '"C:\\Program Files\\Git\\usr\\bin\\ssh.exe"';
const scpPath = '"C:\\Program Files\\Git\\usr\\bin\\scp.exe"';
const sshHost = 'root@mercon.tech';

const localSqlFile = path.join(__dirname, 'query.sql');
const remoteSqlFile = '/tmp/clean_driver_query.sql';
const remoteJsonFile = '/tmp/clean_driver_data.json';
const localJsonFile = path.join(__dirname, 'clean_driver_data.json');

console.log('1. Uploading query.sql to mercon.tech...');
execSync(`${scpPath} -o StrictHostKeyChecking=no ${localSqlFile} ${sshHost}:${remoteSqlFile}`);

console.log('2. Copying query file to dev-postgres container...');
execSync(`${sshPath} -o StrictHostKeyChecking=no ${sshHost} "docker cp ${remoteSqlFile} dev-postgres:${remoteSqlFile}"`);

console.log('3. Executing query inside container to file...');
execSync(`${sshPath} -o StrictHostKeyChecking=no ${sshHost} "docker exec dev-postgres psql -U mercon_dev -d mercon_dev_db -t -A -f ${remoteSqlFile} -o ${remoteJsonFile}"`);

console.log('4. Copying output out of container...');
execSync(`${sshPath} -o StrictHostKeyChecking=no ${sshHost} "docker cp dev-postgres:${remoteJsonFile} ${remoteJsonFile}"`);

console.log('5. Downloading clean JSON file via SSH cat...');
const jsonText = execSync(`${sshPath} -n -o StrictHostKeyChecking=no ${sshHost} "cat ${remoteJsonFile}"`, {
  encoding: 'utf8',
  maxBuffer: 50 * 1024 * 1024
});

fs.writeFileSync(localJsonFile, jsonText.trim());
console.log(`Downloaded ${jsonText.trim().length} bytes to ${localJsonFile}`);

const data = JSON.parse(jsonText.trim());
const drivers = data.drivers || [];
const docs = data.docs || [];
const docTypes = data.docTypes || [];

console.log(`Loaded ${drivers.length} Drivers, ${docs.length} Driver Documents, and ${docTypes.length} Document Types.`);

const today = new Date('2026-08-25T00:00:00.000Z');

// Process driver compliance
const auditList = drivers.map(d => {
  const dDocs = docs.filter(doc => doc.entity_id === d.id);

  const findDoc = (code) => {
    return dDocs.find(doc => {
      const docCode = doc.documentType?.code || doc.doc_type || '';
      return docCode.toLowerCase() === code.toLowerCase();
    });
  };

  const licenseDoc = findDoc('DriverLicense');
  const iqamaDoc = findDoc('IQAMA');
  const cardDoc = findDoc('DriverCard');
  const passportDoc = findDoc('Passport');

  const evalDoc = (doc, fallbackExpiry, fallbackNumber) => {
    if (!doc && !fallbackExpiry) {
      return { status: 'Missing', label: '❌ MISSING', detail: 'Not Uploaded', expiry: null, daysLeft: null, file_url: null };
    }

    const expiryStr = doc?.expiry_date || fallbackExpiry;
    const file_url = doc?.file_url || null;
    const statusInDb = doc?.status;

    if (statusInDb === 'Rejected') {
      return { status: 'Rejected', label: '⛔ REJECTED', detail: 'Document Rejected', expiry: expiryStr ? new Date(expiryStr) : null, daysLeft: null, file_url };
    }

    if (!expiryStr) {
      return { status: 'Provided', label: '✔ PROVIDED', detail: 'Uploaded (No Expiry Date)', expiry: null, daysLeft: null, file_url };
    }

    const expDate = new Date(expiryStr);
    const diffMs = expDate.getTime() - today.getTime();
    const daysLeft = Math.ceil(diffMs / (1000 * 60 * 60 * 24));

    if (daysLeft < 0) {
      return { status: 'Expired', label: `⚠️ EXPIRED (${Math.abs(daysLeft)}d ago)`, detail: `Expired ${Math.abs(daysLeft)} days ago`, expiry: expDate, daysLeft, file_url };
    } else if (daysLeft <= 30) {
      return { status: 'Near Expiry', label: `⏳ NEAR EXPIRY (${daysLeft}d left)`, detail: `Expiring in ${daysLeft} days`, expiry: expDate, daysLeft, file_url };
    } else if (daysLeft <= 60) {
      return { status: 'Expiring Soon', label: `⚡ EXPIRING SOON (${daysLeft}d left)`, detail: `Expiring in ${daysLeft} days`, expiry: expDate, daysLeft, file_url };
    } else {
      return { status: 'Valid', label: `✅ VALID (${daysLeft}d left)`, detail: `Valid (${daysLeft} days remaining)`, expiry: expDate, daysLeft, file_url };
    }
  };

  const licenseEval = evalDoc(licenseDoc, d.license_expiry, d.license_number);
  const iqamaEval = evalDoc(iqamaDoc);
  const cardEval = evalDoc(cardDoc);
  const passportEval = evalDoc(passportDoc);

  const mandatoryItems = [
    { name: 'Driver License', eval: licenseEval },
    { name: 'IQAMA / Icama', eval: iqamaEval },
    { name: 'Driver Card', eval: cardEval },
    { name: 'Passport', eval: passportEval }
  ];

  const missingCount = mandatoryItems.filter(m => m.eval.status === 'Missing').length;
  const expiredCount = mandatoryItems.filter(m => m.eval.status === 'Expired').length;
  const nearExpiryCount = mandatoryItems.filter(m => m.eval.status === 'Near Expiry' || m.eval.status === 'Expiring Soon').length;
  const validCount = mandatoryItems.filter(m => m.eval.status === 'Valid' || m.eval.status === 'Provided').length;

  let complianceBadge = 'Fully Compliant';
  if (missingCount > 0 && expiredCount > 0) {
    complianceBadge = 'Critical (Missing & Expired)';
  } else if (expiredCount > 0) {
    complianceBadge = 'Non-Compliant (Expired Docs)';
  } else if (missingCount > 0) {
    complianceBadge = 'Action Required (Missing Docs)';
  } else if (nearExpiryCount > 0) {
    complianceBadge = 'Warning (Near Expiry)';
  }

  return {
    id: d.id,
    ref_id: d.ref_id || 'N/A',
    name: `${d.first_name || ''} ${d.last_name || ''}`.trim(),
    phone: d.phone_primary || 'N/A',
    status: d.status || 'Available',
    license_number: d.license_number || 'N/A',
    assignedVehicle: d.assignedVehiclePlate || 'Unassigned',
    license: licenseEval,
    iqama: iqamaEval,
    card: cardEval,
    passport: passportEval,
    missingCount,
    expiredCount,
    nearExpiryCount,
    validCount,
    totalUploaded: dDocs.length,
    complianceBadge
  };
});

console.log('\n--- AUDIT SUMMARY STATISTICS ---');
console.log(`Total Active Drivers: ${auditList.length}`);
console.log(`Fully Compliant: ${auditList.filter(a => a.complianceBadge === 'Fully Compliant').length}`);
console.log(`Drivers with Missing Docs: ${auditList.filter(a => a.missingCount > 0).length}`);
console.log(`Drivers with Expired Docs: ${auditList.filter(a => a.expiredCount > 0).length}`);
console.log(`Drivers with Near Expiry Docs: ${auditList.filter(a => a.nearExpiryCount > 0).length}`);

// Create Excel workbook
const wb = new ExcelJS.Workbook();
wb.creator = 'MERCON Logistics Compliance Engine';
wb.created = new Date();

// TAB 1: EXECUTIVE DASHBOARD
const dash = wb.addWorksheet('Executive Dashboard', { views: [{ showGridLines: true }] });
dash.mergeCells('A1:G1');
const tCell = dash.getCell('A1');
tCell.value = '🏢 MERCON LOGISTICS - DRIVER DOCUMENT COMPLIANCE AUDIT';
tCell.font = { name: 'Calibri', size: 16, bold: true, color: { argb: 'FFFFFFFF' } };
tCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF1E293B' } };
tCell.alignment = { horizontal: 'center', vertical: 'middle' };
dash.getRow(1).height = 42;

dash.mergeCells('A2:G2');
const sCell = dash.getCell('A2');
sCell.value = `Audit Reference Date: 2026-08-25  |  Total Drivers Analyzed: ${drivers.length}  |  Mandatory Documents: Passport, IQAMA / Icama, Driver Card, Driver License`;
sCell.font = { name: 'Calibri', size: 10, italic: true, color: { argb: 'FF475569' } };
sCell.alignment = { horizontal: 'center', vertical: 'middle' };
dash.getRow(2).height = 24;

dash.addRow([]);
dash.addRow(['Fleet Executive Compliance Summary']);
dash.mergeCells('A4:G4');
dash.getCell('A4').font = { name: 'Calibri', size: 13, bold: true, color: { argb: 'FF0F172A' } };

dash.addRow(['Metric Indicator', 'Driver Count', '% of Fleet', 'Compliance Status', 'Operational Impact & Action']);
const kpiTh = dash.getRow(5);
kpiTh.height = 26;
kpiTh.eachCell(c => {
  c.font = { name: 'Calibri', size: 11, bold: true, color: { argb: 'FFFFFFFF' } };
  c.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF334155' } };
  c.alignment = { vertical: 'middle' };
});

const totalD = auditList.length;
const fullyComp = auditList.filter(a => a.complianceBadge === 'Fully Compliant').length;
const missingD = auditList.filter(a => a.missingCount > 0).length;
const expiredD = auditList.filter(a => a.expiredCount > 0).length;
const nearExpiryD = auditList.filter(a => a.nearExpiryCount > 0).length;

const kpis = [
  ['Total Registered Drivers', totalD, '100.0%', 'INFO', 'Total active drivers evaluated in database'],
  ['Fully Compliant Drivers', fullyComp, `${((fullyComp/totalD)*100).toFixed(1)}%`, 'OPTIMAL', 'All 4 mandatory documents valid & present'],
  ['Drivers with Missing Mandatory Docs', missingD, `${((missingD/totalD)*100).toFixed(1)}%`, 'HIGH RISK', 'Missing Passport / IQAMA / Driver Card / License'],
  ['Drivers with Expired Documents', expiredD, `${((expiredD/totalD)*100).toFixed(1)}%`, 'CRITICAL', 'Ground driver until valid document renewed'],
  ['Drivers with Near Expiry Docs (<= 60 days)', nearExpiryD, `${((nearExpiryD/totalD)*100).toFixed(1)}%`, 'WARNING', 'Issue prompt renewal notification']
];

kpis.forEach(k => {
  const r = dash.addRow(k);
  r.height = 22;
  r.getCell(2).alignment = { horizontal: 'center' };
  r.getCell(3).alignment = { horizontal: 'center' };
  r.getCell(4).alignment = { horizontal: 'center' };
  
  const statusVal = k[3];
  const sc = r.getCell(4);
  sc.font = { name: 'Calibri', size: 10, bold: true };
  if (statusVal === 'OPTIMAL') {
    sc.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFDCFCE7' } };
    sc.font = { ...sc.font, color: { argb: 'FF15803D' } };
  } else if (statusVal === 'CRITICAL' || statusVal === 'HIGH RISK') {
    sc.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFEE2E2' } };
    sc.font = { ...sc.font, color: { argb: 'FFB91C1C' } };
  } else if (statusVal === 'WARNING') {
    sc.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFEF3C7' } };
    sc.font = { ...sc.font, color: { argb: 'FFB45309' } };
  }
});

dash.addRow([]);
dash.addRow(['Mandatory Document Availability & Expiry Breakdown']);
dash.mergeCells('A12:G12');
dash.getCell('A12').font = { name: 'Calibri', size: 13, bold: true, color: { argb: 'FF0F172A' } };

dash.addRow(['Document Type', 'Requirement Level', 'Valid / Provided', 'Near Expiry (<=60d)', 'Expired', 'Missing', 'Availability Rate']);
const docTh = dash.getRow(13);
docTh.height = 26;
docTh.eachCell(c => {
  c.font = { name: 'Calibri', size: 11, bold: true, color: { argb: 'FFFFFFFF' } };
  c.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF334155' } };
  c.alignment = { vertical: 'middle' };
});

const mandatoryKeys = [
  { name: 'Driver License', key: 'license' },
  { name: 'IQAMA / Icama', key: 'iqama' },
  { name: 'Driver Card', key: 'card' },
  { name: 'Passport', key: 'passport' }
];

mandatoryKeys.forEach(m => {
  let valid = 0, near = 0, exp = 0, miss = 0;
  auditList.forEach(a => {
    const st = a[m.key].status;
    if (st === 'Valid' || st === 'Provided') valid++;
    else if (st === 'Near Expiry' || st === 'Expiring Soon') near++;
    else if (st === 'Expired') exp++;
    else if (st === 'Missing' || st === 'Rejected') miss++;
  });
  const availRate = `${(((valid + near) / totalD) * 100).toFixed(1)}%`;
  const r = dash.addRow([m.name, 'MANDATORY', valid, near, exp, miss, availRate]);
  r.height = 22;
  r.getCell(2).alignment = { horizontal: 'center' };
  r.getCell(3).alignment = { horizontal: 'center' };
  r.getCell(4).alignment = { horizontal: 'center' };
  r.getCell(5).alignment = { horizontal: 'center' };
  r.getCell(6).alignment = { horizontal: 'center' };
  r.getCell(7).alignment = { horizontal: 'center' };

  if (miss > 0) {
    r.getCell(6).font = { name: 'Calibri', size: 10, bold: true, color: { argb: 'FFE11D48' } };
    r.getCell(6).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFFE4E6' } };
  }
  if (exp > 0) {
    r.getCell(5).font = { name: 'Calibri', size: 10, bold: true, color: { argb: 'FF991B1B' } };
    r.getCell(5).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFEE2E2' } };
  }
});

dash.columns.forEach((col, i) => {
  col.width = i === 0 ? 34 : i === 4 || i === 6 ? 25 : 20;
});

// TAB 2: DETAILED DRIVER COMPLIANCE LEDGER
const ledger = wb.addWorksheet('Driver Document Ledger', { views: [{ showGridLines: true }] });

ledger.mergeCells('A1:Q1');
const lTitle = ledger.getCell('A1');
lTitle.value = '🥞 DRIVER DOCUMENT COMPLIANCE LEDGER (DATABASE AUDIT)';
lTitle.font = { name: 'Calibri', size: 14, bold: true, color: { argb: 'FFFFFFFF' } };
lTitle.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF1E293B' } };
lTitle.alignment = { horizontal: 'left', vertical: 'middle', indent: 1 };
ledger.getRow(1).height = 36;

const ledgerHeaders = [
  'Ref ID',
  'Driver Name',
  'Phone Primary',
  'Driver Status',
  'Assigned Vehicle',
  'Overall Compliance',
  
  'Driver License Status',
  'Driver License Expiry',
  
  'IQAMA Status',
  'IQAMA Expiry',
  
  'Driver Card Status',
  'Driver Card Expiry',
  
  'Passport Status',
  'Passport Expiry',
  
  'Missing Mandatory Docs',
  'Expired Docs Count',
  'Total Uploaded Docs'
];

const lHead = ledger.addRow(ledgerHeaders);
lHead.height = 30;
lHead.eachCell(c => {
  c.font = { name: 'Calibri', size: 11, bold: true, color: { argb: 'FFFFFFFF' } };
  c.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF0F172A' } };
  c.alignment = { horizontal: 'center', vertical: 'middle', wrapText: true };
  c.border = {
    top: { style: 'thin', color: { argb: 'FF334155' } },
    bottom: { style: 'medium', color: { argb: 'FF0284C7' } },
    left: { style: 'thin', color: { argb: 'FF334155' } },
    right: { style: 'thin', color: { argb: 'FF334155' } }
  };
});

const formatDate = (d) => d ? new Date(d).toISOString().split('T')[0] : 'N/A';

auditList.forEach(a => {
  const rowVals = [
    a.ref_id,
    a.name,
    a.phone,
    a.status,
    a.assignedVehicle,
    a.complianceBadge,

    a.license.label,
    formatDate(a.license.expiry),

    a.iqama.label,
    formatDate(a.iqama.expiry),

    a.card.label,
    formatDate(a.card.expiry),

    a.passport.label,
    formatDate(a.passport.expiry),

    a.missingCount,
    a.expiredCount,
    a.totalUploaded
  ];

  const r = ledger.addRow(rowVals);
  r.height = 24;

  r.eachCell((cell, colIdx) => {
    cell.font = { name: 'Calibri', size: 10 };
    cell.alignment = { vertical: 'middle', wrapText: true };
    cell.border = {
      top: { style: 'thin', color: { argb: 'FFE2E8F0' } },
      bottom: { style: 'thin', color: { argb: 'FFE2E8F0' } },
      left: { style: 'thin', color: { argb: 'FFE2E8F0' } },
      right: { style: 'thin', color: { argb: 'FFE2E8F0' } }
    };

    if ([1, 3, 4, 5, 8, 10, 12, 14, 15, 16, 17].includes(colIdx)) {
      cell.alignment = { horizontal: 'center', vertical: 'middle' };
    }

    if (colIdx === 6) {
      cell.alignment = { horizontal: 'center', vertical: 'middle' };
      cell.font = { name: 'Calibri', size: 10, bold: true };
      if (a.complianceBadge === 'Fully Compliant') {
        cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFDCFCE7' } };
        cell.font = { ...cell.font, color: { argb: 'FF15803D' } };
      } else if (a.complianceBadge.includes('Expired') || a.complianceBadge.includes('Critical')) {
        cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFEE2E2' } };
        cell.font = { ...cell.font, color: { argb: 'FFB91C1C' } };
      } else if (a.complianceBadge.includes('Missing')) {
        cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFEF3C7' } };
        cell.font = { ...cell.font, color: { argb: 'FFB45309' } };
      } else {
        cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFE0F2FE' } };
        cell.font = { ...cell.font, color: { argb: 'FF0369A1' } };
      }
    }

    if ([7, 9, 11, 13].includes(colIdx)) {
      const val = String(cell.value || '');
      if (val.includes('MISSING')) {
        cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFFF1F2' } };
        cell.font = { name: 'Calibri', size: 10, bold: true, color: { argb: 'FFE11D48' } };
      } else if (val.includes('EXPIRED')) {
        cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFEE2E2' } };
        cell.font = { name: 'Calibri', size: 10, bold: true, color: { argb: 'FF991B1B' } };
      } else if (val.includes('NEAR') || val.includes('EXPIRING')) {
        cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFEF3C7' } };
        cell.font = { name: 'Calibri', size: 10, bold: true, color: { argb: 'FFD97706' } };
      } else if (val.includes('VALID') || val.includes('PROVIDED')) {
        cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF0FDF4' } };
        cell.font = { name: 'Calibri', size: 10, color: { argb: 'FF166534' } };
      }
    }

    if (colIdx === 15 && Number(cell.value) > 0) {
      cell.font = { name: 'Calibri', size: 10, bold: true, color: { argb: 'FFE11D48' } };
      cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFFE4E6' } };
    }
    if (colIdx === 16 && Number(cell.value) > 0) {
      cell.font = { name: 'Calibri', size: 10, bold: true, color: { argb: 'FF991B1B' } };
      cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFEE2E2' } };
    }
  });
});

ledger.columns.forEach((column, index) => {
  let maxLen = ledgerHeaders[index] ? ledgerHeaders[index].length : 12;
  column.eachCell?.({ includeEmpty: false }, (cell) => {
    const valStr = cell.value ? cell.value.toString() : '';
    if (valStr.length > maxLen) {
      maxLen = valStr.length;
    }
  });
  column.width = Math.min(Math.max(maxLen + 4, 14), 36);
});

// TAB 3: MISSING MANDATORY ACTION LIST
const missingSheet = wb.addWorksheet('Missing Mandatory Action List', { views: [{ showGridLines: true }] });
missingSheet.mergeCells('A1:G1');
const mTitle = missingSheet.getCell('A1');
mTitle.value = '⚠️ DRIVERS WITH MISSING MANDATORY DOCUMENTS (DISPATCH ACTION LIST)';
mTitle.font = { name: 'Calibri', size: 14, bold: true, color: { argb: 'FFFFFFFF' } };
mTitle.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFB91C1C' } };
mTitle.alignment = { horizontal: 'left', vertical: 'middle', indent: 1 };
missingSheet.getRow(1).height = 36;

const missHeaders = [
  'Ref ID',
  'Driver Name',
  'Phone Primary',
  'Driver Status',
  'Missing Mandatory Document',
  'Requirement Level',
  'Recommended Operator Action'
];

const mHead = missingSheet.addRow(missHeaders);
mHead.height = 28;
mHead.eachCell(c => {
  c.font = { name: 'Calibri', size: 11, bold: true, color: { argb: 'FFFFFFFF' } };
  c.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF991B1B' } };
  c.alignment = { horizontal: 'center', vertical: 'middle' };
});

auditList.forEach(a => {
  const items = [
    { name: 'Driver License', eval: a.license },
    { name: 'IQAMA / Icama', eval: a.iqama },
    { name: 'Driver Card', eval: a.card },
    { name: 'Passport', eval: a.passport }
  ];

  items.forEach(item => {
    if (item.eval.status === 'Missing') {
      const r = missingSheet.addRow([
        a.ref_id,
        a.name,
        a.phone,
        a.status,
        `❌ MISSING: ${item.name}`,
        'MANDATORY',
        `Contact driver to request immediate upload of ${item.name} document before trip dispatch`
      ]);
      r.height = 22;
      r.eachCell((c, colIdx) => {
        c.font = { name: 'Calibri', size: 10 };
        c.border = {
          top: { style: 'thin', color: { argb: 'FFE2E8F0' } },
          bottom: { style: 'thin', color: { argb: 'FFE2E8F0' } },
          left: { style: 'thin', color: { argb: 'FFE2E8F0' } },
          right: { style: 'thin', color: { argb: 'FFE2E8F0' } }
        };
        if (colIdx === 5) {
          c.font = { name: 'Calibri', size: 10, bold: true, color: { argb: 'FFE11D48' } };
          c.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFFF1F2' } };
        }
        if (colIdx === 6) {
          c.alignment = { horizontal: 'center' };
          c.font = { name: 'Calibri', size: 10, bold: true, color: { argb: 'FFB91C1C' } };
        }
      });
    }
  });
});

missingSheet.columns.forEach((column, index) => {
  let maxLen = missHeaders[index] ? missHeaders[index].length : 12;
  column.eachCell?.({ includeEmpty: false }, (cell) => {
    const valStr = cell.value ? cell.value.toString() : '';
    if (valStr.length > maxLen) {
      maxLen = valStr.length;
    }
  });
  column.width = Math.min(Math.max(maxLen + 4, 14), 48);
});

// TAB 4: EXPIRED & NEAR-EXPIRY RADAR
const radarSheet = wb.addWorksheet('Expired & Near Expiry Radar', { views: [{ showGridLines: true }] });
radarSheet.mergeCells('A1:G1');
const rTitle = radarSheet.getCell('A1');
rTitle.value = '🚨 EXPIRED & NEAR-EXPIRY DOCUMENT RENEWAL RADAR';
rTitle.font = { name: 'Calibri', size: 14, bold: true, color: { argb: 'FFFFFFFF' } };
rTitle.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFC2410C' } };
rTitle.alignment = { horizontal: 'left', vertical: 'middle', indent: 1 };
radarSheet.getRow(1).height = 36;

const radarHeaders = [
  'Ref ID',
  'Driver Name',
  'Phone Primary',
  'Document Type',
  'Document Expiry Date',
  'Expiry Days Status',
  'Renewal Urgency'
];

const rHead = radarSheet.addRow(radarHeaders);
rHead.height = 28;
rHead.eachCell(c => {
  c.font = { name: 'Calibri', size: 11, bold: true, color: { argb: 'FFFFFFFF' } };
  c.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFC2410C' } };
  c.alignment = { horizontal: 'center', vertical: 'middle' };
});

auditList.forEach(a => {
  const items = [
    { name: 'Driver License', eval: a.license },
    { name: 'IQAMA / Icama', eval: a.iqama },
    { name: 'Driver Card', eval: a.card },
    { name: 'Passport', eval: a.passport }
  ];

  items.forEach(item => {
    const st = item.eval.status;
    if (st === 'Expired' || st === 'Near Expiry' || st === 'Expiring Soon') {
      const urgency = st === 'Expired' ? 'CRITICAL - Ground Driver' : st === 'Near Expiry' ? 'HIGH - Urgent Renewal' : 'MEDIUM - Notice Sent';
      const r = radarSheet.addRow([
        a.ref_id,
        a.name,
        a.phone,
        item.name,
        formatDate(item.eval.expiry),
        item.eval.detail,
        urgency
      ]);
      r.height = 22;
      r.eachCell((c, colIdx) => {
        c.font = { name: 'Calibri', size: 10 };
        c.border = {
          top: { style: 'thin', color: { argb: 'FFE2E8F0' } },
          bottom: { style: 'thin', color: { argb: 'FFE2E8F0' } },
          left: { style: 'thin', color: { argb: 'FFE2E8F0' } },
          right: { style: 'thin', color: { argb: 'FFE2E8F0' } }
        };
        if (colIdx === 5 || colIdx === 6 || colIdx === 7) {
          c.alignment = { horizontal: 'center' };
        }
        if (colIdx === 7) {
          c.font = { name: 'Calibri', size: 10, bold: true };
          if (st === 'Expired') {
            c.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFEE2E2' } };
            c.font = { ...c.font, color: { argb: 'FF991B1B' } };
          } else if (st === 'Near Expiry') {
            c.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFEF3C7' } };
            c.font = { ...c.font, color: { argb: 'FFD97706' } };
          } else {
            c.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFE0F2FE' } };
            c.font = { ...c.font, color: { argb: 'FF0369A1' } };
          }
        }
      });
    }
  });
});

radarSheet.columns.forEach((column, index) => {
  let maxLen = radarHeaders[index] ? radarHeaders[index].length : 12;
  column.eachCell?.({ includeEmpty: false }, (cell) => {
    const valStr = cell.value ? cell.value.toString() : '';
    if (valStr.length > maxLen) {
      maxLen = valStr.length;
    }
  });
  column.width = Math.min(Math.max(maxLen + 4, 14), 40);
});

// Save Excel file to workspace root & artifact folder
const outFileName = 'MERCON_Driver_Document_Compliance_Audit.xlsx';
const workspaceOut = path.join('d:\\Mercon', outFileName);
const artifactFolder = 'C:\\Users\\ILAN\\.gemini\\antigravity\\brain\\81a0fd7f-ead1-41d3-a250-fa8ce18e2963';
const artifactOut = path.join(artifactFolder, outFileName);

(async () => {
  await wb.xlsx.writeFile(workspaceOut);
  if (fs.existsSync(artifactFolder)) {
    await wb.xlsx.writeFile(artifactOut);
  }
  console.log(`\n=============================================================`);
  console.log(`✅ EXCEL COMPLIANCE REPORT GENERATED SUCCESSFULLY!`);
  console.log(`=============================================================`);
  console.log(`Workspace File Path: ${workspaceOut}`);
  console.log(`Artifact File Path:  ${artifactOut}`);
})();
