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

import { z } from 'zod';

const maintenanceSchema = z.object({
  vehicle_id: z.string().uuid(),
  workshop_name: z.string().min(1, "Workshop name is required"),
  workshop_contact: z.string().optional(),
  maintenance_type: z.enum(['Routine', 'Repair', 'Inspection', 'Emergency']),
  service_date: z.string().datetime().or(z.date()),
  odometer_reading: z.union([z.string(), z.number()]).transform(v => parseFloat(v as string)),
  cost: z.union([z.string(), z.number()]).optional().transform(v => v ? parseFloat(v as string) : 0),
  invoice_number: z.string().optional(),
  next_service_due: z.string().datetime().or(z.date()).optional().nullable(),
  remarks: z.string().optional()
});

export const createMaintenanceRecord = async (req: Request, res: Response) => {
  try {
    const parseResult = maintenanceSchema.safeParse(req.body);
    if (!parseResult.success) {
      return res.status(400).json({ success: false, error: { code: 'VALIDATION_ERROR', message: parseResult.error.errors[0].message, details: parseResult.error.format() } });
    }
    
    const { vehicle_id, workshop_name, workshop_contact, maintenance_type, service_date, odometer_reading, cost, invoice_number, next_service_due, remarks } = parseResult.data;

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
