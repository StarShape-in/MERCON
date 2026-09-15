import { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Plus, Edit2, Trash2, Calendar, MapPin, Tag, ShieldCheck } from 'lucide-react';
import { thirdPartyService, ProviderRateCard, CreateProviderRateCardPayload } from '@/services/thirdPartyService';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import DataTable, { Column } from '@/components/ui/DataTable';
import StatusBadge from '@/components/ui/StatusBadge';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';

interface ProviderRatesTabProps {
  providerId: string;
  providerName: string;
}

const VEHICLE_CLASSES = ['3-4 TON', '5 TON', '10 TON', '20 TON', '40 FEET'];
const LINE_TYPES = ['Single Trip', 'Round Trip', '10 Hours Duty', '12 Hours Duty'];
const PRICING_BASES = ['Per Trip', 'Per Month'];

export default function ProviderRatesTab({ providerId, providerName }: ProviderRatesTabProps) {
  const queryClient = useQueryClient();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingRate, setEditingRate] = useState<ProviderRateCard | null>(null);

  // Form State
  const [originCity, setOriginCity] = useState('');
  const [destinationCity, setDestinationCity] = useState('');
  const [vehicleClass, setVehicleClass] = useState('10 TON');
  const [lineType, setLineType] = useState('Single Trip');
  const [operationType, setOperationType] = useState<string>('any');
  const [pricingBasis, setPricingBasis] = useState('Per Trip');
  const [cost, setCost] = useState('');
  const [validFrom, setValidFrom] = useState('');
  const [validTo, setValidTo] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Fetch Provider Rate Cards
  const { data: rates = [], isLoading } = useQuery({
    queryKey: ['provider-rates', providerId],
    queryFn: () => thirdPartyService.getRates(providerId),
    enabled: !!providerId,
  });

  const handleOpenAdd = () => {
    setEditingRate(null);
    setOriginCity('');
    setDestinationCity('');
    setVehicleClass('10 TON');
    setLineType('Single Trip');
    setOperationType('any');
    setPricingBasis('Per Trip');
    setCost('');
    setValidFrom('');
    setValidTo('');
    setIsModalOpen(true);
  };

  const handleOpenEdit = (rate: ProviderRateCard) => {
    setEditingRate(rate);
    setOriginCity(rate.origin_city);
    setDestinationCity(rate.destination_city);
    setVehicleClass(rate.vehicle_class);
    setLineType(rate.line_type);
    setOperationType(rate.operation_type || 'any');
    setPricingBasis(rate.pricing_basis || 'Per Trip');
    setCost(String(rate.cost));
    setValidFrom(rate.valid_from ? rate.valid_from.split('T')[0] : '');
    setValidTo(rate.valid_to ? rate.valid_to.split('T')[0] : '');
    setIsModalOpen(true);
  };

  const handleArchive = async (id: string) => {
    if (!confirm('Are you sure you want to archive this rate card?')) return;
    try {
      await thirdPartyService.deleteRate(id);
      toast.success('Rate card archived');
      queryClient.invalidateQueries({ queryKey: ['provider-rates', providerId] });
    } catch (err: any) {
      toast.error(err?.message || 'Failed to archive rate card');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!originCity.trim() || !destinationCity.trim()) {
      toast.error('Origin and Destination cities are required');
      return;
    }
    const costNum = parseFloat(cost);
    if (isNaN(costNum) || costNum < 0) {
      toast.error('Please enter a valid non-negative cost');
      return;
    }

    setIsSubmitting(true);
    try {
      const payload: CreateProviderRateCardPayload = {
        providerId,
        origin_city: originCity.trim(),
        destination_city: destinationCity.trim(),
        vehicle_class: vehicleClass,
        line_type: lineType,
        operation_type: operationType === 'any' ? null : operationType,
        pricing_basis: pricingBasis,
        cost: costNum,
        valid_from: validFrom || null,
        valid_to: validTo || null,
        status: 'active',
      };

      if (editingRate) {
        await thirdPartyService.updateRate(editingRate.id, payload);
        toast.success('Provider rate card updated');
      } else {
        await thirdPartyService.createRate(providerId, payload);
        toast.success('Provider rate card created');
      }

      setIsModalOpen(false);
      queryClient.invalidateQueries({ queryKey: ['provider-rates', providerId] });
    } catch (err: any) {
      toast.error(err?.response?.data?.error?.message || err?.message || 'Failed to save rate card');
    } finally {
      setIsSubmitting(false);
    }
  };

  const columns: Column<ProviderRateCard>[] = [
    {
      header: 'Route Corridor',
      accessor: (row) => (
        <div className="flex flex-col">
          <span className="font-bold text-xs text-slate-900 dark:text-slate-100 flex items-center gap-1.5">
            <MapPin className="w-3.5 h-3.5 text-brand shrink-0" />
            {row.origin_city} &rarr; {row.destination_city}
          </span>
          {row.originLocation || row.destinationLocation ? (
            <span className="text-[10px] text-slate-400 font-mono">
              Specific Facility Linked
            </span>
          ) : null}
        </div>
      ),
    },
    {
      header: 'Vehicle & Duty',
      accessor: (row) => (
        <div className="flex items-center gap-1.5 flex-wrap">
          <Badge variant="outline" className="text-[10px] font-bold font-mono">
            {row.vehicle_class}
          </Badge>
          <Badge variant="secondary" className="text-[10px] font-bold">
            {row.line_type}
          </Badge>
        </div>
      ),
    },
    {
      header: 'Context & Basis',
      accessor: (row) => (
        <div className="flex flex-col">
          <span className="text-xs font-semibold text-slate-800 dark:text-slate-200">
            {row.operation_type ? row.operation_type : 'Universal (Extra & Monthly)'}
          </span>
          <span className="text-[10px] font-mono text-purple-600 dark:text-purple-400 font-bold">
            {row.pricing_basis || 'Per Trip'}
          </span>
        </div>
      ),
    },
    {
      header: 'Baseline Cost',
      accessor: (row) => (
        <div className="flex flex-col">
          <span className="font-mono text-xs font-extrabold text-slate-900 dark:text-slate-100">
            SAR {Number(row.cost).toLocaleString(undefined, { minimumFractionDigits: 2 })}
          </span>
          <span className="text-[10px] text-slate-400 font-sans">
            {row.pricing_basis === 'Per Month' ? 'per month' : 'per trip'}
          </span>
        </div>
      ),
    },
    {
      header: 'Status',
      accessor: (row) => <StatusBadge status={row.status} />,
    },
    {
      header: 'Actions',
      accessor: (row) => (
        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="sm"
            className="h-7 w-7 p-0 text-slate-500 hover:text-brand"
            onClick={() => handleOpenEdit(row)}
            title="Edit Rate"
          >
            <Edit2 className="w-3.5 h-3.5" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            className="h-7 w-7 p-0 text-slate-500 hover:text-rose-600"
            onClick={() => handleArchive(row.id)}
            title="Archive Rate"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </Button>
        </div>
      ),
    },
  ];

  return (
    <Card className="border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900 rounded-2xl shadow-sm overflow-hidden w-full">
      <CardHeader className="pb-3 border-b border-slate-100 dark:border-slate-800 flex flex-row items-center justify-between">
        <div>
          <CardTitle className="text-sm font-bold flex items-center gap-2 text-slate-900 dark:text-slate-100">
            <Tag className="w-4 h-4 text-purple-600" /> Negotiated Provider Rate Cards
          </CardTitle>
          <p className="text-xs text-slate-500">
            Baseline carrier costs for {providerName}. Auto-matched when dispatching 3PL trips.
          </p>
        </div>
        <Button onClick={handleOpenAdd} size="sm" className="bg-brand text-white font-bold text-xs gap-1.5 h-8">
          <Plus className="w-3.5 h-3.5" /> Add Provider Rate
        </Button>
      </CardHeader>
      <CardContent className="pt-4">
        {isLoading ? (
          <div className="py-8 text-center text-xs text-slate-400">Loading provider rates...</div>
        ) : (
          <DataTable
            columns={columns}
            data={rates}
            emptyTitle="No Provider Rates Configured"
            emptyMessage={`No baseline rate cards have been set up for ${providerName} yet.`}
          />
        )}
      </CardContent>

      {/* Modal Dialog for Add / Edit Rate Card */}
      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-base font-bold flex items-center gap-2">
              <Tag className="w-4 h-4 text-brand" />
              {editingRate ? 'Edit Provider Rate Card' : 'New Provider Rate Card'}
            </DialogTitle>
          </DialogHeader>

          <form onSubmit={handleSubmit} className="space-y-4 py-2">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs font-bold">Origin City *</Label>
                <Input
                  value={originCity}
                  onChange={(e) => setOriginCity(e.target.value)}
                  placeholder="e.g. Riyadh"
                  required
                  className="h-9 text-xs"
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs font-bold">Destination City *</Label>
                <Input
                  value={destinationCity}
                  onChange={(e) => setDestinationCity(e.target.value)}
                  placeholder="e.g. Dammam"
                  required
                  className="h-9 text-xs"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs font-bold">Vehicle Class *</Label>
                <Select value={vehicleClass} onValueChange={setVehicleClass}>
                  <SelectTrigger className="h-9 text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {VEHICLE_CLASSES.map((vc) => (
                      <SelectItem key={vc} value={vc} className="text-xs">
                        {vc}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-bold">Line / Duty Type *</Label>
                <Select value={lineType} onValueChange={setLineType}>
                  <SelectTrigger className="h-9 text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {LINE_TYPES.map((lt) => (
                      <SelectItem key={lt} value={lt} className="text-xs">
                        {lt}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs font-bold">Operation Context</Label>
                <Select value={operationType} onValueChange={setOperationType}>
                  <SelectTrigger className="h-9 text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="any" className="text-xs">Universal (Both)</SelectItem>
                    <SelectItem value="Extra" className="text-xs">Extra / Spot Trip</SelectItem>
                    <SelectItem value="Monthly" className="text-xs">Monthly Contract</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-bold">Pricing Basis *</Label>
                <Select value={pricingBasis} onValueChange={setPricingBasis}>
                  <SelectTrigger className="h-9 text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {PRICING_BASES.map((pb) => (
                      <SelectItem key={pb} value={pb} className="text-xs">
                        {pb}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-bold">Subcontract Cost (SAR) *</Label>
              <Input
                type="number"
                step="0.01"
                min="0"
                value={cost}
                onChange={(e) => setCost(e.target.value)}
                placeholder="e.g. 1350.00"
                required
                className="h-9 text-xs font-mono font-bold"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs font-medium text-slate-500">Valid From (Optional)</Label>
                <Input
                  type="date"
                  value={validFrom}
                  onChange={(e) => setValidFrom(e.target.value)}
                  className="h-9 text-xs"
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs font-medium text-slate-500">Valid Until (Optional)</Label>
                <Input
                  type="date"
                  value={validTo}
                  onChange={(e) => setValidTo(e.target.value)}
                  className="h-9 text-xs"
                />
              </div>
            </div>

            <DialogFooter className="pt-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => setIsModalOpen(false)}
                className="h-9 text-xs font-semibold"
              >
                Cancel
              </Button>
              <Button type="submit" disabled={isSubmitting} className="h-9 text-xs font-bold bg-brand text-white">
                {isSubmitting ? 'Saving...' : editingRate ? 'Update Rate' : 'Create Rate Card'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </Card>
  );
}
