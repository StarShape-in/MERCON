import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('--- MERCON DATABASE TRIP DIAGNOSTIC ---');
  
  // 1. Total Counts
  const totalTrips = await prisma.trip.count();
  const activeTrips = await prisma.trip.count({ where: { deletedAt: null } });
  const deletedTrips = await prisma.trip.count({ where: { NOT: { deletedAt: null } } });
  
  console.log(`Total Trips in DB: ${totalTrips}`);
  console.log(`Active Trips (deletedAt is null): ${activeTrips}`);
  console.log(`Soft-Deleted Trips (deletedAt is NOT null): ${deletedTrips}`);
  
  if (activeTrips > 0) {
    console.log('\n--- ACTIVE TRIPS DETAILS ---');
    const trips = await prisma.trip.findMany({
      where: { deletedAt: null },
      take: 50,
      include: {
        customer: { select: { name: true } }
      }
    });
    
    trips.forEach((t, i) => {
      console.log(`[${i + 1}] Ref: ${t.ref_id || t.id} | Status: ${t.status} | Customer: ${t.customer?.name || 'Unassigned'} | Planned Start: ${t.planned_start ? t.planned_start.toISOString() : 'N/A'} | Created: ${t.createdAt.toISOString()}`);
    });
    
    if (activeTrips > 50) {
      console.log(`... and ${activeTrips - 50} more active trips`);
    }
    
    // Check if user wants to purge them via environment flag
    if (process.env.PURGE_ALL === 'yes') {
      console.log('\nPurging all active trips...');
      const deleted = await prisma.trip.updateMany({
        where: { deletedAt: null },
        data: { deletedAt: new Date(), isActive: false }
      });
      console.log(`Successfully soft-deleted ${deleted.count} trips.`);
    } else {
      console.log('\nTo delete all active trips, run this script with PURGE_ALL=yes:');
      console.log('  PURGE_ALL=yes npx --workspace=@mercon/api-server ts-node scripts/inspect-and-delete-trips.ts');
    }
  } else {
    console.log('\nNo active trips found in the database.');
  }
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
