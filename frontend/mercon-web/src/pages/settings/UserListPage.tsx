import { useState } from 'react';
import { Plus, Users, Edit2, Trash2 } from 'lucide-react';

import DashboardLayout from '@/components/layout/DashboardLayout';
import DataTable from '@/components/ui/DataTable';
import Btn from '@/components/ui/Btn';

const MOCK_USERS = [
  { id: 'usr_1', name: 'Admin User', email: 'admin@mercon.sa', role: 'Admin', status: 'Active', created_at: '2023-01-15' },
  { id: 'usr_2', name: 'John Operator', email: 'john@mercon.sa', role: 'Operator', status: 'Active', created_at: '2023-05-20' },
  { id: 'usr_3', name: 'Sarah Logistics', email: 'sarah@mercon.sa', role: 'Operator', status: 'Inactive', created_at: '2023-08-10' },
];

export default function UserListPage() {
  const [currentPage, setCurrentPage] = useState(1);
  const [search, setSearch] = useState('');

  const filteredUsers = MOCK_USERS.filter(u => 
    u.name.toLowerCase().includes(search.toLowerCase()) || 
    u.email.toLowerCase().includes(search.toLowerCase())
  );

  const columns = [
    {
      header: 'Name',
      accessor: (row: any) => (
        <div className="font-semibold text-[#111]">{row.name}</div>
      ),
    },
    {
      header: 'Email Address',
      accessor: (row: any) => (
        <span className="text-xs text-[#444] font-medium">{row.email}</span>
      ),
    },
    {
      header: 'Role',
      accessor: (row: any) => (
        <span className="text-xs font-mono font-bold text-[#6E6E80] bg-[#F5F5F7] px-2 py-0.5 rounded-md">
          {row.role}
        </span>
      ),
    },
    {
      header: 'Status',
      accessor: (row: any) => (
        row.status === 'Active' 
          ? <span className="bg-green-100 text-green-700 px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider">Active</span>
          : <span className="bg-red-100 text-red-700 px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider">Inactive</span>
      ),
    },
    {
      header: 'Joined Date',
      accessor: (row: any) => (
        <span className="text-xs text-[#6E6E80] font-medium">
          {new Date(row.created_at).toLocaleDateString()}
        </span>
      ),
    },
    {
      header: 'Actions',
      accessor: (row: any) => (
        <div className="flex gap-1">
          <button 
            className="w-7 h-7 rounded-lg bg-[#F5F5F7] hover:bg-[#EBEBEF] flex items-center justify-center transition-colors"
            title="Edit User"
          >
            <Edit2 size={13} className="text-[#6E6E80]" />
          </button>
          <button 
            className="w-7 h-7 rounded-lg bg-[#FEF2F2] hover:bg-[#FEE2E2] flex items-center justify-center transition-colors"
            title="Disable User"
          >
            <Trash2 size={13} className="text-red-500" />
          </button>
        </div>
      ),
    },
  ];

  return (
    <DashboardLayout 
      active="Account" 
      title="User Management" 
      pageTitle="System Users" 
      pageSub="Manage operator access and permissions"
      actions={
        <Btn label="Invite User" icon={<Plus size={14} />} />
      }
    >
      <div className="px-6 mb-6">
        <div className="bg-blue-50 border border-blue-100 p-4 rounded-xl flex gap-3 text-blue-800 text-sm font-medium">
          <Users size={20} className="shrink-0" />
          <p>
            The User Management API endpoints are not yet fully implemented in the backend. Showing mock data.
          </p>
        </div>
      </div>

      <div className="px-6 pb-6">
        <DataTable
          columns={columns}
          data={filteredUsers}
          isLoading={false}
          searchPlaceholder="Search by name or email..."
          onSearchChange={setSearch}
          currentPage={currentPage}
          totalPages={1}
          onPageChange={setCurrentPage}
        />
      </div>
    </DashboardLayout>
  );
}
