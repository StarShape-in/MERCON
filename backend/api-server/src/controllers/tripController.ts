import { Request, Response } from 'express';
import { prisma } from '../index';
import { TripStatus, StopType, PaymentStatus } from '@prisma/client';

export const getTrips = async (req: Request, res: Response) => {
  try {
    const { status, driver_id, customer_id, page = '1', per_page = '20' } = req.query;
    
    const pageNumber = parseInt(page as string);
    const limit = parseInt(per_page as string);
    const skip = (pageNumber - 1) * limit;

    const whereClause: any = { deletedAt: null };
    if (status) whereClause.status = status as TripStatus;
    if (driver_id) whereClause.driverId = driver_id as string;
    if (customer_id) whereClause.customerId = customer_id as string;

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
    res.status(500).json({ success: false, error: { code: 'SERVER_ERROR', message: 'Failed to fetch trip' } });
  }
};

export const createTrip = async (req: Request, res: Response) => {
  try {
    const { customer_id, driver_id, vehicle_id, cargo_type, hazmat_flag, planned_start, stops } = req.body;

    if (!customer_id || !cargo_type || !stops || stops.length < 2) {
      return res.status(400).json({ success: false, error: { code: 'VALIDATION_ERROR', message: 'Missing required trip fields or stops' } });
    }

    const trip = await prisma.trip.create({
      data: {
        ref_id: 'TRP-' + Math.floor(1000 + Math.random() * 9000).toString(),
        customerId: customer_id,
        driverId: driver_id,
        vehicleId: vehicle_id,
        cargo_type,
        hazmat_flag: hazmat_flag || false,
        planned_start: planned_start ? new Date(planned_start) : null,
        status: TripStatus.Draft,
        created_by: (req as any).user?.id,
        stops: {
          create: stops.map((stop: any, index: number) => ({
            stop_sequence: index + 1,
            stop_type: stop.stop_type as StopType,
            location_lat: parseFloat(stop.lat),
            location_lng: parseFloat(stop.lng),
            planned_arrival: stop.planned_arrival ? new Date(stop.planned_arrival) : null
          }))
        }
      },
      include: { stops: true }
    });

    res.status(201).json({ success: true, data: trip });
  } catch (error) {
    res.status(500).json({ success: false, error: { code: 'SERVER_ERROR', message: 'Failed to create trip' } });
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
