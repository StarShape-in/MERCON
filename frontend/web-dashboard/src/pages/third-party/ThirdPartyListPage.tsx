import { useState, useMemo } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import {
  Building2,
  Plus,
  RefreshCw,
  Download,
  Search,
  Filter,
  LayoutList,
  LayoutGrid,
  Phone,
  Mail,
  MapPin,
  FileText,
  Star,
  Truck,
  TrendingUp,
  DollarSign,
  ArrowUpRight,
  MoreVertical,
  Edit,
  Trash2,
  CheckCircle2,
  XCircle,
} from 'lucide-react';
import DashboardLayout from '@/components/layout/DashboardLayout';
import { thirdPartyService, ThirdPartyProvider } from '@/services/thirdPartyService';
import CreateThirdPartyModal from '@/components/third-party/CreateThirdPartyModal';
import EditThirdPartyModal from '@/components/third-party/EditThirdPartyModal';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';
import { exportToCSV } from '@/utils/exportUtils';

export default function ThirdPartyListPage() {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'inactive'>('all');
  const [viewMode, setViewMode] = useState<'list' | 'grid'>('list');

  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [selectedProviderForEdit, setSelectedProviderForEdit] = useState<ThirdPartyProvider | null>(null);

  const { data: providersRes, isLoading, refetch } = useQuery({
    queryKey: ['third-party-providers', search, statusFilter],
    queryFn: () =>
      thirdPartyService.getAll({
        search: search.trim() || undefined,
        is_active: statusFilter === 'all' ? undefined : statusFilter === 'active',
        per_page: 100,
      }),
  });

  const providers: ThirdPartyProvider[] = providersRes?.data?.data || [];

  // Metrics
  const totalProviders = providers.length;
  const activeProviders = providers.filter((p) => p.isActive).length;
  const totalSubcontractTrips = providers.reduce((acc, p) => acc + (p.total_trips || 0), 0);
  const totalRentalOutlay = providers.reduce((acc, p) => acc + (p.total_cost || 0), 0);

  const handleExportCsv = () => {
    if (providers.length === 0) return;
    const exportData = providers.map((p) => ({
      'Provider Name': p.name,
      'Contact Person': p.contact_person || 'N/A',
      Phone: p.phone || 'N/A',
      Email: p.email || 'N/A',
      'Tax ID': p.tax_id || 'N/A',
      'Total Trips': p.total_trips || 0,
      'Active Trips': p.active_trips || 0,
      'Total Rental Outlay (SAR)': p.total_cost || 0,
      Status: p.isActive ? 'Active' : 'Inactive',
    }));
    exportToCSV(exportData, `Third_Party_Providers_${new Date().toISOString().split('T')[0]}.csv`);
  };

  const handleDelete = async (id: string, name: string) => {
    if (!window.confirm(`Are you sure you want to remove third-party provider "${name}"?`)) return;
    try {
      await thirdPartyService.delete(id);
      queryClient.invalidateQueries({ queryKey: ['third-party-providers'] });
    } catch (err: any) {
      alert(err?.message || 'Failed to delete provider');
    }
  };

  return (
    <DashboardLayout title="Third-Party Fleet" active="/third-party">
      <div className="space-y-6">
        {/* 1. Header Layout & Top Bar Actions */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <div className="text-[11px] font-bold tracking-wider uppercase bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 px-2.5 py-1 rounded-md border border-slate-200 dark:border-slate-700 flex items-center gap-1.5">
                <span>🏢 MERCON Operations</span>
                <span className="text-slate-400">↕</span>
              </div>
              <Badge className="bg-purple-50 text-purple-700 dark:bg-purple-950/50 dark:text-purple-300 border-purple-200 dark:border-purple-800 font-semibold">
                Third-Party &amp; Rental Module
              </Badge>
            </div>
            <h1 className="text-xl font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
              Third-Party Logistics Providers
            </h1>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Manage external subcontractors, rented truck suppliers, and third-party driver capacity.
            </p>
          </div>

          <div className="flex items-center gap-2 self-start md:self-auto">
            <Button
              variant="outline"
              size="sm"
              onClick={handleExportCsv}
              disabled={providers.length === 0}
              className="h-9 text-xs font-semibold"
            >
              <Download className="w-3.5 h-3.5 mr-1.5" /> Export CSV
            </Button>

            <Button
              size="sm"
              onClick={() => setIsCreateModalOpen(true)}
              className="h-9 text-xs font-bold bg-brand hover:bg-brand/90 text-white rounded-lg shadow-sm"
            >
              <Plus className="w-3.5 h-3.5 mr-1.5" /> + New Provider
            </Button>

            <Button
              variant="ghost"
              size="icon"
              onClick={() => refetch()}
              title="Refresh provider data"
              className="h-9 w-9 text-slate-600 dark:text-slate-400"
            >
              <RefreshCw className={cn('w-4 h-4', isLoading && 'animate-spin')} />
            </Button>
          </div>
        </div>

        {/* 2. Instrument-Panel KPI Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Card 1 */}
          <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">Total Providers</span>
              <div className="p-2 rounded-lg bg-purple-50 dark:bg-purple-950/50 text-purple-600">
                <Building2 className="w-4 h-4" />
              </div>
            </div>
            <div className="text-2xl font-bold text-slate-900 dark:text-slate-100">{totalProviders}</div>
            <div className="text-[11px] text-emerald-600 font-semibold flex items-center gap-1">
              <ArrowUpRight className="w-3 h-3" /> {activeProviders} Active Suppliers
            </div>
          </div>

          {/* Card 2 */}
          <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">Subcontracted Trips</span>
              <div className="p-2 rounded-lg bg-indigo-50 dark:bg-indigo-950/50 text-indigo-600">
                <Truck className="w-4 h-4" />
              </div>
            </div>
            <div className="text-2xl font-bold text-slate-900 dark:text-slate-100">{totalSubcontractTrips}</div>
            <div className="text-[11px] text-slate-500 font-medium">Executed via rental fleet</div>
          </div>

          {/* Card 3 */}
          <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">Rental Outlay</span>
              <div className="p-2 rounded-lg bg-emerald-50 dark:bg-emerald-950/50 text-emerald-600">
                <DollarSign className="w-4 h-4" />
              </div>
            </div>
            <div className="text-2xl font-bold text-slate-900 dark:text-slate-100">
              SAR {totalRentalOutlay.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </div>
            <div className="text-[11px] text-emerald-600 font-medium">Total paid to 3PL partners</div>
          </div>

          {/* Card 4 */}
          <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">Avg Provider Rating</span>
              <div className="p-2 rounded-lg bg-amber-50 dark:bg-amber-950/50 text-amber-500">
                <Star className="w-4 h-4 fill-amber-500" />
              </div>
            </div>
            <div className="text-2xl font-bold text-slate-900 dark:text-slate-100">4.9 / 5.0</div>
            <div className="text-[11px] text-slate-500 font-medium">Service quality indicator</div>
          </div>
        </div>

        {/* 3. Toolbar & Control Bar */}
        <div className="p-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="relative w-full sm:w-80">
            <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <Input
              placeholder="Search provider, contact, phone..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9 h-9 text-xs"
            />
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto justify-between sm:justify-end">
            <div className="flex items-center gap-1.5 bg-slate-100 dark:bg-slate-800 p-1 rounded-lg border border-slate-200 dark:border-slate-700 text-xs">
              <button
                type="button"
                onClick={() => setStatusFilter('all')}
                className={cn(
                  'px-2.5 py-1 rounded-md font-bold transition-all cursor-pointer',
                  statusFilter === 'all'
                    ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 shadow-sm'
                    : 'text-slate-500 hover:text-slate-900 dark:hover:text-slate-200'
                )}
              >
                All
              </button>
              <button
                type="button"
                onClick={() => setStatusFilter('active')}
                className={cn(
                  'px-2.5 py-1 rounded-md font-bold transition-all cursor-pointer',
                  statusFilter === 'active'
                    ? 'bg-white dark:bg-slate-900 text-emerald-600 shadow-sm'
                    : 'text-slate-500 hover:text-slate-900 dark:hover:text-slate-200'
                )}
              >
                Active
              </button>
            </div>

            {/* View Switcher */}
            <div className="flex items-center gap-1 bg-slate-100 dark:bg-slate-800 p-1 rounded-lg border border-slate-200 dark:border-slate-700">
              <button
                type="button"
                onClick={() => setViewMode('list')}
                className={cn(
                  'p-1 rounded-md transition-all cursor-pointer',
                  viewMode === 'list'
                    ? 'bg-white dark:bg-slate-900 text-brand shadow-sm'
                    : 'text-slate-400 hover:text-slate-700 dark:hover:text-slate-300'
                )}
                title="List View"
              >
                <LayoutList className="w-4 h-4" />
              </button>
              <button
                type="button"
                onClick={() => setViewMode('grid')}
                className={cn(
                  'p-1 rounded-md transition-all cursor-pointer',
                  viewMode === 'grid'
                    ? 'bg-white dark:bg-slate-900 text-brand shadow-sm'
                    : 'text-slate-400 hover:text-slate-700 dark:hover:text-slate-300'
                )}
                title="Grid View"
              >
                <LayoutGrid className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>

        {/* 4. Data Table Ledger & Empty States */}
        <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm overflow-hidden">
          <div className="px-4 py-3 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between bg-slate-50/50 dark:bg-slate-900/50">
            <h3 className="text-xs font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
              <span>🥞 Third-Party Provider Ledger</span>
            </h3>
            <span className="text-[11px] font-semibold text-slate-500 dark:text-slate-400">
              {providers.length} {providers.length === 1 ? 'record' : 'records'}
            </span>
          </div>

          {providers.length === 0 ? (
            <div className="py-16 text-center space-y-3">
              <div className="w-12 h-12 rounded-full bg-purple-50 dark:bg-purple-950/50 text-purple-600 flex items-center justify-center mx-auto">
                <Building2 className="w-6 h-6" />
              </div>
              <div className="space-y-1">
                <h4 className="text-sm font-bold text-slate-900 dark:text-slate-100">No Third-Party Providers Found</h4>
                <p className="text-xs text-slate-500 max-w-sm mx-auto">
                  {search ? 'No providers match your search filters.' : 'Get started by creating your first rental supplier or subcontractor provider.'}
                </p>
              </div>
              {!search && (
                <Button size="sm" onClick={() => setIsCreateModalOpen(true)} className="h-8 text-xs font-bold bg-brand text-white">
                  <Plus className="w-3.5 h-3.5 mr-1" /> Add Third-Party Provider
                </Button>
              )}
            </div>
          ) : viewMode === 'list' ? (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-900/80 text-[11px] uppercase tracking-wider text-slate-500 font-bold">
                    <th className="py-3 px-4">Provider Name</th>
                    <th className="py-3 px-4">Contact Person</th>
                    <th className="py-3 px-4">Phone / Email</th>
                    <th className="py-3 px-4 text-center">Total Trips</th>
                    <th className="py-3 px-4 text-right">Rental Outlay</th>
                    <th className="py-3 px-4 text-center">Status</th>
                    <th className="py-3 px-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200 dark:divide-slate-800 text-xs">
                  {providers.map((p) => (
                    <tr key={p.id} className="hover:bg-slate-50/80 dark:hover:bg-slate-800/40 transition-colors">
                      <td className="py-3.5 px-4 font-bold text-slate-900 dark:text-slate-100">
                        <div className="flex items-center gap-2">
                          <div className="p-1.5 rounded-lg bg-purple-50 dark:bg-purple-950/40 text-purple-600">
                            <Building2 className="w-3.5 h-3.5" />
                          </div>
                          <div>
                            <span className="block font-bold">{p.name}</span>
                            {p.tax_id && <span className="text-[10px] text-slate-400 font-mono">Tax: {p.tax_id}</span>}
                          </div>
                        </div>
                      </td>

                      <td className="py-3.5 px-4 text-slate-700 dark:text-slate-300">
                        {p.contact_person ? (
                          <span className="font-medium">{p.contact_person}</span>
                        ) : (
                          <span className="text-slate-400 italic">—</span>
                        )}
                      </td>

                      <td className="py-3.5 px-4 text-slate-600 dark:text-slate-400">
                        <div className="space-y-0.5">
                          {p.phone && (
                            <div className="flex items-center gap-1.5">
                              <Phone className="w-3 h-3 text-slate-400" />
                              <span>{p.phone}</span>
                            </div>
                          )}
                          {p.email && (
                            <div className="flex items-center gap-1.5 text-[11px]">
                              <Mail className="w-3 h-3 text-slate-400" />
                              <span>{p.email}</span>
                            </div>
                          )}
                          {!p.phone && !p.email && <span className="text-slate-400 italic">—</span>}
                        </div>
                      </td>

                      <td className="py-3.5 px-4 text-center">
                        <Badge className="bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-none font-bold">
                          {p.total_trips || 0} trips
                        </Badge>
                      </td>

                      <td className="py-3.5 px-4 text-right font-bold text-slate-900 dark:text-slate-100">
                        SAR {(p.total_cost || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                      </td>

                      <td className="py-3.5 px-4 text-center">
                        {p.isActive ? (
                          <Badge className="bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300 border-emerald-200">
                            Active
                          </Badge>
                        ) : (
                          <Badge variant="outline" className="text-slate-400">
                            Inactive
                          </Badge>
                        )}
                      </td>

                      <td className="py-3.5 px-4 text-right">
                        <div className="flex items-center justify-end gap-1">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => setSelectedProviderForEdit(p)}
                            className="h-7 w-7 text-slate-600 hover:text-brand"
                            title="Edit Provider"
                          >
                            <Edit className="w-3.5 h-3.5" />
                          </Button>

                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleDelete(p.id, p.name)}
                            className="h-7 w-7 text-slate-400 hover:text-rose-600"
                            title="Delete Provider"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 p-4">
              {providers.map((p) => (
                <div key={p.id} className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm space-y-3">
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-2.5">
                      <div className="p-2 rounded-lg bg-purple-50 dark:bg-purple-950/50 text-purple-600">
                        <Building2 className="w-4 h-4" />
                      </div>
                      <div>
                        <h4 className="font-bold text-sm text-slate-900 dark:text-slate-100">{p.name}</h4>
                        {p.contact_person && <p className="text-xs text-slate-500">{p.contact_person}</p>}
                      </div>
                    </div>

                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => setSelectedProviderForEdit(p)}
                      className="h-7 w-7 text-slate-400 hover:text-brand"
                    >
                      <Edit className="w-3.5 h-3.5" />
                    </Button>
                  </div>

                  <div className="space-y-1.5 text-xs text-slate-600 dark:text-slate-400 pt-2 border-t border-slate-100 dark:border-slate-800">
                    {p.phone && (
                      <div className="flex items-center gap-2">
                        <Phone className="w-3.5 h-3.5 text-slate-400" />
                        <span>{p.phone}</span>
                      </div>
                    )}
                    {p.email && (
                      <div className="flex items-center gap-2">
                        <Mail className="w-3.5 h-3.5 text-slate-400" />
                        <span>{p.email}</span>
                      </div>
                    )}
                    {p.address && (
                      <div className="flex items-center gap-2">
                        <MapPin className="w-3.5 h-3.5 text-slate-400" />
                        <span>{p.address}</span>
                      </div>
                    )}
                  </div>

                  <div className="flex items-center justify-between pt-2 border-t border-slate-100 dark:border-slate-800 text-xs">
                    <div>
                      <span className="text-[10px] uppercase font-bold text-slate-400 block">Total Trips</span>
                      <span className="font-bold text-slate-900 dark:text-slate-100">{p.total_trips || 0}</span>
                    </div>

                    <div className="text-right">
                      <span className="text-[10px] uppercase font-bold text-slate-400 block">Total Outlay</span>
                      <span className="font-bold text-brand">SAR {(p.total_cost || 0).toLocaleString()}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Create & Edit Modals */}
      <CreateThirdPartyModal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
      />

      {selectedProviderForEdit && (
        <EditThirdPartyModal
          isOpen={!!selectedProviderForEdit}
          provider={selectedProviderForEdit}
          onClose={() => setSelectedProviderForEdit(null)}
        />
      )}
    </DashboardLayout>
  );
}
