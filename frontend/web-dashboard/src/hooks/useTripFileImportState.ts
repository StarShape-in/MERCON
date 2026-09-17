import { useState, useRef } from 'react';
import { parseSheet, TRIP_COLUMNS } from '@/utils/importUtils';
import { BulkImportTripRow } from '@/services/tripService';

export function useTripFileImportState() {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [importedFile, setImportedFile] = useState<File | null>(null);
  const [parsedRows, setParsedRows] = useState<Array<BulkImportTripRow>>([]);
  const [parseError, setParseError] = useState<string | null>(null);
  const [isParsing, setIsParsing] = useState(false);

  const handleFileUpload = async (file: File) => {
    setImportedFile(file);
    setParseError(null);
    setIsParsing(true);
    try {
      if (file.name.endsWith('.csv')) {
        const text = await file.text();
        const lines = text.split(/\r?\n/).filter((l) => l.trim().length > 0);
        if (lines.length <= 1) {
          throw new Error('The CSV file does not contain any data rows.');
        }
        const headers = lines[0].split(',').map((h) => h.trim().toLowerCase().replace(/"/g, ''));
        const rows: BulkImportTripRow[] = [];

        for (let i = 1; i < lines.length; i++) {
          const cells = lines[i].split(',').map((c) => c.trim().replace(/"/g, ''));
          if (cells.length === 0 || !cells[0]) continue;

          const rowObj: any = {};
          headers.forEach((h, idx) => {
            const val = cells[idx] || '';
            if (h.includes('customer') || h.includes('company')) rowObj.customer_name = val;
            else if (h.includes('date') || h.includes('start')) rowObj.planned_start = val;
            else if (h.includes('driver')) rowObj.driver_name = val;
            else if (h.includes('vehicle') || h.includes('plate')) rowObj.vehicle_plate = val;
            else if (h.includes('origin') || h.includes('from')) rowObj.origin = val;
            else if (h.includes('dest') || h.includes('to')) rowObj.destination = val;
            else if (h.includes('category')) rowObj.rate_category = val;
            else if (h.includes('type')) rowObj.vehicle_type = val;
            else if (h.includes('amount') || h.includes('price')) rowObj.billing_amount = Number(val) || undefined;
          });

          if (rowObj.customer_name) {
            rows.push(rowObj);
          }
        }
        setParsedRows(rows);
      } else {
        const result = await parseSheet(file, TRIP_COLUMNS, 'trip');
        const rows: BulkImportTripRow[] = result.rows.map((r) => ({
          customer_name: String(r.customer_name || ''),
          planned_start: r.planned_start ? String(r.planned_start) : undefined,
          driver_name: r.driver_name ? String(r.driver_name) : undefined,
          vehicle_plate: r.vehicle_plate ? String(r.vehicle_plate) : undefined,
          rate_category: r.rate_category ? String(r.rate_category) : undefined,
          vehicle_type: r.vehicle_type ? String(r.vehicle_type) : undefined,
          origin: r.origin ? String(r.origin) : undefined,
          destination: r.destination ? String(r.destination) : undefined,
          billing_amount: r.billing_amount ? Number(r.billing_amount) : undefined,
        })).filter((r) => Boolean(r.customer_name));
        setParsedRows(rows);
      }
    } catch (e: any) {
      setParseError(e.message || 'Failed to read spreadsheet file');
    } finally {
      setIsParsing(false);
    }
  };

  const downloadSampleCsv = () => {
    const csvContent =
      'Company Name,Trip Date,Driver Name,Vehicle Plate,Rate Category,Vehicle Type,Origin,Destination,Amount\n' +
      'ARKAN Logistics,2026-08-14,Ahmed Al-Ghamdi,KSA-1029,Standard,Flatbed,Riyadh Yard 1,Jeddah Port,3500\n' +
      'Saudi Aramco,2026-08-15,Mohammed Ali,KSA-8842,Express,Reefer,Dammam Hub,Riyadh Distribution,4200\n' +
      'SABIC Logistics,2026-08-16,,,Standard,Flatbed,Jubail Industrial,Yanbu Depot,2800\n';

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = 'MERCON_Bulk_Trips_Template.csv';
    link.click();
  };

  return {
    fileInputRef,
    importedFile,
    setImportedFile,
    parsedRows,
    setParsedRows,
    parseError,
    setParseError,
    isParsing,
    handleFileUpload,
    downloadSampleCsv,
  };
}
