import React, { useState } from "react";
import {
  Home, Truck, Users, MoreHorizontal, Plus, Bell, ChevronRight, ChevronDown,
  MapPin, Package, Clock, CheckCircle2, AlertTriangle, FileText, Settings,
  Eye, Download, Phone, Mail, Shield, Search, Filter, ArrowRight, LogOut,
  Globe, Lock, Info, Star, Edit2, Trash2, X, Check, User, BarChart3, Fuel,
  Calendar, DollarSign, Navigation2, ReceiptText, Building2, CreditCard,
  AlertCircle, Activity, TrendingUp, ArrowUp, ArrowDown, Gauge, Route,
  Layers, RefreshCw, ChevronLeft, Printer, Share2, Archive, UserPlus,
  FolderOpen, Car, Wrench, SlidersHorizontal, MoreVertical, ExternalLink,
  PieChart as PieChartIcon, Camera, Upload
} from "lucide-react";
import macronLogo from "@/imports/MACRON_LOGO.jpeg";
import { ImageWithFallback } from "@/app/components/figma/ImageWithFallback";
import { SectionHeader } from "./common";
import {
  AreaChart, Area, LineChart, Line, BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer
} from "recharts";

/* ─── Per-instance unique gradient IDs (avoids recharts duplicate-key when
       multiple chart components render simultaneously in the thumbnail grid) ── */
let _gid = 0;
function useGradId(prefix: string) {
  const [id] = React.useState(() => `${prefix}-${++_gid}`);
  return id;
}

/* ─── Design tokens ───────────────────────────────────────────────────────── */
const OR = "#E8450F";
const BK = "#111111";
const SB = "#1C1C2E"; // sidebar bg

/* ─── Shared data ─────────────────────────────────────────────────────────── */
const trendData = [
  { m: "Jan", v: 88 }, { m: "Feb", v: 102 }, { m: "Mar", v: 95 },
  { m: "Apr", v: 118 }, { m: "May", v: 128 }, { m: "Jun", v: 141 },
];
const revData = [
  { m: "Jan", r: 168000 }, { m: "Feb", r: 192000 }, { m: "Mar", r: 181000 },
  { m: "Apr", r: 224000 }, { m: "May", r: 213540 }, { m: "Jun", r: 238000 },
];
const statusData = [
  { name: "Completed", value: 86, color: "#16A34A" },
  { name: "In Transit", value: 28, color: "#2563EB" },
  { name: "Delayed",    value: 9,  color: "#D97706" },
  { name: "Cancelled",  value: 5,  color: "#DC2626" },
];
const TRIPS = [
  { id:"TRP-2387",cust:"Fahad Trading",from:"Riyadh",to:"Jeddah",  driver:"Ahmed K.",  vehicle:"TRK-2041",status:"Completed",  sc:"#16A34A",sb:"#F0FDF4",dt:"24 May" },
  { id:"TRP-2388",cust:"Al-Rashid Grp",from:"Riyadh",to:"Abha",   driver:"Faisal B.", vehicle:"DRA-9973",status:"In Transit", sc:"#2563EB",sb:"#EFF6FF",dt:"24 May" },
  { id:"TRP-2389",cust:"Saudi Polymers",from:"Riyadh",to:"Dammam",driver:"Bader A.",  vehicle:"VRA-3358",status:"Delayed",    sc:"#D97706",sb:"#FFFBEB",dt:"24 May" },
  { id:"TRP-2390",cust:"SABIC Trading", from:"Jeddah",to:"Tabouk",driver:"Suresh B.", vehicle:"LKA-3812",status:"Pending",    sc:"#6E6E80",sb:"#F5F5F7",dt:"25 May" },
  { id:"TRP-2391",cust:"Fahad Trading", from:"Riyadh",to:"Medina",driver:"Mohammed H.",vehicle:"TRK-2041",status:"Cancelled",  sc:"#DC2626",sb:"#FEF2F2",dt:"25 May" },
];
const DRIVERS = [
  { id:"DRV-0041",name:"Ahmed Kareem",  trips:1248,rating:4.7,status:"Available", sc:"#16A34A",sb:"#F0FDF4",vehicle:"TRK-2041" },
  { id:"DRV-0042",name:"Faisal Baraka", trips:892, rating:4.5,status:"On Trip",   sc:"#2563EB",sb:"#EFF6FF",vehicle:"DRA-9973" },
  { id:"DRV-0043",name:"Suresh Babu",   trips:1102,rating:4.8,status:"Available", sc:"#16A34A",sb:"#F0FDF4",vehicle:"VRA-3358" },
  { id:"DRV-0044",name:"Bader Ali",     trips:643, rating:4.3,status:"Off Duty",  sc:"#6E6E80",sb:"#F5F5F7",vehicle:"—"       },
];
const VEHICLES = [
  { id:"TRK-2041",model:"Hino 500",   cap:"10 TON",status:"Available",  sc:"#16A34A",sb:"#F0FDF4",driver:"Ahmed K.",  docs:6 },
  { id:"DRA-9973",model:"Mercedes",   cap:"20 TON",status:"On Trip",    sc:"#2563EB",sb:"#EFF6FF",driver:"Faisal B.", docs:5 },
  { id:"VRA-3358",model:"Volvo FH",   cap:"10 TON",status:"Available",  sc:"#16A34A",sb:"#F0FDF4",driver:"Suresh B.", docs:4 },
  { id:"LKA-3812",model:"Isuzu NMR",  cap:"5 TON", status:"Maintenance",sc:"#D97706",sb:"#FFFBEB",driver:"—",         docs:3 },
];

/* ─── Shared layout components ────────────────────────────────────────────── */
function Sidebar({ active }: { active: string }) {
  const groups = [
    { label: "OVERVIEW", items: [
      { icon: Home,        label: "Dashboard" },
      { icon: Bell,        label: "Notifications", badge: 5 },
    ]},
    { label: "OPERATIONS", items: [
      { icon: Truck,       label: "Trips" },
      { icon: Users,       label: "Drivers" },
      { icon: Car,         label: "Vehicles" },
      { icon: Building2,   label: "Customers" },
    ]},
    { label: "FINANCE", items: [
      { icon: CreditCard,  label: "Rate Cards" },
      { icon: ReceiptText, label: "Invoices" },
    ]},
    { label: "COMPLIANCE", items: [
      { icon: FileText,    label: "Documents" },
      { icon: BarChart3,   label: "Reports" },
    ]},
    { label: "ACCOUNT", items: [
      { icon: Settings,    label: "Settings" },
      { icon: User,        label: "Profile" },
    ]},
  ];
  return (
    <div className="flex flex-col w-[220px] shrink-0 h-full overflow-y-auto" style={{ background: SB }}>
      {/* Logo */}
      <div className="flex items-center gap-2.5 px-5 py-4 border-b border-[rgba(255,255,255,0.1)]">
        <div className="w-8 h-8 rounded-xl bg-white flex items-center justify-center">
          <ImageWithFallback src={macronLogo} alt="Mercon" className="w-6 h-6 object-contain" />
        </div>
        <div>
          <p className="text-xs font-bold text-white leading-tight">MERCON</p>
          <p className="text-[9px] text-[rgba(255,255,255,0.4)]">Operator Platform</p>
        </div>
      </div>
      {/* Nav groups */}
      <div className="flex-1 px-3 py-3 space-y-4 overflow-y-auto">
        {groups.map((g) => (
          <div key={g.label}>
            <p className="text-[9px] font-bold text-[rgba(255,255,255,0.3)] uppercase tracking-widest px-2 mb-1.5">{g.label}</p>
            {g.items.map((item) => {
              const on = active === item.label;
              return (
                <div key={item.label} className={`flex items-center gap-2.5 px-3 py-2 rounded-xl mb-0.5 cursor-pointer transition-colors ${on ? "bg-[#E8450F] text-white" : "text-[rgba(255,255,255,0.5)] hover:bg-[rgba(255,255,255,0.1)] hover:text-white"}`}>
                  <item.icon size={16} strokeWidth={on ? 2.2 : 1.7} />
                  <span className="text-xs font-semibold flex-1">{item.label}</span>
                  {(item as any).badge && !on && (
                    <span className="w-4 h-4 rounded-full bg-[#E8450F] text-white text-[9px] font-bold flex items-center justify-center">{(item as any).badge}</span>
                  )}
                </div>
              );
            })}
          </div>
        ))}
      </div>
      {/* User footer */}
      <div className="px-4 py-3 border-t border-[rgba(255,255,255,0.1)] flex items-center gap-2.5">
        <div className="w-7 h-7 rounded-full bg-[#E8450F] flex items-center justify-center text-white text-[10px] font-bold shrink-0">MH</div>
        <div className="flex-1 min-w-0"><p className="text-xs font-semibold text-white truncate">Mohammed Al-Harbi</p><p className="text-[9px] text-[rgba(255,255,255,0.4)] truncate">Riyadh Branch</p></div>
        <LogOut size={14} className="text-[rgba(255,255,255,0.3)] shrink-0" />
      </div>
    </div>
  );
}

function Header({ title, breadcrumb, actions }: { title: string; breadcrumb?: string; actions?: React.ReactNode }) {
  return (
    <div className="shrink-0 bg-white border-b border-black/[0.07] px-6 h-14 flex items-center gap-4">
      {breadcrumb && <p className="text-xs text-[#9898A4]">{breadcrumb} <span className="text-[#9898A4]">/</span> <span className="text-[#111] font-medium">{title}</span></p>}
      {!breadcrumb && <p className="text-sm font-bold text-[#111] flex-1">{title}</p>}
      <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-[#F5F5F7] ml-auto" style={{ width: 220 }}>
        <Search size={14} className="text-[#9898A4]" />
        <span className="text-xs text-[#9898A4]">Search anything…</span>
      </div>
      <div className="relative">
        <div className="w-8 h-8 rounded-xl bg-[#F5F5F7] flex items-center justify-center"><Bell size={16} className="text-[#444]" /></div>
        <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-[#E8450F] text-white text-[9px] font-bold flex items-center justify-center">5</span>
      </div>
      <div className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl bg-[#F5F5F7]">
        <div className="w-5 h-5 rounded-full bg-[#1A1A1A] flex items-center justify-center text-white text-[9px] font-bold">MH</div>
        <span className="text-xs font-semibold text-[#111]">Mohammed</span>
        <ChevronDown size={12} className="text-[#9898A4]" />
      </div>
      {actions}
    </div>
  );
}

function PageTitle({ title, sub, actions }: { title: string; sub?: string; actions?: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between px-6 py-4 shrink-0">
      <div>
        <p className="text-xl font-bold text-[#111]">{title}</p>
        {sub && <p className="text-xs text-[#6E6E80] mt-0.5">{sub}</p>}
      </div>
      {actions && <div className="flex items-center gap-2">{actions}</div>}
    </div>
  );
}

function Btn({ label, icon, variant = "primary", size = "md" }: { label: string; icon?: React.ReactNode; variant?: "primary"|"secondary"|"ghost"; size?: "sm"|"md" }) {
  const base = "flex items-center gap-1.5 font-semibold rounded-xl transition-colors";
  const sz   = size === "sm" ? "px-3 py-1.5 text-xs" : "px-4 py-2 text-sm";
  const col  = variant === "primary" ? "bg-[#E8450F] text-white hover:bg-[#C7380A]"
             : variant === "secondary" ? "bg-[#F0F0F2] text-[#444] hover:bg-[#E5E5E8]"
             : "text-[#E8450F] hover:bg-[#FFF0EB]";
  return <button className={`${base} ${sz} ${col}`}>{icon}{label}</button>;
}

function KpiCard({ label, value, delta, up, icon: Icon, color, bg }: { label: string; value: string; delta: string; up: boolean; icon: React.ElementType; color: string; bg: string }) {
  return (
    <div className="bg-white rounded-2xl p-5 border border-black/[0.06] shadow-sm">
      <div className="flex items-center justify-between mb-3">
        <div className="w-10 h-10 rounded-2xl flex items-center justify-center" style={{ background: bg }}><Icon size={20} style={{ color }} /></div>
        <div className={`flex items-center gap-1 text-xs font-semibold ${up ? "text-[#16A34A]" : "text-[#DC2626]"}`}>
          {up ? <ArrowUp size={12} /> : <ArrowDown size={12} />}{delta}
        </div>
      </div>
      <p className="text-2xl font-bold text-[#111]">{value}</p>
      <p className="text-xs text-[#6E6E80] mt-1">{label}</p>
    </div>
  );
}

function StatusBadge({ status, color, bg }: { status: string; color: string; bg: string }) {
  return <span className="inline-flex items-center gap-1 text-xs font-semibold px-2 py-0.5 rounded-full" style={{ color, background: bg }}>{status}</span>;
}

function TableWrapper({ children, search = true, filters = true, export: exp = true }: { children: React.ReactNode; search?: boolean; filters?: boolean; export?: boolean }) {
  return (
    <div className="bg-white rounded-2xl border border-black/[0.06] shadow-sm overflow-hidden mx-6 mb-6">
      <div className="flex items-center gap-3 px-5 py-3 border-b border-[#F0F0F2]">
        {search && (
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-[#F5F5F7] flex-1 max-w-xs">
            <Search size={13} className="text-[#9898A4]" />
            <span className="text-xs text-[#9898A4]">Search…</span>
          </div>
        )}
        {filters && <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#F5F5F7] text-xs font-medium text-[#444]"><Filter size={13} />Filters</div>}
        {exp && <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#F5F5F7] text-xs font-medium text-[#444] ml-auto"><Download size={13} />Export</div>}
      </div>
      <div className="overflow-x-auto">{children}</div>
    </div>
  );
}

function THead({ cols }: { cols: string[] }) {
  return (
    <thead className="bg-[#FAFAFA] border-b border-[#F0F0F2]">
      <tr>{cols.map((c) => <th key={c} className="px-5 py-2.5 text-left text-[10px] font-bold uppercase tracking-wider text-[#9898A4] whitespace-nowrap">{c}</th>)}</tr>
    </thead>
  );
}

function Pager() {
  return (
    <div className="flex items-center justify-between px-5 py-3 border-t border-[#F0F0F2]">
      <p className="text-xs text-[#6E6E80]">Showing 5 of 128</p>
      <div className="flex gap-1">
        {[1,2,3,"…",26].map((p, i) => (
          <button key={i} className={`w-7 h-7 rounded-lg text-xs font-semibold ${p === 1 ? "bg-[#E8450F] text-white" : "text-[#444] hover:bg-[#F0F0F2]"}`}>{p}</button>
        ))}
      </div>
    </div>
  );
}

function FormSection({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="bg-white rounded-2xl border border-black/[0.06] shadow-sm p-5 mb-4">
      <p className="text-xs font-bold uppercase tracking-wider text-[#9898A4] mb-4">{title}</p>
      <div className="grid grid-cols-2 gap-4">{children}</div>
    </div>
  );
}

function FInput({ label, value, placeholder, span }: { label: string; value?: string; placeholder?: string; span?: boolean }) {
  return (
    <div className={span ? "col-span-2" : ""}>
      <p className="text-xs font-semibold text-[#111] mb-1.5">{label}</p>
      <div className="px-3.5 py-2.5 rounded-xl bg-[#F5F5F7] border border-transparent focus-within:border-[rgba(232,69,15,0.3)]">
        <span className={`text-sm ${value ? "text-[#111]" : "text-[#9898A4]"}`}>{value ?? placeholder ?? "—"}</span>
      </div>
    </div>
  );
}

function DashLayout({ active, title, breadcrumb, pageTitle, pageSub, actions, children }: {
  active: string; title: string; breadcrumb?: string; pageTitle?: string; pageSub?: string; actions?: React.ReactNode; children: React.ReactNode;
}) {
  return (
    <div className="flex h-full" style={{ fontFamily: "'Plus Jakarta Sans', 'Inter', system-ui, sans-serif" }}>
      <Sidebar active={active} />
      <div className="flex flex-col flex-1 min-w-0 bg-[#F5F5F7]">
        <Header title={title} breadcrumb={breadcrumb} />
        {(pageTitle || actions) && <PageTitle title={pageTitle ?? title} sub={pageSub} actions={actions} />}
        <div className="flex-1 overflow-y-auto">{children}</div>
      </div>
    </div>
  );
}

/* ─── Browser frame ───────────────────────────────────────────────────────── */
function BrowserFrame({ children, title, n }: { children: React.ReactNode; title: string; n: number }) {
  return (
    <div className="flex flex-col items-center">
      <div className="w-full rounded-2xl overflow-hidden border border-black/[0.10] shadow-2xl" style={{ background: "#E8E8E8" }}>
        {/* Browser chrome */}
        <div className="flex items-center gap-3 px-4 py-2.5 border-b border-black/[0.08]">
          <div className="flex gap-1.5">
            <div className="w-3 h-3 rounded-full bg-[#FF5F57]" />
            <div className="w-3 h-3 rounded-full bg-[#FFBD2E]" />
            <div className="w-3 h-3 rounded-full bg-[#28C840]" />
          </div>
          <div className="flex-1 flex items-center gap-2 px-3 py-1 rounded-lg bg-[rgba(255,255,255,0.7)] mx-4">
            <Lock size={10} className="text-[#6E6E80]" />
            <span className="text-[10px] text-[#6E6E80]">app.mercon.sa/{title.toLowerCase().replace(/\s+/g, "-")}</span>
          </div>
          <div className="flex gap-2 text-[#6E6E80]">
            <RefreshCw size={13} /><ExternalLink size={13} />
          </div>
        </div>
        {/* Content */}
        <div style={{ height: 580 }}>{children}</div>
      </div>
      <p className="mt-3 text-xs font-bold text-[#111] text-center">{String(n).padStart(2,"0")} — {title}</p>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════════════════ */
/* AUTH SCREENS (no sidebar)                                                   */
/* ═══════════════════════════════════════════════════════════════════════════ */
function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex h-full" style={{ fontFamily: "'Plus Jakarta Sans', 'Inter', system-ui, sans-serif" }}>
      {/* Left brand panel */}
      <div className="w-96 shrink-0 flex flex-col items-center justify-center p-10" style={{ background: SB }}>
        <div className="w-16 h-16 rounded-2xl bg-white flex items-center justify-center mb-5">
          <ImageWithFallback src={macronLogo} alt="Mercon" className="w-12 h-12 object-contain" />
        </div>
        <p className="text-2xl font-bold text-white text-center mb-2">MERCON Logistics</p>
        <p className="text-sm text-[rgba(255,255,255,0.5)] text-center mb-8">Operator Platform</p>
        <div className="space-y-3 w-full">
          {[["128", "Active Trips"], ["48", "Fleet Vehicles"], ["94%", "On-Time Rate"]].map(([v, l]) => (
            <div key={l} className="flex items-center justify-between px-4 py-3 rounded-xl bg-[rgba(255,255,255,0.1)]">
              <span className="text-xs text-[rgba(255,255,255,0.6)]">{l}</span>
              <span className="text-sm font-bold text-white">{v}</span>
            </div>
          ))}
        </div>
      </div>
      {/* Right form */}
      <div className="flex-1 flex items-center justify-center bg-white p-10">{children}</div>
    </div>
  );
}

function LoginScreen() {
  return (
    <AuthLayout>
      <div className="w-full max-w-sm">
        <p className="text-2xl font-bold text-[#111] mb-1">Welcome back</p>
        <p className="text-sm text-[#6E6E80] mb-8">Sign in to your operator account</p>
        <div className="space-y-4 mb-6">
          {[{ l: "Email address", v: "operator@mercon.sa", type: "email" }, { l: "Password", v: "••••••••", type: "password" }].map((f) => (
            <div key={f.l}>
              <p className="text-xs font-semibold text-[#111] mb-1.5">{f.l}</p>
              <div className="flex items-center px-4 py-3 rounded-xl border border-[#EBEBED] bg-white">
                <span className="text-sm text-[#9898A4] flex-1">{f.v}</span>
                {f.type === "password" && <Eye size={15} className="text-[#9898A4]" />}
              </div>
            </div>
          ))}
        </div>
        <div className="flex items-center justify-between mb-6">
          <label className="flex items-center gap-2 text-xs text-[#6E6E80]">
            <div className="w-4 h-4 rounded border border-[#D8D8DC] bg-[#E8450F] flex items-center justify-center"><Check size={10} className="text-white" /></div>
            Remember me
          </label>
          <button className="text-xs text-[#E8450F] font-semibold">Forgot password?</button>
        </div>
        <button className="w-full py-3.5 rounded-xl bg-[#E8450F] text-white font-bold text-sm hover:bg-[#C7380A]">Sign In</button>
        <p className="text-center text-xs text-[#9898A4] mt-6">© 2025 Mercon Logistics Services Company</p>
      </div>
    </AuthLayout>
  );
}

function ForgotPasswordScreen() {
  return (
    <AuthLayout>
      <div className="w-full max-w-sm">
        <div className="w-12 h-12 rounded-2xl bg-[#FFF0EB] flex items-center justify-center mb-5"><Lock size={22} className="text-[#E8450F]" /></div>
        <p className="text-2xl font-bold text-[#111] mb-1">Reset your password</p>
        <p className="text-sm text-[#6E6E80] mb-8">Enter your email and we'll send a reset link.</p>
        <div className="mb-6">
          <p className="text-xs font-semibold text-[#111] mb-1.5">Email address</p>
          <div className="flex items-center px-4 py-3 rounded-xl border border-[rgba(232,69,15,0.4)] bg-white ring-2 ring-[rgba(232,69,15,0.1)]">
            <span className="text-sm text-[#9898A4] flex-1">operator@mercon.sa</span>
          </div>
        </div>
        <button className="w-full py-3.5 rounded-xl bg-[#E8450F] text-white font-bold text-sm mb-3">Send Reset Link</button>
        <button className="w-full py-3 rounded-xl bg-[#F0F0F2] text-sm font-semibold text-[#444]">Back to Login</button>
      </div>
    </AuthLayout>
  );
}

function ResetPasswordScreen() {
  return (
    <AuthLayout>
      <div className="w-full max-w-sm">
        <div className="w-12 h-12 rounded-2xl bg-[#F0FDF4] flex items-center justify-center mb-5"><CheckCircle2 size={22} className="text-[#16A34A]" /></div>
        <p className="text-2xl font-bold text-[#111] mb-1">Create new password</p>
        <p className="text-sm text-[#6E6E80] mb-8">Your new password must be at least 8 characters.</p>
        <div className="space-y-4 mb-6">
          {["New Password", "Confirm Password"].map((l) => (
            <div key={l}>
              <p className="text-xs font-semibold text-[#111] mb-1.5">{l}</p>
              <div className="flex items-center px-4 py-3 rounded-xl border border-[#EBEBED]">
                <span className="text-sm text-[#9898A4] flex-1">••••••••••</span>
                <Eye size={15} className="text-[#9898A4]" />
              </div>
            </div>
          ))}
        </div>
        <button className="w-full py-3.5 rounded-xl bg-[#E8450F] text-white font-bold text-sm">Reset Password</button>
      </div>
    </AuthLayout>
  );
}

/* ═══════════════════════════════════════════════════════════════════════════ */
/* 04 DASHBOARD HOME                                                            */
/* ═══════════════════════════════════════════════════════════════════════════ */
function DashboardHome() {
  const tgId = useGradId("tg");
  return (
    <DashLayout active="Dashboard" title="Dashboard" pageTitle="Dashboard" pageSub="Good morning, Mohammed. Here's what's happening today.">
      <div className="px-6 space-y-5">
        {/* KPI row */}
        <div className="grid grid-cols-4 gap-4">
          <KpiCard label="Total Trips" value="128" delta="+16%" up icon={Truck} color="#E8450F" bg="#FFF0EB" />
          <KpiCard label="Active Fleet" value="48" delta="+3" up icon={Car} color="#2563EB" bg="#EFF6FF" />
          <KpiCard label="Total Revenue" value="SAR 213K" delta="+12.4%" up icon={DollarSign} color="#16A34A" bg="#F0FDF4" />
          <KpiCard label="Renewals Due" value="14" delta="+5" up={false} icon={AlertTriangle} color="#D97706" bg="#FFFBEB" />
        </div>
        {/* Charts row */}
        <div className="grid grid-cols-3 gap-4">
          <div className="col-span-2 bg-white rounded-2xl p-5 border border-black/[0.06] shadow-sm">
            <div className="flex items-center justify-between mb-4">
              <div><p className="text-sm font-bold text-[#111]">Trip Trend</p><p className="text-xs text-[#6E6E80]">Monthly trips — 2025</p></div>
              <div className="flex gap-1 p-1 bg-[#F5F5F7] rounded-lg">
                {["W","M","Y"].map((t, i) => <button key={t} className={`px-2.5 py-1 rounded-md text-xs font-semibold ${i===1?"bg-white text-[#111] shadow-sm":"text-[#6E6E80]"}`}>{t}</button>)}
              </div>
            </div>
            <ResponsiveContainer width="100%" height={160}>
              <AreaChart data={trendData}>
                <defs><linearGradient id={tgId} x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="#E8450F" stopOpacity={0.12}/><stop offset="95%" stopColor="#E8450F" stopOpacity={0}/></linearGradient></defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#F0F0F2" />
                <XAxis dataKey="m" tick={{ fontSize: 10, fill: "#9898A4" }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 10, fill: "#9898A4" }} axisLine={false} tickLine={false} />
                <Tooltip contentStyle={{ borderRadius: 10, fontSize: 11, border: "1px solid #F0F0F2" }} />
                <Area type="monotone" dataKey="v" stroke="#E8450F" strokeWidth={2} fill={`url(#${tgId})`} name="Trips" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
          <div className="bg-white rounded-2xl p-5 border border-black/[0.06] shadow-sm">
            <p className="text-sm font-bold text-[#111] mb-1">Trip Status</p>
            <p className="text-xs text-[#6E6E80] mb-3">Distribution this month</p>
            <PieChart width={160} height={140} key="dash-home-pie">
              <Pie data={statusData} cx={75} cy={65} innerRadius={40} outerRadius={65} dataKey="value" strokeWidth={0}>
                {statusData.map((e) => <Cell key={`dash-pie-${e.name}`} fill={e.color} />)}
              </Pie>
            </PieChart>
            <div className="space-y-1.5 mt-2">
              {statusData.map((d) => (
                <div key={d.name} className="flex items-center justify-between text-xs">
                  <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full" style={{ background: d.color }} />{d.name}</span>
                  <span className="font-semibold text-[#111]">{d.value}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
        {/* Recent trips */}
        <div className="bg-white rounded-2xl border border-black/[0.06] shadow-sm overflow-hidden">
          <div className="flex items-center justify-between px-5 py-3.5 border-b border-[#F0F0F2]">
            <p className="text-sm font-bold text-[#111]">Recent Trips</p>
            <button className="text-xs text-[#E8450F] font-semibold">View All</button>
          </div>
          <table className="w-full text-sm">
            <THead cols={["Trip ID","Customer","Route","Driver","Vehicle","Status","Date"]} />
            <tbody>
              {TRIPS.slice(0,4).map((t) => (
                <tr key={t.id} className="border-b border-[#F5F5F7] last:border-0 hover:bg-[#FAFAFA]">
                  <td className="px-5 py-2.5 font-mono text-xs font-bold text-[#E8450F]">{t.id}</td>
                  <td className="px-5 py-2.5 text-xs text-[#444]">{t.cust}</td>
                  <td className="px-5 py-2.5 text-xs text-[#444]">{t.from} → {t.to}</td>
                  <td className="px-5 py-2.5 text-xs text-[#444]">{t.driver}</td>
                  <td className="px-5 py-2.5 font-mono text-xs text-[#6E6E80]">{t.vehicle}</td>
                  <td className="px-5 py-2.5"><StatusBadge status={t.status} color={t.sc} bg={t.sb} /></td>
                  <td className="px-5 py-2.5 text-xs text-[#9898A4]">{t.dt}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </DashLayout>
  );
}

/* ═══════════════════════════════════════════════════════════════════════════ */
/* 05 NOTIFICATIONS CENTER                                                      */
/* ═══════════════════════════════════════════════════════════════════════════ */
function NotificationsCenter() {
  const notifs = [
    { icon: Truck, c: "#2563EB", bg: "#EFF6FF", t: "Trip TRP-2388 Started", b: "Ahmed Kareem has started the trip to Abha.", time: "2 min ago", unread: true },
    { icon: AlertTriangle, c: "#D97706", bg: "#FFFBEB", t: "Document Expiring — TRK-2041", b: "Insurance expires in 3 days.", time: "20 min ago", unread: true },
    { icon: CheckCircle2, c: "#16A34A", bg: "#F0FDF4", t: "Invoice INV-0489 Paid", b: "Fahad Trading paid SAR 1,668.", time: "1 hr ago", unread: true },
    { icon: ReceiptText, c: "#7C3AED", bg: "#F5F3FF", t: "New Invoice Generated", b: "INV-0490 created for TRP-2388.", time: "2 hr ago", unread: false },
    { icon: Users, c: "#E8450F", bg: "#FFF0EB", t: "Driver Added", b: "Khalid Al-Otaibi registered.", time: "Yesterday", unread: false },
  ];
  return (
    <DashLayout active="Notifications" title="Notifications" pageTitle="Notification Center" pageSub="Stay updated on all fleet activities">
      <div className="px-6 grid grid-cols-3 gap-4">
        <div className="col-span-2 bg-white rounded-2xl border border-black/[0.06] shadow-sm overflow-hidden">
          <div className="flex items-center justify-between px-5 py-3.5 border-b border-[#F0F0F2]">
            <div className="flex gap-2">
              {["All","Unread","Trips","Finance","Alerts"].map((t, i) => (
                <button key={t} className={`px-3 py-1.5 rounded-lg text-xs font-semibold ${i===0?"bg-[#E8450F] text-white":"text-[#6E6E80] hover:bg-[#F5F5F7]"}`}>{t}</button>
              ))}
            </div>
            <button className="text-xs text-[#E8450F] font-semibold">Mark all read</button>
          </div>
          {notifs.map((n, i) => (
            <div key={i} className={`flex items-start gap-4 px-5 py-4 border-b border-[#F5F5F7] last:border-0 ${n.unread ? "bg-[#FAFAFA]" : ""}`}>
              <div className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0" style={{ background: n.bg }}><n.icon size={16} style={{ color: n.c }} /></div>
              <div className="flex-1 min-w-0">
                <p className={`text-sm ${n.unread ? "font-bold" : "font-medium"} text-[#111]`}>{n.t}</p>
                <p className="text-xs text-[#6E6E80] mt-0.5">{n.b}</p>
              </div>
              <div className="flex flex-col items-end gap-2 shrink-0">
                <span className="text-[10px] text-[#9898A4]">{n.time}</span>
                {n.unread && <div className="w-2 h-2 rounded-full bg-[#E8450F]" />}
              </div>
            </div>
          ))}
        </div>
        <div className="space-y-3">
          {[["5","Unread","#E8450F","#FFF0EB"],["2","Document Alerts","#D97706","#FFFBEB"],["1","Trip Update","#2563EB","#EFF6FF"]].map(([v,l,c,bg])=>(
            <div key={l} className="bg-white rounded-2xl p-4 border border-black/[0.06] shadow-sm flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{background:bg as string}}><Bell size={18} style={{color:c as string}}/></div>
              <div><p className="text-xl font-bold text-[#111]">{v}</p><p className="text-xs text-[#6E6E80]">{l}</p></div>
            </div>
          ))}
        </div>
      </div>
    </DashLayout>
  );
}

/* ═══════════════════════════════════════════════════════════════════════════ */
/* TRIPS                                                                        */
/* ═══════════════════════════════════════════════════════════════════════════ */
function TripList() {
  return (
    <DashLayout active="Trips" title="Trips" pageTitle="Trip Management" pageSub="128 total trips this month"
      actions={<><Btn label="Export" icon={<Download size={14}/>} variant="secondary"/><Btn label="New Trip" icon={<Plus size={14}/>}/></>}>
      <div className="px-6 mb-4 grid grid-cols-5 gap-3">
        {[["128","Total","#111","#F5F5F7"],["86","Completed","#16A34A","#F0FDF4"],["28","In Transit","#2563EB","#EFF6FF"],["9","Delayed","#D97706","#FFFBEB"],["5","Cancelled","#DC2626","#FEF2F2"]].map(([v,l,c,bg])=>(
          <div key={l} className="bg-white rounded-2xl p-4 border border-black/[0.06] shadow-sm">
            <p className="text-2xl font-bold" style={{color:c as string}}>{v}</p>
            <p className="text-xs text-[#6E6E80] mt-0.5">{l}</p>
            <div className="mt-2 h-1 rounded-full" style={{background:bg as string,opacity:0.8}}/>
          </div>
        ))}
      </div>
      <TableWrapper>
        <table className="w-full text-sm">
          <THead cols={["","Trip ID","Customer","Route","Driver","Vehicle","Status","Date","Actions"]}/>
          <tbody>
            {TRIPS.map((t) => (
              <tr key={t.id} className="border-b border-[#F5F5F7] last:border-0 hover:bg-[#FAFAFA]">
                <td className="px-4 py-3"><input type="checkbox" className="rounded accent-[#E8450F]"/></td>
                <td className="px-3 py-3 font-mono text-xs font-bold text-[#E8450F]">{t.id}</td>
                <td className="px-3 py-3 text-xs text-[#444]">{t.cust}</td>
                <td className="px-3 py-3 text-xs text-[#444]">{t.from} → {t.to}</td>
                <td className="px-3 py-3 text-xs text-[#444]">{t.driver}</td>
                <td className="px-3 py-3 font-mono text-xs text-[#6E6E80]">{t.vehicle}</td>
                <td className="px-3 py-3"><StatusBadge status={t.status} color={t.sc} bg={t.sb}/></td>
                <td className="px-3 py-3 text-xs text-[#9898A4]">{t.dt}</td>
                <td className="px-3 py-3"><div className="flex gap-1"><button className="w-7 h-7 rounded-lg bg-[#F5F5F7] flex items-center justify-center"><Eye size={13} className="text-[#6E6E80]"/></button><button className="w-7 h-7 rounded-lg bg-[#F5F5F7] flex items-center justify-center"><Edit2 size={13} className="text-[#6E6E80]"/></button></div></td>
              </tr>
            ))}
          </tbody>
        </table>
        <Pager/>
      </TableWrapper>
    </DashLayout>
  );
}

function TripDetails() {
  return (
    <DashLayout active="Trips" title="Trip Details" breadcrumb="Trips" pageTitle="TRP-2387"
      actions={<><Btn label="Edit" icon={<Edit2 size={14}/>} variant="secondary"/><Btn label="Create Invoice" icon={<ReceiptText size={14}/>}/></>}>
      <div className="px-6 grid grid-cols-3 gap-4">
        <div className="col-span-2 space-y-4">
          <div className="bg-[#1C1C2E] rounded-2xl p-5">
            <div className="flex items-center justify-between mb-4">
              <div><p className="text-xs text-[rgba(255,255,255,0.4)] mb-1">Trip ID</p><p className="text-xl font-bold text-white">TRP-2387</p></div>
              <StatusBadge status="In Transit" color="#60A5FA" bg="rgba(37,99,235,0.2)"/>
            </div>
            <div className="flex items-center gap-4">
              <div className="flex flex-col items-center gap-1.5"><div className="w-3 h-3 rounded-full bg-[#E8450F]"/><div className="w-px h-10 bg-[rgba(255,255,255,0.2)]"/><div className="w-3 h-3 rounded-full bg-[#16A34A]"/></div>
              <div className="flex-1 space-y-4">
                <div><p className="text-xs text-[rgba(255,255,255,0.4)]">Pickup</p><p className="text-sm font-semibold text-white">Riyadh Industrial City, Gate 3</p></div>
                <div><p className="text-xs text-[rgba(255,255,255,0.4)]">Destination</p><p className="text-sm font-semibold text-white">Jeddah Islamic Port, Terminal 2</p></div>
              </div>
              <div className="grid grid-cols-2 gap-3 text-center">
                {[["974 km","Distance"],["8h 18m","ETA"],["18,500 KG","Cargo"],["SAR 1,668","Revenue"]].map(([v,l])=>(
                  <div key={l} className="px-3 py-2 rounded-xl bg-[rgba(255,255,255,0.1)]"><p className="text-sm font-bold text-white">{v}</p><p className="text-[9px] text-[rgba(255,255,255,0.4)]">{l}</p></div>
                ))}
              </div>
            </div>
          </div>
          <div className="bg-white rounded-2xl p-5 border border-black/[0.06] shadow-sm">
            <p className="text-xs font-bold uppercase tracking-wider text-[#9898A4] mb-4">Trip Timeline</p>
            {[{l:"Dispatched",t:"08:15 AM",done:true},{l:"Cargo Picked Up",t:"09:40 AM",done:true},{l:"In Transit",t:"10:00 AM",active:true},{l:"Arrived",t:"—"},{l:"POD Collected",t:"—"}].map((s,i)=>(
              <div key={i} className="flex gap-4 pb-4 last:pb-0">
                <div className="flex flex-col items-center">
                  <div className={`w-6 h-6 rounded-full flex items-center justify-center shrink-0 ${s.done?"bg-[#16A34A]":(s as any).active?"bg-[#E8450F]":"bg-[#EBEBED]"}`}>
                    {s.done?<Check size={12} className="text-white"/>:(s as any).active?<div className="w-2 h-2 rounded-full bg-white"/>:null}
                  </div>
                  {i<4&&<div className={`w-px flex-1 mt-1 ${s.done?"bg-[#16A34A]":"bg-[#EBEBED]"}`} style={{minHeight:16}}/>}
                </div>
                <div className="flex-1 flex items-center justify-between">
                  <p className={`text-sm font-semibold ${(s as any).active?"text-[#E8450F]":s.done?"text-[#111]":"text-[#9898A4]"}`}>{s.l}</p>
                  <p className="text-xs font-mono text-[#9898A4]">{s.t}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
        <div className="space-y-4">
          <div className="bg-white rounded-2xl p-5 border border-black/[0.06] shadow-sm">
            <p className="text-xs font-bold uppercase tracking-wider text-[#9898A4] mb-4">Assignment</p>
            {[["Customer","Fahad Trading Co."],["Driver","Ahmed Kareem"],["Vehicle","TRK-2041 · Hino 500"],["Cargo","General Goods"],["Weight","18,500 KG"],["Schedule","24 May, 08:00 AM"]].map(([k,v])=>(
              <div key={k} className="flex justify-between text-xs py-2 border-b border-[#F5F5F7] last:border-0">
                <span className="text-[#6E6E80]">{k}</span><span className="font-semibold text-[#111]">{v}</span>
              </div>
            ))}
          </div>
          <div className="bg-white rounded-2xl p-5 border border-black/[0.06] shadow-sm">
            <p className="text-xs font-bold uppercase tracking-wider text-[#9898A4] mb-3">Route Progress</p>
            <div className="h-2 rounded-full bg-[#EBEBED] overflow-hidden mb-2">
              <div className="h-full w-1/2 rounded-full bg-gradient-to-r from-[#E8450F] to-[#D97706]"/>
            </div>
            <p className="text-xs text-[#6E6E80]">492 km of 974 km · 50.5%</p>
          </div>
        </div>
      </div>
    </DashLayout>
  );
}

function CreateTrip() {
  return (
    <DashLayout active="Trips" title="Create Trip" breadcrumb="Trips" pageTitle="Create New Trip">
      <div className="px-6">
        <FormSection title="Customer & Route">
          <FInput label="Customer" value="Fahad Trading Co."/>
          <FInput label="Pickup Location" value="Riyadh Industrial City, Gate 3"/>
          <FInput label="Destination" value="Jeddah Islamic Port, Terminal 2"/>
          <FInput label="Cargo Type" value="General Goods"/>
          <FInput label="Weight (KG)" value="18,500"/>
          <FInput label="Pickup Date & Time" value="24 May 2025, 08:00 AM"/>
        </FormSection>
        <FormSection title="Assignment">
          <FInput label="Assigned Vehicle" value="TRK-2041 · Hino 500 · 10 TON"/>
          <FInput label="Assigned Driver" value="Ahmed Kareem · DRV-0041"/>
          <FInput label="Base Freight (SAR)" value="1,400.00"/>
          <FInput label="Rate Card" value="Fahad Trading · Riyadh → Jeddah"/>
          <FInput label="Internal Notes" placeholder="Add notes…" span/>
        </FormSection>
        <div className="flex gap-3 pb-6">
          <Btn label="Cancel" variant="secondary"/>
          <Btn label="Create Trip"/>
        </div>
      </div>
    </DashLayout>
  );
}

function EditTrip() {
  return (
    <DashLayout active="Trips" title="Edit Trip" breadcrumb="Trips / TRP-2387" pageTitle="Edit Trip">
      <div className="px-6">
        <div className="mb-4 flex items-center gap-2 p-3 rounded-xl bg-[#FFF0EB] border border-[rgba(232,69,15,0.2)]">
          <Info size={14} className="text-[#E8450F]"/><p className="text-xs font-medium text-[#E8450F]">Editing TRP-2387 · In Transit · Changes will be logged.</p>
        </div>
        <FormSection title="Route Details">
          <FInput label="Pickup Location" value="Riyadh Industrial City, Gate 3"/>
          <FInput label="Destination" value="Jeddah Islamic Port, Terminal 2"/>
          <FInput label="Schedule" value="24 May 2025, 08:00 AM"/>
          <FInput label="Cargo Type" value="General Goods"/>
          <FInput label="Weight (KG)" value="18,500"/>
          <FInput label="Base Freight (SAR)" value="1,400.00"/>
        </FormSection>
        <FormSection title="Assignment">
          <FInput label="Vehicle" value="TRK-2041 · Hino 500"/>
          <FInput label="Driver" value="Ahmed Kareem · DRV-0041"/>
          <FInput label="Internal Notes" value="Priority delivery — customer VIP" span/>
        </FormSection>
        <div className="flex gap-3 pb-6">
          <Btn label="Cancel" variant="secondary"/>
          <Btn label="Save Changes"/>
        </div>
      </div>
    </DashLayout>
  );
}

function TripTracking() {
  return (
    <DashLayout active="Trips" title="Live Tracking" breadcrumb="Trips" pageTitle="Live Trip Tracking"
      actions={<><Btn label="Call Driver" icon={<Phone size={14}/>} variant="secondary"/><Btn label="Emergency" icon={<AlertCircle size={14}/>} variant="ghost"/></>}>
      <div className="px-6 grid grid-cols-3 gap-4">
        <div className="col-span-2">
          {/* Map mockup */}
          <div className="rounded-2xl overflow-hidden border border-black/[0.06] shadow-sm relative" style={{ height: 380, background: "linear-gradient(135deg,#d8e8d8,#c5d9c5,#b8d0b8)" }}>
            <svg className="absolute inset-0 w-full h-full opacity-15"><line x1="0" y1="33%" x2="100%" y2="33%" stroke="#555" strokeWidth="0.8"/><line x1="0" y1="66%" x2="100%" y2="66%" stroke="#555" strokeWidth="0.8"/><line x1="33%" y1="0" x2="33%" y2="100%" stroke="#555" strokeWidth="0.8"/><line x1="66%" y1="0" x2="66%" y2="100%" stroke="#555" strokeWidth="0.8"/></svg>
            <svg className="absolute inset-0 w-full h-full"><path d="M 60 360 C 150 280 250 200 360 100 S 480 40 580 20" stroke="white" strokeWidth="5" fill="none" strokeLinecap="round"/><path d="M 60 360 C 150 280 250 200 360 100 S 480 40 580 20" stroke="#E8450F" strokeWidth="3" fill="none" strokeLinecap="round" strokeDasharray="12 6"/></svg>
            <div className="absolute" style={{left:55,bottom:90}}><div className="w-8 h-8 rounded-full bg-[#E8450F] border-2 border-white shadow flex items-center justify-center"><MapPin size={14} className="text-white"/></div></div>
            <div className="absolute" style={{left:340,top:90}}><div className="w-10 h-10 rounded-full bg-[#1C1C2E] border-2 border-white shadow-xl flex items-center justify-center"><Truck size={16} className="text-white"/></div><div className="absolute inset-0 rounded-full border-2 border-[#E8450F] animate-ping opacity-25"/></div>
            <div className="absolute" style={{right:50,top:15}}><div className="w-8 h-8 rounded-full bg-[#16A34A] border-2 border-white shadow flex items-center justify-center"><MapPin size={14} className="text-white"/></div></div>
            {/* Overlay toolbar */}
            <div className="absolute top-3 left-3 right-3 flex gap-2">
              {[{icon:Gauge,l:"92 km/h"},{icon:Clock,l:"6h 12m ETA"},{icon:Route,l:"482 km left"}].map((w,i)=>(
                <div key={i} className="flex items-center gap-1.5 px-3 py-1.5 bg-white rounded-xl shadow text-xs font-semibold text-[#111]"><w.icon size={13} className="text-[#E8450F]"/>{w.l}</div>
              ))}
            </div>
          </div>
        </div>
        <div className="space-y-3">
          <div className="bg-white rounded-2xl p-4 border border-black/[0.06] shadow-sm">
            <div className="flex items-center gap-2 mb-3"><span className="w-2 h-2 rounded-full bg-[#16A34A] animate-pulse"/><p className="text-xs font-bold text-[#16A34A]">LIVE</p></div>
            {[["Trip","TRP-2387"],["Driver","Ahmed Kareem"],["Vehicle","TRK-2041"],["Last Ping","12s ago"],["Location","King Fahd Rd, km 492"]].map(([k,v])=>(
              <div key={k} className="flex justify-between text-xs py-1.5 border-b border-[#F5F5F7] last:border-0"><span className="text-[#6E6E80]">{k}</span><span className="font-semibold text-[#111]">{v}</span></div>
            ))}
          </div>
          <div className="bg-white rounded-2xl p-4 border border-black/[0.06] shadow-sm">
            <p className="text-xs font-bold text-[#9898A4] uppercase tracking-wider mb-3">Route Progress</p>
            <div className="h-2 rounded-full bg-[#EBEBED] overflow-hidden mb-2"><div className="h-full w-1/2 rounded-full bg-gradient-to-r from-[#E8450F] to-[#D97706]"/></div>
            <div className="flex justify-between text-xs text-[#6E6E80]"><span>Riyadh</span><span className="font-bold text-[#E8450F]">50%</span><span>Jeddah</span></div>
          </div>
        </div>
      </div>
    </DashLayout>
  );
}

function TripCompletionReview() {
  return (
    <DashLayout active="Trips" title="Trip Completion" breadcrumb="Trips / TRP-2387" pageTitle="Trip Completion Review"
      actions={<><Btn label="Generate Invoice" icon={<ReceiptText size={14}/>}/></>}>
      <div className="px-6 grid grid-cols-2 gap-4">
        <div className="space-y-4">
          <div className="bg-[#F0FDF4] rounded-2xl p-5 border border-[#BBF7D0] flex items-center gap-4">
            <div className="w-12 h-12 rounded-full bg-[#DCFCE7] flex items-center justify-center shrink-0"><CheckCircle2 size={24} className="text-[#16A34A]"/></div>
            <div><p className="text-base font-bold text-[#16A34A]">Delivery Confirmed</p><p className="text-xs text-[rgba(22,163,74,0.7)]">POD received · 24 May 2025 · 19:45</p></div>
          </div>
          <div className="bg-white rounded-2xl p-5 border border-black/[0.06] shadow-sm">
            <p className="text-xs font-bold uppercase tracking-wider text-[#9898A4] mb-4">Proof of Delivery</p>
            <div className="grid grid-cols-3 gap-3">
              {[{l:"Delivery Photo",c:"#2563EB",bg:"#EFF6FF"},{l:"Signed POD",c:"#7C3AED",bg:"#F5F3FF"},{l:"Receiver Details",c:"#16A34A",bg:"#F0FDF4"}].map((p)=>(
                <div key={p.l} className="p-3 rounded-xl border text-center" style={{background:p.bg,borderColor:`${p.c}20`}}>
                  <CheckCircle2 size={18} style={{color:p.c}} className="mx-auto mb-1"/>
                  <p className="text-[10px] font-semibold text-[#111]">{p.l}</p>
                  <p className="text-[9px] font-bold" style={{color:p.c}}>Verified</p>
                </div>
              ))}
            </div>
          </div>
        </div>
        <div className="space-y-4">
          <div className="bg-white rounded-2xl p-5 border border-black/[0.06] shadow-sm">
            <p className="text-xs font-bold uppercase tracking-wider text-[#9898A4] mb-4">Trip Summary</p>
            {[["Trip ID","TRP-2387"],["Route","Riyadh → Jeddah"],["Distance","974 km"],["Duration","8h 28m"],["Driver","Ahmed Kareem"],["Vehicle","TRK-2041"]].map(([k,v])=>(
              <div key={k} className="flex justify-between text-xs py-2 border-b border-[#F5F5F7] last:border-0"><span className="text-[#6E6E80]">{k}</span><span className="font-semibold text-[#111]">{v}</span></div>
            ))}
          </div>
          <div className="bg-white rounded-2xl p-5 border border-black/[0.06] shadow-sm">
            <p className="text-xs font-bold uppercase tracking-wider text-[#9898A4] mb-3">Revenue</p>
            {[["Base Freight","SAR 1,400"],["Fuel Surcharge","SAR 168"],["Loading","SAR 50"],["Other","SAR 50"]].map(([k,v])=>(
              <div key={k} className="flex justify-between text-xs py-1.5 border-b border-[#F5F5F7] last:border-0"><span className="text-[#6E6E80]">{k}</span><span className="font-medium text-[#111]">{v}</span></div>
            ))}
            <div className="flex justify-between pt-2 border-t border-[#EBEBED] mt-1"><span className="text-sm font-bold text-[#111]">Total</span><span className="text-base font-bold text-[#E8450F]">SAR 1,668</span></div>
          </div>
        </div>
      </div>
    </DashLayout>
  );
}

/* ═══════════════════════════════════════════════════════════════════════════ */
/* DRIVERS                                                                      */
/* ═══════════════════════════════════════════════════════════════════════════ */
function DriversList() {
  return (
    <DashLayout active="Drivers" title="Drivers" pageTitle="Driver Management" pageSub={`${DRIVERS.length} drivers registered`}
      actions={<><Btn label="Export" icon={<Download size={14}/>} variant="secondary"/><Btn label="Add Driver" icon={<Plus size={14}/>}/></>}>
      <div className="px-6 mb-4 grid grid-cols-4 gap-3">
        {[["48","Total","#111","#F5F5F7"],["32","Available","#16A34A","#F0FDF4"],["12","On Trip","#2563EB","#EFF6FF"],["4","Off Duty","#6E6E80","#F5F5F7"]].map(([v,l,c,bg])=>(
          <div key={l} className="bg-white rounded-2xl p-4 border border-black/[0.06] shadow-sm">
            <p className="text-2xl font-bold" style={{color:c as string}}>{v}</p>
            <p className="text-xs text-[#6E6E80] mt-0.5">{l}</p>
          </div>
        ))}
      </div>
      <TableWrapper>
        <table className="w-full text-sm">
          <THead cols={["Driver","ID","Vehicle","Trips","Rating","Status","Actions"]}/>
          <tbody>
            {DRIVERS.map((d) => (
              <tr key={d.id} className="border-b border-[#F5F5F7] last:border-0 hover:bg-[#FAFAFA]">
                <td className="px-5 py-3"><div className="flex items-center gap-2.5"><div className="w-8 h-8 rounded-full bg-[#E8450F] flex items-center justify-center text-white text-xs font-bold">{d.name.split(" ").map(n=>n[0]).join("")}</div><span className="text-xs font-semibold text-[#111]">{d.name}</span></div></td>
                <td className="px-3 py-3 font-mono text-xs text-[#6E6E80]">{d.id}</td>
                <td className="px-3 py-3 font-mono text-xs text-[#444]">{d.vehicle}</td>
                <td className="px-3 py-3 text-xs font-semibold text-[#111]">{d.trips.toLocaleString()}</td>
                <td className="px-3 py-3 text-xs text-[#D97706] font-semibold">★ {d.rating}</td>
                <td className="px-3 py-3"><StatusBadge status={d.status} color={d.sc} bg={d.sb}/></td>
                <td className="px-3 py-3"><div className="flex gap-1"><button className="w-7 h-7 rounded-lg bg-[#F5F5F7] flex items-center justify-center"><Eye size={13} className="text-[#6E6E80]"/></button><button className="w-7 h-7 rounded-lg bg-[#F5F5F7] flex items-center justify-center"><Edit2 size={13} className="text-[#6E6E80]"/></button></div></td>
              </tr>
            ))}
          </tbody>
        </table>
        <Pager/>
      </TableWrapper>
    </DashLayout>
  );
}

function DriverDetails() {
  return (
    <DashLayout active="Drivers" title="Driver Details" breadcrumb="Drivers" pageTitle="Ahmed Kareem"
      actions={<><Btn label="Edit" icon={<Edit2 size={14}/>} variant="secondary"/><Btn label="Assign Trip" icon={<Plus size={14}/>}/></>}>
      <div className="px-6 grid grid-cols-3 gap-4">
        <div className="space-y-4">
          <div className="bg-white rounded-2xl p-5 border border-black/[0.06] shadow-sm text-center">
            <div className="w-16 h-16 rounded-full bg-[#E8450F] flex items-center justify-center text-white text-2xl font-bold mx-auto mb-3">AK</div>
            <p className="text-base font-bold text-[#111]">Ahmed Kareem</p>
            <p className="text-xs text-[#6E6E80] mb-2">DRV-0041</p>
            <StatusBadge status="Available" color="#16A34A" bg="#F0FDF4"/>
            <div className="grid grid-cols-3 gap-2 mt-4">
              {[["1,248","Trips"],["94%","On-Time"],["★ 4.7","Rating"]].map(([v,l])=>(
                <div key={l} className="text-center"><p className="text-sm font-bold text-[#E8450F]">{v}</p><p className="text-[9px] text-[#6E6E80]">{l}</p></div>
              ))}
            </div>
          </div>
          <div className="bg-white rounded-2xl p-4 border border-black/[0.06] shadow-sm">
            <p className="text-xs font-bold uppercase tracking-wider text-[#9898A4] mb-3">Contact</p>
            {[["Phone","+966 50 123 4567"],["Email","ahmed.kareem@mercon.sa"]].map(([k,v])=>(
              <div key={k} className="flex items-center gap-2 py-2 border-b border-[#F5F5F7] last:border-0"><span className="text-[10px] text-[#9898A4] w-12">{k}</span><span className="text-xs font-medium text-[#111]">{v}</span></div>
            ))}
          </div>
        </div>
        <div className="col-span-2 space-y-4">
          <div className="bg-white rounded-2xl p-5 border border-black/[0.06] shadow-sm">
            <p className="text-xs font-bold uppercase tracking-wider text-[#9898A4] mb-4">Performance This Month</p>
            {[{l:"On-Time Delivery",v:94,c:"#16A34A"},{l:"Customer Rating",v:92,c:"#2563EB"},{l:"Fuel Efficiency",v:78,c:"#D97706"},{l:"POD Completion",v:100,c:"#E8450F"}].map((m)=>(
              <div key={m.l} className="mb-3 last:mb-0">
                <div className="flex justify-between text-xs mb-1"><span className="text-[#444]">{m.l}</span><span className="font-bold" style={{color:m.c}}>{m.v}%</span></div>
                <div className="h-2 rounded-full bg-[#EBEBED] overflow-hidden"><div className="h-full rounded-full" style={{width:`${m.v}%`,background:m.c}}/></div>
              </div>
            ))}
          </div>
          <div className="bg-white rounded-2xl border border-black/[0.06] shadow-sm overflow-hidden">
            <div className="px-5 py-3.5 border-b border-[#F0F0F2] flex items-center justify-between">
              <p className="text-xs font-bold uppercase tracking-wider text-[#9898A4]">Recent Trips</p>
              <button className="text-xs text-[#E8450F] font-semibold">View All</button>
            </div>
            <table className="w-full">
              <THead cols={["Trip ID","Route","Status","Date"]}/>
              <tbody>
                {TRIPS.slice(0,3).map((t)=>(
                  <tr key={t.id} className="border-b border-[#F5F5F7] last:border-0 hover:bg-[#FAFAFA]">
                    <td className="px-5 py-2.5 font-mono text-xs font-bold text-[#E8450F]">{t.id}</td>
                    <td className="px-3 py-2.5 text-xs text-[#444]">{t.from} → {t.to}</td>
                    <td className="px-3 py-2.5"><StatusBadge status={t.status} color={t.sc} bg={t.sb}/></td>
                    <td className="px-3 py-2.5 text-xs text-[#9898A4]">{t.dt}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </DashLayout>
  );
}

function AddDriver() {
  return (
    <DashLayout active="Drivers" title="Add Driver" breadcrumb="Drivers" pageTitle="Add New Driver">
      <div className="px-6">
        <div className="bg-white rounded-2xl p-5 border border-black/[0.06] shadow-sm mb-4 flex items-center gap-5">
          <div className="w-20 h-20 rounded-2xl bg-[#F5F5F7] border-2 border-dashed border-[#D8D8DC] flex flex-col items-center justify-center cursor-pointer hover:border-[#E8450F] transition-colors">
            <Camera size={20} className="text-[#D8D8DC] mb-1"/>
            <p className="text-[9px] text-[#9898A4]">Upload photo</p>
          </div>
          <div><p className="text-sm font-bold text-[#111] mb-1">Profile Photo</p><p className="text-xs text-[#6E6E80]">JPG, PNG · Max 5MB · Recommended 400×400px</p></div>
        </div>
        <FormSection title="Personal Information">
          <FInput label="Full Name" placeholder="Driver full name"/>
          <FInput label="National ID / Iqama" placeholder="ID number"/>
          <FInput label="Phone Number" placeholder="+966 50 000 0000"/>
          <FInput label="Email Address" placeholder="driver@email.com"/>
          <FInput label="Emergency Contact" placeholder="+966 50 000 0001"/>
          <FInput label="Availability" value="Available for Assignment"/>
        </FormSection>
        <FormSection title="License & Documents">
          <FInput label="License Number" placeholder="SA-DL-XXXX-XXXXX"/>
          <FInput label="License Expiry" placeholder="DD MMM YYYY"/>
          <div className="col-span-2 grid grid-cols-3 gap-3">
            {["Driving License","National ID / Iqama","Medical Certificate"].map((d)=>(
              <div key={d} className="border-2 border-dashed border-[#D8D8DC] rounded-xl p-3 flex items-center gap-2 hover:border-[#E8450F] transition-colors cursor-pointer">
                <Upload size={15} className="text-[#9898A4] shrink-0"/>
                <p className="text-xs text-[#6E6E80]">{d}</p>
              </div>
            ))}
          </div>
        </FormSection>
        <div className="flex gap-3 pb-6"><Btn label="Cancel" variant="secondary"/><Btn label="Save Driver"/></div>
      </div>
    </DashLayout>
  );
}

function EditDriver() {
  return (
    <DashLayout active="Drivers" title="Edit Driver" breadcrumb="Drivers / Ahmed Kareem" pageTitle="Edit Driver">
      <div className="px-6">
        <FormSection title="Personal Information">
          <FInput label="Full Name" value="Ahmed Kareem"/>
          <FInput label="National ID / Iqama" value="1012345678"/>
          <FInput label="Phone Number" value="+966 50 123 4567"/>
          <FInput label="Email Address" value="ahmed.kareem@mercon.sa"/>
          <FInput label="License Number" value="SA-DL-2019-00441"/>
          <FInput label="License Expiry" value="12 Aug 2027"/>
        </FormSection>
        <FormSection title="Documents">
          <div className="col-span-2 grid grid-cols-3 gap-3">
            {[{l:"Driving License",done:true},{l:"National ID",done:true},{l:"Medical Certificate",done:false}].map((d)=>(
              <div key={d.l} className={`border-2 rounded-xl p-3 flex items-center gap-2 ${d.done?"border-[#BBF7D0] bg-[#F0FDF4]":"border-dashed border-[#D8D8DC] hover:border-[#E8450F]"} cursor-pointer transition-colors`}>
                {d.done?<CheckCircle2 size={15} className="text-[#16A34A] shrink-0"/>:<Upload size={15} className="text-[#9898A4] shrink-0"/>}
                <p className={`text-xs ${d.done?"text-[#16A34A]":"text-[#6E6E80]"}`}>{d.l}</p>
              </div>
            ))}
          </div>
        </FormSection>
        <div className="flex gap-3 pb-6"><Btn label="Cancel" variant="secondary"/><Btn label="Save Changes"/></div>
      </div>
    </DashLayout>
  );
}

function DriverDocuments() {
  return (
    <DashLayout active="Drivers" title="Driver Documents" breadcrumb="Drivers / Ahmed Kareem" pageTitle="Documents — Ahmed Kareem"
      actions={<Btn label="Upload Document" icon={<Upload size={14}/>}/>}>
      <div className="px-6 grid grid-cols-2 gap-4">
        {[{name:"Driving License",exp:"12 Aug 2027",s:"Active",sc:"#16A34A",sb:"#F0FDF4"},{name:"National ID / Iqama",exp:"03 Jul 2025",s:"Expiring",sc:"#D97706",sb:"#FFFBEB"},{name:"Medical Certificate",exp:"01 Sep 2025",s:"Active",sc:"#16A34A",sb:"#F0FDF4"},{name:"Vehicle Permit",exp:"—",s:"Not Uploaded",sc:"#6E6E80",sb:"#F5F5F7"}].map((d)=>(
          <div key={d.name} className="bg-white rounded-2xl p-5 border border-black/[0.06] shadow-sm">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-xl bg-[#F5F5F7] flex items-center justify-center"><FileText size={18} className="text-[#6E6E80]"/></div>
              <div className="flex-1"><p className="text-sm font-bold text-[#111]">{d.name}</p><p className="text-xs text-[#6E6E80]">Expires: {d.exp}</p></div>
              <StatusBadge status={d.s} color={d.sc} bg={d.sb}/>
            </div>
            <div className="flex gap-2">
              <Btn label="View" icon={<Eye size={12}/>} variant="secondary" size="sm"/>
              <Btn label="Download" icon={<Download size={12}/>} variant="secondary" size="sm"/>
              <Btn label="Replace" icon={<Upload size={12}/>} variant="ghost" size="sm"/>
            </div>
          </div>
        ))}
      </div>
    </DashLayout>
  );
}

/* ═══════════════════════════════════════════════════════════════════════════ */
/* VEHICLES                                                                     */
/* ═══════════════════════════════════════════════════════════════════════════ */
function VehicleList() {
  return (
    <DashLayout active="Vehicles" title="Vehicles" pageTitle="Fleet Management" pageSub="72 vehicles in fleet"
      actions={<><Btn label="Export" icon={<Download size={14}/>} variant="secondary"/><Btn label="Add Vehicle" icon={<Plus size={14}/>}/></>}>
      <div className="px-6 mb-4 grid grid-cols-4 gap-3">
        {[["48","Available","#16A34A","#F0FDF4"],["12","On Trip","#2563EB","#EFF6FF"],["8","Maintenance","#D97706","#FFFBEB"],["14","Docs Due","#DC2626","#FEF2F2"]].map(([v,l,c,bg])=>(
          <div key={l} className="bg-white rounded-2xl p-4 border border-black/[0.06] shadow-sm">
            <p className="text-2xl font-bold" style={{color:c as string}}>{v}</p>
            <p className="text-xs text-[#6E6E80] mt-0.5">{l}</p>
          </div>
        ))}
      </div>
      <TableWrapper>
        <table className="w-full text-sm">
          <THead cols={["Vehicle ID","Model","Capacity","Driver","Docs","Status","Actions"]}/>
          <tbody>
            {VEHICLES.map((v) => (
              <tr key={v.id} className="border-b border-[#F5F5F7] last:border-0 hover:bg-[#FAFAFA]">
                <td className="px-5 py-3 font-mono text-xs font-bold text-[#E8450F]">{v.id}</td>
                <td className="px-3 py-3 text-xs text-[#444]">{v.model}</td>
                <td className="px-3 py-3 text-xs text-[#444]">{v.cap}</td>
                <td className="px-3 py-3 text-xs text-[#444]">{v.driver}</td>
                <td className="px-3 py-3"><span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${v.docs>=5?"bg-[#F0FDF4] text-[#16A34A]":"bg-[#FFFBEB] text-[#D97706]"}`}>{v.docs}/6 valid</span></td>
                <td className="px-3 py-3"><StatusBadge status={v.status} color={v.sc} bg={v.sb}/></td>
                <td className="px-3 py-3"><div className="flex gap-1"><button className="w-7 h-7 rounded-lg bg-[#F5F5F7] flex items-center justify-center"><Eye size={13} className="text-[#6E6E80]"/></button><button className="w-7 h-7 rounded-lg bg-[#F5F5F7] flex items-center justify-center"><Edit2 size={13} className="text-[#6E6E80]"/></button></div></td>
              </tr>
            ))}
          </tbody>
        </table>
        <Pager/>
      </TableWrapper>
    </DashLayout>
  );
}

function VehicleDetails() {
  return (
    <DashLayout active="Vehicles" title="Vehicle Details" breadcrumb="Vehicles" pageTitle="TRK-2041"
      actions={<><Btn label="Edit" icon={<Edit2 size={14}/>} variant="secondary"/><Btn label="Track Live" icon={<Navigation2 size={14}/>}/></>}>
      <div className="px-6 grid grid-cols-3 gap-4">
        <div className="space-y-4">
          <div className="bg-[#1C1C2E] rounded-2xl p-5">
            <p className="text-2xl font-bold text-white">TRK-2041</p>
            <p className="text-xs text-[rgba(255,255,255,0.5)] mb-3">Hino 500 · 10 TON · 2024</p>
            <StatusBadge status="Available" color="#4ADE80" bg="rgba(22,163,74,0.2)"/>
            <div className="grid grid-cols-2 gap-2 mt-4">
              {[["1,248","Trips"],["248K km","Distance"],["★ 4.7","Driver Avg"],["5/6","Valid Docs"]].map(([v,l])=>(
                <div key={l} className="text-center px-2 py-2 rounded-xl bg-[rgba(255,255,255,0.1)]"><p className="text-sm font-bold text-white">{v}</p><p className="text-[9px] text-[rgba(255,255,255,0.4)]">{l}</p></div>
              ))}
            </div>
          </div>
          <div className="bg-white rounded-2xl p-4 border border-black/[0.06] shadow-sm">
            <p className="text-xs font-bold uppercase tracking-wider text-[#9898A4] mb-3">Specifications</p>
            {[["Plate","ABC-1234"],["Model","Hino 500"],["Year","2024"],["Capacity","10 TON"],["Fuel","Diesel"],["VIN","JN1CA31D5XT002382"]].map(([k,v])=>(
              <div key={k} className="flex justify-between text-xs py-1.5 border-b border-[#F5F5F7] last:border-0"><span className="text-[#6E6E80]">{k}</span><span className="font-medium text-[#111]">{v}</span></div>
            ))}
          </div>
        </div>
        <div className="col-span-2 space-y-4">
          <div className="bg-white rounded-2xl p-5 border border-black/[0.06] shadow-sm">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-12 h-12 rounded-full bg-[#E8450F] flex items-center justify-center text-white font-bold">AK</div>
              <div><p className="text-sm font-bold text-[#111]">Ahmed Kareem</p><p className="text-xs text-[#6E6E80]">DRV-0041 · ★ 4.7 · Available</p></div>
              <Btn label="View Profile" variant="ghost" size="sm"/>
            </div>
          </div>
          <div className="bg-white rounded-2xl border border-black/[0.06] shadow-sm overflow-hidden">
            <div className="px-5 py-3.5 border-b border-[#F0F0F2]"><p className="text-xs font-bold uppercase tracking-wider text-[#9898A4]">Document Status</p></div>
            <table className="w-full">
              <THead cols={["Document","Status","Expiry","Actions"]}/>
              <tbody>
                {[["Insurance","Active","03 Jul 2026","#16A34A","#F0FDF4"],["Fahas","Active","22 May 2026","#16A34A","#F0FDF4"],["Istimara","Expiring","15 Aug 2025","#D97706","#FFFBEB"],["SASO","Active","30 Dec 2025","#16A34A","#F0FDF4"],["Misan Card","Active","18 Jul 2026","#16A34A","#F0FDF4"]].map(([n,s,e,c,b])=>(
                  <tr key={n as string} className="border-b border-[#F5F5F7] last:border-0 hover:bg-[#FAFAFA]">
                    <td className="px-5 py-2.5 text-xs font-semibold text-[#111]">{n}</td>
                    <td className="px-3 py-2.5"><StatusBadge status={s as string} color={c as string} bg={b as string}/></td>
                    <td className="px-3 py-2.5 text-xs text-[#6E6E80]">{e}</td>
                    <td className="px-3 py-2.5"><Btn label="Renew" variant="ghost" size="sm"/></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </DashLayout>
  );
}

function AddVehicle() {
  return (
    <DashLayout active="Vehicles" title="Add Vehicle" breadcrumb="Vehicles" pageTitle="Add New Vehicle">
      <div className="px-6">
        <div className="bg-white rounded-2xl p-5 border border-black/[0.06] shadow-sm mb-4 flex items-center gap-5">
          <div className="w-24 h-16 rounded-xl bg-[#F5F5F7] border-2 border-dashed border-[#D8D8DC] flex flex-col items-center justify-center cursor-pointer hover:border-[#E8450F] transition-colors">
            <Car size={20} className="text-[#D8D8DC] mb-1"/><p className="text-[9px] text-[#9898A4]">Vehicle photo</p>
          </div>
          <div><p className="text-sm font-bold text-[#111] mb-1">Vehicle Photo</p><p className="text-xs text-[#6E6E80]">JPG, PNG · Max 10MB</p></div>
        </div>
        <FormSection title="Vehicle Information">
          <FInput label="Registration Number" placeholder="TRK-XXXX"/>
          <FInput label="Plate Number" placeholder="ABC-1234"/>
          <FInput label="Model / Make" placeholder="e.g. Hino 500"/>
          <FInput label="Year" placeholder="2024"/>
          <FInput label="VIN Number" placeholder="Vehicle Identification Number"/>
          <FInput label="Capacity (TON)" placeholder="10"/>
          <FInput label="Fuel Type" value="Diesel"/>
          <FInput label="Assigned Driver" placeholder="Select driver"/>
        </FormSection>
        <FormSection title="Documents Upload">
          <div className="col-span-2 grid grid-cols-4 gap-3">
            {["Vehicle Registration","Insurance","Permit / License","SASO Certificate"].map((d)=>(
              <div key={d} className="border-2 border-dashed border-[#D8D8DC] rounded-xl p-3 flex flex-col items-center gap-1 hover:border-[#E8450F] transition-colors cursor-pointer text-center">
                <Upload size={16} className="text-[#9898A4]"/>
                <p className="text-[10px] text-[#6E6E80]">{d}</p>
              </div>
            ))}
          </div>
        </FormSection>
        <div className="flex gap-3 pb-6"><Btn label="Cancel" variant="secondary"/><Btn label="Save Vehicle"/></div>
      </div>
    </DashLayout>
  );
}

function EditVehicle() {
  return (
    <DashLayout active="Vehicles" title="Edit Vehicle" breadcrumb="Vehicles / TRK-2041" pageTitle="Edit Vehicle">
      <div className="px-6">
        <FormSection title="Vehicle Information">
          <FInput label="Registration Number" value="TRK-2041"/>
          <FInput label="Plate Number" value="ABC-1234"/>
          <FInput label="Model / Make" value="Hino 500"/>
          <FInput label="Year" value="2024"/>
          <FInput label="Capacity (TON)" value="10"/>
          <FInput label="Fuel Type" value="Diesel"/>
          <FInput label="Assigned Driver" value="Ahmed Kareem · DRV-0041"/>
          <FInput label="Status" value="Available"/>
        </FormSection>
        <div className="flex gap-3 pb-6"><Btn label="Cancel" variant="secondary"/><Btn label="Save Changes"/></div>
      </div>
    </DashLayout>
  );
}

function VehicleDocuments() {
  return (
    <DashLayout active="Vehicles" title="Vehicle Documents" breadcrumb="Vehicles / TRK-2041" pageTitle="Documents — TRK-2041"
      actions={<Btn label="Upload Document" icon={<Upload size={14}/>}/>}>
      <div className="px-6 grid grid-cols-3 gap-4">
        {[{n:"Insurance",e:"03 Jul 2026",s:"Active",sc:"#16A34A",sb:"#F0FDF4"},{n:"Fahas",e:"22 May 2026",s:"Active",sc:"#16A34A",sb:"#F0FDF4"},{n:"Istimara",e:"15 Aug 2025",s:"Expiring",sc:"#D97706",sb:"#FFFBEB"},{n:"SASO Certificate",e:"30 Dec 2025",s:"Active",sc:"#16A34A",sb:"#F0FDF4"},{n:"Misan Card",e:"18 Jul 2026",s:"Active",sc:"#16A34A",sb:"#F0FDF4"},{n:"Vehicle Permit",e:"—",s:"Not Uploaded",sc:"#6E6E80",sb:"#F5F5F7"}].map((d)=>(
          <div key={d.n} className="bg-white rounded-2xl p-5 border border-black/[0.06] shadow-sm">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-10 h-10 rounded-xl bg-[#F5F5F7] flex items-center justify-center"><Shield size={18} className="text-[#6E6E80]"/></div>
              <div className="flex-1"><p className="text-sm font-bold text-[#111]">{d.n}</p><p className="text-xs text-[#6E6E80]">Exp: {d.e}</p></div>
              <StatusBadge status={d.s} color={d.sc} bg={d.sb}/>
            </div>
            <div className="flex gap-2"><Btn label="View" icon={<Eye size={12}/>} variant="secondary" size="sm"/><Btn label="Renew" icon={<RefreshCw size={12}/>} variant="ghost" size="sm"/></div>
          </div>
        ))}
      </div>
    </DashLayout>
  );
}

/* ═══════════════════════════════════════════════════════════════════════════ */
/* CUSTOMERS                                                                    */
/* ═══════════════════════════════════════════════════════════════════════════ */
const CUSTS = [
  {id:"CST-001",name:"Fahad Trading Co.",contact:"Fahad Al Harbi",trips:86,rev:"SAR 142K",s:"VIP",sc:"#E8450F",sb:"#FFF0EB"},
  {id:"CST-002",name:"Al-Rashid Group",  contact:"Khalid Al-Rashid",trips:54,rev:"SAR 89K",s:"Active",sc:"#16A34A",sb:"#F0FDF4"},
  {id:"CST-003",name:"Saudi Polymers",   contact:"Mohammed Saleh",trips:38,rev:"SAR 61K",s:"Active",sc:"#16A34A",sb:"#F0FDF4"},
  {id:"CST-004",name:"SABIC Trading",    contact:"Ibrahim Hassan",trips:22,rev:"SAR 34K",s:"New",sc:"#2563EB",sb:"#EFF6FF"},
];

function CustomerList() {
  return (
    <DashLayout active="Customers" title="Customers" pageTitle="Customer Management" pageSub="42 customers"
      actions={<><Btn label="Export" icon={<Download size={14}/>} variant="secondary"/><Btn label="Add Customer" icon={<Plus size={14}/>}/></>}>
      <TableWrapper>
        <table className="w-full text-sm">
          <THead cols={["Customer","ID","Contact","Total Trips","Revenue","Status","Actions"]}/>
          <tbody>
            {CUSTS.map((c) => (
              <tr key={c.id} className="border-b border-[#F5F5F7] last:border-0 hover:bg-[#FAFAFA]">
                <td className="px-5 py-3"><div className="flex items-center gap-2"><div className="w-7 h-7 rounded-lg bg-[#F5F5F7] flex items-center justify-center text-[10px] font-bold text-[#6E6E80]">{c.id.replace("CST-","")}</div><span className="text-xs font-semibold text-[#111]">{c.name}</span></div></td>
                <td className="px-3 py-3 font-mono text-xs text-[#6E6E80]">{c.id}</td>
                <td className="px-3 py-3 text-xs text-[#444]">{c.contact}</td>
                <td className="px-3 py-3 text-xs font-semibold text-[#111]">{c.trips}</td>
                <td className="px-3 py-3 text-xs font-semibold text-[#111]">{c.rev}</td>
                <td className="px-3 py-3"><StatusBadge status={c.s} color={c.sc} bg={c.sb}/></td>
                <td className="px-3 py-3"><div className="flex gap-1"><button className="w-7 h-7 rounded-lg bg-[#F5F5F7] flex items-center justify-center"><Eye size={13} className="text-[#6E6E80]"/></button><button className="w-7 h-7 rounded-lg bg-[#F5F5F7] flex items-center justify-center"><Edit2 size={13} className="text-[#6E6E80]"/></button></div></td>
              </tr>
            ))}
          </tbody>
        </table>
        <Pager/>
      </TableWrapper>
    </DashLayout>
  );
}

function CustomerDetails() {
  const rg2 = useGradId("rg2");
  return (
    <DashLayout active="Customers" title="Customer Details" breadcrumb="Customers" pageTitle="Fahad Trading Co."
      actions={<><Btn label="Edit" icon={<Edit2 size={14}/>} variant="secondary"/><Btn label="New Trip" icon={<Plus size={14}/>}/></>}>
      <div className="px-6 grid grid-cols-3 gap-4">
        <div className="space-y-4">
          <div className="bg-white rounded-2xl p-5 border border-black/[0.06] shadow-sm">
            <div className="w-14 h-14 rounded-2xl bg-[#F5F5F7] flex items-center justify-center text-lg font-bold text-[#6E6E80] mb-3">FT</div>
            <p className="text-base font-bold text-[#111]">Fahad Trading Co.</p>
            <p className="text-xs text-[#6E6E80] mb-2">CST-001</p>
            <StatusBadge status="VIP" color="#E8450F" bg="#FFF0EB"/>
            <div className="grid grid-cols-2 gap-2 mt-4">
              {[["86","Total Trips"],["SAR 142K","Revenue"],["Net 30","Payment"],["4.8★","Satisfaction"]].map(([v,l])=>(
                <div key={l} className="text-center py-2 rounded-xl bg-[#F5F5F7]"><p className="text-sm font-bold text-[#E8450F]">{v}</p><p className="text-[9px] text-[#6E6E80]">{l}</p></div>
              ))}
            </div>
          </div>
          <div className="bg-white rounded-2xl p-4 border border-black/[0.06] shadow-sm">
            <p className="text-xs font-bold uppercase tracking-wider text-[#9898A4] mb-3">Contact</p>
            {[["Contact","Fahad Al Harbi"],["Phone","+966 55 123 4567"],["Email","fahad@trading.sa"],["Address","King Abdullah Rd, Riyadh"]].map(([k,v])=>(
              <div key={k} className="flex flex-col py-1.5 border-b border-[#F5F5F7] last:border-0">
                <span className="text-[10px] text-[#9898A4]">{k}</span><span className="text-xs font-medium text-[#111]">{v}</span>
              </div>
            ))}
          </div>
        </div>
        <div className="col-span-2 space-y-4">
          <div className="bg-white rounded-2xl p-5 border border-black/[0.06] shadow-sm">
            <p className="text-xs font-bold uppercase tracking-wider text-[#9898A4] mb-4">Revenue Trend</p>
            <ResponsiveContainer width="100%" height={120}>
              <AreaChart data={revData}>
                <defs><linearGradient id={rg2} x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="#E8450F" stopOpacity={0.12}/><stop offset="95%" stopColor="#E8450F" stopOpacity={0}/></linearGradient></defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#F0F0F2"/>
                <XAxis dataKey="m" tick={{fontSize:10,fill:"#9898A4"}} axisLine={false} tickLine={false}/>
                <Tooltip contentStyle={{borderRadius:10,fontSize:11,border:"1px solid #F0F0F2"}}/>
                <Area type="monotone" dataKey="r" stroke="#E8450F" strokeWidth={2} fill={`url(#${rg2})`} name="Revenue"/>
              </AreaChart>
            </ResponsiveContainer>
          </div>
          <div className="bg-white rounded-2xl border border-black/[0.06] shadow-sm overflow-hidden">
            <div className="px-5 py-3.5 border-b border-[#F0F0F2] flex items-center justify-between">
              <p className="text-xs font-bold uppercase tracking-wider text-[#9898A4]">Recent Trips</p>
              <button className="text-xs text-[#E8450F] font-semibold">View All</button>
            </div>
            <table className="w-full">
              <THead cols={["Trip ID","Route","Status","Revenue","Date"]}/>
              <tbody>
                {TRIPS.slice(0,3).map((t)=>(
                  <tr key={t.id} className="border-b border-[#F5F5F7] last:border-0 hover:bg-[#FAFAFA]">
                    <td className="px-5 py-2.5 font-mono text-xs font-bold text-[#E8450F]">{t.id}</td>
                    <td className="px-3 py-2.5 text-xs text-[#444]">{t.from} → {t.to}</td>
                    <td className="px-3 py-2.5"><StatusBadge status={t.status} color={t.sc} bg={t.sb}/></td>
                    <td className="px-3 py-2.5 text-xs font-semibold text-[#111]">SAR 1,668</td>
                    <td className="px-3 py-2.5 text-xs text-[#9898A4]">{t.dt}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </DashLayout>
  );
}

function AddCustomer() {
  return (
    <DashLayout active="Customers" title="Add Customer" breadcrumb="Customers" pageTitle="Add New Customer">
      <div className="px-6">
        <FormSection title="Company Details">
          <FInput label="Company Name" placeholder="e.g. Fahad Trading Co."/>
          <FInput label="Contact Person" placeholder="Full name"/>
          <FInput label="Phone Number" placeholder="+966 55 000 0000"/>
          <FInput label="Email Address" placeholder="contact@company.com"/>
          <FInput label="Business Address" placeholder="Street, City, Region" span/>
        </FormSection>
        <FormSection title="Billing & Terms">
          <FInput label="Billing Address" placeholder="Same as business"/>
          <FInput label="Payment Terms" value="Net 30 days"/>
          <FInput label="Base Rate (SAR/km)" placeholder="1.55"/>
          <FInput label="Contract Number" placeholder="CNT-2025-XXXX"/>
          <FInput label="Notes" placeholder="Internal notes about the customer…" span/>
        </FormSection>
        <div className="flex gap-3 pb-6"><Btn label="Cancel" variant="secondary"/><Btn label="Save Customer"/></div>
      </div>
    </DashLayout>
  );
}

function EditCustomer() {
  return (
    <DashLayout active="Customers" title="Edit Customer" breadcrumb="Customers / Fahad Trading Co." pageTitle="Edit Customer">
      <div className="px-6">
        <FormSection title="Company Details">
          <FInput label="Company Name" value="Fahad Trading Co."/>
          <FInput label="Contact Person" value="Fahad Al Harbi"/>
          <FInput label="Phone Number" value="+966 55 123 4567"/>
          <FInput label="Email Address" value="fahad@trading.sa"/>
          <FInput label="Business Address" value="King Abdullah Rd, Riyadh" span/>
        </FormSection>
        <FormSection title="Billing & Terms">
          <FInput label="Billing Address" value="Same as business"/>
          <FInput label="Payment Terms" value="Net 30 days"/>
          <FInput label="Base Rate (SAR/km)" value="1.55"/>
          <FInput label="Contract Number" value="CNT-2025-0001"/>
        </FormSection>
        <div className="flex gap-3 pb-6"><Btn label="Cancel" variant="secondary"/><Btn label="Save Changes"/></div>
      </div>
    </DashLayout>
  );
}

function CustomerContracts() {
  return (
    <DashLayout active="Customers" title="Customer Contracts" breadcrumb="Customers / Fahad Trading" pageTitle="Contracts — Fahad Trading Co."
      actions={<Btn label="Upload Contract" icon={<Upload size={14}/>}/>}>
      <div className="px-6 space-y-3">
        {[{n:"Master Service Agreement 2025",d:"01 Jan 2025",e:"31 Dec 2025",s:"Active",sc:"#16A34A",sb:"#F0FDF4"},{n:"Rate Card Agreement — Riyadh-Jeddah",d:"01 Jan 2025",e:"31 Dec 2025",s:"Active",sc:"#16A34A",sb:"#F0FDF4"},{n:"Special Cargo Addendum",d:"15 Mar 2025",e:"14 Mar 2026",s:"Active",sc:"#16A34A",sb:"#F0FDF4"}].map((c)=>(
          <div key={c.n} className="bg-white rounded-2xl p-4 border border-black/[0.06] shadow-sm flex items-center gap-4">
            <div className="w-10 h-10 rounded-xl bg-[#F5F5F7] flex items-center justify-center shrink-0"><FileText size={18} className="text-[#6E6E80]"/></div>
            <div className="flex-1 min-w-0"><p className="text-sm font-semibold text-[#111] truncate">{c.n}</p><p className="text-xs text-[#6E6E80]">{c.d} → {c.e}</p></div>
            <StatusBadge status={c.s} color={c.sc} bg={c.sb}/>
            <div className="flex gap-2"><Btn label="View" icon={<Eye size={12}/>} variant="secondary" size="sm"/><Btn label="Download" icon={<Download size={12}/>} variant="secondary" size="sm"/></div>
          </div>
        ))}
      </div>
    </DashLayout>
  );
}

/* ═══════════════════════════════════════════════════════════════════════════ */
/* RATE CARDS                                                                   */
/* ═══════════════════════════════════════════════════════════════════════════ */
function RateCardList() {
  return (
    <DashLayout active="Rate Cards" title="Rate Cards" pageTitle="Rate Cards" pageSub="12 active rate cards"
      actions={<Btn label="Create Rate Card" icon={<Plus size={14}/>}/>}>
      <TableWrapper>
        <table className="w-full text-sm">
          <THead cols={["Customer","Route","Vehicle Type","Base Rate","Total Rate","Valid Until","Status","Actions"]}/>
          <tbody>
            {[{c:"Fahad Trading Co.",r:"Riyadh → Jeddah",v:"10 TON",b:"1,400",t:"1,698",e:"Dec 2025",s:"Active",sc:"#16A34A",sb:"#F0FDF4"},{c:"Al-Rashid Group",r:"Jeddah → Tabouk",v:"20 TON",b:"2,100",t:"2,453",e:"Jun 2025",s:"Expiring",sc:"#D97706",sb:"#FFFBEB"},{c:"Saudi Polymers",r:"Riyadh → Dammam",v:"10 TON",b:"980",t:"1,138",e:"May 2025",s:"Expired",sc:"#DC2626",sb:"#FEF2F2"},{c:"SABIC Trading",r:"Riyadh → Medina",v:"5 TON",b:"780",t:"890",e:"Dec 2025",s:"Draft",sc:"#6E6E80",sb:"#F5F5F7"}].map((rc,i)=>(
              <tr key={i} className="border-b border-[#F5F5F7] last:border-0 hover:bg-[#FAFAFA]">
                <td className="px-5 py-3 text-xs font-semibold text-[#111]">{rc.c}</td>
                <td className="px-3 py-3 text-xs text-[#444]">{rc.r}</td>
                <td className="px-3 py-3 text-xs text-[#444]">{rc.v}</td>
                <td className="px-3 py-3 text-xs font-semibold text-[#111]">SAR {rc.b}</td>
                <td className="px-3 py-3 text-xs font-bold text-[#E8450F]">SAR {rc.t}</td>
                <td className="px-3 py-3 text-xs text-[#6E6E80]">{rc.e}</td>
                <td className="px-3 py-3"><StatusBadge status={rc.s} color={rc.sc} bg={rc.sb}/></td>
                <td className="px-3 py-3"><div className="flex gap-1"><button className="w-7 h-7 rounded-lg bg-[#F5F5F7] flex items-center justify-center"><Eye size={13} className="text-[#6E6E80]"/></button><button className="w-7 h-7 rounded-lg bg-[#F5F5F7] flex items-center justify-center"><Edit2 size={13} className="text-[#6E6E80]"/></button></div></td>
              </tr>
            ))}
          </tbody>
        </table>
        <Pager/>
      </TableWrapper>
    </DashLayout>
  );
}

function CreateRateCard() {
  return (
    <DashLayout active="Rate Cards" title="Create Rate Card" breadcrumb="Rate Cards" pageTitle="Create New Rate Card">
      <div className="px-6">
        <FormSection title="Route & Customer">
          <FInput label="Customer" value="Fahad Trading Co."/>
          <FInput label="Vehicle Type" value="10 TON Truck"/>
          <FInput label="Pickup City" value="Riyadh"/>
          <FInput label="Destination City" value="Jeddah"/>
          <FInput label="Valid From" value="01 Jan 2025"/>
          <FInput label="Valid Until" value="31 Dec 2025"/>
        </FormSection>
        <FormSection title="Pricing">
          <FInput label="Base Freight (SAR)" value="1,400.00"/>
          <FInput label="Fuel Surcharge (SAR)" value="180.00"/>
          <FInput label="Loading Charges (SAR)" value="50.00"/>
          <FInput label="Waiting Charges (SAR/hr)" value="40.00"/>
          <FInput label="Other Charges (SAR)" value="28.00"/>
          <div className="flex flex-col justify-end"><div className="px-4 py-3 rounded-xl bg-[#FFF0EB]"><p className="text-xs text-[#E8450F]">Total Rate</p><p className="text-xl font-bold text-[#E8450F]">SAR 1,698.00</p></div></div>
        </FormSection>
        <div className="flex gap-3 pb-6"><Btn label="Cancel" variant="secondary"/><Btn label="Save Rate Card"/></div>
      </div>
    </DashLayout>
  );
}

function EditRateCard() {
  return (
    <DashLayout active="Rate Cards" title="Edit Rate Card" breadcrumb="Rate Cards" pageTitle="Edit Rate Card">
      <div className="px-6">
        <FormSection title="Route & Customer">
          <FInput label="Customer" value="Fahad Trading Co."/>
          <FInput label="Vehicle Type" value="10 TON Truck"/>
          <FInput label="Pickup City" value="Riyadh"/>
          <FInput label="Destination City" value="Jeddah"/>
        </FormSection>
        <FormSection title="Pricing">
          <FInput label="Base Freight (SAR)" value="1,400.00"/>
          <FInput label="Fuel Surcharge (SAR)" value="180.00"/>
          <FInput label="Loading Charges (SAR)" value="50.00"/>
          <FInput label="Waiting (SAR/hr)" value="40.00"/>
          <FInput label="Other (SAR)" value="28.00"/>
          <div className="flex flex-col justify-end"><div className="px-4 py-3 rounded-xl bg-[#FFF0EB]"><p className="text-xs text-[#E8450F]">Total Rate</p><p className="text-xl font-bold text-[#E8450F]">SAR 1,698.00</p></div></div>
        </FormSection>
        <div className="flex gap-3 pb-6"><Btn label="Cancel" variant="secondary"/><Btn label="Save Changes"/></div>
      </div>
    </DashLayout>
  );
}

function UploadRateCardDocs() {
  return (
    <DashLayout active="Rate Cards" title="Upload Documents" breadcrumb="Rate Cards" pageTitle="Upload Rate Card Documents">
      <div className="px-6 grid grid-cols-2 gap-4">
        <div>
          <div className="bg-white rounded-2xl p-6 border border-black/[0.06] shadow-sm mb-4">
            <div className="border-2 border-dashed border-[rgba(232,69,15,0.3)] rounded-2xl p-8 flex flex-col items-center bg-[#FFF8F6] cursor-pointer hover:border-[rgba(232,69,15,0.6)] transition-colors">
              <div className="w-12 h-12 rounded-2xl bg-[#FFF0EB] flex items-center justify-center mb-3"><Upload size={24} className="text-[#E8450F]"/></div>
              <p className="text-sm font-bold text-[#111] mb-1">Drag & Drop Files</p>
              <p className="text-xs text-[#6E6E80] mb-4 text-center">PDF, JPG, PNG · Max 10MB</p>
              <div className="flex gap-2">
                {["Camera","Gallery","PDF"].map((l)=><Btn key={l} label={l} variant="secondary" size="sm"/>)}
              </div>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-2xl p-5 border border-black/[0.06] shadow-sm">
          <p className="text-xs font-bold uppercase tracking-wider text-[#9898A4] mb-4">Uploaded Files</p>
          {[{n:"rate_card_fahad_2025.pdf",s:"1.2 MB",done:true},{n:"contract_signed.pdf",s:"2.4 MB",done:true},{n:"addendum_jan2025.pdf",s:"845 KB",done:false,pct:72}].map((f,i)=>(
            <div key={i} className={`flex items-center gap-3 p-3 rounded-xl mb-2 last:mb-0 border ${f.done?"border-[#BBF7D0] bg-[#F0FDF4]":"border-[rgba(232,69,15,0.2)] bg-[#FFF8F6]"}`}>
              <FileText size={16} className={f.done?"text-[#16A34A]":"text-[#E8450F]"}/>
              <div className="flex-1 min-w-0">
                <p className="text-xs font-semibold text-[#111] truncate">{f.n}</p>
                {f.done?<p className="text-[10px] text-[#16A34A]">✓ {f.s} · Uploaded</p>:<div className="mt-1"><div className="h-1 rounded-full bg-[#EBEBED] overflow-hidden"><div className="h-full rounded-full bg-[#E8450F]" style={{width:`${f.pct}%`}}/></div><p className="text-[10px] text-[#E8450F] mt-0.5">{f.pct}%</p></div>}
              </div>
              <X size={13} className="text-[#9898A4]"/>
            </div>
          ))}
          <div className="flex gap-3 mt-4"><Btn label="Submit Documents" size="sm"/></div>
        </div>
      </div>
    </DashLayout>
  );
}

/* ═══════════════════════════════════════════════════════════════════════════ */
/* INVOICES                                                                     */
/* ═══════════════════════════════════════════════════════════════════════════ */
const INVS = [
  {id:"INV-2025-0489",cust:"Fahad Trading Co.",trip:"TRP-2387",amt:"SAR 1,668",s:"Paid",    sc:"#16A34A",sb:"#F0FDF4",dt:"24 May"},
  {id:"INV-2025-0488",cust:"Al-Rashid Group",  trip:"TRP-2382",amt:"SAR 2,240",s:"Pending", sc:"#D97706",sb:"#FFFBEB",dt:"23 May"},
  {id:"INV-2025-0487",cust:"Saudi Polymers",   trip:"TRP-2378",amt:"SAR 3,120",s:"Overdue", sc:"#DC2626",sb:"#FEF2F2",dt:"18 May"},
  {id:"INV-2025-0486",cust:"SABIC Trading",    trip:"TRP-2371",amt:"SAR 1,890",s:"Draft",   sc:"#6E6E80",sb:"#F5F5F7",dt:"15 May"},
];

function InvoiceList() {
  return (
    <DashLayout active="Invoices" title="Invoices" pageTitle="Invoice Management" pageSub="SAR 213,540 total this month"
      actions={<><Btn label="Export" icon={<Download size={14}/>} variant="secondary"/><Btn label="Create Invoice" icon={<Plus size={14}/>}/></>}>
      <div className="px-6 mb-4 grid grid-cols-4 gap-3">
        {[["SAR 142K","Paid","#16A34A","#F0FDF4"],["SAR 42K","Pending","#D97706","#FFFBEB"],["SAR 18K","Overdue","#DC2626","#FEF2F2"],["2","Draft","#6E6E80","#F5F5F7"]].map(([v,l,c,bg])=>(
          <div key={l} className="bg-white rounded-2xl p-4 border border-black/[0.06] shadow-sm">
            <p className="text-xl font-bold" style={{color:c as string}}>{v}</p>
            <p className="text-xs text-[#6E6E80] mt-0.5">{l}</p>
          </div>
        ))}
      </div>
      <TableWrapper>
        <table className="w-full text-sm">
          <THead cols={["Invoice #","Customer","Trip","Amount","Status","Date","Actions"]}/>
          <tbody>
            {INVS.map((inv) => (
              <tr key={inv.id} className="border-b border-[#F5F5F7] last:border-0 hover:bg-[#FAFAFA]">
                <td className="px-5 py-3 font-mono text-xs font-bold text-[#E8450F]">{inv.id}</td>
                <td className="px-3 py-3 text-xs font-semibold text-[#111]">{inv.cust}</td>
                <td className="px-3 py-3 font-mono text-xs text-[#6E6E80]">{inv.trip}</td>
                <td className="px-3 py-3 text-xs font-bold text-[#111]">{inv.amt}</td>
                <td className="px-3 py-3"><StatusBadge status={inv.s} color={inv.sc} bg={inv.sb}/></td>
                <td className="px-3 py-3 text-xs text-[#9898A4]">{inv.dt}</td>
                <td className="px-3 py-3"><div className="flex gap-1"><button className="w-7 h-7 rounded-lg bg-[#F5F5F7] flex items-center justify-center"><Eye size={13} className="text-[#6E6E80]"/></button><button className="w-7 h-7 rounded-lg bg-[#F5F5F7] flex items-center justify-center"><Download size={13} className="text-[#6E6E80]"/></button></div></td>
              </tr>
            ))}
          </tbody>
        </table>
        <Pager/>
      </TableWrapper>
    </DashLayout>
  );
}

function InvoiceDetails() {
  return (
    <DashLayout active="Invoices" title="Invoice Details" breadcrumb="Invoices" pageTitle="INV-2025-0489"
      actions={<><Btn label="Download PDF" icon={<Download size={14}/>} variant="secondary"/><Btn label="Mark Paid" icon={<CheckCircle2 size={14}/>}/></>}>
      <div className="px-6 grid grid-cols-3 gap-4">
        <div className="col-span-2 space-y-4">
          <div className="bg-white rounded-2xl p-5 border border-black/[0.06] shadow-sm">
            <div className="flex items-center justify-between mb-4">
              <div><p className="text-2xl font-bold text-[#111]">INV-2025-0489</p><p className="text-xs text-[#6E6E80]">Issued 24 May 2025 · Due 23 Jun 2025</p></div>
              <StatusBadge status="Paid" color="#16A34A" bg="#F0FDF4"/>
            </div>
            <div className="grid grid-cols-2 gap-6">
              <div><p className="text-xs font-bold text-[#9898A4] mb-2">BILL TO</p><p className="text-sm font-bold text-[#111]">Fahad Trading Co.</p><p className="text-xs text-[#6E6E80]">Fahad Al Harbi</p><p className="text-xs text-[#6E6E80]">+966 55 123 4567</p></div>
              <div><p className="text-xs font-bold text-[#9898A4] mb-2">TRIP REFERENCE</p><p className="text-sm font-bold text-[#E8450F]">TRP-2387</p><p className="text-xs text-[#6E6E80]">Riyadh → Jeddah</p><p className="text-xs text-[#6E6E80]">24 May 2025</p></div>
            </div>
          </div>
          <div className="bg-white rounded-2xl border border-black/[0.06] shadow-sm overflow-hidden">
            <table className="w-full">
              <THead cols={["Description","Amount"]}/>
              <tbody>
                {[["Base Freight","SAR 1,400.00"],["Fuel Surcharge","SAR 168.00"],["Loading Charges","SAR 50.00"],["Waiting Charges","SAR 50.00"]].map(([d,a])=>(
                  <tr key={d as string} className="border-b border-[#F5F5F7] last:border-0">
                    <td className="px-5 py-2.5 text-xs text-[#444]">{d}</td>
                    <td className="px-5 py-2.5 text-xs font-semibold text-[#111] text-right">{a}</td>
                  </tr>
                ))}
                <tr className="border-t-2 border-[#EBEBED] bg-[#FAFAFA]">
                  <td className="px-5 py-3 text-sm font-bold text-[#111]">Total</td>
                  <td className="px-5 py-3 text-base font-bold text-[#E8450F] text-right">SAR 1,668.00</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
        <div className="space-y-4">
          <div className="bg-white rounded-2xl p-5 border border-black/[0.06] shadow-sm">
            <p className="text-xs font-bold uppercase tracking-wider text-[#9898A4] mb-4">Payment Timeline</p>
            {[{l:"Invoice Issued",d:"24 May 2025",done:true},{l:"Payment Received",d:"28 May 2025",done:true},{l:"Reconciled",d:"28 May 2025",done:true}].map((t,i)=>(
              <div key={i} className="flex gap-3 pb-3 last:pb-0">
                <div className="flex flex-col items-center">
                  <div className={`w-5 h-5 rounded-full flex items-center justify-center ${t.done?"bg-[#16A34A]":"bg-[#EBEBED]"}`}>{t.done&&<Check size={11} className="text-white"/>}</div>
                  {i<2&&<div className={`w-px flex-1 mt-1 ${t.done?"bg-[#16A34A]":"bg-[#EBEBED]"}`} style={{minHeight:14}}/>}
                </div>
                <div className="flex-1"><p className="text-xs font-semibold text-[#111]">{t.l}</p><p className="text-[10px] text-[#9898A4]">{t.d}</p></div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </DashLayout>
  );
}

function CreateInvoice() {
  return (
    <DashLayout active="Invoices" title="Create Invoice" breadcrumb="Invoices" pageTitle="Create Invoice">
      <div className="px-6">
        <div className="mb-4 flex items-center gap-2 p-3 rounded-xl bg-[#FFF0EB] border border-[rgba(232,69,15,0.2)]">
          <Info size={14} className="text-[#E8450F]"/>
          <p className="text-xs font-medium text-[#E8450F]">Auto-populated from TRP-2387 · Fahad Trading Co.</p>
        </div>
        <FormSection title="Invoice Details">
          <FInput label="Customer" value="Fahad Trading Co."/>
          <FInput label="Trip Reference" value="TRP-2387 · Riyadh → Jeddah"/>
          <FInput label="Issue Date" value="24 May 2025"/>
          <FInput label="Due Date" value="23 Jun 2025"/>
        </FormSection>
        <FormSection title="Pricing">
          <FInput label="Base Freight (SAR)" value="1,400.00"/>
          <FInput label="Fuel Surcharge (SAR)" value="168.00"/>
          <FInput label="Additional Charges (SAR)" value="100.00"/>
          <FInput label="VAT 15% (SAR)" value="250.20"/>
          <FInput label="Discount (SAR)" value="0.00"/>
          <div className="flex flex-col justify-end"><div className="px-4 py-3 rounded-xl bg-[#FFF0EB]"><p className="text-xs text-[#E8450F]">Total (incl. VAT)</p><p className="text-xl font-bold text-[#E8450F]">SAR 1,918.20</p></div></div>
          <FInput label="Remarks" placeholder="Add invoice notes…" span/>
        </FormSection>
        <div className="flex gap-3 pb-6"><Btn label="Discard" variant="secondary"/><Btn label="Generate Invoice"/></div>
      </div>
    </DashLayout>
  );
}

function PaymentStatus() {
  return (
    <DashLayout active="Invoices" title="Payment Status" breadcrumb="Invoices" pageTitle="Payment Status Dashboard">
      <div className="px-6 space-y-4">
        <div className="grid grid-cols-4 gap-4">
          <KpiCard label="Total Outstanding" value="SAR 42K" delta="-8%" up={false} icon={AlertCircle} color="#DC2626" bg="#FEF2F2"/>
          <KpiCard label="Paid This Month" value="SAR 142K" delta="+18%" up icon={CheckCircle2} color="#16A34A" bg="#F0FDF4"/>
          <KpiCard label="Avg Collection" value="12 days" delta="-3d" up icon={Clock} color="#2563EB" bg="#EFF6FF"/>
          <KpiCard label="Overdue" value="SAR 18K" delta="+2" up={false} icon={AlertTriangle} color="#D97706" bg="#FFFBEB"/>
        </div>
        <TableWrapper>
          <table className="w-full text-sm">
            <THead cols={["Invoice","Customer","Amount","Due Date","Days Overdue","Status","Action"]}/>
            <tbody>
              {INVS.map((inv)=>(
                <tr key={inv.id} className="border-b border-[#F5F5F7] last:border-0 hover:bg-[#FAFAFA]">
                  <td className="px-5 py-3 font-mono text-xs font-bold text-[#E8450F]">{inv.id}</td>
                  <td className="px-3 py-3 text-xs text-[#444]">{inv.cust}</td>
                  <td className="px-3 py-3 text-xs font-bold text-[#111]">{inv.amt}</td>
                  <td className="px-3 py-3 text-xs text-[#6E6E80]">23 Jun 2025</td>
                  <td className="px-3 py-3 text-xs font-semibold" style={{ color: inv.s === "Overdue" ? "#DC2626" : "#6E6E80" }}>{inv.s === "Overdue" ? "12 days" : "—"}</td>
                  <td className="px-3 py-3"><StatusBadge status={inv.s} color={inv.sc} bg={inv.sb}/></td>
                  <td className="px-3 py-3"><Btn label="Mark Paid" variant="ghost" size="sm"/></td>
                </tr>
              ))}
            </tbody>
          </table>
          <Pager/>
        </TableWrapper>
      </div>
    </DashLayout>
  );
}

/* ═══════════════════════════════════════════════════════════════════════════ */
/* DOCUMENTS                                                                    */
/* ═══════════════════════════════════════════════════════════════════════════ */
function DocumentsCenter() {
  return (
    <DashLayout active="Documents" title="Documents" pageTitle="Document Center" pageSub="Manage all fleet documents"
      actions={<Btn label="Upload Document" icon={<Upload size={14}/>}/>}>
      <div className="px-6 mb-4 grid grid-cols-4 gap-3">
        {[["156","Total Docs","#111","#F5F5F7"],["128","Active","#16A34A","#F0FDF4"],["14","Expiring","#D97706","#FFFBEB"],["8","Expired","#DC2626","#FEF2F2"]].map(([v,l,c,bg])=>(
          <div key={l} className="bg-white rounded-2xl p-4 border border-black/[0.06] shadow-sm">
            <p className="text-2xl font-bold" style={{color:c as string}}>{v}</p>
            <p className="text-xs text-[#6E6E80] mt-0.5">{l}</p>
          </div>
        ))}
      </div>
      <TableWrapper>
        <table className="w-full text-sm">
          <THead cols={["Document","Entity","Type","Issue Date","Expiry Date","Status","Actions"]}/>
          <tbody>
            {[{n:"Insurance",e:"TRK-2041",t:"Vehicle",i:"03 Jul 2025",exp:"03 Jul 2026",s:"Active",sc:"#16A34A",sb:"#F0FDF4"},{n:"Driving License",e:"Ahmed Kareem",t:"Driver",i:"12 Aug 2019",exp:"12 Aug 2027",s:"Active",sc:"#16A34A",sb:"#F0FDF4"},{n:"Fahas Certificate",e:"DRA-9973",t:"Vehicle",i:"22 May 2025",exp:"22 May 2026",s:"Active",sc:"#16A34A",sb:"#F0FDF4"},{n:"Iqama",e:"Faisal Baraka",t:"Driver",i:"01 Aug 2022",exp:"03 Jul 2025",s:"Expiring",sc:"#D97706",sb:"#FFFBEB"},{n:"Medical Certificate",e:"Suresh Babu",t:"Driver",i:"01 Sep 2022",exp:"01 Mar 2025",s:"Expired",sc:"#DC2626",sb:"#FEF2F2"}].map((d,i)=>(
              <tr key={i} className="border-b border-[#F5F5F7] last:border-0 hover:bg-[#FAFAFA]">
                <td className="px-5 py-3 text-xs font-semibold text-[#111]">{d.n}</td>
                <td className="px-3 py-3 text-xs text-[#444]">{d.e}</td>
                <td className="px-3 py-3 text-xs text-[#6E6E80]">{d.t}</td>
                <td className="px-3 py-3 text-xs text-[#6E6E80]">{d.i}</td>
                <td className="px-3 py-3 text-xs text-[#6E6E80]">{d.exp}</td>
                <td className="px-3 py-3"><StatusBadge status={d.s} color={d.sc} bg={d.sb}/></td>
                <td className="px-3 py-3"><div className="flex gap-1"><button className="w-7 h-7 rounded-lg bg-[#F5F5F7] flex items-center justify-center"><Eye size={13} className="text-[#6E6E80]"/></button><button className="w-7 h-7 rounded-lg bg-[#F5F5F7] flex items-center justify-center"><Download size={13} className="text-[#6E6E80]"/></button></div></td>
              </tr>
            ))}
          </tbody>
        </table>
        <Pager/>
      </TableWrapper>
    </DashLayout>
  );
}

function ExpiryManagement() {
  return (
    <DashLayout active="Documents" title="Expiry Management" breadcrumb="Documents" pageTitle="Expiry Management"
      actions={<Btn label="Enable Alerts" icon={<Bell size={14}/>}/>}>
      <div className="px-6 space-y-4">
        <div className="grid grid-cols-3 gap-4">
          {[["5","Critical (≤7 days)","#DC2626","#FEF2F2"],["9","Expiring (≤30 days)","#D97706","#FFFBEB"],["28","Renewed this month","#16A34A","#F0FDF4"]].map(([v,l,c,bg])=>(
            <div key={l} className="bg-white rounded-2xl p-5 border border-black/[0.06] shadow-sm flex items-center gap-4">
              <div className="w-12 h-12 rounded-2xl flex items-center justify-center shrink-0" style={{background:bg as string}}><AlertTriangle size={22} style={{color:c as string}}/></div>
              <div><p className="text-2xl font-bold" style={{color:c as string}}>{v}</p><p className="text-xs text-[#6E6E80]">{l}</p></div>
            </div>
          ))}
        </div>
        <TableWrapper>
          <table className="w-full text-sm">
            <THead cols={["Document","Entity","Expiry","Days Left","Status","Action"]}/>
            <tbody>
              {[{n:"Insurance",e:"TRK-2041",exp:"03 Jul 2025",d:3,s:"Critical",sc:"#DC2626",sb:"#FEF2F2"},{n:"Fahas",e:"DRA-9973",exp:"12 Jul 2025",d:12,s:"Expiring",sc:"#D97706",sb:"#FFFBEB"},{n:"Iqama",e:"Faisal B.",exp:"22 Jul 2025",d:22,s:"Expiring",sc:"#D97706",sb:"#FFFBEB"},{n:"Misan Card",e:"LKA-3812",exp:"16 Aug 2025",d:47,s:"Due Soon",sc:"#2563EB",sb:"#EFF6FF"}].map((r,i)=>(
                <tr key={i} className="border-b border-[#F5F5F7] last:border-0 hover:bg-[#FAFAFA]">
                  <td className="px-5 py-3 text-xs font-semibold text-[#111]">{r.n}</td>
                  <td className="px-3 py-3 font-mono text-xs text-[#444]">{r.e}</td>
                  <td className="px-3 py-3 text-xs text-[#6E6E80]">{r.exp}</td>
                  <td className="px-3 py-3 text-xs font-bold" style={{color:r.sc}}>{r.d} days</td>
                  <td className="px-3 py-3"><StatusBadge status={r.s} color={r.sc} bg={r.sb}/></td>
                  <td className="px-3 py-3"><Btn label="Renew Now" variant="ghost" size="sm"/></td>
                </tr>
              ))}
            </tbody>
          </table>
        </TableWrapper>
      </div>
    </DashLayout>
  );
}

/* ═══════════════════════════════════════════════════════════════════════════ */
/* REPORTS                                                                      */
/* ═══════════════════════════════════════════════════════════════════════════ */
function ReportsDashboard() {
  const rg3 = useGradId("rg3");
  return (
    <DashLayout active="Reports" title="Reports" pageTitle="Reports & Analytics" pageSub="May 2025"
      actions={<><Btn label="Export PDF" icon={<Download size={14}/>} variant="secondary"/><Btn label="Export Excel" icon={<Download size={14}/>} variant="secondary"/></>}>
      <div className="px-6 space-y-4">
        <div className="grid grid-cols-4 gap-4">
          <KpiCard label="Total Trips" value="128" delta="+16%" up icon={Truck} color="#E8450F" bg="#FFF0EB"/>
          <KpiCard label="Total Revenue" value="SAR 213K" delta="+12.4%" up icon={DollarSign} color="#16A34A" bg="#F0FDF4"/>
          <KpiCard label="On-Time Rate" value="89.3%" delta="+5.1%" up icon={CheckCircle2} color="#2563EB" bg="#EFF6FF"/>
          <KpiCard label="Fleet Utilization" value="78%" delta="+2.8%" up icon={Activity} color="#7C3AED" bg="#F5F3FF"/>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div className="bg-white rounded-2xl p-5 border border-black/[0.06] shadow-sm">
            <p className="text-sm font-bold text-[#111] mb-1">Revenue Trend</p>
            <p className="text-xs text-[#6E6E80] mb-4">Monthly revenue — 2025</p>
            <ResponsiveContainer width="100%" height={160}>
              <AreaChart data={revData}>
                <defs><linearGradient id={rg3} x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="#E8450F" stopOpacity={0.12}/><stop offset="95%" stopColor="#E8450F" stopOpacity={0}/></linearGradient></defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#F0F0F2"/>
                <XAxis dataKey="m" tick={{fontSize:10,fill:"#9898A4"}} axisLine={false} tickLine={false}/>
                <YAxis tick={{fontSize:10,fill:"#9898A4"}} axisLine={false} tickLine={false} tickFormatter={(v)=>`${(v/1000).toFixed(0)}K`}/>
                <Tooltip contentStyle={{borderRadius:10,fontSize:11,border:"1px solid #F0F0F2"}} formatter={(v:number)=>[`SAR ${v.toLocaleString()}`,"Revenue"]}/>
                <Area type="monotone" dataKey="r" stroke="#E8450F" strokeWidth={2} fill={`url(#${rg3})`} name="Revenue"/>
              </AreaChart>
            </ResponsiveContainer>
          </div>
          <div className="bg-white rounded-2xl p-5 border border-black/[0.06] shadow-sm">
            <p className="text-sm font-bold text-[#111] mb-1">Trip Volume</p>
            <p className="text-xs text-[#6E6E80] mb-4">Monthly trips — 2025</p>
            <ResponsiveContainer width="100%" height={160}>
              <BarChart data={trendData} key="rpt-bar">
                <CartesianGrid strokeDasharray="3 3" stroke="#F0F0F2"/>
                <XAxis dataKey="m" tick={{fontSize:10,fill:"#9898A4"}} axisLine={false} tickLine={false}/>
                <YAxis tick={{fontSize:10,fill:"#9898A4"}} axisLine={false} tickLine={false}/>
                <Tooltip contentStyle={{borderRadius:10,fontSize:11,border:"1px solid #F0F0F2"}}/>
                <Bar dataKey="v" fill="#E8450F" radius={[4,4,0,0]} name="Trips"/>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    </DashLayout>
  );
}

function FleetPerformance() {
  return (
    <DashLayout active="Reports" title="Fleet Performance" breadcrumb="Reports" pageTitle="Fleet Performance Report">
      <div className="px-6 space-y-4">
        <div className="grid grid-cols-4 gap-4">
          <KpiCard label="Active Vehicles" value="48/72" delta="+3" up icon={Truck} color="#E8450F" bg="#FFF0EB"/>
          <KpiCard label="Avg Utilization" value="78%" delta="+2.8%" up icon={Activity} color="#16A34A" bg="#F0FDF4"/>
          <KpiCard label="Maintenance Due" value="8" delta="+2" up={false} icon={Wrench} color="#D97706" bg="#FFFBEB"/>
          <KpiCard label="Docs Expiring" value="14" delta="+5" up={false} icon={Shield} color="#DC2626" bg="#FEF2F2"/>
        </div>
        <div className="bg-white rounded-2xl p-5 border border-black/[0.06] shadow-sm">
          <p className="text-sm font-bold text-[#111] mb-4">Vehicle Utilization (Top 5)</p>
          <div className="space-y-3">
            {[{v:"TRK-2041",u:85,c:"#16A34A"},{v:"DRA-9973",u:78,c:"#2563EB"},{v:"VRA-3358",u:92,c:"#E8450F"},{v:"LKA-3812",u:61,c:"#D97706"},{v:"FAD-2210",u:74,c:"#7C3AED"}].map((r)=>(
              <div key={r.v} className="flex items-center gap-4">
                <span className="font-mono text-xs font-bold text-[#6E6E80] w-20">{r.v}</span>
                <div className="flex-1 h-2 rounded-full bg-[#EBEBED] overflow-hidden"><div className="h-full rounded-full" style={{width:`${r.u}%`,background:r.c}}/></div>
                <span className="text-xs font-bold w-10 text-right" style={{color:r.c}}>{r.u}%</span>
              </div>
            ))}
          </div>
        </div>
        <TableWrapper>
          <table className="w-full text-sm">
            <THead cols={["Vehicle","Model","Trips","km Covered","Utilization","Status"]}/>
            <tbody>
              {VEHICLES.map((v)=>(
                <tr key={v.id} className="border-b border-[#F5F5F7] last:border-0 hover:bg-[#FAFAFA]">
                  <td className="px-5 py-2.5 font-mono text-xs font-bold text-[#E8450F]">{v.id}</td>
                  <td className="px-3 py-2.5 text-xs text-[#444]">{v.model}</td>
                  <td className="px-3 py-2.5 text-xs font-semibold text-[#111]">42</td>
                  <td className="px-3 py-2.5 text-xs text-[#444]">6,280 km</td>
                  <td className="px-3 py-2.5 text-xs font-semibold text-[#16A34A]">85%</td>
                  <td className="px-3 py-2.5"><StatusBadge status={v.status} color={v.sc} bg={v.sb}/></td>
                </tr>
              ))}
            </tbody>
          </table>
        </TableWrapper>
      </div>
    </DashLayout>
  );
}

function RevenueReports() {
  const rg4 = useGradId("rg4");
  return (
    <DashLayout active="Reports" title="Revenue Reports" breadcrumb="Reports" pageTitle="Revenue Analytics">
      <div className="px-6 space-y-4">
        <div className="grid grid-cols-4 gap-4">
          <KpiCard label="Total Revenue" value="SAR 213K" delta="+12.4%" up icon={DollarSign} color="#16A34A" bg="#F0FDF4"/>
          <KpiCard label="Avg per Trip" value="SAR 1,668" delta="-3.2%" up={false} icon={TrendingUp} color="#E8450F" bg="#FFF0EB"/>
          <KpiCard label="Invoiced" value="SAR 184K" delta="+14%" up icon={ReceiptText} color="#2563EB" bg="#EFF6FF"/>
          <KpiCard label="Outstanding" value="SAR 42K" delta="+8%" up={false} icon={AlertCircle} color="#D97706" bg="#FFFBEB"/>
        </div>
        <div className="grid grid-cols-3 gap-4">
          <div className="col-span-2 bg-white rounded-2xl p-5 border border-black/[0.06] shadow-sm">
            <p className="text-sm font-bold text-[#111] mb-1">Revenue by Month</p>
            <p className="text-xs text-[#6E6E80] mb-4">2025 cumulative revenue</p>
            <ResponsiveContainer width="100%" height={160}>
              <AreaChart data={revData}>
                <defs><linearGradient id={rg4} x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="#16A34A" stopOpacity={0.12}/><stop offset="95%" stopColor="#16A34A" stopOpacity={0}/></linearGradient></defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#F0F0F2"/>
                <XAxis dataKey="m" tick={{fontSize:10,fill:"#9898A4"}} axisLine={false} tickLine={false}/>
                <Tooltip contentStyle={{borderRadius:10,fontSize:11,border:"1px solid #F0F0F2"}} formatter={(v:number)=>[`SAR ${v.toLocaleString()}`]}/>
                <Area type="monotone" dataKey="r" stroke="#16A34A" strokeWidth={2} fill={`url(#${rg4})`} name="Revenue"/>
              </AreaChart>
            </ResponsiveContainer>
          </div>
          <div className="bg-white rounded-2xl p-5 border border-black/[0.06] shadow-sm">
            <p className="text-sm font-bold text-[#111] mb-3">Top Customers</p>
            {[["Fahad Trading","SAR 42.8K",28],["Al-Rashid","SAR 31.2K",22],["Saudi Polymers","SAR 24.6K",18],["SABIC","SAR 18.1K",12]].map(([n,r,pct])=>(
              <div key={n as string} className="mb-3 last:mb-0">
                <div className="flex justify-between text-xs mb-1"><span className="text-[#444] truncate">{n}</span><span className="font-bold text-[#111] shrink-0 ml-2">{r}</span></div>
                <div className="h-1.5 rounded-full bg-[#EBEBED] overflow-hidden"><div className="h-full rounded-full bg-[#E8450F]" style={{width:`${pct}%`}}/></div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </DashLayout>
  );
}

function DriverPerformance() {
  return (
    <DashLayout active="Reports" title="Driver Performance" breadcrumb="Reports" pageTitle="Driver Performance Report">
      <div className="px-6 space-y-4">
        <div className="grid grid-cols-4 gap-4">
          <KpiCard label="Total Drivers" value="48" delta="+2" up icon={Users} color="#E8450F" bg="#FFF0EB"/>
          <KpiCard label="Avg Rating" value="4.6★" delta="+0.1" up icon={Star} color="#D97706" bg="#FFFBEB"/>
          <KpiCard label="On-Time Rate" value="89%" delta="+5%" up icon={CheckCircle2} color="#16A34A" bg="#F0FDF4"/>
          <KpiCard label="Incidents" value="2" delta="-3" up icon={AlertTriangle} color="#DC2626" bg="#FEF2F2"/>
        </div>
        <TableWrapper>
          <table className="w-full text-sm">
            <THead cols={["Driver","ID","Trips","On-Time","Rating","Incidents","Status"]}/>
            <tbody>
              {DRIVERS.map((d)=>(
                <tr key={d.id} className="border-b border-[#F5F5F7] last:border-0 hover:bg-[#FAFAFA]">
                  <td className="px-5 py-3"><div className="flex items-center gap-2"><div className="w-7 h-7 rounded-full bg-[#E8450F] flex items-center justify-center text-white text-[10px] font-bold">{d.name.split(" ").map(n=>n[0]).join("")}</div><span className="text-xs font-semibold text-[#111]">{d.name}</span></div></td>
                  <td className="px-3 py-3 font-mono text-xs text-[#6E6E80]">{d.id}</td>
                  <td className="px-3 py-3 text-xs font-semibold text-[#111]">{d.trips.toLocaleString()}</td>
                  <td className="px-3 py-3 text-xs font-semibold text-[#16A34A]">94%</td>
                  <td className="px-3 py-3 text-xs text-[#D97706] font-semibold">★ {d.rating}</td>
                  <td className="px-3 py-3 text-xs text-[#111]">0</td>
                  <td className="px-3 py-3"><StatusBadge status={d.status} color={d.sc} bg={d.sb}/></td>
                </tr>
              ))}
            </tbody>
          </table>
          <Pager/>
        </TableWrapper>
      </div>
    </DashLayout>
  );
}

/* ═══════════════════════════════════════════════════════════════════════════ */
/* SETTINGS                                                                     */
/* ═══════════════════════════════════════════════════════════════════════════ */
function OperatorProfile() {
  return (
    <DashLayout active="Profile" title="Operator Profile" pageTitle="My Profile"
      actions={<Btn label="Edit Profile" icon={<Edit2 size={14}/>}/>}>
      <div className="px-6 grid grid-cols-3 gap-4">
        <div className="space-y-4">
          <div className="bg-white rounded-2xl p-6 border border-black/[0.06] shadow-sm text-center">
            <div className="w-20 h-20 rounded-full bg-[#1A1A1A] flex items-center justify-center text-white text-2xl font-bold mx-auto mb-4">MH</div>
            <p className="text-lg font-bold text-[#111]">Mohammed Al-Harbi</p>
            <p className="text-sm text-[#6E6E80] mb-2">OPR-0012 · Fleet Operations Manager</p>
            <div className="flex items-center justify-center gap-1.5 px-3 py-1.5 bg-[#FFF0EB] rounded-full w-fit mx-auto">
              <Building2 size={12} className="text-[#E8450F]"/>
              <span className="text-xs font-semibold text-[#E8450F]">Riyadh Branch</span>
            </div>
            <div className="grid grid-cols-3 gap-2 mt-5">
              {[["128","Trips"],["94%","On-Time"],["4.8★","Rating"]].map(([v,l])=>(
                <div key={l} className="text-center"><p className="text-sm font-bold text-[#E8450F]">{v}</p><p className="text-[9px] text-[#6E6E80]">{l}</p></div>
              ))}
            </div>
          </div>
        </div>
        <div className="col-span-2 space-y-4">
          <div className="bg-white rounded-2xl p-5 border border-black/[0.06] shadow-sm">
            <p className="text-xs font-bold uppercase tracking-wider text-[#9898A4] mb-4">Account Information</p>
            <div className="grid grid-cols-2 gap-4">
              {[["Full Name","Mohammed Al-Harbi"],["Employee ID","OPR-0012"],["Role","Fleet Operations Manager"],["Branch","Riyadh HQ"],["Phone","+966 55 456 7890"],["Email","m.harbi@mercon.sa"]].map(([k,v])=>(
                <div key={k}><p className="text-xs text-[#9898A4] mb-0.5">{k}</p><p className="text-sm font-semibold text-[#111]">{v}</p></div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </DashLayout>
  );
}

function SettingsPage() {
  const [notifTrips, setNotifTrips] = useState(true);
  const [notifDocs, setNotifDocs] = useState(true);
  const [biometric, setBiometric] = useState(false);
  return (
    <DashLayout active="Settings" title="Settings" pageTitle="Settings">
      <div className="px-6 grid grid-cols-2 gap-6">
        {[
          { title: "Notifications", rows: [
            { l: "Trip Updates", t: true, v: notifTrips, s: setNotifTrips },
            { l: "Document Alerts", t: true, v: notifDocs, s: setNotifDocs },
            { l: "System Announcements", t: false, v2: "Enabled" },
          ]},
          { title: "Security", rows: [
            { l: "Biometric Login", t: true, v: biometric, s: setBiometric },
            { l: "Two-Factor Auth", t: false, v2: "Active" },
            { l: "Change Password", t: false, action: true },
          ]},
          { title: "Preferences", rows: [
            { l: "Language", t: false, v2: "English" },
            { l: "Timezone", t: false, v2: "AST (UTC+3)" },
            { l: "Date Format", t: false, v2: "DD MMM YYYY" },
          ]},
          { title: "About", rows: [
            { l: "App Version", t: false, v2: "v2.1.4" },
            { l: "Last Updated", t: false, v2: "01 Jun 2025" },
            { l: "Support", t: false, action: true },
          ]},
        ].map((g) => (
          <div key={g.title} className="bg-white rounded-2xl border border-black/[0.06] shadow-sm overflow-hidden">
            <div className="px-5 py-3.5 border-b border-[#F0F0F2]"><p className="text-xs font-bold uppercase tracking-wider text-[#9898A4]">{g.title}</p></div>
            {g.rows.map((row: any, i) => (
              <div key={i} className="flex items-center gap-3 px-5 py-3.5 border-b border-[#F5F5F7] last:border-0">
                <p className="text-sm font-medium text-[#111] flex-1">{row.l}</p>
                {row.t ? (
                  <button onClick={() => row.s?.(!row.v)} className={`relative w-10 h-5 rounded-full transition-colors ${row.v ? "bg-[#E8450F]" : "bg-[#D8D8DC]"}`}>
                    <span className={`absolute top-0.5 w-4 h-4 bg-white rounded-full shadow transition-transform ${row.v ? "translate-x-5" : "translate-x-0.5"}`}/>
                  </button>
                ) : row.action ? (
                  <button className="text-xs text-[#E8450F] font-semibold">Manage</button>
                ) : (
                  <span className="text-xs text-[#6E6E80]">{row.v2}</span>
                )}
              </div>
            ))}
          </div>
        ))}
      </div>
    </DashLayout>
  );
}

function UserManagement() {
  return (
    <DashLayout active="Settings" title="User Management" breadcrumb="Settings" pageTitle="User Management & Permissions"
      actions={<Btn label="Invite User" icon={<UserPlus size={14}/>}/>}>
      <TableWrapper>
        <table className="w-full text-sm">
          <THead cols={["User","Role","Branch","Permissions","Last Active","Status","Actions"]}/>
          <tbody>
            {[{n:"Mohammed Al-Harbi",r:"Fleet Manager",b:"Riyadh",p:"Full Access",la:"Now",s:"Active",sc:"#16A34A",sb:"#F0FDF4"},{n:"Sara Al-Ahmad",r:"Operations",b:"Jeddah",p:"Trips, Drivers",la:"1 hr ago",s:"Active",sc:"#16A34A",sb:"#F0FDF4"},{n:"Khalid Mansour",r:"Finance",b:"Riyadh",p:"Invoices, Reports",la:"Yesterday",s:"Active",sc:"#16A34A",sb:"#F0FDF4"},{n:"Omar Al-Farsi",r:"Viewer",b:"Dammam",p:"Read Only",la:"3 days ago",s:"Inactive",sc:"#6E6E80",sb:"#F5F5F7"}].map((u,i)=>(
              <tr key={i} className="border-b border-[#F5F5F7] last:border-0 hover:bg-[#FAFAFA]">
                <td className="px-5 py-3"><div className="flex items-center gap-2"><div className="w-7 h-7 rounded-full bg-[#1A1A1A] flex items-center justify-center text-white text-[10px] font-bold">{u.n.split(" ").map((x:string)=>x[0]).join("")}</div><span className="text-xs font-semibold text-[#111]">{u.n}</span></div></td>
                <td className="px-3 py-3 text-xs text-[#444]">{u.r}</td>
                <td className="px-3 py-3 text-xs text-[#444]">{u.b}</td>
                <td className="px-3 py-3 text-xs text-[#6E6E80]">{u.p}</td>
                <td className="px-3 py-3 text-xs text-[#9898A4]">{u.la}</td>
                <td className="px-3 py-3"><StatusBadge status={u.s} color={u.sc} bg={u.sb}/></td>
                <td className="px-3 py-3"><div className="flex gap-1"><button className="w-7 h-7 rounded-lg bg-[#F5F5F7] flex items-center justify-center"><Edit2 size={13} className="text-[#6E6E80]"/></button><button className="w-7 h-7 rounded-lg bg-[#F5F5F7] flex items-center justify-center"><Trash2 size={13} className="text-[#6E6E80]"/></button></div></td>
              </tr>
            ))}
          </tbody>
        </table>
      </TableWrapper>
    </DashLayout>
  );
}

function LogoutConfirmation() {
  return (
    <div className="flex h-full items-center justify-center bg-[#F5F5F7]" style={{ fontFamily: "'Plus Jakarta Sans', 'Inter', system-ui, sans-serif" }}>
      <div className="bg-white rounded-3xl p-10 shadow-2xl max-w-sm w-full text-center border border-black/[0.06]">
        <div className="w-16 h-16 rounded-2xl bg-[#FEF2F2] flex items-center justify-center mx-auto mb-5">
          <LogOut size={28} className="text-[#DC2626]"/>
        </div>
        <p className="text-2xl font-bold text-[#111] mb-2">Log Out?</p>
        <p className="text-sm text-[#6E6E80] leading-relaxed mb-8">You are about to sign out of the MERCON Operator Platform. All unsaved changes will be lost.</p>
        <div className="space-y-3">
          <button className="w-full py-3.5 rounded-xl bg-[#DC2626] text-white font-bold hover:bg-[#B91C1C]">Yes, Log Out</button>
          <button className="w-full py-3.5 rounded-xl bg-[#F0F0F2] text-[#444] font-semibold">Cancel</button>
        </div>
        <p className="text-xs text-[#9898A4] mt-6">© 2025 Mercon Logistics Services Company</p>
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════════════════ */
/* SCREEN REGISTRY                                                              */
/* ═══════════════════════════════════════════════════════════════════════════ */
const SCREENS = [
  { n:1,  g:"Auth",      t:"Login",                    C: LoginScreen },
  { n:2,  g:"Auth",      t:"Forgot Password",          C: ForgotPasswordScreen },
  { n:3,  g:"Auth",      t:"Reset Password",           C: ResetPasswordScreen },
  { n:4,  g:"Dashboard", t:"Dashboard Home",           C: DashboardHome },
  { n:5,  g:"Dashboard", t:"Notifications Center",     C: NotificationsCenter },
  { n:6,  g:"Trips",     t:"Trip List",                C: TripList },
  { n:7,  g:"Trips",     t:"Trip Details",             C: TripDetails },
  { n:8,  g:"Trips",     t:"Create Trip",              C: CreateTrip },
  { n:9,  g:"Trips",     t:"Edit Trip",                C: EditTrip },
  { n:10, g:"Trips",     t:"Live Trip Tracking",       C: TripTracking },
  { n:11, g:"Trips",     t:"Trip Completion Review",   C: TripCompletionReview },
  { n:12, g:"Drivers",   t:"Drivers List",             C: DriversList },
  { n:13, g:"Drivers",   t:"Driver Details",           C: DriverDetails },
  { n:14, g:"Drivers",   t:"Add Driver",               C: AddDriver },
  { n:15, g:"Drivers",   t:"Edit Driver",              C: EditDriver },
  { n:16, g:"Drivers",   t:"Driver Documents",         C: DriverDocuments },
  { n:17, g:"Vehicles",  t:"Vehicle List",             C: VehicleList },
  { n:18, g:"Vehicles",  t:"Vehicle Details",          C: VehicleDetails },
  { n:19, g:"Vehicles",  t:"Add Vehicle",              C: AddVehicle },
  { n:20, g:"Vehicles",  t:"Edit Vehicle",             C: EditVehicle },
  { n:21, g:"Vehicles",  t:"Vehicle Documents",        C: VehicleDocuments },
  { n:22, g:"Customers", t:"Customer List",            C: CustomerList },
  { n:23, g:"Customers", t:"Customer Details",         C: CustomerDetails },
  { n:24, g:"Customers", t:"Add Customer",             C: AddCustomer },
  { n:25, g:"Customers", t:"Edit Customer",            C: EditCustomer },
  { n:26, g:"Customers", t:"Customer Contracts",       C: CustomerContracts },
  { n:27, g:"Rate Cards",t:"Rate Card List",           C: RateCardList },
  { n:28, g:"Rate Cards",t:"Create Rate Card",         C: CreateRateCard },
  { n:29, g:"Rate Cards",t:"Edit Rate Card",           C: EditRateCard },
  { n:30, g:"Rate Cards",t:"Upload Documents",         C: UploadRateCardDocs },
  { n:31, g:"Invoices",  t:"Invoice List",             C: InvoiceList },
  { n:32, g:"Invoices",  t:"Invoice Details",          C: InvoiceDetails },
  { n:33, g:"Invoices",  t:"Create Invoice",           C: CreateInvoice },
  { n:34, g:"Invoices",  t:"Payment Status",           C: PaymentStatus },
  { n:35, g:"Documents", t:"Documents Center",         C: DocumentsCenter },
  { n:36, g:"Documents", t:"Expiry Management",        C: ExpiryManagement },
  { n:37, g:"Reports",   t:"Reports Dashboard",        C: ReportsDashboard },
  { n:38, g:"Reports",   t:"Fleet Performance",        C: FleetPerformance },
  { n:39, g:"Reports",   t:"Revenue Reports",          C: RevenueReports },
  { n:40, g:"Reports",   t:"Driver Performance",       C: DriverPerformance },
  { n:41, g:"Settings",  t:"Operator Profile",         C: OperatorProfile },
  { n:42, g:"Settings",  t:"Settings",                 C: SettingsPage },
  { n:43, g:"Settings",  t:"User Management",          C: UserManagement },
  { n:44, g:"Settings",  t:"Logout Confirmation",      C: LogoutConfirmation },
];

const GROUPS = [...new Set(SCREENS.map((s) => s.g))];

/* ═══════════════════════════════════════════════════════════════════════════ */
/* EXPORT                                                                       */
/* ═══════════════════════════════════════════════════════════════════════════ */
export function WebDashboardSection() {
  const [active, setActive]     = useState(4);
  const [group,  setGroup]      = useState("All");

  const screen   = SCREENS.find((s) => s.n === active) ?? SCREENS[0];
  const filtered = group === "All" ? SCREENS : SCREENS.filter((s) => s.g === group);

  return (
    <div>
      <SectionHeader
        title="Web Dashboard"
        desc="44 enterprise desktop screens — 1440px layout with sticky sidebar, header, tables, charts, and full CRUD flows."
      />

      {/* Stats */}
      <div className="flex flex-wrap gap-3 mb-6">
        {[["44","Total Screens"],["11","Flow Groups"],["Stripe-level","Quality"],["1440px","Desktop Layout"]].map(([v,l]) => (
          <div key={l} className="flex items-center gap-2 px-4 py-2.5 bg-white rounded-2xl border border-[#EBEBED] shadow-sm">
            <span className="text-base font-bold text-[#E8450F]">{v}</span>
            <span className="text-xs text-[#6E6E80]">{l}</span>
          </div>
        ))}
      </div>

      {/* Group filter */}
      <div className="flex flex-wrap gap-2 mb-4">
        {["All", ...GROUPS].map((g) => (
          <button key={g} onClick={() => setGroup(g)}
            className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all ${group === g ? "bg-[#1A1A1A] text-white" : "bg-white text-[#444] border border-[#EBEBED] hover:border-[rgba(26,26,26,0.3)]"}`}>
            {g}
            {g !== "All" && <span className="ml-1.5 text-[9px] opacity-60">{SCREENS.filter((s) => s.g === g).length}</span>}
          </button>
        ))}
      </div>

      {/* Screen selector */}
      <div className="flex flex-wrap gap-2 mb-6">
        {filtered.map((s) => (
          <button key={s.n} onClick={() => setActive(s.n)}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold transition-all ${active === s.n ? "bg-[#E8450F] text-white shadow-sm" : "bg-white text-[#444] border border-[#EBEBED] hover:border-[rgba(232,69,15,0.4)]"}`}>
            <span className={`text-[10px] font-mono ${active === s.n ? "text-[rgba(255,255,255,0.7)]" : "text-[#9898A4]"}`}>{String(s.n).padStart(2,"0")}</span>
            {s.t}
          </button>
        ))}
      </div>

      {/* Full-width browser preview */}
      <div className="mb-10">
        <BrowserFrame title={screen.t} n={screen.n}>
          <screen.C />
        </BrowserFrame>
      </div>

      {/* All 44 thumbnail grid */}
      <p className="text-xs font-semibold uppercase tracking-widest text-[#6E6E80] mb-4">All 44 Screens — Complete Dashboard Overview</p>
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-3">
        {SCREENS.map((s) => (
          <div key={s.n} onClick={() => setActive(s.n)} role="button" tabIndex={0}
            onKeyDown={(e) => e.key === "Enter" && setActive(s.n)}
            className={`rounded-xl overflow-hidden border-2 transition-all cursor-pointer ${active === s.n ? "border-[#E8450F] shadow-lg" : "border-transparent hover:border-[rgba(232,69,15,0.3)]"}`}>
            <div className="relative overflow-hidden bg-[#1A1A1A]" style={{ height: 120 }}>
              <div className="absolute inset-0 pointer-events-none origin-top-left" style={{ transform: "scale(0.23)", width: "435%", height: "435%" }}>
                <div style={{ width: "100%", height: 521 }}><s.C /></div>
              </div>
            </div>
            <div className="py-1.5 px-2 bg-white">
              <p className="text-[8px] font-mono text-[#9898A4]">{String(s.n).padStart(2,"0")} · {s.g}</p>
              <p className="text-[10px] font-semibold text-[#111] truncate">{s.t}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
