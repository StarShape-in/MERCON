import fs from 'fs';
import path from 'path';
import ExcelJS from 'exceljs';

const REQUIRED_DOC_TYPES = [
  'ISTIMARA',
  'INSURANCE',
  'OPERATION_CARD',
  'SASO_PLATES',
  'FAHAS',
] as const;

type RequiredDocType = typeof REQUIRED_DOC_TYPES[number];

interface DocRecord {
  truckNumber: string;
  displayPlate: string;
  docType: string;
  finalFileName: string;
  sourceFileName: string;
  status: 'Found' | 'Missing' | 'Needs Review';
  notes: string;
}

// Pre-defined or detected plate code mappings from user prompt & JSON reports
const KNOWN_PLATE_CODES: Record<string, string> = {
  '2541': 'UDA-2541',
  '3071': 'UDA-3071',
  '3078': 'DSA-3078',
  '3241': 'DSA-3241',
  '3358': 'VRA-3358',
  '3531': 'BRA-3531',
  '3999': 'BRA-3999',
  '4012': 'BRA-4012',
  '4207': 'ESA-4207',
  '4244': 'ESA-4244',
  '4293': 'XXA-4293',
  '5049': 'NDA-5049',
  '5085': 'NDA-5085',
  '5309': 'BRA-5309',
  '5510': 'VRA-5510',
  '5999': 'EXA-5999',
  '6010': 'USA-6010',
  '6097': 'USA-6097',
  '6098': 'USA-6098',
  '6102': 'DRA-6102',
  '6455': 'DRA-6455',
  '6456': 'DRA-6456',
  '6484': 'DRA-6484',
  '6485': 'DRA-6485',
  '6487': 'DRA-6487',
  '6706': 'SRA-6706',
  '6708': 'SRA-6708',
  '8210': 'NXA-8210',
  '9153': 'PRA-9153',
  '9380': 'PRA-9380',
  '9973': 'RRA-9973',
};

function normalizeDocType(filename: string): string {
  const upper = filename.toUpperCase();

  if (upper.includes('ISTIMARA') || upper.includes('ESTIMARA') || upper.includes('REGISTRATION')) {
    return 'ISTIMARA';
  }
  if (upper.includes('INSURANCE') || upper.includes('POLICY') || upper.includes('INS_')) {
    return 'INSURANCE';
  }
  if (upper.includes('OPERATION') || upper.includes('OPERATIONAL') || upper.includes('OP_CARD') || upper.includes('KAFAAH') || upper.includes('TRANSPORT_CARD')) {
    return 'OPERATION_CARD';
  }
  if (upper.includes('SASO') || upper.includes('PLATE')) {
    return 'SASO_PLATES';
  }
  if (upper.includes('FAHAS') || upper.includes('FAHS') || upper.includes('INSPECTION') || upper.includes('MVPI')) {
    return 'FAHAS';
  }
  if (upper.includes('AUTHORIZATION')) {
    return 'AUTHORIZATION';
  }
  if (upper.includes('CONTRACT')) {
    return 'CONTRACT';
  }
  if (upper.includes('MEEZAN')) {
    return 'MEEZAN';
  }
  if (upper.includes('ARCHIVE') || upper.endsWith('.RAR') || upper.endsWith('.ZIP')) {
    return 'ARCHIVE';
  }

  return 'UNKNOWN';
}

async function main() {
  const rootDir = path.resolve(process.cwd(), '../../Organized_Truck_Documents');
  if (!fs.existsSync(rootDir)) {
    console.error(`❌ Root directory not found: ${rootDir}`);
    process.exit(1);
  }

  console.log(`📂 Analyzing Organized_Truck_Documents at: ${rootDir}\n`);

  // Step 1: Scan JSON files in _Reports_and_Data to enrich plate codes
  const reportsDir = path.join(rootDir, '_Reports_and_Data');
  if (fs.existsSync(reportsDir)) {
    const jsonFiles = fs.readdirSync(reportsDir).filter(f => f.endsWith('.json'));
    for (const jf of jsonFiles) {
      try {
        const content = JSON.parse(fs.readFileSync(path.join(reportsDir, jf), 'utf-8'));
        function extractPlates(obj: any) {
          if (!obj || typeof obj !== 'object') return;
          if (Array.isArray(obj)) {
            obj.forEach(extractPlates);
            return;
          }
          if (obj.folder && obj.display_plate) {
            KNOWN_PLATE_CODES[String(obj.folder).trim()] = String(obj.display_plate).trim();
          }
          for (const k of Object.keys(obj)) {
            if (typeof obj[k] === 'object') extractPlates(obj[k]);
          }
        }
        extractPlates(content);
      } catch (_) {}
    }
  }

  // Step 2: Get all truck folders
  const folderEntries = fs.readdirSync(rootDir, { withFileTypes: true });
  const truckFolders = folderEntries
    .filter(e => e.isDirectory() && /^\d{4}$/.test(e.name))
    .map(e => e.name)
    .sort((a, b) => Number(a) - Number(b));

  console.log(`🚛 Found ${truckFolders.length} truck folders: ${truckFolders.join(', ')}\n`);

  const reportRecords: DocRecord[] = [];
  const needsReviewDir = path.join(rootDir, '_Needs_Review');
  fs.mkdirSync(needsReviewDir, { recursive: true });

  for (const truckNum of truckFolders) {
    const truckFolderPath = path.join(rootDir, truckNum);
    const displayPlate = KNOWN_PLATE_CODES[truckNum] || `TRK-${truckNum}`;

    const files = fs.readdirSync(truckFolderPath).filter(f => {
      const stats = fs.statSync(path.join(truckFolderPath, f));
      return stats.isFile();
    });

    const docTypeCounter: Record<string, number> = {};
    const foundDocTypes = new Set<string>();

    for (const fileName of files) {
      const ext = path.extname(fileName).toLowerCase();
      const detectedType = normalizeDocType(fileName);

      if (detectedType === 'UNKNOWN') {
        // Copy to _Needs_Review folder without deleting original
        const destPath = path.join(needsReviewDir, `${truckNum}_UNCERTAIN_${fileName}`);
        fs.copyFileSync(path.join(truckFolderPath, fileName), destPath);

        reportRecords.push({
          truckNumber: truckNum,
          displayPlate: displayPlate,
          docType: 'UNKNOWN',
          finalFileName: `${truckNum}_UNCERTAIN_${fileName}`,
          sourceFileName: fileName,
          status: 'Needs Review',
          notes: 'Uncertain document type — placed in _Needs_Review folder',
        });
        continue;
      }

      // Track occurrences for sequential naming suffix (_02, _03)
      docTypeCounter[detectedType] = (docTypeCounter[detectedType] || 0) + 1;
      const count = docTypeCounter[detectedType];

      const suffix = count > 1 ? `_${String(count).padStart(2, '0')}` : '';
      const finalFileName = `${truckNum}_${detectedType}${suffix}${ext}`;

      const sourcePath = path.join(truckFolderPath, fileName);
      const targetPath = path.join(truckFolderPath, finalFileName);

      // Rename file in-place if filename format differs
      if (fileName !== finalFileName) {
        fs.renameSync(sourcePath, targetPath);
        console.log(`  🔄 Renamed: [${truckNum}] "${fileName}" -> "${finalFileName}"`);
      }

      foundDocTypes.add(detectedType);

      reportRecords.push({
        truckNumber: truckNum,
        displayPlate: displayPlate,
        docType: detectedType,
        finalFileName: finalFileName,
        sourceFileName: fileName,
        status: 'Found',
        notes: detectedType in REQUIRED_DOC_TYPES ? 'Mandatory compliance document present' : 'Supporting document present',
      });
    }

    // Step 3: Check missing mandatory compliance document types for this truck
    for (const reqType of REQUIRED_DOC_TYPES) {
      if (!foundDocTypes.has(reqType)) {
        reportRecords.push({
          truckNumber: truckNum,
          displayPlate: displayPlate,
          docType: reqType,
          finalFileName: '—',
          sourceFileName: '—',
          status: 'Missing',
          notes: `Required document type ${reqType} is missing for truck ${displayPlate}`,
        });
      }
    }
  }

  // Step 4: Generate document_organization_report.xlsx
  const workbook = new ExcelJS.Workbook();
  workbook.creator = 'MERCON Logistics System';
  workbook.created = new Date();

  // Sheet 1: Detailed File Inventory & Status
  const sheet1 = workbook.addWorksheet('Document Organization Report');
  sheet1.columns = [
    { header: 'Truck Number', key: 'truckNumber', width: 16 },
    { header: 'Display Plate Code', key: 'displayPlate', width: 20 },
    { header: 'Document Type', key: 'docType', width: 22 },
    { header: 'Final File Name', key: 'finalFileName', width: 35 },
    { header: 'Source File Name', key: 'sourceFileName', width: 35 },
    { header: 'Status', key: 'status', width: 16 },
    { header: 'Notes', key: 'notes', width: 50 },
  ];

  // Header styling
  const headerRow = sheet1.getRow(1);
  headerRow.font = { bold: true, color: { argb: 'FFFFFFFF' } };
  headerRow.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF3E3C3D' } }; // Dark Charcoal MERCON Theme
  headerRow.alignment = { vertical: 'middle', horizontal: 'center' };

  reportRecords.forEach(rec => {
    const row = sheet1.addRow(rec);
    const statusCell = row.getCell('status');
    if (rec.status === 'Found') {
      statusCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFE6F4EA' } }; // Light Green
      statusCell.font = { color: { argb: 'FF137333' }, bold: true };
    } else if (rec.status === 'Missing') {
      statusCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFCE8E6' } }; // Light Red
      statusCell.font = { color: { argb: 'FFC5221F' }, bold: true };
    } else {
      statusCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFEEFC3' } }; // Light Amber
      statusCell.font = { color: { argb: 'FFB06000' }, bold: true };
    }
  });

  // Sheet 2: Truck Missing Documents Matrix
  const sheet2 = workbook.addWorksheet('Truck Compliance Summary');
  sheet2.columns = [
    { header: 'Truck Number', key: 'truckNumber', width: 16 },
    { header: 'Display Plate', key: 'displayPlate', width: 20 },
    { header: 'Istimara', key: 'istimara', width: 14 },
    { header: 'Insurance', key: 'insurance', width: 14 },
    { header: 'Operation Card', key: 'opCard', width: 18 },
    { header: 'SASO Plates', key: 'saso', width: 14 },
    { header: 'FAHAS', key: 'fahas', width: 14 },
    { header: 'Compliance Score', key: 'score', width: 20 },
  ];

  const header2 = sheet2.getRow(1);
  header2.font = { bold: true, color: { argb: 'FFFFFFFF' } };
  header2.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF3E3C3D' } };
  header2.alignment = { vertical: 'middle', horizontal: 'center' };

  for (const truckNum of truckFolders) {
    const displayPlate = KNOWN_PLATE_CODES[truckNum] || `TRK-${truckNum}`;
    const truckDocs = reportRecords.filter(r => r.truckNumber === truckNum && r.status === 'Found');
    const docTypesPresent = new Set(truckDocs.map(r => r.docType));

    const hasIst = docTypesPresent.has('ISTIMARA');
    const hasIns = docTypesPresent.has('INSURANCE');
    const hasOp = docTypesPresent.has('OPERATION_CARD');
    const hasSaso = docTypesPresent.has('SASO_PLATES');
    const hasFahas = docTypesPresent.has('FAHAS');

    const count = [hasIst, hasIns, hasOp, hasSaso, hasFahas].filter(Boolean).length;
    const score = `${count} / 5 (${Math.round((count / 5) * 100)}%)`;

    const row = sheet2.addRow({
      truckNumber: truckNum,
      displayPlate: displayPlate,
      istimara: hasIst ? '✅ Present' : '❌ Missing',
      insurance: hasIns ? '✅ Present' : '❌ Missing',
      opCard: hasOp ? '✅ Present' : '❌ Missing',
      saso: hasSaso ? '✅ Present' : '❌ Missing',
      fahas: hasFahas ? '✅ Present' : '❌ Missing',
      score: score,
    });

    ['istimara', 'insurance', 'opCard', 'saso', 'fahas'].forEach(key => {
      const cell = row.getCell(key);
      const isPresent = cell.value?.toString().includes('✅');
      cell.fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: isPresent ? 'FFE6F4EA' : 'FFFCE8E6' }
      };
      cell.font = { color: { argb: isPresent ? 'FF137333' : 'FFC5221F' }, bold: true };
      cell.alignment = { horizontal: 'center' };
    });
  }

  const reportXlsxPath = path.join(rootDir, 'document_organization_report.xlsx');
  await workbook.xlsx.writeFile(reportXlsxPath);
  console.log(`\n📊 Generated Excel Report: ${reportXlsxPath}`);

  // Step 5: Also output CSV format
  const csvHeaders = 'Truck Number,Display Plate Code,Document Type,Final File Name,Source File Name,Status,Notes\n';
  const csvRows = reportRecords.map(r => 
    `"${r.truckNumber}","${r.displayPlate}","${r.docType}","${r.finalFileName}","${r.sourceFileName}","${r.status}","${r.notes}"`
  ).join('\n');

  const reportCsvPath = path.join(rootDir, 'document_organization_report.csv');
  fs.writeFileSync(reportCsvPath, csvHeaders + csvRows);
  console.log(`📊 Generated CSV Report: ${reportCsvPath}`);

  // Step 6: Generate updated _manifest.csv
  const manifestHeaders = '"Truck","DocumentType","FileName","Source"\n';
  const manifestRows = reportRecords
    .filter(r => r.status === 'Found')
    .map(r => `"${r.truckNumber}","${r.docType}","${r.finalFileName}",""`)
    .join('\n');
  fs.writeFileSync(path.join(rootDir, '_manifest.csv'), manifestHeaders + manifestRows);

  console.log('\n✅ Document Organization & Analysis Completed Successfully!');
}

main().catch(err => {
  console.error('❌ Error during document organization:', err);
  process.exit(1);
});
