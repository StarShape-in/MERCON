import { Request, Response } from 'express';
import { prisma } from '../index';
import { logger } from '../utils/logger';
import { nextMaintenanceRefId } from './maintenanceController';
import { nextExpenseRefId } from './expenseController';
import { getEnabledModules } from './settingsController';

// Which toggleable module a trash entity type belongs to. Customer/Driver/
// Vehicle/Trip/RateCard aren't here — they're core, always available in trash
// regardless of Settings.enabledModules.
const ENTITY_MODULE: Record<string, string> = {
  MaintenanceRecord: 'maintenance',
  Invoice: 'invoices',
  Expense: 'expenses',
};

export async function getTrashItems(req: Request, res: Response) {
  try {
    const enabledModules = await getEnabledModules();
    const [customers, drivers, vehicles, trips, maintenance, invoices, rateCards, expenses] = await Promise.all([
      prisma.customer.findMany({ where: { deletedAt: { not: null } } }),
      prisma.driver.findMany({ where: { deletedAt: { not: null } } }),
      prisma.vehicle.findMany({ where: { deletedAt: { not: null } } }),
      prisma.trip.findMany({ where: { deletedAt: { not: null } } }),
      enabledModules.has('maintenance') ? prisma.maintenanceRecord.findMany({ where: { deletedAt: { not: null } } }) : Promise.resolve([]),
      enabledModules.has('invoices') ? prisma.invoice.findMany({ where: { deletedAt: { not: null } } }) : Promise.resolve([]),
      prisma.rateCard.findMany({ where: { deletedAt: { not: null } } }),
      enabledModules.has('expenses') ? prisma.expense.findMany({ where: { deletedAt: { not: null } } }) : Promise.resolve([]),
    ]);

    const trashItems: any[] = [
      ...customers.map(c => ({ id: c.id, type: 'Customer', name: c.name, deletedAt: c.deletedAt })),
      ...drivers.map(d => ({ id: d.id, type: 'Driver', name: `${d.first_name} ${d.last_name}`, deletedAt: d.deletedAt })),
      ...vehicles.map(v => ({ id: v.id, type: 'Vehicle', name: v.plate_number, deletedAt: v.deletedAt })),
      ...trips.map(t => ({ id: t.id, type: 'Trip', name: t.ref_id || 'Draft', deletedAt: t.deletedAt })),
      ...maintenance.map(m => ({ id: m.id, type: 'MaintenanceRecord', name: `Workshop: ${m.workshop_name} (Cost: SAR ${m.cost})`, deletedAt: m.deletedAt })),
      ...invoices.map(i => ({ id: i.id, type: 'Invoice', name: i.ref_id || `INV-${i.id.substring(0, 8)}`, deletedAt: i.deletedAt })),
      ...rateCards.map(r => ({ id: r.id, type: 'RateCard', name: `${r.name || 'Rate Card'} (${r.base_price} ${r.currency})`, deletedAt: r.deletedAt })),
      ...expenses.map(e => ({ id: e.id, type: 'Expense', name: `${e.category} (${e.currency} ${e.amount})`, deletedAt: e.deletedAt })),
    ];

    // Sort newest deletions first
    trashItems.sort((a, b) => new Date(b.deletedAt!).getTime() - new Date(a.deletedAt!).getTime());

    res.json({ success: true, data: trashItems });
  } catch (error: any) {
    logger.error('Error fetching trash items:', error);
    res.status(500).json({ error: { message: 'Failed to fetch trash items' } });
  }
}

export async function restoreTrashItem(req: Request, res: Response) {
  const type = req.params.type as string;
  const id = req.params.id as string;
  try {
    const requiredModule = ENTITY_MODULE[type];
    if (requiredModule && !(await getEnabledModules()).has(requiredModule)) {
      return res.status(403).json({ success: false, error: { code: 'MODULE_DISABLED', message: `The "${requiredModule}" module is not enabled on this deployment` } });
    }
    switch (type) {
      case 'Customer':
        await prisma.customer.update({ where: { id }, data: { deletedAt: null } });
        break;
      case 'Driver':
        await prisma.driver.update({ where: { id }, data: { deletedAt: null } });
        break;
      case 'Vehicle':
        await prisma.vehicle.update({ where: { id }, data: { deletedAt: null } });
        break;
      case 'Trip':
        await prisma.trip.update({ where: { id }, data: { deletedAt: null } });
        break;
      case 'MaintenanceRecord': {
        // Deleting a service order releases its ref_id so the sequence stays
        // gapless, so a restored order needs a fresh number at the end.
        const restored = await prisma.maintenanceRecord.findUnique({ where: { id } });
        await prisma.maintenanceRecord.update({
          where: { id },
          data: {
            deletedAt: null,
            ...(restored?.ref_id ? {} : { ref_id: await nextMaintenanceRefId() }),
          },
        });
        break;
      }
      case 'Invoice':
        await prisma.invoice.update({ where: { id }, data: { deletedAt: null } });
        break;
      case 'RateCard':
        await prisma.rateCard.update({ where: { id }, data: { deletedAt: null } });
        break;
      case 'Expense': {
        // Deleting an expense releases its ref_id so the sequence stays
        // gapless, so a restored expense needs a fresh number at the end.
        const restored = await prisma.expense.findUnique({ where: { id } });
        await prisma.expense.update({
          where: { id },
          data: {
            deletedAt: null,
            ...(restored?.ref_id ? {} : { ref_id: await nextExpenseRefId() }),
          },
        });
        break;
      }
      default:
        return res.status(400).json({ error: { message: 'Invalid entity type for restoration' } });
    }
    logger.info(`♻️ Restored ${type} with ID ${id}`);
    res.json({ success: true, message: `${type} restored successfully` });
  } catch (error: any) {
    logger.error(`Error restoring ${type} with ID ${id}:`, error);
    res.status(500).json({ error: { message: `Failed to restore ${type}` } });
  }
}

export async function hardDeleteTrashItem(req: Request, res: Response) {
  const type = req.params.type as string;
  const id = req.params.id as string;
  try {
    const requiredModule = ENTITY_MODULE[type];
    if (requiredModule && !(await getEnabledModules()).has(requiredModule)) {
      return res.status(403).json({ success: false, error: { code: 'MODULE_DISABLED', message: `The "${requiredModule}" module is not enabled on this deployment` } });
    }
    switch (type) {
      case 'Customer': {
        const customerTrips = await prisma.trip.findMany({ where: { customerId: id }, select: { id: true } });
        const tripIds = customerTrips.map(t => t.id);
        if (tripIds.length > 0) {
          await prisma.tripCharge.deleteMany({ where: { tripId: { in: tripIds } } });
          await prisma.tripStop.deleteMany({ where: { tripId: { in: tripIds } } });
          await prisma.invoice.deleteMany({ where: { tripId: { in: tripIds } } });
          await prisma.document.deleteMany({ where: { entity_type: 'Trip', entity_id: { in: tripIds } } });
          await prisma.trip.deleteMany({ where: { customerId: id } });
        }
        await prisma.invoice.deleteMany({ where: { customerId: id } });
        await prisma.customerSavedLocation.deleteMany({ where: { customerId: id } });
        await prisma.surchargeRule.deleteMany({ where: { customerId: id } });
        await prisma.rateCard.deleteMany({ where: { customerId: id } });
        await prisma.document.deleteMany({ where: { entity_type: 'Customer', entity_id: id } });
        await prisma.customer.deleteMany({ where: { id } });
        break;
      }
      case 'Driver':
        await prisma.document.deleteMany({ where: { entity_type: 'Driver', entity_id: id } });
        await prisma.driver.deleteMany({ where: { id } });
        break;
      case 'Vehicle':
        await prisma.maintenanceRecord.deleteMany({ where: { vehicleId: id } });
        await prisma.document.deleteMany({ where: { entity_type: 'Vehicle', entity_id: id } });
        await prisma.vehicle.deleteMany({ where: { id } });
        break;
      case 'Trip':
        // Cascade delete dependent records first to prevent foreign key errors
        await prisma.tripCharge.deleteMany({ where: { tripId: id } });
        await prisma.tripStop.deleteMany({ where: { tripId: id } });
        await prisma.invoice.deleteMany({ where: { tripId: id } });
        await prisma.document.deleteMany({ where: { entity_type: 'Trip', entity_id: id } });
        await prisma.trip.deleteMany({ where: { id } });
        break;
      case 'MaintenanceRecord':
        await prisma.document.deleteMany({ where: { entity_type: 'MaintenanceRecord', entity_id: id } });
        await prisma.maintenanceRecord.deleteMany({ where: { id } });
        break;
      case 'Invoice':
        await prisma.invoice.deleteMany({ where: { id } });
        break;
      case 'RateCard':
        await prisma.rateCard.deleteMany({ where: { id } });
        break;
      case 'Expense':
        await prisma.expense.deleteMany({ where: { id } });
        break;
      default:
        return res.status(400).json({ error: { message: 'Invalid entity type for permanent deletion' } });
    }
    logger.info(`🔥 Permanently deleted ${type} with ID ${id}`);
    res.json({ success: true, message: `${type} permanently deleted` });
  } catch (error: any) {
    logger.error(`Error hard-deleting ${type} with ID ${id}:`, error);
    res.status(500).json({ error: { message: `Failed to permanently delete ${type}` } });
  }
}
