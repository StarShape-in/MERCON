const ExcelJS = require('exceljs');
const fs = require('fs');
const path = require('path');

async function generateCustomerTemplate() {
  const workbook = new ExcelJS.Workbook();
  workbook.creator = 'MERCON Logistics';
  workbook.created = new Date();

  // ==========================================
  // SHEET 1: 📌 Guide & Overview
  // ==========================================
  const guideSheet = workbook.addWorksheet('📌 Guide & Overview', {
    views: [{ showGridLines: true }],
  });

  guideSheet.columns = [
    { width: 38 },
    { width: 85 },
    { width: 25 },
    { width: 25 },
    { width: 25 },
    { width: 25 },
    { width: 25 },
  ];

  // Header Banner
  guideSheet.mergeCells('A1:G2');
  const bannerCell = guideSheet.getCell('A1');
  bannerCell.value = '🏢 MERCON LOGISTICS  |  ENTERPRISE CUSTOMER ONBOARDING SPECIFICATION';
  bannerCell.font = { name: 'Segoe UI', size: 16, bold: true, color: { argb: '00FFFFFF' } };
  bannerCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: '000F172A' } };
  bannerCell.alignment = { horizontal: 'center', vertical: 'middle', wrapText: true };

  // Subtitle
  guideSheet.mergeCells('A3:G3');
  const subCell = guideSheet.getCell('A3');
  subCell.value = 'Official onboarding worksheet for Customer Accounts & Commercial Onboarding. Follow instructions below before returning the file.';
  subCell.font = { name: 'Segoe UI', size: 10, italic: true, color: { argb: '00475569' } };
  subCell.alignment = { horizontal: 'center', vertical: 'middle' };

  // Status Cards Box
  guideSheet.mergeCells('A5:B6');
  const status1 = guideSheet.getCell('A5');
  status1.value = 'STATUS\n100% Import Ready';
  status1.font = { name: 'Segoe UI', size: 10, bold: true, color: { argb: '00065F46' } };
  status1.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: '00D1FAE5' } };
  status1.alignment = { horizontal: 'center', vertical: 'middle', wrapText: true };

  guideSheet.mergeCells('C5:D6');
  const status2 = guideSheet.getCell('C5');
  status2.value = 'MANDATORY FIELDS\nMarked with Red Asterisk (*)';
  status2.font = { name: 'Segoe UI', size: 10, bold: true, color: { argb: '00991B1B' } };
  status2.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: '00FEE2E2' } };
  status2.alignment = { horizontal: 'center', vertical: 'middle', wrapText: true };

  guideSheet.mergeCells('E5:G6');
  const status3 = guideSheet.getCell('E5');
  status3.value = 'SUPPORT & INGESTION\nsupport@mercon-logistics.com';
  status3.font = { name: 'Segoe UI', size: 10, bold: true, color: { argb: '001E40AF' } };
  status3.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: '00DBEAFE' } };
  status3.alignment = { horizontal: 'center', vertical: 'middle', wrapText: true };

  // Step 1
  guideSheet.getCell('A9').value = '➊ STEP 1: REVIEW REQUIRED COLUMNS';
  guideSheet.getCell('A9').font = { name: 'Segoe UI', size: 12, bold: true, color: { argb: '000F172A' } };

  guideSheet.getCell('B10').value = '• Columns with a red label and asterisk (*) are MANDATORY for importing.';
  guideSheet.getCell('B10').font = { name: 'Segoe UI', size: 10, color: { argb: '00334155' } };

  guideSheet.getCell('B11').value = '• Required Customer fields: Company Name *, Primary Phone *.';
  guideSheet.getCell('B11').font = { name: 'Segoe UI', size: 10, color: { argb: '00334155' } };

  guideSheet.getCell('B12').value = '• Optional fields: Trade Name, Industry, Commercial Reg. (CR) No., VAT / Tax Number, Billing Email, Contact Person, Job Title, Address / Notes.';
  guideSheet.getCell('B12').font = { name: 'Segoe UI', size: 10, color: { argb: '00334155' } };

  // Step 2
  guideSheet.getCell('A14').value = '➋ STEP 2: FILL OUT THE CUSTOMERS DIRECTORY TAB';
  guideSheet.getCell('A14').font = { name: 'Segoe UI', size: 12, bold: true, color: { argb: '000F172A' } };

  guideSheet.getCell('B15').value = '• Switch to the "🏢 Customers Directory" sheet tab at the bottom to enter customer records.';
  guideSheet.getCell('B15').font = { name: 'Segoe UI', size: 10, color: { argb: '00334155' } };

  // ==========================================
  // SHEET 2: 🏢 Customers Directory
  // ==========================================
  const custSheet = workbook.addWorksheet('🏢 Customers Directory', {
    views: [{ showGridLines: true }],
  });

  const columns = [
    { name: 'Customer Ref / ID', width: 18, isRequired: false },
    { name: 'Company Name *', width: 32, isRequired: true },
    { name: 'Trade Name / Brand', width: 22, isRequired: false },
    { name: 'Industry', width: 20, isRequired: false },
    { name: 'Commercial Reg (CR) No.', width: 24, isRequired: false },
    { name: 'VAT / Tax Number', width: 26, isRequired: false },
    { name: 'Primary Phone *', width: 24, isRequired: true },
    { name: 'Billing Email', width: 28, isRequired: false },
    { name: 'Contact Representative', width: 26, isRequired: false },
    { name: 'Job Title', width: 24, isRequired: false },
    { name: 'Billing Address / Notes', width: 36, isRequired: false },
  ];

  custSheet.columns = columns.map(c => ({ width: c.width }));

  // Header Banner Row 1-2
  custSheet.mergeCells('A1:K2');
  const dirBanner = custSheet.getCell('A1');
  dirBanner.value = '🏢 CUSTOMER ACCOUNTS DIRECTORY  —  BULK DATA ENTRY';
  dirBanner.font = { name: 'Segoe UI', size: 16, bold: true, color: { argb: '00FFFFFF' } };
  dirBanner.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: '000F172A' } };
  dirBanner.alignment = { horizontal: 'center', vertical: 'middle' };

  // KPI Info Row 4-5
  custSheet.mergeCells('A4:C5');
  const modBox1 = custSheet.getCell('A4');
  modBox1.value = 'MODULE\nCommercial & Customer Directory';
  modBox1.font = { name: 'Segoe UI', size: 9, bold: true, color: { argb: '0064748B' } };
  modBox1.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: '00F1F5F9' } };
  modBox1.border = {
    top: { style: 'medium', color: { argb: '00CBD5E1' } },
    bottom: { style: 'medium', color: { argb: '00CBD5E1' } },
    left: { style: 'medium', color: { argb: '00CBD5E1' } },
    right: { style: 'medium', color: { argb: '00CBD5E1' } },
  };
  modBox1.alignment = { horizontal: 'center', vertical: 'middle', wrapText: true };

  custSheet.mergeCells('D4:G5');
  const modBox2 = custSheet.getCell('D4');
  modBox2.value = 'PRIMARY KEY & CONTACT\nCompany Name & Primary Contact Phone';
  modBox2.font = { name: 'Segoe UI', size: 9, bold: true, color: { argb: '0064748B' } };
  modBox2.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: '00F1F5F9' } };
  modBox2.border = {
    top: { style: 'medium', color: { argb: '00CBD5E1' } },
    bottom: { style: 'medium', color: { argb: '00CBD5E1' } },
    left: { style: 'medium', color: { argb: '00CBD5E1' } },
    right: { style: 'medium', color: { argb: '00CBD5E1' } },
  };
  modBox2.alignment = { horizontal: 'center', vertical: 'middle', wrapText: true };

  custSheet.mergeCells('H4:K5');
  const modBox3 = custSheet.getCell('H4');
  modBox3.value = "INITIAL STATUS\nAuto-Defaulted to 'Active'";
  modBox3.font = { name: 'Segoe UI', size: 9, bold: true, color: { argb: '0064748B' } };
  modBox3.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: '00F1F5F9' } };
  modBox3.border = {
    top: { style: 'medium', color: { argb: '00CBD5E1' } },
    bottom: { style: 'medium', color: { argb: '00CBD5E1' } },
    left: { style: 'medium', color: { argb: '00CBD5E1' } },
    right: { style: 'medium', color: { argb: '00CBD5E1' } },
  };
  modBox3.alignment = { horizontal: 'center', vertical: 'middle', wrapText: true };

  // Table Headers Row 7
  columns.forEach((col, idx) => {
    const cell = custSheet.getCell(7, idx + 1);
    cell.value = col.name;
    cell.font = { name: 'Segoe UI', size: 10, bold: true, color: { argb: '00FFFFFF' } };
    cell.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: col.isRequired ? '00EA580C' : '00312E81' }, // Orange for required, Indigo for optional
    };
    cell.alignment = { horizontal: 'center', vertical: 'middle', wrapText: true };
    cell.border = {
      top: { style: 'medium', color: { argb: '000F172A' } },
      bottom: { style: 'medium', color: { argb: '000F172A' } },
      left: { style: 'thin', color: { argb: '00475569' } },
      right: { style: 'thin', color: { argb: '00475569' } },
    };
  });

  // Sample Data Rows (Row 8-10)
  const sampleData = [
    [
      'CUST-101',
      'SABIC Supply Chain Services Co.',
      'SABIC',
      'Logistics',
      '1010892341',
      '310123456700003',
      '+966 50 123 4567',
      'billing@sabic.com',
      'Eng. Tariq Al-Mansoor',
      'VP of Supply Chain',
      'Building 829, King Fahd Road, Riyadh',
    ],
    [
      'CUST-102',
      'Almarai Food Distribution Ltd',
      'Almarai',
      'FMCG',
      '1010776512',
      '310987654300003',
      '+966 50 987 6543',
      'commercial@almarai.com',
      'Fahad Al-Zahrani',
      'Logistics Director',
      'Exit 7, Northern Ring Road, Riyadh',
    ],
    [
      'CUST-103',
      'Panda Retail Company',
      'Panda Hypermarket',
      'Retail',
      '1010334455',
      '310554433200003',
      '+966 55 443 2211',
      'invoicing@panda.com.sa',
      'Mona Hassan',
      'Procurement Specialist',
      'Al-Andalus District, Jeddah',
    ],
  ];

  sampleData.forEach((rowData, rIdx) => {
    const rowNum = 8 + rIdx;
    rowData.forEach((val, cIdx) => {
      const cell = custSheet.getCell(rowNum, cIdx + 1);
      cell.value = val;
      cell.font = { name: 'Segoe UI', size: 10, color: { argb: '001E293B' } };
      cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: '00FFFFFF' } };
      cell.alignment = { horizontal: 'center', vertical: 'middle', wrapText: true };
      cell.border = {
        top: { style: 'thin', color: { argb: '00E2E8F0' } },
        bottom: { style: 'thin', color: { argb: '00E2E8F0' } },
        left: { style: 'thin', color: { argb: '00E2E8F0' } },
        right: { style: 'thin', color: { argb: '00E2E8F0' } },
      };
    });
  });

  // Empty Data Template Rows (Rows 11-30)
  for (let r = 11; r <= 30; r++) {
    columns.forEach((_, cIdx) => {
      const cell = custSheet.getCell(r, cIdx + 1);
      cell.border = {
        top: { style: 'thin', color: { argb: '00F1F5F9' } },
        bottom: { style: 'thin', color: { argb: '00F1F5F9' } },
        left: { style: 'thin', color: { argb: '00F1F5F9' } },
        right: { style: 'thin', color: { argb: '00F1F5F9' } },
      };
    });
  }

  // Save to public/templates and docs/templates
  const targets = [
    path.join(__dirname, '../frontend/web-dashboard/public/templates/MERCON_Customers_Import_Template.xlsx'),
    path.join(__dirname, '../docs/templates/MERCON_Customers_Import_Template.xlsx'),
  ];

  for (const targetPath of targets) {
    const dir = path.dirname(targetPath);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    await workbook.xlsx.writeFile(targetPath);
    console.log('Successfully written:', targetPath);
  }
}

generateCustomerTemplate().catch(console.error);
