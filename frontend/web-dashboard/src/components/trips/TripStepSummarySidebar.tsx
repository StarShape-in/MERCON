import { format, parseISO, isValid } from 'date-fns';
import { User, Navigation, Clock, Truck, Receipt, Sparkles } from 'lucide-react';
import { Customer } from '@/services/customerService';
import { Driver } from '@/services/driverService';
import { Vehicle } from '@/services/vehicleService';
import { RateCard } from '@/services/rateCardService';
import { EstimatedDeliveryResult } from '@/hooks/useEstimatedDelivery';
import { cn } from '@/lib/utils';

interface TripStepSummarySidebarProps {
  currentStep: 1 | 2 | 3 | 4 | 5;
  onGoToStep: (step: 1 | 2 | 3 | 4) => void;
  selectedCustomer: Customer | null;
  pickupName: string;
  dropoffName: string;
  truckArrivalTime: string;
  estimatedDelivery: EstimatedDeliveryResult;
  isThirdParty: boolean;
  selectedDriver: Driver | null;
  selectedVehicle: Vehicle | null;
  assignDriverLater: boolean;
  assignVehicleLater: boolean;
  thirdPartyProviderName: string;
  billingAmount: string;
  matchedRateCard: RateCard | null;
}

function Row({
  icon,
  title,
  step,
  currentStep,
  onGoToStep,
  children,
}: {
  icon: React.ReactNode;
  title: string;
  step: 1 | 2 | 3 | 4;
  currentStep: 1 | 2 | 3 | 4 | 5;
  onGoToStep: (step: 1 | 2 | 3 | 4) => void;
  children: React.ReactNode;
}) {
  const isCurrent = currentStep === step;
  return (
    <button
      type="button"
      onClick={() => onGoToStep(step)}
      className={cn(
        'w-full text-left rounded-lg border px-2.5 py-2 transition-all cursor-pointer',
        isCurrent
          ? 'border-brand bg-orange-50/50 dark:bg-orange-950/20'
          : 'border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 hover:border-slate-300 dark:hover:border-slate-700'
      )}
    >
      <div className={cn('flex items-center gap-1.5 text-[10px] font-extrabold uppercase tracking-wider mb-0.5', isCurrent ? 'text-brand' : 'text-slate-400')}>
        {icon} {title}
      </div>
      <div className="text-xs text-slate-700 dark:text-slate-300 space-y-0.5">{children}</div>
    </button>
  );
}

function Placeholder({ text }: { text: string }) {
  return <span className="text-slate-400 dark:text-slate-600 italic">{text}</span>;
}

/**
 * Persistent "Trip So Far" rail shown alongside steps 1–4 — reads the exact
 * same canonical state as `TripStepReview`, so there is nothing to keep in
 * sync. Clicking a section jumps to that step via `onGoToStep` (same
 * `goToStep` the Review page's Edit links use).
 */
export default function TripStepSummarySidebar({
  currentStep,
  onGoToStep,
  selectedCustomer,
  pickupName,
  dropoffName,
  truckArrivalTime,
  estimatedDelivery,
  isThirdParty,
  selectedDriver,
  selectedVehicle,
  assignDriverLater,
  assignVehicleLater,
  thirdPartyProviderName,
  billingAmount,
  matchedRateCard,
}: TripStepSummarySidebarProps) {
  const truckArrivalDate = truckArrivalTime ? parseISO(truckArrivalTime) : null;
  const deliveryDate =
    estimatedDelivery.status === 'ready' && estimatedDelivery.estimatedDeliveryLocal
      ? parseISO(estimatedDelivery.estimatedDeliveryLocal)
      : null;
  const total = billingAmount && !isNaN(parseFloat(billingAmount)) ? parseFloat(billingAmount) : null;

  return (
    <div className="space-y-2">
      <div className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400 px-0.5">Trip So Far</div>

      <Row icon={<User className="w-3 h-3" />} title="Customer" step={1} currentStep={currentStep} onGoToStep={onGoToStep}>
        {selectedCustomer ? <span className="font-semibold">{selectedCustomer.name}</span> : <Placeholder text="Not selected" />}
      </Row>

      <Row icon={<Navigation className="w-3 h-3" />} title="Route" step={2} currentStep={currentStep} onGoToStep={onGoToStep}>
        {pickupName || dropoffName ? (
          <span className="truncate block">
            <span className="font-semibold">{pickupName || '—'}</span> → <span className="font-semibold">{dropoffName || '—'}</span>
          </span>
        ) : (
          <Placeholder text="Not set" />
        )}
      </Row>

      <Row icon={<Clock className="w-3 h-3" />} title="Timing" step={2} currentStep={currentStep} onGoToStep={onGoToStep}>
        {truckArrivalDate && isValid(truckArrivalDate) ? (
          <>
            <div>Arrival: <span className="font-semibold">{format(truckArrivalDate, 'MMM d, h:mm a')}</span></div>
            <div>
              Delivery:{' '}
              <span className="font-semibold">
                {deliveryDate && isValid(deliveryDate)
                  ? format(deliveryDate, 'MMM d, h:mm a')
                  : estimatedDelivery.status === 'loading'
                  ? 'Calculating...'
                  : estimatedDelivery.status === 'unavailable'
                  ? 'Unavailable'
                  : 'Pending'}
              </span>
            </div>
          </>
        ) : (
          <Placeholder text="Not set" />
        )}
      </Row>

      <Row icon={<Truck className="w-3 h-3" />} title="Assignment" step={3} currentStep={currentStep} onGoToStep={onGoToStep}>
        {isThirdParty ? (
          thirdPartyProviderName ? <span className="font-semibold">3PL: {thirdPartyProviderName}</span> : <Placeholder text="Not set" />
        ) : selectedDriver || selectedVehicle || assignDriverLater || assignVehicleLater ? (
          <>
            <div>Driver: <span className="font-semibold">{selectedDriver ? `${selectedDriver.first_name} ${selectedDriver.last_name}` : assignDriverLater ? 'Later' : '—'}</span></div>
            <div>Vehicle: <span className="font-semibold">{selectedVehicle ? selectedVehicle.plate_number : assignVehicleLater ? 'Later' : '—'}</span></div>
          </>
        ) : (
          <Placeholder text="Not set" />
        )}
      </Row>

      <Row icon={<Receipt className="w-3 h-3" />} title="Pricing" step={4} currentStep={currentStep} onGoToStep={onGoToStep}>
        {total !== null ? (
          <span className="flex items-center gap-1 font-extrabold text-brand text-sm">
            <Sparkles className="w-3 h-3 text-amber-500" /> SAR {total.toLocaleString()}
          </span>
        ) : matchedRateCard ? (
          <span className="font-semibold">SAR {matchedRateCard.base_price.toLocaleString()}</span>
        ) : (
          <Placeholder text="Not set" />
        )}
      </Row>
    </div>
  );
}
