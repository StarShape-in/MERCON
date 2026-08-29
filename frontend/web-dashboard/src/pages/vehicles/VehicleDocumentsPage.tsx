import { useParams, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { ArrowLeft, Building2, ChevronDown, RefreshCw, Download, Truck } from 'lucide-react';
import { toast } from 'sonner';

import DashboardLayout from '@/components/layout/DashboardLayout';
import { vehicleService } from '@/services/vehicleService';
import OwnerFolderDetail from '@/components/documents/OwnerFolderDetail';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';

export default function VehicleDocumentsPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const { data: vehicle } = useQuery({
    // Lookup shape: this page shows a plate number — see the driver equivalent.
    queryKey: ['vehicle', id, 'lookup'],
    queryFn: () => vehicleService.getById(id!, { lookup: true }),
    enabled: !!id,
  });

  const plateOrRef = vehicle?.plate_number || vehicle?.ref_id || 'Vehicle';

  return (
    <DashboardLayout
      active="Vehicles"
      title={`Vehicle Documents: ${plateOrRef}`}
    >
      <div className="px-4 sm:px-6 pb-10 max-w-[1600px] mx-auto space-y-6">
        
        {/* MERCON Header Layout & Top Bar Actions */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pt-2 pb-2 border-b border-slate-200/80 dark:border-slate-800">
          <div className="flex items-center gap-3 flex-wrap">
            {vehicle ? (
              <div className="flex items-center gap-4">
                <Truck className="w-7 h-7 text-indigo-600 shrink-0" />
                <div className="flex flex-col gap-0.5">
                  <h1 className="text-2xl font-black font-mono text-slate-900 dark:text-slate-100 tracking-tight leading-none">
                    {vehicle.plate_number}
                  </h1>
                  <div className="flex items-center gap-3 text-xs font-semibold text-slate-500 mt-1">
                    <span className="flex items-center gap-1">
                      Capacity: <strong className="text-slate-800 dark:text-slate-200 font-mono">{(vehicle.capacity_kg ? vehicle.capacity_kg / 1000 : 24).toFixed(0)} Ton</strong>
                    </span>
                    <span>•</span>
                    <span className="flex items-center gap-1">
                      Driver: <strong className="text-slate-800 dark:text-slate-200">
                        {(() => {
                          const assignedDriver = vehicle.assignedDriver || (vehicle as any).driver;
                          return assignedDriver ? `${assignedDriver.first_name || ''} ${assignedDriver.last_name || ''}`.trim() : 'Unassigned';
                        })()}
                      </strong>
                    </span>
                  </div>
                </div>
              </div>
            ) : (
              <div className="flex items-center gap-3">
                <Truck className="w-7 h-7 text-indigo-600 dark:text-indigo-400 shrink-0" />
                <h1 className="text-2xl font-black tracking-tight text-slate-900 dark:text-slate-100">
                  Vehicle Compliance Vault: <span className="text-indigo-600 dark:text-indigo-400">{plateOrRef}</span>
                </h1>
                <Badge className="bg-indigo-50 text-indigo-700 border-indigo-200 dark:bg-indigo-950/50 dark:text-indigo-300 dark:border-indigo-800 font-semibold px-2.5 py-0.5 text-xs">
                  Fleet Management / Compliance
                </Badge>
              </div>
            )}
          </div>
        </div>

        {id && <OwnerFolderDetail ownerType="Vehicle" ownerId={id} />}
      </div>
    </DashboardLayout>
  );
}
