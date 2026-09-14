import fs from 'fs';
import path from 'path';
import axios from 'axios';
import FormData from 'form-data';
import { prisma } from '../db';
import { logger } from '../utils/logger';

export interface WhatsAppServiceConfig {
  apiToken?: string;
  phoneNumberId?: string;
  graphApiVersion?: string;
}

export class WhatsAppService {
  private get config(): WhatsAppServiceConfig {
    return {
      apiToken: process.env.WHATSAPP_API_TOKEN,
      phoneNumberId: process.env.WHATSAPP_PHONE_NUMBER_ID,
      graphApiVersion: process.env.WHATSAPP_GRAPH_API_VERSION || 'v19.0',
    };
  }

  /**
   * Check whether WhatsApp Business API credentials are properly configured.
   */
  public isConfigured(): boolean {
    const { apiToken, phoneNumberId } = this.config;
    return Boolean(apiToken && apiToken.trim() && phoneNumberId && phoneNumberId.trim());
  }

  /**
   * Upload a local binary file (e.g. video / photo) from local /uploads/ directory to Meta Graph API.
   * Returns Meta media_id.
   */
  public async uploadMedia(filePath: string, mimeType: string): Promise<string> {
    if (!this.isConfigured()) {
      throw new Error('WhatsApp API credentials (WHATSAPP_API_TOKEN, WHATSAPP_PHONE_NUMBER_ID) are not configured in environment.');
    }

    const { apiToken, phoneNumberId, graphApiVersion } = this.config;
    const absolutePath = path.isAbsolute(filePath)
      ? filePath
      : path.join(process.cwd(), filePath.replace(/^\//, ''));

    if (!fs.existsSync(absolutePath)) {
      throw new Error(`Media file does not exist at local path: ${absolutePath}`);
    }

    const formData = new FormData();
    formData.append('messaging_product', 'whatsapp');
    formData.append('file', fs.createReadStream(absolutePath), {
      filename: path.basename(absolutePath),
      contentType: mimeType,
    });

    const url = `https://graph.facebook.com/${graphApiVersion}/${phoneNumberId}/media`;

    try {
      const response = await axios.post(url, formData, {
        headers: {
          Authorization: `Bearer ${apiToken}`,
          ...formData.getHeaders(),
        },
        maxBodyLength: Infinity,
        maxContentLength: Infinity,
      });

      const mediaId = response.data?.id;
      if (!mediaId) {
        throw new Error('Meta API media upload succeeded but returned no media ID.');
      }
      return mediaId;
    } catch (error: any) {
      const metaError = error.response?.data?.error?.message || error.message;
      logger.error({ err: error, metaError }, 'WhatsApp Media Upload Error');
      throw new Error(`Failed to upload media to WhatsApp Cloud API: ${metaError}`);
    }
  }

  /**
   * Send a native media message (video or image) with caption to a recipient phone number via WhatsApp Cloud API.
   */
  public async sendMediaMessage(
    toPhone: string,
    mediaId: string,
    mediaType: 'video' | 'image',
    caption: string
  ): Promise<any> {
    if (!this.isConfigured()) {
      throw new Error('WhatsApp API credentials (WHATSAPP_API_TOKEN, WHATSAPP_PHONE_NUMBER_ID) are not configured in environment.');
    }

    const { apiToken, phoneNumberId, graphApiVersion } = this.config;
    const cleanPhone = toPhone.replace(/[^0-9]/g, '');
    if (!cleanPhone) {
      throw new Error('Invalid recipient phone number provided for WhatsApp dispatch.');
    }

    const url = `https://graph.facebook.com/${graphApiVersion}/${phoneNumberId}/messages`;

    const payload = {
      messaging_product: 'whatsapp',
      recipient_type: 'individual',
      to: cleanPhone,
      type: mediaType,
      [mediaType]: {
        id: mediaId,
        caption: caption,
      },
    };

    try {
      const response = await axios.post(url, payload, {
        headers: {
          Authorization: `Bearer ${apiToken}`,
          'Content-Type': 'application/json',
        },
      });

      return response.data;
    } catch (error: any) {
      const metaError = error.response?.data?.error?.message || error.message;
      logger.error({ err: error, metaError }, 'WhatsApp Send Media Message Error');
      throw new Error(`Failed to send ${mediaType} message via WhatsApp Cloud API: ${metaError}`);
    }
  }

  /**
   * High level workflow to locate trip media file, upload to WhatsApp Cloud API, and dispatch natively to group/phone.
   */
  public async shareTripMedia(
    tripId: string,
    options: { category: 'delay' | 'pod'; recipientPhone?: string }
  ): Promise<{ success: boolean; message: string; messageId?: string; recipientPhone: string }> {
    if (!this.isConfigured()) {
      throw new Error('WhatsApp API credentials (WHATSAPP_API_TOKEN, WHATSAPP_PHONE_NUMBER_ID) are not configured in backend environment.');
    }

    const trip = await prisma.trip.findFirst({
      where: { id: tripId, deletedAt: null },
      include: {
        customer: true,
        driver: true,
        vehicle: true,
        stops: true,
        documents: true,
      },
    });

    if (!trip) {
      throw new Error(`Trip with ID ${tripId} not found.`);
    }

    // Resolve target recipient phone number
    const targetPhone = options.recipientPhone ||
      trip.customer?.whatsapp_number ||
      trip.customer?.contact_phone ||
      trip.driver?.phone_primary ||
      '';

    if (!targetPhone) {
      throw new Error('No valid WhatsApp recipient phone number found for this customer or driver.');
    }

    // Locate documents attached to trip
    const relatedDocs = await prisma.document.findMany({
      where: {
        OR: [
          { entity_type: 'Trip', entity_id: trip.id },
          { entity_id: trip.id },
          { entity_id: trip.ref_id || undefined },
        ],
      },
    });

    const tripRef = trip.ref_id || `TRP-${trip.id.slice(0, 6).toUpperCase()}`;
    const customerName = trip.customer?.name || 'Customer';
    const driverName = trip.driver ? `${trip.driver.first_name || ''} ${trip.driver.last_name || ''}`.trim() : 'Driver Unassigned';

    if (options.category === 'delay') {
      // Find delay video
      const videoDoc = relatedDocs.find((d: any) => {
        const fileUrl = String(d.file_url || d.file_path || '').toLowerCase();
        const mime = String(d.mime_type || '').toLowerCase();
        const docType = String(d.doc_type || '').toLowerCase();
        return mime.startsWith('video/') || /\.(mp4|mov|webm|avi|mkv|3gp)$/i.test(fileUrl) || docType === 'delayevidence';
      });

      const videoFilePath = videoDoc?.file_url || (trip as any).delay_video_url || (trip as any).video_url;
      if (!videoFilePath) {
        throw new Error(`No delay video evidence file recorded for trip ${tripRef}.`);
      }

      const mimeType = videoDoc?.mime_type || 'video/mp4';
      const delayReason = (trip.notes && trip.notes.includes('[DELAY REPORT]'))
        ? trip.notes.replace(/^\[DELAY REPORT\]:\s*/i, '').trim()
        : 'Traffic congestion / Operational delay';

      const caption = `🚨 *MERCON DELAY REPORT*\nTrip: *${tripRef}*\nCustomer: *${customerName}*\nDriver: *${driverName}*\nReason: ${delayReason}`;

      // Upload & send
      const mediaId = await this.uploadMedia(videoFilePath, mimeType);
      const res = await this.sendMediaMessage(targetPhone, mediaId, 'video', caption);

      return {
        success: true,
        message: `Delay video natively dispatched to WhatsApp (${targetPhone})`,
        messageId: res?.messages?.[0]?.id,
        recipientPhone: targetPhone,
      };

    } else {
      // Find POD image
      const podDoc = relatedDocs.find((d: any) => {
        const fileUrl = String(d.file_url || d.file_path || '').toLowerCase();
        const mime = String(d.mime_type || '').toLowerCase();
        const docType = String(d.doc_type || d.category || '').toLowerCase();
        return docType.includes('pod') || docType.includes('proof') || mime.startsWith('image/') || /\.(jpg|jpeg|png|webp)$/i.test(fileUrl);
      });

      const photoFilePath = podDoc?.file_url || (trip as any).pod_photo_url;
      if (!photoFilePath) {
        throw new Error(`No POD photo file recorded for trip ${tripRef}.`);
      }

      const mimeType = podDoc?.mime_type || 'image/jpeg';
      const caption = `📸 *MERCON POD PROOF OF DELIVERY*\nTrip: *${tripRef}*\nCustomer: *${customerName}*\nDriver: *${driverName}*\nStatus: Verified Delivery Proof`;

      // Upload & send
      const mediaId = await this.uploadMedia(photoFilePath, mimeType);
      const res = await this.sendMediaMessage(targetPhone, mediaId, 'image', caption);

      return {
        success: true,
        message: `POD photo natively dispatched to WhatsApp (${targetPhone})`,
        messageId: res?.messages?.[0]?.id,
        recipientPhone: targetPhone,
      };
    }
  }
}

export const whatsappService = new WhatsAppService();
