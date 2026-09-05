import { Request, Response } from 'express';
import { prisma } from '../db';
import {
  getRecommendedDriversForVehicle,
  getRecommendedVehiclesForDriver,
} from '../services/fleetDispatchService';
import { AssignmentType } from '@prisma/client';

/**
 * Endpoint: GET /api/trips/recommendations/drivers?vehicleId=uuid&plannedStart=iso
 * Returns ranked driver backup recommendations for a vehicle.
 */
export async function getDriverRecommendations(req: Request, res: Response) {
  try {
    const vehicleId = typeof req.query.vehicleId === 'string' ? req.query.vehicleId : undefined;
    const plannedStart = typeof req.query.plannedStart === 'string' ? req.query.plannedStart : undefined;

    if (!vehicleId) {
      return res.status(400).json({
        success: false,
        error: { code: 'BAD_REQUEST', message: 'vehicleId query parameter is required' },
      });
    }

    const recommendations = await getRecommendedDriversForVehicle(vehicleId, plannedStart);

    return res.json({
      success: true,
      data: recommendations,
    });
  } catch (err: any) {
    return res.status(500).json({
      success: false,
      error: { code: 'SERVER_ERROR', message: err.message || 'Failed to fetch driver recommendations' },
    });
  }
}

/**
 * Endpoint: GET /api/trips/recommendations/vehicles?driverId=uuid
 * Returns ranked vehicle backup recommendations for a driver.
 */
export async function getVehicleRecommendations(req: Request, res: Response) {
  try {
    const driverId = typeof req.query.driverId === 'string' ? req.query.driverId : undefined;

    if (!driverId) {
      return res.status(400).json({
        success: false,
        error: { code: 'BAD_REQUEST', message: 'driverId query parameter is required' },
      });
    }

    const recommendations = await getRecommendedVehiclesForDriver(driverId);

    return res.json({
      success: true,
      data: recommendations,
    });
  } catch (err: any) {
    return res.status(500).json({
      success: false,
      error: { code: 'SERVER_ERROR', message: err.message || 'Failed to fetch vehicle recommendations' },
    });
  }
}

/**
 * Endpoint: POST /api/drivers/:id/assignments
 * Upserts a driver's vehicle preference (Primary, Backup #1, Backup #2).
 */
export async function upsertDriverVehiclePreference(req: Request, res: Response) {
  try {
    const driverId = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
    const { vehicleId, assignmentType = 'PRIMARY', priority = 1, notes } = req.body;

    if (!vehicleId || typeof vehicleId !== 'string') {
      return res.status(400).json({
        success: false,
        error: { code: 'BAD_REQUEST', message: 'vehicleId is required' },
      });
    }

    const notesStr = typeof notes === 'string' ? notes : null;

    const preference = await prisma.driverVehicleAssignment.upsert({
      where: {
        driverId_vehicleId_assignmentType: {
          driverId,
          vehicleId,
          assignmentType: assignmentType as AssignmentType,
        },
      },
      update: {
        priority: Number(priority),
        isActive: true,
        notes: notesStr,
      },
      create: {
        driverId,
        vehicleId,
        assignmentType: assignmentType as AssignmentType,
        priority: Number(priority),
        notes: notesStr,
      },
    });

    return res.json({
      success: true,
      data: preference,
    });
  } catch (err: any) {
    return res.status(500).json({
      success: false,
      error: { code: 'SERVER_ERROR', message: err.message || 'Failed to update vehicle preference' },
    });
  }
}
