import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
  const quotations = await prisma.quotation.findMany({
    where: { deletedAt: null },
    select: { id: true, name: true, vehicle_class: true, source_vehicle_label: true }
  });
  console.log('Quotations in DB:', quotations.length);
  quotations.forEach((q, i) => {
    console.log(`[${i+1}] Name: ${q.name} | class: ${q.vehicle_class} | label: ${q.source_vehicle_label}`);
  });
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
