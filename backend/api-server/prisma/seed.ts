import { PrismaClient, Role, DriverStatus, AssetStatus, AssetType, TripStatus, StopType, InvoiceStatus, DocType, DocStatus } from '@prisma/client';
import bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Starting database seed...');

  // 1. Create default Operator User
  const email = 'admin@mercon.sa';
  const phone = '0500000000';
  const password = 'password123';
  const password_hash = await bcrypt.hash(password, 10);

  const existingUser = await prisma.user.findUnique({ where: { email } });
  if (existingUser) {
    await prisma.user.delete({ where: { email } });
  }

  const user = await prisma.user.create({
    data: {
      email,
      phone,
      password_hash,
      name: 'Mercon Admin',
      role: Role.Operator,
      isActive: true
    }
  });
  console.log(`👤 Created Operator User: ${user.email} (Password: ${password})`);

  // 2. Create Customers
  const customer1 = await prisma.customer.create({
    data: {
      name: 'Aramco Logistics',
      contact_phone: '0511111111',
      credit_limit: 500000,
      created_by: user.id
    }
  });

  const customer2 = await prisma.customer.create({
    data: {
      name: 'SABIC Distribution',
      contact_phone: '0522222222',
      credit_limit: 800000,
      created_by: user.id
    }
  });
  console.log('🏢 Created Customers');

  // 3. Create Drivers
  const driver1 = await prisma.driver.create({
    data: {
      ref_id: 'DRV-1001',
      first_name: 'Ahmed',
      last_name: 'Al-Harbi',
      phone_primary: '0533333333',
      status: DriverStatus.Available,
      license_number: 'LIC1001',
      license_expiry: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000),
      ai_risk_score: 1.2,
      created_by: user.id
    }
  });

  const driver2 = await prisma.driver.create({
    data: {
      ref_id: 'DRV-1002',
      first_name: 'Khalid',
      last_name: 'Al-Otaibi',
      phone_primary: '0544444444',
      status: DriverStatus.OnTrip,
      license_number: 'LIC1002',
      license_expiry: new Date(Date.now() + 180 * 24 * 60 * 60 * 1000),
      ai_risk_score: 3.5,
      created_by: user.id
    }
  });
  console.log('🚛 Created Drivers');

  // 4. Create Vehicles
  const vehicle1 = await prisma.vehicle.create({
    data: {
      ref_id: 'TRK-2001',
      plate_number: 'ABC-1234',
      asset_type: AssetType.Reefer,
      status: AssetStatus.Available,
      capacity_kg: 15000,
      current_odometer: 125000.5,
      gps_device_id: 'GPS-99881',
      created_by: user.id
    }
  });

  const vehicle2 = await prisma.vehicle.create({
    data: {
      ref_id: 'TRK-2002',
      plate_number: 'XYZ-5678',
      asset_type: AssetType.Flatbed,
      status: AssetStatus.OnTrip,
      capacity_kg: 25000,
      current_odometer: 84000.2,
      gps_device_id: 'GPS-99882',
      created_by: user.id
    }
  });
  console.log('🚚 Created Vehicles');

  // 5. Create Trips
  const trip1 = await prisma.trip.create({
    data: {
      ref_id: 'TRP-5001',
      customerId: customer1.id,
      driverId: driver2.id,
      vehicleId: vehicle2.id,
      status: TripStatus.InTransit,
      cargo_type: 'Chemical Powders',
      hazmat_flag: true,
      planned_distance: 350,
      planned_start: new Date(Date.now() - 2 * 60 * 60 * 1000),
      actual_start: new Date(Date.now() - 1.5 * 60 * 60 * 1000),
      planned_end: new Date(Date.now() + 4 * 60 * 60 * 1000),
      created_by: user.id,
      stops: {
        create: [
          {
            stop_sequence: 1,
            stop_type: StopType.Pickup,
            location_lat: 24.7136,
            location_lng: 46.6753,
            planned_arrival: new Date(Date.now() - 2 * 60 * 60 * 1000),
            actual_arrival: new Date(Date.now() - 2 * 60 * 60 * 1000)
          },
          {
            stop_sequence: 2,
            stop_type: StopType.Dropoff,
            location_lat: 26.3927,
            location_lng: 49.9777,
            planned_arrival: new Date(Date.now() + 4 * 60 * 60 * 1000)
          }
        ]
      }
    }
  });

  const trip2 = await prisma.trip.create({
    data: {
      ref_id: 'TRP-5002',
      customerId: customer2.id,
      driverId: driver1.id,
      vehicleId: vehicle1.id,
      status: TripStatus.Completed,
      cargo_type: 'Frozen Food',
      hazmat_flag: false,
      planned_distance: 950,
      planned_start: new Date(Date.now() - 48 * 60 * 60 * 1000),
      actual_start: new Date(Date.now() - 47 * 60 * 60 * 1000),
      planned_end: new Date(Date.now() - 36 * 60 * 60 * 1000),
      actual_end: new Date(Date.now() - 35.5 * 60 * 60 * 1000),
      created_by: user.id,
      stops: {
        create: [
          {
            stop_sequence: 1,
            stop_type: StopType.Pickup,
            location_lat: 21.4858,
            location_lng: 39.1925,
            planned_arrival: new Date(Date.now() - 48 * 60 * 60 * 1000),
            actual_arrival: new Date(Date.now() - 47.8 * 60 * 60 * 1000)
          },
          {
            stop_sequence: 2,
            stop_type: StopType.Dropoff,
            location_lat: 24.7136,
            location_lng: 46.6753,
            planned_arrival: new Date(Date.now() - 36 * 60 * 60 * 1000),
            actual_arrival: new Date(Date.now() - 35.5 * 60 * 60 * 1000)
          }
        ]
      }
    }
  });
  console.log('🛣️ Created Trips and Stops');

  // 6. Create Invoices
  const invoice1 = await prisma.invoice.create({
    data: {
      ref_id: 'INV-2026-101',
      tripId: trip2.id,
      customerId: customer2.id,
      status: InvoiceStatus.Paid,
      currency: 'SAR',
      subtotal: 4500,
      total_amount: 4500,
      due_date: new Date(Date.now() - 15 * 24 * 60 * 60 * 1000),
      created_by: user.id,
      createdAt: new Date(Date.now() - 25 * 24 * 60 * 60 * 1000)
    }
  });

  const invoice2 = await prisma.invoice.create({
    data: {
      ref_id: 'INV-2026-102',
      tripId: trip1.id,
      customerId: customer1.id,
      status: InvoiceStatus.Pending,
      currency: 'SAR',
      subtotal: 2200,
      total_amount: 2200,
      due_date: new Date(Date.now() + 10 * 24 * 60 * 60 * 1000),
      created_by: user.id,
      createdAt: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000)
    }
  });
  console.log('💵 Created Invoices');

  // 7. Create Documents
  await prisma.document.create({
    data: {
      entity_type: 'Driver',
      entity_id: driver1.id,
      doc_type: DocType.DriverLicense,
      status: DocStatus.Verified,
      file_url: 'http://localhost:3000/uploads/doc-license.pdf',
      issue_date: new Date(Date.now() - 200 * 24 * 60 * 60 * 1000),
      expiry_date: new Date(Date.now() + 165 * 24 * 60 * 60 * 1000),
      created_by: user.id
    }
  });

  await prisma.document.create({
    data: {
      entity_type: 'Vehicle',
      entity_id: vehicle1.id,
      doc_type: DocType.VehicleRegistration,
      status: DocStatus.PendingReview,
      file_url: 'http://localhost:3000/uploads/doc-istimara.pdf',
      issue_date: new Date(Date.now() - 300 * 24 * 60 * 60 * 1000),
      expiry_date: new Date(Date.now() + 65 * 24 * 60 * 60 * 1000),
      created_by: user.id
    }
  });
  console.log('📄 Created Documents');

  console.log('✅ Database seeded successfully!');
}

main()
  .catch((e) => {
    console.error('❌ Error during seeding:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
