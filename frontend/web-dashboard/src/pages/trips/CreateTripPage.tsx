import React from 'react';
import { CheckCircle2, AlertCircle, Clock } from 'lucide-react';
import DashboardLayout from '@/components/layout/DashboardLayout';
import CreateDriverModal from '@/components/drivers/CreateDriverModal';
import CreateVehicleModal from '@/components/fleet/CreateVehicleModal';
import CreateCustomerModal from '@/components/customers/CreateCustomerModal';
import CreateThirdPartyModal from '@/components/third-party/CreateThirdPartyModal';
import CustomerPreviewModal from '@/components/customers/CustomerPreviewModal';
import VehiclePreviewModal from '@/components/fleet/VehiclePreviewModal';
import DriverPreviewModal from '@/components/drivers/DriverPreviewModal';
import ThirdPartyPreviewModal from '@/components/third-party/ThirdPartyPreviewModal';
import EditCustomerModal from '@/components/customers/EditCustomerModal';
import EditVehicleModal from '@/components/fleet/EditVehicleModal';
import EditDriverModal from '@/components/drivers/EditDriverModal';
import EditThirdPartyModal from '@/components/third-party/EditThirdPartyModal';
import DriverAvatar from '@/components/ui/DriverAvatar';
import PastDateTripConfirmModal from '@/components/trips/PastDateTripConfirmModal';
import TripWizardHeader from '@/components/trips/wizard/TripWizardHeader';
import TripStep1Customer from '@/components/trips/wizard/TripStep1Customer';
import TripStep2Route from '@/components/trips/wizard/TripStep2Route';
import TripStep3Assignment from '@/components/trips/wizard/TripStep3Assignment';
import TripStep4Summary from '@/components/trips/wizard/TripStep4Summary';
import TripBatchGeneratorTab from '@/components/trips/wizard/TripBatchGeneratorTab';
import TripBulkImportTab from '@/components/trips/wizard/TripBulkImportTab';
import { Button } from '@/components/ui/button';
import { KbdBadge } from '@/components/ui/KbdBadge';
import { MapContainer, TileLayer, Marker, Polyline, useMap } from 'react-leaflet';
import L from 'leaflet';
import {
  useCreateTripForm,
  normalizeBillingType,
  normalizeRateCategory,
  normalizeVehicleClass,
  getVehicleTypeFromCapacity,
  isRoundTripCategory,
  getActualCapacityLabel,
} from '@/hooks/useCreateTripForm';

export { getActualCapacityLabel };

function MapBoundsAdjuster({ points }: { points: [number, number][] }) {
  const map = useMap();
  React.useEffect(() => {
    if (points && points.length > 0) {
      map.fitBounds(points, { padding: [15, 15], maxZoom: 12 });
    }
  }, [points, map]);
  return null;
}

const pickupMarkerIcon = L.divIcon({
  html: `
    <div style="position: relative; width: 24px; height: 24px; display: flex; align-items: center; justify-content: center;">
      <div style="position: absolute; width: 24px; height: 24px; border-radius: 50%; background: rgba(16, 185, 129, 0.2);" class="animate-ping"></div>
      <div style="width: 12px; height: 12px; border-radius: 50%; background: #10B981; border: 2px solid white; box-shadow: 0 1px 3px rgba(0,0,0,0.3);"></div>
    </div>
  `,
  className: '',
  iconSize: [24, 24],
  iconAnchor: [12, 12],
});

const dropoffMarkerIcon = L.divIcon({
  html: `
    <div style="position: relative; width: 24px; height: 24px; display: flex; align-items: center; justify-content: center;">
      <div style="position: absolute; width: 24px; height: 24px; border-radius: 50%; background: rgba(249, 115, 22, 0.2);" class="animate-ping"></div>
      <div style="width: 12px; height: 12px; border-radius: 50%; background: #F97316; border: 2px solid white; box-shadow: 0 1px 3px rgba(0,0,0,0.3);"></div>
    </div>
  `,
  className: '',
  iconSize: [24, 24],
  iconAnchor: [12, 12],
});

export default function CreateTripPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const tz = useDeploymentTimezone();

  // Active Tab
  const [activeTab, setActiveTab] = useState<TabMode>('contract');

  // Month navigation for contract generator
  const currentMonthKey = new Date().toISOString().slice(0, 7);
  const [selectedMonth, setSelectedMonth] = useState(currentMonthKey);

  // Master Data Queries
  const { data: customersRes } = useQuery({
    queryKey: ['customers-select'],
    queryFn: () => customerService.getAll({ per_page: 150 }),
    enabled: true,
  });

  const { data: driversRes } = useQuery({
    queryKey: ['drivers-select'],
    queryFn: () => driverService.getAll({ per_page: 1000, mode: 'lookup' }),
    enabled: true,
  });

  const { data: vehiclesRes } = useQuery({
    queryKey: ['vehicles-select'],
    queryFn: () => vehicleService.getAll({ per_page: 1000, mode: 'lookup' }),
    enabled: true,
  });

  const { data: thirdPartyRes } = useQuery({
    queryKey: ['third-party-providers-select'],
    queryFn: () => thirdPartyService.getAll({ per_page: 1000 }),
    enabled: true,
  });

  const customers = customersRes?.data ?? [];
  const drivers: Driver[] = driversRes?.data ?? [];
  const vehicles: Vehicle[] = vehiclesRes?.data ?? [];
  const thirdPartyProviders: ThirdPartyProvider[] = thirdPartyRes?.data?.data ?? [];

  const customerOptions = useMemo<ComboboxOption[]>(() => {
    return customers.map((c) => ({
      value: c.id,
      label: c.name,
      keywords: `${c.name} ${c.phone || ''} ${c.payment_terms || ''}`,
    }));
  }, [customers]);

  const [assignmentType, setAssignmentType] = useState<'own' | 'third_party'>('own');
  const [masterDriver, setMasterDriver] = useState('');
  const [masterVehicle, setMasterVehicle] = useState('');
  const [isVehicleTypeEditable, setIsVehicleTypeEditable] = useState(false);
  const [isCustomThirdPartyVehicleType, setIsCustomThirdPartyVehicleType] = useState(false);

  // Third-party vehicle assignment fields
  const [thirdPartyProviderId, setThirdPartyProviderId] = useState('');
  const [thirdPartyDriverName, setThirdPartyDriverName] = useState('');
  const [thirdPartyDriverPhone, setThirdPartyDriverPhone] = useState('');
  const [thirdPartyVehiclePlate, setThirdPartyVehiclePlate] = useState('');
  const [thirdPartyCost, setThirdPartyCost] = useState('');
  const [isCreateProviderOpen, setIsCreateProviderOpen] = useState(false);

  // ─── DIAGNOSTIC SWITCH ──────────────────────────────────────────────────────
  // Toggle __DIAG_DRIVER_OPTIONS_VEHICLE_RACE to deliberately reproduce the
  // intermittent driver-dropdown bug:
  //
  //   false (default / production)
  //     driverOptions reads vehicles via vehiclesRef — the options reference is
  //     stable. The Combobox never gets a spurious re-render when vehicles loads.
  //
  //   true (diagnostic mode)
  //     vehicles is added back to the useMemo dependency array, reverting to the
  //     pre-fix behaviour. The options reference changes every time the vehicles
  //     query resolves, re-creating the filter closure and triggering the transient
  //     CommandEmpty flash — proving the failure mechanism is live.
  //
  // To use: flip the constant, open Create Trip → Step 3 on a fresh tab
  // (so vehicles are not cached), open the driver dropdown before the vehicles
  // request completes, and observe the flash. Then flip back to false and
  // confirm the flash no longer occurs.
  // eslint-disable-next-line @typescript-eslint/no-inferrable-types
  const __DIAG_DRIVER_OPTIONS_VEHICLE_RACE: boolean = false;
  // ────────────────────────────────────────────────────────────────────────────

  // Keep a live ref to vehicles so driverOptions can read capacity labels at
  // call-time without declaring ehicles as a reactive dependency.
  // vehiclesRef.current is always the latest value; it just doesn't subscribe
  // to the vehicles fetch cycle, which is what we want.
  const vehiclesRef = useRef(vehicles);
  vehiclesRef.current = vehicles;

  const driverOptions = useMemo<ComboboxOption[]>(() => {
    return drivers
      .filter((d) => d.isActive !== false)
      .map((d) => {
        // Prefer the embedded vehicle object returned by the driver lookup API.
        // capacity_kg is now included in the assignedVehicle select (see
        // driverController.ts), so this path returns a valid capacityKg for
        // most active drivers without touching the vehicles list at all.
        const embeddedVeh =
          d.assignedVehicle && typeof d.assignedVehicle === 'object'
            ? (d.assignedVehicle as any)
            : null;

        const vehicleId = embeddedVeh?.id ?? d.assignedVehicleId ?? (d as any).assigned_vehicle_id;

        // vehiclesRef.current is the fallback — deliberately NOT in the deps array
        // so this useMemo doesn't recompute (and cause a Combobox re-render) just
        // because the vehicles query resolved.
        const matchedVeh = vehicleId
          ? vehiclesRef.current.find((v) => v.id === vehicleId)
          : null;

        const capacityKg =
          embeddedVeh?.capacity_kg ??
          (embeddedVeh as any)?.capacityKg ??
          matchedVeh?.capacity_kg ??
          (matchedVeh as any)?.capacityKg;

        const capacityLabel = capacityKg != null ? getActualCapacityLabel(capacityKg) : '';
        const isNotAvailable = d.status && d.status !== 'Available' && d.status.toLowerCase() !== 'available';
        const statusTag = isNotAvailable
          ? d.status === 'OnTrip' ? 'On Trip' : d.status === 'OffDuty' ? 'Off Duty' : d.status
          : '';

        const detailsStr = [capacityLabel, statusTag].filter(Boolean).join(' • ');

        const label = detailsStr
          ? `${d.first_name} ${d.last_name} (${detailsStr})`
          : `${d.first_name} ${d.last_name}`;

        return {
          value: d.id,
          label,
          keywords: `${d.first_name} ${d.last_name} ${d.phone_primary || ''} ${d.license_number || ''} ${capacityLabel} ${d.status || ''}`,
        };
      });
  }, __DIAG_DRIVER_OPTIONS_VEHICLE_RACE ? [drivers, vehicles] : [drivers]);

  const vehicleOptions = useMemo<ComboboxOption[]>(() => {
    return vehicles
      .filter((v) => v.isActive !== false && (v.status !== 'Inactive' || v.id === masterVehicle))
      .map((v) => {
        const actualCapLabel = getActualCapacityLabel(v.capacity_kg ?? 0);
        const typeLabel = v.asset_type && actualCapLabel ? `${v.asset_type} • ${actualCapLabel}` : (v.asset_type || actualCapLabel);
        return {
          value: v.id,
          label: `${v.plate_number} (${typeLabel})`,
          keywords: `${v.plate_number || ''} ${v.asset_type || ''} ${v.ref_id || ''} ${actualCapLabel}`,
        };
      });
  }, [vehicles, masterVehicle]);

  // ==========================================
  // TAB 1: MONTHLY CONTRACT BATCH GENERATOR STATE
  // ==========================================
  const [contractStep, setContractStep] = useState<1 | 2 | 3 | 4>(1);
  const [contractCustomer, setContractCustomer] = useState('');
  const [customerSearch, setCustomerSearch] = useState('');
  const [contractRateCategory, setContractRateCategory] = useState<string>(MODAL_RATE_CATEGORIES[0] || 'Trip');
  const [contractBillingType, setContractBillingType] = useState<string>('Extra');
  const [contractVehicleType, setContractVehicleType] = useState<string>(VEHICLE_TYPES[0] || 'Flatbed');

  const { data: rateCardsRes } = useQuery({
    queryKey: ['quotations-select', contractCustomer],
    queryFn: () => quotationService.getAll({ customerId: contractCustomer, active_only: true }),
    enabled: Boolean(contractCustomer),
  });

  const customerRateCards: RateCard[] = rateCardsRes?.data ?? [];

  const getMatchingRateCard = useCallback((
    origin?: string,
    destination?: string,
    vehicleType?: string,
    rateCategory?: string,
    billingType?: string,
    targetDate?: string,
    originLocationId?: string | null,
    destinationLocationId?: string | null
  ): RateCard | null => {
    if ((!origin && !originLocationId) || (!destination && !destinationLocationId) || customerRateCards.length === 0) return null;

    const norm = (s?: string | null) => String(s || '').toLowerCase().replace(/[\s,_()[\]\/{}\-.]/g, '');
    const oNorm = norm(origin);
    const dNorm = norm(destination);
    const vNorm = norm(vehicleType);
    const cNorm = norm(rateCategory);
    const bNormTarget = norm(billingType);

    const checkValidity = (rc: RateCard) => {
      if (!targetDate) return true;
      const t = new Date(targetDate).getTime();
      if (isNaN(t)) return true;
      if (rc.valid_from && new Date(rc.valid_from).getTime() > t) return false;
      if (rc.valid_to && new Date(rc.valid_to).getTime() < t) return false;
      return true;
    };

    const matchLocation = (cardLocRaw: string, targetLocRaw: string) => {
      if (!cardLocRaw || !targetLocRaw) return false;
      const cleanCard = norm(cardLocRaw);
      const cleanTarget = norm(targetLocRaw);
      if (cleanCard === cleanTarget) return true;
      if (cleanCard.includes(cleanTarget) || cleanTarget.includes(cleanCard)) return true;

      const getTokens = (s: string) =>
        s
          .toLowerCase()
          .split(/[\s,_()[\]\/{}\-.]+/)
          .filter((t) => t.length > 2 && t !== 'al' && t !== 'el' && t !== 'the' && t !== 'station' && t !== 'centre' && t !== 'center' && t !== 'hub');

      const cardTokens = getTokens(cardLocRaw);
      const targetTokens = getTokens(targetLocRaw);

      if (cardTokens.length === 0 || targetTokens.length === 0) return false;

      return cardTokens.some((ct) => targetTokens.some((tt) => ct === tt || ct.includes(tt) || tt.includes(ct)));
    };

    const matchLane = (rc: RateCard) => {
      const firstStop = rc.stops && rc.stops.length > 0 ? rc.stops[0] : null;
      const lastStop = rc.stops && rc.stops.length > 1 ? rc.stops[rc.stops.length - 1] : firstStop;

      const rcO = String(
        firstStop?.source_label ||
        firstStop?.location?.name ||
        firstStop?.location?.address ||
        (firstStop as any)?.location_name ||
        rc.route_origin ||
        rc.origin_name ||
        rc.originLocation?.name ||
        rc.originLocation?.address ||
        (rc as any).origin_location_id ||
        rc.originLocationId ||
        ''
      );

      const rcD = String(
        lastStop?.source_label ||
        lastStop?.location?.name ||
        lastStop?.location?.address ||
        (lastStop as any)?.location_name ||
        rc.route_destination ||
        rc.destination_name ||
        rc.destinationLocation?.name ||
        rc.destinationLocation?.address ||
        (rc as any).destination_location_id ||
        rc.destinationLocationId ||
        ''
      );

      const rcOriginLocId = firstStop?.locationId || firstStop?.location?.id || (rc as any).origin_location_id || rc.originLocationId;
      const rcDestLocId = lastStop?.locationId || lastStop?.location?.id || (rc as any).destination_location_id || rc.destinationLocationId;

      if (originLocationId && destinationLocationId && rcOriginLocId && rcDestLocId) {
        if (rcOriginLocId === originLocationId && rcDestLocId === destinationLocationId) {
          return true;
        }
      }

      return matchLocation(rcO, origin || '') && matchLocation(rcD, destination || '');
    };

    const exact = customerRateCards.find((rc) => {
      if (!checkValidity(rc)) return false;
      if (!matchLane(rc)) return false;

      const rcV = norm(rc.vehicle_type || rc.vehicle_class || rc.source_vehicle_label);
      const rcC = norm(rc.rate_category || rc.line_type);
      const rcB = norm(rc.billing_type);

      const vMatch = !vNorm || !rcV || rcV === vNorm;
      const cMatch = !cNorm || !rcC || rcC === cNorm || rcC.includes(cNorm) || cNorm.includes(rcC);
      const bMatch = !bNormTarget || !rcB || rcB === bNormTarget;

      return vMatch && cMatch && bMatch;
    });

    return exact || null;
  }, [customerRateCards]);

  const getAvailableRateCardsForLane = useCallback((
    origin?: string,
    destination?: string,
    originLocationId?: string | null,
    destinationLocationId?: string | null
  ): RateCard[] => {
    if ((!origin && !originLocationId) || (!destination && !destinationLocationId) || customerRateCards.length === 0) return [];

    const norm = (s?: string | null) => String(s || '').toLowerCase().replace(/[\s,_()[\]\/{}\-.]/g, '');
    const matchLocation = (cardLocRaw: string, targetLocRaw: string) => {
      if (!cardLocRaw || !targetLocRaw) return false;
      const cleanCard = norm(cardLocRaw);
      const cleanTarget = norm(targetLocRaw);
      if (cleanCard === cleanTarget) return true;
      if (cleanCard.includes(cleanTarget) || cleanTarget.includes(cleanCard)) return true;

      const getTokens = (s: string) =>
        s.toLowerCase().split(/[\s,_()[\]\/{}\-.]+/).filter((t) => t.length > 2 && t !== 'al' && t !== 'el' && t !== 'the' && t !== 'station' && t !== 'center' && t !== 'centre' && t !== 'hub');

      const cardTokens = getTokens(cardLocRaw);
      const targetTokens = getTokens(targetLocRaw);
      if (cardTokens.length === 0 || targetTokens.length === 0) return false;
      return cardTokens.some((ct) => targetTokens.some((tt) => ct === tt || ct.includes(tt) || tt.includes(ct)));
    };

    return customerRateCards.filter((rc) => {
      const firstStop = rc.stops && rc.stops.length > 0 ? rc.stops[0] : null;
      const lastStop = rc.stops && rc.stops.length > 1 ? rc.stops[rc.stops.length - 1] : firstStop;

      const rcO = String(
        firstStop?.source_label || firstStop?.location?.name || firstStop?.location?.address || rc.route_origin || rc.origin_name || rc.originLocation?.name || ''
      );
      const rcD = String(
        lastStop?.source_label || lastStop?.location?.name || lastStop?.location?.address || rc.route_destination || rc.destination_name || rc.destinationLocation?.name || ''
      );

      const rcOriginLocId = firstStop?.locationId || firstStop?.location?.id || (rc as any).origin_location_id || rc.originLocationId;
      const rcDestLocId = lastStop?.locationId || lastStop?.location?.id || (rc as any).destination_location_id || rc.destinationLocationId;

      if (originLocationId && destinationLocationId && rcOriginLocId && rcDestLocId) {
        if (rcOriginLocId === originLocationId && rcDestLocId === destinationLocationId) {
          return true;
        }
      }

      return matchLocation(rcO, origin || '') && matchLocation(rcD, destination || '');
    });
  }, [customerRateCards]);

  const [contractSlots, setContractSlots] = useState<Array<{
    id: string;
    origin: string;
    destination: string;
    originLocationId?: string | null;
    destinationLocationId?: string | null;
    rateMatched?: boolean;
    rateCardId?: string;
    rateCardName?: string;
    rateCardBasePrice?: number;
    rateCardDefaultTripCharge?: number | null;
    pickupTime: string;
    dropoffTime: string;
    date: string;
    dropoffDate: string;
    billingAmount: string;
    tripCharges: string;
    /** Checked -> a new Quotation gets created from this slot's lane/price on submit,
     *  so future trips on the same lane auto-match instead of needing a preset again. */
    saveAsQuotation?: boolean;
    saveAsRateCard?: boolean;
    rateReason?: string;
    isOvernight?: boolean;
    intermediateLocations: string[];
    intermediateLocationIds?: (string | null)[];
    intermediateStopFees?: string[];
    // Return Leg fields for Round Trip
    returnOrigin?: string;
    returnDestination?: string;
    returnPickupTime?: string;
    returnDropoffTime?: string;
    returnIsOvernight?: boolean;
    returnIntermediateLocations?: string[];
    returnIntermediateStopFees?: string[];
    originLat?: number | null;
    originLng?: number | null;
    destinationLat?: number | null;
    destinationLng?: number | null;
    returnOriginLat?: number | null;
    returnOriginLng?: number | null;
    returnDestinationLat?: number | null;
    returnDestinationLng?: number | null;
  }>>([
    {
      id: 'slot-1',
      origin: '',
      destination: '',
      originLocationId: null,
      destinationLocationId: null,
      rateMatched: false,
      pickupTime: '08:00',
      dropoffTime: '14:00',
      date: new Date().toISOString().slice(0, 10),
      dropoffDate: new Date().toISOString().slice(0, 10),
      billingAmount: '',
      tripCharges: '',
      saveAsQuotation: false,
      saveAsRateCard: false,
      isOvernight: false,
      intermediateLocations: [],
      intermediateLocationIds: [],
      intermediateStopFees: [],
      returnOrigin: '',
      returnDestination: '',
      returnPickupTime: '16:00',
      returnDropoffTime: '22:00',
      returnIsOvernight: false,
      returnIntermediateLocations: [],
      returnIntermediateStopFees: [],
      originLat: null,
      originLng: null,
      destinationLat: null,
      destinationLng: null,
      returnOriginLat: null,
      returnOriginLng: null,
      returnDestinationLat: null,
      returnDestinationLng: null,
    },
  ]);

  // Dynamic Quotation rate lookup connected to Customer, Lane, Vehicle (Tonnage), Billing Type, Line Type & Multi-Stops
  const triggerRateLookupForSlots = useCallback(
    (overrideVehicleType?: string, overrideRateCategory?: string, overrideCustomer?: string, overrideBillingType?: string) => {
      const custId = overrideCustomer !== undefined ? overrideCustomer : contractCustomer;
      const vType = overrideVehicleType !== undefined ? overrideVehicleType : contractVehicleType;
      const rCat = overrideRateCategory !== undefined ? overrideRateCategory : contractRateCategory;
      const bType = overrideBillingType !== undefined ? overrideBillingType : contractBillingType;

      if (!custId) return;

      import('@/services/quotationService').then(({ quotationService }) => {
        setContractSlots((prevSlots) => {
          Promise.all(
            prevSlots.map(async (slot) => {
              if ((!slot.origin && !slot.originLocationId) || (!slot.destination && !slot.destinationLocationId)) return slot;

              const intermediateStops = (slot.intermediateLocations || []).map((locVal, idx) => {
                const locId = slot.intermediateLocationIds?.[idx] || (isUuid(locVal) ? locVal : null);
                return {
                  location_id: locId || null,
                  location_name: locVal,
                  stop_type: 'Dropoff',
                  sequence: idx + 2,
                };
              });

              const slotStops = [
                { location_id: slot.originLocationId, stop_type: 'Pickup', sequence: 1 },
                ...intermediateStops,
                { location_id: slot.destinationLocationId, stop_type: 'Dropoff', sequence: intermediateStops.length + 2 },
              ];

              try {
                // 1. Primary lookup: backend API lookup
                let card: RateCard | null = null;
                if (slot.originLocationId && slot.destinationLocationId) {
                  const exactRes = await quotationService.lookup({
                    customer_id: custId,
                    origin_location_id: slot.originLocationId,
                    destination_location_id: slot.destinationLocationId,
                    vehicle_type: vType || undefined,
                    line_type: rCat || undefined,
                    billing_type: bType || undefined,
                    planned_start: slot.date || undefined,
                    stops: slotStops,
                  });
                  card = exactRes?.quotation || exactRes?.candidate_quotation || exactRes?.candidateQuotation || exactRes?.rate_card || null;
                }

                // 2. Client-side smart fallback matcher if backend API returned null
                if (!card) {
                  card = getMatchingRateCard(
                    slot.origin,
                    slot.destination,
                    vType,
                    rCat,
                    bType,
                    slot.date,
                    slot.originLocationId,
                    slot.destinationLocationId
                  );
                }

                if (card) {
                  const cardRate = Number(card.rate ?? card.base_price ?? 0);
                  const driverPayout = card.driver_payout ?? (card as any).driver_charge;
                  if (cardRate > 0) {
                    const isMonthlyRate = card.pricing_basis === 'PER_TRIP'
                      ? false
                      : card.pricing_basis === 'PER_MONTH'
                      ? true
                      : (card.line_type || card.rate_category || '').toLowerCase().includes('single') || (card.line_type || card.rate_category || '').toLowerCase().includes('extra')
                      ? false
                      : (card.billing_type || '').toLowerCase().includes('monthly');

                    const perTripAmount = isMonthlyRate ? Math.round((cardRate / 30) * 100) / 100 : cardRate;
                    return {
                      ...slot,
                      billingAmount: String(perTripAmount),
                      tripCharges: driverPayout != null ? String(driverPayout) : '',
                      rateMatched: true,
                      rateCardId: card.id,
                      rateCardName: card.name,
                      rateCardBasePrice: perTripAmount,
                      rateCardDefaultTripCharge: driverPayout != null ? Number(driverPayout) : null,
                      saveAsQuotation: false,
                      saveAsRateCard: false,
                    };
                  }
                }
              } catch (err) {
                console.error('Quotation rate lookup error:', err);
              }

              // 3. No Quotation exists for this specific context yet!
              return {
                ...slot,
                billingAmount: '',
                tripCharges: '',
                rateMatched: false,
                rateCardId: undefined,
                rateCardName: undefined,
                rateCardBasePrice: undefined,
                rateCardDefaultTripCharge: undefined,
                saveAsQuotation: true,
                saveAsRateCard: true,
              };
            })
          ).then((updatedSlots) => {
            setContractSlots(updatedSlots);
          });

          return prevSlots;
        });
      });
    },
    [contractCustomer, contractVehicleType, contractRateCategory, contractBillingType]
  );

  useEffect(() => {
    if (contractCustomer) {
      triggerRateLookupForSlots();
    }
  }, [contractCustomer, contractVehicleType, contractRateCategory, contractBillingType, triggerRateLookupForSlots]);

  // Rate-card auto-lookup: fires when origin/destination location IDs are set on a slot
  const handleSlotLocationChange = (
    slotId: string,
    field: 'origin' | 'destination',
    locIdOrName: string,
    locObj: import('@/services/locationService').Location | null
  ) => {
    const locationId = locObj?.id ?? (isUuid(locIdOrName) ? locIdOrName : null);
    const displayName = locObj?.name || locObj?.address || (isUuid(locIdOrName) ? '' : locIdOrName);
    const isOrigin = field === 'origin';

    handleUpdateTripSlot(slotId, {
      [field]: displayName,
      [isOrigin ? 'originLocationId' : 'destinationLocationId']: locationId,
      [isOrigin ? 'originLat' : 'destinationLat']: locObj?.lat ?? null,
      [isOrigin ? 'originLng' : 'destinationLng']: locObj?.lng ?? null,
      rateMatched: false,
    });

    // Trigger rate lookup for slots after setting location IDs
    setTimeout(() => {
      triggerRateLookupForSlots();
    }, 100);
  };

  const handleAddTripSlot = () => {
    const nextNum = contractSlots.length + 1;
    const defaultTime = nextNum === 2 ? '14:00' : nextNum === 3 ? '20:00' : '08:00';
    setContractSlots((prev) => [
      ...prev,
      {
        id: `slot-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
        origin: prev[0]?.origin || '',
        destination: prev[0]?.destination || '',
        originLocationId: prev[0]?.originLocationId || null,
        destinationLocationId: prev[0]?.destinationLocationId || null,
        pickupTime: defaultTime,
        dropoffTime: '14:00',
        date: prev[0]?.date || new Date().toISOString().slice(0, 10),
        dropoffDate: prev[0]?.dropoffDate || new Date().toISOString().slice(0, 10),
        billingAmount: prev[0]?.billingAmount || '',
        tripCharges: prev[0]?.tripCharges || '',
        rateMatched: prev[0]?.rateMatched || false,
        rateCardId: prev[0]?.rateCardId,
        rateCardName: prev[0]?.rateCardName,
        rateCardBasePrice: prev[0]?.rateCardBasePrice,
        rateCardDefaultTripCharge: prev[0]?.rateCardDefaultTripCharge,
        isOvernight: false,
        intermediateLocations: [...(prev[0]?.intermediateLocations || [])],
        intermediateStopFees: [...(prev[0]?.intermediateStopFees || [])],
        returnOrigin: prev[0]?.returnOrigin || '',
        returnDestination: prev[0]?.returnDestination || '',
        returnPickupTime: '16:00',
        returnDropoffTime: '22:00',
        returnIsOvernight: false,
        returnIntermediateLocations: [...(prev[0]?.returnIntermediateLocations || [])],
        returnIntermediateStopFees: [...(prev[0]?.returnIntermediateStopFees || [])],
      },
    ]);
  };

  const handleRemoveTripSlot = (id: string) => {
    if (contractSlots.length <= 1) return;
    setContractSlots((prev) => prev.filter((s) => s.id !== id));
  };

  const handleUpdateTripSlot = (id: string, updates: Partial<(typeof contractSlots)[0]>) => {
    setContractSlots((prev) =>
      prev.map((s) => (s.id === id ? { ...s, ...updates } : s))
    );

    // Side effect to auto-fill dropoff date & time
    if (
      updates.origin !== undefined ||
      updates.destination !== undefined ||
      updates.date !== undefined ||
      updates.pickupTime !== undefined
    ) {
      const slot = contractSlots.find((s) => s.id === id);
      if (slot) {
        const origin = updates.origin !== undefined ? updates.origin : slot.origin;
        const destination = updates.destination !== undefined ? updates.destination : slot.destination;
        const originLat = updates.originLat !== undefined ? updates.originLat : slot.originLat;
        const originLng = updates.originLng !== undefined ? updates.originLng : slot.originLng;
        const destinationLat = updates.destinationLat !== undefined ? updates.destinationLat : slot.destinationLat;
        const destinationLng = updates.destinationLng !== undefined ? updates.destinationLng : slot.destinationLng;
        const date = updates.date !== undefined ? updates.date : slot.date;
        const pickupTime = updates.pickupTime !== undefined ? updates.pickupTime : slot.pickupTime;

        if (origin.trim() && destination.trim()) {
          estimateTravelTimeByName(origin, destination, originLat, originLng, destinationLat, destinationLng)
            .then((estimate) => {
              if (estimate) {
                const arrival = calculateArrivalDropoffTime(pickupTime, estimate.durationMinutes);
                const dropoffDate = arrival.isOvernight ? addDays(date, 1) : date;

                setContractSlots((prev) =>
                  prev.map((s) =>
                    s.id === id
                      ? {
                          ...s,
                          dropoffTime: arrival.dropoffTime,
                          dropoffDate,
                          isOvernight: arrival.isOvernight,
                        }
                      : s
                  )
                );
              }
            })
            .catch((err) => {
              console.warn('Auto-fill dropoff estimate failed', err);
            });
        }
      }
    }
  };

  const handleAddSlotIntermediate = (slotId: string) => {
    setContractSlots((prev) =>
      prev.map((s) =>
        s.id === slotId
          ? {
              ...s,
              intermediateLocations: [...s.intermediateLocations, ''],
              intermediateLocationIds: [...(s.intermediateLocationIds || []), null],
              intermediateStopFees: [...(s.intermediateStopFees || []), ''],
            }
          : s
      )
    );
  };

  const handleRemoveSlotIntermediate = (slotId: string, idx: number) => {
    setContractSlots((prev) =>
      prev.map((s) =>
        s.id === slotId
          ? {
              ...s,
              intermediateLocations: s.intermediateLocations.filter((_, i) => i !== idx),
              intermediateLocationIds: (s.intermediateLocationIds || []).filter((_, i) => i !== idx),
              intermediateStopFees: (s.intermediateStopFees || []).filter((_, i) => i !== idx),
            }
          : s
      )
    );
  };

  const handleUpdateSlotIntermediate = (slotId: string, idx: number, val: string, locId?: string | null) => {
    setContractSlots((prev) =>
      prev.map((s) => {
        if (s.id !== slotId) return s;
        const nextLocs = [...s.intermediateLocations];
        const nextIds = [...(s.intermediateLocationIds || [])];
        nextLocs[idx] = val;
        nextIds[idx] = locId !== undefined ? locId : (isUuid(val) ? val : null);
        return { ...s, intermediateLocations: nextLocs, intermediateLocationIds: nextIds };
      })
    );
  };

  const handleUpdateSlotIntermediateFee = (slotId: string, idx: number, val: string) => {
    setContractSlots((prev) =>
      prev.map((s) => {
        if (s.id !== slotId) return s;
        const nextFees = [...(s.intermediateStopFees || [])];
        nextFees[idx] = val;
        return { ...s, intermediateStopFees: nextFees };
      })
    );
  };

  const handleInsertSlotIntermediateAt = (slotId: string, insertIdx: number) => {
    setContractSlots((prev) =>
      prev.map((s) => {
        if (s.id !== slotId) return s;
        const nextLocs = [...s.intermediateLocations];
        const nextIds = [...(s.intermediateLocationIds || [])];
        const nextFees = [...(s.intermediateStopFees || [])];
        nextLocs.splice(insertIdx, 0, '');
        nextIds.splice(insertIdx, 0, null);
        nextFees.splice(insertIdx, 0, '');
        return { ...s, intermediateLocations: nextLocs, intermediateLocationIds: nextIds, intermediateStopFees: nextFees };
      })
    );
  };

  const handleMoveSlotIntermediate = (slotId: string, fromIdx: number, toIdx: number) => {
    setContractSlots((prev) =>
      prev.map((s) => {
        if (s.id !== slotId) return s;
        const nextLocs = [...s.intermediateLocations];
        const nextIds = [...(s.intermediateLocationIds || [])];
        const nextFees = [...(s.intermediateStopFees || [])];
        if (fromIdx < 0 || fromIdx >= nextLocs.length || toIdx < 0 || toIdx >= nextLocs.length) return s;
        const [movedLoc] = nextLocs.splice(fromIdx, 1);
        const [movedId] = nextIds.splice(fromIdx, 1);
        const [movedFee] = nextFees.splice(fromIdx, 1);
        nextLocs.splice(toIdx, 0, movedLoc);
        nextIds.splice(toIdx, 0, movedId);
        nextFees.splice(toIdx, 0, movedFee);
        return { ...s, intermediateLocations: nextLocs, intermediateLocationIds: nextIds, intermediateStopFees: nextFees };
      })
    );
  };

  // Return Leg Intermediate Stop Handlers
  const handleAddSlotReturnIntermediate = (slotId: string) => {
    setContractSlots((prev) =>
      prev.map((s) =>
        s.id === slotId
          ? {
              ...s,
              returnIntermediateLocations: [...(s.returnIntermediateLocations || []), ''],
              returnIntermediateStopFees: [...(s.returnIntermediateStopFees || []), ''],
            }
          : s
      )
    );
  };

  const handleRemoveSlotReturnIntermediate = (slotId: string, idx: number) => {
    setContractSlots((prev) =>
      prev.map((s) =>
        s.id === slotId
          ? {
              ...s,
              returnIntermediateLocations: (s.returnIntermediateLocations || []).filter((_, i) => i !== idx),
              returnIntermediateStopFees: (s.returnIntermediateStopFees || []).filter((_, i) => i !== idx),
            }
          : s
      )
    );
  };

  const handleUpdateSlotReturnIntermediate = (slotId: string, idx: number, val: string) => {
    setContractSlots((prev) =>
      prev.map((s) => {
        if (s.id !== slotId) return s;
        const nextLocs = [...(s.returnIntermediateLocations || [])];
        nextLocs[idx] = val;
        return { ...s, returnIntermediateLocations: nextLocs };
      })
    );
  };

  const handleUpdateSlotReturnIntermediateFee = (slotId: string, idx: number, val: string) => {
    setContractSlots((prev) =>
      prev.map((s) => {
        if (s.id !== slotId) return s;
        const nextFees = [...(s.returnIntermediateStopFees || [])];
        nextFees[idx] = val;
        return { ...s, returnIntermediateStopFees: nextFees };
      })
    );
  };
  const [selectedDates, setSelectedDates] = useState<string[]>([]);
  const [dayAssignments, setDayAssignments] = useState<Record<string, { driverId: string; vehicleId: string }>>({});

  // Master quick-apply in Step 2
  const [assignMode, setAssignMode] = useState<'single' | 'alternating'>('single');
  const [isCreateDriverOpen, setIsCreateDriverOpen] = useState(false);
  const [isCreateVehicleOpen, setIsCreateVehicleOpen] = useState(false);
  const [isCreateCustomerOpen, setIsCreateCustomerOpen] = useState(false);

  const [previewVehicle, setPreviewVehicle] = useState<any | null>(null);
  const [previewCustomer, setPreviewCustomer] = useState<any | null>(null);
  const [previewThirdParty, setPreviewThirdParty] = useState<any | null>(null);
  const [previewDriver, setPreviewDriver] = useState<any | null>(null);

  const [editVehicle, setEditVehicle] = useState<any | null>(null);
  const [editCustomer, setEditCustomer] = useState<any | null>(null);
  const [editThirdParty, setEditThirdParty] = useState<any | null>(null);
  const [editDriver, setEditDriver] = useState<any | null>(null);

  const isStepValid = (step: number): boolean => {
    if (step === 1) {
      return Boolean(contractCustomer);
    }
    if (step === 2) {
      return (
        contractSlots.length > 0 &&
        contractSlots.every(
          (slot) =>
            slot.date &&
            slot.origin.trim() &&
            slot.destination.trim() &&
            slot.pickupTime &&
            slot.dropoffTime
        )
      );
    }
    if (step === 3) {
      if (assignmentType === 'own') {
        return Boolean(masterVehicle && masterVehicle !== 'unassigned');
      } else {
        return Boolean(thirdPartyProviderId || thirdPartyVehiclePlate.trim());
      }
    }
    return true;
  };

  const canNavigateToStep = (targetStep: number): boolean => {
    if (targetStep <= contractStep) return true;
    for (let s = 1; s < targetStep; s++) {
      if (!isStepValid(s)) return false;
    }
    return true;
  };

  const handleDriverChange = (driverId: string) => {
    setMasterDriver(driverId);
    if (!driverId || driverId === 'unassigned') return;

    const selectedDriver = drivers.find((d) => d.id === driverId);
    if (!selectedDriver) return;

    // Priority 1: use the embedded assignedVehicle object the API already returns
    const embeddedVehicle = selectedDriver.assignedVehicle && typeof selectedDriver.assignedVehicle === 'object'
      ? selectedDriver.assignedVehicle as any
      : null;

    const vehicleId =
      selectedDriver.assignedVehicleId ||
      embeddedVehicle?.id ||
      (selectedDriver as any).assigned_vehicle_id;

    if (!vehicleId) return;

    setMasterVehicle(vehicleId);

    // Look up vehicle in local vehicles list as well to ensure accurate capacity_kg
    const matchedVehicle = vehicles.find((v) => v.id === vehicleId);
    const capacity =
      embeddedVehicle?.capacity_kg ??
      embeddedVehicle?.capacityKg ??
      matchedVehicle?.capacity_kg ??
      (matchedVehicle as any)?.capacityKg;

    if (capacity != null) {
      const type = getVehicleTypeFromCapacity(capacity);
      setContractVehicleType(type);
      setIsVehicleTypeEditable(false);
      // Re-run rate card lookup connected to this specific tonnage!
      triggerRateLookupForSlots(type);
    }
  };

  const handleVehicleChange = (vehicleId: string) => {
    setMasterVehicle(vehicleId);
    if (vehicleId && vehicleId !== 'unassigned') {
      const selectedVehicle = vehicles.find((v) => v.id === vehicleId);
      if (selectedVehicle) {
        const type = getVehicleTypeFromCapacity(selectedVehicle.capacity_kg);
        setContractVehicleType(type);
        setIsVehicleTypeEditable(false);
        // Re-run rate card lookup connected to this specific tonnage!
        triggerRateLookupForSlots(type);
      }
    }
  };

  const [loopDriverA, setLoopDriverA] = useState('');
  const [loopVehicleA, setLoopVehicleA] = useState('');
  const [loopDriverB, setLoopDriverB] = useState('');
  const [loopVehicleB, setLoopVehicleB] = useState('');

  // Batch trip rows for Step 2 preview
  const batchTripRows = useMemo(() => {
    const list: Array<{
      key: string;
      dateStr: string;
      formattedDate: string;
      slotLabel: string;
      pickupTime: string;
      isOvernight?: boolean;
    }> = [];

    contractSlots.forEach((slot, slotIdx) => {
      const dateStr = slot.date || new Date().toISOString().slice(0, 10);
      const [y, m, d] = dateStr.split('-').map(Number);
      const dateObj = new Date(y, m - 1, d);
      const formattedDate = dateObj.toLocaleDateString('en-GB', {
        weekday: 'short',
        day: 'numeric',
        month: 'short',
        year: 'numeric',
      });

      const key = slot.id;
      const slotLabel = `Slot #${slotIdx + 1}`;
      list.push({
        key,
        dateStr,
        formattedDate,
        slotLabel,
        pickupTime: slot.pickupTime,
        isOvernight: slot.isOvernight,
      });
    });

    return list;
  }, [contractSlots]);

  const applyMasterToAll = () => {
    setDayAssignments((prev) => {
      const next = { ...prev };
      batchTripRows.forEach((row) => {
        next[row.key] = {
          driverId: masterDriver !== 'unassigned' && masterDriver ? masterDriver : '',
          vehicleId: masterVehicle !== 'unassigned' && masterVehicle ? masterVehicle : '',
        };
      });
      return next;
    });
  };

  const applyAlternatingLoop = () => {
    const newAssignments: Record<string, { driverId: string; vehicleId: string }> = {};

    batchTripRows.forEach((row, index) => {
      const isEven = index % 2 === 0;
      const drv = isEven ? loopDriverA : loopDriverB;
      const veh = isEven ? loopVehicleA : loopVehicleB;

      newAssignments[row.key] = {
        driverId: drv === 'unassigned' ? '' : drv,
        vehicleId: veh === 'unassigned' ? '' : veh,
      };
    });

    setDayAssignments((prev) => ({ ...prev, ...newAssignments }));
  };

  // Calendar dates for the selected month
  const monthDates = useMemo(() => {
    const [year, month] = selectedMonth.split('-').map(Number);
    const totalDays = new Date(year, month, 0).getDate();
    const days: Array<{ dateStr: string; dayNumber: number; dayOfWeek: number; dayName: string }> = [];

    for (let d = 1; d <= totalDays; d++) {
      const dateObj = new Date(year, month - 1, d);
      const dateStr = `${year}-${String(month).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
      days.push({
        dateStr,
        dayNumber: d,
        dayOfWeek: dateObj.getDay(), // 0 = Sun, 1 = Mon, ...
        dayName: dateObj.toLocaleDateString('en-US', { weekday: 'short' }),
      });
    }
    return days;
  }, [selectedMonth]);

  const toggleDate = (dateStr: string) => {
    setSelectedDates((prev) =>
      prev.includes(dateStr) ? prev.filter((d) => d !== dateStr) : [...prev, dateStr].sort()
    );
  };

  const selectPreset = (type: 'weekdays' | 'mwf' | 'daily' | 'clear') => {
    if (type === 'clear') {
      setSelectedDates([]);
      return;
    }
    const matched = monthDates.filter((d) => {
      if (type === 'weekdays') {
        // Sun(0) through Thu(4) for standard Gulf region, or Mon(1)-Fri(5)
        return d.dayOfWeek >= 0 && d.dayOfWeek <= 4;
      }
      if (type === 'mwf') {
        return d.dayOfWeek === 1 || d.dayOfWeek === 3 || d.dayOfWeek === 5;
      }
      if (type === 'daily') {
        return true;
      }
      return false;
    }).map((d) => d.dateStr);

    setSelectedDates(matched);
  };

  // Sync day assignments when selectedDates changes
  useEffect(() => {
    setDayAssignments((prev) => {
      const next: Record<string, { driverId: string; vehicleId: string }> = {};
      selectedDates.forEach((date) => {
        next[date] = prev[date] || { driverId: '', vehicleId: '' };
      });
      return next;
    });
  }, [selectedDates]);



  // ==========================================
  // TAB 2: QUICK GRID ENTRY STATE
  // ==========================================
  const generateEmptyRow = (): GridTripRow => ({
    id: Math.random().toString(36).substring(2, 9),
    customerId: customers[0]?.id || '',
    date: new Date().toISOString().slice(0, 10),
    driverId: '',
    vehicleId: '',
    rateCategory: MODAL_RATE_CATEGORIES[0] || 'Trip',
    vehicleType: VEHICLE_TYPES[0] || 'Flatbed',
    origin: '',
    destination: '',
    amount: '',
  });

  const [gridRows, setGridRows] = useState<GridTripRow[]>([
    generateEmptyRow(),
    generateEmptyRow(),
    generateEmptyRow(),
  ]);

  const updateGridRow = (id: string, updates: Partial<GridTripRow>) => {
    setGridRows((prev) => prev.map((row) => (row.id === id ? { ...row, ...updates } : row)));
  };

  const deleteGridRow = (id: string) => {
    setGridRows((prev) => (prev.length > 1 ? prev.filter((r) => r.id !== id) : prev));
  };

  const duplicateGridRow = (row: GridTripRow) => {
    setGridRows((prev) => [...prev, { ...row, id: Math.random().toString(36).substring(2, 9) }]);
  };

  // ==========================================
  // TAB 3: CSV / EXCEL FILE IMPORT STATE
  // ==========================================
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [importedFile, setImportedFile] = useState<File | null>(null);
  const [parsedRows, setParsedRows] = useState<Array<BulkImportTripRow>>([]);
  const [parseError, setParseError] = useState<string | null>(null);
  const [isParsing, setIsParsing] = useState(false);

  const handleFileUpload = async (file: File) => {
    setImportedFile(file);
    setParseError(null);
    setIsParsing(true);
    try {
      if (file.name.endsWith('.csv')) {
        // Parse CSV directly
        const text = await file.text();
        const lines = text.split(/\r?\n/).filter((l) => l.trim().length > 0);
        if (lines.length <= 1) {
          throw new Error('The CSV file does not contain any data rows.');
        }
        const headers = lines[0].split(',').map((h) => h.trim().toLowerCase().replace(/"/g, ''));
        const rows: BulkImportTripRow[] = [];

        for (let i = 1; i < lines.length; i++) {
          const cells = lines[i].split(',').map((c) => c.trim().replace(/"/g, ''));
          if (cells.length === 0 || !cells[0]) continue;

          const rowObj: any = {};
          headers.forEach((h, idx) => {
            const val = cells[idx] || '';
            if (h.includes('customer') || h.includes('company')) rowObj.customer_name = val;
            else if (h.includes('date') || h.includes('start')) rowObj.planned_start = val;
            else if (h.includes('driver')) rowObj.driver_name = val;
            else if (h.includes('vehicle') || h.includes('plate')) rowObj.vehicle_plate = val;
            else if (h.includes('origin') || h.includes('from')) rowObj.origin = val;
            else if (h.includes('dest') || h.includes('to')) rowObj.destination = val;
            else if (h.includes('category')) rowObj.rate_category = val;
            else if (h.includes('type')) rowObj.vehicle_type = val;
            else if (h.includes('amount') || h.includes('price')) rowObj.billing_amount = Number(val) || undefined;
          });

          if (rowObj.customer_name) {
            rows.push(rowObj);
          }
        }
        setParsedRows(rows);
      } else {
        // Parse Excel workbook with importUtils
        const result = await parseSheet(file, TRIP_COLUMNS, 'trip');
        const rows: BulkImportTripRow[] = result.rows.map((r) => ({
          customer_name: String(r.customer_name || ''),
          planned_start: r.planned_start ? String(r.planned_start) : undefined,
          driver_name: r.driver_name ? String(r.driver_name) : undefined,
          vehicle_plate: r.vehicle_plate ? String(r.vehicle_plate) : undefined,
          rate_category: r.rate_category ? String(r.rate_category) : undefined,
          vehicle_type: r.vehicle_type ? String(r.vehicle_type) : undefined,
          origin: r.origin ? String(r.origin) : undefined,
          destination: r.destination ? String(r.destination) : undefined,
          billing_amount: r.billing_amount ? Number(r.billing_amount) : undefined,
        })).filter((r) => Boolean(r.customer_name));
        setParsedRows(rows);
      }
    } catch (e: any) {
      setParseError(e.message || 'Failed to read spreadsheet file');
    } finally {
      setIsParsing(false);
    }
  };

  const downloadSampleCsv = () => {
    const csvContent =
      'Company Name,Trip Date,Driver Name,Vehicle Plate,Rate Category,Vehicle Type,Origin,Destination,Amount\n' +
      'ARKAN Logistics,2026-08-14,Ahmed Al-Ghamdi,KSA-1029,Standard,Flatbed,Riyadh Yard 1,Jeddah Port,3500\n' +
      'Saudi Aramco,2026-08-15,Mohammed Ali,KSA-8842,Express,Reefer,Dammam Hub,Riyadh Distribution,4200\n' +
      'SABIC Logistics,2026-08-16,,,Standard,Flatbed,Jubail Industrial,Yanbu Depot,2800\n';

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = 'MERCON_Bulk_Trips_Template.csv';
    link.click();
  };

  // ==========================================
  // BULK MUTATION & SUBMISSION
  // ==========================================
  const [submissionResult, setSubmissionResult] = useState<BulkImportResult | null>(null);
  const [pastDateModalOpen, setPastDateModalOpen] = useState(false);
  const [pendingRows, setPendingRows] = useState<BulkImportTripRow[] | null>(null);
  const [pastDateAnalysis, setPastDateAnalysis] = useState<PastDateAnalysis | null>(null);

  const executeBulkSubmit = (rows: BulkImportTripRow[]) => {
    const analysis = analyzePastDateRows(rows);
    if (analysis.hasPastTrips) {
      setPendingRows(rows);
      setPastDateAnalysis(analysis);
      setPastDateModalOpen(true);
    } else {
      bulkMutation.mutate(rows);
    }
  };

  const handlePastDateConfirm = (selectedStatus: TripStatus) => {
    if (!pendingRows) return;
    const finalRows = applyPastStatusToRows(pendingRows, selectedStatus);
    setPastDateModalOpen(false);
    setPendingRows(null);
    bulkMutation.mutate(finalRows);
  };

  const bulkMutation = useMutation({
    mutationFn: (rows: BulkImportTripRow[]) => tripService.bulkImport(rows),
    onSuccess: (data) => {
      setSubmissionResult(data);
      queryClient.invalidateQueries({ queryKey: ['trips'] });
      queryClient.invalidateQueries({ queryKey: ['rate-cards'] });
      queryClient.invalidateQueries({ queryKey: ['rate-cards-summary'] });
      queryClient.invalidateQueries({ queryKey: ['rate-cards-customer-lookup'] });
      toast.success('Trips generated successfully.');
    },
  });

  const handleContractSubmit = async () => {
    if (!contractCustomer || contractSlots.length === 0) return;    // Save Quotations for slots where saveAsQuotation (or saveAsRateCard) is checked and billingAmount > 0
    const slotsToSaveAsQuotation = contractSlots.filter(
      (slot) => (slot.saveAsQuotation || slot.saveAsRateCard) && Number(slot.billingAmount) > 0
    );
    if (slotsToSaveAsQuotation.length > 0) {
      const { quotationService } = await import('@/services/quotationService');
      const { locationService } = await import('@/services/locationService');

      await Promise.all(
        slotsToSaveAsQuotation.map(async (slot) => {
          let origId = slot.originLocationId;
          let destId = slot.destinationLocationId;

          // Ensure origin location exists in MERCON locations directory
          if (!origId && slot.origin.trim()) {
            try {
              const createdOrig = await locationService.create({
                customerId: contractCustomer || 'default-customer-id',
                name: slot.origin.trim(),
                lat: slot.originLat ?? null,
                lng: slot.originLng ?? null,
              });
              origId = createdOrig.id;
            } catch (err) {
              console.error(`Failed to ensure origin location '${slot.origin}':`, err);
            }
          }

          // Ensure destination location exists in MERCON locations directory
          if (!destId && slot.destination.trim()) {
            try {
              const createdDest = await locationService.create({
                customerId: contractCustomer || 'default-customer-id',
                name: slot.destination.trim(),
                lat: slot.destinationLat ?? null,
                lng: slot.destinationLng ?? null,
              });
              destId = createdDest.id;
            } catch (err) {
              console.error(`Failed to ensure destination location '${slot.destination}':`, err);
            }
          }

          const intermediateStops = (slot.intermediateLocations || []).map((locVal, idx) => {
            const locId = slot.intermediateLocationIds?.[idx] || (isUuid(locVal) ? locVal : null);
            return {
              sequence: idx + 2,
              location_id: locId || null,
              source_label: locVal || null,
              stop_type: 'Dropoff',
            };
          });

          const quotationStops = [
            { sequence: 1, location_id: origId || null, source_label: slot.origin.trim() || null, stop_type: 'Pickup' },
            ...intermediateStops,
            { sequence: intermediateStops.length + 2, location_id: destId || null, source_label: slot.destination.trim() || null, stop_type: 'Dropoff' },
          ];

          return quotationService
            .create({
              name: `${slot.origin.trim() || 'Origin'} → ${slot.destination.trim() || 'Destination'}`,
              rate: Number(slot.billingAmount),
              base_price: Number(slot.billingAmount),
              driver_payout: Number(slot.tripCharges) || null,
              customerId: contractCustomer,
              origin_location_id: origId || null,
              destination_location_id: destId || null,
              origin_name: origId ? null : slot.origin.trim() || null,
              destination_name: destId ? null : slot.destination.trim() || null,
              origin_lat: slot.originLat ?? null,
              origin_lng: slot.originLng ?? null,
              destination_lat: slot.destinationLat ?? null,
              destination_lng: slot.destinationLng ?? null,
              vehicle_type: contractVehicleType || null,
              line_type: contractRateCategory || null,
              billing_type: contractBillingType || null,
              pricing_basis: 'Flat Rate',
              stops: quotationStops,
              reason: slot.rateReason?.trim() || `Created during trip dispatch for ${slot.origin || 'origin'} → ${slot.destination || 'destination'} (${contractVehicleType || 'Standard'})`,
              source: 'TRIP_CREATION',
            })
            .then((res) => {
              toast.success(`Quotation '${res.name || slot.origin + ' → ' + slot.destination}' saved to Quotations ledger!`);
              return res;
            })
            .catch((err: any) => {
              const errMsg = err.response?.data?.error?.message || err.message || 'Unknown error';
              console.error(`Failed to save quotation for slot ${slot.id}:`, err);
              toast.error(`Couldn't save quotation for ${slot.origin} → ${slot.destination}: ${errMsg}`);
            });
        })
      );

      // Invalidate all quotation & location queries immediately
      queryClient.invalidateQueries({ queryKey: ['quotations'] });
      queryClient.invalidateQueries({ queryKey: ['quotations-select'] });
      queryClient.invalidateQueries({ queryKey: ['quotations-all'] });
      queryClient.invalidateQueries({ queryKey: ['rate-cards'] });
      queryClient.invalidateQueries({ queryKey: ['rate-card-lookup'] });
      queryClient.invalidateQueries({ queryKey: ['locations-list'] });
    }

    const rows: BulkImportTripRow[] = [];

    contractSlots.forEach((slot) => {
      const date = slot.date || new Date().toISOString().slice(0, 10);
      const assignment = dayAssignments[slot.id] || { driverId: '', vehicleId: '' };

      const outboundStops = slot.intermediateLocations.map((s) => s.trim()).filter(Boolean);
      const returnStops = (slot.returnIntermediateLocations || []).map((s) => s.trim()).filter(Boolean);

      const outboundFeesSum = (slot.intermediateStopFees || []).reduce((sum, f) => sum + (Number(f) || 0), 0);
      const returnFeesSum = (slot.returnIntermediateStopFees || []).reduce((sum, f) => sum + (Number(f) || 0), 0);
      const baseAmount = Number(slot.billingAmount) || 0;
      const totalAmount = baseAmount + outboundFeesSum + returnFeesSum;

      let destString = slot.destination.trim();

      if (isRoundTripCategory(contractRateCategory)) {
        const returnStart = slot.returnOrigin?.trim() || slot.destination.trim();
        const returnEnd = slot.returnDestination?.trim() || slot.origin.trim();

        const outboundChain = outboundStops.length > 0 ? ` → ${outboundStops.join(' → ')}` : '';
        const returnChain = returnStops.length > 0 ? ` → ${returnStops.join(' → ')}` : '';

        destString = `${slot.destination.trim()}${outboundChain} [RETURN: ${returnStart}${returnChain} → ${returnEnd}]`;
      } else if (outboundStops.length > 0) {
        destString = `${slot.destination.trim()} → ${outboundStops.join(' → ')}`;
      }

      const dropoffDateVal = slot.dropoffDate || date;
      const planned_end_val = localDateTimeToUtcIso(dropoffDateVal, slot.dropoffTime, tz);

      if (assignmentType === 'third_party') {
        const costVal = thirdPartyCost ? Number(thirdPartyCost) : (Number(slot.tripCharges) || 0);
        rows.push({
          customer_id: contractCustomer,
          planned_start: localDateTimeToUtcIso(date, slot.pickupTime, tz),
          planned_end: planned_end_val,
          is_third_party: true,
          third_party_provider_id: thirdPartyProviderId || undefined,
          third_party_driver_name: thirdPartyDriverName.trim() || undefined,
          third_party_driver_phone: thirdPartyDriverPhone.trim() || undefined,
          third_party_vehicle_plate: thirdPartyVehiclePlate.trim() || undefined,
          third_party_vehicle_type: contractVehicleType || undefined,
          third_party_cost: costVal,
          trip_charges: costVal,
          rate_category: contractRateCategory || undefined,
          billing_type: contractBillingType || undefined,
          vehicle_type: contractVehicleType || undefined,
          origin: slot.origin.trim() || undefined,
          destination: destString || undefined,
          billing_amount: totalAmount > 0 ? totalAmount : undefined,
          rate_card_id: slot.rateCardId || undefined,
          status: 'Draft',
        });
      } else {
        const driverId = masterDriver && masterDriver !== 'unassigned' ? masterDriver : (assignment.driverId || undefined);
        const vehicleId = masterVehicle && masterVehicle !== 'unassigned' ? masterVehicle : (assignment.vehicleId || undefined);
        const slotTripCharges = Number(slot.tripCharges) || 0;
        rows.push({
          customer_id: contractCustomer,
          planned_start: localDateTimeToUtcIso(date, slot.pickupTime, tz),
          planned_end: planned_end_val,
          driver_id: driverId,
          vehicle_id: vehicleId,
          rate_category: contractRateCategory || undefined,
          billing_type: contractBillingType || undefined,
          vehicle_type: contractVehicleType || undefined,
          origin: slot.origin.trim() || undefined,
          destination: destString || undefined,
          billing_amount: totalAmount > 0 ? totalAmount : undefined,
          trip_charges: slotTripCharges > 0 ? slotTripCharges : undefined,
          rate_card_id: slot.rateCardId || undefined,
          status: 'Draft',
        });
      }
    });

    executeBulkSubmit(rows);
  };

  const handleGridSubmit = () => {
    const validRows = gridRows.filter((r) => r.customerId && r.date);
    if (validRows.length === 0) return;

    const rows: BulkImportTripRow[] = validRows.map((r) => ({
      customer_id: r.customerId,
      planned_start: r.date,
      driver_id: r.driverId || undefined,
      vehicle_id: r.vehicleId || undefined,
      rate_category: r.rateCategory || undefined,
      vehicle_type: r.vehicleType || undefined,
      origin: r.origin.trim() || undefined,
      destination: r.destination.trim() || undefined,
      billing_amount: r.amount ? Number(r.amount) : undefined,
      status: 'Draft',
    }));

    executeBulkSubmit(rows);
  };

  const handleFileSubmit = () => {
    if (parsedRows.length === 0) return;
    executeBulkSubmit(parsedRows);
  };

  const resetAll = () => {
    setContractStep(1);
    setSelectedDates([]);
    setDayAssignments({});
    setSubmissionResult(null);
    setParsedRows([]);
    setImportedFile(null);
    setParseError(null);
    bulkMutation.reset();
  };

  const handleDialogClose = () => {
    resetAll();
    navigate('/trips');
  };

  const handleDriverCreated = (newDriver: Driver) => {
    queryClient.invalidateQueries({ queryKey: ['drivers'] });
    queryClient.invalidateQueries({ queryKey: ['drivers-select'] });
    if (assignMode === 'single') {
      setMasterDriver(newDriver.id);
    } else {
      setLoopDriverA(newDriver.id);
    }
    toast.success(`Driver ${newDriver.first_name} ${newDriver.last_name} created successfully.`);
  };

  // Local Storage Draft Persistence
  const [hasSavedDraft, setHasSavedDraft] = useState(false);

  useEffect(() => {
    try {
      const saved = localStorage.getItem('mercon_trip_draft');
      if (saved) {
        setHasSavedDraft(true);
      }
    } catch (e) {
      console.warn('Failed to read draft from localStorage', e);
    }
  }, []);

  const restoreDraft = () => {
    try {
      const saved = localStorage.getItem('mercon_trip_draft');
      if (!saved) return;
      const data = JSON.parse(saved);
      if (data.contractCustomer) setContractCustomer(data.contractCustomer);
      if (data.contractRateCategory) setContractRateCategory(data.contractRateCategory);
      if (data.contractBillingType) setContractBillingType(data.contractBillingType);
      if (data.contractVehicleType) setContractVehicleType(data.contractVehicleType);
      if (data.contractSlots && data.contractSlots.length > 0) setContractSlots(data.contractSlots);
      if (data.masterDriver) setMasterDriver(data.masterDriver);
      if (data.masterVehicle) setMasterVehicle(data.masterVehicle);
      if (data.assignmentType) setAssignmentType(data.assignmentType);
      if (data.thirdPartyProviderId) setThirdPartyProviderId(data.thirdPartyProviderId);
      if (data.thirdPartyDriverName) setThirdPartyDriverName(data.thirdPartyDriverName);
      if (data.thirdPartyDriverPhone) setThirdPartyDriverPhone(data.thirdPartyDriverPhone);
      if (data.thirdPartyVehiclePlate) setThirdPartyVehiclePlate(data.thirdPartyVehiclePlate);
      if (data.thirdPartyCost) setThirdPartyCost(data.thirdPartyCost);
      setHasSavedDraft(false);
      toast.success('Unsaved trip draft restored successfully.');
    } catch (e) {
      toast.error('Failed to restore draft.');
    }
  };

  const discardDraft = () => {
    localStorage.removeItem('mercon_trip_draft');
    setHasSavedDraft(false);
    toast.info('Draft discarded.');
  };

  // Auto-save draft payload every 3 seconds
  useEffect(() => {
    const timer = setTimeout(() => {
      if (contractCustomer || contractSlots.some((s) => s.origin || s.destination)) {
        try {
          const draftPayload = {
            contractCustomer,
            contractRateCategory,
            contractVehicleType,
            contractSlots,
            masterDriver,
            masterVehicle,
            assignmentType,
            thirdPartyProviderId,
            thirdPartyDriverName,
            thirdPartyDriverPhone,
            thirdPartyVehiclePlate,
            thirdPartyCost,
            savedAt: new Date().toISOString(),
          };
          localStorage.setItem('mercon_trip_draft', JSON.stringify(draftPayload));
        } catch (e) {
          // ignore
        }
      }
    }, 3000);
    return () => clearTimeout(timer);
  }, [
    contractCustomer,
    contractRateCategory,
    contractVehicleType,
    contractSlots,
    masterDriver,
    masterVehicle,
    assignmentType,
    thirdPartyProviderId,
    thirdPartyDriverName,
    thirdPartyDriverPhone,
    thirdPartyVehiclePlate,
    thirdPartyCost,
  ]);

  // Step 1 Hotkeys for Frequent Shippers (keys 1, 2, 3, 4)
  useEffect(() => {
    if (contractStep !== 1 || activeTab !== 'contract') return;

    const handleStep1Hotkeys = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null;
      if (!target) return;
      const isTypingInInput =
        target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable;

      if (!isTypingInInput && ['1', '2', '3', '4'].includes(e.key)) {
        const idx = parseInt(e.key, 10) - 1;
        if (customers[idx]) {
          e.preventDefault();
          setContractCustomer(customers[idx].id);
          toast.success(`Selected shipper #${e.key}: ${customers[idx].name}`);
        }
      }
    };

    window.addEventListener('keydown', handleStep1Hotkeys);
    return () => window.removeEventListener('keydown', handleStep1Hotkeys);
  }, [contractStep, activeTab, customers]);

  // Financial Gross Margin Calculation Engine
  const marginMetrics = useMemo(() => {
    const totalBilling = contractSlots.reduce(
      (acc, s) => acc + (parseFloat(s.billingAmount) || 0),
      0
    );
    const driverPayout = contractSlots.reduce(
      (acc, s) => acc + (parseFloat(s.tripCharges) || 0),
      0
    );
    const carrierCost = assignmentType === 'third_party' ? parseFloat(thirdPartyCost) || 0 : 0;
    const totalCost = driverPayout + carrierCost;
    const profit = totalBilling - totalCost;
    const marginPct = totalBilling > 0 ? (profit / totalBilling) * 100 : 0;

    return {
      totalBilling,
      totalCost,
      profit,
      marginPct,
      isHigh: marginPct >= 20,
      isMedium: marginPct >= 5 && marginPct < 20,
      isLow: marginPct < 5,
    };
  }, [contractSlots, assignmentType, thirdPartyCost]);

  // Driver Conflict Check
  const driverConflictWarning = useMemo(() => {
    if (assignmentType !== 'own' || !masterDriver || masterDriver === 'unassigned') return null;
    const driverObj = drivers.find((d) => d.id === masterDriver);
    if (!driverObj) return null;

    const isOccupied =
      driverObj.status?.toLowerCase() === 'in transit' ||
      driverObj.status?.toLowerCase() === 'on trip' ||
      driverObj.status?.toLowerCase() === 'busy';

    if (isOccupied) {
      return `⚠️ Notice: ${driverObj.first_name} ${driverObj.last_name} is currently marked as "${driverObj.status}". Verify schedule before dispatching.`;
    }
    return null;
  }, [assignmentType, masterDriver, drivers]);

  // ERP Keyboard Shortcuts Integration
  useFormKeyboardShortcuts({
    onSave: () => {
      if (contractStep < 4) {
        if (isStepValid(contractStep)) {
          setContractStep((prev) => (prev + 1) as any);
        }
      } else {
        if (batchTripRows.length > 0 && isStepValid(3) && !bulkMutation.isPending) {
          handleContractSubmit();
        }
      }
    },
    onCancel: () => {
      if (contractStep > 1) {
        setContractStep((prev) => (prev - 1) as any);
      } else {
        handleDialogClose();
      }
    },
    isSubmitting: bulkMutation.isPending,
  });

  return (
    <DashboardLayout active="Trips" title="Create New Trip" hideBackButton>
      <div className="px-3 sm:px-6 pb-3 sm:pb-4 animate-fade-in max-w-[1300px] mx-auto w-full h-[calc(100dvh-105px)] flex flex-col min-h-0">
        <div className="w-full flex-1 overflow-hidden bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xl rounded-2xl flex flex-col min-h-0">

          {/* Combined Navigation & Stepper Bar */}
          <TripWizardHeader
            contractStep={form.contractStep}
            submissionResult={form.submissionResult}
            isStepValid={form.isStepValid}
            canNavigateToStep={form.canNavigateToStep}
            setContractStep={form.setContractStep}
            handleContractSubmit={form.handleContractSubmit}
            handleDialogClose={form.handleDialogClose}
            isPending={form.bulkMutation.isPending}
            batchTripRowsCount={form.batchTripRows.length}
            KbdBadge={KbdBadge}
          />

          {/* Local Draft Auto-Save Recovery Alert Banner (Only shown on Step 1 Customer) */}
          {form.hasSavedDraft && !form.submissionResult && form.contractStep === 1 && (
            <div className="bg-amber-50 border-b border-amber-200 px-5 py-2 flex items-center justify-between gap-3 text-xs shrink-0 animate-fade-in">
              <div className="flex items-center gap-2 text-amber-900 font-medium">
                <Clock className="w-4 h-4 text-amber-600 shrink-0" />
                <span>Unsaved trip draft detected from your previous session.</span>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <Button
                  type="button"
                  size="sm"
                  tabIndex={-1}
                  onClick={form.restoreDraft}
                  className="h-7 text-xs font-bold bg-amber-600 hover:bg-amber-700 text-white rounded-lg px-3 border-0 shadow-2xs"
                >
                  Restore Draft
                </Button>
                <Button
                  type="button"
                  size="sm"
                  variant="ghost"
                  tabIndex={-1}
                  onClick={form.discardDraft}
                  className="h-7 text-xs font-bold text-amber-800 hover:bg-amber-100 rounded-lg px-2"
                >
                  Discard
                </Button>
              </div>
            </div>
          )}

          {/* Modal Body */}
          <div className="flex-1 overflow-y-auto p-4 sm:p-5 min-h-0 custom-scrollbar">
            {/* Submission Result Screen */}
            {form.submissionResult ? (
              <div className="flex flex-col items-center justify-center py-6 text-center animate-fade-in">
                <CheckCircle2 className="w-8 h-8 text-emerald-600 shrink-0" />
                <h3 className="text-xl font-bold text-[#111111]">
                  {form.submissionResult.imported} {form.submissionResult.imported === 1 ? 'Trip' : 'Trips'} Created Successfully!
                </h3>
                <p className="text-xs text-[#6E6E80] mt-1.5 max-w-md">
                  All trips have been added to the database and are now populated on the Monthly Board view.
                </p>

                {form.submissionResult.failed > 0 && (
                  <div className="mt-4 p-3 rounded-xl bg-amber-50 border border-amber-200 text-xs text-amber-800 text-left max-w-lg w-full">
                    <p className="font-bold flex items-center gap-1.5 mb-1 text-amber-900">
                      <AlertCircle className="h-4 w-4" /> {form.submissionResult.failed} rows failed validation:
                    </p>
                    <ul className="list-disc list-inside space-y-0.5 text-[11px] text-amber-700">
                      {form.submissionResult.results
                        .filter((r) => !r.success)
                        .slice(0, 5)
                        .map((f, idx) => (
                          <li key={idx}>Row {f.row}: {f.error}</li>
                        ))}
                    </ul>
                  </div>
                )}

                {/* Reference ID chips */}
                <div className="mt-6 p-4 rounded-xl bg-slate-50 border border-black/[0.06] max-w-xl w-full text-left">
                  <p className="text-[11px] font-bold text-[#9898A4] uppercase tracking-wider mb-2">
                    Generated Trip References
                  </p>
                  <div className="flex flex-wrap gap-1.5 max-h-32 overflow-y-auto">
                    {form.submissionResult.results
                      .filter((r) => r.success && r.ref_id)
                      .map((r, idx) => (
                        <span
                          key={idx}
                          className="inline-flex items-center px-2.5 py-1 rounded-md bg-white border border-black/10 text-xs font-bold text-[#111111]"
                        >
                          {r.ref_id}
                        </span>
                      ))}
                  </div>
                </div>

                <div className="flex items-center gap-3 mt-8">
                  <Button
                    variant="outline"
                    onClick={form.resetAll}
                    className="rounded-xl border-black/10 text-xs font-semibold h-10 px-5"
                  >
                    Create More Trips
                  </Button>
                  <Button
                    onClick={form.handleDialogClose}
                    className="rounded-xl bg-brand hover:bg-[#d13d0d] text-white text-xs font-bold h-10 px-6"
                  >
                    Close & View Board
                  </Button>
                </div>
              </div>
            ) : (
              <>
                {/* TAB 1: MONTHLY CONTRACT BATCH GENERATOR */}
                {form.activeTab === 'contract' && (
                  <div className="pb-80">
                    {/* STEP 1: CUSTOMER & CATEGORY */}
                    {form.contractStep === 1 && (
                      <TripStep1Customer
                        contractCustomer={form.contractCustomer}
                        setContractCustomer={form.setContractCustomer}
                        customers={form.customers}
                        setPreviewCustomer={form.setPreviewCustomer}
                        setEditCustomer={form.setEditCustomer}
                        setIsCreateCustomerOpen={form.setIsCreateCustomerOpen}
                      />
                    )}

                    {/* STEP 2: TRIP / ROUTE */}
                    {form.contractStep === 2 && (
                      <TripStep2Route
                        contractSlots={form.contractSlots}
                        contractCustomer={form.contractCustomer}
                        contractRateCategory={form.contractRateCategory}
                        handleAddSlotIntermediate={form.handleAddSlotIntermediate}
                        handleRemoveTripSlot={form.handleRemoveTripSlot}
                        handleSlotLocationChange={form.handleSlotLocationChange}
                        handleUpdateTripSlot={form.handleUpdateTripSlot}
                        handleRemoveSlotIntermediate={form.handleRemoveSlotIntermediate}
                        handleUpdateSlotIntermediate={form.handleUpdateSlotIntermediate}
                        handleUpdateSlotIntermediateFee={form.handleUpdateSlotIntermediateFee}
                        handleAddSlotReturnIntermediate={form.handleAddSlotReturnIntermediate}
                        handleRemoveSlotReturnIntermediate={form.handleRemoveSlotReturnIntermediate}
                        handleUpdateSlotReturnIntermediate={form.handleUpdateSlotReturnIntermediate}
                        handleUpdateSlotReturnIntermediateFee={form.handleUpdateSlotReturnIntermediateFee}
                        recentRoutesList={form.recentRoutesList}
                        handleApplyRecentRoute={form.handleApplyRecentRoute}
                        isRoundTripCategory={isRoundTripCategory}
                      />
                    )}

                    {/* STEP 3: SERVICE & ASSIGNMENT */}
                    {form.contractStep === 3 && (
                      <TripStep3Assignment
                        contractBillingType={form.contractBillingType}
                        setContractBillingType={form.setContractBillingType}
                        contractRateCategory={form.contractRateCategory}
                        setContractRateCategory={form.setContractRateCategory}
                        contractVehicleType={form.contractVehicleType}
                        setContractVehicleType={form.setContractVehicleType}
                        setIsVehicleTypeEditable={form.setIsVehicleTypeEditable}
                        triggerRateLookupForSlots={form.triggerRateLookupForSlots}
                        normalizeBillingType={normalizeBillingType}
                        normalizeRateCategory={normalizeRateCategory}
                        normalizeVehicleClass={normalizeVehicleClass}
                        contractSlots={form.contractSlots}
                        getAvailableRateCardsForLane={form.getAvailableRateCardsForLane}
                        setIsManualRateOverride={form.setIsManualRateOverride}
                        handleOpenCreateQuotation={form.handleOpenCreateQuotation}
                        assignmentType={form.assignmentType}
                        setAssignmentType={form.setAssignmentType}
                        recentDriversList={form.recentDriversList}
                        contractCustomer={form.contractCustomer}
                        masterDriver={form.masterDriver}
                        masterVehicle={form.masterVehicle}
                        handleApplyRecentDriver={form.handleApplyRecentDriver}
                        getVehicleTypeFromCapacity={getVehicleTypeFromCapacity}
                        setIsCreateDriverOpen={form.setIsCreateDriverOpen}
                        drivers={form.drivers}
                        driverOptions={form.driverOptions}
                        handleDriverChange={form.handleDriverChange}
                        vehicles={form.vehicles}
                        vehicleOptions={form.vehicleOptions}
                        handleVehicleChange={form.handleVehicleChange}
                        getCompatibilityRuleForClass={form.getCompatibilityRuleForClass as any}
                        thirdPartyProviderId={form.thirdPartyProviderId}
                        setThirdPartyProviderId={form.setThirdPartyProviderId}
                        thirdPartyProviders={form.thirdPartyProviders}
                        thirdPartyVehiclePlate={form.thirdPartyVehiclePlate}
                        setThirdPartyVehiclePlate={form.setThirdPartyVehiclePlate}
                        thirdPartyDriverName={form.thirdPartyDriverName}
                        setThirdPartyDriverName={form.setThirdPartyDriverName}
                        marginMetrics={form.marginMetrics}
                      />
                    )}

                    {/* STEP 4: REVIEW & CONFIRM */}
                    {form.contractStep === 4 && (
                      <TripStep4Summary
                        contractSlots={form.contractSlots}
                        contractCustomer={form.contractCustomer}
                        masterDriver={form.masterDriver}
                        masterVehicle={form.masterVehicle}
                        assignmentType={form.assignmentType}
                        thirdPartyProviderId={form.thirdPartyProviderId}
                        thirdPartyDriverName={form.thirdPartyDriverName}
                        thirdPartyVehiclePlate={form.thirdPartyVehiclePlate}
                        thirdPartyCost={form.thirdPartyCost}
                        contractBillingType={form.contractBillingType}
                        contractVehicleType={form.contractVehicleType}
                        customers={form.customers}
                        drivers={form.drivers}
                        vehicles={form.vehicles}
                        thirdPartyProviders={form.thirdPartyProviders}
                        normalizeBillingType={normalizeBillingType}
                        getVehicleTypeFromCapacity={getVehicleTypeFromCapacity}
                        setPreviewCustomer={form.setPreviewCustomer}
                        setPreviewDriver={form.setPreviewDriver}
                        setPreviewVehicle={form.setPreviewVehicle}
                        DriverAvatar={DriverAvatar}
                        MapBoundsAdjuster={MapBoundsAdjuster}
                        pickupMarkerIcon={pickupMarkerIcon}
                        dropoffMarkerIcon={dropoffMarkerIcon}
                      />
                    )}
                  </div>
                )}

                {/* TAB 2: QUICK GRID ENTRY */}
                {form.activeTab === 'grid' && (
                  <TripBatchGeneratorTab
                    gridRows={form.gridRows}
                    setGridRows={form.setGridRows}
                    generateEmptyRow={form.generateEmptyRow}
                    updateGridRow={form.updateGridRow}
                    duplicateGridRow={form.duplicateGridRow}
                    deleteGridRow={form.deleteGridRow}
                    handleGridSubmit={form.handleGridSubmit}
                    customers={form.customers}
                    drivers={form.drivers}
                    vehicles={form.vehicles}
                    getVehicleTypeFromCapacity={getVehicleTypeFromCapacity}
                    isPending={form.bulkMutation.isPending}
                  />
                )}

                {/* TAB 3: CSV / EXCEL FILE IMPORT */}
                {form.activeTab === 'file' && (
                  <TripBulkImportTab
                    downloadSampleCsv={form.downloadSampleCsv}
                    fileInputRef={form.fileInputRef}
                    handleFileUpload={form.handleFileUpload}
                    importedFile={form.importedFile}
                    setImportedFile={form.setImportedFile}
                    parsedRows={form.parsedRows}
                    setParsedRows={form.setParsedRows}
                    parseError={form.parseError}
                    handleFileSubmit={form.handleFileSubmit}
                    isPending={form.bulkMutation.isPending}
                  />
                )}
              </>
            )}
          </div>

        </div>
      </div>

      <CreateDriverModal
        isOpen={form.isCreateDriverOpen}
        onClose={() => form.setIsCreateDriverOpen(false)}
        onSuccess={form.handleDriverCreated}
      />
      <CreateVehicleModal
        isOpen={form.isCreateVehicleOpen}
        onClose={() => form.setIsCreateVehicleOpen(false)}
        onSuccess={(v) => {
          form.setMasterVehicle(v.id);
          form.queryClient.invalidateQueries({ queryKey: ['vehicles'] });
        }}
      />
      <CreateCustomerModal
        isOpen={form.isCreateCustomerOpen}
        onClose={() => form.setIsCreateCustomerOpen(false)}
        onSuccess={(c) => {
          form.setContractCustomer(c.name);
          form.queryClient.invalidateQueries({ queryKey: ['customers'] });
        }}
      />
      <PastDateTripConfirmModal
        open={form.pastDateModalOpen}
        onClose={() => form.setPastDateModalOpen(false)}
        onConfirm={form.handlePastDateConfirm}
        analysis={form.pastDateAnalysis}
        isSubmitting={form.bulkMutation.isPending}
      />
      <CreateThirdPartyModal
        isOpen={form.isCreateProviderOpen}
        onClose={() => form.setIsCreateProviderOpen(false)}
        onSuccess={(provider) => {
          form.setThirdPartyProviderId(provider.id);
          form.queryClient.invalidateQueries({ queryKey: ['third-party-providers-select'] });
        }}
      />
      <VehiclePreviewModal
        vehicle={form.previewVehicle}
        isOpen={!!form.previewVehicle}
        onClose={() => form.setPreviewVehicle(null)}
        onEdit={(v) => form.setEditVehicle(v)}
      />
      <CustomerPreviewModal
        customer={form.previewCustomer}
        isOpen={!!form.previewCustomer}
        onClose={() => form.setPreviewCustomer(null)}
        onEdit={(c) => form.setEditCustomer(c)}
      />
      <ThirdPartyPreviewModal
        provider={form.previewThirdParty}
        isOpen={!!form.previewThirdParty}
        onClose={() => form.setPreviewThirdParty(null)}
        onEdit={(p) => form.setEditThirdParty(p)}
      />
      <DriverPreviewModal
        driver={form.previewDriver}
        isOpen={!!form.previewDriver}
        onClose={() => form.setPreviewDriver(null)}
        onEdit={(d) => form.setEditDriver(d)}
      />
      {form.editCustomer && (
        <EditCustomerModal
          isOpen={!!form.editCustomer}
          customer={form.editCustomer}
          onClose={() => form.setEditCustomer(null)}
        />
      )}
      {form.editThirdParty && (
        <EditThirdPartyModal
          isOpen={!!form.editThirdParty}
          provider={form.editThirdParty}
          onClose={() => form.setEditThirdParty(null)}
        />
      )}
      {form.editDriver && (
        <EditDriverModal
          isOpen={!!form.editDriver}
          driver={form.editDriver}
          onClose={() => form.setEditDriver(null)}
        />
      )}
      {form.editVehicle && (
        <EditVehicleModal
          isOpen={!!form.editVehicle}
          vehicle={form.editVehicle}
          onClose={() => form.setEditVehicle(null)}
        />
      )}
    </DashboardLayout>
  );
}
