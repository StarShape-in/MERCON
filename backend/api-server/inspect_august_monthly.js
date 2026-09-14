const ExcelJS = require('exceljs');
const fs = require('fs');
const path = require('path');

const filePath = 'D:/ALL Important excels/MERCON MONTHLY SHEET AUG 2026.xlsx';

async function inspectMonthlySheet() {
  console.log('==================================================');
  console.log('INSPECTING: MERCON MONTHLY SHEET AUG 2026.xlsx');
  console.log('==================================================\n');

  if (!fs.existsSync(filePath)) {
    console.log('File does NOT exist at path:', filePath);
    // Search in D:/ for matching files
    return;
  }

  const wb = new ExcelJS.Workbook();
  await wb.xlsx.readFile(filePath);

  console.log('Worksheet names:', wb.worksheets.map(w => w.name));

  wb.worksheets.forEach(sheet => {
    console.log(`\n--- Sheet: ${sheet.name} (${sheet.rowCount} rows) ---`);
    for (let r = 1; r <= Math.min(sheet.rowCount, 15); r++) {
      const row = sheet.getRow(r);
      const vals = [];
      row.eachCell(c => {
        let v = c.value;
        if (v && typeof v === 'object') v = v.result || v.text || JSON.stringify(v);
        vals.push(String(v));
      });
      console.log(`Row ${r}:`, vals.slice(0, 15).join(' | '));
    }
  });
}

inspectMonthlySheet().catch(console.error);
