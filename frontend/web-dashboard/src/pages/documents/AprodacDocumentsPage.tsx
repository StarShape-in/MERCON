import { useState, useEffect, useRef } from 'react';
import DashboardLayout from '@/components/layout/DashboardLayout';
import {
  FolderGit2, FileText, Image as ImageIcon, Upload, Search, Download, Eye,
  Trash2, Edit, RefreshCw, FileCode, CheckCircle2, Clock, ShieldCheck,
  X, Filter, LayoutGrid, List, Sparkles, AlertCircle, FilePlus, ExternalLink,
  ChevronDown, HardDrive, Tag
} from 'lucide-react';

export interface AprodacDocument {
  id: string;
  title: string;
  category: 'Software Agreements' | 'System Architecture' | 'SLA & Maintenance' | 'Commercials & Invoices' | 'Release Notes & Handover';
  version: string;
  fileType: 'pdf' | 'image';
  mimeType: string;
  fileName: string;
  sizeBytes: number;
  status: 'Active' | 'Under Review' | 'Archived';
  uploadedAt: string;
  uploadedBy: string;
  description: string;
  tags: string[];
  dataUrl?: string; // Base64 data URL for uploaded files
}

const DEFAULT_DOCUMENTS: AprodacDocument[] = [
  {
    id: 'apr-doc-1',
    title: 'Aprodac Master Software Services Agreement',
    category: 'Software Agreements',
    version: 'v1.0',
    fileType: 'pdf',
    mimeType: 'application/pdf',
    fileName: 'Aprodac_Master_Software_Services_Agreement_2026.pdf',
    sizeBytes: 2516582, // 2.4 MB
    status: 'Active',
    uploadedAt: '2026-01-15',
    uploadedBy: 'Admin User',
    description: 'Primary development contract, scope of work, warranty terms, and IP assignment for MERCON platform.',
    tags: ['contract', 'msa', 'ip-transfer', 'legal'],
  },
  {
    id: 'apr-doc-2',
    title: 'MERCON Platform System Architecture Diagram',
    category: 'System Architecture',
    version: 'v2.1',
    fileType: 'image',
    mimeType: 'image/png',
    fileName: 'MERCON_Architecture_Blueprint_v2.1.png',
    sizeBytes: 4300000, // 4.1 MB
    status: 'Active',
    uploadedAt: '2026-03-10',
    uploadedBy: 'Aprodac Lead Architect',
    description: 'High-resolution architectural blueprint detailing API Gateway, Prisma DB layer, Nginx reverse proxy, and microservices.',
    tags: ['architecture', 'blueprint', 'diagram', 'docker'],
  },
  {
    id: 'apr-doc-3',
    title: 'Aprodac SLA & 24/7 Maintenance Support Terms 2026',
    category: 'SLA & Maintenance',
    version: 'v1.5',
    fileType: 'pdf',
    mimeType: 'application/pdf',
    fileName: 'Aprodac_SLA_Maintenance_Terms_2026.pdf',
    sizeBytes: 1887436, // 1.8 MB
    status: 'Active',
    uploadedAt: '2026-04-01',
    uploadedBy: 'Aprodac Operations',
    description: '99.9% Uptime SLA commitment, emergency hotfix response tiers, and routine system maintenance schedules.',
    tags: ['sla', 'support', 'maintenance', 'uptime'],
  },
  {
    id: 'apr-doc-4',
    title: 'Database ERD & RBAC Access Control Specification',
    category: 'System Architecture',
    version: 'v2.0',
    fileType: 'image',
    mimeType: 'image/png',
    fileName: 'Prisma_Schema_RBAC_Wireframes.png',
    sizeBytes: 3355443, // 3.2 MB
    status: 'Active',
    uploadedAt: '2026-05-18',
    uploadedBy: 'Aprodac Lead Engineer',
    description: 'Entity Relationship Diagram, state machine flowcharts, 3-role security model (Admin, Operator, Driver), and audit logging.',
    tags: ['erd', 'security', 'rbac', 'database'],
  },
  {
    id: 'apr-doc-5',
    title: 'Aprodac Cyber Security Audit & Penetration Test Report',
    category: 'Software Agreements',
    version: 'v1.0',
    fileType: 'pdf',
    mimeType: 'application/pdf',
    fileName: 'Aprodac_Security_Audit_Certificate.pdf',
    sizeBytes: 1258291, // 1.2 MB
    status: 'Active',
    uploadedAt: '2026-06-22',
    uploadedBy: 'Compliance Manager',
    description: 'Third-party security audit results, vulnerability penetration test certificates, and encryption verification.',
    tags: ['security', 'audit', 'compliance', 'cert'],
  },
  {
    id: 'apr-doc-6',
    title: 'MERCON Developer Handover & API Integration Guide',
    category: 'Release Notes & Handover',
    version: 'v3.0',
    fileType: 'pdf',
    mimeType: 'application/pdf',
    fileName: 'MERCON_Developer_Handover_Guide_v3.0.pdf',
    sizeBytes: 3670016, // 3.5 MB
    status: 'Active',
    uploadedAt: '2026-07-05',
    uploadedBy: 'Aprodac Tech Lead',
    description: 'Complete handover package for REST API endpoints, JWT auth routines, Docker deployment setup, and mobile build pipelines.',
    tags: ['handover', 'api-docs', 'integration', 'deployment'],
  },
];

const STORAGE_KEY = 'mercon_aprodac_documents_vault';

export default function AprodacDocumentsPage() {
  const [documents, setDocuments] = useState<AprodacDocument[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }
    } catch {
      // Fallback
    }
    return DEFAULT_DOCUMENTS;
  });

  // Save to localStorage whenever documents change
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(documents));
    } catch {
      // Ignore quota errors gracefully
    }
  }, [documents]);

  // Filters & State
  const [searchTerm, setSearchTerm] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<string>('All');
  const [typeFilter, setTypeFilter] = useState<string>('All');
  const [statusFilter, setStatusFilter] = useState<string>('All');
  const [viewMode, setViewMode] = useState<'list' | 'grid'>('list');

  // Modals
  const [isUploadOpen, setIsUploadOpen] = useState(false);
  const [previewDoc, setPreviewDoc] = useState<AprodacDocument | null>(null);
  const [editingDoc, setEditingDoc] = useState<AprodacDocument | null>(null);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);

  // Upload Form state
  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const [uploadPreviewUrl, setUploadPreviewUrl] = useState<string | null>(null);
  const [uploadTitle, setUploadTitle] = useState('');
  const [uploadCategory, setUploadCategory] = useState<AprodacDocument['category']>('Software Agreements');
  const [uploadVersion, setUploadVersion] = useState('v1.0');
  const [uploadStatus, setUploadStatus] = useState<AprodacDocument['status']>('Active');
  const [uploadDescription, setUploadDescription] = useState('');
  const [uploadTags, setUploadTags] = useState('');
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Refresh handler
  const handleRefresh = () => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        setDocuments(JSON.parse(saved));
      } else {
        setDocuments(DEFAULT_DOCUMENTS);
      }
    } catch {
      setDocuments(DEFAULT_DOCUMENTS);
    }
  };

  // Reset upload form
  const resetUploadForm = () => {
    setUploadFile(null);
    setUploadPreviewUrl(null);
    setUploadTitle('');
    setUploadCategory('Software Agreements');
    setUploadVersion('v1.0');
    setUploadStatus('Active');
    setUploadDescription('');
    setUploadTags('');
    setUploadError(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  // File selection / drag drop validator
  const handleFileSelected = (file: File) => {
    setUploadError(null);
    const validPdf = file.type === 'application/pdf' || file.name.endsWith('.pdf');
    const validImage = file.type.startsWith('image/') || /\.(png|jpe?g|webp|svg)$/i.test(file.name);

    if (!validPdf && !validImage) {
      setUploadError('Invalid file format. Please upload a PDF document (.pdf) or an Image (.png, .jpg, .webp, .svg).');
      return;
    }

    if (file.size > 25 * 1024 * 1024) {
      setUploadError('File size exceeds the 25MB limit.');
      return;
    }

    setUploadFile(file);
    if (!uploadTitle) {
      // Auto-populate title from filename
      const cleanTitle = file.name.replace(/\.[^/.]+$/, '').replace(/[-_]/g, ' ');
      setUploadTitle(cleanTitle.charAt(0).toUpperCase() + cleanTitle.slice(1));
    }

    // Generate preview URL
    const reader = new FileReader();
    reader.onload = (e) => {
      setUploadPreviewUrl(e.target?.result as string);
    };
    reader.readAsDataURL(file);
  };

  // Submit New Document
  const handleSaveDocument = (e: React.FormEvent) => {
    e.preventDefault();
    if (!uploadFile && !editingDoc) {
      setUploadError('Please select a PDF or Image file to upload.');
      return;
    }

    if (!uploadTitle.trim()) {
      setUploadError('Please enter a document title.');
      return;
    }

    if (editingDoc) {
      // Editing existing document metadata
      const updated = documents.map(doc => {
        if (doc.id === editingDoc.id) {
          return {
            ...doc,
            title: uploadTitle.trim(),
            category: uploadCategory,
            version: uploadVersion.trim() || 'v1.0',
            status: uploadStatus,
            description: uploadDescription.trim(),
            tags: uploadTags.split(',').map(t => t.trim()).filter(Boolean),
            ...(uploadPreviewUrl ? {
              dataUrl: uploadPreviewUrl,
              fileName: uploadFile?.name || doc.fileName,
              sizeBytes: uploadFile?.size || doc.sizeBytes,
              fileType: (uploadFile?.type === 'application/pdf' || uploadFile?.name.endsWith('.pdf')) ? 'pdf' as const : 'image' as const,
              mimeType: uploadFile?.type || doc.mimeType,
            } : {})
          };
        }
        return doc;
      });
      setDocuments(updated);
      setEditingDoc(null);
    } else if (uploadFile) {
      // Adding new document
      const isPdf = uploadFile.type === 'application/pdf' || uploadFile.name.endsWith('.pdf');
      const newDoc: AprodacDocument = {
        id: `apr-doc-${Date.now()}`,
        title: uploadTitle.trim(),
        category: uploadCategory,
        version: uploadVersion.trim() || 'v1.0',
        fileType: isPdf ? 'pdf' : 'image',
        mimeType: uploadFile.type || (isPdf ? 'application/pdf' : 'image/png'),
        fileName: uploadFile.name,
        sizeBytes: uploadFile.size,
        status: uploadStatus,
        uploadedAt: new Date().toISOString().split('T')[0],
        uploadedBy: 'Admin User',
        description: uploadDescription.trim() || 'Uploaded developer document from Aprodac.',
        tags: uploadTags.split(',').map(t => t.trim()).filter(Boolean),
        dataUrl: uploadPreviewUrl || undefined,
      };

      setDocuments([newDoc, ...documents]);
    }

    setIsUploadOpen(false);
    resetUploadForm();
  };

  // Start Edit
  const handleEditClick = (doc: AprodacDocument) => {
    setEditingDoc(doc);
    setUploadTitle(doc.title);
    setUploadCategory(doc.category);
    setUploadVersion(doc.version);
    setUploadStatus(doc.status);
    setUploadDescription(doc.description);
    setUploadTags(doc.tags.join(', '));
    setUploadPreviewUrl(doc.dataUrl || null);
    setIsUploadOpen(true);
  };

  // Delete Document
  const handleDeleteDocument = (id: string) => {
    setDocuments(prev => prev.filter(d => d.id !== id));
    setDeleteConfirmId(null);
    if (previewDoc?.id === id) setPreviewDoc(null);
  };

  // Download Document
  const handleDownload = (doc: AprodacDocument) => {
    if (doc.dataUrl) {
      const a = document.createElement('a');
      a.href = doc.dataUrl;
      a.download = doc.fileName;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
    } else {
      // Generate synthetic sample file content for default seed items if no base64 URL
      const content = `MERCON DEVELOPER VAULT DOCUMENT\n===================================\nCompany: Aprodac Technologies\nDocument Title: ${doc.title}\nCategory: ${doc.category}\nVersion: ${doc.version}\nStatus: ${doc.status}\nUploaded Date: ${doc.uploadedAt}\nDescription: ${doc.description}\n\n[Verified Developer Attachment from Aprodac]`;
      const blob = new Blob([content], { type: doc.mimeType || 'text/plain' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = doc.fileName;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    }
  };

  // Export List as CSV
  const handleExportCsv = () => {
    const headers = ['ID', 'Title', 'Category', 'Version', 'File Type', 'File Name', 'Size (Bytes)', 'Status', 'Uploaded Date', 'Uploaded By', 'Description'];
    const rows = filteredDocuments.map(d => [
      d.id,
      `"${d.title.replace(/"/g, '""')}"`,
      `"${d.category}"`,
      d.version,
      d.fileType.toUpperCase(),
      `"${d.fileName}"`,
      d.sizeBytes,
      d.status,
      d.uploadedAt,
      `"${d.uploadedBy}"`,
      `"${d.description.replace(/"/g, '""')}"`
    ]);

    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `Aprodac_Developer_Documents_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Format Helper
  const formatBytes = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
  };

  // Filter Logic
  const filteredDocuments = documents.filter(doc => {
    const matchesSearch =
      doc.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      doc.fileName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      doc.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
      doc.tags.some(t => t.toLowerCase().includes(searchTerm.toLowerCase())) ||
      doc.version.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesCategory = categoryFilter === 'All' || doc.category === categoryFilter;
    const matchesType = typeFilter === 'All' || doc.fileType === typeFilter.toLowerCase();
    const matchesStatus = statusFilter === 'All' || doc.status === statusFilter;

    return matchesSearch && matchesCategory && matchesType && matchesStatus;
  });

  // KPI Calculations
  const totalDocs = documents.length;
  const pdfCount = documents.filter(d => d.fileType === 'pdf').length;
  const imageCount = documents.filter(d => d.fileType === 'image').length;
  const totalStorage = documents.reduce((acc, d) => acc + d.sizeBytes, 0);

  return (
    <DashboardLayout
      active="/aprodac-documents"
      title="Aprodac Developer Documents"
      breadcrumb="Admin / Aprodac Vault"
      pageTitle={
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-xl bg-indigo-50 text-indigo-600 border border-indigo-200 shadow-sm">
            <FolderGit2 className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-bold text-zinc-900 tracking-tight">Aprodac Developer Documents</h1>
              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-indigo-50 text-indigo-700 border border-indigo-200">
                Aprodac Dev Module
              </span>
            </div>
            <p className="text-xs text-zinc-500 mt-0.5">
              Secure administrative repository for software agreements, system architecture blueprints, SLAs, and technical attachments from developer partner <strong className="text-zinc-700">Aprodac</strong>.
            </p>
          </div>
        </div>
      }
      actions={
        <div className="flex items-center gap-2">
          {/* Scope Pill */}
          <div className="hidden md:flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-zinc-100 border border-zinc-200 text-xs font-semibold text-zinc-700 shadow-xs">
            <span>💻 Aprodac Dev Vault</span>
          </div>

          <button
            onClick={handleExportCsv}
            className="px-3 py-1.5 rounded-lg border border-zinc-300 hover:bg-zinc-50 text-zinc-700 text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer"
            title="Export CSV document ledger"
          >
            <Download size={14} />
            <span>Export CSV</span>
          </button>

          <button
            onClick={() => {
              editingDoc && setEditingDoc(null);
              resetUploadForm();
              setIsUploadOpen(true);
            }}
            className="px-3.5 py-1.5 rounded-lg bg-brand text-white hover:bg-brand/90 text-xs font-bold flex items-center gap-1.5 shadow-sm transition-all cursor-pointer"
          >
            <FilePlus size={15} />
            <span>+ Upload Document</span>
          </button>

          <button
            onClick={handleRefresh}
            className="p-1.5 rounded-lg border border-zinc-200 text-zinc-500 hover:text-zinc-800 hover:bg-zinc-100 transition-colors cursor-pointer"
            title="Refresh repository"
          >
            <RefreshCw size={15} />
          </button>
        </div>
      }
    >
      <div className="space-y-6 pb-12">
        {/* ── 1. Instrument-Panel KPI Cards ── */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Card 1: Total Documents */}
          <div className="relative overflow-hidden rounded-xl border border-zinc-200 bg-white p-4 shadow-xs">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-extrabold uppercase tracking-wider text-zinc-500">Total Dev Documents</span>
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-indigo-50 text-indigo-600">
                <FileCode size={16} />
              </div>
            </div>
            <div className="mt-2 flex items-baseline gap-2">
              <span className="text-2xl font-black text-zinc-900">{totalDocs}</span>
              <span className="text-xs font-semibold text-emerald-600 flex items-center gap-0.5">
                ↑ 100% Active
              </span>
            </div>
            <p className="mt-1 text-[11px] text-zinc-500">Aprodac official specifications & contracts</p>
            {/* Sparkline decoration */}
            <div className="absolute bottom-0 inset-x-0 h-1.5 bg-gradient-to-r from-indigo-500 to-purple-500 opacity-80" />
          </div>

          {/* Card 2: PDF Agreements */}
          <div className="relative overflow-hidden rounded-xl border border-zinc-200 bg-white p-4 shadow-xs">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-extrabold uppercase tracking-wider text-zinc-500">PDF Contracts & SLAs</span>
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-rose-50 text-rose-600">
                <FileText size={16} />
              </div>
            </div>
            <div className="mt-2 flex items-baseline gap-2">
              <span className="text-2xl font-black text-rose-700">{pdfCount}</span>
              <span className="text-xs font-semibold text-rose-600">PDF Format</span>
            </div>
            <p className="mt-1 text-[11px] text-zinc-500">MSAs, SLA terms, security certifications</p>
            <div className="absolute bottom-0 inset-x-0 h-1.5 bg-gradient-to-r from-rose-500 to-pink-500 opacity-80" />
          </div>

          {/* Card 3: System Specs & Diagrams */}
          <div className="relative overflow-hidden rounded-xl border border-zinc-200 bg-white p-4 shadow-xs">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-extrabold uppercase tracking-wider text-zinc-500">Architecture & Blueprints</span>
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-50 text-blue-600">
                <ImageIcon size={16} />
              </div>
            </div>
            <div className="mt-2 flex items-baseline gap-2">
              <span className="text-2xl font-black text-blue-700">{imageCount}</span>
              <span className="text-xs font-semibold text-blue-600">Image Format</span>
            </div>
            <p className="mt-1 text-[11px] text-zinc-500">Database ERDs, UI wireframes, flowcharts</p>
            <div className="absolute bottom-0 inset-x-0 h-1.5 bg-gradient-to-r from-blue-500 to-cyan-500 opacity-80" />
          </div>

          {/* Card 4: Total Storage Used */}
          <div className="relative overflow-hidden rounded-xl border border-zinc-200 bg-white p-4 shadow-xs">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-extrabold uppercase tracking-wider text-zinc-500">Vault Capacity Used</span>
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-50 text-emerald-600">
                <HardDrive size={16} />
              </div>
            </div>
            <div className="mt-2 flex items-baseline gap-2">
              <span className="text-2xl font-black text-emerald-700">{formatBytes(totalStorage)}</span>
              <span className="text-xs font-semibold text-emerald-600">Encrypted</span>
            </div>
            <p className="mt-1 text-[11px] text-zinc-500">Verified checksums & persistent storage</p>
            <div className="absolute bottom-0 inset-x-0 h-1.5 bg-gradient-to-r from-emerald-500 to-teal-500 opacity-80" />
          </div>
        </div>

        {/* ── 2. Toolbar & Control Bar ── */}
        <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3 bg-white p-3 rounded-xl border border-zinc-200 shadow-xs">
          {/* Left: Search input */}
          <div className="relative flex-1 min-w-[240px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400 w-4 h-4" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search ID, document title, version, tags, or description..."
              className="w-full pl-9 pr-4 py-2 bg-zinc-50 border border-zinc-200 rounded-lg text-xs text-zinc-800 placeholder-zinc-400 focus:outline-none focus:ring-2 focus:ring-brand/20 focus:border-brand transition-all"
            />
            {searchTerm && (
              <button
                onClick={() => setSearchTerm('')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-zinc-600"
              >
                <X size={14} />
              </button>
            )}
          </div>

          {/* Center: Dropdown Filters */}
          <div className="flex flex-wrap items-center gap-2">
            {/* Category Dropdown */}
            <div className="relative">
              <select
                value={categoryFilter}
                onChange={(e) => setCategoryFilter(e.target.value)}
                className="appearance-none pl-3 pr-8 py-2 bg-zinc-50 border border-zinc-200 rounded-lg text-xs font-medium text-zinc-700 focus:outline-none focus:ring-2 focus:ring-brand/20 focus:border-brand cursor-pointer"
              >
                <option value="All">🔀 All Categories</option>
                <option value="Software Agreements">Software Agreements</option>
                <option value="System Architecture">System Architecture</option>
                <option value="SLA & Maintenance">SLA & Maintenance</option>
                <option value="Commercials & Invoices">Commercials & Invoices</option>
                <option value="Release Notes & Handover">Release Notes & Handover</option>
              </select>
              <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-zinc-400 pointer-events-none" />
            </div>

            {/* File Type Dropdown */}
            <div className="relative">
              <select
                value={typeFilter}
                onChange={(e) => setTypeFilter(e.target.value)}
                className="appearance-none pl-3 pr-8 py-2 bg-zinc-50 border border-zinc-200 rounded-lg text-xs font-medium text-zinc-700 focus:outline-none focus:ring-2 focus:ring-brand/20 focus:border-brand cursor-pointer"
              >
                <option value="All">📦 All File Types</option>
                <option value="PDF">📄 PDF Documents</option>
                <option value="Image">🖼️ Image Files</option>
              </select>
              <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-zinc-400 pointer-events-none" />
            </div>

            {/* Status Dropdown */}
            <div className="relative">
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="appearance-none pl-3 pr-8 py-2 bg-zinc-50 border border-zinc-200 rounded-lg text-xs font-medium text-zinc-700 focus:outline-none focus:ring-2 focus:ring-brand/20 focus:border-brand cursor-pointer"
              >
                <option value="All">⚡ All Statuses</option>
                <option value="Active">Active</option>
                <option value="Under Review">Under Review</option>
                <option value="Archived">Archived</option>
              </select>
              <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-zinc-400 pointer-events-none" />
            </div>
          </div>

          {/* Right: View Switcher */}
          <div className="flex items-center bg-zinc-100 p-1 rounded-lg border border-zinc-200 shrink-0 self-start md:self-auto">
            <button
              onClick={() => setViewMode('list')}
              className={`p-1.5 rounded-md text-xs font-semibold flex items-center gap-1 transition-all cursor-pointer ${
                viewMode === 'list'
                  ? 'bg-white text-zinc-900 shadow-xs'
                  : 'text-zinc-500 hover:text-zinc-800'
              }`}
              title="List View"
            >
              <List size={15} />
              <span className="hidden sm:inline">List</span>
            </button>
            <button
              onClick={() => setViewMode('grid')}
              className={`p-1.5 rounded-md text-xs font-semibold flex items-center gap-1 transition-all cursor-pointer ${
                viewMode === 'grid'
                  ? 'bg-white text-zinc-900 shadow-xs'
                  : 'text-zinc-500 hover:text-zinc-800'
              }`}
              title="Grid View"
            >
              <LayoutGrid size={15} />
              <span className="hidden sm:inline">Grid</span>
            </button>
          </div>
        </div>

        {/* ── 3. Data Table Ledger / Grid View ── */}
        <div className="bg-white rounded-xl border border-zinc-200 shadow-xs overflow-hidden">
          {/* Header Bar */}
          <div className="px-4 py-3.5 bg-zinc-50 border-b border-zinc-200 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="text-base">📁</span>
              <h2 className="text-xs font-bold text-zinc-800 uppercase tracking-wider">Aprodac Document Ledger</h2>
            </div>
            <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-zinc-200/70 text-zinc-700">
              {filteredDocuments.length} {filteredDocuments.length === 1 ? 'record' : 'records'}
            </span>
          </div>

          {/* Empty State */}
          {filteredDocuments.length === 0 ? (
            <div className="p-12 text-center">
              <div className="w-14 h-14 bg-zinc-100 text-zinc-400 rounded-full flex items-center justify-center mx-auto mb-3">
                <FileCode className="w-7 h-7" />
              </div>
              <h3 className="text-sm font-bold text-zinc-800">No developer documents found</h3>
              <p className="text-xs text-zinc-500 max-w-sm mx-auto mt-1">
                {searchTerm || categoryFilter !== 'All' || typeFilter !== 'All' || statusFilter !== 'All'
                  ? 'No documents match your active search filters. Try clearing filters or refining your query.'
                  : 'Upload your first PDF specification or Image blueprint from Aprodac to start building your vault.'}
              </p>
              {(searchTerm || categoryFilter !== 'All' || typeFilter !== 'All' || statusFilter !== 'All') && (
                <button
                  onClick={() => {
                    setSearchTerm('');
                    setCategoryFilter('All');
                    setTypeFilter('All');
                    setStatusFilter('All');
                  }}
                  className="mt-3 text-xs font-bold text-brand hover:underline cursor-pointer"
                >
                  Clear all filters
                </button>
              )}
            </div>
          ) : viewMode === 'list' ? (
            /* List View Table */
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-zinc-50/80 border-b border-zinc-200 text-[11px] font-bold text-zinc-500 uppercase tracking-wider">
                    <th className="py-3 px-4">Document Title</th>
                    <th className="py-3 px-3">Category</th>
                    <th className="py-3 px-3">Version</th>
                    <th className="py-3 px-3">Type</th>
                    <th className="py-3 px-3">Size</th>
                    <th className="py-3 px-3">Status</th>
                    <th className="py-3 px-3">Uploaded</th>
                    <th className="py-3 px-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-100 text-xs">
                  {filteredDocuments.map((doc) => (
                    <tr key={doc.id} className="hover:bg-zinc-50/80 transition-colors group">
                      {/* Title & Description */}
                      <td className="py-3 px-4 max-w-md">
                        <div className="flex items-start gap-3">
                          <div className={`p-2 rounded-lg shrink-0 mt-0.5 ${
                            doc.fileType === 'pdf'
                              ? 'bg-rose-50 text-rose-600 border border-rose-200'
                              : 'bg-blue-50 text-blue-600 border border-blue-200'
                          }`}>
                            {doc.fileType === 'pdf' ? <FileText size={18} /> : <ImageIcon size={18} />}
                          </div>
                          <div className="min-w-0">
                            <h4
                              onClick={() => setPreviewDoc(doc)}
                              className="font-bold text-zinc-900 hover:text-brand transition-colors cursor-pointer truncate"
                            >
                              {doc.title}
                            </h4>
                            <p className="text-[11px] text-zinc-500 truncate mt-0.5">{doc.description}</p>
                            {doc.tags && doc.tags.length > 0 && (
                              <div className="flex flex-wrap gap-1 mt-1.5">
                                {doc.tags.map(tag => (
                                  <span key={tag} className="text-[9.5px] px-1.5 py-0.2 rounded bg-zinc-100 text-zinc-600 font-medium">
                                    #{tag}
                                  </span>
                                ))}
                              </div>
                            )}
                          </div>
                        </div>
                      </td>

                      {/* Category */}
                      <td className="py-3 px-3 whitespace-nowrap">
                        <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-semibold bg-zinc-100 text-zinc-700 border border-zinc-200">
                          {doc.category}
                        </span>
                      </td>

                      {/* Version */}
                      <td className="py-3 px-3 whitespace-nowrap">
                        <span className="font-mono text-[11px] font-bold text-zinc-800 bg-zinc-100 px-2 py-0.5 rounded">
                          {doc.version}
                        </span>
                      </td>

                      {/* File Type */}
                      <td className="py-3 px-3 whitespace-nowrap">
                        <span className={`inline-flex items-center gap-1 font-bold text-[10px] uppercase px-2 py-0.5 rounded-full ${
                          doc.fileType === 'pdf'
                            ? 'bg-rose-100 text-rose-800'
                            : 'bg-blue-100 text-blue-800'
                        }`}>
                          {doc.fileType === 'pdf' ? 'PDF' : 'IMAGE'}
                        </span>
                      </td>

                      {/* Size */}
                      <td className="py-3 px-3 whitespace-nowrap text-zinc-600 font-mono text-[11px]">
                        {formatBytes(doc.sizeBytes)}
                      </td>

                      {/* Status */}
                      <td className="py-3 px-3 whitespace-nowrap">
                        <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold ${
                          doc.status === 'Active'
                            ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                            : doc.status === 'Under Review'
                            ? 'bg-amber-50 text-amber-700 border border-amber-200'
                            : 'bg-zinc-100 text-zinc-600 border border-zinc-200'
                        }`}>
                          <span className={`w-1.5 h-1.5 rounded-full ${
                            doc.status === 'Active' ? 'bg-emerald-500' : doc.status === 'Under Review' ? 'bg-amber-500' : 'bg-zinc-400'
                          }`} />
                          {doc.status}
                        </span>
                      </td>

                      {/* Uploaded */}
                      <td className="py-3 px-3 whitespace-nowrap text-[11px] text-zinc-500">
                        <div>{doc.uploadedAt}</div>
                        <div className="text-[10px] text-zinc-400">{doc.uploadedBy}</div>
                      </td>

                      {/* Actions */}
                      <td className="py-3 px-4 whitespace-nowrap text-right">
                        <div className="flex items-center justify-end gap-1">
                          <button
                            onClick={() => setPreviewDoc(doc)}
                            className="p-1.5 text-zinc-500 hover:text-zinc-900 hover:bg-zinc-100 rounded-lg transition-colors cursor-pointer"
                            title="Preview Document"
                          >
                            <Eye size={15} />
                          </button>
                          <button
                            onClick={() => handleDownload(doc)}
                            className="p-1.5 text-zinc-500 hover:text-brand hover:bg-zinc-100 rounded-lg transition-colors cursor-pointer"
                            title="Download File"
                          >
                            <Download size={15} />
                          </button>
                          <button
                            onClick={() => handleEditClick(doc)}
                            className="p-1.5 text-zinc-500 hover:text-indigo-600 hover:bg-zinc-100 rounded-lg transition-colors cursor-pointer"
                            title="Edit Document Info"
                          >
                            <Edit size={15} />
                          </button>
                          <button
                            onClick={() => setDeleteConfirmId(doc.id)}
                            className="p-1.5 text-zinc-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
                            title="Delete Document"
                          >
                            <Trash2 size={15} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            /* Grid View Cards */
            <div className="p-4 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredDocuments.map((doc) => (
                <div
                  key={doc.id}
                  className="group relative rounded-xl border border-zinc-200 bg-white p-4 hover:border-brand/40 hover:shadow-md transition-all flex flex-col justify-between"
                >
                  <div>
                    {/* Card Top Row */}
                    <div className="flex items-start justify-between gap-2 mb-3">
                      <div className={`p-2.5 rounded-xl ${
                        doc.fileType === 'pdf'
                          ? 'bg-rose-50 text-rose-600 border border-rose-200'
                          : 'bg-blue-50 text-blue-600 border border-blue-200'
                      }`}>
                        {doc.fileType === 'pdf' ? <FileText size={22} /> : <ImageIcon size={22} />}
                      </div>
                      <div className="flex items-center gap-1.5">
                        <span className="font-mono text-[10px] font-bold text-zinc-700 bg-zinc-100 px-2 py-0.5 rounded border border-zinc-200">
                          {doc.version}
                        </span>
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                          doc.status === 'Active' ? 'bg-emerald-50 text-emerald-700' : 'bg-amber-50 text-amber-700'
                        }`}>
                          {doc.status}
                        </span>
                      </div>
                    </div>

                    {/* Card Title & Desc */}
                    <h3
                      onClick={() => setPreviewDoc(doc)}
                      className="font-bold text-zinc-900 text-sm hover:text-brand transition-colors cursor-pointer line-clamp-2"
                    >
                      {doc.title}
                    </h3>
                    <p className="text-xs text-zinc-500 mt-1 line-clamp-2">{doc.description}</p>
                  </div>

                  {/* Thumbnail Preview box if image dataUrl exists */}
                  {doc.fileType === 'image' && doc.dataUrl && (
                    <div
                      onClick={() => setPreviewDoc(doc)}
                      className="mt-3 h-28 w-full rounded-lg overflow-hidden border border-zinc-200 bg-zinc-100 cursor-pointer group-hover:opacity-95 transition-opacity"
                    >
                      <img src={doc.dataUrl} alt={doc.title} className="w-full h-full object-cover" />
                    </div>
                  )}

                  <div className="mt-4 pt-3 border-t border-zinc-100 flex items-center justify-between text-xs">
                    <span className="text-[11px] font-semibold text-zinc-400 font-mono">
                      {formatBytes(doc.sizeBytes)}
                    </span>

                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => setPreviewDoc(doc)}
                        className="p-1.5 text-zinc-500 hover:text-zinc-900 hover:bg-zinc-100 rounded-lg transition-colors cursor-pointer"
                        title="Preview"
                      >
                        <Eye size={14} />
                      </button>
                      <button
                        onClick={() => handleDownload(doc)}
                        className="p-1.5 text-zinc-500 hover:text-brand hover:bg-zinc-100 rounded-lg transition-colors cursor-pointer"
                        title="Download"
                      >
                        <Download size={14} />
                      </button>
                      <button
                        onClick={() => handleEditClick(doc)}
                        className="p-1.5 text-zinc-500 hover:text-indigo-600 hover:bg-zinc-100 rounded-lg transition-colors cursor-pointer"
                        title="Edit"
                      >
                        <Edit size={14} />
                      </button>
                      <button
                        onClick={() => setDeleteConfirmId(doc.id)}
                        className="p-1.5 text-zinc-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
                        title="Delete"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* ── 4. Upload & Edit Document Modal ── */}
      {isUploadOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-200">
          <div className="bg-white w-full max-w-xl rounded-2xl shadow-xl border border-zinc-200 overflow-hidden flex flex-col max-h-[90vh]">
            {/* Modal Header */}
            <div className="px-6 py-4 bg-zinc-900 text-white flex items-center justify-between shrink-0">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-lg bg-brand text-white">
                  <Upload size={18} />
                </div>
                <div>
                  <h3 className="font-bold text-sm">
                    {editingDoc ? 'Edit Developer Document Info' : 'Upload Aprodac Developer Document'}
                  </h3>
                  <p className="text-[11px] text-zinc-400">PDF specifications & Image blueprints supported</p>
                </div>
              </div>
              <button
                onClick={() => {
                  setIsUploadOpen(false);
                  setEditingDoc(null);
                  resetUploadForm();
                }}
                className="text-zinc-400 hover:text-white p-1.5 rounded-lg hover:bg-zinc-800 transition-colors cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>

            {/* Modal Body / Form */}
            <form onSubmit={handleSaveDocument} className="p-6 space-y-4 overflow-y-auto flex-1">
              {uploadError && (
                <div className="p-3 rounded-lg bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-center gap-2">
                  <AlertCircle size={16} className="shrink-0" />
                  <span>{uploadError}</span>
                </div>
              )}

              {/* Drag & Drop File Zone */}
              {!editingDoc && (
                <div>
                  <label className="block text-xs font-bold text-zinc-700 mb-1.5">
                    Document File <span className="text-rose-500">*</span> (PDF or Image)
                  </label>

                  <div
                    onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
                    onDragLeave={() => setIsDragging(false)}
                    onDrop={(e) => {
                      e.preventDefault();
                      setIsDragging(false);
                      if (e.dataTransfer.files && e.dataTransfer.files[0]) {
                        handleFileSelected(e.dataTransfer.files[0]);
                      }
                    }}
                    onClick={() => fileInputRef.current?.click()}
                    className={`border-2 border-dashed rounded-xl p-5 text-center cursor-pointer transition-all ${
                      isDragging
                        ? 'border-brand bg-brand/5 scale-[1.01]'
                        : uploadFile
                        ? 'border-emerald-400 bg-emerald-50/40'
                        : 'border-zinc-300 hover:border-brand hover:bg-zinc-50'
                    }`}
                  >
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept=".pdf,image/png,image/jpeg,image/webp,image/svg+xml"
                      className="hidden"
                      onChange={(e) => {
                        if (e.target.files && e.target.files[0]) {
                          handleFileSelected(e.target.files[0]);
                        }
                      }}
                    />

                    {uploadFile ? (
                      <div className="flex items-center justify-center gap-3">
                        <div className={`p-3 rounded-xl ${
                          uploadFile.type.includes('pdf') || uploadFile.name.endsWith('.pdf')
                            ? 'bg-rose-100 text-rose-700'
                            : 'bg-blue-100 text-blue-700'
                        }`}>
                          {uploadFile.type.includes('pdf') || uploadFile.name.endsWith('.pdf') ? (
                            <FileText size={24} />
                          ) : (
                            <ImageIcon size={24} />
                          )}
                        </div>
                        <div className="text-left">
                          <p className="text-xs font-bold text-zinc-900 truncate max-w-xs">{uploadFile.name}</p>
                          <p className="text-[11px] text-zinc-500">{formatBytes(uploadFile.size)} • Click to change</p>
                        </div>
                      </div>
                    ) : (
                      <div className="space-y-1">
                        <Upload size={28} className="mx-auto text-zinc-400" />
                        <p className="text-xs font-bold text-zinc-800">
                          Drag and drop your file here, or <span className="text-brand underline">browse</span>
                        </p>
                        <p className="text-[10px] text-zinc-500">Supports PDF documents (.pdf) and Images (.png, .jpg, .svg)</p>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Title & Version */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="sm:col-span-2">
                  <label className="block text-xs font-bold text-zinc-700 mb-1">
                    Document Title <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={uploadTitle}
                    onChange={(e) => setUploadTitle(e.target.value)}
                    placeholder="e.g. Master Services Agreement v2.0"
                    className="w-full px-3 py-2 border border-zinc-300 rounded-lg text-xs focus:ring-2 focus:ring-brand/20 focus:border-brand"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-zinc-700 mb-1">Version</label>
                  <input
                    type="text"
                    value={uploadVersion}
                    onChange={(e) => setUploadVersion(e.target.value)}
                    placeholder="v1.0"
                    className="w-full px-3 py-2 border border-zinc-300 rounded-lg text-xs font-mono focus:ring-2 focus:ring-brand/20 focus:border-brand"
                  />
                </div>
              </div>

              {/* Category & Status */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-zinc-700 mb-1">Category</label>
                  <select
                    value={uploadCategory}
                    onChange={(e) => setUploadCategory(e.target.value as any)}
                    className="w-full px-3 py-2 border border-zinc-300 rounded-lg text-xs focus:ring-2 focus:ring-brand/20 focus:border-brand"
                  >
                    <option value="Software Agreements">Software Agreements</option>
                    <option value="System Architecture">System Architecture</option>
                    <option value="SLA & Maintenance">SLA & Maintenance</option>
                    <option value="Commercials & Invoices">Commercials & Invoices</option>
                    <option value="Release Notes & Handover">Release Notes & Handover</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold text-zinc-700 mb-1">Status</label>
                  <select
                    value={uploadStatus}
                    onChange={(e) => setUploadStatus(e.target.value as any)}
                    className="w-full px-3 py-2 border border-zinc-300 rounded-lg text-xs focus:ring-2 focus:ring-brand/20 focus:border-brand"
                  >
                    <option value="Active">Active</option>
                    <option value="Under Review">Under Review</option>
                    <option value="Archived">Archived</option>
                  </select>
                </div>
              </div>

              {/* Tags */}
              <div>
                <label className="block text-xs font-bold text-zinc-700 mb-1">Tags (Comma Separated)</label>
                <input
                  type="text"
                  value={uploadTags}
                  onChange={(e) => setUploadTags(e.target.value)}
                  placeholder="contract, architecture, sla, security"
                  className="w-full px-3 py-2 border border-zinc-300 rounded-lg text-xs focus:ring-2 focus:ring-brand/20 focus:border-brand"
                />
              </div>

              {/* Description */}
              <div>
                <label className="block text-xs font-bold text-zinc-700 mb-1">Description / Notes</label>
                <textarea
                  rows={3}
                  value={uploadDescription}
                  onChange={(e) => setUploadDescription(e.target.value)}
                  placeholder="Summarize key contract terms, technical notes, or attachments..."
                  className="w-full px-3 py-2 border border-zinc-300 rounded-lg text-xs focus:ring-2 focus:ring-brand/20 focus:border-brand resize-none"
                />
              </div>

              {/* Buttons */}
              <div className="pt-3 border-t border-zinc-200 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setIsUploadOpen(false);
                    setEditingDoc(null);
                    resetUploadForm();
                  }}
                  className="px-4 py-2 border border-zinc-300 rounded-lg text-xs font-semibold text-zinc-700 hover:bg-zinc-100 transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-brand text-white rounded-lg text-xs font-bold hover:bg-brand/90 transition-colors shadow-sm cursor-pointer"
                >
                  {editingDoc ? 'Save Changes' : 'Save Document to Vault'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── 5. Preview Lightbox Modal ── */}
      {previewDoc && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="bg-white w-full max-w-3xl rounded-2xl shadow-2xl border border-zinc-200 overflow-hidden flex flex-col max-h-[90vh]">
            {/* Lightbox Header */}
            <div className="px-6 py-4 bg-zinc-900 text-white flex items-center justify-between shrink-0">
              <div className="flex items-center gap-3">
                <div className={`p-2 rounded-lg ${
                  previewDoc.fileType === 'pdf' ? 'bg-rose-500/20 text-rose-400' : 'bg-blue-500/20 text-blue-400'
                }`}>
                  {previewDoc.fileType === 'pdf' ? <FileText size={20} /> : <ImageIcon size={20} />}
                </div>
                <div>
                  <h3 className="font-bold text-sm truncate max-w-md">{previewDoc.title}</h3>
                  <p className="text-[11px] text-zinc-400">{previewDoc.category} • {previewDoc.version}</p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => handleDownload(previewDoc)}
                  className="px-3 py-1.5 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-xs font-semibold text-white flex items-center gap-1.5 transition-colors cursor-pointer"
                >
                  <Download size={14} />
                  <span>Download</span>
                </button>
                <button
                  onClick={() => setPreviewDoc(null)}
                  className="text-zinc-400 hover:text-white p-1.5 rounded-lg hover:bg-zinc-800 transition-colors cursor-pointer"
                >
                  <X size={18} />
                </button>
              </div>
            </div>

            {/* Lightbox Body */}
            <div className="p-6 overflow-y-auto space-y-4 flex-1 bg-zinc-50">
              {/* Media Container */}
              <div className="bg-white rounded-xl border border-zinc-200 p-4 shadow-inner min-h-[220px] flex items-center justify-center">
                {previewDoc.fileType === 'image' && previewDoc.dataUrl ? (
                  <img
                    src={previewDoc.dataUrl}
                    alt={previewDoc.title}
                    className="max-h-[380px] w-auto object-contain rounded-lg shadow-xs"
                  />
                ) : previewDoc.fileType === 'pdf' && previewDoc.dataUrl ? (
                  <iframe
                    src={previewDoc.dataUrl}
                    title={previewDoc.title}
                    className="w-full h-[380px] rounded-lg border border-zinc-200"
                  />
                ) : (
                  <div className="text-center p-8">
                    <div className={`w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-3 ${
                      previewDoc.fileType === 'pdf' ? 'bg-rose-100 text-rose-600' : 'bg-blue-100 text-blue-600'
                    }`}>
                      {previewDoc.fileType === 'pdf' ? <FileText size={32} /> : <ImageIcon size={32} />}
                    </div>
                    <h4 className="font-bold text-zinc-900 text-sm">{previewDoc.fileName}</h4>
                    <p className="text-xs text-zinc-500 mt-1">Verified Aprodac Developer Document ({formatBytes(previewDoc.sizeBytes)})</p>
                    <button
                      onClick={() => handleDownload(previewDoc)}
                      className="mt-4 px-4 py-2 bg-brand text-white rounded-lg text-xs font-bold hover:bg-brand/90 transition-all shadow-xs inline-flex items-center gap-2 cursor-pointer"
                    >
                      <Download size={14} />
                      <span>Download File Content</span>
                    </button>
                  </div>
                )}
              </div>

              {/* Metadata Details */}
              <div className="bg-white rounded-xl border border-zinc-200 p-4 space-y-3">
                <h4 className="text-xs font-extrabold uppercase tracking-wider text-zinc-400">Document Specifications</h4>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                  <div>
                    <span className="text-zinc-400 block text-[10px]">Uploaded Date</span>
                    <span className="font-semibold text-zinc-800">{previewDoc.uploadedAt}</span>
                  </div>
                  <div>
                    <span className="text-zinc-400 block text-[10px]">Uploaded By</span>
                    <span className="font-semibold text-zinc-800">{previewDoc.uploadedBy}</span>
                  </div>
                  <div>
                    <span className="text-zinc-400 block text-[10px]">Version</span>
                    <span className="font-mono font-bold text-zinc-800">{previewDoc.version}</span>
                  </div>
                  <div>
                    <span className="text-zinc-400 block text-[10px]">File Size</span>
                    <span className="font-mono font-semibold text-zinc-800">{formatBytes(previewDoc.sizeBytes)}</span>
                  </div>
                </div>

                <div>
                  <span className="text-zinc-400 block text-[10px] mb-1">Description</span>
                  <p className="text-xs text-zinc-700 bg-zinc-50 p-2.5 rounded-lg border border-zinc-200 leading-relaxed">
                    {previewDoc.description}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── 6. Delete Confirmation Modal ── */}
      {deleteConfirmId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="bg-white w-full max-w-md rounded-2xl p-6 shadow-xl border border-zinc-200 text-center space-y-4">
            <div className="w-12 h-12 rounded-full bg-rose-100 text-rose-600 flex items-center justify-center mx-auto">
              <Trash2 size={24} />
            </div>
            <div>
              <h3 className="font-bold text-zinc-900 text-base">Delete Document?</h3>
              <p className="text-xs text-zinc-500 mt-1">
                Are you sure you want to remove this developer document from the vault? This action cannot be undone.
              </p>
            </div>
            <div className="flex items-center justify-center gap-3 pt-2">
              <button
                onClick={() => setDeleteConfirmId(null)}
                className="px-4 py-2 border border-zinc-300 text-zinc-700 text-xs font-semibold rounded-lg hover:bg-zinc-100 transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={() => handleDeleteDocument(deleteConfirmId)}
                className="px-4 py-2 bg-rose-600 text-white text-xs font-bold rounded-lg hover:bg-rose-700 transition-colors shadow-xs cursor-pointer"
              >
                Yes, Delete Document
              </button>
            </div>
          </div>
        </div>
      )}
    </DashboardLayout>
  );
}
