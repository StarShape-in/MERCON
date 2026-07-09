import { Request, Response } from 'express';
import { prisma } from '../index';
import { TripStatus, DriverStatus, AssetStatus } from '@prisma/client';

export const getCurrentTrip = async (req: Request, res: Response) => {
  const driverId = (req as any).user?.driver_id;
  if (!driverId) return res.status(403).json({ success: false, error: { message: 'Driver not authenticated' } });

  try {
    const trip = await prisma.trip.findFirst({
      where: {
        driverId,
        deletedAt: null,
        status: {
          in: [TripStatus.Dispatched, TripStatus.AtPickup, TripStatus.InTransit, TripStatus.AtDelivery]
        }
      },
      include: {
        customer: true,
        vehicle: true,
        stops: { orderBy: { stop_sequence: 'asc' } }
      }
    });

    if (!trip) {
      return res.json({ success: true, data: null }); // No active trip
    }

    res.json({ success: true, data: trip });
  } catch (error) {
    res.status(500).json({ success: false, error: { message: 'Internal server error' } });
  }
};

export const updateTripStatus = async (req: Request, res: Response) => {
  const driverId = (req as any).user?.driver_id;
  const id = req.params.id as string;
  const { status } = req.body;

  if (!driverId) return res.status(403).json({ success: false, error: { message: 'Driver not authenticated' } });
  
  if (!Object.values(TripStatus).includes(status)) {
    return res.status(400).json({ success: false, error: { message: 'Invalid status' } });
  }

  try {
    const trip = await prisma.trip.findFirst({
      where: { id, driverId, deletedAt: null }
    });

    if (!trip) {
      return res.status(404).json({ success: false, error: { message: 'Trip not found or not assigned to you' } });
    }

    // Update trip status
    const updatedTrip = await prisma.trip.update({
      where: { id },
      data: { 
        status,
        actual_start: status === TripStatus.InTransit && !trip.actual_start ? new Date() : undefined,
        actual_end: status === TripStatus.Completed && !trip.actual_end ? new Date() : undefined,
      },
      include: { customer: true, vehicle: true, stops: true }
    });

    // If trip completed, update driver and vehicle status to Available
    if (status === TripStatus.Completed) {
      await prisma.driver.update({ where: { id: driverId }, data: { status: DriverStatus.Available } });
      if (trip.vehicleId) {
        await prisma.vehicle.update({ where: { id: trip.vehicleId }, data: { status: AssetStatus.Available } });
      }
    }

    res.json({ success: true, data: updatedTrip });
  } catch (error) {
    res.status(500).json({ success: false, error: { message: 'Internal server error' } });
  }
};
