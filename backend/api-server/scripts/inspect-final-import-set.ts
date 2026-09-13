import ExcelJS from 'exceljs';
import path from 'path';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function inspectLocations() {
  const folder = 'D:\\ALL Important excels\\Final Import Set - July+August 2026';
  const locFile = path.join(folder, 'MERCON_Locations_FINAL.xlsx');
  const custLocFile = path.join(folder, 'MERCON_CustomerSavedLocations_FINAL.xlsx');

  console.log('=== INSPECTING LOCATION EXCEL FILES ===\n');

  // 1. MERCON_Locations_FINAL.xlsx
  const wbLoc = new ExcelJS.Workbook();
  await wbLoc.xlsx.readFile(locFile);
  const sheetLoc = wbLoc.worksheets[0];
  console.log(`--- ${path.basename(locFile)} ---`);
  let locHeaders: string[] = [];
  let locHRow = 4;
  sheetLoc.eachRow((r, rNum) => {
    const txt = (r.values as any[])?.join(' ') || '';
    if (txt.includes('Location Code') || txt.includes('Location Name') || txt.includes('City')) {
      locHRow = rNum;
      r.eachCell({ includeEmpty: true }, (c, col) => { locHeaders[col] = c.text?.trim() || ''; });
    }
  });

  const locRows: any[] = [];
  sheetLoc.eachRow((r, rNum) => {
    if (rNum <= locHRow) return;
    const data: any = {};
    let hasVal = false;
    r.eachCell({ includeEmpty: true }, (c, col) => {
      const h = locHeaders[col] || `Col_${col}`;
      data[h] = c.text?.trim() || '';
      if (data[h]) hasVal = true;
    });
    if (hasVal) locRows.push(data);
  });
  console.log(`Total Rows in MERCON_Locations_FINAL.xlsx: ${locRows.length}`);
  console.log('Sample Row 1:', locRows[0]);

  // 2. MERCON_CustomerSavedLocations_FINAL.xlsx
  const wbCustLoc = new ExcelJS.Workbook();
  await wbCustLoc.xlsx.readFile(custLocFile);
  const sheetCustLoc = wbCustLoc.worksheets[0];
  console.log(`\n--- ${path.basename(custLocFile)} ---`);
  let custLocHeaders: string[] = [];
  let custHRow = 4;
  sheetCustLoc.eachRow((r, rNum) => {
    const txt = (r.values as any[])?.join(' ') || '';
    if (txt.includes('Customer') || txt.includes('Place Name') || txt.includes('Latitude')) {
      custHRow = rNum;
      r.eachCell({ includeEmpty: true }, (c, col) => { custLocHeaders[col] = c.text?.trim() || ''; });
    }
  });

  const custLocRows: any[] = [];
  sheetCustLoc.eachRow((r, rNum) => {
    if (rNum <= custHRow) return;
    const data: any = {};
    let hasVal = false;
    r.eachCell({ includeEmpty: true }, (c, col) => {
      const h = custLocHeaders[col] || `Col_${col}`;
      data[h] = c.text?.trim() || '';
      if (data[h]) hasVal = true;
    });
    if (hasVal) custLocRows.push(data);
  });
  console.log(`Total Rows in MERCON_CustomerSavedLocations_FINAL.xlsx: ${custLocRows.length}`);
  console.log('Sample Row 1:', custLocRows[0]);

  // DB Locations count
  const dbLocCount = await prisma.location.count({ where: { deletedAt: null } });
  console.log(`\nCurrent DB Active Locations Count: ${dbLocCount}`);

  await prisma.$disconnect();
}

inspectLocations().catch(console.error);
