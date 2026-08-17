import { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { FolderOpen } from 'lucide-react';
import { driverService } from '@/services/driverService';
import { vehicleService } from '@/services/vehicleService';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from './dialog';
import { Combobox, type ComboboxOption } from './combobox';
import Btn from './Btn';

interface OwnerFolderPickerModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function OwnerFolderPickerModal({ isOpen, onClose }: OwnerFolderPickerModalProps) {
  const navigate = useNavigate();
  const [ownerType, setOwnerType] = useState<'Driver' | 'Vehicle'>('Driver');
  const [ownerId, setOwnerId] = useState('');

  const { data: drivers = [] } = useQuery({
    queryKey: ['drivers', 'lookup'],
    queryFn: async () => (await driverService.getAll()).data,
    enabled: isOpen && ownerType === 'Driver',
  });
  const { data: vehicles = [] } = useQuery({
    queryKey: ['vehicles', 'lookup'],
    queryFn: async () => (await vehicleService.getAll()).data,
    enabled: isOpen && ownerType === 'Vehicle',
  });

  const options: ComboboxOption[] = useMemo(() => {
    if (ownerType === 'Driver') {
      return drivers.map((d: any) => ({ value: d.id, label: `${d.first_name} ${d.last_name}`, keywords: `${d.first_name} ${d.last_name} ${d.license_number || ''}` }));
    }
    return vehicles.map((v: any) => ({ value: v.id, label: v.plate_number || v.ref_id, keywords: `${v.plate_number || ''} ${v.ref_id || ''}` }));
  }, [ownerType, drivers, vehicles]);

  const handleOpen = () => {
    if (!ownerId) return;
    navigate(ownerType === 'Driver' ? `/drivers/${ownerId}/documents` : `/vehicles/${ownerId}/documents`);
    handleClose();
  };

  const handleClose = () => {
    setOwnerId('');
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && handleClose()}>
      <DialogContent className="w-full max-w-md rounded-2xl p-0 border-slate-200 dark:border-slate-800 shadow-xl overflow-hidden">
        <DialogHeader className="px-6 py-4 border-b border-slate-100 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-900">
          <DialogTitle className="text-base font-extrabold text-slate-900 dark:text-slate-100">Open Owner Folder</DialogTitle>
        </DialogHeader>
        <div className="p-6 space-y-4">
          <div>
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">Owner Type</label>
            <div className="flex gap-2">
              {(['Driver', 'Vehicle'] as const).map((t) => (
                <button
                  key={t}
                  onClick={() => { setOwnerType(t); setOwnerId(''); }}
                  className={`flex-1 h-9 rounded-xl text-xs font-bold border transition-all ${
                    ownerType === t ? 'bg-brand text-white border-brand' : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300'
                  }`}
                >
                  {t}
                </button>
              ))}
            </div>
          </div>
          <div>
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">{ownerType}</label>
            <Combobox
              options={options}
              value={ownerId}
              onChange={setOwnerId}
              placeholder={`Select a ${ownerType.toLowerCase()}...`}
            />
          </div>
        </div>
        <DialogFooter className="px-6 py-3 border-t border-slate-100 dark:border-slate-800 flex justify-end gap-2">
          <Btn label="Cancel" variant="outline" onClick={handleClose} />
          <Btn label="Open Folder" icon={<FolderOpen size={16} />} onClick={handleOpen} disabled={!ownerId} />
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
