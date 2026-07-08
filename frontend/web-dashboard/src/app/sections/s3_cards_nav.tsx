import React, { useState } from "react";
import {
  Truck, MapPin, ArrowRight, ChevronRight, Package, CheckCircle2, Clock,
  XCircle, Activity, Settings, AlertTriangle, FileText, Home, Users,
  Plus, MoreHorizontal, Calendar
} from "lucide-react";
import { Card, SectionHeader, SubHeader } from "./common";

/* ═══════════════════════════════════════════════════════════════════════════ */
/*  CARDS SECTION                                                               */
/* ═══════════════════════════════════════════════════════════════════════════ */
export function CardsSection() {
  return (
    <div>
      <SectionHeader title="Cards" desc="Stat cards, trip cards, vehicle cards, driver cards, and document cards." />

      {/* Stat Cards */}
      <div className="mb-8">
        <SubHeader title="Stat Cards — Dark Variant" />
        <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
          {[
            { label: "Total Trips", value: "128", icon: Package, color: "#FFFFFF", pct: "100%" },
            { label: "Completed", value: "86", icon: CheckCircle2, color: "#4ADE80", pct: "67%" },
            { label: "In Transit", value: "28", icon: Truck, color: "#60A5FA", pct: "21%" },
            { label: "Delayed", value: "9", icon: Clock, color: "#FBBF24", pct: "7%" },
            { label: "Cancelled", value: "5", icon: XCircle, color: "#F87171", pct: "3.9%" },
          ].map((s) => (
            <div key={s.label} className="rounded-2xl bg-[#1C1C1E] p-4 text-white">
              <s.icon size={18} style={{ color: s.color }} className="mb-2" />
              <p className="text-2xl font-bold" style={{ color: s.color }}>{s.value}</p>
              <p className="text-xs text-[rgba(255,255,255,0.6)] mt-0.5">{s.label}</p>
              <p className="text-[10px] text-[rgba(255,255,255,0.4)] mt-1">{s.pct}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Vehicle Stat Cards */}
      <div className="mb-8">
        <SubHeader title="Stat Cards — Light Variant" />
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {[
            { label: "Total Vehicles", value: "72", icon: Truck, delta: "+3" },
            { label: "Active Fleet", value: "48", icon: Activity, delta: "+1" },
            { label: "Maintenance", value: "8", icon: Settings, delta: "-2" },
            { label: "Renewals Due", value: "14", icon: AlertTriangle, delta: "+5", warn: true },
          ].map((s) => (
            <div key={s.label} className="rounded-2xl bg-white border border-black/[0.07] p-4 shadow-sm">
              <div className="flex items-center justify-between mb-3">
                <div className={`w-8 h-8 rounded-xl flex items-center justify-center ${s.warn ? "bg-[#FFF0EB]" : "bg-[#F5F5F7]"}`}>
                  <s.icon size={16} className={s.warn ? "text-[#E8450F]" : "text-[#6E6E80]"} />
                </div>
                <span className={`text-xs font-semibold ${s.delta.startsWith("+") ? "text-[#16A34A]" : "text-[#DC2626]"}`}>{s.delta}</span>
              </div>
              <p className="text-2xl font-bold text-[#111]">{s.value}</p>
              <p className="text-xs text-[#6E6E80] mt-0.5">{s.label}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Trip Card */}
      <div className="mb-8">
        <SubHeader title="Trip List Cards" />
        <div className="space-y-2">
          {[
            { id: "TRP-2387", from: "Riyadh", to: "Jeddah", driver: "Ahmed Kareem", vehicle: "TRK-2041", status: "Completed", statusColor: "#16A34A", statusBg: "#F0FDF4", weight: "18 TON", date: "24 May 2025" },
            { id: "TRP-2388", from: "Riyadh", to: "Abha", driver: "Faisal Baraka", vehicle: "DRA-9973", status: "In Transit", statusColor: "#2563EB", statusBg: "#EFF6FF", weight: "12 TON", date: "24 May 2025" },
            { id: "TRP-2389", from: "Riyadh", to: "Dammam", vehicle: "FADEL", driver: "Bader", status: "Delayed", statusColor: "#D97706", statusBg: "#FFFBEB", weight: "9 TON", date: "24 May 2025" },
          ].map((t) => (
            <div key={t.id} className="bg-white rounded-2xl border border-black/[0.07] p-4 flex items-center gap-4 shadow-sm hover:shadow-md transition-shadow cursor-pointer">
              <div className="w-10 h-10 rounded-xl bg-[#F5F5F7] flex items-center justify-center shrink-0">
                <Truck size={18} className="text-[#6E6E80]" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-xs font-mono font-semibold text-[#E8450F]">{t.id}</span>
                  <span className="text-xs font-semibold px-2 py-0.5 rounded-full" style={{ color: t.statusColor, background: t.statusBg }}>{t.status}</span>
                </div>
                <div className="flex items-center gap-1.5 text-xs text-[#444]">
                  <MapPin size={10} className="text-[#E8450F]" />
                  <span>{t.from}</span>
                  <ArrowRight size={10} className="text-[#9898A4]" />
                  <MapPin size={10} className="text-[#6E6E80]" />
                  <span>{t.to}</span>
                </div>
                <p className="text-[10px] text-[#9898A4] mt-0.5">{t.driver} · {t.vehicle} · {t.weight}</p>
              </div>
              <div className="text-right shrink-0">
                <p className="text-[10px] text-[#9898A4]">{t.date}</p>
                <ChevronRight size={16} className="text-[#D8D8DC] mt-1 ml-auto" />
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Vehicle Card */}
      <div className="mb-8">
        <SubHeader title="Vehicle Detail Card" />
        <div className="max-w-sm">
          <Card className="overflow-hidden">
            <div className="bg-[#1C1C1E] p-4 flex items-center justify-between">
              <div>
                <p className="text-xs text-[rgba(255,255,255,0.5)] font-mono">Vehicle No.</p>
                <p className="text-lg font-bold text-white">TRK-2041</p>
                <p className="text-xs text-[rgba(255,255,255,0.5)] mt-0.5">10 TON · Hino 500</p>
              </div>
              <div className="text-right">
                <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-[rgba(22,163,74,0.2)] text-[#4ADE80]">Available</span>
                <p className="text-xs text-[rgba(255,255,255,0.4)] mt-1">5/6 valid docs</p>
              </div>
            </div>
            <div className="p-4 space-y-2">
              {[
                { label: "Plate", value: "ABC-1234" },
                { label: "Driver", value: "Ahmed Kareem ★ 4.7" },
                { label: "Trips", value: "1,248 completed" },
                { label: "Distance", value: "248,320 km" },
              ].map((r) => (
                <div key={r.label} className="flex items-center justify-between text-sm">
                  <span className="text-[#6E6E80]">{r.label}</span>
                  <span className="font-medium text-[#111]">{r.value}</span>
                </div>
              ))}
            </div>
          </Card>
        </div>
      </div>

      {/* Document Card */}
      <div>
        <SubHeader title="Document Renewal Cards" />
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {[
            { title: "Insurance", vehicle: "TRK-2041", driver: "Ahmed Kareem", status: "Critical", expires: "Expires in 3 days — 03 Jul 2026", statusColor: "#DC2626", statusBg: "#FEF2F2" },
            { title: "Fahas", vehicle: "DRA-9973", driver: "Fahad Al Harbi", status: "Due Soon", expires: "12 Jul 2026", statusColor: "#D97706", statusBg: "#FFFBEB" },
            { title: "Istimara", vehicle: "VRA-3358", driver: "Danimam", status: "Overdue", expires: "Expired 5 days ago", statusColor: "#DC2626", statusBg: "#FEF2F2" },
            { title: "Misan Card", vehicle: "LKA-3812", driver: "Suresh Babu", status: "Due Soon", expires: "In 30 days — 16 Jul 2026", statusColor: "#D97706", statusBg: "#FFFBEB" },
          ].map((d) => (
            <div key={d.title + d.vehicle} className="bg-white rounded-2xl border border-black/[0.07] p-4 flex items-center gap-4 shadow-sm">
              <div className="w-10 h-10 rounded-xl bg-[#F5F5F7] flex items-center justify-center shrink-0">
                <FileText size={18} className="text-[#6E6E80]" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-0.5">
                  <span className="text-sm font-semibold text-[#111]">{d.title}</span>
                  <span className="text-xs font-semibold px-2 py-0.5 rounded-full" style={{ color: d.statusColor, background: d.statusBg }}>{d.status}</span>
                </div>
                <p className="text-xs text-[#6E6E80]">{d.vehicle} · {d.driver}</p>
                <p className="text-xs text-[#9898A4] mt-0.5">{d.expires}</p>
              </div>
              <button className="shrink-0 px-3 py-1.5 rounded-lg text-xs font-semibold" style={{ background: d.statusBg, color: d.statusColor }}>
                Renew
              </button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

/* ─── Driver Nav helpers ──────────────────────────────────────────────────── */
export const DRIVER_ITEMS = [
  { label: "Home", icon: Home },
  { label: "Trips", icon: Truck },
  { label: "Profile", icon: Users },
] as const;

export function DriverNavStatic({ active }: { active: "Home" | "Trips" | "Profile" }) {
  return (
    <div
      className="flex items-center gap-1 px-4 py-3 rounded-full"
      style={{
        background: "#1C1C2E",
        boxShadow: "0 8px 32px rgba(28,28,46,0.45)",
      }}
    >
      {DRIVER_ITEMS.map((item) => {
        const isActive = item.label === active;
        return (
          <div
            key={item.label}
            className="flex flex-col items-center gap-1 px-5 py-1"
          >
            <item.icon
              size={22}
              style={{ color: isActive ? "#E8450F" : "rgba(255,255,255,0.55)" }}
              strokeWidth={isActive ? 2.2 : 1.7}
            />
            <span
              className="text-[10px] font-semibold"
              style={{ color: isActive ? "#E8450F" : "rgba(255,255,255,0.55)" }}
            >
              {item.label}
            </span>
          </div>
        );
      })}
    </div>
  );
}

export function DriverNavDemo() {
  const [activeDriver, setActiveDriver] = useState<"Home" | "Trips" | "Profile">("Home");
  return (
    <div className="flex justify-center">
      <div
        className="flex items-center gap-1 px-4 py-3 rounded-full"
        style={{
          background: "#1C1C2E",
          boxShadow: "0 8px 32px rgba(28,28,46,0.45)",
        }}
      >
        {DRIVER_ITEMS.map((item) => {
          const isActive = item.label === activeDriver;
          return (
            <button
              key={item.label}
              onClick={() => setActiveDriver(item.label)}
              className="flex flex-col items-center gap-1 px-6 py-1 transition-colors"
            >
              <item.icon
                size={22}
                style={{ color: isActive ? "#E8450F" : "rgba(255,255,255,0.55)" }}
                strokeWidth={isActive ? 2.2 : 1.7}
              />
              <span
                className="text-[10px] font-semibold transition-colors"
                style={{ color: isActive ? "#E8450F" : "rgba(255,255,255,0.55)" }}
              >
                {item.label}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════════════════ */
/*  NAVIGATION SECTION                                                          */
/* ═══════════════════════════════════════════════════════════════════════════ */
export function NavigationSection() {
  const [activeTab, setActiveTab] = useState("This Month");
  const [activeBottom, setActiveBottom] = useState("Home");

  const bottomNavItems = [
    { label: "Home", icon: Home },
    { label: "Trips", icon: Truck },
    { label: "", icon: Plus, isFab: true },
    { label: "Drivers", icon: Users },
    { label: "More", icon: MoreHorizontal },
  ];

  return (
    <div>
      <SectionHeader title="Navigation" desc="Top bar, bottom navigation, tab bars, and breadcrumbs." />

      <Card className="p-8 mb-6">
        <SubHeader title="Top Bar — App Header" />
        <div className="space-y-3 max-w-sm">
          {/* List page header */}
          <div className="bg-white rounded-2xl border border-black/[0.07] px-4 py-3 flex items-center justify-between shadow-sm">
            <div className="flex items-center gap-3">
              <button className="text-[#6E6E80]">←</button>
              <span className="text-base font-bold text-[#111]">Trip Reports</span>
            </div>
            <div className="flex items-center gap-2">
              <button className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-[#F0F0F2] text-xs font-semibold text-[#444]">
                <Calendar size={12} /> Date Range
              </button>
            </div>
          </div>
          {/* Detail page header */}
          <div className="bg-white rounded-2xl border border-black/[0.07] px-4 py-3 flex items-center justify-between shadow-sm">
            <div className="flex items-center gap-3">
              <button className="text-[#6E6E80]">←</button>
              <span className="text-base font-bold text-[#111]">Vehicle Details</span>
            </div>
            <button className="px-3 py-1.5 rounded-lg bg-[#FFF0EB] text-xs font-semibold text-[#E8450F]">Edit</button>
          </div>
        </div>
      </Card>

      <Card className="p-8 mb-6">
        <SubHeader title="Tab Bar — Filter Tabs" />
        <div className="space-y-4">
          {/* Pill tabs */}
          <div className="flex gap-1 p-1 bg-[#F0F0F2] rounded-xl w-fit">
            {["All", "Active", "Expired", "Renewed"].map((t) => (
              <button
                key={t}
                onClick={() => setActiveTab(t)}
                className={`px-4 py-2 rounded-lg text-xs font-semibold transition-colors ${
                  activeTab === t ? "bg-white text-[#111] shadow-sm" : "text-[#6E6E80] hover:text-[#111]"
                }`}
              >
                {t}
              </button>
            ))}
          </div>
          {/* Underline tabs */}
          <div className="flex gap-6 border-b border-black/[0.08]">
            {["This Month", "This Week", "Today", "Custom"].map((t) => (
              <button
                key={t}
                onClick={() => setActiveTab(t)}
                className={`pb-2 text-sm font-semibold transition-colors border-b-2 -mb-px ${
                  activeTab === t ? "border-[#E8450F] text-[#E8450F]" : "border-transparent text-[#6E6E80] hover:text-[#111]"
                }`}
              >
                {t}
              </button>
            ))}
          </div>
        </div>
      </Card>

      <Card className="p-8 mb-6">
        <SubHeader title="Bottom Navigation — Operator App" />
        <p className="text-xs text-[#6E6E80] mb-5">Dark floating pill, 5 items. White circle FAB with orange plus. Used in the operator-facing app.</p>
        <div className="max-w-sm mx-auto px-2">
          <div
            className="rounded-full px-3 py-2 flex items-center"
            style={{ background: "#1C1C2E", boxShadow: "0 8px 32px rgba(28,28,46,0.5)" }}
          >
            {bottomNavItems.map((item) => {
              if (item.isFab) {
                return (
                  <div key="fab" className="flex-1 flex justify-center">
                    <div className="w-12 h-12 rounded-full bg-white border-2 border-[#E8450F] flex items-center justify-center shadow-md">
                      <Plus size={22} className="text-[#E8450F]" strokeWidth={2.5} />
                    </div>
                  </div>
                );
              }
              const isActive = activeBottom === item.label;
              return (
                <button
                  key={item.label}
                  onClick={() => setActiveBottom(item.label)}
                  className="flex-1 flex flex-col items-center gap-0.5 py-1 transition-colors"
                  style={{ color: isActive ? "#E8450F" : "rgba(255,255,255,0.45)" }}
                >
                  <item.icon size={20} strokeWidth={isActive ? 2.2 : 1.7} />
                  <span className="text-[9px] font-semibold">{item.label}</span>
                </button>
              );
            })}
          </div>
        </div>
      </Card>

      <Card className="p-8 mb-6">
        <SubHeader title="Bottom Navigation — Driver App" />
        <p className="text-xs text-[#6E6E80] mb-5">Dark floating pill, 3 items (Home / Trips / Profile). Active item turns orange.</p>
        <DriverNavDemo />
      </Card>

      <Card className="p-8 mb-6">
        <SubHeader title="Driver Nav — All States" />
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {(["Home", "Trips", "Profile"] as const).map((active) => (
            <div key={active} className="flex flex-col items-center gap-3">
              <DriverNavStatic active={active} />
              <p className="text-xs text-[#6E6E80]">{active} active</p>
            </div>
          ))}
        </div>
      </Card>

      <Card className="p-8">
        <SubHeader title="Breadcrumb" />
        <div className="flex items-center gap-1 text-sm">
          <button className="text-[#E8450F] font-medium hover:underline">Home</button>
          <ChevronRight size={14} className="text-[#D8D8DC]" />
          <button className="text-[#E8450F] font-medium hover:underline">Vehicles</button>
          <ChevronRight size={14} className="text-[#D8D8DC]" />
          <span className="text-[#111] font-semibold">TRK-2041</span>
        </div>
      </Card>
    </div>
  );
}
