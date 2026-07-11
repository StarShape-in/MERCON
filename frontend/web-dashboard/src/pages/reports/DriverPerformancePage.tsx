import { useState } from 'react';
import { Download, Filter, Star, AlertTriangle, CheckCircle2, MapPin } from 'lucide-react';
import { 
  ResponsiveContainer, BarChart, Bar, XAxis, YAxis, 
  CartesianGrid, Tooltip, ScatterChart, Scatter, ZAxis
} from 'recharts';

import DashboardLayout from '@/components/layout/DashboardLayout';
import KpiCard from '@/components/ui/KpiCard';
import Btn from '@/components/ui/Btn';
import DataTable from '@/components/ui/DataTable';

const mockDriverScores = [
  { name: 'Ahmed A.', score: 92, trips: 45, incidents: 0 },
  { name: 'Khalid R.', score: 88, trips: 40, incidents: 1 },
  { name: 'Faisal O.', score: 95, trips: 50, incidents: 0 },
  { name: 'Ali K.', score: 76, trips: 35, incidents: 3 },
  { name: 'Omar M.', score: 82, trips: 38, incidents: 2 },
];

const mockSafetyData = [
  { x: 45, y: 0, z: 92, name: 'Ahmed A.' },
  { x: 40, y: 1, z: 88, name: 'Khalid R.' },
  { x: 50, y: 0, z: 95, name: 'Faisal O.' },
  { x: 35, y: 3, z: 76, name: 'Ali K.' },
  { x: 38, y: 2, z: 82, name: 'Omar M.' },
];

const mockTopDrivers = [
  { id: '1', name: 'Faisal O.', rating: 4.9, onTime: '98%', risk: 'Low' },
  { id: '2', name: 'Ahmed A.', rating: 4.8, onTime: '96%', risk: 'Low' },
  { id: '3', name: 'Khalid R.', rating: 4.5, onTime: '92%', risk: 'Medium' },
];

export default function DriverPerformancePage() {
  const [timeRange, setTimeRange] = useState('30D');

  return (
    <DashboardLayout 
      active="Reports" 
      breadcrumb="Reports"
      title="Driver Performance" 
      pageTitle="Driver Performance & Safety" 
      pageSub="Monitor driver ratings, safety incidents, and on-time delivery rates."
      actions={
        <div className="flex gap-2">
          <Btn label="Filter" variant="outline" icon={<Filter size={14} />} />
          <Btn label="Export Report" icon={<Download size={14} />} />
        </div>
      }
    >
      <div className="px-6 pb-6">
        
        {/* KPIs */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          <KpiCard 
            label="Avg. Driver Rating" 
            value="4.6 / 5" 
            delta={0.2}
            up={true}
            icon={Star} 
            color="#EAB308" 
            bg="#FEF9C3" 
          />
          <KpiCard 
            label="On-Time Delivery" 
            value="94.2%" 
            delta={1.5}
            up={true}
            icon={CheckCircle2} 
            color="#16A34A" 
            bg="#F0FDF4" 
          />
          <KpiCard 
            label="Safety Incidents" 
            value="6" 
            delta={-2}
            up={true} // Less incidents is better
            icon={AlertTriangle} 
            color="#DC2626" 
            bg="#FEF2F2" 
          />
          <KpiCard 
            label="Avg. Distance / Driver" 
            value="1,240 km" 
            delta={45}
            up={true}
            icon={MapPin} 
            color="#2563EB" 
            bg="#EFF6FF" 
          />
        </div>

        {/* Charts Row */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
          
          {/* Driver Scores Bar Chart */}
          <div className="bg-white border border-black/[0.08] rounded-none p-5 shadow-sm">
            <div className="flex justify-between items-center mb-6">
              <div>
                <h3 className="text-sm font-bold text-[#111]">Driver Performance Scores</h3>
                <p className="text-xs text-[#6E6E80]">Top 5 drivers by aggregated AI score</p>
              </div>
            </div>
            
            <div className="h-[280px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={mockDriverScores} margin={{ top: 10, right: 0, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#F0F0F2" />
                  <XAxis dataKey="name" tick={{ fontSize: 11, fill: '#9898A4' }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fontSize: 11, fill: '#9898A4' }} axisLine={false} tickLine={false} domain={[0, 100]} />
                  <Tooltip cursor={{ fill: '#F5F5F7' }} contentStyle={{ borderRadius: 12, border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }} />
                  <Bar dataKey="score" name="Performance Score" fill="#2563EB" radius={[4, 4, 0, 0]} barSize={40} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Safety Incidents Scatter */}
          <div className="bg-white border border-black/[0.08] rounded-none p-5 shadow-sm">
            <div className="flex justify-between items-center mb-6">
              <div>
                <h3 className="text-sm font-bold text-[#111]">Safety vs Trip Volume</h3>
                <p className="text-xs text-[#6E6E80]">Incidents (Y) relative to Trips (X)</p>
              </div>
            </div>
            
            <div className="h-[280px]">
              <ResponsiveContainer width="100%" height="100%">
                <ScatterChart margin={{ top: 10, right: 20, bottom: 0, left: -20 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#F0F0F2" />
                  <XAxis type="number" dataKey="x" name="Trips" tick={{ fontSize: 11, fill: '#9898A4' }} axisLine={false} tickLine={false} />
                  <YAxis type="number" dataKey="y" name="Incidents" tick={{ fontSize: 11, fill: '#9898A4' }} axisLine={false} tickLine={false} />
                  <ZAxis type="number" dataKey="z" range={[100, 400]} name="Score" />
                  <Tooltip cursor={{ strokeDasharray: '3 3' }} contentStyle={{ borderRadius: 12, border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }} />
                  <Scatter name="Drivers" data={mockSafetyData} fill="#E8450F" opacity={0.8} />
                </ScatterChart>
              </ResponsiveContainer>
            </div>
          </div>

        </div>

        {/* Top Drivers Table */}
        <div className="bg-white rounded-none border border-black/[0.06] shadow-sm overflow-hidden">
          <div className="p-5 border-b border-black/[0.04] bg-[#FAFAFA]">
            <h3 className="text-sm font-bold text-[#111]">Top Performers This Month</h3>
          </div>
          
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-black/[0.04]">
                <th className="px-5 py-3 font-semibold text-[10px] uppercase text-[#9898A4] tracking-wider">Driver Name</th>
                <th className="px-5 py-3 font-semibold text-[10px] uppercase text-[#9898A4] tracking-wider">Avg Rating</th>
                <th className="px-5 py-3 font-semibold text-[10px] uppercase text-[#9898A4] tracking-wider">On-Time %</th>
                <th className="px-5 py-3 font-semibold text-[10px] uppercase text-[#9898A4] tracking-wider">AI Risk Level</th>
              </tr>
            </thead>
            <tbody>
              {mockTopDrivers.map((driver) => (
                <tr key={driver.id} className="border-b border-black/[0.04] hover:bg-[#FAFAFA] transition-colors last:border-0">
                  <td className="px-5 py-3.5">
                    <span className="font-semibold text-[#111]">{driver.name}</span>
                  </td>
                  <td className="px-5 py-3.5">
                    <div className="flex items-center gap-1 text-[#EAB308]">
                      <Star size={14} className="fill-[#EAB308]" />
                      <span className="font-bold text-[#111]">{driver.rating}</span>
                    </div>
                  </td>
                  <td className="px-5 py-3.5">
                    <span className="font-bold text-[#16A34A]">{driver.onTime}</span>
                  </td>
                  <td className="px-5 py-3.5">
                    <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider ${
                      driver.risk === 'Low' ? 'bg-[#F0FDF4] text-[#16A34A]' : 'bg-[#FFFBEB] text-[#D97706]'
                    }`}>
                      {driver.risk}
                    </span>
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
