import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { 
  Shield, Check, CheckCircle2, ArrowRightLeft, 
  HelpCircle, RefreshCw, LayoutGrid 
} from 'lucide-react';
import { toast } from 'sonner';

import DashboardLayout from '@/components/layout/DashboardLayout';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { authStore } from '@/store/authStore';
import { settingsService } from '@/services/settingsService';
import { MODULE_KEYS, type ModuleKey } from '@mercon/shared-types';
import { cn } from '@/lib/utils';

const MODULE_DESCRIPTIONS: Record<string, { label: string; path: string; desc: string }> = {
  dashboard: {
    label: 'Dashboard',
    path: '/',
    desc: 'Main operational dashboard overview, metrics & live dispatch center.',
  },
  quotations: {
    label: 'Commercial Quotations',
    path: '/quotations',
    desc: 'Manage commercial pricing quotations, rate agreements & AI rate import.',
  },
  trips: {
    label: 'Trips Ledger',
    path: '/trips',
    desc: 'Operational dispatch ledger, trip creation, Kanban board & tracking.',
  },
  drivers: {
    label: 'Driver Management',
    path: '/drivers',
    desc: 'Driver master registry, license details, assignments & driver accounts.',
  },
  vehicles: {
    label: 'Vehicle Fleet',
    path: '/vehicles',
    desc: 'Vehicle fleet registry, specs, ownership & vehicle financial P&L.',
  },
  customers: {
    label: 'Customer Directory',
    path: '/customers',
    desc: 'Customer master directory, billing profiles & client contacts.',
  },
  locations: {
    label: 'Location Master',
    path: '/locations',
    desc: 'Location master database, geocodes, mapping & deduplication.',
  },
  taxonomy: {
    label: 'Taxonomy & Config',
    path: '/taxonomy',
    desc: 'Taxonomy configuration, line types, billing types & universal colors.',
  },
  invoices: {
    label: 'Invoices & Billing',
    path: '/invoices',
    desc: 'Manage customer billing, payments & invoices ledger.',
  },
  expenses: {
    label: 'Expenses & Fuel Logs',
    path: '/expenses',
    desc: 'Track operational expenses, fuel logs & cash flows.',
  },
  maintenance: {
    label: 'Vehicle Maintenance',
    path: '/maintenance',
    desc: 'Manage vehicle service tasks, workshop records & inspections.',
  },
  reports: {
    label: 'Reports & Analytics',
    path: '/reports',
    desc: 'Generate dispatch reports, performance & audit summaries.',
  },
  documents: {
    label: 'Document Center',
    path: '/documents',
    desc: 'Store, assign & track driver & vehicle documents.',
  },
  'company-reports': {
    label: 'Company Excel Reports',
    path: '/company-reports',
    desc: 'Configure and generate company-specific custom Excel reports.',
  },
  'report-builder': {
    label: 'Smart Report Builder',
    path: '/report-builder',
    desc: 'Smart drag-and-drop report builder with custom filters & exports.',
  },
  'third-party': {
    label: 'Third-Party Fleet',
    path: '/third-party',
    desc: 'Third-party fleet carrier management & partner trips.',
  },
  'aprodac-documents': {
    label: 'Aprodac Vault',
    path: '/aprodac-documents',
    desc: 'Aprodac compliance document storage & digital archives.',
  },
  learning: {
    label: 'Learning & Academy',
    path: '/learning',
    desc: 'Operational training, driver safety certifications & interactive academy.',
  },
};

export default function ModuleGovernancePage() {
  const queryClient = useQueryClient();
  const user = authStore.getUser();
  const isSuperAdmin = user?.role === 'SuperAdmin' || (user as any)?.isSuperAdmin === true;

  const { data: settings } = useQuery({
    queryKey: ['settings'],
    queryFn: settingsService.get,
  });

  const [enabledModules, setEnabledModules] = useState<ModuleKey[]>([]);
  const [defaultRedirectModule, setDefaultRedirectModule] = useState<string>('quotations');
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  useEffect(() => {
    if (settings) {
      setEnabledModules(settings.enabledModules || []);
      setDefaultRedirectModule((settings as any).defaultRedirectModule || 'quotations');
    }
  }, [settings]);

  const updateMutation = useMutation({
    mutationFn: () =>
      settingsService.update({
        enabledModules,
        defaultRedirectModule,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['settings'] });
      queryClient.invalidateQueries({ queryKey: ['settings', 'public'] });
      toast.success('Module governance saved successfully!');
      setSuccessMsg('Module governance saved — navigation and route access updated.');
      setTimeout(() => setSuccessMsg(null), 4000);
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.error?.message || 'Failed to update module governance.');
    },
  });

  const toggleModule = (key: ModuleKey) => {
    setEnabledModules((prev) => (prev.includes(key) ? prev.filter((m) => m !== key) : [...prev, key]));
  };

  const selectableKeys = MODULE_KEYS.filter((k) => k !== 'recycle-bin');
  const activeCount = enabledModules.filter((k) => k !== 'recycle-bin').length;

  return (
    <DashboardLayout active="/settings" title="Module Governance & Access" breadcrumb="SuperAdmin Portal">
      <div className="max-w-5xl mx-auto space-y-6 pb-12">
        {/* Header Hero Banner */}
        <div className="relative overflow-hidden rounded-3xl bg-slate-900 text-white p-6 sm:p-8 shadow-xl border border-slate-800">
          <div className="relative z-10 space-y-3 max-w-2xl">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-brand/20 border border-brand/40 text-brand text-xs font-bold">
              <Shield className="w-3.5 h-3.5" />
              <span>SuperAdmin Dedicated Governance</span>
            </div>
            <h1 className="text-xl sm:text-2xl font-black tracking-tight">Agile Delivery & Page Governance</h1>
            <p className="text-xs sm:text-sm text-slate-300 leading-relaxed">
              Enable or disable individual platform pages and modules for regular users. Disabled modules are immediately hidden from the sidebar, top navigation, and URL routes.
            </p>
          </div>
          <div className="absolute right-6 top-1/2 -translate-y-1/2 hidden md:flex items-center gap-4">
            <div className="bg-slate-800/80 backdrop-blur-md rounded-2xl p-4 border border-slate-700/80 text-center min-w-[120px]">
              <span className="text-2xl font-black text-brand block">{activeCount} / {selectableKeys.length}</span>
              <span className="text-[10px] uppercase tracking-wider font-bold text-slate-400">Modules Active</span>
            </div>
          </div>
        </div>

        {/* Default Redirect Fallback Selection */}
        <Card className="border border-slate-200/90 dark:border-slate-800 shadow-sm rounded-2xl overflow-hidden bg-white dark:bg-slate-950">
          <CardHeader className="p-5 pb-3">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-orange-50 dark:bg-orange-950/40 text-brand flex items-center justify-center font-bold shrink-0">
                <ArrowRightLeft className="w-4 h-4" />
              </div>
              <div>
                <CardTitle className="text-sm font-bold text-slate-900 dark:text-slate-100">Disabled Module Fallback Landing Page</CardTitle>
                <CardDescription className="text-xs text-slate-500">
                  Select which active page users will automatically land on if they attempt to open a disabled route.
                </CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="p-5 pt-2">
            <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
              <select
                value={defaultRedirectModule}
                onChange={(e) => setDefaultRedirectModule(e.target.value)}
                disabled={!isSuperAdmin}
                className="w-full sm:w-80 h-10 text-xs rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 px-3.5 font-bold text-slate-800 dark:text-slate-100 shadow-2xs focus:ring-2 focus:ring-brand focus:outline-none"
              >
                {selectableKeys.map((key) => {
                  const meta = MODULE_DESCRIPTIONS[key];
                  const isActive = enabledModules.includes(key);
                  return (
                    <option key={key} value={key}>
                      {meta?.label || key} ({isActive ? 'Active' : 'Disabled'})
                    </option>
                  );
                })}
              </select>
              <div className="text-xs text-slate-500 flex items-center gap-1.5">
                <HelpCircle className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                <span>Default fallback target: <strong className="text-slate-800 dark:text-slate-200 capitalize">{MODULE_DESCRIPTIONS[defaultRedirectModule]?.label || defaultRedirectModule}</strong></span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Modules Toggle Grid */}
        <Card className="border border-slate-200/90 dark:border-slate-800 shadow-sm rounded-2xl overflow-hidden bg-white dark:bg-slate-950">
          <CardHeader className="p-5 pb-3">
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-sm font-bold text-slate-900 dark:text-slate-100">Platform Page Toggles</CardTitle>
                <CardDescription className="text-xs text-slate-500">Click any card to toggle module access for operators and non-superadmins.</CardDescription>
              </div>
              <Badge variant="outline" className="text-xs font-bold text-slate-600 dark:text-slate-400">
                {activeCount} Active
              </Badge>
            </div>
          </CardHeader>
          <CardContent className="p-5 pt-2">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3.5">
              {selectableKeys.map((key) => {
                const isEnabled = enabledModules.includes(key);
                const meta = MODULE_DESCRIPTIONS[key] || {
                  label: key.replace(/-/g, ' '),
                  path: `/${key}`,
                  desc: 'System module route',
                };

                return (
                  <button
                    key={key}
                    type="button"
                    onClick={() => toggleModule(key)}
                    disabled={!isSuperAdmin}
                    className={cn(
                      "flex items-start gap-3.5 p-4 rounded-2xl border text-left transition-all cursor-pointer relative group",
                      isEnabled
                        ? "border-brand/80 bg-orange-50/10 text-slate-900 dark:text-slate-100 dark:bg-orange-950/10 shadow-2xs"
                        : "border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 bg-white dark:bg-slate-950 hover:bg-slate-50 dark:hover:bg-slate-900/50",
                      !isSuperAdmin && "opacity-75 cursor-not-allowed"
                    )}
                  >
                    <div className={cn(
                      "w-5 h-5 rounded-md border flex items-center justify-center shrink-0 mt-0.5 transition-colors",
                      isEnabled ? "bg-brand border-brand text-white" : "border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900"
                    )}>
                      {isEnabled && <Check className="w-3.5 h-3.5 stroke-[3]" />}
                    </div>
                    <div className="min-w-0 flex-1 space-y-1">
                      <div className="flex items-center justify-between gap-1">
                        <span className="text-xs font-bold block truncate">{meta.label}</span>
                        <Badge
                          variant={isEnabled ? "default" : "secondary"}
                          className={cn(
                            "text-[9px] px-1.5 py-0 font-extrabold uppercase shrink-0",
                            isEnabled ? "bg-emerald-500 text-white" : "bg-slate-200 text-slate-600 dark:bg-slate-800 dark:text-slate-400"
                          )}
                        >
                          {isEnabled ? 'ON' : 'OFF'}
                        </Badge>
                      </div>
                      <p className="text-[10px] text-slate-400 dark:text-slate-500 leading-tight font-medium line-clamp-2">
                        {meta.desc}
                      </p>
                      <span className="text-[9px] text-slate-400 font-mono block pt-0.5">Route: {meta.path}</span>
                    </div>
                  </button>
                );
              })}
            </div>
          </CardContent>

          {successMsg && (
            <div className="mx-5 mb-4 p-3 bg-emerald-50 dark:bg-emerald-950/20 text-emerald-700 dark:text-emerald-400 rounded-xl text-xs font-semibold border border-emerald-100 dark:border-emerald-900/50 flex items-center gap-2 animate-fade-in">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
              {successMsg}
            </div>
          )}

          <CardFooter className="bg-slate-50/60 dark:bg-slate-900 border-t border-slate-100 dark:border-slate-800/80 p-4 flex flex-col sm:flex-row justify-between items-center gap-3">
            <span className="text-[11px] text-slate-500 font-medium">
              {isSuperAdmin ? 'SuperAdmin access: Changes persist immediately to the database on save.' : 'Read-only view for non-superadmins.'}
            </span>
            <Button
              onClick={() => updateMutation.mutate()}
              disabled={updateMutation.isPending || !isSuperAdmin}
              className="w-full sm:w-auto bg-brand hover:bg-brand/90 text-white font-bold text-xs h-9 px-6 rounded-xl shadow-md shadow-brand/20 cursor-pointer"
            >
              {updateMutation.isPending ? (
                <>
                  <RefreshCw className="w-3.5 h-3.5 animate-spin mr-2" />
                  Saving...
                </>
              ) : (
                'Save Module Governance'
              )}
            </Button>
          </CardFooter>
        </Card>
      </div>
    </DashboardLayout>
  );
}
