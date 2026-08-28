import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
  const quotations = await prisma.quotation.findMany({
    where: {
      deletedAt: null,
      is_active: true,
      customer: { name: { contains: 'Horizon', mode: 'insensitive' } }
    },
    select: { id: true, name: true, vehicle_class: true, source_vehicle_label: true, createdAt: true, source_type: true }
  });
  console.log('Active Horizon Quotations count:', quotations.length);
  quotations.forEach((q, i) => {
    console.log(`[${i+1}] Name: ${q.name} | class: ${q.vehicle_class} | label: ${q.source_vehicle_label} | src: ${q.source_type}`);
  });
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
