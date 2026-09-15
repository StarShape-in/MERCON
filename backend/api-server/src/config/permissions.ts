/**
 * MERCON Granular Permission Taxonomy & Role Preset Bundles
 * 
 * Each Role mapped to explicit granular permission keys.
 * SuperAdmin has wildcard ('*') access.
 */

export const ROLE_PERMISSIONS: Record<string, string[]> = {
  SuperAdmin: ['*'],
  Admin: [
    // Trips / Ops
    'trips.view.all',
    'trips.create',
    'trips.dispatch',
    'trips.workflow.start',
    'trips.workflow.arrive',
    'trips.workflow.complete',
    'trips.workflow.pod_upload',
    'trips.rates.edit',
    'trips.delete',

    // Quotations
    'quotations.view',
    'quotations.edit',
    'quotations.delete',

    // Customers
    'customers.view',
    'customers.manage',

    // Fleet
    'fleet.view',
    'fleet.manage',
    'fleet.financials',

    // Drivers & Security
    'drivers.view',
    'drivers.manage',
    'drivers.security.reset',

    // Users
    'users.view',
    'users.manage',

    // Master Data & Reports
    'settings.view',
    'reports.view',
    'audit.view',
  ],
  Operator: [
    // Trips / Ops
    'trips.view.all',
    'trips.create',
    'trips.dispatch',
    'trips.workflow.start',
    'trips.workflow.arrive',
    'trips.workflow.complete',
    'trips.workflow.pod_upload',
    'trips.rates.edit',
    'trips.delete',

    // Quotations
    'quotations.view',
    'quotations.edit',
    'quotations.delete',

    // Customers
    'customers.view',
    'customers.manage',

    // Fleet
    'fleet.view',
    'fleet.manage',
    'fleet.financials',

    // Drivers & Security
    'drivers.view',
    'drivers.manage',
    'drivers.security.reset',

    // Users
    'users.view',
    'users.manage',

    // Master Data & Reports
    'settings.view',
    'reports.view',
    'audit.view',
  ],
  Driver: [
    // Driver Assigned Scope Only
    'trips.view.own',
    'trips.workflow.start',
    'trips.workflow.arrive',
    'trips.workflow.complete',
    'trips.workflow.pod_upload',
  ],
};

/**
 * Checks if a given role possesses a required permission string.
 */
export function hasPermission(userRole: string | undefined | null, requiredPermission: string): boolean {
  if (!userRole) return false;

  const permissions = ROLE_PERMISSIONS[userRole] || [];
  if (permissions.includes('*')) return true;
  return permissions.includes(requiredPermission);
}
