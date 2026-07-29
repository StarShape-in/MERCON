import { PrismaClient, Role, DriverStatus, AssetStatus, AssetType, TripStatus, StopType, InvoiceStatus } from '@prisma/client';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Starting MERCON database seed...');

  const defaultPassword = 'password123';
  const password_hash = await bcrypt.hash(defaultPassword, 10);

  // ---------------------------------------------------------------------------
  // 1. USERS (Admin, Operator, Drivers)
  // ---------------------------------------------------------------------------
  console.log('👤 Seeding System Users...');

  const admin = await prisma.user.upsert({
    where: { username: 'admin' },
    update: { role: Role.Admin, isActive: true },
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
    update: { role: Role.Operator, isActive: true },
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

  const driverUserAccountsData = [
    { username: 'driver.ahmed', email: 'ahmed.mansoor@mercon.tech', phone: '+966501112233', name: 'Ahmed Al-Mansoor' },
    { username: 'driver.khalid', email: 'khalid.ghamdi@mercon.tech', phone: '+966502223344', name: 'Khalid Al-Ghamdi' },
    { username: 'driver.tariq', email: 'tariq.zahrani@mercon.tech', phone: '+966503334455', name: 'Tariq Al-Zahrani' },
    { username: 'driver.youssef', email: 'youssef.otaibi@mercon.tech', phone: '+966504445566', name: 'Youssef Al-Otaibi' },
  ];

  const driverUserMap = new Map<string, string>();
  for (const du of driverUserAccountsData) {
    const user = await prisma.user.upsert({
      where: { username: du.username },
      update: { role: Role.Driver, isActive: true },
      create: {
        username: du.username,
        email: du.email,
        phone: du.phone,
        password_hash,
        name: du.name,
        role: Role.Driver,
        isActive: true,
      },
    });
    driverUserMap.set(du.username, user.id);
  }
  console.log(`  ✓ Created/updated ${driverUserAccountsData.length} driver user accounts.`);

  // ---------------------------------------------------------------------------
  // 2. CUSTOMERS
  // ---------------------------------------------------------------------------
  console.log('🏢 Seeding Customers...');

  const customersData = [
    { name: 'Aramco Logistics Solutions', contact_phone: '+966112223333', credit_limit: 500000 },
    { name: 'SABIC Global Supply Chain', contact_phone: '+966113334444', credit_limit: 750000 },
    { name: 'Almarai Fresh Distribution', contact_phone: '+966114445555', credit_limit: 300000 },
    { name: 'Naqel Express Services', contact_phone: '+966115556666', credit_limit: 200000 },
    { name: 'Panda Retail Operations', contact_phone: '+966116667777', credit_limit: 450000 },
  ];

  const customerMap = new Map<string, string>();
  for (const cData of customersData) {
    const existing = await prisma.customer.findFirst({ where: { name: cData.name } });
    const customer = existing
      ? await prisma.customer.update({
          where: { id: existing.id },
          data: { contact_phone: cData.contact_phone, credit_limit: cData.credit_limit, isActive: true },
        })
      : await prisma.customer.create({
          data: { ...cData, isActive: true },
        });
    customerMap.set(cData.name, customer.id);
  }
  console.log(`  ✓ ${customersData.length} Customers ready.`);

  // ---------------------------------------------------------------------------
  // 3. DRIVERS
  // ---------------------------------------------------------------------------
  console.log('🚛 Seeding Fleet Drivers...');

  const driversData = [
    {
      ref_id: 'DRV-1001',
      first_name: 'Ahmed',
      last_name: 'Al-Mansoor',
      phone_primary: '+966501112233',
      license_number: 'SA-DL-98210',
      license_expiry: new Date('2028-12-31'),
      status: DriverStatus.OnTrip,
      ai_risk_score: 0.12,
      usernameKey: 'driver.ahmed',
    },
    {
      ref_id: 'DRV-1002',
      first_name: 'Khalid',
      last_name: 'Al-Ghamdi',
      phone_primary: '+966502223344',
      license_number: 'SA-DL-84721',
      license_expiry: new Date('2027-08-15'),
      status: DriverStatus.Available,
      ai_risk_score: 0.05,
      usernameKey: 'driver.khalid',
    },
    {
      ref_id: 'DRV-1003',
      first_name: 'Tariq',
      last_name: 'Al-Zahrani',
      phone_primary: '+966503334455',
      license_number: 'SA-DL-77341',
      license_expiry: new Date('2029-01-20'),
      status: DriverStatus.Available,
      ai_risk_score: 0.18,
      usernameKey: 'driver.tariq',
    },
    {
      ref_id: 'DRV-1004',
      first_name: 'Youssef',
      last_name: 'Al-Otaibi',
      phone_primary: '+966504445566',
      license_number: 'SA-DL-66129',
      license_expiry: new Date('2026-11-10'),
      status: DriverStatus.OffDuty,
      ai_risk_score: 0.08,
      usernameKey: 'driver.youssef',
    },
    {
      ref_id: 'DRV-1005',
      first_name: 'Fatima',
      last_name: 'Al-Harbi',
      phone_primary: '+966505556677',
      license_number: 'SA-DL-55231',
      license_expiry: new Date('2030-05-01'),
      status: DriverStatus.Available,
      ai_risk_score: 0.02,
      usernameKey: null,
    },
  ];

  const driverMap = new Map<string, string>();
  for (const d of driversData) {
    const userId = d.usernameKey ? driverUserMap.get(d.usernameKey) : null;
    const existing = await prisma.driver.findUnique({ where: { ref_id: d.ref_id } });

    const driverPayload = {
      first_name: d.first_name,
      last_name: d.last_name,
      phone_primary: d.phone_primary,
      license_number: d.license_number,
      license_expiry: d.license_expiry,
      status: d.status,
      ai_risk_score: d.ai_risk_score,
      userId: userId || undefined,
      isActive: true,
    };

    const driver = existing
      ? await prisma.driver.update({ where: { ref_id: d.ref_id }, data: driverPayload })
      : await prisma.driver.create({ data: { ref_id: d.ref_id, ...driverPayload } });

    driverMap.set(d.ref_id, driver.id);
  }
  console.log(`  ✓ ${driversData.length} Drivers ready.`);

  // ---------------------------------------------------------------------------
  // 4. VEHICLES
  // ---------------------------------------------------------------------------
  console.log('🚚 Seeding Fleet Vehicles...');

  const vehiclesData = [
    {
      ref_id: 'VEH-2001',
      plate_number: 'KSA-1029',
      asset_type: AssetType.Flatbed,
      status: AssetStatus.OnTrip,
      capacity_kg: 25000,
      current_odometer: 142500.5,
      gps_device_id: 'GPS-FLT-1029',
      last_lat: 24.7136,
      last_lng: 46.6753,
      trailer_number: 'TRL-901',
      trailer_type: AssetType.Flatbed,
      trailer_capacity_kg: 25000,
      icces_device_id: 'ICC-1029',
    },
    {
      ref_id: 'VEH-2002',
      plate_number: 'KSA-4820',
      asset_type: AssetType.Reefer,
      status: AssetStatus.Available,
      capacity_kg: 18000,
      current_odometer: 89300.0,
      gps_device_id: 'GPS-REF-4820',
      last_lat: 21.5433,
      last_lng: 39.1728,
      trailer_number: 'TRL-902',
      trailer_type: AssetType.Reefer,
      trailer_capacity_kg: 18000,
      icces_device_id: 'ICC-4820',
    },
    {
      ref_id: 'VEH-2003',
      plate_number: 'KSA-9931',
      asset_type: AssetType.Tanker,
      status: AssetStatus.Available,
      capacity_kg: 30000,
      current_odometer: 210400.2,
      gps_device_id: 'GPS-TNK-9931',
      last_lat: 26.4207,
      last_lng: 50.0888,
      trailer_number: 'TRL-903',
      trailer_type: AssetType.Tanker,
      trailer_capacity_kg: 30000,
      icces_device_id: 'ICC-9931',
    },
    {
      ref_id: 'VEH-2004',
      plate_number: 'KSA-5512',
      asset_type: AssetType.Box,
      status: AssetStatus.Maintenance,
      capacity_kg: 12000,
      current_odometer: 175100.8,
      gps_device_id: 'GPS-BOX-5512',
      last_lat: 24.4686,
      last_lng: 39.6142,
      trailer_number: 'TRL-904',
      trailer_type: AssetType.Box,
      trailer_capacity_kg: 12000,
      icces_device_id: 'ICC-5512',
    },
  ];

  const vehicleMap = new Map<string, string>();
  for (const v of vehiclesData) {
    const existing = await prisma.vehicle.findUnique({ where: { plate_number: v.plate_number } });
    const vehiclePayload = {
      ref_id: v.ref_id,
      asset_type: v.asset_type,
      status: v.status,
      capacity_kg: v.capacity_kg,
      current_odometer: v.current_odometer,
      gps_device_id: v.gps_device_id,
      last_lat: v.last_lat,
      last_lng: v.last_lng,
      trailer_number: v.trailer_number,
      trailer_type: v.trailer_type,
      trailer_capacity_kg: v.trailer_capacity_kg,
      icces_device_id: v.icces_device_id,
      isActive: true,
    };

    const vehicle = existing
      ? await prisma.vehicle.update({ where: { plate_number: v.plate_number }, data: vehiclePayload })
      : await prisma.vehicle.create({ data: { plate_number: v.plate_number, ...vehiclePayload } });

    vehicleMap.set(v.ref_id, vehicle.id);
  }
  console.log(`  ✓ ${vehiclesData.length} Vehicles ready.`);

  // ---------------------------------------------------------------------------
  // 5. RATE CARDS
  // ---------------------------------------------------------------------------
  console.log('💳 Seeding Rate Cards...');

  const rateCardsData = [
    {
      name: 'Riyadh to Dammam Heavy Freight Standard',
      route_origin: 'Riyadh',
      route_destination: 'Dammam',
      base_price: 3500.0,
      currency: 'SAR',
      customerName: 'Aramco Logistics Solutions',
    },
    {
      name: 'Riyadh to Jeddah Express Reefer Rate',
      route_origin: 'Riyadh',
      route_destination: 'Jeddah',
      base_price: 4800.0,
      currency: 'SAR',
      customerName: 'Almarai Fresh Distribution',
    },
    {
      name: 'Jeddah to Medina Local Distribution',
      route_origin: 'Jeddah',
      route_destination: 'Medina',
      base_price: 2200.0,
      currency: 'SAR',
      customerName: 'Panda Retail Operations',
    },
    {
      name: 'Dammam to Jubail Industrial Tanker Rate',
      route_origin: 'Dammam',
      route_destination: 'Jubail',
      base_price: 1800.0,
      currency: 'SAR',
      customerName: 'SABIC Global Supply Chain',
    },
    {
      name: 'Kingdom-Wide Baseline Rate Card',
      route_origin: 'Riyadh',
      route_destination: 'General Kingdom Route',
      base_price: 3000.0,
      currency: 'SAR',
      customerName: null,
    },
  ];

  for (const rc of rateCardsData) {
    const customerId = rc.customerName ? customerMap.get(rc.customerName) : null;
    const existing = await prisma.rateCard.findFirst({
      where: { name: rc.name },
    });

    if (existing) {
      await prisma.rateCard.update({
        where: { id: existing.id },
        data: {
          route_origin: rc.route_origin,
          route_destination: rc.route_destination,
          base_price: rc.base_price,
          currency: rc.currency,
          customerId: customerId || undefined,
          is_active: true,
        },
      });
    } else {
      await prisma.rateCard.create({
        data: {
          name: rc.name,
          route_origin: rc.route_origin,
          route_destination: rc.route_destination,
          base_price: rc.base_price,
          currency: rc.currency,
          customerId: customerId || undefined,
          is_active: true,
        },
      });
    }
  }
  console.log(`  ✓ ${rateCardsData.length} Rate Cards ready.`);

  // ---------------------------------------------------------------------------
  // 6. TRIPS & TRIP STOPS
  // ---------------------------------------------------------------------------
  console.log('📦 Seeding Trips & TripStops...');

  const now = Date.now();
  const tripsData = [
    {
      ref_id: 'TRP-3001',
      customerName: 'Aramco Logistics Solutions',
      driverRefId: 'DRV-1001',
      vehicleRefId: 'VEH-2001',
      status: TripStatus.InTransit,
      cargo_type: 'Petrochemical Polymers',
      hazmat_flag: true,
      planned_distance: 412.5,
      planned_start: new Date(now - 3600000 * 8),
      actual_start: new Date(now - 3600000 * 7),
      planned_end: new Date(now + 3600000 * 4),
      stops: [
        { stop_sequence: 1, stop_type: StopType.Pickup, location_lat: 24.7136, location_lng: 46.6753, planned_arrival: new Date(now - 3600000 * 8), actual_arrival: new Date(now - 3600000 * 7) },
        { stop_sequence: 2, stop_type: StopType.Dropoff, location_lat: 26.4207, location_lng: 50.0888, planned_arrival: new Date(now + 3600000 * 4), actual_arrival: null },
      ],
    },
    {
      ref_id: 'TRP-3002',
      customerName: 'Almarai Fresh Distribution',
      driverRefId: 'DRV-1002',
      vehicleRefId: 'VEH-2002',
      status: TripStatus.Completed,
      cargo_type: 'Fresh Dairy & Refrigerated Goods',
      hazmat_flag: false,
      planned_distance: 950.0,
      planned_start: new Date(now - 86400000 * 3),
      actual_start: new Date(now - 86400000 * 3 + 1800000),
      planned_end: new Date(now - 86400000 * 2),
      actual_end: new Date(now - 86400000 * 2 - 3600000),
      stops: [
        { stop_sequence: 1, stop_type: StopType.Pickup, location_lat: 24.7136, location_lng: 46.6753, planned_arrival: new Date(now - 86400000 * 3), actual_arrival: new Date(now - 86400000 * 3 + 1800000) },
        { stop_sequence: 2, stop_type: StopType.Dropoff, location_lat: 21.5433, location_lng: 39.1728, planned_arrival: new Date(now - 86400000 * 2), actual_arrival: new Date(now - 86400000 * 2 - 3600000) },
      ],
    },
    {
      ref_id: 'TRP-3003',
      customerName: 'SABIC Global Supply Chain',
      driverRefId: 'DRV-1003',
      vehicleRefId: 'VEH-2003',
      status: TripStatus.Invoiced,
      cargo_type: 'Bulk Liquid Chemicals',
      hazmat_flag: true,
      planned_distance: 480.0,
      planned_start: new Date(now - 86400000 * 5),
      actual_start: new Date(now - 86400000 * 5),
      planned_end: new Date(now - 86400000 * 4),
      actual_end: new Date(now - 86400000 * 4),
      stops: [
        { stop_sequence: 1, stop_type: StopType.Pickup, location_lat: 26.4207, location_lng: 50.0888, planned_arrival: new Date(now - 86400000 * 5), actual_arrival: new Date(now - 86400000 * 5) },
        { stop_sequence: 2, stop_type: StopType.Dropoff, location_lat: 27.0046, location_lng: 49.6601, planned_arrival: new Date(now - 86400000 * 4), actual_arrival: new Date(now - 86400000 * 4) },
      ],
    },
    {
      ref_id: 'TRP-3004',
      customerName: 'Panda Retail Operations',
      driverRefId: null,
      vehicleRefId: null,
      status: TripStatus.Draft,
      cargo_type: 'Consumer Packaged Goods',
      hazmat_flag: false,
      planned_distance: 420.0,
      planned_start: new Date(now + 86400000 * 2),
      actual_start: null,
      planned_end: new Date(now + 86400000 * 3),
      actual_end: null,
      stops: [
        { stop_sequence: 1, stop_type: StopType.Pickup, location_lat: 21.5433, location_lng: 39.1728, planned_arrival: new Date(now + 86400000 * 2), actual_arrival: null },
        { stop_sequence: 2, stop_type: StopType.Dropoff, location_lat: 24.4686, location_lng: 39.6142, planned_arrival: new Date(now + 86400000 * 3), actual_arrival: null },
      ],
    },
  ];

  const tripMap = new Map<string, string>();
  for (const t of tripsData) {
    const customerId = customerMap.get(t.customerName)!;
    const driverId = t.driverRefId ? driverMap.get(t.driverRefId) : null;
    const vehicleId = t.vehicleRefId ? vehicleMap.get(t.vehicleRefId) : null;

    const existing = await prisma.trip.findUnique({ where: { ref_id: t.ref_id } });

    const tripPayload = {
      customerId,
      driverId: driverId || undefined,
      vehicleId: vehicleId || undefined,
      status: t.status,
      cargo_type: t.cargo_type,
      hazmat_flag: t.hazmat_flag,
      planned_distance: t.planned_distance,
      planned_start: t.planned_start,
      actual_start: t.actual_start,
      planned_end: t.planned_end,
      actual_end: t.actual_end,
      isActive: true,
    };

    const trip = existing
      ? await prisma.trip.update({ where: { ref_id: t.ref_id }, data: tripPayload })
      : await prisma.trip.create({ data: { ref_id: t.ref_id, ...tripPayload } });

    tripMap.set(t.ref_id, trip.id);

    // Upsert stops safely
    await prisma.tripStop.deleteMany({ where: { tripId: trip.id } });
    for (const stop of t.stops) {
      await prisma.tripStop.create({
        data: {
          tripId: trip.id,
          stop_sequence: stop.stop_sequence,
          stop_type: stop.stop_type,
          location_lat: stop.location_lat,
          location_lng: stop.location_lng,
          planned_arrival: stop.planned_arrival,
          actual_arrival: stop.actual_arrival,
        },
      });
    }
  }
  console.log(`  ✓ ${tripsData.length} Trips with TripStops ready.`);

  // ---------------------------------------------------------------------------
  // 7. INVOICES
  // ---------------------------------------------------------------------------
  console.log('🧾 Seeding Invoices...');

  const invoicesData = [
    {
      ref_id: 'INV-4001',
      tripRefId: 'TRP-3003',
      customerName: 'SABIC Global Supply Chain',
      status: InvoiceStatus.Paid,
      currency: 'SAR',
      subtotal: 5500.0,
      total_amount: 5500.0,
      due_date: new Date(now + 86400000 * 15),
    },
    {
      ref_id: 'INV-4002',
      tripRefId: 'TRP-3002',
      customerName: 'Almarai Fresh Distribution',
      status: InvoiceStatus.Pending,
      currency: 'SAR',
      subtotal: 4800.0,
      total_amount: 4800.0,
      due_date: new Date(now + 86400000 * 30),
    },
  ];

  for (const inv of invoicesData) {
    const tripId = tripMap.get(inv.tripRefId)!;
    const customerId = customerMap.get(inv.customerName)!;

    const existing = await prisma.invoice.findUnique({ where: { ref_id: inv.ref_id } });

    const invoicePayload = {
      tripId,
      customerId,
      status: inv.status,
      currency: inv.currency,
      subtotal: inv.subtotal,
      total_amount: inv.total_amount,
      due_date: inv.due_date,
      isActive: true,
    };

    if (existing) {
      await prisma.invoice.update({ where: { ref_id: inv.ref_id }, data: invoicePayload });
    } else {
      await prisma.invoice.create({ data: { ref_id: inv.ref_id, ...invoicePayload } });
    }
  }
  console.log(`  ✓ ${invoicesData.length} Invoices ready.`);

  console.log('✅ Database seeded successfully!');
}

main()
  .catch((e) => {
    console.error('❌ Error during database seeding:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
