import { PrismaClient } from '@prisma/client';
import { computeTripBaseBilling, computeTripTotalAmount, computeTripBalance } from '../src/utils/tripFinancials';

const prisma = new PrismaClient();

async function runRuntimeAndRelationVerification() {
  console.log('=== RUNTIME & PRISMA RELATION VERIFICATION ===\n');

  // 1. Prisma Relations Navigation Test
  console.log('[1. Prisma Relation Query Navigation Tests]');

  // Test Trip relations
  const tripTest = await prisma.trip.findFirst({
    include: {
      customer: true,
      driver: true,
      vehicle: true,
      originalVehicle: true,
      originalDriver: true,
      financials: true,
      stops: {
        include: {
          delay_logged_by_user: true,
          executorDriver: true,
        },
      },
      assignmentEvents: {
        include: {
          changedByUser: true,
        },
      },
    },
  });
  console.log(`  - Trip relation navigation query: ✅ PASS (Queried Trip ID: ${tripTest?.id ?? 'None'})`);

  // Test Document relation
  const docTest = await prisma.document.findFirst({
    include: {
      executorDriver: true,
      verifier: true,
    },
  });
  console.log(`  - Document relation navigation query: ✅ PASS`);

  // Test QuotationHistory relation
  const qhTest = await prisma.quotationHistory.findFirst({
    include: {
      changed_by_user: true,
    },
  });
  console.log(`  - QuotationHistory relation navigation query: ✅ PASS`);

  // Test MaintenanceRecord relation
  const maintTest = await prisma.maintenanceRecord.findFirst({
    include: {
      workshop: true,
      vehicle: true,
    },
  });
  console.log(`  - MaintenanceRecord relation navigation query: ✅ PASS`);

  // 2. Runtime Trip CRUD & Driver Payout Persistence
  console.log('\n[2. Runtime Trip CRUD & Driver Payout Persistence]');

  // Get a valid customer ID for creating test trip
  const sampleCustomer = await prisma.customer.findFirst({ where: { deletedAt: null } });
  if (!sampleCustomer) {
    throw new Error('No customer found to perform CRUD test.');
  }

  const testRefId = `TEST-VERIFY-${Date.now()}`;
  console.log(`  - Creating test trip with ref_id: ${testRefId}, driver_payout: 1500.00...`);

  const createdTrip = await prisma.trip.create({
    data: {
      ref_id: testRefId,
      customerId: sampleCustomer.id,
      billing_amount: 2500.00,
      driver_payout: 1500.00,
      status: 'Scheduled',
    },
  });

  console.log(`  - Created trip ID: ${createdTrip.id}`);
  console.log(`  - Persisted driver_payout: SAR ${Number(createdTrip.driver_payout).toFixed(2)}`);

  if (Number(createdTrip.driver_payout) !== 1500.00) {
    throw new Error(`Driver payout persistence mismatch! Expected 1500.00, got ${createdTrip.driver_payout}`);
  }

  // Update trip driver_payout
  console.log(`  - Updating trip driver_payout to 1750.00...`);
  const updatedTrip = await prisma.trip.update({
    where: { id: createdTrip.id },
    data: { driver_payout: 1750.00 },
  });
  console.log(`  - Updated driver_payout: SAR ${Number(updatedTrip.driver_payout).toFixed(2)}`);

  if (Number(updatedTrip.driver_payout) !== 1750.00) {
    throw new Error(`Driver payout update mismatch! Expected 1750.00, got ${updatedTrip.driver_payout}`);
  }

  // 3. Financial Helper Calculations Test
  console.log('\n[3. Financial Calculation Regression Test]');
  const mockCharges = [{ amount: 200.00 }];
  const baseBilling = computeTripBaseBilling(updatedTrip);
  const totalAmount = computeTripTotalAmount(updatedTrip, mockCharges);
  const balanceMargin = computeTripBalance(updatedTrip, mockCharges);

  console.log(`  - Base Billing: SAR ${baseBilling.toFixed(2)} (Expected: 2500.00)`);
  console.log(`  - Total Amount (+ SAR 200 extra charges): SAR ${totalAmount.toFixed(2)} (Expected: 2700.00)`);
  console.log(`  - Balance Margin (Total - (Charges + Driver Payout)): SAR ${balanceMargin.toFixed(2)} (Expected: 750.00)`);

  if (baseBilling !== 2500 || totalAmount !== 2700 || balanceMargin !== 750) {
    throw new Error('Financial calculation test failed!');
  }
  console.log('  ✅ Financial calculation math verified cleanly!');

  // Cleanup test trip
  await prisma.trip.delete({ where: { id: createdTrip.id } });
  console.log('\n  - Cleaned up test trip record.');

  console.log('\n=== ALL RUNTIME & RELATION VERIFICATION PASSED ===');
}

runRuntimeAndRelationVerification()
  .catch((e) => {
    console.error('Runtime verification failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
