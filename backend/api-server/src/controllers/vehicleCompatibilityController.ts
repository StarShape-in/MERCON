import { Request, Response } from 'express';
import { prisma } from '../db';

const DEFAULT_COMPATIBILITY_RULES = [
  {
    serviceVehicleClassId: 'vc_3_4_ton',
    serviceVehicleClassCode: '3-4 TON',
    preferredVehicleClassCodes: ['3-4 TON'],
    allowedVehicleClassCodes: ['3-4 TON', '5 TON'],
  },
  {
    serviceVehicleClassId: 'vc_5_ton',
    serviceVehicleClassCode: '5 TON',
    preferredVehicleClassCodes: ['5 TON'],
    allowedVehicleClassCodes: ['5 TON', '3-4 TON', '8 TON', '10 TON'],
  },
  {
    serviceVehicleClassId: 'vc_8_ton',
    serviceVehicleClassCode: '8 TON',
    preferredVehicleClassCodes: ['8 TON'],
    allowedVehicleClassCodes: ['8 TON', '5 TON', '10 TON'],
  },
  {
    serviceVehicleClassId: 'vc_10_ton',
    serviceVehicleClassCode: '10 TON',
    preferredVehicleClassCodes: ['10 TON'],
    allowedVehicleClassCodes: ['10 TON', '8 TON', '5 TON', '20 TON'],
  },
  {
    serviceVehicleClassId: 'vc_20_ton',
    serviceVehicleClassCode: '20 TON',
    preferredVehicleClassCodes: ['20 TON'],
    allowedVehicleClassCodes: ['20 TON', '10 TON', '40 FEET'],
  },
  {
    serviceVehicleClassId: 'vc_40_feet',
    serviceVehicleClassCode: '40 FEET',
    preferredVehicleClassCodes: ['40 FEET'],
    allowedVehicleClassCodes: ['40 FEET', '20 TON'],
  },
];

export async function getAllCompatibilityRules(_req: Request, res: Response): Promise<void> {
  try {
    let rules = await (prisma as any).vehicleCompatibilityRule.findMany({
      orderBy: { serviceVehicleClassCode: 'asc' },
    });

    if (rules.length === 0) {
      // Seed defaults if empty
      await Promise.all(
        DEFAULT_COMPATIBILITY_RULES.map((rule) =>
          (prisma as any).vehicleCompatibilityRule.create({
            data: rule,
          })
        )
      );
      rules = await (prisma as any).vehicleCompatibilityRule.findMany({
        orderBy: { serviceVehicleClassCode: 'asc' },
      });
    }

    res.json({ success: true, data: rules });
  } catch (error: any) {
    res.status(500).json({ error: { message: error.message || 'Failed to fetch vehicle compatibility rules.' } });
  }
}

export async function upsertCompatibilityRule(req: Request, res: Response): Promise<void> {
  try {
    const { serviceVehicleClassId, serviceVehicleClassCode, preferredVehicleClassCodes, allowedVehicleClassCodes, isActive } = req.body;

    if (!serviceVehicleClassCode) {
      res.status(400).json({ error: { message: 'serviceVehicleClassCode is required.' } });
      return;
    }

    const preferred = Array.from(new Set(preferredVehicleClassCodes || [])) as string[];
    const allowed = Array.from(new Set([...(allowedVehicleClassCodes || []), ...preferred])) as string[];

    const upserted = await (prisma as any).vehicleCompatibilityRule.upsert({
      where: { serviceVehicleClassCode },
      update: {
        preferredVehicleClassCodes: preferred,
        allowedVehicleClassCodes: allowed,
        isActive: isActive !== false,
      },
      create: {
        serviceVehicleClassId: serviceVehicleClassId || `vc_${serviceVehicleClassCode.toLowerCase().replace(/[^a-z0-9]/g, '_')}`,
        serviceVehicleClassCode,
        preferredVehicleClassCodes: preferred,
        allowedVehicleClassCodes: allowed,
        isActive: isActive !== false,
      },
    });

    res.json({ success: true, data: upserted });
  } catch (error: any) {
    res.status(500).json({ error: { message: error.message || 'Failed to save compatibility rule.' } });
  }
}
