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

    // Settings & Master Data Refined Keys
    'company.settings.view',
    'company.settings.manage',
    'regional.settings.view',
    'regional.settings.manage',
    'master_data.view',
    'master_data.manage',
    'document_types.manage',
    'settings.view',
    'settings.manage',

    // Reports, Audit & System Health
    'reports.view',
    'reports.financial',
    'audit.view',
    'system.health.view',
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

    // Users (Target Hierarchy Enforced)
    'users.view',
    'users.manage',

    // Settings & Master Data Read/Operational Keys
    'company.settings.view',
    'regional.settings.view',
    'master_data.view',
    'settings.view',

    // Reports (Operational)
    'reports.view',
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
