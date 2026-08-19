import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import {
  ArrowLeft, Download, Trash2, ExternalLink, Sparkles, FolderOpen,
  Loader2, FileText, Hash, Building2, Calendar, Plus, ZoomIn, ZoomOut,
  RotateCw, RefreshCw, Maximize2, CheckCircle2, AlertTriangle, XCircle,
  Files as FilesIcon, ShieldAlert, Truck, User, ArrowUpRight, Eye
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
  expired:  { label: 'Expired',        className: 'bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-950/40 dark:text-rose-400', icon: XCircle },
  critical: { label: 'Expiring Soon',  className: 'bg-rose-50 text-rose-600 border-rose-200 dark:bg-rose-950/30 dark:text-rose-400', icon: AlertTriangle },
  warning:  { label: 'Expiring Soon',  className: 'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/30 dark:text-amber-400', icon: AlertTriangle },
  valid:    { label: 'Valid & Verified', className: 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-400', icon: CheckCircle2 },
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
        <div className="flex flex-col items-center justify-center min-h-[60vh] gap-3 text-slate-400">
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

  return (
    <DashboardLayout active="Documents" title={documentDisplayName(document)}>
      <div className="px-4 sm:px-6 pb-10 space-y-6 max-w-[1600px] mx-auto">
        
        {/* Navigation Breadcrumb Bar */}
        <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
          <div className="flex items-center gap-2 text-xs font-semibold text-slate-500 dark:text-slate-400">
            <button onClick={() => navigate('/documents')} className="hover:text-slate-900 dark:hover:text-slate-100 transition-colors">
              Documents Vault
            </button>
            <span>/</span>
            <button onClick={() => navigate(ownerFolderUrl)} className="hover:text-slate-900 dark:hover:text-slate-100 transition-colors">
              {ownerDisplayName}
            </button>
            <span>/</span>
            <span className="text-slate-900 dark:text-slate-100 font-bold">{documentDisplayName(document)}</span>
          </div>

          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => navigate(ownerFolderUrl)}
              className="h-8 text-xs font-semibold gap-1.5"
            >
              <FolderOpen className="w-3.5 h-3.5" /> Back to Owner Folder
            </Button>
          </div>
        </div>

        {/* Header Title Section */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-xs">
          <div className="flex items-start gap-4">
            <div className="w-12 h-12 rounded-xl bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 flex items-center justify-center shrink-0 border border-indigo-100 dark:border-indigo-900/50 shadow-xs">
              <FileText className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2.5 flex-wrap">
                <h1 className="text-xl font-black text-slate-900 dark:text-slate-100 tracking-tight">
                  {documentDisplayName(document)}
                </h1>
                <Badge variant="outline" className={cn('text-xs font-bold px-2.5 py-0.5 border gap-1', statusCfg.className)}>
                  <StatusIcon className="w-3.5 h-3.5" />
                  {statusCfg.label}
                </Badge>
                {document.ai_extracted_json && (
                  <Badge className="bg-amber-100 text-amber-800 border-amber-300 dark:bg-amber-950/60 dark:text-amber-300 text-[10px] font-bold gap-1">
                    <Sparkles className="w-3 h-3" /> AI Extracted
                  </Badge>
                )}
              </div>
              <p className="text-xs text-slate-400 mt-1 flex items-center gap-2">
                <span>Owner: <strong className="text-slate-700 dark:text-slate-200">{ownerDisplayName}</strong> ({document.entity_type})</span>
                <span>•</span>
                <span>Uploaded {formatInDeploymentTz(document.createdAt, tz, 'MMM dd, yyyy')}</span>
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <a
              href={resolvedUrl}
              download
              className="h-9 px-3.5 rounded-lg border border-slate-200 dark:border-slate-700 text-xs font-bold text-slate-700 dark:text-slate-200 bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700 flex items-center gap-1.5 transition-colors shadow-xs"
            >
              <Download className="w-3.5 h-3.5" /> Download
            </a>
            {document.documentType?.allowsMultipleFiles !== false && (
              <>
                <label
                  htmlFor={addFileInputId}
                  className="h-9 px-3.5 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold flex items-center gap-1.5 cursor-pointer shadow-xs transition-colors"
                >
                  <Plus className="w-3.5 h-3.5" /> Add File Page
                </label>
                <input id={addFileInputId} type="file" accept=".pdf,.png,.jpg,.jpeg,.webp" className="hidden" onChange={handleAddFile} />
              </>
            )}
            <Button
              variant="outline"
              size="sm"
              className="h-9 px-3 text-xs font-bold gap-1.5 border-rose-200 text-rose-600 hover:bg-rose-50 dark:border-rose-800 dark:hover:bg-rose-950/40"
              onClick={handleDeleteDocument}
              disabled={isDeleting}
            >
              {isDeleting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Trash2 className="w-3.5 h-3.5" />} Delete
            </Button>
          </div>
        </div>

        {/* Main Content Grid: 2 Columns */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          
          {/* Left Column (Viewer Canvas - 7/12 width) */}
          <div className="lg:col-span-7 space-y-4">
            <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-900 overflow-hidden shadow-md flex flex-col min-h-[560px]">
              
              {/* Canvas Toolbar */}
              <div className="px-4 py-3 bg-slate-950/90 border-b border-slate-800/80 flex items-center justify-between gap-3 text-slate-300">
                <div className="flex items-center gap-2 text-xs font-medium">
                  <span className="text-slate-400">File {activeFileIdx + 1} of {files.length}</span>
                  {activeFile?.label && (
                    <Badge variant="outline" className="text-[10px] border-slate-700 bg-slate-800 text-slate-300">
                      {activeFile.label}
                    </Badge>
                  )}
                </div>

                <div className="flex items-center gap-1">
                  {isImg && (
                    <>
                      <Button size="icon" variant="ghost" className="h-7 w-7 text-slate-300 hover:text-white hover:bg-slate-800" onClick={handleZoomOut} title="Zoom Out">
                        <ZoomOut className="w-3.5 h-3.5" />
                      </Button>
                      <span className="text-[11px] font-mono w-10 text-center text-slate-400">{Math.round(zoomLevel * 100)}%</span>
                      <Button size="icon" variant="ghost" className="h-7 w-7 text-slate-300 hover:text-white hover:bg-slate-800" onClick={handleZoomIn} title="Zoom In">
                        <ZoomIn className="w-3.5 h-3.5" />
                      </Button>
                      <Button size="icon" variant="ghost" className="h-7 w-7 text-slate-300 hover:text-white hover:bg-slate-800" onClick={handleRotate} title="Rotate 90°">
                        <RotateCw className="w-3.5 h-3.5" />
                      </Button>
                      <Button size="icon" variant="ghost" className="h-7 w-7 text-slate-300 hover:text-white hover:bg-slate-800" onClick={handleResetView} title="Reset View">
                        <RefreshCw className="w-3.5 h-3.5" />
                      </Button>
                    </>
                  )}
                  <a
                    href={resolvedUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="h-7 px-2 text-xs text-slate-300 hover:text-white hover:bg-slate-800 rounded flex items-center gap-1 font-medium"
                    title="Open Fullscreen External"
                  >
                    <Maximize2 className="w-3.5 h-3.5" /> External
                  </a>
                </div>
              </div>

              {/* Viewport Canvas */}
              <div className="flex-1 flex items-center justify-center p-4 min-h-[460px] relative overflow-auto bg-slate-950/60">
                {isImg ? (
                  <div className="transition-transform duration-150 flex items-center justify-center max-w-full max-h-full" style={{ transform: `scale(${zoomLevel}) rotate(${rotation}deg)` }}>
                    <img src={resolvedUrl} alt={documentDisplayName(document)} className="max-h-[500px] object-contain rounded shadow-lg" />
                  </div>
                ) : isPdf ? (
                  <iframe src={resolvedUrl} title={documentDisplayName(document)} className="w-full h-[520px] rounded border-0 bg-white" />
                ) : (
                  <div className="flex flex-col items-center justify-center p-8 text-center gap-3 text-slate-400">
                    <FileText className="w-12 h-12 text-slate-600" />
                    <p className="text-sm font-semibold">Preview not supported for this file type</p>
                    <a
                      href={resolvedUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="px-4 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold flex items-center gap-2"
                    >
                      <ExternalLink className="w-3.5 h-3.5" /> Open File Externally
                    </a>
                  </div>
                )}
              </div>

              {/* Multi-file Carousel Thumbnails */}
              {files.length > 0 && (
                <div className="p-3 bg-slate-950 border-t border-slate-800/80 flex items-center gap-2 overflow-x-auto">
                  {files.map((f, idx) => (
                    <div
                      key={f.id}
                      onClick={() => { setActiveFileIdx(idx); handleResetView(); }}
                      className={cn(
                        'group relative w-16 h-16 rounded-xl border-2 shrink-0 cursor-pointer overflow-hidden bg-slate-900 flex items-center justify-center transition-all',
                        idx === activeFileIdx ? 'border-indigo-500 shadow-md ring-2 ring-indigo-500/30' : 'border-slate-800 opacity-60 hover:opacity-100'
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
                          className="absolute top-1 right-1 w-4 h-4 rounded-full bg-rose-600 text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
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
                      className="w-16 h-16 rounded-xl border-2 border-dashed border-slate-700 hover:border-indigo-500 shrink-0 flex flex-col items-center justify-center cursor-pointer text-slate-400 hover:text-indigo-400 transition-colors"
                      title="Add File Page"
                    >
                      <Plus className="w-5 h-5" />
                      <span className="text-[9px] font-bold mt-0.5">Add Page</span>
                    </label>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Right Column (Metadata & Details - 5/12 width) */}
          <div className="lg:col-span-5 space-y-5">
            
            {/* Owner Details Card */}
            <div className="p-4 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-xs space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="text-xs font-extrabold text-slate-400 uppercase tracking-wider">Owner Entity Details</h3>
                <Button
                  size="sm"
                  variant="ghost"
                  className="h-6 text-[11px] font-bold text-indigo-600 dark:text-indigo-400 gap-1 p-0 hover:bg-transparent"
                  onClick={() => navigate(ownerFolderUrl)}
                >
                  View Owner Vault <ArrowUpRight className="w-3.5 h-3.5" />
                </Button>
              </div>

              <div className="flex items-center gap-3 p-3 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-800">
                <div className="w-10 h-10 rounded-xl bg-indigo-100 dark:bg-indigo-950 text-indigo-700 dark:text-indigo-300 flex items-center justify-center shrink-0">
                  {document.entity_type === 'Vehicle' ? <Truck className="w-5 h-5" /> : <User className="w-5 h-5" />}
                </div>
                <div className="min-w-0 flex-1">
                  <h4 className="text-sm font-black text-slate-900 dark:text-slate-100 truncate">{ownerDisplayName}</h4>
                  <p className="text-xs text-slate-400">
                    {document.entity_type === 'Vehicle' ? `Plate: ${vehicle?.plate_number || 'N/A'}` : `Driver ID: ${document.entity_id.slice(0, 8)}`}
                  </p>
                </div>
              </div>
            </div>

            {/* Document Attributes */}
            <div className="p-4 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-xs space-y-3">
              <h3 className="text-xs font-extrabold text-slate-400 uppercase tracking-wider">Document Details</h3>

              <div className="rounded-xl border border-slate-200 dark:border-slate-800 divide-y divide-slate-100 dark:divide-slate-800 text-xs">
                <DetailRow label="Requirement Status" value={document.documentType?.requirementStatus || 'OPTIONAL'} highlight />
                <DetailRow label="Configured Type" value={document.documentType?.name || document.doc_type} />
                {document.issue_date && (
                  <DetailRow label="Issue Date" value={formatInDeploymentTz(document.issue_date, tz, 'MM/dd/yyyy')} />
                )}
                {document.expiry_date ? (
                  <DetailRow label="Expiry Date" value={formatInDeploymentTz(document.expiry_date, tz, 'MM/dd/yyyy')} />
                ) : (
                  <DetailRow label="Expiry Date" value="No Expiry Date" />
                )}
                <DetailRow label="Total Pages / Files" value={`${files.length} attached`} />
                <DetailRow label="Confidential Status" value={document.is_confidential ? 'Confidential' : 'Standard Access'} />
              </div>
            </div>

            {/* AI Vision Extracted Metadata */}
            <div className="p-4 rounded-2xl border border-amber-200/80 dark:border-amber-900/50 bg-amber-50/40 dark:bg-amber-950/20 shadow-xs space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="text-xs font-extrabold text-amber-700 dark:text-amber-400 uppercase tracking-wider flex items-center gap-1.5">
                  <Sparkles className="w-4 h-4 text-amber-600 dark:text-amber-400" /> AI Vision OCR Analysis
                </h3>
                {typeof document.ai_extracted_json?.confidence === 'number' && (
                  <Badge className="bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 text-[10px] font-mono font-bold border-emerald-300">
                    {Math.round(document.ai_extracted_json.confidence * 100)}% Confidence
                  </Badge>
                )}
              </div>

              {document.ai_extracted_json ? (
                <div className="space-y-2 text-xs">
                  <div className="p-3 rounded-xl bg-white dark:bg-slate-900 border border-amber-200/60 dark:border-amber-900/40 space-y-2">
                    {document.ai_extracted_json.document_number && (
                      <AiDetailRow icon={Hash} label="Document Number" value={document.ai_extracted_json.document_number} />
                    )}
                    {document.ai_extracted_json.vehicle_plate && (
                      <AiDetailRow icon={Truck} label="Detected Plate" value={document.ai_extracted_json.vehicle_plate} />
                    )}
                    {document.ai_extracted_json.issuing_authority && (
                      <AiDetailRow icon={Building2} label="Issuing Authority" value={formatBilingualAuthority(document.ai_extracted_json.issuing_authority)} />
                    )}
                    {document.ai_extracted_json.notes && (
                      <p className="text-[11px] text-amber-900 dark:text-amber-300 italic pt-1 border-t border-amber-100 dark:border-amber-900/40">
                        "{document.ai_extracted_json.notes}"
                      </p>
                    )}
                  </div>

                  <Button
                    variant="outline"
                    size="sm"
                    className="w-full text-xs font-bold gap-1.5 border-amber-300 text-amber-800 dark:text-amber-300 hover:bg-amber-100 dark:hover:bg-amber-950/60"
                    onClick={handleRescan}
                    disabled={isRescanning}
                  >
                    {isRescanning ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Sparkles className="w-3.5 h-3.5" />}
                    Re-Scan with AI Vision
                  </Button>
                </div>
              ) : (
                <div className="p-3 rounded-xl bg-white dark:bg-slate-900 border border-amber-200/60 dark:border-amber-900/40 text-center space-y-2">
                  <p className="text-xs text-slate-500">No AI OCR metadata has been extracted yet.</p>
                  <Button
                    size="sm"
                    variant="outline"
                    className="text-xs font-bold gap-1.5 border-amber-300 text-amber-800 dark:text-amber-300"
                    onClick={handleRescan}
                    disabled={isRescanning}
                  >
                    {isRescanning ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Sparkles className="w-3.5 h-3.5" />}
                    Scan Document with AI Vision
                  </Button>
                </div>
              )}
            </div>

          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}

function DetailRow({ label, value, highlight }: { label: string; value: string; highlight?: boolean }) {
  return (
    <div className="flex items-center justify-between px-3.5 py-2.5">
      <span className="text-slate-500 dark:text-slate-400 font-medium">{label}</span>
      <span className={cn('font-bold text-slate-900 dark:text-slate-100 text-right', highlight && 'text-indigo-600 dark:text-indigo-400')}>
        {value}
      </span>
    </div>
  );
}

function AiDetailRow({ icon: Icon, label, value }: { icon: any; label: string; value: string }) {
  return (
    <div className="flex items-start gap-2">
      <Icon className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400 mt-0.5 shrink-0" />
      <div>
        <span className="text-[10px] font-bold text-amber-800/70 dark:text-amber-400/80 block uppercase tracking-wider">{label}</span>
        <span className="font-mono font-extrabold text-amber-950 dark:text-amber-100">{value}</span>
      </div>
    </div>
  );
}
