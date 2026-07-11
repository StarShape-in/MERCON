import { useState } from 'react';
import { Plus, Edit2, Trash2, Shield, Search } from 'lucide-react';

import DashboardLayout from '@/components/layout/DashboardLayout';
import DataTable from '@/components/ui/DataTable';
import Btn from '@/components/ui/Btn';
import StatusBadge from '@/components/ui/StatusBadge';

interface User {
  id: string;
  name: string;
  email: string;
  role: 'Admin' | 'Dispatcher' | 'Accountant' | 'Viewer';
  status: 'Active' | 'Inactive';
  lastLogin: string;
}

const mockUsers: User[] = [
  { id: '1', name: 'Mohammed Al-Fayed', email: 'admin@mercon.sa', role: 'Admin', status: 'Active', lastLogin: 'Today, 08:45 AM' },
  { id: '2', name: 'Sarah Ahmed', email: 'sarah.dispatch@mercon.sa', role: 'Dispatcher', status: 'Active', lastLogin: 'Today, 09:12 AM' },
  { id: '3', name: 'Khalid Rahman', email: 'khalid.acc@mercon.sa', role: 'Accountant', status: 'Active', lastLogin: 'Yesterday, 14:30 PM' },
  { id: '4', name: 'Faisal Operations', email: 'faisal.ops@mercon.sa', role: 'Dispatcher', status: 'Inactive', lastLogin: '10 days ago' },
  { id: '5', name: 'Management Viewer', email: 'management@mercon.sa', role: 'Viewer', status: 'Active', lastLogin: 'Today, 10:00 AM' },
];

export default function UserManagementPage() {
  const [users] = useState<User[]>(mockUsers);
  const [search, setSearch] = useState('');

  const filteredUsers = users.filter(u => 
    u.name.toLowerCase().includes(search.toLowerCase()) || 
    u.email.toLowerCase().includes(search.toLowerCase())
  );

  const columns = [
    {
      header: 'Name',
      accessor: (row: User) => (
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-full bg-[#F5F5F7] flex items-center justify-center text-[#E8450F] font-bold text-xs border border-black/[0.05]">
            {row.name.substring(0, 2).toUpperCase()}
          </div>
          <span className="font-semibold text-[#111]">{row.name}</span>
        </div>
      ),
    },
    {
      header: 'Email Address',
      accessor: (row: User) => (
        <span className="text-sm text-[#6E6E80]">{row.email}</span>
      ),
    },
    {
      header: 'Role',
      accessor: (row: User) => {
        let bg = 'bg-[#F5F5F7]', text = 'text-[#444]';
        if (row.role === 'Admin') { bg = 'bg-[#FEF2F2]'; text = 'text-[#DC2626]'; }
        else if (row.role === 'Dispatcher') { bg = 'bg-[#EFF6FF]'; text = 'text-[#2563EB]'; }
        else if (row.role === 'Accountant') { bg = 'bg-[#F0FDF4]'; text = 'text-[#16A34A]'; }

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
      accessor: (row: User) => (
        <span className={`text-xs font-bold px-2 py-0.5 rounded ${
          row.status === 'Active' ? 'bg-[#F0FDF4] text-[#16A34A]' : 'bg-[#F5F5F7] text-[#6E6E80]'
        }`}>
          {row.status}
        </span>
      ),
    },
    {
      header: 'Last Login',
      accessor: (row: User) => (
        <span className="text-xs text-[#9898A4] font-medium">{row.lastLogin}</span>
      ),
    },
    {
      header: 'Actions',
      accessor: () => (
        <div className="flex gap-1">
          <button className="w-7 h-7 rounded-none bg-[#F5F5F7] hover:bg-[#EBEBEF] flex items-center justify-center transition-colors">
            <Edit2 size={13} className="text-[#6E6E80]" />
          </button>
          <button className="w-7 h-7 rounded-none bg-[#FEF2F2] hover:bg-[#FEE2E2] flex items-center justify-center transition-colors">
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
            isLoading={false}
          />
        </div>
      </div>
    </DashboardLayout>
  );
}
