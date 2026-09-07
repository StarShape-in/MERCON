import { prisma } from '../db';
import { AssignmentType, AssignmentEntityType } from '@prisma/client';

export interface DriverRecommendation {
  driverId: string;
  driverName: string;
  phone?: string | null;
  assignmentType: AssignmentType;
  priority: number;
  isAvailable: boolean;
  unavailabilityReason?: string;
}

export interface TripDriverRecommendationItem {
  driverId: string;
  driverName: string;
  phone?: string | null;
  status: string;
  isAvailable: boolean;
  unavailabilityReason?: string;
  routeTripCount: number;
  capacityMatch: boolean;
  score: number;
  badges: string[];
  vehiclePlate?: string | null;
  vehicleClass?: string | null;
}

export interface VehicleRecommendation {
  vehicleId: string;
  plateNumber: string;
  assetType: string;
  capacityKg: number;
  assignmentType: AssignmentType;
  priority: number;
  isAvailable: boolean;
  unavailabilityReason?: string;
}

/**
 * Returns ranked driver recommendations for a trip based on vehicle payload match,
 * route experience (past trip count on same lane), and availability.
 */
export async function getRecommendedDriversForTrip(params: {
  vehicleId?: string | null;
  vehicleClass?: string | null;
  origin?: string | null;
  destination?: string | null;
  plannedStart?: Date | string | null;
}): Promise<TripDriverRecommendationItem[]> {
  const { vehicleId, vehicleClass, origin, destination } = params;

  const origStr = origin ? String(origin).trim().toLowerCase() : '';
  const destStr = destination ? String(destination).trim().toLowerCase() : '';
  const reqClassStr = vehicleClass ? String(vehicleClass).trim().toLowerCase() : '';

  const drivers = await prisma.driver.findMany({
    where: { deletedAt: null, isActive: true },
    include: {
      vehicleAssignments: {
        where: { isActive: true },
        include: { vehicle: true },
      },
      tripDrivers: {
        where: { removedAt: null },
        include: {
          trip: {
            include: {
              stops: { include: { location: true }, orderBy: { sequence: 'asc' } },
            },
          },
        },
      },
    },
  });

  const now = new Date();
  const recommendations: TripDriverRecommendationItem[] = [];

  for (const driver of drivers) {
    let isAvailable = true;
    let unavailabilityReason: string | undefined;

    if (driver.status === 'OffDuty' || driver.status === 'Inactive') {
      isAvailable = false;
      unavailabilityReason = `Status: ${driver.status}`;
    } else if (driver.license_expiry && new Date(driver.license_expiry) < now) {
      isAvailable = false;
      unavailabilityReason = 'License Expired';
    }

    const driverTripDrivers: any[] = (driver as any).tripDrivers || [];

    if (isAvailable) {
      const hasActiveConflict = driverTripDrivers.some((td: any) => {
        const tStatus = td.trip?.status;
        return tStatus && ['Scheduled', 'Loading', 'InTransit', 'Delayed'].includes(tStatus);
      });
      if (hasActiveConflict) {
        isAvailable = false;
        unavailabilityReason = 'Assigned to Active Trip';
      }
    }

    let routeTripCount = 0;
    if (origStr && destStr) {
      for (const td of driverTripDrivers) {
        const stops = td.trip?.stops || [];
        if (stops.length > 0) {
          const firstStop = stops[0];
          const lastStop = stops.length > 1 ? stops[stops.length - 1] : firstStop;

          const tOrig = (firstStop.source_label || firstStop.location?.name || '').toLowerCase();
          const tDest = (lastStop.source_label || lastStop.location?.name || '').toLowerCase();

          if (
            (tOrig.includes(origStr) || origStr.includes(tOrig)) &&
            (tDest.includes(destStr) || destStr.includes(tDest))
          ) {
            routeTripCount++;
          }
        }
      }
    }

    let capacityMatch = false;
    let assignedPlate: string | null = null;
    let assignedClass: string | null = null;

    const primaryAssign = driver.vehicleAssignments[0];
    if (primaryAssign?.vehicle) {
      assignedPlate = primaryAssign.vehicle.plate_number;
      assignedClass = primaryAssign.vehicle.asset_type;

      if (!reqClassStr) {
        capacityMatch = true;
      } else {
        const vAsset = (primaryAssign.vehicle.asset_type || '').toLowerCase();
        const vCap = Number(primaryAssign.vehicle.capacity_kg || 0);

        if (vAsset.includes(reqClassStr) || reqClassStr.includes(vAsset)) {
          capacityMatch = true;
        } else if (reqClassStr.includes('10 ton') && vCap >= 9000) {
          capacityMatch = true;
        } else if (reqClassStr.includes('20 ton') && vCap >= 18000) {
          capacityMatch = true;
        } else if (reqClassStr.includes('40 feet') && vCap >= 20000) {
          capacityMatch = true;
        } else if (reqClassStr.includes('3-4 ton') || reqClassStr.includes('5 ton')) {
          capacityMatch = true;
        }
      }
    } else if (!reqClassStr) {
      capacityMatch = true;
    }

    let score = 0;
    if (isAvailable) score += 200;
    if (capacityMatch) score += 50;
    score += routeTripCount * 100;

    const badges: string[] = [];
    if (routeTripCount > 0) {
      badges.push(`⭐ Lane Experienced (${routeTripCount} trips)`);
    }
    if (capacityMatch) {
      badges.push(`✓ Capacity Match`);
    }
    if (isAvailable) {
      badges.push(`🟢 Available`);
    } else if (unavailabilityReason) {
      badges.push(`🔴 ${unavailabilityReason}`);
    }

    recommendations.push({
      driverId: driver.id,
      driverName: `${driver.first_name} ${driver.last_name}`,
      phone: driver.phone_primary,
      status: driver.status,
      isAvailable,
      unavailabilityReason,
      routeTripCount,
      capacityMatch,
      score,
      badges,
      vehiclePlate: assignedPlate,
      vehicleClass: assignedClass,
    });
  }

  recommendations.sort((a, b) => b.score - a.score);
  return recommendations;
}

/**
 * Returns ranked driver recommendations for a given vehicle:
 * Checks DriverVehicleAssignment preferences, driver license expiry, and active trip schedules.
 */
export async function getRecommendedDriversForVehicle(
  vehicleId: string,
  plannedStart?: Date | string | null
): Promise<DriverRecommendation[]> {
  const assignments = await prisma.driverVehicleAssignment.findMany({
    where: {
      vehicleId,
      isActive: true,
      driver: { deletedAt: null, isActive: true },
    },
    include: {
      driver: true,
    },
    orderBy: [
      { assignmentType: 'asc' }, // PRIMARY before BACKUP
      { priority: 'asc' },
    ],
  });

  const recommendations: DriverRecommendation[] = [];
  const now = new Date();

  for (const assign of assignments) {
    const driver = assign.driver;
    let isAvailable = true;
    let unavailabilityReason: string | undefined;

    // Check status
    if (driver.status === 'OffDuty' || driver.status === 'Inactive') {
      isAvailable = false;
      unavailabilityReason = `Driver status is ${driver.status}`;
    } else if (driver.license_expiry && new Date(driver.license_expiry) < now) {
      isAvailable = false;
      unavailabilityReason = 'Driver license expired';
    } else {
      // Check if driver is currently on an active trip
      const activeTrip = await prisma.tripDriver.findFirst({
        where: {
          driverId: driver.id,
          removedAt: null,
          trip: {
            deletedAt: null,
            status: { in: ['Scheduled', 'Loading', 'InTransit', 'Delayed'] },
          },
        },
        include: {
          trip: { select: { ref_id: true, id: true } },
        },
      });

      if (activeTrip && activeTrip.trip) {
        isAvailable = false;
        const ref = activeTrip.trip.ref_id || activeTrip.trip.id.substring(0, 8);
        unavailabilityReason = `Assigned to active Trip #${ref}`;
      }
    }

    recommendations.push({
      driverId: driver.id,
      driverName: `${driver.first_name} ${driver.last_name}`,
      phone: driver.phone_primary,
      assignmentType: assign.assignmentType,
      priority: assign.priority,
      isAvailable,
      unavailabilityReason,
    });
  }

  return recommendations;
}

/**
 * Returns ranked vehicle recommendations for a given driver:
 * Checks DriverVehicleAssignment preferences and active maintenance records.
 */
export async function getRecommendedVehiclesForDriver(
  driverId: string
): Promise<VehicleRecommendation[]> {
  const assignments = await prisma.driverVehicleAssignment.findMany({
    where: {
      driverId,
      isActive: true,
      vehicle: { deletedAt: null, isActive: true },
    },
    include: {
      vehicle: true,
    },
    orderBy: [
      { assignmentType: 'asc' },
      { priority: 'asc' },
    ],
  });

  const recommendations: VehicleRecommendation[] = [];

  for (const assign of assignments) {
    const vehicle = assign.vehicle;
    let isAvailable = true;
    let unavailabilityReason: string | undefined;

    if (vehicle.status === 'Maintenance') {
      isAvailable = false;
      unavailabilityReason = 'Vehicle currently under maintenance';
    } else if (vehicle.status === 'Inactive') {
      isAvailable = false;
      unavailabilityReason = 'Vehicle status is Inactive';
    } else {
      // Check active maintenance record
      const activeMaintenance = await prisma.maintenanceRecord.findFirst({
        where: {
          vehicleId: vehicle.id,
          status: { in: ['In Progress', 'Scheduled', 'Pending'] },
          deletedAt: null,
        },
      });

      if (activeMaintenance) {
        isAvailable = false;
        unavailabilityReason = `In Maintenance at ${activeMaintenance.workshop_name}`;
      }
    }

    recommendations.push({
      vehicleId: vehicle.id,
      plateNumber: vehicle.plate_number,
      assetType: vehicle.asset_type,
      capacityKg: vehicle.capacity_kg,
      assignmentType: assign.assignmentType,
      priority: assign.priority,
      isAvailable,
      unavailabilityReason,
    });
  }

  return recommendations;
}

/**
 * Logs an asset/driver replacement audit event in TripAssignmentEvent.
 */
export async function recordAssignmentEvent(
  tripId: string,
  entityType: AssignmentEntityType,
  fromId: string | null,
  toId: string | null,
  reason: string,
  changedBy?: string | null
) {
  return prisma.tripAssignmentEvent.create({
    data: {
      tripId,
      entityType,
      fromId,
      toId,
      reason,
      changedBy,
    },
  });
}
