import { prisma } from '../db';
import { DriverTripRole } from '@prisma/client';

export interface TripDriverInput {
  driverId: string;
  role: DriverTripRole;
  driver_charge?: number | null;
  extra_driver_payment?: number | null;
  payment_reason?: string | null;
}

export interface ValidateTripDriversResult {
  isValid: boolean;
  errors: string[];
  primaryDriverId?: string;
}

/**
 * Validates driver assignment rules for a trip:
 * 1. Exactly one active PRIMARY driver.
 * 2. All drivers must be active and have unexpired licenses.
 * 3. No driver should be assigned twice to the same trip.
 * 4. No driver should have an overlapping active trip.
 */
export async function validateTripDrivers(
  drivers: TripDriverInput[],
  plannedStart?: Date | string | null,
  plannedEnd?: Date | string | null,
  currentTripId?: string
): Promise<ValidateTripDriversResult> {
  const errors: string[] = [];

  if (!drivers || drivers.length === 0) {
    return {
      isValid: false,
      errors: ['At least one driver must be assigned to the trip.'],
    };
  }

  // 1. Check for duplicate drivers in the payload
  const driverIds = drivers.map((d) => d.driverId);
  const uniqueDriverIds = new Set(driverIds);
  if (driverIds.length !== uniqueDriverIds.size) {
    errors.push('The same driver cannot be assigned multiple times to the same trip.');
  }

  // 2. Enforce exactly one active PRIMARY driver
  const primaryDrivers = drivers.filter((d) => d.role === DriverTripRole.PRIMARY);
  if (primaryDrivers.length === 0) {
    errors.push('A trip must have exactly one PRIMARY driver assigned.');
  } else if (primaryDrivers.length > 1) {
    errors.push('A trip cannot have more than one PRIMARY driver.');
  }

  const primaryDriverId = primaryDrivers.length === 1 ? primaryDrivers[0].driverId : undefined;

  // 3. Verify driver status & license validity in DB
  const existingDrivers = await prisma.driver.findMany({
    where: {
      id: { in: Array.from(uniqueDriverIds) },
      deletedAt: null,
    },
  });

  const now = new Date();
  for (const driverInput of drivers) {
    const foundDriver = existingDrivers.find((d: any) => d.id === driverInput.driverId);
    if (!foundDriver || !foundDriver.isActive) {
      errors.push(`Driver ID ${driverInput.driverId} is invalid or inactive.`);
      continue;
    }

    const fullName = `${foundDriver.first_name} ${foundDriver.last_name}`;

    // Check license expiry
    if (foundDriver.license_expiry && new Date(foundDriver.license_expiry) < now) {
      errors.push(`Driver ${fullName}'s license expired on ${new Date(foundDriver.license_expiry).toISOString().split('T')[0]}.`);
    }

    // Check schedule overlap if plannedStart is provided
    if (plannedStart) {
      const start = new Date(plannedStart);
      const end = plannedEnd ? new Date(plannedEnd) : new Date(start.getTime() + 8 * 3600 * 1000);

      const overlappingTripDriver = await prisma.tripDriver.findFirst({
        where: {
          driverId: driverInput.driverId,
          removedAt: null,
          tripId: currentTripId ? { not: currentTripId } : undefined,
          trip: {
            deletedAt: null,
            status: { in: ['Scheduled', 'Loading', 'InTransit', 'Delayed'] },
            OR: [
              {
                planned_start: { lte: end },
                planned_end: { gte: start },
              },
              {
                actual_start: { lte: end },
                actual_end: null, // Currently in transit
              },
            ],
          },
        },
        include: {
          trip: {
            select: { ref_id: true, id: true },
          },
        },
      });

      if (overlappingTripDriver && overlappingTripDriver.trip) {
        const tripRef = overlappingTripDriver.trip.ref_id || overlappingTripDriver.trip.id.substring(0, 8);
        errors.push(`Driver ${fullName} is already assigned to active Trip #${tripRef} during this timeframe.`);
      }
    }
  }

  return {
    isValid: errors.length === 0,
    errors,
    primaryDriverId,
  };
}
