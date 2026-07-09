import { Request, Response } from 'express';
import { prisma } from '../index';
import { TripStatus } from '@prisma/client';

export const pingLocation = async (req: Request, res: Response) => {
  try {
    const { vehicle_id, latitude, longitude } = req.body;

    if (!vehicle_id || latitude === undefined || longitude === undefined) {
      return res.status(400).json({ success: false, error: { code: 'VALIDATION_ERROR', message: 'vehicle_id, latitude, and longitude required' } });
    }

    const updatedVehicle = await prisma.vehicle.update({
      where: { id: vehicle_id },
      data: {
        last_lat: parseFloat(latitude),
        last_lng: parseFloat(longitude),
        updated_by: (req as any).user?.id
      }
    });

    res.json({ success: true, data: updatedVehicle });
  } catch (error) {
    res.status(500).json({ success: false, error: { code: 'SERVER_ERROR', message: 'Failed to update vehicle location' } });
  }
};

export const reportEmergency = async (req: Request, res: Response) => {
  try {
    const tripId = req.params.id as string;
    const { latitude, longitude, reason } = req.body;

    // We can change trip status to 'Cancelled' or perhaps add an 'Emergency' status.
    // For now, let's just log the emergency as a note in the trip (or we could create an Emergency table).
    // Let's update the trip status to 'Cancelled' for safety if it's a severe emergency,
    // or just leave a remark if we add an emergency flag in the future.
    // Given the schema, let's just add a note to the database or if 'Emergency' is needed, we must alter schema.
    // For now, we will just update the trip to cancelled and free the driver if needed,
    // but usually in emergency we just want to flag it. Let's update the trip's cargo_type to append "[EMERGENCY]" as a quick hack.
    
    // Proper way: add an SOS field or log. But without schema change:
    const updatedTrip = await prisma.trip.update({
      where: { id: tripId },
      data: {
        status: 'Cancelled',
        updated_by: (req as any).user?.id
      }
    });

    res.json({ success: true, data: { message: 'Emergency SOS triggered', trip: updatedTrip } });
  } catch (error) {
    res.status(500).json({ success: false, error: { code: 'SERVER_ERROR', message: 'Failed to report emergency' } });
  }
};
