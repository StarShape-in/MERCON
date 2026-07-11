import { useState } from 'react';
import { Download, Filter, TrendingUp, DollarSign, Activity, FileText } from 'lucide-react';
import { 
  ResponsiveContainer, BarChart, Bar, XAxis, YAxis, 
  CartesianGrid, Tooltip, Legend, AreaChart, Area
} from 'recharts';

import DashboardLayout from '@/components/layout/DashboardLayout';
import KpiCard from '@/components/ui/KpiCard';
import Btn from '@/components/ui/Btn';

const mockRevenueData = [
  { month: 'Jan', revenue: 45000, cost: 32000, profit: 13000 },
  { month: 'Feb', revenue: 52000, cost: 35000, profit: 17000 },
  { month: 'Mar', revenue: 48000, cost: 33000, profit: 15000 },
  { month: 'Apr', revenue: 61000, cost: 40000, profit: 21000 },
  { month: 'May', revenue: 59000, cost: 38000, profit: 21000 },
  { month: 'Jun', revenue: 68000, cost: 42000, profit: 26000 },
];

const mockCustomerData = [
  { name: 'SABIC', value: 34000 },
  { name: 'Aramco', value: 28000 },
  { name: 'Almarai', value: 15000 },
  { name: 'FMCG Corp', value: 12000 },
  { name: 'Other', value: 9000 },
];

export default function RevenueReportsPage() {
  const [timeRange, setTimeRange] = useState('6M');

  return (
    <DashboardLayout 
      active="Reports" 
      breadcrumb="Reports"
      title="Revenue Analytics" 
      pageTitle="Financial & Revenue Reports" 
      pageSub="Track gross revenue, operational costs, and profit margins."
      actions={
        <div className="flex gap-2">
          <Btn label="Filter" variant="outline" icon={<Filter size={14} />} />
          <Btn label="Export CSV" icon={<Download size={14} />} />
        </div>
      }
    >
      <div className="px-6 pb-6">
        
        {/* KPIs */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          <KpiCard 
            label="Gross Revenue (YTD)" 
            value="SAR 333K" 
            delta={12.5}
            up={true}
            icon={DollarSign} 
            color="#16A34A" 
            bg="#F0FDF4" 
          />
          <KpiCard 
            label="Net Profit Margin" 
            value="34.2%" 
            delta={2.1}
            up={true}
            icon={TrendingUp} 
            color="#2563EB" 
            bg="#EFF6FF" 
          />
          <KpiCard 
            label="Avg Revenue / Trip" 
            value="SAR 2,450" 
            delta={-1.5}
            up={false}
            icon={Activity} 
            color="#D97706" 
            bg="#FFFBEB" 
          />
          <KpiCard 
            label="Unpaid Invoices" 
            value="SAR 45K" 
            delta={10}
            up={false}
            icon={FileText} 
            color="#DC2626" 
            bg="#FEF2F2" 
          />
        </div>

        {/* Charts Row 1 */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
          
          {/* Revenue vs Cost Area Chart */}
          <div className="lg:col-span-2 bg-white border border-black/[0.08] rounded-none p-5 shadow-sm">
            <div className="flex justify-between items-center mb-6">
              <div>
                <h3 className="text-sm font-bold text-[#111]">Revenue & Profit Trajectory</h3>
                <p className="text-xs text-[#6E6E80]">Monthly comparison of gross revenue and net profit</p>
              </div>
              <select 
                value={timeRange} 
                onChange={e => setTimeRange(e.target.value)}
                className="text-xs font-semibold bg-[#F5F5F7] border-0 px-3 py-1.5 rounded-none outline-none cursor-pointer"
              >
                <option value="6M">Last 6 Months</option>
                <option value="1Y">Last Year</option>
              </select>
            </div>
            
            <div className="h-[280px]">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={mockRevenueData} margin={{ top: 10, right: 0, left: -10, bottom: 0 }}>
                  <defs>
                    <linearGradient id="colorRev" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#16A34A" stopOpacity={0.15}/>
                      <stop offset="95%" stopColor="#16A34A" stopOpacity={0}/>
                    </linearGradient>
                    <linearGradient id="colorProfit" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#2563EB" stopOpacity={0.15}/>
                      <stop offset="95%" stopColor="#2563EB" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#F0F0F2" />
                  <XAxis dataKey="month" tick={{ fontSize: 11, fill: '#9898A4' }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fontSize: 11, fill: '#9898A4' }} axisLine={false} tickLine={false} tickFormatter={(val) => `${val/1000}k`} />
                  <Tooltip contentStyle={{ borderRadius: 12, border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }} />
                  <Legend iconType="circle" wrapperStyle={{ fontSize: 11, paddingTop: 10 }} />
                  <Area type="monotone" dataKey="revenue" name="Gross Revenue" stroke="#16A34A" strokeWidth={2} fillOpacity={1} fill="url(#colorRev)" />
                  <Area type="monotone" dataKey="profit" name="Net Profit" stroke="#2563EB" strokeWidth={2} fillOpacity={1} fill="url(#colorProfit)" />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Top Customers Bar Chart */}
          <div className="bg-white border border-black/[0.08] rounded-none p-5 shadow-sm">
            <div className="mb-6">
              <h3 className="text-sm font-bold text-[#111]">Revenue by Customer</h3>
              <p className="text-xs text-[#6E6E80]">Top clients this month</p>
            </div>
            
            <div className="h-[280px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart layout="vertical" data={mockCustomerData} margin={{ top: 0, right: 20, left: 0, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#F0F0F2" />
                  <XAxis type="number" hide />
                  <YAxis dataKey="name" type="category" tick={{ fontSize: 11, fill: '#444', fontWeight: 600 }} axisLine={false} tickLine={false} width={80} />
                  <Tooltip cursor={{ fill: 'transparent' }} contentStyle={{ borderRadius: 12, border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }} />
                  <Bar dataKey="value" name="Revenue (SAR)" fill="#E8450F" radius={[0, 4, 4, 0]} barSize={24} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

        </div>

      </div>
    </DashboardLayout>
  );
}
