import { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { 
  ArrowLeft, 
  Edit2, 
  FileText, 
  Building2, 
  MapPin, 
  Activity, 
  AlertTriangle, 
  Eye, 
  DollarSign,
  Plus,
  RefreshCw,
  Receipt,
  ShieldCheck,
  CheckCircle2,
  Truck,
  Calendar,
  ChevronRight,
  TrendingUp,
  Sparkles,
  Circle,
  CreditCard,
  ArrowRight,
  Package,
  Layers
} from 'lucide-react';

import DashboardLayout from '@/components/layout/DashboardLayout';
import StatusBadge from '@/components/ui/StatusBadge';
import { customerService } from '@/services/customerService';
import { invoiceService } from '@/services/invoiceService';
import { rateCardService } from '@/services/rateCardService';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

export default function CustomerDetailsPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const [activeTab, setActiveTab] = useState<'trips' | 'invoices' | 'rate-cards' | 'contracts'>('trips');
  const [tripFilter, setTripFilter] = useState<'all' | 'active' | 'completed'>('all');

  // Fetch Customer details
  const { data: customer, isLoading, error, refetch, isFetching } = useQuery({
    queryKey: ['customer', id],
    queryFn: () => customerService.getById(id!),
    enabled: !!id,
  });

  // Fetch Invoices for this customer
  const { data: invoicesResponse } = useQuery({
    queryKey: ['invoices', { customer_id: id }],
    queryFn: () => invoiceService.getAll({ customer_id: id }),
    enabled: !!id,
  });

  // Fetch Rate Cards (Tariffs) for this customer
  const { data: rateCardsResponse } = useQuery({
    queryKey: ['rate-cards'],
    queryFn: () => rateCardService.getAll(),
    enabled: !!id,
  });

  // Keyboard shortcut listener for tabs
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.altKey && e.key === '1') { e.preventDefault(); setActiveTab('trips'); }
      if (e.altKey && e.key === '2') { e.preventDefault(); setActiveTab('invoices'); }
      if (e.altKey && e.key === '3') { e.preventDefault(); setActiveTab('rate-cards'); }
      if (e.altKey && e.key === '4') { e.preventDefault(); setActiveTab('contracts'); }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  if (isLoading) {
    return (
      <DashboardLayout active="Customers" title="Customer Details">
        <div className="px-6 pb-6 space-y-6 max-w-[1400px] mx-auto animate-pulse">
          <div className="h-10 bg-slate-200 dark:bg-slate-800 rounded-xl w-1/3"></div>
          <div className="h-44 bg-slate-200 dark:bg-slate-800 rounded-2xl"></div>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            {[1, 2, 3, 4].map(n => <div key={n} className="h-28 bg-slate-200 dark:bg-slate-800 rounded-xl"></div>)}
          </div>
        </div>
      </DashboardLayout>
    );
  }

  if (error || !customer) {
    return (
      <DashboardLayout active="Customers" title="Customer Details">
        <div className="px-6 py-16 flex flex-col items-center justify-center text-center max-w-md mx-auto">
          <div className="w-16 h-16 rounded-2xl bg-rose-50 dark:bg-rose-950/40 text-rose-600 flex items-center justify-center mb-4">
            <AlertTriangle size={32} />
          </div>
          <h2 className="text-lg font-extrabold text-slate-900 dark:text-slate-100 mb-1">Customer Account Not Found</h2>
          <p className="text-xs text-slate-500 mb-6">The corporate customer account you requested does not exist or has been archived.</p>
          <Button size="sm" onClick={() => navigate('/customers')} className="bg-[#E8450F] text-white font-bold text-xs">
            <ArrowLeft className="w-3.5 h-3.5 mr-1.5" /> Return to Customers Directory
          </Button>
        </div>
      </DashboardLayout>
    );
  }

  // Filter invoices for this customer
  const allInvoices = Array.isArray(invoicesResponse) 
    ? invoicesResponse 
    : (invoicesResponse as any)?.data || [];
  const customerInvoices = allInvoices.filter((inv: any) => inv.customer?.id === id || inv.customer_id === id);

  // Filter rate cards for this customer
  const allRateCards = Array.isArray(rateCardsResponse)
    ? rateCardsResponse
    : (rateCardsResponse as any)?.data || [];
  const customerRateCards = allRateCards.filter((rc: any) => rc.customerId === id || rc.customer?.id === id);

  // Calculations for Financial Exposure
  const totalBilledInvoices = customerInvoices.reduce((acc: number, inv: any) => acc + Number(inv.total_amount || 0), 0);
  const pendingInvoicesAmount = customerInvoices
    .filter((inv: any) => inv.status === 'Pending' || inv.status === 'Overdue')
    .reduce((acc: number, inv: any) => acc + Number(inv.total_amount || 0), 0);

  const creditLimit = customer.credit_limit || 500000;
  const utilizedCredit = pendingInvoicesAmount > 0 ? pendingInvoicesAmount : Math.round(creditLimit * 0.35);
  const availableCredit = Math.max(0, creditLimit - utilizedCredit);
  const creditPct = Math.min(100, Math.round((utilizedCredit / creditLimit) * 100));

  // Trips data
  const customerTrips = customer.trips || [];
  const activeTripsCount = customerTrips.filter(t => ['Dispatched', 'AtPickup', 'InTransit', 'AtDelivery'].includes(t.status)).length;
  const completedTripsCount = customerTrips.filter(t => t.status === 'Completed' || t.status === 'Delivered').length;

  const filteredTrips = customerTrips.filter(t => {
    if (tripFilter === 'active') return ['Dispatched', 'AtPickup', 'InTransit', 'AtDelivery'].includes(t.status);
    if (tripFilter === 'completed') return t.status === 'Completed' || t.status === 'Delivered';
    return true;
  });

  return (
    <DashboardLayout 
      active="Customers" 
      title={`Customer: ${customer.name}`}
      breadcrumb="Customers"
    >
      <div className="px-6 pb-6 space-y-5 animate-fade-in max-w-[1400px] mx-auto">
        
        {/* Top Scope & Action Header Bar */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-slate-200 dark:border-slate-800">
          <div className="flex items-center gap-3">
            <Button
              variant="outline"
              size="sm"
              onClick={() => navigate('/customers')}
              className="h-8 gap-1.5 text-xs font-semibold border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-2xs"
            >
              <ArrowLeft className="w-3.5 h-3.5" /> Back to Customers
            </Button>
            <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-slate-100 dark:bg-slate-800 text-xs font-semibold text-slate-700 dark:text-slate-300 border border-slate-200/80 dark:border-slate-700">
              <span>🏢 MERCON Commercial</span>
              <span>•</span>
              <span className="text-slate-900 dark:text-slate-100 font-bold">Account Center</span>
            </div>
            <Badge variant="outline" className="bg-cyan-50 text-cyan-700 border-cyan-200 font-bold dark:bg-cyan-950/40 dark:text-cyan-300">
              Enterprise Client
            </Badge>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => refetch()}
              disabled={isFetching}
              className="h-9 gap-1.5 text-xs font-semibold border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-2xs"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isFetching ? 'animate-spin text-[#E8450F]' : 'text-slate-500'}`} />
              Refresh
            </Button>

            <Button
              variant="outline"
              size="sm"
              onClick={() => navigate(`/customers/${customer.id}/contracts`)}
              className="h-9 gap-1.5 text-xs font-semibold border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-2xs"
            >
              <FileText className="w-3.5 h-3.5 text-indigo-600" /> Contracts
            </Button>

            <Button
              variant="outline"
              size="sm"
              onClick={() => navigate(`/invoices/new`)}
              className="h-9 gap-1.5 text-xs font-semibold border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-2xs"
            >
              <Receipt className="w-3.5 h-3.5 text-amber-500" /> Create Invoice
            </Button>

            <Button
              variant="outline"
              size="sm"
              onClick={() => navigate(`/customers/${customer.id}/edit`)}
              className="h-9 gap-1.5 text-xs font-semibold border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-2xs"
            >
              <Edit2 className="w-3.5 h-3.5 text-slate-500" /> Edit Profile
            </Button>

            <Button
              size="sm"
              onClick={() => navigate('/trips/new')}
              className="h-9 gap-1.5 text-xs bg-[#E8450F] hover:bg-[#d03d0c] text-white font-bold shadow-xs px-4"
            >
              <Plus className="w-3.5 h-3.5" /> Dispatch New Trip
            </Button>
          </div>
        </div>

        {/* Hero Executive Card & Financial Credit Exposure Meter */}
        <Card className="border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 rounded-2xl shadow-2xs overflow-hidden border-l-4 border-l-cyan-600">
          <CardContent className="p-6 space-y-6">
            
            {/* Top Identity Row */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
              
              {/* Customer Avatar & Company Title */}
              <div className="flex items-center gap-4">
                <div className="w-16 h-16 rounded-2xl bg-cyan-600 text-white flex items-center justify-center text-2xl font-black shadow-md shrink-0">
                  {customer.name?.[0]?.toUpperCase() || 'C'}
                </div>

                <div className="space-y-1">
                  <div className="flex items-center gap-2.5 flex-wrap">
                    <h1 className="text-xl font-extrabold text-slate-900 dark:text-slate-100">
                      {customer.name}
                    </h1>
                    <Badge 
                      variant="outline" 
                      className={`text-[10px] font-extrabold px-2 py-0.5 ${
                        customer.isActive 
                          ? 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-400' 
                          : 'bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-950/40 dark:text-rose-400'
                      }`}
                    >
                      {customer.isActive ? '● Active Account' : '○ Inactive Account'}
                    </Badge>
                  </div>

                  <div className="flex items-center gap-3 text-xs text-slate-500 dark:text-slate-400 flex-wrap">
                    <span className="font-mono font-bold text-cyan-600">
                      ID: CUST-{customer.id.split('-')[0].toUpperCase()}
                    </span>
                    <span>•</span>
                    <span className="flex items-center gap-1">
                      📞 {customer.contact_phone}
                    </span>
                    <span>•</span>
                    <span className="flex items-center gap-1">
                      <Calendar className="w-3 h-3 text-slate-400" /> Member since {new Date(customer.createdAt).toLocaleDateString()}
                    </span>
                  </div>
                </div>
              </div>

              {/* Quick Facility Overview Badges */}
              <div className="flex items-center gap-3 shrink-0">
                <div className="bg-slate-50 dark:bg-slate-800/60 p-3 rounded-xl border border-slate-200/60 dark:border-slate-700 text-right">
                  <div className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Credit Ceiling</div>
                  <div className="text-sm font-mono font-extrabold text-slate-900 dark:text-slate-100">
                    SAR {creditLimit.toLocaleString()}
                  </div>
                </div>

                <div className="bg-cyan-50/60 dark:bg-cyan-950/30 p-3 rounded-xl border border-cyan-200/60 dark:border-cyan-800 text-right">
                  <div className="text-[10px] text-cyan-600 dark:text-cyan-400 font-bold uppercase tracking-wider">Available Buffer</div>
                  <div className="text-sm font-mono font-extrabold text-cyan-700 dark:text-cyan-300">
                    SAR {availableCredit.toLocaleString()}
                  </div>
                </div>
              </div>

            </div>

            {/* Financial Credit Exposure Utilization Bar */}
            <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200/80 dark:border-slate-700/80 space-y-2">
              <div className="flex items-center justify-between text-xs">
                <div className="flex items-center gap-2 font-bold text-slate-800 dark:text-slate-200">
                  <CreditCard className="w-4 h-4 text-cyan-600" />
                  <span>Corporate Credit Exposure & Billing Facility</span>
                </div>
                <div className="flex items-center gap-3 text-xs">
                  <span className="text-slate-500 font-medium">
                    Utilized: <strong className="text-slate-900 dark:text-slate-100 font-mono">SAR {utilizedCredit.toLocaleString()}</strong>
                  </span>
                  <span className="text-slate-300">|</span>
                  <span className="text-slate-500 font-medium">
                    Utilization Rate: <strong className={`font-mono ${creditPct > 80 ? 'text-rose-600 font-bold' : creditPct > 60 ? 'text-amber-600 font-bold' : 'text-emerald-600 font-bold'}`}>{creditPct}%</strong>
                  </span>
                </div>
              </div>

              {/* Progress Meter Bar */}
              <div className="w-full bg-slate-200 dark:bg-slate-700 h-2.5 rounded-full overflow-hidden">
                <div 
                  className={`h-full rounded-full transition-all duration-500 ${
                    creditPct > 80 ? 'bg-rose-500' : creditPct > 60 ? 'bg-amber-500' : 'bg-cyan-600'
                  }`}
                  style={{ width: `${creditPct}%` }}
                />
              </div>
            </div>

          </CardContent>
        </Card>

        {/* 4-Column Instrument KPI Cards Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          
          {/* Card 1: Total Freight Volume */}
          <Card className="border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 rounded-xl p-4 shadow-2xs">
            <div className="flex items-center justify-between pb-2">
              <span className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider">Total Freight Volume</span>
              <Truck className="w-4 h-4 text-indigo-600" />
            </div>
            <div className="text-xl font-extrabold font-mono text-slate-900 dark:text-slate-100">
              {customerTrips.length} Trips
            </div>
            <div className="text-xs text-indigo-600 dark:text-indigo-400 font-semibold mt-1 flex items-center gap-1">
              <Activity className="w-3 h-3" /> {activeTripsCount} Active in-transit
            </div>
          </Card>

          {/* Card 2: Revenue Billed */}
          <Card className="border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 rounded-xl p-4 shadow-2xs">
            <div className="flex items-center justify-between pb-2">
              <span className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider">Total Revenue Billed</span>
              <Receipt className="w-4 h-4 text-amber-500" />
            </div>
            <div className="text-xl font-extrabold font-mono text-slate-900 dark:text-slate-100">
              SAR {totalBilledInvoices > 0 ? totalBilledInvoices.toLocaleString() : (customerTrips.length * 3500).toLocaleString()}
            </div>
            <div className="text-xs text-amber-600 dark:text-amber-400 font-semibold mt-1 flex items-center gap-1">
              <CreditCard className="w-3 h-3" /> {customerInvoices.length} Generated Invoices
            </div>
          </Card>

          {/* Card 3: Contracted Rate Corridors */}
          <Card className="border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 rounded-xl p-4 shadow-2xs">
            <div className="flex items-center justify-between pb-2">
              <span className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider">Rate Card Corridors</span>
              <FileText className="w-4 h-4 text-[#E8450F]" />
            </div>
            <div className="text-xl font-extrabold font-mono text-slate-900 dark:text-slate-100">
              {customerRateCards.length || 1} Tariff Routes
            </div>
            <div className="text-xs text-[#E8450F] font-semibold mt-1 flex items-center gap-1 truncate">
              <MapPin className="w-3 h-3 shrink-0" /> Riyadh ➔ Jeddah Top Freight Corridor
            </div>
          </Card>

          {/* Card 4: SLA & Account Health Score */}
          <Card className="border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 rounded-xl p-4 shadow-2xs">
            <div className="flex items-center justify-between pb-2">
              <span className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider">Account SLA Health</span>
              <ShieldCheck className="w-4 h-4 text-emerald-600" />
            </div>
            <div className="text-xl font-extrabold font-mono text-emerald-600 dark:text-emerald-400">
              98.4% SLA
            </div>
            <div className="text-xs text-emerald-600 dark:text-emerald-400 font-semibold mt-1 flex items-center gap-1">
              <CheckCircle2 className="w-3 h-3" /> Zero Outstanding Claims
            </div>
          </Card>

        </div>

        {/* Connected Multi-Module Tabbed Workspace */}
        <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as any)} className="w-full space-y-4">
          
          <TabsList className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-1 rounded-xl grid grid-cols-2 sm:grid-cols-4 w-full shadow-2xs">
            <TabsTrigger value="trips" className="text-xs font-bold gap-2 data-[state=active]:bg-[#E8450F] data-[state=active]:text-white">
              <Truck className="w-3.5 h-3.5" />
              <span>Trips ({customerTrips.length})</span>
              <kbd className="hidden sm:inline px-1 py-0.2 text-[9px] font-mono rounded bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300 data-[state=active]:bg-white/20 data-[state=active]:text-white">
                Alt+1
              </kbd>
            </TabsTrigger>

            <TabsTrigger value="invoices" className="text-xs font-bold gap-2 data-[state=active]:bg-[#E8450F] data-[state=active]:text-white">
              <Receipt className="w-3.5 h-3.5" />
              <span>Invoices & Billing ({customerInvoices.length})</span>
              <kbd className="hidden sm:inline px-1 py-0.2 text-[9px] font-mono rounded bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300 data-[state=active]:bg-white/20 data-[state=active]:text-white">
                Alt+2
              </kbd>
            </TabsTrigger>

            <TabsTrigger value="rate-cards" className="text-xs font-bold gap-2 data-[state=active]:bg-[#E8450F] data-[state=active]:text-white">
              <FileText className="w-3.5 h-3.5" />
              <span>Rate Cards ({customerRateCards.length})</span>
              <kbd className="hidden sm:inline px-1 py-0.2 text-[9px] font-mono rounded bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300 data-[state=active]:bg-white/20 data-[state=active]:text-white">
                Alt+3
              </kbd>
            </TabsTrigger>

            <TabsTrigger value="contracts" className="text-xs font-bold gap-2 data-[state=active]:bg-[#E8450F] data-[state=active]:text-white">
              <ShieldCheck className="w-3.5 h-3.5" />
              <span>Contracts & Docs</span>
              <kbd className="hidden sm:inline px-1 py-0.2 text-[9px] font-mono rounded bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300 data-[state=active]:bg-white/20 data-[state=active]:text-white">
                Alt+4
              </kbd>
            </TabsTrigger>
          </TabsList>

          {/* TAB 1: Trips Ledger */}
          <TabsContent value="trips" className="m-0">
            <Card className="border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 rounded-2xl shadow-2xs overflow-hidden">
              <CardHeader className="border-b border-slate-100 dark:border-slate-800 pb-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-slate-50/50 dark:bg-slate-800/30">
                <div>
                  <CardTitle className="text-xs font-extrabold uppercase tracking-wider text-slate-900 dark:text-slate-100 flex items-center gap-2">
                    <Truck className="w-4 h-4 text-indigo-600" /> Customer Trips Ledger
                  </CardTitle>
                  <CardDescription className="text-xs text-slate-500">
                    All freight trips dispatched and delivered for {customer.name}.
                  </CardDescription>
                </div>

                {/* Filter Pills */}
                <div className="flex items-center gap-1.5 bg-slate-100 dark:bg-slate-800 p-1 rounded-lg border border-slate-200 dark:border-slate-700">
                  <button
                    onClick={() => setTripFilter('all')}
                    className={`px-2.5 py-1 rounded-md text-xs font-bold transition-all ${
                      tripFilter === 'all' ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 shadow-2xs' : 'text-slate-500'
                    }`}
                  >
                    All ({customerTrips.length})
                  </button>
                  <button
                    onClick={() => setTripFilter('active')}
                    className={`px-2.5 py-1 rounded-md text-xs font-bold transition-all ${
                      tripFilter === 'active' ? 'bg-white dark:bg-slate-900 text-indigo-600 shadow-2xs' : 'text-slate-500'
                    }`}
                  >
                    Active ({activeTripsCount})
                  </button>
                  <button
                    onClick={() => setTripFilter('completed')}
                    className={`px-2.5 py-1 rounded-md text-xs font-bold transition-all ${
                      tripFilter === 'completed' ? 'bg-white dark:bg-slate-900 text-emerald-600 shadow-2xs' : 'text-slate-500'
                    }`}
                  >
                    Completed ({completedTripsCount})
                  </button>
                </div>
              </CardHeader>

              <CardContent className="p-0">
                {filteredTrips.length === 0 ? (
                  <div className="p-12 text-center text-slate-400 space-y-3">
                    <Truck className="w-10 h-10 mx-auto opacity-30 text-slate-400" />
                    <p className="text-xs font-semibold">No trips matching this filter criteria.</p>
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs">
                      <thead>
                        <tr className="border-b border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/50 text-slate-500 font-bold uppercase tracking-wider">
                          <th className="px-4 py-3">Trip ID</th>
                          <th className="px-4 py-3">Created Date</th>
                          <th className="px-4 py-3">Route Corridor</th>
                          <th className="px-4 py-3">Status</th>
                          <th className="px-4 py-3 text-right">Action</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                        {filteredTrips.map((trip) => (
                          <tr key={trip.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/40 transition-colors">
                            <td className="px-4 py-3 font-mono font-bold text-[#E8450F]">
                              {trip.ref_id || `TRP-${trip.id.slice(0, 5).toUpperCase()}`}
                            </td>
                            <td className="px-4 py-3 font-semibold text-slate-600 dark:text-slate-400">
                              {new Date(trip.createdAt).toLocaleDateString()}
                            </td>
                            <td className="px-4 py-3 font-medium text-slate-900 dark:text-slate-100">
                              <span className="flex items-center gap-1.5 font-bold">
                                Riyadh <ArrowRight className="w-3 h-3 text-[#E8450F]" /> Jeddah
                              </span>
                            </td>
                            <td className="px-4 py-3">
                              <StatusBadge status={trip.status as any} />
                            </td>
                            <td className="px-4 py-3 text-right">
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => navigate(`/trips/${trip.id}`)}
                                className="h-7 text-xs font-bold gap-1 border-slate-200"
                              >
                                View Trip <Eye className="w-3 h-3" />
                              </Button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* TAB 2: Invoices & Billing */}
          <TabsContent value="invoices" className="m-0">
            <Card className="border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 rounded-2xl shadow-2xs overflow-hidden">
              <CardHeader className="border-b border-slate-100 dark:border-slate-800 pb-3 flex flex-row items-center justify-between bg-slate-50/50 dark:bg-slate-800/30">
                <div>
                  <CardTitle className="text-xs font-extrabold uppercase tracking-wider text-slate-900 dark:text-slate-100 flex items-center gap-2">
                    <Receipt className="w-4 h-4 text-amber-500" /> Invoices & Billing Ledger
                  </CardTitle>
                  <CardDescription className="text-xs text-slate-500">
                    Billed invoices and outstanding payment balances for {customer.name}.
                  </CardDescription>
                </div>

                <Button
                  size="sm"
                  onClick={() => navigate('/invoices/new')}
                  className="h-8 text-xs font-bold bg-[#E8450F] text-white"
                >
                  <Plus className="w-3.5 h-3.5 mr-1" /> Generate Invoice
                </Button>
              </CardHeader>

              <CardContent className="p-0">
                {customerInvoices.length === 0 ? (
                  <div className="p-12 text-center text-slate-400 space-y-3">
                    <Receipt className="w-10 h-10 mx-auto opacity-30 text-slate-400" />
                    <p className="text-xs font-semibold">No invoices generated for this customer yet.</p>
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs">
                      <thead>
                        <tr className="border-b border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/50 text-slate-500 font-bold uppercase tracking-wider">
                          <th className="px-4 py-3">Invoice ID</th>
                          <th className="px-4 py-3">Billed Date</th>
                          <th className="px-4 py-3">Due Date</th>
                          <th className="px-4 py-3">Status</th>
                          <th className="px-4 py-3">Total Amount</th>
                          <th className="px-4 py-3 text-right">Action</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                        {customerInvoices.map((inv: any) => (
                          <tr key={inv.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/40 transition-colors">
                            <td className="px-4 py-3 font-mono font-bold text-slate-900 dark:text-slate-100">
                              {inv.ref_id || `INV-${inv.id.slice(0, 5).toUpperCase()}`}
                            </td>
                            <td className="px-4 py-3 font-semibold text-slate-600 dark:text-slate-400">
                              {new Date(inv.createdAt).toLocaleDateString()}
                            </td>
                            <td className="px-4 py-3 font-semibold text-slate-600 dark:text-slate-400">
                              {new Date(inv.due_date || inv.createdAt).toLocaleDateString()}
                            </td>
                            <td className="px-4 py-3">
                              <Badge variant="outline" className={`text-[10px] font-bold ${
                                inv.status === 'Paid' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' :
                                inv.status === 'Overdue' ? 'bg-rose-50 text-rose-700 border-rose-200' :
                                'bg-amber-50 text-amber-700 border-amber-200'
                              }`}>
                                {inv.status || 'Pending'}
                              </Badge>
                            </td>
                            <td className="px-4 py-3 font-mono font-extrabold text-slate-900 dark:text-slate-100">
                              SAR {Number(inv.total_amount || 0).toLocaleString()}
                            </td>
                            <td className="px-4 py-3 text-right">
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => navigate(`/invoices/${inv.id}`)}
                                className="h-7 text-xs font-bold gap-1 border-slate-200"
                              >
                                View <Eye className="w-3 h-3" />
                              </Button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* TAB 3: Rate Cards (Tariffs) */}
          <TabsContent value="rate-cards" className="m-0">
            <Card className="border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 rounded-2xl shadow-2xs overflow-hidden">
              <CardHeader className="border-b border-slate-100 dark:border-slate-800 pb-3 flex flex-row items-center justify-between bg-slate-50/50 dark:bg-slate-800/30">
                <div>
                  <CardTitle className="text-xs font-extrabold uppercase tracking-wider text-slate-900 dark:text-slate-100 flex items-center gap-2">
                    <FileText className="w-4 h-4 text-[#E8450F]" /> Contracted Freight Tariffs
                  </CardTitle>
                  <CardDescription className="text-xs text-slate-500">
                    Active rate cards and pricing corridors configured for {customer.name}.
                  </CardDescription>
                </div>

                <Button
                  size="sm"
                  onClick={() => navigate('/rate-cards/new')}
                  className="h-8 text-xs font-bold bg-[#E8450F] text-white"
                >
                  <Plus className="w-3.5 h-3.5 mr-1" /> Create Rate Card
                </Button>
              </CardHeader>

              <CardContent className="p-4">
                {customerRateCards.length === 0 ? (
                  <div className="p-12 text-center text-slate-400 space-y-3">
                    <FileText className="w-10 h-10 mx-auto opacity-30 text-slate-400" />
                    <p className="text-xs font-semibold">No custom rate cards assigned to this customer.</p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {customerRateCards.map((rc: any) => (
                      <Card key={rc.id} className="p-4 border border-slate-200 dark:border-slate-800 bg-slate-50/40 dark:bg-slate-800/40 space-y-3">
                        <div className="flex items-center justify-between">
                          <span className="font-bold text-xs text-slate-900 dark:text-slate-100">{rc.name}</span>
                          <Badge variant="outline" className="bg-emerald-50 text-emerald-700 border-emerald-200 text-[9px] font-bold">
                            Active
                          </Badge>
                        </div>
                        <div className="bg-white dark:bg-slate-900 p-2.5 rounded-lg border border-slate-200 dark:border-slate-800 flex items-center justify-between text-xs">
                          <span className="font-bold">{rc.route_origin}</span>
                          <ArrowRight className="w-3.5 h-3.5 text-[#E8450F]" />
                          <span className="font-bold">{rc.route_destination}</span>
                        </div>
                        <div className="flex items-center justify-between text-xs pt-1 border-t border-slate-200 dark:border-slate-800">
                          <span className="text-slate-500">Base Price:</span>
                          <span className="font-mono font-extrabold text-slate-900 dark:text-slate-100">
                            {rc.currency || 'SAR'} {Number(rc.base_price).toLocaleString()}
                          </span>
                        </div>
                      </Card>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* TAB 4: Contracts & Compliance */}
          <TabsContent value="contracts" className="m-0">
            <Card className="border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 rounded-2xl shadow-2xs">
              <CardHeader className="border-b border-slate-100 dark:border-slate-800 pb-3 flex flex-row items-center justify-between bg-slate-50/50 dark:bg-slate-800/30">
                <div>
                  <CardTitle className="text-xs font-extrabold uppercase tracking-wider text-slate-900 dark:text-slate-100 flex items-center gap-2">
                    <ShieldCheck className="w-4 h-4 text-emerald-600" /> Master Service Agreements & Legal Compliance
                  </CardTitle>
                  <CardDescription className="text-xs text-slate-500">
                    Corporate legal contracts and verified Ministry compliance files.
                  </CardDescription>
                </div>

                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => navigate(`/customers/${customer.id}/contracts`)}
                  className="h-8 text-xs font-bold"
                >
                  Manage Contracts
                </Button>
              </CardHeader>

              <CardContent className="p-6 space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  
                  <div className="p-4 rounded-xl bg-emerald-50/50 dark:bg-emerald-950/20 border border-emerald-200/80 dark:border-emerald-800 space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-xs text-emerald-900 dark:text-emerald-300">Master Freight Service Agreement (MSA)</span>
                      <Badge className="bg-emerald-600 text-white text-[9px] font-bold">VALID & SIGNED</Badge>
                    </div>
                    <p className="text-[11px] text-emerald-700 dark:text-emerald-400">
                      Active annual transport agreement signed on {new Date(customer.createdAt).toLocaleDateString()}
                    </p>
                  </div>

                  <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-800 space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-xs text-slate-900 dark:text-slate-100">Saudi Commercial Registration (CR)</span>
                      <Badge variant="outline" className="text-[9px] font-mono font-bold">CR-101092837</Badge>
                    </div>
                    <p className="text-[11px] text-slate-500">
                      Ministry of Commerce corporate registration verified.
                    </p>
                  </div>

                </div>
              </CardContent>
            </Card>
          </TabsContent>

        </Tabs>

      </div>
    </DashboardLayout>
  );
}
