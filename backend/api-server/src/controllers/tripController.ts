import { Request, Response } from 'express';
import { prisma } from '../index';
import { generateRefId } from '../utils/refId';
import { createDriverNotification } from './notificationController';
import { TripStatus, StopType, PaymentStatus, DriverStatus, AssetStatus } from '@prisma/client';
import { logger } from '../utils/logger';

const isUuid = (val: any): boolean =>
  typeof val === 'string' && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(val);

/**
 * Notify a driver they've been assigned a trip. Notifications target the driver
 * directly (Notification.driverId). Call after the assignment transaction commits.
 */
async function notifyDriverAssigned(
  driverId: string,
  trip: { id: string; ref_id: string | null },
) {
  try {
    await createDriverNotification(
      driverId,
      'Trip Assignment',
      `You've been assigned trip ${trip.ref_id ?? ''}. Open the app to start.`.replace('  ', ' '),
      'Trip',
      'Trip',
      trip.id,
    );
  } catch (err) {
    logger.error({ err }, 'Failed to send driver assignment notification');
  }
}

export const getTrips = async (req: Request, res: Response) => {
  try {
    const { status, driver_id, customer_id, search, page = '1', per_page = '20' } = req.query;

    const pageNumber = parseInt(page as string);
    const limit = parseInt(per_page as string);
    const skip = (pageNumber - 1) * limit;

    const whereClause: any = { deletedAt: null };
    if (status) whereClause.status = status as TripStatus;
    if (driver_id) whereClause.driverId = driver_id as string;
    if (customer_id) whereClause.customerId = customer_id as string;
    if (search) {
      whereClause.OR = [
        { ref_id: { contains: search as string, mode: 'insensitive' } },
        { cargo_type: { contains: search as string, mode: 'insensitive' } },
        { customer: { name: { contains: search as string, mode: 'insensitive' } } },
      ];
    }

    const [trips, total] = await Promise.all([
      prisma.trip.findMany({
        where: whereClause,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: { driver: true, vehicle: true, customer: true }
      }),
      prisma.trip.count({ where: whereClause })
    ]);

    res.json({
      success: true,
      data: trips,
      meta: {
        page: pageNumber,
        per_page: limit,
        total,
        total_pages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    logger.error({ err: error }, 'Failed to fetch trips');
    res.status(500).json({ success: false, error: { code: 'SERVER_ERROR', message: 'Failed to fetch trips' } });
  }
};

export const getTripById = async (req: Request, res: Response) => {
  try {
    const trip = await prisma.trip.findUnique({
      where: { id: req.params.id as string, deletedAt: null },
      include: { driver: true, vehicle: true, customer: true, invoices: true, stops: { orderBy: { stop_sequence: 'asc' } } }
    });

    if (!trip) {
      return res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Trip not found' } });
    }

    res.json({ success: true, data: trip });
  } catch (error) {
    logger.error({ err: error }, 'Failed to fetch trip by id');
    res.status(500).json({ success: false, error: { code: 'SERVER_ERROR', message: 'Failed to fetch trip' } });
  }
};

export const createTrip = async (req: Request, res: Response) => {
  try {
    const { customer_id, driver_id, vehicle_id, cargo_type, hazmat_flag, planned_start, stops } = req.body;

    const ref_id = await generateRefId('TRP', () =>
      prisma.trip.findMany({ where: { deletedAt: null }, select: { ref_id: true } }));

    const createdBy = isUuid((req as any).user?.id) ? (req as any).user.id : null;
    const parsedPlannedStart = (planned_start && !isNaN(Date.parse(planned_start)))
      ? new Date(planned_start)
      : null;

    const trip = await prisma.$transaction(async (tx) => {
      const customer = await tx.customer.findFirst({ where: { id: customer_id, deletedAt: null } });
      if (!customer) {
        throw new Error('CUSTOMER_NOT_FOUND');
      }

      const driver = await tx.driver.findFirst({ where: { id: driver_id, deletedAt: null } });
      if (!driver) {
        throw new Error('DRIVER_NOT_FOUND');
      }
      if (driver.status !== 'Available') {
        throw new Error('DRIVER_UNAVAILABLE');
      }

      const vehicle = await tx.vehicle.findFirst({ where: { id: vehicle_id, deletedAt: null } });
      if (!vehicle) {
        throw new Error('VEHICLE_NOT_FOUND');
      }
      if (vehicle.status !== 'Available') {
        throw new Error('VEHICLE_UNAVAILABLE');
      }

      await tx.driver.update({ where: { id: driver_id }, data: { status: 'OnTrip' } });
      await tx.vehicle.update({ where: { id: vehicle_id }, data: { status: 'OnTrip' } });

      return tx.trip.create({
        data: {
          ref_id,
          customerId: customer_id,
          driverId: driver_id,
          vehicleId: vehicle_id,
          cargo_type: cargo_type || 'General Goods',
          hazmat_flag: hazmat_flag || false,
          planned_start: parsedPlannedStart,
          status: TripStatus.Dispatched,
          ...(createdBy ? { created_by: createdBy } : {}),
          stops: {
            create: (stops || []).map((stop: any, index: number) => ({
              stop_sequence: index + 1,
              stop_type: stop.stop_type as StopType,
              location_lat: parseFloat(stop.lat),
              location_lng: parseFloat(stop.lng),
              planned_arrival: (stop.planned_arrival && !isNaN(Date.parse(stop.planned_arrival)))
                ? new Date(stop.planned_arrival)
                : null
            }))
          }
        },
        include: { stops: true }
      });
    });

    // Notify driver asynchronously without throwing
    await notifyDriverAssigned(driver_id, trip);

    res.status(201).json({ success: true, data: trip });
  } catch (error: any) {
    logger.error({ err: error, body: req.body }, 'Failed to create trip');
    if (
      error.message === 'CUSTOMER_NOT_FOUND' ||
      error.message === 'DRIVER_NOT_FOUND' ||
      error.message === 'VEHICLE_NOT_FOUND' ||
      error.message === 'DRIVER_UNAVAILABLE' ||
      error.message === 'VEHICLE_UNAVAILABLE'
    ) {
      return res.status(400).json({ success: false, error: { code: 'CONFLICT', message: error.message } });
    }
    res.status(500).json({ success: false, error: { code: 'SERVER_ERROR', message: error.message || 'Failed to create trip' } });
  }
};

export const updateTripStatus = async (req: Request, res: Response) => {
  try {
    const { status } = req.body;
    
    const updateData: any = { status: status as TripStatus, updated_by: (req as any).user?.id };
    if (status === 'Completed') updateData.actual_end = new Date();
    if (status === 'InTransit') updateData.actual_start = new Date();

    const trip = await prisma.trip.update({
      where: { id: req.params.id as string },
      data: updateData
    });

    res.json({ success: true, data: trip });
  } catch (error) {
    res.status(500).json({ success: false, error: { code: 'SERVER_ERROR', message: 'Failed to update trip status' } });
  }
};

// Driver Cash Payment Workflow endpoint
export const approveDriverPayment = async (req: Request, res: Response) => {
  try {
    const { amount, reason } = req.body;

    if (!amount || !reason) {
      return res.status(400).json({ success: false, error: { code: 'VALIDATION_ERROR', message: 'Amount and reason required' } });
    }

    const trip = await prisma.trip.update({
      where: { id: req.params.id as string },
      data: {
        extra_driver_payment: parseFloat(amount),
        payment_reason: reason,
        payment_status: PaymentStatus.Approved,
        payment_approved_by: (req as any).user?.id,
        payment_date: new Date(),
        updated_by: (req as any).user?.id
      }
    });

    res.json({ success: true, data: trip });
  } catch (error) {
    res.status(500).json({ success: false, error: { code: 'SERVER_ERROR', message: 'Failed to approve payment' } });
  }
};

// ==========================================
// PHASE 1: DISPATCH & ASSIGNMENT
// ==========================================

export const dispatchTrip = async (req: Request, res: Response) => {
  try {
    const { driver_id, vehicle_id } = req.body;
    const tripId = req.params.id as string;

    if (!driver_id || !vehicle_id) {
      return res.status(400).json({ success: false, error: { code: 'VALIDATION_ERROR', message: 'driver_id and vehicle_id required' } });
    }

    // Run in a transaction to ensure atomic state updates
    const result = await prisma.$transaction(async (tx) => {
      const driver = await tx.driver.findUnique({ where: { id: driver_id } });
      const vehicle = await tx.vehicle.findUnique({ where: { id: vehicle_id } });

      if (!driver || driver.status !== 'Available') {
        throw new Error('DRIVER_UNAVAILABLE');
      }
      if (!vehicle || vehicle.status !== 'Available') {
        throw new Error('VEHICLE_UNAVAILABLE');
      }

      await tx.driver.update({ where: { id: driver_id }, data: { status: 'OnTrip' } });
      await tx.vehicle.update({ where: { id: vehicle_id }, data: { status: 'OnTrip' } });

      const updatedTrip = await tx.trip.update({
        where: { id: tripId },
        data: {
          driverId: driver_id,
          vehicleId: vehicle_id,
          status: 'Dispatched',
          updated_by: (req as any).user?.id
        }
      });

      return updatedTrip;
    });

    // Notify the driver after the dispatch commits.
    await notifyDriverAssigned(driver_id, result);

    res.json({ success: true, data: result });
  } catch (error: any) {
    if (error.message === 'DRIVER_UNAVAILABLE' || error.message === 'VEHICLE_UNAVAILABLE') {
      return res.status(400).json({ success: false, error: { code: 'CONFLICT', message: error.message } });
    }
    res.status(500).json({ success: false, error: { code: 'SERVER_ERROR', message: 'Failed to dispatch trip' } });
  }
};

export const replaceDriver = async (req: Request, res: Response) => {
  try {
    const { new_driver_id } = req.body;
    const tripId = req.params.id as string;

    if (!new_driver_id) {
      return res.status(400).json({ success: false, error: { code: 'VALIDATION_ERROR', message: 'new_driver_id required' } });
    }

    const result = await prisma.$transaction(async (tx) => {
      const trip = await tx.trip.findUnique({ where: { id: tripId } });
      if (!trip || !trip.driverId) throw new Error('TRIP_OR_DRIVER_NOT_FOUND');

      const newDriver = await tx.driver.findUnique({ where: { id: new_driver_id } });
      if (!newDriver || newDriver.status !== 'Available') throw new Error('NEW_DRIVER_UNAVAILABLE');

      // Free old driver
      await tx.driver.update({ where: { id: trip.driverId }, data: { status: 'Available' } });
      // Lock new driver
      await tx.driver.update({ where: { id: new_driver_id }, data: { status: 'OnTrip' } });

      const updatedTrip = await tx.trip.update({
        where: { id: tripId },
        data: {
          driverId: new_driver_id,
          updated_by: (req as any).user?.id
        }
      });

      return updatedTrip;
    });

    // Notify the newly-assigned driver after the swap commits.
    await notifyDriverAssigned(new_driver_id, result);

    res.json({ success: true, data: result });
  } catch (error: any) {
    if (['TRIP_OR_DRIVER_NOT_FOUND', 'NEW_DRIVER_UNAVAILABLE'].includes(error.message)) {
      return res.status(400).json({ success: false, error: { code: 'CONFLICT', message: error.message } });
    }
    res.status(500).json({ success: false, error: { code: 'SERVER_ERROR', message: 'Failed to replace driver' } });
  }
};

// ==========================================
// PHASE 2: DRIVER WORKFLOW
// ==========================================

export const pickupArrive = async (req: Request, res: Response) => {
  try {
    const tripId = req.params.id as string;
    
    const trip = await prisma.trip.findUnique({ where: { id: tripId }, include: { stops: true } });
    if (!trip) return res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Trip not found' } });

    const pickupStop = trip.stops.find(s => s.stop_type === 'Pickup');
    if (pickupStop) {
      await prisma.tripStop.update({
        where: { id: pickupStop.id },
        data: { actual_arrival: new Date() }
      });
    }

    const updatedTrip = await prisma.trip.update({
      where: { id: tripId },
      data: { status: 'AtPickup', updated_by: (req as any).user?.id }
    });

    res.json({ success: true, data: updatedTrip });
  } catch (error) {
    res.status(500).json({ success: false, error: { code: 'SERVER_ERROR', message: 'Failed to record pickup arrival' } });
  }
};

export const pickupVerify = async (req: Request, res: Response) => {
  try {
    const tripId = req.params.id as string;
    
    const updatedTrip = await prisma.trip.update({
      where: { id: tripId },
      data: { 
        status: 'InTransit', 
        actual_start: new Date(),
        updated_by: (req as any).user?.id 
      }
    });

    res.json({ success: true, data: updatedTrip });
  } catch (error) {
    res.status(500).json({ success: false, error: { code: 'SERVER_ERROR', message: 'Failed to verify pickup' } });
  }
};

export const deliveryVerify = async (req: Request, res: Response) => {
  try {
    const tripId = req.params.id as string;

    const result = await prisma.$transaction(async (tx) => {
      const trip = await tx.trip.findUnique({ where: { id: tripId }, include: { stops: true } });
      if (!trip) throw new Error('NOT_FOUND');

      const dropoffStop = trip.stops.find(s => s.stop_type === 'Dropoff');
      if (dropoffStop) {
        await tx.tripStop.update({
          where: { id: dropoffStop.id },
          data: { actual_arrival: new Date() }
        });
      }

      const updatedTrip = await tx.trip.update({
        where: { id: tripId },
        data: { 
          status: 'Completed', 
          actual_end: new Date(),
          updated_by: (req as any).user?.id 
        }
      });

      // Free assets
      if (trip.driverId) await tx.driver.update({ where: { id: trip.driverId }, data: { status: 'Available' } });
      if (trip.vehicleId) await tx.vehicle.update({ where: { id: trip.vehicleId }, data: { status: 'Available' } });

      // Generate Automated Invoice
      const existingInvoice = await tx.invoice.findFirst({ where: { tripId: trip.id } });
      if (!existingInvoice) {
        let rateCard = await tx.rateCard.findFirst({
          where: { customerId: trip.customerId, is_active: true }
        });
        
        if (!rateCard) {
          rateCard = await tx.rateCard.findFirst({
            where: { customerId: null, is_active: true }
          });
        }

        const subtotal = rateCard ? rateCard.base_price : 1000.0;

        const invoiceRefId = await generateRefId('INV', () =>
          tx.invoice.findMany({ where: { deletedAt: null }, select: { ref_id: true } }));

        await tx.invoice.create({
          data: {
            ref_id: invoiceRefId,
            tripId: trip.id,
            customerId: trip.customerId,
            status: 'Draft',
            currency: rateCard ? rateCard.currency : 'SAR',
            subtotal: subtotal,
            total_amount: subtotal,
            due_date: new Date(new Date().setDate(new Date().getDate() + 30)), // Net 30
            created_by: (req as any).user?.id
          }
        });
      }

      return updatedTrip;
    });

    res.json({ success: true, data: result });
  } catch (error: any) {
    res.status(500).json({ success: false, error: { code: 'SERVER_ERROR', message: 'Failed to verify delivery' } });
  }
};


export const bulkDeleteTrips = async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user?.id;
    const { ids } = req.body;

    if (!Array.isArray(ids) || ids.length === 0) {
      return res.status(400).json({ success: false, error: { code: 'VALIDATION_ERROR', message: 'No IDs provided' } });
    }

    await prisma.trip.updateMany({
      where: { id: { in: ids } },
      data: {
        deletedAt: new Date(),
        isActive: false,
        deleted_by: userId
      }
    });
    res.json({ success: true, data: { message: `Successfully deleted ${ids.length} trips` } });
  } catch (error) {
    res.status(500).json({ success: false, error: { code: 'SERVER_ERROR', message: `Failed to bulk delete trips` } });
  }
};

export const bulkUpdateTripStatus = async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user?.id;
    const { ids, status } = req.body;

    if (!Array.isArray(ids) || ids.length === 0 || !status) {
      return res.status(400).json({ success: false, error: { code: 'VALIDATION_ERROR', message: 'IDs and status are required' } });
    }

    await prisma.trip.updateMany({
      where: { id: { in: ids } },
      data: {
        status: status as TripStatus,
        updated_by: userId
      }
    });
    res.json({ success: true, data: { message: `Successfully updated ${ids.length} trips` } });
  } catch (error) {
    res.status(500).json({ success: false, error: { code: 'SERVER_ERROR', message: `Failed to bulk update trips` } });
  }
};
