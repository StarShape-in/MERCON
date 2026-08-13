import { Request, Response } from 'express';
import { prisma } from '../index';
import { generateRefId } from '../utils/refId';
import { buildSearchAnd } from '../utils/search';
import { DriverStatus } from '@prisma/client';
import bcrypt from 'bcrypt';

/**
 * Fields the driver roster search bar looks at. Full name has to work, so both
 * name halves are listed — searching "john smith" matches first + last name.
 */
const DRIVER_SEARCH_FIELDS = [
  'ref_id',
  'first_name',
  'last_name',
  'phone_primary',
  'license_number',
  'assignedVehicle.plate_number',
  'assignedVehicle.ref_id',
];

export const getDrivers = async (req: Request, res: Response) => {
  try {
    const { status, search, page = '1', per_page = '20' } = req.query;
    
    const pageNumber = Math.max(1, parseInt(page as string) || 1);
    const limit = Math.max(1, Math.min(5000, parseInt(per_page as string) || 20));
    const skip = (pageNumber - 1) * limit;

    const whereClause: any = { deletedAt: null };
    if (status) {
      whereClause.status = status as DriverStatus;
    }
    const searchAnd = buildSearchAnd(search, DRIVER_SEARCH_FIELDS);
    if (searchAnd.length > 0) {
      whereClause.AND = searchAnd;
    }

    const [drivers, total] = await Promise.all([
      prisma.driver.findMany({
        where: whereClause,
        skip,
        take: limit,
        orderBy: { first_name: 'asc' },
        include: {
          trips: {
            where: {
              deletedAt: null,
              status: {
                in: ['Draft', 'Dispatched', 'AtPickup', 'InTransit', 'AtDelivery']
              }
            },
            include: {
              vehicle: true
            },
            orderBy: {
              planned_start: 'asc'
            }
          },
          assignedVehicle: true
        }
      }),
      prisma.driver.count({ where: whereClause })
    ]);

    res.json({
      success: true,
      data: drivers,
      meta: {
        page: pageNumber,
        per_page: limit,
        total,
        total_pages: Math.ceil(total / limit),
        has_next: (skip + limit) < total,
        has_prev: pageNumber > 1
      }
    });
  } catch (error) {
    logger.error({ err: error }, 'Failed to fetch drivers');
    res.status(500).json({ success: false, error: { code: 'SERVER_ERROR', message: 'Failed to fetch drivers' } });
  }
};

export const getDriverById = async (req: Request, res: Response) => {
  try {
    const driver = await prisma.driver.findUnique({
      where: { id: req.params.id as string, deletedAt: null },
      include: {
        trips: {
          where: { deletedAt: null, status: { notIn: ['Cancelled'] } },
          orderBy: { planned_start: 'asc' },
          include: { vehicle: true, customer: true, stops: true }
        },
        assignedVehicle: true
      }
    });

    if (!driver) {
      return res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Driver not found' } });
    }

    const documents = await prisma.document.findMany({
      where: { entity_type: 'Driver', entity_id: driver.id, deletedAt: null }
    });

    res.json({ success: true, data: { ...driver, documents } });
  } catch (error) {
    res.status(500).json({ success: false, error: { code: 'SERVER_ERROR', message: 'Failed to fetch driver' } });
  }
};

export const createDriver = async (req: Request, res: Response) => {
  try {
    const { first_name, last_name, phone_primary, license_number, license_expiry, assigned_vehicle_id } = req.body; // validated by createDriverBody

    const ref_id = await generateRefId('DRV', () =>
      prisma.driver.findMany({ select: { ref_id: true } }));

    const newDriver = await prisma.driver.create({
      data: {
        ref_id,
        first_name,
        last_name,
        phone_primary,
        license_number,
        license_expiry: new Date(license_expiry),
        assignedVehicleId: assigned_vehicle_id || null,
        created_by: (req as any).user?.id
      }
    });

    res.status(201).json({ success: true, data: newDriver });
  } catch (error: any) {
    if (error.code === 'P2002') {
      const message = error.meta?.target?.includes?.('assignedVehicleId')
        ? 'That vehicle is already assigned to another driver'
        : 'Phone number already exists';
      return res.status(400).json({ success: false, error: { code: 'DUPLICATE_ENTRY', message } });
    }
    res.status(500).json({ success: false, error: { code: 'SERVER_ERROR', message: 'Failed to create driver' } });
  }
};

/** One row's outcome. `warning` means the driver imported but something
 *  secondary (the vehicle assignment) could not be applied — importing 200
 *  drivers should not fail because one plate was mistyped. */
export type ImportRowResult = {
  row: number;
  success: boolean;
  ref_id?: string;
  label?: string;
  action?: 'created' | 'updated';
  error?: string;
  warning?: string;
};

/**
 * Bulk-import drivers from the fleet workbook.
 *
 * Two passes on purpose. The drivers sheet references vehicles by plate and the
 * vehicles sheet references drivers by phone/name, so whichever you import
 * first, half the references point at rows that don't exist yet. Pass 1 upserts
 * the people; pass 2 resolves the vehicle assignments, by which time a vehicle
 * import run either before or after this one has had its chance to create them.
 *
 * Upserts on `phone_primary` — the only unique column on Driver — so fixing a
 * typo and re-uploading the same workbook corrects people instead of
 * duplicating them.
 */
export const bulkImportDrivers = async (req: Request, res: Response) => {
  try {
    const { rows } = req.body as {
      rows: Array<{
        ref_id?: string;
        first_name: string;
        last_name: string;
        phone_primary: string;
        license_number: string;
        license_expiry: string;
        assigned_vehicle_plate?: string;
      }>;
    };
    const userId = (req as any).user?.id;
    const results: ImportRowResult[] = [];

    // Pass 1 — the people themselves.
    for (let i = 0; i < rows.length; i++) {
      const row = rows[i];
      const rowNumber = i + 1;
      const label = `${row.first_name} ${row.last_name}`.trim();

      try {
        const phone = row.phone_primary.trim();
        const expiry = new Date(row.license_expiry);
        if (isNaN(expiry.getTime())) {
          throw new Error(`License expiry "${row.license_expiry}" isn't a date we can read — use YYYY-MM-DD`);
        }

        const existing = await prisma.driver.findFirst({ where: { phone_primary: phone } });

        if (existing) {
          // Deliberately does not touch status: a driver mid-trip is OnTrip, and
          // a re-import resetting them to Available would free a truck that is
          // on the road.
          await prisma.driver.update({
            where: { id: existing.id },
            data: {
              first_name: row.first_name.trim(),
              last_name: row.last_name.trim(),
              license_number: row.license_number.trim(),
              license_expiry: expiry,
              ...(existing.deletedAt ? { deletedAt: null, deleted_by: null, isActive: true } : {}),
              updated_by: userId,
            },
          });
          results.push({ row: rowNumber, success: true, ref_id: existing.ref_id ?? undefined, label, action: 'updated' });
        } else {
          const ref_id = String(row.ref_id || '').trim() || await generateRefId('DRV', () =>
            prisma.driver.findMany({ select: { ref_id: true } }));

          const created = await prisma.driver.create({
            data: {
              ref_id,
              first_name: row.first_name.trim(),
              last_name: row.last_name.trim(),
              phone_primary: phone,
              license_number: row.license_number.trim(),
              license_expiry: expiry,
              created_by: userId,
            },
          });
          results.push({ row: rowNumber, success: true, ref_id: created.ref_id ?? undefined, label, action: 'created' });
        }
      } catch (err: any) {
        const message = err.code === 'P2002'
          ? 'A driver with this phone number or reference already exists'
          : err.message || 'Could not import this row';
        results.push({ row: rowNumber, success: false, label, error: message });
      }
    }

    // Pass 2 — vehicle assignments, now that every driver in this file exists.
    for (let i = 0; i < rows.length; i++) {
      const row = rows[i];
      const plate = String(row.assigned_vehicle_plate || '').trim();
      const result = results[i];
      if (!plate || !result?.success) continue;

      try {
        const vehicle = await prisma.vehicle.findFirst({
          where: { plate_number: { equals: plate, mode: 'insensitive' }, deletedAt: null },
        });
        if (!vehicle) {
          result.warning = `Imported, but vehicle "${plate}" wasn't found — import the vehicles file, then re-upload this one`;
          continue;
        }

        const driver = await prisma.driver.findFirst({ where: { phone_primary: row.phone_primary.trim() } });
        if (!driver) continue;

        await prisma.driver.update({
          where: { id: driver.id },
          data: { assignedVehicleId: vehicle.id, updated_by: userId },
        });
      } catch (err: any) {
        // One vehicle maps to at most one driver (assignedVehicleId is unique).
        result.warning = err.code === 'P2002'
          ? `Imported, but "${plate}" is already assigned to another driver`
          : `Imported, but the vehicle assignment failed`;
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
    res.status(500).json({ success: false, error: { code: 'SERVER_ERROR', message: 'Failed to import drivers' } });
  }
};

export const updateDriver = async (req: Request, res: Response) => {
  try {
    const { assigned_vehicle_id, ...rest } = req.body;
    const updatedDriver = await prisma.driver.update({
      where: { id: req.params.id as string },
      data: {
        ...rest,
        ...(assigned_vehicle_id !== undefined ? { assignedVehicleId: assigned_vehicle_id } : {}),
        updated_by: (req as any).user?.id
      }
    });

    res.json({ success: true, data: updatedDriver });
  } catch (error: any) {
    if (error.code === 'P2002' && error.meta?.target?.includes?.('assignedVehicleId')) {
      return res.status(400).json({ success: false, error: { code: 'DUPLICATE_ENTRY', message: 'That vehicle is already assigned to another driver' } });
    }
    res.status(500).json({ success: false, error: { code: 'SERVER_ERROR', message: 'Failed to update driver' } });
  }
};

export const deleteDriver = async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user?.id;
    const { password } = req.body;

    if (!password) {
      return res.status(400).json({ success: false, error: { code: 'VALIDATION_ERROR', message: 'Password is required to confirm deletion' } });
    }

    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user || !user.password_hash) {
      return res.status(401).json({ success: false, error: { code: 'UNAUTHORIZED', message: 'User not found or missing password' } });
    }

    const isValid = await bcrypt.compare(password, user.password_hash);
    if (!isValid) {
      return res.status(401).json({ success: false, error: { code: 'INVALID_CREDENTIALS', message: 'Incorrect password' } });
    }

    await prisma.driver.update({
      where: { id: req.params.id as string },
      data: {
        deletedAt: new Date(),
        isActive: false,
        deleted_by: userId,
        // Free the unique phone number so a new driver can reuse it.
        // The record is kept (soft delete) so any trips that referenced it stay valid.
        phone_primary: null
      }
    });
    res.json({ success: true, data: { message: 'Driver deleted successfully' } });
  } catch (error) {
    res.status(500).json({ success: false, error: { code: 'SERVER_ERROR', message: 'Failed to delete driver' } });
  }
};


export const bulkDeleteDrivers = async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user?.id;
    const { ids } = req.body;

    if (!Array.isArray(ids) || ids.length === 0) {
      return res.status(400).json({ success: false, error: { code: 'VALIDATION_ERROR', message: 'No IDs provided' } });
    }

    await prisma.driver.updateMany({
      where: { id: { in: ids } },
      data: {
        deletedAt: new Date(),
        isActive: false,
        deleted_by: userId
      }
    });
    res.json({ success: true, data: { message: `Successfully deleted ${ids.length} drivers` } });
  } catch (error) {
    res.status(500).json({ success: false, error: { code: 'SERVER_ERROR', message: `Failed to bulk delete drivers` } });
  }
};

export const bulkUpdateDriverStatus = async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user?.id;
    const { ids, status } = req.body;

    if (!Array.isArray(ids) || ids.length === 0 || !status) {
      return res.status(400).json({ success: false, error: { code: 'VALIDATION_ERROR', message: 'IDs and status are required' } });
    }

    await prisma.driver.updateMany({
      where: { id: { in: ids } },
      data: {
        status: status as DriverStatus,
        updated_by: userId
      }
    });
    res.json({ success: true, data: { message: `Successfully updated ${ids.length} drivers` } });
  } catch (error) {
    res.status(500).json({ success: false, error: { code: 'SERVER_ERROR', message: `Failed to bulk update drivers` } });
  }
};
