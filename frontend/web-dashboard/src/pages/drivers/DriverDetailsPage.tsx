import { useParams, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { ArrowLeft, Edit2, FileText, Phone, MapPin, Calendar, Activity, Star, AlertTriangle, Eye } from 'lucide-react';

import DashboardLayout from '@/components/layout/DashboardLayout';
import StatusBadge from '@/components/ui/StatusBadge';
import Btn from '@/components/ui/Btn';
import { driverService } from '@/services/driverService';

export default function DriverDetailsPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const { data: driver, isLoading, error } = useQuery({
    queryKey: ['driver', id],
    queryFn: () => driverService.getById(id!),
    enabled: !!id,
  });

  if (isLoading) {
    return (
      <DashboardLayout active="Drivers" title="Driver Details">
        <div className="p-6">
          <div className="animate-pulse flex flex-col gap-6">
            <div className="h-20 bg-black/5 rounded-2xl"></div>
            <div className="h-64 bg-black/5 rounded-2xl"></div>
          </div>
        </div>
      </DashboardLayout>
    );
  }

  if (error || !driver) {
    return (
      <DashboardLayout active="Drivers" title="Driver Details">
        <div className="p-6 flex flex-col items-center justify-center text-center h-[50vh]">
          <AlertTriangle size={48} className="text-red-500 mb-4" />
          <h2 className="text-xl font-bold mb-2">Driver Not Found</h2>
          <p className="text-[#6E6E80] mb-6">The driver you are looking for does not exist or has been deleted.</p>
          <Btn label="Back to Drivers" onClick={() => navigate('/drivers')} />
        </div>
      </DashboardLayout>
    );
  }

  const isLicenseExpired = new Date(driver.license_expiry) < new Date();

  return (
    <DashboardLayout 
      active="Drivers" 
      title={`Driver: ${driver.ref_id || 'N/A'}`}
      actions={
        <div className="flex gap-2">
          <Btn 
            label="Documents" 
            variant="outline" 
            icon={<FileText size={14} />} 
            onClick={() => navigate(`/drivers/${driver.id}/documents`)}
          />
          <Btn 
            label="Edit Driver" 
            icon={<Edit2 size={14} />} 
            onClick={() => navigate(`/drivers/${driver.id}/edit`)}
          />
        </div>
      }
    >
      <div className="px-6 pb-6 max-w-5xl">
        {/* Back Button */}
        <button 
          onClick={() => navigate('/drivers')}
          className="flex items-center gap-2 text-sm font-semibold text-[#6E6E80] hover:text-[#111] transition-colors mb-6"
        >
          <ArrowLeft size={16} /> Back to Drivers
        </button>

        {/* Header Profile Card */}
        <div className="bg-white border border-black/[0.08] rounded-2xl p-6 mb-6 flex flex-col md:flex-row gap-6 items-start md:items-center justify-between shadow-sm">
          <div className="flex items-center gap-5">
            <div className="w-16 h-16 rounded-full bg-[#F5F5F7] flex items-center justify-center border border-black/[0.05]">
              <span className="text-2xl font-bold text-[#E8450F]">
                {driver.first_name[0]}{driver.last_name[0]}
              </span>
            </div>
            <div>
              <h1 className="text-2xl font-bold text-[#111] mb-1">
                {driver.first_name} {driver.last_name}
              </h1>
              <div className="flex items-center gap-3">
                <span className="font-mono text-sm text-[#6E6E80] font-medium border border-black/[0.08] px-2 py-0.5 rounded-md bg-[#F5F5F7]">
                  {driver.ref_id || 'NO-REF'}
                </span>
                <StatusBadge status={driver.status} />
              </div>
            </div>
          </div>
          
          <div className="flex flex-wrap gap-4 md:gap-8 bg-[#F5F5F7] p-4 rounded-xl border border-black/[0.04]">
            <div>
              <p className="text-xs text-[#6E6E80] font-medium mb-1">Phone Number</p>
              <div className="flex items-center gap-1.5 text-sm font-semibold">
                <Phone size={14} className="text-[#444]" />
                {driver.phone_primary}
              </div>
            </div>
            <div>
              <p className="text-xs text-[#6E6E80] font-medium mb-1">License Expiry</p>
              <div className={`flex items-center gap-1.5 text-sm font-semibold ${isLicenseExpired ? 'text-red-600' : 'text-[#444]'}`}>
                <Calendar size={14} />
                {new Date(driver.license_expiry).toLocaleDateString()}
                {isLicenseExpired && <AlertTriangle size={14} />}
              </div>
            </div>
          </div>
        </div>

        {/* Content Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left Column - Details */}
          <div className="lg:col-span-1 flex flex-col gap-6">
            <div className="bg-white border border-black/[0.08] rounded-2xl p-5 shadow-sm">
              <h3 className="text-sm font-bold text-[#111] mb-4 flex items-center gap-2">
                <Activity size={16} className="text-[#E8450F]" /> Performance Metrics
              </h3>
              
              <div className="space-y-4">
                <div className="flex justify-between items-center pb-4 border-b border-black/[0.04]">
                  <span className="text-sm text-[#6E6E80] font-medium">AI Risk Score</span>
                  <div className="flex items-center gap-1.5">
                    <span className={`text-sm font-bold ${(driver.ai_risk_score || 0) > 7 ? 'text-red-500' : (driver.ai_risk_score || 0) > 3 ? 'text-yellow-500' : 'text-green-500'}`}>
                      {(driver.ai_risk_score || 0).toFixed(1)} / 10
                    </span>
                  </div>
                </div>
                <div className="flex justify-between items-center pb-4 border-b border-black/[0.04]">
                  <span className="text-sm text-[#6E6E80] font-medium">Completed Trips</span>
                  <span className="text-sm font-bold text-[#111]">
                    {driver.trips?.filter(t => t.status === 'Completed').length || 0}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-[#6E6E80] font-medium">Driver Rating</span>
                  <div className="flex items-center gap-1">
                    <Star size={14} className="text-yellow-400 fill-yellow-400" />
                    <span className="text-sm font-bold text-[#111]">4.8</span>
                  </div>
                </div>
              </div>
            </div>

            <div className="bg-white border border-black/[0.08] rounded-2xl p-5 shadow-sm">
              <h3 className="text-sm font-bold text-[#111] mb-4 flex items-center gap-2">
                <FileText size={16} className="text-[#E8450F]" /> Documents Status
              </h3>
              
              {/* Mock Document Statuses */}
              <div className="space-y-3">
                <div className="flex items-center justify-between bg-[#F0FDF4] border border-green-200 px-3 py-2 rounded-lg">
                  <span className="text-xs font-semibold text-green-800">Driver License</span>
                  <span className="text-[10px] font-bold bg-green-100 text-green-700 px-2 py-0.5 rounded-full uppercase tracking-wider">Valid</span>
                </div>
                <div className="flex items-center justify-between bg-[#FEF2F2] border border-red-200 px-3 py-2 rounded-lg">
                  <span className="text-xs font-semibold text-red-800">Medical Certificate</span>
                  <span className="text-[10px] font-bold bg-red-100 text-red-700 px-2 py-0.5 rounded-full uppercase tracking-wider">Expired</span>
                </div>
              </div>
              
              <button 
                onClick={() => navigate(`/drivers/${driver.id}/documents`)}
                className="w-full mt-4 py-2 bg-white border border-[#E8450F] text-[#E8450F] text-xs font-bold rounded-xl hover:bg-[#E8450F]/5 transition-colors"
              >
                Manage Documents
              </button>
            </div>
          </div>

          {/* Right Column - Recent Trips */}
          <div className="lg:col-span-2">
            <div className="bg-white border border-black/[0.08] rounded-2xl shadow-sm overflow-hidden flex flex-col h-full">
              <div className="p-5 border-b border-black/[0.04] flex justify-between items-center">
                <h3 className="text-sm font-bold text-[#111] flex items-center gap-2">
                  <MapPin size={16} className="text-[#E8450F]" /> Recent Trips
                </h3>
                <button 
                  onClick={() => navigate('/trips')} 
                  className="text-xs font-semibold text-[#E8450F] hover:underline"
                >
                  View All
                </button>
              </div>
              
              <div className="p-0">
                {(!driver.trips || driver.trips.length === 0) ? (
                  <div className="p-8 text-center text-[#6E6E80]">
                    <MapPin size={32} className="mx-auto mb-3 opacity-20" />
                    <p className="text-sm font-medium">No trips recorded for this driver yet.</p>
                  </div>
                ) : (
                  <table className="w-full text-left text-sm">
                    <thead>
                      <tr className="border-b border-black/[0.04] bg-[#F9F9FB]">
                        <th className="px-5 py-3 font-semibold text-xs text-[#6E6E80] uppercase tracking-wider">Trip ID</th>
                        <th className="px-5 py-3 font-semibold text-xs text-[#6E6E80] uppercase tracking-wider">Date</th>
                        <th className="px-5 py-3 font-semibold text-xs text-[#6E6E80] uppercase tracking-wider">Status</th>
                        <th className="px-5 py-3 font-semibold text-xs text-[#6E6E80] uppercase tracking-wider text-right">Action</th>
                      </tr>
                    </thead>
                    <tbody>
                      {driver.trips.slice(0, 5).map((trip) => (
                        <tr key={trip.id} className="border-b border-black/[0.02] hover:bg-black/[0.01] transition-colors">
                          <td className="px-5 py-3">
                            <span className="font-mono text-xs font-bold text-[#E8450F]">{trip.ref_id}</span>
                          </td>
                          <td className="px-5 py-3 text-xs text-[#444] font-medium">
                            {new Date(trip.createdAt).toLocaleDateString()}
                          </td>
                          <td className="px-5 py-3">
                            <StatusBadge status={trip.status as any} />
                          </td>
                          <td className="px-5 py-3 text-right">
                            <button 
                              onClick={() => navigate(`/trips/${trip.id}`)}
                              className="w-7 h-7 rounded-lg bg-[#F5F5F7] hover:bg-[#EBEBEF] inline-flex items-center justify-center transition-colors"
                            >
                              <Eye size={13} className="text-[#6E6E80]" />
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
