import { useMemo, useState, useEffect } from 'react';
import { 
  UploadCloud, FileText, FolderOpen, Shield, Car, User as UserIcon, Eye, Download,
  RotateCw, AlertTriangle, CheckCircle2, FileCheck, Briefcase, Clock, ChevronLeft, ChevronRight,
  ChevronsLeft, ChevronsRight, FileBadge2, FileBarChart2, FileClock, FileKey2, LayoutGrid, List, Check, HardDrive,
  ExternalLink, Trash2, Filter, ShieldAlert, ArrowUpDown, X, FileSpreadsheet, FolderPlus, FolderInput, Folder, CheckSquare, Truck, Sparkles, Loader2, ChevronDown,
  Hash, Building2, Calendar, Search, Lock, Globe
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
import { downloadCSV } from '@/utils/exportUtils';
import { driverService } from '@/services/driverService';
import { vehicleService } from '@/services/vehicleService';
import { tripService } from '@/services/tripService';
import { customerService } from '@/services/customerService';
import { documentDisplayName, categoryForDocType, categoryForEntity, type DocCategory, daysUntil, getExpiryStatus, formatExpiryText, resolveFileUrl, formatBilingualAuthority } from '@/lib/documents';
import FolderCardSection from '@/components/documents/FolderCardSection';
import DocumentPreviewSheet from '@/components/documents/DocumentPreviewSheet';
import ImportReviewModal from '@/components/documents/ImportReviewModal';

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

type PillCategory = 'All' | 'Drivers' | 'Vehicles' | 'Other' | 'Unassigned';
const CATEGORY_TABS: PillCategory[] = ['All', 'Drivers', 'Vehicles', 'Other'];
const PILL_LABEL: Record<PillCategory, string> = {
  All: 'All Documents',
  Drivers: 'Drivers',
  Vehicles: 'Vehicles',
  Other: 'Other Documents',
  Unassigned: 'Unassigned',
};

const CATEGORY_CONFIG: Record<DocCategory, {
  icon: React.ElementType;
  color: string;
  iconBg: string;
  borderColor: string;
  label: string;
  description: string;
}> = {
  Drivers:    { icon: UserIcon,      color: 'text-brand',   iconBg: 'bg-brand-light dark:bg-brand/10', borderColor: 'border-brand/20', label: 'Driver Documents', description: 'Licenses, medical certificates & permits' },
  Vehicles:   { icon: Car,           color: 'text-blue-600',    iconBg: 'bg-blue-50 dark:bg-blue-950/30',    borderColor: 'border-blue-200/60',   label: 'Vehicle Documents', description: 'Registrations, insurance & Istimara' },
  Operations: { icon: Briefcase,     color: 'text-violet-600',  iconBg: 'bg-violet-50 dark:bg-violet-950/30',borderColor: 'border-violet-200/60', label: 'Operations Files', description: 'Waybills, PODs & customs clearance' },
  Company:    { icon: Shield,        color: 'text-emerald-600', iconBg: 'bg-emerald-50 dark:bg-emerald-950/30', borderColor: 'border-emerald-200/60', label: 'Company Records', description: 'Contracts, invoices & corporate filings' },
};

const DOC_TYPE_ICON: Record<string, React.ElementType> = {
  DriverLicense:       FileBadge2,
  Passport:            FileBadge2,
  VehicleRegistration: FileKey2,
  Insurance:           FileCheck,
  POD:                 FileBarChart2,
  CustomsClearance:    FileKey2,
  Waybill:             FileClock,
  Contract:            FileText,
  Invoice:             FileBarChart2,
  Emergency:           ShieldAlert,
};

const REGULATORY_BODY: Record<string, string> = {
  DriverLicense:       'Saudi MOT / Transport Auth',
  Passport:            'Passport Authority',
  VehicleRegistration: 'MOMRAH / Istimara',
  Insurance:           'Najm Insurance Protection',
  POD:                 'MERCON Dispatch System',
  CustomsClearance:    'ZATCA Saudi Customs',
  Waybill:             'Saudi Land Transport Auth',
  Contract:            'Ministry of Commerce',
  Invoice:             'ZATCA Tax Authority',
  Emergency:           'Civil Defense / Operations Center',
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

// ─── Main Page Component ──────────────────────────────────────────────────────

export default function DocumentsCenterPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [searchParams, setSearchParams] = useSearchParams();
  const tz = useDeploymentTimezone();

  // Initial params from URL
  const initialFilter = (searchParams.get('filter') as any) || 'all';
  const rawInitialCategory = searchParams.get('category') || 'All';
  // Operations/Company were separate pills before merging into a single "Other" pill.
  const initialCategory: PillCategory =
    rawInitialCategory === 'Operations' || rawInitialCategory === 'Company'
      ? 'Other'
      : (CATEGORY_TABS as string[]).includes(rawInitialCategory) ? (rawInitialCategory as PillCategory) : 'All';
  const initialRadar = searchParams.get('radar') === 'open';

  // State
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [activeCategory, setActiveCategory] = useState<PillCategory>(initialCategory);
  const [expiryFilter, setExpiryFilter] = useState<'all' | 'expired' | 'critical' | 'warning' | 'valid'>(
    ['all', 'expired', 'critical', 'warning', 'valid'].includes(initialFilter) ? initialFilter : 'all'
  );
  const [search, setSearch] = useState('');
  const [viewMode, setViewMode] = useState<'folders' | 'list' | 'grid'>('folders');
  const [isAutoAssigning, setIsAutoAssigning] = useState(false);
  const [isAutoAssignModalOpen, setIsAutoAssignModalOpen] = useState(false);
  const [selectedDocIds, setSelectedDocIds] = useState<string[]>([]);
  const [previewDoc, setPreviewDoc] = useState<EnrichedDocument | null>(null);
  const [folderSheetDocId, setFolderSheetDocId] = useState<string | null>(null);
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

  // Sync state with URL params when they change
  useEffect(() => {
    const filterParam = searchParams.get('filter');
    if (filterParam && ['all', 'expired', 'critical', 'warning', 'valid'].includes(filterParam)) {
      setExpiryFilter(filterParam as any);
    }
    const catParam = searchParams.get('category');
    if (catParam === 'Operations' || catParam === 'Company') {
      setActiveCategory('Other');
    } else if (catParam && (CATEGORY_TABS as string[]).includes(catParam)) {
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
    queryFn: async () => (await driverService.getAll({ per_page: 1000 })).data,
  });
  const { data: vehicles = [] } = useQuery({
    queryKey: ['vehicles', 'lookup'],
    queryFn: async () => (await vehicleService.getAll({ per_page: 1000 })).data,
  });
  const { data: trips = [] } = useQuery({
    queryKey: ['trips', 'lookup'],
    queryFn: async () => (await tripService.getAll({ per_page: 100 })).data,
  });
  const { data: customers = [] } = useQuery({
    queryKey: ['customers', 'lookup'],
    queryFn: async () => (await customerService.getAll()).data,
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
    () => driverFolders.filter((r) => matchesSearch(search, [
      r.ownerName,
      r.ownerRef || '',
      r.relatedName || '',
      ...r.slots.map((s) => s.name),
      ...r.slots.map((s) => s.code),
    ])),
    [driverFolders, search],
  );
  const filteredVehicleFolders = useMemo(
    () => vehicleFolders.filter((r) => matchesSearch(search, [
      r.ownerName,
      r.ownerRef || '',
      r.relatedName || '',
      ...r.slots.map((s) => s.name),
      ...r.slots.map((s) => s.code),
    ])),
    [vehicleFolders, search],
  );

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
    return docs
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
            : activeCategory === 'Other'
              ? (d.category === 'Operations' || d.category === 'Company')
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
  }, [docs, nameFor, activeCategory, expiryFilter, selectedFolderId, search]);

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
      } else if (doc.category === 'Operations' || doc.entity_type === 'Trip') {
        operationsDocs.push(doc);
      } else if (doc.category === 'Company') {
        companyDocs.push(doc);
      } else {
        unlinkedDocs.push(doc);
      }
    }

    return {
      vehicles: Array.from(vehicleGroups.values()),
      drivers: Array.from(driverGroups.values()),
      operations: operationsDocs,
      company: companyDocs,
      unlinked: unlinkedDocs,
    };
  }, [filteredDocs, vehicles, drivers]);

  const hasFolderResults = useMemo(() => {
    if (activeCategory === 'Vehicles') return filteredVehicleFolders.length > 0;
    if (activeCategory === 'Drivers') return filteredDriverFolders.length > 0;
    if (activeCategory === 'Unassigned') return groupedEntityFolders.unlinked.length > 0;
    if (activeCategory === 'Other') return groupedEntityFolders.operations.length > 0 || groupedEntityFolders.company.length > 0;
    return (
      filteredVehicleFolders.length > 0 ||
      filteredDriverFolders.length > 0 ||
      groupedEntityFolders.operations.length > 0 ||
      groupedEntityFolders.company.length > 0 ||
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

        {/* ── Page Header ─────────────────────────────────────────────────── */}
        <div className="flex flex-wrap items-center justify-between gap-4 shrink-0 pb-3 border-b border-slate-200 dark:border-slate-800">
          <div className="flex items-center gap-3">
            <FolderOpen className="w-6 h-6 text-orange-500 dark:text-orange-400 shrink-0" />
            <div className="flex items-center gap-2.5">
              <h1 className="text-2xl font-extrabold text-slate-900 dark:text-slate-100 tracking-tight">
                Documents Center
              </h1>
              <Badge variant="outline" className="bg-brand-light text-brand border-brand/20 text-[10px] font-bold tracking-wide uppercase px-2.5 py-0.5">
                Compliance Module
              </Badge>
            </div>
          </div>

          <div className="flex items-center gap-2.5">
            {/* Export CSV Action */}
            <Button
              variant="outline"
              size="sm"
              className="h-9 gap-1.5 text-xs font-semibold border-slate-200 bg-white hover:bg-slate-50 text-slate-700 shadow-2xs dark:bg-slate-900 dark:border-slate-800 dark:text-slate-300"
              onClick={() => downloadCSV(filteredDocs, 'documents_export.csv')}
            >
              <Download className="w-3.5 h-3.5" />
              Export CSV
            </Button>

            {/* Expiry Radar Trigger */}
            <Button
              variant="outline"
              size="sm"
              className="h-9 gap-1.5 text-xs font-semibold border-slate-200 bg-white hover:bg-rose-50 shadow-2xs text-rose-600 hover:text-rose-700 dark:bg-slate-900 dark:border-slate-800"
              onClick={() => setIsExpiryModalOpen(true)}
            >
              <AlertTriangle className="h-3.5 w-3.5 text-rose-500" />
              Expiry Radar {(expiringSoonCount + expiredCount) > 0 && (
                <span className="ml-0.5 bg-rose-500 text-white text-[9px] font-bold rounded-full px-1.5 py-0.5">
                  {expiringSoonCount + expiredCount}
                </span>
              )}
            </Button>

            {/* Add Documents & Folders Action Menu */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  size="sm"
                  className="h-9 gap-1.5 text-xs bg-brand hover:bg-brand-hover text-white font-bold shadow-xs rounded-lg px-3.5"
                >
                  <UploadCloud className="w-4 h-4" /> Add Documents & Folders <ChevronDown className="w-3.5 h-3.5 opacity-80" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56 rounded-xl">
                <DropdownMenuLabel className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                  Add Documents & Folders
                </DropdownMenuLabel>
                <DropdownMenuItem
                  onClick={() => setIsImportOpen(true)}
                  className="cursor-pointer text-xs font-semibold gap-2 py-2"
                >
                  <UploadCloud className="w-4 h-4 text-brand" />
                  <span>Upload Files / Documents</span>
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={() => setIsImportOpen(true)}
                  className="cursor-pointer text-xs font-semibold gap-2 py-2"
                >
                  <Folder className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
                  <span>Upload Whole Folder</span>
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  onClick={() => setIsFolderChoiceOpen(true)}
                  className="cursor-pointer text-xs font-semibold gap-2 py-2"
                >
                  <FolderPlus className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                  <span>Create New Folder</span>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>

            {/* Refresh Button */}
          </div>
        </div>

        {/* ── Instrument-Panel KPI Cards ───────────────────────────────────── */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 shrink-0">
          <KpiCard
            title="TOTAL VAULT DOCUMENTS"
            value={totalDocsCount}
            variant="slate"
            icon={<FolderOpen className="w-4 h-4 text-slate-600 dark:text-slate-400" />}
            trend="neutral"
            trendValue={`${totalDocsCount} active records`}
            description="Compliance repository"
            progressSegments={[
              { label: 'Drivers', value: foldersByCategory.Drivers.count, color: '#3B82F6' },
              { label: 'Vehicles', value: foldersByCategory.Vehicles.count, color: '#10B981' },
              { label: 'Operations', value: foldersByCategory.Operations.count, color: '#7C3AED' },
              { label: 'Company', value: foldersByCategory.Company.count, color: '#F59E0B' },
            ]}
            isActive={expiryFilter === 'all' && activeCategory === 'All'}
            onClick={() => {
              setExpiryFilter('all');
              setActiveCategory('All');
            }}
          />

          <KpiCard
            title="COMPLIANT & VALID"
            value={safeCount}
            variant="emerald"
            icon={<CheckCircle2 className="w-4 h-4 text-emerald-600" />}
            trend={expiredCount === 0 ? 'up' : 'neutral'}
            trendValue={`${compliancePct}% compliant`}
            description="No immediate action needed"
            completionGauge={{ 
              percentage: compliancePct, 
              label: 'Vault Compliance',
              subtext: `${nonExpiredCount} Compliant of ${totalDocsCount}`
            }}
            isActive={expiryFilter === 'valid'}
            onClick={() => setExpiryFilter(expiryFilter === 'valid' ? 'all' : 'valid')}
          />

          <KpiCard
            title="EXPIRING SOON (<30D)"
            value={expiringSoonCount}
            variant="amber"
            icon={<Clock className="w-4 h-4 text-amber-600" />}
            trend={expiringSoonCount > 0 ? 'down' : 'up'}
            trendValue={expiringSoonCount > 0 ? `${expiringSoonCount} files due renewal` : 'All docs current'}
            description="Renewal window"
            progressSegments={[
              { label: `${criticalCount} Critical (<7d)`, value: criticalCount, color: 'bg-rose-500' },
              { label: `${warningCount} Warning (<30d)`, value: warningCount, color: 'bg-amber-500' },
            ]}
            isActive={expiryFilter === 'warning' || expiryFilter === 'critical'}
            onClick={() => setExpiryFilter(expiryFilter === 'warning' || expiryFilter === 'critical' ? 'all' : 'warning')}
          />

          <KpiCard
            title="EXPIRED / OVERDUE"
            value={expiredCount}
            variant="rose"
            icon={<AlertTriangle className="w-4 h-4 text-rose-600" />}
            trend={expiredCount > 0 ? 'down' : 'neutral'}
            trendValue={expiredCount > 0 ? `${expiredCount} immediate action` : '0 expired files'}
            description="Lapsed legal records"
            progressSegments={[
              { label: 'Expired', value: expiredCount > 0 ? 100 : 0, color: 'bg-rose-600' },
            ]}
            isActive={expiryFilter === 'expired'}
            onClick={() => setExpiryFilter(expiryFilter === 'expired' ? 'all' : 'expired')}
          />
        </div>


        {/* ── Category Tabs & Toolbar Control Bar ──────────────────────────── */}
        <div className="flex flex-wrap items-center justify-between gap-3 shrink-0 bg-slate-50/80 dark:bg-slate-900/60 p-2.5 rounded-2xl border border-slate-200/80 dark:border-slate-800">
          {/* Category Filter Pills */}
          <div className="flex items-center gap-1 overflow-x-auto p-1 rounded-xl bg-slate-100/70 dark:bg-slate-800/40">
            {CATEGORY_TABS.map((cat) => {
              const count = cat === 'All'
                ? docs.length
                : cat === 'Unassigned'
                  ? groupedEntityFolders.unlinked.length
                  : cat === 'Other'
                    ? foldersByCategory.Operations.count + foldersByCategory.Company.count
                    : (foldersByCategory[cat]?.count || 0);
              const isActive = activeCategory === cat;
              const isUnassignedPill = cat === 'Unassigned';
              if (isUnassignedPill && count === 0) return null;

              return (
                <button
                  key={cat}
                  onClick={() => setActiveCategory(cat)}
                  className={cn(
                    'px-3 py-1.5 text-xs font-semibold rounded-lg transition-all flex items-center gap-1.5 whitespace-nowrap',
                    isActive
                      ? isUnassignedPill
                        ? 'bg-amber-600 text-white shadow-2xs'
                        : 'bg-white dark:bg-slate-800 text-brand shadow-2xs ring-1 ring-slate-200 dark:ring-slate-700'
                      : isUnassignedPill
                        ? 'text-amber-700 dark:text-amber-400 hover:bg-amber-50 dark:hover:bg-amber-950/40'
                        : 'text-slate-500 dark:text-slate-400 hover:bg-white/70 dark:hover:bg-slate-800/70 hover:text-slate-800 dark:hover:text-slate-200'
                  )}
                >
                  {isUnassignedPill && <Sparkles size={12} className={isActive ? 'text-white' : 'text-amber-500'} />}
                  <span>{PILL_LABEL[cat]}</span>
                  {cat !== 'All' && (
                    <span className={cn(
                      'text-[10px] font-mono font-bold',
                      isActive ? (isUnassignedPill ? 'text-white/80' : 'text-brand/70') : 'text-slate-400 dark:text-slate-500'
                    )}>
                      {count}
                    </span>
                  )}
                </button>
              );
            })}
          </div>

          {/* Search, Status Filters & View Mode Switcher */}
          <div className="flex flex-wrap items-center gap-2.5">
            {/* Search Input */}
            <div className="relative min-w-[200px] sm:w-64">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search ID, driver, plate, doc..."
                className="w-full h-9 pl-9 pr-8 text-xs font-medium rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 placeholder:text-slate-400 focus:outline-hidden focus:ring-2 focus:ring-brand/20 focus:border-brand transition-all shadow-2xs"
              />
              {search && (
                <button
                  type="button"
                  onClick={() => setSearch('')}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-0.5 rounded-full"
                  title="Clear search"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            {/* Expiry Filter Select */}
            <Select value={expiryFilter} onValueChange={(v) => setExpiryFilter(v as any)}>
              <SelectTrigger className="h-9 w-40 text-xs font-semibold border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 shadow-2xs">
                <div className="flex items-center gap-1.5">
                  <Filter className="w-3.5 h-3.5 text-slate-400" />
                  <SelectValue placeholder="Expiry Status" />
                </div>
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all" className="text-xs font-semibold">All Statuses</SelectItem>
                <SelectItem value="expired" className="text-xs text-rose-600 font-semibold">
                  <span className="flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-rose-600 shrink-0" />
                    <span>Expired</span>
                  </span>
                </SelectItem>
                <SelectItem value="critical" className="text-xs text-rose-500 font-semibold">
                  <span className="flex items-center gap-1.5">
                    <AlertTriangle className="w-3.5 h-3.5 text-rose-500 shrink-0" />
                    <span>Critical (&lt;7d)</span>
                  </span>
                </SelectItem>
                <SelectItem value="warning" className="text-xs text-amber-600 font-semibold">
                  <span className="flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-amber-500 shrink-0" />
                    <span>Due Soon (&lt;30d)</span>
                  </span>
                </SelectItem>
                <SelectItem value="valid" className="text-xs text-emerald-600 font-semibold">
                  <span className="flex items-center gap-1.5">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                    <span>Valid</span>
                  </span>
                </SelectItem>
              </SelectContent>
            </Select>

            {/* Select All Toggle Button */}
            <Button
              variant={selectedDocIds.length > 0 ? "default" : "outline"}
              size="sm"
              onClick={toggleSelectAll}
              className={cn(
                "h-9 text-xs font-semibold px-3 shadow-2xs gap-1.5 transition-colors",
                selectedDocIds.length > 0
                  ? "bg-indigo-600 hover:bg-indigo-700 text-white border-indigo-600"
                  : "border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200"
              )}
              title={selectedDocIds.length === filteredDocs.length && filteredDocs.length > 0 ? "Deselect All Documents" : "Select All Filtered Documents"}
            >
              <CheckSquare className="w-3.5 h-3.5" />
              <span>
                {selectedDocIds.length === filteredDocs.length && filteredDocs.length > 0
                  ? `Deselect All (${selectedDocIds.length})`
                  : selectedDocIds.length > 0
                  ? `Selected (${selectedDocIds.length}/${filteredDocs.length})`
                  : "Select All"}
              </span>
            </Button>

            {/* View Mode Switcher */}
            <div className="flex items-center bg-white dark:bg-slate-800 p-1 rounded-xl border border-slate-200 dark:border-slate-700 shadow-2xs">
              <button
                onClick={() => setViewMode('folders')}
                className={cn(
                  'p-1.5 px-2.5 rounded-lg transition-all text-xs flex items-center gap-1.5 font-bold',
                  viewMode === 'folders'
                    ? 'bg-brand text-white shadow-2xs'
                    : 'text-slate-500 hover:text-slate-900 dark:hover:text-slate-100'
                )}
                title="Grouped Folder Explorer View"
              >
                <FolderOpen size={14} />
                <span>Folders View</span>
              </button>
              <button
                onClick={() => setViewMode('list')}
                className={cn(
                  'p-1.5 px-2 rounded-lg transition-all text-xs flex items-center gap-1 font-semibold',
                  viewMode === 'list'
                    ? 'bg-slate-900 text-white dark:bg-slate-100 dark:text-slate-900 shadow-2xs'
                    : 'text-slate-500 hover:text-slate-900 dark:hover:text-slate-100'
                )}
                title="List View"
              >
                <List size={14} />
                <span>List</span>
              </button>
              <button
                onClick={() => setViewMode('grid')}
                className={cn(
                  'p-1.5 px-2 rounded-lg transition-all text-xs flex items-center gap-1 font-semibold',
                  viewMode === 'grid'
                    ? 'bg-slate-900 text-white dark:bg-slate-100 dark:text-slate-900 shadow-2xs'
                    : 'text-slate-500 hover:text-slate-900 dark:hover:text-slate-100'
                )}
                title="Grid View"
              >
                <LayoutGrid size={14} />
                <span>Grid</span>
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
              <div className="w-14 h-14 rounded-2xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center">
                <FolderOpen className="w-7 h-7 text-slate-300 dark:text-slate-600" />
              </div>
              <div className="text-center">
                <p className="text-sm font-bold text-slate-700 dark:text-slate-300">
                  {search ? `No compliance folders matching "${search}"` : 'No compliance folders found'}
                </p>
                <p className="text-xs text-slate-400 mt-0.5">Try clearing your search query or status filter</p>
              </div>
            </div>
          ) : (
            <div className="space-y-8">
              {/* GROUPED FOLDERS DEFAULT VIEW MODE */}

            {/* 1. Vehicles Group Section — every vehicle, including those with
                zero documents uploaded yet, so Missing is always visible */}
            {(activeCategory === 'All' || activeCategory === 'Vehicles') && (
              <FolderCardSection
                title="Vehicle Compliance Folders"
                icon={<Truck className="w-4 h-4 text-emerald-600" />}
                noun="Vehicles"
                rows={filteredVehicleFolders}
                onOpenRow={(row) => navigate(`/documents/vehicles/${row.ownerId}`)}
                onPreviewDocument={setFolderSheetDocId}
                onUploadMissing={(row, slotCode) => setUploadMissingTarget({ row, slotCode })}
              />
            )}

            {/* 2. Drivers Group Section — every driver, including those with
                zero documents uploaded yet, so Missing is always visible */}
            {(activeCategory === 'All' || activeCategory === 'Drivers') && (
              <FolderCardSection
                title="Driver Compliance Folders"
                icon={<UserIcon className="w-4 h-4 text-blue-600" />}
                noun="Drivers"
                rows={filteredDriverFolders}
                onOpenRow={(row) => navigate(`/documents/drivers/${row.ownerId}`)}
                onPreviewDocument={setFolderSheetDocId}
                onUploadMissing={(row, slotCode) => setUploadMissingTarget({ row, slotCode })}
              />
            )}

          </div>
          )
        ) : filteredDocs.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 gap-3 text-slate-400 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800">
            <div className="w-14 h-14 rounded-2xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center">
              <FolderOpen className="w-7 h-7 text-slate-300 dark:text-slate-600" />
            </div>
            <div className="text-center">
              <p className="text-sm font-bold text-slate-700 dark:text-slate-300">
                {search ? `No documents matching "${search}"` : 'No documents found'}
              </p>
              <p className="text-xs text-slate-400 mt-0.5">Try clearing your search query or status filter</p>
            </div>
          </div>
        ) : viewMode === 'list' ? (
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
                        {formatInDeploymentTz(row.expiry_date, tz, 'MM/dd/yyyy')}
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
                label: 'Export CSV',
                icon: <Download size={13} />,
                variant: 'secondary' as const,
                onClick: (selectedRows: EnrichedDocument[]) => {
                  downloadCSV(selectedRows, 'documents_export.csv');
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
        ) : (
          
          /* GRID VIEW MODE */
          <>
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-5 shrink-0">
              {filteredDocs.map((doc) => {
                const DocIcon = DOC_TYPE_ICON[doc.doc_type] ?? FileText;
                const expBadge = EXPIRY_BADGE[doc.expStatus];
                const catCfg = CATEGORY_CONFIG[doc.category];
                const isSelected = selectedDocIds.includes(doc.id);

                return (
                  <Card
                    key={doc.id}
                    className={cn(
                      "border rounded-2xl overflow-hidden shadow-2xs hover:shadow-xs transition-all duration-150 ease-in-out bg-white dark:bg-slate-900 flex flex-col justify-between outline-none focus-visible:ring-2 focus-visible:ring-brand/30 relative",
                      isSelected
                        ? "border-indigo-500 ring-2 ring-indigo-500/20 bg-indigo-50/10 dark:bg-indigo-950/20"
                        : "border-slate-200 dark:border-slate-800 hover:border-brand/45 hover:-translate-y-0.5"
                    )}
                    tabIndex={0}
                    role="button"
                    aria-label={`Document: ${documentDisplayName(doc)} for ${doc.entityName}`}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault();
                        setPreviewDoc(doc);
                      }
                    }}
                  >
                    <CardContent className="p-4 space-y-3">
                      {/* Header Top */}
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2.5">
                          <input
                            type="checkbox"
                            checked={isSelected}
                            onChange={(e) => {
                              e.stopPropagation();
                              toggleSelectRow(doc.id);
                            }}
                            className="w-4 h-4 rounded border-slate-300 dark:border-slate-700 text-indigo-600 focus:ring-indigo-500 cursor-pointer"
                            aria-label={`Select document ${documentDisplayName(doc)}`}
                          />
                          <div className={cn('w-9 h-9 rounded-xl flex items-center justify-center shrink-0', catCfg.iconBg)}>
                            <DocIcon className={cn('w-4.5 h-4.5', catCfg.color)} />
                          </div>
                        </div>
                        <span className={cn('text-[10px] font-bold px-2 py-0.5 rounded-full border', expBadge.className)}>
                          {expBadge.label}
                        </span>
                      </div>

                      {/* Document Info */}
                      <div>
                        <h4 
                          onClick={() => setPreviewDoc(doc)}
                          className="font-extrabold text-sm text-slate-900 dark:text-slate-100 hover:text-brand cursor-pointer truncate"
                        >
                          {documentDisplayName(doc)}
                        </h4>
                        <p className="text-xs text-slate-500 font-medium truncate mt-0.5">{doc.entityName}</p>
                      </div>

                      {/* Issuer & Expiry */}
                      <div className="bg-slate-50 dark:bg-slate-800/50 p-2 rounded-lg border border-slate-100 dark:border-slate-800 space-y-1 text-[11px]">
                        <div className="flex justify-between text-slate-500">
                          <span>Issuer:</span>
                          <span className="font-semibold text-slate-700 dark:text-slate-300 truncate max-w-[120px]">{doc.issuer}</span>
                        </div>
                        {doc.expiry_date && (
                          <div className="flex justify-between text-slate-500">
                            <span>Expires:</span>
                            <span className="font-mono font-semibold text-slate-700 dark:text-slate-300">
                              {formatInDeploymentTz(doc.expiry_date, tz, 'MM/dd/yyyy')}
                            </span>
                          </div>
                        )}
                      </div>
                    </CardContent>

                    {/* Actions Footer */}
                    <div className="p-3 border-t border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50 flex items-center justify-between gap-1.5">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setPreviewDoc(doc)}
                        className="h-7 text-xs font-semibold text-slate-600 dark:text-slate-300 hover:text-brand gap-1 px-2"
                      >
                        <Eye size={13} /> Preview
                      </Button>

                      <div className="flex items-center gap-1">
                        <a
                          href={doc.file_url}
                          download
                          className="h-7 px-2 rounded-md bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs font-bold text-slate-700 dark:text-slate-200 hover:bg-slate-50 flex items-center gap-1 shadow-2xs"
                        >
                          <Download size={13} /> Download
                        </a>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={(e) => {
                            e.stopPropagation();
                            setDeleteDocId(doc.id);
                          }}
                          className="h-7 w-7 p-0 text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 rounded-md"
                          title="Delete Document"
                        >
                          <Trash2 size={13} />
                        </Button>
                      </div>
                    </div>
                  </Card>
                );
              })}
            </div>

            {/* Grid View Floating Bulk Action Bar */}
            {viewMode === 'grid' && selectedDocIds.length > 0 && (
              <BulkActionBar
                selectedCount={selectedDocIds.length}
                onClear={() => setSelectedDocIds([])}
              >
                <Button
                  variant="outline"
                  size="sm"
                  className="h-8 text-xs font-semibold gap-1.5 bg-white dark:bg-slate-800"
                  onClick={() => {
                    setMoveTargetDocIds(selectedDocIds);
                    setIsMoveModalOpen(true);
                  }}
                >
                  <FolderInput size={13} /> Move to Folder
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  className="h-8 text-xs font-extrabold gap-1.5 border-amber-200 bg-amber-50 hover:bg-amber-100 text-amber-800 dark:bg-amber-950/40 dark:border-amber-800 dark:text-amber-300"
                  onClick={() => handleBulkExtractSelectedDocs(selectedDocIds)}
                  disabled={isAiOcrRunning}
                >
                  {isAiOcrRunning ? (
                    <>
                      <Loader2 size={13} className="text-amber-600 animate-spin" />
                      <span>Extracting AI...</span>
                    </>
                  ) : (
                    <>
                      <Sparkles size={13} className="text-amber-600 dark:text-amber-400 fill-amber-500/20" />
                      <span>AI Vision Auto-Extract</span>
                    </>
                  )}
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  className="h-8 text-xs font-semibold gap-1.5 bg-white dark:bg-slate-800"
                  onClick={handleBulkDownload}
                  disabled={isDownloadingZip}
                >
                  <Download size={13} /> Bulk Download ZIP
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  className="h-8 text-xs font-semibold gap-1.5 bg-white dark:bg-slate-800"
                  onClick={() => downloadCSV(filteredDocs.filter(d => selectedDocIds.includes(d.id)), 'documents_export.csv')}
                >
                  <Download size={13} /> Export CSV
                </Button>
                <Button
                  size="sm"
                  className="h-8 text-xs font-semibold gap-1.5 bg-rose-600 hover:bg-rose-700 text-white"
                  onClick={() => {
                    setBulkDeleteIds(selectedDocIds);
                    setIsBulkDeleteOpen(true);
                  }}
                >
                  <Trash2 size={13} /> Delete Selected
                </Button>
              </BulkActionBar>
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
              <div className="w-10 h-10 rounded-xl bg-indigo-50 dark:bg-indigo-950/60 flex items-center justify-center text-indigo-600 dark:text-indigo-400 shrink-0 border border-indigo-200/60 dark:border-indigo-800/60 shadow-xs">
                <FileText className="w-5 h-5" />
              </div>
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
                        <div className="w-16 h-16 rounded-2xl bg-indigo-50 dark:bg-indigo-950/60 flex items-center justify-center text-indigo-600 dark:text-indigo-400 border border-indigo-200 dark:border-indigo-800">
                          <FileText className="w-8 h-8" />
                        </div>
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

      {/* ── Owner-folder document preview sheet (Drivers/Vehicles cards) ─── */}
      <DocumentPreviewSheet
        documentId={folderSheetDocId}
        onClose={() => setFolderSheetDocId(null)}
        showOpenFolder
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
