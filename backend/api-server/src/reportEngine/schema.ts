// Static registry describing the reportable data model for the Smart Report
// Builder. This is the single source of truth for both the resolver (which
// validates every incoming field/module key against it — the injection
// guard, since keys gate which Prisma include/select paths get built) and
// the frontend Data panel (which fetches this via GET /report-builder/schema
// instead of duplicating the field list).
//
// Every field here is either a real Prisma column or a trivial JS-derived
// value computed from real columns (see reportEngine/derived.ts and the
// resolver). Nothing is fabricated. Distance and Ride Cards are omitted:
// Trip.planned_distance is a dead column (never written), and there is no
// Prisma model backing "Ride Cards" at all.

export type ReportFieldType = 'string' | 'number' | 'date' | 'enum' | 'money';

export interface ReportField {
  /** `${moduleKey}.${fieldName}`, unique across the whole schema. */
  key: string;
  label: string;
  type: ReportFieldType;
  /** Numeric fields that can be dropped into the Values area. */
  aggregatable?: boolean;
  enumValues?: string[];
}

export interface ReportJoin {
  /** Module this module can be joined to. */
  toModule: string;
  /** Human label for the "Connected automatically" indicator. */
  via: string;
  /** Prisma relation field name on THIS module's model pointing at toModule. */
  relationField: string;
  cardinality: 'toOne' | 'toMany';
}

export interface ReportModule {
  key: string;
  label: string;
  /** Prisma model name (camelCase, as used on the `prisma` client). */
  prismaModel: string;
  /** Column used as the module's default date filter/bucket. */
  defaultDateField: string;
  fields: ReportField[];
  joins: ReportJoin[];
}

export const REPORT_SCHEMA: ReportModule[] = [
  {
    key: 'drivers',
    label: 'Drivers',
    prismaModel: 'driver',
    defaultDateField: 'createdAt',
    fields: [
      { key: 'drivers.full_name', label: 'Driver Name', type: 'string' },
      { key: 'drivers.ref_id', label: 'Driver ID', type: 'string' },
      { key: 'drivers.phone_primary', label: 'Phone', type: 'string' },
      { key: 'drivers.status', label: 'Status', type: 'enum', enumValues: ['Available', 'OnTrip', 'OffDuty', 'Inactive'] },
      { key: 'drivers.createdAt', label: 'Joining Date', type: 'date' },
      { key: 'drivers.license_expiry', label: 'License Expiry', type: 'date' },
      { key: 'drivers.ai_risk_score', label: 'Risk Score', type: 'number', aggregatable: true },
    ],
    joins: [
      { toModule: 'vehicles', via: 'Assigned Vehicle', relationField: 'assignedVehicle', cardinality: 'toOne' },
      { toModule: 'trips', via: 'Trips Driven', relationField: 'trips', cardinality: 'toMany' },
      { toModule: 'expenses', via: 'Driver Expenses', relationField: 'expenses', cardinality: 'toMany' },
    ],
  },
  {
    key: 'vehicles',
    label: 'Vehicles',
    prismaModel: 'vehicle',
    defaultDateField: 'createdAt',
    fields: [
      { key: 'vehicles.plate_number', label: 'Vehicle Number', type: 'string' },
      { key: 'vehicles.asset_type', label: 'Vehicle Type', type: 'enum', enumValues: ['Flatbed', 'Reefer', 'Box', 'Tanker'] },
      { key: 'vehicles.status', label: 'Status', type: 'enum', enumValues: ['Available', 'OnTrip', 'Maintenance', 'Inactive'] },
      { key: 'vehicles.capacity_kg', label: 'Capacity (kg)', type: 'number', aggregatable: true },
      { key: 'vehicles.current_odometer', label: 'Odometer', type: 'number', aggregatable: true },
    ],
    joins: [
      { toModule: 'drivers', via: 'Assigned Driver', relationField: 'assignedDriver', cardinality: 'toOne' },
      { toModule: 'trips', via: 'Trips', relationField: 'trips', cardinality: 'toMany' },
      { toModule: 'maintenance', via: 'Maintenance Records', relationField: 'maintenanceRecords', cardinality: 'toMany' },
      { toModule: 'expenses', via: 'Vehicle Expenses', relationField: 'expenses', cardinality: 'toMany' },
    ],
  },
  {
    key: 'trips',
    label: 'Trips',
    prismaModel: 'trip',
    defaultDateField: 'createdAt',
    fields: [
      { key: 'trips.ref_id', label: 'Trip ID', type: 'string' },
      { key: 'trips.createdAt', label: 'Date', type: 'date' },
      { key: 'trips.status', label: 'Trip Status', type: 'enum', enumValues: ['Draft', 'Dispatched', 'AtPickup', 'InTransit', 'AtDelivery', 'Completed', 'Invoiced', 'Cancelled'] },
      { key: 'trips.revenue', label: 'Revenue', type: 'money', aggregatable: true },
      { key: 'trips.trip_charges', label: 'Trip Charges', type: 'money', aggregatable: true },
      { key: 'trips.third_party_cost', label: 'Third-Party Cost', type: 'money', aggregatable: true },
      { key: 'trips.count', label: 'Trip Count', type: 'number', aggregatable: true },
    ],
    joins: [
      { toModule: 'drivers', via: 'Driver', relationField: 'driver', cardinality: 'toOne' },
      { toModule: 'vehicles', via: 'Vehicle', relationField: 'vehicle', cardinality: 'toOne' },
      { toModule: 'customers', via: 'Customer', relationField: 'customer', cardinality: 'toOne' },
      { toModule: 'thirdParty', via: 'Third-Party Provider', relationField: 'thirdPartyProvider', cardinality: 'toOne' },
      { toModule: 'invoices', via: 'Trip Invoices', relationField: 'invoices', cardinality: 'toMany' },
    ],
  },
  {
    key: 'customers',
    label: 'Customers',
    prismaModel: 'customer',
    defaultDateField: 'createdAt',
    fields: [
      { key: 'customers.name', label: 'Customer Name', type: 'string' },
      { key: 'customers.contact_phone', label: 'Contact', type: 'string' },
      { key: 'customers.credit_limit', label: 'Credit Limit', type: 'money', aggregatable: true },
    ],
    joins: [
      { toModule: 'trips', via: 'Customer Trips', relationField: 'trips', cardinality: 'toMany' },
      { toModule: 'invoices', via: 'Customer Invoices', relationField: 'invoices', cardinality: 'toMany' },
    ],
  },
  {
    key: 'thirdParty',
    label: 'Third-Party Fleet',
    prismaModel: 'thirdPartyProvider',
    defaultDateField: 'createdAt',
    fields: [
      { key: 'thirdParty.name', label: 'Vendor', type: 'string' },
      { key: 'thirdParty.contact_person', label: 'Contact Person', type: 'string' },
      { key: 'thirdParty.rating', label: 'Rating', type: 'number', aggregatable: true },
    ],
    joins: [{ toModule: 'trips', via: 'Provider Trips', relationField: 'trips', cardinality: 'toMany' }],
  },
  {
    key: 'maintenance',
    label: 'Maintenance',
    prismaModel: 'maintenanceRecord',
    defaultDateField: 'service_date',
    fields: [
      { key: 'maintenance.workshop_name', label: 'Service Provider', type: 'string' },
      { key: 'maintenance.maintenance_type', label: 'Maintenance Type', type: 'string' },
      { key: 'maintenance.status', label: 'Status', type: 'string' },
      { key: 'maintenance.service_date', label: 'Date', type: 'date' },
      { key: 'maintenance.next_service_due', label: 'Next Service', type: 'date' },
      { key: 'maintenance.cost', label: 'Cost', type: 'money', aggregatable: true },
    ],
    joins: [{ toModule: 'vehicles', via: 'Vehicle', relationField: 'vehicle', cardinality: 'toOne' }],
  },
  {
    key: 'expenses',
    label: 'Expenses',
    prismaModel: 'expense',
    defaultDateField: 'expense_date',
    fields: [
      { key: 'expenses.category', label: 'Expense Type', type: 'string' },
      { key: 'expenses.amount', label: 'Amount', type: 'money', aggregatable: true },
      { key: 'expenses.expense_date', label: 'Date', type: 'date' },
      { key: 'expenses.status', label: 'Status', type: 'string' },
      { key: 'expenses.payment_method', label: 'Payment Method', type: 'string' },
    ],
    joins: [
      { toModule: 'vehicles', via: 'Vehicle', relationField: 'vehicle', cardinality: 'toOne' },
      { toModule: 'drivers', via: 'Driver', relationField: 'driver', cardinality: 'toOne' },
    ],
  },
  {
    key: 'invoices',
    label: 'Invoices',
    prismaModel: 'invoice',
    defaultDateField: 'createdAt',
    fields: [
      { key: 'invoices.ref_id', label: 'Invoice Number', type: 'string' },
      { key: 'invoices.createdAt', label: 'Date', type: 'date' },
      { key: 'invoices.total_amount', label: 'Amount', type: 'money', aggregatable: true },
      { key: 'invoices.status', label: 'Status', type: 'enum', enumValues: ['Draft', 'Pending', 'Paid', 'Overdue', 'Cancelled'] },
      { key: 'invoices.due_date', label: 'Due Date', type: 'date' },
      { key: 'invoices.outstanding', label: 'Outstanding Amount', type: 'money', aggregatable: true },
    ],
    joins: [
      { toModule: 'trips', via: 'Trip', relationField: 'trip', cardinality: 'toOne' },
      { toModule: 'customers', via: 'Customer', relationField: 'customer', cardinality: 'toOne' },
    ],
  },
  {
    key: 'locations',
    label: 'Locations',
    prismaModel: 'location',
    defaultDateField: 'createdAt',
    fields: [
      { key: 'locations.name', label: 'Location Name', type: 'string' },
      { key: 'locations.address', label: 'Address', type: 'string' },
    ],
    joins: [],
  },
  {
    key: 'documents',
    label: 'Documents',
    prismaModel: 'document',
    defaultDateField: 'createdAt',
    fields: [
      { key: 'documents.doc_type', label: 'Document Type', type: 'enum', enumValues: ['DriverLicense', 'VehicleRegistration', 'Insurance', 'POD', 'CustomsClearance', 'Waybill', 'Contract', 'Invoice', 'Emergency'] },
      { key: 'documents.status', label: 'Status', type: 'enum', enumValues: ['PendingReview', 'Verified', 'Rejected', 'Expired'] },
      { key: 'documents.expiry_date', label: 'Expiry Date', type: 'date' },
      // Documents are polymorphic (entity_type/entity_id, no FK) — only
      // Driver/Vehicle entity_type rows can be joined back to a module.
      { key: 'documents.entity_type', label: 'Entity Type', type: 'string' },
    ],
    joins: [],
  },
];

export const findModule = (key: string): ReportModule | undefined => REPORT_SCHEMA.find((m) => m.key === key);

export const findField = (key: string): ReportField | undefined => {
  const moduleKey = key.split('.')[0];
  return findModule(moduleKey)?.fields.find((f) => f.key === key);
};
