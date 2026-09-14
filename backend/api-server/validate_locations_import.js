const path = require('path');
const fs = require('fs');
const XLSX = require('xlsx'); // primary library for Excel parsing
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

// Absolute path to the Excel file to validate
const filePath = path.resolve('C:/Users/ILAN/Downloads/MERCON_August_2026_Locations_IMPORT_READY.xlsx');

// Verify file exists
if (!fs.existsSync(filePath)) {
  console.error('❌ File not found at', filePath);
  process.exit(1);
}

// Header aliases to accept common variations
const HEADER_ALIASES = {
  name: ['name'],
  city: ['city'],
  type: ['type'],
  latitude: ['latitude', 'lat'],
  longitude: ['longitude', 'lng'],
  code: ['code'],
  slug: ['slug'],
  customer: ['customer', 'customername', 'customer_name']
};

const REQUIRED_FIELDS = ['name', 'city', 'type', 'latitude', 'longitude'];
const OPTIONAL_FIELDS = ['code', 'slug', 'customer'];

function normalizeHeader(val) {
  return (val || '').toString().trim().toLowerCase();
}

function findHeaderIndex(actualHeaders, aliases) {
  return actualHeaders.findIndex(h => aliases.includes(h));
}

function loadWorksheet() {
  let workbook;
  try {
    workbook = XLSX.readFile(filePath);
  } catch (err) {
    console.error('❌ Failed to read Excel file with xlsx library:', err.message);
    process.exit(1);
  }
  const sheetName = workbook.SheetNames[0];
  if (!sheetName) {
    console.error('❌ No sheets found in the Excel file.');
    process.exit(1);
  }
  const sheet = workbook.Sheets[sheetName];
  // Minimal wrapper mimicking ExcelJS methods used below
  const ws = {
    getRow: (rowNum) => {
      const range = XLSX.utils.decode_range(sheet['!ref']);
      const row = [];
      for (let C = range.s.c; C <= range.e.c; ++C) {
        const cellAddress = { c: C, r: rowNum - 1 };
        const cellRef = XLSX.utils.encode_cell(cellAddress);
        const cell = sheet[cellRef];
        row.push(cell ? cell.v : undefined);
      }
      return { values: [null, ...row] };
    },
    eachRow: (options, callback) => {
      const range = XLSX.utils.decode_range(sheet['!ref']);
      const startRow = (options && options.minRow) ? options.minRow : range.s.r + 1;
      for (let R = startRow - 1; R <= range.e.r; ++R) {
        const rowNumber = R + 1;
        const row = [];
        for (let C = range.s.c; C <= range.e.c; ++C) {
          const cellAddress = { c: C, r: R };
          const cellRef = XLSX.utils.encode_cell(cellAddress);
          const cell = sheet[cellRef];
          row.push(cell ? cell.v : undefined);
        }
        const wsRow = { values: [null, ...row] };
        callback(wsRow, rowNumber);
      }
    }
  };
  return ws;
}

async function validateExcel() {
  const ws = loadWorksheet();

  // Header processing
  const headerRow = ws.getRow(1);
  const actualHeaders = headerRow.values.slice(1).map(normalizeHeader);

  // Build mapping from field name to column index using aliases
  const fieldIndexMap = {};
  Object.entries(HEADER_ALIASES).forEach(([field, aliases]) => {
    fieldIndexMap[field] = findHeaderIndex(actualHeaders, aliases);
  });

  // Check required columns
  const missingRequired = REQUIRED_FIELDS.filter(f => fieldIndexMap[f] === -1);
  if (missingRequired.length) {
    console.error('❌ Missing required columns:', missingRequired.join(', '));
    process.exit(1);
  }
  console.log('✅ Header validation passed.');

  // Row validation
  let errorCount = 0;
  const rows = [];
  ws.eachRow({ includeEmpty: false }, (row, rowNumber) => {
    if (rowNumber === 1) return; // skip header
    const cells = row.values.slice(1);
    const record = {};
    // Populate record using discovered indices
    Object.keys(HEADER_ALIASES).forEach(field => {
      const idx = fieldIndexMap[field];
      record[field] = idx !== -1 ? cells[idx] : undefined;
    });

    // Required field checks
    if (!record.name) {
      console.error(`❌ Row ${rowNumber}: missing 'Name'`);
      errorCount++;
    }
    if (!record.city) {
      console.error(`❌ Row ${rowNumber}: missing 'City'`);
      errorCount++;
    }
    const lat = Number(record.latitude);
    const lng = Number(record.longitude);
    if (isNaN(lat) || isNaN(lng)) {
      console.error(`❌ Row ${rowNumber}: Latitude/Longitude must be numbers (got ${record.latitude}/${record.longitude})`);
      errorCount++;
    }
    if (record.code && typeof record.code !== 'string') {
      console.error(`⚠️ Row ${rowNumber}: Code is not string`);
    }
    if (record.slug && typeof record.slug !== 'string') {
      console.error(`⚠️ Row ${rowNumber}: Slug is not string`);
    }
    rows.push(record);
  });

  if (errorCount) {
    console.error(`❌ Validation failed with ${errorCount} error(s).`);
    process.exit(1);
  }
  console.log(`✅ All ${rows.length} data rows passed validation.`);

  console.log('Sample rows:');
  rows.slice(0, 5).forEach((r, i) => console.log(`  ${i + 1}:`, r));

  // Import locations into DB
  for (const loc of rows) {
    const customer = loc.customer ? await prisma.customer.findFirst({ where: { name: loc.customer } }) : null;
    await prisma.location.upsert({
      where: { code: loc.code || '' },
      update: {
        name: loc.name,
        city: loc.city,
        type: loc.type,
        lat: Number(loc.latitude),
        lng: Number(loc.longitude),
        slug: loc.slug,
        customerId: customer?.id || undefined,
      },
      create: {
        name: loc.name,
        city: loc.city,
        type: loc.type,
        lat: Number(loc.latitude),
        lng: Number(loc.longitude),
        code: loc.code || undefined,
        slug: loc.slug,
        customer: customer ? { connect: { id: customer.id } } : undefined,
      },
    });
  }
  console.log('✅ Import completed successfully.');

  await prisma.$disconnect();
}

validateExcel().catch(err => {
  console.error('⚡ Unexpected error:', err);
  process.exit(1);
});
