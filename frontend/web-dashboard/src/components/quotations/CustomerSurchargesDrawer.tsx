import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Tag,
  Plus,
  Trash2,
  Edit2,
  Building2,
  Loader2,
} from 'lucide-react';
import { toast } from 'sonner';

import { surchargeRuleService, SurchargeRule } from '@/services/rateCardService';
import SurchargeRuleFormDialog from '@/components/quotations/SurchargeRuleFormDialog';
import ConfirmModal from '@/components/ui/ConfirmModal';

interface CustomerSurchargesDrawerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  customerId: string | null;
  customerName?: string;
}

export function CustomerSurchargesDrawer({
  open,
  onOpenChange,
  customerId,
  customerName,
}: CustomerSurchargesDrawerProps) {
  const queryClient = useQueryClient();
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [editTarget, setEditTarget] = useState<SurchargeRule | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<SurchargeRule | null>(null);

  // Fetch surcharge rules locked to this customer
  const { data: rules = [], isLoading } = useQuery({
    queryKey: ['surcharge-rules', 'customer', customerId],
    queryFn: () => surchargeRuleService.list({ customerId: customerId || undefined }),
    enabled: open && !!customerId,
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => surchargeRuleService.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['surcharge-rules'] });
      toast.success('Surcharge fee deleted.');
      setDeleteTarget(null);
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.error?.message || err.message || 'Failed to delete fee.');
    },
  });

  if (!customerId) return null;

  return (
    <>
      <Sheet open={open} onOpenChange={onOpenChange}>
        <SheetContent
          side="right"
          className="w-full sm:max-w-md md:max-w-lg p-0 flex flex-col bg-white dark:bg-slate-900 border-l border-slate-200 dark:border-slate-800 shadow-2xl z-[9999]"
        >
          {/* Header */}
          <SheetHeader className="p-5 pb-4 border-b border-slate-100 dark:border-slate-800 space-y-1 bg-slate-50/50 dark:bg-slate-800/30 pr-12">
            <div className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-wider text-slate-400">
              <span>Customer Surcharge Rules</span>
              <span className="text-slate-300 dark:text-slate-700">•</span>
              <span className="font-mono text-slate-600 dark:text-slate-300 font-bold">{rules.length} {rules.length === 1 ? 'Rule' : 'Rules'}</span>
            </div>

            <div className="flex items-center justify-between gap-3 pt-0.5">
              <SheetTitle className="text-base font-black text-[#3E3C3D] dark:text-slate-100 tracking-tight flex items-center gap-2 truncate">
                <Building2 className="w-4 h-4 text-[#FA634E] shrink-0" />
                <span className="truncate">{customerName || 'Customer Surcharges'}</span>
              </SheetTitle>

              <Button
                size="sm"
                onClick={() => {
                  setEditTarget(null);
                  setIsAddDialogOpen(true);
                }}
                className="h-8 px-3 text-xs font-bold bg-[#FA634E] hover:bg-[#DF4834] text-white rounded-lg border-0 shadow-2xs shrink-0 cursor-pointer"
              >
                <Plus size={13} className="mr-1 stroke-[2.5]" /> Add Fee
              </Button>
            </div>
          </SheetHeader>

          {/* Minimalist Data Table */}
          <div className="flex-1 overflow-y-auto p-4">
            {isLoading ? (
              <div className="py-16 flex flex-col items-center justify-center gap-2 text-slate-400">
                <Loader2 className="w-5 h-5 animate-spin text-[#FA634E]" />
                <span className="text-xs font-medium">Loading surcharge rules...</span>
              </div>
            ) : rules.length === 0 ? (
              <div className="py-16 text-center flex flex-col items-center justify-center gap-2.5 bg-slate-50/50 dark:bg-slate-800/20 rounded-xl border border-dashed border-slate-200 dark:border-slate-800 p-6">
                <Tag className="w-6 h-6 text-slate-300 dark:text-slate-600" />
                <div>
                  <h3 className="text-xs font-bold text-slate-800 dark:text-slate-200">No Surcharge Rules</h3>
                  <p className="text-[11px] text-slate-400 max-w-xs mt-0.5">
                    No standing surcharge rates configured for {customerName || 'this customer'}.
                  </p>
                </div>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => setIsAddDialogOpen(true)}
                  className="mt-1 h-7 text-xs font-bold rounded-lg border-slate-200"
                >
                  <Plus size={12} className="mr-1 text-[#FA634E]" /> Add First Rule
                </Button>
              </div>
            ) : (
              <div className="border border-slate-200/80 dark:border-slate-800 rounded-xl overflow-hidden shadow-2xs bg-white dark:bg-slate-900">
                <table className="w-full text-left text-xs">
                  <thead>
                    <tr className="border-b border-slate-200/80 dark:border-slate-800 text-[10px] font-bold uppercase tracking-wider text-slate-400 bg-slate-50/60 dark:bg-slate-800/40">
                      <th className="py-2.5 px-3.5">Fee / Charge Type</th>
                      <th className="py-2.5 px-3.5">Unit</th>
                      <th className="py-2.5 px-3.5 text-right">Rate</th>
                      <th className="py-2.5 px-2 w-16 text-right"></th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800/80">
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
                          {/* Fee Name & Scope */}
                          <td className="py-3 px-3.5 max-w-[220px]">
                            <div className="font-bold text-[#3E3C3D] dark:text-slate-100 text-xs leading-snug">
                              {rule.charge_type}
                            </div>
                            <div className="text-[10px] text-slate-400 font-medium truncate mt-0.5">
                              {laneText}{vehicleText}
                            </div>
                          </td>

                          {/* Unit */}
                          <td className="py-3 px-3.5 whitespace-nowrap">
                            <span className="inline-block px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-[10px] font-medium text-slate-600 dark:text-slate-300 font-mono">
                              {rule.unit || '—'}
                            </span>
                          </td>

                          {/* Rate */}
                          <td className="py-3 px-3.5 text-right whitespace-nowrap">
                            <span className="font-mono font-black text-xs text-[#3E3C3D] dark:text-slate-100">
                              SAR {Number(rule.rate || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                            </span>
                          </td>

                          {/* Actions */}
                          <td className="py-3 px-2 text-right whitespace-nowrap">
                            <div className="flex items-center justify-end gap-1 opacity-80 group-hover:opacity-100 transition-opacity">
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => {
                                  setEditTarget(rule);
                                  setIsAddDialogOpen(true);
                                }}
                                className="h-7 w-7 text-slate-400 hover:text-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg"
                                title="Edit rule"
                              >
                                <Edit2 className="w-3.5 h-3.5" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => setDeleteTarget(rule)}
                                className="h-7 w-7 text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 rounded-lg"
                                title="Delete rule"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
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
        </SheetContent>
      </Sheet>

      {/* Surcharge Add/Edit Modal */}
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
    </>
  );
}
