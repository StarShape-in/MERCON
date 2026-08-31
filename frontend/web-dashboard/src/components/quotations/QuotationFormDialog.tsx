import { useEffect, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Building2, MapPin, Banknote, Tag, Calendar, FileText, CheckCircle2, Loader2 } from 'lucide-react';

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
import { Badge } from '@/components/ui/badge';

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
  defaultVehicleClass?: string;
  defaultLineType?: string;
  defaultBillingType?: string;
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
  defaultVehicleClass,
  defaultLineType,
  defaultBillingType,
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

  // Validity
  const [validFrom, setValidFrom] = useState('');
  const [validTo, setValidTo] = useState('');

  const [changeReason, setChangeReason] = useState('');
  const [error, setError] = useState<string | null>(null);

  const effectiveCustomerId = lockedCustomerId || customerId;

  const { data: customersRes } = useQuery({
    queryKey: ['customers-select'],
    queryFn: () => customerService.getAll({ per_page: 100, mode: 'lookup' }),
    enabled: isOpen && !lockedCustomerId,
  });
  const customers = customersRes?.data || [];

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
    } else {
      setCustomerId(lockedCustomerId || '');
      setOriginId(defaultOriginLocationId || '');
      setDestinationId(defaultDestinationLocationId || '');
      setPrice(defaultPrice || '');
      setDriverPayout('');
      setCurrency('SAR');
      setName('');
      setAgreementRef(defaultAgreementRef || '');
      setVehicleClass(defaultVehicleClass || '');
      setSourceVehicleLabel(defaultVehicleClass || '');
      setLineType(defaultLineType || '');
      setBillingType(defaultBillingType || '');
      setPricingBasis('UNSPECIFIED');
      setValidFrom('');
      setValidTo('');
    }
  }, [
    isOpen,
    quotation,
    lockedCustomerId,
    defaultOriginLocationId,
    defaultDestinationLocationId,
    defaultPrice,
    defaultAgreementRef,
    defaultVehicleClass,
    defaultLineType,
    defaultBillingType,
  ]);

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
        source_type: 'MANUAL',
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
      <DialogContent className="sm:max-w-[560px] p-5 rounded-2xl border-[#E5E7EB] shadow-2xl bg-white dark:bg-slate-900 text-[#3E3C3D] max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <DialogHeader className="pb-3 border-b border-[#E5E7EB]">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="flex h-8.5 w-8.5 items-center justify-center rounded-xl bg-orange-50 text-[#FA634E] border border-orange-200 shadow-2xs">
                <Tag className="h-4 w-4" />
              </div>
              <div>
                <DialogTitle className="text-base font-bold text-[#3E3C3D] dark:text-slate-100">
                  {isEditing ? 'Edit Commercial Quotation' : 'New Commercial Quotation'}
                </DialogTitle>
                <DialogDescription className="text-xs text-[#6E6E80]">
                  Customer-specific pricing rule and route rate terms.
                </DialogDescription>
              </div>
            </div>
            <Badge className="bg-[#EEF1F6] text-[#3E3C3D] hover:bg-[#EEF1F6] border-[#E5E7EB] font-bold text-[10px] uppercase tracking-wider px-2 py-0.5">
              Commercial Rate Line
            </Badge>
          </div>
        </DialogHeader>

        <div className="space-y-3.5 py-3">
          {/* Section 1: Customer & Lane Context */}
          <div className="p-3 rounded-xl bg-[#EEF1F6]/50 border border-[#E5E7EB] space-y-3">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {/* Customer */}
              <div className="space-y-1">
                <Label className="text-xs font-bold text-[#3E3C3D] flex items-center gap-1.5">
                  <Building2 className="h-3.5 w-3.5 text-[#6E6E80]" /> Customer *
                </Label>
                {lockedCustomerId ? (
                  <div className="flex h-8.5 items-center gap-2 rounded-lg border border-[#E5E7EB] bg-white px-3 text-xs font-bold text-[#3E3C3D] shadow-2xs">
                    <Building2 className="h-3.5 w-3.5 text-[#FA634E]" />
                    <span className="truncate">{lockedCustomerName || 'Selected Customer'}</span>
                  </div>
                ) : (
                  <Select value={customerId} onValueChange={setCustomerId}>
                    <SelectTrigger className="h-8.5 text-xs bg-white font-semibold border-[#E5E7EB] rounded-lg shadow-2xs">
                      <SelectValue placeholder="Select customer..." />
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

              {/* Agreement Reference */}
              <div className="space-y-1">
                <Label className="text-xs font-bold text-[#3E3C3D] flex items-center gap-1.5">
                  <FileText className="h-3.5 w-3.5 text-amber-600" /> Agreement Ref (Optional)
                </Label>
                <Input
                  value={agreementRef}
                  onChange={(e) => setAgreementRef(e.target.value)}
                  placeholder="e.g. AGR-2026-01"
                  className="h-8.5 text-xs bg-white font-mono font-bold text-[#3E3C3D] border-[#E5E7EB]"
                />
              </div>
            </div>

            {/* Origin & Destination Locations */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-0.5">
              <div className="space-y-1">
                <Label className="text-xs font-bold text-[#3E3C3D] flex items-center gap-1.5">
                  <MapPin className="h-3.5 w-3.5 text-emerald-600" /> Origin Location *
                </Label>
                <LocationCombobox
                  value={originId}
                  onChange={setOriginId}
                  placeholder="Search origin..."
                />
              </div>

              <div className="space-y-1">
                <Label className="text-xs font-bold text-[#3E3C3D] flex items-center gap-1.5">
                  <MapPin className="h-3.5 w-3.5 text-[#FA634E]" /> Destination Location *
                </Label>
                <LocationCombobox
                  value={destinationId}
                  onChange={setDestinationId}
                  placeholder="Search destination..."
                />
              </div>
            </div>
          </div>

          {/* Section 2: Vehicle & Line Classification */}
          <div className="p-3 rounded-xl bg-[#EEF1F6]/50 border border-[#E5E7EB] space-y-3">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="space-y-1">
                <Label className="text-xs font-bold text-[#3E3C3D]">Vehicle Class</Label>
                <TaxonomySelect
                  category="VEHICLE_CLASS"
                  value={vehicleClass}
                  onValueChange={setVehicleClass}
                  placeholder="e.g. 10 TON"
                />
              </div>

              <div className="space-y-1">
                <Label className="text-xs font-bold text-[#3E3C3D]">Operation Type</Label>
                <TaxonomySelect
                  category="OPERATION_TYPE"
                  value={billingType}
                  onValueChange={setBillingType}
                  placeholder="e.g. Extra (Spot)"
                />
              </div>

              <div className="space-y-1">
                <Label className="text-xs font-bold text-[#3E3C3D]">Line Type</Label>
                <TaxonomySelect
                  category="LINE_TYPE"
                  value={lineType}
                  onValueChange={setLineType}
                  placeholder="e.g. Single Trip"
                />
              </div>
            </div>
          </div>

          {/* Section 3: Commercial Rates & Driver Charge */}
          <div className="p-3 rounded-xl bg-white border border-[#E5E7EB] shadow-2xs space-y-3">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {/* Billing Rate */}
              <div className="space-y-1">
                <Label className="text-xs font-bold text-[#3E3C3D] flex items-center gap-1.5">
                  <Banknote className="h-3.5 w-3.5 text-emerald-600" />
                  {billingType?.toLowerCase().includes('monthly') ? 'Billing Rate / Month *' : 'Billing Rate / Trip *'}
                </Label>
                <Input
                  type="number"
                  step="0.01"
                  value={price}
                  onChange={(e) => setPrice(e.target.value)}
                  placeholder={billingType?.toLowerCase().includes('monthly') ? 'e.g. 1750' : 'e.g. 530'}
                  className="h-8.5 text-xs bg-white font-mono font-bold text-[#3E3C3D]"
                />
              </div>

              {/* Driver Charge */}
              <div className="space-y-1">
                <Label className="text-xs font-bold text-[#3E3C3D] flex items-center gap-1.5">
                  <Banknote className="h-3.5 w-3.5 text-rose-600" /> Driver Charge / Trip
                </Label>
                <Input
                  type="number"
                  step="0.01"
                  value={driverPayout}
                  onChange={(e) => setDriverPayout(e.target.value)}
                  placeholder="e.g. 149"
                  className="h-8.5 text-xs bg-white font-mono font-bold text-[#3E3C3D]"
                />
              </div>

              {/* Currency */}
              <div className="space-y-1">
                <Label className="text-xs font-bold text-[#3E3C3D]">Currency</Label>
                <Select value={currency} onValueChange={setCurrency}>
                  <SelectTrigger className="h-8.5 text-xs font-semibold bg-white border-[#E5E7EB]">
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

            {/* Validity Period */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2 border-t border-[#E5E7EB]">
              <div className="space-y-1">
                <Label className="text-xs font-bold text-[#3E3C3D] flex items-center gap-1.5">
                  <Calendar className="h-3.5 w-3.5 text-[#6E6E80]" /> Valid From (Optional)
                </Label>
                <Input
                  type="date"
                  value={validFrom}
                  onChange={(e) => setValidFrom(e.target.value)}
                  className="h-8.5 text-xs bg-white"
                />
              </div>

              <div className="space-y-1">
                <Label className="text-xs font-bold text-[#3E3C3D] flex items-center gap-1.5">
                  <Calendar className="h-3.5 w-3.5 text-[#6E6E80]" /> Valid To (Optional)
                </Label>
                <Input
                  type="date"
                  value={validTo}
                  onChange={(e) => setValidTo(e.target.value)}
                  className="h-8.5 text-xs bg-white"
                />
              </div>
            </div>

            {isEditing && (
              <div className="space-y-1 pt-1 border-t border-[#E5E7EB]">
                <Label className="text-xs font-bold text-amber-700">
                  Reason for Adjustment
                </Label>
                <Input
                  value={changeReason}
                  onChange={(e) => setChangeReason(e.target.value)}
                  placeholder="Audit reason (e.g. Annual rate renewal)"
                  className="h-8 text-xs bg-amber-50/50 border-amber-200"
                />
              </div>
            )}
          </div>

          {error && (
            <div className="p-2.5 bg-rose-50 text-rose-700 text-xs rounded-xl border border-rose-200 font-semibold flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-rose-600 animate-pulse shrink-0" />
              <span>{error}</span>
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <DialogFooter className="pt-2 border-t border-[#E5E7EB] gap-2">
          <Button
            type="button"
            variant="outline"
            onClick={onClose}
            className="h-8.5 text-xs font-semibold rounded-xl border-[#E5E7EB]"
          >
            Cancel
          </Button>
          <Button
            type="button"
            onClick={handleSubmit}
            disabled={saveMutation.isPending}
            className="h-8.5 text-xs font-bold rounded-xl bg-[#FA634E] hover:bg-[#e0533e] text-white shadow-2xs gap-1.5"
          >
            {saveMutation.isPending ? (
              <>
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
                Saving...
              </>
            ) : (
              <>
                <CheckCircle2 className="h-3.5 w-3.5" />
                {isEditing ? 'Update Quotation' : 'Save Quotation'}
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export const RateCardFormDialog = QuotationFormDialog;
