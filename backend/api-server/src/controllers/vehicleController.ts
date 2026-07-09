import { Request, Response } from 'express';
import { prisma } from '../index';
import { AssetStatus, AssetType } from '@prisma/client';

export const getVehicles = async (req: Request, res: Response) => {
  try {
    const { status, search, page = '1', per_page = '20' } = req.query;
    
    const pageNumber = parseInt(page as string);
    const limit = parseInt(per_page as string);
    const skip = (pageNumber - 1) * limit;

    const whereClause: any = { deletedAt: null };
    if (status) {
      whereClause.status = status as AssetStatus;
    }
    if (search) {
      whereClause.plate_number = { contains: search as string, mode: 'insensitive' };
    }

    const [vehicles, total] = await Promise.all([
      prisma.vehicle.findMany({
        where: whereClause,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
      }),
      prisma.vehicle.count({ where: whereClause })
    ]);

    res.json({
      success: true,
      data: vehicles,
      meta: {
        page: pageNumber,
        per_page: limit,
        total,
        total_pages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, error: { code: 'SERVER_ERROR', message: 'Failed to fetch vehicles' } });
  }
};

export const getVehicleById = async (req: Request, res: Response) => {
  try {
    const vehicle = await prisma.vehicle.findUnique({
      where: { id: req.params.id as string, deletedAt: null }
    });

    if (!vehicle) {
      return res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Vehicle not found' } });
    }

    // Fetch documents manually because of polymorphic relation
    const documents = await prisma.document.findMany({
      where: { entity_type: 'Vehicle', entity_id: vehicle.id, deletedAt: null }
    });

    res.json({ success: true, data: { ...vehicle, documents } });
  } catch (error) {
    res.status(500).json({ success: false, error: { code: 'SERVER_ERROR', message: 'Failed to fetch vehicle' } });
  }
};

export const createVehicle = async (req: Request, res: Response) => {
  try {
    const {
      plate_number,
      asset_type,
      capacity_kg,
      trailer_number,
      trailer_type,
      trailer_capacity_kg,
      gps_device_id
    } = req.body;

    const vehicle = await prisma.vehicle.create({
      data: {
        ref_id: 'TRK-' + Math.floor(1000 + Math.random() * 9000).toString(),
        plate_number,
        asset_type: asset_type as AssetType,
        capacity_kg,
        trailer_number,
        trailer_type: trailer_type ? (trailer_type as AssetType) : null,
        trailer_capacity_kg,
        gps_device_id,
        created_by: (req as any).user?.id
      }
    });

    res.status(201).json({ success: true, data: vehicle });
  } catch (error: any) {
    if (error.code === 'P2002') {
      return res.status(400).json({ success: false, error: { code: 'DUPLICATE', message: 'Plate number already exists' } });
    }
    res.status(500).json({ success: false, error: { code: 'SERVER_ERROR', message: 'Failed to create vehicle' } });
  }
};

export const updateVehicle = async (req: Request, res: Response) => {
  try {
    const updated = await prisma.vehicle.update({
      where: { id: req.params.id as string },
      data: {
        ...req.body,
        asset_type: req.body.asset_type ? (req.body.asset_type as AssetType) : undefined,
        trailer_type: req.body.trailer_type ? (req.body.trailer_type as AssetType) : undefined,
        updated_by: (req as any).user?.id
      }
    });
    res.json({ success: true, data: updated });
  } catch (error) {
    res.status(500).json({ success: false, error: { code: 'SERVER_ERROR', message: 'Failed to update vehicle' } });
  }
};

export const deleteVehicle = async (req: Request, res: Response) => {
  try {
    await prisma.vehicle.update({
      where: { id: req.params.id as string },
      data: {
        deletedAt: new Date(),
        isActive: false,
        deleted_by: (req as any).user?.id
      }
    });
    res.json({ success: true, data: { message: 'Vehicle deleted successfully' } });
  } catch (error) {
    res.status(500).json({ success: false, error: { code: 'SERVER_ERROR', message: 'Failed to delete vehicle' } });
  }
};
