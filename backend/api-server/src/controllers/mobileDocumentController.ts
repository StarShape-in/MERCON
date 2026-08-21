import { Request, Response } from 'express';
import { prisma } from '../index';

/** The logged-in driver's own documents & uploaded cargo/POD photos, newest first. */
export const getDriverDocuments = async (req: Request, res: Response) => {
  const driverId = (req as any).user?.driver_id;
  if (!driverId) return res.status(403).json({ success: false, error: { message: 'Driver not authenticated' } });

  try {
    const driverTrips = await prisma.trip.findMany({
      where: { driverId, deletedAt: null },
      select: { id: true, ref_id: true },
    });
    const tripIds = driverTrips.map((t) => t.id);
    const tripRefMap = new Map(driverTrips.map((t) => [t.id, t.ref_id]));

    const documents = await prisma.document.findMany({
      where: {
        OR: [
          { entity_type: 'Driver', entity_id: driverId, deletedAt: null },
          { entity_type: 'Trip', entity_id: { in: tripIds }, deletedAt: null },
        ],
      },
      orderBy: [{ createdAt: 'desc' }],
      select: {
        id: true,
        doc_type: true,
        status: true,
        file_url: true,
        mime_type: true,
        issue_date: true,
        expiry_date: true,
        entity_type: true,
        entity_id: true,
        createdAt: true,
      },
    });

    const formatted = documents.map((d) => ({
      ...d,
      trip_ref_id: d.entity_type === 'Trip' ? tripRefMap.get(d.entity_id) || null : null,
    }));

    res.json({ success: true, data: formatted });
  } catch (error) {
    res.status(500).json({ success: false, error: { message: 'Internal server error' } });
  }
};
