import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus, Edit2, Trash2, Shield, Search } from 'lucide-react';
import { toast } from 'sonner';

import DashboardLayout from '@/components/layout/DashboardLayout';
import DataTable from '@/components/ui/DataTable';
import Btn from '@/components/ui/Btn';
import { userService, UserDTO } from '@/services/userService';
import UserModal from './components/UserModal';

export default function UserManagementPage() {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState('');
  
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<UserDTO | null>(null);

  const { data: users = [], isLoading } = useQuery({
    queryKey: ['users'],
    queryFn: userService.getUsers,
  });

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

  const handleSaveUser = (data: any) => {
    if (editingUser) {
      updateMutation.mutate({ id: editingUser.id, data });
    } else {
      createMutation.mutate(data);
    }
  };

  const handleEdit = (user: UserDTO) => {
    setEditingUser(user);
    setIsModalOpen(true);
  };

  const handleDelete = (user: UserDTO) => {
    if (confirm(`Are you sure you want to deactivate ${user.name}?`)) {
      deleteMutation.mutate(user.id);
    }
  };

  const filteredUsers = users.filter(u => 
    u.name?.toLowerCase().includes(search.toLowerCase()) || 
    u.email?.toLowerCase().includes(search.toLowerCase())
  );

  const columns = [
    {
      header: 'Name',
      accessor: (row: UserDTO) => (
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-full bg-[#F5F5F7] flex items-center justify-center text-[#E8450F] font-bold text-xs border border-black/[0.05]">
            {row.name?.substring(0, 2).toUpperCase() || 'U'}
          </div>
          <span className="font-semibold text-[#111]">{row.name}</span>
        </div>
      ),
    },
    {
      header: 'Email Address',
      accessor: (row: UserDTO) => (
        <span className="text-sm text-[#6E6E80]">{row.email}</span>
      ),
    },
    {
      header: 'Role',
      accessor: (row: UserDTO) => {
        let bg = 'bg-[#F5F5F7]', text = 'text-[#444]';
        if (row.role === 'Admin') { bg = 'bg-[#FEF2F2]'; text = 'text-[#DC2626]'; }
        else if (row.role === 'Operator') { bg = 'bg-[#EFF6FF]'; text = 'text-[#2563EB]'; }

        return (
          <span className={`px-2 py-0.5 rounded text-xs font-bold ${bg} ${text} inline-flex items-center gap-1`}>
            {row.role === 'Admin' && <Shield size={10} />}
            {row.role}
          </span>
        );
      },
    },
    {
      header: 'Status',
      accessor: (row: UserDTO) => (
        <span className={`text-xs font-bold px-2 py-0.5 rounded ${
          row.status === 'Active' ? 'bg-[#F0FDF4] text-[#16A34A]' : 'bg-[#F5F5F7] text-[#6E6E80]'
        }`}>
          {row.status}
        </span>
      ),
    },
    {
      header: 'Actions',
      accessor: (row: UserDTO) => (
        <div className="flex gap-1">
          <button 
            onClick={() => handleEdit(row)}
            className="w-7 h-7 rounded-none bg-[#F5F5F7] hover:bg-[#EBEBEF] flex items-center justify-center transition-colors"
          >
            <Edit2 size={13} className="text-[#6E6E80]" />
          </button>
          <button 
            onClick={() => handleDelete(row)}
            className="w-7 h-7 rounded-none bg-[#FEF2F2] hover:bg-[#FEE2E2] flex items-center justify-center transition-colors"
          >
            <Trash2 size={13} className="text-[#DC2626]" />
          </button>
        </div>
      ),
    },
  ];

  return (
    <DashboardLayout 
      active="Settings" 
      breadcrumb="Settings"
      title="User Management" 
      pageTitle="Platform Users" 
      pageSub="Manage operator access, roles, and permissions."
      actions={
        <Btn 
          label="Invite User" 
          icon={<Plus size={14} />} 
          onClick={() => { setEditingUser(null); setIsModalOpen(true); }}
        />
      }
    >
      <div className="px-6 pb-6">
        <div className="bg-white rounded-none border border-black/[0.06] shadow-sm overflow-hidden mb-6">
          <div className="p-5 border-b border-black/[0.04] flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <h3 className="text-sm font-bold text-[#111]">Active Users</h3>
            
            <div className="relative max-w-xs w-full">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#9898A4]" />
              <input 
                type="text" 
                placeholder="Search by name or email..." 
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full bg-[#F9F9FB] border border-black/[0.05] rounded-none pl-9 pr-4 py-2 text-xs outline-none focus:bg-white focus:border-[#E8450F] transition-all"
              />
            </div>
          </div>
          
          <DataTable
            columns={columns}
            data={filteredUsers}
            isLoading={isLoading}
          />
        </div>
      </div>

      <UserModal 
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSave={handleSaveUser}
        initialData={editingUser}
        isLoading={createMutation.isPending || updateMutation.isPending}
      />
    </DashboardLayout>
  );
}
