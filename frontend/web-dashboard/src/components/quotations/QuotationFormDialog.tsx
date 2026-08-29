import { useEffect, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { ArrowRight, Building2, Loader2, Receipt, MapPin, Banknote, Tag, Sparkles, Calendar, FileText, Upload } from 'lucide-react';
import { toast } from 'sonner';

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import LocationCombobox from '@/components/quotations/LocationCombobox';
import { TaxonomySelect } from '@/components/common/TaxonomySelect';
import { quotationService, Quotation } from '@/services/quotationService';
import { customerService } from '@/services/customerService';
import { documentService } from '@/services/documentService';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

interface QuotationFormDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onSaved?: (quotation: Quotation) => void;
  /** Editing an existing quotation; omit to create. */
  quotation?: Quotation | null;
  /** Legacy prop alias */
  rateCard?: Quotation | null;
  /** Locks the quotation to one customer (used from customer page). */
  lockedCustomerId?: string;
  lockedCustomerName?: string;
  defaultAgreementRef?: string;
  defaultOriginLocationId?: string;
  defaultDestinationLocationId?: string;
  defaultPrice?: string;
}

export default function QuotationFormDialog({
  isOpen,
  onClose,
  onSaved,
  quotation: targetQuotationProp,
  rateCard,
  lockedCustomerId,
  lockedCustomerName,
  defaultAgreementRef,
  defaultOriginLocationId,
  defaultDestinationLocationId,
  defaultPrice,
}: QuotationFormDialogProps) {
  const quotation = targetQuotationProp || rateCard;
  const queryClient = useQueryClient();
  const isEditing = !!quotation;

  const [customerId, setCustomerId] = useState('');
  const [originId, setOriginId] = useState('');
  const [destinationId, setDestinationId] = useState('');
  const [price, setPrice] = useState('');
  const [driverPayout, setDriverPayout] = useState('');
  const [currency, setCurrency] = useState('SAR');
  const [name, setName] = useState('');
  const [agreementRef, setAgreementRef] = useState('');
  
  // Commercial Tier & Basis fields
  const [vehicleClass, setVehicleClass] = useState('');
  const [sourceVehicleLabel, setSourceVehicleLabel] = useState('');
  const [lineType, setLineType] = useState('');
  const [billingType, setBillingType] = useState('');
  const [pricingBasis, setPricingBasis] = useState<string>('UNSPECIFIED');

  // Validity & Source
  const [validFrom, setValidFrom] = useState('');
  const [validTo, setValidTo] = useState('');
  const [sourceType, setSourceType] = useState('MANUAL');
  const [sourceReference, setSourceReference] = useState('');

  // Source Document Linker
  const [documentId, setDocumentId] = useState<string | null>(null);
  const [selectedDocument, setSelectedDocument] = useState<any | null>(null);
  const [isUploadingDoc, setIsUploadingDoc] = useState(false);

  const [changeReason, setChangeReason] = useState('');
  const [error, setError] = useState<string | null>(null);

  const effectiveCustomerId = lockedCustomerId || customerId;

  const { data: customersRes } = useQuery({
    queryKey: ['customers-select'],
    queryFn: () => customerService.getAll({ per_page: 100, mode: 'lookup' }),
    enabled: isOpen && !lockedCustomerId,
  });
  const customers = customersRes?.data || [];

  const { data: customerDocsRes } = useQuery({
    queryKey: ['customer-documents', effectiveCustomerId],
    queryFn: () => (effectiveCustomerId ? documentService.getAll({ entity_type: 'Customer', entity_id: effectiveCustomerId }) : null),
    enabled: isOpen && !!effectiveCustomerId,
  });
  const customerDocs = customerDocsRes?.data || [];

  useEffect(() => {
    if (!isOpen) return;
    setError(null);
    setChangeReason('');
    if (quotation) {
      setCustomerId(quotation.customerId || '');
      setOriginId(quotation.originLocationId || '');
      setDestinationId(quotation.destinationLocationId || '');
      setPrice(String(quotation.rate ?? quotation.base_price ?? ''));
      setDriverPayout(quotation.driver_payout != null ? String(quotation.driver_payout) : '');
      setCurrency(quotation.currency || 'SAR');
      setName(quotation.name || '');
      setAgreementRef(quotation.agreement_ref || '');
      setVehicleClass(quotation.vehicle_class || '');
      setSourceVehicleLabel(quotation.source_vehicle_label || quotation.vehicle_type || '');
      setLineType(quotation.line_type || quotation.rate_category || '');
      setBillingType(quotation.billing_type || '');
      setPricingBasis(quotation.pricing_basis || 'UNSPECIFIED');
      setValidFrom(quotation.valid_from ? quotation.valid_from.substring(0, 10) : '');
      setValidTo(quotation.valid_to ? quotation.valid_to.substring(0, 10) : '');
      setSourceType(quotation.source_type || 'MANUAL');
      setSourceReference(quotation.source_reference || '');
      setDocumentId(quotation.documentId || null);
      setSelectedDocument(quotation.document || null);
    } else {
      setCustomerId(lockedCustomerId || '');
      setOriginId(defaultOriginLocationId || '');
      setDestinationId(defaultDestinationLocationId || '');
      setPrice(defaultPrice || '');
      setDriverPayout('');
      setCurrency('SAR');
      setName('');
      setAgreementRef(defaultAgreementRef || '');
      setVehicleClass('');
      setSourceVehicleLabel('');
      setLineType('');
      setBillingType('');
      setPricingBasis('UNSPECIFIED');
      setValidFrom('');
      setValidTo('');
      setSourceType('MANUAL');
      setSourceReference('');
      setDocumentId(null);
      setSelectedDocument(null);
    }
  }, [
    isOpen,
    quotation,
    lockedCustomerId,
    defaultOriginLocationId,
    defaultDestinationLocationId,
    defaultPrice,
    defaultAgreementRef,
  ]);

  const handleUploadSourceFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !effectiveCustomerId) return;
    try {
      setIsUploadingDoc(true);
      const formData = new FormData();
      formData.append('file', file);
      formData.append('entity_type', 'Customer');
      formData.append('entity_id', effectiveCustomerId);
      formData.append('doc_type', 'Contract');
      const uploadedDoc = await documentService.upload(formData);
      setDocumentId(uploadedDoc.id);
      setSelectedDocument(uploadedDoc);
      toast.success(`Source document "${file.name}" uploaded to Customer Vault!`);
    } catch (err: any) {
      toast.error(err?.message || 'Failed to upload document');
    } finally {
      setIsUploadingDoc(false);
    }
  };

  const numericPrice = parseFloat(price || '');
  const numericDriverPayout = driverPayout ? parseFloat(driverPayout) : null;

  const saveMutation = useMutation({
    mutationFn: async () => {
      const payload = {
        name: name.trim() || undefined,
        rate: numericPrice,
        base_price: numericPrice,
        driver_payout: numericDriverPayout,
        driver_charge: numericDriverPayout,
        currency,
        customerId: effectiveCustomerId,
        origin_location_id: originId || null,
        destination_location_id: destinationId || null,
        agreement_ref: agreementRef.trim() || null,
        vehicle_class: vehicleClass.trim() || null,
        source_vehicle_label: sourceVehicleLabel.trim() || null,
        vehicle_type: sourceVehicleLabel.trim() || vehicleClass.trim() || null,
        line_type: lineType || null,
        rate_category: lineType || null,
        billing_type: billingType || null,
        pricing_basis: pricingBasis === 'UNSPECIFIED' ? null : pricingBasis,
        valid_from: validFrom || null,
        valid_to: validTo || null,
        source_type: sourceType || 'MANUAL',
        source_reference: sourceReference.trim() || null,
        documentId: documentId || null,
        reason: changeReason.trim() || undefined,
      };
      return quotation
        ? quotationService.update(quotation.id, payload)
        : quotationService.create(payload);
    },
    onSuccess: (saved) => {
      queryClient.invalidateQueries({ queryKey: ['quotations'] });
      queryClient.invalidateQueries({ queryKey: ['rate-cards'] });
      queryClient.invalidateQueries({ queryKey: ['quotation-lookup'] });
      onSaved?.(saved);
      onClose();
    },
    onError: (err: any) => {
      setError(err.response?.data?.error?.message || err.message || 'Could not save quotation.');
    },
  });

  const handleSubmit = () => {
    setError(null);
    if (!effectiveCustomerId) return setError('Choose which customer this quotation is for.');
    if (!originId || !destinationId) return setError('Pick both an origin and a destination.');
    if (isNaN(numericPrice) || numericPrice <= 0) return setError('Enter a rate greater than 0.');
    saveMutation.mutate();
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-[620px] p-6 rounded-2xl border-slate-200/80 shadow-2xl bg-white dark:bg-slate-900 dark:border-slate-800 max-h-[90vh] overflow-y-auto">
        <DialogHeader className="space-y-1.5 pb-2 border-b border-slate-100 dark:border-slate-800">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-amber-50 text-amber-600 border border-amber-200">
                <Receipt className="h-4.5 w-4.5" />
              </div>
              <div>
                <DialogTitle className="text-base font-bold text-slate-900 dark:text-slate-100">
                  {isEditing ? 'Edit Commercial Quotation' : 'New Commercial Quotation'}
                </DialogTitle>
                <DialogDescription className="text-xs text-slate-500">
                  Customer-specific pricing rule and commercial terms.
                </DialogDescription>
              </div>
            </div>
            <Badge className="bg-amber-50 text-amber-800 hover:bg-amber-50 border-amber-200/60 font-semibold text-[10px] uppercase tracking-wider px-2 py-0.5">
              Quotation Module
            </Badge>
          </div>
        </DialogHeader>

        <div className="space-y-4 py-2">
          {/* Customer & Lane Section */}
          <div className="space-y-3 p-3.5 bg-slate-50/60 dark:bg-slate-800/40 rounded-xl border border-slate-100 dark:border-slate-800/80">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1.5 min-w-0">
                <Label className="text-xs font-semibold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                  <Building2 className="h-3.5 w-3.5 text-slate-400" /> Customer
                </Label>
                {lockedCustomerId ? (
                  <div className="flex h-9 items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 text-xs font-semibold text-slate-800 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 shadow-2xs">
                    <Building2 className="h-3.5 w-3.5 text-brand" />
                    <span>{lockedCustomerName || 'Selected Customer'}</span>
                  </div>
                ) : (
                  <Select value={customerId} onValueChange={setCustomerId}>
                    <SelectTrigger className="h-9 text-xs bg-white dark:bg-slate-900 font-medium border-slate-200 dark:border-slate-700 rounded-lg shadow-2xs">
                      <SelectValue placeholder="Select a customer..." />
                    </SelectTrigger>
                    <SelectContent className="z-[9999]">
                      {customers.map((c) => (
                        <SelectItem key={c.id} value={c.id} className="text-xs font-medium">
                          {c.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              </div>

              <div className="space-y-1.5 min-w-0">
                <Label className="text-xs font-semibold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                  <FileText className="h-3.5 w-3.5 text-amber-600" /> Agreement Reference
                </Label>
                <Input
                  value={agreementRef}
                  onChange={(e) => setAgreementRef(e.target.value)}
                  placeholder="e.g. IM-2026-01"
                  className="h-9 text-xs bg-white dark:bg-slate-900 font-mono font-bold text-amber-800 dark:text-amber-300 border-slate-200 dark:border-slate-700"
                />
                <p className="text-[10px] text-slate-400">
                  Groups this commercial route with other routes belonging to the same agreement.
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                  <MapPin className="h-3.5 w-3.5 text-emerald-500" /> Origin Location
                </Label>
                <LocationCombobox
                  value={originId}
                  onChange={setOriginId}
                  placeholder="Search origin..."
                />
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-semibold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                  <MapPin className="h-3.5 w-3.5 text-rose-500" /> Destination Location
                </Label>
                <LocationCombobox
                  value={destinationId}
                  onChange={setDestinationId}
                  placeholder="Search destination..."
                />
              </div>
            </div>
          </div>

          {/* Vehicle Class & Original Label */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 p-3.5 bg-slate-50/60 dark:bg-slate-800/40 rounded-xl border border-slate-100 dark:border-slate-800/80">
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                Normalized Vehicle Class
              </Label>
              <TaxonomySelect
                category="VEHICLE_CLASS"
                value={vehicleClass}
                onValueChange={setVehicleClass}
                placeholder="Select class (e.g. 10 TON)"
              />
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                Source Vehicle Label
              </Label>
              <Input
                value={sourceVehicleLabel}
                onChange={(e) => setSourceVehicleLabel(e.target.value)}
                placeholder="Customer's exact label (e.g. 6.5M-10TON)"
                className="h-9 text-xs bg-white dark:bg-slate-900"
              />
            </div>
          </div>

          {/* Commercial Terms: Line Type, Billing Type, Pricing Basis */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 p-3.5 bg-slate-50/60 dark:bg-slate-800/40 rounded-xl border border-slate-100 dark:border-slate-800/80">
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-slate-700 dark:text-slate-300">Line Type</Label>
              <TaxonomySelect
                category="LINE_TYPE"
                value={lineType}
                onValueChange={setLineType}
                placeholder="Select line type"
              />
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-slate-700 dark:text-slate-300">Billing Type</Label>
              <TaxonomySelect
                category="OPERATION_TYPE"
                value={billingType}
                onValueChange={setBillingType}
                placeholder="Select billing type"
              />
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-slate-700 dark:text-slate-300">Pricing Basis</Label>
              <Select value={pricingBasis} onValueChange={setPricingBasis}>
                <SelectTrigger className="h-9 text-xs bg-white dark:bg-slate-900 border-slate-200">
                  <SelectValue placeholder="Pricing basis" />
                </SelectTrigger>
                <SelectContent className="z-[9999]">
                  <SelectItem value="PER_TRIP">Per Trip</SelectItem>
                  <SelectItem value="PER_MONTH">Per Month</SelectItem>
                  <SelectItem value="UNSPECIFIED">Not specified (NULL)</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Rate & Driver Charge & Currency */}
          <div className="p-3.5 bg-slate-50/60 dark:bg-slate-800/40 rounded-xl border border-slate-100 dark:border-slate-800/80 space-y-3">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                  <Banknote className="h-3.5 w-3.5 text-emerald-600" /> Billing Rate *
                </Label>
                <Input
                  type="number"
                  step="0.01"
                  value={price}
                  onChange={(e) => setPrice(e.target.value)}
                  placeholder="e.g. 1600"
                  className="h-9 text-xs bg-white dark:bg-slate-900 font-bold"
                />
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-semibold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                  <Banknote className="h-3.5 w-3.5 text-amber-600" /> Driver Charge
                </Label>
                <Input
                  type="number"
                  step="0.01"
                  value={driverPayout}
                  onChange={(e) => setDriverPayout(e.target.value)}
                  placeholder="e.g. 450"
                  className="h-9 text-xs bg-white dark:bg-slate-900 font-bold"
                />
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-semibold text-slate-700 dark:text-slate-300">Currency</Label>
                <Select value={currency} onValueChange={setCurrency}>
                  <SelectTrigger className="h-9 text-xs bg-white dark:bg-slate-900">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="z-[9999]">
                    <SelectItem value="SAR">SAR (Saudi Riyal)</SelectItem>
                    <SelectItem value="AED">AED (UAE Dirham)</SelectItem>
                    <SelectItem value="USD">USD (US Dollar)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {isEditing && (
              <div className="space-y-1.5 pt-1">
                <Label className="text-xs font-semibold text-amber-700 dark:text-amber-400">
                  Reason for Rate Adjustment
                </Label>
                <Input
                  value={changeReason}
                  onChange={(e) => setChangeReason(e.target.value)}
                  placeholder="Audit reason (e.g. Contract annual renewal)"
                  className="h-8 text-xs bg-amber-50/50 dark:bg-amber-950/20 border-amber-200"
                />
              </div>
            )}
          </div>

          {/* Validity & Source Info */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 p-3.5 bg-slate-50/60 dark:bg-slate-800/40 rounded-xl border border-slate-100 dark:border-slate-800/80">
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                <Calendar className="h-3.5 w-3.5 text-blue-500" /> Valid From
              </Label>
              <Input
                type="date"
                value={validFrom}
                onChange={(e) => setValidFrom(e.target.value)}
                className="h-9 text-xs bg-white dark:bg-slate-900"
              />
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                <Calendar className="h-3.5 w-3.5 text-blue-500" /> Valid To
              </Label>
              <Input
                type="date"
                value={validTo}
                onChange={(e) => setValidTo(e.target.value)}
                className="h-9 text-xs bg-white dark:bg-slate-900"
              />
            </div>
          </div>

          {/* Commercial Source & Document Vault Section */}
          <div className="p-3.5 bg-slate-50/60 dark:bg-slate-800/40 rounded-xl border border-slate-100 dark:border-slate-800/80 space-y-3">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold text-slate-700 dark:text-slate-300">Source Type</Label>
                <Select value={sourceType} onValueChange={setSourceType}>
                  <SelectTrigger className="h-9 text-xs bg-white dark:bg-slate-900">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="z-[9999]">
                    <SelectItem value="Company Quotation">Company Quotation</SelectItem>
                    <SelectItem value="Customer Quotation">Customer Quotation</SelectItem>
                    <SelectItem value="Email Confirmation">Email Confirmation</SelectItem>
                    <SelectItem value="Contract">Contract</SelectItem>
                    <SelectItem value="Amendment">Amendment</SelectItem>
                    <SelectItem value="MANUAL">Manual Entry</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                  Source Reference / Ref #
                </Label>
                <Input
                  value={sourceReference}
                  onChange={(e) => setSourceReference(e.target.value)}
                  placeholder="e.g. Email dated 25-Aug-2026 or IM-2026-01"
                  className="h-9 text-xs bg-white dark:bg-slate-900"
                />
              </div>
            </div>

            {/* Customer Document Vault Linker */}
            <div className="space-y-2 pt-1 border-t border-slate-200/60 dark:border-slate-700/60">
              <div className="flex items-center justify-between">
                <Label className="text-xs font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                  <FileText className="w-3.5 h-3.5 text-amber-600" />
                  Source Document (Customer Vault)
                </Label>
                <span className="text-[10px] text-slate-400 font-normal">Optional</span>
              </div>

              {documentId || selectedDocument ? (
                <div className="flex items-center justify-between p-2.5 rounded-xl bg-amber-50/70 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 text-xs">
                  <div className="flex items-center gap-2 min-w-0">
                    <FileText className="w-4 h-4 text-amber-600 shrink-0" />
                    <div className="truncate space-y-0.5">
                      <span className="font-bold text-amber-950 dark:text-amber-200 block truncate">
                        {selectedDocument?.file_name || selectedDocument?.doc_type || 'Source Document'}
                      </span>
                      <span className="text-[10px] text-slate-500 font-mono block">
                        ID: {documentId?.substring(0, 8)}...
                      </span>
                    </div>
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        setDocumentId(null);
                        setSelectedDocument(null);
                      }}
                      className="h-7 text-[11px] font-bold text-rose-600 hover:text-rose-700 hover:bg-rose-100/50"
                    >
                      Remove
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  <Select
                    value={documentId || ''}
                    onValueChange={(val) => {
                      if (!val) {
                        setDocumentId(null);
                        setSelectedDocument(null);
                        return;
                      }
                      const matched = customerDocs.find((d) => d.id === val);
                      setDocumentId(val);
                      setSelectedDocument(matched || null);
                    }}
                  >
                    <SelectTrigger className="h-9 text-xs bg-white dark:bg-slate-900">
                      <SelectValue placeholder={`Select from Customer Vault (${customerDocs.length})`} />
                    </SelectTrigger>
                    <SelectContent className="z-[9999]">
                      {customerDocs.length === 0 ? (
                        <div className="p-2 text-center text-xs text-slate-400">No customer documents uploaded</div>
                      ) : (
                        customerDocs.map((doc) => (
                          <SelectItem key={doc.id} value={doc.id}>
                            📄 {doc.doc_type || 'Document'} ({doc.file_url ? doc.file_url.split('/').pop() : doc.id.substring(0, 8)})
                          </SelectItem>
                        ))
                      )}
                    </SelectContent>
                  </Select>

                  <div className="relative">
                    <input
                      type="file"
                      id="source-doc-upload"
                      className="hidden"
                      onChange={handleUploadSourceFile}
                      disabled={isUploadingDoc || !effectiveCustomerId}
                    />
                    <label
                      htmlFor="source-doc-upload"
                      className={cn(
                        "flex items-center justify-center gap-1.5 h-9 px-3 rounded-lg border border-dashed text-xs font-bold cursor-pointer transition-all w-full",
                        isUploadingDoc
                          ? "bg-slate-100 text-slate-400 border-slate-300 cursor-not-allowed"
                          : "bg-white dark:bg-slate-900 border-amber-300 dark:border-amber-800 text-amber-700 dark:text-amber-300 hover:bg-amber-50/50"
                      )}
                    >
                      {isUploadingDoc ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Upload className="w-3.5 h-3.5 text-amber-600" />}
                      <span>{isUploadingDoc ? 'Uploading...' : '+ Upload New Source'}</span>
                    </label>
                  </div>
                </div>
              )}
            </div>
          </div>

          {error && (
            <div className="p-3 bg-rose-50 text-rose-700 text-xs rounded-xl border border-rose-200 font-medium flex items-center gap-2">
              <div className="w-1.5 h-1.5 rounded-full bg-rose-600 animate-pulse" />
              <span>{error}</span>
            </div>
          )}
        </div>

        <DialogFooter className="pt-2 border-t border-slate-100 dark:border-slate-800">
          <Button type="button" variant="outline" onClick={onClose} className="h-9 text-xs rounded-xl">
            Cancel
          </Button>
          <Button
            type="button"
            onClick={handleSubmit}
            disabled={saveMutation.isPending}
            className="h-9 text-xs bg-amber-600 hover:bg-amber-700 text-white font-semibold rounded-xl px-5 shadow-sm"
          >
            {saveMutation.isPending && <Loader2 className="mr-2 h-3.5 w-3.5 animate-spin" />}
            {isEditing ? 'Save Quotation Changes' : 'Create Quotation'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export const RateCardFormDialog = QuotationFormDialog;
