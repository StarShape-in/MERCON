import path from 'path';
import fs from 'fs';
import { processLocalTrucksDocsFolder } from '../src/controllers/batchImportController';
import { autoAssignUnlinkedDocs } from '../src/controllers/bulkOcrController';
import { prisma } from '../src/db';

async function main() {
  console.log('========================================================');
  console.log('🚀 RUNNING SOLUTION A: AI AUTOMATED DOCUMENT ASSIGNMENT');
  console.log('========================================================\n');

  // Check possible local folders
  const targetFolder = 'C:\\Users\\ILAN\\Downloads\\Trucks Docs\\Trucks Docs';
  const altFolder = 'C:\\Users\\ILAN\\Downloads\\Trucks Docs';

  let folderToImport = '';
  if (fs.existsSync(targetFolder)) {
    folderToImport = targetFolder;
  } else if (fs.existsSync(altFolder)) {
    folderToImport = altFolder;
  }

  if (folderToImport) {
    console.log(`📁 Scanning & Importing local truck document folders from: "${folderToImport}"`);
    try {
      const importRes = await processLocalTrucksDocsFolder(folderToImport);
      console.log(`✅ Scanned ${importRes.totalFoldersScanned} vehicle folders.`);
      console.log(`✅ Processed ${importRes.totalVehiclesProcessed} vehicles.`);
      console.log(`✅ Created/Verified ${importRes.totalDocsCreated} document records.\n`);
    } catch (err: any) {
      console.log('⚠️ Batch import note:', err.message);
    }
  } else {
    console.log('ℹ️ Local folder not found on disk, running AI matching engine on database records directly.\n');
  }

  console.log('⚡ Running AI Auto-Matching algorithm across unlinked documents...');
  const req = {} as any;
  let assignResult: any = null;
  const res = {
    json: (d: any) => { assignResult = d; return res; },
    status: (code: number) => ({ json: (d: any) => { assignResult = { code, ...d }; return res; } })
  } as any;

  await autoAssignUnlinkedDocs(req, res);

  if (assignResult && assignResult.data) {
    console.log(`✅ AI Auto-Assignment Engine matched and linked ${assignResult.data.assignedCount} document(s)!\n`);
    if (assignResult.data.details && assignResult.data.details.length > 0) {
      console.log('📋 Recent Auto-Assignments Summary:');
      for (const d of assignResult.data.details.slice(0, 20)) {
        console.log(`   • [${d.entityType}] ${d.fileName} ──> ${d.matchedEntity}`);
      }
      if (assignResult.data.details.length > 20) {
        console.log(`   ... and ${assignResult.data.details.length - 20} more documents.`);
      }
    }
  }

  // Final DB Statistics
  const totalDocs = await prisma.document.count({ where: { deletedAt: null } });
  const vehiclesCount = await prisma.vehicle.count({ where: { deletedAt: null } });
  const driversCount = await prisma.driver.count({ where: { deletedAt: null } });
  const foldersCount = await prisma.folder.count({ where: { deletedAt: null } });

  const allDocs = await prisma.document.findMany({ where: { deletedAt: null } });
  const unlinkedDocs = allDocs.filter(d => !d.entity_id || d.entity_id === 'unassigned' || d.entity_id === '').length;

  const linkedDocs = totalDocs - unlinkedDocs;

  console.log('\n========================================================');
  console.log('📊 FINAL SYSTEM ASSIGNMENT SUMMARY');
  console.log('========================================================');
  console.log(` Total Fleet Vehicles in DB : ${vehiclesCount}`);
  console.log(` Total Fleet Drivers in DB  : ${driversCount}`);
  console.log(` Total Active Folders in DB : ${foldersCount}`);
  console.log(` Total Documents in DB      : ${totalDocs}`);
  console.log(` Successfully Linked Docs   : ${linkedDocs} (${Math.round((linkedDocs / (totalDocs || 1)) * 100)}%)`);
  console.log(` Unassigned / Loose Docs    : ${unlinkedDocs}`);
  console.log('========================================================\n');

  await prisma.$disconnect();
}

main().catch((err) => {
  console.error('Execution Error:', err);
  process.exit(1);
});
