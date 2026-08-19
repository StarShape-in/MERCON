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
} from 'lucide-react';

import DashboardLayout from '@/components/layout/DashboardLayout';
import StatusBadge from '@/components/ui/StatusBadge';
import KpiCard from '@/components/ui/KpiCard';
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
          <div className="w-16 h-16 rounded-2xl bg-rose-50 dark:bg-rose-950/40 text-rose-600 flex items-center justify-center mb-4">
            <AlertTriangle size={32} />
          </div>
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
      `🏢 *MERCON LOGISTICS - Third-Party Carrier Profile*\n` +
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
      <div className="px-4 sm:px-6 pb-6 w-full flex flex-col animate-fade-in gap-6 max-w-[1400px] mx-auto">
        {/* Back navigation & Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 dark:border-slate-800 pb-4">
          <div className="flex items-center gap-3">
            <Button
              variant="outline"
              size="sm"
              onClick={() => navigate('/third-party')}
              className="h-9 w-9 p-0 border-slate-200 bg-white hover:bg-slate-50 shrink-0"
              title="Back to Third-Party Directory"
            >
              <ArrowLeft className="w-4 h-4 text-slate-600" />
            </Button>

            <div className="w-11 h-11 rounded-2xl bg-purple-50 border border-purple-200 dark:bg-purple-950/50 dark:border-purple-800 flex items-center justify-center text-purple-600 dark:text-purple-300 font-bold text-lg shrink-0">
              <Building2 className="w-6 h-6" />
            </div>

            <div className="flex flex-col">
              <div className="flex items-center gap-2.5 flex-wrap">
                <h1 className="text-2xl font-extrabold text-slate-900 dark:text-slate-100 tracking-tight">
                  {provider.name}
                </h1>
                <Badge className="bg-purple-50 text-purple-700 dark:bg-purple-950/40 dark:text-purple-300 border-purple-200 text-xs font-bold">
                  3PL-CARRIER
                </Badge>
                <StatusBadge status={provider.isActive ? 'Active' : 'Inactive'} />
              </div>
              <p className="text-xs text-slate-500 font-mono mt-0.5">
                Ref ID: 3PL-{provider.id.slice(0, 5).toUpperCase()} • Registered:{' '}
                {formatInDeploymentTz(provider.createdAt, tz, 'MM/dd/yyyy')}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
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
              <Send className="h-3.5 w-3.5" /> WhatsApp
            </Button>

            <Button
              size="sm"
              onClick={() => navigate(`/trips/new?thirdParty=1&providerId=${provider.id}`)}
              className="h-9 gap-1.5 text-xs font-bold bg-purple-600 hover:bg-purple-700 text-white shadow-xs rounded-md px-4"
            >
              <Plus className="h-4 w-4" /> + New Trip with 3PL
            </Button>
          </div>
        </div>

        {/* 2. Instrument KPI Row */}
        <div className="grid grid-cols-1 sm:grid-cols-4 gap-5">
          <KpiCard
            title="TOTAL SUBCONTRACT TRIPS"
            value={
              <span>
                {provider.total_trips || 0}
                <span className="text-[15px] font-semibold ml-1.5 opacity-85 font-mono">Trips</span>
              </span>
            }
            variant="purple"
            trend="up"
            trendValue="Carrier Volume"
            description="Total trips subcontracted"
            icon={Truck}
          />

          <KpiCard
            title="ACTIVE DEPLOYMENTS"
            value={
              <span>
                {provider.active_trips || 0}
                <span className="text-[15px] font-semibold ml-1.5 opacity-85 font-mono">Active</span>
              </span>
            }
            variant="blue"
            trend="neutral"
            trendValue="In-Transit Fleet"
            description="Trips currently active"
            icon={CheckCircle2}
          />

          <KpiCard
            title="TOTAL RENTAL OUTLAY"
            value={
              <span>
                SAR {(provider.total_cost || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}
              </span>
            }
            variant="emerald"
            trend="up"
            trendValue="Total Disbursed"
            description="Subcontract fees paid"
            icon={DollarSign}
          />

          <KpiCard
            title="CARRIER QUALITY RATING"
            value={
              <span className="flex items-center gap-1">
                {(provider.rating || 5.0).toFixed(1)}
                <Star className="w-5 h-5 text-amber-500 fill-amber-500 ml-1" />
              </span>
            }
            variant="amber"
            trend="neutral"
            trendValue="Verified Partner"
            description="Vendor performance score"
            icon={Star}
          />
        </div>

        {/* 3. Main Details Content Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left Column: Provider Contact & Profile Details */}
          <Card className="lg:col-span-1 shadow-xs border-slate-200 dark:border-slate-800">
            <CardHeader className="pb-3 border-b border-slate-100 dark:border-slate-800">
              <CardTitle className="text-sm font-bold flex items-center gap-2 text-slate-900 dark:text-slate-100">
                <Building2 className="w-4 h-4 text-purple-600" /> Carrier Profile &amp; Contacts
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-4 space-y-4 text-xs">
              <div className="space-y-1">
                <span className="text-[10px] uppercase font-bold text-slate-400 block">Representative Contact</span>
                <span className="font-semibold text-slate-900 dark:text-slate-100 text-sm">
                  {provider.contact_person || 'Not specified'}
                </span>
              </div>

              <div className="space-y-2 pt-2 border-t border-slate-100 dark:border-slate-800">
                <div className="flex items-center justify-between">
                  <span className="text-slate-500 flex items-center gap-1.5">
                    <Phone className="w-3.5 h-3.5 text-slate-400" /> Primary Phone
                  </span>
                  {provider.phone ? (
                    <a href={`tel:${provider.phone}`} className="font-bold text-brand hover:underline font-mono">
                      {provider.phone}
                    </a>
                  ) : (
                    <span className="text-slate-400 font-mono">—</span>
                  )}
                </div>

                <div className="flex items-center justify-between">
                  <span className="text-slate-500 flex items-center gap-1.5">
                    <Mail className="w-3.5 h-3.5 text-slate-400" /> Billing Email
                  </span>
                  {provider.email ? (
                    <a href={`mailto:${provider.email}`} className="font-semibold text-slate-900 dark:text-slate-100 hover:underline">
                      {provider.email}
                    </a>
                  ) : (
                    <span className="text-slate-400 font-mono">—</span>
                  )}
                </div>

                <div className="flex items-center justify-between">
                  <span className="text-slate-500 flex items-center gap-1.5">
                    <FileText className="w-3.5 h-3.5 text-slate-400" /> Commercial Reg / Tax ID
                  </span>
                  <span className="font-mono font-bold text-slate-900 dark:text-slate-100">
                    {provider.tax_id || '—'}
                  </span>
                </div>
              </div>

              <div className="space-y-1 pt-2 border-t border-slate-100 dark:border-slate-800">
                <span className="text-[10px] uppercase font-bold text-slate-400 flex items-center gap-1">
                  <MapPin className="w-3 h-3 text-slate-400" /> Office / Yard Location
                </span>
                <p className="text-slate-700 dark:text-slate-300 font-medium">
                  {provider.address || 'No physical address registered'}
                </p>
              </div>

              {provider.notes && (
                <div className="space-y-1 pt-2 border-t border-slate-100 dark:border-slate-800">
                  <span className="text-[10px] uppercase font-bold text-slate-400 block">Service Notes &amp; Terms</span>
                  <p className="text-slate-600 dark:text-slate-400 italic bg-slate-50 dark:bg-slate-900 p-2.5 rounded-lg border border-slate-100 dark:border-slate-800">
                    "{provider.notes}"
                  </p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Right Column: Subcontracted Trip Ledger */}
          <Card className="lg:col-span-2 shadow-xs border-slate-200 dark:border-slate-800">
            <CardHeader className="pb-3 border-b border-slate-100 dark:border-slate-800 flex flex-row items-center justify-between">
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
        </div>
      </div>

      {/* Edit Provider Modal */}
      {isEditOpen && (
        <EditThirdPartyModal
          isOpen={isEditOpen}
          provider={provider}
          onClose={() => setIsEditOpen(false)}
        />
      )}

      {/* WhatsApp Share Dialog */}
      {isWhatsappOpen && (
        <Dialog open={isWhatsappOpen} onOpenChange={setIsWhatsappOpen}>
          <DialogContent className="sm:max-w-[450px]">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2 text-slate-900 dark:text-slate-100">
                <Send className="w-4 h-4 text-emerald-600" /> Share Provider via WhatsApp
              </DialogTitle>
            </DialogHeader>

            <div className="space-y-3 py-2 text-xs">
              <div className="space-y-1">
                <label className="font-bold text-slate-700 dark:text-slate-300">Recipient Phone Number</label>
                <Input
                  placeholder="e.g. 966501234567"
                  value={whatsappCustomPhone}
                  onChange={(e) => setWhatsappCustomPhone(e.target.value)}
                  className="h-9 text-xs"
                />
              </div>

              <div className="space-y-1">
                <label className="font-bold text-slate-700 dark:text-slate-300">Message Preview</label>
                <textarea
                  value={whatsappMessageText}
                  onChange={(e) => setWhatsappMessageText(e.target.value)}
                  className="w-full rounded-md border border-slate-200 dark:border-slate-800 bg-transparent px-3 py-2 text-xs h-28 font-mono"
                />
              </div>
            </div>

            <DialogFooter>
              <Button variant="outline" size="sm" onClick={() => setIsWhatsappOpen(false)}>
                Cancel
              </Button>
              <Button size="sm" onClick={handleWhatsappSend} className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold">
                <Send className="w-3.5 h-3.5 mr-1.5" /> Send via WhatsApp
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
    </DashboardLayout>
  );
}
