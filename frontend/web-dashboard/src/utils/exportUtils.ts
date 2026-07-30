const EXCLUDE_KEYS = new Set([
  'id', 'deletedAt', 'created_by', 'updated_by', 'deleted_by', 
  'version', 'password_hash', 'userId', 'driverId', 'vehicleId', 
  'customerId', 'tripId', 'isActive'
]);

function formatHeaderLabel(key: string): string {
  const map: Record<string, string> = {
    ref_id: 'Job / Ref ID',
    first_name: 'First Name',
    last_name: 'Last Name',
    phone_primary: 'Primary Phone',
    contact_phone: 'Contact Phone',
    plate_number: 'Plate Number',
    capacity_kg: 'Capacity (KG)',
    asset_type: 'Vehicle Type',
    ai_risk_score: 'AI Safety Risk Score',
    credit_limit: 'Credit Limit (SAR)',
    total_amount: 'Total Amount (SAR)',
    subtotal: 'Subtotal (SAR)',
    billing_amount: 'Billing Amount (SAR)',
    waiting_labor_charges: 'Waiting / Labor Charges (SAR)',
    additional_stop_charges: 'Additional Stop Charges (SAR)',
    trip_charges: 'Trip Charges (SAR)',
    balance_amount: 'Net Balance (SAR)',
    carrier_name: 'Carrier / Provider',
    createdAt: 'Created Date',
    updatedAt: 'Updated Date',
    actual_start: 'Start Date',
    actual_end: 'End Date',
    planned_start: 'Planned Start',
    planned_end: 'Planned End',
    due_date: 'Due Date',
    issue_date: 'Issue Date',
    expiry_date: 'Expiry Date',
    status: 'Status',
    cargo_type: 'Cargo Type',
    hazmat_flag: 'Hazmat',
    cost: 'Maintenance Cost (SAR)',
    service_date: 'Service Date',
    odometer_reading: 'Odometer Reading (KM)',
    workshop_name: 'Workshop Name',
  };

  if (map[key]) return map[key];
  return key
    .replace(/_/g, ' ')
    .replace(/([A-Z])/g, ' $1')
    .replace(/^./, (str) => str.toUpperCase())
    .trim();
}

function extractValue(val: any): string {
  if (val === null || val === undefined) return '';
  if (typeof val === 'boolean') return val ? 'Yes' : 'No';
  if (typeof val === 'number') return String(val);
  
  if (typeof val === 'object') {
    if (Array.isArray(val)) {
      return val.map((item) => extractValue(item)).filter(Boolean).join('; ');
    }
    // Unwrap nested relational objects nicely
    if (val.name) return String(val.name);
    if (val.first_name || val.last_name) {
      return `${val.first_name || ''} ${val.last_name || ''}`.trim();
    }
    if (val.plate_number) return String(val.plate_number);
    if (val.ref_id) return String(val.ref_id);
    if (val.company_name) return String(val.company_name);
    if (val.username) return String(val.username);
    if (val.title) return String(val.title);
    return '';
  }

  // Format ISO Dates
  if (typeof val === 'string' && /^\d{4}-\d{2}-\d{2}T/.test(val)) {
    try {
      const d = new Date(val);
      if (!isNaN(d.getTime())) {
        return d.toISOString().slice(0, 10);
      }
    } catch (e) {
      // fallback
    }
  }

  return String(val);
}

export function downloadCSV<T extends Record<string, any>>(data: T[], filename: string = 'mercon_export.csv') {
  if (!data || !data.length) {
    return;
  }

  // Filter raw keys to exclude internal system fields unless specifically mapped
  const rawKeys = Object.keys(data[0]).filter(k => !EXCLUDE_KEYS.has(k));
  const headers = rawKeys.map(formatHeaderLabel);

  const csvRows: string[] = [];
  
  // Add header row
  csvRows.push(headers.join(','));

  // Add data rows
  for (const row of data) {
    const values = rawKeys.map(key => {
      let val = extractValue(row[key]);
      val = val.replace(/"/g, '""'); // Escape double quotes for CSV
      if (/[",\n]/.test(val)) {
        val = `"${val}"`;
      }
      return val;
    });
    csvRows.push(values.join(','));
  }

  const csvString = csvRows.join('\n');
  const blob = new Blob(['\uFEFF' + csvString], { type: 'text/csv;charset=utf-8;' }); // UTF-8 BOM for Excel compatibility
  
  const link = document.createElement('a');
  if (link.download !== undefined) {
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', filename);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }
}
