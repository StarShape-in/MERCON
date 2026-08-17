import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Plus, Pencil, Trash2, Tag } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import ConfirmModal from '@/components/ui/ConfirmModal';
import SurchargeRuleFormDialog from '@/components/rate-cards/SurchargeRuleFormDialog';
import { surchargeRuleService, SurchargeRule } from '@/services/rateCardService';
import { customerService } from '@/services/customerService';

/**
 * A customer's standing fee schedule — waiting/labor, additional stops, and
 * whatever else a quotation names. Deliberately a separate, simpler view from
 * the lane-price table: a surcharge has no origin/destination of its own, so
 * forcing it through the lane table's columns would just leave most of them
 * blank.
 */
export default function SurchargeFeesPanel() {
  const queryClient = useQueryClient();
  const [customerFilter, setCustomerFilter] = useState<string>('all');
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [editTarget, setEditTarget] = useState<SurchargeRule | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<SurchargeRule | null>(null);

  const { data: customersRes } = useQuery({
    queryKey: ['customers-select'],
    queryFn: () => customerService.getAll({ per_page: 100 }),
  });
  const customers = customersRes?.data || [];

  const { data: rules = [], isLoading } = useQuery({
    queryKey: ['surcharge-rules', customerFilter],
    queryFn: () => surchargeRuleService.list(customerFilter !== 'all' ? { customerId: customerFilter } : undefined),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => surchargeRuleService.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['surcharge-rules'] });
      setDeleteTarget(null);
    },
  });

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Select value={customerFilter} onValueChange={setCustomerFilter}>
          <SelectTrigger className="h-9 w-56 text-xs">
            <SelectValue placeholder="All customers" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all" className="text-xs">All customers</SelectItem>
            {customers.map((c) => (
              <SelectItem key={c.id} value={c.id} className="text-xs">
                {c.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Button
          size="sm"
          onClick={() => setIsAddOpen(true)}
          className="h-9 gap-1.5 text-xs bg-brand hover:bg-brand-hover text-white font-bold shadow-xs rounded-md px-4"
        >
          <Plus className="w-4 h-4" /> Add Surcharge Fee
        </Button>
      </div>

      <div className="rounded-xl border border-slate-200 dark:border-slate-800 overflow-hidden">
        <table className="w-full text-xs">
          <thead className="bg-slate-50 dark:bg-slate-900/50 border-b border-slate-200 dark:border-slate-800">
            <tr>
              <th className="text-left px-4 py-2.5 font-bold text-slate-500">Customer</th>
              <th className="text-left px-4 py-2.5 font-bold text-slate-500">Charge Type</th>
              <th className="text-left px-4 py-2.5 font-bold text-slate-500">Applies To</th>
              <th className="text-left px-4 py-2.5 font-bold text-slate-500">Vehicle</th>
              <th className="text-right px-4 py-2.5 font-bold text-slate-500">Rate</th>
              <th className="text-center px-4 py-2.5 font-bold text-slate-500">Status</th>
              <th className="text-right px-4 py-2.5 font-bold text-slate-500">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
            {isLoading && (
              <tr>
                <td colSpan={7} className="px-4 py-8 text-center text-slate-400">Loading...</td>
              </tr>
            )}
            {!isLoading && rules.length === 0 && (
              <tr>
                <td colSpan={7} className="px-4 py-8 text-center text-slate-400">
                  No surcharge fees yet. Add one to start applying it at trip settlement.
                </td>
              </tr>
            )}
            {rules.map((rule) => (
              <tr key={rule.id} className="hover:bg-slate-50/60 dark:hover:bg-slate-900/40">
                <td className="px-4 py-2.5 font-semibold text-slate-800 dark:text-slate-200">{rule.customer?.name || '—'}</td>
                <td className="px-4 py-2.5">
                  <div className="flex items-center gap-1.5">
                    <Tag className="w-3 h-3 text-slate-400" />
                    <span className="font-semibold">{rule.charge_type}</span>
                    {rule.unit && <span className="text-slate-400">({rule.unit})</span>}
                  </div>
                </td>
                <td className="px-4 py-2.5 text-slate-600 dark:text-slate-400">
                  {rule.rateCard ? `${rule.rateCard.route_origin} → ${rule.rateCard.route_destination}` : 'Every lane'}
                </td>
                <td className="px-4 py-2.5 text-slate-600 dark:text-slate-400">{rule.vehicle_type || '—'}</td>
                <td className="px-4 py-2.5 text-right font-mono font-bold text-slate-800 dark:text-slate-200">
                  {rule.currency} {Number(rule.rate).toLocaleString()}
                </td>
                <td className="px-4 py-2.5 text-center">
                  <Badge className={rule.is_active ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-slate-100 text-slate-500 border-slate-200'}>
                    {rule.is_active ? 'Active' : 'Inactive'}
                  </Badge>
                </td>
                <td className="px-4 py-2.5">
                  <div className="flex items-center justify-end gap-1">
                    <button
                      onClick={() => setEditTarget(rule)}
                      className="w-7 h-7 rounded-md flex items-center justify-center text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                    >
                      <Pencil size={13} />
                    </button>
                    <button
                      onClick={() => setDeleteTarget(rule)}
                      className="w-7 h-7 rounded-md flex items-center justify-center text-red-500 hover:bg-red-50 dark:hover:bg-red-950/30 transition-colors"
                    >
                      <Trash2 size={13} />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <SurchargeRuleFormDialog isOpen={isAddOpen} onClose={() => setIsAddOpen(false)} />
      <SurchargeRuleFormDialog
        isOpen={!!editTarget}
        rule={editTarget}
        onClose={() => setEditTarget(null)}
      />

      <ConfirmModal
        isOpen={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        onConfirm={() => deleteTarget && deleteMutation.mutate(deleteTarget.id)}
        title="Delete surcharge fee"
        message={`Remove "${deleteTarget?.charge_type}" for ${deleteTarget?.customer?.name || 'this customer'}? Trips that already used it keep their own frozen amount.`}
        isDestructive
      />
    </div>
  );
}
