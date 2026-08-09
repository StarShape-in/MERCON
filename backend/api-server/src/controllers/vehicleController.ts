import { Request, Response } from 'express';
import { prisma } from '../index';
import { generateRefId } from '../utils/refId';
import { AssetStatus, AssetType } from '@prisma/client';

export const getVehicles = async (req: Request, res: Response) => {
  try {
    const { status, search, page = '1', per_page = '20' } = req.query;
    
    const pageNumber = parseInt(page as string);
    const limit = parseInt(per_page as string);
    const skip = (pageNumber - 1) * limit;

    const whereClause: any = { deletedAt: null };
    if (status) {
      whereClause.status = status as AssetStatus;
    }
    if (search) {
      whereClause.plate_number = { contains: search as string, mode: 'insensitive' };
    }

    const [vehicles, total] = await Promise.all([
      prisma.vehicle.findMany({
        where: whereClause,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          assignedDriver: true,
          trips: {
            where: {
              deletedAt: null,
              status: {
                in: ['Dispatched', 'AtPickup', 'InTransit', 'AtDelivery']
              }
            },
            include: {
              driver: true
            },
            take: 1
          }
        }
      }),
      prisma.vehicle.count({ where: whereClause })
    ]);

    res.json({
      success: true,
      data: vehicles,
      meta: {
        page: pageNumber,
        per_page: limit,
        total,
        total_pages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, error: { code: 'SERVER_ERROR', message: 'Failed to fetch vehicles' } });
  }
};

export const getVehicleById = async (req: Request, res: Response) => {
  try {
    const vehicle = await prisma.vehicle.findUnique({
      where: { id: req.params.id as string, deletedAt: null },
      include: {
        assignedDriver: true,
        trips: {
          where: {
            deletedAt: null,
            status: {
              in: ['Dispatched', 'AtPickup', 'InTransit', 'AtDelivery']
            }
          },
          include: {
            driver: true
          },
          take: 1
        }
      }
    });

    if (!vehicle) {
      return res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Vehicle not found' } });
    }

    // Fetch documents manually because of polymorphic relation
    const documents = await prisma.document.findMany({
      where: { entity_type: 'Vehicle', entity_id: vehicle.id, deletedAt: null }
    });

    res.json({ success: true, data: { ...vehicle, documents } });
  } catch (error) {
    res.status(500).json({ success: false, error: { code: 'SERVER_ERROR', message: 'Failed to fetch vehicle' } });
  }
};

function normalizeAssetType(raw: any): AssetType {
  const str = String(raw || '').trim().toUpperCase().replace(/[^A-Z]/g, '');
  if (str.includes('BOX')) return AssetType.Box;
  if (str.includes('REEFER') || str.includes('COLD') || str.includes('FRIDGE')) return AssetType.Reefer;
  if (str.includes('TANK')) return AssetType.Tanker;
  if (str.includes('FLAT') || str.includes('BED')) return AssetType.Flatbed;
  return AssetType.Box;
}

function cleanString(val: any): string | null {
  if (val === null || val === undefined) return null;
  const str = String(val).trim();
  const lower = str.toLowerCase();
  if (!str || ['nil', 'nill', 'none', 'n/a', 'na', 'null', 'undefined', '-', '0'].includes(lower)) {
    return null;
  }
  return str;
}

function cleanNumber(val: any): number | null {
  if (val === null || val === undefined) return null;
  if (typeof val === 'number') return isNaN(val) ? null : val;
  const cleaned = String(val).replace(/[^0-9.]/g, '');
  if (!cleaned) return null;
  const num = Number(cleaned);
  return isNaN(num) ? null : num;
}

/**
 * Bulk-import vehicles from the fleet workbook.
 *
 * Same two-pass shape as the driver import, and for the same reason: the two
 * sheets reference each other, so whichever goes first has dangling references.
 * Pass 1 upserts the trucks on `plate_number` (the unique column, so a
 * re-upload corrects rather than duplicates); pass 2 links each truck to its
 * driver, matched by phone first and falling back to full name.
 *
 * Status is never written. A re-import must not flip a truck that is out on a
 * job back to Available.
 */
export const bulkImportVehicles = async (req: Request, res: Response) => {
  try {
    const { rows } = req.body as {
      rows: Array<{
        ref_id?: string;
        plate_number: string;
        asset_type: string;
        capacity_kg: number | string;
        current_odometer?: number | string;
        icces_device_id?: string | number;
        trailer_number?: string;
        trailer_type?: string;
        trailer_capacity_kg?: number | string;
        assigned_driver?: string;
      }>;
    };
    const userId = (req as any).user?.id;
    const results: Array<{
      row: number; success: boolean; ref_id?: string; label?: string;
      action?: 'created' | 'updated'; error?: string; warning?: string;
    }> = [];

    // Pass 1 — the trucks.
    for (let i = 0; i < rows.length; i++) {
      const row = rows[i];
      const rowNumber = i + 1;
      const plate = String(row.plate_number || '').trim();

      if (!plate) {
        results.push({ row: rowNumber, success: false, error: 'Plate number is required' });
        continue;
      }

      try {
        let existing = await prisma.vehicle.findFirst({
          where: { plate_number: { equals: plate, mode: 'insensitive' } },
        });

        const refIdClean = cleanString(row.ref_id);
        if (!existing && refIdClean) {
          existing = await prisma.vehicle.findFirst({
            where: { ref_id: { equals: refIdClean, mode: 'insensitive' } },
          });
        }

        const iccesDeviceIdClean = cleanString(row.icces_device_id);
        const trailerNumberClean = cleanString(row.trailer_number);
        const trailerTypeClean = row.trailer_type ? normalizeAssetType(row.trailer_type) : null;
        const trailerCapacityKgClean = cleanNumber(row.trailer_capacity_kg);
        const currentOdometerClean = cleanNumber(row.current_odometer);

        const shared = {
          asset_type: normalizeAssetType(row.asset_type),
          capacity_kg: cleanNumber(row.capacity_kg) ?? 10000,
          ...(currentOdometerClean !== null ? { current_odometer: currentOdometerClean } : {}),
          icces_device_id: iccesDeviceIdClean,
          trailer_number: trailerNumberClean,
          trailer_type: trailerTypeClean,
          trailer_capacity_kg: trailerCapacityKgClean,
        };

        if (existing) {
          await prisma.vehicle.update({
            where: { id: existing.id },
            data: {
              plate_number: plate,
              ...shared,
              ...(existing.deletedAt ? { deletedAt: null, deleted_by: null, isActive: true } : {}),
              updated_by: userId,
            },
          });
          results.push({ row: rowNumber, success: true, ref_id: existing.ref_id ?? undefined, label: plate, action: 'updated' });
        } else {
          let ref_id = refIdClean;
          if (!ref_id) {
            ref_id = await generateRefId('TRK', () =>
              prisma.vehicle.findMany({ select: { ref_id: true } }));
          } else {
            // Ensure ref_id isn't collision with existing vehicle
            const refCollision = await prisma.vehicle.findFirst({ where: { ref_id } });
            if (refCollision) {
              ref_id = await generateRefId('TRK', () =>
                prisma.vehicle.findMany({ select: { ref_id: true } }));
            }
          }

          const created = await prisma.vehicle.create({
            data: { ref_id, plate_number: plate, ...shared, created_by: userId },
          });
          results.push({ row: rowNumber, success: true, ref_id: created.ref_id ?? undefined, label: plate, action: 'created' });
        }
      } catch (err: any) {
        const message = err.code === 'P2002'
          ? (err.meta?.target?.includes?.('icces_device_id')
            ? 'That ICCES device ID is already on another vehicle'
            : 'A vehicle with this plate or reference already exists')
          : err.message || 'Could not import this row';
        results.push({ row: rowNumber, success: false, label: plate, error: message });
      }
    }

    // Pass 2 — driver assignments, now that every truck in this file exists.
    for (let i = 0; i < rows.length; i++) {
      const row = rows[i];
      const whoRaw = cleanString(row.assigned_driver);
      const result = results[i];
      if (!whoRaw || !result?.success) continue;

      const who = whoRaw.replace(/\s*\([^)]*\)\s*$/, '').trim();
      if (!who) continue;

      try {
        const digits = who.replace(/\D/g, '');
        let driver = await prisma.driver.findFirst({
          where: { phone_primary: who, deletedAt: null },
        });

        if (!driver && digits.length >= 7) {
          const candidates = await prisma.driver.findMany({
            where: { deletedAt: null, phone_primary: { not: null } },
            select: { id: true, phone_primary: true },
          });
          const hit = candidates.find((c) => {
            const theirs = (c.phone_primary ?? '').replace(/\D/g, '');
            return theirs.endsWith(digits) || digits.endsWith(theirs);
          });
          if (hit) driver = await prisma.driver.findUnique({ where: { id: hit.id } });
        }

        if (!driver) {
          const parts = who.split(/\s+/);
          const nameMatches = await prisma.driver.findMany({
            where: {
              deletedAt: null,
              first_name: { equals: parts[0], mode: 'insensitive' },
              ...(parts.length > 1 ? { last_name: { equals: parts.slice(1).join(' '), mode: 'insensitive' } } : {}),
            },
            take: 2,
          });
          if (nameMatches.length > 1) {
            result.warning = `Imported, but more than one driver is called "${who}" — assign the truck by phone number instead`;
            continue;
          }
          driver = nameMatches[0] ?? null;
        }

        if (!driver) {
          result.warning = `Imported, but driver "${who}" wasn't found — import the drivers file, then re-upload this one`;
          continue;
        }

        const vehicle = await prisma.vehicle.findFirst({
          where: { plate_number: { equals: String(row.plate_number).trim(), mode: 'insensitive' } },
        });
        if (!vehicle) continue;

        await prisma.driver.update({
          where: { id: driver.id },
          data: { assignedVehicleId: vehicle.id, updated_by: userId },
        });
      } catch (err: any) {
        result.warning = err.code === 'P2002'
          ? `Imported, but ${who} already has a different vehicle assigned`
          : 'Imported, but the driver assignment failed';
      }
    }

    const created = results.filter((r) => r.success && r.action === 'created').length;
    const updated = results.filter((r) => r.success && r.action === 'updated').length;
    const failed = results.filter((r) => !r.success).length;

    res.json({
      success: true,
      data: { total: rows.length, created, updated, failed, results },
    });
  } catch (error) {
    res.status(500).json({ success: false, error: { code: 'SERVER_ERROR', message: 'Failed to import vehicles' } });
  }
};

export const createVehicle = async (req: Request, res: Response) => {
  try {
    const {
      plate_number,
      asset_type,
      capacity_kg,
      trailer_number,
      trailer_type,
      trailer_capacity_kg,
      gps_device_id,
      icces_device_id
    } = req.body;

    const ref_id = await generateRefId('TRK', () =>
      prisma.vehicle.findMany({ select: { ref_id: true } }));

    const vehicle = await prisma.vehicle.create({
      data: {
        ref_id,
        plate_number,
        asset_type: asset_type as AssetType,
        capacity_kg,
        trailer_number,
        trailer_type: trailer_type ? (trailer_type as AssetType) : null,
        trailer_capacity_kg,
        gps_device_id,
        icces_device_id,
        created_by: (req as any).user?.id
      }
    });

    res.status(201).json({ success: true, data: vehicle });
  } catch (error: any) {
    if (error.code === 'P2002') {
      return res.status(400).json({ success: false, error: { code: 'DUPLICATE', message: 'Plate number already exists' } });
    }
    res.status(500).json({ success: false, error: { code: 'SERVER_ERROR', message: 'Failed to create vehicle' } });
  }
};

export const updateVehicle = async (req: Request, res: Response) => {
  try {
    const updated = await prisma.vehicle.update({
      where: { id: req.params.id as string },
      data: {
        ...req.body,
        asset_type: req.body.asset_type ? (req.body.asset_type as AssetType) : undefined,
        trailer_type: req.body.trailer_type ? (req.body.trailer_type as AssetType) : undefined,
        updated_by: (req as any).user?.id
      }
    });
    res.json({ success: true, data: updated });
  } catch (error) {
    res.status(500).json({ success: false, error: { code: 'SERVER_ERROR', message: 'Failed to update vehicle' } });
  }
};

export const deleteVehicle = async (req: Request, res: Response) => {
  try {
    await prisma.vehicle.update({
      where: { id: req.params.id as string },
      data: {
        deletedAt: new Date(),
        isActive: false,
        deleted_by: (req as any).user?.id
      }
    });
    res.json({ success: true, data: { message: 'Vehicle deleted successfully' } });
  } catch (error) {
    res.status(500).json({ success: false, error: { code: 'SERVER_ERROR', message: 'Failed to delete vehicle' } });
  }
};


export const bulkDeleteVehicles = async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user?.id;
    const { ids } = req.body;

    if (!Array.isArray(ids) || ids.length === 0) {
      return res.status(400).json({ success: false, error: { code: 'VALIDATION_ERROR', message: 'No IDs provided' } });
    }

    await prisma.vehicle.updateMany({
      where: { id: { in: ids } },
      data: {
        deletedAt: new Date(),
        isActive: false,
        deleted_by: userId
      }
    });
    res.json({ success: true, data: { message: `Successfully deleted ${ids.length} vehicles` } });
  } catch (error) {
    res.status(500).json({ success: false, error: { code: 'SERVER_ERROR', message: `Failed to bulk delete vehicles` } });
  }
};

export const bulkUpdateVehicleStatus = async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user?.id;
    const { ids, status } = req.body;

    if (!Array.isArray(ids) || ids.length === 0 || !status) {
      return res.status(400).json({ success: false, error: { code: 'VALIDATION_ERROR', message: 'IDs and status are required' } });
    }

    await prisma.vehicle.updateMany({
      where: { id: { in: ids } },
      data: {
        status: status as AssetStatus,
        updated_by: userId
      }
    });
    res.json({ success: true, data: { message: `Successfully updated ${ids.length} vehicles` } });
  } catch (error) {
    res.status(500).json({ success: false, error: { code: 'SERVER_ERROR', message: `Failed to bulk update vehicles` } });
  }
};

export const getVehicleFinancials = async (req: Request, res: Response) => {
  try {
    const vehicleId = req.params.id as string;
    const vehicle = await prisma.vehicle.findUnique({
      where: { id: vehicleId, deletedAt: null },
    });

    if (!vehicle) {
      return res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Vehicle not found' } });
    }

    const trips = await prisma.trip.findMany({
      where: { vehicleId, deletedAt: null },
      orderBy: { createdAt: 'desc' },
      include: {
        customer: { select: { name: true } },
        invoices: { where: { deletedAt: null } },
      },
    });

    const maintenanceRecords = await prisma.maintenanceRecord.findMany({
      where: { vehicleId, deletedAt: null },
      orderBy: [{ start_date: 'desc' }, { service_date: 'desc' }],
    });

    let totalIncome = 0;
    const tripBreakdown = trips.map((t) => {
      const invoice = t.invoices[0];
      const income = (t.billing_amount && t.billing_amount > 0)
        ? t.billing_amount
        : (invoice?.total_amount && invoice.total_amount > 0)
          ? invoice.total_amount
          : (t.trip_charges || 0);
      if (t.status === 'Completed' || t.status === 'Invoiced') {
        totalIncome += income;
      }
      return {
        id: t.id,
        ref_id: t.ref_id,
        status: t.status,
        customer_name: t.customer?.name || 'N/A',
        date: t.actual_end || t.actual_start || t.createdAt,
        income,
      };
    });

    const totalMaintenanceExpense = maintenanceRecords.reduce((sum, m) => sum + (m.cost || 0), 0);
    const renewalExpenses = maintenanceRecords
      .filter((m) => m.maintenance_type === 'Renewal')
      .reduce((sum, m) => sum + (m.cost || 0), 0);

    const totalExpenses = totalMaintenanceExpense;
    const netProfit = totalIncome - totalExpenses;
    const marginPercent = totalIncome > 0 ? Math.round((netProfit / totalIncome) * 1000) / 10 : 0;

    res.json({
      success: true,
      data: {
        vehicle_id: vehicle.id,
        plate_number: vehicle.plate_number,
        ref_id: vehicle.ref_id,
        asset_type: vehicle.asset_type,
        summary: {
          total_income: totalIncome,
          total_expenses: totalExpenses,
          maintenance_expenses: totalMaintenanceExpense,
          renewal_expenses: renewalExpenses,
          net_profit: netProfit,
          margin_percent: marginPercent,
          completed_trips_count: trips.filter((t) => t.status === 'Completed' || t.status === 'Invoiced').length,
          total_maintenance_count: maintenanceRecords.length,
        },
        income_sources: tripBreakdown,
        expense_records: maintenanceRecords,
      },
    });
  } catch (error) {
    res.status(500).json({ success: false, error: { code: 'SERVER_ERROR', message: 'Failed to fetch vehicle financial report' } });
  }
};

