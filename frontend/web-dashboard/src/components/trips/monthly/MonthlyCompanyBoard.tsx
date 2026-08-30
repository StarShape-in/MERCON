import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Truck,
  User,
  MapPin,
  Calendar,
  AlertTriangle,
  ArrowRight,
  Phone,
  ArrowUpRight,
  Trash2,
  Building2,
  RotateCcw,
  CheckSquare,
  Square,
  ChevronRight,
} from 'lucide-react';

import StatusBadge from '@/components/ui/StatusBadge';
import { Checkbox } from '@/components/ui/checkbox';
import type { MonthlyBoardCompany, MonthlyBoardTrip } from '@/services/tripService';
import { formatDayHeading, formatMoney, formatTime, initialsOf, isUnassigned, formatLocationClean } from './monthlyBoardUtils';
import { computeMonthlyTripSearchRelevance } from './MonthlyCompanyCard';

interface MonthlyCompanyBoardProps {
  companies: MonthlyBoardCompany[];
  selectedTripIds?: string[];
  search?: string;
  onToggleTrip?: (id: string) => void;
  onToggleCompany?: (tripIds: string[]) => void;
  onSelectTrip?: (trip: MonthlyBoardTrip) => void;
}

export interface TemplatePalette {
  badgeBg: string;
  badgeText: string;
  badgeBorder: string;
  countBg: string;
  countText: string;
  countBorder: string;
  iconColor: string;
  arrowColor: string;
  dateBg: string;
  dateText: string;
  dateBorder: string;
  cardBorderHover: string;
  deckBorder: string;
  moreBtnText: string;
  moreBtnBorder: string;
}

const TEMPLATE_PALETTES: TemplatePalette[] = [
  // Palette 0: Indigo / Blue
  {
    badgeBg: 'bg-indigo-100/90 dark:bg-indigo-950/80',
    badgeText: 'text-indigo-800 dark:text-indigo-200',
    badgeBorder: 'border-indigo-200/90 dark:border-indigo-800/80',
    countBg: 'bg-indigo-50 dark:bg-indigo-950/60',
    countText: 'text-indigo-700 dark:text-indigo-300',
    countBorder: 'border-indigo-200 dark:border-indigo-800',
    iconColor: 'text-indigo-600 dark:text-indigo-400',
    arrowColor: 'text-indigo-600 dark:text-indigo-400',
    dateBg: 'bg-indigo-50 dark:bg-indigo-950/60',
    dateText: 'text-indigo-950 dark:text-indigo-200',
    dateBorder: 'border-indigo-200/80 dark:border-indigo-800/80',
    cardBorderHover: 'hover:border-indigo-300 dark:hover:border-indigo-700',
    deckBorder: 'border-indigo-200/80',
    moreBtnText: 'text-indigo-700 dark:text-indigo-300',
    moreBtnBorder: 'border-indigo-200/80 dark:border-indigo-800/80',
  },
  // Palette 1: Emerald / Green
  {
    badgeBg: 'bg-emerald-100/90 dark:bg-emerald-950/80',
    badgeText: 'text-emerald-800 dark:text-emerald-200',
    badgeBorder: 'border-emerald-200/90 dark:border-emerald-800/80',
    countBg: 'bg-emerald-50 dark:bg-emerald-950/60',
    countText: 'text-emerald-700 dark:text-emerald-300',
    countBorder: 'border-emerald-200 dark:border-emerald-800',
    iconColor: 'text-emerald-600 dark:text-emerald-400',
    arrowColor: 'text-emerald-600 dark:text-emerald-400',
    dateBg: 'bg-emerald-50 dark:bg-emerald-950/60',
    dateText: 'text-emerald-950 dark:text-emerald-200',
    dateBorder: 'border-emerald-200/80 dark:border-emerald-800/80',
    cardBorderHover: 'hover:border-emerald-300 dark:hover:border-emerald-700',
    deckBorder: 'border-emerald-200/80',
    moreBtnText: 'text-emerald-700 dark:text-emerald-300',
    moreBtnBorder: 'border-emerald-200/80 dark:border-emerald-800/80',
  },
  // Palette 2: Sky Blue
  {
    badgeBg: 'bg-sky-100/90 dark:bg-sky-950/80',
    badgeText: 'text-sky-800 dark:text-sky-200',
    badgeBorder: 'border-sky-200/90 dark:border-sky-800/80',
    countBg: 'bg-sky-50 dark:bg-sky-950/60',
    countText: 'text-sky-700 dark:text-sky-300',
    countBorder: 'border-sky-200 dark:border-sky-800',
    iconColor: 'text-sky-600 dark:text-sky-400',
    arrowColor: 'text-sky-600 dark:text-sky-400',
    dateBg: 'bg-sky-50 dark:bg-sky-950/60',
    dateText: 'text-sky-950 dark:text-sky-200',
    dateBorder: 'border-sky-200/80 dark:border-sky-800/80',
    cardBorderHover: 'hover:border-sky-300 dark:hover:border-sky-700',
    deckBorder: 'border-sky-200/80',
    moreBtnText: 'text-sky-700 dark:text-sky-300',
    moreBtnBorder: 'border-sky-200/80 dark:border-sky-800/80',
  },
  // Palette 3: Violet / Purple
  {
    badgeBg: 'bg-purple-100/90 dark:bg-purple-950/80',
    badgeText: 'text-purple-800 dark:text-purple-200',
    badgeBorder: 'border-purple-200/90 dark:border-purple-800/80',
    countBg: 'bg-purple-50 dark:bg-purple-950/60',
    countText: 'text-purple-700 dark:text-purple-300',
    countBorder: 'border-purple-200 dark:border-purple-800',
    iconColor: 'text-purple-600 dark:text-purple-400',
    arrowColor: 'text-purple-600 dark:text-purple-400',
    dateBg: 'bg-purple-50 dark:bg-purple-950/60',
    dateText: 'text-purple-950 dark:text-purple-200',
    dateBorder: 'border-purple-200/80 dark:border-purple-800/80',
    cardBorderHover: 'hover:border-purple-300 dark:hover:border-purple-700',
    deckBorder: 'border-purple-200/80',
    moreBtnText: 'text-purple-700 dark:text-purple-300',
    moreBtnBorder: 'border-purple-200/80 dark:border-purple-800/80',
  },
  // Palette 4: Amber / Warm Orange
  {
    badgeBg: 'bg-amber-100/90 dark:bg-amber-950/80',
    badgeText: 'text-amber-800 dark:text-amber-200',
    badgeBorder: 'border-amber-200/90 dark:border-amber-800/80',
    countBg: 'bg-amber-50 dark:bg-amber-950/60',
    countText: 'text-amber-700 dark:text-amber-300',
    countBorder: 'border-amber-200 dark:border-amber-800',
    iconColor: 'text-amber-600 dark:text-amber-400',
    arrowColor: 'text-amber-600 dark:text-amber-400',
    dateBg: 'bg-amber-50 dark:bg-amber-950/60',
    dateText: 'text-amber-950 dark:text-amber-200',
    dateBorder: 'border-amber-200/80 dark:border-amber-800/80',
    cardBorderHover: 'hover:border-amber-300 dark:hover:border-amber-700',
    deckBorder: 'border-amber-200/80',
    moreBtnText: 'text-amber-700 dark:text-amber-300',
    moreBtnBorder: 'border-amber-200/80 dark:border-amber-800/80',
  },
  // Palette 5: Teal / Cyan
  {
    badgeBg: 'bg-teal-100/90 dark:bg-teal-950/80',
    badgeText: 'text-teal-800 dark:text-teal-200',
    badgeBorder: 'border-teal-200/90 dark:border-teal-800/80',
    countBg: 'bg-teal-50 dark:bg-teal-950/60',
    countText: 'text-teal-700 dark:text-teal-300',
    countBorder: 'border-teal-200 dark:border-teal-800',
    iconColor: 'text-teal-600 dark:text-teal-400',
    arrowColor: 'text-teal-600 dark:text-teal-400',
    dateBg: 'bg-teal-50 dark:bg-teal-950/60',
    dateText: 'text-teal-950 dark:text-teal-200',
    dateBorder: 'border-teal-200/80 dark:border-teal-800/80',
    cardBorderHover: 'hover:border-teal-300 dark:hover:border-teal-700',
    deckBorder: 'border-teal-200/80',
    moreBtnText: 'text-teal-700 dark:text-teal-300',
    moreBtnBorder: 'border-teal-200/80 dark:border-teal-800/80',
  },
];

function getTemplatePalette(key: string, index: number): TemplatePalette {
  let hash = 0;
  for (let i = 0; i < key.length; i++) {
    hash = (hash << 5) - hash + key.charCodeAt(i);
    hash |= 0;
  }
  const paletteIndex = Math.abs(hash + index) % TEMPLATE_PALETTES.length;
  return TEMPLATE_PALETTES[paletteIndex];
}

export default function MonthlyCompanyBoard({
  companies,
  selectedTripIds = [],
  search = '',
  onToggleTrip,
  onToggleCompany,
  onSelectTrip,
}: MonthlyCompanyBoardProps) {
  return (
    <div className="w-full overflow-x-auto pb-6">
      <div className="flex gap-4 min-w-max items-start">
        {companies.map((company) => (
          <CompanyColumn
            key={company.customer.id}
            company={company}
            selectedTripIds={selectedTripIds}
            search={search}
            onToggleTrip={onToggleTrip}
            onToggleCompany={onToggleCompany}
            onSelectTrip={onSelectTrip}
          />
        ))}
      </div>
    </div>
  );
}

export interface TemplateGroup {
  key: string;
  lineType: string;
  vehicleClass: string;
  origin: string;
  destination: string;
  rateStr: string;
  trips: MonthlyBoardTrip[];
  threeDayTrips: MonthlyBoardTrip[];
  otherTrips: MonthlyBoardTrip[];
}

function getThreeDayDateStrings(): string[] {
  const today = new Date();
  const dates: string[] = [];
  for (let i = 0; i < 3; i++) {
    const d = new Date(today);
    d.setDate(today.getDate() + i);
    const yyyy = d.getFullYear();
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    const dd = String(d.getDate()).padStart(2, '0');
    dates.push(`${yyyy}-${mm}-${dd}`);
  }
  return dates;
}

function getTodayDateString(): string {
  const d = new Date();
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
}

function shouldShowTripOnMonthlyBoard(trip: MonthlyBoardTrip, todayStr: string): boolean {
  const status = (trip.status || '').toLowerCase().trim();
  const isTerminalCompleted =
    status === 'completed' || status === 'invoiced' || status === 'delivered' || status === 'cancelled';

  if (isTerminalCompleted) {
    // Show completed/terminal trips ONLY if their date is TODAY
    return trip.date.startsWith(todayStr);
  }
  // Show all active/scheduled trips
  return true;
}

function CompanyProfileLogo({ customer }: { customer: { name: string; avatar_url?: string | null; logo_url?: string | null } }) {
  const logoUrl = customer.logo_url || customer.avatar_url;
  if (logoUrl) {
    return (
      <img
        src={logoUrl}
        alt={customer.name}
        className="h-8 w-8 shrink-0 rounded-lg object-contain border border-slate-200 dark:border-slate-800 bg-white p-0.5 shadow-3xs"
      />
    );
  }

  return (
    <span className="h-8 w-8 shrink-0 rounded-lg bg-indigo-50 dark:bg-indigo-950/60 border border-indigo-200 dark:border-indigo-800 text-indigo-700 dark:text-indigo-300 grid place-items-center text-xs font-extrabold shadow-3xs">
      {initialsOf(customer.name)}
    </span>
  );
}

function CompanyColumn({
  company,
  selectedTripIds = [],
  search = '',
  onToggleTrip,
  onToggleCompany,
  onSelectTrip,
}: {
  company: MonthlyBoardCompany;
  selectedTripIds?: string[];
  search?: string;
  onToggleTrip?: (id: string) => void;
  onToggleCompany?: (tripIds: string[]) => void;
  onSelectTrip?: (trip: MonthlyBoardTrip) => void;
}) {
  const navigate = useNavigate();
  const handleSelectTrip = onSelectTrip || ((t: MonthlyBoardTrip) => navigate(`/trips/${t.id}`));

  const allCompanyTrips = useMemo(() => {
    const todayStr = getTodayDateString();
    const list = company.days.flatMap((day) => day.trips);

    // Rule: Hide completed trips except completed of Today
    const filteredTrips = list.filter((t) => shouldShowTripOnMonthlyBoard(t, todayStr));

    if (!search || !search.trim()) return filteredTrips;
    return filteredTrips.filter((t) => computeMonthlyTripSearchRelevance(t, search) > 0);
  }, [company, search]);

  const companyTripIds = useMemo(() => allCompanyTrips.map((t) => t.id), [allCompanyTrips]);
  const unassignedCount = useMemo(() => allCompanyTrips.filter((t) => isUnassigned(t)).length, [allCompanyTrips]);

  const allSelected =
    companyTripIds.length > 0 && companyTripIds.every((id) => selectedTripIds.includes(id));
  const someSelected =
    !allSelected && companyTripIds.some((id) => selectedTripIds.includes(id));

  // Group company trips by Template = Line Type + Vehicle Class + Route / Stops + Billing Rate
  const templateGroups = useMemo(() => {
    const threeDayDates = getThreeDayDateStrings();
    const map = new Map<string, TemplateGroup>();

    for (const trip of allCompanyTrips) {
      const lineType = trip.rate_category || trip.billing_type || 'Single Trip';
      const vehicleClass = trip.vehicle_type || 'Standard Truck';
      const origin = formatLocationClean(trip.origin);
      const destination = formatLocationClean(trip.destination);
      const rateStr = trip.billing_amount != null ? formatMoney(trip.billing_amount, trip.currency) : '—';
      const key = `${lineType}||${vehicleClass}||${origin}→${destination}||${rateStr}`;

      let group = map.get(key);
      if (!group) {
        group = {
          key,
          lineType,
          vehicleClass,
          origin,
          destination,
          rateStr,
          trips: [],
          threeDayTrips: [],
          otherTrips: [],
        };
        map.set(key, group);
      }
      group.trips.push(trip);
    }

    // Partition trips into threeDayTrips (Today & Next 2 Days) and otherTrips
    const groups: TemplateGroup[] = [];
    map.forEach((g) => {
      // Sort trips by date & time
      g.trips.sort((a, b) => {
        const dateCompare = a.date.localeCompare(b.date);
        if (dateCompare !== 0) return dateCompare;
        return (a.planned_start || '').localeCompare(b.planned_start || '');
      });

      // Filter for Today and next 2 days
      const threeDayMatches = g.trips.filter((t) => threeDayDates.some((d) => t.date.startsWith(d)));

      if (threeDayMatches.length > 0) {
        g.threeDayTrips = threeDayMatches.slice(0, 3);
        const threeDaySet = new Set(g.threeDayTrips.map((t) => t.id));
        g.otherTrips = g.trips.filter((t) => !threeDaySet.has(t.id));
      } else {
        // Fallback if no trips fall exactly on Today/Tomorrow/Day+2: take earliest 3 trips
        g.threeDayTrips = g.trips.slice(0, 3);
        g.otherTrips = g.trips.slice(3);
      }

      groups.push(g);
    });

    // Sort template groups by volume (busiest template first)
    return groups.sort((a, b) => b.trips.length - a.trips.length);
  }, [allCompanyTrips]);

  return (
    <div className="w-[360px] shrink-0 rounded-xl border border-slate-200 bg-slate-50/80 shadow-xs flex flex-col max-h-[780px] overflow-hidden">
      {/* ── Column Header ────────────────────────────────────────────── */}
      <div className="p-3.5 bg-white border-b border-slate-200 flex flex-col gap-2 shrink-0">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2.5 min-w-0">
            {onToggleCompany && (
              <Checkbox
                checked={allSelected ? true : someSelected ? 'indeterminate' : false}
                onCheckedChange={() => onToggleCompany(companyTripIds)}
                className="h-4 w-4 rounded border-slate-300 data-[state=checked]:bg-brand data-[state=checked]:border-brand shrink-0"
                aria-label={`Select all trips for ${company.customer.name}`}
              />
            )}
            <CompanyProfileLogo customer={company.customer} />
            <div className="min-w-0">
              <h3 className="text-xs font-bold text-slate-900 truncate leading-tight" title={company.customer.name}>
                {company.customer.name}
              </h3>
              <p className="text-[10px] text-slate-500 truncate mt-0.5 font-medium">
                {company.total_billed > 0 ? formatMoney(company.total_billed) : 'Monthly Account'}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-1 shrink-0">
            <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-blue-50 text-blue-700 border border-blue-200">
              {allCompanyTrips.length}
            </span>
            {unassignedCount > 0 && (
              <span
                className="px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-amber-50 text-amber-700 border border-amber-200"
                title={`${unassignedCount} trips need assignment`}
              >
                {unassignedCount} gap
              </span>
            )}
          </div>
        </div>
      </div>

      {/* ── Column Body: Template Cards ───────────────────────────────── */}
      <div className="p-3 overflow-y-auto space-y-3.5 flex-1">
        {templateGroups.length === 0 ? (
          <div className="p-6 text-center text-xs text-slate-400 font-medium border border-dashed border-slate-200 rounded-lg bg-white">
            No scheduled trips
          </div>
        ) : (
          templateGroups.map((group, idx) => (
            <TemplateBigCard
              key={group.key}
              group={group}
              index={idx}
              selectedTripIds={selectedTripIds}
              onToggleTrip={onToggleTrip}
              onSelectTrip={handleSelectTrip}
            />
          ))
        )}
      </div>
    </div>
  );
}

/** Big Card for a specific Template (Line Type + Vehicle Class + Route + Rate) */
function TemplateBigCard({
  group,
  index = 0,
  selectedTripIds = [],
  onToggleTrip,
  onSelectTrip,
}: {
  group: TemplateGroup;
  index?: number;
  selectedTripIds?: string[];
  onToggleTrip?: (id: string) => void;
  onSelectTrip: (trip: MonthlyBoardTrip) => void;
}) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [isHovered, setIsHovered] = useState(false);

  const palette = useMemo(() => getTemplatePalette(group.key, index), [group.key, index]);

  const displayedTrips = isExpanded
    ? [...group.threeDayTrips, ...group.otherTrips]
    : group.threeDayTrips;

  const remainingCount = group.otherTrips.length;
  const isDeckUnstacked = isExpanded || isHovered;

  return (
    <div
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      className="group/template rounded-2xl border border-slate-200/90 dark:border-slate-800 bg-slate-50/90 dark:bg-slate-800/80 shadow-2xs hover:shadow-md transition-all flex flex-col p-3 gap-2.5"
    >
      {/* ── 1. Big Template Header Metadata ──────────────────────────── */}
      <div
        onClick={() => setIsExpanded(!isExpanded)}
        className="cursor-pointer flex flex-col gap-2 select-none pb-2.5 border-b border-slate-200/80 dark:border-slate-700/80"
      >
        {/* Line Type Badge + Rate */}
        <div className="flex items-center justify-between gap-2">
          <span className={`text-[10px] font-black uppercase tracking-wider px-2.5 py-0.5 rounded-md border ${palette.badgeBg} ${palette.badgeText} ${palette.badgeBorder}`}>
            {group.lineType}
          </span>
          <span className="text-xs font-black text-slate-900 dark:text-slate-100 bg-white dark:bg-slate-900 px-2.5 py-0.5 rounded-md border border-slate-200 dark:border-slate-700 shadow-3xs">
            {group.rateStr}
          </span>
        </div>

        {/* Route / Stops */}
        <div className="flex items-center gap-1.5 text-xs font-black text-slate-900 dark:text-slate-100">
          <span className="truncate max-w-[130px]" title={group.origin}>
            {group.origin}
          </span>
          <ArrowRight className={`h-3.5 w-3.5 shrink-0 ${palette.arrowColor}`} />
          <span className="truncate max-w-[130px]" title={group.destination}>
            {group.destination}
          </span>
        </div>

        {/* Vehicle Class & Total Trips Count */}
        <div className="flex items-center justify-between text-[10px] font-bold text-slate-600 dark:text-slate-300 pt-1">
          <span className="flex items-center gap-1">
            <Truck className={`h-3 w-3 shrink-0 ${palette.iconColor}`} />
            {group.vehicleClass}
          </span>
          <span className={`font-extrabold px-2 py-0.5 rounded-md border ${palette.countBg} ${palette.countText} ${palette.countBorder}`}>
            {group.trips.length} {group.trips.length === 1 ? 'trip' : 'trips'}
          </span>
        </div>
      </div>

      {/* ── 2. Stacked Trips Deck (Hover & Click Slide-Down) ──────────── */}
      {displayedTrips.length > 0 && (
        <div
          onClick={() => !isExpanded && setIsExpanded(true)}
          className="flex flex-col relative transition-all duration-300 ease-out cursor-pointer pt-1"
        >
          {displayedTrips.map((trip, idx) => {
            const isSelected = selectedTripIds.includes(trip.id);

            // Layering logic in collapsed stacked state:
            // Ascending z-index (Card 0: z-10, Card 1: z-20, Card 2: z-30)
            // with negative top margin (-mt-7).
            // Card 1's top Date header covers Card 0's bottom driver line, leaving Card 0's Date header 100% exposed!
            // Card 2's top Date header covers Card 1's bottom driver line, leaving Card 1's Date header 100% exposed!
            const zIndexClass = idx === 0 ? 'z-10' : idx === 1 ? 'z-20' : 'z-30';
            const stackClass = !isDeckUnstacked && idx > 0
              ? `-mt-7 ${zIndexClass} scale-[0.99] opacity-95 shadow-md border-t ${palette.deckBorder}`
              : `mt-2.5 ${zIndexClass} scale-100 opacity-100 shadow-sm`;

            return (
              <div
                key={trip.id}
                className={`transition-all duration-300 ease-out transform ${stackClass}`}
              >
                <CompanyBoardTripCard
                  trip={trip}
                  palette={palette}
                  isSelected={isSelected}
                  onToggle={onToggleTrip ? () => onToggleTrip(trip.id) : undefined}
                  onOpen={() => onSelectTrip(trip)}
                />
              </div>
            );
          })}
        </div>
      )}

      {/* ── 3. Expandable Toggle for Remaining Trips in Month ─────────── */}
      {remainingCount > 0 && (
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            setIsExpanded(!isExpanded);
          }}
          className={`w-full py-1.5 text-center text-[11px] font-bold hover:underline flex items-center justify-center gap-1 bg-white/80 dark:bg-slate-900/80 border rounded-xl transition-colors cursor-pointer shadow-3xs ${palette.moreBtnText} ${palette.moreBtnBorder}`}
        >
          <span>{isExpanded ? `Show less ▴` : `+ ${remainingCount} more trips in month ▾`}</span>
        </button>
      )}
    </div>
  );
}

function CompanyBoardTripCard({
  trip,
  palette,
  isSelected = false,
  onToggle,
  onOpen,
}: {
  trip: MonthlyBoardTrip;
  palette?: TemplatePalette;
  isSelected?: boolean;
  onToggle?: () => void;
  onOpen?: () => void;
}) {
  const gap = isUnassigned(trip);

  const dateBg = palette ? palette.dateBg : 'bg-blue-50 dark:bg-blue-950/60';
  const dateText = palette ? palette.dateText : 'text-blue-950 dark:text-blue-200';
  const dateBorder = palette ? palette.dateBorder : 'border-blue-200/80 dark:border-blue-800/80';
  const iconColor = palette ? palette.iconColor : 'text-blue-600 dark:text-blue-400';

  return (
    <div
      onClick={onOpen}
      className={`group relative rounded-xl border bg-white dark:bg-slate-900 p-2.5 shadow-2xs hover:shadow-md transition-all cursor-pointer flex flex-col gap-2 select-none ${
        isSelected
          ? 'border-blue-500 ring-1 ring-blue-500/30 bg-blue-50/20'
          : gap
          ? 'border-amber-200 bg-amber-50/30 hover:border-amber-300'
          : 'border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700'
      }`}
    >
      {/* Top Row: Checkbox, Prominent Date & Day, Ref ID, Status Badge */}
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-1.5 min-w-0">
          {onToggle && (
            <div onClick={(e) => e.stopPropagation()} className="shrink-0 flex items-center">
              <Checkbox
                checked={isSelected}
                onCheckedChange={onToggle}
                className="h-3.5 w-3.5 rounded border-slate-300 data-[state=checked]:bg-blue-600 data-[state=checked]:border-blue-600"
              />
            </div>
          )}
          <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md border text-[11px] font-extrabold whitespace-nowrap ${dateBg} ${dateText} ${dateBorder}`}>
            <Calendar className={`w-3.5 h-3.5 shrink-0 ${iconColor}`} />
            <span>{formatDayHeading(trip.date)}</span>
            <span className="text-[10px] font-bold opacity-80 ml-0.5">{formatTime(trip.planned_start)}</span>
          </span>
          <span className="text-[9px] font-mono font-bold text-slate-700 dark:text-slate-300 bg-slate-100 dark:bg-slate-800 px-1.5 py-0.5 rounded border border-slate-200 dark:border-slate-700 shrink-0">
            {trip.ref_id || 'TRIP'}
          </span>
        </div>

        <StatusBadge status={trip.status} />
      </div>

      {/* Bottom Row: Driver Name & Vehicle Plate */}
      <div className="flex items-center justify-between text-[11px] pt-1.5 border-t border-slate-100 dark:border-slate-800 gap-2">
        <div className="flex items-center gap-1.5 min-w-0 flex-1">
          {trip.driver?.avatar_url ? (
            <img
              src={trip.driver.avatar_url}
              alt={trip.driver.name}
              className="h-4 w-4 shrink-0 rounded-full object-cover border border-slate-200 dark:border-slate-700 shadow-3xs"
            />
          ) : (
            <User className="h-3.5 w-3.5 text-slate-400 shrink-0" />
          )}
          <span
            className={`truncate font-semibold ${
              trip.driver ? 'text-slate-800 dark:text-slate-200' : 'text-amber-700 dark:text-amber-400 font-bold'
            }`}
            title={trip.driver?.name}
          >
            {trip.driver?.name ?? 'No Driver'}
          </span>
        </div>

        <div className="flex items-center gap-1.5 shrink-0">
          <Truck className="h-3.5 w-3.5 text-slate-400 shrink-0" />
          <span
            className={`font-semibold ${
              trip.vehicle ? 'text-slate-800 dark:text-slate-200 font-mono' : 'text-amber-700 dark:text-amber-400 font-bold'
            }`}
          >
            {trip.vehicle?.plate_number ?? 'No Truck'}
          </span>
        </div>
      </div>
    </div>
  );
}
