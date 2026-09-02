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
