import { Request, Response } from 'express';
import { prisma, io } from '../index';

export const getNotifications = async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user?.id;
    if (!userId) return res.status(401).json({ success: false, error: { message: 'Unauthorized' } });

    const notifications = await prisma.notification.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      take: 50 // Limit to recent 50
    });

    res.json({ success: true, data: notifications });
  } catch (error) {
    res.status(500).json({ success: false, error: { message: 'Internal server error' } });
  }
};

export const markAsRead = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const userId = (req as any).user?.id;

    const notification = await prisma.notification.findFirst({
      where: { id: id as string, userId: userId as string }
    });

    if (!notification) {
      return res.status(404).json({ success: false, error: { message: 'Notification not found' } });
    }

    const updated = await prisma.notification.update({
      where: { id: id as string },
      data: { is_read: true }
    });

    res.json({ success: true, data: updated });
  } catch (error) {
    res.status(500).json({ success: false, error: { message: 'Internal server error' } });
  }
};

export const sendBulkCommunication = async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user?.id;
    const { entity_type, ids, method, subject, message } = req.body;

    if (!Array.isArray(ids) || ids.length === 0 || !method || !message) {
      return res.status(400).json({ success: false, error: { message: 'Validation error: Missing fields' } });
    }

    // In a real scenario, this would integrate with SendGrid or Twilio
    console.log(`[SIMULATION] Sending ${method} to ${ids.length} ${entity_type}s. Subject: ${subject}`);
    
    // We can also create a notification for the current user confirming the batch sent
    if (userId) {
      await createNotification(
        userId,
        `Bulk ${method} Sent`,
        `Successfully sent communication to ${ids.length} ${entity_type}(s).`,
        'system'
      );
    }

    res.json({ success: true, data: { message: `Simulated sending ${method} to ${ids.length} recipients` } });
  } catch (error) {
    res.status(500).json({ success: false, error: { message: 'Failed to send bulk communication' } });
  }
};

export const createNotification = async (
  userId: string, 
  title: string, 
  message: string, 
  type: string, 
  entity_type?: string, 
  entity_id?: string
) => {
  try {
    const notification = await prisma.notification.create({
      data: {
        userId,
        title,
        message,
        type,
        entity_type,
        entity_id
      }
    });

    // Broadcast the notification to the specific user via WebSocket
    io.emit(`user:notification:${userId}`, notification);
    
    return notification;
  } catch (error) {
    console.error('Failed to create notification', error);
  }
};
