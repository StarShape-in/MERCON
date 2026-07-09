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
