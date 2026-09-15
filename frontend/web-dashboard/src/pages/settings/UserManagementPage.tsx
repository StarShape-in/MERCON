import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Plus, Edit2, Trash2, Shield, Download, Users, Truck, Eye, KeyRound, CheckCircle2, AlertCircle, Phone, RefreshCw,
  UserCheck, Lock, Sparkles, ShieldCheck, FileSpreadsheet, FileText, ArrowUpRight
} from 'lucide-react';
import { toast } from 'sonner';

import { exportExcelTable, exportPDFTable } from '@/utils/exportUtils';
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
  const {
    data: users = [],
    isLoading: isUsersLoading,
    isError: isUsersError,
    error: usersError,
    refetch: refetchUsers
  } = useQuery({
    queryKey: ['users'],
    queryFn: userService.getUsers,
  });

  const {
    data: driversRes,
    isLoading: isDriversLoading,
    isError: isDriversError,
    error: driversError,
    refetch: refetchDrivers
  } = useQuery({
    queryKey: ['drivers', 'for-user-management'],
    queryFn: () => driverService.getAll(),
    enabled: isAdmin,
  });

  const driversList: Driver[] = driversRes?.data || [];

  // Statistics
  const totalUsersCount = users.length;
  const adminUsersCount = users.filter((u) => u.role === 'Admin' || u.isSuperAdmin).length;
  const operatorUsersCount = users.filter((u) => u.role === 'Operator').length;

  const totalDrivers = driversList.length;
  const driversWithPassword = driversList.filter((d) => d.hasAccountPassword).length;
  const driversWithoutPassword = totalDrivers - driversWithPassword;
  const driverSetupRatio = totalDrivers > 0 ? Math.round((driversWithPassword / totalDrivers) * 100) : 0;

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
      toast.success('User status updated');
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.error?.message || 'Failed to update user status');
    }
  });

  // Driver Password mutation
  const setDriverPasswordMutation = useMutation({
    mutationFn: ({ driverId, password }: { driverId: string; password: string }) =>
      driverService.setDriverPassword(driverId, password),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['drivers', 'for-user-management'] });
      toast.success('Driver password saved. Driver can now log into MERCON Mobile App.');
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
    const isActivating = user.status !== 'Active';
    const actionName = isActivating ? 'activate' : 'deactivate';
    if (confirm(`Are you sure you want to ${actionName} ${user.name}?`)) {
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
  const filteredUsers = useMemo(() => {
    return users.filter((u) =>
      matchesSearch(search, [u.name || '', u.phone || '', u.email || '', u.username || '', u.role])
    );
  }, [users, search]);

  // Filtered Drivers Data
  const filteredDrivers = useMemo(() => {
    return driversList.filter((d) => {
      const fullName = `${d.first_name} ${d.last_name}`;
      const matchesKeyword = matchesSearch(search, [fullName, d.phone_primary || '', d.license_number || '', d.ref_id || '']);

      if (!matchesKeyword) return false;

      if (driverPassFilter === 'has_password') return Boolean(d.hasAccountPassword);
      if (driverPassFilter === 'no_password') return !d.hasAccountPassword;
      return true;
    });
  }, [driversList, search, driverPassFilter]);

  // Table Columns for Web Users
  const userColumns = [
    {
      header: 'User / Identity',
      accessor: (u: UserDTO) => {
        const initials = u.name?.substring(0, 2).toUpperCase() || 'U';
        return (
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-slate-900 text-white font-black text-xs flex items-center justify-center shrink-0 shadow-2xs">
              {initials}
            </div>
            <div className="flex flex-col min-w-0">
              <span className="font-bold text-xs text-slate-900 dark:text-slate-100 truncate">
                {u.name || 'Unnamed User'}
              </span>
              <span className="text-[11px] text-slate-400 font-mono font-medium">@{u.username}</span>
            </div>
          </div>
        );
      },
    },
    {
      header: 'Contact Details',
      accessor: (u: UserDTO) => (
        <div className="flex flex-col gap-0.5 text-xs">
          <span className="font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1">
            <Phone size={11} className="text-slate-400 shrink-0" />
            {u.phone || 'No phone'}
          </span>
          {u.email && <span className="text-[11px] text-slate-400 font-medium truncate">{u.email}</span>}
        </div>
      ),
    },
    {
      header: 'Access Role',
      accessor: (u: UserDTO) => {
        let badgeStyle = 'bg-slate-100 text-slate-700 border-slate-200';
        if (u.role === 'Admin' || u.isSuperAdmin) {
          badgeStyle = 'bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-950/40 dark:text-rose-300 dark:border-rose-900';
        } else if (u.role === 'Operator') {
          badgeStyle = 'bg-indigo-50 text-indigo-700 border-indigo-200 dark:bg-indigo-950/40 dark:text-indigo-300 dark:border-indigo-900';
        }

        return (
          <div className="flex items-center gap-1.5 flex-wrap">
            <span className={`px-2.5 py-0.5 rounded-lg text-[11px] font-bold border inline-flex items-center gap-1 ${badgeStyle}`}>
              <Shield size={10} />
              {u.role}
            </span>
            {u.isSuperAdmin && (
              <span className="px-2 py-0.5 rounded-lg text-[10px] font-bold bg-amber-50 text-amber-800 border border-amber-200 inline-flex items-center gap-1">
                <ShieldCheck size={10} />
                Superadmin
              </span>
            )}
          </div>
        );
      },
    },
    {
      header: 'Account Status',
      accessor: (u: UserDTO) => (
        <span className={`inline-flex items-center gap-1 text-[11px] font-bold px-2.5 py-0.5 rounded-full border ${
          u.status === 'Active'
            ? 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/50 dark:text-emerald-400 dark:border-emerald-800'
            : 'bg-slate-100 text-slate-600 border-slate-200 dark:bg-slate-800 dark:text-slate-400'
        }`}>
          <span className={`w-1.5 h-1.5 rounded-full ${u.status === 'Active' ? 'bg-emerald-500' : 'bg-slate-400'}`} />
          {u.status || 'Active'}
        </span>
      ),
    },
    ...(isAdmin ? [{
      header: 'Actions',
      headerClassName: 'text-right',
      className: 'text-right',
      accessor: (u: UserDTO) => (
        <div className="flex items-center justify-end gap-1">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => handleEditUser(u)}
            className="h-7 w-7 p-0 text-slate-600 hover:text-[#FA634E] hover:bg-rose-50 dark:hover:bg-rose-950/30"
            title="Edit User Details"
          >
            <Edit2 size={13} />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => handleDeleteUser(u)}
            className="h-7 w-7 p-0 text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/30"
            title={u.status === 'Active' ? 'Deactivate User' : 'Activate User'}
          >
            <Trash2 size={13} />
          </Button>
        </div>
      ),
    }] : []),
  ];

  // Table Columns for Driver Accounts
  const driverColumns = [
    {
      header: 'Driver Name & Ref',
      accessor: (d: Driver) => (
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-indigo-50 dark:bg-indigo-950/50 text-indigo-600 dark:text-indigo-400 font-black text-xs flex items-center justify-center shrink-0 border border-indigo-200 dark:border-indigo-800 shadow-2xs">
            {d.first_name?.[0]?.toUpperCase()}{d.last_name?.[0]?.toUpperCase()}
          </div>
          <div className="flex flex-col min-w-0">
            <span className="font-bold text-xs text-slate-900 dark:text-slate-100 truncate">
              {d.first_name} {d.last_name}
            </span>
            <span className="text-[10px] text-slate-400 font-mono font-medium">{d.ref_id || 'No Ref ID'}</span>
          </div>
        </div>
      ),
    },
    {
      header: 'Mobile Login ID (Phone)',
      accessor: (d: Driver) => (
        <span className="text-xs font-mono font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
          <Phone size={12} className="text-slate-400 shrink-0" />
          {d.phone_primary || 'N/A'}
        </span>
      ),
    },
    {
      header: 'License Number',
      accessor: (d: Driver) => (
        <span className="text-xs text-slate-600 dark:text-slate-300 font-mono font-semibold">
          {d.license_number || '—'}
        </span>
      ),
    },
    {
      header: 'Assigned Truck',
      accessor: (d: Driver) => (
        <span className="text-xs">
          {d.assignedVehicle ? (
            <Badge variant="outline" className="font-mono text-[11px] font-bold bg-slate-50 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
              {d.assignedVehicle.plate_number}
            </Badge>
          ) : (
            <span className="text-slate-400 italic text-[11px]">Unassigned</span>
          )}
        </span>
      ),
    },
    {
      header: 'Mobile Password Status',
      accessor: (d: Driver) => (
        <span className={`inline-flex items-center gap-1.5 text-[11px] font-bold px-2.5 py-0.5 rounded-full border ${
          d.hasAccountPassword
            ? 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-400 dark:border-emerald-800'
            : 'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/40 dark:text-amber-400 dark:border-amber-800'
        }`}>
          {d.hasAccountPassword ? <CheckCircle2 size={12} /> : <AlertCircle size={12} />}
          {d.hasAccountPassword ? 'Password Active' : 'No Password Set'}
        </span>
      ),
    },
    ...(isAdmin ? [{
      header: 'Actions',
      headerClassName: 'text-right',
      className: 'text-right',
      accessor: (d: Driver) => (
        <div className="flex items-center justify-end gap-2">
          <Button
            size="sm"
            onClick={() => handleOpenDriverPasswordModal(d)}
            className={`h-7 px-3 text-xs font-bold gap-1 rounded-xl shadow-2xs transition-colors ${
              !d.hasAccountPassword
                ? 'bg-[#FA634E] hover:bg-[#e0523d] text-white'
                : 'bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-700'
            }`}
          >
            <KeyRound size={12} />
            {d.hasAccountPassword ? 'Update Password' : 'Set Password'}
          </Button>

          <Button
            variant="ghost"
            size="sm"
            onClick={() => navigate(`/drivers/${d.id}`)}
            className="h-7 w-7 p-0 text-slate-500 hover:text-indigo-600"
            title="View Driver Details"
          >
            <Eye size={14} />
          </Button>
        </div>
      ),
    }] : []),
  ];

  return (
    <DashboardLayout
      active="Settings"
      title="User Management"
      breadcrumb="Settings"
      actions={
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            className="h-8 px-3 text-xs font-semibold rounded-xl border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900"
            onClick={() => {
              if (activeTab === 'users') refetchUsers();
              else refetchDrivers();
            }}
          >
            <RefreshCw className="h-3.5 w-3.5 mr-1.5 text-slate-500" />
            Refresh
          </Button>

          {isAdmin && (
            activeTab === 'users' ? (
              <Button
                size="sm"
                className="h-8 px-3.5 text-xs font-bold bg-[#FA634E] hover:bg-[#e0523d] text-white shadow-2xs rounded-xl cursor-pointer"
                onClick={() => { setEditingUser(null); setIsModalOpen(true); }}
              >
                <Plus className="h-3.5 w-3.5 mr-1.5" />
                Add User
              </Button>
            ) : (
              <Button
                size="sm"
                className="h-8 px-3.5 text-xs font-bold bg-[#FA634E] hover:bg-[#e0523d] text-white shadow-2xs rounded-xl cursor-pointer"
                onClick={() => navigate('/drivers/new')}
              >
                <Plus className="h-3.5 w-3.5 mr-1.5" />
                Add Driver
              </Button>
            )
          )}
        </div>
      }
    >
      <div className="p-4 max-w-[1600px] mx-auto w-full flex flex-col gap-4 bg-[#EEF1F6]/40 dark:bg-slate-950">

        {/* ── UNIFIED WORKSPACE & TAB CONTROL ── */}
        <div className="rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 p-4 shadow-2xs space-y-4">

          {/* Tab Selector Segmented Bar with Highlighted Driver App Button */}
          <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-3 flex-wrap gap-2">
            <div className="flex items-center gap-2 bg-slate-100 dark:bg-slate-800/80 p-1.5 rounded-2xl border border-slate-200/80 dark:border-slate-700">
              <button
                type="button"
                onClick={() => setActiveTab('users')}
                className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                  activeTab === 'users'
                    ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-2xs'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
                }`}
              >
                <Users className="w-4 h-4" />
                <span>Web Platform Users</span>
                <Badge variant="secondary" className="text-[10px] px-1.5 py-0 h-4 font-mono font-bold bg-slate-200/80 text-slate-700 dark:bg-slate-800 dark:text-slate-300">
                  {users.length}
                </Badge>
              </button>

              {isAdmin && (
                <button
                  type="button"
                  onClick={() => setActiveTab('drivers')}
                  className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-black transition-all cursor-pointer shadow-xs ${
                    activeTab === 'drivers'
                      ? 'bg-[#FA634E] text-white shadow-md shadow-rose-500/20 ring-2 ring-[#FA634E]/30'
                      : 'bg-rose-50 text-[#FA634E] border border-rose-200/90 hover:bg-rose-100 dark:bg-rose-950/50 dark:border-rose-800 dark:text-rose-300'
                  }`}
                >
                  <Truck className="w-4 h-4" />
                  <span>Driver Mobile App Accounts</span>
                  <Badge
                    className={`text-[10px] px-2 py-0.5 font-mono font-black rounded-full transition-colors ${
                      activeTab === 'drivers'
                        ? 'bg-white text-[#FA634E]'
                        : 'bg-[#FA634E] text-white'
                    }`}
                  >
                    {totalDrivers}
                  </Badge>
                </button>
              )}
            </div>

            {/* Sub-filter pills for Driver Password Status */}
            {activeTab === 'drivers' && (
              <div className="flex items-center gap-1 bg-slate-100 dark:bg-slate-800/80 p-1 rounded-xl border border-slate-200/80 dark:border-slate-700">
                <button
                  type="button"
                  onClick={() => setDriverPassFilter('all')}
                  className={`px-2.5 py-1 text-xs font-bold rounded-lg transition-all cursor-pointer ${
                    driverPassFilter === 'all'
                      ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 shadow-2xs'
                      : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
                  }`}
                >
                  All ({totalDrivers})
                </button>
                <button
                  type="button"
                  onClick={() => setDriverPassFilter('has_password')}
                  className={`px-2.5 py-1 text-xs font-bold rounded-lg transition-all cursor-pointer ${
                    driverPassFilter === 'has_password'
                      ? 'bg-white dark:bg-slate-900 text-emerald-600 dark:text-emerald-400 shadow-2xs'
                      : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
                  }`}
                >
                  Password Active ({driversWithPassword})
                </button>
                <button
                  type="button"
                  onClick={() => setDriverPassFilter('no_password')}
                  className={`px-2.5 py-1 text-xs font-bold rounded-lg transition-all cursor-pointer ${
                    driverPassFilter === 'no_password'
                      ? 'bg-white dark:bg-slate-900 text-amber-600 dark:text-amber-400 shadow-2xs'
                      : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
                  }`}
                >
                  Pending Setup ({driversWithoutPassword})
                </button>
              </div>
            )}
          </div>

          {/* Tab 1: Web Users Table */}
          {activeTab === 'users' && (
            <DataTable
              title={
                <span className="flex items-center gap-2 text-xs font-bold">
                  <Users className="w-4 h-4 text-[#FA634E]" />
                  <span>Platform Admins & Operations Roster</span>
                </span>
              }
              columns={userColumns}
              data={users}
              pageSize={10}
              pageSizeOptions={[10, 25, 50]}
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
              errorMessage={(usersError as Error)?.message || 'Failed to load platform users.'}
            />
          )}

          {/* Tab 2: Driver Accounts & Password Management Table */}
          {activeTab === 'drivers' && (
            <DataTable
              title={
                <span className="flex items-center gap-2 text-xs font-bold">
                  <KeyRound className="w-4 h-4 text-[#FA634E]" />
                  <span>Driver Mobile App Authentication Roster</span>
                </span>
              }
              columns={driverColumns}
              data={filteredDrivers}
              pageSize={10}
              pageSizeOptions={[10, 25, 50]}
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
            />
          )}

        </div>

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
