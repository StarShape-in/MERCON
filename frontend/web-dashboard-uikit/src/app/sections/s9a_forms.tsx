import React, { useState } from "react";
import {
  Check, Plus, Minus, Fuel, AlertTriangle, AlertCircle, Info, Loader2,
  X, CheckCircle2, XCircle, Lock, Construction, Sparkles, WifiOff, Wifi,
  Clock, Truck, FileText, Download, ArrowUp, Users, Bell, Shield, BarChart3,
  Search, MapPin, Layers, Navigation2, LocateFixed, Route, Gauge,
  Phone, Wrench, Package, Globe, RadioTower, Edit2, Trash2, PenLine,
  ChevronDown, ChevronUp, QrCode, Copy, Settings, Activity, Navigation,
  User, Zap
} from "lucide-react";
import { Card, SectionHeader, SubHeader } from "./common";

/* ═══════════════════════════════════════════════════════════════════════════ */
/*  FORM CONTROLS SECTION                                                       */
/* ═══════════════════════════════════════════════════════════════════════════ */
export function FormControlsSection() {
  const [checked, setChecked] = useState<string[]>(["general"]);
  const [radio, setRadio] = useState("truck");
  const [toggled, setToggled] = useState<Record<string, boolean>>({ gps: true, alerts: false, auto: true });
  const [otp, setOtp] = useState(["", "", "", ""]);
  const [stepper, setStepper] = useState(1);
  const [slider, setSlider] = useState(65);
  const [multiSel, setMultiSel] = useState<string[]>(["Riyadh", "Jeddah"]);
  const [currency, setCurrency] = useState("1,668.00");

  const handleOtp = (i: number, val: string) => {
    if (!/^\d?$/.test(val)) return;
    const next = [...otp]; next[i] = val; setOtp(next);
  };

  const cities = ["Riyadh", "Jeddah", "Dammam", "Abha", "Medina", "Tabouk"];

  return (
    <div>
      <SectionHeader title="Form Controls" desc="Checkbox, radio, toggle, OTP, stepper, slider, multi-select, phone, currency." />

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
        {/* Checkbox */}
        <Card className="p-6">
          <SubHeader title="Checkbox" />
          <div className="space-y-3">
            {[
              { id: "general", label: "General Goods", sub: "Standard cargo" },
              { id: "heavy",   label: "Heavy Equipment", sub: "Over 10 TON" },
              { id: "refrig",  label: "Refrigerated", sub: "Temperature controlled" },
              { id: "hazard",  label: "Hazardous Materials", sub: "Requires special permit", disabled: true },
            ].map((c) => (
              <label key={c.id} className={`flex items-start gap-3 p-3 rounded-xl border transition-colors cursor-pointer ${(c as any).disabled ? "opacity-40 cursor-not-allowed" : checked.includes(c.id) ? "border-[#E8450F] bg-[#FFF0EB]" : "border-[#EBEBED] hover:border-[rgba(232,69,15,0.4)]"}`}>
                <div className={`w-5 h-5 rounded-md border-2 flex items-center justify-center shrink-0 mt-0.5 transition-colors ${(c as any).disabled ? "border-[#D8D8DC] bg-[#F5F5F7]" : checked.includes(c.id) ? "border-[#E8450F] bg-[#E8450F]" : "border-[#D8D8DC] bg-white"}`}
                  onClick={() => !((c as any).disabled) && setChecked((s) => s.includes(c.id) ? s.filter((x) => x !== c.id) : [...s, c.id])}>
                  {checked.includes(c.id) && <Check size={12} className="text-white" />}
                </div>
                <div>
                  <p className="text-sm font-semibold text-[#111]">{c.label}</p>
                  <p className="text-xs text-[#6E6E80]">{c.sub}</p>
                </div>
              </label>
            ))}
          </div>
        </Card>

        {/* Radio */}
        <Card className="p-6">
          <SubHeader title="Radio Button" />
          <div className="space-y-3">
            {[
              { id: "truck",   label: "10 TON Truck",  sub: "Hino 500 · Available" },
              { id: "semi",    label: "20 TON Semi",   sub: "Mercedes · On Trip" },
              { id: "pickup",  label: "3 TON Pickup",  sub: "Toyota · Available" },
              { id: "crane",   label: "Crane Truck",   sub: "Maintenance · Unavailable", disabled: true },
            ].map((r) => (
              <label key={r.id} className={`flex items-start gap-3 p-3 rounded-xl border transition-colors cursor-pointer ${(r as any).disabled ? "opacity-40 cursor-not-allowed" : radio === r.id ? "border-[#E8450F] bg-[#FFF0EB]" : "border-[#EBEBED] hover:border-[rgba(232,69,15,0.4)]"}`}
                onClick={() => !((r as any).disabled) && setRadio(r.id)}>
                <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0 mt-0.5 transition-colors ${(r as any).disabled ? "border-[#D8D8DC]" : radio === r.id ? "border-[#E8450F]" : "border-[#D8D8DC]"}`}>
                  {radio === r.id && <div className="w-2.5 h-2.5 rounded-full bg-[#E8450F]" />}
                </div>
                <div>
                  <p className="text-sm font-semibold text-[#111]">{r.label}</p>
                  <p className="text-xs text-[#6E6E80]">{r.sub}</p>
                </div>
              </label>
            ))}
          </div>
        </Card>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
        {/* Toggle / Switch */}
        <Card className="p-6">
          <SubHeader title="Toggle / Switch" />
          <div className="space-y-4">
            {[
              { id: "gps",    label: "GPS Tracking",    sub: "Live vehicle location" },
              { id: "alerts", label: "Push Notifications", sub: "Trip & document alerts" },
              { id: "auto",   label: "Auto-assign Driver", sub: "Based on availability" },
            ].map((t) => (
              <div key={t.id} className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-semibold text-[#111]">{t.label}</p>
                  <p className="text-xs text-[#6E6E80]">{t.sub}</p>
                </div>
                <button onClick={() => setToggled((s) => ({ ...s, [t.id]: !s[t.id] }))}
                  className={`relative w-12 h-6 rounded-full transition-colors ${toggled[t.id] ? "bg-[#E8450F]" : "bg-[#D8D8DC]"}`}>
                  <span className={`absolute top-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform ${toggled[t.id] ? "translate-x-6" : "translate-x-0.5"}`} />
                </button>
              </div>
            ))}
            <div className="flex items-center justify-between opacity-40">
              <div>
                <p className="text-sm font-semibold text-[#111]">Disabled Toggle</p>
                <p className="text-xs text-[#6E6E80]">Cannot be changed</p>
              </div>
              <div className="relative w-12 h-6 rounded-full bg-[#E8450F] cursor-not-allowed">
                <span className="absolute top-0.5 translate-x-6 w-5 h-5 bg-white rounded-full shadow" />
              </div>
            </div>
          </div>
        </Card>

        {/* OTP Input */}
        <Card className="p-6">
          <SubHeader title="OTP / PIN Input" />
          <p className="text-xs text-[#6E6E80] mb-4">Enter the 4-digit code sent to +966 50 *** 4567</p>
          <div className="flex gap-3 mb-6">
            {otp.map((val, i) => (
              <input key={i} maxLength={1} value={val}
                onChange={(e) => handleOtp(i, e.target.value)}
                className={`w-14 h-14 text-center text-xl font-bold rounded-2xl border-2 outline-none transition-colors bg-[#F5F5F7] ${val ? "border-[#E8450F] text-[#E8450F]" : "border-[#EBEBED] text-[#111]"} focus:border-[#E8450F]`}
              />
            ))}
          </div>
          <button className="text-xs font-semibold text-[#E8450F] hover:underline">Resend code in 0:42</button>

          <div className="mt-6">
            <SubHeader title="Filled State" />
            <div className="flex gap-3">
              {["4", "2", "1", "9"].map((d, i) => (
                <div key={i} className="w-14 h-14 flex items-center justify-center text-xl font-bold rounded-2xl border-2 border-[#16A34A] bg-[#F0FDF4] text-[#16A34A]">{d}</div>
              ))}
            </div>
          </div>
        </Card>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
        {/* Number Stepper */}
        <Card className="p-6">
          <SubHeader title="Number Stepper" />
          <div className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-[#111] mb-2">Number of Vehicles</label>
              <div className="flex items-center gap-0 border-2 border-[#EBEBED] rounded-xl overflow-hidden w-fit">
                <button onClick={() => setStepper(Math.max(1, stepper - 1))}
                  className="w-12 h-12 flex items-center justify-center text-[#6E6E80] hover:bg-[#F5F5F7] border-r border-[#EBEBED] transition-colors disabled:opacity-40" disabled={stepper === 1}>
                  <Minus size={18} />
                </button>
                <span className="w-16 text-center text-lg font-bold text-[#111]">{stepper}</span>
                <button onClick={() => setStepper(stepper + 1)}
                  className="w-12 h-12 flex items-center justify-center text-[#6E6E80] hover:bg-[#F5F5F7] border-l border-[#EBEBED] transition-colors">
                  <Plus size={18} />
                </button>
              </div>
            </div>
            <div>
              <label className="block text-xs font-semibold text-[#111] mb-2">Cargo Weight (TON)</label>
              <div className="flex items-center gap-3">
                <button className="w-10 h-10 rounded-xl border-2 border-[#EBEBED] flex items-center justify-center text-[#6E6E80] hover:border-[#E8450F] transition-colors"><Minus size={16} /></button>
                <input className="w-20 text-center px-3 py-2 rounded-xl bg-[#F5F5F7] text-base font-bold text-[#111] outline-none focus:ring-2 focus:ring-[rgba(232,69,15,0.3)]" defaultValue="18.5" />
                <button className="w-10 h-10 rounded-xl border-2 border-[#EBEBED] flex items-center justify-center text-[#6E6E80] hover:border-[#E8450F] transition-colors"><Plus size={16} /></button>
              </div>
            </div>
          </div>
        </Card>

        {/* Range Slider */}
        <Card className="p-6">
          <SubHeader title="Range Slider" />
          <div className="space-y-6">
            <div>
              <div className="flex justify-between text-xs mb-2">
                <span className="font-semibold text-[#111]">Fleet Utilization Target</span>
                <span className="font-bold text-[#E8450F]">{slider}%</span>
              </div>
              <input type="range" min={0} max={100} value={slider} onChange={(e) => setSlider(+e.target.value)}
                className="w-full h-2 rounded-full appearance-none cursor-pointer"
                style={{ accentColor: "#E8450F" }} />
              <div className="flex justify-between text-[10px] text-[#9898A4] mt-1"><span>0%</span><span>100%</span></div>
            </div>
            <div>
              <div className="flex justify-between text-xs mb-2">
                <span className="font-semibold text-[#111]">Weight Range (TON)</span>
                <span className="font-bold text-[#6E6E80]">5 – 20</span>
              </div>
              <div className="relative h-2 rounded-full bg-[#EBEBED]">
                <div className="absolute h-2 rounded-full bg-[#E8450F]" style={{ left: "20%", right: "20%" }} />
                <div className="absolute w-4 h-4 rounded-full bg-white border-2 border-[#E8450F] -mt-1 cursor-pointer shadow" style={{ left: "calc(20% - 8px)" }} />
                <div className="absolute w-4 h-4 rounded-full bg-white border-2 border-[#E8450F] -mt-1 cursor-pointer shadow" style={{ left: "calc(80% - 8px)" }} />
              </div>
            </div>
          </div>
        </Card>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Multi-Select */}
        <Card className="p-6">
          <SubHeader title="Multi-Select Chips" />
          <label className="block text-xs font-semibold text-[#111] mb-2">Select Cities</label>
          <div className="flex flex-wrap gap-2 mb-3">
            {cities.map((c) => (
              <button key={c} onClick={() => setMultiSel((s) => s.includes(c) ? s.filter((x) => x !== c) : [...s, c])}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold border transition-colors ${multiSel.includes(c) ? "bg-[#E8450F] border-[#E8450F] text-white" : "bg-white border-[#EBEBED] text-[#444] hover:border-[rgba(232,69,15,0.5)]"}`}>
                {multiSel.includes(c) && <Check size={11} />}{c}
              </button>
            ))}
          </div>
          <p className="text-xs text-[#6E6E80]">{multiSel.length} selected: {multiSel.join(", ") || "none"}</p>
        </Card>

        {/* Phone + Currency */}
        <Card className="p-6">
          <SubHeader title="Phone & Currency Inputs" />
          <div className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-[#111] mb-1.5">Phone Number</label>
              <div className="flex gap-2">
                <div className="flex items-center gap-1.5 px-3 py-3 rounded-xl bg-[#F0F0F2] text-sm font-semibold text-[#111] shrink-0">
                  <span className="text-base">🇸🇦</span> +966
                </div>
                <input className="flex-1 px-4 py-3 rounded-xl bg-[#F0F0F2] text-sm outline-none focus:ring-2 focus:ring-[rgba(232,69,15,0.3)]" placeholder="50 000 0000" defaultValue="50 123 4567" />
              </div>
            </div>
            <div>
              <label className="block text-xs font-semibold text-[#111] mb-1.5">Trip Revenue (SAR)</label>
              <div className="relative">
                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-xs font-bold text-[#6E6E80]">SAR</span>
                <input className="w-full pl-14 pr-4 py-3 rounded-xl bg-[#F0F0F2] text-sm font-semibold outline-none focus:ring-2 focus:ring-[rgba(232,69,15,0.3)] text-right"
                  value={currency} onChange={(e) => setCurrency(e.target.value)} />
              </div>
            </div>
            <div>
              <label className="block text-xs font-semibold text-[#111] mb-1.5">Fuel Amount (L)</label>
              <div className="relative">
                <Fuel size={15} className="absolute left-4 top-1/2 -translate-y-1/2 text-[#9898A4]" />
                <input className="w-full pl-10 pr-12 py-3 rounded-xl bg-[#F0F0F2] text-sm outline-none focus:ring-2 focus:ring-[rgba(232,69,15,0.3)]" placeholder="0.00" defaultValue="120.5" />
                <span className="absolute right-4 top-1/2 -translate-y-1/2 text-xs font-bold text-[#6E6E80]">L</span>
              </div>
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════════════════ */
/*  FEEDBACK SECTION                                                            */
/* ═══════════════════════════════════════════════════════════════════════════ */
export function FeedbackSection() {
  const [offline, setOffline] = useState(true);
  const [syncDone, setSyncDone] = useState(false);

  return (
    <div>
      <SectionHeader title="Feedback" desc="Banners, inline alerts, offline state, sync status, and snackbars." />

      {/* Page-level banners */}
      <Card className="p-6 mb-6">
        <SubHeader title="Page Banners" />
        <div className="space-y-3">
          {[
            { type: "info",    Icon: Info,          color: "#2563EB", bg: "#EFF6FF", border: "#BFDBFE", title: "System Update",      body: "A new version (v2.1.4) is available. Refresh to update." },
            { type: "success", Icon: CheckCircle2,  color: "#16A34A", bg: "#F0FDF4", border: "#BBF7D0", title: "Sync Complete",       body: "All 128 trips have been synced successfully." },
            { type: "warning", Icon: AlertTriangle, color: "#D97706", bg: "#FFFBEB", border: "#FDE68A", title: "Low Storage",         body: "Device storage is below 10%. Clear cache to free space." },
            { type: "danger",  Icon: XCircle,       color: "#DC2626", bg: "#FEF2F2", border: "#FECACA", title: "License Expiring",    body: "Your fleet license expires in 7 days. Renew to avoid suspension." },
          ].map((b) => (
            <div key={b.type} className="flex items-start gap-3 p-4 rounded-2xl border" style={{ background: b.bg, borderColor: b.border }}>
              <b.Icon size={18} style={{ color: b.color }} className="mt-0.5 shrink-0" />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-[#111]">{b.title}</p>
                <p className="text-xs text-[#6E6E80] mt-0.5">{b.body}</p>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <button className="text-xs font-bold" style={{ color: b.color }}>Action</button>
                <button className="text-[#9898A4] hover:text-[#444]"><X size={14} /></button>
              </div>
            </div>
          ))}
        </div>
      </Card>

      {/* Offline + Sync banners */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
        <Card className="p-6">
          <SubHeader title="Offline Banner" />
          <div className={`rounded-2xl border-2 p-4 flex items-center gap-3 transition-all ${offline ? "border-[#DC2626] bg-[#FEF2F2]" : "border-[#16A34A] bg-[#F0FDF4]"}`}>
            {offline ? <WifiOff size={20} className="text-[#DC2626] shrink-0" /> : <Wifi size={20} className="text-[#16A34A] shrink-0" />}
            <div className="flex-1">
              <p className={`text-sm font-bold ${offline ? "text-[#DC2626]" : "text-[#16A34A]"}`}>{offline ? "No Internet Connection" : "Back Online"}</p>
              <p className="text-xs text-[#6E6E80] mt-0.5">{offline ? "Some features may not be available." : "All data synced successfully."}</p>
            </div>
            {offline && <button onClick={() => setOffline(false)} className="px-3 py-1.5 rounded-lg bg-[#DC2626] text-white text-xs font-semibold shrink-0">Retry</button>}
          </div>
          <button className="mt-3 text-xs text-[#6E6E80] font-medium hover:text-[#E8450F]" onClick={() => setOffline(!offline)}>
            Toggle: {offline ? "Go Online" : "Go Offline"}
          </button>
        </Card>

        <Card className="p-6">
          <SubHeader title="Sync Status" />
          <div className="space-y-3">
            <div className="flex items-center gap-3 p-3 rounded-xl bg-[#FFF0EB]">
              <Loader2 size={18} className="text-[#E8450F] animate-spin shrink-0" />
              <div className="flex-1">
                <p className="text-sm font-semibold text-[#111]">Syncing Trips…</p>
                <div className="mt-1.5 h-1.5 rounded-full bg-[#FECACA] overflow-hidden">
                  <div className="h-full w-[62%] rounded-full bg-[#E8450F]" />
                </div>
              </div>
              <span className="text-xs font-bold text-[#E8450F]">62%</span>
            </div>
            <div className="flex items-center gap-3 p-3 rounded-xl bg-[#F0FDF4]">
              <CheckCircle2 size={18} className="text-[#16A34A] shrink-0" />
              <div className="flex-1">
                <p className="text-sm font-semibold text-[#111]">Drivers Synced</p>
                <p className="text-xs text-[#16A34A]">48 records · Just now</p>
              </div>
            </div>
            <div className="flex items-center gap-3 p-3 rounded-xl bg-[#F5F5F7]">
              <Clock size={18} className="text-[#6E6E80] shrink-0" />
              <div className="flex-1">
                <p className="text-sm font-semibold text-[#111]">Documents Pending</p>
                <p className="text-xs text-[#6E6E80]">Waiting for connection</p>
              </div>
            </div>
          </div>
        </Card>
      </div>

      {/* Inline field alerts */}
      <Card className="p-6 mb-6">
        <SubHeader title="Inline Form Alerts" />
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {[
            { Icon: AlertCircle, color: "#DC2626", bg: "#FEF2F2", text: "Driver is already assigned to TRP-2388." },
            { Icon: AlertTriangle, color: "#D97706", bg: "#FFFBEB", text: "Vehicle capacity may be insufficient for this cargo." },
            { Icon: CheckCircle2, color: "#16A34A", bg: "#F0FDF4", text: "Route optimized. Estimated saving: 42 km." },
            { Icon: Info, color: "#2563EB", bg: "#EFF6FF", text: "Customer has requested morning delivery before 10 AM." },
          ].map((a, i) => (
            <div key={i} className="flex items-start gap-2.5 p-3 rounded-xl" style={{ background: a.bg }}>
              <a.Icon size={15} style={{ color: a.color }} className="mt-0.5 shrink-0" />
              <p className="text-xs font-medium" style={{ color: a.color }}>{a.text}</p>
            </div>
          ))}
        </div>
      </Card>

      {/* Permission / maintenance empty states */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {[
          { Icon: Lock,         iconColor: "#6E6E80", iconBg: "#F5F5F7", title: "Permission Denied",   body: "You don't have access to this section. Contact your administrator.", cta: "Request Access" },
          { Icon: Construction, iconColor: "#D97706", iconBg: "#FFFBEB", title: "Under Maintenance",   body: "This feature is temporarily unavailable. We'll be back shortly.", cta: "Check Status" },
          { Icon: Sparkles,     iconColor: "#7C3AED", iconBg: "#F5F3FF", title: "Coming Soon",         body: "This feature is under development. Stay tuned for updates.", cta: "Notify Me" },
        ].map((e) => (
          <Card key={e.title} className="p-8 flex flex-col items-center text-center">
            <div className="w-14 h-14 rounded-2xl flex items-center justify-center mb-4" style={{ background: e.iconBg }}>
              <e.Icon size={26} style={{ color: e.iconColor }} strokeWidth={1.8} />
            </div>
            <p className="text-sm font-bold text-[#111] mb-1.5">{e.title}</p>
            <p className="text-xs text-[#6E6E80] leading-relaxed mb-4">{e.body}</p>
            <button className="px-4 py-2 rounded-xl text-xs font-semibold text-white hover:opacity-90" style={{ background: e.iconColor }}>{e.cta}</button>
          </Card>
        ))}
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════════════════ */
/*  EXTENDED CARDS SECTION                                                      */
/* ═══════════════════════════════════════════════════════════════════════════ */
export function ExtendedCardsSection() {
  return (
    <div>
      <SectionHeader title="Extended Cards" desc="Invoice, billing, fuel, maintenance, cargo, customer, quick-action, and route cards." />

      {/* Invoice + Revenue */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
        <Card className="overflow-hidden">
          <div className="px-5 py-4 border-b border-[#F0F0F2] flex items-center justify-between">
            <div>
              <p className="text-xs text-[#6E6E80] font-mono">INV-2025-0487</p>
              <p className="text-base font-bold text-[#111]">Invoice</p>
            </div>
            <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-[#F0FDF4] text-[#16A34A]">Paid</span>
          </div>
          <div className="px-5 py-4 space-y-2">
            {[["Customer", "Fahad Trading Co."], ["Trip", "TRP-2387"], ["Route", "Riyadh → Jeddah"], ["Cargo", "General Goods · 18,500 KG"], ["Distance", "974 km"], ["Date", "24 May 2025"]].map(([k, v]) => (
              <div key={k} className="flex justify-between text-xs">
                <span className="text-[#6E6E80]">{k}</span><span className="font-medium text-[#111]">{v}</span>
              </div>
            ))}
            <div className="flex justify-between pt-3 border-t border-[#F0F0F2]">
              <span className="text-sm font-bold text-[#111]">Total</span>
              <span className="text-sm font-bold text-[#E8450F]">SAR 1,668</span>
            </div>
          </div>
          <div className="px-5 pb-4 flex gap-2">
            <button className="flex-1 py-2.5 rounded-xl bg-[#F0F0F2] text-xs font-semibold text-[#444]"><Download size={13} className="inline mr-1" />Download</button>
            <button className="flex-1 py-2.5 rounded-xl bg-[#E8450F] text-white text-xs font-semibold">Share</button>
          </div>
        </Card>

        <Card className="overflow-hidden">
          <div className="bg-[#1C1C1E] px-5 py-4">
            <p className="text-xs text-[rgba(255,255,255,0.5)]">Monthly Revenue</p>
            <p className="text-2xl font-bold text-white">SAR 213,540</p>
            <div className="flex items-center gap-1 mt-1">
              <ArrowUp size={12} className="text-[#4ADE80]" />
              <span className="text-xs text-[#4ADE80] font-semibold">+12.4%</span>
              <span className="text-xs text-[rgba(255,255,255,0.4)]">vs last month</span>
            </div>
          </div>
          <div className="px-5 py-4 space-y-3">
            {[
              { label: "Trips Revenue", val: "SAR 180,200", pct: 84, color: "#E8450F" },
              { label: "Fuel Recovery",  val: "SAR 21,340",  pct: 10, color: "#2563EB" },
              { label: "Extra Charges", val: "SAR 12,000",  pct: 6,  color: "#D97706" },
            ].map((r) => (
              <div key={r.label}>
                <div className="flex justify-between text-xs mb-1">
                  <span className="text-[#6E6E80]">{r.label}</span>
                  <span className="font-semibold text-[#111]">{r.val}</span>
                </div>
                <div className="h-1.5 rounded-full bg-[#F0F0F2] overflow-hidden">
                  <div className="h-full rounded-full" style={{ width: `${r.pct}%`, background: r.color }} />
                </div>
              </div>
            ))}
          </div>
        </Card>
      </div>

      {/* Fuel + Maintenance */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
        <Card className="p-5">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 rounded-xl bg-[#FFFBEB] flex items-center justify-center">
              <Fuel size={20} className="text-[#D97706]" />
            </div>
            <div>
              <p className="text-sm font-bold text-[#111]">Fuel Summary</p>
              <p className="text-xs text-[#6E6E80]">TRK-2041 · May 2025</p>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3 mb-4">
            {[
              { label: "Total Fuel",    val: "1,240 L",    color: "#D97706" },
              { label: "Cost",          val: "SAR 2,480",  color: "#DC2626" },
              { label: "Avg per Trip",  val: "24.8 L",     color: "#2563EB" },
              { label: "Efficiency",    val: "3.2 km/L",   color: "#16A34A" },
            ].map((s) => (
              <div key={s.label} className="p-3 rounded-xl bg-[#F5F5F7]">
                <p className="text-base font-bold" style={{ color: s.color }}>{s.val}</p>
                <p className="text-[10px] text-[#6E6E80] mt-0.5">{s.label}</p>
              </div>
            ))}
          </div>
          <div className="flex items-center gap-2 p-3 rounded-xl bg-[#FFFBEB]">
            <AlertTriangle size={14} className="text-[#D97706] shrink-0" />
            <p className="text-xs text-[#D97706] font-medium">Fuel cost 8% above fleet average</p>
          </div>
        </Card>

        <Card className="p-5">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 rounded-xl bg-[#FEF2F2] flex items-center justify-center">
              <Wrench size={20} className="text-[#DC2626]" />
            </div>
            <div>
              <p className="text-sm font-bold text-[#111]">Maintenance Alert</p>
              <p className="text-xs text-[#6E6E80]">TRK-2041 · Service Due</p>
            </div>
            <span className="ml-auto text-xs font-semibold px-2 py-1 rounded-full bg-[#FEF2F2] text-[#DC2626]">Overdue</span>
          </div>
          <div className="space-y-2.5 mb-4">
            {[
              { label: "Last Service",    val: "12 Mar 2025", ok: true  },
              { label: "Next Due",        val: "12 Jun 2025", ok: false },
              { label: "Mileage Due",     val: "250,000 km",  ok: false },
              { label: "Current Mileage", val: "248,320 km",  ok: true  },
            ].map((row) => (
              <div key={row.label} className="flex justify-between text-xs">
                <span className="text-[#6E6E80]">{row.label}</span>
                <span className={`font-semibold ${row.ok ? "text-[#111]" : "text-[#DC2626]"}`}>{row.val}</span>
              </div>
            ))}
          </div>
          <button className="w-full py-2.5 rounded-xl bg-[#DC2626] text-white text-xs font-semibold hover:bg-[#B91C1C] transition-colors">Schedule Maintenance</button>
        </Card>
      </div>

      {/* Cargo + Customer */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
        <Card className="p-5">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 rounded-xl bg-[#FFF0EB] flex items-center justify-center">
              <Package size={20} className="text-[#E8450F]" />
            </div>
            <div>
              <p className="text-sm font-bold text-[#111]">Cargo Summary</p>
              <p className="text-xs text-[#6E6E80]">TRP-2387</p>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-2">
            {[["Type","General Goods"],["Weight","18,500 KG"],["Volume","42 m³"],["Pallets","24 pcs"],["Temperature","Ambient"],["Fragile","No"]].map(([k,v]) => (
              <div key={k} className="p-2.5 rounded-xl bg-[#F5F5F7]">
                <p className="text-[10px] text-[#9898A4]">{k}</p>
                <p className="text-xs font-semibold text-[#111] mt-0.5">{v}</p>
              </div>
            ))}
          </div>
        </Card>

        <Card className="p-5">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 rounded-xl bg-[#EFF6FF] flex items-center justify-center">
              <Users size={20} className="text-[#2563EB]" />
            </div>
            <div className="flex-1">
              <p className="text-sm font-bold text-[#111]">Customer Card</p>
              <p className="text-xs text-[#6E6E80]">Fahad Trading Co.</p>
            </div>
            <span className="text-xs font-semibold px-2 py-1 rounded-full bg-[#F0FDF4] text-[#16A34A]">VIP</span>
          </div>
          <div className="space-y-2 mb-4">
            {[["Contact","Fahad Al Harbi"],["Phone","+966 55 123 4567"],["City","Riyadh, KSA"],["Total Trips","86"],["Revenue","SAR 142,800"],["Since","Jan 2023"]].map(([k,v]) => (
              <div key={k} className="flex justify-between text-xs">
                <span className="text-[#6E6E80]">{k}</span>
                <span className="font-medium text-[#111]">{v}</span>
              </div>
            ))}
          </div>
          <div className="flex gap-2">
            <button className="flex-1 py-2.5 rounded-xl bg-[#F0F0F2] text-xs font-semibold text-[#444]">View History</button>
            <button className="flex-1 py-2.5 rounded-xl bg-[#2563EB] text-white text-xs font-semibold">New Trip</button>
          </div>
        </Card>
      </div>

      {/* Quick Action Cards */}
      <Card className="p-6">
        <SubHeader title="Quick Action Cards" />
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {[
            { icon: <Plus size={22} />,      label: "New Trip",        color: "#E8450F", bg: "#FFF0EB" },
            { icon: <Truck size={22} />,     label: "Track Fleet",     color: "#2563EB", bg: "#EFF6FF" },
            { icon: <FileText size={22} />,  label: "Reports",         color: "#7C3AED", bg: "#F5F3FF" },
            { icon: <Download size={22} />,  label: "Export Data",     color: "#16A34A", bg: "#F0FDF4" },
            { icon: <Bell size={22} />,      label: "Alerts",          color: "#D97706", bg: "#FFFBEB" },
            { icon: <Users size={22} />,     label: "Drivers",         color: "#0891B2", bg: "#ECFEFF" },
            { icon: <Shield size={22} />,    label: "Documents",       color: "#DC2626", bg: "#FEF2F2" },
            { icon: <BarChart3 size={22} />, label: "Analytics",       color: "#1A1A1A", bg: "#F5F5F7" },
          ].map((a) => (
            <button key={a.label} className="flex flex-col items-center gap-2.5 p-4 rounded-2xl border border-transparent hover:border-black/[0.08] hover:shadow-sm transition-all group">
              <div className="w-12 h-12 rounded-2xl flex items-center justify-center transition-transform group-hover:scale-110" style={{ background: a.bg, color: a.color }}>{a.icon}</div>
              <p className="text-xs font-semibold text-[#111]">{a.label}</p>
            </button>
          ))}
        </div>
      </Card>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════════════════ */
/*  MAPS SECTION                                                                */
/* ═══════════════════════════════════════════════════════════════════════════ */
