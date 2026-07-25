import { Request, Response } from 'express';
import { prisma } from '../index';

/**
 * Notifications are keyed by User id, but a driver authenticates as a Driver.
 * Drivers optionally link to a User (`Driver.userId`); resolve it here.
 * Returns null when the driver has no linked user (→ empty inbox, not an error).
 */
async function driverUserId(req: Request): Promise<string | null> {
  const driverId = (req as any).user?.driver_id;
  if (!driverId) return null;
  const driver = await prisma.driver.findUnique({
    where: { id: driverId },
    select: { userId: true },
  });
  return driver?.userId ?? null;
}

export const getMobileNotifications = async (req: Request, res: Response) => {
  const driverId = (req as any).user?.driver_id;
  if (!driverId) return res.status(403).json({ success: false, error: { message: 'Driver not authenticated' } });

  try {
    const userId = await driverUserId(req);
    if (!userId) return res.json({ success: true, data: [] }); // no linked user → empty inbox

    const notifications = await prisma.notification.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      take: 50,
    });

    res.json({ success: true, data: notifications });
  } catch (error) {
    res.status(500).json({ success: false, error: { message: 'Internal server error' } });
  }
};

export const markMobileNotificationRead = async (req: Request, res: Response) => {
  const driverId = (req as any).user?.driver_id;
  const id = req.params.id as string;
  if (!driverId) return res.status(403).json({ success: false, error: { message: 'Driver not authenticated' } });

  try {
    const userId = await driverUserId(req);
    if (!userId) return res.status(404).json({ success: false, error: { message: 'Notification not found' } });

    // Scope the update to this driver's own notifications.
    const notification = await prisma.notification.findFirst({ where: { id, userId } });
    if (!notification) return res.status(404).json({ success: false, error: { message: 'Notification not found' } });

    const updated = await prisma.notification.update({ where: { id }, data: { is_read: true } });
    res.json({ success: true, data: updated });
  } catch (error) {
    res.status(500).json({ success: false, error: { message: 'Internal server error' } });
  }
};
