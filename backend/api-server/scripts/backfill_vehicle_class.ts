import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
  console.log('Backfilling vehicle_class on existing quotations...');

  const quotations = await prisma.quotation.findMany({
    where: { deletedAt: null },
    select: { id: true, name: true, vehicle_class: true, source_vehicle_label: true }
  });

  let count = 0;
  for (const q of quotations) {
    if (!q.vehicle_class || q.vehicle_class === 'Standard') {
      const targetLabel = q.source_vehicle_label || (q.name.includes('(') ? q.name.split('(').pop()?.replace(')', '').trim() : null);
      if (targetLabel) {
        await prisma.quotation.update({
          where: { id: q.id },
          data: { vehicle_class: targetLabel, source_vehicle_label: q.source_vehicle_label || targetLabel }
        });
        count++;
      }
    }
  }

  console.log(`Successfully updated ${count} quotation records with proper vehicle class!`);
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
