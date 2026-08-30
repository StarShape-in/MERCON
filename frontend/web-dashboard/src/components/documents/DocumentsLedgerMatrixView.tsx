import React, { useState, useMemo } from 'react';
import { 
  CheckCircle2, XCircle, AlertCircle, MinusCircle, ChevronRight, 
  Search, UploadCloud, Eye, FileText, Truck, User as UserIcon, Shield, SlidersHorizontal
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import type { OwnerFoldersSummaryRow, OwnerFoldersSummarySlot } from '@/services/documentService';
import { formatDocDate } from '@/lib/documents';

interface DocumentsLedgerMatrixViewProps {
  activeCategory: 'Vehicles' | 'Drivers' | 'Other' | 'All' | 'Unassigned';
  search: string;
  onSearchChange: (val: string) => void;
  expiryFilter: string;
  onExpiryFilterChange: (val: any) => void;
  vehicleFolders: OwnerFoldersSummaryRow[];
  driverFolders: OwnerFoldersSummaryRow[];
  otherDocs: any[];
  onUploadClick: () => void;
  onPreviewDoc?: (docId: string) => void;
  tz?: string;
}

export default function DocumentsLedgerMatrixView({
  activeCategory,
  search,
  onSearchChange,
  expiryFilter,
  onExpiryFilterChange,
  vehicleFolders,
  driverFolders,
  otherDocs,
  onUploadClick,
  onPreviewDoc,
  tz,
}: DocumentsLedgerMatrixViewProps) {
  const navigate = useNavigate();

  // Local Tab Selection inside Ledger view if category is ALL
  const [ledgerTab, setLedgerTab] = useState<'Vehicles' | 'Drivers' | 'Other'>(
    activeCategory === 'Drivers' ? 'Drivers' : activeCategory === 'Other' ? 'Other' : 'Vehicles'
  );

  // Status Filter Pill selection
  const [statusPill, setStatusPill] = useState<string>(expiryFilter || 'all');

  // Active dataset selection based on ledgerTab
  const currentCategory = activeCategory === 'All' ? ledgerTab : activeCategory === 'Unassigned' ? 'Vehicles' : activeCategory;

  // Slot matching helper
  const findSlot = (row: OwnerFoldersSummaryRow, targetKeywords: string[]) => {
    return row.slots.find((s) => {
      const c = (s.code || '').toLowerCase();
      const n = (s.name || '').toLowerCase();
      return targetKeywords.some((k) => c.includes(k) || n.includes(k));
    }) || null;
  };

  // Helper to compute issue summary for a row
  const getRowStatusSummary = (row: OwnerFoldersSummaryRow) => {
    let expiredCount = 0;
    let missingCount = 0;
    let expiringCount = 0;

    row.slots.forEach((s) => {
      if (s.status === 'EXPIRED') expiredCount++;
      else if (s.status === 'MISSING') missingCount++;
      else if (s.status === 'EXPIRING_SOON') expiringCount++;
    });

    const issues = expiredCount + missingCount;
    return { issues, expiringCount, expiredCount, missingCount };
  };

  // Filter Vehicle Rows
  const filteredVehicles = useMemo(() => {
    return vehicleFolders.filter((row) => {
      // 1. Search
      if (search.trim()) {
        const q = search.toLowerCase();
        const matchName = row.ownerName.toLowerCase().includes(q);
        const matchRef = (row.ownerRef || '').toLowerCase().includes(q);
        const matchRel = (row.relatedName || '').toLowerCase().includes(q);
        if (!matchName && !matchRef && !matchRel) return false;
      }
      // 2. Status Pill Filter
      const { issues, expiringCount, missingCount } = getRowStatusSummary(row);
      if (statusPill === 'compliant') return issues === 0 && expiringCount === 0;
      if (statusPill === 'expiring') return expiringCount > 0;
      if (statusPill === 'issues') return issues > 0;
      if (statusPill === 'missing') return missingCount > 0;
      return true;
    });
  }, [vehicleFolders, search, statusPill]);

  // Filter Driver Rows
  const filteredDrivers = useMemo(() => {
    return driverFolders.filter((row) => {
      if (search.trim()) {
        const q = search.toLowerCase();
        const matchName = row.ownerName.toLowerCase().includes(q);
        const matchRef = (row.ownerRef || '').toLowerCase().includes(q);
        const matchRel = (row.relatedName || '').toLowerCase().includes(q);
        if (!matchName && !matchRef && !matchRel) return false;
      }
      const { issues, expiringCount, missingCount } = getRowStatusSummary(row);
      if (statusPill === 'compliant') return issues === 0 && expiringCount === 0;
      if (statusPill === 'expiring') return expiringCount > 0;
      if (statusPill === 'issues') return issues > 0;
      if (statusPill === 'missing') return missingCount > 0;
      return true;
    });
  }, [driverFolders, search, statusPill]);

  // Counts for Top Subtitle & Pills
  const activeDataset = currentCategory === 'Vehicles' ? filteredVehicles : currentCategory === 'Drivers' ? filteredDrivers : [];
  const rawDataset = currentCategory === 'Vehicles' ? vehicleFolders : currentCategory === 'Drivers' ? driverFolders : [];

  const pillCounts = useMemo(() => {
    let compliant = 0;
    let expiring = 0;
    let issues = 0;
    let missing = 0;

    rawDataset.forEach((r) => {
      const summary = getRowStatusSummary(r);
      if (summary.issues === 0 && summary.expiringCount === 0) compliant++;
      if (summary.expiringCount > 0) expiring++;
      if (summary.issues > 0) issues++;
      if (summary.missingCount > 0) missing++;
    });

    return { all: rawDataset.length, compliant, expiring, issues, missing };
  }, [rawDataset]);

  // Render Slot Cell with Perfect Icon + Text Alignment
  const renderSlotCell = (slot: OwnerFoldersSummarySlot | null) => {
    if (!slot) {
      return (
        <div className="flex items-center gap-1.5 text-slate-350 dark:text-slate-600 py-0.5">
          <MinusCircle className="w-3.5 h-3.5 shrink-0" />
          <span className="text-xs font-medium">N/A</span>
        </div>
      );
    }

    if (slot.status === 'VALID') {
      return (
        <div className="flex items-start gap-1.5 py-0.5">
          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 shrink-0 mt-0.5" />
          <div className="flex flex-col leading-tight">
            <span className="text-xs font-bold text-slate-800 dark:text-slate-200">Valid</span>
            {slot.expiry_date && (
              <span className="text-[10px] font-mono text-slate-400 font-medium mt-0.5">
                {formatDocDate(slot.expiry_date)}
              </span>
            )}
          </div>
        </div>
      );
    }

    if (slot.status === 'EXPIRED') {
      return (
        <div className="flex items-start gap-1.5 py-0.5">
          <XCircle className="w-3.5 h-3.5 text-rose-500 shrink-0 mt-0.5" />
          <div className="flex flex-col leading-tight">
            <span className="text-xs font-bold text-rose-600 dark:text-rose-400">Expired</span>
            {slot.expiry_date && (
              <span className="text-[10px] font-mono text-slate-400 font-medium mt-0.5">
                {formatDocDate(slot.expiry_date)}
              </span>
            )}
          </div>
        </div>
      );
    }

    if (slot.status === 'EXPIRING_SOON') {
      return (
        <div className="flex items-start gap-1.5 py-0.5">
          <AlertCircle className="w-3.5 h-3.5 text-amber-500 shrink-0 mt-0.5" />
          <div className="flex flex-col leading-tight">
            <span className="text-xs font-bold text-amber-600 dark:text-amber-400">Expiring</span>
            {slot.expiry_date && (
              <span className="text-[10px] font-mono text-slate-400 font-medium mt-0.5">
                {formatDocDate(slot.expiry_date)}
              </span>
            )}
          </div>
        </div>
      );
    }

    // MISSING
    return (
      <div className="flex items-center gap-1.5 py-0.5">
        <MinusCircle className="w-3.5 h-3.5 text-slate-400 shrink-0" />
        <span className="text-xs font-semibold text-slate-400">Missing</span>
      </div>
    );
  };

  // Render Row Status Summary Pill
  const renderRowStatusBadge = (row: OwnerFoldersSummaryRow) => {
    const { issues, expiringCount } = getRowStatusSummary(row);
    if (issues === 0 && expiringCount === 0) {
      return (
        <Badge className="bg-emerald-50 text-emerald-700 border-emerald-250 dark:bg-emerald-950/40 dark:text-emerald-300 font-bold text-[11px] px-3 py-1 rounded-full shadow-none">
          Compliant
        </Badge>
      );
    }
    if (issues > 0) {
      return (
        <Badge className="bg-rose-50 text-rose-700 border-rose-250 dark:bg-rose-950/40 dark:text-rose-400 font-bold text-[11px] px-3 py-1 rounded-full shadow-none">
          {issues} {issues === 1 ? 'Issue' : 'Issues'}
        </Badge>
      );
    }
    return (
      <Badge className="bg-amber-50 text-amber-700 border-amber-250 dark:bg-amber-950/40 dark:text-amber-400 font-bold text-[11px] px-3 py-1 rounded-full shadow-none">
        {expiringCount} Expiring
      </Badge>
    );
  };

  return (
    <div className="space-y-4">
      {/* ── Status Filter Pills Row (Exact screenshot styling) ── */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1">
        <button
          type="button"
          onClick={() => setStatusPill('all')}
          className={cn(
            "px-3.5 py-1.5 rounded-full text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer border",
            statusPill === 'all'
              ? "bg-[#FA634E]/10 border-[#FA634E] text-[#FA634E]"
              : "bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:border-slate-300"
          )}
        >
          <span>All</span>
          <span className="font-mono text-[11px]">{pillCounts.all}</span>
        </button>

        <button
          type="button"
          onClick={() => setStatusPill('compliant')}
          className={cn(
            "px-3.5 py-1.5 rounded-full text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer border",
            statusPill === 'compliant'
              ? "bg-emerald-500/10 border-emerald-500 text-emerald-600"
              : "bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:border-slate-300"
          )}
        >
          <span>Compliant</span>
          <span className="font-mono text-[11px] text-emerald-600">{pillCounts.compliant}</span>
        </button>

        <button
          type="button"
          onClick={() => setStatusPill('expiring')}
          className={cn(
            "px-3.5 py-1.5 rounded-full text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer border",
            statusPill === 'expiring'
              ? "bg-amber-500/10 border-amber-500 text-amber-600"
              : "bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:border-slate-300"
          )}
        >
          <span>Expiring Soon</span>
          <span className="font-mono text-[11px] text-amber-600">{pillCounts.expiring}</span>
        </button>

        <button
          type="button"
          onClick={() => setStatusPill('issues')}
          className={cn(
            "px-3.5 py-1.5 rounded-full text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer border",
            statusPill === 'issues'
              ? "bg-rose-500/10 border-rose-500 text-rose-600"
              : "bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:border-slate-300"
          )}
        >
          <span>Issues</span>
          <span className="font-mono text-[11px] text-rose-600">{pillCounts.issues}</span>
        </button>

        <button
          type="button"
          onClick={() => setStatusPill('missing')}
          className={cn(
            "px-3.5 py-1.5 rounded-full text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer border",
            statusPill === 'missing'
              ? "bg-slate-500/10 border-slate-500 text-slate-700 dark:text-slate-300"
              : "bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:border-slate-300"
          )}
        >
          <span>Missing</span>
          <span className="font-mono text-[11px] text-slate-500">{pillCounts.missing}</span>
        </button>
      </div>

      {/* ── Matrix Table Container (Full Table Layout as in Vehicles Ledger) ── */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          {currentCategory === 'Vehicles' && (
            <table className="w-full text-xs border-collapse">
              <thead>
                <tr className="border-b border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-800/50 text-slate-600 dark:text-slate-300 font-extrabold text-[11px]">
                  <th className="px-5 py-3.5 text-left whitespace-nowrap">Vehicle ˅</th>
                  <th className="px-4 py-3.5 text-left whitespace-nowrap">Driver</th>
                  <th className="px-4 py-3.5 text-left whitespace-nowrap">Isthimara</th>
                  <th className="px-4 py-3.5 text-left whitespace-nowrap">Insurance</th>
                  <th className="px-4 py-3.5 text-left whitespace-nowrap">Operation Card</th>
                  <th className="px-4 py-3.5 text-left whitespace-nowrap">SASO Plates</th>
                  <th className="px-4 py-3.5 text-left whitespace-nowrap">FAHAS</th>
                  <th className="px-4 py-3.5 text-center whitespace-nowrap">Status</th>
                  <th className="px-4 py-3.5 text-right whitespace-nowrap">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60 font-medium text-slate-700 dark:text-slate-300">
                {filteredVehicles.length === 0 ? (
                  <tr>
                    <td colSpan={9} className="px-4 py-16 text-center text-slate-400">
                      <FileText className="w-8 h-8 mx-auto mb-2 text-slate-300" />
                      <p className="font-bold text-slate-700 dark:text-slate-300 text-sm">No vehicles found</p>
                      <p className="text-xs text-slate-400 mt-1">Adjust search query or filter pills</p>
                    </td>
                  </tr>
                ) : (
                  filteredVehicles.map((row) => {
                    const isthimara = findSlot(row, ['isthimara', 'registration']);
                    const insurance = findSlot(row, ['insurance']);
                    const opCard = findSlot(row, ['operation', 'card']);
                    const saso = findSlot(row, ['saso', 'plate']);
                    const fahas = findSlot(row, ['fahas', 'inspection']);

                    return (
                      <tr
                        key={row.ownerId}
                        onClick={() => navigate(`/documents/vehicles/${row.ownerId}`)}
                        className="hover:bg-slate-50/80 dark:hover:bg-slate-800/40 cursor-pointer transition-colors"
                      >
                        {/* Vehicle */}
                        <td className="px-5 py-3.5 whitespace-nowrap">
                          <div className="flex flex-col">
                            <span className="font-extrabold text-slate-900 dark:text-white text-xs tracking-tight">
                              {row.ownerName}
                            </span>
                            <span className="text-[10px] text-slate-400 font-mono">
                              {row.ownerRef || 'TRK-000'}
                            </span>
                          </div>
                        </td>

                        {/* Driver */}
                        <td className="px-4 py-3.5 whitespace-nowrap">
                          <div className="flex flex-col">
                            <span className="font-bold text-slate-800 dark:text-slate-200 text-xs">
                              {row.relatedName || 'Unassigned'}
                            </span>
                            <span className="text-[10px] text-slate-400 font-mono">
                              +966 5*******
                            </span>
                          </div>
                        </td>

                        {/* Isthimara */}
                        <td className="px-4 py-3.5 whitespace-nowrap">{renderSlotCell(isthimara)}</td>

                        {/* Insurance */}
                        <td className="px-4 py-3.5 whitespace-nowrap">{renderSlotCell(insurance)}</td>

                        {/* Operation Card */}
                        <td className="px-4 py-3.5 whitespace-nowrap">{renderSlotCell(opCard)}</td>

                        {/* SASO Plates */}
                        <td className="px-4 py-3.5 whitespace-nowrap">{renderSlotCell(saso)}</td>

                        {/* FAHAS */}
                        <td className="px-4 py-3.5 whitespace-nowrap">{renderSlotCell(fahas)}</td>

                        {/* Status */}
                        <td className="px-4 py-3.5 text-center whitespace-nowrap">{renderRowStatusBadge(row)}</td>

                        {/* Action */}
                        <td className="px-4 py-3.5 text-right whitespace-nowrap">
                          <ChevronRight className="w-4 h-4 text-slate-400 group-hover:text-[#FA634E] inline-block" />
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          )}

          {currentCategory === 'Drivers' && (
            <table className="w-full text-xs border-collapse">
              <thead>
                <tr className="border-b border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-800/50 text-slate-600 dark:text-slate-300 font-extrabold text-[11px]">
                  <th className="px-5 py-3.5 text-left whitespace-nowrap">Driver ˅</th>
                  <th className="px-4 py-3.5 text-left whitespace-nowrap">Assigned Vehicle</th>
                  <th className="px-4 py-3.5 text-left whitespace-nowrap">Driver License</th>
                  <th className="px-4 py-3.5 text-left whitespace-nowrap">Passport</th>
                  <th className="px-4 py-3.5 text-left whitespace-nowrap">Iqama / Residency</th>
                  <th className="px-4 py-3.5 text-left whitespace-nowrap">Medical Check</th>
                  <th className="px-4 py-3.5 text-center whitespace-nowrap">Status</th>
                  <th className="px-4 py-3.5 text-right whitespace-nowrap">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60 font-medium text-slate-700 dark:text-slate-350">
                {filteredDrivers.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="px-4 py-16 text-center text-slate-400">
                      <FileText className="w-8 h-8 mx-auto mb-2 text-slate-300" />
                      <p className="font-bold text-slate-700 dark:text-slate-300 text-sm">No drivers found</p>
                      <p className="text-xs text-slate-400 mt-1">Adjust search query or filter pills</p>
                    </td>
                  </tr>
                ) : (
                  filteredDrivers.map((row) => {
                    const license = findSlot(row, ['license']);
                    const passport = findSlot(row, ['passport']);
                    const iqama = findSlot(row, ['iqama', 'residency']);
                    const medical = findSlot(row, ['medical', 'check']);

                    return (
                      <tr
                        key={row.ownerId}
                        onClick={() => navigate(`/documents/drivers/${row.ownerId}`)}
                        className="hover:bg-slate-50/80 dark:hover:bg-slate-800/40 cursor-pointer transition-colors"
                      >
                        {/* Driver */}
                        <td className="px-5 py-3.5 whitespace-nowrap">
                          <div className="flex flex-col">
                            <span className="font-extrabold text-slate-900 dark:text-white text-xs tracking-tight">
                              {row.ownerName}
                            </span>
                            <span className="text-[10px] text-slate-400 font-mono">
                              {row.ownerRef || '+966 5*******'}
                            </span>
                          </div>
                        </td>

                        {/* Vehicle */}
                        <td className="px-4 py-3.5 whitespace-nowrap">
                          <div className="flex flex-col">
                            <span className="font-bold text-slate-800 dark:text-slate-200 text-xs">
                              {row.relatedName || 'Unassigned'}
                            </span>
                            <span className="text-[10px] text-slate-400 font-mono">TRK Fleet</span>
                          </div>
                        </td>

                        {/* Slots */}
                        <td className="px-4 py-3.5 whitespace-nowrap">{renderSlotCell(license)}</td>
                        <td className="px-4 py-3.5 whitespace-nowrap">{renderSlotCell(passport)}</td>
                        <td className="px-4 py-3.5 whitespace-nowrap">{renderSlotCell(iqama)}</td>
                        <td className="px-4 py-3.5 whitespace-nowrap">{renderSlotCell(medical)}</td>

                        {/* Status */}
                        <td className="px-4 py-3.5 text-center whitespace-nowrap">{renderRowStatusBadge(row)}</td>

                        {/* Action */}
                        <td className="px-4 py-3.5 text-right whitespace-nowrap">
                          <ChevronRight className="w-4 h-4 text-slate-400 group-hover:text-[#FA634E] inline-block" />
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          )}

          {currentCategory === 'Other' && (
            <table className="w-full text-xs border-collapse">
              <thead>
                <tr className="border-b border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-800/50 text-slate-600 dark:text-slate-300 font-extrabold text-[11px]">
                  <th className="px-5 py-3.5 text-left whitespace-nowrap">Document Title</th>
                  <th className="px-4 py-3.5 text-left whitespace-nowrap">Category</th>
                  <th className="px-4 py-3.5 text-left whitespace-nowrap">Authority / Issuer</th>
                  <th className="px-4 py-3.5 text-left whitespace-nowrap">Expiry Date</th>
                  <th className="px-4 py-3.5 text-center whitespace-nowrap">Status</th>
                  <th className="px-4 py-3.5 text-right whitespace-nowrap">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60 font-medium text-slate-700 dark:text-slate-300">
                {otherDocs.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-4 py-16 text-center text-slate-400">
                      <FileText className="w-8 h-8 mx-auto mb-2 text-slate-300" />
                      <p className="font-bold text-slate-700 dark:text-slate-300 text-sm">No company/operations documents found</p>
                    </td>
                  </tr>
                ) : (
                  otherDocs.map((doc: any) => (
                    <tr
                      key={doc.id}
                      onClick={() => onPreviewDoc?.(doc.id)}
                      className="hover:bg-slate-50/80 dark:hover:bg-slate-800/40 cursor-pointer transition-colors"
                    >
                      <td className="px-5 py-3.5 whitespace-nowrap">
                        <span className="font-bold text-slate-900 dark:text-white text-xs">{doc.title || doc.document_number || 'Document File'}</span>
                      </td>
                      <td className="px-4 py-3.5 whitespace-nowrap text-slate-500">{doc.category || 'Company'}</td>
                      <td className="px-4 py-3.5 whitespace-nowrap text-slate-500">{doc.issuer || 'Saudi Authority'}</td>
                      <td className="px-4 py-3.5 whitespace-nowrap font-mono text-slate-500">{doc.expiry_date ? formatDocDate(doc.expiry_date) : '—'}</td>
                      <td className="px-4 py-3.5 text-center whitespace-nowrap">
                        <Badge className="bg-emerald-50 text-emerald-700 border-emerald-250 font-bold text-[10px]">Valid</Badge>
                      </td>
                      <td className="px-4 py-3.5 text-right whitespace-nowrap">
                        <Eye className="w-4 h-4 text-slate-400 inline-block" />
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          )}
        </div>

        {/* ── Table Footer / Total Count Summary ── */}
        <div className="p-3.5 px-5 bg-slate-50/70 dark:bg-slate-800/40 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between text-xs font-mono text-slate-500">
          <span>
            Showing {currentCategory === 'Other' ? otherDocs.length : activeDataset.length} {currentCategory.toLowerCase()}
          </span>
        </div>
      </div>
    </div>
  );
}
