import { Request, Response } from 'express';
import { prisma } from '../index';
import { createNotification } from './notificationController';
import { Role, TripStatus } from '@prisma/client';

/**
 * A driver raises an emergency. Notifies every active Admin + Operator (reuses
 * createNotification, so it also emits over the socket and shows on the web
 * Notifications page). Location is optional until live GPS lands (Milestone 2).
 */
export const raiseEmergency = async (req: Request, res: Response) => {
  const driverId = (req as any).user?.driver_id;
  if (!driverId) return res.status(403).json({ success: false, error: { message: 'Driver not authenticated' } });

  const { incident_type, notes, lat, lng } = req.body ?? {};
  if (!incident_type || typeof incident_type !== 'string') {
    return res.status(400).json({ success: false, error: { message: 'incident_type is required' } });
  }

  try {
    const driver = await prisma.driver.findUnique({
      where: { id: driverId },
      select: { first_name: true, last_name: true, ref_id: true },
    });
    if (!driver) return res.status(404).json({ success: false, error: { message: 'Driver not found' } });

    // Link the alert to the driver's active trip when there is one.
    const activeTrip = await prisma.trip.findFirst({
      where: {
        driverId,
        deletedAt: null,
        status: { in: [TripStatus.Dispatched, TripStatus.AtPickup, TripStatus.InTransit, TripStatus.AtDelivery] },
      },
      select: { id: true, ref_id: true },
    });

    const driverName = `${driver.first_name} ${driver.last_name}`;
    const hasCoords = typeof lat === 'number' && typeof lng === 'number';
    const locationStr = hasCoords ? ` Location: ${lat.toFixed(5)}, ${lng.toFixed(5)}.` : '';
    const tripStr = activeTrip?.ref_id ? ` Trip ${activeTrip.ref_id}.` : '';
    const notesStr = notes && typeof notes === 'string' && notes.trim() ? ` Notes: ${notes.trim()}` : '';
    const message = `${driverName} reported: ${incident_type}.${tripStr}${locationStr}${notesStr}`;

    const staff = await prisma.user.findMany({
      where: { role: { in: [Role.Admin, Role.Operator] }, isActive: true, deletedAt: null },
      select: { id: true },
    });

    await Promise.all(
      staff.map((u) =>
        createNotification(
          u.id,
          '🚨 Driver Emergency',
          message,
          'Emergency',
          activeTrip ? 'Trip' : 'Driver',
          activeTrip?.id ?? driverId,
        ),
      ),
    );

    res.status(201).json({ success: true, data: { notified: staff.length } });
  } catch (error) {
    res.status(500).json({ success: false, error: { message: 'Internal server error' } });
  }
};
