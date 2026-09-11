import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('Starting purge of soft-deleted records...');

  // 1. Child document files
  const deletedDocFiles = await prisma.documentFile.deleteMany({
    where: { NOT: { deletedAt: null } }
  });
  console.log(`Purged ${deletedDocFiles.count} DocumentFile records`);

  // 2. Documents where document is soft-deleted (delete their files first, then docs)
  const softDeletedDocs = await prisma.document.findMany({
    where: { NOT: { deletedAt: null } },
    select: { id: true }
  });
  const docIds = softDeletedDocs.map((d) => d.id);
  if (docIds.length > 0) {
    await prisma.documentFile.deleteMany({
      where: { documentId: { in: docIds } }
    });
    const deletedDocs = await prisma.document.deleteMany({
      where: { id: { in: docIds } }
    });
    console.log(`Purged ${deletedDocs.count} Document records`);
  }

  // 3. Document imports
  const deletedDocImports = await prisma.documentImport.deleteMany({
    where: { NOT: { deletedAt: null } }
  });
  console.log(`Purged ${deletedDocImports.count} DocumentImport records`);

  // 4. Soft-deleted Trips & their children
  const softDeletedTrips = await prisma.trip.findMany({
    where: { NOT: { deletedAt: null } },
    select: { id: true }
  });
  const tripIds = softDeletedTrips.map((t) => t.id);
  if (tripIds.length > 0) {
    await prisma.tripStop.deleteMany({ where: { tripId: { in: tripIds } } });
    await prisma.tripLocation.deleteMany({ where: { tripId: { in: tripIds } } });
    await prisma.tripCharge.deleteMany({ where: { tripId: { in: tripIds } } });
    await prisma.tripDriver.deleteMany({ where: { tripId: { in: tripIds } } });
    await prisma.tripAssignmentEvent.deleteMany({ where: { tripId: { in: tripIds } } });
    await prisma.invoice.deleteMany({ where: { tripId: { in: tripIds } } });
    const deletedTrips = await prisma.trip.deleteMany({ where: { id: { in: tripIds } } });
    console.log(`Purged ${deletedTrips.count} Trip records and their dependencies`);
  }

  // 5. Invoices
  const deletedInvoices = await prisma.invoice.deleteMany({
    where: { NOT: { deletedAt: null } }
  });
  console.log(`Purged ${deletedInvoices.count} Invoice records`);

  // 6. Expenses
  const deletedExpenses = await prisma.expense.deleteMany({
    where: { NOT: { deletedAt: null } }
  });
  console.log(`Purged ${deletedExpenses.count} Expense records`);

  // 7. Maintenance records, SavedWorkshop, SavedWorkDone
  const deletedMaintenance = await prisma.maintenanceRecord.deleteMany({
    where: { NOT: { deletedAt: null } }
  });
  console.log(`Purged ${deletedMaintenance.count} MaintenanceRecord records`);

  await prisma.savedWorkshop.deleteMany({ where: { NOT: { deletedAt: null } } });
  await prisma.savedWorkDone.deleteMany({ where: { NOT: { deletedAt: null } } });

  // 8. Quotations & children
  const softDeletedQuotations = await prisma.quotation.findMany({
    where: { NOT: { deletedAt: null } },
    select: { id: true }
  });
  const quotationIds = softDeletedQuotations.map((q) => q.id);
  if (quotationIds.length > 0) {
    await prisma.quotationStop.deleteMany({ where: { quotationId: { in: quotationIds } } });
    await prisma.quotationHistory.deleteMany({ where: { quotationId: { in: quotationIds } } });
    await prisma.surchargeRule.deleteMany({ where: { quotationId: { in: quotationIds } } });
    const deletedQuotations = await prisma.quotation.deleteMany({
      where: { id: { in: quotationIds } }
    });
    console.log(`Purged ${deletedQuotations.count} Quotation records`);
  }

  // 9. Surcharge rules standalone
  const deletedSurchargeRules = await prisma.surchargeRule.deleteMany({
    where: { NOT: { deletedAt: null } }
  });
  console.log(`Purged ${deletedSurchargeRules.count} SurchargeRule records`);

  // 10. Locations
  const deletedLocations = await prisma.location.deleteMany({
    where: { NOT: { deletedAt: null } }
  });
  console.log(`Purged ${deletedLocations.count} Location records`);

  // 11. Folders
  const deletedFolders = await prisma.folder.deleteMany({
    where: { NOT: { deletedAt: null } }
  });
  console.log(`Purged ${deletedFolders.count} Folder records`);

  // 12. ThirdPartyProviders
  const deletedProviders = await prisma.thirdPartyProvider.deleteMany({
    where: { NOT: { deletedAt: null } }
  });
  console.log(`Purged ${deletedProviders.count} ThirdPartyProvider records`);

  // 13. Reports
  await prisma.scheduledReport.deleteMany({ where: { NOT: { deletedAt: null } } });
  await prisma.savedReport.deleteMany({ where: { NOT: { deletedAt: null } } });
  await prisma.reportTemplate.deleteMany({ where: { NOT: { deletedAt: null } } });

  // 14. Drivers
  const deletedDrivers = await prisma.driver.deleteMany({
    where: { NOT: { deletedAt: null } }
  });
  console.log(`Purged ${deletedDrivers.count} Driver records`);

  // 15. Vehicles
  const deletedVehicles = await prisma.vehicle.deleteMany({
    where: { NOT: { deletedAt: null } }
  });
  console.log(`Purged ${deletedVehicles.count} Vehicle records`);

  // 16. Customers (clean up associated records if customer was soft-deleted)
  const softDeletedCustomers = await prisma.customer.findMany({
    where: { NOT: { deletedAt: null } },
    select: { id: true, name: true }
  });
  for (const cust of softDeletedCustomers) {
    // Delete trips, invoices, quotations, surcharge rules, locations linked to soft deleted customer
    const custTrips = await prisma.trip.findMany({ where: { customerId: cust.id }, select: { id: true } });
    const custTripIds = custTrips.map(t => t.id);
    if (custTripIds.length > 0) {
      await prisma.tripStop.deleteMany({ where: { tripId: { in: custTripIds } } });
      await prisma.tripLocation.deleteMany({ where: { tripId: { in: custTripIds } } });
      await prisma.tripCharge.deleteMany({ where: { tripId: { in: custTripIds } } });
      await prisma.tripDriver.deleteMany({ where: { tripId: { in: custTripIds } } });
      await prisma.tripAssignmentEvent.deleteMany({ where: { tripId: { in: custTripIds } } });
      await prisma.invoice.deleteMany({ where: { tripId: { in: custTripIds } } });
      await prisma.trip.deleteMany({ where: { id: { in: custTripIds } } });
    }
    await prisma.invoice.deleteMany({ where: { customerId: cust.id } });
    const custQuotes = await prisma.quotation.findMany({ where: { customerId: cust.id }, select: { id: true } });
    const custQuoteIds = custQuotes.map(q => q.id);
    if (custQuoteIds.length > 0) {
      await prisma.quotationStop.deleteMany({ where: { quotationId: { in: custQuoteIds } } });
      await prisma.quotationHistory.deleteMany({ where: { quotationId: { in: custQuoteIds } } });
      await prisma.quotation.deleteMany({ where: { id: { in: custQuoteIds } } });
    }
    await prisma.surchargeRule.deleteMany({ where: { customerId: cust.id } });
    await prisma.location.deleteMany({ where: { customerId: cust.id } });
    await prisma.reportTemplate.deleteMany({ where: { customerId: cust.id } });
    await prisma.customer.delete({ where: { id: cust.id } });
  }
  console.log(`Purged ${softDeletedCustomers.length} soft-deleted Customer records and their dependencies`);

  // 17. Users
  const deletedUsers = await prisma.user.deleteMany({
    where: { NOT: { deletedAt: null } }
  });
  console.log(`Purged ${deletedUsers.count} User records`);
  console.log(`Purged ${deletedUsers.count} User records`);

  console.log('Soft-deleted records purge completed successfully.');
}

main()
  .catch((e) => {
    console.error('Error during purge:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
