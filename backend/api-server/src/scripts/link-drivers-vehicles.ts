import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function linkDriversAndVehicles() {
  const drivers = await prisma.driver.findMany({
    where: { deletedAt: null, assignedVehicleId: null },
    orderBy: { createdAt: 'asc' },
  });

  const vehicles = await prisma.vehicle.findMany({
    where: { deletedAt: null, assignedDriver: null },
    orderBy: { createdAt: 'asc' },
  });

  console.log(`Found ${drivers.length} unassigned drivers and ${vehicles.length} unassigned vehicles.`);

  for (let i = 0; i < Math.min(drivers.length, vehicles.length); i++) {
    const driver = drivers[i];
    const vehicle = vehicles[i];

    await prisma.driver.update({
      where: { id: driver.id },
      data: { assignedVehicleId: vehicle.id },
    });

    console.log(`✅ Linked Driver ${driver.first_name} ${driver.last_name} -> Truck ${vehicle.plate_number} (${vehicle.asset_type})`);
  }
}

linkDriversAndVehicles()
  .catch((e) => {
    console.error('Error linking drivers and vehicles:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
