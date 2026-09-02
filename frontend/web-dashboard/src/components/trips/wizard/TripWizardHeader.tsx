import React from 'react';
import {
  ChevronLeft,
  ChevronRight,
  User,
  MapPin,
  Layers,
  CheckCircle2,
  Loader2,
  X,
} from 'lucide-react';
import { useLayoutMeta } from '@/context/LayoutContext';
import { Button } from '@/components/ui/button';

interface TripWizardHeaderProps {
  contractStep: 1 | 2;
  submissionResult: any;
  isStepValid: (step: number) => boolean;
  canNavigateToStep: (step: number) => boolean;
  setContractStep: (step: 1 | 2 | ((prev: 1 | 2) => 1 | 2)) => void;
  handleContractSubmit: () => void;
  handleDialogClose: () => void;
  isPending: boolean;
  batchTripRowsCount: number;
  KbdBadge: React.ComponentType<{ keys: string }>;
}

export const TripWizardHeader: React.FC<TripWizardHeaderProps> = ({
  contractStep,
  submissionResult,
  isStepValid,
  canNavigateToStep,
  setContractStep,
  handleContractSubmit,
  handleDialogClose,
  isPending,
  batchTripRowsCount,
  KbdBadge,
}) => {
  const { isHeaderCollapsed, toggleHeaderCollapsed } = useLayoutMeta();

  if (submissionResult) return null;

  const steps = [
    { step: 1 as const, label: '1. Configure & Dispatch', icon: MapPin },
    { step: 2 as const, label: '2. Review & Submit', icon: CheckCircle2 },
  ];

  return (
    <div className="border-b border-black/[0.06] bg-white dark:bg-slate-900 shrink-0 flex items-center justify-between px-5 py-2.5 gap-3">
      {/* Top Left: Cancel / Back Actions & Header Toggle */}
      <div className="flex items-center gap-2 shrink-0">
        {contractStep > 1 ? (
          <Button
            type="button"
            variant="outline"
            onClick={() => setContractStep((prev) => (prev - 1) as any)}
            className="h-8 rounded-xl border border-slate-200/80 text-xs font-bold bg-slate-50 hover:bg-slate-100 text-slate-600 dark:bg-slate-800 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-700 transition-colors shadow-2xs"
          >
            <ChevronLeft className="w-3.5 h-3.5 mr-1" />
            Back <KbdBadge keys="Esc" />
          </Button>
        ) : (
          <Button
            type="button"
            variant="outline"
            onClick={handleDialogClose}
            className="h-8 rounded-xl border border-slate-200/80 text-xs font-bold bg-slate-50 hover:bg-slate-100 text-slate-600 dark:bg-slate-800 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-700 transition-colors shadow-2xs"
          >
            <ChevronLeft className="w-3.5 h-3.5 mr-1" />
            Cancel <KbdBadge keys="Esc" />
          </Button>
        )}

        {/* HEADER COLLAPSE / MAXIMIZE WORKSPACE TOGGLE */}
        <Button
          type="button"
          variant="outline"
          onClick={toggleHeaderCollapsed}
          className="h-8 rounded-xl border border-slate-200/80 text-xs font-bold bg-white hover:bg-slate-50 text-slate-700 dark:bg-slate-800 dark:text-slate-200 shadow-2xs cursor-pointer"
          title={isHeaderCollapsed ? "Restore navigation header" : "Maximize vertical workspace height"}
        >
          {isHeaderCollapsed ? '⤡ Restore Header' : '⤢ Maximize Workspace'}
        </Button>
      </div>

      {/* Center: Stepper Pills */}
      <div className="flex items-center gap-1.5 overflow-x-auto">
        {steps.map((s) => {
          const IconComp = s.icon;
          const isActive = contractStep === s.step;
          const isPassed = contractStep > s.step;

          return (
            <button
              key={s.step}
              type="button"
              disabled={!canNavigateToStep(s.step)}
              onClick={() => setContractStep(s.step)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold transition-all whitespace-nowrap disabled:opacity-40 disabled:cursor-not-allowed ${
                isActive
                  ? 'bg-brand text-white shadow-xs ring-1 ring-brand/20'
                  : isPassed
                  ? 'bg-orange-50 text-brand border border-orange-200 hover:bg-orange-100'
                  : 'bg-white dark:bg-slate-800 text-[#6E6E80] border border-slate-200/80 dark:border-slate-700 hover:bg-slate-50 hover:text-slate-600'
              }`}
            >
              {IconComp && (
                <IconComp className={`w-3.5 h-3.5 ${isActive ? 'text-white' : isPassed ? 'text-brand' : 'text-slate-400'}`} />
              )}
              <span>{s.label}</span>
              {isPassed && <CheckCircle2 className="w-3 h-3 text-brand ml-0.5" />}
            </button>
          );
        })}
      </div>

      {/* Top Right: Next / Done Primary Action & Close */}
      <div className="flex items-center gap-2 shrink-0">
        {contractStep < 4 ? (
          <Button
            id="wizard-next-btn"
            type="button"
            disabled={!isStepValid(contractStep)}
            onClick={() => setContractStep((prev) => (prev + 1) as any)}
            className="h-8 rounded-xl px-4 text-xs font-bold bg-brand hover:bg-[#d13d0d] text-white shadow-none disabled:opacity-50 gap-1 cursor-pointer focus-visible:ring-2 focus-visible:ring-[#FA634E] focus-visible:outline-none"
          >
            Next
            <ChevronRight className="w-3.5 h-3.5 ml-1" />
            <KbdBadge keys="Ctrl+S" />
          </Button>
        ) : (
          <Button
            id="wizard-submit-btn"
            type="button"
            disabled={isPending || batchTripRowsCount === 0 || !isStepValid(3)}
            onClick={handleContractSubmit}
            className="h-8 rounded-xl px-4 text-xs font-bold bg-brand hover:bg-[#d13d0d] text-white shadow-none disabled:opacity-50 cursor-pointer focus-visible:ring-2 focus-visible:ring-[#FA634E] focus-visible:outline-none"
          >
            {isPending ? (
              <>
                <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" />
                Saving...
              </>
            ) : (
              <>
                Done <KbdBadge keys="Ctrl+Enter" />
              </>
            )}
          </Button>
        )}

        <button
          type="button"
          onClick={handleDialogClose}
          className="p-1.5 rounded-full text-slate-400 hover:text-slate-600 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
          title="Close"
        >
          <X className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
};

export default TripWizardHeader;
