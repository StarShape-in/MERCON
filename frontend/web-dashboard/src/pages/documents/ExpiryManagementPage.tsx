import { useState } from 'react';
import { AlertTriangle, Clock, Search, Filter, Mail, ShieldAlert } from 'lucide-react';

import DashboardLayout from '@/components/layout/DashboardLayout';
import DataTable from '@/components/ui/DataTable';
import Btn from '@/components/ui/Btn';

interface ExpiryItem {
  id: string;
  documentName: string;
  entityName: string;
  entityType: 'Driver' | 'Vehicle' | 'Company';
  expiryDate: string;
  daysRemaining: number;
}

const mockExpiries: ExpiryItem[] = [
  { id: '1', documentName: 'Driver License', entityName: 'Ahmed Abdullah', entityType: 'Driver', expiryDate: '2026-07-08', daysRemaining: -1 },
  { id: '2', documentName: 'Medical Certificate', entityName: 'Khalid Rahman', entityType: 'Driver', expiryDate: '2026-07-12', daysRemaining: 3 },
  { id: '3', documentName: 'Vehicle Registration', entityName: 'TRK-0921', entityType: 'Vehicle', expiryDate: '2026-07-16', daysRemaining: 7 },
  { id: '4', documentName: 'Commercial Register', entityName: 'MERCON Logistics', entityType: 'Company', expiryDate: '2026-07-24', daysRemaining: 15 },
  { id: '5', documentName: 'Insurance Policy', entityName: 'TRK-1140', entityType: 'Vehicle', expiryDate: '2026-08-05', daysRemaining: 27 },
];

export default function ExpiryManagementPage() {
  const [items] = useState<ExpiryItem[]>(mockExpiries);
  const [search, setSearch] = useState('');

  const expiredCount = items.filter(i => i.daysRemaining <= 0).length;
  const criticalCount = items.filter(i => i.daysRemaining > 0 && i.daysRemaining <= 7).length;

  const filteredItems = items.filter(i => 
    i.entityName.toLowerCase().includes(search.toLowerCase()) || 
    i.documentName.toLowerCase().includes(search.toLowerCase())
  );

  const columns = [
    {
      header: 'Document Type',
      accessor: (row: ExpiryItem) => (
        <span className="font-bold text-[#111]">{row.documentName}</span>
      ),
    },
    {
      header: 'Entity / Owner',
      accessor: (row: ExpiryItem) => (
        <div>
          <span className="font-semibold text-[#444]">{row.entityName}</span>
          <span className="ml-2 text-[10px] font-bold bg-[#F5F5F7] text-[#6E6E80] px-1.5 py-0.5 rounded">
            {row.entityType}
          </span>
        </div>
      ),
    },
    {
      header: 'Expiry Date',
      accessor: (row: ExpiryItem) => (
        <span className="font-mono text-xs font-semibold text-[#444]">
          {new Date(row.expiryDate).toLocaleDateString()}
        </span>
      ),
    },
    {
      header: 'Status',
      accessor: (row: ExpiryItem) => {
        if (row.daysRemaining <= 0) {
          return (
            <span className="inline-flex items-center gap-1 bg-[#FEF2F2] text-[#DC2626] px-2 py-1 rounded-md text-[10px] font-bold uppercase tracking-wider">
              <ShieldAlert size={12} /> Expired
            </span>
          );
        } else if (row.daysRemaining <= 7) {
          return (
            <span className="inline-flex items-center gap-1 bg-[#FFFBEB] text-[#D97706] px-2 py-1 rounded-md text-[10px] font-bold uppercase tracking-wider">
              <AlertTriangle size={12} /> Critical ({row.daysRemaining}d)
            </span>
          );
        } else {
          return (
            <span className="inline-flex items-center gap-1 bg-[#F5F5F7] text-[#6E6E80] px-2 py-1 rounded-md text-[10px] font-bold uppercase tracking-wider">
              <Clock size={12} /> {row.daysRemaining} days left
            </span>
          );
        }
      },
    },
    {
      header: 'Actions',
      accessor: () => (
        <div className="flex gap-2">
          <button className="text-xs font-bold text-[#2563EB] bg-[#EFF6FF] px-3 py-1.5 rounded-lg hover:bg-[#DBEAFE] transition-colors">
            Update Doc
          </button>
          <button className="text-xs font-bold text-[#6E6E80] bg-[#F5F5F7] px-3 py-1.5 rounded-lg hover:bg-[#EBEBEF] transition-colors flex items-center gap-1">
            <Mail size={12} /> Remind
          </button>
        </div>
      ),
    },
  ];

  return (
    <DashboardLayout 
      active="Documents" 
      breadcrumb="Documents"
      title="Expiry Management" 
      pageTitle="Expiry Management" 
      pageSub="Monitor documents approaching expiration and send automated reminders."
      actions={
        <Btn 
          label="Export Report" 
          variant="secondary"
        />
      }
    >
      <div className="px-6 pb-6">
        
        {/* KPI Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          <div className="bg-[#FEF2F2] border border-[#DC2626]/20 rounded-2xl p-5 shadow-sm">
            <div className="flex items-center gap-3 mb-2">
              <div className="w-8 h-8 rounded-full bg-[#DC2626]/10 flex items-center justify-center text-[#DC2626]">
                <ShieldAlert size={16} />
              </div>
              <h3 className="text-sm font-bold text-[#DC2626]">Already Expired</h3>
            </div>
            <p className="text-3xl font-bold text-[#DC2626] ml-11">{expiredCount}</p>
          </div>
          
          <div className="bg-[#FFFBEB] border border-[#D97706]/20 rounded-2xl p-5 shadow-sm">
            <div className="flex items-center gap-3 mb-2">
              <div className="w-8 h-8 rounded-full bg-[#D97706]/10 flex items-center justify-center text-[#D97706]">
                <AlertTriangle size={16} />
              </div>
              <h3 className="text-sm font-bold text-[#D97706]">Critical (≤ 7 Days)</h3>
            </div>
            <p className="text-3xl font-bold text-[#D97706] ml-11">{criticalCount}</p>
          </div>

          <div className="bg-[#F5F5F7] border border-black/[0.05] rounded-2xl p-5 shadow-sm">
            <div className="flex items-center gap-3 mb-2">
              <div className="w-8 h-8 rounded-full bg-black/[0.05] flex items-center justify-center text-[#6E6E80]">
                <Clock size={16} />
              </div>
              <h3 className="text-sm font-bold text-[#6E6E80]">Upcoming (30 Days)</h3>
            </div>
            <p className="text-3xl font-bold text-[#111] ml-11">{items.length}</p>
          </div>
        </div>

        {/* Data Table */}
        <div className="bg-white rounded-2xl border border-black/[0.06] shadow-sm overflow-hidden">
          <div className="p-5 border-b border-black/[0.04] flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-[#FAFAFA]">
            <h3 className="text-sm font-bold text-[#111]">Action Required</h3>
            
            <div className="flex items-center gap-2">
              <button className="bg-white border border-black/[0.08] text-[#444] px-3 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-sm hover:bg-[#F5F5F7] transition-colors">
                <Filter size={14} /> Filter
              </button>
              <div className="relative max-w-xs w-full">
                <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#9898A4]" />
                <input 
                  type="text" 
                  placeholder="Search entity..." 
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="w-full bg-white border border-black/[0.08] rounded-xl pl-9 pr-4 py-2 text-xs outline-none focus:border-[#E8450F] shadow-sm transition-all"
                />
              </div>
            </div>
          </div>
          
          <DataTable
            columns={columns}
            data={filteredItems}
            isLoading={false}
          />
        </div>
        
      </div>
    </DashboardLayout>
  );
}
