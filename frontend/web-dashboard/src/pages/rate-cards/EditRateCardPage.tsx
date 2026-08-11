import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Save, ArrowLeft, ArrowRight, Info } from 'lucide-react';

import DashboardLayout from '@/components/layout/DashboardLayout';
import FormSection from '@/components/ui/FormSection';
import Btn from '@/components/ui/Btn';
import LocationCombobox from '@/components/rate-cards/LocationCombobox';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { rateCardService } from '@/services/rateCardService';
import { customerService } from '@/services/customerService';

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
    setIsActive(rateCard.is_active);
  }, [rateCard]);

  const { data: customersResponse } = useQuery({
    queryKey: ['customers-select'],
    queryFn: () => customerService.getAll({ per_page: 100 }),
  });
  const customers = customersResponse?.data || [];

  const numericPrice = parseFloat(basePrice || '');
  const hasPrice = !isNaN(numericPrice) && numericPrice > 0;
  const laneComplete = !!originId && !!destinationId && originId !== destinationId;
  const isFormValid = laneComplete && hasPrice && !!customerId;

  // Cards created before lanes existed have text endpoints but no location
  // links, so their rate never matches on a trip. Say so rather than letting
  // them look fine.
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
    if (!laneComplete) return setError('Pick both an origin and a destination — they must be different places.');
    if (!hasPrice) return setError('Enter a price greater than 0.');
    updateMutation.mutate();
  };

  return (
    <DashboardLayout
      active="RateCards"
      title="Edit Rate Card"
      breadcrumb="Rate Cards"
      pageTitle={rateCard ? rateCard.name : 'Edit Rate Card'}
      actions={
        <div className="flex gap-2">
          <Btn label="Cancel" variant="ghost" onClick={() => navigate('/rate-cards')} disabled={updateMutation.isPending} shortcut={{ key: 'Escape' }} />
          <Btn label="Save Changes" icon={<Save size={14} />} onClick={() => handleSubmit()} isLoading={updateMutation.isPending} disabled={!isFormValid} shortcut={{ key: 'Enter', metaOrControl: true }} />
        </div>
      }
    >
      <div className="mx-auto w-full max-w-4xl px-6 pb-6">
        <button
          onClick={() => navigate('/rate-cards')}
          className="flex items-center gap-2 text-sm font-semibold text-muted-foreground hover:text-foreground transition-colors mb-6"
        >
          <ArrowLeft size={16} /> Back to Rate Cards
        </button>

        {isFetching ? (
          <div className="py-20 flex justify-center">
            <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-6">

            {needsLaneLink && (
              <div className="rounded-xl border border-amber-200 bg-amber-50 dark:bg-amber-950/30 dark:border-amber-800 p-4 text-xs">
                <p className="font-bold text-amber-900 dark:text-amber-200">This rate isn't linked to a lane yet</p>
                <p className="text-amber-800/80 dark:text-amber-300/80 mt-0.5">
                  It was created when origin and destination were free text
                  {rateCard?.route_origin ? ` ("${rateCard.route_origin} → ${rateCard.route_destination}")` : ''}, so
                  trips never pick it up. Choose both places below and save to fix it.
                </p>
              </div>
            )}

            <FormSection title="Customer" description="Every rate card belongs to exactly one customer.">
              <Select value={customerId} onValueChange={setCustomerId}>
                <SelectTrigger className="h-9 text-xs">
                  <SelectValue placeholder="Choose customer..." />
                </SelectTrigger>
                <SelectContent>
                  {customers.map((c) => (
                    <SelectItem key={c.id} value={c.id}>
                      {c.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </FormSection>

            <FormSection title="Lane & pricing" description="The origin and destination this price covers.">
              <div className="space-y-5">
                <div className="space-y-2">
                  <Label className="text-xs font-semibold">Lane</Label>
                  <div className="flex items-center gap-2">
                    <div className="flex-1 min-w-0">
                      <LocationCombobox
                        value={originId}
                        onChange={(locId) => { setOriginId(locId); setError(null); }}
                        placeholder="From..."
                        excludeLocationId={destinationId}
                      />
                    </div>
                    <ArrowRight className="w-4 h-4 shrink-0 text-[#E8450F]" />
                    <div className="flex-1 min-w-0">
                      <LocationCombobox
                        value={destinationId}
                        onChange={(locId) => { setDestinationId(locId); setError(null); }}
                        placeholder="To..."
                        excludeLocationId={originId}
                      />
                    </div>
                  </div>
                  <p className="text-[11px] text-muted-foreground flex items-center gap-1.5">
                    <Info className="w-3 h-3 shrink-0" />
                    Type a name in the dropdown to add a place that isn't listed.
                  </p>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div className="sm:col-span-2 space-y-1.5">
                    <Label htmlFor="base_price" className="text-xs font-semibold">Price per trip</Label>
                    <div className="relative">
                      <span className="absolute left-3 top-2 text-xs font-bold text-slate-400 font-mono">{currency}</span>
                      <Input
                        id="base_price"
                        type="number"
                        step="0.01"
                        min="0"
                        value={basePrice}
                        onChange={(e) => setBasePrice(e.target.value)}
                        className="h-9 text-xs pl-12 font-mono font-bold"
                      />
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <Label htmlFor="currency" className="text-xs font-semibold">Currency</Label>
                    <Select value={currency} onValueChange={setCurrency}>
                      <SelectTrigger id="currency" className="h-9 text-xs">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="SAR">SAR — Saudi Riyal</SelectItem>
                        <SelectItem value="USD">USD — US Dollar</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="name" className="text-xs font-semibold">
                    Label <span className="font-normal text-muted-foreground">(optional)</span>
                  </Label>
                  <Input
                    id="name"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Defaults to the lane name"
                    className="h-9 text-xs"
                  />
                </div>
              </div>
            </FormSection>

            <FormSection title="Status" description="An inactive rate is never applied to new trips.">
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={() => setIsActive((v) => !v)}
                  className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none ${isActive ? 'bg-primary' : 'bg-muted'}`}
                >
                  <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${isActive ? 'translate-x-6' : 'translate-x-1'}`} />
                </button>
                <span className="text-sm font-semibold text-foreground">{isActive ? 'Active' : 'Inactive'}</span>
              </div>
            </FormSection>

            {error && (
              <div className="p-4 bg-destructive/10 text-destructive rounded-lg text-sm font-semibold border border-destructive/20">
                {error}
              </div>
            )}
          </form>
        )}
      </div>
    </DashboardLayout>
  );
}
