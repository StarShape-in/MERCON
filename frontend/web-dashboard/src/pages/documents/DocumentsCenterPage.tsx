import { useMemo, useState, useEffect } from 'react';
import { 
  UploadCloud, FileText, FolderOpen, Shield, Car, User as UserIcon, Eye, Download,
  RotateCw, AlertTriangle, CheckCircle2, FileCheck, Briefcase, Clock, ChevronLeft, ChevronRight,
  ChevronsLeft, ChevronsRight, FileBadge2, FileBarChart2, FileClock, FileKey2, LayoutGrid, List, Check, HardDrive, Files,
  ExternalLink, Trash2, Filter, ShieldAlert, ArrowUpDown, X, FileSpreadsheet, FolderPlus, FolderInput, Folder, CheckSquare, Truck, Sparkles, Loader2, ChevronDown, ArrowRight,
  Hash, Building2, Calendar, Search, Lock, Globe, FileCog
} from 'lucide-react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { toast } from 'sonner';

import DashboardLayout from '@/components/layout/DashboardLayout';
import KpiCard from '@/components/ui/KpiCard';
import DataTable, { Column } from '@/components/ui/DataTable';
import ConfirmModal from '@/components/ui/ConfirmModal';
import BulkActionBar from '@/components/ui/BulkActionBar';
import { CalendarAlert as CalendarAlertIcon, DriverBadge, FleetTruck, CheckBadge } from '@/components/ui/kpi-icons';
import { documentService, type MerconDocument, type DocType, type OwnerFoldersSummaryRow } from '@/services/documentService';
import { folderService, type MerconFolder } from '@/services/folderService';
import { downloadCSV, exportExcelTable, exportPDFTable } from '@/utils/exportUtils';
import { driverService } from '@/services/driverService';
import { vehicleService } from '@/services/vehicleService';
import { tripService } from '@/services/tripService';
import { customerService } from '@/services/customerService';
import { documentDisplayName, categoryForDocType, categoryForEntity, type DocCategory, daysUntil, getExpiryStatus, formatExpiryText, resolveFileUrl, formatBilingualAuthority, formatDocDate } from '@/lib/documents';
import FolderCardSection from '@/components/documents/FolderCardSection';
import SingleDocumentCard from '@/components/documents/SingleDocumentCard';
import ImportReviewModal from '@/components/documents/ImportReviewModal';
import DocumentTypeAdminSection from '@/components/documents/DocumentTypeAdminSection';

import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import UploadDocumentModal from '@/components/ui/UploadDocumentModal';
import ExpiryRadarModal from '@/components/ui/ExpiryRadarModal';
import CreateFolderModal from '@/components/ui/CreateFolderModal';
import CreateFolderChoiceModal from '@/components/ui/CreateFolderChoiceModal';
import OwnerFolderPickerModal from '@/components/ui/OwnerFolderPickerModal';
import MoveToFolderModal from '@/components/ui/MoveToFolderModal';
import { AutoAssignModal } from '@/components/ui/AutoAssignModal';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Combobox, type ComboboxOption } from '@/components/ui/combobox';
import { cn } from '@/lib/utils';
import { matchesSearch } from '@/lib/search';
import { useDeploymentTimezone, formatInDeploymentTz } from '@/lib/datetime';

// ─── Category & Icon Config ──────────────────────────────────────────────────

type PillCategory = 'Vehicles' | 'Drivers' | 'Company' | 'Operations' | 'Other' | 'All' | 'Unassigned';
const CATEGORY_TABS: PillCategory[] = ['Vehicles', 'Drivers', 'Company', 'Operations'];
const PILL_LABEL: Record<PillCategory, string> = {
  All: 'All Documents',
  Vehicles: 'Vehicle Documents',
  Drivers: 'Driver Documents',
  Company: 'Company Documents',
  Operations: 'Operations & Transportation',
  Other: 'Company Documents',
  Unassigned: 'Unassigned',
};

const CATEGORY_CONFIG: Record<PillCategory, {
  icon: React.ElementType;
  color: string;
  iconBg: string;
  borderColor: string;
  activeCardStyle: string;
  activePillStyle: string;
  label: string;
  description: string;
}> = {
  Vehicles: {
    icon: Truck,
    color: 'text-emerald-600 dark:text-emerald-400',
    iconBg: 'bg-emerald-50 dark:bg-emerald-950/40',
    borderColor: 'border-emerald-200/80 dark:border-emerald-800',
    activeCardStyle: 'border-emerald-500 dark:border-emerald-400 ring-2 ring-emerald-500/20 bg-emerald-50/20 dark:bg-emerald-950/20 shadow-xs',
    activePillStyle: 'bg-emerald-600 text-white border-emerald-600 dark:bg-emerald-500 dark:text-slate-950 dark:border-emerald-500',
    label: 'Vehicle Documents',
    description: 'Registrations, insurance & Istimara',
  },
  Drivers: {
    icon: UserIcon,
    color: 'text-purple-600 dark:text-purple-400',
    iconBg: 'bg-purple-50 dark:bg-purple-950/40',
    borderColor: 'border-purple-200/80 dark:border-purple-800',
    activeCardStyle: 'border-purple-500 dark:border-purple-400 ring-2 ring-purple-500/20 bg-purple-50/20 dark:bg-purple-950/20 shadow-xs',
    activePillStyle: 'bg-purple-600 text-white border-purple-600 dark:bg-purple-500 dark:text-slate-950 dark:border-purple-500',
    label: 'Driver Documents',
    description: 'Licenses, medical certificates & permits',
  },
  Company: {
    icon: Briefcase,
    color: 'text-blue-600 dark:text-blue-400',
    iconBg: 'bg-blue-50 dark:bg-blue-950/40',
    borderColor: 'border-blue-200/80 dark:border-blue-800',
    activeCardStyle: 'border-blue-500 dark:border-blue-400 ring-2 ring-blue-500/20 bg-blue-50/20 dark:bg-blue-950/20 shadow-xs',
    activePillStyle: 'bg-blue-600 text-white border-blue-600 dark:bg-blue-500 dark:text-slate-950 dark:border-blue-500',
    label: 'Company Documents',
    description: 'Contracts, invoices & corporate filings',
  },
  Operations: {
    icon: FileText,
    color: 'text-amber-600 dark:text-amber-400',
    iconBg: 'bg-amber-50 dark:bg-amber-950/40',
    borderColor: 'border-amber-200/80 dark:border-amber-800',
    activeCardStyle: 'border-amber-500 dark:border-amber-400 ring-2 ring-amber-500/20 bg-amber-50/20 dark:bg-amber-950/20 shadow-xs',
    activePillStyle: 'bg-amber-600 text-white border-amber-600 dark:bg-amber-500 dark:text-slate-950 dark:border-amber-500',
    label: 'Operations & Transportation',
    description: 'Waybills, PODs & customs clearance',
  },
  Other: {
    icon: Briefcase,
    color: 'text-blue-600 dark:text-blue-400',
    iconBg: 'bg-blue-50 dark:bg-blue-950/40',
    borderColor: 'border-blue-200/80 dark:border-blue-800',
    activeCardStyle: 'border-blue-500 dark:border-blue-400 ring-2 ring-blue-500/20 bg-blue-50/20 dark:bg-blue-950/20 shadow-xs',
    activePillStyle: 'bg-blue-600 text-white border-blue-600 dark:bg-blue-500 dark:text-slate-950 dark:border-blue-500',
    label: 'Company Documents',
    description: 'Contracts, invoices & corporate filings',
  },
  All: {
    icon: FolderOpen,
    color: 'text-brand',
    iconBg: 'bg-brand/10',
    borderColor: 'border-brand/20',
    activeCardStyle: 'border-slate-800 dark:border-slate-200 ring-2 ring-slate-800/10 shadow-xs',
    activePillStyle: 'bg-slate-900 text-white border-slate-900 dark:bg-slate-100 dark:text-slate-900 dark:border-slate-100',
    label: 'All Documents',
    description: 'All document repository files',
  },
  Unassigned: {
    icon: Sparkles,
    color: 'text-amber-600',
    iconBg: 'bg-amber-50',
    borderColor: 'border-amber-200',
    activeCardStyle: 'border-amber-500 dark:border-amber-400 ring-2 ring-amber-500/20 shadow-xs',
    activePillStyle: 'bg-amber-600 text-white border-amber-600',
    label: 'Unassigned',
    description: 'Unlinked document attachments',
  },
};

const DOC_TYPE_ICON: Record<string, React.ElementType> = {
  DriverLicense:          FileBadge2,
  Passport:               FileBadge2,
  VehicleRegistration:    FileKey2,
  Insurance:              FileCheck,
  POD:                    FileCheck,
  CustomsClearance:       FileKey2,
  Waybill:                FileClock,
  Contract:               FileText,
  Invoice:                FileBarChart2,
  Emergency:              ShieldAlert,
  CustomerDoc:            Briefcase,
  CommercialRegistration: Briefcase,
};

const REGULATORY_BODY: Record<string, string> = {
  DriverLicense:          'Saudi MOT / Transport Auth',
  Passport:               'Passport Authority',
  VehicleRegistration:    'MOMRAH / Istimara',
  Insurance:              'Najm Insurance Protection',
  POD:                    'MERCON Dispatch System',
  CustomsClearance:       'ZATCA Saudi Customs',
  Waybill:                'Saudi Land Transport Auth',
  Contract:               'Ministry of Commerce / Corporate MSA',
  Invoice:                'ZATCA Tax Authority',
  Emergency:              'Civil Defense / Operations Center',
  CustomerDoc:            'Corporate CR & Onboarding Files',
  CommercialRegistration: 'Ministry of Commerce CR Certificate',
};

const EXPIRY_BADGE: Record<string, { label: string; className: string }> = {
  expired:  { label: 'Expired',      className: 'bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-950/30 dark:text-rose-400 dark:border-rose-800/50' },
  critical: { label: 'Critical <7d', className: 'bg-rose-50 text-rose-600 border-rose-200 dark:bg-rose-950/20 dark:text-rose-400 dark:border-rose-800/40' },
  warning:  { label: 'Due Soon',     className: 'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/20 dark:text-amber-400 dark:border-amber-800/40' },
  valid:    { label: 'Valid',         className: 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/20 dark:text-emerald-400 dark:border-emerald-800/40' },
  none:     { label: 'No Expiry',    className: 'bg-slate-50 text-slate-500 border-slate-200 dark:bg-slate-800 dark:text-slate-400 dark:border-slate-700' },
};

// ─── Enriched Document Type ──────────────────────────────────────────────────

type EnrichedDocument = MerconDocument & {
  entityName: string;
  category: DocCategory;
  expStatus: 'expired' | 'critical' | 'warning' | 'valid' | 'none';
  daysLeft: number | null;
  issuer: string;
};

// ─── Filter & Sort Helpers ──────────────────────────────────────────────────

function matchesFolderExpiryFilter(row: OwnerFoldersSummaryRow, filter: string): boolean {
  if (filter === 'all') return true;

  const hasExpired = row.slots.some((s) => s.status === 'EXPIRED');
  const hasExpiring = row.slots.some((s) => s.status === 'EXPIRING_SOON');
  const hasMissing = row.slots.some((s) => s.status === 'MISSING');
  const allValid = row.slots.length > 0 && row.slots.every((s) => s.status === 'VALID');

  if (filter === 'warning') return hasExpired || hasExpiring || hasMissing;
  if (filter === 'expired') return hasExpired;
  if (filter === 'critical') return hasExpired || hasExpiring;
  if (filter === 'valid') return allValid;
  return true;
}

function sortFolderRows(rows: OwnerFoldersSummaryRow[], sortBy: string): OwnerFoldersSummaryRow[] {
  return [...rows].sort((a, b) => {
    if (sortBy === 'name_asc' || sortBy === 'plate') {
      const nameA = (a.ownerName || a.ownerRef || '').toLowerCase();
      const nameB = (b.ownerName || b.ownerRef || '').toLowerCase();
      return nameA.localeCompare(nameB);
    }

    if (sortBy === 'name_desc') {
      const nameA = (a.ownerName || a.ownerRef || '').toLowerCase();
      const nameB = (b.ownerName || b.ownerRef || '').toLowerCase();
      return nameB.localeCompare(nameA);
    }

    if (sortBy === 'attention') {
      const countA = a.slots.filter((s) => s.status !== 'VALID').length;
      const countB = b.slots.filter((s) => s.status !== 'VALID').length;
      if (countA !== countB) return countB - countA;

      const expA = a.slots.filter((s) => s.status === 'EXPIRED').length;
      const expB = b.slots.filter((s) => s.status === 'EXPIRED').length;
      if (expA !== expB) return expB - expA;
    }

    if (sortBy === 'expiry') {
      const getEarliestExpiry = (r: OwnerFoldersSummaryRow) => {
        const dates = r.slots
          .map((s) => s.expiry_date)
          .filter(Boolean)
          .map((d) => new Date(d!).getTime())
          .filter((t) => !isNaN(t));
        return dates.length > 0 ? Math.min(...dates) : Infinity;
      };
      const timeA = getEarliestExpiry(a);
      const timeB = getEarliestExpiry(b);
      if (timeA !== timeB) return timeA - timeB;
    }

    if (sortBy === 'recent') {
      const getLatestDate = (r: OwnerFoldersSummaryRow) => {
        const dateStr = (r as any).lastUpdated || (r as any).updatedAt;
        return dateStr ? new Date(dateStr).getTime() : 0;
      };
      return getLatestDate(b) - getLatestDate(a);
    }

    return 0;
  });
}

function isImageFile(url: string, mime?: string | null): boolean {
  if (mime && mime.startsWith('image/')) return true;
  if (!url) return false;
  return /\.(png|jpe?g|gif|webp|svg)(\?.*)?$/i.test(url);
}

function isPdfFile(url: string, mime?: string | null): boolean {
  if (mime === 'application/pdf') return true;
  if (!url) return false;
  return /\.pdf(\?.*)?$/i.test(url);
}

function sortDocumentList(docsList: EnrichedDocument[], sortBy: string): EnrichedDocument[] {
  return [...docsList].sort((a, b) => {
    if (sortBy === 'name_asc' || sortBy === 'plate') {
      const nameA = (a.entityName || documentDisplayName(a)).toLowerCase();
      const nameB = (b.entityName || documentDisplayName(b)).toLowerCase();
      return nameA.localeCompare(nameB);
    }

    if (sortBy === 'name_desc') {
      const nameA = (a.entityName || documentDisplayName(a)).toLowerCase();
      const nameB = (b.entityName || documentDisplayName(b)).toLowerCase();
      return nameB.localeCompare(nameA);
    }

    if (sortBy === 'doc_type') {
      const typeA = (documentDisplayName(a) || a.doc_type).toLowerCase();
      const typeB = (documentDisplayName(b) || b.doc_type).toLowerCase();
      return typeA.localeCompare(typeB);
    }

    if (sortBy === 'attention') {
      const statusWeight: Record<string, number> = {
        expired: 4,
        critical: 3,
        warning: 2,
        none: 1,
        valid: 0,
      };
      const weightA = statusWeight[a.expStatus] ?? 0;
      const weightB = statusWeight[b.expStatus] ?? 0;
      if (weightA !== weightB) return weightB - weightA;
    }

    if (sortBy === 'expiry') {
      const timeA = a.expiry_date ? new Date(a.expiry_date).getTime() : Infinity;
      const timeB = b.expiry_date ? new Date(b.expiry_date).getTime() : Infinity;
      if (timeA !== timeB) return timeA - timeB;
    }

    if (sortBy === 'recent') {
      const timeA = a.createdAt ? new Date(a.createdAt).getTime() : 0;
      const timeB = b.createdAt ? new Date(b.createdAt).getTime() : 0;
      return timeB - timeA;
    }

    return 0;
  });
}

// ─── Main Page Component ──────────────────────────────────────────────────────

export default function DocumentsCenterPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [searchParams, setSearchParams] = useSearchParams();
  const tz = useDeploymentTimezone();

  // Initial params from URL
  const initialFilter = (searchParams.get('filter') as any) || 'all';
  const rawInitialCategory = searchParams.get('category') || 'Vehicles';
  const initialSearch = searchParams.get('search') || '';
  const initialSort = searchParams.get('sort') || 'attention';
  const initialView = searchParams.get('view') === 'list' ? 'list' : 'folders';

  const initialCategory: PillCategory =
    (CATEGORY_TABS as string[]).includes(rawInitialCategory) ? (rawInitialCategory as PillCategory) : 'Vehicles';
  const initialRadar = searchParams.get('radar') === 'open';

  // State
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [activeCategory, setActiveCategory] = useState<PillCategory>(initialCategory);
  const [expiryFilter, setExpiryFilter] = useState<'all' | 'expired' | 'critical' | 'warning' | 'valid'>(
    ['all', 'expired', 'critical', 'warning', 'valid'].includes(initialFilter) ? initialFilter : 'all'
  );
  const [search, setSearch] = useState(initialSearch);
  const [sortBy, setSortBy] = useState<'attention' | 'expiry' | 'plate' | 'recent'>(
    ['attention', 'expiry', 'plate', 'recent'].includes(initialSort) ? (initialSort as any) : 'attention'
  );
  const [viewMode, setViewMode] = useState<'folders' | 'list'>(initialView);
  const [opsSubFilter, setOpsSubFilter] = useState<'all' | 'Waybill' | 'POD' | 'CustomsClearance' | 'Emergency'>('all');
  const [companySubFilter, setCompanySubFilter] = useState<'all' | 'Contract' | 'Invoice' | 'CustomerDoc'>('all');

  const updateUrlParams = (key: string, val: string) => {
    setSearchParams((prev) => {
      const next = new URLSearchParams(prev);
      if (!val || val === 'all' || val === 'folders' || val === 'attention' || val === 'Vehicles') {
        next.delete(key);
      } else {
        next.set(key, val);
      }
      return next;
    });
  };

  const handleSearchChange = (val: string) => {
    setSearch(val);
    updateUrlParams('search', val);
  };

  const handleFilterChange = (val: 'all' | 'expired' | 'critical' | 'warning' | 'valid') => {
    setExpiryFilter(val);
    updateUrlParams('filter', val);
  };

  const handleSortChange = (val: 'attention' | 'expiry' | 'plate' | 'recent') => {
    setSortBy(val);
    updateUrlParams('sort', val);
  };

  const handleViewChange = (val: 'folders' | 'list') => {
    setViewMode(val);
    updateUrlParams('view', val);
  };

  const [mainTab, setMainTab] = useState<'vault' | 'types'>('vault');
  const [isAutoAssigning, setIsAutoAssigning] = useState(false);
  const [isAutoAssignModalOpen, setIsAutoAssignModalOpen] = useState(false);
  const [selectedDocIds, setSelectedDocIds] = useState<string[]>([]);
  const [previewDoc, setPreviewDoc] = useState<EnrichedDocument | null>(null);
  const [uploadMissingTarget, setUploadMissingTarget] = useState<{ row: OwnerFoldersSummaryRow; slotCode: string } | null>(null);
  const [docRotation, setDocRotation] = useState<number>(0);
  const [isUploadOpen, setIsUploadOpen] = useState(false);
  const [isImportOpen, setIsImportOpen] = useState(false);
  const [isFolderChoiceOpen, setIsFolderChoiceOpen] = useState(false);
  const [isCreateFolderOpen, setIsCreateFolderOpen] = useState(false);
  const [isOwnerFolderPickerOpen, setIsOwnerFolderPickerOpen] = useState(false);
  const [selectedFolderId, setSelectedFolderId] = useState<string | null>(null);
  const [moveTargetDocIds, setMoveTargetDocIds] = useState<string[]>([]);
  const [isMoveModalOpen, setIsMoveModalOpen] = useState(false);
  const [isExpiryModalOpen, setIsExpiryModalOpen] = useState(initialRadar);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isDownloadingZip, setIsDownloadingZip] = useState(false);
  const [deleteDocId, setDeleteDocId] = useState<string | null>(null);
  const [deleteFolderId, setDeleteFolderId] = useState<string | null>(null);
  const [bulkDeleteIds, setBulkDeleteIds] = useState<string[]>([]);
  const [isBulkDeleteOpen, setIsBulkDeleteOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  const handleExportDocs = (docs: MerconDocument[], format: 'excel' | 'pdf') => {
    if (!docs.length) return;
    const headers = ['Ref ID', 'Title', 'Document Type', 'Issue Date', 'Expiry Date', 'Status', 'Days Remaining', 'Owner Type', 'Owner ID'];
    const dataRows = docs.map((d) => {
      const expiry = d.expiry_date ? new Date(d.expiry_date) : null;
      const days = expiry ? Math.ceil((expiry.getTime() - new Date().getTime()) / (1000 * 3600 * 24)) : null;
      const remainingStr = days === null ? 'N/A' : days <= 0 ? 'Expired' : `${days} days`;

      return [
        (d as any).ref_id || d.id || '',
        (d as any).title || (d as any).document_number || '',
        d.doc_type || '',
        d.issue_date ? d.issue_date.slice(0, 10) : '',
        d.expiry_date ? d.expiry_date.slice(0, 10) : '',
        d.status || '',
        remainingStr,
        (d as any).owner_type || (d as any).entity_type || '',
        (d as any).owner_id || (d as any).entity_id || '',
      ];
    });

    const title = 'Documents Center Export';
    const filename = `documents_export_${new Date().toISOString().slice(0, 10)}.${format === 'excel' ? 'xlsx' : 'pdf'}`;
    if (format === 'excel') {
      exportExcelTable(title, headers, dataRows, filename);
    } else {
      exportPDFTable(title, headers, dataRows, filename);
    }
  };

  // Sync state with URL params when they change
  useEffect(() => {
    const filterParam = searchParams.get('filter');
    if (filterParam && ['all', 'expired', 'critical', 'warning', 'valid'].includes(filterParam)) {
      setExpiryFilter(filterParam as any);
    }
    const catParam = searchParams.get('category');
    if (catParam && (CATEGORY_TABS as string[]).includes(catParam)) {
      setActiveCategory(catParam as PillCategory);
    }
    if (searchParams.get('radar') === 'open') {
      setIsExpiryModalOpen(true);
    }
  }, [searchParams]);

  // Reset page to 1 when filters or search change
  useEffect(() => {
    setCurrentPage(1);
  }, [activeCategory, expiryFilter, search]);

  // Queries
  const { data: docs = [], isLoading, isError } = useQuery({
    queryKey: ['documents', 'all'],
    queryFn: async () => (await documentService.getAll({ per_page: 2000 })).data,
  });
  const { data: folders = [] } = useQuery({
    queryKey: ['folders'],
    queryFn: async () => (await folderService.getAll()).data,
  });
  const { data: drivers = [] } = useQuery({
    queryKey: ['drivers', 'lookup'],
    queryFn: async () => (await driverService.getAll({ per_page: 1000, mode: 'lookup' })).data,
  });
  const { data: vehicles = [] } = useQuery({
    queryKey: ['vehicles', 'lookup'],
    queryFn: async () => (await vehicleService.getAll({ per_page: 1000, mode: 'lookup' })).data,
  });
  const { data: trips = [] } = useQuery({
    queryKey: ['trips', 'lookup'],
    queryFn: async () => (await tripService.getAll({ per_page: 100 })).data,
  });
  const { data: customers = [] } = useQuery({
    queryKey: ['customers', 'lookup'],
    queryFn: async () => (await customerService.getAll({ per_page: 500, mode: 'lookup' })).data,
  });
  // Every Driver/Vehicle's mandatory checklist in one call each — powers the
  // owner-first folder cards below (includes owners with zero uploads, so
  // "Missing" is visible even before anything has ever been uploaded for them).
  const { data: driverFolders = [] } = useQuery({
    queryKey: ['documents', 'owner-folders', 'Driver'],
    queryFn: () => documentService.getOwnerFolders('Driver'),
  });
  const { data: vehicleFolders = [] } = useQuery({
    queryKey: ['documents', 'owner-folders', 'Vehicle'],
    queryFn: () => documentService.getOwnerFolders('Vehicle'),
  });
  const filteredDriverFolders = useMemo(
    () => {
      const searchAndStatusFiltered = driverFolders.filter((r) =>
        matchesSearch(search, [
          r.ownerName,
          r.ownerRef || '',
          r.relatedName || '',
          ...r.slots.map((s) => s.name),
          ...r.slots.map((s) => s.code),
        ]) && matchesFolderExpiryFilter(r, expiryFilter)
      );
      return sortFolderRows(searchAndStatusFiltered, sortBy);
    },
    [driverFolders, search, expiryFilter, sortBy],
  );

  const filteredVehicleFolders = useMemo(
    () => {
      const searchAndStatusFiltered = vehicleFolders.filter((r) =>
        matchesSearch(search, [
          r.ownerName,
          r.ownerRef || '',
          r.relatedName || '',
          ...r.slots.map((s) => s.name),
          ...r.slots.map((s) => s.code),
        ]) && matchesFolderExpiryFilter(r, expiryFilter)
      );
      return sortFolderRows(searchAndStatusFiltered, sortBy);
    },
    [vehicleFolders, search, expiryFilter, sortBy]
  );

  const handleSelectCategory = (cat: PillCategory) => {
    setActiveCategory(cat);
    setSearchParams((prev) => {
      const next = new URLSearchParams(prev);
      if (cat === 'All') {
        next.delete('category');
      } else {
        next.set('category', cat);
      }
      return next;
    });
  };

  const [isAiOcrRunning, setIsAiOcrRunning] = useState(false);
  const [extractingRowId, setExtractingRowId] = useState<string | null>(null);

  const handleSingleDocAiOcr = async (docId: string, docLabel: string) => {
    setExtractingRowId(docId);
    toast.info(`Extracting metadata via Gemini AI Vision for ${docLabel}...`);
    try {
      await documentService.extractDocumentOcr(docId);
      toast.success(`Successfully extracted & saved AI metadata for ${docLabel}!`);
      await queryClient.invalidateQueries({ queryKey: ['documents'] });
      await queryClient.invalidateQueries({ queryKey: ['vehicles'] });
    } catch (err: any) {
      toast.error('AI extraction error: ' + (err.message || 'Failed to extract metadata'));
    } finally {
      setExtractingRowId(null);
    }
  };

  const handleBulkExtractSelectedDocs = async (targetIds: string[]) => {
    if (!targetIds || targetIds.length === 0) {
      toast.error('Please select at least one document row');
      return;
    }
    setIsAiOcrRunning(true);
    try {
      toast.info(`Extracting AI metadata via Gemini Vision for ${targetIds.length} selected document(s)...`);
      const res = await documentService.bulkOcrExtract(false, targetIds.length, targetIds);
      toast.success(res.message || `Successfully extracted AI metadata for ${targetIds.length} document(s)!`);
      await queryClient.invalidateQueries({ queryKey: ['documents'] });
      await queryClient.invalidateQueries({ queryKey: ['vehicles'] });
    } catch (err: any) {
      toast.error(err.response?.data?.error?.message || err.message || 'AI OCR Extraction failed');
    } finally {
      setIsAiOcrRunning(false);
    }
  };

  const handleAutoAssignUnlinkedDocs = () => {
    setIsAutoAssignModalOpen(true);
  };

  const handleBulkDownload = async () => {
    if (selectedDocIds.length === 0) return;
    setIsDownloadingZip(true);
    try {
      const blob = await documentService.bulkDownloadZip(selectedDocIds);
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `documents-${new Date().toISOString().slice(0, 10)}.zip`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    } catch (e) {
      toast.error('Failed to download document archive');
    } finally {
      setIsDownloadingZip(false);
    }
  };

  const handleSingleAssignEntity = async (docId: string, entityType: string, entityId: string) => {
    if (!docId || !entityType || !entityId || entityId === 'unassigned') return;
    try {
      toast.loading('Linking document to ' + entityType + '...', { id: 'assign-doc' });
      await documentService.confirmAutoAssign([{ docId, entityType, entityId }]);
      toast.success('Document entity updated successfully!', { id: 'assign-doc' });
      await queryClient.invalidateQueries({ queryKey: ['documents'] });
      await queryClient.invalidateQueries({ queryKey: ['folders'] });
      await queryClient.invalidateQueries({ queryKey: ['vehicles'] });
      await queryClient.invalidateQueries({ queryKey: ['drivers'] });
      if (previewDoc && previewDoc.id === docId) {
        setPreviewDoc((prev) => prev ? { ...prev, entity_type: entityType, entity_id: entityId } : null);
      }
    } catch (err: any) {
      toast.error('Failed assigning document: ' + (err.message || 'Error'), { id: 'assign-doc' });
    }
  };

  const handleRefresh = async () => {
    setIsRefreshing(true);
    await queryClient.invalidateQueries({ queryKey: ['documents'] });
    setTimeout(() => setIsRefreshing(false), 500);
  };

  // Entity lookup name map
  const nameFor = useMemo(() => {
    const dMap = new Map(drivers.map((d) => [d.id, `${d.first_name} ${d.last_name}`.trim()]));
    const vMap = new Map(vehicles.map((v) => [v.id, v.plate_number || v.ref_id || '']));
    const tMap = new Map(trips.map((t) => [t.id, t.ref_id || `Trip #${t.id.slice(0, 8)}`]));
    const cMap = new Map(customers.map((c) => [c.id, c.name]));

    return (doc: MerconDocument): string => {
      if (doc.entity_type === 'Driver') return dMap.get(doc.entity_id) || 'Unknown Driver';
      if (doc.entity_type === 'Vehicle') return vMap.get(doc.entity_id) || 'Unknown Vehicle';
      if (doc.entity_type === 'Trip') return tMap.get(doc.entity_id) || 'Trip Operations';
      if (doc.entity_type === 'Customer') return cMap.get(doc.entity_id) || 'Customer Account';
      if (doc.entity_type === 'MaintenanceRecord') return vMap.get(doc.entity_id) || 'Maintenance Service';
      return doc.entity_type;
    };
  }, [drivers, vehicles, trips, customers]);

  // Grouped Folders by Category
  const foldersByCategory = useMemo(() => {
    const map: Record<DocCategory, { count: number; docTypes: string[] }> = {
      Drivers: { count: 0, docTypes: [] },
      Vehicles: { count: 0, docTypes: [] },
      Operations: { count: 0, docTypes: [] },
      Company: { count: 0, docTypes: [] },
    };

    for (const d of docs) {
      const cat = categoryForEntity(d.entity_type);
      map[cat].count += 1;
      if (!map[cat].docTypes.includes(d.doc_type)) {
        map[cat].docTypes.push(d.doc_type);
      }
    }
    return map;
  }, [docs]);

  // Enriched & Filtered Documents
  const filteredDocs = useMemo(() => {
    const list = docs
      .map((d) => ({
        ...d,
        entityName: nameFor(d),
        category: categoryForEntity(d.entity_type),
        expStatus: getExpiryStatus(d.expiry_date),
        daysLeft: daysUntil(d.expiry_date),
        issuer: REGULATORY_BODY[d.doc_type] || 'Saudi Authority',
      }))
      .filter((d) => {
        const vIds = new Set(vehicles.map((v) => v.id));
        const dIds = new Set(drivers.map((d) => d.id));
        const plateDigits = new Set(vehicles.map((v) => (v.plate_number || '').replace(/\D/g, '')).filter((s) => s.length >= 3));

        const fileUrlNorm = (d.file_url || '').toLowerCase();
        let hasPlateMatch = false;
        for (const digits of plateDigits) {
          if (fileUrlNorm.includes(digits)) {
            hasPlateMatch = true;
            break;
          }
        }

        const isUnlinked = (
          (d.entity_type === 'Vehicle' && !vIds.has(d.entity_id) && !hasPlateMatch) ||
          (d.entity_type === 'Driver' && !dIds.has(d.entity_id)) ||
          (!['Vehicle', 'Driver', 'Trip', 'Customer', 'Company', 'Operations'].includes(d.entity_type) && !hasPlateMatch)
        );

        const matchesCat = activeCategory === 'All'
          ? true
          : activeCategory === 'Unassigned'
            ? isUnlinked
            : d.category === activeCategory;
        const matchesExpiry = expiryFilter === 'all' 
          ? true 
          : expiryFilter === 'warning' 
            ? (d.expStatus === 'warning' || d.expStatus === 'critical')
            : d.expStatus === expiryFilter;
        const matchesFolder = !selectedFolderId || d.folderId === selectedFolderId;
        const matchesTerm = matchesSearch(search, [
          documentDisplayName(d),
          d.entityName,
          d.issuer,
          d.id,
        ]);
        return matchesCat && matchesExpiry && matchesFolder && matchesTerm;
      });
    return sortDocumentList(list, sortBy);
  }, [docs, nameFor, activeCategory, expiryFilter, selectedFolderId, search, sortBy]);

  // ── Calculated Real Vault Telematics ──────────────────────────────────────────
  const totalDocsCount = docs.length;

  // Overdue / expired: <= 0 days
  const expiredDocs = useMemo(() => docs.filter((d) => {
    const days = daysUntil(d.expiry_date);
    return days !== null && days <= 0;
  }), [docs]);
  const expiredCount = expiredDocs.length;

  // Critical: 1 to 7 days
  const criticalDocs = useMemo(() => docs.filter((d) => {
    const days = daysUntil(d.expiry_date);
    return days !== null && days > 0 && days <= 7;
  }), [docs]);
  const criticalCount = criticalDocs.length;

  // Warning / Due Soon: 8 to 30 days
  const warningDocs = useMemo(() => docs.filter((d) => {
    const days = daysUntil(d.expiry_date);
    return days !== null && days > 7 && days <= 30;
  }), [docs]);
  const warningCount = warningDocs.length;

  // Total expiring soon within 30 days (Critical + Warning, strictly > 0 and <= 30)
  const expiringSoonCount = criticalCount + warningCount;

  // Compliant & Valid: > 30 days or no expiry date (e.g. proof of delivery, customs, company records)
  const validDocs = useMemo(() => docs.filter((d) => {
    const days = daysUntil(d.expiry_date);
    return days === null || days > 30;
  }), [docs]);
  const safeCount = validDocs.length;

  // Total non-expired count
  const nonExpiredCount = Math.max(0, totalDocsCount - expiredCount);
  const compliancePct = totalDocsCount > 0 ? Math.round((nonExpiredCount / totalDocsCount) * 100) : 100;

  // Paginated Subset
  const totalPages = Math.ceil(filteredDocs.length / pageSize) || 1;
  const paginatedDocs = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return filteredDocs.slice(start, start + pageSize);
  }, [filteredDocs, currentPage, pageSize]);

  const handleDeleteDocument = async () => {
    if (!deleteDocId) return;
    setIsDeleting(true);
    try {
      await documentService.delete(deleteDocId);
      toast.success('Document deleted successfully');
      await queryClient.invalidateQueries({ queryKey: ['documents'] });
      await queryClient.invalidateQueries({ queryKey: ['folders'] });
      setDeleteDocId(null);
    } catch (err) {
      toast.error('Failed to delete document');
    } finally {
      setIsDeleting(false);
    }
  };

  const handleBulkDeleteDocuments = async () => {
    if (bulkDeleteIds.length === 0) return;
    setIsDeleting(true);
    try {
      await documentService.bulkDelete(bulkDeleteIds);
      toast.success(`Successfully deleted ${bulkDeleteIds.length} document${bulkDeleteIds.length > 1 ? 's' : ''}`);
      await queryClient.invalidateQueries({ queryKey: ['documents'] });
      await queryClient.invalidateQueries({ queryKey: ['folders'] });
      setSelectedDocIds([]);
      setBulkDeleteIds([]);
      setIsBulkDeleteOpen(false);
    } catch (err) {
      toast.error('Failed to delete selected documents');
    } finally {
      setIsDeleting(false);
    }
  };

  // Selection handlers
  const toggleSelectAll = () => {
    if (selectedDocIds.length === filteredDocs.length) {
      setSelectedDocIds([]);
    } else {
      setSelectedDocIds(filteredDocs.map((d) => d.id));
    }
  };

  const toggleSelectRow = (id: string) => {
    setSelectedDocIds((prev) => (prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]));
  };

  // Group documents by Vehicle, Driver, Operations, Company
  const groupedEntityFolders = useMemo(() => {
    const vehicleMap = new Map(vehicles.map((v) => [v.id, v]));
    const driverMap = new Map(drivers.map((d) => [d.id, d]));

    const vehicleGroups = new Map<string, { vehicle: any; docs: EnrichedDocument[]; expiredCount: number }>();
    const driverGroups = new Map<string, { driver: any; docs: EnrichedDocument[]; expiredCount: number }>();
    const operationsDocs: EnrichedDocument[] = [];
    const companyDocs: EnrichedDocument[] = [];
    const unlinkedDocs: EnrichedDocument[] = [];

    const plateDigitsMap = new Map<string, any>();
    for (const v of vehicles) {
      const digits = (v.plate_number || '').replace(/\D/g, '');
      if (digits && digits.length >= 3) {
        plateDigitsMap.set(digits, v);
      }
    }

    for (const doc of filteredDocs) {
      const isExp = doc.daysLeft !== null && doc.daysLeft <= 0;

      let matchedVehicle = (doc.entity_type === 'Vehicle' && vehicleMap.has(doc.entity_id)) ? vehicleMap.get(doc.entity_id) : null;
      if (!matchedVehicle) {
        const fileUrlNorm = (doc.file_url || '').toLowerCase();
        for (const [digits, v] of plateDigitsMap.entries()) {
          if (fileUrlNorm.includes(digits)) {
            matchedVehicle = v;
            break;
          }
        }
      }

      if (matchedVehicle) {
        if (!vehicleGroups.has(matchedVehicle.id)) {
          vehicleGroups.set(matchedVehicle.id, { vehicle: matchedVehicle, docs: [], expiredCount: 0 });
        }
        const g = vehicleGroups.get(matchedVehicle.id)!;
        g.docs.push(doc);
        if (isExp) g.expiredCount += 1;
      } else if (doc.entity_type === 'Driver' && driverMap.has(doc.entity_id)) {
        const d = driverMap.get(doc.entity_id)!;
        if (!driverGroups.has(d.id)) {
          driverGroups.set(d.id, { driver: d, docs: [], expiredCount: 0 });
        }
        const g = driverGroups.get(d.id)!;
        g.docs.push(doc);
        if (isExp) g.expiredCount += 1;
      } else if (
        doc.category === 'Company' ||
        doc.entity_type === 'Company' ||
        doc.entity_type === 'Customer' ||
        ['Contract', 'Invoice', 'CustomerDoc', 'CommercialRegistration'].includes(doc.doc_type)
      ) {
        companyDocs.push(doc);
      } else if (
        doc.category === 'Operations' ||
        doc.entity_type === 'Trip' ||
        doc.entity_type === 'Waybill' ||
        ['Waybill', 'POD', 'CustomsClearance', 'Emergency'].includes(doc.doc_type)
      ) {
        operationsDocs.push(doc);
      } else {
        unlinkedDocs.push(doc);
      }
    }

    return {
      vehicles: Array.from(vehicleGroups.values()),
      drivers: Array.from(driverGroups.values()),
      operations: sortDocumentList(operationsDocs, sortBy),
      company: sortDocumentList(companyDocs, sortBy),
      unlinked: sortDocumentList(unlinkedDocs, sortBy),
    };
  }, [filteredDocs, vehicles, drivers, sortBy]);

  const opsCounts = useMemo(() => {
    const counts = { Waybill: 0, POD: 0, CustomsClearance: 0, Emergency: 0 };
    for (const d of groupedEntityFolders.operations) {
      if (d.doc_type === 'Waybill') counts.Waybill++;
      else if (d.doc_type === 'POD') counts.POD++;
      else if (d.doc_type === 'CustomsClearance') counts.CustomsClearance++;
      else if (d.doc_type === 'Emergency') counts.Emergency++;
    }
    return counts;
  }, [groupedEntityFolders.operations]);

  const displayedOpsDocs = useMemo(() => {
    if (opsSubFilter === 'all') return groupedEntityFolders.operations;
    return groupedEntityFolders.operations.filter((d) => {
      if (opsSubFilter === 'Waybill') return d.doc_type === 'Waybill';
      if (opsSubFilter === 'POD') return d.doc_type === 'POD';
      if (opsSubFilter === 'CustomsClearance') return d.doc_type === 'CustomsClearance';
      if (opsSubFilter === 'Emergency') return d.doc_type === 'Emergency';
      return true;
    });
  }, [groupedEntityFolders.operations, opsSubFilter]);

  const companyCounts = useMemo(() => {
    const counts = { Contract: 0, Invoice: 0, CustomerDoc: 0 };
    for (const d of groupedEntityFolders.company) {
      if (d.doc_type === 'Contract') counts.Contract++;
      else if (d.doc_type === 'Invoice') counts.Invoice++;
      else if (d.doc_type === 'CustomerDoc' || d.doc_type === 'CommercialRegistration') counts.CustomerDoc++;
    }
    return counts;
  }, [groupedEntityFolders.company]);

  const displayedCompanyDocs = useMemo(() => {
    if (companySubFilter === 'all') return groupedEntityFolders.company;
    return groupedEntityFolders.company.filter((d) => {
      if (companySubFilter === 'Contract') return d.doc_type === 'Contract';
      if (companySubFilter === 'Invoice') return d.doc_type === 'Invoice';
      if (companySubFilter === 'CustomerDoc') return d.doc_type === 'CustomerDoc' || d.doc_type === 'CommercialRegistration';
      return true;
    });
  }, [groupedEntityFolders.company, companySubFilter]);

  const hasFolderResults = useMemo(() => {
    if (activeCategory === 'Vehicles') return filteredVehicleFolders.length > 0;
    if (activeCategory === 'Drivers') return filteredDriverFolders.length > 0;
    if (activeCategory === 'Company') return groupedEntityFolders.company.length > 0;
    if (activeCategory === 'Operations') return groupedEntityFolders.operations.length > 0;
    if (activeCategory === 'Unassigned') return groupedEntityFolders.unlinked.length > 0;
    return (
      filteredVehicleFolders.length > 0 ||
      filteredDriverFolders.length > 0 ||
      groupedEntityFolders.company.length > 0 ||
      groupedEntityFolders.operations.length > 0 ||
      groupedEntityFolders.unlinked.length > 0
    );
  }, [activeCategory, filteredVehicleFolders, filteredDriverFolders, groupedEntityFolders]);

  const entityComboboxOptions = useMemo(() => {
    const opts: ComboboxOption[] = [
      {
        value: 'Vehicle:unassigned',
        label: 'Unassigned / Root',
        keywords: 'unassigned unlinked root none loose',
        group: 'Status',
      },
      ...vehicles.map((v) => ({
        value: `Vehicle:${v.id}`,
        label: `Vehicle ${v.plate_number || v.ref_id} (${v.ref_id || 'Truck'})`,
        keywords: `${v.plate_number} ${v.ref_id} vehicle truck ${v.trailer_number || ''}`,
        group: `Vehicles (${vehicles.length})`,
      })),
      ...drivers.map((d) => ({
        value: `Driver:${d.id}`,
        label: `${d.first_name} ${d.last_name} (${d.license_number || d.phone_primary || 'Driver'})`,
        keywords: `${d.first_name} ${d.last_name} ${d.license_number} driver ${d.phone_primary || ''}`,
        group: `Drivers (${drivers.length})`,
      })),
    ];
    return opts;
  }, [vehicles, drivers]);

  return (
    <DashboardLayout active="Documents" title="Documents Center">
      <div className="px-4 sm:px-6 pb-6 w-full flex flex-col animate-fade-in gap-5">

        {/* ── Page Header & Top Level Hub Switcher ─────────────────────────── */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 shrink-0 pb-3 border-b border-slate-200/80 dark:border-slate-800">
          <div className="flex items-center gap-3 min-w-0">
{mainTab === 'vault' ? (
              <Files className="w-7 h-7 text-indigo-600 dark:text-indigo-400 shrink-0" />
            ) : (
              <FileCog className="w-7 h-7 text-indigo-600 dark:text-indigo-400 shrink-0" />
            )}
            <div>
              <div className="flex items-center gap-2.5">
                <h1 className="text-2xl font-extrabold text-slate-900 dark:text-slate-100 tracking-tight">
                  Documents Center Hub
                </h1>
                <Badge variant="outline" className="bg-indigo-50 text-indigo-700 border-indigo-200 dark:bg-indigo-950/60 dark:text-indigo-300 text-[10px] font-bold">
                  {mainTab === 'vault' ? `${totalDocsCount} Records` : 'Requirements Admin'}
                </Badge>
              </div>
              <p className="text-xs text-slate-500 mt-0.5">
                {mainTab === 'vault'
                  ? 'Central vault for fleet compliance documents, waybills, POD receipts, and legal records.'
                  : 'Configure compliance requirements, mandatory slots, expiry rules, and custom document templates.'}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3 flex-wrap shrink-0">
            {/* Segmented Hub Mode Control */}
            <div className="flex items-center gap-1 p-1 bg-slate-100 dark:bg-slate-800/80 rounded-xl border border-slate-200 dark:border-slate-700">
              <button
                type="button"
                onClick={() => setMainTab('vault')}
                className={cn(
                  "flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-extrabold transition-all cursor-pointer",
                  mainTab === 'vault'
                    ? "bg-white dark:bg-slate-900 text-indigo-600 dark:text-indigo-400 shadow-2xs"
                    : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200"
                )}
              >
                <FolderOpen className="w-3.5 h-3.5" />
                <span>Document Vault</span>
              </button>
              <button
                type="button"
                onClick={() => setMainTab('types')}
                className={cn(
                  "flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-extrabold transition-all cursor-pointer",
                  mainTab === 'types'
                    ? "bg-white dark:bg-slate-900 text-indigo-600 dark:text-indigo-400 shadow-2xs"
                    : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200"
                )}
              >
                <FileCog className="w-3.5 h-3.5" />
                <span>Document Types</span>
              </button>
            </div>

            {/* Export Action */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="outline"
                  size="sm"
                  className="h-9 gap-1.5 text-xs font-semibold border-slate-200 bg-white hover:bg-slate-50 text-slate-700 shadow-2xs dark:bg-slate-900 dark:border-slate-800 dark:text-slate-300 cursor-pointer rounded-xl"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>Export</span>
                  <ChevronDown className="h-3 w-3 text-slate-400" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-40 p-1.5 shadow-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 rounded-xl z-50">
                <DropdownMenuItem
                  onClick={() => handleExportDocs(filteredDocs, 'excel')}
                  className="cursor-pointer text-xs font-semibold py-1.5 px-2 rounded-md flex items-center gap-2"
                >
                  <FileSpreadsheet className="h-3.5 w-3.5 text-emerald-600" />
                  <span>Excel (.xlsx)</span>
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={() => handleExportDocs(filteredDocs, 'pdf')}
                  className="cursor-pointer text-xs font-semibold py-1.5 px-2 rounded-md flex items-center gap-2"
                >
                  <FileText className="h-3.5 w-3.5 text-rose-600" />
                  <span>PDF (.pdf)</span>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>

            {/* Upload Document Button */}
            <Button
              size="sm"
              onClick={() => setIsUploadOpen(true)}
              className="h-9 gap-1.5 text-xs bg-brand hover:bg-brand-hover text-white font-extrabold shadow-xs rounded-xl px-4 cursor-pointer"
            >
              <UploadCloud className="w-4 h-4" />
              <span>Upload Document</span>
            </Button>
          </div>
        </div>

        {/* ── Hub Content Switch ───────────────────────────────────────────── */}
        {mainTab === 'types' ? (
          <DocumentTypeAdminSection />
        ) : (
          <>

        {/* ── 4 Top Category Cards Grid (Screenshot Layout) ───────────────── */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 shrink-0">
          {CATEGORY_TABS.map((cat) => {
            const count = cat === 'Vehicles'
              ? vehicleFolders.length
              : cat === 'Drivers'
                ? driverFolders.length
                : cat === 'Company'
                  ? foldersByCategory.Company.count
                  : foldersByCategory.Operations.count;

            const isActive = activeCategory === cat;
            const cfg = CATEGORY_CONFIG[cat];
            const Icon = cfg.icon;

            return (
              <button
                key={cat}
                type="button"
                onClick={() => handleSelectCategory(cat)}
                className={cn(
                  'p-4 rounded-2xl border transition-all text-left flex items-center justify-between cursor-pointer shadow-2xs group relative bg-white dark:bg-slate-900',
                  isActive
                    ? cfg.activeCardStyle
                    : 'border-slate-200/80 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700'
                )}
              >
                <div className="flex items-center gap-3">
                  <Icon className={cn('w-6 h-6 shrink-0', cfg.color)} />
                  <div>
                    <h3 className={cn('text-sm tracking-tight', isActive ? 'font-black text-slate-900 dark:text-slate-100' : 'font-extrabold text-slate-700 dark:text-slate-300')}>
                      {PILL_LABEL[cat]}
                    </h3>
                  </div>
                </div>
                <span className={cn(
                  'text-xs font-mono font-extrabold px-2.5 py-1 rounded-full border transition-all',
                  isActive
                    ? cfg.activePillStyle
                    : 'bg-slate-100 text-slate-600 border-slate-200 dark:bg-slate-800 dark:text-slate-400 dark:border-slate-700'
                )}>
                  {count}
                </span>
              </button>
            );
          })}
        </div>

        {/* ── Control Toolbar Row ────────────────────────────────────────── */}
        <div className="flex flex-wrap items-center justify-between gap-3 shrink-0 bg-white dark:bg-slate-900 p-2.5 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-2xs">
          {/* Left: Status Selector */}
          <Select value={expiryFilter} onValueChange={(val: any) => handleFilterChange(val)}>
            <SelectTrigger className="h-9 text-xs font-bold w-44 border-slate-200 dark:border-slate-700 bg-slate-50/60 dark:bg-slate-800/60 rounded-xl">
              <div className="flex items-center gap-1.5 truncate">
                <Filter className="w-3.5 h-3.5 text-slate-500 shrink-0" />
                <SelectValue placeholder="All Statuses" />
              </div>
            </SelectTrigger>
            <SelectContent className="rounded-xl z-50">
              <SelectItem value="all">All Statuses</SelectItem>
              <SelectItem value="warning">Needs Attention</SelectItem>
              <SelectItem value="expired">Expired Only</SelectItem>
              <SelectItem value="critical">Critical (&lt;7d)</SelectItem>
              <SelectItem value="valid">Fully Compliant</SelectItem>
            </SelectContent>
          </Select>

          {/* Center: Search Input */}
          <div className="relative flex-1 max-w-xl">
            <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={search}
              onChange={(e) => handleSearchChange(e.target.value)}
              placeholder="Search vehicle, plate, driver, or document..."
              className="h-9 text-xs pl-9 pr-8 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50/60 dark:bg-slate-800/60 text-slate-800 dark:text-slate-200 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-brand/30 w-full font-medium"
            />
            {search && (
              <button
                type="button"
                onClick={() => handleSearchChange('')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-0.5 cursor-pointer"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* Right: Controls */}
          <div className="flex items-center gap-2">
            {/* Category-Tailored Sort Selector */}
            <Select value={sortBy} onValueChange={(val: any) => handleSortChange(val)}>
              <SelectTrigger className="h-9 text-xs font-bold min-w-48 border-slate-200 dark:border-slate-700 bg-slate-50/60 dark:bg-slate-800/60 rounded-xl">
                <div className="flex items-center gap-1.5 truncate">
                  <ArrowUpDown className="w-3.5 h-3.5 text-slate-500 shrink-0" />
                  <span className="text-slate-400 font-normal">Sort:</span>
                  <SelectValue placeholder="Sort option" />
                </div>
              </SelectTrigger>
              <SelectContent className="rounded-xl z-50">
                {activeCategory === 'Company' ? (
                  <>
                    <SelectItem value="name_asc">Company Name (A - Z)</SelectItem>
                    <SelectItem value="name_desc">Company Name (Z - A)</SelectItem>
                    <SelectItem value="doc_type">Document Type</SelectItem>
                    <SelectItem value="attention">Needs Attention First</SelectItem>
                    <SelectItem value="expiry">Earliest Expiry Date</SelectItem>
                    <SelectItem value="recent">Recently Uploaded</SelectItem>
                  </>
                ) : activeCategory === 'Operations' ? (
                  <>
                    <SelectItem value="plate">Trip / Entity (A - Z)</SelectItem>
                    <SelectItem value="doc_type">Document Type</SelectItem>
                    <SelectItem value="attention">Needs Attention First</SelectItem>
                    <SelectItem value="expiry">Earliest Expiry Date</SelectItem>
                    <SelectItem value="recent">Recently Uploaded</SelectItem>
                  </>
                ) : activeCategory === 'Drivers' ? (
                  <>
                    <SelectItem value="plate">Driver Name (A - Z)</SelectItem>
                    <SelectItem value="attention">Needs Attention First</SelectItem>
                    <SelectItem value="expiry">Earliest Expiry Date</SelectItem>
                    <SelectItem value="recent">Recently Uploaded</SelectItem>
                  </>
                ) : activeCategory === 'Vehicles' ? (
                  <>
                    <SelectItem value="plate">Vehicle Plate / Ref (A - Z)</SelectItem>
                    <SelectItem value="attention">Needs Attention First</SelectItem>
                    <SelectItem value="expiry">Earliest Expiry Date</SelectItem>
                    <SelectItem value="recent">Recently Uploaded</SelectItem>
                  </>
                ) : (
                  <>
                    <SelectItem value="attention">Needs Attention First</SelectItem>
                    <SelectItem value="name_asc">Entity / Company (A - Z)</SelectItem>
                    <SelectItem value="expiry">Earliest Expiry Date</SelectItem>
                    <SelectItem value="recent">Recently Uploaded</SelectItem>
                  </>
                )}
              </SelectContent>
            </Select>

            {/* View Switcher */}
            <div className="flex items-center p-0.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50/60 dark:bg-slate-800/60">
              <button
                type="button"
                onClick={() => handleViewChange('folders')}
                className={cn(
                  'p-1.5 rounded-lg transition-all flex items-center justify-center cursor-pointer',
                  viewMode === 'folders'
                    ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100 shadow-2xs'
                    : 'text-slate-500 hover:text-slate-900 dark:hover:text-slate-100'
                )}
                title="Folders View"
                aria-label="Folders View"
              >
                <FolderOpen className={cn("w-4 h-4", viewMode === 'folders' ? "text-brand" : "")} />
              </button>
              <button
                type="button"
                onClick={() => handleViewChange('list')}
                className={cn(
                  'p-1.5 rounded-lg transition-all flex items-center justify-center cursor-pointer',
                  viewMode === 'list'
                    ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100 shadow-2xs'
                    : 'text-slate-500 hover:text-slate-900 dark:hover:text-slate-100'
                )}
                title="Ledger View"
                aria-label="Ledger View"
              >
                <List className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>

        {/* ── Document Vault Area (Grouped Folders vs List vs Grid) ────────────── */}
        {isLoading ? (
          <div className="flex flex-col items-center justify-center py-20 gap-3 text-slate-400 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800">
            <RotateCw className="w-8 h-8 animate-spin text-indigo-500 opacity-70" />
            <p className="text-xs font-medium">Loading compliance repository...</p>
          </div>
        ) : isError ? (
          <div className="flex flex-col items-center justify-center py-20 gap-2 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800">
            <AlertTriangle className="w-8 h-8 text-rose-400 opacity-70" />
            <p className="text-xs text-rose-500 font-medium">Failed to load repository files.</p>
          </div>
        ) : viewMode === 'folders' ? (
          !hasFolderResults ? (
            <div className="flex flex-col items-center justify-center py-20 gap-3 text-slate-400 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800">
              <FolderOpen className="w-7 h-7 text-slate-300 shrink-0" />
              <div className="text-center">
                <p className="text-sm font-bold text-slate-700 dark:text-slate-300">
                  {search ? `No compliance folders matching "${search}"` : 'No compliance folders found'}
                </p>
                <p className="text-xs text-slate-400 mt-0.5">Try clearing your search query or status filter</p>
              </div>
            </div>
          ) : (
            <div className="space-y-8">


              {/* 1. Vehicles Group Section — 1 row on All overview, full list on Vehicles page */}
              {(activeCategory === 'All' || activeCategory === 'Vehicles') && (
                <FolderCardSection
                  title="Vehicle Compliance Folders"
                  icon={<Truck className="w-5 h-5 text-emerald-600" />}
                  noun="Vehicles"
                  rows={filteredVehicleFolders}
                  onOpenRow={(row) => navigate(`/documents/vehicles/${row.ownerId}`)}
                  onUploadMissing={(row, slotCode) => setUploadMissingTarget({ row, slotCode })}
                  isOverview={activeCategory === 'All'}
                  onViewAll={() => handleSelectCategory('Vehicles')}
                />
              )}

              {/* 2. Drivers Group Section — 1 row on All overview, full list on Drivers page */}
              {(activeCategory === 'All' || activeCategory === 'Drivers') && (
                <FolderCardSection
                  title="Driver Compliance Folders"
                  icon={<UserIcon className="w-5 h-5 text-blue-600" />}
                  noun="Drivers"
                  rows={filteredDriverFolders}
                  onOpenRow={(row) => navigate(`/documents/drivers/${row.ownerId}`)}
                  onUploadMissing={(row, slotCode) => setUploadMissingTarget({ row, slotCode })}
                  isOverview={activeCategory === 'All'}
                  onViewAll={() => handleSelectCategory('Drivers')}
                />
              )}

              {/* 3. Company Documents Section */}
              {(activeCategory === 'All' || activeCategory === 'Company') && groupedEntityFolders.company.length > 0 && (
                <div className="space-y-3">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <h3 className="text-base sm:text-lg font-black text-slate-900 dark:text-slate-100 tracking-tight flex items-center gap-2.5">
                      <Briefcase className="w-5 h-5 text-blue-600 shrink-0" />
                      <span>Company Documents</span>
                      <span className="text-xs font-extrabold text-slate-500 dark:text-slate-400 bg-slate-100 dark:bg-slate-800 px-2.5 py-0.5 rounded-full border border-slate-200/80 dark:border-slate-700">
                        ({displayedCompanyDocs.length} Records)
                      </span>
                    </h3>
                    <div className="flex items-center gap-2">
                      <div className="flex flex-wrap items-center gap-1 bg-slate-100 dark:bg-slate-800/80 p-1 rounded-xl border border-slate-200/80 dark:border-slate-700/80">
                        <button
                          type="button"
                          onClick={() => setCompanySubFilter('all')}
                          className={cn(
                            'px-2.5 py-1 text-[11px] font-extrabold rounded-lg transition-all cursor-pointer',
                            companySubFilter === 'all'
                              ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100 shadow-2xs'
                              : 'text-slate-500 hover:text-slate-900 dark:hover:text-slate-100'
                          )}
                        >
                          All ({groupedEntityFolders.company.length})
                        </button>
                        <button
                          type="button"
                          onClick={() => setCompanySubFilter('Contract')}
                          className={cn(
                            'px-2.5 py-1 text-[11px] font-extrabold rounded-lg transition-all cursor-pointer flex items-center gap-1.5',
                            companySubFilter === 'Contract'
                              ? 'bg-blue-600 text-white shadow-2xs'
                              : 'text-slate-600 dark:text-slate-400 hover:text-blue-600'
                          )}
                        >
                          <FileText className="w-3 h-3" />
                          <span>Contracts</span>
                          <span className="font-mono text-[10px] opacity-80">({companyCounts.Contract})</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => setCompanySubFilter('Invoice')}
                          className={cn(
                            'px-2.5 py-1 text-[11px] font-extrabold rounded-lg transition-all cursor-pointer flex items-center gap-1.5',
                            companySubFilter === 'Invoice'
                              ? 'bg-emerald-600 text-white shadow-2xs'
                              : 'text-slate-600 dark:text-slate-400 hover:text-emerald-600'
                          )}
                        >
                          <FileBarChart2 className="w-3 h-3" />
                          <span>Invoices</span>
                          <span className="font-mono text-[10px] opacity-80">({companyCounts.Invoice})</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => setCompanySubFilter('CustomerDoc')}
                          className={cn(
                            'px-2.5 py-1 text-[11px] font-extrabold rounded-lg transition-all cursor-pointer flex items-center gap-1.5',
                            companySubFilter === 'CustomerDoc'
                              ? 'bg-purple-600 text-white shadow-2xs'
                              : 'text-slate-600 dark:text-slate-400 hover:text-purple-600'
                          )}
                        >
                          <Briefcase className="w-3 h-3" />
                          <span>Customer CR Docs</span>
                          <span className="font-mono text-[10px] opacity-80">({companyCounts.CustomerDoc})</span>
                        </button>
                      </div>
                      {activeCategory === 'All' && (
                        <button
                          onClick={() => handleSelectCategory('Company')}
                          className="text-xs font-bold text-brand hover:text-brand-hover flex items-center gap-1 cursor-pointer"
                        >
                          <span>View all company docs</span>
                          <ArrowRight className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  </div>

                  <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-5">
                    {(activeCategory === 'All'
                      ? displayedCompanyDocs.slice(0, 3)
                      : displayedCompanyDocs
                    ).map((doc) => (
                      <SingleDocumentCard
                        key={doc.id}
                        doc={doc}
                        category="Company"
                        onPreview={(targetDoc) => setPreviewDoc(targetDoc)}
                      />
                    ))}
                  </div>
                </div>
              )}

              {/* 4. Operations & Transportation Files Section */}
              {(activeCategory === 'All' || activeCategory === 'Operations') && groupedEntityFolders.operations.length > 0 && (
                <div className="space-y-3">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <h3 className="text-base sm:text-lg font-black text-slate-900 dark:text-slate-100 tracking-tight flex items-center gap-2.5">
                      <FileText className="w-5 h-5 text-amber-600 shrink-0" />
                      <span>Operations & Transportation Files</span>
                      <span className="text-xs font-extrabold text-slate-500 dark:text-slate-400 bg-slate-100 dark:bg-slate-800 px-2.5 py-0.5 rounded-full border border-slate-200/80 dark:border-slate-700">
                        ({displayedOpsDocs.length} Records)
                      </span>
                    </h3>
                    <div className="flex items-center gap-2">
                      {/* Waybill / POD / Customs / Emergency Sub-Filter Pills */}
                      <div className="flex flex-wrap items-center gap-1 bg-slate-100 dark:bg-slate-800/80 p-1 rounded-xl border border-slate-200/80 dark:border-slate-700/80">
                        <button
                          type="button"
                          onClick={() => setOpsSubFilter('all')}
                          className={cn(
                            'px-2.5 py-1 text-[11px] font-extrabold rounded-lg transition-all cursor-pointer',
                            opsSubFilter === 'all'
                              ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100 shadow-2xs'
                              : 'text-slate-500 hover:text-slate-900 dark:hover:text-slate-100'
                          )}
                        >
                          All ({groupedEntityFolders.operations.length})
                        </button>
                        <button
                          type="button"
                          onClick={() => setOpsSubFilter('Waybill')}
                          className={cn(
                            'px-2.5 py-1 text-[11px] font-extrabold rounded-lg transition-all cursor-pointer flex items-center gap-1.5',
                            opsSubFilter === 'Waybill'
                              ? 'bg-amber-600 text-white shadow-2xs'
                              : 'text-slate-600 dark:text-slate-400 hover:text-amber-600'
                          )}
                        >
                          <FileClock className="w-3 h-3" />
                          <span>Waybills</span>
                          <span className="font-mono text-[10px] opacity-80">({opsCounts.Waybill})</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => setOpsSubFilter('POD')}
                          className={cn(
                            'px-2.5 py-1 text-[11px] font-extrabold rounded-lg transition-all cursor-pointer flex items-center gap-1.5',
                            opsSubFilter === 'POD'
                              ? 'bg-emerald-600 text-white shadow-2xs'
                              : 'text-slate-600 dark:text-slate-400 hover:text-emerald-600'
                          )}
                        >
                          <FileCheck className="w-3 h-3" />
                          <span>POD (Proof of Delivery)</span>
                          <span className="font-mono text-[10px] opacity-80">({opsCounts.POD})</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => setOpsSubFilter('CustomsClearance')}
                          className={cn(
                            'px-2.5 py-1 text-[11px] font-extrabold rounded-lg transition-all cursor-pointer flex items-center gap-1.5',
                            opsSubFilter === 'CustomsClearance'
                              ? 'bg-blue-600 text-white shadow-2xs'
                              : 'text-slate-600 dark:text-slate-400 hover:text-blue-600'
                          )}
                        >
                          <FileKey2 className="w-3 h-3" />
                          <span>Customs Clearance</span>
                          <span className="font-mono text-[10px] opacity-80">({opsCounts.CustomsClearance})</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => setOpsSubFilter('Emergency')}
                          className={cn(
                            'px-2.5 py-1 text-[11px] font-extrabold rounded-lg transition-all cursor-pointer flex items-center gap-1.5',
                            opsSubFilter === 'Emergency'
                              ? 'bg-rose-600 text-white shadow-2xs'
                              : 'text-slate-600 dark:text-slate-400 hover:text-rose-600'
                          )}
                        >
                          <ShieldAlert className="w-3 h-3" />
                          <span>Emergency Logs</span>
                          <span className="font-mono text-[10px] opacity-80">({opsCounts.Emergency})</span>
                        </button>
                      </div>
                      {activeCategory === 'All' && (
                        <button
                          onClick={() => handleSelectCategory('Operations')}
                          className="text-xs font-bold text-brand hover:text-brand-hover flex items-center gap-1 cursor-pointer"
                        >
                          <span>View all ops docs</span>
                          <ArrowRight className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  </div>

                  <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-5">
                    {(activeCategory === 'All'
                      ? displayedOpsDocs.slice(0, 3)
                      : displayedOpsDocs
                    ).map((doc) => (
                      <SingleDocumentCard
                        key={doc.id}
                        doc={doc}
                        category="Operations"
                        onPreview={(targetDoc) => setPreviewDoc(targetDoc)}
                      />
                    ))}
                  </div>
                </div>
              )}
            </div>
          )
        ) : filteredDocs.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 gap-3 text-slate-400 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800">
            <FolderOpen className="w-7 h-7 text-slate-300 shrink-0" />
            <div className="text-center">
              <p className="text-sm font-bold text-slate-700 dark:text-slate-300">
                {search ? `No documents matching "${search}"` : 'No documents found'}
              </p>
              <p className="text-xs text-slate-400 mt-0.5">Try clearing your search query or status filter</p>
            </div>
          </div>
        ) : (
          <DataTable<EnrichedDocument>
            title={
              <span className="flex items-center gap-2">
                <FolderOpen className="w-4 h-4 text-brand" />
                <span>Document Vault Ledger</span>
              </span>
            }
            columns={[
              {
                header: 'Document File',
                accessor: (row) => {
                  const DocIcon = DOC_TYPE_ICON[row.doc_type] ?? FileText;
                  const catCfg = CATEGORY_CONFIG[row.category];
                  return (
                    <div className="flex items-center gap-2.5 py-0.5">
                      <div className={cn('w-8 h-8 rounded-lg flex items-center justify-center shrink-0 border border-slate-100 dark:border-slate-800', catCfg?.iconBg)}>
                        <DocIcon className={cn('w-4 h-4', catCfg?.color)} />
                      </div>
                      <div className="flex flex-col min-w-0">
                        <span 
                          onClick={() => setPreviewDoc(row)}
                          className="font-bold text-slate-900 dark:text-slate-100 text-xs hover:text-brand cursor-pointer block truncate max-w-[220px]"
                        >
                          {documentDisplayName(row)}
                        </span>
                        <span className="text-[10px] text-slate-400 font-mono">#DOC-{row.id.toString().slice(0, 8)}</span>
                      </div>
                    </div>
                  );
                }
              },
              {
                header: 'Category',
                accessor: (row) => {
                  const catCfg = CATEGORY_CONFIG[row.category];
                  return (
                    <span className={cn('inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-md text-xs font-bold border', catCfg?.iconBg, catCfg?.borderColor, catCfg?.color)}>
                      <catCfg.icon className="w-3.5 h-3.5" />
                      {row.category}
                    </span>
                  );
                }
              },
              {
                header: 'Entity Owner',
                accessor: (row) => {
                  const isUnknown = row.entityName.includes('Unknown') || !row.entity_id;

                  return (
                    <div className="flex items-center gap-1.5" onClick={(e) => e.stopPropagation()}>
                      <Combobox
                        options={entityComboboxOptions}
                        value={`${row.entity_type}:${row.entity_id}`}
                        onChange={(val) => {
                          const [type, id] = val.split(':');
                          if (type && id) {
                            handleSingleAssignEntity(row.id, type, id);
                          }
                        }}
                        placeholder={row.entityName || 'Assign owner...'}
                        searchPlaceholder="Search vehicle plate or driver..."
                        emptyText="No match."
                        triggerClassName={cn(
                          'h-7 text-xs font-bold px-2 py-0 border rounded-lg max-w-[185px] shrink-0',
                          isUnknown
                            ? 'bg-amber-50 text-amber-800 border-amber-300 hover:bg-amber-100 dark:bg-amber-950/60 dark:text-amber-300 dark:border-amber-800 font-mono'
                            : 'bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-200 border-slate-200 dark:border-slate-700'
                        )}
                      />
                    </div>
                  );
                }
              },
              {
                header: 'Doc # / AI Metadata',
                accessor: (row) => {
                  const docNum = row.ai_extracted_json?.document_number;
                  const confidence = row.ai_extracted_json?.confidence;
                  return (
                    <div className="flex flex-col">
                      <span className="text-xs font-mono font-bold text-indigo-600 dark:text-indigo-400">
                        {docNum || `DOC-${row.id.slice(0, 8)}`}
                      </span>
                      {confidence ? (
                        <span className="text-[10px] text-amber-600 dark:text-amber-400 font-semibold flex items-center gap-1">
                          <Sparkles className="w-2.5 h-2.5" />
                          <span>{Math.round(confidence * 100)}% AI Vision</span>
                        </span>
                      ) : (
                        <span className="text-[10px] text-slate-400">Manual Entry</span>
                      )}
                    </div>
                  );
                }
              },
              {
                header: 'Issuer Authority',
                accessor: (row) => (
                  <span className="text-xs text-slate-700 dark:text-slate-200 font-semibold">
                    {formatBilingualAuthority(row.ai_extracted_json?.issuing_authority || row.issuer)}
                  </span>
                )
              },
              {
                header: 'Uploaded Date',
                accessor: (row) => (
                  <span className="text-xs text-slate-600 dark:text-slate-400 font-mono">
                    {row.createdAt ? formatInDeploymentTz(row.createdAt, tz, 'MMM d, yyyy') : '—'}
                  </span>
                )
              },
              {
                header: 'Expiry Date',
                accessor: (row) => (
                  row.expiry_date ? (
                    <div>
                      <span className="text-xs text-slate-900 dark:text-slate-100 font-mono font-semibold block">
                        {formatDocDate(row.expiry_date)}
                      </span>
                      {row.daysLeft !== null && (
                        <span className={cn(
                          'text-[10px] font-bold inline-block mt-0.5',
                          row.daysLeft <= 0 ? 'text-rose-600' : row.daysLeft <= 7 ? 'text-rose-500' : row.daysLeft <= 30 ? 'text-amber-600' : 'text-emerald-600'
                        )}>
                          {row.daysLeft <= 0 ? `${Math.abs(row.daysLeft)}d overdue` : `${row.daysLeft}d remaining`}
                        </span>
                      )}
                    </div>
                  ) : (
                    <span className="text-xs text-slate-400 font-mono">No Expiry</span>
                  )
                )
              },
              {
                header: 'Status',
                accessor: (row) => {
                  const expBadge = EXPIRY_BADGE[row.expStatus];
                  return (
                    <span className={cn('inline-flex items-center gap-1.5 text-xs font-bold px-2.5 py-0.5 rounded-full border', expBadge.className)}>
                      {row.expStatus === 'expired' || row.expStatus === 'critical' ? (
                        <AlertTriangle className="w-3.5 h-3.5" />
                      ) : row.expStatus === 'valid' ? (
                        <CheckCircle2 className="w-3.5 h-3.5" />
                      ) : row.expStatus === 'warning' ? (
                        <Clock className="w-3.5 h-3.5" />
                      ) : null}
                      {expBadge.label}
                    </span>
                  );
                }
              },
              {
                header: 'Actions',
                headerClassName: 'text-right',
                accessor: (row) => (
                  <div className="flex items-center justify-end gap-1" onClick={(e) => e.stopPropagation()}>
                    <button
                      onClick={() => handleSingleDocAiOcr(row.id, documentDisplayName(row))}
                      disabled={extractingRowId === row.id}
                      className="p-1.5 rounded-lg text-amber-600 dark:text-amber-400 hover:bg-amber-50 dark:hover:bg-amber-950/40 transition-colors disabled:opacity-50"
                      title="AI Vision Auto-Extract Metadata (Serial #, Plate #, Issue/Expiry Date, Authority)"
                    >
                      {extractingRowId === row.id ? <Loader2 size={14} className="animate-spin text-amber-600" /> : <Sparkles size={14} />}
                    </button>
                    <button
                      onClick={() => setPreviewDoc(row)}
                      className="p-1.5 rounded-lg text-slate-600 hover:text-indigo-600 hover:bg-indigo-50 dark:hover:bg-indigo-950/40 transition-colors"
                      title="Preview File & AI Details"
                    >
                      <Eye size={14} />
                    </button>
                    <button
                      onClick={() => {
                        setMoveTargetDocIds([row.id]);
                        setIsMoveModalOpen(true);
                      }}
                      className="p-1.5 rounded-lg text-slate-600 hover:text-indigo-600 hover:bg-indigo-50 dark:hover:bg-indigo-950/40 transition-colors"
                      title="Move to Folder"
                    >
                      <FolderInput size={14} />
                    </button>
                    <a
                      href={row.file_url}
                      download
                      className="p-1.5 rounded-lg text-slate-600 hover:text-slate-900 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                      title="Download File"
                    >
                      <Download size={14} />
                    </a>
                    <button
                      onClick={() => setDeleteDocId(row.id)}
                      className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition-colors"
                      title="Delete Document"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                )
              }
            ]}
            data={filteredDocs}
            compact={true}
            pageSize={pageSize}
            onPageSizeChange={(sz) => setPageSize(sz)}
            pageSizeOptions={[10, 25, 50, 100]}
            bulkActions={[
              {
                label: 'AI Vision Auto-Extract',
                icon: <Sparkles size={13} className="text-amber-500 fill-amber-500/20" />,
                variant: 'secondary' as const,
                onClick: (selectedRows: EnrichedDocument[]) => {
                  handleBulkExtractSelectedDocs(selectedRows.map(r => r.id));
                }
              },
              {
                label: 'Move to Folder',
                icon: <FolderInput size={13} />,
                variant: 'secondary' as const,
                onClick: (selectedRows: EnrichedDocument[]) => {
                  setMoveTargetDocIds(selectedRows.map(r => r.id));
                  setIsMoveModalOpen(true);
                }
              },
              {
                label: 'Bulk Download ZIP',
                icon: <Download size={13} />,
                variant: 'secondary' as const,
                onClick: async (selectedRows: EnrichedDocument[]) => {
                  const ids = selectedRows.map(r => r.id);
                  const blob = await documentService.bulkDownloadZip(ids);
                  const url = URL.createObjectURL(blob);
                  const link = document.createElement('a');
                  link.href = url;
                  link.download = `documents-${new Date().toISOString().slice(0, 10)}.zip`;
                  document.body.appendChild(link);
                  link.click();
                  document.body.removeChild(link);
                  URL.revokeObjectURL(url);
                }
              },
              {
                label: 'Export Excel',
                icon: <FileSpreadsheet size={13} className="text-emerald-600" />,
                variant: 'secondary' as const,
                onClick: (selectedRows: EnrichedDocument[]) => {
                  handleExportDocs(selectedRows, 'excel');
                }
              },
              {
                label: 'Export PDF',
                icon: <FileText size={13} className="text-rose-600" />,
                variant: 'secondary' as const,
                onClick: (selectedRows: EnrichedDocument[]) => {
                  handleExportDocs(selectedRows, 'pdf');
                }
              },
              {
                label: 'Delete Selected',
                icon: <Trash2 size={13} />,
                variant: 'danger' as const,
                onClick: (selectedRows: EnrichedDocument[]) => {
                  setBulkDeleteIds(selectedRows.map(r => r.id));
                  setIsBulkDeleteOpen(true);
                }
              }
            ]}
            enableSelection={true}
            isLoading={isLoading}
            searchPlaceholder="Search by document name, owner, vehicle plate, or issuer..."
            searchValue={search}
            onSearchChange={setSearch}
            onRowClick={(row) => setPreviewDoc(row)}
          />
        )}
        </>
        )}
      </div>

      {/* ── Document Details & Intelligence Center Modal ────────────────────── */}
      <Dialog open={!!previewDoc} onOpenChange={(open) => {
        if (!open) {
          setPreviewDoc(null);
          setDocRotation(0);
        }
      }}>
        <DialogContent className="max-w-6xl sm:max-w-6xl w-[94vw] sm:w-[90vw] h-[88vh] max-h-[88vh] flex flex-col p-0 overflow-hidden border-slate-200 dark:border-slate-800 rounded-2xl shadow-2xl bg-white dark:bg-slate-900">
          
          {/* Pinned Header */}
          <DialogHeader className="px-6 py-4 border-b border-slate-100 dark:border-slate-800 bg-slate-50/90 dark:bg-slate-900/90 flex items-center justify-between shrink-0">
            <div className="flex items-center gap-3">
              <FileText className="w-5 h-5 text-indigo-600 shrink-0" />
              <div>
                <div className="flex items-center gap-2">
                  <DialogTitle className="text-base font-extrabold text-slate-900 dark:text-slate-100">
                    {previewDoc ? documentDisplayName(previewDoc) : 'Document Details'}
                  </DialogTitle>
                  {previewDoc && (
                    <Badge className="bg-indigo-50 text-indigo-700 border-indigo-200 dark:bg-indigo-950/60 dark:text-indigo-300 dark:border-indigo-800 font-bold text-[10px] px-2.5 py-0.5 rounded-full">
                      {categoryForEntity(previewDoc.entity_type)}
                    </Badge>
                  )}
                </div>
                {previewDoc && (
                  <DialogDescription className="text-xs text-slate-500 dark:text-slate-400 mt-0.5 flex items-center gap-2 font-mono">
                    <span>ID: #{previewDoc.id.slice(0, 12)}...</span>
                    <span>•</span>
                    <span>Owner: {nameFor(previewDoc)}</span>
                  </DialogDescription>
                )}
              </div>
            </div>
          </DialogHeader>

          {previewDoc && (() => {
            const resolvedUrl = resolveFileUrl(previewDoc.file_url);
            const expBadge = EXPIRY_BADGE[previewDoc.expStatus];
            const isExtractingThis = extractingRowId === previewDoc.id;

            return (
              <div className="grid grid-cols-1 lg:grid-cols-12 flex-1 min-h-0 overflow-hidden bg-slate-100/40 dark:bg-slate-950/40">
                
                {/* Left Column (58%): Interactive File & Image Viewer with Rotation */}
                <div className="lg:col-span-7 flex flex-col bg-slate-950/5 dark:bg-slate-950/50 p-4 border-r border-slate-200/80 dark:border-slate-800/80 justify-between min-h-0">
                  
                  {/* Media Viewer Toolbar */}
                  <div className="flex items-center justify-between pb-2 text-xs text-slate-500 font-medium shrink-0">
                    <span className="flex items-center gap-1.5 truncate">
                      <FileCheck size={14} className="text-indigo-600 dark:text-indigo-400" />
                      <span className="truncate">{previewDoc.mime_type || 'Document File'}</span>
                    </span>

                    <div className="flex items-center gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => setDocRotation((prev) => (prev + 90) % 360)}
                        className="h-7 px-2.5 text-[11px] font-bold gap-1.5 bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 shadow-2xs text-slate-700 dark:text-slate-200 hover:bg-slate-50"
                        title="Rotate document image 90 degrees"
                      >
                        <RotateCw size={12} /> Rotate 90°
                      </Button>

                      <a
                        href={resolvedUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="h-7 px-2.5 rounded-lg bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs font-bold text-indigo-600 dark:text-indigo-400 hover:bg-slate-50 flex items-center gap-1 shrink-0 shadow-2xs"
                      >
                        <ExternalLink size={12} /> Open Fullscreen
                      </a>
                    </div>
                  </div>

                  {/* Main File Viewer Container */}
                  <div className="w-full flex-1 rounded-xl bg-slate-900/10 dark:bg-slate-950/80 border border-slate-200 dark:border-slate-800 overflow-hidden flex items-center justify-center relative p-3 shadow-inner min-h-0">
                    {previewDoc.mime_type?.startsWith('image/') || /\.(png|jpe?g|webp|gif|svg)$/i.test(resolvedUrl) ? (
                      <div className="relative w-full h-full flex items-center justify-center overflow-hidden">
                        <img
                          src={resolvedUrl}
                          alt={documentDisplayName(previewDoc)}
                          style={{ transform: `rotate(${docRotation}deg)` }}
                          className="max-h-full max-w-full object-contain rounded-lg transition-transform duration-300 shadow-md"
                        />
                      </div>
                    ) : previewDoc.mime_type === 'application/pdf' || /\.pdf$/i.test(resolvedUrl) ? (
                      <iframe
                        src={`${resolvedUrl}#toolbar=0`}
                        title="PDF Document Preview"
                        className="w-full h-full rounded-lg border-none min-h-[380px]"
                      />
                    ) : (
                      <div className="flex flex-col items-center justify-center gap-3 p-8 text-center">
                        <FileText className="w-7 h-7 text-indigo-600 shrink-0" />
                        <div>
                          <h4 className="text-sm font-extrabold text-slate-900 dark:text-slate-100">
                            {documentDisplayName(previewDoc)}
                          </h4>
                          <p className="text-xs text-slate-400 font-mono mt-1">
                            {previewDoc.mime_type || 'Binary Document'}
                          </p>
                        </div>
                        <a
                          href={resolvedUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-indigo-600 text-white font-extrabold text-xs shadow-xs hover:bg-indigo-700 transition-all"
                        >
                          <ExternalLink size={13} /> Open File Link
                        </a>
                      </div>
                    )}
                  </div>

                  {/* Footer Info */}
                  <div className="pt-2 flex items-center justify-between text-[11px] text-slate-400 font-mono shrink-0">
                    <span>MIME: {previewDoc.mime_type || 'application/pdf'}</span>
                    <span>Created: {previewDoc.createdAt ? formatInDeploymentTz(previewDoc.createdAt, tz, 'MM/dd/yyyy, HH:mm:ss') : 'N/A'}</span>
                  </div>
                </div>

                {/* Right Column (42%): Fully Scrollable Intelligence Ledger & Details */}
                <div className="lg:col-span-5 flex flex-col h-full overflow-y-auto custom-scrollbar p-6 space-y-5 bg-white dark:bg-slate-900 min-h-0">
                  
                  {/* Status & Compliance Pill Header */}
                  <div className="flex items-center justify-between p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-700/80 shadow-2xs">
                    <div className="space-y-1">
                      <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Compliance Status</span>
                      <span className={cn('inline-flex items-center gap-1.5 text-xs font-extrabold px-3 py-1 rounded-full border shadow-2xs', expBadge.className)}>
                        {expBadge.label}
                      </span>
                    </div>

                    {previewDoc.daysLeft !== null && (
                      <div className="text-right space-y-0.5">
                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Validity</span>
                        <span className={cn(
                          'text-xs font-mono font-extrabold block',
                          previewDoc.daysLeft <= 0 ? 'text-rose-600' : previewDoc.daysLeft <= 30 ? 'text-amber-600' : 'text-emerald-600'
                        )}>
                          {previewDoc.daysLeft <= 0 ? `${Math.abs(previewDoc.daysLeft)} days overdue` : `${previewDoc.daysLeft} days remaining`}
                        </span>
                      </div>
                    )}
                  </div>

                  {/* Interactive Entity Re-assignment Control Card */}
                  <div className="p-4 rounded-2xl bg-indigo-50/70 dark:bg-indigo-950/40 border border-indigo-200 dark:border-indigo-800/60 space-y-2.5 shadow-2xs">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-extrabold text-indigo-950 dark:text-indigo-200 flex items-center gap-1.5">
                        <Truck size={14} className="text-indigo-600 dark:text-indigo-400" />
                        <span>Assigned Fleet Entity Owner</span>
                      </span>
                      <Badge className="bg-indigo-100 text-indigo-800 dark:bg-indigo-900/60 dark:text-indigo-300 font-mono font-bold text-[10px] px-2 py-0.5 border-0">
                        {previewDoc.entity_type}
                      </Badge>
                    </div>

                    <Combobox
                      options={entityComboboxOptions}
                      value={`${previewDoc.entity_type}:${previewDoc.entity_id}`}
                      onChange={(val) => {
                        const [type, id] = val.split(':');
                        if (type && id) {
                          handleSingleAssignEntity(previewDoc.id, type, id);
                        }
                      }}
                      placeholder="Search vehicle plate or driver name..."
                      searchPlaceholder="Type plate number, ref ID, or driver..."
                      emptyText="No matching vehicles or drivers found."
                      triggerClassName="h-9 text-xs font-extrabold bg-white dark:bg-slate-800 border-indigo-300 dark:border-indigo-700 shadow-2xs text-slate-900 dark:text-slate-100"
                    />
                  </div>

                  {/* Gemini AI Vision OCR Extracted Intelligence Card */}
                  <div className="p-4 rounded-2xl bg-amber-50/90 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800/70 space-y-3.5 shadow-xs">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-1.5 text-xs font-extrabold text-amber-950 dark:text-amber-200">
                        <Sparkles className="w-4 h-4 text-amber-600 shrink-0" />
                        <span>Gemini Vision AI Extracted Metadata</span>
                      </div>
                      {previewDoc.ai_extracted_json?.confidence && (
                        <Badge className="bg-amber-100 dark:bg-amber-900/60 text-amber-800 dark:text-amber-300 font-mono font-bold text-[10px] px-2.5 py-0.5 border-0">
                          {Math.round((previewDoc.ai_extracted_json.confidence > 1 ? previewDoc.ai_extracted_json.confidence / 100 : previewDoc.ai_extracted_json.confidence) * 100)}% Confidence
                        </Badge>
                      )}
                    </div>

                    <div className="grid grid-cols-2 gap-2.5 text-xs">
                      <div className="bg-white dark:bg-slate-800 p-3 rounded-xl border border-amber-200/60 dark:border-slate-700 shadow-2xs">
                        <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider block flex items-center gap-1">
                          <Hash size={10} /> Doc / Policy #
                        </span>
                        <span className="font-mono font-extrabold text-indigo-600 dark:text-indigo-400 block truncate mt-0.5 text-xs">
                          {previewDoc.ai_extracted_json?.document_number || `DOC-${previewDoc.id.slice(0, 8)}`}
                        </span>
                      </div>

                      <div className="bg-white dark:bg-slate-800 p-3 rounded-xl border border-amber-200/60 dark:border-slate-700 shadow-2xs">
                        <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider block flex items-center gap-1">
                          <Truck size={10} /> Vehicle Plate
                        </span>
                        <span className="font-mono font-bold text-slate-800 dark:text-slate-200 block truncate mt-0.5 text-xs">
                          {previewDoc.ai_extracted_json?.vehicle_plate || nameFor(previewDoc)}
                        </span>
                      </div>

                      <div className="bg-white dark:bg-slate-800 p-3 rounded-xl border border-amber-200/60 dark:border-slate-700 shadow-2xs col-span-2">
                        <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider block flex items-center gap-1">
                          <Building2 size={10} /> Authority / Issuer (Bilingual)
                        </span>
                        <span className="font-bold text-slate-800 dark:text-slate-200 block truncate mt-0.5 text-xs">
                          {formatBilingualAuthority(previewDoc.ai_extracted_json?.issuing_authority || REGULATORY_BODY[previewDoc.doc_type])}
                        </span>
                      </div>

                      <div className="bg-white dark:bg-slate-800 p-3 rounded-xl border border-amber-200/60 dark:border-slate-700 shadow-2xs col-span-2">
                        <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider block flex items-center gap-1">
                          <Calendar size={10} /> Expiry Date (Gregorian)
                        </span>
                        <span className="font-mono font-extrabold text-rose-600 dark:text-rose-400 block truncate mt-0.5 text-xs">
                          {previewDoc.expiry_date ? formatInDeploymentTz(previewDoc.expiry_date, tz, 'EEE, MMMM d, yyyy') : 'N/A'}
                        </span>
                      </div>
                    </div>

                    {/* Extra Extracted Document Attributes (Issue ID, Chassis #, Owner Name, etc.) */}
                    {previewDoc.ai_extracted_json?.extra_details && Object.keys(previewDoc.ai_extracted_json.extra_details).length > 0 && (
                      <div className="pt-2 border-t border-amber-200/60 dark:border-amber-900/40 space-y-1.5">
                        <span className="text-[9px] font-extrabold text-amber-900 dark:text-amber-300 uppercase tracking-wider block">
                          Extracted Document Attributes (Issue ID & Details)
                        </span>
                        <div className="grid grid-cols-2 gap-2 text-[11px]">
                          {Object.entries(previewDoc.ai_extracted_json.extra_details).map(([k, v]) => (
                            v ? (
                              <div key={k} className="bg-white/80 dark:bg-slate-800/80 p-2 rounded-lg border border-amber-200/40 dark:border-slate-700/60">
                                <span className="text-[9px] text-slate-400 font-bold uppercase block truncate">
                                  {k.replace(/_/g, ' ')}
                                </span>
                                <span className="font-mono font-bold text-slate-800 dark:text-slate-200 block truncate">
                                  {String(v)}
                                </span>
                              </div>
                            ) : null
                          ))}
                        </div>
                      </div>
                    )}

                    {previewDoc.ai_extracted_json?.notes && (
                      <div className="p-3 rounded-xl bg-amber-100/60 dark:bg-amber-900/30 border border-amber-200/80 dark:border-amber-800/50 text-[11px] text-amber-950 dark:text-amber-200 italic leading-relaxed">
                        "{previewDoc.ai_extracted_json.notes}"
                      </div>
                    )}

                    {/* AI Re-Extract Button */}
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleSingleDocAiOcr(previewDoc.id, documentDisplayName(previewDoc))}
                      disabled={isExtractingThis}
                      className="w-full h-8.5 text-xs font-extrabold bg-amber-100 hover:bg-amber-200 text-amber-900 border-amber-300 dark:bg-amber-950/60 dark:text-amber-200 dark:border-amber-800 gap-2 rounded-xl mt-1 shadow-2xs"
                    >
                      {isExtractingThis ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Sparkles className="w-3.5 h-3.5 text-amber-600" />}
                      <span>Run Gemini AI Vision Re-Scan</span>
                    </Button>
                  </div>

                  {/* Metadata Key-Value System Ledger */}
                  <div className="space-y-3 border border-slate-200/80 dark:border-slate-800 rounded-2xl p-4 bg-slate-50/50 dark:bg-slate-900/50 text-xs">
                    <span className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider block border-b border-slate-200/60 dark:border-slate-800 pb-2">
                      System Metadata Ledger
                    </span>

                    <div className="grid grid-cols-2 gap-3.5 pt-1">
                      <div>
                        <span className="text-[10px] text-slate-400 font-bold uppercase block">Entity Type</span>
                        <span className="font-bold text-slate-800 dark:text-slate-200">{previewDoc.entity_type}</span>
                      </div>

                      <div>
                        <span className="text-[10px] text-slate-400 font-bold uppercase block">Entity Owner</span>
                        <span className="font-bold text-slate-800 dark:text-slate-200">{nameFor(previewDoc)}</span>
                      </div>

                      <div>
                        <span className="text-[10px] text-slate-400 font-bold uppercase block">Folder Placement</span>
                        <span className="font-bold text-indigo-600 dark:text-indigo-400 truncate block">
                          {previewDoc.folder?.name || 'Unassigned Root'}
                        </span>
                      </div>

                      <div>
                        <span className="text-[10px] text-slate-400 font-bold uppercase block">Confidentiality</span>
                        <span className="font-bold text-slate-800 dark:text-slate-200 inline-flex items-center gap-1">
                          {previewDoc.is_confidential ? (
                            <>
                              <Lock className="w-3 h-3 text-amber-600" />
                              <span>Restricted</span>
                            </>
                          ) : (
                            <>
                              <Globe className="w-3 h-3 text-slate-400" />
                              <span>Standard</span>
                            </>
                          )}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Quick Action Tools */}
                  <div className="pt-1 grid grid-cols-2 gap-2.5">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        setMoveTargetDocIds([previewDoc.id]);
                        setIsMoveModalOpen(true);
                      }}
                      className="text-xs font-bold gap-1.5 rounded-xl border-slate-200 dark:border-slate-700 h-9"
                    >
                      <FolderInput size={13} /> Move Folder
                    </Button>

                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setDeleteDocId(previewDoc.id)}
                      className="text-xs font-bold gap-1.5 rounded-xl border-rose-200 text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 h-9"
                    >
                      <Trash2 size={13} /> Delete File
                    </Button>
                  </div>

                </div>
              </div>
            );
          })()}

          {/* Pinned Footer */}
          <DialogFooter className="px-6 py-3.5 border-t border-slate-100 dark:border-slate-800 bg-slate-50/90 dark:bg-slate-900/90 flex items-center justify-between shrink-0">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                setPreviewDoc(null);
                setDocRotation(0);
              }}
              className="text-xs font-bold rounded-xl"
            >
              Close
            </Button>
            {previewDoc && (
              <a
                href={resolveFileUrl(previewDoc.file_url)}
                download
                className="h-8.5 px-5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-extrabold shadow-md inline-flex items-center gap-2 transition-all"
              >
                <Download size={14} /> Download Source File
              </a>
            )}
          </DialogFooter>

        </DialogContent>
      </Dialog>

      {/* ── Create Folder: Owner Folder vs General Folder chooser ─────────── */}
      <CreateFolderChoiceModal
        isOpen={isFolderChoiceOpen}
        onClose={() => setIsFolderChoiceOpen(false)}
        onChooseOwner={() => {
          setIsFolderChoiceOpen(false);
          setIsOwnerFolderPickerOpen(true);
        }}
        onChooseGeneral={() => {
          setIsFolderChoiceOpen(false);
          setIsCreateFolderOpen(true);
        }}
      />
      <OwnerFolderPickerModal
        isOpen={isOwnerFolderPickerOpen}
        onClose={() => setIsOwnerFolderPickerOpen(false)}
      />
      <CreateFolderModal
        isOpen={isCreateFolderOpen}
        onClose={() => setIsCreateFolderOpen(false)}
      />

      {/* ── Missing-slot upload (clicking a Missing row on a Driver/Vehicle card) ─── */}
      {uploadMissingTarget && (() => {
        const slot = uploadMissingTarget.row.slots.find((s) => s.code === uploadMissingTarget.slotCode);
        return (
          <UploadDocumentModal
            isOpen
            onClose={() => setUploadMissingTarget(null)}
            entityType={uploadMissingTarget.row.ownerType}
            entityId={uploadMissingTarget.row.ownerId}
            documentTypeId={slot?.documentTypeId}
            documentTypeName={slot?.name}
            lockOwner
            ownerDisplayName={uploadMissingTarget.row.ownerName}
            onUploadSuccess={() => {
              queryClient.invalidateQueries({ queryKey: ['documents', 'owner-folders'] });
              queryClient.invalidateQueries({ queryKey: ['documents'] });
              setUploadMissingTarget(null);
            }}
          />
        );
      })()}

      {/* ── Move to Folder Modal ────────────────────────────────────────── */}
      <MoveToFolderModal
        isOpen={isMoveModalOpen}
        onClose={() => {
          setIsMoveModalOpen(false);
          setMoveTargetDocIds([]);
        }}
        documentIds={moveTargetDocIds}
      />

      {/* ── Staged import: upload → AI reads → review → confirm ──────────── */}
      <ImportReviewModal
        isOpen={isImportOpen}
        onClose={() => setIsImportOpen(false)}
        onImported={() => {
          queryClient.invalidateQueries({ queryKey: ['documents'] });
          queryClient.invalidateQueries({ queryKey: ['ownerFolders'] });
        }}
      />

      {/* ── Upload Document Modal ────────────────────────────────────────── */}
      <UploadDocumentModal
        isOpen={isUploadOpen}
        onClose={() => setIsUploadOpen(false)}
        folderId={selectedFolderId || undefined}
        onUploadSuccess={() => {
          queryClient.invalidateQueries({ queryKey: ['documents'] });
          queryClient.invalidateQueries({ queryKey: ['folders'] });
        }}
      />


      {/* ── Expiry Radar Modal ───────────────────────────────────────────── */}
      <ExpiryRadarModal
        isOpen={isExpiryModalOpen}
        onClose={() => setIsExpiryModalOpen(false)}
      />

      {/* ── Confirm Bulk Delete Documents Modal ─────────────────────────── */}
      <ConfirmModal
        isOpen={isBulkDeleteOpen}
        onClose={() => {
          setIsBulkDeleteOpen(false);
          setBulkDeleteIds([]);
        }}
        onConfirm={handleBulkDeleteDocuments}
        title="Delete Selected Documents"
        message={`Are you sure you want to permanently delete ${bulkDeleteIds.length} selected document${bulkDeleteIds.length > 1 ? 's' : ''} from the compliance vault? This action cannot be undone.`}
        confirmLabel="Delete Documents"
        isDestructive={true}
        isLoading={isDeleting}
      />

      {/* ── Confirm Delete Document Modal ────────────────────────────────── */}
      <ConfirmModal
        isOpen={!!deleteDocId}
        onClose={() => setDeleteDocId(null)}
        onConfirm={handleDeleteDocument}
        title="Delete Vault Document"
        message="Are you sure you want to permanently delete this document record from the compliance vault? This action cannot be undone."
        confirmLabel="Delete Document"
        isDestructive={true}
        isLoading={isDeleting}
      />

      {/* ── Confirm Delete Folder Modal ──────────────────────────────────── */}
      <ConfirmModal
        isOpen={!!deleteFolderId}
        onClose={() => setDeleteFolderId(null)}
        onConfirm={async () => {
          if (!deleteFolderId) return;
          setIsDeleting(true);
          try {
            await folderService.delete(deleteFolderId);
            toast.success('Folder deleted successfully');
            await queryClient.invalidateQueries({ queryKey: ['folders'] });
            await queryClient.invalidateQueries({ queryKey: ['documents'] });
            if (selectedFolderId === deleteFolderId) setSelectedFolderId(null);
            setDeleteFolderId(null);
          } catch (err) {
            toast.error('Failed to delete folder');
          } finally {
            setIsDeleting(false);
          }
        }}
        title="Delete Folder"
        message="Are you sure you want to delete this folder? Documents inside this folder will not be deleted; they will be moved to unassigned root."
        confirmLabel="Delete Folder"
        isDestructive={true}
        isLoading={isDeleting}
      />
      <AutoAssignModal
        isOpen={isAutoAssignModalOpen}
        onClose={() => setIsAutoAssignModalOpen(false)}
        onSuccess={async () => {
          await queryClient.invalidateQueries({ queryKey: ['documents'] });
          await queryClient.invalidateQueries({ queryKey: ['folders'] });
          await queryClient.invalidateQueries({ queryKey: ['vehicles'] });
          await queryClient.invalidateQueries({ queryKey: ['drivers'] });
        }}
      />
    </DashboardLayout>
  );
}
