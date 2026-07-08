import React, { useState } from "react";
import {
  AlertTriangle, Trash2, CheckCircle2, XCircle, X, Eye, Edit2, MapPin,
  Download, Phone, FileText, Info, Loader2, RotateCcw, Truck, WifiOff,
  Search, Car, Users
} from "lucide-react";
import { Card, SectionHeader, SubHeader } from "./common";

/* ═══════════════════════════════════════════════════════════════════════════ */
/*  MODALS SECTION                                                              */
/* ═══════════════════════════════════════════════════════════════════════════ */
export function ModalsSection() {
  const [openModal, setOpenModal] = useState<string | null>(null);
  const [sheetOpen, setSheetOpen] = useState(false);

  const modals: { key: string; label: string; icon: React.ReactNode; color: string; bg: string; title: string; body: string; cta: string; ctaColor: string }[] = [
    { key: "confirm", label: "Confirmation", icon: <AlertTriangle size={24} />, color: "#D97706", bg: "#FFFBEB", title: "Confirm Action", body: "Are you sure you want to mark this trip as completed? This action cannot be undone.", cta: "Confirm", ctaColor: "#1A1A1A" },
    { key: "delete",  label: "Delete",       icon: <Trash2 size={24} />,        color: "#DC2626", bg: "#FEF2F2", title: "Delete Vehicle",  body: "This will permanently delete TRK-2041 and all associated records. This action cannot be undone.", cta: "Delete", ctaColor: "#DC2626" },
    { key: "warning", label: "Warning",      icon: <AlertTriangle size={24} />, color: "#D97706", bg: "#FFFBEB", title: "Document Expiring", body: "Insurance for TRK-2041 expires in 3 days. Renewing now will avoid trip assignment blocks.", cta: "Renew Now", ctaColor: "#D97706" },
    { key: "success", label: "Success",      icon: <CheckCircle2 size={24} />,  color: "#16A34A", bg: "#F0FDF4", title: "Trip Completed!",   body: "TRP-2387 has been delivered and POD confirmed. The trip is now closed.", cta: "View Summary", ctaColor: "#16A34A" },
    { key: "error",   label: "Error",        icon: <XCircle size={24} />,       color: "#DC2626", bg: "#FEF2F2", title: "Assignment Failed",  body: "Driver Ahmed Kareem is already assigned to an active trip and cannot be assigned to TRP-2390.", cta: "Try Again", ctaColor: "#DC2626" },
  ];

  return (
    <div>
      <SectionHeader title="Modals" desc="Confirmation, delete, warning, success, error dialogs + mobile bottom sheet." />

      <Card className="p-8 mb-6">
        <SubHeader title="Click to Preview" />
        <div className="flex flex-wrap gap-3 mb-6">
          {modals.map((m) => (
            <button key={m.key} onClick={() => setOpenModal(m.key)}
              className="px-4 py-2 rounded-xl bg-[#F0F0F2] text-sm font-semibold text-[#111] hover:bg-[#E5E5E8] transition-colors">
              {m.label}
            </button>
          ))}
          <button onClick={() => setSheetOpen(true)}
            className="px-4 py-2 rounded-xl bg-[#E8450F] text-white text-sm font-semibold hover:bg-[#C7380A] transition-colors">
            Bottom Sheet ↑
          </button>
        </div>

        {/* Modal grid — static previews */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {modals.map((m) => (
            <div key={m.key} className="rounded-2xl border border-black/[0.08] bg-white overflow-hidden shadow-sm">
              <div className="p-5">
                <div className="w-12 h-12 rounded-2xl flex items-center justify-center mb-4" style={{ background: m.bg, color: m.color }}>{m.icon}</div>
                <p className="text-base font-bold text-[#111] mb-1">{m.title}</p>
                <p className="text-xs text-[#6E6E80] leading-relaxed mb-5">{m.body}</p>
                <div className="flex gap-2">
                  <button className="flex-1 py-2.5 rounded-xl bg-[#F0F0F2] text-sm font-semibold text-[#444]">Cancel</button>
                  <button className="flex-1 py-2.5 rounded-xl text-white text-sm font-semibold" style={{ background: m.ctaColor }}>{m.cta}</button>
                </div>
              </div>
              <div className="px-5 py-2 bg-[#F5F5F7] border-t border-black/[0.06]">
                <span className="text-[10px] font-semibold text-[#9898A4] uppercase tracking-wider">Modal/{m.label}</span>
              </div>
            </div>
          ))}
        </div>
      </Card>

      {/* Bottom Sheet static */}
      <Card className="p-8">
        <SubHeader title="Bottom Sheet — Mobile" />
        <div className="max-w-sm mx-auto">
          <div className="rounded-t-3xl bg-white border border-black/[0.08] shadow-xl overflow-hidden">
            <div className="flex justify-center pt-3 pb-1">
              <div className="w-10 h-1 rounded-full bg-[#D8D8DC]" />
            </div>
            <div className="px-5 py-4">
              <p className="text-base font-bold text-[#111] mb-1">Trip Actions</p>
              <p className="text-xs text-[#6E6E80] mb-5">TRP-2387 · Riyadh → Jeddah</p>
              {[
                { icon: <Eye size={18} />, label: "View Trip Details", sub: "Full trip information" },
                { icon: <Edit2 size={18} />, label: "Edit Trip", sub: "Modify route or cargo" },
                { icon: <MapPin size={18} />, label: "Track on Map", sub: "Live driver location" },
                { icon: <Download size={18} />, label: "Download POD", sub: "Proof of delivery PDF" },
                { icon: <Trash2 size={18} />, label: "Cancel Trip", sub: "Remove from schedule", danger: true },
              ].map((a) => (
                <button key={a.label} className={`w-full flex items-center gap-3 py-3 border-b border-black/[0.05] last:border-0 text-left hover:bg-[#F5F5F7] -mx-1 px-1 rounded-lg transition-colors ${(a as any).danger ? "text-[#DC2626]" : "text-[#111]"}`}>
                  <span className={`w-9 h-9 rounded-xl flex items-center justify-center ${(a as any).danger ? "bg-[#FEF2F2] text-[#DC2626]" : "bg-[#F5F5F7] text-[#6E6E80]"}`}>{a.icon}</span>
                  <div>
                    <p className="text-sm font-semibold">{a.label}</p>
                    <p className="text-xs text-[#9898A4]">{a.sub}</p>
                  </div>
                  <X size={14} className="ml-auto text-[#D8D8DC]" />
                </button>
              ))}
              <button className="w-full mt-4 py-3 rounded-2xl bg-[#F0F0F2] text-sm font-semibold text-[#6E6E80]">Dismiss</button>
            </div>
          </div>
        </div>
      </Card>

      {/* Live modal overlay */}
      {openModal && (() => {
        const m = modals.find((x) => x.key === openModal)!;
        return (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4" onClick={() => setOpenModal(null)}>
            <div className="absolute inset-0 bg-[rgba(0,0,0,0.4)] backdrop-blur-sm" />
            <div className="relative bg-white rounded-3xl shadow-2xl max-w-sm w-full p-6" onClick={(e) => e.stopPropagation()}>
              <div className="w-14 h-14 rounded-2xl flex items-center justify-center mb-5 mx-auto" style={{ background: m.bg, color: m.color }}>{m.icon}</div>
              <p className="text-lg font-bold text-[#111] text-center mb-2">{m.title}</p>
              <p className="text-sm text-[#6E6E80] text-center leading-relaxed mb-6">{m.body}</p>
              <div className="flex gap-3">
                <button onClick={() => setOpenModal(null)} className="flex-1 py-3 rounded-2xl bg-[#F0F0F2] text-sm font-semibold text-[#444] hover:bg-[#E5E5E8]">Cancel</button>
                <button onClick={() => setOpenModal(null)} className="flex-1 py-3 rounded-2xl text-white text-sm font-semibold" style={{ background: m.ctaColor }}>{m.cta}</button>
              </div>
            </div>
          </div>
        );
      })()}

      {/* Live bottom sheet */}
      {sheetOpen && (
        <div className="fixed inset-0 z-[100] flex items-end" onClick={() => setSheetOpen(false)}>
          <div className="absolute inset-0 bg-[rgba(0,0,0,0.4)] backdrop-blur-sm" />
          <div className="relative w-full bg-white rounded-t-3xl shadow-2xl p-5 pb-8 max-w-lg mx-auto" onClick={(e) => e.stopPropagation()}>
            <div className="flex justify-center mb-3"><div className="w-10 h-1 rounded-full bg-[#D8D8DC]" /></div>
            <p className="text-base font-bold text-[#111] mb-4">Export Trip Report</p>
            {[{ icon: <FileText size={18} />, label: "Export as PDF" }, { icon: <Download size={18} />, label: "Export as Excel" }, { icon: <Phone size={18} />, label: "Share via WhatsApp" }].map((a) => (
              <button key={a.label} className="w-full flex items-center gap-3 py-3 text-sm font-semibold text-[#111] hover:bg-[#F5F5F7] rounded-xl px-2">
                <span className="w-9 h-9 bg-[#F5F5F7] rounded-xl flex items-center justify-center text-[#6E6E80]">{a.icon}</span>
                {a.label}
              </button>
            ))}
            <button onClick={() => setSheetOpen(false)} className="w-full mt-3 py-3 rounded-2xl bg-[#F0F0F2] text-sm font-semibold text-[#6E6E80]">Cancel</button>
          </div>
        </div>
      )}
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════════════════ */
/*  TOASTS SECTION                                                              */
/* ═══════════════════════════════════════════════════════════════════════════ */
export const TOAST_VARIANTS = [
  { type: "success", icon: <CheckCircle2 size={18} />, color: "#16A34A", bg: "#F0FDF4", border: "#BBF7D0", title: "Trip Completed", body: "TRP-2387 delivered and POD confirmed." },
  { type: "error",   icon: <XCircle size={18} />,      color: "#DC2626", bg: "#FEF2F2", border: "#FECACA", title: "Assignment Failed", body: "Driver is already on an active trip." },
  { type: "warning", icon: <AlertTriangle size={18} />,color: "#D97706", bg: "#FFFBEB", border: "#FDE68A", title: "Document Expiring", body: "Insurance for TRK-2041 expires in 3 days." },
  { type: "info",    icon: <Info size={18} />,          color: "#2563EB", bg: "#EFF6FF", border: "#BFDBFE", title: "New Trip Assigned", body: "TRP-2390 has been assigned to your queue." },
  { type: "loading", icon: <Loader2 size={18} className="animate-spin" />, color: "#6E6E80", bg: "#F5F5F7", border: "#D8D8DC", title: "Uploading POD…", body: "Please wait while documents are uploaded." },
  { type: "undo",    icon: <RotateCcw size={18} />,     color: "#1A1A1A", bg: "#F5F5F7", border: "#D8D8DC", title: "Trip Cancelled", body: "TRP-2389 was cancelled.", undo: true },
];

export function ToastsSection() {
  const [activeToast, setActiveToast] = useState<string | null>(null);

  return (
    <div>
      <SectionHeader title="Toasts" desc="Contextual notifications — success, error, info, warning, loading, undo." />

      <Card className="p-8 mb-6">
        <SubHeader title="All Variants" />
        <div className="space-y-3 max-w-md">
          {TOAST_VARIANTS.map((t) => (
            <div key={t.type} className="flex items-start gap-3 px-4 py-3.5 rounded-2xl border" style={{ background: t.bg, borderColor: t.border }}>
              <span style={{ color: t.color, marginTop: 1 }}>{t.icon}</span>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-[#111]">{t.title}</p>
                <p className="text-xs text-[#6E6E80] mt-0.5">{t.body}</p>
              </div>
              {(t as any).undo && (
                <button className="text-xs font-bold text-[#E8450F] shrink-0 hover:underline">Undo</button>
              )}
              <button className="text-[#9898A4] hover:text-[#444] shrink-0"><X size={14} /></button>
            </div>
          ))}
        </div>
      </Card>

      <Card className="p-8">
        <SubHeader title="Live Trigger" />
        <div className="flex flex-wrap gap-2 mb-4">
          {TOAST_VARIANTS.map((t) => (
            <button key={t.type} onClick={() => { setActiveToast(t.type); setTimeout(() => setActiveToast(null), 3000); }}
              className="px-3 py-1.5 rounded-lg bg-[#F0F0F2] text-xs font-semibold text-[#444] hover:bg-[#E5E5E8] capitalize transition-colors">
              {t.type}
            </button>
          ))}
        </div>
        <p className="text-xs text-[#9898A4]">Toast auto-dismisses after 3 seconds</p>
        {activeToast && (() => {
          const t = TOAST_VARIANTS.find((x) => x.type === activeToast)!;
          return (
            <div className="fixed bottom-6 right-6 z-[200] flex items-start gap-3 px-4 py-3.5 rounded-2xl border shadow-xl max-w-xs"
              style={{ background: t.bg, borderColor: t.border }}>
              <span style={{ color: t.color, marginTop: 1 }}>{t.icon}</span>
              <div className="flex-1">
                <p className="text-sm font-semibold text-[#111]">{t.title}</p>
                <p className="text-xs text-[#6E6E80] mt-0.5">{t.body}</p>
              </div>
              <button onClick={() => setActiveToast(null)} className="text-[#9898A4]"><X size={14} /></button>
            </div>
          );
        })()}
      </Card>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════════════════ */
/*  EMPTY STATES SECTION                                                        */
/* ═══════════════════════════════════════════════════════════════════════════ */
export const EMPTY_STATES: {
  key: string; Icon: React.ElementType; iconColor: string; iconBg: string;
  title: string; body: string; cta: string; ctaColor?: string;
}[] = [
  { key: "trips",    Icon: Truck,    iconColor: "#E8450F", iconBg: "#FFF0EB", title: "No Trips Yet",       body: "Create your first trip to start tracking deliveries.", cta: "Create Trip" },
  { key: "drivers",  Icon: Users,    iconColor: "#2563EB", iconBg: "#EFF6FF", title: "No Drivers Found",   body: "Add your first driver to begin assigning trips.", cta: "Add Driver" },
  { key: "vehicles", Icon: Car,      iconColor: "#16A34A", iconBg: "#F0FDF4", title: "No Vehicles",        body: "Register a vehicle to start managing your fleet.", cta: "Add Vehicle" },
  { key: "docs",     Icon: FileText, iconColor: "#7C3AED", iconBg: "#F5F3FF", title: "No Documents",       body: "Upload vehicle documents to track renewals and compliance.", cta: "Upload Document" },
  { key: "offline",  Icon: WifiOff,  iconColor: "#DC2626", iconBg: "#FEF2F2", title: "No Internet",        body: "Check your connection. Some features may be unavailable offline.", cta: "Retry", ctaColor: "#DC2626" },
  { key: "search",   Icon: Search,   iconColor: "#6E6E80", iconBg: "#F5F5F7", title: "No Results Found",   body: "Try adjusting your search terms or filters to find what you need.", cta: "Clear Filters" },
];

export function EmptyStatesSection() {
  return (
    <div>
      <SectionHeader title="Empty States" desc="Friendly zero-state screens for every list and data view." />
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {EMPTY_STATES.map((e) => (
          <Card key={e.key} className="p-8 flex flex-col items-center text-center">
            <div className="w-16 h-16 rounded-2xl flex items-center justify-center mb-4" style={{ background: e.iconBg }}>
              <e.Icon size={28} style={{ color: e.iconColor }} strokeWidth={1.8} />
            </div>
            <p className="text-base font-bold text-[#111] mb-1.5">{e.title}</p>
            <p className="text-xs text-[#6E6E80] leading-relaxed mb-5">{e.body}</p>
            <button className="px-5 py-2 rounded-xl text-sm font-semibold text-white hover:opacity-90 transition-opacity" style={{ background: e.ctaColor ?? "#E8450F" }}>{e.cta}</button>
            <p className="text-[9px] text-[#9898A4] mt-4 uppercase tracking-wider font-semibold">EmptyState/{e.key}</p>
          </Card>
        ))}
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════════════════ */
/*  SKELETONS SECTION                                                           */
/* ═══════════════════════════════════════════════════════════════════════════ */
export function Shimmer({ className = "" }: { className?: string }) {
  return <div className={`rounded-lg bg-gradient-to-r from-[#EBEBED] via-[#F5F5F7] to-[#EBEBED] animate-pulse ${className}`} />;
}

export function SkeletonsSection() {
  return (
    <div>
      <SectionHeader title="Skeletons" desc="Loading placeholders that mirror content structure." />

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
        <Card className="p-6">
          <p className="text-xs font-semibold text-[#6E6E80] uppercase tracking-wider mb-4">Trip Card Skeleton</p>
          {[1, 2, 3].map((i) => (
            <div key={i} className="flex items-center gap-3 py-3 border-b border-[#F0F0F2] last:border-0">
              <Shimmer className="w-10 h-10 rounded-xl shrink-0" />
              <div className="flex-1 space-y-2">
                <Shimmer className="h-3 w-24" />
                <Shimmer className="h-2.5 w-40" />
                <Shimmer className="h-2 w-32" />
              </div>
              <Shimmer className="h-5 w-16 rounded-full" />
            </div>
          ))}
        </Card>

        <Card className="p-6">
          <p className="text-xs font-semibold text-[#6E6E80] uppercase tracking-wider mb-4">Vehicle Card Skeleton</p>
          <Shimmer className="h-24 rounded-2xl mb-4" />
          <div className="space-y-3">
            {[70, 55, 85, 60].map((w, i) => (
              <div key={i} className="flex items-center justify-between">
                <Shimmer className="h-3" style={{ width: `${w * 0.4}%` } as any} />
                <Shimmer className="h-3 w-16" />
              </div>
            ))}
          </div>
        </Card>
      </div>

      <Card className="p-6 mb-6">
        <p className="text-xs font-semibold text-[#6E6E80] uppercase tracking-wider mb-4">Dashboard Skeleton</p>
        <div className="grid grid-cols-2 md:grid-cols-5 gap-3 mb-6">
          {[1,2,3,4,5].map((i) => (
            <div key={i} className="rounded-2xl bg-[#1C1C1E] p-4 space-y-2">
              <Shimmer className="w-5 h-5 rounded bg-[#2A2A30]" />
              <Shimmer className="h-6 w-12 bg-[#2A2A30] rounded" />
              <Shimmer className="h-2.5 w-full bg-[#2A2A30] rounded" />
            </div>
          ))}
        </div>
        <Shimmer className="h-40 rounded-2xl" />
      </Card>

      <Card className="p-6">
        <p className="text-xs font-semibold text-[#6E6E80] uppercase tracking-wider mb-4">Table Skeleton</p>
        <div className="space-y-0">
          <div className="flex gap-4 py-2 border-b border-[#F0F0F2]">
            {[40, 80, 60, 50, 60].map((w, i) => <Shimmer key={i} className="h-3 rounded" style={{ width: `${w}px` } as any} />)}
          </div>
          {[1,2,3,4,5].map((row) => (
            <div key={row} className="flex gap-4 py-3 border-b border-[#F0F0F2] last:border-0">
              <Shimmer className="w-4 h-4 rounded shrink-0" />
              <Shimmer className="h-3 w-20" />
              <Shimmer className="h-3 w-28" />
              <Shimmer className="h-5 w-16 rounded-full" />
              <Shimmer className="h-3 w-24" />
              <Shimmer className="h-3 w-16" />
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}
