import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Tag,
  Plus,
  Trash2,
  Edit2,
  Building2,
  Loader2,
  Layers,
} from 'lucide-react';
import { toast } from 'sonner';

import { surchargeRuleService, SurchargeRule } from '@/services/rateCardService';
import SurchargeRuleFormDialog from '@/components/quotations/SurchargeRuleFormDialog';
import ConfirmModal from '@/components/ui/ConfirmModal';

interface CustomerSurchargesSectionProps {
  customerId: string;
  customerName?: string;
}

export function CustomerSurchargesSection({
  customerId,
  customerName,
}: CustomerSurchargesSectionProps) {
  const queryClient = useQueryClient();
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [editTarget, setEditTarget] = useState<SurchargeRule | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<SurchargeRule | null>(null);

  // Fetch surcharge rules locked to this customer
  const { data: rules = [], isLoading } = useQuery({
    queryKey: ['surcharge-rules', 'customer', customerId],
    queryFn: () => surchargeRuleService.list({ customerId }),
    enabled: !!customerId,
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => surchargeRuleService.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['surcharge-rules'] });
      toast.success('Surcharge fee deleted successfully.');
      setDeleteTarget(null);
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.error?.message || err.message || 'Failed to delete fee.');
    },
  });

  return (
    <div className="flex-1 flex flex-col min-h-[460px] bg-white dark:bg-slate-900">
      {/* Action Sub-Header Bar */}
      <div className="p-4 py-3 border-b border-slate-100 dark:border-slate-800 bg-slate-50/40 dark:bg-slate-800/20 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <div className="p-1.5 rounded-lg bg-amber-500/10 text-amber-600 dark:text-amber-400">
            <Tag className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-xs font-black uppercase tracking-wider text-[#3E3C3D] dark:text-slate-100">
              Standing Surcharge Rules ({rules.length})
            </h3>
            <p className="text-[11px] text-slate-400 font-medium">
              Standing commercial surcharge rates (demurrage, waiting, extra stops, labor) for {customerName || 'this customer'}.
            </p>
          </div>
        </div>

        <Button
          size="sm"
          onClick={() => {
            setEditTarget(null);
            setIsAddDialogOpen(true);
          }}
          className="h-8 px-3.5 text-xs font-bold bg-[#FA634E] hover:bg-[#DF4834] text-white rounded-lg border-0 shadow-2xs cursor-pointer transition-all"
        >
          <Plus size={14} className="mr-1 stroke-[2.5]" /> Add Surcharge Fee
        </Button>
      </div>

      {/* Surcharge Rules Ledger Table */}
      <div className="flex-1 overflow-x-auto p-4">
        {isLoading ? (
          <div className="py-20 flex flex-col items-center justify-center gap-2 text-slate-400">
            <Loader2 className="w-6 h-6 animate-spin text-[#FA634E]" />
            <span className="text-xs font-medium">Loading customer standing surcharges...</span>
          </div>
        ) : rules.length === 0 ? (
          <div className="py-20 text-center flex flex-col items-center justify-center gap-3 bg-slate-50/50 dark:bg-slate-800/20 rounded-xl border border-dashed border-slate-200 dark:border-slate-800 p-8 max-w-md mx-auto my-6">
            <Tag className="w-8 h-8 text-slate-300 dark:text-slate-600" />
            <div>
              <h3 className="text-sm font-bold text-slate-800 dark:text-slate-200">No Standing Surcharges Configured</h3>
              <p className="text-xs text-slate-400 mt-1">
                {customerName || 'This customer'} does not have any standing surcharge rules set up yet.
              </p>
            </div>
            <Button
              size="sm"
              variant="outline"
              onClick={() => setIsAddDialogOpen(true)}
              className="mt-1 h-8 px-4 text-xs font-bold rounded-lg border-slate-200"
            >
              <Plus size={13} className="mr-1.5 text-[#FA634E]" /> Add First Surcharge Rule
            </Button>
          </div>
        ) : (
          <div className="border border-slate-200/80 dark:border-slate-800 rounded-xl overflow-hidden shadow-2xs bg-white dark:bg-slate-900">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-slate-200/80 dark:border-slate-800 text-[10px] font-bold uppercase tracking-wider text-slate-400 bg-slate-50/60 dark:bg-slate-800/40">
                  <th className="py-3 px-4">Fee / Charge Type</th>
                  <th className="py-3 px-4">Applies To Scope</th>
                  <th className="py-3 px-4">Billing Unit</th>
                  <th className="py-3 px-4">Rate (SAR)</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800/80 font-medium">
                {rules.map((rule) => {
                  const rc = rule.rateCard as any;
                  const stops = rc?.stops || [];
                  const origin = stops[0]?.source_label || stops[0]?.location?.name || rc?.origin_name || rc?.route_origin;
                  const dest = stops[stops.length - 1]?.source_label || stops[stops.length - 1]?.location?.name || rc?.destination_name || rc?.route_destination;
                  const laneText = rc ? (origin && dest ? `${origin} → ${dest}` : rc.name || 'Specific lane') : 'Applies to all lanes';
                  const vehicleText = rule.vehicle_type ? ` · ${rule.vehicle_type}` : '';

                  return (
                    <tr
                      key={rule.id}
                      className="hover:bg-slate-50/80 dark:hover:bg-slate-800/40 transition-colors group"
                    >
                      {/* Charge Type */}
                      <td className="py-3.5 px-4 font-bold text-[#3E3C3D] dark:text-slate-100 text-xs">
                        {rule.charge_type}
                      </td>

                      {/* Scope & Vehicle */}
                      <td className="py-3.5 px-4 text-slate-500 dark:text-slate-400 text-xs">
                        <span>{laneText}</span>
                        {vehicleText && (
                          <span className="text-slate-400 dark:text-slate-500 font-normal">{vehicleText}</span>
                        )}
                      </td>

                      {/* Unit */}
                      <td className="py-3.5 px-4 whitespace-nowrap">
                        <span className="inline-block px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-[11px] font-semibold text-slate-600 dark:text-slate-300 font-mono">
                          {rule.unit || '—'}
                        </span>
                      </td>

                      {/* Rate */}
                      <td className="py-3.5 px-4 whitespace-nowrap">
                        <span className="font-mono font-black text-xs text-[#3E3C3D] dark:text-slate-100">
                          SAR {Number(rule.rate || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                        </span>
                      </td>

                      {/* Actions */}
                      <td className="py-3.5 px-4 text-right whitespace-nowrap">
                        <div className="flex items-center justify-end gap-1.5">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => {
                              setEditTarget(rule);
                              setIsAddDialogOpen(true);
                            }}
                            className="h-7 px-2.5 text-[11px] font-semibold text-slate-600 dark:text-slate-300 hover:text-slate-900 rounded-md"
                          >
                            <Edit2 className="w-3 h-3 mr-1 text-slate-400" /> Edit
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setDeleteTarget(rule)}
                            className="h-7 px-2.5 text-[11px] font-semibold text-rose-600 hover:text-rose-700 hover:bg-rose-50 dark:hover:bg-rose-950/30 rounded-md"
                          >
                            <Trash2 className="w-3 h-3 mr-1" /> Delete
                          </Button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Surcharge Add/Edit Form Dialog */}
      <SurchargeRuleFormDialog
        isOpen={isAddDialogOpen}
        onClose={() => {
          setIsAddDialogOpen(false);
          setEditTarget(null);
        }}
        rule={editTarget}
        lockedCustomerId={customerId}
        lockedCustomerName={customerName}
      />

      {/* Delete Confirmation Modal */}
      <ConfirmModal
        isOpen={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        onConfirm={() => deleteTarget && deleteMutation.mutate(deleteTarget.id)}
        isLoading={deleteMutation.isPending}
        title="Delete Surcharge Fee"
        message={`Are you sure you want to delete "${deleteTarget?.charge_type}"?`}
        confirmLabel="Delete Fee"
        isDestructive
      />
    </div>
  );
}
