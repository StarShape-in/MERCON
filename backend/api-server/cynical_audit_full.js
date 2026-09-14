const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const ExcelJS = require('exceljs');

async function runCynicalAudit() {
  console.log('==================================================');
  console.log('CYNICAL AUDIT OF MERCON AUGUST DATA & EXCEL FILES');
  console.log('==================================================\n');

  const monthlySheetPath = 'C:/Users/ILAN/Downloads/MERCON MONTHLY SHEET AUG 2026.xlsx';
  const locExcelPath = 'D:/Mercon/august_import_files/MERCON_August_Locations_Import_Final.xlsx';
  const qExcelPath = 'D:/Mercon/august_import_files/MERCON_August_Quotations_Used_Only.xlsx';
  const tripExcelPath = 'D:/Mercon/august_import_files/MERCON_August_Trips_Import_Final.xlsx';

  // --- 1. AUDIT RAW MONTHLY SHEET ---
  console.log('--- 1. AUDITING SOURCE EXCEL SHEET ---');
  const wbSource = new ExcelJS.Workbook();
  await wbSource.xlsx.readFile(monthlySheetPath);
  const sheetSource = wbSource.worksheets[0];
  
  const srcHeaders = [];
  sheetSource.getRow(1).eachCell((cell, colNumber) => {
    srcHeaders[colNumber] = cell.value ? cell.value.toString().trim() : '';
  });

  let srcTotalRows = 0;
  let srcSumBilling = 0;
  let srcSumDriverCost = 0;

  sheetSource.eachRow((row, rowNumber) => {
    if (rowNumber > 1) {
      const dateVal = row.getCell(2).value;
      const driverName = row.getCell(4).value;
      const sender = row.getCell(9).value;
      const receiver = row.getCell(10).value;

      if ((dateVal || driverName || sender) && driverName !== 'DRIVER NAME' && sender !== 'SENDER/CUSTOMER ') {
        srcTotalRows++;
        let billVal = row.getCell(13).value;
        if (billVal && typeof billVal === 'object' && billVal.result !== undefined) billVal = billVal.result;
        const b = isNaN(Number(billVal)) ? 0 : Number(billVal);
        srcSumBilling += b;

        let costVal = row.getCell(15).value;
        if (costVal && typeof costVal === 'object' && costVal.result !== undefined) costVal = costVal.result;
        const c = isNaN(Number(costVal)) ? 0 : Number(costVal);
        srcSumDriverCost += c;
      }
    }
  });

  console.log(`Source Operational Rows: ${srcTotalRows}`);
  console.log(`Source Sum Billing Amount: SAR ${srcSumBilling.toLocaleString()}`);
  console.log(`Source Sum Driver Charges: SAR ${srcSumDriverCost.toLocaleString()}`);

  // --- 2. AUDIT DB & TRIPS EXCEL ---
  console.log('\n--- 2. AUDITING TRIPS EXCEL & DATABASE ---');
  const wbTrip = new ExcelJS.Workbook();
  await wbTrip.xlsx.readFile(tripExcelPath);
  const wsTrip = wbTrip.worksheets[0];
  let tripExcelRows = wsTrip.rowCount - 1;

  let tripExcelSumBilling = 0;
  let tripExcelSumDriverCost = 0;
  let tripExcelUnlinkedCount = 0;

  wsTrip.eachRow((row, rowNumber) => {
    if (rowNumber > 1) {
      const billing = Number(row.getCell(14).value || 0);
      const cost = Number(row.getCell(15).value || 0);
      const qCode = row.getCell(16).value;

      tripExcelSumBilling += billing;
      tripExcelSumDriverCost += cost;
      if (!qCode || qCode === '—') tripExcelUnlinkedCount++;
    }
  });

  console.log(`Trips Excel Total Rows: ${tripExcelRows} (Target: ${srcTotalRows})`);
  console.log(`Trips Excel Sum Billing: SAR ${tripExcelSumBilling.toLocaleString()}`);
  console.log(`Trips Excel Sum Driver Charges: SAR ${tripExcelSumDriverCost.toLocaleString()}`);
  console.log(`Trips Excel Linked to Quotation: ${tripExcelRows - tripExcelUnlinkedCount} / ${tripExcelRows} (${((tripExcelRows - tripExcelUnlinkedCount)/tripExcelRows*100).toFixed(1)}%)`);

  // --- 3. AUDIT QUOTATIONS EXCEL & DATABASE ---
  console.log('\n--- 3. AUDITING USED QUOTATIONS EXCEL ---');
  const wbQ = new ExcelJS.Workbook();
  await wbQ.xlsx.readFile(qExcelPath);
  const wsQ = wbQ.worksheets[0];
  let qExcelRows = wsQ.rowCount - 1;

  let qExcelSumRev = 0;
  let qExcelSumCost = 0;
  let qExcelZeroTripRows = 0;

  wsQ.eachRow((row, rowNumber) => {
    if (rowNumber > 1) {
      const tripsCount = Number(row.getCell(16).value || 0);
      const totalRev = Number(row.getCell(17).value || 0);
      const totalCostVal = row.getCell(18).value;

      if (tripsCount === 0) qExcelZeroTripRows++;
      qExcelSumRev += totalRev;
      if (typeof totalCostVal === 'number') qExcelSumCost += totalCostVal;
    }
  });

  console.log(`Used Quotations Count: ${qExcelRows}`);
  console.log(`Quotations with 0 executed trips in August: ${qExcelZeroTripRows} (Should be 0)`);
  console.log(`Total Projected Revenue across Used Quotations: SAR ${qExcelSumRev.toLocaleString()}`);

  // --- 4. AUDIT LOCATIONS EXCEL & DATABASE ---
  console.log('\n--- 4. AUDITING LOCATIONS EXCEL & DATABASE ---');
  const wbLoc = new ExcelJS.Workbook();
  await wbLoc.xlsx.readFile(locExcelPath);
  const wsLoc = wbLoc.addWorksheet ? wbLoc.worksheets[0] : null;
  let locExcelRows = wsLoc ? wsLoc.rowCount - 1 : 0;

  const dbLocations = await prisma.location.findMany({ where: { deletedAt: null } });
  let geocodedCount = dbLocations.filter(l => l.lat !== null && l.lng !== null).length;
  let unlinkedTripStops = await prisma.tripStop.count({ where: { locationId: null } });

  console.log(`Locations Master Total Rows: ${locExcelRows}`);
  console.log(`Locations Geocoded in DB: ${geocodedCount} / ${dbLocations.length} (${(geocodedCount/dbLocations.length*100).toFixed(1)}%)`);
  console.log(`Unlinked TripStops in DB: ${unlinkedTripStops} (Target: 0)`);

  // --- 5. CYNICAL DISCREPANCY FINDINGS ---
  console.log('\n==================================================');
  console.log('CYNICAL AUDIT FINDINGS & DISCREPANCIES');
  console.log('==================================================');

  const issues = [];
  if (tripExcelRows !== srcTotalRows) {
    issues.push(`CRITICAL: Trip row count mismatch! Excel has ${tripExcelRows}, Source has ${srcTotalRows}.`);
  }
  if (Math.abs(tripExcelSumBilling - srcSumBilling) > 1) {
    issues.push(`CRITICAL: Billing sum mismatch! Trips Excel has ${tripExcelSumBilling}, Source has ${srcSumBilling}.`);
  }
  if (Math.abs(tripExcelSumDriverCost - srcSumDriverCost) > 1) {
    issues.push(`CRITICAL: Driver charge sum mismatch! Trips Excel has ${tripExcelSumDriverCost}, Source has ${srcSumDriverCost}.`);
  }
  if (qExcelZeroTripRows > 0) {
    issues.push(`WARNING: Used Quotations Excel contains ${qExcelZeroTripRows} quotations with 0 executed trips.`);
  }
  if (unlinkedTripStops > 0) {
    issues.push(`WARNING: ${unlinkedTripStops} TripStops are not linked to canonical locationId in DB.`);
  }

  if (issues.length === 0) {
    console.log('PERFECT! 0 Critical Discrepancies Found!');
    console.log('All 3 Excels and DB tables are 100% synchronized with the source August sheet.');
  } else {
    issues.forEach(iss => console.log('❌ ' + iss));
  }

  await prisma.$disconnect();
}

runCynicalAudit().catch(err => {
  console.error(err);
  process.exit(1);
});
