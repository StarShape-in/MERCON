import { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus, Edit2, Trash2, FileCog, Search } from 'lucide-react';
import { toast } from 'sonner';

import DataTable from '@/components/ui/DataTable';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import Btn from '@/components/ui/Btn';
import ConfirmModal from '@/components/ui/ConfirmModal';
import { documentTypeService, type DocumentType, type DocOwnerType, type DocRequirement } from '@/services/documentTypeService';
import { matchesSearch } from '@/lib/search';

const OWNER_TYPES: DocOwnerType[] = ['Driver', 'Vehicle', 'Trip', 'Customer', 'Company', 'Other'];
const REQUIREMENTS: DocRequirement[] = ['MANDATORY', 'OPTIONAL', 'DISABLED'];

const emptyForm = {
  code: '',
  name: '',
  ownerType: 'Driver' as DocOwnerType,
  requirementStatus: 'OPTIONAL' as DocRequirement,
  requiresIssueDate: false,
  requiresExpiryDate: true,
  allowsMultipleFiles: false,
};

export default function DocumentTypeAdminSection() {
  const queryClient = useQueryClient();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editing, setEditing] = useState<DocumentType | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [ownerFilter, setOwnerFilter] = useState<string>('all');

  const { data: types = [], isLoading } = useQuery({
    queryKey: ['document-types', 'admin'],
    queryFn: async () => (await documentTypeService.getAll()).data,
  });

  const openCreate = () => {
    setEditing(null);
    setForm(emptyForm);
    setIsModalOpen(true);
  };

  const openEdit = (t: DocumentType) => {
    setEditing(t);
    setForm({
      code: t.code,
      name: t.name,
      ownerType: t.ownerType,
      requirementStatus: t.requirementStatus,
      requiresIssueDate: t.requiresIssueDate,
      requiresExpiryDate: t.requiresExpiryDate,
      allowsMultipleFiles: t.allowsMultipleFiles,
    });
    setIsModalOpen(true);
  };

  const saveMutation = useMutation({
    mutationFn: async () => {
      if (editing) {
        return documentTypeService.update(editing.id, {
          name: form.name,
          requirementStatus: form.requirementStatus,
          requiresIssueDate: form.requiresIssueDate,
          requiresExpiryDate: form.requiresExpiryDate,
          allowsMultipleFiles: form.allowsMultipleFiles,
        });
      }
      return documentTypeService.create({
        code: form.code.trim(),
        name: form.name.trim(),
        ownerType: form.ownerType,
        requirementStatus: form.requirementStatus,
        requiresIssueDate: form.requiresIssueDate,
        requiresExpiryDate: form.requiresExpiryDate,
        allowsMultipleFiles: form.allowsMultipleFiles,
      });
    },
    onSuccess: () => {
      toast.success(editing ? 'Document type updated' : 'Document type created');
      queryClient.invalidateQueries({ queryKey: ['document-types'] });
      setIsModalOpen(false);
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.error?.message || 'Failed to save document type');
    },
  });

  const toggleActiveMutation = useMutation({
    mutationFn: (t: DocumentType) => documentTypeService.update(t.id, { isActive: !t.isActive } as any),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['document-types'] }),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => documentTypeService.delete(id),
    onSuccess: () => {
      toast.success('Document type deleted');
      queryClient.invalidateQueries({ queryKey: ['document-types'] });
      setDeleteId(null);
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.error?.message || 'Failed to delete — it may still be in use');
      setDeleteId(null);
    },
  });

  const filteredTypes = useMemo(() => {
    return types.filter((t) => {
      const matchesOwner = ownerFilter === 'all' || t.ownerType === ownerFilter;
      const matchesTerm = matchesSearch(search, [t.name, t.code, t.ownerType, t.requirementStatus]);
      return matchesOwner && matchesTerm;
    });
  }, [types, ownerFilter, search]);

  return (
    <div className="space-y-4">
      {/* Top Banner & Control Toolbar */}
      <div className="rounded-2xl border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900 p-4 shadow-2xs space-y-3">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <FileCog className="w-6 h-6 text-indigo-600 dark:text-indigo-400 shrink-0" />
            <div>
              <h2 className="text-base font-extrabold text-slate-900 dark:text-slate-100 tracking-tight">
                Document Type Configuration & Requirements
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Defines required documents for Vehicles, Drivers, Operations & Company entities. Mandatory types drive compliance checklists automatically across MERCON.
              </p>
            </div>
          </div>

          <Button
            size="sm"
            onClick={openCreate}
            className="h-9 px-4 bg-brand hover:bg-brand-hover text-white gap-1.5 text-xs font-extrabold rounded-xl shadow-xs shrink-0 cursor-pointer"
          >
            <Plus className="w-4 h-4" /> Add Document Type
          </Button>
        </div>

        {/* Filter Strip */}
        <div className="flex flex-wrap items-center justify-between gap-3 pt-2 border-t border-slate-100 dark:border-slate-800">
          <div className="relative flex-1 min-w-[240px] max-w-md">
            <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search document type, code, requirement..."
              className="w-full h-9 pl-9 pr-3 text-xs bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-xl outline-none"
            />
          </div>

          <div className="flex items-center gap-2">
            <span className="text-xs font-bold text-slate-500">Applies To:</span>
            <div className="flex items-center gap-1 overflow-x-auto">
              <button
                type="button"
                onClick={() => setOwnerFilter('all')}
                className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                  ownerFilter === 'all'
                    ? 'bg-indigo-50 text-indigo-600 border border-indigo-200 dark:bg-indigo-950/60 dark:text-indigo-300'
                    : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
                }`}
              >
                All ({types.length})
              </button>
              {OWNER_TYPES.map((ot) => {
                const count = types.filter((t) => t.ownerType === ot).length;
                if (count === 0 && ownerFilter !== ot) return null;
                return (
                  <button
                    key={ot}
                    type="button"
                    onClick={() => setOwnerFilter(ot)}
                    className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                      ownerFilter === ot
                        ? 'bg-indigo-50 text-indigo-600 border border-indigo-200 dark:bg-indigo-950/60 dark:text-indigo-300'
                        : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
                    }`}
                  >
                    {ot} ({count})
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      </div>

      {/* Data Table */}
      <div className="rounded-2xl border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900 overflow-hidden shadow-2xs">
        <DataTable<DocumentType>
          title="Document Requirements Ledger"
          data={filteredTypes}
          isLoading={isLoading}
          columns={[
            {
              header: 'Name',
              accessor: (t) => (
                <div className="flex items-center gap-2">
                  <span className="font-extrabold text-xs text-slate-900 dark:text-slate-100">{t.name}</span>
                </div>
              ),
            },
            {
              header: 'Code',
              accessor: (t) => (
                <span className="font-mono text-xs font-bold text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-950/60 px-2 py-0.5 rounded-md border border-indigo-200/60 dark:border-indigo-800">
                  {t.code}
                </span>
              ),
            },
            {
              header: 'Applies To',
              accessor: (t) => (
                <Badge variant="outline" className="text-[10px] font-bold bg-slate-50 text-slate-700 border-slate-200">
                  {t.ownerType}
                </Badge>
              ),
            },
            {
              header: 'Requirement',
              accessor: (t) => (
                <Badge className={
                  t.requirementStatus === 'MANDATORY' ? 'bg-rose-50 text-rose-700 border-rose-200 text-[10px] font-extrabold' :
                  t.requirementStatus === 'OPTIONAL' ? 'bg-slate-100 text-slate-600 border-slate-200 text-[10px] font-bold' :
                  'bg-slate-50 text-slate-400 border-slate-200 text-[10px] font-bold'
                }>
                  {t.requirementStatus === 'MANDATORY' ? 'Mandatory' : t.requirementStatus}
                </Badge>
              ),
            },
            {
              header: 'Expiry Date',
              accessor: (t) => (
                <span className={`text-xs font-bold ${t.requiresExpiryDate ? 'text-emerald-600' : 'text-slate-400'}`}>
                  {t.requiresExpiryDate ? 'Required' : 'Optional / None'}
                </span>
              ),
            },
            {
              header: 'Multiple Files',
              accessor: (t) => (
                <span className="text-xs font-semibold text-slate-600 dark:text-slate-400">
                  {t.allowsMultipleFiles ? 'Yes (Multi-page)' : 'Single file'}
                </span>
              ),
            },
            {
              header: 'Status',
              accessor: (t) => (
                <button type="button" onClick={() => toggleActiveMutation.mutate(t)} className="cursor-pointer">
                  <Badge className={t.isActive ? 'bg-emerald-50 text-emerald-700 border-emerald-200 text-[10px] font-extrabold' : 'bg-slate-100 text-slate-400 border-slate-200 text-[10px] font-bold'}>
                    {t.isActive ? 'Active' : 'Disabled'}
                  </Badge>
                </button>
              ),
            },
            {
              header: 'Actions',
              accessor: (t) => (
                <div className="flex items-center gap-1">
                  <Button size="sm" variant="ghost" className="h-7 w-7 p-0 text-slate-600 hover:text-slate-900 cursor-pointer" onClick={() => openEdit(t)}>
                    <Edit2 className="w-3.5 h-3.5" />
                  </Button>
                  <Button size="sm" variant="ghost" className="h-7 w-7 p-0 text-rose-500 hover:text-rose-700 cursor-pointer" onClick={() => setDeleteId(t.id)}>
                    <Trash2 className="w-3.5 h-3.5" />
                  </Button>
                </div>
              ),
            },
          ]}
        />
      </div>

      {/* Modal Dialog */}
      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent className="max-w-md rounded-2xl">
          <DialogHeader>
            <DialogTitle className="text-base font-extrabold">{editing ? 'Edit Document Type' : 'Add Document Type'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">Document Name</label>
              <input
                value={form.name}
                onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                className="w-full h-9 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3 text-xs font-semibold outline-none"
                placeholder="e.g. Medical Certificate"
              />
            </div>
            {!editing && (
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">Code (unique, no spaces)</label>
                <input
                  value={form.code}
                  onChange={(e) => setForm((f) => ({ ...f, code: e.target.value.replace(/\s+/g, '') }))}
                  className="w-full h-9 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3 text-xs font-mono outline-none"
                  placeholder="e.g. MedicalCertificate"
                />
              </div>
            )}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">Applies To</label>
                <select
                  value={form.ownerType}
                  disabled={!!editing}
                  onChange={(e) => setForm((f) => ({ ...f, ownerType: e.target.value as DocOwnerType }))}
                  className="w-full h-9 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3 text-xs font-semibold outline-none"
                >
                  {OWNER_TYPES.map((o) => <option key={o} value={o}>{o}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">Requirement</label>
                <select
                  value={form.requirementStatus}
                  onChange={(e) => setForm((f) => ({ ...f, requirementStatus: e.target.value as DocRequirement }))}
                  className="w-full h-9 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3 text-xs font-semibold outline-none"
                >
                  {REQUIREMENTS.map((r) => <option key={r} value={r}>{r}</option>)}
                </select>
              </div>
            </div>
            <div className="flex flex-col gap-2 pt-1">
              <label className="flex items-center gap-2 text-xs font-semibold text-slate-700 dark:text-slate-300 cursor-pointer">
                <input type="checkbox" checked={form.requiresExpiryDate} onChange={(e) => setForm((f) => ({ ...f, requiresExpiryDate: e.target.checked }))} className="rounded" />
                Requires expiry date
              </label>
              <label className="flex items-center gap-2 text-xs font-semibold text-slate-700 dark:text-slate-300 cursor-pointer">
                <input type="checkbox" checked={form.requiresIssueDate} onChange={(e) => setForm((f) => ({ ...f, requiresIssueDate: e.target.checked }))} className="rounded" />
                Requires issue date
              </label>
              <label className="flex items-center gap-2 text-xs font-semibold text-slate-700 dark:text-slate-300 cursor-pointer">
                <input type="checkbox" checked={form.allowsMultipleFiles} onChange={(e) => setForm((f) => ({ ...f, allowsMultipleFiles: e.target.checked }))} className="rounded" />
                Allows multiple files
              </label>
            </div>
          </div>
          <DialogFooter>
            <Btn label="Cancel" variant="outline" onClick={() => setIsModalOpen(false)} />
            <Btn
              label={saveMutation.isPending ? 'Saving...' : 'Save'}
              onClick={() => saveMutation.mutate()}
              disabled={saveMutation.isPending || !form.name || (!editing && !form.code)}
            />
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <ConfirmModal
        isOpen={!!deleteId}
        onClose={() => setDeleteId(null)}
        onConfirm={() => deleteId && deleteMutation.mutate(deleteId)}
        title="Delete Document Type"
        message="This can only be deleted if no documents use it. Otherwise, disable it instead."
        isLoading={deleteMutation.isPending}
      />
    </div>
  );
}
