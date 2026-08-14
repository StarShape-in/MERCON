import { processLocalTrucksDocsFolder } from '../controllers/batchImportController';
import { prisma } from '../db';

async function runImport() {
  const targetPath = 'C:\\Users\\ILAN\\Downloads\\Trucks Docs\\Trucks Docs';
  console.log(`Starting Batch Vehicle Documents Import from: ${targetPath}`);

  try {
    const result = await processLocalTrucksDocsFolder(targetPath);
    console.log('--- BATCH IMPORT COMPLETE ---');
    console.log(`Total Folders Scanned: ${result.totalFoldersScanned}`);
    console.log(`Total Vehicles Processed: ${result.totalVehiclesProcessed}`);
    console.log(`Total Documents Created: ${result.totalDocsCreated}`);
    console.log('\nSummary by vehicle folder:');
    result.details.forEach((d) => {
      console.log(`- Folder "${d.folder}" -> Vehicle "${d.vehiclePlate}" (${d.vehicleId}): ${d.docsCount} files`);
    });
  } catch (err) {
    console.error('Import failed:', err);
  } finally {
    await prisma.$disconnect();
  }
}

runImport();
