import { useState } from 'react';
import { UploadCloud, FileText, Search, Folder, Shield, Car, User as UserIcon, Eye, Download, MoreVertical } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

import DashboardLayout from '@/components/layout/DashboardLayout';
import Btn from '@/components/ui/Btn';

type DocCategory = 'All' | 'Drivers' | 'Vehicles' | 'Company';

export default function DocumentsCenterPage() {
  const navigate = useNavigate();
  const [activeCategory, setActiveCategory] = useState<DocCategory>('All');
  const [search, setSearch] = useState('');

  const folders = [
    { name: 'Driver Licenses', count: 145, icon: <UserIcon size={18} className="text-[#E8450F]" />, bg: 'bg-[#FFF0EB]', category: 'Drivers' },
    { name: 'Vehicle Registrations', count: 89, icon: <Car size={18} className="text-[#2563EB]" />, bg: 'bg-[#EFF6FF]', category: 'Vehicles' },
    { name: 'Company Trade Licenses', count: 3, icon: <Shield size={18} className="text-[#16A34A]" />, bg: 'bg-[#F0FDF4]', category: 'Company' },
    { name: 'Insurance Policies', count: 42, icon: <FileText size={18} className="text-[#D97706]" />, bg: 'bg-[#FFFBEB]', category: 'Vehicles' },
    { name: 'Medical Certificates', count: 138, icon: <Folder size={18} className="text-[#8B5CF6]" />, bg: 'bg-[#F5F3FF]', category: 'Drivers' },
    { name: 'Tax Certificates', count: 4, icon: <Folder size={18} className="text-[#475569]" />, bg: 'bg-[#F1F5F9]', category: 'Company' },
  ];

  const recentDocs = [
    { id: 1, name: 'CR_Renewal_2026.pdf', type: 'PDF', size: '2.4 MB', date: 'Today, 09:30 AM', category: 'Company' },
    { id: 2, name: 'Insurance_Policy_Fleet.pdf', type: 'PDF', size: '5.1 MB', date: 'Yesterday', category: 'Vehicles' },
    { id: 3, name: 'Ali_Khan_License.jpg', type: 'Image', size: '1.2 MB', date: 'Oct 14, 2025', category: 'Drivers' },
    { id: 4, name: 'Vehicle_Inspection_ABC123.pdf', type: 'PDF', size: '0.8 MB', date: 'Oct 12, 2025', category: 'Vehicles' },
  ];

  const filteredFolders = activeCategory === 'All' ? folders : folders.filter(f => f.category === activeCategory);

  return (
    <DashboardLayout 
      active="Documents" 
      title="Documents Center" 
      pageTitle="Document Repository" 
      pageSub="Securely manage and organize all company, driver, and vehicle documents."
      actions={
        <div className="flex gap-2">
          <Btn 
            label="Upload Document" 
            icon={<UploadCloud size={14} />} 
          />
        </div>
      }
    >
      <div className="px-6 pb-6">
        
        {/* Search & Filter Bar */}
        <div className="flex flex-col sm:flex-row justify-between items-center gap-4 mb-6">
          <div className="flex items-center gap-2 p-1 bg-[#F5F5F7] rounded-xl w-full sm:w-auto overflow-x-auto">
            {['All', 'Drivers', 'Vehicles', 'Company'].map((cat) => (
              <button
                key={cat}
                onClick={() => setActiveCategory(cat as DocCategory)}
                className={`px-4 py-1.5 text-xs font-bold rounded-lg transition-all ${
                  activeCategory === cat 
                    ? 'bg-white text-[#111] shadow-sm' 
                    : 'text-[#6E6E80] hover:text-[#111]'
                }`}
              >
                {cat}
              </button>
            ))}
          </div>

          <div className="relative w-full sm:max-w-xs">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#9898A4]" />
            <input 
              type="text" 
              placeholder="Search documents by name or ID..." 
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full bg-white border border-black/[0.08] rounded-xl pl-9 pr-4 py-2 text-xs outline-none focus:border-[#E8450F] shadow-sm transition-all"
            />
          </div>
        </div>

        {/* Folders Grid */}
        <h3 className="text-sm font-bold text-[#111] mb-4">Categories</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 mb-8">
          {filteredFolders.map((folder, idx) => (
            <div 
              key={idx} 
              className="bg-white border border-black/[0.06] rounded-2xl p-5 shadow-sm hover:shadow-md hover:-translate-y-0.5 transition-all cursor-pointer group"
              onClick={() => navigate('/documents/list')}
            >
              <div className="flex items-center justify-between mb-4">
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${folder.bg}`}>
                  {folder.icon}
                </div>
                <span className="text-[10px] font-bold text-[#6E6E80] bg-[#F5F5F7] px-2 py-0.5 rounded-full group-hover:bg-[#111] group-hover:text-white transition-colors">
                  {folder.count} files
                </span>
              </div>
              <h4 className="font-bold text-[#111] text-sm mb-1">{folder.name}</h4>
              <p className="text-xs text-[#9898A4]">{folder.category} Category</p>
            </div>
          ))}
        </div>

        {/* Recent Files Table */}
        <div className="bg-white border border-black/[0.06] rounded-2xl shadow-sm overflow-hidden">
          <div className="px-5 py-4 border-b border-black/[0.04] flex justify-between items-center bg-[#FAFAFA]">
            <h3 className="text-sm font-bold text-[#111]">Recently Added Documents</h3>
            <button 
              onClick={() => navigate('/documents/list')}
              className="text-xs font-bold text-[#E8450F] hover:underline"
            >
              View All
            </button>
          </div>
          
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-black/[0.04]">
                <th className="px-5 py-3 font-semibold text-[10px] uppercase text-[#9898A4] tracking-wider">File Name</th>
                <th className="px-5 py-3 font-semibold text-[10px] uppercase text-[#9898A4] tracking-wider">Category</th>
                <th className="px-5 py-3 font-semibold text-[10px] uppercase text-[#9898A4] tracking-wider">Size</th>
                <th className="px-5 py-3 font-semibold text-[10px] uppercase text-[#9898A4] tracking-wider">Uploaded Date</th>
                <th className="px-5 py-3 font-semibold text-[10px] uppercase text-[#9898A4] tracking-wider text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {recentDocs.map((doc) => (
                <tr key={doc.id} className="border-b border-black/[0.04] hover:bg-[#FAFAFA] transition-colors last:border-0">
                  <td className="px-5 py-3.5">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-lg bg-[#FEE2E2] text-[#DC2626] flex items-center justify-center shrink-0">
                        <FileText size={14} />
                      </div>
                      <span className="font-semibold text-[#111] truncate max-w-[200px]">{doc.name}</span>
                    </div>
                  </td>
                  <td className="px-5 py-3.5">
                    <span className="text-xs font-medium text-[#6E6E80] bg-[#F5F5F7] px-2 py-0.5 rounded-md">
                      {doc.category}
                    </span>
                  </td>
                  <td className="px-5 py-3.5 text-xs text-[#6E6E80] font-medium">{doc.size}</td>
                  <td className="px-5 py-3.5 text-xs text-[#6E6E80] font-medium">{doc.date}</td>
                  <td className="px-5 py-3.5 text-right">
                    <div className="flex items-center justify-end gap-1">
                      <button className="w-8 h-8 rounded-lg hover:bg-[#F5F5F7] flex items-center justify-center text-[#6E6E80] transition-colors" title="View">
                        <Eye size={14} />
                      </button>
                      <button className="w-8 h-8 rounded-lg hover:bg-[#F5F5F7] flex items-center justify-center text-[#6E6E80] transition-colors" title="Download">
                        <Download size={14} />
                      </button>
                      <button className="w-8 h-8 rounded-lg hover:bg-[#F5F5F7] flex items-center justify-center text-[#6E6E80] transition-colors">
                        <MoreVertical size={14} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

      </div>
    </DashboardLayout>
  );
}
