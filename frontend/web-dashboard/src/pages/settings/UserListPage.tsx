import { useState } from 'react';
import { Plus, Users, Edit2, Trash2, UserCheck, UserX, MessageSquare, Building2, ExternalLink } from 'lucide-react';

import DashboardLayout from '@/components/layout/DashboardLayout';
import DataTable from '@/components/ui/DataTable';
import Btn from '@/components/ui/Btn';
import BulkActionBar from '@/components/ui/BulkActionBar';

const MOCK_USERS = [
  { id: 'usr_1', name: 'Admin User', email: 'admin@mercon.sa', role: 'Admin', status: 'Active', created_at: '2023-01-15', whatsapp: '+966500000001', projects: 'All Projects' },
  { id: 'usr_2', name: 'John Operator', email: 'john@mercon.sa', role: 'Operator', status: 'Active', created_at: '2023-05-20', whatsapp: '+966500000002', projects: '2 Assigned' },
  { id: 'usr_3', name: 'Sarah Logistics', email: 'sarah@mercon.sa', role: 'Operator', status: 'Inactive', created_at: '2023-08-10', whatsapp: null, projects: 'No access' },
  { id: 'usr_4', name: 'Ahmed Engineer', email: 'ahmed@mercon.sa', role: 'Site Engineer', status: 'Suspended', created_at: '2023-10-05', whatsapp: '+966500000003', projects: '1 Assigned' },
  { id: 'usr_5', name: 'Fatima Finance', email: 'fatima@mercon.sa', role: 'Finance', status: 'Invited', created_at: '2023-11-12', whatsapp: null, projects: 'No access' },
];

export default function UserListPage() {
  const [currentPage, setCurrentPage] = useState(1);
  const [search, setSearch] = useState('');
  const [selectedIndices, setSelectedIndices] = useState<number[]>([]);

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
      header: 'Project Scope',
      accessor: (row: any) => (
        <span className="text-xs text-[#6E6E80] font-medium">
          {row.projects === 'All Projects' ? (
            <span className="font-semibold text-blue-600">All Projects</span>
          ) : row.projects === 'No access' ? (
            <span className="italic">No access</span>
          ) : (
            <span>{row.projects}</span>
          )}
        </span>
      ),
    },
    {
      header: 'WhatsApp',
      accessor: (row: any) => (
        <span className="font-mono text-xs">
          {row.whatsapp ? (
            <div className="flex items-center gap-1.5 text-[#111]">
              <MessageSquare size={13} className="text-green-500" />
              {row.whatsapp}
            </div>
          ) : (
            <span className="text-[#9898A4] italic">Not Added</span>
          )}
        </span>
      ),
    },
    {
      header: 'Status',
      accessor: (row: any) => {
        const isActive = row.status === 'Active';
        return (
          <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider ${
            isActive ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
          }`}>
            {row.status}
          </span>
        );
      },
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
            className="w-7 h-7 rounded-none bg-[#F5F5F7] hover:bg-[#EBEBEF] flex items-center justify-center transition-colors"
            title="Edit User"
          >
            <Edit2 size={13} className="text-[#6E6E80]" />
          </button>
          <button 
            className="w-7 h-7 rounded-none bg-[#FEF2F2] hover:bg-[#FEE2E2] flex items-center justify-center transition-colors"
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
      <div className="px-6 pb-6 h-full flex flex-col animate-fade-in">
        {/* User Summary Widget */}
        <div className="mb-4 grid grid-cols-2 gap-3 md:grid-cols-5 shrink-0">
          <div className="bg-white border border-black/[0.06] shadow-sm p-3 rounded-none">
            <span className="block text-[10px] font-bold uppercase tracking-wider text-[#9898A4]">Total Users</span>
            <span className="text-lg font-bold font-mono text-[#111]">{MOCK_USERS.length}</span>
          </div>
          <div className="bg-white border border-black/[0.06] shadow-sm p-3 rounded-none">
            <span className="block text-[10px] font-bold uppercase tracking-wider text-[#9898A4]">Active Users</span>
            <span className="text-lg font-bold font-mono text-green-600">{MOCK_USERS.filter(u => u.status === 'Active').length}</span>
          </div>
          <div className="bg-white border border-black/[0.06] shadow-sm p-3 rounded-none">
            <span className="block text-[10px] font-bold uppercase tracking-wider text-[#9898A4]">Inactive / Suspended</span>
            <span className="text-lg font-bold font-mono text-red-600">{MOCK_USERS.filter(u => u.status !== 'Active').length}</span>
          </div>
          <div className="bg-white border border-black/[0.06] shadow-sm p-3 rounded-none">
            <span className="block text-[10px] font-bold uppercase tracking-wider text-[#9898A4]">Mapped WhatsApp</span>
            <span className="text-lg font-bold font-mono text-blue-600">{MOCK_USERS.filter(u => u.whatsapp).length}</span>
          </div>
          <div className="bg-white border border-black/[0.06] shadow-sm p-3 rounded-none">
            <span className="block text-[10px] font-bold uppercase tracking-wider text-[#9898A4]">Unmapped WhatsApp</span>
            <span className="text-lg font-bold font-mono text-[#444]">{MOCK_USERS.filter(u => !u.whatsapp).length}</span>
          </div>
        </div>

        <div className="mb-4 shrink-0">
          <div className="bg-blue-50 border border-blue-100 p-4 rounded-none flex gap-3 text-blue-800 text-sm font-medium">
            <Users size={20} className="shrink-0" />
            <p>
              The User Management API endpoints are not yet fully implemented in the backend. Showing mock data.
            </p>
          </div>
        </div>

        <div className="flex-1 min-h-0 flex flex-col relative">
          <DataTable
            columns={columns}
            data={filteredUsers}
            isLoading={false}
            searchPlaceholder="Search by name or email..."
            onSearchChange={setSearch}
            currentPage={currentPage}
            totalPages={1}
            onPageChange={setCurrentPage}
            enableSelection={true}
            onSelectionChange={setSelectedIndices}
          />
          
          <BulkActionBar 
            selectedCount={selectedIndices.length} 
            onClear={() => setSelectedIndices([])}
            className="absolute bottom-6 left-1/2 -translate-x-1/2"
          >
            <Btn
              label="Activate"
              variant="outline"
              size="sm"
              icon={<UserCheck size={14} />}
              className="text-green-600 border-green-200 hover:bg-green-50 hover:text-green-700"
              onClick={() => alert(`Activate ${selectedIndices.length} users`)}
            />
            <Btn
              label="Deactivate"
              variant="outline"
              size="sm"
              icon={<UserX size={14} />}
              className="text-orange-600 border-orange-200 hover:bg-orange-50 hover:text-orange-700"
              onClick={() => alert(`Deactivate ${selectedIndices.length} users`)}
            />
            <Btn
              label="Delete"
              variant="danger"
              size="sm"
              icon={<Trash2 size={14} />}
              onClick={() => alert(`Delete ${selectedIndices.length} users`)}
            />
          </BulkActionBar>
        </div>
      </div>
    </DashboardLayout>
  );
}
