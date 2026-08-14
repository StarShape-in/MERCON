import { prisma } from '../db';

async function check() {
  const total = await prisma.document.count({ where: { deletedAt: null } });
  const extracted = await prisma.document.count({ where: { deletedAt: null, expiry_date: { not: null } } });
  const samples = await prisma.document.findMany({
    where: { deletedAt: null, expiry_date: { not: null } },
    select: { doc_type: true, expiry_date: true, ai_extracted_json: true },
    take: 10,
  });

  console.log('--- OCR EXTRACTION STATS ---');
  console.log(`Total Documents in Database: ${total}`);
  console.log(`Documents with Extracted Expiry Dates: ${extracted}`);
  console.log('Sample Extracted Records:');
  console.log(JSON.stringify(samples, null, 2));

  await prisma.$disconnect();
}

check();
