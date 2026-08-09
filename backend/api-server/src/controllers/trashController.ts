import { Request, Response } from 'express';
import { prisma } from '../index';
import { logger } from '../utils/logger';
import { nextMaintenanceRefId } from './maintenanceController';

export async function getTrashItems(req: Request, res: Response) {
  try {
    const [customers, drivers, vehicles, trips, maintenance, invoices, rateCards] = await Promise.all([
      prisma.customer.findMany({ where: { deletedAt: { not: null } } }),
      prisma.driver.findMany({ where: { deletedAt: { not: null } } }),
      prisma.vehicle.findMany({ where: { deletedAt: { not: null } } }),
      prisma.trip.findMany({ where: { deletedAt: { not: null } } }),
      prisma.maintenanceRecord.findMany({ where: { deletedAt: { not: null } } }),
      prisma.invoice.findMany({ where: { deletedAt: { not: null } } }),
      prisma.rateCard.findMany({ where: { deletedAt: { not: null } } }),
    ]);

    const trashItems: any[] = [
      ...customers.map(c => ({ id: c.id, type: 'Customer', name: c.name, deletedAt: c.deletedAt })),
      ...drivers.map(d => ({ id: d.id, type: 'Driver', name: `${d.first_name} ${d.last_name}`, deletedAt: d.deletedAt })),
      ...vehicles.map(v => ({ id: v.id, type: 'Vehicle', name: v.plate_number, deletedAt: v.deletedAt })),
      ...trips.map(t => ({ id: t.id, type: 'Trip', name: t.ref_id || 'Draft', deletedAt: t.deletedAt })),
      ...maintenance.map(m => ({ id: m.id, type: 'MaintenanceRecord', name: `Workshop: ${m.workshop_name} (Cost: SAR ${m.cost})`, deletedAt: m.deletedAt })),
      ...invoices.map(i => ({ id: i.id, type: 'Invoice', name: i.ref_id || `INV-${i.id.substring(0, 8)}`, deletedAt: i.deletedAt })),
      ...rateCards.map(r => ({ id: r.id, type: 'RateCard', name: `${r.name || 'Rate Card'} (${r.base_price} ${r.currency})`, deletedAt: r.deletedAt })),
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
    switch (type) {
      case 'Customer':
        await prisma.customer.delete({ where: { id } });
        break;
      case 'Driver':
        await prisma.driver.delete({ where: { id } });
        break;
      case 'Vehicle':
        await prisma.vehicle.delete({ where: { id } });
        break;
      case 'Trip':
        // Cascade delete trip stops first to prevent foreign key errors
        await prisma.tripStop.deleteMany({ where: { tripId: id } });
        await prisma.trip.delete({ where: { id } });
        break;
      case 'MaintenanceRecord':
        await prisma.maintenanceRecord.delete({ where: { id } });
        break;
      case 'Invoice':
        await prisma.invoice.delete({ where: { id } });
        break;
      case 'RateCard':
        await prisma.rateCard.delete({ where: { id } });
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
