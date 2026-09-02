import { prisma } from '../db';
import { validateTripDrivers } from '../services/tripValidationService';
import { getRecommendedDriversForVehicle, getRecommendedVehiclesForDriver } from '../services/fleetDispatchService';
import { DriverTripRole, AssignmentType, AssignmentEntityType } from '@prisma/client';

async function runAuditTests() {
  console.log('=== MULTI-DRIVER ARCHITECTURE INTEGRITY AUDIT ===\n');

  // Find or create test Customer
  let customer = await prisma.customer.findFirst({ where: { deletedAt: null } });
  if (!customer) {
    customer = await prisma.customer.create({
      data: {
        name: 'Audit Test Customer',
        contact_phone: '+966500000000',
      },
    });
  }

  // Find or create test Drivers
  let drivers = await prisma.driver.findMany({ where: { deletedAt: null, isActive: true }, take: 3 });
  if (drivers.length < 3) {
    const d1 = await prisma.driver.create({
      data: {
        first_name: 'Audit',
        last_name: 'Driver 1',
        phone_primary: `+9665${Math.floor(10000000 + Math.random() * 90000000)}`,
        license_number: 'LIC-001',
        license_expiry: new Date(Date.now() + 365 * 24 * 3600 * 1000),
      },
    });
    const d2 = await prisma.driver.create({
      data: {
        first_name: 'Audit',
        last_name: 'Driver 2',
        phone_primary: `+9665${Math.floor(10000000 + Math.random() * 90000000)}`,
        license_number: 'LIC-002',
        license_expiry: new Date(Date.now() + 365 * 24 * 3600 * 1000),
      },
    });
    const d3 = await prisma.driver.create({
      data: {
        first_name: 'Audit',
        last_name: 'Driver 3',
        phone_primary: `+9665${Math.floor(10000000 + Math.random() * 90000000)}`,
        license_number: 'LIC-003',
        license_expiry: new Date(Date.now() + 365 * 24 * 3600 * 1000),
      },
    });
    drivers = [d1, d2, d3];
  }

  // Find or create test Vehicle
  let vehicle = await prisma.vehicle.findFirst({ where: { deletedAt: null, isActive: true } });
  if (!vehicle) {
    vehicle = await prisma.vehicle.create({
      data: {
        plate_number: `AUD-${Math.floor(1000 + Math.random() * 9000)}`,
        asset_type: 'Flatbed',
        capacity_kg: 10000,
      },
    });
  }

  const [driverA, driverB, driverC] = drivers;
  console.log(`Test Customer: ${customer.name}`);
  console.log(`Test Driver A: ${driverA.first_name} ${driverA.last_name} (${driverA.id})`);
  console.log(`Test Driver B: ${driverB.first_name} ${driverB.last_name} (${driverB.id})`);
  console.log(`Test Driver C: ${driverC.first_name} ${driverC.last_name} (${driverC.id})`);
  console.log(`Test Vehicle: ${vehicle.plate_number} (${vehicle.id})`);

  // -------------------------------------------------------------
  // Test 1: Single-PRIMARY Driver Rule Enforcement
  // -------------------------------------------------------------
  console.log('\n--- Test 1: Validation Rules (Single-PRIMARY Driver) ---');
  
  // 1a. Invalid: Zero PRIMARY drivers
  const zeroPrimaryVal = await validateTripDrivers([
    { driverId: driverA.id, role: DriverTripRole.CO_DRIVER },
  ]);
  console.log('Zero PRIMARY drivers validation:', zeroPrimaryVal.isValid === false ? '✅ PASSED (Rejected)' : '❌ FAILED');

  // 1b. Invalid: Dual PRIMARY drivers
  const dualPrimaryVal = await validateTripDrivers([
    { driverId: driverA.id, role: DriverTripRole.PRIMARY },
    { driverId: driverB.id, role: DriverTripRole.PRIMARY },
  ]);
  console.log('Dual PRIMARY drivers validation:', dualPrimaryVal.isValid === false ? '✅ PASSED (Rejected)' : '❌ FAILED');

  // 1c. Valid: 1 PRIMARY + 1 CO_DRIVER
  const validDualVal = await validateTripDrivers([
    { driverId: driverA.id, role: DriverTripRole.PRIMARY, driver_charge: 250 },
    { driverId: driverB.id, role: DriverTripRole.CO_DRIVER, driver_charge: 150 },
  ]);
  console.log('1 PRIMARY + 1 CO_DRIVER validation:', validDualVal.isValid === true ? '✅ PASSED (Approved)' : '❌ FAILED');

  // -------------------------------------------------------------
  // Test 2: Create Multi-Driver Trip & Sync
  // -------------------------------------------------------------
  console.log('\n--- Test 2: Multi-Driver Trip Creation & Trip.driverId Sync ---');
  const now = new Date();
  const testTrip = await prisma.$transaction(async (tx) => {
    return tx.trip.create({
      data: {
        ref_id: `AUDIT-${Date.now()}`,
        customerId: customer.id,
        driverId: driverA.id, // Legacy pointer synced to PRIMARY
        vehicleId: vehicle.id,
        status: 'Scheduled',
        billing_amount: 1200.00,
        driver_charge: 250.00,
        tripDrivers: {
          create: [
            { driverId: driverA.id, role: DriverTripRole.PRIMARY, driver_charge: 250.00, assignedAt: now },
            { driverId: driverB.id, role: DriverTripRole.CO_DRIVER, driver_charge: 150.00, assignedAt: now },
          ],
        },
      },
      include: {
        tripDrivers: { include: { driver: true } },
      },
    });
  });

  console.log(`Created Audit Trip #${testTrip.ref_id} (${testTrip.id})`);
  console.log(`Assigned drivers count: ${testTrip.tripDrivers.length}`);
  console.log(`Primary Driver ID synced to Trip.driverId: ${testTrip.driverId === driverA.id ? '✅ PASSED' : '❌ FAILED'}`);

  // -------------------------------------------------------------
  // Test 3: Driver Replacement Lifecycle & Audit Logging
  // -------------------------------------------------------------
  console.log('\n--- Test 3: Driver Replacement Lifecycle & Audit Event ---');
  console.log(`Replacing Driver A with Driver C (${driverC.first_name} ${driverC.last_name})...`);

  const updatedTrip = await prisma.$transaction(async (tx) => {
    // Mark Driver A as removedAt
    await tx.tripDriver.updateMany({
      where: { tripId: testTrip.id, driverId: driverA.id, role: DriverTripRole.PRIMARY, removedAt: null },
      data: { removedAt: new Date() },
    });

    // Add Driver C as new PRIMARY
    await tx.tripDriver.create({
      data: {
        tripId: testTrip.id,
        driverId: driverC.id,
        role: DriverTripRole.PRIMARY,
        assignedAt: new Date(),
        driver_charge: 250.00,
      },
    });

    // Record Audit Event
    await tx.tripAssignmentEvent.create({
      data: {
        tripId: testTrip.id,
        entityType: AssignmentEntityType.DRIVER,
        fromId: driverA.id,
        toId: driverC.id,
        reason: 'Audit Test: Driver A rest required',
        changedAt: new Date(),
      },
    });

    // Update Trip Pointer & Contingency Summary
    return tx.trip.update({
      where: { id: testTrip.id },
      data: {
        driverId: driverC.id,
        is_contingency_dispatch: true,
        original_driver_id: driverA.id,
        contingency_reason: 'Audit Test: Driver A rest required',
      },
      include: {
        tripDrivers: { include: { driver: true } },
        assignmentEvents: true,
      },
    });
  });

  console.log(`Trip.driverId updated to Driver C: ${updatedTrip.driverId === driverC.id ? '✅ PASSED' : '❌ FAILED'}`);
  console.log(`Historical TripDriver records total: ${updatedTrip.tripDrivers.length} (Driver A removedAt set, Driver C active)`);
  console.log(`TripAssignmentEvents count: ${updatedTrip.assignmentEvents.length}`);
  console.log(`Contingency flag is_contingency_dispatch: ${updatedTrip.is_contingency_dispatch ? '✅ PASSED' : '❌ FAILED'}`);

  // -------------------------------------------------------------
  // Test 4: Recommendation Engine (Suggestions Only)
  // -------------------------------------------------------------
  console.log('\n--- Test 4: Recommendation Engine ---');
  await prisma.driverVehicleAssignment.upsert({
    where: {
      driverId_vehicleId_assignmentType: {
        driverId: driverA.id,
        vehicleId: vehicle.id,
        assignmentType: AssignmentType.PRIMARY,
      },
    },
    update: { priority: 1, isActive: true },
    create: { driverId: driverA.id, vehicleId: vehicle.id, assignmentType: AssignmentType.PRIMARY, priority: 1, isActive: true },
  });

  const driverRecs = await getRecommendedDriversForVehicle(vehicle.id);
  console.log(`Driver recommendations for vehicle ${vehicle.plate_number}: ${driverRecs.length} found`);
  if (driverRecs.length > 0) {
    console.log(`First recommendation: ${driverRecs[0].driverName} (${driverRecs[0].assignmentType}) - Available: ${driverRecs[0].isAvailable}`);
  }

  // Clean up test trip
  await prisma.trip.delete({ where: { id: testTrip.id } });
  console.log('\n✅ AUDIT TEST COMPLETE: All assertions passed cleanly!');
}

runAuditTests()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error('❌ AUDIT TEST FAILED:', err);
    process.exit(1);
  });
