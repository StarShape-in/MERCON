import React from 'react';
import { Download, FileSpreadsheet, AlertCircle, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface TripBulkImportTabProps {
  downloadSampleCsv: () => void;
  fileInputRef: React.RefObject<HTMLInputElement | null>;
  handleFileUpload: (file: File) => void;
  importedFile: File | null;
  setImportedFile: (file: File | null) => void;
  parsedRows: any[];
  setParsedRows: (rows: any[]) => void;
  parseError: string | null;
  handleFileSubmit: () => void;
  isPending: boolean;
}

export const TripBulkImportTab: React.FC<TripBulkImportTabProps> = ({
  downloadSampleCsv,
  fileInputRef,
  handleFileUpload,
  importedFile,
  setImportedFile,
  parsedRows,
  setParsedRows,
  parseError,
  handleFileSubmit,
  isPending,
}) => {
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div>
          <h4 className="text-sm font-bold text-[#111111]">Upload Spreadsheet</h4>
          <p className="text-xs text-[#6E6E80]">
            Upload your trip batch via CSV or Excel workbook with per-row dates, drivers, and vehicles.
          </p>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={downloadSampleCsv}
          className="h-8 rounded-lg border-black/10 text-xs font-semibold cursor-pointer"
        >
          <Download className="h-3.5 w-3.5 mr-1" /> Download Sample CSV
        </Button>
      </div>

      {/* Dropzone */}
      {!importedFile ? (
        <div
          onClick={() => fileInputRef.current?.click()}
          className="border-2 border-dashed border-black/10 hover:border-brand/50 rounded-2xl p-5 text-center cursor-pointer transition-colors bg-slate-50/50 hover:bg-slate-50"
        >
          <input
            ref={fileInputRef}
            type="file"
            accept=".csv,.xlsx,.xls"
            className="hidden"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) handleFileUpload(file);
            }}
          />
          <FileSpreadsheet className="h-8 w-8 text-[#9898A4] mx-auto mb-2" />
          <p className="text-xs font-bold text-[#111111]">
            Click to upload or drag and drop
          </p>
          <p className="text-[10px] text-[#9898A4] mt-0.5">
            CSV (.csv) or Microsoft Excel (.xlsx) files
          </p>
        </div>
      ) : (
        <div className="p-3 rounded-xl border border-black/[0.08] bg-slate-50 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <FileSpreadsheet className="h-5 w-5 text-brand" />
            <div>
              <p className="text-xs font-bold text-[#111111]">{importedFile.name}</p>
              <p className="text-[10px] text-[#6E6E80]">
                {parsedRows.length} valid rows parsed
              </p>
            </div>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              setImportedFile(null);
              setParsedRows([]);
            }}
            className="h-7 text-xs text-red-600 hover:text-red-700 hover:bg-red-50 cursor-pointer"
          >
            Remove
          </Button>
        </div>
      )}

      {parseError && (
        <div className="p-2.5 rounded-xl bg-red-50 border border-red-200 text-xs text-red-700 flex items-center gap-2">
          <AlertCircle className="h-4 w-4 shrink-0" />
          {parseError}
        </div>
      )}

      {/* Parsed Preview Table */}
      {parsedRows.length > 0 && (
        <div className="space-y-1.5">
          <p className="text-[10px] font-bold text-[#9898A4] uppercase tracking-wider">
            Parsed File Preview ({parsedRows.length} Rows)
          </p>
          <div className="rounded-xl border border-black/[0.08] overflow-hidden max-h-[340px] overflow-y-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 text-[10px] font-bold text-[#6E6E80] uppercase tracking-wider border-b border-black/[0.06] sticky top-0">
                <tr>
                  <th className="px-3 py-2">Company</th>
                  <th className="px-3 py-2">Date</th>
                  <th className="px-3 py-2">Driver</th>
                  <th className="px-3 py-2">Vehicle</th>
                  <th className="px-3 py-2">Category</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-black/[0.04]">
                {parsedRows.slice(0, 15).map((row, idx) => (
                  <tr key={idx} className="hover:bg-slate-50/50">
                    <td className="px-3 py-1.5 font-semibold text-[#111111]">{row.customer_name}</td>
                    <td className="px-3 py-1.5 text-[#6E6E80]">{row.planned_start || '—'}</td>
                    <td className="px-3 py-1.5 text-[#6E6E80]">{row.driver_name || 'Unassigned'}</td>
                    <td className="px-3 py-1.5 text-[#6E6E80]">{row.vehicle_plate || 'Unassigned'}</td>
                    <td className="px-3 py-1.5 text-[#6E6E80]">{row.rate_category || 'Standard'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* File Import Footer */}
      <div className="flex items-center justify-between pt-2.5 border-t border-black/[0.06]">
        <p className="text-xs text-[#6E6E80]">
          {parsedRows.length > 0 ? `${parsedRows.length} trips ready for import` : 'Upload a valid file to proceed'}
        </p>
        <Button
          disabled={isPending || parsedRows.length === 0}
          onClick={handleFileSubmit}
          className="h-9 rounded-xl px-5 text-xs font-bold bg-brand hover:bg-[#d13d0d] text-white shadow-none disabled:opacity-50 cursor-pointer"
        >
          {isPending ? (
            <>
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              Importing Trips...
            </>
          ) : (
            `Import ${parsedRows.length} Trips`
          )}
        </Button>
      </div>
    </div>
  );
};

export default TripBulkImportTab;
