import { Request, Response } from 'express';
import { prisma } from '../index';
import { DriverStatus } from '@prisma/client';

export const getDrivers = async (req: Request, res: Response) => {
  try {
    const { status, search, page = '1', per_page = '20' } = req.query;
    
    const pageNumber = parseInt(page as string);
    const limit = parseInt(per_page as string);
    const skip = (pageNumber - 1) * limit;

    const whereClause: any = { deletedAt: null };
    if (status) {
      whereClause.status = status as DriverStatus;
    }
    if (search) {
      whereClause.first_name = { contains: search as string, mode: 'insensitive' };
    }

    const [drivers, total] = await Promise.all([
      prisma.driver.findMany({
        where: whereClause,
        skip,
        take: limit,
        orderBy: { first_name: 'asc' },
      }),
      prisma.driver.count({ where: whereClause })
    ]);

    res.json({
      success: true,
      data: drivers,
      meta: {
        page: pageNumber,
        per_page: limit,
        total,
        total_pages: Math.ceil(total / limit),
        has_next: (skip + limit) < total,
        has_prev: pageNumber > 1
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, error: { code: 'SERVER_ERROR', message: 'Failed to fetch drivers' } });
  }
};

export const getDriverById = async (req: Request, res: Response) => {
  try {
    const driver = await prisma.driver.findUnique({
      where: { id: req.params.id as string, deletedAt: null },
      include: { trips: { take: 5, orderBy: { createdAt: 'desc' } } }
    });

    if (!driver) {
      return res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Driver not found' } });
    }

    const documents = await prisma.document.findMany({
      where: { entity_type: 'Driver', entity_id: driver.id, deletedAt: null }
    });

    res.json({ success: true, data: { ...driver, documents } });
  } catch (error) {
    res.status(500).json({ success: false, error: { code: 'SERVER_ERROR', message: 'Failed to fetch driver' } });
  }
};

export const createDriver = async (req: Request, res: Response) => {
  try {
    const { first_name, last_name, phone_primary, license_number, license_expiry } = req.body;

    if (!first_name || !last_name || !phone_primary || !license_number || !license_expiry) {
      return res.status(400).json({ success: false, error: { code: 'VALIDATION_ERROR', message: 'Missing required fields' } });
    }

    const ref_id = 'DRV-' + Math.floor(1000 + Math.random() * 9000).toString();

    const newDriver = await prisma.driver.create({
      data: {
        ref_id,
        first_name,
        last_name,
        phone_primary,
        license_number,
        license_expiry: new Date(license_expiry),
        created_by: (req as any).user?.id
      }
    });

    res.status(201).json({ success: true, data: newDriver });
  } catch (error: any) {
    if (error.code === 'P2002') {
      return res.status(400).json({ success: false, error: { code: 'DUPLICATE_ENTRY', message: 'Phone number already exists' } });
    }
    res.status(500).json({ success: false, error: { code: 'SERVER_ERROR', message: 'Failed to create driver' } });
  }
};

export const updateDriver = async (req: Request, res: Response) => {
  try {
    const updatedDriver = await prisma.driver.update({
      where: { id: req.params.id as string },
      data: {
        ...req.body,
        updated_by: (req as any).user?.id
      }
    });

    res.json({ success: true, data: updatedDriver });
  } catch (error) {
    res.status(500).json({ success: false, error: { code: 'SERVER_ERROR', message: 'Failed to update driver' } });
  }
};
