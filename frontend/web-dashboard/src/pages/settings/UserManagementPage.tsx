import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus, Edit2, Trash2, Shield, Download, Users, Truck, Eye, KeyRound, CheckCircle2, AlertCircle, Phone, RefreshCw } from 'lucide-react';
import { toast } from 'sonner';

import { downloadCSV, exportExcelTable, exportPDFTable } from '@/utils/exportUtils';
import { FileSpreadsheet, FileText } from 'lucide-react';
import { matchesSearch } from '@/lib/search';
import DashboardLayout from '@/components/layout/DashboardLayout';
import DataTable from '@/components/ui/DataTable';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { authStore } from '@/store/authStore';
import { userService, UserDTO } from '@/services/userService';
import { driverService, Driver } from '@/services/driverService';
import UserModal from './components/UserModal';
import DriverPasswordModal from './components/DriverPasswordModal';

type ActiveTab = 'users' | 'drivers';
type DriverPasswordFilter = 'all' | 'has_password' | 'no_password';

export default function UserManagementPage() {
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<ActiveTab>('users');
  const [search, setSearch] = useState('');
  const [driverPassFilter, setDriverPassFilter] = useState<DriverPasswordFilter>('all');

  const currentUser = authStore.getUser();
  const isAdmin = currentUser?.role === 'Admin';

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<UserDTO | null>(null);

  const [selectedDriverForPassword, setSelectedDriverForPassword] = useState<Driver | null>(null);
  const [isDriverPasswordModalOpen, setIsDriverPasswordModalOpen] = useState(false);

  // Queries
  const { data: users = [], isLoading: isUsersLoading, isError: isUsersError, error: usersError, refetch: refetchUsers } = useQuery({
    queryKey: ['users'],
    queryFn: userService.getUsers,
  });

  const { data: driversRes, isLoading: isDriversLoading, isError: isDriversError, error: driversError, refetch: refetchDrivers } = useQuery({
    queryKey: ['drivers', 'for-user-management'],
    queryFn: () => driverService.getAll(),
    enabled: isAdmin,
  });

  const driversList: Driver[] = driversRes?.data || [];

  const handleExportUsers = (rows: UserDTO[], format: 'excel' | 'pdf') => {
    if (!rows.length) return;
    const headers = ['User ID', 'Name', 'Username', 'Email', 'Role', 'Status'];
    const dataRows = rows.map((u) => [
      u.id || '',
      u.name || '',
      u.username || '',
      u.email || '',
      u.role || '',
      u.status || '',
    ]);

    const title = 'Platform Users Export';
    const filename = `platform_users_export_${new Date().toISOString().slice(0, 10)}.${format === 'excel' ? 'xlsx' : 'pdf'}`;
    if (format === 'excel') {
      exportExcelTable(title, headers, dataRows, filename);
    } else {
      exportPDFTable(title, headers, dataRows, filename);
    }
  };

  const handleExportDrivers = (rows: Driver[], format: 'excel' | 'pdf') => {
    if (!rows.length) return;
    const headers = ['Driver ID', 'Name', 'Phone', 'License Number', 'Status', 'Has Password Account'];
    const dataRows = rows.map((d) => [
      d.id || '',
      `${d.first_name || ''} ${d.last_name || ''}`.trim(),
      d.phone_primary || '',
      d.license_number || '',
      d.status || '',
      d.hasAccountPassword ? 'Yes' : 'No',
    ]);

    const title = 'Driver Accounts Export';
    const filename = `driver_accounts_export_${new Date().toISOString().slice(0, 10)}.${format === 'excel' ? 'xlsx' : 'pdf'}`;
    if (format === 'excel') {
      exportExcelTable(title, headers, dataRows, filename);
    } else {
      exportPDFTable(title, headers, dataRows, filename);
    }
  };

  // Driver Statistics
  const totalDrivers = driversList.length;
  const driversWithPassword = driversList.filter(d => d.hasAccountPassword).length;
  const driversWithoutPassword = totalDrivers - driversWithPassword;

  // Web Users mutations
  const createMutation = useMutation({
    mutationFn: userService.createUser,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users'] });
      toast.success('User created successfully');
      setIsModalOpen(false);
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.error?.message || 'Failed to create user');
    }
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: any }) => userService.updateUser(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users'] });
      toast.success('User updated successfully');
      setIsModalOpen(false);
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.error?.message || 'Failed to update user');
    }
  });

  const deleteMutation = useMutation({
    mutationFn: userService.deleteUser,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users'] });
      toast.success('User deactivated successfully');
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.error?.message || 'Failed to deactivate user');
    }
  });

  // Driver Password mutation
  const setDriverPasswordMutation = useMutation({
    mutationFn: ({ driverId, password }: { driverId: string; password: string }) =>
      driverService.setDriverPassword(driverId, password),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['drivers', 'for-user-management'] });
      toast.success('Driver password set successfully. Driver can now log in via mobile app.');
      setIsDriverPasswordModalOpen(false);
      setSelectedDriverForPassword(null);
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.error?.message || 'Failed to set driver password');
    }
  });

  const handleSaveUser = (data: any) => {
    if (editingUser) {
      updateMutation.mutate({ id: editingUser.id, data });
    } else {
      createMutation.mutate(data);
    }
  };

  const handleEditUser = (user: UserDTO) => {
    setEditingUser(user);
    setIsModalOpen(true);
  };

  const handleDeleteUser = (user: UserDTO) => {
    if (confirm(`Are you sure you want to deactivate ${user.name}?`)) {
      deleteMutation.mutate(user.id);
    }
  };

  const handleOpenDriverPasswordModal = (driver: Driver) => {
    setSelectedDriverForPassword(driver);
    setIsDriverPasswordModalOpen(true);
  };

  const handleSaveDriverPassword = (driverId: string, password: string) => {
    setDriverPasswordMutation.mutate({ driverId, password });
  };

  // Filtered Web Users Data
  const filteredUsers = users.filter(u =>
    matchesSearch(search, [u.name || '', u.phone || '', u.email || '', u.username || '', u.role])
  );

  // Filtered Drivers Data
  const filteredDrivers = driversList.filter(d => {
    const fullName = `${d.first_name} ${d.last_name}`;
    const matchesKeyword = matchesSearch(search, [fullName, d.phone_primary || '', d.license_number || '', d.ref_id || '']);
    
    if (!matchesKeyword) return false;

    if (driverPassFilter === 'has_password') return Boolean(d.hasAccountPassword);
    if (driverPassFilter === 'no_password') return !d.hasAccountPassword;
    return true;
  });

  // Table Columns for Web Users
  const userColumns = [
    {
      header: 'Name',
      accessor: (u: UserDTO) => (
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-full bg-[#F5F5F7] dark:bg-slate-800 flex items-center justify-center text-brand font-bold text-xs border border-black/[0.05]">
            {u.name?.substring(0, 2).toUpperCase() || 'U'}
          </div>
          <div className="flex flex-col">
            <span className="font-semibold text-slate-900 dark:text-slate-100">{u.name || 'Unnamed User'}</span>
            <span className="text-xs text-slate-400">@{u.username}</span>
          </div>
        </div>
      ),
    },
    {
      header: 'Phone / Contact',
      accessor: (u: UserDTO) => (
        <div className="flex flex-col gap-0.5 text-xs text-slate-600 dark:text-slate-300">
          <span className="font-semibold text-slate-800 dark:text-slate-200 flex items-center gap-1">
            <Phone size={11} className="text-slate-400" />
            {u.phone || 'No phone'}
          </span>
          {u.email && <span className="text-slate-400">{u.email}</span>}
        </div>
      ),
    },
    {
      header: 'Role',
      accessor: (u: UserDTO) => {
        let bg = 'bg-slate-100 text-slate-700', text = 'text-slate-700';
        if (u.role === 'Admin') { bg = 'bg-red-50 text-red-700 border-red-200'; }
        else if (u.role === 'Operator') { bg = 'bg-blue-50 text-blue-700 border-blue-200'; }

        return (
          <span className="inline-flex items-center gap-1.5">
            <span className={`px-2.5 py-0.5 rounded text-xs font-bold ${bg} border inline-flex items-center gap-1`}>
              <Shield size={10} />
              {u.role}
            </span>
            {u.isSuperAdmin && (
              <span className="px-2 py-0.5 rounded text-xs font-bold bg-brand/10 text-brand inline-flex items-center gap-1" title="Superadmin">
                <Shield size={10} />
                Superadmin
              </span>
            )}
          </span>
        );
      },
    },
    {
      header: 'Status',
      accessor: (u: UserDTO) => (
        <span className={`text-xs font-bold px-2.5 py-0.5 rounded ${
          u.status === 'Active' ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : 'bg-slate-100 text-slate-500'
        }`}>
          {u.status || 'Active'}
        </span>
      ),
    },
    ...(isAdmin ? [{
      header: 'Actions',
      accessor: (u: UserDTO) => (
        <div className="flex items-center gap-1">
          <button
            onClick={() => handleEditUser(u)}
            className="w-7 h-7 rounded-lg bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 flex items-center justify-center transition-colors"
            title="Edit user details"
          >
            <Edit2 size={13} className="text-slate-600 dark:text-slate-300" />
          </button>
          <button
            onClick={() => handleDeleteUser(u)}
            className="w-7 h-7 rounded-lg bg-red-50 hover:bg-red-100 dark:bg-red-950/40 dark:hover:bg-red-900/40 flex items-center justify-center transition-colors"
            title="Deactivate user"
          >
            <Trash2 size={13} className="text-red-600" />
          </button>
        </div>
      ),
    }] : []),
  ];

  // Table Columns for Driver Accounts
  const driverColumns = [
    {
      header: 'Driver Name',
      accessor: (d: Driver) => (
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-full bg-brand/10 text-brand flex items-center justify-center font-bold text-xs border border-brand/20">
            {d.first_name?.[0]?.toUpperCase()}{d.last_name?.[0]?.toUpperCase()}
          </div>
          <div className="flex flex-col">
            <span className="font-semibold text-slate-900 dark:text-slate-100">
              {d.first_name} {d.last_name}
            </span>
            <span className="text-xs text-slate-400">{d.ref_id || 'No Ref ID'}</span>
          </div>
        </div>
      ),
    },
    {
      header: 'Phone Primary (Mobile Login ID)',
      accessor: (d: Driver) => (
        <span className="text-sm font-semibold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
          <Phone size={13} className="text-slate-400" />
          {d.phone_primary || 'N/A'}
        </span>
      ),
    },
    {
      header: 'License Number',
      accessor: (d: Driver) => (
        <span className="text-xs text-slate-600 dark:text-slate-300 font-mono">
          {d.license_number || 'N/A'}
        </span>
      ),
    },
    {
      header: 'Assigned Vehicle',
      accessor: (d: Driver) => (
        <span className="text-xs text-slate-600 dark:text-slate-300">
          {d.assignedVehicle ? (
            <Badge variant="outline" className="font-mono text-xs">
              {d.assignedVehicle.plate_number}
            </Badge>
          ) : (
            <span className="text-slate-400 italic">Unassigned</span>
          )}
        </span>
      ),
    },
    {
      header: 'Mobile App Account',
      accessor: (d: Driver) => (
        <span className={`inline-flex items-center gap-1.5 text-xs font-bold px-2.5 py-0.5 rounded-full ${
          d.hasAccountPassword
            ? 'bg-emerald-50 text-emerald-700 border border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-400'
            : 'bg-amber-50 text-amber-700 border border-amber-200 dark:bg-amber-950/40 dark:text-amber-400'
        }`}>
          {d.hasAccountPassword ? <CheckCircle2 size={12} /> : <AlertCircle size={12} />}
          {d.hasAccountPassword ? 'Password Active' : 'No Password Set'}
        </span>
      ),
    },
    ...(isAdmin ? [{
      header: 'Actions',
      accessor: (d: Driver) => (
        <div className="flex items-center gap-2">
          <Button
            size="sm"
            variant={d.hasAccountPassword ? 'outline' : 'default'}
            className={`h-7 px-2.5 text-xs font-semibold gap-1.5 ${
              !d.hasAccountPassword ? 'bg-brand hover:bg-brand-hover text-white shadow-2xs' : 'border-slate-200'
            }`}
            onClick={() => handleOpenDriverPasswordModal(d)}
          >
            <KeyRound size={12} />
            {d.hasAccountPassword ? 'Update Password' : 'Create Password'}
          </Button>

          <button
            onClick={() => navigate(`/drivers/${d.id}`)}
            title="View Driver Details"
            className="w-7 h-7 rounded-lg bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 flex items-center justify-center transition-colors"
          >
            <Eye size={13} className="text-slate-600 dark:text-slate-300" />
          </button>
        </div>
      ),
    }] : []),
  ];

  return (
    <DashboardLayout
      active="Settings"
      title="Settings"
    >
      <div className="px-4 sm:px-6 pb-6 h-full flex flex-col animate-fade-in gap-5">

        {/* Top Header Row with Title & Module Badge */}
        <div className="flex flex-wrap items-center justify-between gap-4 shrink-0 pb-1">
          <div className="flex items-center gap-3">
            <Users className="w-6 h-6 text-orange-500 dark:text-orange-400 shrink-0" />

            <div className="flex flex-col">
              <div className="flex items-center gap-2.5">
                <h1 className="text-2xl font-extrabold text-slate-900 dark:text-slate-100 tracking-tight">
                  User Management
                </h1>
                <Badge className="bg-indigo-50 text-indigo-600 border-indigo-200 font-semibold text-xs">
                  Access & Accounts Module
                </Badge>
              </div>
              <p className="text-xs text-slate-500 font-medium">
                Manage web dashboard admins, operators, and driver mobile app login passwords.
              </p>
            </div>
          </div>

          {/* Top Bar Actions Group */}
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              className="h-9 gap-1.5 text-xs font-semibold border-slate-200 bg-white hover:bg-slate-50 shadow-2xs"
              onClick={() => {
                if (activeTab === 'users') refetchUsers();
                else refetchDrivers();
              }}
            >
              <RefreshCw className="h-3.5 w-3.5 text-slate-600" />
              Refresh
            </Button>

            {isAdmin && activeTab === 'users' && (
              <Button
                size="sm"
                className="h-9 gap-1.5 text-xs font-bold bg-brand hover:bg-brand-hover text-white shadow-xs rounded-md px-4"
                onClick={() => { setEditingUser(null); setIsModalOpen(true); }}
              >
                <Plus className="h-4 w-4" />
                Add User
              </Button>
            )}
          </div>
        </div>

        {/* Tab Selector Segmented Bar */}
        <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-2">
          <div className="flex items-center gap-2">
            <button
              onClick={() => setActiveTab('users')}
              className={`px-4 py-2 text-xs font-bold rounded-lg transition-all flex items-center gap-2 ${
                activeTab === 'users'
                  ? 'bg-brand text-white shadow-xs'
                  : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200'
              }`}
            >
              <Users size={14} />
              <span>Web Users ({users.length})</span>
            </button>

            {isAdmin && (
              <button
                onClick={() => setActiveTab('drivers')}
                className={`px-4 py-2 text-xs font-bold rounded-lg transition-all flex items-center gap-2 ${
                  activeTab === 'drivers'
                    ? 'bg-brand text-white shadow-xs'
                    : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200'
                }`}
              >
                <Truck size={14} />
                <span>Driver Accounts ({totalDrivers})</span>
              </button>
            )}
          </div>

          {activeTab === 'drivers' && (
            <div className="flex items-center gap-1.5 bg-slate-100 dark:bg-slate-800 p-1 rounded-lg">
              <button
                onClick={() => setDriverPassFilter('all')}
                className={`px-3 py-1 text-xs font-bold rounded-md transition-all ${
                  driverPassFilter === 'all'
                    ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100 shadow-2xs'
                    : 'text-slate-500 hover:text-slate-800'
                }`}
              >
                All ({totalDrivers})
              </button>
              <button
                onClick={() => setDriverPassFilter('has_password')}
                className={`px-3 py-1 text-xs font-bold rounded-md transition-all ${
                  driverPassFilter === 'has_password'
                    ? 'bg-white dark:bg-slate-700 text-emerald-600 shadow-2xs'
                    : 'text-slate-500 hover:text-slate-800'
                }`}
              >
                With Password ({driversWithPassword})
              </button>
              <button
                onClick={() => setDriverPassFilter('no_password')}
                className={`px-3 py-1 text-xs font-bold rounded-md transition-all ${
                  driverPassFilter === 'no_password'
                    ? 'bg-white dark:bg-slate-700 text-amber-600 shadow-2xs'
                    : 'text-slate-500 hover:text-slate-800'
                }`}
              >
                No Password ({driversWithoutPassword})
              </button>
            </div>
          )}
        </div>

        {/* Tab 1: Web Users Table */}
        {activeTab === 'users' && (
          <DataTable
            title={
              <span className="flex items-center gap-2">
                <Users className="w-4 h-4 text-violet-500" />
                <span>Admins & Operators</span>
              </span>
            }
            columns={userColumns}
            data={filteredUsers}
            compact={true}
            bulkActions={[
              {
                label: 'Export Excel',
                icon: <FileSpreadsheet size={13} className="text-emerald-600" />,
                variant: 'secondary' as const,
                onClick: (selectedRows: UserDTO[]) => {
                  handleExportUsers(selectedRows, 'excel');
                }
              },
              {
                label: 'Export PDF',
                icon: <FileText size={13} className="text-rose-600" />,
                variant: 'secondary' as const,
                onClick: (selectedRows: UserDTO[]) => {
                  handleExportUsers(selectedRows, 'pdf');
                }
              }
            ]}
            enableSelection={true}
            isLoading={isUsersLoading}
            isError={isUsersError}
            errorMessage={(usersError as Error)?.message || 'Failed to load users.'}
            searchPlaceholder="Search by name, phone, email, username..."
            searchValue={search}
            onSearchChange={setSearch}
          />
        )}

        {/* Tab 2: Driver Accounts & Password Management Table */}
        {activeTab === 'drivers' && (
          <div className="space-y-4">
            {/* KPI Cards for Driver Accounts */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-4 flex items-center justify-between shadow-2xs">
                <div>
                  <p className="text-xs font-bold uppercase tracking-wider text-slate-400">Total Drivers</p>
                  <h3 className="text-2xl font-black text-slate-900 dark:text-slate-100 mt-1">{totalDrivers}</h3>
                  <span className="text-xs text-slate-500 font-medium">Created from Drivers module</span>
                </div>
                <Truck className="w-5 h-5 text-slate-600 shrink-0" />
              </div>

              <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-4 flex items-center justify-between shadow-2xs">
                <div>
                  <p className="text-xs font-bold uppercase tracking-wider text-emerald-600">Mobile Account Active</p>
                  <h3 className="text-2xl font-black text-emerald-600 mt-1">{driversWithPassword}</h3>
                  <span className="text-xs text-slate-500 font-medium">Password created (Can log in)</span>
                </div>
                <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
              </div>

              <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-4 flex items-center justify-between shadow-2xs">
                <div>
                  <p className="text-xs font-bold uppercase tracking-wider text-amber-600">No Mobile Password</p>
                  <h3 className="text-2xl font-black text-amber-600 mt-1">{driversWithoutPassword}</h3>
                  <span className="text-xs text-slate-500 font-medium">Needs password to access mobile app</span>
                </div>
                <AlertCircle className="w-5 h-5 text-amber-600 shrink-0" />
              </div>
            </div>

            <DataTable
              title={
                <span className="flex items-center gap-2">
                  <KeyRound className="w-4 h-4 text-orange-500" />
                  <span>Driver Mobile App Accounts</span>
                </span>
              }
              columns={driverColumns}
              data={filteredDrivers}
              compact={true}
              bulkActions={[
                {
                  label: 'Export Excel',
                  icon: <FileSpreadsheet size={13} className="text-emerald-600" />,
                  variant: 'secondary' as const,
                  onClick: (selectedRows: Driver[]) => {
                    handleExportDrivers(selectedRows, 'excel');
                  }
                },
                {
                  label: 'Export PDF',
                  icon: <FileText size={13} className="text-rose-600" />,
                  variant: 'secondary' as const,
                  onClick: (selectedRows: Driver[]) => {
                    handleExportDrivers(selectedRows, 'pdf');
                  }
                }
              ]}
              enableSelection={true}
              isLoading={isDriversLoading}
              isError={isDriversError}
              errorMessage={(driversError as Error)?.message || 'Failed to load drivers.'}
              searchPlaceholder="Search driver by name, phone, license..."
              searchValue={search}
              onSearchChange={setSearch}
            />
          </div>
        )}
      </div>

      {isAdmin && (
        <>
          <UserModal
            isOpen={isModalOpen}
            onClose={() => setIsModalOpen(false)}
            onSave={handleSaveUser}
            initialData={editingUser}
            isLoading={createMutation.isPending || updateMutation.isPending}
            canManageSuperAdmin={currentUser?.isSuperAdmin}
          />

          <DriverPasswordModal
            isOpen={isDriverPasswordModalOpen}
            onClose={() => {
              setIsDriverPasswordModalOpen(false);
              setSelectedDriverForPassword(null);
            }}
            driver={selectedDriverForPassword}
            onSave={handleSaveDriverPassword}
            isLoading={setDriverPasswordMutation.isPending}
          />
        </>
      )}
    </DashboardLayout>
  );
}
