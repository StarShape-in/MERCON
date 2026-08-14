import { PrismaClient, Role } from '@prisma/client';
import * as bcrypt from 'bcrypt';
import { MODULE_KEYS } from '@mercon/shared-types';

const prisma = new PrismaClient();

/**
 * Seeds the canonical accounts: admin (role Admin), operator (role Operator),
 * and ilan (role Admin, added at owner's request).
 * This must stay idempotent (upserts, never blind creates) and must never
 * overwrite passwords of existing users — it runs on every container start.
 *
 * Do NOT add fake/demo drivers, vehicles, customers, trips, or invoices here.
 * That was done once, shipped fake data to production on every deploy, and
 * was removed — see CLAUDE.md's "Database & seed rules".
 */
async function main() {
  console.log('🌱 Seeding MERCON default accounts...');

  // Only used to create these two accounts if they don't exist yet. Existing
  // accounts are never touched here — see the `update` blocks below, which
  // intentionally omit `password_hash`.
  const defaultPassword = process.env.SEED_ADMIN_PASSWORD ?? 'password123';
  const password_hash = await bcrypt.hash(defaultPassword, 10);
  const ilan_password_hash = await bcrypt.hash('ilan1234', 10);

  const admin = await prisma.user.upsert({
    where: { username: 'admin' },
    update: {}, // never touch role/password/isActive on an existing account
    create: {
      username: 'admin',
      email: 'admin@mercon.tech',
      phone: '+966500000001',
      password_hash,
      name: 'Mercon Admin',
      role: Role.Admin,
      isActive: true,
      isSuperAdmin: true,
    },
  });
  console.log(`  ✓ Admin user: ${admin.username}`);

  const operator = await prisma.user.upsert({
    where: { username: 'operator' },
    update: {},
    create: {
      username: 'operator',
      email: 'operator@mercon.tech',
      phone: '+966500000002',
      password_hash,
      name: 'Mercon Operator',
      role: Role.Operator,
      isActive: true,
    },
  });
  console.log(`  ✓ Operator user: ${operator.username}`);

  const ilan = await prisma.user.upsert({
    where: { username: 'ilan' },
    update: {},
    create: {
      username: 'ilan',
      email: 'ilan@mercon.tech',
      password_hash: ilan_password_hash,
      name: 'Ilan',
      role: Role.Admin,
      isActive: true,
    },
  });
  console.log(`  ✓ Admin user: ${ilan.username}`);

  // enabledModules defaults to every known module on first creation, so an
  // existing deployment (Mercon) sees no regression the moment this table
  // exists — its dashboard already uses all of them today. A brand-new
  // client's superadmin can then turn specific modules off deliberately.
  await prisma.settings.upsert({
    where: { id: 'singleton' },
    update: {}, // never overwrite branding/module config an owner already set
    create: { id: 'singleton', enabledModules: [...MODULE_KEYS] },
  });
  console.log('  ✓ Settings row present');

  await backfillMaintenanceRefIds();
  await releaseVehiclesStuckInMaintenance();
  await seedDefaultServices();

  console.log('✅ Default accounts seeded successfully!');
}

/**
 * Repairs vehicles left showing "Maintenance" after their service order was closed.
 *
 * Before `syncVehicleMaintenanceStatus`, the vehicle was only released when a record was
 * edited from an open state to Completed/Cancelled — completing it another way, logging an
 * already-completed order, or deleting the open one left `Vehicle.status = 'Maintenance'`
 * forever, which is what the Vehicles list, KPI cards and details page read.
 *
 * A vehicle is only released when it has service history, none of it open, and it has not
 * been touched since its last service order changed. That last condition is what protects a
 * deliberate "Mark Maintenance" from the Vehicles page: marking it bumps `Vehicle.updatedAt`
 * past the record's, so this skips it.
 *
 * Idempotent: a no-op once every stuck vehicle is back to Available.
 */
async function releaseVehiclesStuckInMaintenance() {
  // Normalise the legacy `In Progress` spelling first, so "is anything open?" is one check.
  const renamed = await prisma.maintenanceRecord.updateMany({
    where: { status: 'In Progress' },
    data: { status: 'In_Progress' },
  });
  if (renamed.count > 0) {
    console.log(`  ✓ Normalised ${renamed.count} maintenance record(s) to status In_Progress`);
  }

  const candidates = await prisma.vehicle.findMany({
    where: {
      status: 'Maintenance',
      deletedAt: null,
      maintenanceRecords: { some: { deletedAt: null } },
      NOT: { maintenanceRecords: { some: { deletedAt: null, status: 'In_Progress' } } },
    },
    select: {
      id: true,
      plate_number: true,
      updatedAt: true,
      maintenanceRecords: {
        where: { deletedAt: null },
        select: { updatedAt: true },
        orderBy: { updatedAt: 'desc' },
        take: 1,
      },
    },
  });

  const stuck = candidates.filter(
    (v) => v.maintenanceRecords[0] && v.updatedAt <= v.maintenanceRecords[0].updatedAt,
  );

  if (stuck.length === 0) return;

  await prisma.vehicle.updateMany({
    where: { id: { in: stuck.map((v) => v.id) } },
    data: { status: 'Available' },
  });

  console.log(
    `  ✓ Released ${stuck.length} vehicle(s) stuck in Maintenance: ${stuck
      .map((v) => v.plate_number)
      .join(', ')}`,
  );
}

/**
 * Service orders gained a sequential `ref_id` (MNT-001, MNT-002, …) after records
 * already existed. Number the un-numbered ones oldest-first so the sequence matches
 * the order they were created in.
 *
 * Idempotent: records that already carry a ref_id are skipped, so this is a no-op on
 * every start after the first.
 */
async function backfillMaintenanceRefIds() {
  const unnumbered = await prisma.maintenanceRecord.findMany({
    where: { ref_id: null, deletedAt: null },
    select: { id: true },
    orderBy: { createdAt: 'asc' },
  });

  if (unnumbered.length === 0) return;

  const taken = new Set(
    (await prisma.maintenanceRecord.findMany({
      where: { ref_id: { not: null } },
      select: { ref_id: true },
    }))
      .map((r) => parseInt(String(r.ref_id).replace('MNT-', ''), 10))
      .filter((n) => !isNaN(n)),
  );

  let next = 1;
  for (const record of unnumbered) {
    while (taken.has(next)) next++;
    await prisma.maintenanceRecord.update({
      where: { id: record.id },
      data: { ref_id: `MNT-${String(next).padStart(3, '0')}` },
    });
    taken.add(next);
  }

  console.log(`  ✓ Backfilled ref_id for ${unnumbered.length} maintenance record(s)`);
}

/**
 * Seed common work done service items so the dashboard has ready-to-select entries out of the box.
 */
async function seedDefaultServices() {
  const defaultServices = [
    { title: 'Tire Puncture Repair', category: 'Tires' },
    { title: 'Tire Replacement (New Unit)', category: 'Tires' },
    { title: 'Wheel Alignment & Balancing', category: 'Tires' },
    { title: 'Oil & Filter Change (Engine)', category: 'Oil & Fluids' },
    { title: 'Transmission Fluid Service', category: 'Oil & Fluids' },
    { title: 'Brake Pad & Disc Replacement', category: 'Brakes' },
    { title: 'Battery Replacement & Electrical Check', category: 'Electrical' },
    { title: 'Engine Diagnostic & Tune-up', category: 'Engine' },
    { title: 'AC Maintenance & Gas Refill', category: 'General' },
    { title: 'Periodic Inspection / Istimara Renewal', category: 'Inspection' },
    { title: 'Hydraulic Hose & Fluid Repair', category: 'General' },
    { title: 'Suspension & Shock Absorber Repair', category: 'General' },
  ];

  for (const svc of defaultServices) {
    await prisma.savedWorkDone.upsert({
      where: { title: svc.title },
      update: {},
      create: {
        title: svc.title,
        category: svc.category,
      },
    });
  }

  console.log('  ✓ Seeded default service items');
}

main()
  .catch((e) => {
    console.error('❌ Error during seeding:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
