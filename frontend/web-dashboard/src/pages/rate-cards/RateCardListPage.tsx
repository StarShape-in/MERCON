import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { 
  Plus, 
  Edit2, 
  FileText, 
  Download, 
  Trash2, 
  RotateCw, 
  Filter, 
  Search, 
  ArrowRight, 
  CheckCircle2, 
  Building2, 
  TrendingUp, 
  MapPin, 
  CreditCard,
  Layers,
  LayoutGrid,
  List
} from 'lucide-react';

import DashboardLayout from '@/components/layout/DashboardLayout';
import DataTable from '@/components/ui/DataTable';
import StatusBadge from '@/components/ui/StatusBadge';
import { rateCardService, RateCard } from '@/services/rateCardService';
import { downloadCSV } from '@/utils/exportUtils';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

export default function RateCardListPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  
  const [currentPage, setCurrentPage] = useState(1);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'inactive'>('all');
  const [viewMode, setViewMode] = useState<'ledger' | 'grid'>('ledger');
  const [isRefreshing, setIsRefreshing] = useState(false);

  const { data: response, isLoading } = useQuery({
    queryKey: ['rate-cards'],
    queryFn: () => rateCardService.getAll(),
  });

  const rateCards = response?.data || [];

  const handleRefresh = async () => {
    setIsRefreshing(true);
    await queryClient.invalidateQueries({ queryKey: ['rate-cards'] });
    setTimeout(() => setIsRefreshing(false), 500);
  };

  // Filtered rate cards
  const filteredData = useMemo(() => {
    return rateCards.filter((rc) => {
      const matchesSearch = 
        rc.name.toLowerCase().includes(search.toLowerCase()) || 
        (rc.customer?.name || '').toLowerCase().includes(search.toLowerCase()) ||
        rc.route_origin.toLowerCase().includes(search.toLowerCase()) ||
        rc.route_destination.toLowerCase().includes(search.toLowerCase());

      const matchesStatus = 
        statusFilter === 'all' ? true :
        statusFilter === 'active' ? rc.is_active : !rc.is_active;

      return matchesSearch && matchesStatus;
    });
  }, [rateCards, search, statusFilter]);

  // Calculated KPIs
  const kpis = useMemo(() => {
    const total = rateCards.length;
    const activeCount = rateCards.filter(rc => rc.is_active).length;
    const activePct = total > 0 ? Math.round((activeCount / total) * 100) : 0;

    const totalPrice = rateCards.reduce((acc, rc) => acc + (Number(rc.base_price) || 0), 0);
    const avgPrice = total > 0 ? Math.round(totalPrice / total) : 0;

    // Unique customers count
    const uniqueCustomers = new Set(rateCards.map(rc => rc.customerId).filter(Boolean)).size;

    // Top route lane
    const routeCounts: Record<string, number> = {};
    rateCards.forEach(rc => {
      const routeKey = `${rc.route_origin} → ${rc.route_destination}`;
      routeCounts[routeKey] = (routeCounts[routeKey] || 0) + 1;
    });
    let topRoute = 'None';
    let maxRouteCount = 0;
    Object.entries(routeCounts).forEach(([route, count]) => {
      if (count > maxRouteCount) {
        maxRouteCount = count;
        topRoute = route;
      }
    });

    return { total, activeCount, activePct, avgPrice, uniqueCustomers, topRoute };
  }, [rateCards]);

  const handleExportAll = () => {
    downloadCSV(filteredData, `rate_cards_${new Date().toISOString().slice(0, 10)}.csv`);
  };

  const columns = [
    {
      header: 'Rate Card ID',
      accessor: (row: RateCard) => (
        <span className="font-mono text-xs font-bold text-indigo-600 dark:text-indigo-400">
          #{row.id.slice(0, 8).toUpperCase()}
        </span>
      ),
    },
    {
      header: 'Tariff Agreement',
      accessor: (row: RateCard) => (
        <div>
          <div className="font-bold text-slate-900 dark:text-slate-100 text-xs">{row.name}</div>
          <div className="text-[11px] text-slate-500 flex items-center gap-1 mt-0.5">
            <Building2 className="w-3 h-3 text-slate-400" /> {row.customer?.name || 'Standard Tariff'}
          </div>
        </div>
      ),
    },
    {
      header: 'Route Lane',
      accessor: (row: RateCard) => (
        <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-700 dark:text-slate-300">
          <span>{row.route_origin}</span>
          <ArrowRight className="w-3.5 h-3.5 text-indigo-500 shrink-0" />
          <span>{row.route_destination}</span>
        </div>
      ),
    },
    {
      header: 'Base Tariff Rate',
      accessor: (row: RateCard) => (
        <div className="font-mono text-xs font-extrabold text-slate-900 dark:text-slate-100">
          {row.currency || 'SAR'} {Number(row.base_price).toLocaleString()}
        </div>
      ),
    },
    {
      header: 'Status',
      accessor: (row: RateCard) => (
        <Badge 
          variant="outline" 
          className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 ${
            row.is_active 
              ? 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-800' 
              : 'bg-slate-100 text-slate-500 border-slate-200 dark:bg-slate-800 dark:text-slate-400'
          }`}
        >
          {row.is_active ? 'Active' : 'Inactive'}
        </Badge>
      ),
    },
    {
      header: 'Actions',
      accessor: (row: RateCard) => (
        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="sm"
            className="h-7 w-7 p-0 text-slate-500 hover:text-slate-900 dark:hover:text-slate-100"
            title="Edit Rate Card"
            onClick={(e) => { e.stopPropagation(); navigate(`/rate-cards/${row.id}/edit`); }}
          >
            <Edit2 className="w-3.5 h-3.5" />
          </Button>
        </div>
      ),
    },
  ];

  const bulkActions = [
    {
      label: 'Export Selected',
      icon: <Download className="w-3.5 h-3.5" />,
      variant: 'secondary' as const,
      onClick: (selectedRows: RateCard[]) => {
        downloadCSV(selectedRows, 'selected_rate_cards.csv');
      }
    },
    {
      label: 'Delete Selected',
      icon: <Trash2 className="w-3.5 h-3.5" />,
      variant: 'danger' as const,
      onClick: async (selectedRows: RateCard[]) => {
        if (!confirm(`Are you sure you want to delete ${selectedRows.length} rate cards?`)) return;
        try {
          await rateCardService.bulkDelete(selectedRows.map(r => r.id));
          queryClient.invalidateQueries({ queryKey: ['rate-cards'] });
        } catch (e) { 
          alert('Failed to delete selected rate cards'); 
        }
      }
    }
  ];

  return (
    <DashboardLayout active="RateCards" title="Rate Cards">
      <div className="px-6 pb-6 space-y-4 animate-fade-in max-w-[1400px] mx-auto">
        
        {/* Top Scope & Action Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-1 border-b border-slate-200 dark:border-slate-800">
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-slate-100 dark:bg-slate-800 text-xs font-semibold text-slate-700 dark:text-slate-300 border border-slate-200/80 dark:border-slate-700">
              <span>🏢 MERCON Commercial</span>
              <span>•</span>
              <span className="text-slate-900 dark:text-slate-100 font-bold">Tariff Agreements</span>
            </div>
            <Badge variant="outline" className="bg-indigo-50 text-indigo-600 border-indigo-200 font-bold dark:bg-indigo-950/40 dark:text-indigo-300">
              Contract Billing
            </Badge>
          </div>

          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={handleExportAll}
              className="h-9 gap-1.5 text-xs font-semibold border-slate-200 bg-white hover:bg-slate-50 shadow-2xs"
            >
              <Download className="w-3.5 h-3.5" /> Export CSV
            </Button>

            <Button
              variant="outline"
              size="sm"
              onClick={handleRefresh}
              disabled={isRefreshing}
              className="h-9 gap-1.5 text-xs font-semibold border-slate-200 bg-white hover:bg-slate-50 shadow-2xs"
            >
              <RotateCw className={`w-3.5 h-3.5 ${isRefreshing ? 'animate-spin text-indigo-600' : 'text-slate-500'}`} />
              {isRefreshing ? 'Refreshing...' : 'Refresh'}
            </Button>

            <Button 
              size="sm" 
              onClick={() => navigate('/rate-cards/new')}
              className="h-9 gap-1.5 text-xs bg-[#E8450F] hover:bg-[#d03d0c] text-white font-bold shadow-xs rounded-md px-4"
            >
              <Plus className="w-4 h-4" /> Create Rate Card
            </Button>
          </div>
        </div>

        {/* Header KPI Instrument Panel Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <Card className="p-3 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xs">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Active Rate Cards</span>
              <FileText className="w-4 h-4 text-indigo-600" />
            </div>
            <div className="mt-1 flex items-baseline justify-between">
              <span className="text-xl font-extrabold text-slate-900 dark:text-slate-100">{kpis.activeCount}</span>
              <Badge variant="outline" className="text-[9px] px-1 py-0 bg-emerald-50 text-emerald-700 border-emerald-200 font-bold">
                {kpis.activePct}% Active
              </Badge>
            </div>
          </Card>

          <Card className="p-3 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xs">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Avg Base Tariff</span>
              <CreditCard className="w-4 h-4 text-emerald-600" />
            </div>
            <div className="mt-1 flex items-baseline justify-between">
              <span className="text-xl font-extrabold text-slate-900 dark:text-slate-100 font-mono">
                SAR {kpis.avgPrice.toLocaleString()}
              </span>
              <span className="text-[10px] text-slate-500 font-medium">Per Trip</span>
            </div>
          </Card>

          <Card className="p-3 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xs">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Top Route Lane</span>
              <MapPin className="w-4 h-4 text-blue-600" />
            </div>
            <div className="mt-1 flex items-baseline justify-between">
              <span className="text-xs font-bold text-slate-900 dark:text-slate-100 truncate max-w-[150px]">
                {kpis.topRoute}
              </span>
              <Badge variant="outline" className="text-[9px] px-1 py-0 bg-indigo-50 text-indigo-600 border-indigo-200 font-bold">
                Primary
              </Badge>
            </div>
          </Card>

          <Card className="p-3 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xs">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Contracted Orgs</span>
              <Building2 className="w-4 h-4 text-purple-600" />
            </div>
            <div className="mt-1 flex items-baseline justify-between">
              <span className="text-xl font-extrabold text-slate-900 dark:text-slate-100">{kpis.uniqueCustomers}</span>
              <span className="text-[10px] text-slate-500 font-medium">Organizations</span>
            </div>
          </Card>
        </div>

        {/* Toolbar Controls Section */}
        <div className="bg-white dark:bg-slate-900 rounded-xl p-3 shadow-2xs border border-slate-200 dark:border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-3">
          
          {/* Search Input */}
          <div className="relative w-full sm:w-72">
            <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
            <Input
              placeholder="Search contract name, customer, route..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="h-9 text-xs pl-9 border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50 focus-visible:ring-slate-400"
            />
          </div>

          {/* Controls: Status Filter & View Switcher */}
          <div className="flex items-center gap-3 w-full sm:w-auto justify-between sm:justify-end">
            
            <div className="flex items-center gap-1.5">
              <Filter className="w-3.5 h-3.5 text-slate-400" />
              <Select value={statusFilter} onValueChange={(val: any) => setStatusFilter(val)}>
                <SelectTrigger className="h-9 text-xs w-36 border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50">
                  <SelectValue placeholder="Status Filter" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Statuses</SelectItem>
                  <SelectItem value="active">Active Only</SelectItem>
                  <SelectItem value="inactive">Inactive Only</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* View Mode Segmented Control */}
            <div className="bg-slate-100 dark:bg-slate-800 p-1 rounded-lg flex items-center border border-slate-200 dark:border-slate-700">
              <button
                onClick={() => setViewMode('ledger')}
                className={`p-1.5 rounded-md text-xs font-bold transition-all flex items-center gap-1 ${
                  viewMode === 'ledger' 
                    ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 shadow-xs' 
                    : 'text-slate-500 hover:text-slate-900 dark:hover:text-slate-100'
                }`}
                title="Ledger Table View"
              >
                <List className="w-3.5 h-3.5" />
              </button>
              <button
                onClick={() => setViewMode('grid')}
                className={`p-1.5 rounded-md text-xs font-bold transition-all flex items-center gap-1 ${
                  viewMode === 'grid' 
                    ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 shadow-xs' 
                    : 'text-slate-500 hover:text-slate-900 dark:hover:text-slate-100'
                }`}
                title="Grid Card View"
              >
                <LayoutGrid className="w-3.5 h-3.5" />
              </button>
            </div>

          </div>
        </div>

        {/* Content Workspace: Ledger Table vs Grid Cards */}
        {viewMode === 'ledger' ? (
          <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-2xs overflow-hidden">
            <DataTable
              columns={columns}
              data={filteredData}
              bulkActions={bulkActions}
              isLoading={isLoading}
              searchPlaceholder="Search contract name, customer..."
              onSearchChange={setSearch}
              currentPage={currentPage}
              totalPages={1}
              onPageChange={setCurrentPage}
              onRowClick={(row) => navigate(`/rate-cards/${row.id}/edit`)}
            />
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredData.map((rc) => (
              <Card 
                key={rc.id} 
                onClick={() => navigate(`/rate-cards/${rc.id}/edit`)}
                className="border border-slate-200 dark:border-slate-800 shadow-2xs hover:shadow-md transition-all cursor-pointer bg-white dark:bg-slate-900 flex flex-col justify-between group"
              >
                <CardHeader className="pb-3 border-b border-slate-100 dark:border-slate-800">
                  <div className="flex items-center justify-between">
                    <span className="font-mono text-[10px] text-indigo-600 dark:text-indigo-400 font-bold">
                      #{rc.id.slice(0, 8).toUpperCase()}
                    </span>
                    <Badge 
                      variant="outline" 
                      className={`text-[9px] font-bold uppercase tracking-wider px-1.5 py-0 ${
                        rc.is_active 
                          ? 'bg-emerald-50 text-emerald-700 border-emerald-200' 
                          : 'bg-slate-100 text-slate-500 border-slate-200'
                      }`}
                    >
                      {rc.is_active ? 'Active' : 'Inactive'}
                    </Badge>
                  </div>
                  <CardTitle className="text-sm font-extrabold text-slate-900 dark:text-slate-100 group-hover:text-indigo-600 transition-colors mt-1">
                    {rc.name}
                  </CardTitle>
                  <CardDescription className="text-xs text-slate-500 flex items-center gap-1">
                    <Building2 className="w-3 h-3 text-slate-400" /> {rc.customer?.name || 'Standard Contract'}
                  </CardDescription>
                </CardHeader>

                <CardContent className="py-3 space-y-2">
                  <div className="bg-slate-50 dark:bg-slate-800/40 p-2.5 rounded-lg border border-slate-100 dark:border-slate-800 flex items-center justify-between text-xs">
                    <span className="font-bold text-slate-700 dark:text-slate-300">{rc.route_origin}</span>
                    <ArrowRight className="w-3.5 h-3.5 text-[#E8450F]" />
                    <span className="font-bold text-slate-700 dark:text-slate-300">{rc.route_destination}</span>
                  </div>
                </CardContent>

                <CardFooter className="bg-slate-50 dark:bg-slate-900 border-t border-slate-100 dark:border-slate-800 p-3 flex items-center justify-between text-xs">
                  <span className="text-[10px] text-slate-500 font-medium">Base Tariff Rate:</span>
                  <span className="font-mono font-extrabold text-slate-900 dark:text-slate-100">
                    {rc.currency || 'SAR'} {Number(rc.base_price).toLocaleString()}
                  </span>
                </CardFooter>
              </Card>
            ))}
          </div>
        )}

      </div>
    </DashboardLayout>
  );
}
