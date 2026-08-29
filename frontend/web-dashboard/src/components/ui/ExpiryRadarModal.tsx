import { useMemo, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { AlertTriangle, Clock, ShieldAlert, RotateCw, Download, FileText, CheckCircle2, UserCheck, Eye, ExternalLink } from 'lucide-react';

import DataTable from '@/components/ui/DataTable';
import KpiCard from '@/components/ui/KpiCard';
import { RiskAlert, CalendarAlert, CheckBadge } from '@/components/ui/kpi-icons';
import { documentService, type MerconDocument } from '@/services/documentService';
import { downloadCSV, exportExcelTable, exportPDFTable } from '@/utils/exportUtils';
import { FileSpreadsheet } from 'lucide-react';
import { driverService } from '@/services/driverService';
import { vehicleService } from '@/services/vehicleService';
import { documentDisplayName, daysUntil, getExpiryStatus, formatExpiryText } from '@/lib/documents';
import { matchesSearch } from '@/lib/search';
import { cn } from '@/lib/utils';
import { useDeploymentTimezone, formatInDeploymentTz } from '@/lib/datetime';

import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';

interface ExpiryRow {
  id: string;
  entity_type: string;
  entity_id: string;
  doc_type: string;
  entityName: string;
  expiry_date: string | null;
  file_url?: string;
  daysRemaining: number;
  status: 'expired' | 'critical' | 'warning' | 'valid' | 'none';
  source: 'document' | 'driver_profile';
}

interface ExpiryRadarModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function ExpiryRadarModal({ isOpen, onClose }: ExpiryRadarModalProps) {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const tz = useDeploymentTimezone();
  const [search, setSearch] = useState('');

  const handleExportExpiry = (rows: ExpiryRow[], format: 'excel' | 'pdf') => {
    if (!rows.length) return;
    const headers = ['Entity Name', 'Type', 'Document Category', 'Expiry Date', 'Status', 'Days Remaining'];
    const dataRows = rows.map((r) => [
      r.entityName || '',
      r.entity_type || '',
      r.doc_type || '',
      r.expiry_date ? r.expiry_date.slice(0, 10) : '',
      r.status || '',
      r.daysRemaining === 9999 ? 'N/A' : r.daysRemaining <= 0 ? 'Expired' : `${r.daysRemaining} days`,
    ]);

    const title = 'Expiry Radar Report';
    const filename = `expiry_radar_export_${new Date().toISOString().slice(0, 10)}.${format === 'excel' ? 'xlsx' : 'pdf'}`;
    if (format === 'excel') {
      exportExcelTable(title, headers, dataRows, filename);
    } else {
      exportPDFTable(title, headers, dataRows, filename);
    }
  };
  const [activeFilter, setActiveFilter] = useState<'all' | 'expired' | 'critical' | 'upcoming'>('all');
  const [isRefreshing, setIsRefreshing] = useState(false);

  const { data: docs = [], isLoading: isLoadingDocs, isError: isErrorDocs } = useQuery({
    queryKey: ['documents', 'all'],
    queryFn: async () => (await documentService.getAll({ per_page: 200 })).data,
    enabled: isOpen,
  });
  const { data: drivers = [], isLoading: isLoadingDrivers } = useQuery({
    queryKey: ['drivers', 'lookup'],
    queryFn: async () => (await driverService.getAll()).data,
    enabled: isOpen,
  });
  const { data: vehicles = [], isLoading: isLoadingVehicles } = useQuery({
    queryKey: ['vehicles', 'lookup'],
    queryFn: async () => (await vehicleService.getAll()).data,
    enabled: isOpen,
  });

  const isLoading = isLoadingDocs || isLoadingDrivers || isLoadingVehicles;

  const handleRefresh = async () => {
    setIsRefreshing(true);
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: ['documents'] }),
      queryClient.invalidateQueries({ queryKey: ['drivers'] }),
      queryClient.invalidateQueries({ queryKey: ['vehicles'] }),
    ]);
    setTimeout(() => setIsRefreshing(false), 500);
  };

  const nameFor = useMemo(() => {
    const dMap = new Map(drivers.map((d) => [d.id, `${d.first_name} ${d.last_name}`.trim()]));
    const vMap = new Map(vehicles.map((v) => [v.id, v.plate_number || v.ref_id || '']));
    return (entityType: string, entityId: string): string => {
      if (entityType === 'Driver') return dMap.get(entityId) || 'Unknown Driver';
      if (entityType === 'Vehicle') return vMap.get(entityId) || 'Unknown Vehicle';
      return entityType;
    };
  }, [drivers, vehicles]);

  // Combined documents + driver license records that are expiring or expired (<= 30 days)
  const items = useMemo<ExpiryRow[]>(() => {
    const list: ExpiryRow[] = [];
    const seenDriverDocIds = new Set<string>();

    // 1. Process uploaded documents
    for (const doc of docs) {
      if (doc.entity_type === 'Driver' && doc.doc_type === 'DriverLicense') {
        seenDriverDocIds.add(doc.entity_id);
      }
      const days = daysUntil(doc.expiry_date);
      if (days !== null && days <= 30) {
        list.push({
          id: doc.id,
          entity_type: doc.entity_type,
          entity_id: doc.entity_id,
          doc_type: doc.doc_type,
          entityName: nameFor(doc.entity_type, doc.entity_id),
          expiry_date: doc.expiry_date,
          file_url: doc.file_url,
          daysRemaining: days,
          status: getExpiryStatus(doc.expiry_date),
          source: 'document',
        });
      }
    }

    // 2. Process drivers with license expiry who don't already have an uploaded doc item
    for (const d of drivers) {
      if (d.license_expiry && !seenDriverDocIds.has(d.id)) {
        const days = daysUntil(d.license_expiry);
        if (days !== null && days <= 30) {
          list.push({
            id: `driver-lic-${d.id}`,
            entity_type: 'Driver',
            entity_id: d.id,
            doc_type: 'DriverLicense',
            entityName: `${d.first_name} ${d.last_name}`.trim(),
            expiry_date: typeof d.license_expiry === 'string' ? d.license_expiry : new Date(d.license_expiry).toISOString(),
            daysRemaining: days,
            status: getExpiryStatus(d.license_expiry),
            source: 'driver_profile',
          });
        }
      }
    }

    return list.sort((a, b) => a.daysRemaining - b.daysRemaining);
  }, [docs, drivers, nameFor]);

  const expiredCount = items.filter((i) => i.daysRemaining <= 0).length;
  const criticalCount = items.filter((i) => i.daysRemaining > 0 && i.daysRemaining <= 7).length;
  const upcomingCount = items.filter((i) => i.daysRemaining > 7 && i.daysRemaining <= 30).length;
  const totalRadarCount = items.length;

  const filteredItems = useMemo(() => {
    return items.filter((i) => {
      const matchesFilter =
        activeFilter === 'all'
          ? true
          : activeFilter === 'expired'
            ? i.daysRemaining <= 0
            : activeFilter === 'critical'
              ? i.daysRemaining > 0 && i.daysRemaining <= 7
              : i.daysRemaining > 7 && i.daysRemaining <= 30;

      const matchesTerm = matchesSearch(search, [
        i.entityName,
        documentDisplayName(i),
        i.entity_type,
        formatExpiryText(i.daysRemaining),
      ]);

      return matchesFilter && matchesTerm;
    });
  }, [items, activeFilter, search]);

  const entityDocsLink = (row: ExpiryRow): string => {
    if (row.entity_type === 'Driver') return `/drivers/${row.entity_id}/documents`;
    if (row.entity_type === 'Vehicle') return `/vehicles/${row.entity_id}/documents`;
    return '/documents';
  };

  const handleActionClick = (link: string) => {
    onClose();
    navigate(link);
  };

  const columns = [
    {
      header: 'Document / Permit',
      accessor: (row: ExpiryRow) => (
        <div className="flex items-center gap-2">
          <div className={cn(
            'w-7 h-7 rounded-lg flex items-center justify-center shrink-0 border text-xs',
            row.daysRemaining <= 0 
              ? 'bg-rose-50 border-rose-200 text-rose-600'
              : row.daysRemaining <= 7
                ? 'bg-amber-50 border-amber-200 text-amber-600'
                : 'bg-blue-50 border-blue-200 text-blue-600'
          )}>
            <FileText className="w-3.5 h-3.5" />
          </div>
          <div className="flex flex-col">
            <span className="font-extrabold text-slate-900 dark:text-slate-100 text-xs">
              {documentDisplayName(row)}
            </span>
            <span className="text-[10px] text-slate-400 font-mono">
              {row.source === 'document' ? 'Uploaded Vault Record' : 'Driver Profile License'}
            </span>
          </div>
        </div>
      ),
    },
    {
      header: 'Entity / Owner',
      accessor: (row: ExpiryRow) => (
        <div className="flex items-center gap-2">
          <span className="font-bold text-slate-800 dark:text-slate-200 text-xs">{row.entityName}</span>
          <Badge variant="outline" className="text-[9px] font-bold bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-700">
            {row.entity_type}
          </Badge>
        </div>
      ),
    },
    {
      header: 'Expiry Date',
      accessor: (row: ExpiryRow) => (
        <span className="font-mono text-xs font-semibold text-slate-700 dark:text-slate-300">
          {row.expiry_date ? formatInDeploymentTz(row.expiry_date, tz, 'MM/dd/yyyy') : '—'}
        </span>
      ),
    },
    {
      header: 'Expiry Radar Urgency',
      accessor: (row: ExpiryRow) => {
        if (row.daysRemaining <= 0) {
          return (
            <Badge variant="outline" className="bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-950/30 dark:text-rose-400 font-bold uppercase text-[10px]">
              <ShieldAlert className="w-3 h-3 mr-1" />
              {row.daysRemaining === 0 ? 'Expires Today' : `Expired (${Math.abs(row.daysRemaining)}d ago)`}
            </Badge>
          );
        } else if (row.daysRemaining <= 7) {
          return (
            <Badge variant="outline" className="bg-rose-50 text-rose-600 border-rose-200 dark:bg-rose-950/20 dark:text-rose-400 font-bold uppercase text-[10px]">
              <AlertTriangle className="w-3 h-3 mr-1 text-rose-500" /> Critical ({row.daysRemaining}d left)
            </Badge>
          );
        }
        return (
          <Badge variant="outline" className="bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/20 dark:text-amber-400 font-bold uppercase text-[10px]">
            <Clock className="w-3 h-3 mr-1 text-amber-600" /> Due Soon ({row.daysRemaining}d left)
          </Badge>
        );
      },
    },
    {
      header: 'Actions',
      headerClassName: 'text-right',
      accessor: (row: ExpiryRow) => {
        const link = entityDocsLink(row);
        return (
          <div className="flex items-center justify-end gap-1.5" onClick={(e) => e.stopPropagation()}>
            {row.file_url && (
              <a
                href={row.file_url}
                target="_blank"
                rel="noopener noreferrer"
                className="p-1.5 rounded-lg text-slate-600 hover:text-indigo-600 hover:bg-indigo-50 dark:hover:bg-indigo-950/40 transition-colors"
                title="View Document File"
              >
                <Eye size={14} />
              </a>
            )}
            <Button
              size="sm"
              onClick={() => handleActionClick(link)}
              className="h-7 text-xs font-bold bg-brand hover:bg-brand-hover text-white px-3 shadow-2xs rounded-md"
            >
              Update Permit
            </Button>
          </div>
        );
      },
    },
  ];

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-5xl max-h-[90vh] overflow-y-auto p-6 gap-6">
        <DialogHeader className="flex flex-row items-center justify-between border-b pb-4 border-slate-200 dark:border-slate-800">
          <div>
            <div className="flex items-center gap-2.5">
              <DialogTitle className="text-xl font-extrabold text-slate-900 dark:text-slate-100 tracking-tight">
                Document Expiry Radar
              </DialogTitle>
              <Badge variant="outline" className="bg-rose-50 text-rose-700 border-rose-200 font-bold text-[10px] uppercase px-2 py-0.5">
                Compliance Horizon
              </Badge>
            </div>
            <DialogDescription className="text-xs text-slate-500 font-medium mt-1">
              Active real-time monitoring for licenses, istimaras, and insurance expiring within 30 days
            </DialogDescription>
          </div>
        </DialogHeader>

        {/* 4-Card Instrument Panel KPI Section */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <KpiCard
            title="ALREADY EXPIRED"
            value={expiredCount}
            variant="rose"
            trend={expiredCount > 0 ? 'down' : 'neutral'}
            trendValue={expiredCount > 0 ? `${expiredCount} Immediate Risk` : 'Zero Expired'}
            description="Lapsed legal permits"
            icon={RiskAlert}
            progressSegments={[
              { label: 'Expired', value: expiredCount > 0 ? 100 : 0, color: 'bg-rose-600' },
            ]}
            isActive={activeFilter === 'expired'}
            onClick={() => setActiveFilter(activeFilter === 'expired' ? 'all' : 'expired')}
          />
          <KpiCard
            title="CRITICAL (<=7 DAYS)"
            value={criticalCount}
            variant="rose"
            trend={criticalCount > 0 ? 'down' : 'neutral'}
            trendValue={criticalCount > 0 ? `${criticalCount} Action Due` : 'All Clear'}
            description="Renewal required this week"
            icon={CalendarAlert}
            progressSegments={[
              { label: 'Critical (<7d)', value: criticalCount > 0 ? 100 : 0, color: 'bg-rose-500' },
            ]}
            isActive={activeFilter === 'critical'}
            onClick={() => setActiveFilter(activeFilter === 'critical' ? 'all' : 'critical')}
          />
          <KpiCard
            title="UPCOMING (30 DAYS)"
            value={upcomingCount}
            variant="slate"
            trend="neutral"
            trendValue="30-Day Window"
            description="Scheduled for renewal"
            icon={Clock}
            progressSegments={[
              { label: 'Upcoming (30d)', value: upcomingCount > 0 ? 100 : 0, color: 'bg-slate-400' },
            ]}
            isActive={activeFilter === 'upcoming'}
            onClick={() => setActiveFilter(activeFilter === 'upcoming' ? 'all' : 'upcoming')}
          />
          <KpiCard
            title="TOTAL RADAR ITEMS"
            value={totalRadarCount}
            variant="slate"
            trend="neutral"
            trendValue={`${totalRadarCount} items monitored`}
            description="Compliance renewal queue"
            icon={CheckBadge}
            progressSegments={[
              { label: `${expiredCount} Expired`, value: expiredCount, color: 'bg-rose-600' },
              { label: `${criticalCount} Critical`, value: criticalCount, color: 'bg-rose-500' },
              { label: `${upcomingCount} Upcoming`, value: upcomingCount, color: 'bg-slate-400' },
            ]}
            isActive={activeFilter === 'all'}
            onClick={() => setActiveFilter('all')}
          />
        </div>

        {/* Content Workspace: Data Table */}
        {isErrorDocs ? (
          <div className="p-8 text-center text-rose-600 text-xs font-bold bg-white rounded-xl border border-slate-200">
            Failed to load radar documents.
          </div>
        ) : filteredItems.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 gap-3 text-slate-400 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800">
            <CheckCircle2 className="w-7 h-7 text-emerald-600 shrink-0" />
            <div className="text-center">
              <p className="text-sm font-bold text-slate-800 dark:text-slate-200">
                {activeFilter === 'all' ? 'All monitored documents are compliant and valid' : `No ${activeFilter} documents found`}
              </p>
              <p className="text-xs text-slate-400 mt-0.5">
                {activeFilter === 'all' ? 'No legal permits or licenses are expiring within 30 days.' : 'Try selecting another radar category above.'}
              </p>
            </div>
          </div>
        ) : (
          <DataTable
            title={
              <span className="flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-amber-500" />
                <span>
                  Document Expiry Radar Ledger {activeFilter !== 'all' && `(${activeFilter.toUpperCase()})`}
                </span>
              </span>
            }
            columns={columns}
            data={filteredItems}
            compact={true}
            bulkActions={[
              {
                label: 'Export Excel',
                icon: <FileSpreadsheet size={13} className="text-emerald-600" />,
                variant: 'secondary' as const,
                onClick: (selectedRows: ExpiryRow[]) => {
                  handleExportExpiry(selectedRows, 'excel');
                }
              },
              {
                label: 'Export PDF',
                icon: <FileText size={13} className="text-rose-600" />,
                variant: 'secondary' as const,
                onClick: (selectedRows: ExpiryRow[]) => {
                  handleExportExpiry(selectedRows, 'pdf');
                }
              }
            ]}
            enableSelection={true}
            isLoading={isLoading}
            searchPlaceholder="Search entity name, document type, or status..."
            searchValue={search}
            onSearchChange={setSearch}
          />
        )}
      </DialogContent>
    </Dialog>
  );
}

