import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Save, ArrowLeft, ArrowRight, Info, Building2, AlertTriangle, HelpCircle } from 'lucide-react';

import DashboardLayout from '@/components/layout/DashboardLayout';
import LocationCombobox from '@/components/rate-cards/LocationCombobox';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { rateCardService, VEHICLE_TYPES, RATE_CATEGORIES } from '@/services/rateCardService';
import { customerService } from '@/services/customerService';
import { RateCategoryVehicleTypeForm } from '@/components/rate-cards';

export default function EditRateCardPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const [customerId, setCustomerId] = useState('');
  const [originId, setOriginId] = useState('');
  const [destinationId, setDestinationId] = useState('');
  const [basePrice, setBasePrice] = useState('');
  const [currency, setCurrency] = useState('SAR');
  const [name, setName] = useState('');
  const [vehicleType, setVehicleType] = useState('');
  const [rateCategory, setRateCategory] = useState('');
  const [billingType, setBillingType] = useState('');
  const [isActive, setIsActive] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const { data: rateCard, isLoading: isFetching } = useQuery({
    queryKey: ['rate-card', id],
    queryFn: () => rateCardService.getById(id!),
    enabled: !!id,
  });

  useEffect(() => {
    if (!rateCard) return;
    setCustomerId(rateCard.customerId || '');
    setOriginId(rateCard.originLocationId || '');
    setDestinationId(rateCard.destinationLocationId || '');
    setBasePrice(rateCard.base_price?.toString() || '');
    setCurrency(rateCard.currency || 'SAR');
    setName(rateCard.name || '');
    setVehicleType(rateCard.vehicle_type || '');
    setRateCategory(rateCard.rate_category || '');
    setBillingType(rateCard.billing_type || '');
    setIsActive(rateCard.is_active);
  }, [rateCard]);

  const { data: customersResponse } = useQuery({
    queryKey: ['customers-select'],
    queryFn: () => customerService.getAll({ per_page: 100 , mode: 'lookup' }),
  });
  const customers = customersResponse?.data || [];

  const numericPrice = parseFloat(basePrice || '');
  const hasPrice = !isNaN(numericPrice) && numericPrice > 0;
  const laneComplete = !!originId && !!destinationId;
  const isFormValid = laneComplete && hasPrice && !!customerId;

  const needsLaneLink = !!rateCard && (!rateCard.originLocationId || !rateCard.destinationLocationId);

  const updateMutation = useMutation({
    mutationFn: () =>
      rateCardService.update(id!, {
        name: name.trim() || undefined,
        customerId,
        origin_location_id: originId,
        destination_location_id: destinationId,
        base_price: numericPrice,
        currency,
        is_active: isActive,
        vehicle_type: vehicleType || null,
        rate_category: rateCategory || null,
        billing_type: billingType || null,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['rate-cards'] });
      queryClient.invalidateQueries({ queryKey: ['rate-card', id] });
      navigate('/rate-cards');
    },
    onError: (err: any) => {
      setError(err.response?.data?.error?.message || err.message || 'Failed to update rate card');
    },
  });

  const handleSubmit = (e?: React.FormEvent) => {
    e?.preventDefault();
    setError(null);
    if (!customerId) return setError('Choose which customer this rate is for.');
    if (!laneComplete) return setError('Pick both an origin and a destination.');
    if (!hasPrice) return setError('Enter a price greater than 0.');
    updateMutation.mutate();
  };

  return (
    <DashboardLayout active="RateCards" title="Edit Rate Card">
      <div className="px-3 sm:px-5 pb-10 space-y-6 animate-fade-in w-full max-w-[1350px] mx-auto">
        
        {/* ── 1. Top Bar Header & Action Strip ─────────────────────────────── */}
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3 pb-3 border-b border-slate-200/80 dark:border-slate-800">
          <div className="flex flex-wrap items-center gap-2.5 min-w-0">
             <div className="flex items-center gap-2 min-w-0 flex-wrap">
               <h1 className="text-lg sm:text-xl font-extrabold text-slate-900 dark:text-slate-100 tracking-tight truncate">
                 Edit Rate Card
               </h1>
             </div>
          </div>
          
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => navigate('/rate-cards')}
              className="text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-100 text-xs font-semibold h-9 rounded-xl cursor-pointer"
              disabled={updateMutation.isPending}
              type="button"
            >
              Cancel
            </Button>
            <Button
              size="sm"
              onClick={() => handleSubmit()}
              className="h-9 gap-1.5 text-xs bg-brand hover:bg-brand-hover text-white font-bold shadow-xs rounded-xl px-4 cursor-pointer"
              disabled={!isFormValid || updateMutation.isPending}
              type="button"
            >
              <Save className="w-3.5 h-3.5" /> Save Changes
            </Button>
          </div>
        </div>

        {isFetching ? (
          <div className="py-20 flex justify-center">
            <div className="w-6 h-6 border-2 border-brand border-t-transparent rounded-full animate-spin" />
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            
            {/* Left Area (lg:col-span-2 space-y-6) */}
            <div className="lg:col-span-2 space-y-6">
              
              {needsLaneLink && (
                <div className="rounded-xl border border-amber-200 bg-amber-50 dark:bg-amber-950/30 dark:border-amber-800 p-4 text-xs">
                  <p className="font-bold text-amber-900 dark:text-amber-200 flex items-center gap-1.5">
                    <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
                    This rate isn't linked to a lane yet
                  </p>
                  <p className="text-amber-800/80 dark:text-amber-300/80 mt-1 pl-5.5">
                    It was created when origin and destination were free text
                    {rateCard?.route_origin ? ` ("${rateCard.route_origin} → ${rateCard.route_destination}")` : ''}, so
                    trips never pick it up automatically. Choose both places below and save to link them.
                  </p>
                </div>
              )}

              {/* Card 1: Lane Routes */}
              <Card className="shadow-xs border-slate-200 dark:border-slate-800 rounded-xl">
                <CardHeader className="border-b border-slate-100 dark:border-slate-800/80 pb-4">
                  <CardTitle className="text-sm font-bold text-slate-900 dark:text-slate-100">Lane Route</CardTitle>
                  <CardDescription className="text-xs">
                    Define the precise origin and destination locations for this pricing rule.
                  </CardDescription>
                </CardHeader>
                <CardContent className="pt-5 space-y-4">
                  <div className="space-y-1.5">
                    <Label className="text-xs font-semibold text-slate-700 dark:text-slate-300">Route Coordinates</Label>
                    <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
                      <div className="flex-1 min-w-0">
                        <LocationCombobox
                          value={originId}
                          onChange={(locId) => { setOriginId(locId); setError(null); }}
                          placeholder="From Origin Location..."
                        />
                      </div>
                      <div className="flex items-center justify-center shrink-0">
                        <ArrowRight className="w-4 h-4 text-brand rotate-90 sm:rotate-0" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <LocationCombobox
                          value={destinationId}
                          onChange={(locId) => { setDestinationId(locId); setError(null); }}
                          placeholder="To Destination Location..."
                        />
                      </div>
                    </div>
                    <div className="flex items-start gap-2 bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-800/50 rounded-xl p-3 mt-2 text-[11px] text-slate-500 dark:text-slate-400">
                      <Info className="w-3.5 h-3.5 shrink-0 text-slate-400 mt-0.5" />
                      <p className="leading-normal">
                        Type a name in the dropdown to add a location that isn't listed. Using the same place on both ends is fine for within-city local deliveries.
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Card 2: Pricing & Parameters */}
              <Card className="shadow-xs border-slate-200 dark:border-slate-800 rounded-xl">
                <CardContent className="pt-5 space-y-4">
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <div className="sm:col-span-2 space-y-1.5">
                      <Label htmlFor="base_price" className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                        {billingType?.toLowerCase().includes('monthly')
                          ? 'Monthly Contract Value'
                          : 'Price per trip'}
                      </Label>
                      <div className="relative">
                        <span className="absolute left-3 top-2.5 text-xs font-bold text-slate-400 font-mono">{currency}</span>
                        <Input
                          id="base_price"
                          type="number"
                          step="0.01"
                          min="0"
                          value={basePrice}
                          onChange={(e) => setBasePrice(e.target.value)}
                          className="h-10 text-xs pl-12 font-mono font-bold rounded-xl"
                        />
                      </div>
                      {billingType?.toLowerCase().includes('monthly') && !isNaN(numericPrice) && numericPrice > 0 && (
                        <p className="text-[10px] text-indigo-600 dark:text-indigo-400 font-semibold">
                          ÷ 30 days = <span className="font-mono font-bold">{currency} {(numericPrice / 30).toFixed(2)}</span> per trip auto-filled on trip creation
                        </p>
                      )}
                      {!billingType?.toLowerCase().includes('monthly') && (
                        <p className="text-[10px] text-slate-400 font-medium">Used directly as per-trip billing amount</p>
                      )}
                    </div>

                    <div className="space-y-1.5">
                      <Label htmlFor="currency" className="text-xs font-semibold text-slate-700 dark:text-slate-300">Currency</Label>
                      <Select value={currency} onValueChange={setCurrency}>
                        <SelectTrigger id="currency" className="h-10 text-xs rounded-xl">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent className="rounded-xl">
                          <SelectItem value="SAR">SAR — Saudi Riyal</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  <RateCategoryVehicleTypeForm
                    vehicleType={vehicleType}
                    onVehicleTypeChange={setVehicleType}
                    rateCategory={rateCategory}
                    onRateCategoryChange={setRateCategory}
                    billingType={billingType}
                    onBillingTypeChange={setBillingType}
                  />

                  <div className="space-y-1.5">
                    <Label htmlFor="name" className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                      Custom Label <span className="font-normal text-slate-400">(optional)</span>
                    </Label>
                    <Input
                      id="name"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      placeholder="Defaults to the lane name"
                      className="h-10 text-xs rounded-xl"
                    />
                  </div>
                </CardContent>
              </Card>

            </div>

            {/* Right Area (lg:col-span-1 space-y-6) */}
            <div className="space-y-6">
              
              {/* Card 3: Account & Status */}
              <Card className="shadow-xs border-slate-200 dark:border-slate-800 rounded-xl">
                <CardHeader className="border-b border-slate-100 dark:border-slate-800/80 pb-4">
                  <CardTitle className="text-sm font-bold text-slate-900 dark:text-slate-100">Configuration</CardTitle>
                  <CardDescription className="text-xs">
                    Assign this rate card to a customer billing account and toggle its status.
                  </CardDescription>
                </CardHeader>
                <CardContent className="pt-5 space-y-5">
                  <div className="space-y-1.5">
                    <Label className="text-xs font-semibold text-slate-700 dark:text-slate-300">Customer Account</Label>
                    <Select value={customerId} onValueChange={setCustomerId}>
                      <SelectTrigger className="h-10 text-xs rounded-xl">
                        <SelectValue placeholder="Choose customer..." />
                      </SelectTrigger>
                      <SelectContent className="rounded-xl">
                        {customers.map((c) => (
                          <SelectItem key={c.id} value={c.id}>
                            {c.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="flex items-center justify-between border-t border-slate-100 dark:border-slate-800/80 pt-4">
                    <div className="space-y-0.5">
                      <Label className="text-xs font-semibold text-slate-900 dark:text-slate-100">Rate Card Status</Label>
                      <p className="text-[10.5px] text-slate-400">Inactive rates are never applied to trips.</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => setIsActive((v) => !v)}
                        className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none cursor-pointer ${isActive ? 'bg-emerald-500' : 'bg-slate-200 dark:bg-slate-800'}`}
                      >
                        <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${isActive ? 'translate-x-6' : 'translate-x-1'}`} />
                      </button>
                      <Badge className={isActive ? 'bg-emerald-50 text-emerald-700 border-emerald-200 font-semibold' : 'bg-slate-100 text-slate-600 border-slate-200 font-semibold'}>
                        {isActive ? 'Active' : 'Inactive'}
                      </Badge>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Information / Help Box */}
              <Card className="bg-indigo-50/50 dark:bg-indigo-950/20 border-indigo-100 dark:border-indigo-950 rounded-xl">
                <CardContent className="p-5 flex gap-3">
                  <HelpCircle className="w-5 h-5 text-indigo-500 shrink-0 mt-0.5" />
                  <div className="space-y-1">
                    <h5 className="text-xs font-bold text-indigo-950 dark:text-indigo-300">How do rate cards match trips?</h5>
                    <p className="text-[11px] leading-relaxed text-indigo-900/80 dark:text-indigo-400/80">
                      When a new trip is loaded or created, MERCON automatically searches for an active rate card matching the trip's **Customer**, **Origin**, and **Destination**. If matching vehicle types or rate categories are set, those filters apply as well.
                    </p>
                  </div>
                </CardContent>
              </Card>

            </div>

            {error && (
              <div className="col-span-1 lg:col-span-3 p-4 bg-destructive/10 text-destructive dark:text-rose-400 rounded-xl text-sm font-semibold border border-destructive/20">
                {error}
              </div>
            )}
          </form>
        )}
      </div>
    </DashboardLayout>
  );
}
