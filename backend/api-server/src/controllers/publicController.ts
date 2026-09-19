import { Request, Response } from 'express';
import { prisma } from '../db';
import { logger } from '../utils/logger';

export const getPublicTripEvidence = async (req: Request, res: Response) => {
  try {
    const ref = (req.query.ref as string) || (req.query.token as string);
    if (!ref) {
      return res.status(400).json({ success: false, error: { message: 'Missing trip reference parameter (ref)' } });
    }

    const cleanRef = String(ref).trim();

    // Query trip by ref_id or ID
    const trip = await prisma.trip.findFirst({
      where: {
        OR: [
          { ref_id: cleanRef },
          { id: cleanRef }
        ],
        deletedAt: null
      },
      include: {
        customer: { select: { name: true } },
        driver: { select: { first_name: true, last_name: true, phone_primary: true } },
        vehicle: { select: { plate_number: true, asset_type: true } },
        stops: {
          orderBy: { stop_sequence: 'asc' },
          include: { location: { select: { name: true, address: true } } }
        }
      }
    });

    if (!trip) {
      return res.status(404).json({ success: false, error: { message: 'Trip evidence gallery not found or link expired.' } });
    }

    // Query real documents attached to this trip
    const documents = await prisma.document.findMany({
      where: {
        entity_type: 'Trip',
        entity_id: trip.id,
        deletedAt: null
      },
      select: {
        id: true,
        doc_type: true,
        file_url: true,
        mime_type: true,
        ai_extracted_json: true,
        createdAt: true
      },
      orderBy: { createdAt: 'asc' }
    });

    const driverName = trip.is_third_party
      ? ((trip as any).third_party_driver_name || '3PL Driver')
      : (trip.driver ? `${trip.driver.first_name} ${trip.driver.last_name || ''}`.trim() : 'Driver');

    const vehiclePlate = trip.is_third_party
      ? ((trip as any).third_party_vehicle_plate || '3PL Vehicle')
      : (trip.vehicle?.plate_number || 'Unassigned');

    const pickupStop = trip.stops.find(s => s.stop_type === 'Pickup') || trip.stops[0];
    const dropoffStop = trip.stops.find(s => s.stop_type === 'Dropoff') || trip.stops[trip.stops.length - 1];

    const formattedDocs = documents.map(doc => {
      const u = (doc.file_url || '').toLowerCase();
      const m = (doc.mime_type || '').toLowerCase();
      const isVideo = m.startsWith('video/') || /\.(mp4|mov|webm|avi|mkv|3gp)(\?.*)?$/i.test(u);
      
      const aiJson: any = doc.ai_extracted_json || {};
      const isDelay = doc.doc_type === 'Emergency' || (aiJson.operation || '').toLowerCase() === 'delay';

      let category = 'Trip Evidence';
      if (doc.doc_type === 'POD') category = 'POD Document';
      else if (doc.doc_type === 'Emergency') category = 'Emergency Incident';
      else if (isDelay) category = 'Delay Evidence';
      else if (doc.doc_type === 'Waybill') category = 'Waybill Document';

      return {
        id: doc.id,
        title: aiJson.notes || `${category} - ${new Date(doc.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`,
        url: doc.file_url,
        mime_type: doc.mime_type,
        isVideo,
        isDelay,
        category,
        time: new Date(doc.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        date: new Date(doc.createdAt).toLocaleDateString(),
        lat: aiJson.lat || pickupStop?.location_lat,
        lng: aiJson.lng || pickupStop?.location_lng,
        location: aiJson.locationName || pickupStop?.location_name || pickupStop?.location?.name || 'En Route Location'
      };
    });

    res.json({
      success: true,
      data: {
        tripRef: trip.ref_id || 'TRIP',
        customerName: trip.customer?.name || 'Logistics Client',
        driverName,
        vehiclePlate,
        status: trip.status,
        pickupLocation: pickupStop?.location_name || pickupStop?.location?.name || 'Origin',
        dropoffLocation: dropoffStop?.location_name || dropoffStop?.location?.name || 'Destination',
        documents: formattedDocs
      }
    });
  } catch (error: any) {
    logger.error({ err: error }, 'getPublicTripEvidence error:');
    res.status(500).json({ success: false, error: { message: 'Internal server error' } });
  }
};
