import React, { useState, useEffect } from "react";
import {
  Check, Plus, Minus, Fuel, AlertTriangle, AlertCircle, Info, Loader2,
  X, CheckCircle2, XCircle, Lock, Construction, Sparkles, WifiOff, Wifi,
  Clock, Truck, FileText, Download, ArrowUp, Users, Bell, Shield, BarChart3,
  Search, MapPin, Layers, Navigation2, LocateFixed, Route, Gauge,
  Phone, Wrench, Package, Globe, RadioTower, Edit2, Trash2, PenLine, GitMerge,
  ChevronDown, ChevronUp, QrCode, Copy, Settings, Activity, Navigation,
  User, Zap
} from "lucide-react";
import { Card, SectionHeader, SubHeader } from "./common";

export function MapsSection() {
  return (
    <div>
      <SectionHeader title="Maps" desc="Map UI components — markers, overlays, route summary, ETA/distance/speed widgets, and tracking card." />

      {/* Map canvas mockup */}
      <Card className="mb-6 overflow-hidden">
        <div className="relative" style={{ height: 320, background: "linear-gradient(135deg, #e8ede8 0%, #d8e4d8 40%, #c8dcc8 100%)" }}>
          {/* Grid lines simulating map */}
          <svg className="absolute inset-0 w-full h-full opacity-20" xmlns="http://www.w3.org/2000/svg">
            {[0,1,2,3,4,5,6,7].map(i => <line key={`h${i}`} x1="0" y1={`${i*14.28}%`} x2="100%" y2={`${i*14.28}%`} stroke="#888" strokeWidth="0.5"/>)}
            {[0,1,2,3,4,5,6,7,8,9].map(i => <line key={`v${i}`} x1={`${i*11.11}%`} y1="0" x2={`${i*11.11}%`} y2="100%" stroke="#888" strokeWidth="0.5"/>)}
          </svg>
          {/* Road lines */}
          <svg className="absolute inset-0 w-full h-full" xmlns="http://www.w3.org/2000/svg">
            <path d="M 60 280 C 120 220 180 200 240 180 S 320 140 380 100 S 460 60 520 50" stroke="white" strokeWidth="6" fill="none" strokeLinecap="round"/>
            <path d="M 60 280 C 120 220 180 200 240 180 S 320 140 380 100 S 460 60 520 50" stroke="#E8450F" strokeWidth="3" fill="none" strokeLinecap="round" strokeDasharray="12 6"/>
          </svg>
          {/* Pickup marker */}
          <div className="absolute flex flex-col items-center" style={{ left: 46, top: 248 }}>
            <div className="w-9 h-9 rounded-full bg-[#E8450F] border-3 border-white shadow-lg flex items-center justify-center">
              <MapPin size={18} className="text-white" />
            </div>
            <div className="mt-1 px-2 py-0.5 bg-white rounded-lg shadow text-[10px] font-bold text-[#E8450F] whitespace-nowrap">Riyadh</div>
          </div>
          {/* Vehicle marker */}
          <div className="absolute flex flex-col items-center" style={{ left: 270, top: 158 }}>
            <div className="w-10 h-10 rounded-full bg-[#1C1C1E] border-3 border-white shadow-xl flex items-center justify-center">
              <Truck size={18} className="text-white" />
            </div>
            <div className="mt-1 px-2 py-0.5 bg-[#1C1C1E] rounded-lg shadow text-[10px] font-bold text-white whitespace-nowrap">TRK-2041</div>
          </div>
          {/* Drop marker */}
          <div className="absolute flex flex-col items-center" style={{ left: 500, top: 34 }}>
            <div className="w-9 h-9 rounded-full bg-[#16A34A] border-3 border-white shadow-lg flex items-center justify-center">
              <MapPin size={18} className="text-white" />
            </div>
            <div className="mt-1 px-2 py-0.5 bg-white rounded-lg shadow text-[10px] font-bold text-[#16A34A] whitespace-nowrap">Jeddah</div>
          </div>
          {/* Current location pulse */}
          <div className="absolute" style={{ left: 270, top: 158 }}>
            <div className="w-10 h-10 rounded-full border-2 border-[#E8450F] opacity-30 animate-ping" />
          </div>
          {/* Overlay toolbar */}
          <div className="absolute top-4 left-4 right-4 flex items-center gap-2">
            <div className="flex-1 flex items-center gap-2 px-3 py-2 bg-white rounded-xl shadow-sm">
              <Search size={14} className="text-[#9898A4]" />
              <span className="text-xs text-[#9898A4]">Search location…</span>
            </div>
            <button className="w-9 h-9 bg-white rounded-xl shadow-sm flex items-center justify-center text-[#6E6E80]"><Layers size={16} /></button>
            <button className="w-9 h-9 bg-white rounded-xl shadow-sm flex items-center justify-center text-[#6E6E80]"><LocateFixed size={16} /></button>
          </div>
        </div>
      </Card>

      {/* Marker legend */}
      <Card className="p-6 mb-6">
        <SubHeader title="Map Markers" />
        <div className="flex flex-wrap gap-6">
          {[
            { label: "Pickup",   color: "#E8450F", Icon: MapPin,      desc: "Trip origin" },
            { label: "Drop",     color: "#16A34A", Icon: MapPin,      desc: "Destination" },
            { label: "Vehicle",  color: "#1C1C1E", Icon: Truck,       desc: "Live position" },
            { label: "Driver",   color: "#2563EB", Icon: User,        desc: "Driver location" },
            { label: "My Loc",   color: "#7C3AED", Icon: Navigation2, desc: "Current location" },
            { label: "Cluster",  color: "#D97706", Icon: GitMerge,    desc: "Multiple vehicles" },
          ].map((m) => (
            <div key={m.label} className="flex flex-col items-center gap-2">
              <div className="w-12 h-12 rounded-full flex items-center justify-center border-4 border-white shadow-md" style={{ background: m.color }}>
                <m.Icon size={20} className="text-white" />
              </div>
              <p className="text-xs font-semibold text-[#111]">{m.label}</p>
              <p className="text-[10px] text-[#9898A4]">{m.desc}</p>
            </div>
          ))}
        </div>
      </Card>

      {/* ETA + Speed + Distance widgets */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        {[
          { Icon: Clock,  color: "#E8450F", bg: "#FFF0EB", label: "ETA",      value: "2h 18m",  sub: "Arrives ~08:03 PM" },
          { Icon: Gauge,  color: "#2563EB", bg: "#EFF6FF", label: "Speed",    value: "92 km/h", sub: "Avg: 76 km/h" },
          { Icon: Route,  color: "#16A34A", bg: "#F0FDF4", label: "Distance", value: "974 km",  sub: "482 km remaining" },
        ].map((w) => (
          <Card key={w.label} className="p-5 flex items-center gap-4">
            <div className="w-12 h-12 rounded-2xl flex items-center justify-center shrink-0" style={{ background: w.bg }}>
              <w.Icon size={22} style={{ color: w.color }} />
            </div>
            <div>
              <p className="text-xs text-[#6E6E80]">{w.label}</p>
              <p className="text-2xl font-bold text-[#111]">{w.value}</p>
              <p className="text-xs text-[#9898A4]">{w.sub}</p>
            </div>
          </Card>
        ))}
      </div>

      {/* Live tracking card */}
      <Card className="overflow-hidden">
        <div className="bg-[#1C1C1E] px-5 py-4 flex items-center justify-between">
          <div>
            <p className="text-xs text-[rgba(255,255,255,0.5)]">Live Tracking</p>
            <p className="text-base font-bold text-white">TRP-2387 · TRK-2041</p>
          </div>
          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-[rgba(22,163,74,0.2)]">
            <span className="w-1.5 h-1.5 rounded-full bg-[#4ADE80] animate-pulse" />
            <span className="text-xs font-semibold text-[#4ADE80]">Live</span>
          </div>
        </div>
        <div className="p-5 grid grid-cols-2 md:grid-cols-4 gap-4">
          {[
            { label: "Driver",    val: "Ahmed Kareem" },
            { label: "Vehicle",   val: "TRK-2041 · 10T" },
            { label: "Location",  val: "King Fahd Rd, Riyadh" },
            { label: "Last Ping", val: "12 sec ago" },
          ].map((row) => (
            <div key={row.label}>
              <p className="text-[10px] text-[#9898A4] uppercase tracking-wider">{row.label}</p>
              <p className="text-sm font-semibold text-[#111] mt-0.5">{row.val}</p>
            </div>
          ))}
        </div>
        <div className="px-5 pb-5 flex gap-3">
          <button className="flex-1 py-2.5 rounded-xl bg-[#F0F0F2] text-xs font-semibold text-[#444] flex items-center justify-center gap-1.5"><Phone size={13} /> Call Driver</button>
          <button className="flex-1 py-2.5 rounded-xl bg-[#E8450F] text-white text-xs font-semibold flex items-center justify-center gap-1.5"><Navigation2 size={13} /> Open Map</button>
        </div>
      </Card>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════════════════ */
/*  LOGISTICS SECTION                                                           */
/* ═══════════════════════════════════════════════════════════════════════════ */
export function LogisticsSection() {
  const [assignDriver, setAssignDriver] = useState<string | null>(null);
  const [selectedDriver, setSelectedDriver] = useState<string | null>(null);

  const drivers = [
    { id: "AK", name: "Ahmed Kareem", initials: "AK", color: "#E8450F", vehicle: "TRK-2041", rating: 4.7, status: "Available" },
    { id: "FK", name: "Faisal Baraka", initials: "FK", color: "#2563EB", vehicle: "DRA-9973", rating: 4.5, status: "Available" },
    { id: "SB", name: "Suresh Babu", initials: "SB", color: "#7C3AED", vehicle: "VRA-3358", rating: 4.8, status: "On Trip" },
  ];

  return (
    <div>
      <SectionHeader title="Logistics" desc="Business-logic components — trip timeline, route progress, driver/vehicle assignment, GPS status, POD, delivery status." />

      {/* Trip Timeline */}
      <Card className="p-6 mb-6">
        <SubHeader title="Trip Timeline" />
        <div className="relative">
          {[
            { icon: <CheckCircle2 size={16} />, color: "#16A34A", bg: "#F0FDF4", label: "Booking Confirmed",  time: "08:00 AM",  detail: "TRP-2387 created by operator", done: true },
            { icon: <Truck size={16} />,        color: "#16A34A", bg: "#F0FDF4", label: "Dispatched",         time: "08:15 AM",  detail: "Ahmed Kareem departed Riyadh depot", done: true },
            { icon: <Package size={16} />,      color: "#16A34A", bg: "#F0FDF4", label: "Cargo Picked Up",    time: "09:40 AM",  detail: "18,500 KG loaded · customer signed", done: true },
            { icon: <Navigation2 size={16} />,  color: "#E8450F", bg: "#FFF0EB", label: "In Transit",         time: "10:00 AM",  detail: "En route · 482 km remaining · ETA 08:03 PM", done: false, active: true },
            { icon: <MapPin size={16} />,       color: "#9898A4", bg: "#F5F5F7", label: "Arrived",            time: "—",         detail: "Pending", done: false },
            { icon: <PenLine size={16} />,      color: "#9898A4", bg: "#F5F5F7", label: "POD Collected",      time: "—",         detail: "Pending", done: false },
            { icon: <CheckCircle2 size={16} />, color: "#9898A4", bg: "#F5F5F7", label: "Trip Closed",        time: "—",         detail: "Pending", done: false },
          ].map((step, i, arr) => (
            <div key={step.label} className="flex gap-4 pb-6 last:pb-0">
              <div className="flex flex-col items-center">
                <div className="w-8 h-8 rounded-full flex items-center justify-center shrink-0 z-10" style={{ background: step.bg, color: step.color }}>{step.icon}</div>
                {i < arr.length - 1 && <div className={`w-0.5 flex-1 mt-1 ${step.done ? "bg-[#16A34A]" : "bg-[#EBEBED]"}`} />}
              </div>
              <div className="flex-1 pt-0.5 pb-2">
                <div className="flex items-center justify-between">
                  <p className={`text-sm font-semibold ${(step as any).active ? "text-[#E8450F]" : step.done ? "text-[#111]" : "text-[#9898A4]"}`}>{step.label}</p>
                  <span className="text-[10px] font-mono text-[#9898A4]">{step.time}</span>
                </div>
                <p className="text-xs text-[#6E6E80] mt-0.5">{step.detail}</p>
              </div>
            </div>
          ))}
        </div>
      </Card>

      {/* Route Progress */}
      <Card className="p-6 mb-6">
        <SubHeader title="Route Progress" />
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-[#E8450F]" />
            <p className="text-sm font-semibold text-[#111]">Riyadh</p>
          </div>
          <p className="text-xs font-mono text-[#6E6E80]">974 km total</p>
          <div className="flex items-center gap-2">
            <p className="text-sm font-semibold text-[#111]">Jeddah</p>
            <div className="w-3 h-3 rounded-full bg-[#16A34A]" />
          </div>
        </div>
        <div className="relative h-4 rounded-full bg-[#EBEBED] overflow-hidden mb-2">
          <div className="absolute h-full rounded-full bg-gradient-to-r from-[#E8450F] to-[#D97706]" style={{ width: "50.5%" }} />
          <div className="absolute top-1/2 -translate-y-1/2 w-5 h-5 rounded-full bg-white border-2 border-[#E8450F] shadow" style={{ left: "calc(50.5% - 10px)" }} />
        </div>
        <div className="flex justify-between text-xs text-[#6E6E80]">
          <span>0 km</span>
          <span className="font-semibold text-[#E8450F]">492 km covered (50.5%)</span>
          <span>974 km</span>
        </div>
        <div className="grid grid-cols-3 gap-3 mt-4">
          {[["Covered","492 km","#E8450F"],["Remaining","482 km","#6E6E80"],["ETA","2h 18m","#16A34A"]].map(([l,v,c]) => (
            <div key={l as string} className="text-center p-3 rounded-xl bg-[#F5F5F7]">
              <p className="text-base font-bold" style={{ color: c as string }}>{v}</p>
              <p className="text-[10px] text-[#9898A4] mt-0.5">{l}</p>
            </div>
          ))}
        </div>
      </Card>

      {/* Driver Assignment */}
      <Card className="p-6 mb-6">
        <SubHeader title="Driver Assignment" />
        <div className="flex items-center justify-between mb-4">
          <p className="text-sm text-[#6E6E80]">Assign driver for <span className="font-semibold text-[#111]">TRP-2390</span></p>
          <button className="text-xs text-[#E8450F] font-semibold">View All</button>
        </div>
        <div className="space-y-2 mb-4">
          {drivers.map((d) => (
            <button key={d.id} onClick={() => d.status === "Available" && setSelectedDriver(d.id)}
              className={`w-full flex items-center gap-3 p-3 rounded-xl border-2 transition-all text-left ${d.status === "On Trip" ? "opacity-50 cursor-not-allowed border-transparent bg-[#F5F5F7]" : selectedDriver === d.id ? "border-[#E8450F] bg-[#FFF0EB]" : "border-[#EBEBED] hover:border-[rgba(232,69,15,0.4)] bg-white"}`}>
              <div className="w-10 h-10 rounded-full flex items-center justify-center text-white text-sm font-bold shrink-0" style={{ background: d.color }}>{d.initials}</div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-[#111]">{d.name}</p>
                <p className="text-xs text-[#6E6E80]">{d.vehicle} · ★ {d.rating}</p>
              </div>
              <span className={`text-xs font-semibold px-2 py-1 rounded-full ${d.status === "Available" ? "bg-[#F0FDF4] text-[#16A34A]" : "bg-[#F5F5F7] text-[#6E6E80]"}`}>{d.status}</span>
              {selectedDriver === d.id && <Check size={16} className="text-[#E8450F] shrink-0" />}
            </button>
          ))}
        </div>
        <button disabled={!selectedDriver} className="w-full py-3 rounded-2xl bg-[#E8450F] text-white text-sm font-semibold disabled:opacity-40 hover:bg-[#C7380A] transition-colors">
          {selectedDriver ? `Assign ${drivers.find(d => d.id === selectedDriver)?.name}` : "Select a driver"}
        </button>
      </Card>

      {/* GPS + ICCES Status cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
        <Card className="p-5">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 rounded-xl bg-[#F0FDF4] flex items-center justify-center">
              <RadioTower size={20} className="text-[#16A34A]" />
            </div>
            <div className="flex-1">
              <p className="text-sm font-bold text-[#111]">GPS Status</p>
              <p className="text-xs text-[#6E6E80]">TRK-2041</p>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-[#16A34A] animate-pulse" />
              <span className="text-xs font-semibold text-[#16A34A]">Active</span>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-2">
            {[["Signal","Strong (4/4)"],["Accuracy","±5m"],["Speed","92 km/h"],["Last Ping","12s ago"],["Battery","84%"],["Network","4G"]].map(([k,v]) => (
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
              <Globe size={20} className="text-[#2563EB]" />
            </div>
            <div className="flex-1">
              <p className="text-sm font-bold text-[#111]">ICCES Status</p>
              <p className="text-xs text-[#6E6E80]">Cross-border clearance</p>
            </div>
            <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-[#F0FDF4] text-[#16A34A]">Cleared</span>
          </div>
          <div className="space-y-2.5">
            {[
              { label: "Border Point",   val: "King Fahd Causeway", ok: true },
              { label: "Customs Ref",    val: "CUS-2025-08742",     ok: true },
              { label: "Clearance Time", val: "24 May, 06:12 AM",   ok: true },
              { label: "Validity",       val: "Valid until 26 May",  ok: true },
            ].map((row) => (
              <div key={row.label} className="flex items-center justify-between text-xs">
                <span className="text-[#6E6E80]">{row.label}</span>
                <div className="flex items-center gap-1.5">
                  <span className="font-medium text-[#111]">{row.val}</span>
                  {row.ok && <Check size={11} className="text-[#16A34A]" />}
                </div>
              </div>
            ))}
          </div>
        </Card>
      </div>

      {/* Emergency Alert */}
      <Card className="p-5 border-2 border-[#DC2626]">
        <div className="flex items-start gap-3">
          <div className="w-12 h-12 rounded-2xl bg-[#FEF2F2] flex items-center justify-center shrink-0">
            <AlertCircle size={24} className="text-[#DC2626]" />
          </div>
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-1">
              <p className="text-base font-bold text-[#DC2626]">Emergency Alert</p>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-[#DC2626] text-white animate-pulse">URGENT</span>
            </div>
            <p className="text-xs text-[#6E6E80] mb-3">TRK-2041 · Ahmed Kareem · triggered panic button at 02:14 PM</p>
            <div className="grid grid-cols-3 gap-2 text-xs mb-4">
              {[["Location","King Fahd Rd, km 492"],["Speed","0 km/h (Stopped)"],["Time","02:14:38 PM"]].map(([k,v]) => (
                <div key={k as string} className="p-2 rounded-lg bg-[#FEF2F2]">
                  <p className="text-[#9898A4]">{k}</p>
                  <p className="font-semibold text-[#111] mt-0.5 text-[10px]">{v}</p>
                </div>
              ))}
            </div>
            <div className="flex gap-2">
              <button className="flex-1 py-2.5 rounded-xl bg-[#DC2626] text-white text-xs font-bold flex items-center justify-center gap-1.5"><Phone size={13} /> Call Driver</button>
              <button className="flex-1 py-2.5 rounded-xl bg-[#1A1A1A] text-white text-xs font-bold flex items-center justify-center gap-1.5"><Navigation2 size={13} /> Track Live</button>
              <button className="px-4 py-2.5 rounded-xl bg-[#F0F0F2] text-xs font-semibold text-[#444]">Dismiss</button>
            </div>
          </div>
        </div>
      </Card>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════════════════ */
/*  UTILITIES SECTION                                                           */
/* ═══════════════════════════════════════════════════════════════════════════ */
export function UtilitiesSection() {
  const [openAccordion, setOpenAccordion] = useState<number | null>(0);
  const [copied, setCopied] = useState(false);
  const [countdown, setCountdown] = useState(42);
  const [tooltipVisible, setTooltipVisible] = useState<string | null>(null);

  const handleCopy = (text: string) => {
    navigator.clipboard?.writeText(text).catch(() => {});
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  useEffect(() => {
    const t = setInterval(() => setCountdown((c) => (c > 0 ? c - 1 : 0)), 1000);
    return () => clearInterval(t);
  }, []);

  const accordionItems = [
    { title: "Vehicle Information", body: "TRK-2041 · Hino 500 · 10 TON · 2024 · Plate: ABC-1234 · Diesel · Available for assignment." },
    { title: "Assigned Driver",     body: "Ahmed Kareem · DRV-0041 · ★ 4.7 · 1,248 trips completed · Currently available." },
    { title: "Current Assignment",  body: "TRP-2387 · Riyadh → Jeddah · 18,500 KG · Est. delivery 24 May 08:03 PM." },
    { title: "Document Status",     body: "Insurance: Active (exp. 03 Jul 2026) · Fahas: Active · Istimara: Active · SASO: Due Soon." },
  ];

  return (
    <div>
      <SectionHeader title="Utilities" desc="Accordion, tooltip, QR code, copy button, tags, countdown timer, and dividers." />

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
        {/* Accordion */}
        <Card className="overflow-hidden">
          <div className="px-5 py-4 border-b border-[#F0F0F2]">
            <p className="text-xs font-semibold uppercase tracking-wider text-[#6E6E80]">Accordion</p>
          </div>
          <div className="divide-y divide-[#F0F0F2]">
            {accordionItems.map((item, i) => (
              <div key={i}>
                <button onClick={() => setOpenAccordion(openAccordion === i ? null : i)}
                  className="w-full flex items-center justify-between px-5 py-4 text-left hover:bg-[#FAFAFA] transition-colors">
                  <p className="text-sm font-semibold text-[#111]">{item.title}</p>
                  {openAccordion === i
                    ? <ChevronUp size={16} className="text-[#E8450F] shrink-0" />
                    : <ChevronDown size={16} className="text-[#9898A4] shrink-0" />}
                </button>
                {openAccordion === i && (
                  <div className="px-5 pb-4">
                    <p className="text-xs text-[#6E6E80] leading-relaxed">{item.body}</p>
                  </div>
                )}
              </div>
            ))}
          </div>
        </Card>

        {/* Tooltips */}
        <Card className="p-6">
          <SubHeader title="Tooltip" />
          <p className="text-xs text-[#6E6E80] mb-5">Hover each button to preview</p>
          <div className="flex flex-wrap gap-3">
            {[
              { id: "top",    label: "Top",    tip: "Navigate to home dashboard" },
              { id: "info",   label: "ⓘ Info", tip: "Trip TRP-2387 · Riyadh → Jeddah · 18,500 KG" },
              { id: "danger", label: "⚠ Alert", tip: "Document expires in 3 days. Renew now." },
            ].map((t) => (
              <div key={t.id} className="relative">
                <button onMouseEnter={() => setTooltipVisible(t.id)} onMouseLeave={() => setTooltipVisible(null)}
                  className="px-4 py-2 rounded-xl bg-[#F0F0F2] text-sm font-semibold text-[#444] hover:bg-[#E5E5E8] transition-colors">
                  {t.label}
                </button>
                {tooltipVisible === t.id && (
                  <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-3 py-2 bg-[#1A1A1A] text-white text-xs font-medium rounded-xl whitespace-nowrap shadow-lg z-50">
                    {t.tip}
                    <div className="absolute top-full left-1/2 -translate-x-1/2 border-4 border-transparent border-t-[#1A1A1A]" />
                  </div>
                )}
              </div>
            ))}
          </div>
        </Card>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
        {/* QR Code card */}
        <Card className="p-6 flex flex-col items-center text-center">
          <SubHeader title="QR Code Card" />
          <div className="w-32 h-32 bg-[#F5F5F7] rounded-2xl flex items-center justify-center mb-4 border-2 border-[#EBEBED]">
            <QrCode size={80} className="text-[#1A1A1A]" />
          </div>
          <p className="text-sm font-bold text-[#111]">TRP-2387</p>
          <p className="text-xs font-mono text-[#6E6E80] mt-0.5 mb-4">Scan to view trip details</p>
          <div className="flex gap-2 w-full">
            <button className="flex-1 py-2.5 rounded-xl bg-[#F0F0F2] text-xs font-semibold text-[#444] flex items-center justify-center gap-1.5"><Download size={13} /> Download</button>
            <button className="flex-1 py-2.5 rounded-xl bg-[#E8450F] text-white text-xs font-semibold flex items-center justify-center gap-1.5"><Phone size={13} /> Share</button>
          </div>
        </Card>

        {/* Copy button + countdown */}
        <div className="space-y-4">
          <Card className="p-6">
            <SubHeader title="Copy Button" />
            <div className="space-y-3">
              {[
                { label: "Trip ID",       val: "TRP-2387" },
                { label: "Tracking Link", val: "mercon.sa/track/TRP-2387" },
                { label: "Driver Phone",  val: "+966 50 123 4567" },
              ].map((item) => (
                <div key={item.label} className="flex items-center gap-2 p-3 rounded-xl bg-[#F5F5F7]">
                  <div className="flex-1 min-w-0">
                    <p className="text-[10px] text-[#9898A4]">{item.label}</p>
                    <p className="text-xs font-mono font-semibold text-[#111] truncate">{item.val}</p>
                  </div>
                  <button onClick={() => handleCopy(item.val)}
                    className={`flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-semibold transition-colors ${copied ? "bg-[#F0FDF4] text-[#16A34A]" : "bg-white border border-[#EBEBED] text-[#444] hover:border-[#E8450F]"}`}>
                    {copied ? <><Check size={11} /> Copied</> : <><Copy size={11} /> Copy</>}
                  </button>
                </div>
              ))}
            </div>
          </Card>

          <Card className="p-6">
            <SubHeader title="Countdown Timer" />
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-1">
                <div className="w-12 h-12 rounded-xl bg-[#1C1C1E] flex items-center justify-center">
                  <p className="text-lg font-bold text-white font-mono">{String(Math.floor(countdown / 60)).padStart(2,"0")}</p>
                </div>
                <p className="text-[#9898A4] font-bold">:</p>
                <div className="w-12 h-12 rounded-xl bg-[#1C1C1E] flex items-center justify-center">
                  <p className="text-lg font-bold text-white font-mono">{String(countdown % 60).padStart(2,"0")}</p>
                </div>
              </div>
              <div>
                <p className="text-sm font-semibold text-[#111]">OTP Expires</p>
                <p className="text-xs text-[#6E6E80]">{countdown > 0 ? `${countdown}s remaining` : "Expired — Resend"}</p>
              </div>
              {countdown === 0 && (
                <button onClick={() => setCountdown(42)} className="ml-auto text-xs font-bold text-[#E8450F] hover:underline">Resend</button>
              )}
            </div>
          </Card>
        </div>
      </div>

      {/* Tags */}
      <Card className="p-6 mb-6">
        <SubHeader title="Tags & Labels" />
        <div className="flex flex-wrap gap-2">
          {[
            { label: "Express",        color: "#E8450F", bg: "#FFF0EB" },
            { label: "Fragile",        color: "#DC2626", bg: "#FEF2F2" },
            { label: "Refrigerated",   color: "#2563EB", bg: "#EFF6FF" },
            { label: "Hazardous",      color: "#D97706", bg: "#FFFBEB" },
            { label: "Heavy Load",     color: "#7C3AED", bg: "#F5F3FF" },
            { label: "Priority",       color: "#16A34A", bg: "#F0FDF4" },
            { label: "Government",     color: "#1A1A1A", bg: "#F5F5F7" },
            { label: "Cross-Border",   color: "#0891B2", bg: "#ECFEFF" },
          ].map((t) => (
            <span key={t.label} className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold border" style={{ color: t.color, background: t.bg, borderColor: `${t.color}20` }}>
              {t.label}
              <button className="opacity-50 hover:opacity-100"><X size={10} /></button>
            </span>
          ))}
        </div>
      </Card>

      {/* Dividers */}
      <Card className="p-6">
        <SubHeader title="Dividers" />
        <div className="space-y-6">
          <div>
            <p className="text-[10px] text-[#9898A4] mb-2">Default</p>
            <div className="h-px bg-[#EBEBED]" />
          </div>
          <div>
            <p className="text-[10px] text-[#9898A4] mb-2">With Label</p>
            <div className="flex items-center gap-3">
              <div className="flex-1 h-px bg-[#EBEBED]" />
              <span className="text-[10px] font-semibold text-[#9898A4] uppercase tracking-wider">or</span>
              <div className="flex-1 h-px bg-[#EBEBED]" />
            </div>
          </div>
          <div>
            <p className="text-[10px] text-[#9898A4] mb-2">Brand</p>
            <div className="h-px bg-gradient-to-r from-transparent via-[#E8450F] to-transparent" />
          </div>
          <div>
            <p className="text-[10px] text-[#9898A4] mb-2">Section Divider</p>
            <div className="flex items-center gap-2">
              <div className="w-1 h-4 rounded-full bg-[#E8450F]" />
              <span className="text-xs font-bold text-[#111] uppercase tracking-wider">Trip Documents</span>
              <div className="flex-1 h-px bg-[#EBEBED]" />
            </div>
          </div>
        </div>
      </Card>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════════════════ */
/*  COMPONENT INDEX SECTION                                                     */
/* ═══════════════════════════════════════════════════════════════════════════ */
export const COMPONENT_INDEX = [
  {
    category: "01 Buttons",
    color: "#E8450F",
    bg: "#FFF0EB",
    Icon: Zap,
    items: [
      { name: "Button/Primary",    variants: "Small · Medium · Large",     states: "Default · Hover · Pressed · Focused · Disabled · Loading" },
      { name: "Button/Secondary",  variants: "Small · Medium · Large",     states: "Default · Hover · Pressed · Disabled" },
      { name: "Button/Outline",    variants: "Small · Medium · Large",     states: "Default · Hover · Focused · Disabled" },
      { name: "Button/Ghost",      variants: "Small · Medium · Large",     states: "Default · Hover · Pressed" },
      { name: "Button/Danger",     variants: "Medium · Large",             states: "Default · Hover · Disabled" },
      { name: "Button/Success",    variants: "Medium · Large",             states: "Default · Hover · Disabled" },
      { name: "Button/Icon",       variants: "Small · Medium · Large",     states: "Default · Hover · Active · Disabled" },
      { name: "Button/FAB",        variants: "Standard · Extended",        states: "Default · Pressed · Loading" },
      { name: "Button/FullWidth",  variants: "With Icon · Without Icon",   states: "Default · Loading · Disabled" },
    ],
  },
  {
    category: "02 Inputs",
    color: "#2563EB",
    bg: "#EFF6FF",
    Icon: Edit2,
    items: [
      { name: "Input/Text",        variants: "Default · With Icon · Read-only",    states: "Default · Focused · Error · Success · Disabled" },
      { name: "Input/Search",      variants: "With clear · Without clear",         states: "Default · Focused · Filled · Disabled" },
      { name: "Input/Password",    variants: "With toggle",                        states: "Default · Focused · Error · Disabled" },
      { name: "Input/Phone",       variants: "With country code",                  states: "Default · Focused · Error" },
      { name: "Input/Currency",    variants: "SAR · Other currencies",             states: "Default · Focused · Error" },
      { name: "Input/Dropdown",    variants: "Single select · Grouped",            states: "Default · Open · Selected · Disabled" },
      { name: "Input/MultiSelect", variants: "Chip style",                         states: "Default · Open · Selected · Cleared" },
      { name: "Input/DatePicker",  variants: "Single · Range",                     states: "Default · Open · Selected" },
      { name: "Input/OTP",         variants: "4-digit · 6-digit",                  states: "Empty · Filled · Error · Success" },
      { name: "Input/Checkbox",    variants: "With label · With sublabel",         states: "Default · Checked · Indeterminate · Disabled" },
      { name: "Input/Radio",       variants: "With label · With sublabel",         states: "Default · Selected · Disabled" },
      { name: "Input/Toggle",      variants: "Standard · With label",              states: "Off · On · Disabled" },
      { name: "Input/Stepper",     variants: "Compact · Full",                     states: "Default · Min · Max · Disabled" },
      { name: "Input/Slider",      variants: "Single · Range",                     states: "Default · Active · Disabled" },
      { name: "Input/Textarea",    variants: "Auto-grow · Fixed",                  states: "Default · Focused · Error · Disabled" },
    ],
  },
  {
    category: "03 Cards",
    color: "#7C3AED",
    bg: "#F5F3FF",
    Icon: Layers,
    items: [
      { name: "Card/Stat/Dark",        variants: "With icon · With delta",           states: "Default" },
      { name: "Card/Stat/Light",       variants: "With delta · With sparkline",      states: "Default · Highlighted" },
      { name: "Card/Trip",             variants: "List · Expanded",                  states: "Default · Selected · Loading" },
      { name: "Card/Vehicle",          variants: "List · Detail · Compact",          states: "Available · OnTrip · Maintenance · Inactive" },
      { name: "Card/Driver",           variants: "List · Profile",                   states: "Available · OnTrip · Offline" },
      { name: "Card/Document",         variants: "Active · Expiring · Expired",      states: "Default · Highlighted · Loading" },
      { name: "Card/Invoice",          variants: "Summary · Detailed",               states: "Paid · Pending · Overdue" },
      { name: "Card/Fuel",             variants: "Summary · Alert",                  states: "Normal · Warning" },
      { name: "Card/Maintenance",      variants: "Due · Overdue",                    states: "Default · Alert" },
      { name: "Card/Cargo",            variants: "Summary · Expanded",               states: "Default" },
      { name: "Card/Customer",         variants: "Compact · Full",                   states: "Default · VIP" },
      { name: "Card/Revenue",          variants: "Dark header · With chart",         states: "Default" },
      { name: "Card/QuickAction",      variants: "Grid · List",                      states: "Default · Hover · Pressed" },
      { name: "Card/POD",              variants: "Preview · Verified",               states: "Pending · Uploaded · Verified" },
      { name: "Card/Notification",     variants: "Unread · Read",                    states: "Default · Hover · Grouped" },
    ],
  },
  {
    category: "04 Status & Badges",
    color: "#16A34A",
    bg: "#F0FDF4",
    Icon: CheckCircle2,
    items: [
      { name: "Badge/Trip/Completed",   variants: "Pill · Dot",    states: "—" },
      { name: "Badge/Trip/InTransit",   variants: "Pill · Dot",    states: "—" },
      { name: "Badge/Trip/Delayed",     variants: "Pill · Dot",    states: "—" },
      { name: "Badge/Trip/Cancelled",   variants: "Pill · Dot",    states: "—" },
      { name: "Badge/Trip/Pending",     variants: "Pill · Dot",    states: "—" },
      { name: "Badge/Vehicle/Available",variants: "Pill",          states: "—" },
      { name: "Badge/Vehicle/OnTrip",   variants: "Pill",          states: "—" },
      { name: "Badge/Document/Active",  variants: "Pill",          states: "—" },
      { name: "Badge/Document/Critical",variants: "Pill · Solid",  states: "Pulse animation" },
      { name: "Badge/Document/Expired", variants: "Pill",          states: "—" },
      { name: "Badge/Priority/Critical",variants: "Solid pill",    states: "—" },
      { name: "Badge/Priority/High",    variants: "Solid pill",    states: "—" },
      { name: "Chip/Filter",            variants: "Active · Inactive",    states: "Default · Hover · Selected · Removable" },
      { name: "Chip/Tag",               variants: "With remove · Static", states: "Default · Hover · Pressed" },
    ],
  },
  {
    category: "05 Navigation",
    color: "#1A1A1A",
    bg: "#F5F5F7",
    Icon: Navigation,
    items: [
      { name: "Nav/Bottom/Operator",    variants: "5 items + FAB",        states: "Default · Item Active" },
      { name: "Nav/Bottom/Driver",      variants: "3 items · Dark pill",  states: "Default · Item Active" },
      { name: "Nav/TopBar/List",        variants: "With filters",         states: "Default · Scrolled" },
      { name: "Nav/TopBar/Detail",      variants: "With actions",         states: "Default" },
      { name: "Nav/Tab/Pill",           variants: "2–5 items",            states: "Default · Active" },
      { name: "Nav/Tab/Underline",      variants: "2–6 items",            states: "Default · Active" },
      { name: "Nav/Tab/Icon",           variants: "With icon + label",    states: "Default · Active" },
      { name: "Nav/Tab/Segmented",      variants: "2–4 segments",         states: "Default · Active" },
      { name: "Nav/Breadcrumb",         variants: "2–5 levels",           states: "Default · Last item" },
      { name: "Nav/FAB",                variants: "Round · Extended",     states: "Default · Pressed · Loading" },
    ],
  },
  {
    category: "06 Modals & Overlays",
    color: "#D97706",
    bg: "#FFFBEB",
    Icon: Layers,
    items: [
      { name: "Modal/Confirmation",     variants: "—",                    states: "Default · Loading" },
      { name: "Modal/Delete",           variants: "—",                    states: "Default · Confirming" },
      { name: "Modal/Warning",          variants: "—",                    states: "Default" },
      { name: "Modal/Success",          variants: "—",                    states: "Default" },
      { name: "Modal/Error",            variants: "—",                    states: "Default · Retrying" },
      { name: "Modal/Information",      variants: "—",                    states: "Default" },
      { name: "Modal/AssignDriver",     variants: "List · Search",        states: "Default · Selected" },
      { name: "Modal/AssignVehicle",    variants: "List · Search",        states: "Default · Selected" },
      { name: "Modal/BottomSheet",      variants: "Actions · Filter · Selection", states: "Hidden · Visible · Dismissing" },
      { name: "Modal/Drawer",           variants: "Vehicle · Driver · Trip",     states: "Hidden · Open" },
      { name: "Modal/Loading",          variants: "Overlay · Inline",     states: "Visible" },
    ],
  },
  {
    category: "07 Feedback",
    color: "#DC2626",
    bg: "#FEF2F2",
    Icon: Bell,
    items: [
      { name: "Toast/Success",          variants: "With action · Without",  states: "Enter · Visible · Exit" },
      { name: "Toast/Error",            variants: "With retry",             states: "Enter · Visible · Exit" },
      { name: "Toast/Warning",          variants: "With action",            states: "Enter · Visible · Exit" },
      { name: "Toast/Info",             variants: "—",                      states: "Enter · Visible · Exit" },
      { name: "Toast/Loading",          variants: "Indeterminate",          states: "Visible · Complete" },
      { name: "Toast/Undo",             variants: "With countdown",         states: "Visible · Undone" },
      { name: "Banner/Info",            variants: "Dismissable · Sticky",   states: "Default · Dismissed" },
      { name: "Banner/Warning",         variants: "Dismissable · Sticky",   states: "Default · Dismissed" },
      { name: "Banner/Danger",          variants: "Dismissable",            states: "Default · Dismissed" },
      { name: "Banner/Offline",         variants: "With retry",             states: "Offline · Reconnecting · Online" },
      { name: "Banner/Sync",            variants: "Progress · Complete",    states: "Syncing · Done · Failed" },
      { name: "Alert/Inline",           variants: "Success · Warning · Error · Info", states: "Default" },
    ],
  },
  {
    category: "08 Loading & Skeletons",
    color: "#6E6E80",
    bg: "#F5F5F7",
    Icon: Loader2,
    items: [
      { name: "Skeleton/TripCard",      variants: "List item",             states: "Shimmer" },
      { name: "Skeleton/VehicleCard",   variants: "Detail",                states: "Shimmer" },
      { name: "Skeleton/Dashboard",     variants: "Stats + chart",         states: "Shimmer" },
      { name: "Skeleton/Table",         variants: "5 rows",                states: "Shimmer" },
      { name: "Skeleton/ListItem",      variants: "Single row",            states: "Shimmer" },
      { name: "Spinner/Circular",       variants: "Small · Medium · Large", states: "Spinning" },
      { name: "Spinner/Linear",         variants: "Determinate · Indeterminate", states: "Animated" },
      { name: "Overlay/Loading",        variants: "Full screen · Partial", states: "Visible · Dismissed" },
    ],
  },
  {
    category: "09 Empty States",
    color: "#0891B2",
    bg: "#ECFEFF",
    Icon: Package,
    items: [
      { name: "Empty/NoTrips",          variants: "With CTA",              states: "Default" },
      { name: "Empty/NoDrivers",        variants: "With CTA",              states: "Default" },
      { name: "Empty/NoVehicles",       variants: "With CTA",              states: "Default" },
      { name: "Empty/NoDocuments",      variants: "With CTA",              states: "Default" },
      { name: "Empty/NoResults",        variants: "With clear",            states: "Default" },
      { name: "Empty/NoInternet",       variants: "With retry",            states: "Default" },
      { name: "Empty/NoNotifications",  variants: "Informational",         states: "Default" },
      { name: "Empty/PermissionDenied", variants: "With request action",   states: "Default" },
      { name: "Empty/Maintenance",      variants: "With status link",      states: "Default" },
      { name: "Empty/ComingSoon",       variants: "With notify action",    states: "Default" },
    ],
  },
  {
    category: "10 Charts",
    color: "#E8450F",
    bg: "#FFF0EB",
    Icon: BarChart3,
    items: [
      { name: "Chart/Line",             variants: "Single · Multi-line",   states: "Default · Hover tooltip" },
      { name: "Chart/Area",             variants: "Single · Stacked",      states: "Default · Hover tooltip" },
      { name: "Chart/Bar/Vertical",     variants: "Single · Grouped",      states: "Default · Hover tooltip" },
      { name: "Chart/Bar/Horizontal",   variants: "Ranked list",           states: "Default · Hover tooltip" },
      { name: "Chart/Donut",            variants: "With legend",           states: "Default · Segment hover" },
      { name: "Chart/ProgressRing",     variants: "Single value",          states: "Default · Animated" },
      { name: "Chart/Sparkline",        variants: "Inline mini",           states: "Default" },
      { name: "Chart/Gauge",            variants: "Utilization",           states: "Default" },
    ],
  },
  {
    category: "11 Maps",
    color: "#16A34A",
    bg: "#F0FDF4",
    Icon: MapPin,
    items: [
      { name: "Map/Marker/Pickup",      variants: "Standard",              states: "Default · Active" },
      { name: "Map/Marker/Drop",        variants: "Standard",              states: "Default · Active" },
      { name: "Map/Marker/Vehicle",     variants: "With label",            states: "Default · Live pulse" },
      { name: "Map/Marker/Driver",      variants: "With avatar",           states: "Default · Active" },
      { name: "Map/Widget/ETA",         variants: "Card",                  states: "Default · Updating" },
      { name: "Map/Widget/Speed",       variants: "Card",                  states: "Default" },
      { name: "Map/Widget/Distance",    variants: "Card",                  states: "Default" },
      { name: "Map/Card/Tracking",      variants: "Full · Compact",        states: "Live · Offline" },
      { name: "Map/Overlay/Toolbar",    variants: "Search + Controls",     states: "Default" },
    ],
  },
  {
    category: "12 Logistics",
    color: "#1A1A1A",
    bg: "#F5F5F7",
    Icon: Truck,
    items: [
      { name: "Logistics/TripTimeline",     variants: "Full · Compact",       states: "Each step: Pending · Active · Done" },
      { name: "Logistics/RouteProgress",    variants: "Bar + metrics",         states: "Default · Updating" },
      { name: "Logistics/DriverAssignment", variants: "List · Search",         states: "Default · Selected · Assigned" },
      { name: "Logistics/VehicleAssignment",variants: "List · Search",         states: "Default · Selected · Assigned" },
      { name: "Logistics/CargoSummary",     variants: "Grid",                  states: "Default" },
      { name: "Logistics/GPS/Status",       variants: "Active · Weak · Lost",  states: "Default" },
      { name: "Logistics/ICCES/Status",     variants: "Cleared · Pending",     states: "Default" },
      { name: "Logistics/Emergency/Alert",  variants: "Full · Compact",        states: "Active · Dismissed" },
      { name: "Logistics/POD/Card",         variants: "Pending · Uploaded",    states: "Pending · Verified" },
      { name: "Logistics/DeliveryStatus",   variants: "Step-by-step",          states: "Each step state" },
    ],
  },
  {
    category: "13 Tables",
    color: "#7C3AED",
    bg: "#F5F3FF",
    Icon: FileText,
    items: [
      { name: "Table/Desktop",          variants: "Full",                  states: "Default · Loading · Empty" },
      { name: "Table/Row/Default",      variants: "—",                     states: "Default · Hover · Selected" },
      { name: "Table/Row/Checkbox",     variants: "—",                     states: "Unchecked · Checked · Indeterminate" },
      { name: "Table/Header/Sortable",  variants: "Asc · Desc",            states: "Default · Sorted" },
      { name: "Table/Pagination",       variants: "Numbered · Simple",     states: "Default · Page active" },
      { name: "Table/BulkActions",      variants: "With count",            states: "Hidden · Visible" },
      { name: "Table/FilterBar",        variants: "Chips · Dropdowns",     states: "Default · Active filters" },
    ],
  },
  {
    category: "14 Avatars",
    color: "#E8450F",
    bg: "#FFF0EB",
    Icon: User,
    items: [
      { name: "Avatar/Initial",         variants: "SM · MD · LG · XL",     states: "Default · Online · Offline · Busy" },
      { name: "Avatar/Group",           variants: "Stack · Overflow count", states: "Default" },
      { name: "Avatar/WithStatus",      variants: "Online dot",             states: "Online · Offline · Busy" },
    ],
  },
  {
    category: "15 Progress",
    color: "#2563EB",
    bg: "#EFF6FF",
    Icon: Activity,
    items: [
      { name: "Progress/Linear",        variants: "Thin · Standard · Thick", states: "Default · Animated · Complete" },
      { name: "Progress/Circular",      variants: "Small · Medium · Large",  states: "Default · Animated" },
      { name: "Progress/Stepper",       variants: "3–6 steps",               states: "Pending · Active · Complete" },
      { name: "Progress/Timeline",      variants: "Vertical",                states: "Each step: Pending · Active · Done" },
      { name: "Progress/Upload",        variants: "With file info",           states: "Uploading · Complete · Error" },
    ],
  },
  {
    category: "16 Utilities",
    color: "#6E6E80",
    bg: "#F5F5F7",
    Icon: Settings,
    items: [
      { name: "Accordion",              variants: "Single · Multiple",      states: "Closed · Open" },
      { name: "Tooltip",                variants: "Top · Bottom · Auto",    states: "Hidden · Visible" },
      { name: "CopyButton",             variants: "Icon · With label",      states: "Default · Copied" },
      { name: "QRCard",                 variants: "With actions",           states: "Default" },
      { name: "Countdown",              variants: "MM:SS",                  states: "Running · Expired" },
      { name: "Tag/Removable",          variants: "All status colors",      states: "Default · Hover · Removed" },
      { name: "Divider/Default",        variants: "Horizontal",             states: "—" },
      { name: "Divider/WithLabel",      variants: "Centered label",         states: "—" },
      { name: "Divider/Brand",          variants: "Gradient",               states: "—" },
    ],
  },
];

export function ComponentIndexSection() {
  const [search, setSearch] = useState("");
  const [expanded, setExpanded] = useState<string | null>(null);

  const totalComponents = COMPONENT_INDEX.reduce((acc, g) => acc + g.items.length, 0);

  const filtered = COMPONENT_INDEX.map((g) => ({
    ...g,
    items: g.items.filter(
      (item) =>
        item.name.toLowerCase().includes(search.toLowerCase()) ||
        g.category.toLowerCase().includes(search.toLowerCase())
    ),
  })).filter((g) => g.items.length > 0);

  return (
    <div>
      <SectionHeader title="Component Index" desc="Every reusable component in the MERCON design system — listed by category with variants and states." />

      {/* Stats bar */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
        {[
          { label: "Total Components", value: totalComponents,                      color: "#E8450F" },
          { label: "Categories",        value: COMPONENT_INDEX.length,              color: "#2563EB" },
          { label: "With Variants",     value: totalComponents,                     color: "#16A34A" },
          { label: "With States",       value: totalComponents,                     color: "#7C3AED" },
        ].map((s) => (
          <Card key={s.label} className="p-4 text-center">
            <p className="text-2xl font-bold" style={{ color: s.color }}>{s.value}</p>
            <p className="text-xs text-[#6E6E80] mt-0.5">{s.label}</p>
          </Card>
        ))}
      </div>

      {/* Search */}
      <div className="relative mb-6">
        <Search size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-[#9898A4]" />
        <input
          className="w-full pl-10 pr-4 py-3 rounded-xl bg-white border border-[#EBEBED] text-sm outline-none focus:ring-2 focus:ring-[rgba(232,69,15,0.3)] placeholder:text-[#9898A4] shadow-sm"
          placeholder="Search components, e.g. Button, Card, Badge…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        {search && (
          <button onClick={() => setSearch("")} className="absolute right-4 top-1/2 -translate-y-1/2 text-[#9898A4] hover:text-[#444]">
            <X size={14} />
          </button>
        )}
      </div>

      {/* Category groups */}
      <div className="space-y-3">
        {filtered.map((group) => {
          const isOpen = expanded === group.category || search.length > 0;
          return (
            <Card key={group.category} className="overflow-hidden">
              {/* Category header */}
              <button
                onClick={() => setExpanded(isOpen && !search ? null : group.category)}
                className="w-full flex items-center gap-4 px-5 py-4 hover:bg-[#FAFAFA] transition-colors text-left"
              >
                <div className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0" style={{ background: group.bg, color: group.color }}>
                  <group.Icon size={18} />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-bold text-[#111]">{group.category}</p>
                  <p className="text-xs text-[#9898A4]">{group.items.length} components</p>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-xs font-semibold px-2.5 py-1 rounded-full" style={{ background: group.bg, color: group.color }}>
                    {group.items.length}
                  </span>
                  {isOpen && !search
                    ? <ChevronUp size={16} className="text-[#9898A4]" />
                    : <ChevronDown size={16} className="text-[#9898A4]" />}
                </div>
              </button>

              {/* Component rows */}
              {isOpen && (
                <div className="border-t border-[#F0F0F2]">
                  {/* Table header */}
                  <div className="grid grid-cols-12 gap-2 px-5 py-2 bg-[#FAFAFA] border-b border-[#F0F0F2]">
                    <p className="col-span-4 text-[10px] font-bold uppercase tracking-wider text-[#9898A4]">Component Name</p>
                    <p className="col-span-4 text-[10px] font-bold uppercase tracking-wider text-[#9898A4]">Variants</p>
                    <p className="col-span-4 text-[10px] font-bold uppercase tracking-wider text-[#9898A4]">States</p>
                  </div>
                  {group.items.map((item, i) => (
                    <div key={item.name} className={`grid grid-cols-12 gap-2 px-5 py-3 border-b border-[#F5F5F7] last:border-0 items-start ${i % 2 === 0 ? "" : "bg-[rgba(250,250,250,0.5)]"}`}>
                      <div className="col-span-4 flex items-center gap-2">
                        <span className="w-1.5 h-1.5 rounded-full shrink-0 mt-1.5" style={{ background: group.color }} />
                        <code className="text-xs font-mono font-semibold text-[#111] break-all">{item.name}</code>
                      </div>
                      <p className="col-span-4 text-xs text-[#6E6E80] leading-relaxed">{item.variants}</p>
                      <p className="col-span-4 text-xs text-[#9898A4] leading-relaxed">{item.states}</p>
                    </div>
                  ))}
                </div>
              )}
            </Card>
          );
        })}
      </div>

      {filtered.length === 0 && (
        <div className="text-center py-16">
          <div className="w-14 h-14 rounded-2xl bg-[#F5F5F7] flex items-center justify-center mx-auto mb-4">
            <Search size={24} className="text-[#9898A4]" strokeWidth={1.8} />
          </div>
          <p className="text-sm font-semibold text-[#111]">No components match "{search}"</p>
          <p className="text-xs text-[#6E6E80] mt-1">Try a different keyword</p>
        </div>
      )}
    </div>
  );
}
