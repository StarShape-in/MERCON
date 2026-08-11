import { useEffect, useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { ArrowRight, Building2, Check, Loader2, Search } from 'lucide-react';

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
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { rateCardService, RateCard, AssignRateCardResult } from '@/services/rateCardService';
import { customerService } from '@/services/customerService';
import { cn } from '@/lib/utils';
import { matchesSearch } from '@/lib/search';

interface AssignRateCardDialogProps {
  rateCard: RateCard | null;
  onClose: () => void;
}

/**
 * Copy one lane's price onto a set of customers as their own rate.
 *
 * Customers that already have their own price for this lane are shown but not
 * selectable — overwriting a negotiated rate silently is the one thing this
 * screen must never do. The API skips them too, so a stale list can't cause it.
 */
export default function AssignRateCardDialog({ rateCard, onClose }: AssignRateCardDialogProps) {
  const queryClient = useQueryClient();
  const [selected, setSelected] = useState<string[]>([]);
  const [search, setSearch] = useState('');
  const [result, setResult] = useState<AssignRateCardResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  const isOpen = !!rateCard;

  useEffect(() => {
    if (isOpen) {
      setSelected([]);
      setSearch('');
      setResult(null);
      setError(null);
    }
  }, [isOpen, rateCard?.id]);

  const { data: customersRes } = useQuery({
    queryKey: ['customers-select'],
    queryFn: () => customerService.getAll({ per_page: 100 }),
    enabled: isOpen,
  });

  // Who already has their own price for this exact lane.
  const { data: laneCardsRes } = useQuery({
    queryKey: ['rate-cards', 'lane', rateCard?.originLocationId, rateCard?.destinationLocationId],
    queryFn: () =>
      rateCardService.getAll({
        origin_location_id: rateCard!.originLocationId!,
        destination_location_id: rateCard!.destinationLocationId!,
      }),
    enabled: isOpen && !!rateCard?.originLocationId && !!rateCard?.destinationLocationId,
  });

  const alreadyPriced = useMemo(
    () => new Set((laneCardsRes?.data || []).map((c) => c.customerId).filter(Boolean) as string[]),
    [laneCardsRes]
  );

  const customers = (customersRes?.data || []).filter((c) =>
    matchesSearch(search, [c.name, c.contact_phone])
  );

  const assignMutation = useMutation({
    mutationFn: () => rateCardService.assignToCustomers(rateCard!.id, selected),
    onSuccess: (res) => {
      queryClient.invalidateQueries({ queryKey: ['rate-cards'] });
      setResult(res);
      setSelected([]);
    },
    onError: (err: any) => {
      setError(err.response?.data?.error?.message || err.message || 'Could not apply the rate.');
    },
  });

  const toggle = (id: string) =>
    setSelected((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-lg rounded-2xl">
        <DialogHeader>
          <DialogTitle className="text-base font-extrabold">Apply this rate to customers</DialogTitle>
          <DialogDescription className="text-xs">
            Each selected customer gets their own copy of this price. Changing the original later
            won't change theirs.
          </DialogDescription>
        </DialogHeader>

        {rateCard && (
          <div className="flex items-center justify-between gap-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/40 px-3 py-2.5">
            <div className="flex items-center gap-1.5 text-xs font-bold text-slate-800 dark:text-slate-200 min-w-0">
              <span className="truncate">{rateCard.route_origin}</span>
              <ArrowRight className="h-3.5 w-3.5 shrink-0 text-[#E8450F]" />
              <span className="truncate">{rateCard.route_destination}</span>
            </div>
            <span className="shrink-0 font-mono text-xs font-extrabold">
              {rateCard.currency || 'SAR'} {Number(rateCard.base_price).toLocaleString()}
            </span>
          </div>
        )}

        {result ? (
          <div className="space-y-2 py-2 text-xs">
            <div className="flex items-center gap-2 font-bold text-emerald-700">
              <Check className="h-4 w-4" />
              Applied to {result.created.length} customer{result.created.length === 1 ? '' : 's'}
            </div>
            {result.skipped.length > 0 && (
              <p className="text-muted-foreground">
                Left alone (they already price this lane):{' '}
                <span className="font-semibold text-slate-700 dark:text-slate-300">
                  {result.skipped.map((s) => s.customerName).join(', ')}
                </span>
              </p>
            )}
          </div>
        ) : (
          <div className="space-y-2">
            <div className="relative">
              <Search className="absolute left-3 top-2.5 h-3.5 w-3.5 text-slate-400" />
              <Input
                placeholder="Search customers..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="h-9 pl-8 text-xs"
              />
            </div>

            <div className="max-h-64 space-y-1 overflow-y-auto rounded-xl border border-slate-200 dark:border-slate-700 p-1.5">
              {customers.length === 0 ? (
                <p className="py-6 text-center text-xs text-muted-foreground">No customers found.</p>
              ) : (
                customers.map((customer) => {
                  const has = alreadyPriced.has(customer.id);
                  return (
                    <label
                      key={customer.id}
                      className={cn(
                        'flex items-center gap-2.5 rounded-lg px-2 py-1.5 text-xs transition-colors',
                        has
                          ? 'cursor-not-allowed opacity-60'
                          : 'cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-800/60'
                      )}
                    >
                      <Checkbox
                        checked={selected.includes(customer.id)}
                        disabled={has}
                        onCheckedChange={() => !has && toggle(customer.id)}
                      />
                      <Building2 className="h-3.5 w-3.5 shrink-0 text-slate-400" />
                      <span className="flex-1 truncate font-semibold">{customer.name}</span>
                      {has && (
                        <Badge variant="outline" className="shrink-0 text-[9px] font-bold uppercase">
                          Has own rate
                        </Badge>
                      )}
                    </label>
                  );
                })
              )}
            </div>

            {error && (
              <div className="rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-xs font-semibold text-rose-700">
                {error}
              </div>
            )}
          </div>
        )}

        <DialogFooter>
          <Button variant="outline" size="sm" onClick={onClose} className="h-9 text-xs">
            {result ? 'Done' : 'Cancel'}
          </Button>
          {!result && (
            <Button
              size="sm"
              onClick={() => assignMutation.mutate()}
              disabled={selected.length === 0 || assignMutation.isPending}
              className="h-9 gap-1.5 bg-[#E8450F] text-xs font-bold text-white hover:bg-[#d03d0c]"
            >
              {assignMutation.isPending && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
              Apply to {selected.length || ''} customer{selected.length === 1 ? '' : 's'}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
