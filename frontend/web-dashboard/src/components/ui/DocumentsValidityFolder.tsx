import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  FileText, ShieldCheck, AlertTriangle, Award, CheckCircle2 
} from 'lucide-react';

interface DocumentItem {
  id: string;
  name: string;
  status: string;
  icon: React.ElementType;
  iconColor: string;
  strokeColor: string;
  badgeBg: string;
  badgeText: string;
  badgeBorder: string;
  dotColor: string;
}

interface DocumentsValidityFolderProps {
  vehicleId?: string;
}

export default function DocumentsValidityFolder({ vehicleId }: DocumentsValidityFolderProps) {
  const navigate = useNavigate();
  const [hoveredId, setHoveredId] = useState<string | null>(null);

  const documents: DocumentItem[] = [
    {
      id: 'istimara',
      name: 'Istimara',
      status: 'Valid (15 Oct 2027)',
      icon: FileText,
      iconColor: 'text-[#2563EB]',
      strokeColor: '#CBD5E1',
      badgeBg: 'bg-[#DCFCE7]',
      badgeText: 'text-[#15803D]',
      badgeBorder: 'border-[#A7F3D0]',
      dotColor: 'bg-[#16A34A]',
    },
    {
      id: 'insurance',
      name: 'Insurance',
      status: 'Valid (10 Jan 2027)',
      icon: ShieldCheck,
      iconColor: 'text-[#7C3AED]',
      strokeColor: '#CBD5E1',
      badgeBg: 'bg-[#DCFCE7]',
      badgeText: 'text-[#15803D]',
      badgeBorder: 'border-[#A7F3D0]',
      dotColor: 'bg-[#16A34A]',
    },
    {
      id: 'operation_card',
      name: 'Operation Card',
      status: 'Expiring 28 Sep',
      icon: AlertTriangle,
      iconColor: 'text-[#EA580C]',
      strokeColor: '#CBD5E1',
      badgeBg: 'bg-[#FEF3C7]',
      badgeText: 'text-[#C2410C]',
      badgeBorder: 'border-[#FDE68A]',
      dotColor: 'bg-[#EA580C]',
    },
    {
      id: 'saso_plates',
      name: 'SASO Plates',
      status: 'Valid (04 Nov 2028)',
      icon: Award,
      iconColor: 'text-[#7C3AED]',
      strokeColor: '#CBD5E1',
      badgeBg: 'bg-[#DCFCE7]',
      badgeText: 'text-[#15803D]',
      badgeBorder: 'border-[#A7F3D0]',
      dotColor: 'bg-[#16A34A]',
    },
    {
      id: 'fahas',
      name: 'FAHAS',
      status: 'Valid (20 May 2027)',
      icon: CheckCircle2,
      iconColor: 'text-[#059669]',
      strokeColor: '#CBD5E1',
      badgeBg: 'bg-[#DCFCE7]',
      badgeText: 'text-[#15803D]',
      badgeBorder: 'border-[#A7F3D0]',
      dotColor: 'bg-[#16A34A]',
    },
  ];

  return (
    <div className="bg-white border border-slate-200/80 rounded-2xl p-4 sm:p-5 shadow-2xs flex flex-col justify-between h-[410px] max-h-[410px] relative overflow-hidden select-none">
      
      {/* ── Top Header Bar ── */}
      <div className="flex items-center justify-between z-10 mb-2 shrink-0">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl bg-orange-50 border border-orange-200/80 flex items-center justify-center shrink-0 shadow-2xs">
            <FileText className="w-4.5 h-4.5 text-[#FA634E] stroke-[2]" />
          </div>
          <h2 className="text-base sm:text-lg font-bold text-slate-900 tracking-tight">
            Documents &amp; Validity
          </h2>
        </div>
      </div>

      {/* ── Folder Pocket & Stacked Index Cards ── */}
      <div className="relative flex-1 flex flex-col justify-between pt-1 pb-1 min-h-0">
        
        {/* Back-to-Front Stacked Index Tabs */}
        <div className="relative w-full flex-1 flex flex-col justify-between space-y-[-8px]">
          {documents.map((doc, index) => {
            const Icon = doc.icon;
            const isHovered = hoveredId === doc.id;

            // Base z-index stacks lower cards over upper cards in resting state.
            // Hovered card gets highest z-index 100 to float cleanly above all cards.
            const baseZIndex = (index + 1) * 10;
            const computedZIndex = isHovered ? 100 : baseZIndex;

            return (
              <div
                key={doc.id}
                onMouseEnter={() => setHoveredId(doc.id)}
                onMouseLeave={() => setHoveredId(null)}
                onClick={() => vehicleId && navigate(`/vehicles/${vehicleId}/documents`)}
                style={{ zIndex: computedZIndex }}
                className={`
                  relative w-full h-[58px] cursor-pointer
                  transition-all duration-300 ease-out transform
                  ${isHovered 
                    ? '-translate-y-3' 
                    : 'hover:-translate-y-1'
                  }
                `}
              >
                {/* SVG Background Path & Continuous Vertical Side Lines */}
                <svg className="absolute inset-0 w-full h-full overflow-visible" viewBox="0 0 400 58" preserveAspectRatio="none">
                  {/* Side borders extend down to y=66 so they touch and connect to the card below in resting state */}
                  <path 
                    d="M0,66 L0,14 C0,6 6,0 14,0 L215,0 C230,0 240,7 255,7 L386,7 C394,7 400,13 400,21 L400,66" 
                    fill="#FFFFFF"
                    stroke={isHovered ? "#64748B" : doc.strokeColor}
                    strokeWidth="1.2"
                  />
                  {isHovered && (
                    <>
                      {/* Vertical side guide lines extending down to touch card below during hover */}
                      <line x1="0" y1="66" x2="0" y2="78" stroke="#475569" strokeWidth="1.2" />
                      <line x1="400" y1="66" x2="400" y2="78" stroke="#475569" strokeWidth="1.2" />
                    </>
                  )}
                </svg>

                {/* Content Overlay */}
                <div className="relative z-10 w-full h-full px-4 flex items-center justify-between">
                  {/* Left: Icon + Document Title */}
                  <div className="flex items-center gap-3 pt-0.5">
                    <Icon className={`w-5 h-5 ${doc.iconColor} stroke-[2.2] shrink-0`} />
                    <span className="text-xs sm:text-sm font-bold text-slate-800 tracking-tight">
                      {doc.name}
                    </span>
                  </div>

                  {/* Right: Status Pill Badge */}
                  <div className="pt-2">
                    <div className={`inline-flex items-center gap-1.5 px-3 py-0.5 rounded-full text-[11px] font-medium ${doc.badgeBg} ${doc.badgeText} border ${doc.badgeBorder} shadow-2xs shrink-0`}>
                      <span className={`w-2 h-2 rounded-full ${doc.dotColor} shrink-0`}></span>
                      <span>{doc.status}</span>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

      </div>

    </div>
  );
}
