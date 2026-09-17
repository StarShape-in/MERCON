import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();
async function run() {
  const trip = await prisma.trip.findFirst({
    where: { ref_id: 'TRP-0862' },
    include: { coDriver: true }
  });
  console.log(trip);
}
run();
