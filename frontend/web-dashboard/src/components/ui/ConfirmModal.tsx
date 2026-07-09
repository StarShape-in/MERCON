import { AlertTriangle, X } from 'lucide-react';
import Btn from './Btn';

interface ConfirmModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  isDestructive?: boolean;
  isLoading?: boolean;
  children?: React.ReactNode;
}

export default function ConfirmModal({
  isOpen,
  onClose,
  onConfirm,
  title,
  message,
  confirmLabel = 'Confirm',
  cancelLabel = 'Cancel',
  isDestructive = false,
  isLoading = false,
  children,
}: ConfirmModalProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-black/40 backdrop-blur-[2px] transition-opacity"
        onClick={isLoading ? undefined : onClose}
      />
      
      {/* Modal Dialog */}
      <div className="bg-white w-full max-w-sm rounded-[24px] border border-black/[0.08] shadow-2xl overflow-hidden relative z-10 animate-fade-in p-6">
        <button 
          onClick={onClose}
          disabled={isLoading}
          className="absolute right-4 top-4 text-gray-400 hover:text-gray-600 disabled:opacity-50 transition-colors"
        >
          <X size={18} />
        </button>

        <div className="flex flex-col items-center text-center mt-2">
          <div className={`w-12 h-12 rounded-2xl flex items-center justify-center mb-4 ${
            isDestructive ? 'bg-red-50 text-red-500' : 'bg-amber-50 text-amber-500'
          }`}>
            <AlertTriangle size={24} className="stroke-[2.2]" />
          </div>

          <h3 className="text-base font-bold text-[#1C1C2E] px-4 leading-tight">{title}</h3>
          <p className="text-xs text-[#6E6E80] mt-2 font-medium px-2">{message}</p>
        </div>

        {/* Custom Form/Inputs Slot */}
        {children && <div className="w-full mt-3">{children}</div>}

        <div className="flex gap-3 mt-6">
          <Btn 
            label={cancelLabel}
            variant="secondary"
            onClick={onClose}
            disabled={isLoading}
            className="flex-1"
          />
          <Btn 
            label={confirmLabel}
            variant={isDestructive ? 'primary' : 'secondary'}
            onClick={onConfirm}
            disabled={isLoading}
            className={`flex-1 ${isDestructive ? 'bg-[#DC2626] hover:bg-[#B91C1C] hover:shadow-red-500/10' : ''}`}
          />
        </div>
      </div>
    </div>
  );
}
