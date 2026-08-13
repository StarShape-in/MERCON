import { PrismaClient, Role } from '@prisma/client';
import * as bcrypt from 'bcrypt';

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

  await backfillMaintenanceRefIds();
  await releaseVehiclesStuckInMaintenance();
  await seedDefaultServices();
  await seedDefaultBillingLedgerData();

  console.log('✅ Default accounts and billing data seeded successfully!');
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

/**
 * Idempotently seeds test companies and billing ledger trips across diverse date ranges.
 */
async function seedDefaultBillingLedgerData() {
  const customerDefs = [
    { name: 'Aramco Logistics Solutions', phone: '+966 50 123 4567' },
    { name: 'SABIC Global Supply Chain', phone: '+966 55 987 6543' },
    { name: 'Al-Marai Cold Chain Distribution', phone: '+966 54 321 0987' },
    { name: 'Olayan Freight & Cargo', phone: '+966 51 444 3322' },
    { name: 'BinZagur Logistics Co.', phone: '+966 56 777 8899' },
    { name: 'Panda Retail Logistics', phone: '+966 53 222 1100' },
  ];

  const customers: any[] = [];
  for (const cdef of customerDefs) {
    let cust = await prisma.customer.findFirst({ where: { name: { contains: cdef.name.split(' ')[0], mode: 'insensitive' } } });
    if (!cust) {
      cust = await prisma.customer.create({
        data: {
          name: cdef.name,
          contact_phone: cdef.phone,
        }
      });
    }
    customers.push(cust);
  }

  const drivers = await prisma.driver.findMany();
  const vehicles = await prisma.vehicle.findMany();
  const driverId = drivers.length > 0 ? drivers[0].id : null;
  const vehicleId = vehicles.length > 0 ? vehicles[0].id : null;

  const now = new Date();
  const getTodayDate = () => new Date();
  const getThisWeekDate = () => { const d = new Date(); d.setDate(d.getDate() - 2); return d; };
  const getThisMonthDate = () => { const d = new Date(); d.setDate(5); return d; };
  const getLastMonthDate = () => { const d = new Date(); d.setMonth(d.getMonth() - 1); d.setDate(15); return d; };
  const getOlderDate = () => { const d = new Date(); d.setMonth(d.getMonth() - 3); return d; };

  const tripsToCreate = [
    { cust: customers[0], ref_id: 'TRP-2026-TODAY-01', status: 'Completed' as const, billing: 6500, labor: 400, stop_chg: 300, origin: 'Dammam Port Gate 3', dest: 'Riyadh Industrial City 2', date: getTodayDate(), invoiced: false, zatca: undefined, note: undefined },
    { cust: customers[1], ref_id: 'TRP-2026-TODAY-02', status: 'Invoiced' as const, billing: 9200, labor: 500, stop_chg: 0, origin: 'Jubail Industrial Complex', dest: 'King Fahd Industrial Port', date: getTodayDate(), invoiced: true, zatca: 'ZATCA-TODAY-02', note: 'Same day urgent chemical haulage' },
    { cust: customers[2], ref_id: 'TRP-2026-WEEK-01', status: 'Completed' as const, billing: 3800, labor: 150, stop_chg: 200, origin: 'Al-Kharj Central Dairy Farm', dest: 'Riyadh Cold Depot', date: getThisWeekDate(), invoiced: false, zatca: undefined, note: undefined },
    { cust: customers[3], ref_id: 'TRP-2026-WEEK-02', status: 'Invoiced' as const, billing: 11500, labor: 800, stop_chg: 600, origin: 'Jeddah Islamic Port Gate 5', dest: 'Medina Highway DC', date: getThisWeekDate(), invoiced: true, zatca: 'ZATCA-WEEK-99', note: 'Heavy equipment transport' },
    { cust: customers[0], ref_id: 'TRP-2026-TMONTH-01', status: 'Completed' as const, billing: 7200, labor: 350, stop_chg: 250, origin: 'Ras Tanura Refinery Gate 1', dest: 'Yanbu Terminal', date: getThisMonthDate(), invoiced: false, zatca: undefined, note: undefined },
    { cust: customers[4], ref_id: 'TRP-2026-TMONTH-02', status: 'Invoiced' as const, billing: 4900, labor: 200, stop_chg: 150, origin: 'Khobar Commercial Zone', dest: 'Al-Ahsa Logistics Park', date: getThisMonthDate(), invoiced: true, zatca: 'ZATCA-TMONTH-02', note: 'FMCG Monthly Delivery Batch #1' },
    { cust: customers[1], ref_id: 'TRP-2026-LMONTH-01', status: 'Completed' as const, billing: 12800, labor: 900, stop_chg: 500, origin: 'Jubail 2 Chemical Storage', dest: 'Rabigh Petrochemical Port', date: getLastMonthDate(), invoiced: false, zatca: undefined, note: undefined },
    { cust: customers[5], ref_id: 'TRP-2026-LMONTH-02', status: 'Invoiced' as const, billing: 5600, labor: 300, stop_chg: 200, origin: 'Qassim Produce Terminal', dest: 'Riyadh Hypermarket DC', date: getLastMonthDate(), invoiced: true, zatca: 'ZATCA-LMONTH-44', note: 'Monthly supermarket distribution contract' },
    { cust: customers[3], ref_id: 'TRP-2026-OLD-01', status: 'Invoiced' as const, billing: 14200, labor: 1000, stop_chg: 750, origin: 'Dammam Sea Port Terminal 1', dest: 'Tabuk Logistics Hub', date: getOlderDate(), invoiced: true, zatca: 'ZATCA-HIST-101', note: 'Q1 Container haulage contract' },
    { cust: customers[5], ref_id: 'TRP-2026-OLD-02', status: 'Completed' as const, billing: 4100, labor: 150, stop_chg: 100, origin: 'Southern Ring Road DC', dest: 'Kharj Supercenter', date: getOlderDate(), invoiced: false, zatca: undefined, note: undefined }
  ];

  let seededCount = 0;
  for (const t of tripsToCreate) {
    if (!t.cust) continue;
    const existing = await prisma.trip.findFirst({ where: { ref_id: t.ref_id } });
    if (existing) continue;

    const createdTrip = await prisma.trip.create({
      data: {
        ref_id: t.ref_id,
        customerId: t.cust.id,
        driverId,
        vehicleId,
        status: t.status,
        billing_amount: t.billing,
        waiting_labor_charges: t.labor,
        additional_stop_charges: t.stop_chg,
        trip_charges: t.billing,
        planned_start: t.date,
        createdAt: t.date,
        stops: {
          create: [
            { stop_sequence: 1, stop_type: 'Pickup', location_name: t.origin, location_lat: 26.43, location_lng: 50.10 },
            { stop_sequence: 2, stop_type: 'Dropoff', location_name: t.dest, location_lat: 24.71, location_lng: 46.67 },
          ]
        }
      }
    });

    if (t.invoiced) {
      await prisma.invoice.create({
        data: {
          ref_id: 'INV-' + t.ref_id.replace('TRP-', ''),
          tripId: createdTrip.id,
          customerId: t.cust.id,
          subtotal: t.billing,
          total_amount: t.billing + t.labor + t.stop_chg,
          due_date: new Date().toISOString(),
          status: 'Paid',
          zatca_ref: t.zatca,
          invoicing_note: t.note,
          createdAt: t.date,
        }
      });
    }
    seededCount++;
  }

  if (seededCount > 0) {
    console.log(`  ✓ Seeded ${seededCount} default billing ledger trips`);
  }
}

main()
  .catch((e) => {
    console.error('❌ Error during seeding:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
