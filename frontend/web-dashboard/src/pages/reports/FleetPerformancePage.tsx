import { useState } from 'react';
import { Download, Filter, TrendingUp, AlertTriangle, Settings, Activity } from 'lucide-react';
import { 
  ResponsiveContainer, BarChart, Bar, XAxis, YAxis, 
  CartesianGrid, Tooltip, Legend, LineChart, Line 
} from 'recharts';

import DashboardLayout from '@/components/layout/DashboardLayout';
import KpiCard from '@/components/ui/KpiCard';
import Btn from '@/components/ui/Btn';

const mockUtilizationData = [
  { month: 'Jan', utilized: 85, idle: 15, maintenance: 5 },
  { month: 'Feb', utilized: 88, idle: 12, maintenance: 6 },
  { month: 'Mar', utilized: 92, idle: 8, maintenance: 4 },
  { month: 'Apr', utilized: 80, idle: 20, maintenance: 8 },
  { month: 'May', utilized: 95, idle: 5, maintenance: 3 },
  { month: 'Jun', utilized: 90, idle: 10, maintenance: 5 },
];

const mockMaintenanceData = [
  { month: 'Jan', cost: 12000 },
  { month: 'Feb', cost: 15000 },
  { month: 'Mar', cost: 9000 },
  { month: 'Apr', cost: 18000 },
  { month: 'May', cost: 11000 },
  { month: 'Jun', cost: 13500 },
];

export default function FleetPerformancePage() {
  const [timeRange, setTimeRange] = useState('6M');

  return (
    <DashboardLayout 
      active="Reports" 
      breadcrumb="Reports"
      title="Fleet Performance" 
      pageTitle="Fleet Performance Analytics" 
      pageSub="Monitor vehicle utilization, maintenance costs, and asset efficiency."
      actions={
        <div className="flex gap-2">
          <Btn label="Filter" variant="outline" icon={<Filter size={14} />} />
          <Btn label="Export PDF" icon={<Download size={14} />} />
        </div>
      }
    >
      <div className="px-6 pb-6">
        
        {/* KPIs */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          <KpiCard 
            label="Avg. Utilization Rate" 
            value="88.3%" 
            delta={2.1}
            up={true}
            icon={Activity} 
            color="#2563EB" 
            bg="#EFF6FF" 
          />
          <KpiCard 
            label="Total Maintenance Cost" 
            value="SAR 78.5K" 
            delta={5.4}
            up={false} // Cost going up is bad, but UI handles arrow logic
            icon={Settings} 
            color="#DC2626" 
            bg="#FEF2F2" 
          />
          <KpiCard 
            label="Vehicles in Shop" 
            value="4" 
            delta={-1}
            up={true}
            icon={AlertTriangle} 
            color="#D97706" 
            bg="#FFFBEB" 
          />
          <KpiCard 
            label="Cost per Km (Avg)" 
            value="SAR 1.12" 
            delta={-0.05}
            up={true}
            icon={TrendingUp} 
            color="#16A34A" 
            bg="#F0FDF4" 
          />
        </div>

        {/* Charts Row 1 */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
          
          {/* Utilization Chart */}
          <div className="bg-white border border-black/[0.08] rounded-none p-5 shadow-sm">
            <div className="flex justify-between items-center mb-6">
              <div>
                <h3 className="text-sm font-bold text-[#111]">Fleet Utilization Breakdown</h3>
                <p className="text-xs text-[#6E6E80]">Percentage of days utilized vs idle</p>
              </div>
              <select 
                value={timeRange} 
                onChange={e => setTimeRange(e.target.value)}
                className="text-xs font-semibold bg-[#F5F5F7] border-0 px-3 py-1.5 rounded-none outline-none cursor-pointer"
              >
                <option value="3M">Last 3 Months</option>
                <option value="6M">Last 6 Months</option>
                <option value="1Y">Last Year</option>
              </select>
            </div>
            
            <div className="h-[280px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={mockUtilizationData} margin={{ top: 10, right: 0, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#F0F0F2" />
                  <XAxis dataKey="month" tick={{ fontSize: 11, fill: '#9898A4' }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fontSize: 11, fill: '#9898A4' }} axisLine={false} tickLine={false} />
                  <Tooltip cursor={{ fill: '#F5F5F7' }} contentStyle={{ borderRadius: 12, border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }} />
                  <Legend iconType="circle" wrapperStyle={{ fontSize: 11, paddingTop: 10 }} />
                  <Bar dataKey="utilized" name="Active (%)" stackId="a" fill="#2563EB" radius={[0, 0, 4, 4]} />
                  <Bar dataKey="idle" name="Idle (%)" stackId="a" fill="#CBD5E1" />
                  <Bar dataKey="maintenance" name="Maintenance (%)" stackId="a" fill="#F87171" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Maintenance Cost Trend */}
          <div className="bg-white border border-black/[0.08] rounded-none p-5 shadow-sm">
            <div className="flex justify-between items-center mb-6">
              <div>
                <h3 className="text-sm font-bold text-[#111]">Maintenance Cost Trend</h3>
                <p className="text-xs text-[#6E6E80]">Monthly repair and service expenses (SAR)</p>
              </div>
            </div>
            
            <div className="h-[280px]">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={mockMaintenanceData} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#F0F0F2" />
                  <XAxis dataKey="month" tick={{ fontSize: 11, fill: '#9898A4' }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fontSize: 11, fill: '#9898A4' }} axisLine={false} tickLine={false} tickFormatter={(val) => `${val/1000}k`} />
                  <Tooltip contentStyle={{ borderRadius: 12, border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }} />
                  <Line type="monotone" dataKey="cost" name="Cost (SAR)" stroke="#DC2626" strokeWidth={3} dot={{ r: 4, strokeWidth: 2 }} activeDot={{ r: 6 }} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>

        </div>

      </div>
    </DashboardLayout>
  );
}
