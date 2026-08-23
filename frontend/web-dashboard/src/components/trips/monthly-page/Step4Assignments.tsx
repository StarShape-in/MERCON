import { useState } from 'react';
import { Calendar, User, RefreshCw, Plus, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Driver } from '@/services/driverService';
import { Vehicle } from '@/services/vehicleService';
import CreateDriverModal from '@/components/drivers/CreateDriverModal';
import CreateVehicleModal from '@/components/fleet/CreateVehicleModal';
import { BatchTripRow, LoopTeam } from './types';

interface Step4AssignmentsProps {
  drivers: Driver[];
  vehicles: Vehicle[];
  assignMode: 'single' | 'alternating';
  onSetAssignMode: (mode: 'single' | 'alternating') => void;
  masterDriver: string;
  onMasterDriverChange: (id: string) => void;
  masterVehicle: string;
  onMasterVehicleChange: (id: string) => void;
  loopTeams: LoopTeam[];
  onAddLoopTeam: () => void;
  onRemoveLoopTeam: (id: string) => void;
  onUpdateLoopTeam: (id: string, updates: Partial<LoopTeam>) => void;
  onApplyMasterToAll: () => void;
  onApplyAlternatingLoop: () => void;
  batchTripRows: BatchTripRow[];
  dayAssignments: Record<string, { driverId: string; vehicleId: string }>;
  onUpdateDayAssignment: (rowKey: string, updates: { driverId: string; vehicleId: string }) => void;
  onToggleDate: (dateStr: string) => void;
  onNext: () => void;
  onBack: () => void;
  onDriverCreated: () => void;
  onVehicleCreated: () => void;
  getDriverLabel: (d: any, list: any[]) => string;
  getVehicleLabel: (v: any) => string;
}

export default function Step4Assignments({
  drivers,
  vehicles,
  assignMode,
  onSetAssignMode,
  masterDriver,
  onMasterDriverChange,
  masterVehicle,
  onMasterVehicleChange,
  loopTeams,
  onAddLoopTeam,
  onRemoveLoopTeam,
  onUpdateLoopTeam,
  onApplyMasterToAll,
  onApplyAlternatingLoop,
  batchTripRows,
  dayAssignments,
  onUpdateDayAssignment,
  onToggleDate,
  onDriverCreated,
  onVehicleCreated,
  getDriverLabel,
  getVehicleLabel,
}: Step4AssignmentsProps) {
  const [isCreateDriverOpen, setIsCreateDriverOpen] = useState(false);
  const [isCreateVehicleOpen, setIsCreateVehicleOpen] = useState(false);

  return (
    <div className="w-full space-y-4 animate-fade-in py-1">
      {/* Assignment Control Bar */}
      <div className="p-4 bg-slate-50/70 dark:bg-slate-950/40 border border-slate-200 dark:border-slate-800 rounded-2xl space-y-3.5 shadow-2xs w-full">
        <div className="flex items-center justify-between flex-wrap gap-2 w-full">
          <label className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider">
            Assignment Model
          </label>
          <div className="flex items-center gap-1 bg-white dark:bg-slate-800 p-0.5 rounded-xl border border-slate-200 dark:border-slate-700 shadow-2xs">
            <button
              type="button"
              onClick={() => onSetAssignMode('single')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 ${
                assignMode === 'single'
                  ? 'bg-brand text-white shadow-xs'
                  : 'text-slate-500 hover:text-slate-900 dark:text-slate-400'
              }`}
            >
              <User className="w-3.5 h-3.5" />
              Single Master Driver
            </button>
            <button
              type="button"
              onClick={() => onSetAssignMode('alternating')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 ${
                assignMode === 'alternating'
                  ? 'bg-indigo-600 text-white shadow-xs'
                  : 'text-slate-500 hover:text-slate-900 dark:text-slate-400'
              }`}
            >
              <RefreshCw className="w-3.5 h-3.5" />
              Alternating A/B Shuttle Loop
            </button>
          </div>
        </div>

        {assignMode === 'single' ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3 items-end pt-1 w-full">
            <div className="lg:col-span-2 space-y-1">
              <div className="flex items-center justify-between">
                <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                  Master Default Driver
                </label>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => setIsCreateDriverOpen(true)}
                  className="h-5 text-[10px] text-brand font-bold p-0"
                >
                  + New Driver
                </Button>
              </div>
              <Select value={masterDriver} onValueChange={onMasterDriverChange}>
                <SelectTrigger className="h-8.5 text-xs font-semibold">
                  <SelectValue placeholder="Select master driver..." />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="unassigned">-- Unassigned --</SelectItem>
                  {drivers.map((d) => (
                    <SelectItem key={d.id} value={d.id}>
                      {getDriverLabel(d, vehicles)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="lg:col-span-2 space-y-1">
              <div className="flex items-center justify-between">
                <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                  Master Default Vehicle
                </label>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => setIsCreateVehicleOpen(true)}
                  className="h-5 text-[10px] text-brand font-bold p-0"
                >
                  + New Vehicle
                </Button>
              </div>
              <Select value={masterVehicle} onValueChange={onMasterVehicleChange}>
                <SelectTrigger className="h-8.5 text-xs font-semibold">
                  <SelectValue placeholder="Select master vehicle..." />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="unassigned">-- Unassigned --</SelectItem>
                  {vehicles.map((v) => (
                    <SelectItem key={v.id} value={v.id}>
                      {getVehicleLabel(v)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Button
                type="button"
                onClick={onApplyMasterToAll}
                className="w-full h-8.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold px-3 shadow-xs"
              >
                Apply to All ({batchTripRows.length})
              </Button>
            </div>
          </div>
        ) : (
          <div className="space-y-3 pt-1 w-full">
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3 w-full">
              {loopTeams.map((team) => (
                <div key={team.id} className="p-3 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-slate-900 dark:text-slate-100">{team.name}</span>
                    {loopTeams.length > 2 && (
                      <button
                        type="button"
                        onClick={() => onRemoveLoopTeam(team.id)}
                        className="text-slate-400 hover:text-rose-600 p-0.5"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                  <Select
                    value={team.driverId || 'unassigned'}
                    onValueChange={(val) => onUpdateLoopTeam(team.id, { driverId: val === 'unassigned' ? '' : val })}
                  >
                    <SelectTrigger className="h-8 text-xs font-medium">
                      <SelectValue placeholder="Driver" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="unassigned">-- Unassigned --</SelectItem>
                      {drivers.map((d) => (
                        <SelectItem key={d.id} value={d.id}>
                          {getDriverLabel(d, vehicles)}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>

                  <Select
                    value={team.vehicleId || 'unassigned'}
                    onValueChange={(val) => onUpdateLoopTeam(team.id, { vehicleId: val === 'unassigned' ? '' : val })}
                  >
                    <SelectTrigger className="h-8 text-xs font-medium">
                      <SelectValue placeholder="Truck" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="unassigned">-- Unassigned --</SelectItem>
                      {vehicles.map((v) => (
                        <SelectItem key={v.id} value={v.id}>
                          {getVehicleLabel(v)}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              ))}
            </div>

            <div className="flex items-center justify-between pt-0.5 w-full">
              <Button
                type="button"
                variant="outline"
                onClick={onAddLoopTeam}
                className="h-8 text-xs font-bold border-indigo-200 text-indigo-600"
              >
                <Plus className="w-3.5 h-3.5 mr-1" />
                Add Shuttle Team
              </Button>

              <Button
                type="button"
                onClick={onApplyAlternatingLoop}
                className="h-8 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold px-4 gap-1.5"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                Apply Shuttle Rotation ({batchTripRows.length})
              </Button>
            </div>
          </div>
        )}
      </div>

      {/* FULL MONTHLY DATES SCHEDULE (31 GENERATED TRIPS) LEDGER */}
      <div className="space-y-2 w-full">
        <div className="flex items-center justify-between">
          <h4 className="text-xs font-bold text-slate-900 dark:text-slate-100 flex items-center gap-1.5">
            <Calendar className="w-3.5 h-3.5 text-brand" />
            Full Monthly Dates Schedule ({batchTripRows.length} Generated Trips)
          </h4>
          <span className="text-[10px] font-semibold text-slate-500">
            Per-date driver & truck assignment overrides
          </span>
        </div>

        <div className="border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden shadow-xs bg-white dark:bg-slate-900 w-full">
          <div className="max-h-[calc(100vh-320px)] min-h-[240px] overflow-y-auto w-full">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 font-bold sticky top-0 z-10">
                <tr>
                  <th className="py-2.5 px-4">Date & Slot</th>
                  <th className="py-2.5 px-4">Assigned Driver</th>
                  <th className="py-2.5 px-4">Assigned Truck</th>
                  <th className="py-2.5 px-4 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {batchTripRows.map((rowItem) => {
                  const currentAssignment = dayAssignments[rowItem.key] || { driverId: '', vehicleId: '' };
                  const effectiveDriver = currentAssignment.driverId || masterDriver;
                  const effectiveVehicle = currentAssignment.vehicleId || masterVehicle;

                  return (
                    <tr key={rowItem.key} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/50">
                      <td className="py-2 px-4 font-semibold text-slate-900 dark:text-slate-100">
                        <div className="flex items-center gap-2">
                          <Calendar className="w-3.5 h-3.5 text-brand" />
                          <span>{rowItem.formattedDate}</span>
                          {rowItem.slotLabel && (
                            <span className="text-[9px] font-bold bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 px-1.5 py-0.5 rounded">
                              {rowItem.slotLabel}
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="py-2 px-4">
                        <Select
                          value={effectiveDriver || 'unassigned'}
                          onValueChange={(val) => {
                            const drvVal = val === 'unassigned' ? '' : val;
                            onUpdateDayAssignment(rowItem.key, {
                              driverId: drvVal,
                              vehicleId: currentAssignment.vehicleId || effectiveVehicle,
                            });
                          }}
                        >
                          <SelectTrigger className="h-8 text-xs font-medium w-64">
                            <SelectValue placeholder="Assign driver..." />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="unassigned">-- Unassigned --</SelectItem>
                            {drivers.map((d) => (
                              <SelectItem key={d.id} value={d.id}>
                                {getDriverLabel(d, vehicles)}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </td>
                      <td className="py-2 px-4">
                        <Select
                          value={effectiveVehicle || 'unassigned'}
                          onValueChange={(val) => {
                            const vehVal = val === 'unassigned' ? '' : val;
                            onUpdateDayAssignment(rowItem.key, {
                              driverId: currentAssignment.driverId || effectiveDriver,
                              vehicleId: vehVal,
                            });
                          }}
                        >
                          <SelectTrigger className="h-8 text-xs font-medium w-64">
                            <SelectValue placeholder="Assign truck..." />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="unassigned">-- Unassigned --</SelectItem>
                            {vehicles.map((v) => (
                              <SelectItem key={v.id} value={v.id}>
                                {getVehicleLabel(v)}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </td>
                      <td className="py-2 px-4 text-right">
                        <button
                          type="button"
                          onClick={() => onToggleDate(rowItem.dateStr)}
                          className="p-1 text-slate-400 hover:text-rose-600"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      <CreateDriverModal
        isOpen={isCreateDriverOpen}
        onClose={() => setIsCreateDriverOpen(false)}
        onSuccess={() => {
          setIsCreateDriverOpen(false);
          onDriverCreated();
        }}
      />

      <CreateVehicleModal
        isOpen={isCreateVehicleOpen}
        onClose={() => setIsCreateVehicleOpen(false)}
        onSuccess={() => {
          setIsCreateVehicleOpen(false);
          onVehicleCreated();
        }}
      />
    </div>
  );
}
