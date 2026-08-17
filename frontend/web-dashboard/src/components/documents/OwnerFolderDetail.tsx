import { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { UploadCloud, CheckCircle2, AlertTriangle, XCircle, FileQuestion, Eye, Loader2, Files } from 'lucide-react';
import { toast } from 'sonner';
import { documentService, type OwnerFolderSlot, type MerconDocument } from '@/services/documentService';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import UploadDocumentModal from '@/components/ui/UploadDocumentModal';
import DocumentViewerModal from '@/components/ui/DocumentViewerModal';
import { cn } from '@/lib/utils';

// Documents keep a required legacy `doc_type` enum column for back-compat.
// New DocumentType-driven uploads never need to know about it — the backend
// derives a sensible default from the type's ownerType.
const STATUS_CONFIG: Record<string, { label: string; className: string; icon: any }> = {
  VALID:          { label: 'Valid',          className: 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/30 dark:text-emerald-400 dark:border-emerald-800/50', icon: CheckCircle2 },
  EXPIRING_SOON:  { label: 'Expiring Soon',  className: 'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/30 dark:text-amber-400 dark:border-amber-800/50', icon: AlertTriangle },
  EXPIRED:        { label: 'Expired',        className: 'bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-950/30 dark:text-rose-400 dark:border-rose-800/50', icon: XCircle },
  MISSING:        { label: 'Missing',        className: 'bg-slate-100 text-slate-500 border-slate-200 dark:bg-slate-800 dark:text-slate-400 dark:border-slate-700', icon: FileQuestion },
};

interface OwnerFolderDetailProps {
  ownerType: 'Driver' | 'Vehicle';
  ownerId: string;
}

export default function OwnerFolderDetail({ ownerType, ownerId }: OwnerFolderDetailProps) {
  const queryClient = useQueryClient();
  const [uploadSlot, setUploadSlot] = useState<OwnerFolderSlot | null>(null);
  const [previewDoc, setPreviewDoc] = useState<MerconDocument | null>(null);

  const queryKey = ['documents', 'owner', ownerType, ownerId];
  const { data: folder, isLoading } = useQuery({
    queryKey,
    queryFn: () => documentService.getOwnerFolder(ownerType, ownerId),
    enabled: !!ownerId,
  });

  const refresh = async () => {
    await queryClient.invalidateQueries({ queryKey });
    await queryClient.invalidateQueries({ queryKey: ['documents'] });
  };

  const handleDelete = async (id: string) => {
    try {
      await documentService.delete(id);
      toast.success('Document deleted');
      await refresh();
    } catch {
      toast.error('Failed to delete document');
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-16 text-slate-400 gap-2 text-sm">
        <Loader2 className="w-5 h-5 animate-spin" /> Loading document folder...
      </div>
    );
  }
  if (!folder) return null;

  const mandatorySlots = folder.slots.filter((s) => s.documentType.requirementStatus === 'MANDATORY');
  const optionalSlots = folder.slots.filter((s) => s.documentType.requirementStatus === 'OPTIONAL');

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between gap-3 p-4 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900">
        <div>
          <h3 className="text-sm font-extrabold text-slate-900 dark:text-slate-100">{folder.ownerName}</h3>
          <p className="text-xs text-slate-400">{ownerType} Document Folder</p>
        </div>
        <Badge className={cn(
          'text-xs font-bold px-3 py-1 border-0',
          folder.mandatoryComplete === folder.mandatoryTotal
            ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/50 dark:text-emerald-300'
            : 'bg-amber-100 text-amber-700 dark:bg-amber-900/50 dark:text-amber-300'
        )}>
          {folder.mandatoryComplete} / {folder.mandatoryTotal} Mandatory
        </Badge>
      </div>

      <SlotSection title="Mandatory" slots={mandatorySlots} onUpload={setUploadSlot} onPreview={setPreviewDoc} />
      {optionalSlots.length > 0 && (
        <SlotSection title="Optional" slots={optionalSlots} onUpload={setUploadSlot} onPreview={setPreviewDoc} />
      )}

      {uploadSlot && (
        <UploadDocumentModal
          isOpen={!!uploadSlot}
          onClose={() => setUploadSlot(null)}
          entityType={ownerType}
          entityId={ownerId}
          documentTypeId={uploadSlot.documentType.id}
          documentTypeName={uploadSlot.documentType.name}
          lockOwner
          ownerDisplayName={folder.ownerName}
          onUploadSuccess={refresh}
        />
      )}

      <DocumentViewerModal
        document={previewDoc}
        isOpen={!!previewDoc}
        onClose={() => setPreviewDoc(null)}
        onDelete={(id) => { handleDelete(id); setPreviewDoc(null); }}
      />
    </div>
  );
}

function SlotSection({
  title, slots, onUpload, onPreview,
}: {
  title: string;
  slots: OwnerFolderSlot[];
  onUpload: (slot: OwnerFolderSlot) => void;
  onPreview: (doc: MerconDocument) => void;
}) {
  if (slots.length === 0) return null;
  return (
    <div className="space-y-2">
      <h4 className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider px-1">{title}</h4>
      <div className="rounded-2xl border border-slate-200 dark:border-slate-800 divide-y divide-slate-100 dark:divide-slate-800 overflow-hidden bg-white dark:bg-slate-900">
        {slots.map((slot) => {
          const status = STATUS_CONFIG[slot.status];
          const StatusIcon = status.icon;
          const fileCount = slot.document?.files?.length ?? (slot.document ? 1 : 0);
          return (
            <div key={slot.documentType.id} className="flex items-center justify-between gap-3 px-4 py-3">
              <div className="flex items-center gap-3 min-w-0">
                <StatusIcon className={cn('w-4 h-4 shrink-0', status.className.split(' ')[1])} />
                <div className="min-w-0">
                  <p className="text-xs font-bold text-slate-900 dark:text-slate-100 truncate">{slot.documentType.name}</p>
                  {slot.document?.expiry_date && (
                    <p className="text-[11px] text-slate-400">
                      Expires {new Date(slot.document.expiry_date).toLocaleDateString()}
                    </p>
                  )}
                </div>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                {fileCount > 1 && (
                  <span className="text-[10px] text-slate-400 flex items-center gap-1"><Files className="w-3 h-3" />{fileCount}</span>
                )}
                <Badge variant="outline" className={cn('text-[10px] font-bold', status.className)}>
                  {status.label}
                </Badge>
                {slot.document ? (
                  <Button size="sm" variant="ghost" className="h-7 px-2 text-xs font-bold text-brand" onClick={() => onPreview(slot.document!)}>
                    <Eye className="w-3.5 h-3.5" />
                  </Button>
                ) : (
                  <Button size="sm" variant="outline" className="h-7 px-2.5 text-[11px] font-bold gap-1" onClick={() => onUpload(slot)}>
                    <UploadCloud className="w-3.5 h-3.5" /> Upload
                  </Button>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
