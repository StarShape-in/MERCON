import { useState, useEffect, useMemo, useRef } from 'react';
import { toast } from 'sonner';
import { useQuery, useQueryClient, keepPreviousData } from '@tanstack/react-query';
import { useNavigate, useSearchParams } from 'react-router-dom';
import {
  Plus,
  Download,
  Upload,
  Edit2,
  Trash2,
  Navigation,
  Search,
  RefreshCw,
  Truck,
  User,
  MapPin,
  Layers,
  Filter,
  CheckCircle2,
  AlertTriangle,
  RotateCw,
  Calendar as CalendarIcon,
  Building2,
  FileText,
  FileSpreadsheet,
  ChevronDown,
  X,
  MoreHorizontal,
  ArrowDown,
  ArrowUp,
  Kanban,
  LayoutList,
  Receipt,
  Users,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';
import { TruckMotion, CheckBadge, RouteLine, ClockIcon, LoadingBox, RiskAlert } from '@/components/ui/kpi-icons';

import { format, subDays, addDays } from 'date-fns';
import { DateRange } from 'react-day-picker';
import { exportExcelTable, exportPDFTable, parseCSVFile } from '@/utils/exportUtils';
import ExportModal, { ExportColumn, ExportFilter } from '@/components/ui/ExportModal';
import { parseSheet, TRIP_COLUMNS } from '@/utils/importUtils';
import { tripService, Trip, TripStatus, BulkImportTripRow, BulkImportResult, getTripPayloadCapacity, getTripRateCategory, downloadTripExport } from '@/services/tripService';
import { driverService } from '@/services/driverService';
import { vehicleService } from '@/services/vehicleService';
import { useDebouncedValue } from '@/hooks/useDebouncedValue';
import { TripDateFilterPicker, DateFilterType } from '@/components/trips/TripDateFilterPicker';
import { useDeploymentTimezone, formatInDeploymentTz } from '@/lib/datetime';
import { TaxonomyBadge } from '@/components/common/TaxonomyBadge';

import DashboardLayout from '@/components/layout/DashboardLayout';
import DataTable from '@/components/ui/DataTable';
import StatusBadge from '@/components/ui/StatusBadge';
import DeletedBadge from '@/components/ui/DeletedBadge';
import Btn from '@/components/ui/Btn';
import KpiCard from '@/components/ui/KpiCard';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { WhatsAppIcon } from '@/components/ui/whatsapp-icon';
import { SortDropdown, SortOption } from '@/components/ui/SortDropdown';
import { analyzePastDateRows, applyPastStatusToRows, PastDateAnalysis } from '@/utils/pastDateTripUtils';
import PastDateTripConfirmModal from '@/components/trips/PastDateTripConfirmModal';


type TripSortOption = 'latest' | 'oldest' | 'price_desc' | 'price_asc' | 'ref_id_asc' | 'ref_id_desc' | 'customer_asc' | 'status';

const TRIP_SORT_OPTIONS: SortOption<TripSortOption>[] = [
  { value: 'latest', label: 'Newest Added', icon: <ArrowDown className="w-3.5 h-3.5 text-blue-600" /> },
  { value: 'oldest', label: 'Oldest Added', icon: <ArrowUp className="w-3.5 h-3.5 text-amber-600" /> },
  { value: 'price_desc', label: 'Billing Price (High → Low)', icon: <ArrowDown className="w-3.5 h-3.5 text-emerald-600" /> },
  { value: 'price_asc', label: 'Billing Price (Low → High)', icon: <ArrowUp className="w-3.5 h-3.5 text-emerald-600" /> },
];
import ConfirmModal from '@/components/ui/ConfirmModal';
import PostTripSettlementModal from '@/components/trips/PostTripSettlementModal';
import TripKanbanBoard, { TripKanbanBoardRef } from '@/components/trips/kanban/TripKanbanBoard';
import VehiclePreviewModal from '@/components/fleet/VehiclePreviewModal';
import CustomerPreviewModal from '@/components/customers/CustomerPreviewModal';
import ThirdPartyPreviewModal from '@/components/third-party/ThirdPartyPreviewModal';
import DriverPreviewModal from '@/components/drivers/DriverPreviewModal';
import CreateVehicleModal from '@/components/fleet/CreateVehicleModal';
import CreateCustomerModal from '@/components/customers/CreateCustomerModal';
import CreateDriverModal from '@/components/drivers/CreateDriverModal';
import EditVehicleModal from '@/components/fleet/EditVehicleModal';
import EditCustomerModal from '@/components/customers/EditCustomerModal';
import EditThirdPartyModal from '@/components/third-party/EditThirdPartyModal';
import EditDriverModal from '@/components/drivers/EditDriverModal';
import { Combobox } from '@/components/ui/combobox';

import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectSeparator,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  DropdownMenuSub,
  DropdownMenuSubTrigger,
  DropdownMenuSubContent,
  DropdownMenuPortal,
} from '@/components/ui/dropdown-menu';

type ExportStatusGroup = 'All' | 'Completed' | 'InTransit' | 'NotCompleted';

const EXPORT_STATUS_GROUPS: { label: string; value: ExportStatusGroup }[] = [
  { label: 'All Trips', value: 'All' },
  { label: 'Completed / Delivered Only', value: 'Completed' },
  { label: 'In Transit Right Now', value: 'InTransit' },
  { label: 'Not Completed', value: 'NotCompleted' },
];

const matchesExportStatusGroup = (status: TripStatus, group: ExportStatusGroup) => {
  if (group === 'All') return true;
  if (group === 'Completed') return status === 'Completed' || status === 'AtDelivery' || status === 'Invoiced';
  if (group === 'InTransit') return status === 'InTransit';
  if (group === 'NotCompleted') return status !== 'Completed' && status !== 'AtDelivery' && status !== 'Invoiced';
  return true;
};

const TRIP_EXPORT_HEADERS = [
  'Job / Ref ID', 'Status', 'Customer', 'Pickup Location', 'Dropoff Location', 'Driver', 'Vehicle',
  'Payload Capacity', 'Vehicle Class', 'Rate Card', 'Planned Start', 'Actual Start', 'Planned End', 'Actual End',
  'Driver Charge (SAR)', 'Billing Amount (SAR)', 'Carrier / Provider',
];

const formatExportDate = (value: string | null, tz: string = 'Asia/Riyadh') => (value ? formatInDeploymentTz(value, tz, 'yyyy-MM-dd') : '');

const getPickupInfo = (trip: Trip) => {
  const pickup = trip.stops?.find((s) => s.stop_type === 'Pickup') || trip.stops?.[0];
  if (!pickup) return { name: '—', address: null };
  const name = pickup.location_name || pickup.location?.name || pickup.location_address || pickup.location?.address || (pickup.location_lat ? `${pickup.location_lat.toFixed(3)}, ${pickup.location_lng.toFixed(3)}` : '—');
  const address = (pickup.location_name && (pickup.location_address || pickup.location?.address)) ? (pickup.location_address || pickup.location?.address) : null;
  return { name, address };
};

const getDropoffInfo = (trip: Trip) => {
  const dropoff = (trip.stops && trip.stops.length > 1) ? trip.stops[trip.stops.length - 1] : (trip.stops?.find((s) => s.stop_type === 'Dropoff'));
  if (!dropoff) return { name: '—', address: null };
  let name = dropoff.location_name || dropoff.location?.name || dropoff.location_address || dropoff.location?.address || (dropoff.location_lat ? `${dropoff.location_lat.toFixed(3)}, ${dropoff.location_lng.toFixed(3)}` : '—');
  name = name.replace(/🔁\s*/g, '').trim();
  const address = (dropoff.location_name && (dropoff.location_address || dropoff.location?.address)) ? (dropoff.location_address || dropoff.location?.address) : null;
  return { name, address };
};

const TRIP_EXPORT_COLUMNS: ExportColumn<Trip>[] = [
  { id: 'ref_id', label: 'Job / Ref ID', accessor: (t) => t.ref_id || '' },
  { id: 'status', label: 'Status', accessor: (t) => t.status || '' },
  { id: 'customer', label: 'Customer', accessor: (t) => t.customer?.name || 'Unassigned' },
  { id: 'pickup', label: 'Pickup Location', accessor: (t) => {
      const p = getPickupInfo(t);
      return p.name !== '—' ? (p.address ? `${p.name} (${p.address})` : p.name) : '—';
  } },
  { id: 'dropoff', label: 'Dropoff Location', accessor: (t) => {
      const d = getDropoffInfo(t);
      return d.name !== '—' ? (d.address ? `${d.name} (${d.address})` : d.name) : '—';
  } },
  { id: 'driver', label: 'Driver', accessor: (t) => t.is_third_party
      ? (t.third_party_driver_name ? `${t.third_party_driver_name} (${t.thirdPartyProvider?.name || '3PL Carrier'})` : (t.thirdPartyProvider?.name || '3PL Driver'))
      : (t.driver ? `${t.driver.first_name} ${t.driver.last_name}` : 'Unassigned')
  },
  { id: 'vehicle', label: 'Vehicle', accessor: (t) => t.is_third_party
      ? (t.third_party_vehicle_plate || '3PL Vehicle')
      : (t.vehicle?.plate_number || 'Unassigned')
  },
  { id: 'capacity', label: 'Payload Capacity', accessor: (t) => getTripPayloadCapacity(t) },
  { id: 'category', label: 'Vehicle Class', accessor: (t) => getTripRateCategory(t) },
  { id: 'rate_card', label: 'Rate Card', accessor: (t) => t.rateCard?.name || 'Manual Rate' },
  { id: 'planned_start', label: 'Planned Start', accessor: (t) => formatExportDate(t.planned_start) },
  { id: 'actual_start', label: 'Actual Start', accessor: (t) => formatExportDate(t.actual_start) },
  { id: 'planned_end', label: 'Planned End', accessor: (t) => formatExportDate(t.planned_end) },
  { id: 'actual_end', label: 'Actual End', accessor: (t) => formatExportDate(t.actual_end) },
  { id: 'trip_charges', label: 'Driver Charge (SAR)', accessor: (t) => Number(t.trip_charges || 0) },
  { id: 'billing_amount', label: 'Billing Rate (SAR)', accessor: (t) => Number(t.billing_amount || t.rateCard?.base_price || 0) },
  { id: 'carrier', label: 'Carrier / Provider', accessor: (t) => t.is_third_party
      ? (t.thirdPartyProvider?.name || t.carrier_name || '3PL Provider')
      : (t.carrier_name || 'MERCON LOGISTICS')
  },
];

const TRIP_EXPORT_FILTERS: ExportFilter<Trip>[] = [
  {
    id: 'status_group',
    label: 'Status Group',
    options: [
      { label: 'All Trips', value: 'All' },
      { label: 'Completed / Delivered Only', value: 'Completed' },
      { label: 'In Transit Right Now', value: 'InTransit' },
      { label: 'Not Completed', value: 'NotCompleted' },
    ],
    filterFn: (t, val) => matchesExportStatusGroup(t.status, val as ExportStatusGroup),
  },
  {
    id: 'is_3pl',
    label: 'Provider Type',
    options: [
      { label: 'All Providers', value: 'All' },
      { label: 'MERCON Fleet Only', value: 'Mercon' },
      { label: 'Third-Party (3PL) Only', value: '3PL' },
    ],
    filterFn: (t, val) => {
      const is3PL = !!(t.is_third_party || t.thirdPartyProviderId || (t.carrier_name && t.carrier_name !== 'MERCON LOGISTICS'));
      return val === '3PL' ? is3PL : !is3PL;
    },
  },
];

/**
 * Normalises a place or search string for tolerant phonetic matching:
 * handles Arabic/English transliterations (e.g. "dhamam" -> "dammam", "al-dammam" -> "dammam").
 */
const normalisePlace = (s: string) =>
  (s || '')
    .toLowerCase()
    .trim()
    .replace(/^al[\s-]+|^ad[\s-]+|^ar[\s-]+|^ash[\s-]+|^an[\s-]+/g, '')
    .replace(/dh/g, 'd')
    .replace(/th/g, 't')
    .replace(/kh/g, 'k')
    .replace(/[^a-z0-9]/g, '');

const ROUTE_CONNECTOR_SET = new Set(['to', 'from', 'via', 'ret', 'return', '-', '->', '>', ',']);

/**
 * Calculates a search relevance score for a trip given the user's query.
 * 
 * Key Ordering Rules:
 * 1. Searching a single city (e.g. "dammam"):
 *    - Trips starting from Dammam (Pickup / Origin location) appear FIRST (top priority score: +5000).
 *    - Trips ending in Dammam (Dropoff / Destination location) appear after Origin matches (score: +1500).
 * 2. Searching a route or city pair (e.g. "dammam to BURAIDAH", "dammam - BURAIDAH", "dammam BURAIDAH"):
 *    - Trips going from Dammam -> Buraidah (Origin = Dammam, Destination = Buraidah) appear FIRST (+10,000 pts).
 *    - Reverse direction trips (Buraidah -> Dammam) appear lower (+3,000 pts).
 */
const computeTripSearchRelevance = (trip: Trip, search: string): number => {
  if (!search || !search.trim()) return 0;
  const rawQuery = search.trim().toLowerCase();
  const normQuery = normalisePlace(rawQuery);

  // Extract location tokens (filtering connector words like 'to', 'from', 'via', '-')
  const rawTokens = rawQuery.split(/\s+/).filter(Boolean);
  const locationTokens = rawTokens.filter(t => !ROUTE_CONNECTOR_SET.has(t));
  const effectiveTokens = locationTokens.length > 0 ? locationTokens : rawTokens;

  let score = 0;

  // Extract Pickup Info (Origin)
  const pickup = getPickupInfo(trip);
  const pickupStop = trip.stops?.find((s) => s.stop_type === 'Pickup') || trip.stops?.[0];
  const pickupTexts = [
    pickup.name,
    pickup.address,
    pickupStop?.location_name,
    pickupStop?.location_address,
    pickupStop?.location?.name,
    pickupStop?.location?.city,
    pickupStop?.location?.state,
  ].filter(Boolean) as string[];

  // Extract Dropoff Info (Destination)
  const dropoff = getDropoffInfo(trip);
  const dropoffStop = (trip.stops && trip.stops.length > 1) ? trip.stops[trip.stops.length - 1] : (trip.stops?.find((s) => s.stop_type === 'Dropoff'));
  const dropoffTexts = [
    dropoff.name,
    dropoff.address,
    dropoffStop?.location_name,
    dropoffStop?.location_address,
    dropoffStop?.location?.name,
    dropoffStop?.location?.city,
    dropoffStop?.location?.state,
  ].filter(Boolean) as string[];

  // Extract Rate Card / Route Name
  const rateCardName = trip.rateCard?.name || (trip as any).route_name || '';

  const matchesTexts = (texts: string[], token: string): boolean => {
    const normTok = normalisePlace(token);
    return texts.some((text) => {
      const lower = text.toLowerCase();
      const norm = normalisePlace(text);
      return lower.includes(token) || (normTok && norm.includes(normTok));
    });
  };

  const startsWithTexts = (texts: string[], token: string): boolean => {
    const normTok = normalisePlace(token);
    return texts.some((text) => {
      const lower = text.toLowerCase();
      const norm = normalisePlace(text);
      return lower.startsWith(token) || (normTok && norm.startsWith(normTok));
    });
  };

  // 1. Route Pair Match (e.g., "dammam to BURAIDAH", "dammam - BURAIDAH")
  if (locationTokens.length >= 2) {
    const originTerm = locationTokens[0];
    const destTerm = locationTokens[1];

    const pickupMatchesOrigin = matchesTexts(pickupTexts, originTerm) || (rateCardName && matchesTexts([rateCardName.split(/[-–>]/)[0] || ''], originTerm));
    const dropoffMatchesDest = matchesTexts(dropoffTexts, destTerm) || (rateCardName && matchesTexts([rateCardName.split(/[-–>]/).slice(1).join(' ') || ''], destTerm));

    const pickupMatchesDest = matchesTexts(pickupTexts, destTerm);
    const dropoffMatchesOrigin = matchesTexts(dropoffTexts, originTerm);

    if (pickupMatchesOrigin && dropoffMatchesDest) {
      // Direct Route Match: Origin = dammam, Dest = buraidah (HIGHEST PRIORITY)
      score += 10000;
    } else if (pickupMatchesDest && dropoffMatchesOrigin) {
      // Reverse Route Match
      score += 3000;
    } else if (pickupMatchesOrigin) {
      score += 2000;
    } else if (dropoffMatchesDest) {
      score += 1500;
    }
  }

  // 2. Single Location / General Token Evaluation (e.g., "dammam")
  const primaryTerm = effectiveTokens[0] || rawQuery;

  // Origin / Pickup location matches (TOP PRIORITY for single place search)
  const pickupMatched = effectiveTokens.every(tok => matchesTexts(pickupTexts, tok));
  if (pickupMatched) {
    score += 5000; // Top score for Origin match!

    if (startsWithTexts(pickupTexts, primaryTerm)) {
      score += 1000; // Extra bonus if pickup name starts with search term
    }

    if (['InTransit', 'AtPickup', 'Dispatched', 'AtDelivery'].includes(trip.status)) {
      score += 300; // Active vehicle bonus
    }
  }

  // Rate card / Route Name origin bonus
  if (rateCardName) {
    const lowerRc = rateCardName.toLowerCase();
    const normRc = normalisePlace(rateCardName);
    if (lowerRc.includes(primaryTerm) || (normQuery && normRc.includes(normQuery))) {
      score += 800;
      if (lowerRc.startsWith(primaryTerm) || (normQuery && normRc.startsWith(normQuery))) {
        score += 1200;
      }
    }
  }

  // Destination / Dropoff location matches
  const dropoffMatched = effectiveTokens.every(tok => matchesTexts(dropoffTexts, tok));
  if (dropoffMatched) {
    score += 1500; // Dropoff match is ranked below Origin match
    if (startsWithTexts(dropoffTexts, primaryTerm)) {
      score += 300;
    }
  }

  // Other stops (intermediate waypoints)
  const otherStops = (trip.stops || []).filter(s => s !== pickupStop && s !== dropoffStop);
  const otherMatched = otherStops.some(s => {
    const texts = [s.location_name, s.location_address, s.location?.name, s.location?.city].filter(Boolean) as string[];
    return effectiveTokens.every(tok => matchesTexts(texts, tok));
  });
  if (otherMatched) {
    score += 500;
  }

  // Driver Name or Vehicle Plate Match
  const driverName = trip.is_third_party
    ? (trip.third_party_driver_name || trip.thirdPartyProvider?.name || '')
    : (trip.driver ? `${trip.driver.first_name} ${trip.driver.last_name} ${trip.driver.ref_id || ''}` : '');
  const vehiclePlate = trip.is_third_party
    ? (trip.third_party_vehicle_plate || '')
    : (trip.vehicle ? `${trip.vehicle.plate_number} ${trip.vehicle.ref_id || ''}` : '');

  if (effectiveTokens.every(tok => driverName.toLowerCase().includes(tok))) {
    score += 1500;
  }
  if (effectiveTokens.every(tok => vehiclePlate.toLowerCase().includes(tok))) {
    score += 1500;
  }

  // Trip Ref ID or Customer Name
  if (trip.ref_id && trip.ref_id.toLowerCase().includes(rawQuery)) {
    score += 8000;
  }
  if (trip.customer?.name && effectiveTokens.every(tok => trip.customer!.name.toLowerCase().includes(tok))) {
    score += 1200;
  }

  return score;
};

const tripsToExportRows = (trips: Trip[], tz: string = 'Asia/Riyadh') => trips.map(t => {
  const pickup = getPickupInfo(t);
  const dropoff = getDropoffInfo(t);
  const driverLabel = t.is_third_party
    ? (t.third_party_driver_name ? `${t.third_party_driver_name} (${t.thirdPartyProvider?.name || '3PL Carrier'})` : (t.thirdPartyProvider?.name || '3PL Driver'))
    : (t.driver ? `${t.driver.first_name} ${t.driver.last_name}` : 'Unassigned');
  const vehicleLabel = t.is_third_party
    ? (t.third_party_vehicle_plate || '3PL Vehicle')
    : (t.vehicle?.plate_number || 'Unassigned');
  const carrierLabel = t.is_third_party
    ? (t.thirdPartyProvider?.name || t.carrier_name || '3PL Provider')
    : (t.carrier_name || 'MERCON LOGISTICS');

  return [
    t.ref_id,
    t.status,
    t.customer?.name || 'Unassigned',
    pickup.name !== '—' ? (pickup.address ? `${pickup.name} (${pickup.address})` : pickup.name) : '—',
    dropoff.name !== '—' ? (dropoff.address ? `${dropoff.name} (${dropoff.address})` : dropoff.name) : '—',
    driverLabel,
    vehicleLabel,
    getTripPayloadCapacity(t),
    getTripRateCategory(t),
    t.rateCard?.name || 'Manual Rate',
    formatExportDate(t.planned_start, tz),
    formatExportDate(t.actual_start, tz),
    formatExportDate(t.planned_end, tz),
    formatExportDate(t.actual_end, tz),
    Number(t.trip_charges || 0),
    Number(t.billing_amount || t.rateCard?.base_price || 0),
    carrierLabel,
  ];
});

const tripsToExportRowsWithTotals = (trips: Trip[], tz: string = 'Asia/Riyadh') => {
  const rows = tripsToExportRows(trips, tz);
  if (!trips.length) return rows;
  const totalCharges = trips.reduce((sum, t) => sum + Number(t.trip_charges || 0), 0);
  const totalBilling = trips.reduce((sum, t) => sum + Number(t.billing_amount || t.rateCard?.base_price || 0), 0);
  const totalsRow = [
    'TOTALS',
    '',
    '',
    '',
    '',
    '',
    '',
    '',
    '',
    '',
    '',
    '',
    '',
    '',
    totalCharges,
    totalBilling,
    '',
  ];
  return [...rows, totalsRow];
};

const IMPORT_FIELD_ALIASES: Partial<Record<keyof BulkImportTripRow, string[]>> = {
  customer_name: ['customer_name', 'customer', 'client', 'client_name'],
  driver_name: ['driver_name', 'driver'],
  vehicle_plate: ['vehicle_plate', 'vehicle', 'plate_number', 'plate'],
  planned_start: ['planned_start', 'planned_start_date', 'start_date', 'planned_date'],
  rate_category: ['rate_category', 'category', 'rate_type', 'trip_type'],
  vehicle_type: ['vehicle_type', 'truck_type', 'body_type', 'asset_type'],
  billing_type: ['billing_type', 'billing', 'billing_frequency'],
  origin: ['origin', 'from', 'pickup', 'starting_point'],
  destination: ['destination', 'to', 'dropoff', 'drop_off'],
  billing_amount: ['billing_amount', 'amount', 'price', 'rate', 'charges'],
  trip_charges: ['trip_charges', 'driver_payout', 'driver_charge', 'payout'],
  status: ['status', 'trip_status'],
};

function pickImportField(row: Record<string, string>, field: keyof BulkImportTripRow): string {
  const aliases = IMPORT_FIELD_ALIASES[field] || [];
  for (const alias of aliases) {
    if (row[alias]) return row[alias];
  }
  return '';
}

export function normDriverString(s: string): string {
  if (!s) return '';
  let clean = s.trim().toLowerCase().replace(/[^\w\s]/g, ' ').replace(/\s+/g, ' ');
  return clean.split(' ').map(t => {
    if (['mohd', 'mhd', 'md', 'mohammed', 'mohammad', 'muhammed', 'muhammad'].includes(t)) return 'muhammad';
    return t;
  }).join(' ').trim();
}

export function findDriverCandidates(rawName: string, drivers: any[]): any[] {
  if (!rawName || !rawName.trim() || !drivers.length) return [];
  const rawClean = rawName.trim();
  const normalizedInput = normDriverString(rawClean);
  const inputTokens = normalizedInput.split(' ').filter(Boolean);

  const exact = drivers.filter(d => {
    const full = `${d.first_name || ''} ${d.last_name || ''}`.trim();
    return full.toLowerCase() === rawClean.toLowerCase() || (d.first_name || '').toLowerCase() === rawClean.toLowerCase();
  });
  if (exact.length > 0) return exact;

  const normMatch = drivers.filter(d => {
    const full = normDriverString(`${d.first_name || ''} ${d.last_name || ''}`);
    const fn = normDriverString(d.first_name || '');
    return full === normalizedInput || fn === normalizedInput;
  });
  if (normMatch.length > 0) return normMatch;

  const matches = drivers.filter(d => {
    const full = normDriverString(`${d.first_name || ''} ${d.last_name || ''}`);
    const tokens = full.split(' ').filter(Boolean);
    const matchedCount = inputTokens.filter(it => tokens.some(dt => dt === it || dt.includes(it) || it.includes(dt))).length;
    return matchedCount > 0 && matchedCount === inputTokens.length;
  });

  if (matches.length > 0) return matches;

  return drivers.filter(d => {
    const full = normDriverString(`${d.first_name || ''} ${d.last_name || ''}`);
    return full.includes(normalizedInput) || normalizedInput.includes(full);
  });
}

/** Builds a BulkImportTripRow from a raw parsed row, whichever key style it came in under
 *  (parseCSVFile's snake_case header row, or parseSheet's TRIP_COLUMNS field names). */
function toImportRow(row: Record<string, string | number>): BulkImportTripRow {
  const asStrRow = row as Record<string, string>;
  const get = (field: keyof BulkImportTripRow) => {
    const direct = row[field];
    if (direct !== undefined && direct !== null && String(direct).trim() !== '') return String(direct).trim();
    return pickImportField(asStrRow, field);
  };
  const amount = get('billing_amount');
  const payout = get('trip_charges');
  const statusRaw = get('status').trim().toLowerCase();
  const status = statusRaw === 'draft' ? 'Draft' : statusRaw === 'dispatched' ? 'Dispatched'
    : statusRaw === 'completed' ? 'Completed' : undefined;
  return {
    customer_name: get('customer_name'),
    driver_name: get('driver_name') || undefined,
    vehicle_plate: get('vehicle_plate') || undefined,
    planned_start: get('planned_start') || undefined,
    rate_category: get('rate_category') || undefined,
    vehicle_type: get('vehicle_type') || undefined,
    billing_type: get('billing_type') || undefined,
    origin: get('origin') || undefined,
    destination: get('destination') || undefined,
    billing_amount: amount ? Number(amount) : undefined,
    trip_charges: payout ? Number(payout) : undefined,
    status,
  };
}

function downloadImportTemplate() {
  const headers = [
    'Customer Name', 'Driver Name', 'Vehicle Plate', 'Planned Start',
    'Rate Category', 'Vehicle Type', 'Billing Type', 'Origin', 'Destination',
    'Billing Amount', 'Trip Charges',
  ];
  const example = [
    'Acme Trading Co.', 'John Doe', 'ABC-1234', '2026-08-15',
    'Single Trip', '10 TON', 'Extra', 'Riyadh', 'Jeddah', '1600', '450',
  ];
  const csv = '﻿' + [headers.join(','), example.join(',')].join('\n');
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.setAttribute('download', 'trips_import_template.csv');
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

type TripStatusFilter = TripStatus | 'All' | 'Active' | 'Issues' | 'Completed,Invoiced';

const STATUS_TABS: { label: string; value: TripStatusFilter }[] = [
  { label: 'All', value: 'All' },
  { label: 'Active', value: 'Active' },
  { label: 'Completed', value: 'Completed,Invoiced' },
  { label: 'Issues', value: 'Issues' },
];

const STATUS_LABELS: Record<string, string> = {
  All: 'All Statuses',
  Active: 'Active',
  Draft: 'Draft',
  Dispatched: 'Dispatched',
  AtPickup: 'Loading',
  InTransit: 'In Transit',
  AtDelivery: 'At Delivery',
  Completed: 'Completed',
  Invoiced: 'Invoiced',
  Cancelled: 'Cancelled'
};

const EXACT_SERVER_STATUSES = new Set<TripStatusFilter>([
  'Draft',
  'Dispatched',
  'AtPickup',
  'InTransit',
  'AtDelivery',
  'Completed',
  'Invoiced',
  'Cancelled',
]);

const getServerStatusFilter = (status: TripStatusFilter) => (
  EXACT_SERVER_STATUSES.has(status) ? status : undefined
);

const matchesTripStatusFilter = (trip: Trip, filter: TripStatusFilter) => {
  if (filter === 'All') return true;
  if (filter === 'Active') return ['Dispatched', 'AtPickup', 'InTransit', 'AtDelivery'].includes(trip.status);
  if (filter === 'Completed,Invoiced') return trip.status === 'Completed' || trip.status === 'Invoiced';
  if (filter === 'Issues') return trip.status === 'Cancelled';
  return trip.status === filter;
};

/**
 * Mirrors `ALLOWED_TRANSITIONS` in `backend/api-server/src/services/tripLifecycle.ts`
 * — the backend is the source of truth and re-checks this on every request, but
 * without a client-side copy the kanban board lets an operator drag a card
 * anywhere and only finds out it was rejected after a round-trip 400. Keep the
 * two in sync when the backend graph changes.
 *
 * A status missing from this map (a legacy value like 'Dispatched'/'AtPickup'
 * that predates the current TripStatus enum, or a value this map hasn't been
 * taught about yet) allows every transition — failing open, so an unrecognized
 * status blocks nothing and the backend remains the real gate either way.
 */
const KANBAN_ALLOWED_TRANSITIONS: Record<string, string[]> = {
  Draft: ['Scheduled', 'Loading', 'InTransit', 'Cancelled'],
  Scheduled: ['Draft', 'Loading', 'InTransit', 'Delayed', 'Cancelled'],
  Loading: ['Draft', 'Scheduled', 'InTransit', 'Delayed', 'Cancelled'],
  InTransit: ['Draft', 'Scheduled', 'Loading', 'Delayed', 'Completed', 'Cancelled'],
  Delayed: ['Draft', 'Scheduled', 'Loading', 'InTransit', 'Completed', 'Cancelled'],
  Completed: ['Invoiced', 'InTransit', 'Loading', 'Scheduled'],
  Invoiced: ['Completed'],
  Cancelled: ['Draft', 'Scheduled'],
};

const isKanbanTransitionAllowed = (from: string, to: string): boolean => {
  if (from === to) return true;
  const allowed = KANBAN_ALLOWED_TRANSITIONS[from];
  return allowed ? allowed.includes(to) : true;
};

export default function TripListPage() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const queryClient = useQueryClient();
  const tz = useDeploymentTimezone();

  const viewMode = searchParams.get('view') === 'table' ? 'table' : 'kanban';
  const setViewMode = (mode: 'table' | 'kanban') => {
    const newParams = new URLSearchParams(searchParams);
    if (mode === 'table') {
      newParams.set('view', 'table');
    } else {
      newParams.set('view', 'kanban');
    }
    setSearchParams(newParams, { replace: true });
  };

  const [localTripOverrides, setLocalTripOverrides] = useState<Record<string, TripStatus>>({});
  const kanbanBoardRef = useRef<TripKanbanBoardRef>(null);

  const [statusConfirmModal, setStatusConfirmModal] = useState<{
    isOpen: boolean;
    trip: Trip | null;
    targetStatus: TripStatus | string | null;
    title: string;
    message: string;
    confirmLabel: string;
    isLoading: boolean;
  }>({
    isOpen: false,
    trip: null,
    targetStatus: null,
    title: '',
    message: '',
    confirmLabel: 'Confirm',
    isLoading: false,
  });

  const [settlementModalTrip, setSettlementModalTrip] = useState<Trip | null>(null);

  const handleKanbanStatusChange = (trip: Trip, targetStatus: TripStatus | string) => {
    if (trip.status === targetStatus) return;

    if (!isKanbanTransitionAllowed(trip.status, String(targetStatus))) {
      toast.error(`Can't move ${trip.ref_id || 'this trip'} straight to ${targetStatus}`, {
        description: `It's currently ${trip.status} — move it through the stages in between first.`,
      });
      return;
    }

    const driverFirstName =
      trip.driver?.first_name ||
      (trip.third_party_driver_name ? trip.third_party_driver_name.split(' ')[0] : '') ||
      (trip.driver ? `${trip.driver.first_name}` : 'the driver');

    const ref = trip.ref_id || 'Draft';

    let title = 'Confirm Status Change';
    let message = `Are you sure you want to change status of trip ${ref} (${driverFirstName}) to ${targetStatus}?`;
    let confirmLabel = 'Confirm Status Change';

    const statusStr = String(targetStatus);

    if (statusStr === 'Completed') {
      title = 'Confirm Trip Completion';
      message = `Did ${driverFirstName} complete trip ${ref}?`;
      confirmLabel = 'Yes, Trip Completed';
    } else if (statusStr === 'Delayed') {
      title = 'Confirm Trip Delay';
      message = `Was ${driverFirstName} delayed on trip ${ref}?`;
      confirmLabel = 'Yes, Mark Delayed';
    } else if (statusStr === 'InTransit') {
      title = 'Confirm In-Transit Status';
      message = `Did ${driverFirstName} start transit for trip ${ref}?`;
      confirmLabel = 'Yes, Mark In Transit';
    } else if (statusStr === 'AtPickup') {
      title = 'Confirm Loading / At Pickup';
      message = `Has ${driverFirstName} arrived at pickup for trip ${ref}?`;
      confirmLabel = 'Yes, Arrived at Pickup';
    } else if (statusStr === 'Draft') {
      title = 'Confirm Revert to Scheduled';
      message = `Revert trip ${ref} for ${driverFirstName} to Scheduled?`;
      confirmLabel = 'Yes, Revert Status';
    } else if (statusStr === 'Emergency') {
      title = 'Confirm Emergency Status';
      message = `Report emergency status for ${driverFirstName} on trip ${ref}?`;
      confirmLabel = 'Report Emergency';
    }

    setStatusConfirmModal({
      isOpen: true,
      trip,
      targetStatus,
      title,
      message,
      confirmLabel,
      isLoading: false,
    });
  };

  const handleConfirmKanbanStatusChange = async () => {
    if (!statusConfirmModal.trip || !statusConfirmModal.targetStatus) return;
    const { trip, targetStatus } = statusConfirmModal;

    try {
      setStatusConfirmModal((prev) => ({ ...prev, isLoading: true }));
      setLocalTripOverrides((prev) => ({ ...prev, [trip.id]: targetStatus as TripStatus }));

      const updated = await tripService.updateStatus(trip.id, targetStatus as TripStatus);

      queryClient.invalidateQueries({ queryKey: ['trips'] });
      queryClient.invalidateQueries({ queryKey: ['trips-kpi-summary'] });
      queryClient.invalidateQueries({ queryKey: ['trips-kpi-period'] });
      toast.success(`Updated ${trip.ref_id} status to ${targetStatus}`);

      setStatusConfirmModal({
        isOpen: false,
        trip: null,
        targetStatus: null,
        title: '',
        message: '',
        confirmLabel: 'Confirm',
        isLoading: false,
      });

      if (targetStatus === 'Completed') {
        setSettlementModalTrip(updated || { ...trip, status: 'Completed' });
      }
    } catch (e: any) {
      // Revert the local override on error so the card snaps back to its correct column
      setLocalTripOverrides((prev) => {
        const next = { ...prev };
        delete next[trip.id];
        return next;
      });
      // Surface the backend's actual reason (e.g. "not allowed from the
      // trip's current state") instead of a generic message — the client-side
      // transition guard above catches the common case, but the backend is
      // still the real authority and can reject for reasons this page
      // doesn't model (a driver/vehicle conflict, a missing assignment).
      const reason = e?.response?.data?.error?.message;
      toast.error(`Failed to update status for ${trip.ref_id}`, reason ? { description: reason } : undefined);
      setStatusConfirmModal((prev) => ({ ...prev, isLoading: false }));
    }
  };

  // Legacy `?new=true` deep link (old modal flow) — redirect to the full page.
  useEffect(() => {
    if (searchParams.get('new') === 'true') {
      navigate('/trips/new', { replace: true });
    }
  }, [searchParams, navigate]);

  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [totalTripsResetKey, setTotalTripsResetKey] = useState(0);
  const [selectedStatus, setSelectedStatus] = useState<TripStatusFilter>('All');
  const [selectedCustomerId, setSelectedCustomerId] = useState<string>('All');
  const [dateFilter, setDateFilter] = useState<DateFilterType>('3Days');
  const activeFiltersCount = (selectedStatus !== 'All' ? 1 : 0) + (selectedCustomerId !== 'All' ? 1 : 0);
  const [kpiPeriod, setKpiPeriod] = useState<DateFilterType>('Today');
  const [customDateRange, setCustomDateRange] = useState<DateRange | undefined>(undefined);
  const [search, setSearch] = useState('');
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [sortOption, setSortOption] = useState<
    'latest' | 'oldest' | 'price_desc' | 'price_asc' | 'ref_id_asc' | 'ref_id_desc' | 'customer_asc' | 'status'
  >('latest');
  const debouncedSearch = useDebouncedValue(search, 300);

  const [statusDialogTrip, setStatusDialogTrip] = useState<Trip | null>(null);
  const [newStatus, setNewStatus] = useState<TripStatus>('Dispatched');
  const [isUpdatingStatus, setIsUpdatingStatus] = useState(false);

  const [previewVehicle, setPreviewVehicle] = useState<any | null>(null);
  const [previewCustomer, setPreviewCustomer] = useState<any | null>(null);
  const [previewThirdParty, setPreviewThirdParty] = useState<any | null>(null);
  const [previewDriver, setPreviewDriver] = useState<any | null>(null);

  const [editVehicle, setEditVehicle] = useState<any | null>(null);
  const [editCustomer, setEditCustomer] = useState<any | null>(null);
  const [editThirdParty, setEditThirdParty] = useState<any | null>(null);
  const [editDriver, setEditDriver] = useState<any | null>(null);

  const [isCreateVehicleOpen, setIsCreateVehicleOpen] = useState(false);
  const [isCreateCustomerOpen, setIsCreateCustomerOpen] = useState(false);
  const [isCreateDriverOpen, setIsCreateDriverOpen] = useState(false);

  const [exportMenuOpen, setExportMenuOpen] = useState(false);
  const [exportFormat, setExportFormat] = useState<'excel' | 'pdf' | 'csv'>('excel');
  const [exportDialogOpen, setExportDialogOpen] = useState(false);
  const [exportStatusGroup, setExportStatusGroup] = useState<ExportStatusGroup>('All');
  const [exportStartDate, setExportStartDate] = useState('');
  const [exportEndDate, setExportEndDate] = useState('');
  const [isExporting, setIsExporting] = useState(false);
  const [isCustomExportOpen, setIsCustomExportOpen] = useState(false);
  const [selectedTripsForExport, setSelectedTripsForExport] = useState<Trip[]>([]);

  const { data: exportDriversRes } = useQuery({
    queryKey: ['drivers-for-export'],
    queryFn: () => driverService.getAll({ per_page: 500, mode: 'lookup' }),
    enabled: exportMenuOpen,
  });
  const { data: exportVehiclesRes } = useQuery({
    queryKey: ['vehicles-for-export'],
    queryFn: () => vehicleService.getAll({ per_page: 500, mode: 'lookup' }),
    enabled: exportMenuOpen,
  });
  const exportDrivers = exportDriversRes?.data || [];
  const exportVehicles = exportVehiclesRes?.data || [];

  const [importDialogOpen, setImportDialogOpen] = useState(false);
  const [selectionResetKey, setSelectionResetKey] = useState(0);
  const [confirmModal, setConfirmModal] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
    onConfirm: () => void | Promise<void>;
  }>({
    isOpen: false,
    title: '',
    message: '',
    onConfirm: () => {},
  });
  const [importFileName, setImportFileName] = useState('');
  const [importRows, setImportRows] = useState<BulkImportTripRow[]>([]);
  const [importParseError, setImportParseError] = useState('');
  const [isImporting, setIsImporting] = useState(false);
  const [importResult, setImportResult] = useState<BulkImportResult | null>(null);
  const [driverMappings, setDriverMappings] = useState<Record<string, string>>({});

  const { data: importDriversRes } = useQuery({
    queryKey: ['import-drivers-list'],
    queryFn: () => driverService.getAll({ per_page: 200, mode: 'lookup' }),
    enabled: importDialogOpen,
  });
  const activeImportDrivers = importDriversRes?.data || [];

  const { data: importVehiclesRes } = useQuery({
    queryKey: ['import-vehicles-list'],
    queryFn: () => vehicleService.getAll({ per_page: 200, mode: 'lookup' }),
    enabled: importDialogOpen,
  });
  const activeImportVehicles = importVehiclesRes?.data || [];

  // WhatsApp Share Dialog state
  const [whatsappDialogOpen, setWhatsappDialogOpen] = useState(false);
  const [whatsappSelectedTrips, setWhatsappSelectedTrips] = useState<Trip[]>([]);
  const [whatsappRecipientType, setWhatsappRecipientType] = useState<'driver' | 'customer' | 'custom'>('custom');
  const [whatsappCustomPhone, setWhatsappCustomPhone] = useState('');
  const [whatsappMessageText, setWhatsappMessageText] = useState('');

  const startDateStr = dateFilter === '3Days'
    ? format(subDays(new Date(), 1), 'yyyy-MM-dd')
    : (dateFilter === 'Custom' && customDateRange?.from
      ? format(customDateRange.from, 'yyyy-MM-dd')
      : undefined);
  const endDateStr = dateFilter === '3Days'
    ? format(addDays(new Date(), 1), 'yyyy-MM-dd')
    : (dateFilter === 'Custom' && customDateRange?.to
      ? format(customDateRange.to, 'yyyy-MM-dd')
      : (dateFilter === 'Custom' && customDateRange?.from ? format(customDateRange.from, 'yyyy-MM-dd') : undefined));

  // Fetch trips using React Query.
  // NOTE: Search is intentionally NOT sent to the backend — the backend search was unreliable
  // and could return 0 results, defeating the client-side computeTripSearchRelevance filter below.
  // We fetch all trips up to per_page=1000 and let the trips memo handle filtering client-side.
  const { data: tripsRes, isLoading, isError, error, refetch } = useQuery({
    queryKey: ['trips', selectedStatus, dateFilter, startDateStr, endDateStr],
    queryFn: () => tripService.getAll({
      status: getServerStatusFilter(selectedStatus) as any,
      date_filter: dateFilter === 'All' || dateFilter === 'Custom' ? undefined : dateFilter,
      start_date: startDateStr,
      end_date: endDateStr,
      per_page: 1000,
    }),
    // Keep the previous rows on screen while a new search/page loads.
    placeholderData: keepPreviousData,
    // Auto-poll every 10s so driver app updates move Kanban cards live without manual page reload
    refetchInterval: 10000,
  });

  // The unfiltered trip ledger, for the export sheet. Despite the old name this
  // no longer feeds any KPI card — those read the main query — so fetching 1000
  // trips (each with its stops, driver, vehicle, customer and rate card) on
  // every mount of this page bought nothing until someone opened the export.
  const { data: allTripsRes, isError: isKpiSummaryError, refetch: refetchKpiSummary } = useQuery({
    queryKey: ['trips-export-all'],
    queryFn: () => tripService.getAll({ per_page: 1000 }),
    enabled: isCustomExportOpen,
  });

  // Dynamic title and description for the period KPI card
  const kpiTitle = useMemo(() => {
    if (kpiPeriod === 'ThisWeek') return "THIS WEEK'S TRIPS";
    if (kpiPeriod === 'ThisMonth') return "THIS MONTH'S TRIPS";
    return "TODAY'S TRIPS";
  }, [kpiPeriod]);

  const kpiDescription = useMemo(() => {
    if (kpiPeriod === 'ThisWeek') return "Scheduled or created this week";
    if (kpiPeriod === 'ThisMonth') return "Scheduled or created this month";
    return "Scheduled or created today";
  }, [kpiPeriod]);

  // Surface a toast when the export ledger fails/times out instead of silently
  // handing the export sheet an empty "all trips" set — indistinguishable from
  // "no trips", and easy to mistake for a real gap on a slow connection.
  useEffect(() => {
    if (isKpiSummaryError) {
      toast.error('The full trip ledger failed to load', {
        description: 'Exporting "all trips" may be incomplete. This can happen on a slow connection.',
        action: { label: 'Retry', onClick: () => { refetchKpiSummary(); } },
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isKpiSummaryError]);

  const rawTrips: Trip[] = useMemo(() => {
    const dbTrips = tripsRes?.data ?? [];
    let list: Trip[] = [...dbTrips];

    if (Object.keys(localTripOverrides).length > 0) {
      list = list.map((t) => (localTripOverrides[t.id] ? { ...t, status: localTripOverrides[t.id] } : t));
    }
    return list;
  }, [tripsRes?.data, localTripOverrides]);

  const customerFilterOptions = useMemo(() => {
    const map = new Map<string, string>();
    rawTrips.forEach((t) => {
      if (t.customer?.id && t.customer?.name) {
        map.set(t.customer.id, t.customer.name);
      }
    });
    return Array.from(map.entries()).map(([id, name]) => ({ id, name }));
  }, [rawTrips]);

  const companyOptions = useMemo(() => {
    const icon = <Building2 className="h-3.5 w-3.5 text-slate-400 shrink-0" />;
    const opts = [{ value: 'All', label: 'All Companies', icon }];
    customerFilterOptions.forEach((c) => {
      opts.push({ value: c.id, label: c.name, icon });
    });
    return opts;
  }, [customerFilterOptions]);



  // Ordered by search relevance when a search is active (e.g. origin/pickup matching trips first),
  // otherwise ordered purely by when the trip was created/entered, newest first by default.
  const trips = useMemo(() => {
    let filtered = rawTrips.filter(t => matchesTripStatusFilter(t, selectedStatus));
    if (selectedCustomerId !== 'All') {
      filtered = filtered.filter(t => t.customer?.id === selectedCustomerId);
    }
    if (debouncedSearch && debouncedSearch.trim()) {
      filtered = filtered.filter(t => computeTripSearchRelevance(t, debouncedSearch) > 0);
    }
    return filtered.sort((a, b) => {
      if (debouncedSearch && debouncedSearch.trim()) {
        const scoreA = computeTripSearchRelevance(a, debouncedSearch);
        const scoreB = computeTripSearchRelevance(b, debouncedSearch);
        if (scoreA !== scoreB) {
          return scoreB - scoreA; // Higher score (e.g. started at location) appears first!
        }
      }

      if (sortOption === 'oldest') {
        const timeA = new Date(a.createdAt || (a as any).created_at || a.planned_start || 0).getTime();
        const timeB = new Date(b.createdAt || (b as any).created_at || b.planned_start || 0).getTime();
        if (timeA !== timeB) return timeA - timeB;
      } else if (sortOption === 'price_desc') {
        const pA = a.billing_amount ?? a.trip_charges ?? a.rateCard?.base_price ?? 0;
        const pB = b.billing_amount ?? b.trip_charges ?? b.rateCard?.base_price ?? 0;
        if (pA !== pB) return pB - pA;
      } else if (sortOption === 'price_asc') {
        const pA = a.billing_amount ?? a.trip_charges ?? a.rateCard?.base_price ?? 0;
        const pB = b.billing_amount ?? b.trip_charges ?? b.rateCard?.base_price ?? 0;
        if (pA !== pB) return pA - pB;
      } else if (sortOption === 'ref_id_asc') {
        return (a.ref_id || a.id || '').localeCompare(b.ref_id || b.id || '', undefined, { numeric: true });
      } else if (sortOption === 'ref_id_desc') {
        return (b.ref_id || b.id || '').localeCompare(a.ref_id || a.id || '', undefined, { numeric: true });
      } else if (sortOption === 'customer_asc') {
        const cA = a.customer?.name || '';
        const cB = b.customer?.name || '';
        if (cA !== cB) return cA.localeCompare(cB);
      } else if (sortOption === 'status') {
        return (a.status || '').localeCompare(b.status || '');
      } else {
        // default 'latest'
        const timeA = new Date(a.createdAt || (a as any).created_at || a.planned_start || 0).getTime();
        const timeB = new Date(b.createdAt || (b as any).created_at || b.planned_start || 0).getTime();
        if (timeA !== timeB) return timeB - timeA;
      }

      return (b.ref_id || b.id || '').localeCompare(a.ref_id || a.id || '');
    });
  }, [rawTrips, selectedStatus, sortOption, debouncedSearch, selectedCustomerId]);

  // Fixed fleet-wide totals for KPI cards (do NOT change when table is filtered or searched)
  const kpiTrips = useMemo(() => {
    return rawTrips;
  }, [rawTrips]);
  const totalCount = kpiTrips.length;

  const inTransitTrips = kpiTrips.filter(t => t.status === 'InTransit');
  const inTransitCount = inTransitTrips.length;

  // Trucks at pickup point, loading goods
  const atPickupTrips = kpiTrips.filter(t => t.status === 'AtPickup');
  const atPickupCount = atPickupTrips.length;

  // Delayed trips: active trips whose planned_end has already passed
  const nowMs = Date.now();
  const delayedTrips = kpiTrips.filter(t =>
    ['Dispatched', 'AtPickup', 'InTransit', 'AtDelivery'].includes(t.status) &&
    t.planned_end != null &&
    new Date(t.planned_end).getTime() < nowMs
  );
  const delayedCount = delayedTrips.length;

  const deliveredPendingInvoiceTrips = kpiTrips.filter(t => t.status === 'Completed');
  const deliveredPendingInvoiceCount = deliveredPendingInvoiceTrips.length;

  const invoicedTrips = kpiTrips.filter(t => t.status === 'Invoiced');
  const invoicedCount = invoicedTrips.length;

  const completedTrips = kpiTrips.filter(t => t.status === 'Completed' || t.status === 'Invoiced');
  const completedCount = completedTrips.length;
  const completedPercentage = totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0;

  const draftTrips = kpiTrips.filter(t => t.status === 'Draft');
  const dispatchQueueCount = draftTrips.length;

  const periodTrips = useMemo(() => {
    return rawTrips;
  }, [rawTrips]);
  const periodCount = periodTrips.length;
  const periodCompletedCount = periodTrips.filter(t => t.status === 'Completed' || t.status === 'Invoiced').length;
  const periodInTransitCount = periodTrips.filter(t => t.status === 'InTransit').length;
  const periodQueueCount = periodTrips.filter(t => t.status === 'Draft' || t.status === 'Dispatched' || t.status === 'AtPickup').length;

  const handleRefresh = async () => {
    setIsRefreshing(true);
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: ['trips'] }),
      queryClient.invalidateQueries({ queryKey: ['trips-kpi-summary'] }),
    ]);
    setTimeout(() => setIsRefreshing(false), 500);
  };

  const handleUpdateStatus = async () => {
    if (!statusDialogTrip) return;
    const targetTrip = statusDialogTrip;
    const targetStatus = newStatus;
    try {
      setIsUpdatingStatus(true);
      const updated = await tripService.updateStatus(targetTrip.id, targetStatus);
      queryClient.invalidateQueries({ queryKey: ['trips'] });
      queryClient.invalidateQueries({ queryKey: ['trips-kpi-summary'] });
      setSelectionResetKey(k => k + 1);
      setStatusDialogTrip(null);
      toast.success('Trip status updated successfully');

      if (targetStatus === 'Completed') {
        setSettlementModalTrip(updated || { ...targetTrip, status: 'Completed' });
      }
    } catch (e) {
      toast.error('Failed to update trip status');
    } finally {
      setIsUpdatingStatus(false);
    }
  };

  const runExport = async (
    format: 'excel' | 'pdf' | 'csv',
    opts: { statusGroup: ExportStatusGroup; driverId?: string; vehicleId?: string; startDate?: string; endDate?: string; thirdPartyOnly?: boolean }
  ) => {
    try {
      setIsExporting(true);
      const res = await tripService.getAll({
        driver_id: opts.driverId,
        vehicle_id: opts.vehicleId,
        start_date: opts.startDate || undefined,
        end_date: opts.endDate || undefined,
        per_page: 2000,
      });
      let matched = (res.data || []).filter(t => matchesExportStatusGroup(t.status, opts.statusGroup));
      if (opts.thirdPartyOnly) {
        matched = matched.filter(t => t.is_third_party || t.thirdPartyProviderId || (t.carrier_name && t.carrier_name !== 'MERCON LOGISTICS'));
      }

      if (!matched.length) {
        toast.warning(opts.thirdPartyOnly ? 'No third-party trips match the selected export filters.' : 'No trips match the selected export filters.');
        return;
      }

      let groupLabel = EXPORT_STATUS_GROUPS.find(g => g.value === opts.statusGroup)?.label || 'All Trips';
      if (opts.thirdPartyOnly) {
        groupLabel = `Third-Party (3PL) Trips — ${groupLabel}`;
      }
      const groupSlug = (opts.thirdPartyOnly ? '3PL_' : '') + groupLabel.replace(/[\s/]+/g, '_');
      const datePart = new Date().toISOString().slice(0, 10);
      const baseName = `trips_export_${groupSlug}_${datePart}`;

      const exportRows = tripsToExportRowsWithTotals(matched, tz);
      const title = opts.thirdPartyOnly ? `Third-Party (3PL) Trips Export — ${groupLabel}` : `Trips Export — ${groupLabel}`;
      const subtitle = `Generated on ${new Date().toLocaleDateString()} ${new Date().toLocaleTimeString()} · MERCON Logistics Platform · ${matched.length} record${matched.length === 1 ? '' : 's'}`;

      if (format === 'excel') {
        await exportExcelTable(title, TRIP_EXPORT_HEADERS, exportRows, `${baseName}.xlsx`, { subtitle, sheetName: opts.thirdPartyOnly ? '3PL Trips' : 'Trips' });
      } else {
        exportPDFTable(title, TRIP_EXPORT_HEADERS, exportRows, `${baseName}.pdf`, { subtitle });
      }
      setExportDialogOpen(false);
    } catch (e) {
      toast.error('Failed to generate export.');
    } finally {
      setIsExporting(false);
    }
  };

  /**
   * Triggers a scalable backend streaming export for the given type.
   * All filtering is applied at the database level — no row limit.
   * PDF format is not supported here; use runExport() for PDF instead.
   */
  const triggerExport = async (
    params: { type: string; format: 'xlsx' | 'csv'; start_date?: string; end_date?: string; driver_id?: string; vehicle_id?: string }
  ) => {
    try {
      setIsExporting(true);
      const { blob, filename } = await downloadTripExport({ ...params });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      toast.success('Export ready');
    } catch {
      toast.error('Export failed. Please try again.');
    } finally {
      setIsExporting(false);
    }
  };

  const handleDateRangeExport = () => {
    if (exportFormat === 'pdf') {
      // PDF: keep existing browser-side generation (limited to 2,000 rows)
      runExport(exportFormat, {
        statusGroup: exportStatusGroup,
        startDate: exportStartDate,
        endDate: exportEndDate,
      });
    } else {
      // xlsx / csv: use the scalable backend streaming endpoint
      triggerExport({
        type: 'date-range',
        format: exportFormat === 'csv' ? 'csv' : 'xlsx',
        start_date: exportStartDate || undefined,
        end_date: exportEndDate || undefined,
      });
      setExportDialogOpen(false);
    }
  };

  const handleImportFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;

    setImportResult(null);
    setImportParseError('');
    setImportRows([]);
    setImportFileName(file.name);

    try {
      const isCsv = file.name.toLowerCase().endsWith('.csv');
      const rawRows: Record<string, string | number>[] = isCsv
        ? await parseCSVFile(file)
        : (await parseSheet(file, TRIP_COLUMNS, 'trip')).rows;

      const normalized = rawRows.map(toImportRow).filter(row => row.customer_name);

      if (!normalized.length) {
        setImportParseError('No valid rows found. Make sure the file has a "Customer Name" column and at least one data row.');
        return;
      }
      setImportRows(normalized);
    } catch (err: any) {
      setImportParseError(err?.message || 'Could not read that file. Make sure it\'s a valid .xlsx or .csv.');
    }
  };

  const [pastDateModalOpen, setPastDateModalOpen] = useState(false);
  const [pendingImportRows, setPendingImportRows] = useState<BulkImportTripRow[] | null>(null);
  const [pastDateAnalysis, setPastDateAnalysis] = useState<PastDateAnalysis | null>(null);

  const doSubmitImport = async (rowsToSubmit: BulkImportTripRow[]) => {
    try {
      setIsImporting(true);
      const result = await tripService.bulkImport(rowsToSubmit);
      setImportResult(result);
      if (result.imported > 0) {
        queryClient.invalidateQueries({ queryKey: ['trips'] });
        queryClient.invalidateQueries({ queryKey: ['trips-kpi-summary'] });
      }
    } catch (e) {
      toast.error('Failed to import trips.');
    } finally {
      setIsImporting(false);
    }
  };

  const handleConfirmImport = async () => {
    if (!importRows.length) return;
    const rowsToSubmit: BulkImportTripRow[] = importRows.map((row) => {
      let driver_id = row.driver_id;
      if (row.driver_name && driverMappings[row.driver_name] && driverMappings[row.driver_name] !== 'none') {
        driver_id = driverMappings[row.driver_name];
      }
      return {
        ...row,
        ...(driver_id ? { driver_id } : {}),
      };
    });

    const analysis = analyzePastDateRows(rowsToSubmit);
    if (analysis.hasPastTrips) {
      setPendingImportRows(rowsToSubmit);
      setPastDateAnalysis(analysis);
      setPastDateModalOpen(true);
    } else {
      await doSubmitImport(rowsToSubmit);
    }
  };

  const handlePastDateImportConfirm = async (selectedStatus: TripStatus) => {
    if (!pendingImportRows) return;
    const finalRows = applyPastStatusToRows(pendingImportRows, selectedStatus);
    setPastDateModalOpen(false);
    setPendingImportRows(null);
    await doSubmitImport(finalRows);
  };


  const resetImportDialog = () => {
    setImportDialogOpen(false);
    setImportFileName('');
    setImportRows([]);
    setImportParseError('');
    setImportResult(null);
    setDriverMappings({});
  };

  const openWhatsappShare = (selectedRows: Trip[]) => {
    setWhatsappSelectedTrips(selectedRows);
    if (selectedRows.length === 0) return;

    if (selectedRows.length === 1) {
      const trip = selectedRows[0];
      const customerName = trip.customer?.name || 'Unassigned';
      const driverName = trip.is_third_party
        ? (trip.third_party_driver_name || trip.thirdPartyProvider?.name || '3PL Driver')
        : (trip.driver ? `${trip.driver.first_name} ${trip.driver.last_name}` : 'Unassigned');
      const plate = trip.is_third_party
        ? (trip.third_party_vehicle_plate || '3PL Vehicle')
        : (trip.vehicle?.plate_number || 'Unassigned');
      const providerInfo = trip.is_third_party
        ? (trip.thirdPartyProvider?.name || trip.carrier_name || '3PL Provider')
        : null;

      const text = `*MERCON LOGISTICS - Trip Manifest*\n` +
                   `• *Trip Ref:* ${trip.ref_id || 'Draft'}\n` +
                   `• *Status:* ${trip.status}\n` +
                   `• *Customer:* ${customerName}\n` +
                   (providerInfo ? `• *3PL Provider:* ${providerInfo}\n` : '') +
                   `• *Driver:* ${driverName}\n` +
                   `• *Vehicle:* ${plate}\n` +
                   (trip.planned_start ? `• *Planned Start:* ${formatInDeploymentTz(trip.planned_start, tz, 'MMM d, yyyy')}\n` : '') +
                   `• *Tracking:* ${window.location.origin}/trips/${trip.id}/track`;

      setWhatsappMessageText(text);

      if (!trip.is_third_party && trip.driver?.phone_primary) {
        setWhatsappRecipientType('driver');
      } else if (trip.is_third_party && (trip.third_party_driver_phone || trip.thirdPartyProvider?.phone)) {
        setWhatsappRecipientType('custom');
        setWhatsappCustomPhone(trip.third_party_driver_phone || trip.thirdPartyProvider?.phone || '');
      } else if (trip.customer?.contact_phone) {
        setWhatsappRecipientType('customer');
      } else {
        setWhatsappRecipientType('custom');
        setWhatsappCustomPhone('');
      }
    } else {
      let text = `*MERCON LOGISTICS - Manifest Summary*\n`;
      selectedRows.forEach((t) => {
        const cust = t.customer?.name || 'Unassigned';
        const drv = t.is_third_party
          ? (t.third_party_driver_name || t.thirdPartyProvider?.name || '3PL Driver')
          : (t.driver ? `${t.driver.first_name} ${t.driver.last_name}` : 'Unassigned');
        const plate = t.is_third_party
          ? (t.third_party_vehicle_plate || '3PL Vehicle')
          : (t.vehicle?.plate_number || 'Unassigned');
        text += `\n*${t.ref_id || 'Draft'}* - ${cust}\n` +
                (t.is_third_party ? `  • 3PL Provider: ${t.thirdPartyProvider?.name || '3PL'}\n` : '') +
                `  • Driver: ${drv}\n` +
                `  • Vehicle: ${plate}\n` +
                `  • Status: ${t.status}\n`;
      });
      setWhatsappMessageText(text);
      setWhatsappRecipientType('custom');
      setWhatsappCustomPhone('');
    }

    setWhatsappDialogOpen(true);
  };

  const handleWhatsappSend = () => {
    let phone = '';
    if (whatsappSelectedTrips.length === 1) {
      const trip = whatsappSelectedTrips[0];
      if (whatsappRecipientType === 'driver') {
        phone = trip.driver?.phone_primary || '';
      } else if (whatsappRecipientType === 'customer') {
        phone = trip.customer?.contact_phone || '';
      } else {
        phone = whatsappCustomPhone;
      }
    } else {
      phone = whatsappCustomPhone;
    }

    const cleanPhone = phone.trim().replace(/\+/g, '').replace(/\D/g, '');
    const baseUrl = cleanPhone 
      ? `https://api.whatsapp.com/send?phone=${cleanPhone}` 
      : `https://api.whatsapp.com/send`;
    
    const shareUrl = `${baseUrl}?text=${encodeURIComponent(whatsappMessageText)}`;
    window.open(shareUrl, '_blank');
    setWhatsappDialogOpen(false);
  };

  const getDriverInitials = (driver?: { first_name?: string; last_name?: string } | null) => {
    if (!driver) return '—';
    const f = driver.first_name?.[0] || '';
    const l = driver.last_name?.[0] || '';
    return (f + l).toUpperCase() || 'DR';
  };

  const columns = [
    {
      header: 'Trip ID',
      className: 'w-[90px] shrink-0',
      mobilePriority: 'primary' as const,
      accessor: (row: Trip) => (
        <div className="flex items-center gap-1">
          <span className="font-mono text-xs font-bold text-brand truncate">
            {row.ref_id || 'Draft'}
          </span>
        </div>
      ),
    },
    {
      header: 'Customer',
      className: 'max-w-[130px] truncate',
      mobilePriority: 'secondary' as const,
      accessor: (row: Trip) => (
        <div className="flex flex-col max-w-[130px] truncate">
          {row.customer ? (
            <button
              onClick={(e) => {
                e.stopPropagation();
                setPreviewCustomer(row.customer);
              }}
              className="font-semibold text-xs text-brand hover:underline text-left truncate cursor-pointer"
              title={`Preview ${row.customer.name}`}
            >
              {row.customer.name}
            </button>
          ) : (
            <span className="font-semibold text-xs text-slate-400 italic">
              Unassigned
            </span>
          )}
        </div>
      ),
    },
    {
      header: 'Route',
      className: 'w-[140px] max-w-[160px]',
      mobilePriority: 'secondary' as const,
      accessor: (row: Trip) => {
        const pickup = getPickupInfo(row);
        const dropoff = getDropoffInfo(row);
        return (
          <div className="flex flex-col min-w-0 py-0.5 space-y-1" title={`From: ${pickup.name}\nTo: ${dropoff.name}`}>
            {/* Pickup (From) */}
            <div className="flex items-center gap-2 min-w-0">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 shrink-0" />
              <span className="text-xs font-bold text-slate-800 dark:text-slate-200 truncate">
                {pickup.name || '—'}
              </span>
            </div>
            {/* Connecting visual line */}
            <div className="pl-[2.5px] -my-0.5">
              <div className="w-px h-2.5 border-l border-dashed border-slate-300 dark:border-slate-700" />
            </div>
            {/* Dropoff (To) */}
            <div className="flex items-center gap-2 min-w-0">
              <span className="w-1.5 h-1.5 rounded-full bg-brand shrink-0" />
              <span className="text-xs font-bold text-slate-600 dark:text-slate-400 truncate flex items-center gap-1">
                {(() => {
                  const raw = dropoff.name || '—';
                  // Strip 🔁 emoji, then extract destination from "[RETURN: From → To]" or "RETURN: From → To" patterns
                  const clean = raw.replace(/🔁\s*/g, '').trim();
                  const match = clean.match(/^(.*?)\s*\[RETURN:\s*(.*?)\]$/i);
                  if (match) {
                    // Return trip: show only the final destination city
                    const dest = match[2].includes('→') ? match[2].split('→').pop()?.trim() : match[2].trim();
                    return <span className="truncate">{dest || match[1].trim()}</span>;
                  }
                  // Also handle "RETURN: From → To" without brackets
                  if (/^RETURN:/i.test(clean)) {
                    const dest = clean.includes('→') ? clean.split('→').pop()?.trim() : clean.replace(/^RETURN:\s*/i, '').trim();
                    return <span className="truncate">{dest}</span>;
                  }
                  return clean;
                })()}
              </span>
            </div>
          </div>
        );
      },
    },
    {
      header: 'Driver',
      className: 'max-w-[165px]',
      mobilePriority: 'meta' as const,
      accessor: (row: Trip) => {
        if (row.is_third_party) {
          const name = row.third_party_driver_name || row.thirdPartyProvider?.name || '3PL Driver';
          const providerName = row.thirdPartyProvider?.name || row.carrier_name || '3PL Carrier';
          const initial = name[0]?.toUpperCase() || '3P';

          return (
            <div
              className="flex items-center gap-1.5 max-w-[165px] cursor-pointer group"
              title={`3PL Driver: ${name}\nProvider: ${providerName}`}
              onClick={(e) => {
                if (row.thirdPartyProvider) {
                  e.stopPropagation();
                  setPreviewThirdParty(row.thirdPartyProvider);
                }
              }}
            >
              <div className="w-5 h-5 rounded-full bg-purple-100 dark:bg-purple-950 text-purple-700 dark:text-purple-300 font-bold text-[9px] flex items-center justify-center shrink-0 border border-purple-200 dark:border-purple-800">
                {initial}
              </div>
              <div className="flex flex-col min-w-0 truncate leading-tight">
                <span className="text-xs font-semibold text-purple-700 dark:text-purple-300 group-hover:underline truncate">
                  {name}
                </span>
                <span className="text-[10px] text-purple-600 dark:text-purple-400 font-medium truncate">
                  3PL: {providerName}
                </span>
              </div>
            </div>
          );
        }

        return (
          <div className="flex items-center gap-1.5 max-w-[165px] overflow-hidden">
            <div className="w-5 h-5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-bold text-[9px] flex items-center justify-center shrink-0">
              {row.driver ? `${row.driver.first_name[0]}${row.driver.last_name ? row.driver.last_name[0] : ''}` : 'U'}
            </div>
            {row.driver ? (
              <div className="overflow-hidden whitespace-nowrap min-w-0 flex-1">
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setPreviewDriver(row.driver);
                  }}
                  className={cn(
                    "text-xs font-semibold text-slate-800 dark:text-slate-200 hover:text-brand hover:underline text-left cursor-pointer block",
                    `${row.driver.first_name} ${row.driver.last_name}`.length > 13 ? "animate-marquee-slow" : "truncate"
                  )}
                  title={`Preview ${row.driver.first_name} ${row.driver.last_name}`}
                >
                  {row.driver.first_name} {row.driver.last_name}
                </button>
              </div>
            ) : (
              <span className="text-xs text-slate-400 italic">Unassigned</span>
            )}
            {row.driver?.deletedAt && <DeletedBadge />}
          </div>
        );
      },
    },
    {
      header: 'Vehicle',
      className: 'w-[95px] shrink-0',
      mobilePriority: 'meta' as const,
      accessor: (row: Trip) => {
        if (row.is_third_party) {
          const plate = row.third_party_vehicle_plate || '3PL Truck';
          return (
            <div className="flex items-center gap-1">
              <Truck size={12} className="text-purple-500 shrink-0" />
              <span
                className="font-mono text-[11px] text-purple-700 dark:text-purple-300 font-bold bg-purple-50 dark:bg-purple-950/60 border border-purple-200/80 dark:border-purple-800/60 px-1.5 py-0.5 rounded truncate"
                title={`3PL Vehicle Plate: ${plate}`}
              >
                {plate}
              </span>
            </div>
          );
        }

        return (
          <div className="flex items-center gap-1">
            <Truck size={12} className="text-slate-400 shrink-0" />
            {row.vehicle?.plate_number ? (
              <>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setPreviewVehicle(row.vehicle);
                  }}
                  className="font-mono text-[11px] text-slate-800 dark:text-slate-200 font-bold bg-slate-100 dark:bg-slate-800 hover:bg-indigo-50 dark:hover:bg-indigo-950/60 hover:text-indigo-600 dark:hover:text-indigo-400 px-1.5 py-0.5 rounded truncate transition-colors cursor-pointer"
                  title={`Preview Vehicle ${row.vehicle.plate_number}`}
                >
                  {row.vehicle.plate_number}
                </button>
                {row.vehicle?.deletedAt && <DeletedBadge />}
              </>
            ) : (
              <span className="text-xs text-slate-400 italic">Unassigned</span>
            )}
          </div>
        );
      },
    },
    {
      header: 'Payload Cap.',
      className: 'w-[110px] shrink-0',
      mobilePriority: 'hidden' as const,
      accessor: (row: Trip) => {
        const cap = getTripPayloadCapacity(row);
        return (
          <Badge
            variant="outline"
            className="font-mono text-[11px] font-semibold text-slate-700 dark:text-slate-300 bg-slate-50 dark:bg-slate-800/60 border-slate-200 dark:border-slate-700 px-1.5 py-0.5"
          >
            {cap}
          </Badge>
        );
      },
    },
    {
      header: 'Vehicle Class',
      className: 'w-[130px] shrink-0',
      mobilePriority: 'hidden' as const,
      accessor: (row: Trip) => {
        const cat = row.quotation_vehicle_class || row.vehicle_type || getTripRateCategory(row);
        return <TaxonomyBadge category="VEHICLE_CLASS" value={cat} />;
      },
    },
    {
      header: 'Rate (SAR)',
      className: 'w-[100px] shrink-0',
      mobilePriority: 'meta' as const,
      accessor: (row: Trip) => {
        const price = row.billing_amount ?? row.trip_charges ?? row.rateCard?.base_price;
        return (
          <div className="flex items-center font-mono text-xs">
            <span className="font-extrabold text-slate-900 dark:text-slate-200">
              {price !== undefined && price !== null && price > 0
                ? `SAR ${Number(price).toLocaleString('en-US')}`
                : '—'}
            </span>
          </div>
        );
      },
    },
    {
      header: 'Driver Charge (SAR)',
      className: 'w-[110px] shrink-0',
      mobilePriority: 'hidden' as const,
      accessor: (row: Trip) => {
        const charge = row.trip_charges;
        return (
          <div className="flex items-center font-mono text-xs" title="What MERCON pays the driver/subcontractor — not the customer-billed amount">
            <span className="font-bold text-slate-500 dark:text-slate-400">
              {charge !== undefined && charge !== null && charge > 0
                ? `SAR ${Number(charge).toLocaleString('en-US')}`
                : '—'}
            </span>
          </div>
        );
      },
    },
    {
      header: 'Status',
      className: 'w-[105px] shrink-0',
      mobilePriority: 'primary' as const,
      accessor: (row: Trip) => (
        <StatusBadge status={row.status} />
      ),
    },
    {
      header: 'Planned Start',
      className: 'w-[95px] shrink-0',
      mobilePriority: 'meta' as const,
      accessor: (row: Trip) => (
        <span className="text-xs text-slate-500 font-medium whitespace-nowrap">
          {row.planned_start ? formatInDeploymentTz(row.planned_start, tz, 'MMM d') : '—'}
        </span>
      ),
    },
    {
      header: 'Actions',
      className: 'w-[95px] text-right shrink-0',
      headerClassName: 'text-right',
      mobilePriority: 'hidden' as const,
      accessor: (row: Trip) => (
        <div className="flex items-center justify-end gap-1" onClick={(e) => e.stopPropagation()}>
          <button
            onClick={() => openWhatsappShare([row])}
            title="Share to WhatsApp"
            className="p-1.5 rounded-lg text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-950/40 transition-colors cursor-pointer"
          >
            <WhatsAppIcon className="w-3.5 h-3.5" />
          </button>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button
                className="p-1.5 rounded-lg text-slate-500 hover:text-slate-800 hover:bg-slate-100 dark:hover:bg-slate-800 dark:text-slate-400 transition-colors focus:outline-none cursor-pointer"
                title="Trip Actions"
                aria-label="Trip Actions"
              >
                <MoreHorizontal className="h-4 w-4" />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-48 p-1.5 shadow-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 rounded-xl">
              {row.status === 'InTransit' && (
                <DropdownMenuItem
                  onClick={() => navigate(`/trips/${row.id}/track`)}
                  className="cursor-pointer text-xs font-medium py-1.5 px-2 rounded-md text-brand hover:bg-orange-50 dark:hover:bg-orange-950/40"
                >
                  <Navigation className="mr-2 h-3.5 w-3.5" />
                  Live GPS Track
                </DropdownMenuItem>
              )}

              <DropdownMenuItem
                onClick={() => {
                  setStatusDialogTrip(row);
                  setNewStatus(row.status);
                }}
                className="cursor-pointer text-xs font-medium py-1.5 px-2 rounded-md"
              >
                <RefreshCw className="mr-2 h-3.5 w-3.5 text-emerald-600" />
                Quick Status Change
              </DropdownMenuItem>

              <DropdownMenuItem
                onClick={() => navigate(`/trips/${row.id}/edit`)}
                className="cursor-pointer text-xs font-medium py-1.5 px-2 rounded-md"
              >
                <Edit2 className="mr-2 h-3.5 w-3.5 text-amber-600" />
                Edit Trip Manifest
              </DropdownMenuItem>

              <DropdownMenuItem
                onClick={() => openWhatsappShare([row])}
                className="cursor-pointer text-xs font-medium py-1.5 px-2 rounded-md"
              >
                <WhatsAppIcon className="mr-2 h-3.5 w-3.5 text-emerald-600" />
                Share to WhatsApp
              </DropdownMenuItem>

              <DropdownMenuSeparator className="my-1 border-slate-100 dark:border-slate-800" />

              <DropdownMenuItem
                onClick={() => {
                  setConfirmModal({
                    isOpen: true,
                    title: 'Delete Trip Draft',
                    message: `Are you sure you want to delete trip ${row.ref_id || 'Draft'}? This action cannot be undone.`,
                    onConfirm: async () => {
                      try {
                        await tripService.bulkDelete([row.id]);
                        queryClient.invalidateQueries({ queryKey: ['trips'] });
                        queryClient.invalidateQueries({ queryKey: ['trips-kpi-summary'] });
                        setSelectionResetKey(k => k + 1);
                        toast.success('Trip deleted successfully');
                      } catch (e) {
                        toast.error('Failed to delete trip');
                      }
                    }
                  });
                }}
                className="cursor-pointer text-xs font-medium py-1.5 px-2 rounded-md text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40"
              >
                <Trash2 className="mr-2 h-3.5 w-3.5" />
                Delete Trip
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      ),
    },
  ];

  const bulkActions = [
    {
      label: 'Edit Selected Manifest',
      icon: <Edit2 size={13} />,
      variant: 'primary' as const,
      onClick: (selectedRows: Trip[]) => {
        if (selectedRows.length === 1) {
          navigate(`/trips/${selectedRows[0].id}/edit`);
        } else if (selectedRows.length > 1) {
          setStatusDialogTrip(selectedRows[0]);
          setNewStatus(selectedRows[0].status);
        }
      }
    },
    {
      label: 'Share to WhatsApp',
      icon: <WhatsAppIcon className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />,
      variant: 'success' as const,
      onClick: (selectedRows: Trip[]) => {
        openWhatsappShare(selectedRows);
      }
    },
    {
      label: 'Export Selected Excel',
      icon: <FileSpreadsheet size={13} className="text-emerald-600 dark:text-emerald-400" />,
      variant: 'success' as const,
      onClick: (selectedRows: Trip[]) => {
        exportExcelTable('Trips Export', TRIP_EXPORT_HEADERS, tripsToExportRowsWithTotals(selectedRows, tz), 'trips_export.xlsx');
      }
    },
    {
      label: 'Export Selected PDF',
      icon: <FileText size={13} className="text-rose-600 dark:text-rose-400" />,
      variant: 'warning' as const,
      onClick: (selectedRows: Trip[]) => {
        exportPDFTable('Trips Export', TRIP_EXPORT_HEADERS, tripsToExportRowsWithTotals(selectedRows, tz), 'trips_export.pdf');
      }
    },
    {
      label: 'Custom Export...',
      icon: <Download size={13} />,
      variant: 'secondary' as const,
      onClick: (selectedRows: Trip[]) => {
        setSelectedTripsForExport(selectedRows);
        setIsCustomExportOpen(true);
      }
    },
    {
      label: 'Delete Selected',
      icon: <Trash2 size={13} />,
      variant: 'danger' as const,
      onClick: (selectedRows: Trip[], clearSelection?: () => void) => {
        setConfirmModal({
          isOpen: true,
          title: 'Delete Selected Trips',
          message: `Are you sure you want to delete ${selectedRows.length} selected trip${selectedRows.length > 1 ? 's' : ''}? This action cannot be undone.`,
          onConfirm: async () => {
            try {
              await tripService.bulkDelete(selectedRows.map(r => r.id));
              queryClient.invalidateQueries({ queryKey: ['trips'] });
              queryClient.invalidateQueries({ queryKey: ['trips-kpi-summary'] });
              clearSelection?.();
              setSelectionResetKey(k => k + 1);
              toast.success(`Successfully deleted ${selectedRows.length} trip${selectedRows.length > 1 ? 's' : ''}`);
            } catch (e) {
              toast.error('Failed to delete trips');
            }
          }
        });
      }
    }
  ];
  const inlineSearchInput = (
    <div className="relative w-full sm:w-60 md:w-72 shrink-0">
      <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
      <Input
        placeholder="Search trip ID, driver, vehicle..."
        value={search}
        onChange={(e) => {
          setSearch(e.target.value);
          setCurrentPage(1);
        }}
        className="pl-9 h-9 text-xs bg-slate-50 dark:bg-slate-800/50 border-slate-200 dark:border-slate-700 font-semibold"
      />
      {search && (
        <button
          onClick={() => {
            setSearch('');
            setCurrentPage(1);
          }}
          className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
        >
          <X className="w-3.5 h-3.5" />
        </button>
      )}
    </div>
  );

  return (
    <DashboardLayout 
      active="Trips" 
      title="Trips" 
    >
      <div className="px-4 sm:px-6 pb-6 w-full flex flex-col animate-fade-in gap-5">
        {/* Page Content Header Row */}
        <div className="flex flex-wrap items-center justify-between gap-4 shrink-0 pb-1">
          <div className="flex items-center gap-3">
            <Truck className="w-6 h-6 text-orange-500 dark:text-orange-400 shrink-0" />
            <div className="flex flex-col">
              <div className="flex items-center gap-2.5">
                <h1 className="text-2xl font-extrabold text-slate-900 dark:text-slate-100 tracking-tight">Trips</h1>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2.5 flex-wrap">
            <DropdownMenu open={exportMenuOpen} onOpenChange={setExportMenuOpen}>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="outline"
                  size="sm"
                  className="h-9 gap-1.5 text-xs font-semibold border-slate-200/90 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800/80 shadow-2xs rounded-xl transition-colors"
                >
                  <Download className="h-3.5 w-3.5 text-slate-500 dark:text-slate-400" />
                  Export & Import
                  <ChevronDown className="h-3 w-3 text-slate-400" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56 p-1.5 shadow-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 rounded-xl">
                <DropdownMenuLabel className="text-[10px] font-bold tracking-wider uppercase text-slate-400 px-2 py-1">
                  Export Operations
                </DropdownMenuLabel>
                
                <DropdownMenuItem
                  onClick={() => {
                    setExportMenuOpen(false);
                    triggerExport({ type: 'all', format: 'xlsx' });
                  }}
                  className="cursor-pointer text-xs font-semibold py-2 px-2.5 rounded-lg flex items-center gap-2 hover:bg-slate-50 dark:hover:bg-slate-800"
                >
                  <FileSpreadsheet className="h-4 w-4 text-emerald-600 dark:text-emerald-405 shrink-0" />
                  <span>Export to Excel</span>
                </DropdownMenuItem>

                <DropdownMenuItem
                  onClick={() => {
                    setExportMenuOpen(false);
                    runExport('pdf', { statusGroup: 'All' });
                  }}
                  className="cursor-pointer text-xs font-semibold py-2 px-2.5 rounded-lg flex items-center gap-2 hover:bg-slate-50 dark:hover:bg-slate-800"
                >
                  <FileText className="h-4 w-4 text-rose-600 dark:text-rose-455 shrink-0" />
                  <span>Export to PDF</span>
                </DropdownMenuItem>

                <DropdownMenuSeparator className="my-1 border-slate-100 dark:border-slate-800" />

                <DropdownMenuLabel className="text-[10px] font-bold tracking-wider uppercase text-slate-400 px-2 py-1">
                  Import Operations
                </DropdownMenuLabel>

                <DropdownMenuItem
                  onClick={() => {
                    setExportMenuOpen(false);
                    setImportDialogOpen(true);
                  }}
                  className="cursor-pointer text-xs font-semibold py-2 px-2.5 rounded-lg flex items-center gap-2 hover:bg-slate-50 dark:hover:bg-slate-800 text-blue-600 dark:text-blue-400"
                >
                  <Upload className="h-4 w-4 text-blue-600 dark:text-blue-455 shrink-0" />
                  <span>Import File (Excel / CSV)</span>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  size="sm"
                  className="h-9 gap-1.5 text-xs font-bold bg-brand hover:bg-[#d13d0d] text-white shadow-xs rounded-xl px-3.5 cursor-pointer flex items-center"
                >
                  <span>New Trip</span>
                  <ChevronDown className="h-3.5 w-3.5 text-white/80 ml-0.5" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-60 p-1.5 rounded-xl shadow-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 z-50">
                <DropdownMenuItem
                  onClick={() => navigate('/trips/new')}
                  className="cursor-pointer text-xs font-medium py-2.5 px-3 rounded-lg flex items-center gap-3 hover:bg-orange-50 dark:hover:bg-orange-950/40 focus:bg-orange-50 focus:text-brand"
                >
                  <Plus className="w-4 h-4 text-brand shrink-0" />
                  <div>
                    <div className="font-bold text-[#111111] dark:text-slate-100">Daily / Single Local Trip</div>
                    <div className="text-[10px] text-slate-500">Standard single dispatch trip</div>
                  </div>
                </DropdownMenuItem>

                <DropdownMenuItem
                  onClick={() => navigate('/trips/monthly?bulk=true')}
                  className="cursor-pointer text-xs font-medium py-2.5 px-3 rounded-lg flex items-center gap-3 hover:bg-orange-50 dark:hover:bg-orange-950/40 focus:bg-orange-50 focus:text-brand"
                >
                  <Layers className="w-4 h-4 text-indigo-600 shrink-0" />
                  <div>
                    <div className="font-bold text-[#111111] dark:text-slate-100">Monthly / Bulk Add Trips</div>
                    <div className="text-[10px] text-slate-500">Batch contract generator & import</div>
                  </div>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>

        {/* ── 2. Instrument-Panel KPI Cards (Trip Ledger Table View Only) ────────────────── */}
        {viewMode === 'table' && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-6 gap-4 shrink-0">
            <KpiCard
              title={kpiTitle}
              className="kpi-tint-trips"
              value={
                <span>
                  {periodCount}
                  <span className="text-[16px] font-semibold ml-1.5 opacity-85">Trips</span>
                </span>
              }
              variant="slate"
              description={kpiDescription}
              headerAction={
                <div className="flex items-center bg-slate-100 dark:bg-slate-800 p-0.5 rounded-lg border border-slate-200/80 dark:border-slate-700 shadow-2xs">
                  {(
                    [
                      { label: '1D', value: 'Today', title: 'Today (1D)' },
                      { label: '1W', value: 'ThisWeek', title: 'This Week (1W)' },
                      { label: '1M', value: 'ThisMonth', title: 'This Month (1M)' },
                    ] as const
                  ).map((period) => {
                    const active = kpiPeriod === period.value;
                    return (
                      <button
                        key={period.value}
                        type="button"
                        title={period.title}
                        onClick={(e) => {
                          e.stopPropagation();
                          setKpiPeriod(period.value);
                          setDateFilter(period.value);
                          setCurrentPage(1);
                        }}
                        className={cn(
                          "text-[9px] font-extrabold h-5 px-2 rounded-md transition-all cursor-pointer",
                          active
                            ? "bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900 shadow-xs font-black"
                            : "text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-200"
                        )}
                      >
                        {period.label}
                      </button>
                    );
                  })}
                </div>
              }
              semiCircleGauge={{
                segments: [
                  { label: "Completed", count: periodCompletedCount, color: "#10B981" },
                  { label: "In Transit", count: periodInTransitCount, color: "#64748B" },
                  { label: "Pending", count: periodQueueCount, color: "#94A3B8" },
                ],
              }}
              isActive={selectedStatus === 'All'}
              onClick={() => {
                setSelectedStatus('All');
                setCurrentPage(1);
              }}
            />

            <KpiCard
              title="LOADING GOODS"
              className="kpi-tint-trips"
              value={
                <span>
                  {atPickupCount}
                  <span className="text-[16px] font-semibold ml-1.5 opacity-85">At Pickup</span>
                </span>
              }
              variant="slate"
              description="Driver reached pickup point"
              icon={LoadingBox}
              isActive={selectedStatus === 'AtPickup'}
              onClick={() => {
                setSelectedStatus('AtPickup');
                setCurrentPage(1);
              }}
            />

            <KpiCard
              title="IN TRANSIT"
              className="kpi-tint-trips"
              value={
                <span>
                  {inTransitCount}
                  <span className="text-[16px] font-semibold ml-1.5 opacity-85">On Road</span>
                </span>
              }
              variant="emerald"
              description="Trucks on the road now"
              icon={RouteLine}
              isActive={selectedStatus === 'InTransit'}
              onClick={() => {
                setSelectedStatus('InTransit');
                setCurrentPage(1);
              }}
            />

            <KpiCard
              title="DELIVERED & COMPLETED"
              className="kpi-tint-trips"
              value={
                <span>
                  {completedCount}
                  <span className="text-[16px] font-semibold ml-1.5 opacity-85">Trips</span>
                </span>
              }
              variant="emerald"
              description={`Delivered: ${deliveredPendingInvoiceCount} | Invoiced: ${invoicedCount}`}
              icon={CheckBadge}
              isActive={selectedStatus === 'Completed,Invoiced' || selectedStatus === 'Completed' || selectedStatus === 'Invoiced'}
              onClick={() => {
                setSelectedStatus('Completed,Invoiced');
                setCurrentPage(1);
              }}
            />

            <KpiCard
              title="SCHEDULED TRIPS"
              className="kpi-tint-trips"
              value={
                <span>
                  {draftTrips.length}
                  <span className="text-[16px] font-semibold ml-1.5 opacity-85">Scheduled</span>
                </span>
              }
              variant="slate"
              description="Upcoming & planned trips"
              icon={ClockIcon}
              isActive={selectedStatus === 'Draft'}
              onClick={() => {
                setSelectedStatus('Draft');
                setCurrentPage(1);
              }}
            />

            <KpiCard
              title="DELAYED TRIPS"
              className="kpi-tint-trips"
              value={
                <span>
                  {delayedCount}
                  <span className="text-[16px] font-semibold ml-1.5 opacity-85">Overdue</span>
                </span>
              }
              variant="rose"
              description="Active trips past planned end time"
              icon={RiskAlert}
              isActive={selectedStatus === 'Issues'}
              onClick={() => {
                setSelectedStatus('Issues');
                setCurrentPage(1);
              }}
            />
          </div>
        )}

        {/* Control Toolbar (Search, Filter, View Switcher) */}
        <div className="flex flex-wrap items-center justify-between gap-3 shrink-0 bg-white dark:bg-slate-900 p-2.5 rounded-xl border border-slate-200/80 dark:border-slate-800 shadow-2xs relative z-10">
          <div className="flex flex-wrap items-center gap-2.5 flex-1 min-w-[280px]">
            {/* Reset Filters / Total Trips Button */}
            <button
              type="button"
              onClick={() => {
                setSelectedStatus('All');
                setSelectedCustomerId('All');
                setDateFilter('3Days');
                setSearch('');
                setCurrentPage(1);
                setTotalTripsResetKey(prev => prev + 1);
              }}
              className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-orange-50 dark:bg-orange-950/50 border border-orange-200/90 dark:border-orange-850/80 text-brand dark:text-orange-300 text-[11px] font-bold shadow-3xs hover:bg-orange-100/80 dark:hover:bg-orange-950/80 transition-all cursor-pointer h-8 shrink-0 group"
              title="Click to reset all filters"
            >
              <div className="w-1.5 h-1.5 rounded-full bg-brand" />
              <span className="font-extrabold text-orange-950 dark:text-orange-200">Trips:</span>
              <span className="font-mono text-[10px] font-black text-brand bg-white dark:bg-slate-900 px-1 py-0.2 rounded border border-orange-200/80 dark:border-orange-800 shadow-3xs">
                {rawTrips.length}
              </span>
            </button>

            {/* Search Input */}
            <div className="relative w-full sm:w-48 md:w-56 shrink-0">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
              <Input
                placeholder="Search trip ID, driver, vehicle..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-8 h-8 text-[11px] bg-slate-50 dark:bg-slate-800/50 border-slate-200 dark:border-slate-700 font-semibold"
              />
              {search && (
                <button
                  onClick={() => setSearch('')}
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            {/* Multi-Filter Dropdown Menu */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="outline"
                  size="sm"
                  className="h-8 gap-1.5 text-[11px] font-semibold bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 shadow-2xs cursor-pointer rounded-lg px-2.5 shrink-0"
                >
                  <Filter className="w-3.5 h-3.5 text-slate-400" />
                  <span>Filters</span>
                  {activeFiltersCount > 0 && (
                    <span className="ml-0.5 px-1 py-0.2 rounded-full bg-brand text-white text-[8px] font-black leading-none">
                      {activeFiltersCount}
                    </span>
                  )}
                  <ChevronDown className="w-2.5 h-2.5 text-slate-400" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="start" className="w-64 p-3.5 shadow-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 rounded-xl space-y-3 z-50">
                <DropdownMenuLabel className="text-[10px] font-bold tracking-wider uppercase text-slate-400 p-0">
                  Filter Trips
                </DropdownMenuLabel>
                <DropdownMenuSeparator className="my-1 border-slate-100 dark:border-slate-850" />
                
                <div className="space-y-2.5">
                  {/* Status Group / Exact State Filter */}
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Status</label>
                    <select
                      value={selectedStatus}
                      onChange={(e) => {
                        setSelectedStatus(e.target.value as any);
                        setCurrentPage(1);
                      }}
                      className="w-full h-8 px-2 py-1 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-xs font-semibold text-slate-800 dark:text-slate-200 focus:outline-none cursor-pointer"
                    >
                      <option value="All">All Statuses</option>
                      <option value="Active">Active</option>
                      <option value="Draft">Draft</option>
                      <option value="Dispatched">Dispatched</option>
                      <option value="AtPickup">Loading</option>
                      <option value="InTransit">In Transit</option>
                      <option value="AtDelivery">At Delivery</option>
                      <option value="Completed">Completed</option>
                      <option value="Invoiced">Invoiced</option>
                      <option value="Cancelled">Cancelled</option>
                    </select>
                  </div>

                  {/* Company Filter */}
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Company</label>
                    <Combobox
                      options={companyOptions}
                      value={selectedCustomerId}
                      onChange={(val) => {
                        setSelectedCustomerId(val);
                        setCurrentPage(1);
                      }}
                      placeholder="Select Company..."
                      searchPlaceholder="Search company..."
                      emptyText="No companies found."
                      triggerClassName="h-8 rounded-lg border-slate-200 dark:border-slate-800 text-xs font-semibold shadow-3xs"
                    />
                  </div>
                </div>

                {activeFiltersCount > 0 && (
                  <div className="pt-2 border-t border-slate-100 dark:border-slate-800/60 flex items-center justify-center">
                    <button
                      type="button"
                      onClick={() => {
                        setSelectedStatus('All');
                        setSelectedCustomerId('All');
                        setCurrentPage(1);
                      }}
                      className="text-[10px] font-bold text-brand hover:underline cursor-pointer"
                    >
                      Clear Filters
                    </button>
                  </div>
                )}
              </DropdownMenuContent>
            </DropdownMenu>

          </div>

          <div className="flex items-center gap-2.5">
            {/* Date Filter Picker */}
            <TripDateFilterPicker
              dateFilter={dateFilter}
              setDateFilter={setDateFilter}
              customDateRange={customDateRange}
              setCustomDateRange={setCustomDateRange}
            />

            {/* Sort Dropdown */}
            <SortDropdown
              value={sortOption as TripSortOption}
              onChange={(val) => setSortOption(val)}
              options={TRIP_SORT_OPTIONS}
            />

            {/* View Mode Switcher */}
            <div className="flex items-center bg-slate-100 dark:bg-slate-800 p-1 rounded-lg border border-slate-200/80 dark:border-slate-700">
              <button
                type="button"
                onClick={() => setViewMode('table')}
                className={`px-3 py-1.5 rounded-md text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer ${
                  viewMode === 'table'
                    ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 shadow-xs'
                    : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
                }`}
              >
                <LayoutList className="w-3.5 h-3.5" />
                <span>List</span>
              </button>

              <button
                type="button"
                onClick={() => setViewMode('kanban')}
                className={`px-3 py-1.5 rounded-md text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer ${
                  viewMode === 'kanban'
                    ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 shadow-xs'
                    : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
                }`}
              >
                <Kanban className="w-3.5 h-3.5" />
                <span>Kanban</span>
              </button>
            </div>
          </div>
        </div>

        {/* ── 3. Main View Canvas (Kanban or Ledger Table) ───────────────────── */}
        {viewMode === 'kanban' ? (
          <div className="flex-1 flex flex-col min-h-0 w-full gap-3 h-[calc(100vh-140px)] animate-fade-in">
            {/* Full-Height Kanban Board Canvas */}
            <div className="flex-1 min-h-0 relative">
              <TripKanbanBoard
                ref={kanbanBoardRef}
                trips={trips}
                statusFilter={selectedStatus !== 'All' ? (selectedStatus as string) : undefined}
                onStatusChange={handleKanbanStatusChange}
                onLogDelay={(trip) => setStatusDialogTrip(trip)}
                onShareWhatsapp={(trip) => openWhatsappShare([trip])}
                onDelete={(trip) => {
                  setConfirmModal({
                    isOpen: true,
                    title: 'Delete Trip',
                    message: `Are you sure you want to delete trip ${trip.ref_id}? This action cannot be undone.`,
                    onConfirm: async () => {
                      try {
                        await tripService.bulkDelete([trip.id]);
                        queryClient.invalidateQueries({ queryKey: ['trips'] });
                        queryClient.invalidateQueries({ queryKey: ['trips-kpi-summary'] });
                        toast.success(`Deleted trip ${trip.ref_id}`);
                      } catch (e) {
                        toast.error('Failed to delete trip');
                      }
                    }
                  });
                }}
                onOpenSettlement={(trip) => setSettlementModalTrip(trip)}
                onCreateTrip={() => navigate('/trips/new')}
                isLoading={isLoading}
                isError={isError}
                onRetry={() => refetch()}
              />
            </div>
          </div>
        ) : (
          <div className="w-full flex flex-col gap-3 animate-fade-in">
            {/* Active Filter Indicator Banner */}
            {selectedStatus !== 'All' && (
              <div className="bg-orange-50 dark:bg-orange-950/20 border border-orange-200/80 dark:border-orange-900/40 px-3.5 py-2 rounded-xl flex items-center justify-between gap-3 text-xs font-semibold text-orange-900 dark:text-orange-200 animate-fade-in shrink-0">
                <div className="flex items-center gap-2">
                  <Filter className="h-3.5 w-3.5 text-brand shrink-0" />
                  <span>
                    Filtered by status: <strong className="underline decoration-brand text-slate-900 dark:text-slate-100 font-bold">{STATUS_LABELS[selectedStatus] || selectedStatus}</strong> ({trips.length} trip{trips.length === 1 ? '' : 's'} matching)
                  </span>
                </div>
                <button
                  onClick={() => {
                    setSelectedStatus('All');
                    setCurrentPage(1);
                  }}
                  className="px-2.5 py-1 rounded-md bg-white dark:bg-slate-900 border border-orange-200 dark:border-orange-800 text-[11px] font-bold text-brand hover:bg-orange-100 dark:hover:bg-orange-950 transition-colors shadow-2xs cursor-pointer flex items-center gap-1.5"
                >
                  <span>Show All Operations</span>
                  <X className="w-3 h-3 shrink-0" />
                </button>
              </div>
            )}

            <div className="w-full flex flex-col">
              <DataTable
                key={`${selectedStatus}_${selectedCustomerId}_${dateFilter}_${totalTripsResetKey}`}
                title={
                  <span className="flex items-center gap-2">
                    <Layers className="w-4 h-4 text-brand" />
                    <span>Trip Ledger</span>
                  </span>
                }

                data={trips}
                columns={columns}
                enableSelection={true}
                selectionResetKey={selectionResetKey}
                compact={true}
                isLoading={isLoading}
                isError={isError}
                errorMessage={(error as Error)?.message || 'Failed to load trips.'}
                actionsElement={undefined}
                bulkActions={bulkActions}
                pageSize={pageSize}
                onPageSizeChange={(size) => setPageSize(size)}
                onRowClick={(row) => navigate(`/trips/${row.id}`)}
              />
            </div>
          </div>
        )}

        {/* Quick Status Update Modal (Dialog) */}
        <Dialog open={!!statusDialogTrip} onOpenChange={(open) => !open && setStatusDialogTrip(null)}>
          <DialogContent className="sm:max-w-[425px]">
            <DialogHeader>
              <DialogTitle className="text-sm font-bold flex items-center gap-2">
                <RefreshCw className="h-4 w-4 text-brand" />
                Update Trip Status
              </DialogTitle>
              <DialogDescription className="text-xs">
                Update operational status for trip <span className="font-mono font-bold text-brand">{statusDialogTrip?.ref_id || 'Draft'}</span>.
              </DialogDescription>
            </DialogHeader>

            <div className="py-4 space-y-3">
              <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                Select New Status:
              </label>
              <Select value={newStatus} onValueChange={(val) => { if (val) setNewStatus(val as any); }}>
                <SelectTrigger className="w-full text-xs font-semibold border-slate-200 rounded-lg">
                  <SelectValue placeholder="Select status" />
                </SelectTrigger>
                <SelectContent className="w-full p-1.5 shadow-lg border border-slate-200 bg-white rounded-xl">
                  {(() => {
                    const currentStatus = statusDialogTrip?.status as TripStatus;
                    
                    const ALLOWED_TRANSITIONS: Record<string, TripStatus[]> = {
                      Draft: ['Dispatched', 'Cancelled'] as TripStatus[],
                      Dispatched: ['AtPickup', 'Draft', 'Cancelled'] as TripStatus[],
                      AtPickup: ['InTransit', 'Cancelled'] as TripStatus[],
                      InTransit: ['AtDelivery', 'Cancelled'] as TripStatus[],
                      AtDelivery: ['Completed', 'Cancelled'] as TripStatus[],
                      Completed: ['Invoiced'] as TripStatus[],
                      Invoiced: [] as TripStatus[],
                      Cancelled: ['Draft'] as TripStatus[],
                    };

                    const allowed = ALLOWED_TRANSITIONS[currentStatus] || [];
                    const isValid = (status: string) => status === currentStatus || allowed.includes(status as TripStatus);

                    return (
                      <>
                        <SelectItem value="Draft" disabled={!isValid('Draft')} className="cursor-pointer text-xs font-medium py-1.5 px-2 rounded-md">
                          <span className="flex items-center gap-2"><span className="w-2 h-2 rounded-full bg-indigo-400 shrink-0" />Scheduled</span>
                        </SelectItem>
                        <SelectItem value="Dispatched" disabled={!isValid('Dispatched')} className="cursor-pointer text-xs font-medium py-1.5 px-2 rounded-md">
                          <span className="flex items-center gap-2"><span className="w-2 h-2 rounded-full bg-blue-500 shrink-0" />Dispatched</span>
                        </SelectItem>
                        <SelectItem value="AtPickup" disabled={!isValid('AtPickup')} className="cursor-pointer text-xs font-medium py-1.5 px-2 rounded-md">
                          <span className="flex items-center gap-2"><span className="w-2 h-2 rounded-full bg-sky-500 shrink-0" />Loading</span>
                        </SelectItem>
                        <SelectItem value="InTransit" disabled={!isValid('InTransit')} className="cursor-pointer text-xs font-medium py-1.5 px-2 rounded-md">
                          <span className="flex items-center gap-2"><span className="w-2 h-2 rounded-full bg-amber-500 shrink-0" />In Transit</span>
                        </SelectItem>
                        <SelectItem value="AtDelivery" disabled={!isValid('AtDelivery')} className="cursor-pointer text-xs font-medium py-1.5 px-2 rounded-md">
                          <span className="flex items-center gap-2"><span className="w-2 h-2 rounded-full bg-emerald-400 shrink-0" />At Delivery</span>
                        </SelectItem>
                        <SelectItem value="Completed" disabled={!isValid('Completed')} className="cursor-pointer text-xs font-medium py-1.5 px-2 rounded-md">
                          <span className="flex items-center gap-2"><span className="w-2 h-2 rounded-full bg-emerald-500 shrink-0" />Completed</span>
                        </SelectItem>
                        <SelectItem value="Invoiced" disabled={!isValid('Invoiced')} className="cursor-pointer text-xs font-medium py-1.5 px-2 rounded-md">
                          <span className="flex items-center gap-2"><span className="w-2 h-2 rounded-full bg-emerald-600 shrink-0" />Invoiced</span>
                        </SelectItem>
                        <SelectItem value="Cancelled" disabled={!isValid('Cancelled')} className="cursor-pointer text-xs font-medium py-1.5 px-2 rounded-md">
                          <span className="flex items-center gap-2"><span className="w-2 h-2 rounded-full bg-rose-500 shrink-0" />Cancelled</span>
                        </SelectItem>
                      </>
                    );
                  })()}
                </SelectContent>
              </Select>
            </div>

            <DialogFooter>
              <Button
                variant="outline"
                size="sm"
                className="text-xs"
                onClick={() => setStatusDialogTrip(null)}
                disabled={isUpdatingStatus}
              >
                Cancel
              </Button>
              <Button
                size="sm"
                className="text-xs font-bold bg-brand hover:bg-brand/90 text-white"
                onClick={handleUpdateStatus}
                disabled={isUpdatingStatus}
              >
                {isUpdatingStatus ? 'Saving...' : 'Update Status'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Date Range Export Dialog — the one filter that doesn't fit a dropdown item */}
        <Dialog open={exportDialogOpen} onOpenChange={(open) => !open && setExportDialogOpen(false)}>
          <DialogContent className="sm:max-w-[420px]">
            <DialogHeader>
              <DialogTitle className="text-sm font-bold flex items-center gap-2">
                <CalendarIcon className="h-4 w-4 text-brand" />
                Export by Date Range
              </DialogTitle>
              <DialogDescription className="text-xs">
                Pick a status and a date window, then export as {exportFormat.toUpperCase()}.
              </DialogDescription>
            </DialogHeader>

            <div className="py-2 space-y-3.5">
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-700 dark:text-slate-300">Status</label>
                <Select value={exportStatusGroup} onValueChange={(val) => val && setExportStatusGroup(val as ExportStatusGroup)}>
                  <SelectTrigger className="w-full h-9 text-xs font-semibold border-slate-200 rounded-lg">
                    <SelectValue placeholder="All Trips" />
                  </SelectTrigger>
                  <SelectContent className="w-full p-1.5 shadow-lg border border-slate-200 bg-white rounded-xl">
                    {EXPORT_STATUS_GROUPS.map(g => (
                      <SelectItem key={g.value} value={g.value} className="cursor-pointer text-xs font-medium py-1.5 px-2 rounded-md">
                        {g.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-700 dark:text-slate-300">From Date</label>
                  <Input
                    type="date"
                    value={exportStartDate}
                    onChange={(e) => setExportStartDate(e.target.value)}
                    className="h-9 text-xs border-slate-200 rounded-lg"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-700 dark:text-slate-300">To Date</label>
                  <Input
                    type="date"
                    value={exportEndDate}
                    onChange={(e) => setExportEndDate(e.target.value)}
                    className="h-9 text-xs border-slate-200 rounded-lg"
                  />
                </div>
              </div>

              <div className="flex items-center gap-1 p-1 rounded-lg bg-slate-100 w-fit">
                <button
                  onClick={() => setExportFormat('excel')}
                  className={`flex items-center gap-1.5 h-7 px-3 rounded-md text-[11px] font-bold transition-colors ${exportFormat === 'excel' ? 'bg-white text-emerald-700 shadow-2xs' : 'text-slate-500 hover:text-slate-700'}`}
                >
                  <FileSpreadsheet className="h-3.5 w-3.5 text-emerald-600" />
                  Excel
                </button>
                <button
                  onClick={() => setExportFormat('pdf')}
                  className={`flex items-center gap-1.5 h-7 px-3 rounded-md text-[11px] font-bold transition-colors ${exportFormat === 'pdf' ? 'bg-white text-rose-700 shadow-2xs' : 'text-slate-500 hover:text-slate-700'}`}
                >
                  <FileText className="h-3.5 w-3.5 text-rose-600" />
                  PDF
                </button>
              </div>
            </div>

            <DialogFooter>
              <Button
                variant="outline"
                size="sm"
                className="text-xs"
                onClick={() => setExportDialogOpen(false)}
                disabled={isExporting}
              >
                Cancel
              </Button>
              <Button
                size="sm"
                className={`text-xs font-bold gap-1.5 ${exportFormat === 'excel' ? 'border border-emerald-200 bg-emerald-50 text-emerald-700 hover:bg-emerald-100' : 'border border-rose-200 bg-rose-50 text-rose-700 hover:bg-rose-100'}`}
                onClick={handleDateRangeExport}
                disabled={isExporting}
              >
                {exportFormat === 'excel' ? <FileSpreadsheet className="h-3.5 w-3.5" /> : <FileText className="h-3.5 w-3.5" />}
                {isExporting ? 'Exporting...' : `Export ${exportFormat.toUpperCase()}`}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        <ExportModal
          isOpen={isCustomExportOpen}
          onClose={() => setIsCustomExportOpen(false)}
          title="Trip Ledger Export"
          fileNamePrefix="trips_export"
          sheetName="Trips"
          filteredData={tripsRes?.data || []}
          allData={allTripsRes?.data || []}
          totalCount={allTripsRes?.meta?.total || allTripsRes?.data?.length || 0}
          selectedData={selectedTripsForExport}
          columns={TRIP_EXPORT_COLUMNS}
          filters={TRIP_EXPORT_FILTERS}
          formats={['xlsx', 'csv', 'pdf']}
          rowDateAccessor={(t) => t.planned_start || t.createdAt}
        />

        {/* CSV Import Dialog */}
        {/* WhatsApp Share Dialog */}
        <Dialog open={whatsappDialogOpen} onOpenChange={(open) => !open && setWhatsappDialogOpen(false)}>
          <DialogContent className="sm:max-w-[460px] rounded-2xl p-6">
            <DialogHeader>
              <DialogTitle className="text-base font-extrabold flex items-center gap-2 text-emerald-600">
                <WhatsAppIcon className="w-5 h-5 text-emerald-500" />
                Share to WhatsApp
              </DialogTitle>
              <DialogDescription className="text-xs">
                Send trip manifest details directly via WhatsApp web or mobile app.
              </DialogDescription>
            </DialogHeader>

            <div className="py-4 space-y-4">
              {whatsappSelectedTrips.length === 1 ? (
                <div className="space-y-3">
                  <span className="text-xs font-bold text-slate-700 dark:text-slate-300">
                    Select Recipient:
                  </span>
                  
                  <div className="grid grid-cols-1 gap-2">
                    {/* Driver option */}
                    <label className={`flex items-center justify-between p-3 rounded-xl border-2 cursor-pointer transition-colors ${whatsappRecipientType === 'driver' ? 'border-emerald-500 bg-emerald-50/40 dark:bg-emerald-950/20' : 'border-slate-100 hover:bg-slate-50'}`}>
                      <div className="flex items-center gap-3">
                        <input
                          type="radio"
                          name="recipientType"
                          value="driver"
                          checked={whatsappRecipientType === 'driver'}
                          onChange={() => setWhatsappRecipientType('driver')}
                          disabled={!whatsappSelectedTrips[0]?.driver?.phone_primary}
                          className="text-emerald-600 focus:ring-emerald-500"
                        />
                        <div className="flex flex-col text-left">
                          <span className="text-xs font-bold text-slate-800">
                            Driver
                          </span>
                          <span className="text-[10px] text-slate-500 font-medium">
                            {whatsappSelectedTrips[0]?.driver 
                              ? `${whatsappSelectedTrips[0].driver.first_name} ${whatsappSelectedTrips[0].driver.last_name}`
                              : 'Unassigned'}
                          </span>
                        </div>
                      </div>
                      <span className="text-[11px] font-mono text-slate-600 font-bold bg-white dark:bg-slate-900 border border-slate-200/60 px-2 py-0.5 rounded-md">
                        {whatsappSelectedTrips[0]?.driver?.phone_primary || 'No phone number'}
                      </span>
                    </label>

                    {/* Customer option */}
                    <label className={`flex items-center justify-between p-3 rounded-xl border-2 cursor-pointer transition-colors ${whatsappRecipientType === 'customer' ? 'border-emerald-500 bg-emerald-50/40 dark:bg-emerald-950/20' : 'border-slate-100 hover:bg-slate-50'}`}>
                      <div className="flex items-center gap-3">
                        <input
                          type="radio"
                          name="recipientType"
                          value="customer"
                          checked={whatsappRecipientType === 'customer'}
                          onChange={() => setWhatsappRecipientType('customer')}
                          disabled={!whatsappSelectedTrips[0]?.customer?.contact_phone}
                          className="text-emerald-600 focus:ring-emerald-500"
                        />
                        <div className="flex flex-col text-left">
                          <span className="text-xs font-bold text-slate-800">
                            Customer
                          </span>
                          <span className="text-[10px] text-slate-500 font-medium">
                            {whatsappSelectedTrips[0]?.customer?.name || 'Unassigned'}
                          </span>
                        </div>
                      </div>
                      <span className="text-[11px] font-mono text-slate-600 font-bold bg-white dark:bg-slate-900 border border-slate-200/60 px-2 py-0.5 rounded-md">
                        {whatsappSelectedTrips[0]?.customer?.contact_phone || 'No phone number'}
                      </span>
                    </label>

                    {/* Custom number option */}
                    <label className={`flex flex-col gap-2.5 p-3 rounded-xl border-2 cursor-pointer transition-colors ${whatsappRecipientType === 'custom' ? 'border-emerald-500 bg-emerald-50/40 dark:bg-emerald-950/20' : 'border-slate-100 hover:bg-slate-50'}`}>
                      <div className="flex items-center gap-3">
                        <input
                          type="radio"
                          name="recipientType"
                          value="custom"
                          checked={whatsappRecipientType === 'custom'}
                          onChange={() => setWhatsappRecipientType('custom')}
                          className="text-emerald-600 focus:ring-emerald-500"
                        />
                        <span className="text-xs font-bold text-slate-800">
                          Custom Phone Number
                        </span>
                      </div>
                      
                      {whatsappRecipientType === 'custom' && (
                        <div className="pl-6 animate-slide-down">
                          <Input
                            placeholder="e.g. 966512345678"
                            value={whatsappCustomPhone}
                            onChange={(e) => setWhatsappCustomPhone(e.target.value)}
                            className="h-8 text-xs border-slate-200 focus-visible:ring-emerald-500/20 focus-visible:border-emerald-500"
                          />
                        </div>
                      )}
                    </label>
                  </div>
                </div>
              ) : (
                <div className="space-y-2">
                  <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                    Recipient Phone Number (Optional)
                  </label>
                  <Input
                    placeholder="e.g. 966512345678 (Leave blank to select chat inside WhatsApp)"
                    value={whatsappCustomPhone}
                    onChange={(e) => setWhatsappCustomPhone(e.target.value)}
                    className="h-9 text-xs border-slate-200 focus-visible:ring-emerald-500/20 focus-visible:border-emerald-500"
                  />
                  <p className="text-[10px] text-slate-400">
                    Note: Sharing multiple trips constructs a manifest summary text.
                  </p>
                </div>
              )}

              {/* Message text preview */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                  Message Preview:
                </label>
                <textarea
                  value={whatsappMessageText}
                  onChange={(e) => setWhatsappMessageText(e.target.value)}
                  className="w-full h-40 p-3 rounded-xl border border-slate-200 text-xs font-medium font-sans leading-relaxed focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 bg-slate-50/50 resize-none"
                />
              </div>
            </div>

            <DialogFooter className="gap-2">
              <Button
                variant="outline"
                size="sm"
                className="text-xs h-9 rounded-lg"
                onClick={() => setWhatsappDialogOpen(false)}
              >
                Cancel
              </Button>
              <Button
                size="sm"
                className="text-xs font-bold h-9 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg flex items-center gap-1.5 px-4"
                onClick={handleWhatsappSend}
              >
                <WhatsAppIcon className="w-4 h-4 text-white" />
                Open WhatsApp
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        <Dialog open={importDialogOpen} onOpenChange={(open) => !open && resetImportDialog()}>
          <DialogContent className="sm:max-w-[480px]">
            <DialogHeader>
              <DialogTitle className="text-sm font-bold flex items-center gap-2">
                <Upload className="h-4 w-4 text-brand" />
                Import Trips
              </DialogTitle>
              <DialogDescription className="text-xs">
                Bulk-create trips from a spreadsheet (.xlsx or .csv). Route stops aren't linked to a saved Location — add those per trip afterward.
              </DialogDescription>
            </DialogHeader>

            <div className="py-2 space-y-3.5">
              {!importResult && (
                <>
                  <div className="flex items-center justify-between rounded-lg border border-slate-200 bg-slate-50 px-3 py-2.5">
                    <div className="text-[11px] text-slate-600 leading-snug">
                      Columns: <span className="font-mono font-semibold">Customer Name</span> (required),{' '}
                      <span className="font-mono font-semibold">Driver Name</span>,{' '}
                      <span className="font-mono font-semibold">Vehicle Plate</span>,{' '}
                      <span className="font-mono font-semibold">Planned Start</span>,{' '}
                      <span className="font-mono font-semibold">Rate Category</span>,{' '}
                      <span className="font-mono font-semibold">Vehicle Type</span>,{' '}
                      <span className="font-mono font-semibold">Billing Type</span>,{' '}
                      <span className="font-mono font-semibold">Origin</span>,{' '}
                      <span className="font-mono font-semibold">Destination</span>,{' '}
                      <span className="font-mono font-semibold">Billing Amount</span>,{' '}
                      <span className="font-mono font-semibold">Driver Charge</span>
                    </div>
                  </div>

                  <Button
                    variant="outline"
                    size="sm"
                    className="w-full h-9 gap-1.5 text-xs font-semibold border-slate-200"
                    onClick={downloadImportTemplate}
                  >
                    <Download className="h-3.5 w-3.5 text-slate-600" />
                    Download CSV Template
                  </Button>

                  <label className="flex flex-col items-center justify-center gap-1.5 border-2 border-dashed border-slate-200 rounded-lg py-6 cursor-pointer hover:border-brand/40 hover:bg-orange-50/30 transition-colors">
                    <Upload className="h-5 w-5 text-slate-400" />
                    <span className="text-xs font-semibold text-slate-700">
                      {importFileName || 'Click to choose a file'}
                    </span>
                    <span className="text-[10px] text-slate-400">.xlsx or .csv, up to 500 rows</span>
                    <input type="file" accept=".xlsx,.csv" className="hidden" onChange={handleImportFileChange} />
                  </label>

                  {importParseError && (
                    <div className="flex items-start gap-2 rounded-lg border border-rose-200 bg-rose-50 px-3 py-2.5 text-xs text-rose-700">
                      <AlertTriangle className="h-3.5 w-3.5 shrink-0 mt-0.5" />
                      {importParseError}
                    </div>
                  )}

                  {importRows.length > 0 && (
                    <div className="space-y-3">
                      <div className="rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs text-emerald-700 font-semibold flex items-center justify-between">
                        <span>{importRows.length} trip{importRows.length > 1 ? 's' : ''} ready from "{importFileName}".</span>
                        <Badge variant="outline" className="bg-white text-emerald-800 border-emerald-300 font-mono text-[10px]">
                          {importRows.filter(r => r.driver_name).length} with drivers
                        </Badge>
                      </div>

                      {/* Driver Disambiguation Section */}
                      {(() => {
                        const uniqueDriverNames = Array.from(new Set(importRows.map(r => r.driver_name).filter(Boolean))) as string[];
                        const ambiguousOrUnmatched = uniqueDriverNames.map(name => {
                          let candidates = findDriverCandidates(name, activeImportDrivers);

                          // Cross-verify with Vehicle Plate Number if candidate is not uniquely matched
                          if (candidates.length !== 1) {
                            const matchingRows = importRows.filter(r => (r.driver_name || '').trim().toLowerCase() === name.trim().toLowerCase());
                            const rowPlates = Array.from(new Set(matchingRows.map(r => (r.vehicle_plate || '').replace(/[\s-]/g, '').toLowerCase()).filter(Boolean)));

                            if (rowPlates.length > 0) {
                              const plateMatchedDriverIds = new Set<string>();

                              activeImportDrivers.forEach((d: any) => {
                                const assignedPlate = (d.assignedVehicle?.plate_number || '').replace(/[\s-]/g, '').toLowerCase();
                                if (assignedPlate && rowPlates.includes(assignedPlate)) {
                                  plateMatchedDriverIds.add(d.id);
                                }
                                if (d.assignedVehicleId) {
                                  const matchedV = activeImportVehicles.find((v: any) => v.id === d.assignedVehicleId);
                                  if (matchedV) {
                                    const vPlate = (matchedV.plate_number || '').replace(/[\s-]/g, '').toLowerCase();
                                    if (vPlate && rowPlates.includes(vPlate)) {
                                      plateMatchedDriverIds.add(d.id);
                                    }
                                  }
                                }
                              });

                              if (plateMatchedDriverIds.size > 0) {
                                const plateCandidates = activeImportDrivers.filter((d: any) => plateMatchedDriverIds.has(d.id));
                                if (plateCandidates.length > 0) {
                                  candidates = plateCandidates;
                                }
                              }
                            }
                          }

                          return { name, candidates };
                        });

                        const needingReview = ambiguousOrUnmatched.filter(e => e.candidates.length !== 1);

                        if (needingReview.length === 0) return null;

                        return (
                          <div className="p-3 bg-amber-50/80 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-900 rounded-xl space-y-2.5 max-h-56 overflow-y-auto">
                            <div className="flex items-center gap-2 text-xs font-bold text-amber-900 dark:text-amber-200">
                              <AlertTriangle className="h-4 w-4 text-amber-600 shrink-0" />
                              <span>Driver Review & Confirmation ({needingReview.length} name(s)):</span>
                            </div>
                            {needingReview.map(({ name, candidates }) => (
                              <div key={name} className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 p-2 bg-white dark:bg-slate-900 rounded-lg border border-amber-200/70 text-xs">
                                <div>
                                  Sheet Name: <strong className="font-mono text-brand">{name}</strong>
                                  <span className="text-[10px] text-slate-500 block">
                                    {candidates.length > 1 ? `${candidates.length} matching candidates found` : 'No exact candidate found'}
                                  </span>
                                </div>
                                <Select
                                  value={driverMappings[name] || (candidates.length === 1 ? candidates[0].id : 'none')}
                                  onValueChange={(val) => setDriverMappings(prev => ({ ...prev, [name]: val }))}
                                >
                                  <SelectTrigger className="h-8 text-xs w-[210px] bg-slate-50 dark:bg-slate-800">
                                    <SelectValue placeholder="Select Driver..." />
                                  </SelectTrigger>
                                  <SelectContent align="end" className="w-56 max-h-48 overflow-y-auto">
                                    <SelectItem value="none">Leave Unassigned / Draft</SelectItem>
                                    {candidates.map(c => (
                                      <SelectItem key={c.id} value={c.id}>
                                        {c.first_name} {c.last_name}
                                      </SelectItem>
                                    ))}
                                    {candidates.length === 0 && activeImportDrivers.map(d => (
                                      <SelectItem key={d.id} value={d.id}>
                                        {d.first_name} {d.last_name}
                                      </SelectItem>
                                    ))}
                                  </SelectContent>
                                </Select>
                              </div>
                            ))}
                          </div>
                        );
                      })()}
                    </div>
                  )}
                </>
              )}

              {importResult && (
                <div className="space-y-2.5">
                  <div className="flex items-center gap-3">
                    <div className="flex-1 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2.5 text-center">
                      <div className="text-lg font-extrabold text-emerald-700">{importResult.imported}</div>
                      <div className="text-[10px] font-semibold text-emerald-600 uppercase tracking-wide">Imported</div>
                    </div>
                    <div className="flex-1 rounded-lg border border-rose-200 bg-rose-50 px-3 py-2.5 text-center">
                      <div className="text-lg font-extrabold text-rose-700">{importResult.failed}</div>
                      <div className="text-[10px] font-semibold text-rose-600 uppercase tracking-wide">Failed</div>
                    </div>
                  </div>

                  {importResult.failed > 0 && (
                    <div className="max-h-40 overflow-y-auto rounded-lg border border-slate-200 divide-y divide-slate-100">
                      {importResult.results.filter(r => !r.success).map(r => (
                        <div key={r.row} className="px-3 py-1.5 text-[11px] text-slate-600">
                          <span className="font-mono font-bold text-rose-600">Row {r.row}:</span> {r.error}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>

            <DialogFooter>
              {importResult ? (
                <Button
                  size="sm"
                  className="text-xs font-bold bg-brand hover:bg-brand/90 text-white"
                  onClick={resetImportDialog}
                >
                  Done
                </Button>
              ) : (
                <>
                  <Button
                    variant="outline"
                    size="sm"
                    className="text-xs"
                    onClick={resetImportDialog}
                    disabled={isImporting}
                  >
                    Cancel
                  </Button>
                  <Button
                    size="sm"
                    className="text-xs font-bold bg-brand hover:bg-brand/90 text-white"
                    onClick={handleConfirmImport}
                    disabled={isImporting || !importRows.length}
                  >
                    {isImporting ? 'Importing...' : `Import ${importRows.length || ''} Trip${importRows.length === 1 ? '' : 's'}`}
                  </Button>
                </>
              )}
            </DialogFooter>
          </DialogContent>
        </Dialog>

        <ConfirmModal
          isOpen={confirmModal.isOpen}
          onClose={() => setConfirmModal(prev => ({ ...prev, isOpen: false }))}
          onConfirm={async () => {
            await confirmModal.onConfirm();
            setConfirmModal(prev => ({ ...prev, isOpen: false }));
          }}
          title={confirmModal.title}
          message={confirmModal.message}
          isDestructive={true}
        />

        {/* ── Entity Profile Preview Modals ───────────────────────────────── */}
        <VehiclePreviewModal
          vehicle={previewVehicle}
          isOpen={!!previewVehicle}
          onClose={() => setPreviewVehicle(null)}
          onEdit={(v) => setEditVehicle(v)}
        />

        <CustomerPreviewModal
          customer={previewCustomer}
          isOpen={!!previewCustomer}
          onClose={() => setPreviewCustomer(null)}
          onEdit={(c) => setEditCustomer(c)}
        />

        <ThirdPartyPreviewModal
          provider={previewThirdParty}
          isOpen={!!previewThirdParty}
          onClose={() => setPreviewThirdParty(null)}
          onEdit={(p) => setEditThirdParty(p)}
        />

        <DriverPreviewModal
          driver={previewDriver}
          isOpen={!!previewDriver}
          onClose={() => setPreviewDriver(null)}
          onEdit={(d) => setEditDriver(d)}
        />

        {/* ── Entity Profile Edit Modals ────────────────────────────────── */}
        {editCustomer && (
          <EditCustomerModal
            isOpen={!!editCustomer}
            customer={editCustomer}
            onClose={() => setEditCustomer(null)}
          />
        )}

        {editThirdParty && (
          <EditThirdPartyModal
            isOpen={!!editThirdParty}
            provider={editThirdParty}
            onClose={() => setEditThirdParty(null)}
          />
        )}

        {editDriver && (
          <EditDriverModal
            isOpen={!!editDriver}
            driver={editDriver}
            onClose={() => setEditDriver(null)}
          />
        )}

        {editVehicle && (
          <EditVehicleModal
            isOpen={!!editVehicle}
            vehicle={editVehicle}
            onClose={() => setEditVehicle(null)}
          />
        )}

        {/* ── Entity Profile Creation Modals ──────────────────────────────── */}
        <CreateVehicleModal
          isOpen={isCreateVehicleOpen}
          onClose={() => setIsCreateVehicleOpen(false)}
        />

        <CreateCustomerModal
          isOpen={isCreateCustomerOpen}
          onClose={() => setIsCreateCustomerOpen(false)}
        />

        <CreateDriverModal
          isOpen={isCreateDriverOpen}
          onClose={() => setIsCreateDriverOpen(false)}
        />

        {/* ── Status Transition Confirmation Modal ──────────────────────────── */}
        <ConfirmModal
          isOpen={statusConfirmModal.isOpen}
          onClose={() => setStatusConfirmModal((prev) => ({ ...prev, isOpen: false }))}
          onConfirm={handleConfirmKanbanStatusChange}
          title={statusConfirmModal.title}
          message={statusConfirmModal.message}
          confirmLabel={statusConfirmModal.confirmLabel}
          isLoading={statusConfirmModal.isLoading}
        />

        {/* ── Post-Trip Financial Settlement & Extra Charges Modal ─────────── */}
        <PostTripSettlementModal
          isOpen={!!settlementModalTrip}
          onClose={() => setSettlementModalTrip(null)}
          trip={settlementModalTrip}
          onSuccess={() => {
            queryClient.invalidateQueries({ queryKey: ['trips'] });
            queryClient.invalidateQueries({ queryKey: ['trips-kpi-summary'] });
            toast.success('Financial settlement & charges updated successfully');
          }}
        />

        <PastDateTripConfirmModal
          open={pastDateModalOpen}
          onClose={() => setPastDateModalOpen(false)}
          onConfirm={handlePastDateImportConfirm}
          analysis={pastDateAnalysis}
          isSubmitting={isImporting}
        />
      </div>
    </DashboardLayout>

  );
}
