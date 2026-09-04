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
  Compass,
  ChevronDown,
  Truck,
  CalendarRange,
  Users,
  Car,
  Building2,
  Wrench,
  History,
  RotateCcw,
  Trash2,
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

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
  hasSavedDraft?: boolean;
  restoreDraft?: () => void;
  discardDraft?: () => void;
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
  hasSavedDraft,
  restoreDraft,
  discardDraft,
}) => {
  const navigate = useNavigate();

  if (submissionResult) return null;

  const steps = [
    { step: 1 as const, label: '1. Configure & Dispatch', icon: MapPin },
    { step: 2 as const, label: '2. Review & Submit', icon: CheckCircle2 },
  ];

  return (
    <div className="border-b border-black/[0.06] bg-white dark:bg-slate-900 shrink-0 grid grid-cols-3 items-center px-5 py-2.5 gap-3 w-full">
      {/* Top Left: Cancel / Back Actions & Navigation Launcher */}
      <div className="flex items-center gap-2 justify-start shrink-0">
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

        {/* SOLUTION 1: INLINE MODULE NAVIGATION LAUNCHER DROPDOWN */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              type="button"
              variant="outline"
              className="h-8 rounded-xl border border-slate-200/80 text-xs font-bold bg-white hover:bg-slate-50 text-slate-700 dark:bg-slate-800 dark:text-slate-200 gap-1.5 shadow-2xs cursor-pointer"
            >
              <Compass className="w-3.5 h-3.5 text-brand" />
              <span>Navigate Page</span>
              <ChevronDown className="w-3 h-3 text-slate-400" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start" className="w-52 z-[9999]">
            <DropdownMenuLabel className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider">
              Quick Module Navigation
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={() => navigate('/trips?view=kanban')} className="text-xs font-bold gap-2 cursor-pointer">
              <Truck className="w-3.5 h-3.5 text-orange-500" /> Trips Kanban Board
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => navigate('/trips/monthly')} className="text-xs font-bold gap-2 cursor-pointer">
              <CalendarRange className="w-3.5 h-3.5 text-purple-600" /> Monthly Board
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => navigate('/drivers')} className="text-xs font-bold gap-2 cursor-pointer">
              <Users className="w-3.5 h-3.5 text-emerald-600" /> Drivers Directory
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => navigate('/vehicles')} className="text-xs font-bold gap-2 cursor-pointer">
              <Car className="w-3.5 h-3.5 text-blue-600" /> Fleet Vehicles
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => navigate('/customers')} className="text-xs font-bold gap-2 cursor-pointer">
              <Building2 className="w-3.5 h-3.5 text-indigo-600" /> Customer Accounts
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => navigate('/maintenance')} className="text-xs font-bold gap-2 cursor-pointer">
              <Wrench className="w-3.5 h-3.5 text-rose-500" /> Fleet Maintenance
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {/* Center: Stepper Pills — Mathematically Centered */}
      <div className="flex items-center justify-center gap-2">
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
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold transition-all whitespace-nowrap disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer ${
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

      {/* Top Right: Restore Draft (if any) + Next / Submit Primary Action */}
      <div className="flex items-center gap-2 justify-end shrink-0">
        {hasSavedDraft && contractStep === 1 && restoreDraft && discardDraft && (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="h-8 text-xs font-bold border-amber-300/80 bg-amber-50 dark:bg-amber-950/40 text-amber-900 dark:text-amber-200 hover:bg-amber-100/80 rounded-xl px-2.5 gap-1.5 shadow-2xs cursor-pointer shrink-0"
              >
                <History className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                <span>Saved Draft</span>
                <ChevronDown className="w-3 h-3 text-amber-500 shrink-0" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-48 z-[9999]">
              <DropdownMenuLabel className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider">
                Draft Options
              </DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={restoreDraft} className="text-xs font-bold gap-2 text-emerald-700 dark:text-emerald-400 cursor-pointer">
                <RotateCcw className="w-3.5 h-3.5 text-emerald-600" /> Restore Saved Draft
              </DropdownMenuItem>
              <DropdownMenuItem onClick={discardDraft} className="text-xs font-bold gap-2 text-rose-600 dark:text-rose-400 cursor-pointer">
                <Trash2 className="w-3.5 h-3.5 text-rose-500" /> Discard Saved Draft
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        )}
        {contractStep < 2 ? (
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
            disabled={isPending || !isStepValid(1)}
            onClick={handleContractSubmit}
            className="h-8 rounded-xl px-4 text-xs font-bold bg-brand hover:bg-[#d13d0d] text-white shadow-none disabled:opacity-50 cursor-pointer focus-visible:ring-2 focus-visible:ring-[#FA634E] focus-visible:outline-none"
          >
            {isPending ? (
              <>
                <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" />
                Submitting...
              </>
            ) : (
              <>
                Submit Trip <KbdBadge keys="Ctrl+Enter" />
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
