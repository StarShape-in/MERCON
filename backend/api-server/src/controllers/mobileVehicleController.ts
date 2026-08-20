import { Request, Response } from 'express';
import { prisma } from '../index';
import { TripStatus } from '@prisma/client';

/**
 * The vehicle assigned to the driver's current active trip (drivers have no
 * standing vehicle assignment). Returns null when there's no active trip.
 * Includes active_maintenance so the mobile app can surface maintenance windows.
 */
export const getAssignedVehicle = async (req: Request, res: Response) => {
  const driverId = (req as any).user?.driver_id;
  if (!driverId) return res.status(403).json({ success: false, error: { message: 'Driver not authenticated' } });

  try {
    const now = new Date();
    const activeTrip = await prisma.trip.findFirst({
      where: {
        driverId,
        deletedAt: null,
        status: { in: [TripStatus.Scheduled, TripStatus.Loading, TripStatus.InTransit, TripStatus.Delayed] },
      },
      orderBy: { createdAt: 'desc' },
      select: {
        ref_id: true,
        vehicle: {
          select: {
            id: true,
            ref_id: true,
            plate_number: true,
            asset_type: true,
            status: true,
            capacity_kg: true,
            current_odometer: true,
            trailer_number: true,
            trailer_type: true,
            maintenanceRecords: {
              where: {
                deletedAt: null,
                OR: [
                  { status: { in: ['In_Progress', 'In Progress'] } },
                  { status: 'Scheduled' },
                ],
              },
              orderBy: { start_date: 'asc' },
              take: 3,
              select: {
                id: true,
                status: true,
                maintenance_type: true,
                workshop_name: true,
                start_date: true,
                end_date: true,
              },
            },
          },
        },
      },
    });

    if (!activeTrip?.vehicle) {
      return res.json({ success: true, data: null });
    }

    const { maintenanceRecords, ...vehicleData } = activeTrip.vehicle as any;
    const records: any[] = maintenanceRecords || [];
    const active =
      records.find((r: any) => r.status === 'In_Progress' || r.status === 'In Progress') ??
      records.find((r: any) => r.status === 'Scheduled' && new Date(r.start_date) <= now && (!r.end_date || new Date(r.end_date) >= now)) ??
      records.find((r: any) => r.status === 'Scheduled') ??
      null;

    res.json({
      success: true,
      data: { ...vehicleData, trip_ref_id: activeTrip.ref_id, active_maintenance: active ?? null },
    });
  } catch (error) {
    res.status(500).json({ success: false, error: { message: 'Internal server error' } });
  }
};

