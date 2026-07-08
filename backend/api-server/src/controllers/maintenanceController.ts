import { Request, Response } from 'express';
import { prisma } from '../index';

export const getMaintenanceRecords = async (req: Request, res: Response) => {
  try {
    const { vehicle_id, page = '1', per_page = '20' } = req.query;
    
    const pageNumber = parseInt(page as string);
    const limit = parseInt(per_page as string);
    const skip = (pageNumber - 1) * limit;

    const whereClause: any = { deletedAt: null };
    if (vehicle_id) whereClause.vehicleId = vehicle_id as string;

    const [records, total] = await Promise.all([
      prisma.maintenanceRecord.findMany({
        where: whereClause,
        skip,
        take: limit,
        orderBy: { service_date: 'desc' },
        include: { vehicle: true }
      }),
      prisma.maintenanceRecord.count({ where: whereClause })
    ]);

    res.json({
      success: true,
      data: records,
      meta: {
        page: pageNumber,
        per_page: limit,
        total,
        total_pages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, error: { code: 'SERVER_ERROR', message: 'Failed to fetch maintenance records' } });
  }
};

export const createMaintenanceRecord = async (req: Request, res: Response) => {
  try {
    const { vehicle_id, workshop_name, workshop_contact, maintenance_type, service_date, odometer_reading, cost, invoice_number, next_service_due, remarks } = req.body;

    if (!vehicle_id || !workshop_name || !maintenance_type || !service_date || !odometer_reading) {
      return res.status(400).json({ success: false, error: { code: 'VALIDATION_ERROR', message: 'Missing required maintenance fields' } });
    }

    const record = await prisma.maintenanceRecord.create({
      data: {
        vehicleId: vehicle_id,
        workshop_name,
        workshop_contact,
        maintenance_type,
        service_date: new Date(service_date),
        odometer_reading: parseFloat(odometer_reading),
        cost: parseFloat(cost || 0),
        invoice_number,
        next_service_due: next_service_due ? new Date(next_service_due) : null,
        remarks,
        created_by: (req as any).user?.id
      }
    });

    res.status(201).json({ success: true, data: record });
  } catch (error) {
    res.status(500).json({ success: false, error: { code: 'SERVER_ERROR', message: 'Failed to create maintenance record' } });
  }
};
