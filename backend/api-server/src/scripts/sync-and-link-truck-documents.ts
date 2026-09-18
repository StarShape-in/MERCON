import fs from 'fs';
import path from 'path';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const rootDir = path.resolve(process.cwd(), '../../Organized_Truck_Documents');
  const destUploads = path.resolve(process.cwd(), 'uploads');
  const rootUploads = path.resolve(process.cwd(), '../..', 'uploads');

  fs.mkdirSync(destUploads, { recursive: true });
  fs.mkdirSync(rootUploads, { recursive: true });

  console.log(`📦 Copying all organized truck documents to uploads...`);

  if (!fs.existsSync(rootDir)) {
    console.error(`❌ Directory not found: ${rootDir}`);
    process.exit(1);
  }

  const entries = fs.readdirSync(rootDir, { withFileTypes: true });
  const truckFolders = entries.filter(e => e.isDirectory() && /^\d{4}$/.test(e.name)).map(e => e.name);

  let copiedCount = 0;

  for (const truckNum of truckFolders) {
    const folderPath = path.join(rootDir, truckNum);
    const files = fs.readdirSync(folderPath).filter(f => fs.statSync(path.join(folderPath, f)).isFile());

    for (const f of files) {
      const srcFile = path.join(folderPath, f);
      
      // Copy to backend/api-server/uploads/
      fs.copyFileSync(srcFile, path.join(destUploads, f));
      
      // Copy to root uploads/
      fs.copyFileSync(srcFile, path.join(rootUploads, f));

      copiedCount++;
      console.log(`  ✓ Copied: ${f} -> uploads/${f}`);
    }
  }

  console.log(`\n🎉 Successfully copied ${copiedCount} truck document files to upload directories.`);

  console.log('\n🔄 Syncing database document file_url records (if database is reachable)...');
  try {
    const documents = await prisma.document.findMany({
      include: {
        files: true,
      },
    });

    let updatedDocs = 0;
    for (const doc of documents) {
      // Find matching vehicle/truck if entity_type is Vehicle or entity_id corresponds to a truck
      let truckNum: string | null = null;
      if (doc.entity_type === 'Vehicle' && doc.entity_id) {
        const vehicle = await prisma.vehicle.findUnique({ where: { id: doc.entity_id } });
        if (vehicle && vehicle.plate_number) {
          const match = vehicle.plate_number.match(/\d{4}/);
          if (match) truckNum = match[0];
        }
      }

      const docTitle = (doc as any).title || doc.file_url || '';
      if (!truckNum && docTitle) {
        const match = docTitle.match(/\d{4}/);
        if (match) truckNum = match[0];
      }

      if (truckNum) {
        const folderPath = path.join(rootDir, truckNum);
        if (fs.existsSync(folderPath)) {
          const filesInFolder = fs.readdirSync(folderPath);
          const docTypeUpper = (doc.file_url || docTitle).toUpperCase();

          let matchingFile = filesInFolder.find(f => {
            const fUpper = f.toUpperCase();
            if (docTypeUpper.includes('ISTIMARA') || docTypeUpper.includes('ESTIMARA')) return fUpper.includes('ISTIMARA');
            if (docTypeUpper.includes('INSURANCE')) return fUpper.includes('INSURANCE');
            if (docTypeUpper.includes('OPERATION') || docTypeUpper.includes('OP_CARD')) return fUpper.includes('OPERATION');
            if (docTypeUpper.includes('SASO') || docTypeUpper.includes('PLATE')) return fUpper.includes('SASO') || fUpper.includes('PLATE');
            if (docTypeUpper.includes('FAHAS') || docTypeUpper.includes('FAHS')) return fUpper.includes('FAHAS');
            return false;
          });

          if (matchingFile) {
            const newFileUrl = `/uploads/${matchingFile}`;
            await prisma.document.update({
              where: { id: doc.id },
              data: { file_url: newFileUrl },
            });

            for (const df of doc.files) {
              await prisma.documentFile.update({
                where: { id: df.id },
                data: { file_url: newFileUrl },
              });
            }

            console.log(`  ✅ Updated Document [${doc.id}] -> ${newFileUrl}`);
            updatedDocs++;
          }
        }
      }
    }
    console.log(`\n🎉 Updated ${updatedDocs} document file_url records in database.`);
  } catch (err: any) {
    console.log('  ℹ️ Database connection not reachable at present. Express fallback static router will handle file resolution.');
  } finally {
    await prisma.$disconnect();
  }
}

main().catch(err => {
  console.error('❌ Error syncing truck documents:', err);
});
