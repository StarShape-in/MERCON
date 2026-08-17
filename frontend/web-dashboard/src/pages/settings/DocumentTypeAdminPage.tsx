import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus, Edit2, Trash2, FileCog } from 'lucide-react';
import { toast } from 'sonner';

import DashboardLayout from '@/components/layout/DashboardLayout';
import DataTable from '@/components/ui/DataTable';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import Btn from '@/components/ui/Btn';
import ConfirmModal from '@/components/ui/ConfirmModal';
import { documentTypeService, type DocumentType, type DocOwnerType, type DocRequirement } from '@/services/documentTypeService';

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

export default function DocumentTypeAdminPage() {
  const queryClient = useQueryClient();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editing, setEditing] = useState<DocumentType | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [deleteId, setDeleteId] = useState<string | null>(null);

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

  return (
    <DashboardLayout active="Settings" title="Document Types">
      <div className="px-4 sm:px-6 pb-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <FileCog className="w-5 h-5 text-brand" />
            <h2 className="text-sm font-extrabold text-slate-800 dark:text-slate-200">
              Document Type Configuration
            </h2>
          </div>
          <Button size="sm" onClick={openCreate} className="bg-brand hover:bg-brand-hover text-white gap-1.5 text-xs font-bold">
            <Plus className="w-4 h-4" /> Add Document Type
          </Button>
        </div>
        <p className="text-xs text-slate-500 mb-4 max-w-2xl">
          Defines which documents a Driver, Vehicle, or other owner needs. Mandatory types drive the
          "Missing document" checklist across the Documents Center — no code change needed to add,
          disable, or retire a requirement.
        </p>

        <DataTable<DocumentType>
          title="Document Types"
          data={types}
          isLoading={isLoading}
          columns={[
            { header: 'Name', accessor: (t) => <span className="font-bold text-xs text-slate-900 dark:text-slate-100">{t.name}</span> },
            { header: 'Code', accessor: (t) => <span className="font-mono text-[11px] text-slate-500">{t.code}</span> },
            { header: 'Applies To', accessor: (t) => <Badge variant="outline" className="text-[10px] font-semibold">{t.ownerType}</Badge> },
            {
              header: 'Requirement',
              accessor: (t) => (
                <Badge className={
                  t.requirementStatus === 'MANDATORY' ? 'bg-rose-50 text-rose-700 border-rose-200 text-[10px] font-bold' :
                  t.requirementStatus === 'OPTIONAL' ? 'bg-slate-100 text-slate-600 border-slate-200 text-[10px] font-bold' :
                  'bg-slate-50 text-slate-400 border-slate-200 text-[10px] font-bold'
                }>
                  {t.requirementStatus}
                </Badge>
              ),
            },
            { header: 'Expiry', accessor: (t) => (t.requiresExpiryDate ? 'Yes' : 'No') },
            { header: 'Multi-File', accessor: (t) => (t.allowsMultipleFiles ? 'Yes' : 'No') },
            {
              header: 'Status',
              accessor: (t) => (
                <button onClick={() => toggleActiveMutation.mutate(t)} className="cursor-pointer">
                  <Badge className={t.isActive ? 'bg-emerald-50 text-emerald-700 border-emerald-200 text-[10px] font-bold' : 'bg-slate-100 text-slate-400 border-slate-200 text-[10px] font-bold'}>
                    {t.isActive ? 'Active' : 'Disabled'}
                  </Badge>
                </button>
              ),
            },
            {
              header: 'Actions',
              accessor: (t) => (
                <div className="flex items-center gap-1">
                  <Button size="sm" variant="ghost" className="h-7 w-7 p-0" onClick={() => openEdit(t)}>
                    <Edit2 className="w-3.5 h-3.5" />
                  </Button>
                  <Button size="sm" variant="ghost" className="h-7 w-7 p-0 text-rose-500" onClick={() => setDeleteId(t.id)}>
                    <Trash2 className="w-3.5 h-3.5" />
                  </Button>
                </div>
              ),
            },
          ]}
        />
      </div>

      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{editing ? 'Edit Document Type' : 'Add Document Type'}</DialogTitle>
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
              <label className="flex items-center gap-2 text-xs font-semibold text-slate-700 dark:text-slate-300">
                <input type="checkbox" checked={form.requiresExpiryDate} onChange={(e) => setForm((f) => ({ ...f, requiresExpiryDate: e.target.checked }))} />
                Requires expiry date
              </label>
              <label className="flex items-center gap-2 text-xs font-semibold text-slate-700 dark:text-slate-300">
                <input type="checkbox" checked={form.requiresIssueDate} onChange={(e) => setForm((f) => ({ ...f, requiresIssueDate: e.target.checked }))} />
                Requires issue date
              </label>
              <label className="flex items-center gap-2 text-xs font-semibold text-slate-700 dark:text-slate-300">
                <input type="checkbox" checked={form.allowsMultipleFiles} onChange={(e) => setForm((f) => ({ ...f, allowsMultipleFiles: e.target.checked }))} />
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
    </DashboardLayout>
  );
}
