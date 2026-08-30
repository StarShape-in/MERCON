import { Request, Response } from 'express';
import { prisma } from '../index';
import { DOCUMENT_LIST_SELECT, DOCUMENT_FILES_SELECT } from '../utils/documentSelect';
import { generateRefId } from '../utils/refId';
import { buildSearchAnd } from '../utils/search';
import { DriverStatus } from '@prisma/client';
import bcrypt from 'bcrypt';
import { logger } from '../utils/logger';

/**
 * Fields the driver roster search bar looks at. Full name has to work, so both
 * name halves are listed — searching "john smith" matches first + last name.
 */
// Trip statuses that mean the trip is still in progress — mirrors the
// active-set convention already used in thirdPartyController.ts's
// activeTripsCount. A driver on one of these can't be deleted.
const ACTIVE_TRIP_STATUSES = ['Scheduled', 'Loading', 'InTransit', 'Delayed'];

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

    if (req.query.mode === 'lookup') {
      const [drivers, total] = await Promise.all([
        prisma.driver.findMany({
          where: whereClause,
          skip,
          take: limit,
          orderBy: { first_name: 'asc' },
          // Picker shape: every scalar a dropdown / export column reads, plus a
          // shallow assigned-vehicle join. Deliberately no `trips` — that
          // include is what makes the default shape too slow to load a
          // dropdown from (see the note on the default branch below).
          select: {
            id: true,
            ref_id: true,
            first_name: true,
            last_name: true,
            license_number: true,
            license_expiry: true,
            phone_primary: true,
            status: true,
            avatar_url: true,
            isActive: true,
            ai_risk_score: true,
            createdAt: true,
            assignedVehicleId: true,
            userId: true,
            user: {
              select: { id: true, username: true, phone: true, password_hash: true }
            },
            assignedVehicle: {
              select: { id: true, ref_id: true, plate_number: true, asset_type: true, capacity_kg: true }
            }
          }
        }),
        prisma.driver.count({ where: whereClause })
      ]);

      const formatted = drivers.map(d => ({
        ...d,
        hasAccountPassword: Boolean(d.user?.password_hash),
      }));

      return res.json({
        success: true,
        data: formatted,
        meta: {
          page: pageNumber,
          per_page: limit,
          total,
          total_pages: Math.ceil(total / limit),
          has_next: (skip + limit) < total,
          has_prev: pageNumber > 1
        }
      });
    }

    // Heavy shape: every in-progress trip per driver, each with its vehicle.
    // Fine for a 20-row roster page; ruinous for the 100-1000 row fetches a
    // dropdown or an export needs — those must pass `mode=lookup`.
    const [drivers, total] = await Promise.all([
      prisma.driver.findMany({
        where: whereClause,
        skip,
        take: limit,
        orderBy: { first_name: 'asc' },
        include: {
          user: {
            select: { id: true, username: true, phone: true, password_hash: true }
          },
          trips: {
            where: {
              deletedAt: null,
              status: {
                in: ['Scheduled', 'Loading', 'InTransit', 'Delayed']
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

    // Lifetime driver payout for the roster's Total Trip Charge column — the
    // `trips` include above only carries in-progress trips (see the note on
    // it), which would undercount anyone whose trips are mostly Completed. A
    // separate sum avoids pulling every trip row just to add one number.
    const tripChargeSums = await prisma.trip.groupBy({
      by: ['driverId'],
      where: { driverId: { in: drivers.map((d) => d.id) }, deletedAt: null },
      _sum: { driver_charge: true },
    });
    const tripChargeByDriver = new Map(
      tripChargeSums.map((s) => [s.driverId, Number(s._sum.driver_charge) || 0])
    );

    const formatted = drivers.map(d => ({
      ...d,
      hasAccountPassword: Boolean(d.user?.password_hash),
      total_trip_charges: tripChargeByDriver.get(d.id) || 0,
      total_driver_charges: tripChargeByDriver.get(d.id) || 0,
    }));

    res.json({
      success: true,
      data: formatted,
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
    console.error('Failed to fetch drivers:', error);
    res.status(500).json({ success: false, error: { code: 'SERVER_ERROR', message: 'Failed to fetch drivers' } });
  }
};

export const getDriverById = async (req: Request, res: Response) => {
  try {
    const idOrRef = req.params.id as string;
    const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(idOrRef);
    const whereClause: any = isUuid
      ? { id: idOrRef, deletedAt: null }
      : {
          OR: [
            { ref_id: idOrRef },
            { ref_id: { equals: idOrRef, mode: 'insensitive' } },
          ],
          deletedAt: null,
        };

    // `mode=lookup` returns the driver without their trip history. Screens that
    // only need the person (the documents page renders a name, status and
    // phone) were pulling every non-cancelled trip they have ever run, each
    // with its customer, vehicle and full stop list.
    const driver = req.query.mode === 'lookup'
      ? await prisma.driver.findFirst({
          where: whereClause,
          include: { assignedVehicle: true },
        })
      : await prisma.driver.findFirst({
          where: whereClause,
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
      where: { entity_type: 'Driver', entity_id: driver.id, deletedAt: null },
      select: DOCUMENT_LIST_SELECT,
    });

    res.json({ success: true, data: { ...driver, documents } });
  } catch (error) {
    res.status(500).json({ success: false, error: { code: 'SERVER_ERROR', message: 'Failed to fetch driver' } });
  }
};

export const createDriver = async (req: Request, res: Response) => {
  try {
    const { first_name, last_name, phone_primary, license_number, license_expiry, assigned_vehicle_id, avatar_url } = req.body; // validated by createDriverBody

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
        avatar_url: avatar_url || null,
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

    const driverId = req.params.id as string;

    // A driver mid-trip can't be pulled out from under it — the trip would
    // keep resolving the driver (soft delete), but dispatch would have no
    // signal the driver is gone.
    const activeTrips = await prisma.trip.count({
      where: { driverId, deletedAt: null, status: { in: ACTIVE_TRIP_STATUSES as any } }
    });
    if (activeTrips > 0) {
      return res.status(409).json({
        success: false,
        error: {
          code: 'IN_USE',
          message: `This driver has ${activeTrips} active trip${activeTrips === 1 ? '' : 's'} in progress. Reassign or complete them before deleting.`
        }
      });
    }

    await prisma.driver.update({
      where: { id: driverId },
      data: {
        deletedAt: new Date(),
        isActive: false,
        deleted_by: userId,
        // Free the unique phone number so a new driver can reuse it.
        // The record is kept (soft delete) so any trips that referenced it stay valid.
        phone_primary: null,
        // Free the assigned vehicle's unique slot so it can be reassigned to
        // another driver — otherwise it stays permanently "taken" even
        // though the driver holding it is gone.
        assignedVehicleId: null
      }
    });
    res.json({ success: true, data: { message: 'Driver deleted successfully' } });
  } catch (error) {
    res.status(500).json({ success: false, error: { code: 'SERVER_ERROR', message: 'Failed to delete driver' } });
  }
};

/**
 * Counts for the roster KPI cards. These used to be derived in the browser from
 * a `per_page=1000` fetch of the full driver shape (every driver with all of
 * their in-progress trips) fired on every page mount — which is what made the
 * first search on the page feel frozen: the search request queued behind it.
 * Counting in the database instead moves that from megabytes to a few numbers.
 */
export const getDriverStats = async (_req: Request, res: Response) => {
  try {
    const where = { deletedAt: null };
    const [byStatus, total, expiredLicenses] = await Promise.all([
      prisma.driver.groupBy({ by: ['status'], where, _count: { _all: true } }),
      prisma.driver.count({ where }),
      prisma.driver.count({ where: { ...where, license_expiry: { lt: new Date() } } }),
    ]);

    const by_status: Record<string, number> = {};
    for (const row of byStatus) by_status[row.status] = row._count._all;

    res.json({
      success: true,
      data: {
        total,
        expired_licenses: expiredLicenses,
        by_status,
        available: by_status.Available ?? 0,
        on_trip: by_status.OnTrip ?? 0,
        off_duty: by_status.OffDuty ?? 0,
        inactive: by_status.Inactive ?? 0,
      },
    });
  } catch (error) {
    logger.error({ err: error }, 'Failed to compute driver stats');
    res.status(500).json({ success: false, error: { code: 'SERVER_ERROR', message: 'Failed to compute driver stats' } });
  }
};

export const getDriverUsage = async (req: Request, res: Response) => {
  try {
    const id = req.params.id as string;
    const [activeTrips, totalTrips, expenses] = await Promise.all([
      prisma.trip.count({ where: { driverId: id, deletedAt: null, status: { in: ACTIVE_TRIP_STATUSES as any } } }),
      prisma.trip.count({ where: { driverId: id, deletedAt: null } }),
      prisma.expense.count({ where: { driverId: id, deletedAt: null } })
    ]);
    res.json({ success: true, data: { activeTrips, totalTrips, expenses } });
  } catch (error) {
    res.status(500).json({ success: false, error: { code: 'SERVER_ERROR', message: 'Failed to load driver usage' } });
  }
};

export const bulkDeleteDrivers = async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user?.id;
    const { ids } = req.body;

    if (!Array.isArray(ids) || ids.length === 0) {
      return res.status(400).json({ success: false, error: { code: 'VALIDATION_ERROR', message: 'No IDs provided' } });
    }

    const inUse = await prisma.trip.findMany({
      where: { driverId: { in: ids }, deletedAt: null, status: { in: ACTIVE_TRIP_STATUSES as any } },
      select: { driverId: true },
      distinct: ['driverId']
    });
    const inUseIds = new Set(inUse.map((t) => t.driverId));
    const deletableIds = ids.filter((id: string) => !inUseIds.has(id));

    if (deletableIds.length > 0) {
      await prisma.driver.updateMany({
        where: { id: { in: deletableIds } },
        data: {
          deletedAt: new Date(),
          isActive: false,
          deleted_by: userId,
          assignedVehicleId: null
        }
      });
    }

    const skippedMessage = inUseIds.size > 0 ? ` ${inUseIds.size} skipped (active trip in progress).` : '';
    res.json({ success: true, data: { message: `Successfully deleted ${deletableIds.length} drivers.${skippedMessage}` } });
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

export const setDriverPassword = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { password } = req.body;

    if (!password || password.trim().length < 4) {
      return res.status(400).json({
        success: false,
        error: { code: 'VALIDATION_ERROR', message: 'Password must be at least 4 characters' },
      });
    }

    const driver = await prisma.driver.findUnique({
      where: { id: id as string },
      include: { user: true },
    });

    if (!driver || driver.deletedAt) {
      return res.status(404).json({
        success: false,
        error: { code: 'NOT_FOUND', message: 'Driver not found' },
      });
    }

    const password_hash = await bcrypt.hash(password.trim(), 10);
    const phone = driver.phone_primary ? driver.phone_primary.trim() : null;
    const name = `${driver.first_name} ${driver.last_name}`.trim();
    const username = phone || driver.ref_id || `driver_${driver.id.substring(0, 8)}`;

    let targetUserId = driver.userId;

    if (targetUserId) {
      // Update existing linked user
      await prisma.user.update({
        where: { id: targetUserId },
        data: {
          password_hash,
          name,
          phone: phone || undefined,
          username,
          role: 'Driver',
          isActive: true,
        },
      });
    } else {
      // Check if a user account with this phone or username already exists
      let existingUser = phone
        ? await prisma.user.findFirst({
            where: { OR: [{ phone }, { username: phone }] },
          })
        : null;

      if (existingUser) {
        await prisma.user.update({
          where: { id: existingUser.id },
          data: {
            password_hash,
            name,
            role: 'Driver',
            isActive: true,
          },
        });
        targetUserId = existingUser.id;
      } else {
        const newUser = await prisma.user.create({
          data: {
            name,
            phone,
            username,
            role: 'Driver',
            password_hash,
            isActive: true,
          },
        });
        targetUserId = newUser.id;
      }

      // Link driver to user
      await prisma.driver.update({
        where: { id: driver.id },
        data: { userId: targetUserId },
      });
    }

    res.json({
      success: true,
      message: 'Driver password set successfully. Driver can now log in using phone number and password in the mobile app.',
      data: { driverId: driver.id, userId: targetUserId },
    });
  } catch (error) {
    logger.error({ err: error }, 'Error setting driver password:');
    res.status(500).json({
      success: false,
      error: { code: 'SERVER_ERROR', message: 'Failed to set driver password' },
    });
  }
};

