import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import {
  ArrowLeft,
  Edit2,
  Building2,
  Phone,
  Mail,
  MapPin,
  FileText,
  Truck,
  DollarSign,
  Star,
  Plus,
  RotateCw,
  Send,
  AlertTriangle,
  Calendar,
  Eye,
  CheckCircle2,
  ShieldCheck,
} from 'lucide-react';

import DashboardLayout from '@/components/layout/DashboardLayout';
import StatusBadge from '@/components/ui/StatusBadge';
import PhoneDisplay from '@/components/ui/PhoneDisplay';
import KpiCard from '@/components/ui/KpiCard';
import { WhatsAppIcon } from '@/components/ui/whatsapp-icon';
import DataTable, { Column } from '@/components/ui/DataTable';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { thirdPartyService, ThirdPartyProvider } from '@/services/thirdPartyService';
import EditThirdPartyModal from '@/components/third-party/EditThirdPartyModal';
import { toast } from 'sonner';
import { useDeploymentTimezone, formatInDeploymentTz } from '@/lib/datetime';

function InfoRow({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-3 py-2 border-b border-slate-100 dark:border-slate-800/80 last:border-0">
      <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 shrink-0">{label}</span>
      <span className="text-xs min-w-0 text-right">{children}</span>
    </div>
  );
}

export default function ThirdPartyDetailsPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const tz = useDeploymentTimezone();

  const [isEditOpen, setIsEditOpen] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);

  // WhatsApp share dialog state
  const [isWhatsappOpen, setIsWhatsappOpen] = useState(false);
  const [whatsappMessageText, setWhatsappMessageText] = useState('');
  const [whatsappCustomPhone, setWhatsappCustomPhone] = useState('');

  // Fetch provider details
  const { data: providerRes, isLoading, error } = useQuery({
    queryKey: ['third-party-provider', id],
    queryFn: () => thirdPartyService.getById(id!),
    enabled: !!id,
  });

  const provider: ThirdPartyProvider | null = providerRes?.data?.data || (providerRes?.data as any) || null;

  useEffect(() => {
    if (provider && provider.id && id !== provider.id) {
      navigate(`/third-party/${provider.id}`, { replace: true });
    }
  }, [provider?.id, id, navigate]);

  if (isLoading) {
    return (
      <DashboardLayout active="/third-party" title="Provider Details">
        <div className="px-4 sm:px-6 pb-6 space-y-6 max-w-[1400px] mx-auto animate-pulse">
          <div className="h-10 bg-slate-200 dark:bg-slate-800 rounded-xl w-1/3"></div>
          <div className="h-44 bg-slate-200 dark:bg-slate-800 rounded-2xl"></div>
          <div className="h-96 bg-slate-200 dark:bg-slate-800 rounded-2xl"></div>
        </div>
      </DashboardLayout>
    );
  }

  if (error || !provider) {
    return (
      <DashboardLayout active="/third-party" title="Provider Details">
        <div className="px-6 py-16 flex flex-col items-center justify-center text-center max-w-md mx-auto">
          <AlertTriangle className="w-8 h-8 text-rose-600 shrink-0" />
          <h2 className="text-lg font-extrabold text-slate-900 dark:text-slate-100 mb-1">
            Third-Party Provider Not Found
          </h2>
          <p className="text-xs text-slate-500 mb-6">
            The third-party carrier profile you requested does not exist or has been removed.
          </p>
          <Button size="sm" onClick={() => navigate('/third-party')} className="bg-brand text-white font-bold text-xs">
            <ArrowLeft className="w-3.5 h-3.5 mr-1.5" /> Return to Providers Directory
          </Button>
        </div>
      </DashboardLayout>
    );
  }

  const handleRefresh = async () => {
    setIsRefreshing(true);
    await queryClient.invalidateQueries({ queryKey: ['third-party-provider', id] });
    setTimeout(() => setIsRefreshing(false), 500);
  };

  const openWhatsappShare = () => {
    const text =
      `*MERCON LOGISTICS - Third-Party Carrier Profile*\n` +
      `• *Provider:* ${provider.name}\n` +
      `• *Contact:* ${provider.contact_person || 'N/A'}\n` +
      `• *Phone:* ${provider.phone || 'N/A'}\n` +
      `• *Email:* ${provider.email || 'N/A'}\n` +
      `• *Tax ID:* ${provider.tax_id || 'N/A'}\n` +
      `• *Total Trips:* ${provider.total_trips || 0}`;
    setWhatsappMessageText(text);
    setWhatsappCustomPhone(provider.phone || '');
    setIsWhatsappOpen(true);
  };

  const handleWhatsappSend = () => {
    const cleanPhone = whatsappCustomPhone.trim().replace(/\+/g, '').replace(/\D/g, '');
    const baseUrl = cleanPhone ? `https://api.whatsapp.com/send?phone=${cleanPhone}` : `https://api.whatsapp.com/send`;
    const shareUrl = `${baseUrl}?text=${encodeURIComponent(whatsappMessageText)}`;
    window.open(shareUrl, '_blank');
    setIsWhatsappOpen(false);
  };

  const trips = (provider as any).trips || [];

  const tripColumns: Column<any>[] = [
    {
      header: 'Trip ID',
      accessor: (row: any) => (
        <div className="flex flex-col">
          <span
            className="font-mono text-xs font-bold text-brand hover:underline cursor-pointer"
            onClick={() => navigate(`/trips/${row.id}`)}
          >
            {row.ref_id || `TRP-${row.id.slice(0, 5).toUpperCase()}`}
          </span>
          <span className="text-[10px] text-slate-400 font-medium">
            {formatInDeploymentTz(row.createdAt, tz, 'MM/dd/yyyy')}
          </span>
        </div>
      ),
    },
    {
      header: 'Customer & Vehicle',
      accessor: (row: any) => (
        <div className="flex flex-col">
          <span className="font-bold text-xs text-slate-900 dark:text-slate-100">
            {row.customer?.name || '—'}
          </span>
          <span className="text-[11px] text-slate-500 flex items-center gap-1 font-mono">
            <Truck className="w-3 h-3 text-slate-400" />
            {row.third_party_vehicle_plate || 'Rented Truck'}
          </span>
        </div>
      ),
    },
    {
      header: '3PL Driver',
      accessor: (row: any) => (
        <div className="flex flex-col">
          <span className="font-semibold text-xs text-slate-800 dark:text-slate-200">
            {row.third_party_driver_name || 'Rented Driver'}
          </span>
          {row.third_party_driver_phone && (
            <span className="text-[10px] text-slate-400">{row.third_party_driver_phone}</span>
          )}
        </div>
      ),
    },
    {
      header: 'Rental Fee',
      accessor: (row: any) => (
        <span className="font-bold text-xs font-mono text-slate-900 dark:text-slate-100">
          {row.third_party_cost ? `SAR ${Number(row.third_party_cost).toLocaleString()}` : '—'}
        </span>
      ),
    },
    {
      header: 'Status',
      accessor: (row: any) => <StatusBadge status={row.status} />,
    },
    {
      header: 'Actions',
      accessor: (row: any) => (
        <Button
          variant="ghost"
          size="sm"
          className="h-7 text-xs font-semibold text-brand hover:text-brand-hover"
          onClick={() => navigate(`/trips/${row.id}`)}
        >
          <Eye className="w-3.5 h-3.5 mr-1" /> View Trip
        </Button>
      ),
    },
  ];

  return (
    <DashboardLayout active="/third-party" title={`${provider.name} — Profile`}>
      <div className="pt-2 sm:pt-4 px-4 sm:px-6 pb-6 w-full flex flex-col gap-6 animate-fade-in max-w-[1400px] mx-auto">
        
        {/* ── 1. TOP HEADER BAR: Horizontal Company Avatar + Name & Tags Placed Directly Under Name ── */}
        <div className="flex flex-col lg:flex-row lg:items-start justify-between gap-8 sm:gap-12 pb-4 border-b border-slate-200/80 dark:border-slate-800">
          
          {/* Left: Horizontal Logo Avatar + Company Name with Tags Underneath */}
          <div className="flex items-start gap-4 sm:gap-5 min-w-0 flex-1 pr-2 sm:pr-6">
            
            {/* Circular Carrier Initial Avatar */}
            <div className="w-24 h-24 sm:w-28 sm:h-28 rounded-2xl bg-purple-50 text-purple-600 dark:bg-purple-950/40 border border-purple-100 dark:border-purple-900 flex items-center justify-center font-bold text-3xl shrink-0 shadow-2xs">
              {provider.name.charAt(0).toUpperCase()}
            </div>

            {/* Company Name + Badges & Details Directly Under Name */}
            <div className="flex flex-col min-w-0 flex-1">
              <h1
                className="text-2xl sm:text-3xl lg:text-4xl font-black text-slate-900 dark:text-slate-100 tracking-tight leading-tight line-clamp-2 break-words max-w-full flex items-center gap-2.5"
                title={provider.name}
              >
                <Building2 className="w-7 h-7 text-purple-600 dark:text-purple-400 shrink-0" />
                <span>{provider.name}</span>
              </h1>

              {/* Badges & Tags Under the Name */}
              <div className="flex flex-col gap-2 mt-2.5">
                {/* Status & ID Tags Row */}
                <div className="flex items-center gap-2 flex-wrap">
                  <Badge className="bg-purple-50 text-purple-700 border-purple-200 dark:bg-purple-950/60 dark:text-purple-300 dark:border-purple-800 font-extrabold text-xs px-2.5 py-1 gap-1.5 shadow-2xs">
                    <Building2 className="w-3.5 h-3.5 text-purple-600 dark:text-purple-400" />
                    3PL Partners
                  </Badge>
                  <span className="text-xs font-mono font-extrabold text-slate-600 dark:text-slate-400 bg-slate-100 dark:bg-slate-800 px-2.5 py-1 rounded-lg border border-slate-200/80 dark:border-slate-700">
                    ID: 3PL-{provider.id.slice(0, 5).toUpperCase()}
                  </span>
                  <StatusBadge status={provider.isActive ? 'Active' : 'Inactive'} />
                </div>

                {/* Contact Phone Details Directly Under the Tags */}
                {provider.phone && (
                  <div className="flex items-center gap-2 mt-0.5 pt-0.5">
                    <Phone className="w-4 h-4 text-purple-600 dark:text-purple-400 shrink-0" />
                    <PhoneDisplay
                      phone={provider.phone}
                      variant="inline"
                      className="text-sm font-mono font-extrabold text-slate-900 dark:text-slate-100 tracking-tight"
                    />
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Right Action Buttons */}
          <div className="flex items-center gap-2 flex-wrap shrink-0 lg:pt-1">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setIsEditOpen(true)}
              className="h-9 gap-1.5 text-xs font-semibold border-slate-200 bg-white hover:bg-slate-50 shadow-2xs"
            >
              <Edit2 className="h-3.5 w-3.5 text-brand" /> Edit Profile
            </Button>

            <Button
              variant="outline"
              size="sm"
              onClick={openWhatsappShare}
              className="h-9 gap-1.5 text-xs font-semibold border-slate-200 bg-white hover:bg-slate-50 shadow-2xs text-emerald-700 dark:text-emerald-400"
            >
              <WhatsAppIcon className="h-3.5 w-3.5 text-emerald-600" /> WhatsApp
            </Button>
          </div>
        </div>

        {/* ── 2. OVERVIEW INSTRUMENT-TILE STAT BLOCKS (4 Columns) ── */}
        <div className="grid grid-cols-1 sm:grid-cols-4 gap-3.5 w-full">
          
          {/* Overview 1: Total Subcontract Trips */}
          <div className="px-4 py-3.5 rounded-xl bg-slate-50/80 dark:bg-slate-800/40 border border-slate-200/80 dark:border-slate-800 space-y-1 shadow-2xs">
            <div className="text-[10px] font-black uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
              <Truck className="w-3.5 h-3.5 text-purple-600" /> Total Subcontract Trips
            </div>
            <div className="font-mono text-base font-black text-slate-900 dark:text-slate-100 truncate leading-tight">
              {provider.total_trips || 0} <span className="text-xs font-semibold text-slate-500 font-sans">Trips</span>
            </div>
            <div className="text-[10px] font-medium text-slate-500 truncate">
              Total trips subcontracted
            </div>
          </div>

          {/* Overview 2: Active Deployments */}
          <div className="px-4 py-3.5 rounded-xl bg-slate-50/80 dark:bg-slate-800/40 border border-slate-200/80 dark:border-slate-800 space-y-1 shadow-2xs">
            <div className="text-[10px] font-black uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
              <CheckCircle2 className="w-3.5 h-3.5 text-blue-600" /> Active Deployments
            </div>
            <div className="font-mono text-base font-black text-slate-900 dark:text-slate-100 truncate leading-tight">
              {provider.active_trips || 0} <span className="text-xs font-semibold text-slate-500 font-sans">Active</span>
            </div>
            <div className="text-[10px] font-medium text-slate-500 truncate">
              Trips currently active
            </div>
          </div>

          {/* Overview 3: Total Rental Outlay */}
          <div className="px-4 py-3.5 rounded-xl bg-slate-50/80 dark:bg-slate-800/40 border border-slate-200/80 dark:border-slate-800 space-y-1 shadow-2xs">
            <div className="text-[10px] font-black uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
              <DollarSign className="w-3.5 h-3.5 text-emerald-600" /> Total Rental Outlay
            </div>
            <div className="font-mono text-base font-black text-slate-900 dark:text-slate-100 truncate leading-tight">
              SAR {(provider.total_cost || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}
            </div>
            <div className="text-[10px] font-medium text-slate-500 truncate">
              Subcontract fees paid
            </div>
          </div>

          {/* Overview 4: Quality Rating */}
          <div className="px-4 py-3.5 rounded-xl bg-slate-50/80 dark:bg-slate-800/40 border border-slate-200/80 dark:border-slate-800 space-y-1 shadow-2xs">
            <div className="text-[10px] font-black uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
              <Star className="w-3.5 h-3.5 text-amber-500" /> Carrier Quality Rating
            </div>
            <div className="font-mono text-base font-black text-slate-900 dark:text-slate-100 truncate leading-tight flex items-center gap-1">
              {(provider.rating || 5.0).toFixed(1)}
              <Star className="w-4 h-4 text-amber-500 fill-amber-500" />
            </div>
            <div className="text-[10px] font-medium text-slate-500 truncate">
              Vendor performance score
            </div>
          </div>

        </div>

        {/* ── 3. CARRIER PROFILE & COMPLIANCE (3 PROMINENT CARD BOXES) ── */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5 items-stretch">
          
          {/* Box 1: Carrier Profile */}
          <Card className="border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900 rounded-2xl shadow-sm p-5 flex flex-col justify-between space-y-4">
            <div>
              <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3 mb-3">
                <h3 className="text-xs font-black uppercase tracking-wider text-slate-800 dark:text-slate-200 flex items-center gap-2">
                  <ShieldCheck className="w-4 h-4 text-brand" /> Carrier Profile
                </h3>
                <StatusBadge status={provider.isActive ? 'Active' : 'Inactive'} />
              </div>
              <div className="space-y-1.5">
                <InfoRow label="Representative">
                  <span className="font-bold text-slate-900 dark:text-slate-100">{provider.contact_person || 'Not specified'}</span>
                </InfoRow>
                <InfoRow label="Primary Phone">
                  <PhoneDisplay phone={provider.phone} variant="badge" />
                </InfoRow>
                <InfoRow label="Billing Email">
                  {provider.email ? (
                    <a href={`mailto:${provider.email}`} className="font-bold text-indigo-600 hover:underline">
                      {provider.email}
                    </a>
                  ) : (
                    <span className="text-slate-400 font-mono">—</span>
                  )}
                </InfoRow>
                <InfoRow label="Commercial / Tax ID">
                  <span className="font-mono font-extrabold text-slate-900 dark:text-slate-100">
                    {provider.tax_id || '—'}
                  </span>
                </InfoRow>
              </div>
            </div>
          </Card>

          {/* Box 2: Service Notes & Terms */}
          <Card className="border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900 rounded-2xl shadow-sm p-5 flex flex-col justify-between space-y-4">
            <div className="h-full flex flex-col">
              <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3 mb-3">
                <h3 className="text-xs font-black uppercase tracking-wider text-slate-800 dark:text-slate-200 flex items-center gap-2">
                  <FileText className="w-4 h-4 text-indigo-600" /> Service Notes &amp; Terms
                </h3>
              </div>
              <div className="flex-1 flex flex-col justify-center">
                {provider.notes ? (
                  <p className="text-xs text-slate-600 dark:text-slate-400 italic bg-slate-50 dark:bg-slate-900/40 p-3.5 rounded-xl border border-slate-100 dark:border-slate-800 w-full leading-relaxed">
                    "{provider.notes}"
                  </p>
                ) : (
                  <div className="flex items-center gap-2 text-xs text-slate-500 rounded-xl border border-dashed border-slate-200 dark:border-slate-700 p-4 w-full">
                    No notes or terms registered for this provider.
                  </div>
                )}
              </div>
            </div>
          </Card>

          {/* Box 3: Physical Office & Yard Location */}
          <Card className="border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900 rounded-2xl shadow-sm p-5 flex flex-col justify-between space-y-4">
            <div className="h-full flex flex-col">
              <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3 mb-3">
                <h3 className="text-xs font-black uppercase tracking-wider text-slate-800 dark:text-slate-200 flex items-center gap-2">
                  <MapPin className="w-4 h-4 text-emerald-600" /> Office / Yard Location
                </h3>
              </div>
              <div className="flex-1 flex flex-col justify-center">
                {provider.address ? (
                  <div className="text-xs text-slate-700 dark:text-slate-300 font-medium bg-slate-50 dark:bg-slate-900/40 p-3.5 rounded-xl border border-slate-100 dark:border-slate-800 w-full flex items-start gap-2">
                    <MapPin className="w-4 h-4 text-slate-400 shrink-0 mt-0.5" />
                    <span>{provider.address}</span>
                  </div>
                ) : (
                  <div className="flex items-center gap-2 text-xs text-slate-500 rounded-xl border border-dashed border-slate-200 dark:border-slate-700 p-4 w-full">
                    No physical address registered.
                  </div>
                )}
              </div>
            </div>
          </Card>

        </div>

        {/* ── 4. SUBCONTRACTED TRIP LEDGER (FULL WIDTH) ── */}
        <Card className="border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900 rounded-2xl shadow-sm overflow-hidden w-full">
          <CardHeader className="pb-3 border-b border-slate-100 dark:border-slate-800">
            <div>
              <CardTitle className="text-sm font-bold flex items-center gap-2 text-slate-900 dark:text-slate-100">
                <Truck className="w-4 h-4 text-purple-600" /> Subcontracted Trips Ledger
              </CardTitle>
              <p className="text-xs text-slate-500">History of trips executed by {provider.name}</p>
            </div>
          </CardHeader>
          <CardContent className="pt-4">
            <DataTable
              columns={tripColumns}
              data={trips}
              emptyTitle="No Trips Executed"
              emptyMessage={`No trips have been assigned to ${provider.name} yet.`}
            />
          </CardContent>
        </Card>

        {/* ── Edit modal ───────────────────────────────────────────────────── */}
        <EditThirdPartyModal
          isOpen={isEditOpen}
          onClose={() => setIsEditOpen(false)}
          provider={provider}
          onSuccess={handleRefresh}
        />

      </div>
    </DashboardLayout>
  );
}
