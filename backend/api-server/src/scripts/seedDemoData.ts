/**
 * 🌱 MERCON Demo Seed Script
 * Seeds one complete demo flow: Customer → Truck → Driver (assigned to truck) → Trip (with stops)
 * Then advances the trip through status stages: Dispatched → AtPickup → InTransit → AtDelivery → Completed
 *
 * Run with:  npx ts-node -r tsconfig-paths/register src/scripts/seedDemoData.ts
 */
import axios from 'axios';

const API = 'https://mercon.tech/api';
const CREDS = { username: 'ilan', password: 'ilan1234' };

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

function log(emoji: string, msg: string) {
  console.log(`${emoji}  ${msg}`);
}

async function main() {
  /* ─── 0. Auth ──────────────────────────────────────────────────────────── */
  log('🔑', 'Logging in to mercon.tech...');
  const { data: loginData } = await axios.post(`${API}/auth/login`, CREDS);
  const token = loginData.data.token;
  const H = { headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' } };
  log('✅', `Authenticated — token acquired`);

  /* ─── 1. Customer ──────────────────────────────────────────────────────── */
  log('🏢', 'Creating demo customer: Riyadh Fresh Foods...');
  const { data: custData } = await axios.post(`${API}/customers`, {
    name: 'Riyadh Fresh Foods Co.',
    contact_phone: '+966500000001',
    company_name: 'RFC Logistics',
    primary_contact_person: 'Abdullah Al-Rashid',
    primary_contact_phone: '+966500000002',
    payment_terms: 'Net 30',
    credit_limit: 50000,
    isActive: true,
  }, H);
  const customer = custData.data;
  log('✅', `Customer created → ${customer.name}  [ID: ${customer.id}]`);

  /* ─── 2. Vehicle (Truck) ───────────────────────────────────────────────── */
  log('🚛', 'Creating demo truck: KSA-DEMO-001 (20-ton Flatbed)...');
  const { data: vehData } = await axios.post(`${API}/vehicles`, {
    plate_number: 'KSA-DEMO-001',
    asset_type: 'Flatbed',
    capacity_kg: 20000,
    trailer_number: 'TRL-DEMO-01',
    trailer_type: 'Flatbed',
    trailer_capacity_kg: 15000,
  }, H);
  const vehicle = vehData.data;
  log('✅', `Truck created → ${vehicle.plate_number}  [ID: ${vehicle.id}]`);

  /* ─── 3. Driver (assigned to the truck) ────────────────────────────────── */
  log('👤', 'Creating demo driver: Mohammed Al-Ghamdi...');
  const licenseExpiry = new Date();
  licenseExpiry.setFullYear(licenseExpiry.getFullYear() + 2);

  const { data: drvData } = await axios.post(`${API}/drivers`, {
    first_name: 'Mohammed',
    last_name: 'Al-Ghamdi',
    phone_primary: '+966501234567',
    license_number: 'KSA-2024-DRV-001',
    license_expiry: licenseExpiry.toISOString().split('T')[0],
    assigned_vehicle_id: vehicle.id,
  }, H);
  const driver = drvData.data;
  log('✅', `Driver created → ${driver.first_name} ${driver.last_name}  [${driver.ref_id}]`);

  /* ─── 4. Trip (Riyadh → Jeddah, 2 stops) ─────────────────────────────── */
  log('🗺️ ', 'Creating demo trip: Riyadh Industrial Zone → Jeddah Port...');
  const plannedStart = new Date();
  plannedStart.setHours(plannedStart.getHours() + 1);
  const plannedEnd = new Date(plannedStart);
  plannedEnd.setHours(plannedEnd.getHours() + 8);

  const { data: tripData } = await axios.post(`${API}/trips`, {
    customer_id: customer.id,
    driver_id: driver.id,
    vehicle_id: vehicle.id,
    planned_start: plannedStart.toISOString(),
    planned_end: plannedEnd.toISOString(),
    billing_amount: 4500,
    vehicle_type: '20 TON',
    rate_category: 'One Way',
    billing_type: 'Per Trip',
    status: 'Scheduled',
    stops: [
      {
        stop_type: 'Pickup',
        lat: 24.7136,
        lng: 46.6753,
        location_name: 'Riyadh Industrial Zone — Gate 3',
        location_address: 'Second Industrial City, Riyadh, Saudi Arabia',
        planned_arrival: plannedStart.toISOString(),
      },
      {
        stop_type: 'Dropoff',
        lat: 21.4858,
        lng: 39.1925,
        location_name: 'Jeddah Islamic Port — Cargo Terminal B',
        location_address: 'Jeddah Islamic Port, Corniche Rd, Jeddah, Saudi Arabia',
        planned_arrival: plannedEnd.toISOString(),
      },
    ],
  }, H);
  const trip = tripData.data;
  log('✅', `Trip created → ${trip.ref_id}  [Status: ${trip.status}]`);

  /* ─── 5. Walk the trip through statuses ────────────────────────────────── */
  const statuses: string[] = ['AtPickup', 'InTransit', 'AtDelivery', 'Completed'];

  for (const status of statuses) {
    await sleep(800);
    log('🔄', `Advancing trip to → ${status}`);
    await axios.patch(`${API}/trips/${trip.id}/status`, { status }, H);
    log('✅', `Trip is now: ${status}`);
  }

  /* ─── 6. Final summary ─────────────────────────────────────────────────── */
  console.log('\n');
  console.log('══════════════════════════════════════════════════════════');
  console.log('  ✅  MERCON DEMO DATA SEEDED SUCCESSFULLY');
  console.log('══════════════════════════════════════════════════════════');
  console.log(`  🏢  Customer  : ${customer.name}`);
  console.log(`       URL      : http://localhost:5174/customers/${customer.id}`);
  console.log(`  🚛  Truck     : ${vehicle.plate_number} (${vehicle.asset_type}, ${vehicle.capacity_kg / 1000}T)`);
  console.log(`       URL      : http://localhost:5174/vehicles/${vehicle.id}`);
  console.log(`  👤  Driver    : ${driver.first_name} ${driver.last_name} [${driver.ref_id}]`);
  console.log(`       URL      : http://localhost:5174/drivers/${driver.id}`);
  console.log(`  🗺️   Trip      : ${trip.ref_id} — Riyadh → Jeddah [Completed]`);
  console.log(`       URL      : http://localhost:5174/trips/${trip.id}`);
  console.log('══════════════════════════════════════════════════════════\n');
}

main().catch((err) => {
  console.error('❌ Seed failed:', err.response?.data || err.message);
  process.exit(1);
});
