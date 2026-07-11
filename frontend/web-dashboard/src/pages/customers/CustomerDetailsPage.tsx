import { useParams, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { ArrowLeft, Edit2, FileText, Building2, MapPin, Activity, AlertTriangle, Eye, DollarSign } from 'lucide-react';

import DashboardLayout from '@/components/layout/DashboardLayout';
import Btn from '@/components/ui/Btn';
import StatusBadge from '@/components/ui/StatusBadge';
import { customerService } from '@/services/customerService';

export default function CustomerDetailsPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const { data: customer, isLoading, error } = useQuery({
    queryKey: ['customer', id],
    queryFn: () => customerService.getById(id!),
    enabled: !!id,
  });

  if (isLoading) {
    return (
      <DashboardLayout active="Customers" title="Customer Details">
        <div className="p-6">
          <div className="animate-pulse flex flex-col gap-6">
            <div className="h-20 bg-black/5 rounded-none"></div>
            <div className="h-64 bg-black/5 rounded-none"></div>
          </div>
        </div>
      </DashboardLayout>
    );
  }

  if (error || !customer) {
    return (
      <DashboardLayout active="Customers" title="Customer Details">
        <div className="p-6 flex flex-col items-center justify-center text-center h-[50vh]">
          <AlertTriangle size={48} className="text-red-500 mb-4" />
          <h2 className="text-xl font-bold mb-2">Customer Not Found</h2>
          <p className="text-[#6E6E80] mb-6">The customer you are looking for does not exist or has been deleted.</p>
          <Btn label="Back to Customers" onClick={() => navigate('/customers')} />
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout 
      active="Customers" 
      title={`Customer: ${customer.name}`}
      actions={
        <div className="flex gap-2">
          <Btn 
            label="Contracts" 
            variant="outline" 
            icon={<FileText size={14} />} 
            onClick={() => navigate(`/customers/${customer.id}/contracts`)}
          />
          <Btn 
            label="Edit Customer" 
            icon={<Edit2 size={14} />} 
            onClick={() => navigate(`/customers/${customer.id}/edit`)}
          />
        </div>
      }
    >
      <div className="px-6 pb-6 max-w-5xl">
        <button 
          onClick={() => navigate('/customers')}
          className="flex items-center gap-2 text-sm font-semibold text-[#6E6E80] hover:text-[#111] transition-colors mb-6"
        >
          <ArrowLeft size={16} /> Back to Customers
        </button>

        {/* Header Summary */}
        <div className="bg-white border border-black/[0.08] rounded-none p-6 mb-6 flex flex-col md:flex-row gap-6 items-start md:items-center justify-between shadow-sm">
          <div className="flex items-center gap-5">
            <div className="w-16 h-16 rounded-full bg-[#F5F5F7] flex items-center justify-center border border-black/[0.05]">
              <Building2 size={28} className="text-[#E8450F]" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-[#111] mb-1">
                {customer.name}
              </h1>
              <div className="flex items-center gap-3">
                <span className="font-mono text-sm text-[#6E6E80] font-medium border border-black/[0.08] px-2 py-0.5 rounded-md bg-[#F5F5F7]">
                  ID: {customer.id.split('-')[0].toUpperCase()}
                </span>
                {customer.isActive 
                  ? <span className="bg-green-100 text-green-700 px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider">Active</span>
                  : <span className="bg-red-100 text-red-700 px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider">Inactive</span>
                }
              </div>
            </div>
          </div>
          
          <div className="flex flex-wrap gap-4 md:gap-8 bg-[#F5F5F7] p-4 rounded-none border border-black/[0.04]">
            <div>
              <p className="text-xs text-[#6E6E80] font-medium mb-1">Contact Phone</p>
              <div className="text-sm font-semibold text-[#444]">
                {customer.contact_phone}
              </div>
            </div>
            <div>
              <p className="text-xs text-[#6E6E80] font-medium mb-1">Credit Limit</p>
              <div className="text-sm font-semibold text-[#16A34A] flex items-center gap-1">
                <DollarSign size={14} /> SAR {customer.credit_limit.toLocaleString()}
              </div>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-1 flex flex-col gap-6">
            <div className="bg-white border border-black/[0.08] rounded-none p-5 shadow-sm">
              <h3 className="text-sm font-bold text-[#111] mb-4 flex items-center gap-2">
                <Activity size={16} className="text-[#E8450F]" /> Account Overview
              </h3>
              
              <div className="space-y-4">
                <div className="flex justify-between items-center pb-4 border-b border-black/[0.04]">
                  <span className="text-sm text-[#6E6E80] font-medium">Total Trips</span>
                  <span className="text-sm font-semibold text-[#111]">
                    {customer.trips?.length || 0}
                  </span>
                </div>
                <div className="flex justify-between items-center pb-4 border-b border-black/[0.04]">
                  <span className="text-sm text-[#6E6E80] font-medium">Active Trips</span>
                  <span className="text-sm font-semibold text-[#111]">
                    {customer.trips?.filter(t => ['Dispatched', 'AtPickup', 'InTransit', 'AtDelivery'].includes(t.status)).length || 0}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-[#6E6E80] font-medium">Member Since</span>
                  <span className="text-sm font-semibold text-[#111]">
                    {new Date(customer.createdAt).toLocaleDateString()}
                  </span>
                </div>
              </div>
            </div>
            
            <div className="bg-white border border-black/[0.08] rounded-none p-5 shadow-sm">
              <h3 className="text-sm font-bold text-[#111] mb-4 flex items-center gap-2">
                <FileText size={16} className="text-[#E8450F]" /> Contracts Status
              </h3>
              
              <div className="space-y-3">
                <div className="flex items-center justify-between bg-[#F0FDF4] border border-green-200 px-3 py-2 rounded-none">
                  <span className="text-xs font-semibold text-green-800">Master Service Agreement</span>
                  <span className="text-[10px] font-bold bg-green-100 text-green-700 px-2 py-0.5 rounded-full uppercase tracking-wider">Valid</span>
                </div>
              </div>
              
              <button 
                onClick={() => navigate(`/customers/${customer.id}/contracts`)}
                className="w-full mt-4 py-2 bg-white border border-[#E8450F] text-[#E8450F] text-xs font-bold rounded-none hover:bg-[#E8450F]/5 transition-colors"
              >
                Manage Contracts
              </button>
            </div>
          </div>

          <div className="lg:col-span-2">
            <div className="bg-white border border-black/[0.08] rounded-none shadow-sm overflow-hidden flex flex-col h-full">
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
                {(!customer.trips || customer.trips.length === 0) ? (
                  <div className="p-8 text-center text-[#6E6E80]">
                    <MapPin size={32} className="mx-auto mb-3 opacity-20" />
                    <p className="text-sm font-medium">No trips recorded for this customer yet.</p>
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
                      {customer.trips.slice(0, 5).map((trip) => (
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
                              className="w-7 h-7 rounded-none bg-[#F5F5F7] hover:bg-[#EBEBEF] inline-flex items-center justify-center transition-colors"
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
