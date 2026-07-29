import { PrismaClient, Role, DriverStatus, AssetStatus, AssetType, TripStatus, StopType, InvoiceStatus, DocType, DocStatus } from '@prisma/client';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Starting MERCON expanded database seed...');

  const defaultPassword = 'password123';
  const password_hash = await bcrypt.hash(defaultPassword, 10);

  // ---------------------------------------------------------------------------
  // 1. USERS (Admin, Operators, Drivers)
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
      name: 'Mercon Lead Operator',
      role: Role.Operator,
      isActive: true,
    },
  });

  const operator2 = await prisma.user.upsert({
    where: { username: 'operator2' },
    update: { role: Role.Operator, isActive: true },
    create: {
      username: 'operator2',
      email: 'dispatcher@mercon.tech',
      phone: '+966500000003',
      password_hash,
      name: 'Mercon Night Dispatcher',
      role: Role.Operator,
      isActive: true,
    },
  });
  console.log(`  ✓ Operator users: ${operator.username}, ${operator2.username}`);

  const driverUserAccountsData = [
    { username: 'driver.ahmed', email: 'ahmed.mansoor@mercon.tech', phone: '+966501112233', name: 'Ahmed Al-Mansoor' },
    { username: 'driver.khalid', email: 'khalid.ghamdi@mercon.tech', phone: '+966502223344', name: 'Khalid Al-Ghamdi' },
    { username: 'driver.tariq', email: 'tariq.zahrani@mercon.tech', phone: '+966503334455', name: 'Tariq Al-Zahrani' },
    { username: 'driver.youssef', email: 'youssef.otaibi@mercon.tech', phone: '+966504445566', name: 'Youssef Al-Otaibi' },
    { username: 'driver.omar', email: 'omar.shehri@mercon.tech', phone: '+966505557788', name: 'Omar Al-Shehri' },
    { username: 'driver.faisal', email: 'faisal.dossary@mercon.tech', phone: '+966506668899', name: 'Faisal Al-Dossary' },
    { username: 'driver.sami', email: 'sami.najjar@mercon.tech', phone: '+966507779900', name: 'Sami Al-Najjar' },
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
    { name: 'SIPCHEM Chemical Transport', contact_phone: '+966138881111', credit_limit: 600000 },
    { name: 'BinZagur Distribution Co.', contact_phone: '+966126662222', credit_limit: 400000 },
    { name: 'Olayan Logistics Group', contact_phone: '+966114449999', credit_limit: 850000 },
    { name: 'Saudi Electricity Supply Chain', contact_phone: '+966118884444', credit_limit: 1000000 },
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
    {
      ref_id: 'DRV-1006',
      first_name: 'Omar',
      last_name: 'Al-Shehri',
      phone_primary: '+966505557788',
      license_number: 'SA-DL-44102',
      license_expiry: new Date('2028-04-18'),
      status: DriverStatus.Available,
      ai_risk_score: 0.04,
      usernameKey: 'driver.omar',
    },
    {
      ref_id: 'DRV-1007',
      first_name: 'Faisal',
      last_name: 'Al-Dossary',
      phone_primary: '+966506668899',
      license_number: 'SA-DL-33918',
      license_expiry: new Date('2027-09-30'),
      status: DriverStatus.OnTrip,
      ai_risk_score: 0.09,
      usernameKey: 'driver.faisal',
    },
    {
      ref_id: 'DRV-1008',
      first_name: 'Sami',
      last_name: 'Al-Najjar',
      phone_primary: '+966507779900',
      license_number: 'SA-DL-22871',
      license_expiry: new Date('2026-08-01'),
      status: DriverStatus.Inactive,
      ai_risk_score: 0.35,
      usernameKey: 'driver.sami',
    },
    {
      ref_id: 'DRV-1009',
      first_name: 'Hassan',
      last_name: 'Al-Malki',
      phone_primary: '+966508880011',
      license_number: 'SA-DL-11942',
      license_expiry: new Date('2031-02-14'),
      status: DriverStatus.Available,
      ai_risk_score: 0.01,
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
    {
      ref_id: 'VEH-2005',
      plate_number: 'KSA-7788',
      asset_type: AssetType.Reefer,
      status: AssetStatus.OnTrip,
      capacity_kg: 20000,
      current_odometer: 65400.0,
      gps_device_id: 'GPS-REF-7788',
      last_lat: 24.7136,
      last_lng: 46.6753,
      trailer_number: 'TRL-905',
      trailer_type: AssetType.Reefer,
      trailer_capacity_kg: 20000,
      icces_device_id: 'ICC-7788',
    },
    {
      ref_id: 'VEH-2006',
      plate_number: 'KSA-3344',
      asset_type: AssetType.Flatbed,
      status: AssetStatus.Available,
      capacity_kg: 28000,
      current_odometer: 112000.0,
      gps_device_id: 'GPS-FLT-3344',
      last_lat: 26.4207,
      last_lng: 50.0888,
      trailer_number: 'TRL-906',
      trailer_type: AssetType.Flatbed,
      trailer_capacity_kg: 28000,
      icces_device_id: 'ICC-3344',
    },
    {
      ref_id: 'VEH-2007',
      plate_number: 'KSA-8811',
      asset_type: AssetType.Tanker,
      status: AssetStatus.Available,
      capacity_kg: 32000,
      current_odometer: 98500.0,
      gps_device_id: 'GPS-TNK-8811',
      last_lat: 27.0046,
      last_lng: 49.6601,
      trailer_number: 'TRL-907',
      trailer_type: AssetType.Tanker,
      trailer_capacity_kg: 32000,
      icces_device_id: 'ICC-8811',
    },
    {
      ref_id: 'VEH-2008',
      plate_number: 'KSA-6622',
      asset_type: AssetType.Box,
      status: AssetStatus.Inactive,
      capacity_kg: 15000,
      current_odometer: 240100.0,
      gps_device_id: 'GPS-BOX-6622',
      last_lat: 21.5433,
      last_lng: 39.1728,
      trailer_number: 'TRL-908',
      trailer_type: AssetType.Box,
      trailer_capacity_kg: 15000,
      icces_device_id: 'ICC-6622',
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
      name: 'Jeddah to Yanbu Industrial Route',
      route_origin: 'Jeddah',
      route_destination: 'Yanbu',
      base_price: 2600.0,
      currency: 'SAR',
      customerName: 'SIPCHEM Chemical Transport',
    },
    {
      name: 'Riyadh to Buraidah Freight Line',
      route_origin: 'Riyadh',
      route_destination: 'Buraidah',
      base_price: 1950.0,
      currency: 'SAR',
      customerName: 'BinZagur Distribution Co.',
    },
    {
      name: 'Dammam to Al-Khobar Local Carrier',
      route_origin: 'Dammam',
      route_destination: 'Al-Khobar',
      base_price: 1200.0,
      currency: 'SAR',
      customerName: 'Olayan Logistics Group',
    },
    {
      name: 'Tabuk to Medina Express Heavy Freight',
      route_origin: 'Tabuk',
      route_destination: 'Medina',
      base_price: 3800.0,
      currency: 'SAR',
      customerName: 'Saudi Electricity Supply Chain',
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
      actual_end: null,
      extra_driver_payment: 250.0,
      payment_reason: 'Hazmat handling allowance',
      stops: [
        { stop_sequence: 1, stop_type: StopType.Pickup, location_lat: 24.7136, location_lng: 46.6753, planned_arrival: new Date(now - 3600000 * 8), actual_arrival: new Date(now - 3600000 * 7) },
        { stop_sequence: 2, stop_type: StopType.Rest, location_lat: 25.3210, location_lng: 48.2100, planned_arrival: new Date(now - 3600000 * 3), actual_arrival: new Date(now - 3600000 * 3) },
        { stop_sequence: 3, stop_type: StopType.Dropoff, location_lat: 26.4207, location_lng: 50.0888, planned_arrival: new Date(now + 3600000 * 4), actual_arrival: null },
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
      extra_driver_payment: null,
      payment_reason: null,
      stops: [
        { stop_sequence: 1, stop_type: StopType.Pickup, location_lat: 24.7136, location_lng: 46.6753, planned_arrival: new Date(now - 86400000 * 3), actual_arrival: new Date(now - 86400000 * 3 + 1800000) },
        { stop_sequence: 2, stop_type: StopType.Refuel, location_lat: 23.0011, location_lng: 42.5000, planned_arrival: new Date(now - 86400000 * 2 - 20000000), actual_arrival: new Date(now - 86400000 * 2 - 20000000) },
        { stop_sequence: 3, stop_type: StopType.Dropoff, location_lat: 21.5433, location_lng: 39.1728, planned_arrival: new Date(now - 86400000 * 2), actual_arrival: new Date(now - 86400000 * 2 - 3600000) },
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
      extra_driver_payment: 300.0,
      payment_reason: 'Tanker washdown & hazard bonus',
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
      extra_driver_payment: null,
      payment_reason: null,
      stops: [
        { stop_sequence: 1, stop_type: StopType.Pickup, location_lat: 21.5433, location_lng: 39.1728, planned_arrival: new Date(now + 86400000 * 2), actual_arrival: null },
        { stop_sequence: 2, stop_type: StopType.Dropoff, location_lat: 24.4686, location_lng: 39.6142, planned_arrival: new Date(now + 86400000 * 3), actual_arrival: null },
      ],
    },
    {
      ref_id: 'TRP-3005',
      customerName: 'Almarai Fresh Distribution',
      driverRefId: 'DRV-1007',
      vehicleRefId: 'VEH-2005',
      status: TripStatus.Dispatched,
      cargo_type: 'Frozen Poultry & Dairy',
      hazmat_flag: false,
      planned_distance: 380.0,
      planned_start: new Date(now + 3600000 * 2),
      actual_start: null,
      planned_end: new Date(now + 3600000 * 10),
      actual_end: null,
      extra_driver_payment: null,
      payment_reason: null,
      stops: [
        { stop_sequence: 1, stop_type: StopType.Pickup, location_lat: 24.7136, location_lng: 46.6753, planned_arrival: new Date(now + 3600000 * 2), actual_arrival: null },
        { stop_sequence: 2, stop_type: StopType.Dropoff, location_lat: 26.3927, location_lng: 43.9818, planned_arrival: new Date(now + 3600000 * 10), actual_arrival: null },
      ],
    },
    {
      ref_id: 'TRP-3006',
      customerName: 'Naqel Express Services',
      driverRefId: 'DRV-1003',
      vehicleRefId: 'VEH-2006',
      status: TripStatus.AtPickup,
      cargo_type: 'E-Commerce Retail Parcels',
      hazmat_flag: false,
      planned_distance: 125.0,
      planned_start: new Date(now - 3600000),
      actual_start: new Date(now - 1800000),
      planned_end: new Date(now + 3600000 * 3),
      actual_end: null,
      extra_driver_payment: null,
      payment_reason: null,
      stops: [
        { stop_sequence: 1, stop_type: StopType.Pickup, location_lat: 26.4207, location_lng: 50.0888, planned_arrival: new Date(now - 3600000), actual_arrival: new Date(now - 1800000) },
        { stop_sequence: 2, stop_type: StopType.Dropoff, location_lat: 26.2172, location_lng: 50.1971, planned_arrival: new Date(now + 3600000 * 3), actual_arrival: null },
      ],
    },
    {
      ref_id: 'TRP-3007',
      customerName: 'SIPCHEM Chemical Transport',
      driverRefId: 'DRV-1006',
      vehicleRefId: 'VEH-2007',
      status: TripStatus.AtDelivery,
      cargo_type: 'Specialized Industrial Solvents',
      hazmat_flag: true,
      planned_distance: 350.0,
      planned_start: new Date(now - 3600000 * 6),
      actual_start: new Date(now - 3600000 * 6),
      planned_end: new Date(now + 3600000),
      actual_end: null,
      extra_driver_payment: 180.0,
      payment_reason: 'Overtime wait at chemical dock',
      stops: [
        { stop_sequence: 1, stop_type: StopType.Pickup, location_lat: 27.0046, location_lng: 49.6601, planned_arrival: new Date(now - 3600000 * 6), actual_arrival: new Date(now - 3600000 * 6) },
        { stop_sequence: 2, stop_type: StopType.Dropoff, location_lat: 21.5433, location_lng: 39.1728, planned_arrival: new Date(now + 3600000), actual_arrival: null },
      ],
    },
    {
      ref_id: 'TRP-3008',
      customerName: 'Panda Retail Operations',
      driverRefId: null,
      vehicleRefId: null,
      status: TripStatus.Cancelled,
      cargo_type: 'Seasonal Merchandise',
      hazmat_flag: false,
      planned_distance: 290.0,
      planned_start: new Date(now - 86400000),
      actual_start: null,
      planned_end: new Date(now - 86400000 + 3600000 * 6),
      actual_end: null,
      extra_driver_payment: null,
      payment_reason: null,
      stops: [
        { stop_sequence: 1, stop_type: StopType.Pickup, location_lat: 21.5433, location_lng: 39.1728, planned_arrival: new Date(now - 86400000), actual_arrival: null },
        { stop_sequence: 2, stop_type: StopType.Dropoff, location_lat: 24.4686, location_lng: 39.6142, planned_arrival: new Date(now - 86400000 + 3600000 * 6), actual_arrival: null },
      ],
    },
    {
      ref_id: 'TRP-3009',
      customerName: 'BinZagur Distribution Co.',
      driverRefId: 'DRV-1002',
      vehicleRefId: 'VEH-2002',
      status: TripStatus.Completed,
      cargo_type: 'Fast-Moving Consumer Goods',
      hazmat_flag: false,
      planned_distance: 360.0,
      planned_start: new Date(now - 86400000 * 4),
      actual_start: new Date(now - 86400000 * 4),
      planned_end: new Date(now - 86400000 * 3),
      actual_end: new Date(now - 86400000 * 3),
      extra_driver_payment: null,
      payment_reason: null,
      stops: [
        { stop_sequence: 1, stop_type: StopType.Pickup, location_lat: 24.7136, location_lng: 46.6753, planned_arrival: new Date(now - 86400000 * 4), actual_arrival: new Date(now - 86400000 * 4) },
        { stop_sequence: 2, stop_type: StopType.Dropoff, location_lat: 26.3927, location_lng: 43.9818, planned_arrival: new Date(now - 86400000 * 3), actual_arrival: new Date(now - 86400000 * 3) },
      ],
    },
    {
      ref_id: 'TRP-3010',
      customerName: 'Olayan Logistics Group',
      driverRefId: 'DRV-1005',
      vehicleRefId: 'VEH-2004',
      status: TripStatus.Invoiced,
      cargo_type: 'Commercial Electronics & Components',
      hazmat_flag: false,
      planned_distance: 520.0,
      planned_start: new Date(now - 86400000 * 7),
      actual_start: new Date(now - 86400000 * 7),
      planned_end: new Date(now - 86400000 * 6),
      actual_end: new Date(now - 86400000 * 6),
      extra_driver_payment: null,
      payment_reason: null,
      stops: [
        { stop_sequence: 1, stop_type: StopType.Pickup, location_lat: 24.7136, location_lng: 46.6753, planned_arrival: new Date(now - 86400000 * 7), actual_arrival: new Date(now - 86400000 * 7) },
        { stop_sequence: 2, stop_type: StopType.Dropoff, location_lat: 21.5433, location_lng: 39.1728, planned_arrival: new Date(now - 86400000 * 6), actual_arrival: new Date(now - 86400000 * 6) },
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
      extra_driver_payment: t.extra_driver_payment,
      payment_reason: t.payment_reason,
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
    {
      ref_id: 'INV-4003',
      tripRefId: 'TRP-3009',
      customerName: 'BinZagur Distribution Co.',
      status: InvoiceStatus.Paid,
      currency: 'SAR',
      subtotal: 3600.0,
      total_amount: 3600.0,
      due_date: new Date(now - 86400000 * 2),
    },
    {
      ref_id: 'INV-4004',
      tripRefId: 'TRP-3010',
      customerName: 'Olayan Logistics Group',
      status: InvoiceStatus.Overdue,
      currency: 'SAR',
      subtotal: 6200.0,
      total_amount: 6200.0,
      due_date: new Date(now - 86400000 * 10),
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

  // ---------------------------------------------------------------------------
  // 8. MAINTENANCE RECORDS
  // ---------------------------------------------------------------------------
  console.log('🔧 Seeding Vehicle Maintenance Records...');

  const vehicleBoxId = vehicleMap.get('VEH-2004')!;
  const vehicleFlatbedId = vehicleMap.get('VEH-2001')!;

  const maintenanceData = [
    {
      vehicleId: vehicleBoxId,
      workshop_name: 'Zahid Tractor & Heavy Machinery Workshop',
      workshop_contact: '+966112229988',
      maintenance_type: 'Transmission Overhaul & Brake Service',
      service_date: new Date(now - 86400000 * 14),
      odometer_reading: 175100.8,
      cost: 4500.0,
      invoice_number: 'WRK-88190',
      next_service_due: new Date(now + 86400000 * 90),
      remarks: 'Replaced rear brake pads, flushed hydraulic fluid, and serviced gearbox.',
    },
    {
      vehicleId: vehicleFlatbedId,
      workshop_name: 'Al-Jabr Fleet Maintenance Depot',
      workshop_contact: '+966138883322',
      maintenance_type: 'Routine 150k km Engine Oil & Filter Change',
      service_date: new Date(now - 86400000 * 45),
      odometer_reading: 140000.0,
      cost: 1200.0,
      invoice_number: 'WRK-77123',
      next_service_due: new Date(now + 86400000 * 45),
      remarks: 'Synthetic engine oil change, air filter replacement, wheel alignment.',
    },
  ];

  for (const m of maintenanceData) {
    const existing = await prisma.maintenanceRecord.findFirst({
      where: { vehicleId: m.vehicleId, invoice_number: m.invoice_number },
    });

    if (!existing) {
      await prisma.maintenanceRecord.create({
        data: { ...m, isActive: true },
      });
    }
  }
  console.log(`  ✓ ${maintenanceData.length} Maintenance Records ready.`);

  // ---------------------------------------------------------------------------
  // 9. DOCUMENTS
  // ---------------------------------------------------------------------------
  console.log('📄 Seeding Compliance & Fleet Documents...');

  const driverAhmedId = driverMap.get('DRV-1001')!;
  const driverKhalidId = driverMap.get('DRV-1002')!;
  const vehFlatbedId = vehicleMap.get('VEH-2001')!;

  const documentsData = [
    {
      entity_type: 'Driver',
      entity_id: driverAhmedId,
      doc_type: DocType.DriverLicense,
      status: DocStatus.Verified,
      file_url: '/uploads/documents/driver_license_ahmed.pdf',
      mime_type: 'application/pdf',
      issue_date: new Date('2023-01-01'),
      expiry_date: new Date('2028-12-31'),
    },
    {
      entity_type: 'Driver',
      entity_id: driverKhalidId,
      doc_type: DocType.DriverLicense,
      status: DocStatus.Verified,
      file_url: '/uploads/documents/driver_license_khalid.pdf',
      mime_type: 'application/pdf',
      issue_date: new Date('2022-08-15'),
      expiry_date: new Date('2027-08-15'),
    },
    {
      entity_type: 'Vehicle',
      entity_id: vehFlatbedId,
      doc_type: DocType.VehicleRegistration,
      status: DocStatus.Verified,
      file_url: '/uploads/documents/istimara_ksa_1029.pdf',
      mime_type: 'application/pdf',
      issue_date: new Date('2024-01-10'),
      expiry_date: new Date('2027-01-10'),
    },
    {
      entity_type: 'Vehicle',
      entity_id: vehFlatbedId,
      doc_type: DocType.Insurance,
      status: DocStatus.PendingReview,
      file_url: '/uploads/documents/insurance_ksa_1029.pdf',
      mime_type: 'application/pdf',
      issue_date: new Date('2025-06-01'),
      expiry_date: new Date('2026-06-01'),
    },
  ];

  for (const doc of documentsData) {
    const existing = await prisma.document.findFirst({
      where: { entity_type: doc.entity_type, entity_id: doc.entity_id, doc_type: doc.doc_type },
    });

    if (!existing) {
      await prisma.document.create({
        data: { ...doc, isActive: true },
      });
    }
  }
  console.log(`  ✓ ${documentsData.length} Compliance Documents ready.`);

  // ---------------------------------------------------------------------------
  // 10. SYSTEM NOTIFICATIONS
  // ---------------------------------------------------------------------------
  console.log('🔔 Seeding System Notifications...');

  const driverAhmedUserId = driverUserMap.get('driver.ahmed');
  const notificationsData = [
    {
      userId: admin.id,
      driverId: null,
      title: 'New Emergency Alert Reported',
      message: 'Driver Ahmed Al-Mansoor triggered an emergency status update on Trip TRP-3001.',
      type: 'Emergency',
      is_read: false,
      entity_type: 'Trip',
      entity_id: tripMap.get('TRP-3001'),
    },
    {
      userId: operator.id,
      driverId: null,
      title: 'Trip Dispatched Successfully',
      message: 'Trip TRP-3005 has been dispatched to driver Faisal Al-Dossary with vehicle KSA-7788.',
      type: 'Trip',
      is_read: true,
      entity_type: 'Trip',
      entity_id: tripMap.get('TRP-3005'),
    },
    {
      userId: null,
      driverId: driverAhmedId,
      title: 'Trip Assignment: TRP-3001',
      message: 'You have been assigned to trip TRP-3001 (Petrochemical Polymers from Riyadh to Dammam).',
      type: 'Trip',
      is_read: true,
      entity_type: 'Trip',
      entity_id: tripMap.get('TRP-3001'),
    },
  ];

  for (const n of notificationsData) {
    const existing = await prisma.notification.findFirst({
      where: { title: n.title, message: n.message },
    });

    if (!existing) {
      await prisma.notification.create({ data: n });
    }
  }
  console.log(`  ✓ ${notificationsData.length} System Notifications ready.`);

  console.log('✅ Expanded database seeded successfully!');
}

main()
  .catch((e) => {
    console.error('❌ Error during expanded database seeding:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
