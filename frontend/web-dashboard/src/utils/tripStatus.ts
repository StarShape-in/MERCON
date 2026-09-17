/**
 * Authoritative Trip Status & Workflow State Normalization for MERCON Web Dashboard.
 *
 * Source of Truth: Prisma TripStatus enum:
 * - Draft
 * - Scheduled
 * - Loading
 * - InTransit
 * - Delayed
 * - Completed
 * - Invoiced
 * - Cancelled
 *
 * Finer-grained driver workflow states (stored in trip.driver_workflow_state):
 * - ASSIGNED
 * - GOING_TO_PICKUP
 * - ARRIVED_AT_PICKUP
 * - LOADING
 * - LOADING_COMPLETED
 * - GOING_TO_STOP / ARRIVED_AT_STOP / STOP_VERIFICATION
 * - IN_TRANSIT
 * - ARRIVED_AT_DELIVERY / DELIVERY_VERIFICATION / DELIVERY_COMPLETED
 * - RETURN_LOADING / IN_TRANSIT_RETURN / ARRIVED_AT_FINAL_DELIVERY
 * - REVIEW_COMPLETE / COMPLETED
 */

export type OfficialTripStatus =
  | 'Draft'
  | 'Scheduled'
  | 'Loading'
  | 'InTransit'
  | 'Delayed'
  | 'Completed'
  | 'Invoiced'
  | 'Cancelled';

export interface TripStatusDisplay {
  label: string;
  workflowLabel?: string;
  status: OfficialTripStatus | string;
  tone: 'info' | 'warning' | 'success' | 'danger' | 'purple' | 'neutral';
  progress: number;
  badgeClass: string;
  isDelayed: boolean;
  isStaleScheduled?: boolean;
  etaText: string;
}

/**
 * Checks if a date string is from a calendar day prior to today (local or UTC).
 */
export function isDateInPastDay(dateStr?: string | null): boolean {
  if (!dateStr || isNaN(Date.parse(dateStr))) return false;
  const d = new Date(dateStr);
  const now = new Date();
  const scheduledMidnight = new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
  const currentMidnight = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
  return scheduledMidnight < currentMidnight;
}

/**
 * Normalizes any status string to the canonical Prisma TripStatus value.
 * Preserves unrecognized statuses verbatim so they are visibly identifiable
 * rather than silently defaulting to InTransit.
 */
export function normalizeTripStatus(rawStatus?: string | null): OfficialTripStatus | string {
  if (!rawStatus || typeof rawStatus !== 'string') return 'Scheduled';
  const clean = rawStatus.trim().toLowerCase().replace(/[\s_-]+/g, '');

  switch (clean) {
    case 'draft':
    case 'scheduled':
    case 'dispatched': // Legacy presentation fallback
      return 'Scheduled';
    case 'loading':
    case 'atpickup': // Legacy presentation fallback
      return 'Loading';
    case 'intransit':
    case 'atdelivery': // Legacy presentation fallback
      return 'InTransit';
    case 'delayed':
      return 'Delayed';
    case 'completed':
    case 'delivered':
      return 'Completed';
    case 'invoiced':
    case 'paid':
      return 'Invoiced';
    case 'cancelled':
      return 'Cancelled';
    default:
      // Return unmolested raw string if unknown
      return rawStatus.trim();
  }
}

/**
 * Returns human-readable label and styling for a trip given its status and workflow state.
 * Guaranteed to NEVER silently fall through to 'In Transit'.
 */
export function getTripDisplayStatus(
  rawStatus?: string | null,
  workflowState?: string | null,
  plannedEnd?: string | null,
  plannedStart?: string | null,
): TripStatusDisplay {
  const norm = normalizeTripStatus(rawStatus);
  const ws = (workflowState || '').trim().toUpperCase();

  // Schedule overrun flag: true if DB status is Delayed OR (active trip and planned_end exceeded)
  const isOverrun =
    norm === 'Delayed' ||
    (['Scheduled', 'Loading', 'InTransit'].includes(norm) &&
      plannedEnd != null &&
      !isNaN(Date.parse(plannedEnd)) &&
      new Date(plannedEnd).getTime() < Date.now());

  if (norm === 'Delayed' || isOverrun) {
    let workflowLabel: string | undefined;
    if (ws === 'GOING_TO_PICKUP') workflowLabel = 'Late to Pickup';
    else if (ws.includes('LOADING')) workflowLabel = 'Loading Delayed';
    else if (ws.includes('STOP')) workflowLabel = 'Stop Delayed';
    else if (ws.includes('DELIVERY')) workflowLabel = 'Delivery Delayed';

    return {
      label: 'Delayed',
      workflowLabel,
      status: 'Delayed',
      tone: 'danger',
      progress: 85,
      badgeClass: 'bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-950/40 dark:text-rose-300 dark:border-rose-800',
      isDelayed: true,
      etaText: 'Delayed',
    };
  }

  switch (norm) {
    case 'Draft':
      return {
        label: 'Draft',
        status: 'Draft',
        tone: 'info',
        progress: 0,
        badgeClass: 'bg-slate-100 text-slate-700 border-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700',
        isDelayed: false,
        etaText: 'Draft',
      };

    case 'Scheduled': {
      const isEnRoute = ws === 'GOING_TO_PICKUP';
      const isStale = isDateInPastDay(plannedStart);

      if (isStale) {
        return {
          label: 'Scheduled',
          workflowLabel: 'Overdue Scheduled',
          status: 'Scheduled',
          tone: 'warning',
          progress: 10,
          badgeClass: 'bg-amber-50 text-amber-800 border-amber-300 dark:bg-amber-950/40 dark:text-amber-200 dark:border-amber-700',
          isDelayed: false,
          isStaleScheduled: true,
          etaText: 'Overdue (Past Date)',
        };
      }

      return {
        label: 'Scheduled',
        workflowLabel: isEnRoute ? 'Going to Pickup' : undefined,
        status: 'Scheduled',
        tone: 'info',
        progress: isEnRoute ? 20 : 10,
        badgeClass: isEnRoute
          ? 'bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950/40 dark:text-blue-300 dark:border-blue-800'
          : 'bg-indigo-50 text-indigo-700 border-indigo-200 dark:bg-indigo-950/40 dark:text-indigo-300 dark:border-indigo-800',
        isDelayed: false,
        etaText: isEnRoute ? 'En Route to Pickup' : 'Scheduled',
      };
    }

    case 'Loading': {
      const isPhotoPhase = ws === 'LOADING' || ws === 'RETURN_LOADING';
      return {
        label: 'Loading',
        workflowLabel: isPhotoPhase ? 'Cargo Verification' : 'At Pickup Dock',
        status: 'Loading',
        tone: 'warning',
        progress: isPhotoPhase ? 40 : 30,
        badgeClass: 'bg-sky-50 text-sky-700 border-sky-200 dark:bg-sky-950/40 dark:text-sky-300 dark:border-sky-800',
        isDelayed: false,
        etaText: 'Loading Cargo',
      };
    }

    case 'InTransit': {
      let workflowLabel: string | undefined;
      let progress = 70;
      if (ws.includes('STOP')) {
        workflowLabel = 'At Intermediate Stop';
        progress = 55;
      } else if (ws === 'ARRIVED_AT_DELIVERY' || ws === 'DELIVERY_VERIFICATION') {
        workflowLabel = 'At Delivery Dock';
        progress = 90;
      } else if (ws === 'IN_TRANSIT_RETURN') {
        workflowLabel = 'Return Leg';
        progress = 80;
      }

      return {
        label: 'In Transit',
        workflowLabel,
        status: 'InTransit',
        tone: 'warning',
        progress,
        badgeClass: 'bg-amber-50 text-amber-800 border-amber-200 dark:bg-amber-950/40 dark:text-amber-300 dark:border-amber-800',
        isDelayed: false,
        etaText: workflowLabel || 'In Transit',
      };
    }

    case 'Completed':
      return {
        label: 'Completed',
        status: 'Completed',
        tone: 'success',
        progress: 100,
        badgeClass: 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-800',
        isDelayed: false,
        etaText: 'Completed',
      };

    case 'Invoiced':
      return {
        label: 'Invoiced',
        status: 'Invoiced',
        tone: 'success',
        progress: 100,
        badgeClass: 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-800',
        isDelayed: false,
        etaText: 'Invoiced',
      };

    case 'Cancelled':
      return {
        label: 'Cancelled',
        status: 'Cancelled',
        tone: 'purple',
        progress: 0,
        badgeClass: 'bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-950/40 dark:text-rose-300 dark:border-rose-800',
        isDelayed: false,
        etaText: 'Cancelled',
      };

    default:
      // Visible fallback for any unrecognized state — never silently coerce to In Transit!
      return {
        label: String(rawStatus || 'Unknown'),
        status: String(rawStatus || 'Unknown'),
        tone: 'neutral',
        progress: 0,
        badgeClass: 'bg-slate-100 text-slate-700 border-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700',
        isDelayed: false,
        etaText: String(rawStatus || 'Unknown'),
      };
  }
}
