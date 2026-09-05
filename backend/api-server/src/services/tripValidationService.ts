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

export interface StopScheduleInput {
  stop_sequence?: number;
  sequence?: number;
  stop_type?: string;
  planned_arrival?: Date | string | null;
  planned_departure?: Date | string | null;
  location_name?: string | null;
}

export interface ValidateTripScheduleResult {
  isValid: boolean;
  error?: string;
}

/**
 * Validates that trip schedule invariants and stop sequence chronology are preserved:
 * 1. planned_start < planned_end (strictly greater).
 * 2. Stops cannot have planned arrivals before trip planned_start or after planned_end.
 * 3. Each subsequent stop in the sequence cannot be scheduled before preceding stops.
 * 4. Stop planned_departure cannot be earlier than planned_arrival.
 */
export function validateTripSchedule(
  plannedStart?: Date | string | null,
  plannedEnd?: Date | string | null,
  stops?: StopScheduleInput[]
): ValidateTripScheduleResult {
  let startTime: number | null = null;
  let endTime: number | null = null;

  if (plannedStart !== undefined && plannedStart !== null && plannedStart !== '') {
    const sDate = plannedStart instanceof Date ? plannedStart : new Date(plannedStart);
    if (isNaN(sDate.getTime())) {
      return { isValid: false, error: 'Invalid planned start date/time.' };
    }
    startTime = sDate.getTime();
  }

  if (plannedEnd !== undefined && plannedEnd !== null && plannedEnd !== '') {
    const eDate = plannedEnd instanceof Date ? plannedEnd : new Date(plannedEnd);
    if (isNaN(eDate.getTime())) {
      return { isValid: false, error: 'Invalid planned drop-off/end date/time.' };
    }
    endTime = eDate.getTime();
  }

  // Core rule: planned_start < planned_end
  if (startTime !== null && endTime !== null) {
    if (endTime <= startTime) {
      return {
        isValid: false,
        error: 'Drop-off date and time must be strictly later than planned start time.',
      };
    }
  }

  // Stop chronology validation
  if (stops && Array.isArray(stops) && stops.length > 0) {
    const sortedStops = [...stops].sort(
      (a, b) => (a.sequence ?? a.stop_sequence ?? 0) - (b.sequence ?? b.stop_sequence ?? 0)
    );
    let prevStopTime: number | null = startTime;
    let prevSeq: number = 0;

    for (const stop of sortedStops) {
      const seq = stop.sequence ?? stop.stop_sequence ?? prevSeq + 1;
      let stopArrTime: number | null = null;

      if (stop.planned_arrival !== undefined && stop.planned_arrival !== null && stop.planned_arrival !== '') {
        const arrDate = stop.planned_arrival instanceof Date ? stop.planned_arrival : new Date(stop.planned_arrival);
        if (isNaN(arrDate.getTime())) {
          return { isValid: false, error: `Invalid planned arrival date/time for Stop #${seq}.` };
        }
        stopArrTime = arrDate.getTime();

        if (startTime !== null && stopArrTime < startTime) {
          return {
            isValid: false,
            error: `Stop #${seq} planned arrival cannot be before the trip planned start time.`,
          };
        }

        if (endTime !== null && stopArrTime > endTime) {
          return {
            isValid: false,
            error: `Stop #${seq} planned arrival cannot be after the trip planned end time.`,
          };
        }

        if (prevStopTime !== null && stopArrTime < prevStopTime) {
          return {
            isValid: false,
            error: `Stop #${seq} planned arrival cannot be earlier than previous stop (#${prevSeq}).`,
          };
        }

        prevStopTime = stopArrTime;
        prevSeq = seq;
      }

      if (stop.planned_departure !== undefined && stop.planned_departure !== null && stop.planned_departure !== '') {
        const depDate = stop.planned_departure instanceof Date ? stop.planned_departure : new Date(stop.planned_departure);
        if (isNaN(depDate.getTime())) {
          return { isValid: false, error: `Invalid planned departure date/time for Stop #${seq}.` };
        }
        const depTime = depDate.getTime();

        if (stopArrTime !== null && depTime < stopArrTime) {
          return {
            isValid: false,
            error: `Stop #${seq} planned departure cannot be earlier than its planned arrival.`,
          };
        }

        if (endTime !== null && depTime > endTime) {
          return {
            isValid: false,
            error: `Stop #${seq} planned departure cannot be after the trip planned end time.`,
          };
        }

        prevStopTime = depTime;
      }
    }
  }

  return { isValid: true };
}
