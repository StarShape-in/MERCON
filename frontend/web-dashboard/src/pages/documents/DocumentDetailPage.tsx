import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import {
  ArrowLeft, Download, Trash2, ExternalLink, Sparkles, FolderOpen,
  Loader2, FileText, Hash, Building2, Calendar, Plus, ZoomIn, ZoomOut,
  RotateCw, RefreshCw, Maximize2, CheckCircle2, AlertTriangle, XCircle,
  Files as FilesIcon, ShieldAlert, Truck, User, ArrowUpRight, Eye, ChevronRight,
  Clock, ShieldCheck, Lock, Unlock, Info
} from 'lucide-react';
import { toast } from 'sonner';

import DashboardLayout from '@/components/layout/DashboardLayout';
import { documentService } from '@/services/documentService';
import { vehicleService } from '@/services/vehicleService';
import { driverService } from '@/services/driverService';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { documentDisplayName, getExpiryStatus, formatBilingualAuthority, resolveFileUrl } from '@/lib/documents';
import { isImageFile, isPdfFile } from '@/components/ui/DocumentViewerModal';
import { cn } from '@/lib/utils';
import { useDeploymentTimezone, formatInDeploymentTz } from '@/lib/datetime';

const STATUS_CONFIG: Record<string, { label: string; className: string; icon: any }> = {
  expired:  { label: 'Expired',        className: 'bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-950/40 dark:text-rose-450', icon: XCircle },
  critical: { label: 'Expiring Soon',  className: 'bg-rose-50 text-rose-600 border-rose-200 dark:bg-rose-950/30 dark:text-rose-455', icon: AlertTriangle },
  warning:  { label: 'Expiring Soon',  className: 'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/30 dark:text-amber-400', icon: AlertTriangle },
  valid:    { label: 'Valid & Verified', className: 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-450', icon: CheckCircle2 },
  none:     { label: 'No Expiry',     className: 'bg-slate-100 text-slate-600 border-slate-200 dark:bg-slate-800 dark:text-slate-400', icon: FileText },
};

export default function DocumentDetailPage() {
  const { docId } = useParams<{ docId: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const tz = useDeploymentTimezone();

  const [activeFileIdx, setActiveFileIdx] = useState(0);
  const [zoomLevel, setZoomLevel] = useState(1);
  const [rotation, setRotation] = useState(0);
  const [isRescanning, setIsRescanning] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  const addFileInputId = 'detail-add-file-input';

  const { data: document, isLoading, isError } = useQuery({
    queryKey: ['documents', 'detail', docId],
    queryFn: () => documentService.getById(docId!),
    enabled: !!docId,
  });

  const { data: vehicle } = useQuery({
    queryKey: ['vehicle', document?.entity_id],
    queryFn: () => vehicleService.getById(document!.entity_id),
    enabled: !!document && document.entity_type === 'Vehicle',
  });

  const { data: driver } = useQuery({
    queryKey: ['driver', document?.entity_id],
    queryFn: () => driverService.getById(document!.entity_id),
    enabled: !!document && document.entity_type === 'Driver',
  });

  const refresh = async () => {
    await queryClient.invalidateQueries({ queryKey: ['documents', 'detail', docId] });
    await queryClient.invalidateQueries({ queryKey: ['documents'] });
  };

  const files = document?.files && document.files.length > 0
    ? document.files
    : document ? [{ id: 'primary', file_url: document.file_url, mime_type: document.mime_type, label: 'Primary File' }] : [];
  const activeFile = files[activeFileIdx] || files[0];

  const handleZoomIn = () => setZoomLevel((z) => Math.min(z + 0.25, 3));
  const handleZoomOut = () => setZoomLevel((z) => Math.max(z - 0.25, 0.5));
  const handleRotate = () => setRotation((r) => (r + 90) % 360);
  const handleResetView = () => {
    setZoomLevel(1);
    setRotation(0);
  };

  const handleAddFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file || !document) return;
    try {
      toast.loading('Adding file attachment...', { id: 'add-file' });
      await documentService.addFile(document.id, file);
      toast.success('Attachment added successfully', { id: 'add-file' });
      await refresh();
    } catch (err: any) {
      toast.error(err.response?.data?.error?.message || 'Failed to add file attachment', { id: 'add-file' });
    }
  };

  const handleDeleteFile = async (fileId: string) => {
    if (!document || files.length <= 1) {
      toast.error('Cannot delete the last remaining file attachment');
      return;
    }
    if (!confirm('Remove this file attachment?')) return;
    try {
      toast.loading('Removing file...', { id: 'del-file' });
      await documentService.deleteFile(document.id, fileId);
      toast.success('File removed', { id: 'del-file' });
      setActiveFileIdx(0);
      await refresh();
    } catch {
      toast.error('Failed to remove file', { id: 'del-file' });
    }
  };

  const handleRescan = async () => {
    if (!document) return;
    setIsRescanning(true);
    try {
      toast.loading('Running AI Vision OCR extraction...', { id: 'rescan' });
      await documentService.extractDocumentOcr(document.id);
      toast.success('AI Metadata updated', { id: 'rescan' });
      await refresh();
    } catch (err: any) {
      toast.error(err.response?.data?.error?.message || 'AI Vision scan failed', { id: 'rescan' });
    } finally {
      setIsRescanning(false);
    }
  };

  const handleDeleteDocument = async () => {
    if (!document) return;
    if (!confirm('Are you sure you want to delete this document? This action cannot be undone.')) return;
    setIsDeleting(true);
    try {
      await documentService.delete(document.id);
      toast.success('Document deleted successfully');
      await queryClient.invalidateQueries({ queryKey: ['documents'] });
      navigate(document.entity_type === 'Vehicle' ? `/documents/vehicles/${document.entity_id}` : `/documents/drivers/${document.entity_id}`);
    } catch {
      toast.error('Failed to delete document');
      setIsDeleting(false);
    }
  };

  if (isLoading) {
    return (
      <DashboardLayout active="Documents" title="Loading Document...">
        <div className="flex flex-col items-center justify-center min-h-[60vh] gap-3 text-slate-450">
          <Loader2 className="w-8 h-8 animate-spin text-brand" />
          <p className="text-sm font-semibold">Loading document details...</p>
        </div>
      </DashboardLayout>
    );
  }

  if (isError || !document) {
    return (
      <DashboardLayout active="Documents" title="Document Not Found">
        <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4 text-center">
          <div className="w-16 h-16 rounded-full bg-rose-50 text-rose-600 flex items-center justify-center">
            <XCircle className="w-8 h-8" />
          </div>
          <h2 className="text-lg font-bold text-slate-900 dark:text-slate-100">Document Not Found</h2>
          <p className="text-xs text-slate-500 max-w-sm">The document you are trying to view does not exist or has been removed.</p>
          <Button onClick={() => navigate('/documents')} variant="outline" className="gap-2">
            <ArrowLeft className="w-4 h-4" /> Back to Documents Center
          </Button>
        </div>
      </DashboardLayout>
    );
  }

  const expStatus = getExpiryStatus(document.expiry_date);
  const statusCfg = STATUS_CONFIG[expStatus] || STATUS_CONFIG.none;
  const StatusIcon = statusCfg.icon;
  const resolvedUrl = activeFile ? resolveFileUrl(activeFile.file_url) : '';
  const isImg = activeFile ? isImageFile(activeFile.file_url, activeFile.mime_type) : false;
  const isPdf = activeFile ? isPdfFile(activeFile.file_url, activeFile.mime_type) : false;

  const ownerFolderUrl = document.entity_type === 'Vehicle'
    ? `/documents/vehicles/${document.entity_id}`
    : `/documents/drivers/${document.entity_id}`;

  const ownerDisplayName = document.entity_type === 'Vehicle'
    ? (vehicle?.plate_number || vehicle?.ref_id || `Vehicle #${document.entity_id.slice(0, 8)}`)
    : (driver ? `${driver.first_name} ${driver.last_name}` : `Driver #${document.entity_id.slice(0, 8)}`);

  // Document Lifespan & Timeline Calculations
  const daysRemaining = document.expiry_date
    ? Math.ceil((new Date(document.expiry_date).getTime() - Date.now()) / (1000 * 60 * 60 * 24))
    : null;

  const isExpired = daysRemaining !== null && daysRemaining <= 0;
  const isExpiringSoon = daysRemaining !== null && daysRemaining > 0 && daysRemaining <= 30;
  const progressPercent = daysRemaining !== null
    ? Math.max(0, Math.min(100, (daysRemaining / 365) * 100))
    : 100;

  return (
    <DashboardLayout active="Documents" title={documentDisplayName(document)}>
      <div className="px-4 sm:px-6 pb-10 space-y-6 max-w-[1600px] mx-auto">
        
        {/* Header and Breadcrumbs Row */}
        <div className="flex flex-col gap-3 pb-5 border-b border-slate-200 dark:border-slate-800">
          {/* Breadcrumbs */}
          <div className="flex items-center gap-2 text-[11px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">
            <button onClick={() => navigate('/documents')} className="hover:text-brand transition-colors cursor-pointer">
              Documents Vault
            </button>
            <ChevronRight className="w-3 h-3 text-slate-300 dark:text-slate-700" />
            <button onClick={() => navigate(ownerFolderUrl)} className="hover:text-brand transition-colors cursor-pointer">
              {ownerDisplayName}
            </button>
            <ChevronRight className="w-3 h-3 text-slate-300 dark:text-slate-700" />
            <span className="text-slate-700 dark:text-slate-300 font-black">{documentDisplayName(document)}</span>
          </div>

          {/* Main Title & Action Row */}
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-xl bg-brand/10 dark:bg-brand/20 text-brand flex items-center justify-center shrink-0 mt-0.5 shadow-2xs">
                <FileText className="w-5.5 h-5.5" />
              </div>
              <div>
                <div className="flex items-center gap-2.5 flex-wrap">
                  <h1 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-slate-100 tracking-tight leading-none">
                    {documentDisplayName(document)}
                  </h1>
                  <Badge variant="outline" className={cn('text-[11px] font-bold px-2.5 py-0.5 border gap-1 shadow-2xs', statusCfg.className)}>
                    <StatusIcon className="w-3.5 h-3.5" />
                    {statusCfg.label}
                  </Badge>
                  {document.ai_extracted_json && (
                    <Badge className="bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/40 dark:text-amber-400 text-[10px] font-extrabold gap-1.5 shadow-2xs border">
                      <Sparkles className="w-3 h-3 text-amber-600 dark:text-amber-400 animate-pulse" /> AI Extracted
                    </Badge>
                  )}
                </div>
                <p className="text-xs text-slate-400 mt-1 flex items-center gap-2 font-medium">
                  <span>Owner: <strong className="text-slate-700 dark:text-slate-200">{ownerDisplayName}</strong> ({document.entity_type})</span>
                  <span>•</span>
                  <span>Uploaded {formatInDeploymentTz(document.createdAt, tz, 'MMM dd, yyyy')}</span>
                </p>
              </div>
            </div>

            {/* Actions Panel */}
            <div className="flex items-center gap-2 shrink-0 flex-wrap">
              <Button
                variant="outline"
                size="sm"
                onClick={() => navigate(ownerFolderUrl)}
                className="h-9 px-3.5 text-xs font-semibold gap-1.5 border-slate-200 hover:bg-slate-50 dark:border-slate-800 dark:hover:bg-slate-800 cursor-pointer"
              >
                <FolderOpen className="w-3.5 h-3.5 text-slate-400" /> Back to Folder
              </Button>
              <a
                href={resolvedUrl}
                download
                className="h-9 px-3.5 rounded-lg border border-slate-200 dark:border-slate-800 text-xs font-semibold text-slate-700 dark:text-slate-300 bg-white dark:bg-slate-900 hover:bg-slate-50 dark:hover:bg-slate-800 flex items-center gap-1.5 transition-colors shadow-2xs"
              >
                <Download className="w-3.5 h-3.5 text-slate-400" /> Download
              </a>
              {document.documentType?.allowsMultipleFiles !== false && (
                <>
                  <label
                    htmlFor={addFileInputId}
                    className="h-9 px-3.5 rounded-lg bg-brand hover:bg-brand/90 text-white text-xs font-bold flex items-center gap-1.5 cursor-pointer shadow-2xs transition-colors"
                  >
                    <Plus className="w-3.5 h-3.5" /> Add Page
                  </label>
                  <input id={addFileInputId} type="file" accept=".pdf,.png,.jpg,.jpeg,.webp,.heic,.heif,.gif,.doc,.docx,.xls,.xlsx,.txt,.rtf,.csv" className="hidden" onChange={handleAddFile} />
                </>
              )}
              <Button
                variant="outline"
                size="sm"
                className="h-9 px-3.5 text-xs font-semibold gap-1.5 border-rose-200 text-rose-600 hover:bg-rose-50 dark:border-rose-900/50 dark:text-rose-450 dark:hover:bg-rose-950/30 shadow-2xs cursor-pointer"
                onClick={handleDeleteDocument}
                disabled={isDeleting}
              >
                {isDeleting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Trash2 className="w-3.5 h-3.5" />} Delete
              </Button>
            </div>
          </div>
        </div>

        {/* Main Content Grid: 2 Columns */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          
          {/* Left Column (Metadata & Details - 5/12 width) */}
          <div className="lg:col-span-5 space-y-6">
            
            {/* Owner Details Card */}
            <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm p-5 space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-xs font-black text-slate-400 uppercase tracking-wider">Owner Entity</h3>
                <Button
                  size="sm"
                  variant="ghost"
                  className="h-6 text-[11px] font-bold text-brand hover:text-brand-hover gap-1 p-0 hover:bg-transparent cursor-pointer"
                  onClick={() => navigate(ownerFolderUrl)}
                >
                  View Owner Vault <ArrowUpRight className="w-3.5 h-3.5" />
                </Button>
              </div>

              <div className="flex items-center gap-3.5 p-3.5 rounded-xl bg-slate-50 dark:bg-slate-850/50 border border-slate-100 dark:border-slate-800/80">
                <div className="w-12 h-12 rounded-xl bg-brand/10 dark:bg-brand/20 text-brand flex items-center justify-center shrink-0 shadow-2xs">
                  {document.entity_type === 'Vehicle' ? <Truck className="w-6 h-6" /> : <User className="w-6 h-6" />}
                </div>
                <div className="min-w-0 flex-1">
                  <h4 className="text-sm font-black text-slate-900 dark:text-slate-100 truncate">{ownerDisplayName}</h4>
                  <p className="text-xs font-semibold text-slate-400 mt-0.5">
                    {document.entity_type === 'Vehicle' ? `Plate: ${vehicle?.plate_number || 'N/A'}` : `Driver ID: ${document.entity_id.slice(0, 8)}`}
                  </p>
                </div>
              </div>
            </div>

            {/* Visual Compliance & Lifespan Card */}
            <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm p-5 space-y-4">
              <h3 className="text-xs font-black text-slate-400 uppercase tracking-wider">Compliance Status</h3>
              
              <div className="space-y-4">
                {/* Lifespan progress / gauge */}
                {document.expiry_date ? (
                  <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-850/50 border border-slate-100 dark:border-slate-800/80 space-y-2">
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-semibold text-slate-500">Document Validity</span>
                      <span className={cn(
                        'font-black',
                        isExpired ? 'text-rose-600 dark:text-rose-400' :
                        isExpiringSoon ? 'text-amber-600 dark:text-amber-400' :
                        'text-emerald-600 dark:text-emerald-400'
                      )}>
                        {isExpired ? 'Expired' : 
                         daysRemaining === 1 ? '1 Day Remaining' :
                         `${daysRemaining} Days Remaining`}
                      </span>
                    </div>
                    {/* Visual Progress Bar */}
                    <div className="h-2 w-full bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden">
                      <div 
                        className={cn(
                          'h-full rounded-full transition-all duration-500',
                          isExpired ? 'bg-rose-500' :
                          isExpiringSoon ? 'bg-amber-500' :
                          'bg-emerald-500'
                        )} 
                        style={{ width: `${progressPercent}%` }}
                      />
                    </div>
                    <div className="flex items-center justify-between text-[10px] text-slate-400 font-bold uppercase tracking-wider">
                      <span>Uploaded</span>
                      <span>Expires: {formatInDeploymentTz(document.expiry_date, tz, 'MMM dd, yyyy')}</span>
                    </div>
                  </div>
                ) : (
                  <div className="p-4 rounded-xl bg-emerald-50/10 dark:bg-emerald-950/10 border border-emerald-100/50 dark:border-emerald-900/20 flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg bg-emerald-500/10 text-emerald-600 flex items-center justify-center shrink-0">
                      <ShieldCheck className="w-5 h-5" />
                    </div>
                    <div>
                      <p className="text-xs font-black text-emerald-800 dark:text-emerald-300">Indefinite Validity</p>
                      <p className="text-[10px] text-slate-400 mt-0.5">This document has no configured expiration date and stays active indefinitely.</p>
                    </div>
                  </div>
                )}

                {/* Compliance Milestone Checkpoints */}
                <div className="relative pl-6 border-l border-slate-100 dark:border-slate-800 space-y-4 pt-1">
                  
                  {/* Node 1: Upload */}
                  <div className="relative">
                    <span className="absolute -left-[31px] top-0.5 w-4 h-4 rounded-full border-2 border-white dark:border-slate-900 bg-emerald-500 flex items-center justify-center shadow-xs">
                      <CheckCircle2 className="w-2.5 h-2.5 text-white" />
                    </span>
                    <div className="text-xs">
                      <p className="font-black text-slate-800 dark:text-slate-200">Document Uploaded</p>
                      <p className="text-[10px] text-slate-400 font-semibold mt-0.5">
                        Received on {formatInDeploymentTz(document.createdAt, tz, 'MMM dd, yyyy · hh:mm a')}
                      </p>
                    </div>
                  </div>

                  {/* Node 2: AI OCR Vision Scan */}
                  <div className="relative">
                    <span className={cn(
                      'absolute -left-[31px] top-0.5 w-4 h-4 rounded-full border-2 border-white dark:border-slate-900 flex items-center justify-center shadow-xs',
                      document.ai_extracted_json ? 'bg-amber-500' : 'bg-slate-350'
                    )}>
                      {document.ai_extracted_json ? (
                        <Sparkles className="w-2.5 h-2.5 text-white" />
                      ) : (
                        <span className="w-1.5 h-1.5 rounded-full bg-white" />
                      )}
                    </span>
                    <div className="text-xs">
                      <p className="font-black text-slate-800 dark:text-slate-200">AI Vision OCR Check</p>
                      <p className="text-[10px] text-slate-400 font-semibold mt-0.5">
                        {document.ai_extracted_json ? (
                          `Completed with ${Math.round((document.ai_extracted_json.confidence || 0.9) * 100)}% extraction confidence`
                        ) : (
                          'OCR extraction not executed'
                        )}
                      </p>
                    </div>
                  </div>

                  {/* Node 3: Expiry Status */}
                  <div className="relative">
                    <span className={cn(
                      'absolute -left-[31px] top-0.5 w-4 h-4 rounded-full border-2 border-white dark:border-slate-900 flex items-center justify-center shadow-xs',
                      isExpired ? 'bg-rose-500' :
                      isExpiringSoon ? 'bg-amber-500' :
                      'bg-emerald-500'
                    )}>
                      {isExpired ? (
                        <XCircle className="w-2.5 h-2.5 text-white" />
                      ) : (
                        <CheckCircle2 className="w-2.5 h-2.5 text-white" />
                      )}
                    </span>
                    <div className="text-xs">
                      <p className="font-black text-slate-800 dark:text-slate-200">Operational Compliance</p>
                      <p className="text-[10px] text-slate-400 font-semibold mt-0.5">
                        {isExpired ? 'Blocked - Document expired' :
                         isExpiringSoon ? 'Attention - Nearing expiration' :
                         'Approved - Active and compliant'}
                      </p>
                    </div>
                  </div>

                </div>
              </div>
            </div>

            {/* AI Vision OCR Passport Card */}
            <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm p-5 space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-xs font-black text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                  <Sparkles className="w-3.5 h-3.5 text-amber-500" /> AI OCR Passport
                </h3>
                {document.ai_extracted_json && typeof document.ai_extracted_json.confidence === 'number' && (
                  <Badge className="bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400 text-[10px] font-mono font-black border border-emerald-200/50 shadow-2xs">
                    {Math.round(document.ai_extracted_json.confidence * 100)}% CONFIDENCE
                  </Badge>
                )}
              </div>

              {document.ai_extracted_json ? (
                <div className="space-y-4">
                  {/* Simulated Chip/Passport layout */}
                  <div className="relative overflow-hidden rounded-xl border border-amber-200/60 dark:border-amber-900/30 bg-gradient-to-br from-amber-50/40 via-amber-50/10 to-amber-100/10 dark:from-slate-800/40 dark:to-amber-950/15 p-4 shadow-3xs">
                    
                    {/* Simulated smart chip icon in top-right */}
                    <div className="absolute top-4 right-4 w-8 h-6 rounded-md bg-gradient-to-tr from-amber-200 to-amber-300 dark:from-amber-600 dark:to-amber-500 opacity-60 flex flex-col justify-between p-1">
                      <div className="h-[1px] w-full bg-amber-400/50" />
                      <div className="h-[1px] w-full bg-amber-400/50" />
                      <div className="h-[1px] w-full bg-amber-400/50" />
                    </div>

                    <div className="space-y-3">
                      {document.ai_extracted_json.document_number && (
                        <div>
                          <span className="text-[9px] font-black text-slate-400 uppercase tracking-wider block">DOCUMENT NUMBER</span>
                          <span className="font-mono text-base font-black text-slate-900 dark:text-slate-100 tracking-wider">
                            {document.ai_extracted_json.document_number}
                          </span>
                        </div>
                      )}

                      <div className="grid grid-cols-2 gap-4">
                        {document.ai_extracted_json.vehicle_plate && (
                          <div>
                            <span className="text-[9px] font-black text-slate-400 uppercase tracking-wider block">DETECTED PLATE</span>
                            <span className="text-xs font-mono font-black text-slate-800 dark:text-slate-200 flex items-center gap-1 mt-0.5">
                              <Truck className="w-3.5 h-3.5 text-amber-500" />
                              {document.ai_extracted_json.vehicle_plate}
                            </span>
                          </div>
                        )}
                        {document.ai_extracted_json.issuing_authority && (
                          <div>
                            <span className="text-[9px] font-black text-slate-400 uppercase tracking-wider block">AUTHORITY</span>
                            <span className="text-xs font-black text-slate-800 dark:text-slate-200 flex items-center gap-1 mt-0.5 truncate max-w-full">
                              <Building2 className="w-3.5 h-3.5 text-amber-500 shrink-0" />
                              <span className="truncate">{formatBilingualAuthority(document.ai_extracted_json.issuing_authority)}</span>
                            </span>
                          </div>
                        )}
                      </div>

                      {document.ai_extracted_json.notes && (
                        <div className="pt-2.5 border-t border-amber-250/20 dark:border-amber-900/20">
                          <span className="text-[9px] font-black text-slate-400 uppercase tracking-wider block mb-0.5">VISION EXTRACTION NOTES</span>
                          <p className="text-[11px] text-amber-900/90 dark:text-amber-400 font-mono bg-white/50 dark:bg-slate-950/40 p-2 rounded-lg border border-amber-100/50 dark:border-amber-900/10 italic">
                            "{document.ai_extracted_json.notes}"
                          </p>
                        </div>
                      )}
                    </div>
                  </div>

                  <Button
                    variant="outline"
                    size="sm"
                    className="w-full text-xs font-bold gap-1.5 border-amber-300 text-amber-800 dark:border-amber-900 dark:text-amber-400 hover:bg-amber-50/50 dark:hover:bg-amber-955/20 shadow-3xs cursor-pointer"
                    onClick={handleRescan}
                    disabled={isRescanning}
                  >
                    {isRescanning ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Sparkles className="w-3.5 h-3.5" />}
                    Re-Scan Document with AI Vision
                  </Button>
                </div>
              ) : (
                <div className="p-5 rounded-xl border border-dashed border-slate-200 dark:border-slate-800 text-center space-y-4 bg-slate-50/30 dark:bg-slate-950/10">
                  <div className="w-10 h-10 rounded-xl bg-amber-500/10 text-amber-500 flex items-center justify-center mx-auto">
                    <Sparkles className="w-5 h-5 animate-pulse" />
                  </div>
                  <div className="max-w-xs mx-auto">
                    <p className="text-xs font-black text-slate-800 dark:text-slate-200">Vision Analysis Missing</p>
                    <p className="text-[10px] text-slate-500 mt-1">This document has not been processed by Gemini Vision OCR. Run a scan to automatically extract official metadata.</p>
                  </div>
                  <Button
                    size="sm"
                    variant="outline"
                    className="w-full text-xs font-bold gap-1.5 border-amber-300 text-amber-800 dark:border-amber-900 dark:text-amber-400 hover:bg-amber-50/50 dark:hover:bg-amber-955/20 shadow-2xs cursor-pointer"
                    onClick={handleRescan}
                    disabled={isRescanning}
                  >
                    {isRescanning ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Sparkles className="w-3.5 h-3.5" />}
                    Scan with AI Vision
                  </Button>
                </div>
              )}
            </div>

            {/* Technical Attributes Grid */}
            <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm p-5 space-y-4">
              <h3 className="text-xs font-black text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                <Info className="w-3.5 h-3.5 text-slate-400" /> Technical Details
              </h3>
              
              <div className="grid grid-cols-2 gap-3.5">
                <div className="p-3.5 rounded-xl border border-slate-100 dark:border-slate-800 bg-slate-50/40 dark:bg-slate-950/10 space-y-1">
                  <span className="text-[10px] font-black text-slate-400 uppercase tracking-wider block">Requirement</span>
                  <div className="flex items-center gap-1.5 mt-0.5">
                    {document.documentType?.requirementStatus === 'MANDATORY' ? (
                      <>
                        <ShieldAlert className="w-4 h-4 text-rose-500 shrink-0" />
                        <span className="text-xs font-black text-rose-700 dark:text-rose-455 font-black">Mandatory</span>
                      </>
                    ) : (
                      <>
                        <ShieldCheck className="w-4 h-4 text-slate-400 shrink-0" />
                        <span className="text-xs font-bold text-slate-600 dark:text-slate-400">Optional</span>
                      </>
                    )}
                  </div>
                </div>

                <div className="p-3.5 rounded-xl border border-slate-100 dark:border-slate-800 bg-slate-50/40 dark:bg-slate-950/10 space-y-1">
                  <span className="text-[10px] font-black text-slate-400 uppercase tracking-wider block">Privacy Access</span>
                  <div className="flex items-center gap-1.5 mt-0.5">
                    {document.is_confidential ? (
                      <>
                        <Lock className="w-3.5 h-3.5 text-rose-500 shrink-0" />
                        <span className="text-xs font-black text-rose-750 dark:text-rose-450 font-black">Confidential</span>
                      </>
                    ) : (
                      <>
                        <Unlock className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                        <span className="text-xs font-bold text-slate-600 dark:text-slate-400">Standard Access</span>
                      </>
                    )}
                  </div>
                </div>

                <div className="p-3.5 rounded-xl border border-slate-100 dark:border-slate-800 bg-slate-50/40 dark:bg-slate-950/10 space-y-1">
                  <span className="text-[10px] font-black text-slate-400 uppercase tracking-wider block">Configured Type</span>
                  <span className="text-xs font-black text-slate-800 dark:text-slate-200 block truncate mt-0.5">
                    {document.documentType?.name || document.doc_type}
                  </span>
                </div>

                <div className="p-3.5 rounded-xl border border-slate-100 dark:border-slate-800 bg-slate-50/40 dark:bg-slate-950/10 space-y-1">
                  <span className="text-[10px] font-black text-slate-400 uppercase tracking-wider block">Page Count</span>
                  <span className="text-xs font-black text-slate-800 dark:text-slate-200 block mt-0.5">
                    {files.length === 1 ? '1 attached page' : `${files.length} attached pages`}
                  </span>
                </div>
              </div>
            </div>

          </div>

          {/* Right Column (Viewer Canvas - 7/12 width) */}
          <div className="lg:col-span-7 space-y-4">
            <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 overflow-hidden shadow-xs flex flex-col min-h-[580px]">
              
              {/* Canvas Toolbar */}
              <div className="px-4 py-2.5 bg-slate-50 dark:bg-slate-950 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between gap-3 text-slate-700 dark:text-slate-300">
                <div className="flex items-center gap-2 text-xs font-semibold">
                  <span className="text-slate-500">File {activeFileIdx + 1} of {files.length}</span>
                  {activeFile?.label && (
                    <Badge variant="outline" className="text-[10px] border-slate-200 bg-slate-100 text-slate-600 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-400 font-bold">
                      {activeFile.label}
                    </Badge>
                  )}
                </div>

                <div className="flex items-center gap-1">
                  {isImg && (
                    <>
                      <Button 
                        size="icon" 
                        variant="ghost" 
                        className="h-7 w-7 text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer" 
                        onClick={handleZoomOut} 
                        title="Zoom Out"
                      >
                        <ZoomOut className="w-3.5 h-3.5" />
                      </Button>
                      <span className="text-[11px] font-mono font-bold w-10 text-center text-slate-500">{Math.round(zoomLevel * 100)}%</span>
                      <Button 
                        size="icon" 
                        variant="ghost" 
                        className="h-7 w-7 text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer" 
                        onClick={handleZoomIn} 
                        title="Zoom In"
                      >
                        <ZoomIn className="w-3.5 h-3.5" />
                      </Button>
                      <Button 
                        size="icon" 
                        variant="ghost" 
                        className="h-7 w-7 text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer" 
                        onClick={handleRotate} 
                        title="Rotate 90°"
                      >
                        <RotateCw className="w-3.5 h-3.5" />
                      </Button>
                      <Button 
                        size="icon" 
                        variant="ghost" 
                        className="h-7 w-7 text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer" 
                        onClick={handleResetView} 
                        title="Reset View"
                      >
                        <RefreshCw className="w-3.5 h-3.5" />
                      </Button>
                    </>
                  )}
                  <a
                    href={resolvedUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="h-7 px-2 text-xs text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100 hover:bg-slate-100 dark:hover:bg-slate-800 rounded flex items-center gap-1 font-semibold transition-colors"
                    title="Open Fullscreen External"
                  >
                    <Maximize2 className="w-3.5 h-3.5" /> External
                  </a>
                </div>
              </div>

              {/* Viewport Canvas */}
              <div className="flex-1 flex items-center justify-center p-4 min-h-[480px] relative overflow-auto bg-slate-100/50 dark:bg-slate-950/20">
                {isImg ? (
                  <div className="transition-transform duration-150 flex items-center justify-center max-w-full max-h-full shadow-2xs" style={{ transform: `scale(${zoomLevel}) rotate(${rotation}deg)` }}>
                    <img src={resolvedUrl} alt={documentDisplayName(document)} className="max-h-[520px] object-contain rounded-xl shadow-md border border-slate-200/50 dark:border-slate-800/80" />
                  </div>
                ) : isPdf ? (
                  <iframe src={resolvedUrl} title={documentDisplayName(document)} className="w-full h-[540px] rounded-xl border border-slate-200/60 dark:border-slate-800 bg-white" />
                ) : (
                  <div className="flex flex-col items-center justify-center p-8 text-center gap-3 text-slate-400">
                    <FileText className="w-12 h-12 text-slate-400/80" />
                    <p className="text-sm font-semibold text-slate-500">Preview not supported for this file type</p>
                    <a
                      href={resolvedUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="px-4 py-2 rounded-lg bg-brand hover:bg-brand/90 text-white text-xs font-bold flex items-center gap-2 shadow-2xs cursor-pointer"
                    >
                      <ExternalLink className="w-3.5 h-3.5" /> Open File Externally
                    </a>
                  </div>
                )}
              </div>

              {/* Multi-file Carousel Thumbnails */}
              {files.length > 0 && (
                <div className="p-3 bg-slate-50 dark:bg-slate-955 border-t border-slate-200 dark:border-slate-800 flex items-center gap-2.5 overflow-x-auto">
                  {files.map((f, idx) => (
                    <div
                      key={f.id}
                      onClick={() => { setActiveFileIdx(idx); handleResetView(); }}
                      className={cn(
                        'group relative w-16 h-16 rounded-xl border-2 shrink-0 cursor-pointer overflow-hidden bg-white dark:bg-slate-900 flex items-center justify-center transition-all',
                        idx === activeFileIdx ? 'border-brand shadow-xs ring-2 ring-brand/20' : 'border-slate-200 dark:border-slate-800 opacity-60 hover:opacity-100 hover:border-slate-400'
                      )}
                    >
                      {isImageFile(f.file_url, f.mime_type) ? (
                        <img src={resolveFileUrl(f.file_url)} alt="" className="w-full h-full object-cover" />
                      ) : (
                        <FileText className="w-6 h-6 text-slate-400" />
                      )}
                      {files.length > 1 && (
                        <button
                          onClick={(e) => { e.stopPropagation(); handleDeleteFile(f.id); }}
                          className="absolute top-1 right-1 w-4 h-4 rounded-full bg-rose-600 text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity font-bold shadow-xs text-xs"
                          title="Remove attachment"
                        >
                          ×
                        </button>
                      )}
                    </div>
                  ))}
                  {document.documentType?.allowsMultipleFiles !== false && (
                    <label
                      htmlFor={addFileInputId}
                      className="w-16 h-16 rounded-xl border-2 border-dashed border-slate-200 dark:border-slate-800 hover:border-brand shrink-0 flex flex-col items-center justify-center cursor-pointer text-slate-400 hover:text-brand transition-colors"
                      title="Add File Page"
                    >
                      <Plus className="w-5 h-5" />
                      <span className="text-[9px] font-black mt-0.5">Add Page</span>
                    </label>
                  )}
                </div>
              )}
            </div>
          </div>

        </div>
      </div>
    </DashboardLayout>
  );
}

function DetailRow({ label, value, highlight }: { label: string; value: React.ReactNode; highlight?: boolean }) {
  return (
    <div className="flex items-center justify-between px-3.5 py-2.5">
      <span className="text-slate-500 dark:text-slate-400 font-semibold">{label}</span>
      <span className={cn('font-bold text-slate-900 dark:text-slate-100 text-right', highlight && 'text-brand')}>
        {value}
      </span>
    </div>
  );
}

function AiDetailRow({ icon: Icon, label, value }: { icon: any; label: string; value: string }) {
  return (
    <div className="flex items-start gap-2.5">
      <div className="w-5 h-5 rounded-lg bg-amber-500/10 text-amber-600 flex items-center justify-center shrink-0 mt-0.5">
        <Icon className="w-3.5 h-3.5" />
      </div>
      <div>
        <span className="text-[10px] font-black text-amber-800/70 dark:text-amber-500 block uppercase tracking-wider">{label}</span>
        <span className="font-mono font-black text-slate-900 dark:text-slate-100 text-xs">{value}</span>
      </div>
    </div>
  );
}
