import { useState, useRef, useEffect } from 'react';
import { UploadCloud, FileText, Loader2, AlertCircle } from 'lucide-react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { documentService, DocType } from '@/services/documentService';
import { folderService, MerconFolder } from '@/services/folderService';
import { driverService } from '@/services/driverService';
import { vehicleService } from '@/services/vehicleService';
import { tripService } from '@/services/tripService';
import { customerService } from '@/services/customerService';
import Btn from './Btn';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from './dialog';
import { DatePicker } from './date-picker';
import { Combobox, ComboboxOption } from './combobox';

interface UploadDocumentModalProps {
  isOpen: boolean;
  onClose: () => void;
  entityType?: string;
  entityId?: string;
  docType?: DocType;
  folderId?: string;
  onUploadSuccess?: () => void;
  /** When set, the document is linked to this configured type (preferred over legacy docType/select). */
  documentTypeId?: string;
  /** Display name for documentTypeId, shown read-only instead of the Document Type dropdown. */
  documentTypeName?: string;
  /** When true (used when opened from inside an owner's folder), owner selection is hidden — the
   * entityType/entityId props are already the answer, per the "no folder assignment step" upload flow. */
  lockOwner?: boolean;
  ownerDisplayName?: string;
}

export default function UploadDocumentModal({
  isOpen,
  onClose,
  entityType: initialEntityType = 'Driver',
  entityId: initialEntityId = '',
  docType,
  folderId: initialFolderId = '',
  onUploadSuccess,
  documentTypeId,
  documentTypeName,
  lockOwner = false,
  ownerDisplayName,
}: UploadDocumentModalProps) {
  const queryClient = useQueryClient();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [selectedDocType, setSelectedDocType] = useState<DocType>(docType || 'POD');
  const [selectedEntityType, setSelectedEntityType] = useState<string>(initialEntityType);
  const [selectedEntityId, setSelectedEntityId] = useState<string>(initialEntityId);
  const [selectedFolderId, setSelectedFolderId] = useState<string>(initialFolderId);
  const [issueDate, setIssueDate] = useState('');
  const [expiryDate, setExpiryDate] = useState('');
  const [isConfidential, setIsConfidential] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Queries for lookups
  const { data: folders = [] } = useQuery({
    queryKey: ['folders'],
    queryFn: async () => (await folderService.getAll()).data,
    enabled: isOpen,
  });

  const { data: drivers = [] } = useQuery({
    queryKey: ['drivers', 'lookup'],
    queryFn: async () => (await driverService.getAll()).data,
    enabled: isOpen && selectedEntityType === 'Driver',
  });

  const { data: vehicles = [] } = useQuery({
    queryKey: ['vehicles', 'lookup'],
    queryFn: async () => (await vehicleService.getAll()).data,
    enabled: isOpen && selectedEntityType === 'Vehicle',
  });

  const { data: trips = [] } = useQuery({
    queryKey: ['trips', 'lookup'],
    queryFn: async () => (await tripService.getAll({ per_page: 100 })).data,
    enabled: isOpen && selectedEntityType === 'Trip',
  });

  const { data: customers = [] } = useQuery({
    queryKey: ['customers', 'lookup'],
    queryFn: async () => (await customerService.getAll()).data,
    enabled: isOpen && selectedEntityType === 'Customer',
  });

  const ownerOptions: ComboboxOption[] = (() => {
    if (selectedEntityType === 'Driver') return drivers.map((d: any) => ({ value: d.id, label: `${d.first_name} ${d.last_name}` }));
    if (selectedEntityType === 'Vehicle') return vehicles.map((v: any) => ({ value: v.id, label: v.plate_number || v.ref_id }));
    if (selectedEntityType === 'Trip') return trips.map((t: any) => ({ value: t.id, label: t.ref_id || `Trip #${t.id.slice(0, 8)}` }));
    if (selectedEntityType === 'Customer') return customers.map((c: any) => ({ value: c.id, label: c.name }));
    return [];
  })();

  // Auto select first entity if none selected
  useEffect(() => {
    if (!selectedEntityId) {
      if (selectedEntityType === 'Driver' && drivers.length > 0) setSelectedEntityId(drivers[0].id);
      if (selectedEntityType === 'Vehicle' && vehicles.length > 0) setSelectedEntityId(vehicles[0].id);
      if (selectedEntityType === 'Trip' && trips.length > 0) setSelectedEntityId(trips[0].id);
      if (selectedEntityType === 'Customer' && customers.length > 0) setSelectedEntityId(customers[0].id);
      if (selectedEntityType === 'Company') setSelectedEntityId('00000000-0000-0000-0000-000000000000');
    }
  }, [selectedEntityType, drivers, vehicles, trips, customers, selectedEntityId]);

  const uploadMutation = useMutation({
    mutationFn: (formData: FormData) => documentService.upload(formData),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['documents'] });
      queryClient.invalidateQueries({ queryKey: ['folders'] });
      if (onUploadSuccess) onUploadSuccess();
      handleClose();
    },
    onError: (err: any) => {
      setError(err.response?.data?.error?.message || err.message || 'Failed to upload document');
    }
  });

  const handleClose = () => {
    setSelectedFile(null);
    setIssueDate('');
    setExpiryDate('');
    setIsConfidential(false);
    setError(null);
    onClose();
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      setSelectedFile(e.target.files[0]);
      setError(null);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedFile) {
      setError('Please select a file to upload.');
      return;
    }

    const finalEntityId = selectedEntityId || (selectedEntityType === 'Company' ? '00000000-0000-0000-0000-000000000000' : '');

    if (!finalEntityId) {
      setError('Please select an entity owner for this document.');
      return;
    }

    const formData = new FormData();
    formData.append('file', selectedFile);
    formData.append('entity_type', selectedEntityType);
    formData.append('entity_id', finalEntityId);
    formData.append('doc_type', selectedDocType);
    if (documentTypeId) formData.append('document_type_id', documentTypeId);
    if (selectedFolderId) formData.append('folder_id', selectedFolderId);
    if (issueDate) formData.append('issue_date', new Date(issueDate).toISOString());
    if (expiryDate) formData.append('expiry_date', new Date(expiryDate).toISOString());
    formData.append('is_confidential', isConfidential.toString());

    uploadMutation.mutate(formData);
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => {
      if (!open && !uploadMutation.isPending) handleClose();
    }}>
      <DialogContent className="w-full max-w-md rounded-2xl p-0 border-slate-200 dark:border-slate-800 shadow-xl overflow-hidden max-h-[90vh] flex flex-col">
        
        {/* Header */}
        <DialogHeader className="px-6 py-4 border-b border-slate-100 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-900 m-0">
          <DialogTitle className="text-base font-extrabold text-slate-900 dark:text-slate-100">Upload Vault Document</DialogTitle>
        </DialogHeader>

        {/* Content */}
        <div className="p-6 overflow-y-auto">
          <form onSubmit={handleSubmit} className="space-y-4">
            
            {/* File Dropzone */}
            <div>
              <div 
                onClick={() => fileInputRef.current?.click()}
                className={`border-2 border-dashed rounded-2xl p-6 text-center cursor-pointer transition-all
                  ${selectedFile ? 'border-emerald-500 bg-emerald-50/60 dark:bg-emerald-950/20' : 'border-slate-200 dark:border-slate-700 hover:border-brand hover:bg-brand-light/40 dark:hover:bg-brand/10'}`}
              >
                <input 
                  type="file" 
                  ref={fileInputRef} 
                  onChange={handleFileSelect} 
                  className="hidden" 
                  accept=".pdf,.png,.jpg,.jpeg,.webp"
                />
                
                {selectedFile ? (
                  <div className="flex flex-col items-center">
                    <div className="w-10 h-10 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mb-2">
                      <FileText size={20} />
                    </div>
                    <p className="text-xs font-bold text-slate-900 dark:text-slate-100 truncate max-w-[250px]">{selectedFile.name}</p>
                    <p className="text-[10px] text-slate-400 font-mono mt-0.5">{(selectedFile.size / 1024 / 1024).toFixed(2)} MB</p>
                  </div>
                ) : (
                  <div className="flex flex-col items-center">
                    <div className="w-10 h-10 bg-slate-100 dark:bg-slate-800 text-slate-400 rounded-full flex items-center justify-center mb-2">
                      <UploadCloud size={20} />
                    </div>
                    <p className="text-xs font-bold text-slate-800 dark:text-slate-200">Click to upload file</p>
                    <p className="text-[11px] text-slate-400 mt-0.5">PDF, PNG, JPG, WEBP (Max 50MB)</p>
                  </div>
                )}
              </div>
            </div>

            {/* Entity & Document Details — revealed only after a file is picked, so the
                flow is always "upload first, then say whose document it is" (never the
                reverse) for both the global upload wizard and the in-folder shortcut. */}
            {selectedFile && (
            <div className="space-y-3 animate-fade-in">
              {lockOwner ? (
                <div className="px-3 py-2 rounded-xl bg-brand-light/50 dark:bg-brand/10 border border-brand/20 text-xs">
                  <span className="text-slate-500 dark:text-slate-400">Uploading for </span>
                  <span className="font-bold text-slate-900 dark:text-slate-100">{ownerDisplayName || 'this owner'}</span>
                  <span className="text-slate-500 dark:text-slate-400"> ({selectedEntityType})</span>
                </div>
              ) : (
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">Owner Type</label>
                    <select
                      value={selectedEntityType}
                      onChange={(e) => {
                        setSelectedEntityType(e.target.value);
                        setSelectedEntityId('');
                      }}
                      className="w-full h-9 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3 text-xs font-semibold outline-none focus:ring-2 focus:ring-brand/30"
                    >
                      <option value="Driver">Driver</option>
                      <option value="Vehicle">Vehicle</option>
                      <option value="Trip">Trip</option>
                      <option value="Customer">Customer</option>
                      <option value="Company">Company</option>
                    </select>
                  </div>

                  {selectedEntityType !== 'Company' && (
                    <div>
                      <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">Owner</label>
                      <Combobox
                        options={ownerOptions}
                        value={selectedEntityId}
                        onChange={setSelectedEntityId}
                        placeholder="Select owner..."
                        searchPlaceholder="Search..."
                        emptyText="No matches found."
                        triggerClassName="h-9"
                      />
                    </div>
                  )}
                </div>
              )}

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">Document Type</label>
                  {documentTypeName ? (
                    <div className="h-9 flex items-center px-3 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs font-bold text-slate-800 dark:text-slate-200">
                      {documentTypeName}
                    </div>
                  ) : (
                    <select
                      value={selectedDocType}
                      onChange={(e) => setSelectedDocType(e.target.value as DocType)}
                      className="w-full h-9 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3 text-xs font-semibold outline-none focus:ring-2 focus:ring-brand/30"
                      disabled={!!docType}
                    >
                      <option value="POD">Proof of Delivery (POD)</option>
                      <option value="Contract">Contract</option>
                      <option value="DriverLicense">Driver License</option>
                      <option value="Passport">Passport</option>
                      <option value="VehicleRegistration">Vehicle Registration</option>
                      <option value="Insurance">Insurance</option>
                      <option value="Waybill">Waybill</option>
                      <option value="Invoice">Invoice</option>
                      <option value="CustomsClearance">Customs Clearance</option>
                      <option value="Emergency">Emergency Record</option>
                    </select>
                  )}
                </div>

                {!lockOwner && (
                  <div>
                    <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">Folder (Optional)</label>
                    <select
                      value={selectedFolderId}
                      onChange={(e) => setSelectedFolderId(e.target.value)}
                      className="w-full h-9 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3 text-xs font-semibold outline-none focus:ring-2 focus:ring-brand/30"
                    >
                      <option value="">No Folder (Root)</option>
                      {folders.map((f: MerconFolder) => (
                        <option key={f.id} value={f.id}>{f.name}</option>
                      ))}
                    </select>
                  </div>
                )}
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300">Issue Date</label>
                  <DatePicker
                    value={issueDate}
                    onChange={(_, dateStr) => setIssueDate(dateStr)}
                    placeholder="Select issue date..."
                  />
                </div>
                <div className="space-y-1">
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300">Expiry Date</label>
                  <DatePicker
                    value={expiryDate}
                    onChange={(_, dateStr) => setExpiryDate(dateStr)}
                    placeholder="Select expiry date..."
                    minDate={issueDate ? new Date(issueDate) : undefined}
                  />
                </div>
              </div>

              <label className="flex items-center gap-2 cursor-pointer pt-1">
                <input 
                  type="checkbox" 
                  checked={isConfidential}
                  onChange={(e) => setIsConfidential(e.target.checked)}
                  className="w-4 h-4 text-brand rounded border-slate-300 focus:ring-brand"
                />
                <span className="text-xs text-slate-700 dark:text-slate-300 font-semibold">Mark document as confidential</span>
              </label>
            </div>
            )}

            {error && (
              <div className="flex items-start gap-2 p-3 bg-rose-50 text-rose-600 rounded-xl text-xs">
                <AlertCircle size={14} className="mt-0.5 shrink-0" />
                <p>{error}</p>
              </div>
            )}
          </form>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-2 px-6 py-3 border-t border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900">
          <Btn 
            label="Cancel" 
            variant="outline" 
            onClick={handleClose} 
            disabled={uploadMutation.isPending} 
          />
          <Btn 
            label="Upload Document" 
            onClick={handleSubmit} 
            disabled={!selectedFile || uploadMutation.isPending}
            icon={uploadMutation.isPending ? <Loader2 size={16} className="animate-spin" /> : <UploadCloud size={16} />}
          />
        </div>

      </DialogContent>
    </Dialog>
  );
}

