import axios from 'axios';
import { prisma } from '../index';
import { logger } from '../utils/logger';

export interface ExpoPushMessage {
  to: string;
  sound?: 'default' | null;
  title: string;
  body: string;
  data?: Record<string, any>;
  channelId?: string;
  priority?: 'default' | 'normal' | 'high';
}

const EXPO_PUSH_URL = 'https://exp.host/--/api/v2/push/send';

/**
 * Sends push notifications to active devices for a given driver via Expo Push Service.
 * Safe and non-blocking: errors in push delivery never throw to caller.
 */
export async function sendDriverPushNotification(
  driverId: string,
  title: string,
  body: string,
  data: Record<string, any> = {}
): Promise<void> {
  try {
    const devices = await prisma.driverDevice.findMany({
      where: {
        driverId,
        isActive: true,
      },
    });

    if (!devices || devices.length === 0) {
      logger.debug({ driverId }, '[PushService] No active devices found for driver');
      return;
    }

    const messages: ExpoPushMessage[] = [];
    const validDevices: typeof devices = [];

    for (const dev of devices) {
      if (dev.token && (dev.token.startsWith('ExponentPushToken[') || dev.token.startsWith('ExpoPushToken['))) {
        messages.push({
          to: dev.token,
          sound: 'default',
          title,
          body,
          data,
          channelId: 'default',
          priority: 'high',
        });
        validDevices.push(dev);
      } else {
        logger.warn({ token: dev.token, driverId }, '[PushService] Skipping invalid Expo push token format');
      }
    }

    if (messages.length === 0) return;

    // Send via Expo Push API
    const response = await axios.post(EXPO_PUSH_URL, messages, {
      headers: {
        Accept: 'application/json',
        'Accept-Encoding': 'gzip, deflate',
        'Content-Type': 'application/json',
      },
      timeout: 10000,
    });

    const results = response.data?.data;
    if (Array.isArray(results)) {
      for (let i = 0; i < results.length; i++) {
        const ticket = results[i];
        const device = validDevices[i];
        if (ticket.status === 'error') {
          logger.warn({ ticket, token: device.token }, '[PushService] Push ticket error');
          if (ticket.details?.error === 'DeviceNotRegistered') {
            logger.info({ token: device.token }, '[PushService] Token not registered. Deactivating device');
            await prisma.driverDevice.update({
              where: { id: device.id },
              data: { isActive: false },
            }).catch((err: any) => logger.error({ err }, '[PushService] Failed to deactivate device'));
          }
        }
      }
    }
  } catch (error: any) {
    logger.error({ err: error?.message || error, driverId }, '[PushService] Failed to send push notification');
  }
}
