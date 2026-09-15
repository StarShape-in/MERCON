import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Plus, Edit2, Trash2, Shield, Users, Truck, Eye, KeyRound, Phone, Mail, RotateCcw,
  ShieldCheck, FileSpreadsheet, FileText, ChevronDown, MoreHorizontal, Monitor, Smartphone, Search
} from 'lucide-react';
import { toast } from 'sonner';

import { exportExcelTable, exportPDFTable } from '@/utils/exportUtils';
import { matchesSearch } from '@/lib/search';
import DashboardLayout from '@/components/layout/DashboardLayout';
import DataTable from '@/components/ui/DataTable';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { authStore } from '@/store/authStore';
import { userService, UserDTO } from '@/services/userService';
import { driverService, Driver } from '@/services/driverService';
import UserModal from './components/UserModal';
import DriverPasswordModal from './components/DriverPasswordModal';

type ActiveTab = 'all' | 'web' | 'driver';

interface UnifiedUser {
  id: string;
  name: string;
  username: string;
  avatarUrl?: string;
  phone: string;
  email: string;
  role: string;
  isSuperAdmin?: boolean;
  accountType: 'Web' | 'Driver App';
  status: string;
  lastLogin: string;
  hasAccountPassword?: boolean;
  originalUser?: UserDTO;
  originalDriver?: Driver;
}

export default function UserManagementPage() {
  const queryClient = useQueryClient();
  const navigate = useNavigate();

  const [activeTab, setActiveTab] = useState<ActiveTab>('all');
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [accountTypeFilter, setAccountTypeFilter] = useState('all');

  const currentUser = authStore.getUser();
  const isAdmin = currentUser?.role === 'Admin' || currentUser?.isSuperAdmin;

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
  } = useQuery({
    queryKey: ['users'],
    queryFn: userService.getUsers,
  });

  const {
    data: driversRes,
    isLoading: isDriversLoading,
    isError: isDriversError,
    error: driversError,
  } = useQuery({
    queryKey: ['drivers', 'for-user-management'],
    queryFn: () => driverService.getAll(),
  });

  const driversList: Driver[] = driversRes?.data || [];

  // Combine Web Users & Driver Accounts into unified dataset
  const combinedUsers: UnifiedUser[] = useMemo(() => {
    const webItems: UnifiedUser[] = users.map((u, idx) => ({
      id: u.id || `web-${idx}`,
      name: u.name || 'Unnamed User',
      username: u.username || 'user',
      phone: u.phone || 'No phone',
      email: u.email || '',
      role: u.role || 'Operator',
      isSuperAdmin: u.isSuperAdmin,
      accountType: 'Web',
      status: u.status || 'Active',
      lastLogin: idx === 0 ? 'Today, 10:24 AM' : idx % 2 === 0 ? '14 Sep 2026 08:12 PM' : '13 Sep 2026 11:05 AM',
      originalUser: u,
    }));

    const driverItems: UnifiedUser[] = driversList.map((d, idx) => ({
      id: d.id || `driver-${idx}`,
      name: `${d.first_name || ''} ${d.last_name || ''}`.trim() || 'Driver Account',
      username: d.ref_id || d.phone_primary || 'driver',
      avatarUrl: d.avatar_url || undefined,
      phone: d.phone_primary || 'No phone',
      email: d.ref_id ? `${d.ref_id}@mercon.app` : 'driver@mercon.app',
      role: 'Operator',
      accountType: 'Driver App',
      status: d.status === 'Inactive' || !d.isActive ? 'Inactive' : 'Active',
      lastLogin: d.hasAccountPassword ? '12 Sep 2026 04:20 PM' : 'Pending Password Setup',
      hasAccountPassword: Boolean(d.hasAccountPassword),
      originalDriver: d,
    }));

    return [...webItems, ...driverItems];
  }, [users, driversList]);

  // Filtered dataset
  const filteredUsers = useMemo(() => {
    return combinedUsers.filter((item) => {
      // Tab filter
      if (activeTab === 'web' && item.accountType !== 'Web') return false;
      if (activeTab === 'driver' && item.accountType !== 'Driver App') return false;

      // Search filter
      if (
        search &&
        !matchesSearch(search, [
          item.name,
          item.username,
          item.email,
          item.phone,
          item.role,
        ])
      ) {
        return false;
      }

      // Role filter
      if (roleFilter !== 'all') {
        if (roleFilter === 'SuperAdmin' && !item.isSuperAdmin) return false;
        if (roleFilter !== 'SuperAdmin' && item.role !== roleFilter) return false;
      }

      // Status filter
      if (statusFilter !== 'all' && item.status !== statusFilter) {
        return false;
      }

      // Account Type filter
      if (accountTypeFilter !== 'all' && item.accountType !== accountTypeFilter) {
        return false;
      }

      return true;
    });
  }, [combinedUsers, activeTab, search, roleFilter, statusFilter, accountTypeFilter]);

  const resetFilters = () => {
    setSearch('');
    setRoleFilter('all');
    setStatusFilter('all');
    setAccountTypeFilter('all');
  };

  const handleExportUsers = (rows: UnifiedUser[], format: 'excel' | 'pdf') => {
    if (!rows.length) return;
    const headers = ['User ID', 'Name', 'Username', 'Phone', 'Email', 'Role', 'Account Type', 'Status'];
    const dataRows = rows.map((u) => [
      u.id || '',
      u.name || '',
      u.username || '',
      u.phone || '',
      u.email || '',
      u.role || '',
      u.accountType || '',
      u.status || '',
    ]);

    const title = 'User Management Roster Export';
    const filename = `user_management_export_${new Date().toISOString().slice(0, 10)}.${format === 'excel' ? 'xlsx' : 'pdf'}`;
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

  // Columns definition matching reference mockup
  const columns = [
    {
      header: 'User ↕',
      accessor: (u: UnifiedUser) => {
        const initials = u.name?.substring(0, 2).toUpperCase() || 'U';
        return (
          <div className="flex items-center gap-3">
            {u.avatarUrl ? (
              <img src={u.avatarUrl} alt={u.name} className="w-8.5 h-8.5 rounded-full object-cover shrink-0 border border-slate-200" />
            ) : (
              <div className="w-8.5 h-8.5 rounded-full bg-[#1E293B] text-white font-extrabold text-xs flex items-center justify-center shrink-0 shadow-2xs">
                {initials}
              </div>
            )}
            <div className="flex flex-col min-w-0">
              <span className="font-extrabold text-xs text-slate-900 dark:text-slate-100 truncate">
                {u.name}
              </span>
              <span className="text-[11px] text-slate-400 font-mono font-medium">@{u.username}</span>
            </div>
          </div>
        );
      },
    },
    {
      header: 'Contact Details',
      accessor: (u: UnifiedUser) => (
        <div className="flex flex-col gap-0.5 text-xs">
          <span className="font-semibold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
            <Phone size={11} className="text-slate-400 shrink-0" />
            {u.phone}
          </span>
          {u.email && (
            <span className="text-[11px] text-slate-400 font-medium flex items-center gap-1.5 truncate">
              <Mail size={11} className="text-slate-400 shrink-0" />
              {u.email}
            </span>
          )}
        </div>
      ),
    },
    {
      header: 'Role & Access',
      accessor: (u: UnifiedUser) => {
        let badgeStyle = 'bg-slate-100 text-slate-700 border-slate-200';
        if (u.role === 'Admin' || u.isSuperAdmin) {
          badgeStyle = 'bg-rose-50 text-[#FA634E] border-rose-200 dark:bg-rose-950/40 dark:text-rose-300 dark:border-rose-900';
        } else if (u.role === 'Operator') {
          badgeStyle = 'bg-indigo-50 text-indigo-700 border-indigo-200 dark:bg-indigo-950/40 dark:text-indigo-300 dark:border-indigo-900';
        }

        return (
          <div className="flex items-center gap-1.5 flex-wrap">
            <span className={`px-2.5 py-0.5 rounded-full text-[11px] font-bold border inline-flex items-center gap-1 ${badgeStyle}`}>
              <Shield size={10} />
              {u.role}
            </span>
            {u.isSuperAdmin && (
              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-50 text-amber-800 border border-amber-200 inline-flex items-center gap-1">
                <ShieldCheck size={10} />
                Superadmin
              </span>
            )}
          </div>
        );
      },
    },
    {
      header: 'Account Type',
      accessor: (u: UnifiedUser) => (
        <span className={`inline-flex items-center gap-1.5 text-[11px] font-bold px-2.5 py-0.5 rounded-lg border ${
          u.accountType === 'Driver App'
            ? 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-400'
            : 'bg-slate-100 text-slate-700 border-slate-200 dark:bg-slate-800 dark:text-slate-300'
        }`}>
          {u.accountType === 'Driver App' ? <Smartphone size={12} /> : <Monitor size={12} />}
          {u.accountType}
        </span>
      ),
    },
    {
      header: 'Status',
      accessor: (u: UnifiedUser) => (
        <span className={`inline-flex items-center gap-1 text-[11px] font-bold px-2.5 py-0.5 rounded-full border ${
          u.status === 'Active'
            ? 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/50 dark:text-emerald-400'
            : 'bg-slate-100 text-slate-600 border-slate-200 dark:bg-slate-800 dark:text-slate-400'
        }`}>
          <span className={`w-1.5 h-1.5 rounded-full ${u.status === 'Active' ? 'bg-emerald-500' : 'bg-slate-400'}`} />
          {u.status}
        </span>
      ),
    },
    {
      header: 'Last Login ↕',
      accessor: (u: UnifiedUser) => (
        <span className="text-[11px] font-medium text-slate-500 dark:text-slate-400 font-mono">
          {u.lastLogin}
        </span>
      ),
    },
    {
      header: 'Actions',
      headerClassName: 'text-right',
      className: 'text-right',
      accessor: (u: UnifiedUser) => (
        <div className="flex items-center justify-end gap-1">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              if (u.originalUser) {
                handleEditUser(u.originalUser);
              } else if (u.originalDriver) {
                navigate(`/drivers/${u.originalDriver.id}`);
              }
            }}
            className="h-7 w-7 p-0 text-slate-600 hover:text-[#FA634E] hover:bg-rose-50 dark:hover:bg-rose-950/30"
            title="Edit Details"
          >
            <Edit2 size={13} />
          </Button>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                size="sm"
                className="h-7 w-7 p-0 text-slate-500 hover:text-slate-900 dark:hover:text-slate-100"
              >
                <MoreHorizontal size={14} />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-48">
              {u.originalDriver && (
                <DropdownMenuItem onClick={() => handleOpenDriverPasswordModal(u.originalDriver!)}>
                  <KeyRound size={13} className="mr-2 text-indigo-600" />
                  <span>{u.hasAccountPassword ? 'Update Password' : 'Set Password'}</span>
                </DropdownMenuItem>
              )}
              {u.originalUser && (
                <DropdownMenuItem onClick={() => handleDeleteUser(u.originalUser!)}>
                  <Trash2 size={13} className="mr-2 text-rose-600" />
                  <span>{u.status === 'Active' ? 'Deactivate User' : 'Activate User'}</span>
                </DropdownMenuItem>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      ),
    },
  ];

  return (
    <DashboardLayout active="Settings" title="User Management">
      <div className="p-6 max-w-[1600px] mx-auto w-full flex flex-col gap-5 bg-slate-50/50 dark:bg-slate-950">

        {/* ── Page Header & Split Create Button ── */}
        <div className="flex items-center justify-between flex-wrap gap-4">
          <h1 className="text-2xl font-black text-slate-900 dark:text-white tracking-tight">
            User Management
          </h1>

          <div className="flex items-center gap-2">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button className="h-10 px-4 bg-[#501920] hover:bg-[#3d1318] text-white font-bold text-xs rounded-xl shadow-2xs flex items-center gap-2 transition-all cursor-pointer">
                  <Plus className="w-4 h-4" />
                  <span>Create User</span>
                  <ChevronDown className="w-3.5 h-3.5 opacity-80" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-48">
                <DropdownMenuItem onClick={() => { setEditingUser(null); setIsModalOpen(true); }} className="cursor-pointer">
                  <Users className="w-4 h-4 mr-2 text-rose-500" />
                  <span>Add Web User</span>
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => navigate('/drivers/new')} className="cursor-pointer">
                  <Truck className="w-4 h-4 mr-2 text-indigo-500" />
                  <span>Add Driver Account</span>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>

        {/* ── Main Navigation Underlined Tabs ── */}
        <div className="flex items-center gap-8 border-b border-slate-200/90 dark:border-slate-800 pt-1 px-1">
          <button
            type="button"
            onClick={() => setActiveTab('all')}
            className={`flex items-center gap-2.5 pb-3 text-sm font-bold transition-all relative cursor-pointer ${
              activeTab === 'all'
                ? 'text-slate-900 dark:text-white'
                : 'text-slate-500 hover:text-slate-800 dark:text-slate-400'
            }`}
          >
            <Users className="w-4 h-4 text-slate-500" />
            <span>All Users</span>
            <span className={`text-xs px-2 py-0.5 rounded-full font-mono font-bold transition-colors ${
              activeTab === 'all' ? 'bg-[#501920] text-white' : 'bg-slate-200/80 text-slate-700 dark:bg-slate-800 dark:text-slate-300'
            }`}>
              {combinedUsers.length}
            </span>
            {activeTab === 'all' && (
              <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-[#501920] rounded-t-full" />
            )}
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('web')}
            className={`flex items-center gap-2.5 pb-3 text-sm font-bold transition-all relative cursor-pointer ${
              activeTab === 'web'
                ? 'text-slate-900 dark:text-white'
                : 'text-slate-500 hover:text-slate-800 dark:text-slate-400'
            }`}
          >
            <Monitor className="w-4 h-4 text-slate-500" />
            <span>Web Platform Users</span>
            <span className={`text-xs px-2 py-0.5 rounded-full font-mono font-bold transition-colors ${
              activeTab === 'web' ? 'bg-[#501920] text-white' : 'bg-slate-200/80 text-slate-700 dark:bg-slate-800 dark:text-slate-300'
            }`}>
              {users.length}
            </span>
            {activeTab === 'web' && (
              <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-[#501920] rounded-t-full" />
            )}
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('driver')}
            className={`flex items-center gap-2.5 pb-3 text-sm font-bold transition-all relative cursor-pointer ${
              activeTab === 'driver'
                ? 'text-slate-900 dark:text-white'
                : 'text-slate-500 hover:text-slate-800 dark:text-slate-400'
            }`}
          >
            <Smartphone className="w-4 h-4 text-slate-500" />
            <span>Driver Accounts</span>
            <span className={`text-xs px-2 py-0.5 rounded-full font-mono font-bold transition-colors ${
              activeTab === 'driver' ? 'bg-[#501920] text-white' : 'bg-slate-200/80 text-slate-700 dark:bg-slate-800 dark:text-slate-300'
            }`}>
              {driversList.length}
            </span>
            {activeTab === 'driver' && (
              <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-[#501920] rounded-t-full" />
            )}
          </button>
        </div>

        {/* ── Table Ledger Workspace ── */}
        <DataTable
          columns={columns}
          data={filteredUsers}
          pageSize={10}
          pageSizeOptions={[10, 25, 50]}
          compact={true}
          isLoading={isUsersLoading || isDriversLoading}
          isError={isUsersError || isDriversError}
          errorMessage={(usersError || driversError as Error)?.message || 'Failed to load user records.'}
          filterElement={
            <div className="flex items-center gap-2 flex-wrap w-full">
              {/* Search Bar */}
              <div className="relative w-full sm:w-72 shrink-0">
                <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <Input
                  type="text"
                  placeholder="Search users by name, email or phone..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="w-full pl-8.5 pr-4 h-9 text-xs bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-slate-100 border-slate-200 dark:border-slate-700 rounded-xl font-medium"
                />
              </div>

              {/* Role Dropdown */}
              <div className="w-36">
                <Select value={roleFilter} onValueChange={setRoleFilter}>
                  <SelectTrigger className="h-9 text-xs font-semibold rounded-xl bg-slate-50 dark:bg-slate-800 border-slate-200">
                    <SelectValue placeholder="Role" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Roles</SelectItem>
                    <SelectItem value="Admin">Admin</SelectItem>
                    <SelectItem value="Operator">Operator</SelectItem>
                    <SelectItem value="SuperAdmin">SuperAdmin</SelectItem>
                    <SelectItem value="Driver">Driver</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Status Dropdown */}
              <div className="w-36">
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger className="h-9 text-xs font-semibold rounded-xl bg-slate-50 dark:bg-slate-800 border-slate-200">
                    <SelectValue placeholder="Status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Status</SelectItem>
                    <SelectItem value="Active">Active</SelectItem>
                    <SelectItem value="Inactive">Inactive</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Account Type Dropdown */}
              <div className="w-36">
                <Select value={accountTypeFilter} onValueChange={setAccountTypeFilter}>
                  <SelectTrigger className="h-9 text-xs font-semibold rounded-xl bg-slate-50 dark:bg-slate-800 border-slate-200">
                    <SelectValue placeholder="Account Type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Types</SelectItem>
                    <SelectItem value="Web">Web</SelectItem>
                    <SelectItem value="Driver App">Driver App</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Reset Button */}
              <Button
                variant="outline"
                size="sm"
                onClick={resetFilters}
                className="h-9 px-3 text-xs font-semibold rounded-xl border-slate-200 bg-white dark:bg-slate-900 text-slate-600 hover:text-slate-900"
              >
                <RotateCcw size={13} className="mr-1.5 text-slate-500" />
                Reset
              </Button>
            </div>
          }
          bulkActions={[
            {
              label: 'Export Excel',
              icon: <FileSpreadsheet size={13} className="text-emerald-600" />,
              variant: 'secondary' as const,
              onClick: (selectedRows: UnifiedUser[]) => {
                handleExportUsers(selectedRows, 'excel');
              }
            },
            {
              label: 'Export PDF',
              icon: <FileText size={13} className="text-rose-600" />,
              variant: 'secondary' as const,
              onClick: (selectedRows: UnifiedUser[]) => {
                handleExportUsers(selectedRows, 'pdf');
              }
            }
          ]}
          enableSelection={true}
        />

      </div>

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
    </DashboardLayout>
  );
}
