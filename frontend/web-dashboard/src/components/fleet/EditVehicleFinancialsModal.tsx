import { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { toast } from 'sonner';
import {
  Truck, Coins, Trash2, Save, AlertTriangle
} from 'lucide-react';

import {
  Dialog,
  DialogContent,
  DialogTitle,
  DialogDescription,
  DialogFooter
} from '@/components/ui/dialog';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem
} from '@/components/ui/select';
import { vehicleService, type FleetVehicleFinancials, type AssetType, type AssetStatus } from '@/services/vehicleService';
import { driverService } from '@/services/driverService';

interface EditVehicleFinancialsModalProps {
  vehicleFinancials: FleetVehicleFinancials | null;
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export default function EditVehicleFinancialsModal({
  vehicleFinancials,
  isOpen,
  onClose,
  onSuccess,
}: EditVehicleFinancialsModalProps) {
  const [activeTab, setActiveTab] = useState<'financial' | 'specs'>('financial');
  const [isSaving, setIsSaving] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  // Form State
  const [plateNumber, setPlateNumber] = useState('');
  const [refId, setRefId] = useState('');
  const [assetType, setAssetType] = useState<AssetType>('Box');
  const [status, setStatus] = useState<AssetStatus>('Available');
  const [capacityKg, setCapacityKg] = useState<number | string>('');
  const [currentOdometer, setCurrentOdometer] = useState<number | string>('');
  const [trailerNumber, setTrailerNumber] = useState('');
  const [trailerType, setTrailerType] = useState<AssetType | 'None'>('None');

  // Financial Overhead State
  const [monthlyLease, setMonthlyLease] = useState<string>('');
  const [monthlyInsurance, setMonthlyInsurance] = useState<string>('');
  const [driverSalaryShare, setDriverSalaryShare] = useState<string>('');
  const [targetMargin, setTargetMargin] = useState<string>('20');
  const [overheadAdjustment, setOverheadAdjustment] = useState<string>('');
  const [assignedDriverId, setAssignedDriverId] = useState<string>('unassigned');

  // Fetch full vehicle details & drivers list
  const { data: vehicleDetails } = useQuery({
    queryKey: ['vehicle-details', vehicleFinancials?.vehicle_id],
    queryFn: () => vehicleFinancials ? vehicleService.getById(vehicleFinancials.vehicle_id) : null,
    enabled: !!vehicleFinancials?.vehicle_id && isOpen,
  });

  const { data: driversResponse } = useQuery({
    queryKey: ['drivers-list-edit-modal'],
    queryFn: () => driverService.getAll({ per_page: 100, mode: 'lookup' }),
    enabled: isOpen,
  });

  const drivers = driversResponse?.data || [];

  // Populate data when modal opens
  useEffect(() => {
    if (vehicleFinancials) {
      setPlateNumber(vehicleFinancials.plate_number || '');
      setRefId(vehicleFinancials.ref_id || '');
      setAssetType(vehicleFinancials.asset_type || 'Box');
      setStatus(vehicleFinancials.status || 'Available');
      setDriverSalaryShare(vehicleFinancials.salary_expenses ? String(vehicleFinancials.salary_expenses) : '');
      setOverheadAdjustment(vehicleFinancials.other_expenses ? String(vehicleFinancials.other_expenses) : '');
      setTargetMargin(vehicleFinancials.margin_percent ? String(vehicleFinancials.margin_percent) : '20');
    }
  }, [vehicleFinancials]);

  useEffect(() => {
    if (vehicleDetails) {
      setPlateNumber(vehicleDetails.plate_number || '');
      setRefId(vehicleDetails.ref_id || '');
      setAssetType(vehicleDetails.asset_type || 'Box');
      setStatus(vehicleDetails.status || 'Available');
      setCapacityKg(vehicleDetails.capacity_kg || '');
      setCurrentOdometer(vehicleDetails.current_odometer || '');
      setTrailerNumber(vehicleDetails.trailer_number || '');
      setTrailerType(vehicleDetails.trailer_type || 'None');
      if (vehicleDetails.assignedDriver?.id) {
        setAssignedDriverId(vehicleDetails.assignedDriver.id);
      }
    }
  }, [vehicleDetails]);

  if (!vehicleFinancials) return null;

  const handleSave = async () => {
    if (!plateNumber.trim()) {
      toast.error('Plate number is required');
      return;
    }

    try {
      setIsSaving(true);

      await vehicleService.update(vehicleFinancials.vehicle_id, {
        plate_number: plateNumber.trim(),
        asset_type: assetType,
        status: status,
        capacity_kg: Number(capacityKg) || 0,
        current_odometer: Number(currentOdometer) || 0,
        trailer_number: trailerNumber.trim() || undefined,
        trailer_type: trailerType === 'None' ? undefined : trailerType,
      });

      toast.success(`Vehicle ${plateNumber} updated successfully`);
      onSuccess();
    } catch (err: any) {
      toast.error(err.response?.data?.error?.message || err.message || 'Failed to update vehicle');
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async () => {
    try {
      setIsDeleting(true);
      await vehicleService.delete(vehicleFinancials.vehicle_id);
      toast.success(`Vehicle ${vehicleFinancials.plate_number} deleted successfully`);
      setShowDeleteConfirm(false);
      onSuccess();
    } catch (err: any) {
      toast.error(err.response?.data?.error?.message || err.message || 'Failed to delete vehicle');
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => { if (!open) { setShowDeleteConfirm(false); onClose(); } }}>
      <DialogContent className="max-w-2xl p-0 overflow-hidden rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-2xl">
        {/* Header */}
        <div className="p-5 bg-slate-50/80 dark:bg-slate-800/50 border-b border-slate-100 dark:border-slate-800">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <Truck className="w-5 h-5 text-indigo-600 shrink-0" />
              <div>
                <DialogTitle className="text-base font-extrabold text-slate-900 dark:text-slate-100">
                  Edit Vehicle &amp; Financial Settings
                </DialogTitle>
                <DialogDescription className="text-xs text-slate-500 mt-0.5">
                  Update operational overhead allocations, driver assignment, and vehicle specifications
                </DialogDescription>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <Badge variant="outline" className="font-mono text-xs font-bold px-2 py-0.5">
                {vehicleFinancials.plate_number}
              </Badge>
              <Badge className="bg-emerald-50 text-emerald-700 border-emerald-200 text-xs font-semibold">
                {vehicleFinancials.asset_type}
              </Badge>
            </div>
          </div>

          {/* Tab navigation */}
          <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as any)} className="mt-4">
            <TabsList className="grid grid-cols-2 bg-slate-200/70 dark:bg-slate-800/80 p-1 rounded-xl">
              <TabsTrigger
                value="financial"
                className="text-xs font-bold gap-1.5 rounded-lg data-[state=active]:bg-white dark:data-[state=active]:bg-slate-900 data-[state=active]:shadow-xs"
              >
                <Coins className="w-3.5 h-3.5 text-amber-500" />
                <span>Financial &amp; Overhead Allocations</span>
              </TabsTrigger>
              <TabsTrigger
                value="specs"
                className="text-xs font-bold gap-1.5 rounded-lg data-[state=active]:bg-white dark:data-[state=active]:bg-slate-900 data-[state=active]:shadow-xs"
              >
                <Truck className="w-3.5 h-3.5 text-indigo-500" />
                <span>Vehicle Master &amp; Status</span>
              </TabsTrigger>
            </TabsList>
          </Tabs>
        </div>

        {/* Body */}
        <div className="p-5 max-h-[60vh] overflow-y-auto space-y-4">
          {activeTab === 'financial' && (
            <div className="space-y-4 animate-fade-in">
              <div className="p-3 rounded-xl bg-amber-50/50 dark:bg-amber-950/20 border border-amber-200/60 dark:border-amber-900/40 text-xs text-amber-800 dark:text-amber-300 flex items-center gap-2.5">
                <Coins className="w-4 h-4 text-amber-600 shrink-0" />
                <span>Financial overhead parameters configure vehicle cost allocations and profit margin targets across reporting periods.</span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                    Monthly Lease / EMI Financing (SAR)
                  </Label>
                  <div className="relative">
                    <Input
                      type="number"
                      placeholder="e.g. 3500"
                      value={monthlyLease}
                      onChange={(e) => setMonthlyLease(e.target.value)}
                      className="text-xs font-mono pl-7"
                    />
                    <span className="absolute left-2.5 top-2.5 text-xs text-slate-400 font-bold">﷼</span>
                  </div>
                  <p className="text-[10px] text-slate-400">Fixed monthly financing installment</p>
                </div>

                <div className="space-y-1.5">
                  <Label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                    Insurance &amp; Istimara Amortization (SAR/mo)
                  </Label>
                  <div className="relative">
                    <Input
                      type="number"
                      placeholder="e.g. 650"
                      value={monthlyInsurance}
                      onChange={(e) => setMonthlyInsurance(e.target.value)}
                      className="text-xs font-mono pl-7"
                    />
                    <span className="absolute left-2.5 top-2.5 text-xs text-slate-400 font-bold">﷼</span>
                  </div>
                  <p className="text-[10px] text-slate-400">Monthly inspection and insurance overhead</p>
                </div>

                <div className="space-y-1.5">
                  <Label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                    Primary Driver Assignment
                  </Label>
                  <Select value={assignedDriverId} onValueChange={setAssignedDriverId}>
                    <SelectTrigger className="text-xs font-medium">
                      <SelectValue placeholder="Select primary driver" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="unassigned">No primary driver assigned</SelectItem>
                      {drivers.map((d) => (
                        <SelectItem key={d.id} value={d.id}>
                          {d.first_name} {d.last_name} ({d.phone_primary})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <p className="text-[10px] text-slate-400">Driver linked to this vehicle</p>
                </div>

                <div className="space-y-1.5">
                  <Label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                    Driver Salary Allocation (SAR/mo)
                  </Label>
                  <div className="relative">
                    <Input
                      type="number"
                      placeholder="e.g. 4000"
                      value={driverSalaryShare}
                      onChange={(e) => setDriverSalaryShare(e.target.value)}
                      className="text-xs font-mono pl-7"
                    />
                    <span className="absolute left-2.5 top-2.5 text-xs text-slate-400 font-bold">﷼</span>
                  </div>
                  <p className="text-[10px] text-slate-400">Driver salary share dedicated to this vehicle</p>
                </div>

                <div className="space-y-1.5">
                  <Label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                    Target Profit Margin (%)
                  </Label>
                  <div className="relative">
                    <Input
                      type="number"
                      placeholder="20"
                      value={targetMargin}
                      onChange={(e) => setTargetMargin(e.target.value)}
                      className="text-xs font-mono pr-7"
                    />
                    <span className="absolute right-2.5 top-2.5 text-xs text-slate-400 font-bold">%</span>
                  </div>
                  <p className="text-[10px] text-slate-400">Benchmark margin threshold for performance flags</p>
                </div>

                <div className="space-y-1.5">
                  <Label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                    Overhead &amp; Toll Adjustments (SAR)
                  </Label>
                  <div className="relative">
                    <Input
                      type="number"
                      placeholder="0"
                      value={overheadAdjustment}
                      onChange={(e) => setOverheadAdjustment(e.target.value)}
                      className="text-xs font-mono pl-7"
                    />
                    <span className="absolute left-2.5 top-2.5 text-xs text-slate-400 font-bold">﷼</span>
                  </div>
                  <p className="text-[10px] text-slate-400">Manual adjustments for fines, tolls &amp; permits</p>
                </div>
              </div>
            </div>
          )}

          {/* Tab 2: Vehicle Master Specs */}
          {activeTab === 'specs' && (
            <div className="space-y-4 animate-fade-in">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                    Plate Number <span className="text-rose-500">*</span>
                  </Label>
                  <Input
                    placeholder="e.g. ERA-3531"
                    value={plateNumber}
                    onChange={(e) => setPlateNumber(e.target.value)}
                    className="text-xs font-mono font-bold"
                  />
                </div>

                <div className="space-y-1.5">
                  <Label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                    Internal Ref / Code
                  </Label>
                  <Input
                    placeholder="e.g. TRK-001"
                    value={refId}
                    onChange={(e) => setRefId(e.target.value)}
                    className="text-xs font-mono"
                  />
                </div>

                <div className="space-y-1.5">
                  <Label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                    Asset / Body Type
                  </Label>
                  <Select value={assetType} onValueChange={(v) => setAssetType(v as AssetType)}>
                    <SelectTrigger className="text-xs font-medium">
                      <SelectValue placeholder="Select type" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Box">Box (Closed Truck)</SelectItem>
                      <SelectItem value="Flatbed">Flatbed Trailer</SelectItem>
                      <SelectItem value="Reefer">Reefer (Refrigerated)</SelectItem>
                      <SelectItem value="Tanker">Tanker</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-1.5">
                  <Label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                    Operational Status
                  </Label>
                  <Select value={status} onValueChange={(v) => setStatus(v as AssetStatus)}>
                    <SelectTrigger className="text-xs font-medium">
                      <SelectValue placeholder="Select status" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Available">🟢 Available</SelectItem>
                      <SelectItem value="OnTrip">🔵 On Trip</SelectItem>
                      <SelectItem value="Maintenance">🟡 In Workshop / Maintenance</SelectItem>
                      <SelectItem value="Inactive">⚪ Inactive</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-1.5">
                  <Label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                    Cargo Capacity (kg)
                  </Label>
                  <Input
                    type="number"
                    placeholder="e.g. 22000"
                    value={capacityKg}
                    onChange={(e) => setCapacityKg(e.target.value)}
                    className="text-xs font-mono"
                  />
                </div>

                <div className="space-y-1.5">
                  <Label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                    Current Odometer (km)
                  </Label>
                  <Input
                    type="number"
                    placeholder="e.g. 145000"
                    value={currentOdometer}
                    onChange={(e) => setCurrentOdometer(e.target.value)}
                    className="text-xs font-mono"
                  />
                </div>

                <div className="space-y-1.5">
                  <Label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                    Trailer Number
                  </Label>
                  <Input
                    placeholder="e.g. TRL-8890"
                    value={trailerNumber}
                    onChange={(e) => setTrailerNumber(e.target.value)}
                    className="text-xs font-mono"
                  />
                </div>

                <div className="space-y-1.5">
                  <Label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                    Trailer Type
                  </Label>
                  <Select value={trailerType} onValueChange={(v) => setTrailerType(v as any)}>
                    <SelectTrigger className="text-xs font-medium">
                      <SelectValue placeholder="Select trailer type" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="None">None</SelectItem>
                      <SelectItem value="Flatbed">Flatbed</SelectItem>
                      <SelectItem value="Reefer">Reefer</SelectItem>
                      <SelectItem value="Box">Box</SelectItem>
                      <SelectItem value="Tanker">Tanker</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>
          )}

          {/* Delete Confirmation In-Modal View */}
          {showDeleteConfirm && (
            <div className="p-4 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900/60 space-y-3 animate-fade-in">
              <div className="flex items-center gap-2 text-rose-700 dark:text-rose-300 font-extrabold text-xs">
                <AlertTriangle className="w-4 h-4" />
                <span>Confirm Permanent Deletion</span>
              </div>
              <p className="text-xs text-rose-600 dark:text-rose-400">
                Are you sure you want to delete vehicle <strong>{vehicleFinancials.plate_number}</strong>? This action will remove the vehicle and its ledger links.
              </p>
              <div className="flex items-center gap-2 pt-1">
                <Button
                  type="button"
                  variant="destructive"
                  size="sm"
                  disabled={isDeleting}
                  onClick={handleDelete}
                  className="h-8 text-xs font-bold bg-rose-600 hover:bg-rose-700 cursor-pointer"
                >
                  <Trash2 className="w-3.5 h-3.5 mr-1" />
                  {isDeleting ? 'Deleting...' : 'Yes, Delete Vehicle'}
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setShowDeleteConfirm(false)}
                  className="h-8 text-xs font-medium border-rose-200 text-rose-700 hover:bg-rose-100 cursor-pointer"
                >
                  Cancel
                </Button>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <DialogFooter className="p-4 bg-slate-50/80 dark:bg-slate-800/50 border-t border-slate-100 dark:border-slate-800 flex flex-row items-center justify-between gap-2">
          <div>
            {!showDeleteConfirm && (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => setShowDeleteConfirm(true)}
                className="h-8 text-xs font-semibold text-rose-600 hover:text-rose-700 hover:bg-rose-50 dark:hover:bg-rose-950/40 gap-1.5 cursor-pointer"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Delete Vehicle</span>
              </Button>
            )}
          </div>

          <div className="flex items-center gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={onClose}
              className="h-8 text-xs font-medium border-slate-200 dark:border-slate-700 cursor-pointer"
            >
              Cancel
            </Button>
            <Button
              type="button"
              size="sm"
              disabled={isSaving}
              onClick={handleSave}
              className="h-8 text-xs font-bold bg-brand hover:bg-brand/90 text-white gap-1.5 shadow-2xs cursor-pointer"
            >
              <Save className="w-3.5 h-3.5" />
              <span>{isSaving ? 'Saving...' : 'Save Changes'}</span>
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
