import React, { useState } from "react";
import {
  Home, Truck, Users, MoreHorizontal, Plus, Bell, ChevronRight, ChevronLeft,
  MapPin, Package, Clock, CheckCircle2, AlertTriangle, Camera, Upload,
  FileText, Settings, Eye, Download, Phone, Mail, Shield, Search, Filter,
  ArrowRight, LogOut, Globe, Lock, Info, Star, Edit2, Trash2, X, Check,
  User, BarChart3, Fuel, Calendar, DollarSign, Navigation2, Loader2,
  ReceiptText, Building2, CreditCard, AlertCircle, ChevronDown, Activity,
  TrendingUp, ArrowUp, ArrowDown, Gauge, Route, RefreshCw, Wifi, WifiOff
} from "lucide-react";
import macronLogo from "@/imports/MACRON_LOGO.jpeg";
import { ImageWithFallback } from "@/app/components/figma/ImageWithFallback";
import { SectionHeader } from "./common";

/* ─── Shared chrome (duplicated for standalone file) ─────────────────────── */
function SBar({ light = false }: { light?: boolean }) {
  const c = light ? "text-white" : "text-[#111]";
  return (
    <div className={`h-11 flex items-end justify-between px-6 pb-1.5 shrink-0 ${c}`}>
      <span className="text-[13px] font-semibold">9:41</span>
      <div className="flex items-center gap-1">
        <svg width="15" height="11" viewBox="0 0 16 12" fill="currentColor"><rect x="0" y="4" width="3" height="8" rx="1" opacity=".4"/><rect x="4.5" y="2.5" width="3" height="9.5" rx="1" opacity=".7"/><rect x="9" y="0.5" width="3" height="11.5" rx="1"/></svg>
        <svg width="15" height="11" viewBox="0 0 24 18" fill="none" stroke="currentColor" strokeWidth="2"><path d="M1.5 6.5C5.5 2.5 10.5 0.5 12 0.5s6.5 2 10.5 6"/><path d="M4.5 9.5C7 7 9.5 6 12 6s5 1 7.5 3.5"/><path d="M7.5 12.5C9 11 10.5 10.5 12 10.5s3 .5 4.5 2"/><circle cx="12" cy="16" r="1.5" fill="currentColor"/></svg>
        <svg width="24" height="11" viewBox="0 0 25 12" fill="none"><rect x="0.5" y="0.5" width="21" height="11" rx="3.5" stroke="currentColor" strokeOpacity=".35"/><rect x="2" y="2" width="16" height="8" rx="2" fill="currentColor"/><path d="M23 4v4a2 2 0 0 0 0-4z" fill="currentColor" opacity=".4"/></svg>
      </div>
    </div>
  );
}

function OBNav({ active }: { active: "Home"|"Trips"|"Drivers"|"More" }) {
  const navItems: { lbl: "Home"|"Trips"|"Drivers"|"More"; Icon: React.ElementType }[] = [
    { lbl: "Home",    Icon: Home },
    { lbl: "Trips",   Icon: Truck },
    { lbl: "Drivers", Icon: Users },
    { lbl: "More",    Icon: MoreHorizontal },
  ];
  return (
    <div className="shrink-0 px-4 pb-6 pt-2">
      <div className="flex items-center px-3 py-2 rounded-full"
        style={{ background: "#1C1C2E", boxShadow: "0 8px 32px rgba(28,28,46,0.5)" }}>
        {navItems.slice(0, 2).map(({ lbl, Icon }) => (
          <div key={lbl} className="flex-1 flex flex-col items-center gap-0.5 py-1">
            <Icon size={20} style={{ color: active===lbl ? "#E8450F" : "rgba(255,255,255,0.45)" }} strokeWidth={active===lbl?2.2:1.7}/>
            <span className="text-[9px] font-semibold" style={{ color: active===lbl ? "#E8450F" : "rgba(255,255,255,0.45)" }}>{lbl}</span>
          </div>
        ))}
        <div className="flex-1 flex justify-center">
          <div className="w-12 h-12 rounded-full bg-white border-2 border-[#E8450F] flex items-center justify-center shadow-md">
            <Plus size={22} className="text-[#E8450F]" strokeWidth={2.5} />
          </div>
        </div>
        {navItems.slice(2).map(({ lbl, Icon }) => (
          <div key={lbl} className="flex-1 flex flex-col items-center gap-0.5 py-1">
            <Icon size={20} style={{ color: active===lbl ? "#E8450F" : "rgba(255,255,255,0.45)" }} strokeWidth={active===lbl?2.2:1.7}/>
            <span className="text-[9px] font-semibold" style={{ color: active===lbl ? "#E8450F" : "rgba(255,255,255,0.45)" }}>{lbl}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function Frame({ children, title, n }: { children: React.ReactNode; title: string; n: number }) {
  return (
    <div className="flex flex-col items-center shrink-0">
      <div className="relative rounded-[44px] overflow-hidden flex flex-col"
        style={{ width: 375, height: 812, background: "#F5F5F7", border: "8px solid #1A1A1A", boxShadow: "0 24px 64px rgba(0,0,0,.35)" }}>
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-28 h-7 rounded-b-2xl z-20" style={{ background: "#1A1A1A" }} />
        <div className="flex flex-col h-full">{children}</div>
      </div>
      <div className="mt-4 text-center">
        <p className="text-xs font-bold text-[#111]">{String(n).padStart(2,"0")} — {title}</p>
      </div>
    </div>
  );
}

function Hdr({ title, sub, back=true, right }: { title:string; sub?:string; back?:boolean; right?: React.ReactNode }) {
  return (
    <div className="bg-white px-5 pt-11 pb-4 shrink-0 flex items-center gap-3">
      {back && <div className="w-9 h-9 rounded-2xl bg-[#F5F5F7] flex items-center justify-center shrink-0"><ChevronLeft size={20} className="text-[#444]"/></div>}
      <div className="flex-1"><p className="text-base font-bold text-[#111]">{title}</p>{sub && <p className="text-xs text-[#6E6E80]">{sub}</p>}</div>
      {right}
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════════════════ */
/* 01 SPLASH                                                                    */
/* ═══════════════════════════════════════════════════════════════════════════ */
function Splash() {
  return (
    <div className="flex flex-col items-center justify-between h-full" style={{ background:"#1A1A1A" }}>
      <div className="flex-1 flex flex-col items-center justify-center gap-5">
        <div className="w-24 h-24 rounded-3xl bg-white flex items-center justify-center shadow-2xl">
          <ImageWithFallback src={macronLogo} alt="Mercon" className="w-20 h-20 object-contain"/>
        </div>
        <div className="text-center">
          <p className="text-2xl font-bold text-white">MERCON</p>
          <p className="text-sm text-[rgba(255,255,255,0.5)] mt-1">Operator Platform</p>
        </div>
        <div className="w-48 h-1 rounded-full bg-[rgba(255,255,255,0.1)] overflow-hidden mt-2">
          <div className="h-full w-2/3 rounded-full bg-[#E8450F]"/>
        </div>
      </div>
      <p className="pb-12 text-xs text-[rgba(255,255,255,0.3)]">v2.1.4 · © 2025 Mercon Logistics</p>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════════════════ */
/* 02 LOGIN                                                                     */
/* ═══════════════════════════════════════════════════════════════════════════ */
function Login() {
  return (
    <div className="flex flex-col h-full bg-white">
      <SBar/>
      <div className="flex-1 flex flex-col px-6 pt-4 pb-6 overflow-hidden">
        <div className="flex justify-center mb-8 mt-2">
          <ImageWithFallback src={macronLogo} alt="Mercon" className="h-12 object-contain"/>
        </div>
        <p className="text-2xl font-bold text-[#111] mb-1">Welcome Back</p>
        <p className="text-sm text-[#6E6E80] mb-8">Sign in to your operator account</p>
        <div className="space-y-4 mb-6">
          {[{lbl:"Email",ph:"operator@mercon.sa",icon:<Mail size={15} className="text-[#9898A4]"/>},{lbl:"Password",ph:"••••••••",icon:<Lock size={15} className="text-[#9898A4]"/>}].map((f)=>(
            <div key={f.lbl}>
              <p className="text-xs font-semibold text-[#111] mb-1.5">{f.lbl}</p>
              <div className="flex items-center gap-2.5 px-4 py-3.5 rounded-2xl bg-[#F5F5F7]">{f.icon}<span className="text-sm text-[#9898A4]">{f.ph}</span></div>
            </div>
          ))}
        </div>
        <button className="w-full py-4 rounded-2xl bg-[#E8450F] text-white font-bold text-base mb-4">Sign In</button>
        <button className="text-center text-sm text-[#E8450F] font-semibold">Forgot Password?</button>
        <div className="flex-1"/>
        <p className="text-center text-xs text-[#9898A4]">Mercon Logistics Services Company</p>
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════════════════ */
/* 03 FORGOT PASSWORD                                                           */
/* ═══════════════════════════════════════════════════════════════════════════ */
function ForgotPassword() {
  return (
    <div className="flex flex-col h-full bg-white">
      <SBar/>
      <div className="flex-1 flex flex-col px-6 pt-4 pb-6">
        <div className="flex items-center gap-2 mb-8">
          <div className="w-9 h-9 rounded-2xl bg-[#F5F5F7] flex items-center justify-center"><ChevronLeft size={20} className="text-[#444]"/></div>
        </div>
        <div className="w-16 h-16 rounded-2xl bg-[#FFF0EB] flex items-center justify-center mb-6">
          <Lock size={28} className="text-[#E8450F]"/>
        </div>
        <p className="text-2xl font-bold text-[#111] mb-1">Reset Password</p>
        <p className="text-sm text-[#6E6E80] mb-8 leading-relaxed">Enter your registered email. We'll send a password reset link within 2 minutes.</p>
        <div className="mb-6">
          <p className="text-xs font-semibold text-[#111] mb-1.5">Email Address</p>
          <div className="flex items-center gap-2.5 px-4 py-3.5 rounded-2xl bg-[#F5F5F7] ring-2 ring-[rgba(232,69,15,0.3)]">
            <Mail size={15} className="text-[#9898A4]"/><span className="text-sm text-[#9898A4]">operator@mercon.sa</span>
          </div>
        </div>
        <button className="w-full py-4 rounded-2xl bg-[#E8450F] text-white font-bold text-base mb-4">Send Reset Link</button>
        <button className="text-center text-sm text-[#6E6E80] font-medium">Back to Login</button>
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════════════════ */
/* 04 HOME DASHBOARD                                                            */
/* ═══════════════════════════════════════════════════════════════════════════ */
function HomeDashboard() {
  return (
    <div className="flex flex-col h-full bg-[#F5F5F7]">
      <div className="bg-white px-5 pt-11 pb-4 shrink-0">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs text-[#6E6E80]">Good Morning</p>
            <p className="text-lg font-bold text-[#111]">Mohammed Al-Harbi</p>
          </div>
          <div className="relative">
            <div className="w-10 h-10 rounded-2xl bg-[#F5F5F7] flex items-center justify-center"><Bell size={20} className="text-[#444]"/></div>
            <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-[#E8450F] text-white text-[9px] font-bold flex items-center justify-center">5</span>
          </div>
        </div>
      </div>
      <div className="flex-1 overflow-y-auto px-5 py-4 space-y-4">
        {/* KPI row */}
        <div className="grid grid-cols-5 gap-2">
          {[["128","Total",null],["86","Done","#4ADE80"],["28","Transit","#60A5FA"],["9","Delayed","#FBBF24"],["5","Cancel","#F87171"]].map(([v,l,c])=>(
            <div key={l as string} className="rounded-2xl p-2.5 text-center" style={{ background:"#1C1C2E" }}>
              <p className="text-base font-bold" style={{ color: c ?? "white" }}>{v}</p>
              <p className="text-[8px] text-[rgba(255,255,255,0.4)] mt-0.5">{l}</p>
            </div>
          ))}
        </div>
        {/* Quick actions */}
        <div className="grid grid-cols-4 gap-2">
          {[{icon:Plus,lbl:"New Trip",c:"#E8450F",bg:"#FFF0EB"},{icon:Truck,lbl:"Track Fleet",c:"#2563EB",bg:"#EFF6FF"},{icon:ReceiptText,lbl:"Invoices",c:"#7C3AED",bg:"#F5F3FF"},{icon:BarChart3,lbl:"Reports",c:"#16A34A",bg:"#F0FDF4"}].map((a)=>(
            <button key={a.lbl} className="flex flex-col items-center gap-2 p-3 bg-white rounded-2xl shadow-sm">
              <div className="w-9 h-9 rounded-xl flex items-center justify-center" style={{ background:a.bg }}><a.icon size={18} style={{ color:a.c }}/></div>
              <p className="text-[9px] font-semibold text-[#111]">{a.lbl}</p>
            </button>
          ))}
        </div>
        {/* Active trips */}
        <div className="bg-white rounded-2xl shadow-sm border border-black/[0.06] overflow-hidden">
          <div className="flex items-center justify-between px-4 py-3 border-b border-[#F5F5F7]">
            <p className="text-sm font-bold text-[#111]">Active Trips</p>
            <span className="text-xs text-[#E8450F] font-semibold">See All</span>
          </div>
          {[{id:"TRP-2387",r:"Riyadh → Jeddah",d:"Ahmed Kareem",s:"In Transit",sc:"#2563EB",sb:"#EFF6FF"},{id:"TRP-2388",r:"Riyadh → Abha",d:"Faisal Baraka",s:"Delayed",sc:"#D97706",sb:"#FFFBEB"}].map((t)=>(
            <div key={t.id} className="flex items-center gap-3 px-4 py-3 border-b border-[#F5F5F7] last:border-0">
              <div className="w-8 h-8 rounded-xl bg-[#F5F5F7] flex items-center justify-center shrink-0"><Truck size={15} className="text-[#6E6E80]"/></div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-1.5"><span className="text-xs font-mono font-bold text-[#E8450F]">{t.id}</span><span className="text-[10px] font-semibold px-1.5 py-0.5 rounded-full" style={{color:t.sc,background:t.sb}}>{t.s}</span></div>
                <p className="text-xs text-[#6E6E80] truncate">{t.r} · {t.d}</p>
              </div>
              <ChevronRight size={14} className="text-[#D8D8DC] shrink-0"/>
            </div>
          ))}
        </div>
        {/* Renewal alert */}
        <div className="bg-[#FFFBEB] rounded-2xl p-4 border border-[#FDE68A] flex items-start gap-3">
          <AlertTriangle size={18} className="text-[#D97706] shrink-0 mt-0.5"/>
          <div className="flex-1"><p className="text-sm font-semibold text-[#D97706]">5 Documents Expiring Soon</p><p className="text-xs text-[rgba(217,119,6,0.7)] mt-0.5">Insurance, Fahas and 3 more require renewal.</p></div>
          <span className="text-xs font-bold text-[#D97706] shrink-0">View</span>
        </div>
      </div>
      <OBNav active="Home"/>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════════════════ */
/* 05 TRIP LIST                                                                 */
/* ═══════════════════════════════════════════════════════════════════════════ */
function TripList() {
  const [tab, setTab] = useState<"All"|"Active"|"Completed">("All");
  const trips = [
    {id:"TRP-2387",r:"Riyadh → Jeddah",d:"Ahmed K.",v:"TRK-2041",s:"In Transit",sc:"#2563EB",sb:"#EFF6FF",dt:"Today"},
    {id:"TRP-2386",r:"Jeddah → Tabouk",d:"Faisal B.",v:"DRA-9973",s:"Completed",sc:"#16A34A",sb:"#F0FDF4",dt:"23 May"},
    {id:"TRP-2385",r:"Riyadh → Dammam",d:"Bader A.",v:"VRA-3358",s:"Delayed",sc:"#D97706",sb:"#FFFBEB",dt:"23 May"},
    {id:"TRP-2384",r:"Medina → Riyadh",d:"Suresh B.",v:"LKA-3812",s:"Completed",sc:"#16A34A",sb:"#F0FDF4",dt:"22 May"},
  ];
  return (
    <div className="flex flex-col h-full bg-[#F5F5F7]">
      <div className="bg-white px-5 pt-11 pb-0 shrink-0">
        <div className="flex items-center justify-between mb-3"><p className="text-lg font-bold text-[#111]">Trips</p><div className="w-9 h-9 rounded-2xl bg-[#F5F5F7] flex items-center justify-center"><Filter size={16} className="text-[#444]"/></div></div>
        <div className="flex items-center gap-2 px-3 py-2.5 rounded-xl bg-[#F5F5F7] mb-3"><Search size={15} className="text-[#9898A4]"/><span className="text-sm text-[#9898A4]">Search Trip, Route, Driver…</span></div>
        <div className="flex gap-0 border-b border-[#EBEBED]">
          {(["All","Active","Completed"] as const).map((t)=>(
            <button key={t} onClick={()=>setTab(t)} className={`flex-1 py-2.5 text-xs font-semibold border-b-2 transition-colors ${tab===t?"border-[#E8450F] text-[#E8450F]":"border-transparent text-[#6E6E80]"}`}>{t}</button>
          ))}
        </div>
      </div>
      <div className="flex-1 overflow-y-auto px-5 py-4 space-y-3">
        {trips.map((t)=>(
          <div key={t.id} className="bg-white rounded-2xl p-4 shadow-sm border border-black/[0.06]">
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-xs font-mono font-bold text-[#E8450F]">{t.id}</span>
              <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full" style={{color:t.sc,background:t.sb}}>{t.s}</span>
            </div>
            <p className="text-sm font-semibold text-[#111] mb-1">{t.r}</p>
            <div className="flex items-center justify-between text-xs text-[#6E6E80]">
              <span>{t.d} · {t.v}</span>
              <span>{t.dt}</span>
            </div>
          </div>
        ))}
      </div>
      {/* FAB */}
      <div className="absolute bottom-24 right-5">
        <div className="w-14 h-14 rounded-full bg-[#E8450F] flex items-center justify-center" style={{ boxShadow:"0 4px 16px rgba(232,69,15,.4)" }}><Plus size={24} className="text-white"/></div>
      </div>
      <OBNav active="Trips"/>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════════════════ */
/* 06 TRIP DETAILS                                                              */
/* ═══════════════════════════════════════════════════════════════════════════ */
function TripDetails() {
  return (
    <div className="flex flex-col h-full bg-[#F5F5F7]">
      <Hdr title="Trip Details" sub="TRP-2387"
        right={<div className="flex gap-2">
          <div className="px-3 py-1.5 rounded-xl bg-[#FFF0EB] flex items-center gap-1"><Edit2 size={13} className="text-[#E8450F]"/><span className="text-xs font-semibold text-[#E8450F]">Edit</span></div>
          <div className="px-3 py-1.5 rounded-xl bg-[#F5F3FF] flex items-center gap-1"><ReceiptText size={13} className="text-[#7C3AED]"/><span className="text-xs font-semibold text-[#7C3AED]">Invoice</span></div>
        </div>}/>
      <div className="flex-1 overflow-y-auto px-5 py-4 space-y-4">
        <div className="bg-[#1C1C2E] rounded-2xl p-4">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-mono font-bold text-[#E8450F]">TRP-2387</span>
            <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-[rgba(37,99,235,0.2)] text-[#60A5FA]">In Transit</span>
          </div>
          <div className="flex items-center gap-3">
            <div className="flex flex-col items-center gap-1"><div className="w-2.5 h-2.5 rounded-full bg-[#E8450F]"/><div className="w-px h-8 bg-[rgba(255,255,255,0.2)]"/><div className="w-2.5 h-2.5 rounded-full bg-[#16A34A]"/></div>
            <div className="flex-1 space-y-3">
              <div><p className="text-[10px] text-[rgba(255,255,255,0.4)]">Pickup</p><p className="text-sm font-semibold text-white">Riyadh Industrial City</p></div>
              <div><p className="text-[10px] text-[rgba(255,255,255,0.4)]">Destination</p><p className="text-sm font-semibold text-white">Jeddah Islamic Port</p></div>
            </div>
          </div>
          <div className="grid grid-cols-3 gap-2 mt-3 pt-3 border-t border-[rgba(255,255,255,0.1)]">
            {[["Delivered On","24 May 2025"],["Driver","Ahmed Kareem"],["Vehicle","TRK-2041"]].map(([k,v])=>(
              <div key={k}><p className="text-[9px] text-[rgba(255,255,255,0.4)]">{k}</p><p className="text-xs font-semibold text-white mt-0.5">{v}</p></div>
            ))}
          </div>
        </div>
        <div className="bg-white rounded-2xl p-4 shadow-sm">
          <p className="text-xs font-bold text-[#9898A4] uppercase tracking-wider mb-3">Cargo</p>
          {[["Type","General Goods"],["Weight","18,500 KG"],["Volume","42 m³"],["Schedule","24 May, 08:00 AM"]].map(([k,v])=>(
            <div key={k} className="flex justify-between text-xs py-2 border-b border-[#F5F5F7] last:border-0"><span className="text-[#6E6E80]">{k}</span><span className="font-semibold text-[#111]">{v}</span></div>
          ))}
        </div>
        <div className="bg-white rounded-2xl p-4 shadow-sm">
          <p className="text-xs font-bold text-[#9898A4] uppercase tracking-wider mb-3">Trip Timeline</p>
          {[{l:"Dispatched",t:"08:15 AM",done:true},{l:"Cargo Picked Up",t:"09:40 AM",done:true},{l:"In Transit",t:"10:00 AM",done:false,active:true},{l:"Arrived",t:"—",done:false},{l:"POD Collected",t:"—",done:false}].map((s,i)=>(
            <div key={i} className="flex gap-3 pb-3 last:pb-0">
              <div className="flex flex-col items-center">
                <div className={`w-5 h-5 rounded-full flex items-center justify-center shrink-0 ${s.done?"bg-[#16A34A]":s.active?"bg-[#E8450F]":"bg-[#EBEBED]"}`}>{s.done&&<Check size={11} className="text-white"/>}{s.active&&<div className="w-2 h-2 rounded-full bg-white"/>}</div>
                {i<4&&<div className={`w-px flex-1 mt-1 ${s.done?"bg-[#16A34A]":"bg-[#EBEBED]"}`} style={{minHeight:16}}/>}
              </div>
              <div className="flex-1 flex items-center justify-between pb-1">
                <p className={`text-xs font-semibold ${s.active?"text-[#E8450F]":s.done?"text-[#111]":"text-[#9898A4]"}`}>{s.l}</p>
                <p className="text-[10px] font-mono text-[#9898A4]">{s.t}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════════════════ */
/* 07 CREATE TRIP                                                               */
/* ═══════════════════════════════════════════════════════════════════════════ */
function CreateTrip() {
  return (
    <div className="flex flex-col h-full bg-[#F5F5F7]">
      <Hdr title="Create Trip"/>
      <div className="flex-1 overflow-y-auto px-5 py-4 space-y-4">
        <div className="bg-white rounded-2xl p-4 shadow-sm space-y-4">
          <p className="text-xs font-bold text-[#9898A4] uppercase tracking-wider">Customer</p>
          <div className="flex items-center gap-2.5 px-4 py-3 rounded-2xl bg-[#F5F5F7] justify-between">
            <div className="flex items-center gap-2"><Building2 size={15} className="text-[#6E6E80]"/><span className="text-sm text-[#9898A4]">Select customer</span></div>
            <ChevronDown size={14} className="text-[#9898A4]"/>
          </div>
        </div>
        <div className="bg-white rounded-2xl p-4 shadow-sm space-y-4">
          <p className="text-xs font-bold text-[#9898A4] uppercase tracking-wider">Route</p>
          <div>
            <p className="text-xs font-semibold text-[#111] mb-1.5">Pickup Location</p>
            <div className="flex items-center gap-2.5 px-4 py-3 rounded-2xl bg-[#F5F5F7] ring-2 ring-[rgba(232,69,15,0.3)]">
              <MapPin size={15} className="text-[#E8450F]"/><span className="text-sm text-[#111]">Riyadh Industrial City, Gate 3</span>
            </div>
          </div>
          <div>
            <p className="text-xs font-semibold text-[#111] mb-1.5">Destination</p>
            <div className="flex items-center gap-2.5 px-4 py-3 rounded-2xl bg-[#F5F5F7]">
              <MapPin size={15} className="text-[#6E6E80]"/><span className="text-sm text-[#9898A4]">Enter destination…</span>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <p className="text-xs font-semibold text-[#111] mb-1.5">Pickup Date</p>
              <div className="flex items-center gap-2 px-3 py-3 rounded-2xl bg-[#F5F5F7]"><Calendar size={14} className="text-[#9898A4]"/><span className="text-xs text-[#9898A4]">24 May 2025</span></div>
            </div>
            <div>
              <p className="text-xs font-semibold text-[#111] mb-1.5">Time</p>
              <div className="flex items-center gap-2 px-3 py-3 rounded-2xl bg-[#F5F5F7]"><Clock size={14} className="text-[#9898A4]"/><span className="text-xs text-[#9898A4]">08:00 AM</span></div>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-2xl p-4 shadow-sm space-y-4">
          <p className="text-xs font-bold text-[#9898A4] uppercase tracking-wider">Cargo & Assignment</p>
          {[{l:"Cargo Type",v:"General Goods"},{l:"Weight (KG)",v:"18,500"}].map((f)=>(
            <div key={f.l}><p className="text-xs font-semibold text-[#111] mb-1.5">{f.l}</p><div className="px-4 py-3 rounded-2xl bg-[#F5F5F7]"><span className="text-sm text-[#111]">{f.v}</span></div></div>
          ))}
          {[{icon:Truck,l:"Truck",v:"TRK-2041 · Hino 500"},{icon:User,l:"Driver",v:"Ahmed Kareem"}].map((f)=>(
            <div key={f.l}><p className="text-xs font-semibold text-[#111] mb-1.5">{f.l}</p>
            <div className="flex items-center gap-2.5 px-4 py-3 rounded-2xl bg-[#F5F5F7] justify-between"><div className="flex items-center gap-2"><f.icon size={15} className="text-[#6E6E80]"/><span className="text-sm text-[#111]">{f.v}</span></div><ChevronDown size={14} className="text-[#9898A4]"/></div></div>
          ))}
        </div>
      </div>
      <div className="shrink-0 bg-white border-t border-black/[0.06] px-5 py-4 flex gap-3">
        <div className="flex-1 py-3 rounded-2xl bg-[#F0F0F2] flex items-center justify-center"><p className="text-sm font-semibold text-[#444]">Cancel</p></div>
        <div className="flex-1 py-3 rounded-2xl bg-[#E8450F] flex items-center justify-center"><p className="text-sm font-bold text-white">Create Trip</p></div>
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════════════════ */
/* 08 TRIP LIVE TRACKING                                                        */
/* ═══════════════════════════════════════════════════════════════════════════ */
function TripTracking() {
  return (
    <div className="flex flex-col h-full relative overflow-hidden">
      <div className="absolute inset-0" style={{ background:"linear-gradient(170deg,#d8e8d8 0%,#c5d9c5 50%,#b8d0b8 100%)" }}>
        <svg className="absolute inset-0 w-full h-full opacity-20"><line x1="0" y1="30%" x2="100%" y2="30%" stroke="#666" strokeWidth="0.5"/><line x1="0" y1="60%" x2="100%" y2="60%" stroke="#666" strokeWidth="0.5"/><line x1="30%" y1="0" x2="30%" y2="100%" stroke="#666" strokeWidth="0.5"/><line x1="70%" y1="0" x2="70%" y2="100%" stroke="#666" strokeWidth="0.5"/></svg>
        <svg className="absolute inset-0 w-full h-full"><path d="M 80 750 C 150 600 200 450 250 350 S 310 200 375 120" stroke="white" strokeWidth="5" fill="none" strokeLinecap="round"/><path d="M 80 750 C 150 600 200 450 250 350 S 310 200 375 120" stroke="#E8450F" strokeWidth="3" fill="none" strokeLinecap="round" strokeDasharray="10 5"/></svg>
        <div className="absolute flex flex-col items-center" style={{left:62,bottom:180}}><div className="w-8 h-8 rounded-full bg-[#E8450F] border-2 border-white flex items-center justify-center shadow-lg"><MapPin size={14} className="text-white"/></div></div>
        <div className="absolute" style={{left:230,top:320}}><div className="w-10 h-10 rounded-full bg-[#1C1C2E] border-2 border-white shadow-xl flex items-center justify-center"><Truck size={16} className="text-white"/></div><div className="absolute inset-0 rounded-full border-2 border-[#E8450F] animate-ping opacity-30"/></div>
        <div className="absolute flex flex-col items-center" style={{right:30,top:100}}><div className="w-8 h-8 rounded-full bg-[#16A34A] border-2 border-white flex items-center justify-center shadow-lg"><MapPin size={14} className="text-white"/></div></div>
      </div>
      <div className="relative z-10 pt-11 px-4 flex items-center gap-2">
        <div className="w-9 h-9 rounded-xl bg-white shadow-md flex items-center justify-center"><ChevronLeft size={18} className="text-[#444]"/></div>
        <div className="flex-1 flex items-center gap-2 px-3 py-2 bg-white rounded-xl shadow-md"><Navigation2 size={14} className="text-[#E8450F]"/><span className="text-xs font-semibold text-[#111]">TRP-2387 · Live Tracking</span></div>
        <div className="flex items-center gap-1 px-2.5 py-2 bg-white rounded-xl shadow-md"><span className="w-1.5 h-1.5 rounded-full bg-[#16A34A] animate-pulse"/><span className="text-[10px] font-bold text-[#16A34A]">Live</span></div>
      </div>
      <div className="absolute left-4 right-4 z-10" style={{top:100}}>
        <div className="flex gap-2">
          {[{icon:Gauge,l:"Speed",v:"92 km/h",c:"#2563EB"},{icon:Clock,l:"ETA",v:"6h 12m",c:"#E8450F"},{icon:Route,l:"Remain",v:"482 km",c:"#16A34A"}].map((w)=>(
            <div key={w.l} className="flex items-center gap-2 px-2.5 py-2 rounded-xl bg-white shadow-md flex-1">
              <w.icon size={14} style={{color:w.c}}/>
              <div><p className="text-[8px] text-[#6E6E80]">{w.l}</p><p className="text-[10px] font-bold text-[#111]">{w.v}</p></div>
            </div>
          ))}
        </div>
      </div>
      <div className="absolute bottom-0 left-0 right-0 z-10 bg-white rounded-t-3xl px-5 pt-4 pb-4 shadow-2xl">
        <div className="w-10 h-1 rounded-full bg-[#D8D8DC] mx-auto mb-3"/>
        <div className="flex items-center gap-3 mb-3">
          <div className="w-10 h-10 rounded-xl bg-[#1C1C2E] flex items-center justify-center shrink-0"><Truck size={18} className="text-white"/></div>
          <div className="flex-1"><p className="text-sm font-bold text-[#111]">TRK-2041 · Ahmed Kareem</p><p className="text-xs text-[#6E6E80]">King Fahd Rd · Last ping 12s ago</p></div>
          <div className="flex gap-2">
            <div className="w-9 h-9 rounded-xl bg-[#F0FDF4] flex items-center justify-center"><Phone size={15} className="text-[#16A34A]"/></div>
          </div>
        </div>
        <div className="h-1.5 rounded-full bg-[#EBEBED] overflow-hidden mb-1">
          <div className="h-full w-1/2 rounded-full bg-gradient-to-r from-[#E8450F] to-[#D97706]"/>
        </div>
        <p className="text-[10px] text-[#6E6E80] text-center">492 km covered · 50.5% complete</p>
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════════════════ */
/* 09 TRIP CREATED SUCCESS                                                      */
/* ═══════════════════════════════════════════════════════════════════════════ */
function TripSuccess() {
  return (
    <div className="flex flex-col h-full bg-white">
      <SBar/>
      <div className="flex-1 flex flex-col items-center justify-center px-6 text-center pb-6">
        <div className="relative mb-6">
          <div className="w-24 h-24 rounded-full bg-[#F0FDF4] flex items-center justify-center">
            <CheckCircle2 size={48} className="text-[#16A34A]"/>
          </div>
          <div className="absolute inset-0 rounded-full border-4 border-[rgba(22,163,74,0.2)] animate-ping"/>
        </div>
        <p className="text-2xl font-bold text-[#111] mb-1">Trip Created</p>
        <p className="text-xl font-bold text-[#16A34A] mb-2">Successfully!</p>
        <p className="text-sm text-[#6E6E80] mb-8">Your trip has been created and is ready to be executed.</p>
        <div className="w-full bg-[#F5F5F7] rounded-2xl p-4 mb-6 text-left space-y-2">
          {[["Trip ID","TRP-2387",true],["Route","Riyadh → Jeddah",false],["Cargo","General Goods · 18,500 KG",false],["Vehicle","TRK-2041 · Ahmed Kareem",false],["Estimated","24 May 2025, 08:00 PM",false]].map(([k,v,mono])=>(
            <div key={k as string} className="flex justify-between text-xs">
              <span className="text-[#6E6E80]">{k}</span>
              <span className={`font-semibold ${mono?"font-mono text-[#E8450F]":"text-[#111]"}`}>{v}</span>
            </div>
          ))}
        </div>
        <div className="w-full p-3 rounded-2xl bg-[#F0FDF4] border border-[#BBF7D0] flex items-center gap-2 mb-6">
          <CheckCircle2 size={15} className="text-[#16A34A] shrink-0"/>
          <p className="text-xs font-medium text-[#16A34A]">Trip confirmed. Driver will be notified automatically.</p>
        </div>
        <div className="w-full flex gap-3">
          <div className="flex-1 py-3.5 rounded-2xl bg-[#F0F0F2] flex items-center justify-center"><p className="text-sm font-semibold text-[#444]">Go Home</p></div>
          <div className="flex-1 py-3.5 rounded-2xl bg-[#E8450F] flex items-center justify-center gap-2"><FileText size={15} className="text-white"/><p className="text-sm font-bold text-white">View Trip</p></div>
        </div>
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════════════════ */
/* 10 ASSIGN DRIVER (Bottom Sheet)                                              */
/* ═══════════════════════════════════════════════════════════════════════════ */
function AssignDriverSheet() {
  const [sel, setSel] = useState<string|null>("AK");
  const drivers = [{id:"AK",name:"Ahmed Kareem",v:"TRK-2041",r:"4.7",s:"Available",c:"#E8450F"},{id:"FK",name:"Faisal Baraka",v:"DRA-9973",r:"4.5",s:"Available",c:"#2563EB"},{id:"SB",name:"Suresh Babu",v:"VRA-3358",r:"4.8",s:"On Trip",c:"#7C3AED"}];
  return (
    <div className="flex flex-col h-full relative overflow-hidden">
      <div className="absolute inset-0 bg-[rgba(28,28,46,0.3)] backdrop-blur-sm"/>
      <div className="absolute bottom-0 left-0 right-0 bg-white rounded-t-3xl shadow-2xl z-10">
        <div className="w-10 h-1 rounded-full bg-[#D8D8DC] mx-auto mt-3 mb-4"/>
        <div className="px-5 pb-2 flex items-center justify-between">
          <div><p className="text-base font-bold text-[#111]">Assign Driver</p><p className="text-xs text-[#6E6E80]">TRP-2387 · Riyadh → Jeddah</p></div>
          <X size={20} className="text-[#9898A4]"/>
        </div>
        <div className="px-5 pb-3">
          <div className="flex items-center gap-2 px-3 py-2.5 rounded-xl bg-[#F5F5F7]"><Search size={14} className="text-[#9898A4]"/><span className="text-sm text-[#9898A4]">Search drivers…</span></div>
        </div>
        <div className="px-5 space-y-2 pb-2 max-h-72 overflow-y-auto">
          {drivers.map((d)=>(
            <button key={d.id} onClick={()=>d.s==="Available"&&setSel(d.id)}
              className={`w-full flex items-center gap-3 p-3 rounded-2xl border-2 text-left transition-all ${d.s==="On Trip"?"opacity-50 cursor-not-allowed border-transparent bg-[#F5F5F7]":sel===d.id?"border-[#E8450F] bg-[#FFF0EB]":"border-[#EBEBED] bg-white"}`}>
              <div className="w-10 h-10 rounded-full flex items-center justify-center text-white font-bold text-sm shrink-0" style={{background:d.c}}>{d.id}</div>
              <div className="flex-1 min-w-0"><p className="text-sm font-semibold text-[#111]">{d.name}</p><p className="text-xs text-[#6E6E80]">{d.v} · ★ {d.r}</p></div>
              <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${d.s==="Available"?"bg-[#F0FDF4] text-[#16A34A]":"bg-[#F5F5F7] text-[#6E6E80]"}`}>{d.s}</span>
              {sel===d.id&&<Check size={16} className="text-[#E8450F] shrink-0"/>}
            </button>
          ))}
        </div>
        <div className="px-5 py-4 border-t border-[#F0F0F2] flex gap-3">
          <div className="flex-1 py-3 rounded-2xl bg-[#F0F0F2] flex items-center justify-center"><p className="text-sm font-semibold text-[#444]">Cancel</p></div>
          <div className={`flex-1 py-3 rounded-2xl flex items-center justify-center ${sel?"bg-[#E8450F]":"bg-[#EBEBED]"}`}><p className={`text-sm font-bold ${sel?"text-white":"text-[#9898A4]"}`}>Assign Driver</p></div>
        </div>
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════════════════ */
/* 11 DRIVERS LIST                                                              */
/* ═══════════════════════════════════════════════════════════════════════════ */
function DriversList() {
  const drvs = [{id:"AK",name:"Ahmed Kareem",trips:"1,248",r:"4.7",s:"Available",sc:"#16A34A",sb:"#F0FDF4",c:"#E8450F"},{id:"FK",name:"Faisal Baraka",trips:"892",r:"4.5",s:"On Trip",sc:"#2563EB",sb:"#EFF6FF",c:"#2563EB"},{id:"SB",name:"Suresh Babu",trips:"1,102",r:"4.8",s:"Available",sc:"#16A34A",sb:"#F0FDF4",c:"#7C3AED"},{id:"MH",name:"Mohammed H.",trips:"643",r:"4.3",s:"Off Duty",sc:"#6E6E80",sb:"#F5F5F7",c:"#16A34A"}];
  return (
    <div className="flex flex-col h-full bg-[#F5F5F7]">
      <div className="bg-white px-5 pt-11 pb-3 shrink-0">
        <div className="flex items-center justify-between mb-3"><p className="text-lg font-bold text-[#111]">Drivers</p><div className="w-9 h-9 rounded-2xl bg-[#F5F5F7] flex items-center justify-center"><Filter size={16} className="text-[#444]"/></div></div>
        <div className="flex items-center gap-2 px-3 py-2.5 rounded-xl bg-[#F5F5F7]"><Search size={15} className="text-[#9898A4]"/><span className="text-sm text-[#9898A4]">Search drivers…</span></div>
      </div>
      <div className="flex-1 overflow-y-auto px-5 py-4 space-y-3">
        {drvs.map((d)=>(
          <div key={d.id} className="bg-white rounded-2xl p-4 shadow-sm border border-black/[0.06]">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-full flex items-center justify-center text-white font-bold shrink-0" style={{background:d.c}}>{d.id}</div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-0.5"><p className="text-sm font-bold text-[#111]">{d.name}</p><span className="text-[10px] font-semibold px-1.5 py-0.5 rounded-full" style={{color:d.sc,background:d.sb}}>{d.s}</span></div>
                <p className="text-xs text-[#6E6E80]">{d.trips} trips · ★ {d.r}</p>
              </div>
              <div className="flex gap-1.5 shrink-0">
                <div className="w-8 h-8 rounded-xl bg-[#FFF0EB] flex items-center justify-center"><Edit2 size={14} className="text-[#E8450F]"/></div>
                <div className="w-8 h-8 rounded-xl bg-[#F5F5F7] flex items-center justify-center"><ChevronRight size={14} className="text-[#9898A4]"/></div>
              </div>
            </div>
          </div>
        ))}
      </div>
      <div className="absolute bottom-24 right-5">
        <div className="w-14 h-14 rounded-full bg-[#E8450F] flex items-center justify-center" style={{boxShadow:"0 4px 16px rgba(232,69,15,.4)"}}><Plus size={24} className="text-white"/></div>
      </div>
      <OBNav active="Drivers"/>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════════════════ */
/* 12 DRIVER DETAILS                                                            */
/* ═══════════════════════════════════════════════════════════════════════════ */
function DriverDetails() {
  return (
    <div className="flex flex-col h-full bg-[#F5F5F7]">
      <Hdr title="Driver Details" right={<div className="flex gap-2"><div className="w-9 h-9 rounded-2xl bg-[#FFF0EB] flex items-center justify-center"><Edit2 size={16} className="text-[#E8450F]"/></div></div>}/>
      <div className="flex-1 overflow-y-auto px-5 py-4 space-y-4">
        <div className="bg-white rounded-2xl p-5 shadow-sm flex items-center gap-4">
          <div className="w-16 h-16 rounded-full bg-[#E8450F] flex items-center justify-center text-white text-2xl font-bold shrink-0">AK</div>
          <div className="flex-1">
            <p className="text-lg font-bold text-[#111]">Ahmed Kareem</p>
            <p className="text-xs text-[#6E6E80]">DRV-0041</p>
            <div className="flex items-center gap-2 mt-1.5">
              <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-[#F0FDF4] text-[#16A34A]">Available</span>
              <span className="flex items-center gap-1 text-xs text-[#D97706]"><Star size={11} className="fill-[#D97706]"/>4.7</span>
            </div>
          </div>
        </div>
        <div className="grid grid-cols-3 gap-3">
          {[["1,248","Total Trips","#E8450F"],["94%","On-Time","#16A34A"],["248K","Total km","#2563EB"]].map(([v,l,c])=>(
            <div key={l as string} className="bg-white rounded-2xl p-3 text-center shadow-sm">
              <p className="text-base font-bold" style={{color:c as string}}>{v}</p><p className="text-[9px] text-[#6E6E80] mt-0.5">{l}</p>
            </div>
          ))}
        </div>
        <div className="bg-white rounded-2xl p-4 shadow-sm">
          <p className="text-xs font-bold text-[#9898A4] uppercase tracking-wider mb-3">Information</p>
          {[["Phone","+966 50 123 4567"],["Email","ahmed.kareem@mercon.sa"],["License","SA-DL-2019-00441"],["License Exp","12 Aug 2027"],["ID/Iqama","1012345678"],["Assigned Vehicle","TRK-2041 · Hino 500"]].map(([k,v])=>(
            <div key={k} className="flex justify-between text-xs py-2 border-b border-[#F5F5F7] last:border-0"><span className="text-[#6E6E80]">{k}</span><span className="font-semibold text-[#111]">{v}</span></div>
          ))}
        </div>
        <div className="bg-white rounded-2xl p-4 shadow-sm">
          <p className="text-xs font-bold text-[#9898A4] uppercase tracking-wider mb-3">Documents</p>
          {[["Driving License","Active","12 Aug 2027"],["Iqama","Expiring","03 Jul 2025"],["Medical Cert","Active","01 Sep 2025"]].map(([n,s,e])=>(
            <div key={n as string} className="flex items-center gap-3 py-2 border-b border-[#F5F5F7] last:border-0">
              <FileText size={15} className="text-[#6E6E80] shrink-0"/>
              <div className="flex-1"><p className="text-xs font-semibold text-[#111]">{n}</p><p className="text-[10px] text-[#9898A4]">Exp: {e}</p></div>
              <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${s==="Active"?"bg-[#F0FDF4] text-[#16A34A]":"bg-[#FFFBEB] text-[#D97706]"}`}>{s}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════════════════ */
/* 13 VEHICLE LIST                                                              */
/* ═══════════════════════════════════════════════════════════════════════════ */
function VehicleList() {
  const vehs = [{id:"TRK-2041",m:"Hino 500",cap:"10 TON",s:"Available",sc:"#16A34A",sb:"#F0FDF4",d:"Ahmed K."},{id:"DRA-9973",m:"Mercedes",cap:"20 TON",s:"On Trip",sc:"#2563EB",sb:"#EFF6FF",d:"Faisal B."},{id:"VRA-3358",m:"Volvo",cap:"10 TON",s:"Available",sc:"#16A34A",sb:"#F0FDF4",d:"Suresh B."},{id:"LKA-3812",m:"Isuzu",cap:"5 TON",s:"Maintenance",sc:"#D97706",sb:"#FFFBEB",d:"—"}];
  return (
    <div className="flex flex-col h-full bg-[#F5F5F7]">
      <div className="bg-white px-5 pt-11 pb-3 shrink-0">
        <div className="flex items-center justify-between mb-3"><p className="text-lg font-bold text-[#111]">Vehicles</p><div className="w-9 h-9 rounded-2xl bg-[#F5F5F7] flex items-center justify-center"><Filter size={16} className="text-[#444]"/></div></div>
        <div className="flex items-center gap-2 px-3 py-2.5 rounded-xl bg-[#F5F5F7]"><Search size={15} className="text-[#9898A4]"/><span className="text-sm text-[#9898A4]">Search vehicles…</span></div>
      </div>
      <div className="flex-1 overflow-y-auto px-5 py-4 space-y-3">
        {vehs.map((v)=>(
          <div key={v.id} className="bg-white rounded-2xl p-4 shadow-sm border border-black/[0.06]">
            <div className="flex items-center gap-3">
              <div className="w-11 h-11 rounded-xl bg-[#F5F5F7] flex items-center justify-center shrink-0"><Truck size={20} className="text-[#6E6E80]"/></div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-0.5"><p className="text-sm font-bold text-[#111] font-mono">{v.id}</p><span className="text-[10px] font-semibold px-1.5 py-0.5 rounded-full" style={{color:v.sc,background:v.sb}}>{v.s}</span></div>
                <p className="text-xs text-[#6E6E80]">{v.m} · {v.cap} · {v.d}</p>
              </div>
              <div className="flex gap-1.5 shrink-0">
                <div className="w-8 h-8 rounded-xl bg-[#FFF0EB] flex items-center justify-center"><Edit2 size={14} className="text-[#E8450F]"/></div>
                <div className="w-8 h-8 rounded-xl bg-[#F5F5F7] flex items-center justify-center"><ChevronRight size={14} className="text-[#9898A4]"/></div>
              </div>
            </div>
          </div>
        ))}
      </div>
      <div className="absolute bottom-24 right-5">
        <div className="w-14 h-14 rounded-full bg-[#E8450F] flex items-center justify-center" style={{boxShadow:"0 4px 16px rgba(232,69,15,.4)"}}><Plus size={24} className="text-white"/></div>
      </div>
      <OBNav active="More"/>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════════════════ */
/* 14 VEHICLE DETAILS                                                           */
/* ═══════════════════════════════════════════════════════════════════════════ */
function VehicleDetails() {
  return (
    <div className="flex flex-col h-full bg-[#F5F5F7]">
      <div className="bg-[#1C1C2E] px-5 pt-11 pb-5 shrink-0">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-9 h-9 rounded-2xl bg-[rgba(255,255,255,0.1)] flex items-center justify-center"><ChevronLeft size={20} className="text-white"/></div>
          <p className="text-base font-bold text-white flex-1">Vehicle Details</p>
          <div className="px-3 py-1.5 rounded-xl bg-[rgba(255,255,255,0.1)] flex items-center gap-1"><Edit2 size={13} className="text-white"/><span className="text-xs font-semibold text-white">Edit</span></div>
        </div>
        <div className="flex items-center justify-between">
          <div><p className="text-2xl font-bold text-white">TRK-2041</p><p className="text-sm text-[rgba(255,255,255,0.5)]">Hino 500 · 10 TON · 2024</p></div>
          <div className="text-right"><span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-[rgba(22,163,74,0.2)] text-[#4ADE80]">Available</span><p className="text-[10px] text-[rgba(255,255,255,0.4)] mt-1">5/6 valid docs</p></div>
        </div>
      </div>
      <div className="flex-1 overflow-y-auto px-5 py-4 space-y-4">
        <div className="bg-white rounded-2xl p-4 shadow-sm">
          <div className="flex items-center gap-3 mb-3 pb-3 border-b border-[#F5F5F7]">
            <div className="w-12 h-12 rounded-full bg-[#E8450F] flex items-center justify-center text-white font-bold">AK</div>
            <div><p className="text-sm font-bold text-[#111]">Ahmed Kareem</p><p className="text-xs text-[#6E6E80]">DRV-0041 · ★ 4.7</p></div>
            <div className="ml-auto w-9 h-9 rounded-xl bg-[#F0F0F2] flex items-center justify-center"><Eye size={16} className="text-[#6E6E80]"/></div>
          </div>
          {[["Plate","ABC-1234"],["Model","Hino 500 · 2024"],["Capacity","10 TON · Diesel"],["Trips Completed","1,248"],["Total Distance","248,320 km"]].map(([k,v])=>(
            <div key={k} className="flex justify-between text-xs py-2 border-b border-[#F5F5F7] last:border-0"><span className="text-[#6E6E80]">{k}</span><span className="font-semibold text-[#111]">{v}</span></div>
          ))}
        </div>
        <div className="bg-white rounded-2xl p-4 shadow-sm">
          <div className="flex items-center justify-between mb-3">
            <p className="text-xs font-bold text-[#9898A4] uppercase tracking-wider">Document Status</p>
            <span className="text-xs text-[#E8450F] font-semibold">View All</span>
          </div>
          {[["Insurance","Active","Jul 2026","#16A34A","#F0FDF4"],["Fahas","Active","May 2026","#16A34A","#F0FDF4"],["Istimara","Expiring","Aug 2025","#D97706","#FFFBEB"],["SASO","Active","Dec 2025","#16A34A","#F0FDF4"]].map(([n,s,e,c,b])=>(
            <div key={n as string} className="flex items-center gap-3 py-2 border-b border-[#F5F5F7] last:border-0">
              <Shield size={14} className="text-[#6E6E80] shrink-0"/>
              <div className="flex-1"><p className="text-xs font-semibold text-[#111]">{n}</p><p className="text-[10px] text-[#9898A4]">Exp: {e}</p></div>
              <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full" style={{color:c as string,background:b as string}}>{s}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════════════════ */
/* 15 VEHICLE RENEWAL CENTER                                                    */
/* ═══════════════════════════════════════════════════════════════════════════ */
function VehicleRenewal() {
  const [filter, setFilter] = useState<"All"|"Critical"|"Overdue"|"Renewed">("All");
  return (
    <div className="flex flex-col h-full bg-[#F5F5F7]">
      <Hdr title="Renewal Center" sub="Monitor document expirations" right={<div className="w-9 h-9 rounded-2xl bg-[#F5F5F7] flex items-center justify-center"><Filter size={16} className="text-[#444]"/></div>}/>
      <div className="flex-1 overflow-y-auto px-5 py-4 space-y-4">
        <div className="grid grid-cols-4 gap-2">
          {[["14","Due",null,"#FFF0EB","#E8450F"],["5","Critical","1 Day","#FEF2F2","#DC2626"],["2","Overdue",null,"#FEF2F2","#DC2626"],["28","Renewed",null,"#F0FDF4","#16A34A"]].map(([v,l,s,bg,c])=>(
            <div key={l as string} className="rounded-2xl p-2.5 text-center" style={{background:bg as string}}>
              {s&&<p className="text-[8px] font-bold uppercase mb-0.5" style={{color:c as string}}>{s}</p>}
              <p className="text-xl font-bold" style={{color:c as string}}>{v}</p>
              <p className="text-[9px] font-medium mt-0.5" style={{color:c as string}}>{l}</p>
            </div>
          ))}
        </div>
        <div className="flex gap-1 p-1 bg-white rounded-2xl shadow-sm">
          {(["All","Critical","Overdue","Renewed"] as const).map((t)=>(
            <button key={t} onClick={()=>setFilter(t)} className={`flex-1 py-2 rounded-xl text-[10px] font-semibold transition-colors ${filter===t?"bg-[#1A1A1A] text-white":"text-[#6E6E80]"}`}>{t}</button>
          ))}
        </div>
        {[{v:"TRK-2041",d:"Ahmed K.",doc:"Insurance",exp:"Expires in 3 days",s:"Critical",sc:"#DC2626",sb:"#FEF2F2"},{v:"DRA-9973",d:"Fahad H.",doc:"Fahas",exp:"Due 12 Jul 2026",s:"Due Soon",sc:"#D97706",sb:"#FFFBEB"},{v:"VRA-3358",d:"Danimam",doc:"Istimara",exp:"Expired 5 days ago",s:"Overdue",sc:"#DC2626",sb:"#FEF2F2"},{v:"LKA-3812",d:"Suresh B.",doc:"Misan Card",exp:"In 30 days",s:"Due Soon",sc:"#D97706",sb:"#FFFBEB"}].map((r,i)=>(
          <div key={i} className="bg-white rounded-2xl p-4 shadow-sm border border-black/[0.06] flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-[#F5F5F7] flex items-center justify-center shrink-0"><Truck size={18} className="text-[#6E6E80]"/></div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-1.5 mb-0.5"><p className="text-sm font-bold font-mono text-[#111]">{r.v}</p><span className="text-[10px] font-semibold px-1.5 py-0.5 rounded-full" style={{color:r.sc,background:r.sb}}>{r.s}</span></div>
              <p className="text-xs text-[#6E6E80]">{r.doc} · {r.d}</p>
              <p className="text-[10px] text-[#9898A4] mt-0.5">{r.exp}</p>
            </div>
            <button className="px-3 py-1.5 rounded-xl text-xs font-semibold shrink-0" style={{color:r.sc,background:r.sb}}>Renew</button>
          </div>
        ))}
        <div className="bg-[#FFF0EB] rounded-2xl p-4 border border-[rgba(232,69,15,0.2)] flex items-center justify-between">
          <div className="flex items-center gap-2"><Bell size={18} className="text-[#E8450F]"/><div><p className="text-sm font-semibold text-[#E8450F]">Enable Renewal Alerts</p><p className="text-[10px] text-[rgba(232,69,15,0.7)]">Get notified 30 days before expiry</p></div></div>
          <div className="px-3 py-1.5 rounded-xl bg-[#E8450F] text-white text-xs font-bold shrink-0">Enable</div>
        </div>
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════════════════ */
/* 16 CUSTOMER LIST                                                             */
/* ═══════════════════════════════════════════════════════════════════════════ */
function CustomerList() {
  const custs = [{id:"FAH",name:"Fahad Trading Co.",trips:86,rev:"SAR 142K",s:"VIP",sc:"#E8450F",sb:"#FFF0EB"},{id:"ALR",name:"Al-Rashid Group",trips:54,rev:"SAR 89K",s:"Active",sc:"#16A34A",sb:"#F0FDF4"},{id:"SAP",name:"Saudi Polymers",trips:38,rev:"SAR 61K",s:"Active",sc:"#16A34A",sb:"#F0FDF4"},{id:"SAB",name:"SABIC Trading",trips:22,rev:"SAR 34K",s:"New",sc:"#2563EB",sb:"#EFF6FF"}];
  return (
    <div className="flex flex-col h-full bg-[#F5F5F7]">
      <div className="bg-white px-5 pt-11 pb-3 shrink-0">
        <div className="flex items-center justify-between mb-3"><p className="text-lg font-bold text-[#111]">Customers</p><div className="w-9 h-9 rounded-2xl bg-[#F5F5F7] flex items-center justify-center"><Filter size={16} className="text-[#444]"/></div></div>
        <div className="flex items-center gap-2 px-3 py-2.5 rounded-xl bg-[#F5F5F7]"><Search size={15} className="text-[#9898A4]"/><span className="text-sm text-[#9898A4]">Search customers…</span></div>
      </div>
      <div className="flex-1 overflow-y-auto px-5 py-4 space-y-3">
        {custs.map((c)=>(
          <div key={c.id} className="bg-white rounded-2xl p-4 shadow-sm border border-black/[0.06] flex items-center gap-3">
            <div className="w-11 h-11 rounded-2xl bg-[#F5F5F7] flex items-center justify-center text-sm font-bold text-[#6E6E80] shrink-0">{c.id}</div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-0.5"><p className="text-sm font-bold text-[#111] truncate">{c.name}</p><span className="text-[10px] font-semibold px-1.5 py-0.5 rounded-full shrink-0" style={{color:c.sc,background:c.sb}}>{c.s}</span></div>
              <p className="text-xs text-[#6E6E80]">{c.trips} trips · {c.rev}</p>
            </div>
            <div className="flex gap-1.5 shrink-0">
              <div className="w-8 h-8 rounded-xl bg-[#FFF0EB] flex items-center justify-center"><Edit2 size={14} className="text-[#E8450F]"/></div>
              <div className="w-8 h-8 rounded-xl bg-[#F5F5F7] flex items-center justify-center"><ChevronRight size={14} className="text-[#9898A4]"/></div>
            </div>
          </div>
        ))}
      </div>
      <div className="absolute bottom-24 right-5">
        <div className="w-14 h-14 rounded-full bg-[#E8450F] flex items-center justify-center" style={{boxShadow:"0 4px 16px rgba(232,69,15,.4)"}}><Plus size={24} className="text-white"/></div>
      </div>
      <OBNav active="More"/>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════════════════ */
/* 17 CUSTOMER DETAILS                                                          */
/* ═══════════════════════════════════════════════════════════════════════════ */
function CustomerDetails() {
  return (
    <div className="flex flex-col h-full bg-[#F5F5F7]">
      <Hdr title="Customer Details" right={<div className="flex gap-2"><div className="w-9 h-9 rounded-2xl bg-[#FFF0EB] flex items-center justify-center"><Edit2 size={16} className="text-[#E8450F]"/></div></div>}/>
      <div className="flex-1 overflow-y-auto px-5 py-4 space-y-4">
        <div className="bg-white rounded-2xl p-5 shadow-sm flex items-center gap-4">
          <div className="w-16 h-16 rounded-2xl bg-[#F5F5F7] flex items-center justify-center text-lg font-bold text-[#6E6E80] shrink-0">FAH</div>
          <div className="flex-1">
            <p className="text-lg font-bold text-[#111]">Fahad Trading Co.</p>
            <p className="text-xs text-[#6E6E80]">CST-0001 · Riyadh, KSA</p>
            <span className="mt-1 inline-block text-xs font-semibold px-2 py-0.5 rounded-full bg-[#FFF0EB] text-[#E8450F]">VIP</span>
          </div>
        </div>
        <div className="grid grid-cols-3 gap-3">
          {[["86","Total Trips","#E8450F"],["SAR 142K","Revenue","#16A34A"],["Net 30","Payment","#2563EB"]].map(([v,l,c])=>(
            <div key={l as string} className="bg-white rounded-2xl p-3 text-center shadow-sm">
              <p className="text-sm font-bold" style={{color:c as string}}>{v}</p><p className="text-[9px] text-[#6E6E80] mt-0.5">{l}</p>
            </div>
          ))}
        </div>
        <div className="bg-white rounded-2xl p-4 shadow-sm">
          <p className="text-xs font-bold text-[#9898A4] uppercase tracking-wider mb-3">Contact</p>
          {[["Contact","Fahad Al Harbi"],["Phone","+966 55 123 4567"],["Email","fahad@trading.sa"],["Address","King Abdullah Rd, Riyadh"],["Billing","Same as business"]].map(([k,v])=>(
            <div key={k} className="flex justify-between text-xs py-2 border-b border-[#F5F5F7] last:border-0"><span className="text-[#6E6E80]">{k}</span><span className="font-semibold text-[#111]">{v}</span></div>
          ))}
        </div>
        <div className="flex gap-3">
          <div className="flex-1 py-3 rounded-2xl bg-[#F0F0F2] flex items-center justify-center gap-2"><Phone size={15} className="text-[#444]"/><p className="text-sm font-semibold text-[#444]">Call</p></div>
          <div className="flex-1 py-3 rounded-2xl bg-[#E8450F] flex items-center justify-center gap-2"><Plus size={15} className="text-white"/><p className="text-sm font-bold text-white">New Trip</p></div>
        </div>
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════════════════ */
/* 18 TRIP REPORTS                                                              */
/* ═══════════════════════════════════════════════════════════════════════════ */
function TripReports() {
  return (
    <div className="flex flex-col h-full bg-[#F5F5F7]">
      <div className="bg-white px-5 pt-11 pb-3 shrink-0 flex items-center justify-between">
        <div><p className="text-lg font-bold text-[#111]">Trip Reports</p><p className="text-xs text-[#6E6E80]">Detailed trips and their status</p></div>
        <div className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-[#F5F5F7] text-xs font-semibold text-[#444]"><Calendar size={13}/> This Month</div>
      </div>
      <div className="flex-1 overflow-y-auto px-5 py-4 space-y-4">
        <div className="grid grid-cols-5 gap-1.5">
          {[["128","Total",null],["86","Done","#4ADE80"],["28","Transit","#60A5FA"],["9","Delay","#FBBF24"],["5","Cancel","#F87171"]].map(([v,l,c])=>(
            <div key={l as string} className="rounded-2xl p-2.5 text-center" style={{background:"#1C1C2E"}}>
              <p className="text-base font-bold" style={{color:c??"white"}}>{v}</p>
              <p className="text-[8px] text-[rgba(255,255,255,0.4)] mt-0.5">{l}</p>
            </div>
          ))}
        </div>
        <div className="flex flex-wrap gap-2">
          {["All Status","All Customers","All Drivers","All Vehicles"].map((f)=>(
            <div key={f} className="px-3 py-1.5 rounded-xl bg-white shadow-sm border border-[#EBEBED] flex items-center gap-1 text-xs text-[#444] font-medium"><span>{f}</span><ChevronDown size={11}/></div>
          ))}
        </div>
        <div className="bg-white rounded-2xl p-4 shadow-sm">
          <p className="text-xs font-bold text-[#111] mb-3">Trip List (128)</p>
          {[{id:"TRP-2387",r:"Riyadh → Jeddah",d:"Ahmed K.",v:"TRK-2041",s:"Completed",sc:"#16A34A",sb:"#F0FDF4",dt:"24 May"},{id:"TRP-2386",r:"Riyadh → Abha",d:"Faisal B.",v:"DRA-9973",s:"In Transit",sc:"#2563EB",sb:"#EFF6FF",dt:"24 May"},{id:"TRP-2385",r:"Riyadh → Dammam",d:"Bader A.",v:"VRA-3358",s:"Delayed",sc:"#D97706",sb:"#FFFBEB",dt:"24 May"}].map((t)=>(
            <div key={t.id} className="flex items-center gap-3 py-2.5 border-b border-[#F5F5F7] last:border-0">
              <div className="w-8 h-8 rounded-xl bg-[#F5F5F7] flex items-center justify-center shrink-0"><Truck size={15} className="text-[#6E6E80]"/></div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-1.5"><span className="text-xs font-mono font-bold text-[#E8450F]">{t.id}</span><span className="text-[10px] font-semibold px-1.5 py-0.5 rounded-full" style={{color:t.sc,background:t.sb}}>{t.s}</span></div>
                <p className="text-[10px] text-[#6E6E80] truncate">{t.r} · {t.d}</p>
              </div>
              <span className="text-[10px] text-[#9898A4] shrink-0">{t.dt}</span>
            </div>
          ))}
        </div>
        <div className="flex gap-3">
          {[{icon:FileText,l:"PDF"},{icon:BarChart3,l:"Excel"},{icon:Phone,l:"WhatsApp"}].map((a)=>(
            <div key={a.l} className="flex-1 py-3 rounded-2xl bg-white shadow-sm border border-[#EBEBED] flex items-center justify-center gap-1.5"><a.icon size={14} className="text-[#444]"/><p className="text-xs font-semibold text-[#444]">{a.l}</p></div>
          ))}
        </div>
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════════════════ */
/* 19 VEHICLE REPORTS                                                           */
/* ═══════════════════════════════════════════════════════════════════════════ */
function VehicleReports() {
  return (
    <div className="flex flex-col h-full bg-[#F5F5F7]">
      <div className="bg-white px-5 pt-11 pb-3 shrink-0 flex items-center justify-between">
        <div><p className="text-lg font-bold text-[#111]">Vehicle Reports</p><p className="text-xs text-[#6E6E80]">Fleet utilization & performance</p></div>
        <div className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-[#F5F5F7] text-xs font-semibold text-[#444]"><Calendar size={13}/> This Month</div>
      </div>
      <div className="flex-1 overflow-y-auto px-5 py-4 space-y-4">
        <div className="grid grid-cols-4 gap-2">
          {[["72","Total","#FFFFFF","#1C1C2E"],["48","Active","#4ADE80","#1C1C2E"],["8","Maint.","#FBBF24","#1C1C2E"],["14","Renew","#F87171","#1C1C2E"]].map(([v,l,c,bg])=>(
            <div key={l as string} className="rounded-2xl p-3 text-center" style={{background:bg as string}}>
              <p className="text-xl font-bold" style={{color:c as string}}>{v}</p>
              <p className="text-[9px] text-[rgba(255,255,255,0.4)] mt-0.5">{l}</p>
            </div>
          ))}
        </div>
        <div className="bg-white rounded-2xl p-4 shadow-sm">
          <p className="text-xs font-bold text-[#111] mb-3">Fleet Utilization (Ranked)</p>
          {[{id:"TRK-2041",m:"10T · Volvo",trips:42,util:85,c:"#16A34A"},{id:"DRA-9973",m:"20T · Mercedes",trips:38,util:78,c:"#2563EB"},{id:"VRA-3358",m:"10T · Hino",trips:51,util:92,c:"#E8450F"}].map((v,i)=>(
            <div key={v.id} className="flex items-center gap-3 py-3 border-b border-[#F5F5F7] last:border-0">
              <div className="w-6 h-6 rounded-full bg-[#F5F5F7] flex items-center justify-center text-xs font-bold text-[#6E6E80] shrink-0">{i+1}</div>
              <div className="flex-1 min-w-0">
                <p className="text-xs font-bold font-mono text-[#111]">{v.id}</p>
                <div className="mt-1 h-1.5 rounded-full bg-[#EBEBED] overflow-hidden"><div className="h-full rounded-full" style={{width:`${v.util}%`,background:v.c}}/></div>
              </div>
              <p className="text-sm font-bold shrink-0" style={{color:v.c}}>{v.util}%</p>
            </div>
          ))}
        </div>
        <div className="bg-white rounded-2xl p-4 shadow-sm">
          <p className="text-xs font-bold text-[#111] mb-3">Document Compliance</p>
          {[["Insurance","5 Due",false],["Fahas","3 Due",false],["Istimara","3 Due",false],["SASO","1 Due",true]].map(([n,v,ok])=>(
            <div key={n as string} className="flex items-center justify-between py-2 border-b border-[#F5F5F7] last:border-0">
              <div className="flex items-center gap-2"><Shield size={13} className="text-[#6E6E80]"/><span className="text-xs text-[#444]">{n}</span></div>
              <span className={`text-xs font-semibold ${ok?"text-[#16A34A]":"text-[#DC2626]"}`}>{v}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════════════════ */
/* 20 REVENUE REPORTS                                                           */
/* ═══════════════════════════════════════════════════════════════════════════ */
function RevenueReports() {
  return (
    <div className="flex flex-col h-full bg-[#F5F5F7]">
      <div className="bg-white px-5 pt-11 pb-3 shrink-0 flex items-center justify-between">
        <div><p className="text-lg font-bold text-[#111]">Revenue</p><p className="text-xs text-[#6E6E80]">Financial overview</p></div>
        <div className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-[#F5F5F7] text-xs font-semibold text-[#444]"><Calendar size={13}/> May 2025</div>
      </div>
      <div className="flex-1 overflow-y-auto px-5 py-4 space-y-4">
        <div className="bg-[#1C1C2E] rounded-2xl p-5">
          <p className="text-xs text-[rgba(255,255,255,0.5)] mb-1">Total Revenue</p>
          <p className="text-3xl font-bold text-white mb-1">SAR 213,540</p>
          <div className="flex items-center gap-1.5"><ArrowUp size={12} className="text-[#4ADE80]"/><span className="text-xs text-[#4ADE80] font-semibold">+12.4%</span><span className="text-xs text-[rgba(255,255,255,0.4)]">vs last month</span></div>
        </div>
        <div className="grid grid-cols-2 gap-3">
          {[["SAR 180,200","Trip Revenue","#E8450F","#FFF0EB"],["SAR 21,340","Fuel Recovery","#2563EB","#EFF6FF"],["SAR 12,000","Extras","#D97706","#FFFBEB"],["SAR 1,918","Pending","#6E6E80","#F5F5F7"]].map(([v,l,c,bg])=>(
            <div key={l as string} className="bg-white rounded-2xl p-4 shadow-sm">
              <div className="w-8 h-8 rounded-xl flex items-center justify-center mb-2" style={{background:bg as string}}><DollarSign size={16} style={{color:c as string}}/></div>
              <p className="text-base font-bold text-[#111]">{v}</p>
              <p className="text-[10px] text-[#6E6E80] mt-0.5">{l}</p>
            </div>
          ))}
        </div>
        <div className="bg-white rounded-2xl p-4 shadow-sm">
          <p className="text-xs font-bold text-[#111] mb-3">Top Customers by Revenue</p>
          {[["Fahad Trading Co.","SAR 42,800",28],["Al-Rashid Group","SAR 31,200",22],["Saudi Polymers","SAR 24,600",18]].map(([n,r,pct])=>(
            <div key={n as string} className="mb-3 last:mb-0">
              <div className="flex justify-between text-xs mb-1"><span className="font-medium text-[#444] truncate">{n}</span><span className="font-bold text-[#111] shrink-0 ml-2">{r}</span></div>
              <div className="h-1.5 rounded-full bg-[#EBEBED] overflow-hidden"><div className="h-full rounded-full bg-[#E8450F]" style={{width:`${pct}%`}}/></div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════════════════ */
/* 21 RATE CARD LIST                                                            */
/* ═══════════════════════════════════════════════════════════════════════════ */
function RateCardList() {
  return (
    <div className="flex flex-col h-full bg-[#F5F5F7]">
      <div className="bg-white px-5 pt-11 pb-3 shrink-0">
        <div className="flex items-center justify-between mb-3"><p className="text-lg font-bold text-[#111]">Rate Cards</p></div>
        <div className="flex items-center gap-2 px-3 py-2.5 rounded-xl bg-[#F5F5F7]"><Search size={15} className="text-[#9898A4]"/><span className="text-sm text-[#9898A4]">Search rate cards…</span></div>
      </div>
      <div className="flex-1 overflow-y-auto px-5 py-4 space-y-3">
        {[{c:"Fahad Trading Co.",r:"Riyadh → Jeddah",v:"10 TON",rate:"SAR 1,698",s:"Active",sc:"#16A34A",sb:"#F0FDF4",exp:"Dec 2025"},{c:"Al-Rashid Group",r:"Jeddah → Tabouk",v:"20 TON",rate:"SAR 2,340",s:"Active",sc:"#16A34A",sb:"#F0FDF4",exp:"Jun 2025"},{c:"Saudi Polymers",r:"Riyadh → Dammam",v:"10 TON",rate:"SAR 1,120",s:"Expiring",sc:"#D97706",sb:"#FFFBEB",exp:"May 2025"},{c:"SABIC Trading",r:"Riyadh → Medina",v:"5 TON",rate:"SAR 890",s:"Draft",sc:"#6E6E80",sb:"#F5F5F7",exp:"—"}].map((rc,i)=>(
          <div key={i} className="bg-white rounded-2xl p-4 shadow-sm border border-black/[0.06]">
            <div className="flex items-center justify-between mb-1.5">
              <p className="text-sm font-bold text-[#111] truncate">{rc.c}</p>
              <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full shrink-0 ml-2" style={{color:rc.sc,background:rc.sb}}>{rc.s}</span>
            </div>
            <p className="text-xs text-[#6E6E80] mb-2">{rc.r} · {rc.v}</p>
            <div className="flex items-center justify-between">
              <span className="text-base font-bold text-[#E8450F]">{rc.rate}</span>
              <span className="text-[10px] text-[#9898A4]">Until {rc.exp}</span>
            </div>
          </div>
        ))}
      </div>
      <div className="absolute bottom-24 right-5">
        <div className="w-14 h-14 rounded-full bg-[#E8450F] flex items-center justify-center" style={{boxShadow:"0 4px 16px rgba(232,69,15,.4)"}}><Plus size={24} className="text-white"/></div>
      </div>
      <OBNav active="More"/>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════════════════ */
/* 22 RATE CARD DETAILS                                                         */
/* ═══════════════════════════════════════════════════════════════════════════ */
function RateCardDetails() {
  return (
    <div className="flex flex-col h-full bg-[#F5F5F7]">
      <Hdr title="Rate Card" sub="Fahad Trading Co." right={<div className="flex gap-2"><div className="w-9 h-9 rounded-2xl bg-[#FFF0EB] flex items-center justify-center"><Edit2 size={16} className="text-[#E8450F]"/></div></div>}/>
      <div className="flex-1 overflow-y-auto px-5 py-4 space-y-4">
        <div className="bg-white rounded-2xl p-4 shadow-sm">
          <div className="flex items-center justify-between mb-3">
            <p className="text-xs font-bold text-[#9898A4] uppercase tracking-wider">Rate Details</p>
            <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-[#F0FDF4] text-[#16A34A]">Active</span>
          </div>
          {[["Customer","Fahad Trading Co."],["Route","Riyadh → Jeddah"],["Vehicle Type","10 TON Truck"],["Valid Until","31 Dec 2025"]].map(([k,v])=>(
            <div key={k} className="flex justify-between text-xs py-2 border-b border-[#F5F5F7] last:border-0"><span className="text-[#6E6E80]">{k}</span><span className="font-semibold text-[#111]">{v}</span></div>
          ))}
        </div>
        <div className="bg-white rounded-2xl p-4 shadow-sm">
          <p className="text-xs font-bold text-[#9898A4] uppercase tracking-wider mb-3">Pricing Breakdown</p>
          {[["Base Freight","SAR 1,400.00"],["Fuel Surcharge","SAR 180.00"],["Loading Charges","SAR 50.00"],["Waiting (SAR/hr)","SAR 40.00"],["Other Charges","SAR 28.00"]].map(([k,v])=>(
            <div key={k} className="flex justify-between text-xs py-2 border-b border-[#F5F5F7] last:border-0"><span className="text-[#6E6E80]">{k}</span><span className="font-semibold text-[#111]">{v}</span></div>
          ))}
          <div className="flex justify-between pt-3 border-t border-[#EBEBED] mt-1">
            <span className="text-sm font-bold text-[#111]">Total Rate</span>
            <span className="text-base font-bold text-[#E8450F]">SAR 1,698.00</span>
          </div>
        </div>
        <div className="flex gap-3">
          <div className="flex-1 py-3 rounded-2xl bg-[#F0F0F2] flex items-center justify-center gap-2"><Download size={15} className="text-[#444]"/><p className="text-sm font-semibold text-[#444]">Export</p></div>
          <div className="flex-1 py-3 rounded-2xl bg-[#E8450F] flex items-center justify-center gap-2"><Plus size={15} className="text-white"/><p className="text-sm font-bold text-white">Create Trip</p></div>
        </div>
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════════════════ */
/* 23 NOTIFICATIONS                                                             */
/* ═══════════════════════════════════════════════════════════════════════════ */
function Notifications() {
  const notifs = [
    {icon:Truck,c:"#2563EB",bg:"#EFF6FF",title:"Trip TRP-2388 Started",body:"Ahmed Kareem has started TRP-2388 · Riyadh → Abha",time:"2 min",unread:true,group:"Trips"},
    {icon:AlertTriangle,c:"#D97706",bg:"#FFFBEB",title:"Document Expiring — TRK-2041",body:"Insurance expires in 3 days. Renewal required.",time:"20 min",unread:true,group:"Documents"},
    {icon:CheckCircle2,c:"#16A34A",bg:"#F0FDF4",title:"Trip TRP-2387 Delivered",body:"POD confirmed at Jeddah Islamic Port.",time:"1 hr",unread:true,group:"Trips"},
    {icon:ReceiptText,c:"#7C3AED",bg:"#F5F3FF",title:"Invoice INV-0489 Paid",body:"Fahad Trading Co. paid SAR 1,668 for TRP-2387.",time:"2 hr",unread:false,group:"Finance"},
    {icon:Users,c:"#E8450F",bg:"#FFF0EB",title:"New Driver Added",body:"Khalid Al-Otaibi (DRV-0052) has been registered.",time:"Yesterday",unread:false,group:"Drivers"},
  ];
  return (
    <div className="flex flex-col h-full bg-[#F5F5F7]">
      <div className="bg-white px-5 pt-11 pb-4 shrink-0 flex items-center justify-between">
        <p className="text-lg font-bold text-[#111]">Notifications</p>
        <button className="text-xs text-[#E8450F] font-semibold">Mark all read</button>
      </div>
      <div className="flex-1 overflow-y-auto px-5 py-4 space-y-2">
        {notifs.map((n,i)=>(
          <div key={i} className={`flex items-start gap-3 p-4 rounded-2xl shadow-sm border ${n.unread?"bg-white border-[rgba(232,69,15,0.1)]":"bg-white border-black/[0.06]"}`}>
            <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0" style={{background:n.bg}}><n.icon size={18} style={{color:n.c}}/></div>
            <div className="flex-1 min-w-0">
              <p className={`text-sm ${n.unread?"font-bold":"font-medium"} text-[#111]`}>{n.title}</p>
              <p className="text-xs text-[#6E6E80] mt-0.5 leading-relaxed line-clamp-2">{n.body}</p>
            </div>
            <div className="flex flex-col items-end gap-2 shrink-0">
              <span className="text-[10px] text-[#9898A4]">{n.time}</span>
              {n.unread&&<div className="w-2 h-2 rounded-full bg-[#E8450F]"/>}
            </div>
          </div>
        ))}
      </div>
      <OBNav active="Home"/>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════════════════ */
/* 24 MORE MENU                                                                 */
/* ═══════════════════════════════════════════════════════════════════════════ */
function MoreMenu() {
  const sections = [
    {title:"Manage",items:[{icon:Building2,lbl:"Customers",c:"#2563EB",bg:"#EFF6FF"},{icon:ReceiptText,lbl:"Invoices",c:"#7C3AED",bg:"#F5F3FF"},{icon:CreditCard,lbl:"Rate Cards",c:"#D97706",bg:"#FFFBEB"},{icon:Package,lbl:"Cargo",c:"#16A34A",bg:"#F0FDF4"}]},
    {title:"Reports",items:[{icon:BarChart3,lbl:"Trip Reports",c:"#E8450F",bg:"#FFF0EB"},{icon:Truck,lbl:"Fleet Reports",c:"#1A1A1A",bg:"#F5F5F7"},{icon:DollarSign,lbl:"Revenue",c:"#16A34A",bg:"#F0FDF4"},{icon:Shield,lbl:"Renewals",c:"#DC2626",bg:"#FEF2F2"}]},
  ];
  return (
    <div className="flex flex-col h-full bg-[#F5F5F7]">
      <div className="bg-white px-5 pt-11 pb-4 shrink-0">
        <div className="flex items-center justify-between">
          <p className="text-lg font-bold text-[#111]">More</p>
          <div className="flex items-center gap-2">
            <div className="relative"><div className="w-9 h-9 rounded-2xl bg-[#F5F5F7] flex items-center justify-center"><Bell size={18} className="text-[#444]"/></div><span className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-[#E8450F] text-white text-[9px] font-bold flex items-center justify-center">3</span></div>
            <div className="w-9 h-9 rounded-full bg-[#1A1A1A] flex items-center justify-center text-white text-xs font-bold">MH</div>
          </div>
        </div>
      </div>
      <div className="flex-1 overflow-y-auto px-5 py-4 space-y-5">
        {sections.map((sec)=>(
          <div key={sec.title}>
            <p className="text-[10px] font-bold uppercase tracking-widest text-[#9898A4] mb-3">{sec.title}</p>
            <div className="grid grid-cols-4 gap-3">
              {sec.items.map((a)=>(
                <button key={a.lbl} className="flex flex-col items-center gap-2 p-3 bg-white rounded-2xl shadow-sm">
                  <div className="w-10 h-10 rounded-2xl flex items-center justify-center" style={{background:a.bg}}><a.icon size={20} style={{color:a.c}}/></div>
                  <p className="text-[10px] font-semibold text-[#111] text-center leading-tight">{a.lbl}</p>
                </button>
              ))}
            </div>
          </div>
        ))}
        <div>
          <p className="text-[10px] font-bold uppercase tracking-widest text-[#9898A4] mb-3">Account</p>
          {[{icon:User,lbl:"My Profile"},{icon:Settings,lbl:"Settings"},{icon:Bell,lbl:"Notifications"},{icon:Shield,lbl:"Security"}].map((r)=>(
            <div key={r.lbl} className="flex items-center gap-3 px-4 py-3.5 bg-white rounded-2xl shadow-sm mb-1.5 last:mb-0">
              <div className="w-8 h-8 rounded-xl bg-[#F5F5F7] flex items-center justify-center"><r.icon size={16} className="text-[#6E6E80]"/></div>
              <p className="text-sm font-semibold text-[#111] flex-1">{r.lbl}</p>
              <ChevronRight size={16} className="text-[#D8D8DC]"/>
            </div>
          ))}
        </div>
        <div className="flex items-center gap-3 px-4 py-3.5 bg-[#FEF2F2] rounded-2xl border border-[#FECACA]">
          <div className="w-8 h-8 rounded-xl bg-[#FEE2E2] flex items-center justify-center"><LogOut size={16} className="text-[#DC2626]"/></div>
          <p className="text-sm font-bold text-[#DC2626] flex-1">Logout</p>
        </div>
      </div>
      <OBNav active="More"/>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════════════════ */
/* 25 DRIVER PERFORMANCE                                                        */
/* ═══════════════════════════════════════════════════════════════════════════ */
function DriverPerformance() {
  return (
    <div className="flex flex-col h-full bg-[#F5F5F7]">
      <Hdr title="Driver Performance" sub="Ahmed Kareem · DRV-0041"/>
      <div className="flex-1 overflow-y-auto px-5 py-4 space-y-4">
        <div className="bg-[#1C1C2E] rounded-2xl p-4 flex items-center gap-4">
          <div className="w-14 h-14 rounded-full bg-[#E8450F] flex items-center justify-center text-white text-xl font-bold shrink-0">AK</div>
          <div className="flex-1">
            <p className="text-base font-bold text-white">Ahmed Kareem</p>
            <p className="text-xs text-[rgba(255,255,255,0.5)]">DRV-0041 · 5 years experience</p>
            <div className="flex items-center gap-1 mt-1"><Star size={13} className="text-[#FBBF24] fill-[#FBBF24]"/><span className="text-sm font-bold text-white">4.7</span><span className="text-xs text-[rgba(255,255,255,0.5)]">/ 5.0</span></div>
          </div>
        </div>
        <div className="grid grid-cols-2 gap-3">
          {[["1,248","Total Trips","#E8450F"],["94%","On-Time","#16A34A"],["248K km","Distance","#2563EB"],["0","Incidents","#16A34A"]].map(([v,l,c])=>(
            <div key={l as string} className="bg-white rounded-2xl p-4 shadow-sm">
              <p className="text-xl font-bold" style={{color:c as string}}>{v}</p>
              <p className="text-xs text-[#6E6E80] mt-0.5">{l}</p>
            </div>
          ))}
        </div>
        <div className="bg-white rounded-2xl p-4 shadow-sm">
          <p className="text-xs font-bold text-[#9898A4] uppercase tracking-wider mb-3">Monthly Performance</p>
          {[{l:"On-Time Delivery",v:94,c:"#16A34A"},{l:"Customer Rating",v:92,c:"#2563EB"},{l:"Fuel Efficiency",v:78,c:"#D97706"},{l:"POD Completion",v:100,c:"#E8450F"}].map((m)=>(
            <div key={m.l} className="mb-3 last:mb-0">
              <div className="flex justify-between text-xs mb-1"><span className="text-[#444]">{m.l}</span><span className="font-bold" style={{color:m.c}}>{m.v}%</span></div>
              <div className="h-2 rounded-full bg-[#EBEBED] overflow-hidden"><div className="h-full rounded-full" style={{width:`${m.v}%`,background:m.c}}/></div>
            </div>
          ))}
        </div>
        <div className="bg-white rounded-2xl p-4 shadow-sm">
          <p className="text-xs font-bold text-[#9898A4] uppercase tracking-wider mb-3">Recent Trips</p>
          {[{id:"TRP-2387",r:"Riyadh → Jeddah",s:"Completed",sc:"#16A34A",sb:"#F0FDF4"},{id:"TRP-2381",r:"Jeddah → Tabouk",s:"Completed",sc:"#16A34A",sb:"#F0FDF4"},{id:"TRP-2375",r:"Riyadh → Dammam",s:"Completed",sc:"#16A34A",sb:"#F0FDF4"}].map((t)=>(
            <div key={t.id} className="flex items-center gap-3 py-2 border-b border-[#F5F5F7] last:border-0">
              <Truck size={15} className="text-[#6E6E80] shrink-0"/>
              <div className="flex-1"><span className="text-xs font-mono font-bold text-[#E8450F]">{t.id}</span><p className="text-[10px] text-[#6E6E80]">{t.r}</p></div>
              <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded-full" style={{color:t.sc,background:t.sb}}>{t.s}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════════════════ */
/* 26 ONBOARDING / WELCOME                                                      */
/* ═══════════════════════════════════════════════════════════════════════════ */
function Onboarding() {
  const [slide, setSlide] = useState(0);
  const slides = [
    {icon:Truck,c:"#E8450F",bg:"#FFF0EB",title:"Manage Your Fleet",body:"Track all trips, drivers, and vehicles from one powerful platform."},
    {icon:BarChart3,c:"#2563EB",bg:"#EFF6FF",title:"Real-Time Reports",body:"Monitor KPIs, revenue, and document compliance at a glance."},
    {icon:CheckCircle2,c:"#16A34A",bg:"#F0FDF4",title:"Complete Workflows",body:"Create trips, assign drivers, generate invoices — end to end."},
  ];
  const s = slides[slide];
  return (
    <div className="flex flex-col h-full bg-white">
      <SBar/>
      <div className="flex-1 flex flex-col items-center justify-center px-8 text-center">
        <div className="w-28 h-28 rounded-3xl flex items-center justify-center mb-8" style={{background:s.bg}}>
          <s.icon size={52} style={{color:s.c}}/>
        </div>
        <p className="text-2xl font-bold text-[#111] mb-3">{s.title}</p>
        <p className="text-sm text-[#6E6E80] leading-relaxed mb-10">{s.body}</p>
        <div className="flex gap-2 mb-10">
          {slides.map((_,i)=>(
            <div key={i} className={`rounded-full transition-all ${i===slide?"w-6 h-2 bg-[#E8450F]":"w-2 h-2 bg-[#EBEBED]"}`}/>
          ))}
        </div>
      </div>
      <div className="px-6 pb-12 space-y-3">
        <button onClick={()=>setSlide((slide+1)%slides.length)} className="w-full py-4 rounded-2xl bg-[#E8450F] text-white font-bold text-base">
          {slide<2?"Next →":"Get Started"}
        </button>
        {slide<2&&<button onClick={()=>setSlide(2)} className="w-full py-3 text-sm text-[#6E6E80] font-medium">Skip</button>}
      </div>
    </div>
  );
}

/* ─── Registry ────────────────────────────────────────────────────────────── */
export const OPERATOR_CORE_SCREENS = [
  {n:1, g:"Auth",      t:"Splash",              C:Splash},
  {n:2, g:"Auth",      t:"Login",               C:Login},
  {n:3, g:"Auth",      t:"Forgot Password",     C:ForgotPassword},
  {n:4, g:"Auth",      t:"Onboarding",          C:Onboarding},
  {n:5, g:"Home",      t:"Home Dashboard",      C:HomeDashboard},
  {n:6, g:"Home",      t:"Notifications",       C:Notifications},
  {n:7, g:"Home",      t:"More Menu",           C:MoreMenu},
  {n:8, g:"Trips",     t:"Trip List",           C:TripList},
  {n:9, g:"Trips",     t:"Trip Details",        C:TripDetails},
  {n:10,g:"Trips",     t:"Create Trip",         C:CreateTrip},
  {n:11,g:"Trips",     t:"Trip Tracking",       C:TripTracking},
  {n:12,g:"Trips",     t:"Assign Driver",       C:AssignDriverSheet},
  {n:13,g:"Trips",     t:"Trip Success",        C:TripSuccess},
  {n:14,g:"Drivers",   t:"Drivers List",        C:DriversList},
  {n:15,g:"Drivers",   t:"Driver Details",      C:DriverDetails},
  {n:16,g:"Drivers",   t:"Driver Performance",  C:DriverPerformance},
  {n:17,g:"Vehicles",  t:"Vehicle List",        C:VehicleList},
  {n:18,g:"Vehicles",  t:"Vehicle Details",     C:VehicleDetails},
  {n:19,g:"Vehicles",  t:"Vehicle Renewal",     C:VehicleRenewal},
  {n:20,g:"Customers", t:"Customer List",       C:CustomerList},
  {n:21,g:"Customers", t:"Customer Details",    C:CustomerDetails},
  {n:22,g:"Reports",   t:"Trip Reports",        C:TripReports},
  {n:23,g:"Reports",   t:"Vehicle Reports",     C:VehicleReports},
  {n:24,g:"Reports",   t:"Revenue",             C:RevenueReports},
  {n:25,g:"Rate Cards",t:"Rate Card List",      C:RateCardList},
  {n:26,g:"Rate Cards",t:"Rate Card Details",   C:RateCardDetails},
];

const GROUPS = [...new Set(OPERATOR_CORE_SCREENS.map((s) => s.g))];

/* ─── Export ──────────────────────────────────────────────────────────────── */
export function OperatorScreensSection() {
  const [active, setActive] = useState(1);
  const [group, setGroup] = useState("All");

  const screen = OPERATOR_CORE_SCREENS.find((s) => s.n === active)!;
  const filtered = group === "All" ? OPERATOR_CORE_SCREENS : OPERATOR_CORE_SCREENS.filter((s) => s.g === group);

  return (
    <div>
      <SectionHeader title="Operator Screens" desc="26 core screens — Auth, Home, Trips, Drivers, Vehicles, Customers, Reports, Rate Cards." />

      {/* Group filter */}
      <div className="flex flex-wrap gap-2 mb-4">
        {["All", ...GROUPS].map((g) => (
          <button key={g} onClick={() => setGroup(g)}
            className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all ${group === g ? "bg-[#1A1A1A] text-white" : "bg-white text-[#444] border border-[#EBEBED] hover:border-[rgba(26,26,26,0.3)]"}`}>
            {g}
          </button>
        ))}
      </div>

      {/* Screen selector */}
      <div className="flex flex-wrap gap-2 mb-8">
        {filtered.map((s) => (
          <button key={s.n} onClick={() => setActive(s.n)}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold transition-all ${active === s.n ? "bg-[#E8450F] text-white shadow-sm" : "bg-white text-[#444] border border-[#EBEBED] hover:border-[rgba(232,69,15,0.4)]"}`}>
            <span className={`text-[10px] font-mono ${active === s.n ? "text-[rgba(255,255,255,0.7)]" : "text-[#9898A4]"}`}>{String(s.n).padStart(2,"0")}</span>
            {s.t}
          </button>
        ))}
      </div>

      {/* Preview */}
      <div className="flex justify-center mb-10">
        <Frame title={screen.t} n={screen.n}>
          <screen.C />
        </Frame>
      </div>

      {/* Grid */}
      <p className="text-xs font-semibold uppercase tracking-widest text-[#6E6E80] mb-4">All 26 Screens — Overview</p>
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        {OPERATOR_CORE_SCREENS.map((s) => (
          <div key={s.n} onClick={() => setActive(s.n)} role="button" tabIndex={0}
            onKeyDown={(e) => e.key === "Enter" && setActive(s.n)}
            className={`rounded-2xl overflow-hidden border-2 transition-all cursor-pointer ${active === s.n ? "border-[#E8450F] shadow-lg" : "border-transparent hover:border-[rgba(232,69,15,0.3)]"}`}>
            <div className="relative overflow-hidden" style={{ height: 180, background: "#1A1A1A" }}>
              <div className="absolute inset-0 pointer-events-none origin-top-left scale-[0.38]" style={{ width: "263%", height: "263%" }}>
                <div style={{ width: 375, height: 474 }}><s.C /></div>
              </div>
            </div>
            <div className="py-2 px-2 bg-white">
              <p className="text-[9px] font-mono text-[#9898A4]">{String(s.n).padStart(2,"0")} · {s.g}</p>
              <p className="text-xs font-semibold text-[#111] truncate">{s.t}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
