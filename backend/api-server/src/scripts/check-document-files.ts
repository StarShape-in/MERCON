import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('🔍 Checking Documents in database...');
  try {
    const documents = await prisma.document.findMany({
      take: 20,
      include: {
        files: true,
      },
      orderBy: { createdAt: 'desc' },
    });

    console.log(`Found ${documents.length} recent documents in database.`);
    for (const d of documents) {
      console.log(`\nDocument [${d.id}] entity_type: ${d.entity_type} | entity_id: ${d.entity_id}`);
      console.log(`  file_url: ${d.file_url}`);
      for (const f of d.files) {
        console.log(`  -> File [${f.id}] file_url: ${f.file_url}`);
      }
    }
  } catch (err: any) {
    console.log('Database error:', err.message);
  } finally {
    await prisma.$disconnect();
  }
}

main();
