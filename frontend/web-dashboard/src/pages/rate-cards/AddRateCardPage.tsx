import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import {
  CreditCard,
  Building2,
  MapPin,
  ArrowRight,
  RotateCcw,
  Save,
  Tag,
  AlertCircle,
  Banknote,
  Truck,
  CheckCircle2,
} from 'lucide-react';

import DashboardLayout from '@/components/layout/DashboardLayout';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import LocationCombobox from '@/components/rate-cards/LocationCombobox';
import { RateCategoryVehicleTypeForm } from '@/components/rate-cards';
import { rateCardService, RateCard } from '@/services/rateCardService';
import { customerService } from '@/services/customerService';
import { locationService } from '@/services/locationService';

export default function AddRateCardPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const queryClient = useQueryClient();

  const lockedCustomerId = searchParams.get('customer_id') || '';
  const lockedCustomerName = searchParams.get('customer_name') || '';
  const defaultOriginId = searchParams.get('origin_id') || '';
  const defaultDestId = searchParams.get('dest_id') || '';

  const [customerId, setCustomerId] = useState(lockedCustomerId);
  const [originId, setOriginId] = useState(defaultOriginId);
  const [destinationId, setDestinationId] = useState(defaultDestId);
  const [price, setPrice] = useState('');
  const [defaultTripCharge, setDefaultTripCharge] = useState('');
  const [currency, setCurrency] = useState('SAR');
  const [name, setName] = useState('');
  const [vehicleType, setVehicleType] = useState('');
  const [rateCategory, setRateCategory] = useState('');
  const [billingType, setBillingType] = useState('');
  const [error, setError] = useState<string | null>(null);

  // Fetch customers for selector
  const { data: customersRes } = useQuery({
    queryKey: ['customers-select'],
    queryFn: () => customerService.getAll({ per_page: 200 , mode: 'lookup' }),
    enabled: !lockedCustomerId,
  });
  const customers = customersRes?.data || [];

  // Fetch locations for preview lookup
  const { data: locationsRes } = useQuery({
    queryKey: ['locations-all'],
    queryFn: () => locationService.getAll(),
  });
  const locations = locationsRes?.data || [];

  const originLocation = locations.find((l) => l.id === originId);
  const destinationLocation = locations.find((l) => l.id === destinationId);
  const selectedCustomer = customers.find((c) => c.id === customerId);

  const numericPrice = parseFloat(price || '');
  const effectiveCustomerId = lockedCustomerId || customerId;
  const isFormValid =
    !!effectiveCustomerId &&
    !!originId &&
    !!destinationId &&
    !isNaN(numericPrice) &&
    numericPrice > 0;

  const handleReset = () => {
    setCustomerId(lockedCustomerId);
    setOriginId(defaultOriginId);
    setDestinationId(defaultDestId);
    setPrice('');
    setDefaultTripCharge('');
    setCurrency('SAR');
    setName('');
    setVehicleType('');
    setRateCategory('');
    setBillingType('');
    setError(null);
    toast.info('Form reset to default values');
  };

  const createMutation = useMutation({
    mutationFn: async () => {
      const payload = {
        name: name.trim() || undefined,
        base_price: numericPrice,
        currency,
        customerId: effectiveCustomerId,
        origin_location_id: originId,
        destination_location_id: destinationId,
        vehicle_type: vehicleType || null,
        rate_category: rateCategory || null,
        billing_type: billingType || null,
        default_trip_charge: defaultTripCharge.trim() ? Number(defaultTripCharge) : null,
      };
      return rateCardService.create(payload);
    },
    onSuccess: (saved) => {
      queryClient.invalidateQueries({ queryKey: ['rate-cards'] });
      queryClient.invalidateQueries({ queryKey: ['rate-card-lookup'] });
      toast.success(`Rate card ${saved.name || 'entry'} created successfully`);
      if (lockedCustomerId) {
        navigate(`/customers/${lockedCustomerId}`);
      } else {
        navigate(`/rate-cards/${saved.id}`);
      }
    },
    onError: (err: any) => {
      const msg = err.response?.data?.error?.message || err.message || 'Could not save the rate card.';
      setError(msg);
      toast.error(msg);
    },
  });

  const handleSubmit = (e?: React.FormEvent) => {
    e?.preventDefault();
    setError(null);

    if (!effectiveCustomerId) return setError('Please select a customer for this rate card.');
    if (!originId || !destinationId) return setError('Please select both an origin and destination location.');
    if (isNaN(numericPrice) || numericPrice <= 0) return setError('Base price must be greater than 0.');

    createMutation.mutate();
  };

  // Completion calculation
  const completionFields = [
    { label: 'Customer', filled: !!effectiveCustomerId },
    { label: 'Origin Location', filled: !!originId },
    { label: 'Destination Location', filled: !!destinationId },
    { label: 'Base Price', filled: !isNaN(numericPrice) && numericPrice > 0 },
  ];
  const filledCount = completionFields.filter(f => f.filled).length;
  const completionPct = Math.round((filledCount / completionFields.length) * 100);

  return (
    <DashboardLayout active="RateCards" title="New Rate Card">
      <div className="px-3 sm:px-5 pb-4 space-y-3 animate-fade-in max-w-[1350px] mx-auto">
        
        {/* Slim Top Action Strip */}
        <div className="flex items-center justify-between gap-3 pb-2 border-b border-slate-200 dark:border-slate-800">
          <div className="flex items-center gap-2">
            <Badge className="bg-emerald-100 text-emerald-800 dark:bg-emerald-950/50 dark:text-emerald-400 font-bold border-none text-[11px] px-2 py-0.5">
              <CreditCard className="w-3 h-3 mr-1 inline text-emerald-600" /> New Rate Card
            </Badge>
          </div>

          <div className="flex items-center gap-1.5">
            <Button 
              variant="outline" 
              size="sm" 
              onClick={() => navigate(-1)}
              className="h-7 text-xs font-medium border-slate-200 dark:border-slate-800 px-2.5"
            >
              Cancel
            </Button>
            <Button 
              size="sm" 
              onClick={handleSubmit}
              disabled={createMutation.isPending || !isFormValid}
              className="h-7 text-xs bg-brand hover:bg-brand-hover text-white font-bold px-3 shadow-xs"
            >
              {createMutation.isPending ? 'Saving...' : 'Save Rate Card'}
            </Button>
          </div>
        </div>

        {/* 2-Column High-Density Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 items-start">
          
          {/* Main Form Column (8 cols) */}
          <div className="lg:col-span-8 space-y-3">
            <Card className="border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 rounded-xl shadow-2xs">
              <CardContent className="p-3.5 sm:p-4 space-y-3.5">

                {/* Section 1: Rate Card Label & Customer */}
                <div className="space-y-2.5">
                  <div className="flex items-center justify-between pb-1 border-b border-slate-100 dark:border-slate-800">
                    <h2 className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                      <Building2 className="w-3.5 h-3.5 text-brand" /> Customer & Rate Card Identity
                    </h2>
                    <span className="text-[10px] text-slate-400 font-mono">* Required fields</span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                    <div className="space-y-1">
                      <Label htmlFor="customerId" className="text-[11px] font-semibold text-slate-700 dark:text-slate-300">
                        Target Customer <span className="text-rose-500">*</span>
                      </Label>
                      {lockedCustomerId ? (
                        <div className="flex h-8 items-center gap-2 rounded-md border border-slate-200 bg-slate-50 px-3 text-xs font-semibold text-slate-800 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200">
                          <Building2 className="h-3.5 w-3.5 text-brand shrink-0" />
                          <span className="truncate">{lockedCustomerName || 'Selected Customer'}</span>
                        </div>
                      ) : (
                        <Select value={customerId} onValueChange={setCustomerId}>
                          <SelectTrigger id="customerId" className="h-8 text-xs">
                            <SelectValue placeholder="Select customer..." />
                          </SelectTrigger>
                          <SelectContent>
                            {customers.map((c) => (
                              <SelectItem key={c.id} value={c.id} className="text-xs font-medium">
                                {c.name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      )}
                    </div>

                    <div className="space-y-1">
                      <Label htmlFor="name" className="text-[11px] font-semibold text-slate-700 dark:text-slate-300">
                        Rate Card Label / Title (Optional)
                      </Label>
                      <Input
                        id="name"
                        placeholder="e.g. Dammam -> Riyadh Flatbed Rate"
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        className="h-8 text-xs font-medium"
                      />
                    </div>
                  </div>
                </div>

                {/* Section 2: Shipping Route Lane */}
                <div className="space-y-2 pt-2 border-t border-slate-100 dark:border-slate-800">
                  <div className="flex items-center justify-between">
                    <h2 className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                      <MapPin className="w-3.5 h-3.5 text-emerald-500" /> Shipping Route Lane
                    </h2>
                    <span className="text-[10px] text-slate-400 font-medium">Origin to Destination</span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                    <div className="space-y-1">
                      <Label className="text-[11px] font-semibold text-slate-700 dark:text-slate-300">
                        Origin Location <span className="text-rose-500">*</span>
                      </Label>
                      <LocationCombobox
                        value={originId}
                        onChange={setOriginId}
                        placeholder="Select origin..."
                        excludeLocationId={destinationId}
                      />
                    </div>

                    <div className="space-y-1">
                      <Label className="text-[11px] font-semibold text-slate-700 dark:text-slate-300">
                        Destination Location <span className="text-rose-500">*</span>
                      </Label>
                      <LocationCombobox
                        value={destinationId}
                        onChange={setDestinationId}
                        placeholder="Select destination..."
                        excludeLocationId={originId}
                      />
                    </div>
                  </div>
                </div>

                {/* Section 3: Rate Category & Vehicle Specs */}
                <div className="space-y-2 pt-2 border-t border-slate-100 dark:border-slate-800">


                  <RateCategoryVehicleTypeForm
                    vehicleType={vehicleType}
                    onVehicleTypeChange={setVehicleType}
                    rateCategory={rateCategory}
                    onRateCategoryChange={setRateCategory}
                    billingType={billingType}
                    onBillingTypeChange={setBillingType}
                  />
                </div>

                {/* Section 4: Pricing & Financials */}
                <div className="space-y-2 pt-2 border-t border-slate-100 dark:border-slate-800">
                  <div className="flex items-center justify-between">
                    <h2 className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                      <Banknote className="w-3.5 h-3.5 text-emerald-600" /> Commercial Pricing & Allowances
                    </h2>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                    <div className="space-y-1">
                      <Label htmlFor="price" className="text-[11px] font-semibold text-slate-700 dark:text-slate-300">
                        Base Agreed Price <span className="text-rose-500">*</span>
                      </Label>
                      <div className="relative">
                        <span className="absolute left-2.5 top-1.5 font-mono text-xs font-bold text-slate-400">SAR</span>
                        <Input
                          id="price"
                          type="number"
                          min="0"
                          step="0.01"
                          placeholder="0.00"
                          value={price}
                          onChange={(e) => setPrice(e.target.value)}
                          className="h-8 pl-12 text-xs font-mono font-semibold"
                        />
                      </div>
                    </div>

                    <div className="space-y-1">
                      <Label htmlFor="defaultTripCharge" className="text-[11px] font-semibold text-slate-700 dark:text-slate-300">
                        Default Trip Surcharge / Allowance (Optional)
                      </Label>
                      <div className="relative">
                        <span className="absolute left-2.5 top-1.5 font-mono text-xs font-bold text-slate-400">SAR</span>
                        <Input
                          id="defaultTripCharge"
                          type="number"
                          min="0"
                          step="0.01"
                          placeholder="0.00"
                          value={defaultTripCharge}
                          onChange={(e) => setDefaultTripCharge(e.target.value)}
                          className="h-8 pl-12 text-xs font-mono font-semibold"
                        />
                      </div>
                    </div>
                  </div>
                </div>

              </CardContent>
            </Card>

            {error && (
              <div className="p-2.5 bg-rose-50 text-rose-700 dark:bg-rose-950/40 dark:text-rose-300 rounded-lg text-xs font-semibold border border-rose-200 dark:border-rose-800 flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{error}</span>
              </div>
            )}
          </div>

          {/* Right Sidebar Column (4 cols) */}
          <div className="lg:col-span-4 space-y-3 sticky top-2">
            <Card className="border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 rounded-xl p-3.5 space-y-3 shadow-2xs">
              <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-2">
                <span className="text-xs font-bold text-slate-800 dark:text-slate-200">Rate Summary</span>
                <Badge variant="outline" className="text-[10px] font-mono text-brand border-orange-200">
                  {completionPct}% Complete
                </Badge>
              </div>

              <div className="space-y-2.5">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 dark:bg-emerald-950/40 flex items-center justify-center font-bold text-xs shrink-0 border border-emerald-200 dark:border-emerald-900/50">
                    <CreditCard className="w-5 h-5" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-xs font-bold text-slate-900 dark:text-slate-100 truncate">
                      {name || 'New Rate Card'}
                    </p>
                    <span className="text-[10px] text-slate-500 block truncate">
                      {lockedCustomerName || selectedCustomer?.name || 'No customer selected'}
                    </span>
                  </div>
                </div>

                {/* Shipping Lane */}
                <div className="space-y-1 pt-1.5 border-t border-slate-100 dark:border-slate-800">
                  <span className="text-[9px] text-slate-400 uppercase font-bold block">Shipping Lane</span>
                  <div className="flex items-center gap-1.5 text-xs font-medium text-slate-800 dark:text-slate-200">
                    <span className="truncate max-w-[100px]">{originLocation?.name || 'Origin'}</span>
                    <ArrowRight className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                    <span className="truncate max-w-[100px]">{destinationLocation?.name || 'Destination'}</span>
                  </div>
                </div>

                {/* Classification */}
                <div className="space-y-1 pt-1.5 border-t border-slate-100 dark:border-slate-800">
                  <span className="text-[9px] text-slate-400 uppercase font-bold block">Vehicle & Category</span>
                  <p className="text-[11px] font-medium text-slate-800 dark:text-slate-200 truncate">
                    {vehicleType || 'All Vehicle Types'} • {rateCategory || 'Standard'}
                  </p>
                </div>

                {/* Financial Summary */}
                <div className="space-y-1 pt-1.5 border-t border-slate-100 dark:border-slate-800">
                  <span className="text-[9px] text-slate-400 uppercase font-bold block">Base Agreed Price</span>
                  <p className="text-sm font-bold font-mono text-emerald-600 dark:text-emerald-400">
                    SAR {(numericPrice || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </p>
                </div>
              </div>

              {/* Progress Bar */}
              <div className="pt-2 border-t border-slate-100 dark:border-slate-800 space-y-1">
                <div className="flex justify-between text-[10px] font-semibold text-slate-500">
                  <span>Requirements</span>
                  <span>{filledCount} of {completionFields.length}</span>
                </div>
                <div className="w-full bg-slate-100 dark:bg-slate-800 h-1.5 rounded-full overflow-hidden">
                  <div 
                    className="bg-brand h-full transition-all duration-300 rounded-full"
                    style={{ width: `${completionPct}%` }}
                  />
                </div>
              </div>

              <Button 
                size="sm" 
                onClick={handleSubmit} 
                disabled={createMutation.isPending || !isFormValid}
                className="w-full h-8 text-xs bg-brand hover:bg-brand-hover text-white font-bold shadow-xs mt-1"
              >
                {createMutation.isPending ? 'Saving...' : 'Save Rate Card'}
              </Button>
            </Card>
          </div>

        </div>
      </div>
    </DashboardLayout>
  );
}
