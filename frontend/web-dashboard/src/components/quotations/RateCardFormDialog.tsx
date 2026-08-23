import { useEffect, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { ArrowRight, Building2, Loader2, Receipt, MapPin, Banknote, Tag, Sparkles, Calendar, FileText } from 'lucide-react';

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
  const [currency, setCurrency] = useState('SAR');
  const [name, setName] = useState('');
  
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

  const [changeReason, setChangeReason] = useState('');
  const [error, setError] = useState<string | null>(null);

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
      setCurrency(quotation.currency || 'SAR');
      setName(quotation.name || '');
      setVehicleClass(quotation.vehicle_class || '');
      setSourceVehicleLabel(quotation.source_vehicle_label || quotation.vehicle_type || '');
      setLineType(quotation.line_type || quotation.rate_category || '');
      setBillingType(quotation.billing_type || '');
      setPricingBasis(quotation.pricing_basis || 'UNSPECIFIED');
      setValidFrom(quotation.valid_from ? quotation.valid_from.substring(0, 10) : '');
      setValidTo(quotation.valid_to ? quotation.valid_to.substring(0, 10) : '');
      setSourceType(quotation.source_type || 'MANUAL');
      setSourceReference(quotation.source_reference || '');
    } else {
      setCustomerId(lockedCustomerId || '');
      setOriginId(defaultOriginLocationId || '');
      setDestinationId(defaultDestinationLocationId || '');
      setPrice(defaultPrice || '');
      setCurrency('SAR');
      setName('');
      setVehicleClass('');
      setSourceVehicleLabel('');
      setLineType('SINGLE_TRIP');
      setBillingType('EXTRA');
      setPricingBasis('UNSPECIFIED');
      setValidFrom('');
      setValidTo('');
      setSourceType('MANUAL');
      setSourceReference('');
    }
  }, [isOpen, quotation, lockedCustomerId, defaultOriginLocationId, defaultDestinationLocationId, defaultPrice]);

  const numericPrice = parseFloat(price || '');
  const effectiveCustomerId = lockedCustomerId || customerId;

  const saveMutation = useMutation({
    mutationFn: async () => {
      const payload = {
        name: name.trim() || undefined,
        rate: numericPrice,
        base_price: numericPrice,
        currency,
        customerId: effectiveCustomerId,
        origin_location_id: originId || null,
        destination_location_id: destinationId || null,
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
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-indigo-50 text-indigo-600 border border-indigo-200">
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
            <Badge className="bg-indigo-50 text-indigo-700 hover:bg-indigo-50 border-indigo-200/60 font-semibold text-[10px] uppercase tracking-wider px-2 py-0.5">
              Quotation Module
            </Badge>
          </div>
        </DialogHeader>

        <div className="space-y-4 py-2">
          {/* Customer & Lane Section */}
          <div className="space-y-3 p-3.5 bg-slate-50/60 dark:bg-slate-800/40 rounded-xl border border-slate-100 dark:border-slate-800/80">
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
              <Select value={vehicleClass} onValueChange={setVehicleClass}>
                <SelectTrigger className="h-9 text-xs bg-white dark:bg-slate-900 border-slate-200">
                  <SelectValue placeholder="Select class (e.g. 10 TON)" />
                </SelectTrigger>
                <SelectContent className="z-[9999]">
                  <SelectItem value="3-4 TON">3-4 TON / DYNA</SelectItem>
                  <SelectItem value="5 TON">5 TON</SelectItem>
                  <SelectItem value="10 TON">10 TON / LORRY</SelectItem>
                  <SelectItem value="20 TON">20 TON</SelectItem>
                  <SelectItem value="40 FEET">40 FEET / FLATBED</SelectItem>
                </SelectContent>
              </Select>
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
              <Select value={lineType} onValueChange={setLineType}>
                <SelectTrigger className="h-9 text-xs bg-white dark:bg-slate-900 border-slate-200">
                  <SelectValue placeholder="Select line type" />
                </SelectTrigger>
                <SelectContent className="z-[9999]">
                  <SelectItem value="SINGLE_TRIP">Single Trip</SelectItem>
                  <SelectItem value="ROUND_TRIP">Round Trip</SelectItem>
                  <SelectItem value="10_HRS">10 Hrs Duty</SelectItem>
                  <SelectItem value="12_HRS">12 Hrs Duty</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-slate-700 dark:text-slate-300">Billing Type</Label>
              <Select value={billingType} onValueChange={setBillingType}>
                <SelectTrigger className="h-9 text-xs bg-white dark:bg-slate-900 border-slate-200">
                  <SelectValue placeholder="Select billing type" />
                </SelectTrigger>
                <SelectContent className="z-[9999]">
                  <SelectItem value="MONTHLY">Monthly</SelectItem>
                  <SelectItem value="EXTRA">Extra</SelectItem>
                </SelectContent>
              </Select>
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

          {/* Rate & Currency */}
          <div className="p-3.5 bg-slate-50/60 dark:bg-slate-800/40 rounded-xl border border-slate-100 dark:border-slate-800/80 space-y-3">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                  <Banknote className="h-3.5 w-3.5 text-emerald-600" /> Commercial Rate *
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
            className="h-9 text-xs bg-indigo-600 hover:bg-indigo-700 text-white font-semibold rounded-xl px-5 shadow-sm"
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
