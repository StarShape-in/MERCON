import { useState, useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { DollarSign, Clock, PlusCircle, CheckCircle, X } from 'lucide-react';
import { Trip, TripChargeInput, tripService } from '@/services/tripService';
import Btn from '@/components/ui/Btn';
import TripChargeLineEditor from '@/components/trips/TripChargeLineEditor';

interface PostTripSettlementModalProps {
  isOpen: boolean;
  onClose: () => void;
  trip: Trip | null;
  onSuccess: () => void;
}

const toChargeInput = (c: NonNullable<Trip['charges']>[number]): TripChargeInput => ({
  surchargeRuleId: c.surchargeRuleId,
  charge_type: c.charge_type,
  unit: c.unit,
  rate: c.rate,
  quantity: c.quantity,
  amount: c.amount,
});

export default function PostTripSettlementModal({
  isOpen,
  onClose,
  trip,
  onSuccess,
}: PostTripSettlementModalProps) {
  const queryClient = useQueryClient();
  const [hasExtraCharges, setHasExtraCharges] = useState<boolean | null>(null);
  const [charges, setCharges] = useState<TripChargeInput[]>([]);
  const [tripCharges, setTripCharges] = useState<string>('0');
  const [billingAmount, setBillingAmount] = useState<string>('');
  const [carrierName, setCarrierName] = useState<string>('MERCON LOGISTICS');
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (trip) {
      setCharges((trip.charges || []).map(toChargeInput));
      // Suggest the driver payout rather than leaving it blank: the lane's
      // agreed rate for MERCON's own driver, or the subcontractor cost
      // already on the trip when it's third-party. Only a suggestion — the
      // server applies the same fallback if this field is left as-is.
      const suggestedTripCharges = trip.is_third_party
        ? trip.third_party_cost
        : trip.rateCard?.default_trip_charge;
      setTripCharges(
        trip.trip_charges
          ? String(trip.trip_charges)
          : suggestedTripCharges
            ? String(suggestedTripCharges)
            : '0'
      );
      setBillingAmount(trip.billing_amount ? String(trip.billing_amount) : '');
      setCarrierName(trip.carrier_name || 'MERCON LOGISTICS');
      setHasExtraCharges(null);
      setError(null);
    }
  }, [trip]);

  if (!isOpen || !trip) return null;

  const handleSubmitNoCharges = async () => {
    setLoading(true);
    setError(null);
    try {
      await tripService.updateFinancials(trip.id, {
        charges: [],
        is_post_trip_settled: true,
      });
      queryClient.invalidateQueries({ queryKey: ['surcharge-rules'] });
      onSuccess();
      onClose();
    } catch (err: any) {
      setError(err?.response?.data?.error?.message || 'Failed to complete financial settlement.');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmitWithCharges = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      await tripService.updateFinancials(trip.id, {
        charges,
        trip_charges: parseFloat(tripCharges || '0'),
        billing_amount: billingAmount ? parseFloat(billingAmount) : undefined,
        carrier_name: carrierName,
        is_post_trip_settled: true,
      });
      queryClient.invalidateQueries({ queryKey: ['surcharge-rules'] });
      onSuccess();
      onClose();
    } catch (err: any) {
      setError(err?.response?.data?.error?.message || 'Failed to update financial charges.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-xs p-4 animate-fade-in">
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-black/10 dark:border-slate-800 shadow-2xl max-w-lg w-full overflow-hidden max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="px-6 py-4 border-b border-black/[0.06] dark:border-slate-800 flex items-center justify-between bg-slate-50 dark:bg-slate-800/60 shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-amber-500/10 text-brand flex items-center justify-center border border-amber-200 dark:border-amber-900/50">
              <DollarSign size={18} />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900 dark:text-slate-100">Additional Charges & Settlement</h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 font-mono">Trip #{trip.ref_id || trip.id.substring(0, 8)}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full flex items-center justify-center text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-200/50 dark:hover:bg-slate-800 transition-colors cursor-pointer"
          >
            <X size={16} />
          </button>
        </div>

        {/* Modal Content */}
        <div className="p-6 space-y-5 overflow-y-auto">
          {error && (
            <div className="p-3 bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-900/50 text-red-700 dark:text-red-400 text-xs rounded-xl font-medium">
              {error}
            </div>
          )}

          {/* Trip Summary Card */}
          <div className="p-3.5 bg-slate-50 dark:bg-slate-800/50 rounded-xl border border-slate-200/70 dark:border-slate-800 space-y-1.5 text-xs">
            <div className="flex justify-between">
              <span className="text-slate-500 dark:text-slate-400 font-medium">Customer:</span>
              <span className="font-semibold text-slate-900 dark:text-slate-100">{trip.customer?.name || '—'}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500 dark:text-slate-400 font-medium">Driver & Vehicle:</span>
              <span className="font-semibold text-slate-900 dark:text-slate-100">
                {trip.is_third_party
                  ? (trip.third_party_driver_name || trip.thirdPartyProvider?.name || '3PL Driver')
                  : (trip.driver ? `${trip.driver.first_name} ${trip.driver.last_name || ''}`.trim() : 'Unassigned Driver')} •{' '}
                {trip.vehicle?.plate_number || trip.third_party_vehicle_plate || 'No Vehicle'}
              </span>
            </div>
          </div>

          {/* Prompt Step */}
          {hasExtraCharges === null ? (
            <div className="space-y-4 text-center py-2">
              <div className="w-12 h-12 rounded-full bg-amber-50 dark:bg-amber-950/50 text-amber-600 dark:text-amber-400 border border-amber-200 dark:border-amber-900/50 flex items-center justify-center mx-auto">
                <Clock size={24} />
              </div>
              <div>
                <h4 className="text-sm font-bold text-slate-900 dark:text-slate-100">Were there any Waiting, Labour, or Extra Charges?</h4>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                  Confirm if driver recorded detention time, labour charges, waiting fees, or additional stop costs.
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
                <button
                  type="button"
                  onClick={handleSubmitNoCharges}
                  disabled={loading}
                  className="py-3 px-4 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 font-semibold text-xs transition-all shadow-xs flex flex-col items-center gap-1 cursor-pointer"
                >
                  <CheckCircle size={18} className="text-emerald-600 dark:text-emerald-400" />
                  <span>No Extra Charges</span>
                  <span className="text-[10px] text-slate-400 dark:text-slate-500 font-normal">Complete trip fully (SAR 0 extra)</span>
                </button>

                <button
                  type="button"
                  onClick={() => setHasExtraCharges(true)}
                  className="py-3 px-4 rounded-xl bg-brand hover:bg-brand-hover text-white font-semibold text-xs transition-all shadow-xs flex flex-col items-center gap-1 cursor-pointer"
                >
                  <PlusCircle size={18} />
                  <span>Yes, Select Charges</span>
                  <span className="text-[10px] text-white/80 font-normal">Add labour/waiting fees</span>
                </button>
              </div>
            </div>
          ) : (
            /* Input Form */
            <form onSubmit={handleSubmitWithCharges} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-2">Extra Charges Selection</label>
                <TripChargeLineEditor
                  customerId={trip.customer?.id}
                  rateCardId={trip.rateCardId}
                  value={charges}
                  onChange={setCharges}
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Trip Charges / Driver Payout (SAR)
                  </label>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={tripCharges}
                    onChange={(e) => setTripCharges(e.target.value)}
                    className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-2 text-sm font-semibold text-slate-900 dark:text-slate-100 outline-none focus:border-brand"
                    placeholder="0.00"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Base Billing Amount (SAR)
                  </label>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={billingAmount}
                    onChange={(e) => setBillingAmount(e.target.value)}
                    className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-2 text-sm font-semibold text-slate-900 dark:text-slate-100 outline-none focus:border-brand"
                    placeholder="Optional base price override"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Fleet Owner / Subcontractor
                </label>
                <input
                  type="text"
                  value={carrierName}
                  onChange={(e) => setCarrierName(e.target.value)}
                  className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-2 text-sm font-semibold text-slate-900 dark:text-slate-100 outline-none focus:border-brand"
                  placeholder="MERCON LOGISTICS or 3rd Party"
                />
              </div>

              <div className="flex items-center justify-between pt-3 border-t border-slate-100 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setHasExtraCharges(null)}
                  className="text-xs font-semibold text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 cursor-pointer"
                >
                  ← Back
                </button>
                <div className="flex gap-2">
                  <Btn label="Cancel" variant="secondary" onClick={onClose} size="sm" type="button" />
                  <Btn
                    label={loading ? 'Saving...' : 'Save & Complete Trip Settlement'}
                    variant="primary"
                    size="sm"
                    type="submit"
                    disabled={loading}
                  />
                </div>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
