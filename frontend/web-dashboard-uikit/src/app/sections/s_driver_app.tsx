import React, { useState } from "react";
import {
  Home, Truck, User, Bell, ChevronRight, ChevronLeft, MapPin, Package,
  Clock, CheckCircle2, AlertTriangle, Camera, Upload, FileText, Settings,
  Eye, Download, Phone, Shield, Fuel, Wifi, Battery, Signal, X,
  ArrowRight, LogOut, Globe, Lock, Info, Star, Edit2, Navigation2,
  Gauge, Search, Filter, MoreHorizontal, Check, AlertCircle, Loader2
} from "lucide-react";
import macronLogo from "@/imports/MACRON_LOGO.jpeg";
import { ImageWithFallback } from "@/app/components/figma/ImageWithFallback";
import { SectionHeader } from "./common";

/* ─── Shared phone chrome ─────────────────────────────────────────────────── */
function StatusBar({ light = false }: { light?: boolean }) {
  const c = light ? "text-white" : "text-[#111]";
  return (
    <div className={`h-11 flex items-end justify-between px-6 pb-1.5 shrink-0 ${c}`}>
      <span className="text-[13px] font-semibold">9:41</span>
      <div className="flex items-center gap-1">
        <Signal size={14} />
        <Wifi size={14} />
        <Battery size={14} />
      </div>
    </div>
  );
}

function DriverNav({ active }: { active: "Home" | "Trips" | "Profile" }) {
  const items = [
    { label: "Home", icon: Home },
    { label: "Trips", icon: Truck },
    { label: "Profile", icon: User },
  ] as const;
  return (
    <div className="shrink-0 px-6 pb-6 pt-2">
      <div className="flex items-center justify-around px-4 py-3 rounded-full"
        style={{ background: "#1C1C2E", boxShadow: "0 8px 24px rgba(28,28,46,0.5)" }}>
        {items.map((item) => {
          const on = item.label === active;
          return (
            <div key={item.label} className="flex flex-col items-center gap-0.5">
              <item.icon size={20} style={{ color: on ? "#E8450F" : "rgba(255,255,255,0.45)" }} strokeWidth={on ? 2.2 : 1.7} />
              <span className="text-[9px] font-semibold" style={{ color: on ? "#E8450F" : "rgba(255,255,255,0.45)" }}>{item.label}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function PhoneFrame({ children, title, screen, total }: {
  children: React.ReactNode; title: string; screen: number; total: number;
}) {
  return (
    <div className="flex flex-col items-center shrink-0">
      <div className="relative rounded-[44px] overflow-hidden flex flex-col"
        style={{ width: 375, height: 812, background: "#F5F5F7", border: "8px solid #1A1A1A", boxShadow: "0 24px 64px rgba(0,0,0,0.35), inset 0 0 0 1px rgba(255,255,255,0.08)" }}>
        {/* Notch */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-28 h-7 rounded-b-2xl z-20" style={{ background: "#1A1A1A" }} />
        <div className="flex flex-col h-full">
          {children}
        </div>
      </div>
      <div className="mt-4 text-center">
        <p className="text-xs font-bold text-[#111]">{String(screen).padStart(2, "0")} — {title}</p>
      </div>
    </div>
  );
}

/* ─── 01 Splash ───────────────────────────────────────────────────────────── */
function SplashScreen() {
  return (
    <div className="flex flex-col items-center justify-between h-full" style={{ background: "#1A1A1A" }}>
      <div className="flex-1 flex flex-col items-center justify-center gap-6 px-8">
        <div className="w-24 h-24 rounded-3xl bg-white flex items-center justify-center shadow-2xl">
          <ImageWithFallback src={macronLogo} alt="Mercon" className="w-20 h-20 object-contain" />
        </div>
        <div className="text-center">
          <p className="text-2xl font-bold text-white tracking-tight">MERCON</p>
          <p className="text-sm text-[rgba(255,255,255,0.5)] mt-1">Driver Operations</p>
        </div>
        {/* Loading dots */}
        <div className="flex gap-2 mt-4">
          {[0, 1, 2].map((i) => (
            <div key={i} className="w-2 h-2 rounded-full bg-[#E8450F]" style={{ opacity: i === 0 ? 1 : 0.3 }} />
          ))}
        </div>
      </div>
      <div className="pb-12 text-center">
        <p className="text-xs text-[rgba(255,255,255,0.3)]">v2.1.4 · © 2025 Mercon Logistics</p>
      </div>
    </div>
  );
}

/* ─── 02 Login ────────────────────────────────────────────────────────────── */
function LoginScreen() {
  return (
    <div className="flex flex-col h-full bg-white">
      <StatusBar />
      <div className="flex-1 flex flex-col px-6 pt-4 pb-4 overflow-hidden">
        <div className="flex justify-center mb-8 mt-4">
          <ImageWithFallback src={macronLogo} alt="Mercon" className="h-12 object-contain" />
        </div>
        <div className="mb-8">
          <p className="text-2xl font-bold text-[#111]">Welcome Back</p>
          <p className="text-sm text-[#6E6E80] mt-1">Sign in to your driver account</p>
        </div>
        <div className="space-y-4 mb-6">
          <div>
            <label className="text-xs font-semibold text-[#111] block mb-1.5">Email Address</label>
            <div className="flex items-center gap-3 px-4 py-3.5 rounded-2xl bg-[#F5F5F7]">
              <User size={16} className="text-[#9898A4]" />
              <span className="text-sm text-[#9898A4]">ahmed.kareem@mercon.sa</span>
            </div>
          </div>
          <div>
            <label className="text-xs font-semibold text-[#111] block mb-1.5">Password</label>
            <div className="flex items-center gap-3 px-4 py-3.5 rounded-2xl bg-[#F5F5F7]">
              <Lock size={16} className="text-[#9898A4]" />
              <span className="flex-1 text-sm text-[#111]">••••••••</span>
              <Eye size={16} className="text-[#9898A4]" />
            </div>
          </div>
        </div>
        <button className="w-full py-4 rounded-2xl bg-[#E8450F] text-white font-bold text-base mb-4">Sign In</button>
        <button className="text-center text-sm text-[#E8450F] font-semibold">Forgot Password?</button>
        <div className="flex-1" />
        <p className="text-center text-xs text-[#9898A4]">Mercon Logistics Services Company</p>
      </div>
    </div>
  );
}

/* ─── 03 Home ─────────────────────────────────────────────────────────────── */
function HomeScreen() {
  return (
    <div className="flex flex-col h-full bg-[#F5F5F7]">
      <div className="bg-white px-5 pt-12 pb-4">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs text-[#6E6E80]">Good Morning</p>
            <p className="text-lg font-bold text-[#111]">Ahmed Kareem 👋</p>
          </div>
          <div className="relative">
            <div className="w-10 h-10 rounded-2xl bg-[#F5F5F7] flex items-center justify-center">
              <Bell size={20} className="text-[#444]" />
            </div>
            <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-[#E8450F] text-white text-[9px] font-bold flex items-center justify-center">3</span>
          </div>
        </div>
      </div>
      <div className="flex-1 overflow-y-auto px-5 py-4 space-y-4">
        {/* Current Job Card */}
        <div className="rounded-2xl overflow-hidden shadow-sm" style={{ background: "#1C1C2E" }}>
          <div className="px-5 pt-5 pb-3">
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-mono font-bold text-[#E8450F]">TRP-2387</span>
              <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-[rgba(232,69,15,0.2)] text-[#E8450F]">Active</span>
            </div>
            <div className="flex items-center gap-2 mb-4">
              <div className="flex flex-col items-center">
                <div className="w-2.5 h-2.5 rounded-full bg-[#E8450F]" />
                <div className="w-px h-8 bg-[rgba(255,255,255,0.2)] my-1" />
                <div className="w-2.5 h-2.5 rounded-full bg-[#16A34A]" />
              </div>
              <div className="flex-1 space-y-4">
                <div>
                  <p className="text-xs text-[rgba(255,255,255,0.5)]">Pickup</p>
                  <p className="text-sm font-semibold text-white">Riyadh Industrial City</p>
                </div>
                <div>
                  <p className="text-xs text-[rgba(255,255,255,0.5)]">Destination</p>
                  <p className="text-sm font-semibold text-white">Jeddah Islamic Port</p>
                </div>
              </div>
            </div>
            <div className="grid grid-cols-3 gap-2 pt-3 border-t border-[rgba(255,255,255,0.1)]">
              {[["Cargo", "General Goods"], ["Distance", "974 km"], ["ETA", "8h 18m"]].map(([l, v]) => (
                <div key={l}>
                  <p className="text-[10px] text-[rgba(255,255,255,0.4)]">{l}</p>
                  <p className="text-xs font-semibold text-white mt-0.5">{v}</p>
                </div>
              ))}
            </div>
          </div>
          <button className="w-full py-4 bg-[#E8450F] text-white font-bold text-base flex items-center justify-center gap-2">
            <Navigation2 size={18} /> Start Trip
          </button>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 gap-3">
          {[
            { label: "Trips This Month", value: "12", icon: Truck, color: "#2563EB", bg: "#EFF6FF" },
            { label: "On-Time Rate", value: "94%", icon: CheckCircle2, color: "#16A34A", bg: "#F0FDF4" },
          ].map((s) => (
            <div key={s.label} className="bg-white rounded-2xl p-4 shadow-sm border border-black/[0.06]">
              <div className="w-9 h-9 rounded-xl flex items-center justify-center mb-3" style={{ background: s.bg }}>
                <s.icon size={18} style={{ color: s.color }} />
              </div>
              <p className="text-xl font-bold text-[#111]">{s.value}</p>
              <p className="text-[10px] text-[#6E6E80] mt-0.5">{s.label}</p>
            </div>
          ))}
        </div>
      </div>
      <DriverNav active="Home" />
    </div>
  );
}

/* ─── 04 Pickup Verification ──────────────────────────────────────────────── */
function PickupVerificationScreen() {
  return (
    <div className="flex flex-col h-full bg-[#F5F5F7]">
      <div className="bg-white px-5 pt-12 pb-4 flex items-center gap-3">
        <button className="w-9 h-9 rounded-xl bg-[#F5F5F7] flex items-center justify-center"><ChevronLeft size={20} className="text-[#444]" /></button>
        <p className="text-base font-bold text-[#111]">Pickup Verification</p>
      </div>
      <div className="flex-1 overflow-y-auto px-5 py-4 space-y-4">
        {/* Trip summary bar */}
        <div className="bg-white rounded-2xl px-4 py-3 flex items-center gap-3 shadow-sm border border-black/[0.06]">
          <span className="text-xs font-mono font-bold text-[#E8450F]">TRP-2387</span>
          <div className="flex-1 flex items-center gap-1.5 text-xs text-[#444]">
            <MapPin size={11} className="text-[#E8450F]" />Riyadh
            <ArrowRight size={11} className="text-[#9898A4]" />
            <MapPin size={11} className="text-[#6E6E80]" />Jeddah
          </div>
          <span className="text-xs text-[#6E6E80]">18,500 KG</span>
        </div>

        <div className="bg-white rounded-2xl p-4 shadow-sm border border-black/[0.06]">
          <p className="text-sm font-bold text-[#111] mb-3">Upload Cargo Photos</p>
          <div className="border-2 border-dashed border-[rgba(232,69,15,0.3)] rounded-2xl p-6 flex flex-col items-center bg-[#FFF8F6] mb-4">
            <div className="w-12 h-12 rounded-2xl bg-[#FFF0EB] flex items-center justify-center mb-3">
              <Camera size={22} className="text-[#E8450F]" />
            </div>
            <p className="text-sm font-semibold text-[#111]">Take or Upload Photo</p>
            <p className="text-xs text-[#6E6E80] mt-1">JPG, PNG up to 10MB</p>
          </div>
          <div className="grid grid-cols-3 gap-2 mb-4">
            {[
              { bg: "#F0FDF4", icon: <CheckCircle2 size={18} className="text-[#16A34A]" /> },
              { bg: "#F0FDF4", icon: <CheckCircle2 size={18} className="text-[#16A34A]" /> },
              { bg: "#F5F5F7", icon: <Upload size={18} className="text-[#9898A4]" /> },
            ].map((p, i) => (
              <div key={i} className="aspect-square rounded-xl flex items-center justify-center text-2xl" style={{ background: p.bg }}>
                {p.icon}
              </div>
            ))}
          </div>
          <div className="flex items-center gap-2 text-xs text-[#6E6E80]">
            <div className="flex-1 h-1.5 rounded-full bg-[#EBEBED] overflow-hidden">
              <div className="h-full w-2/3 rounded-full bg-[#E8450F]" />
            </div>
            <span className="text-[#E8450F] font-semibold">2/3 uploaded</span>
          </div>
        </div>

        <div className="flex gap-2">
          <button className="flex-1 py-3.5 rounded-2xl bg-[#F0F0F2] text-sm font-semibold text-[#444] flex items-center justify-center gap-2">
            <Camera size={16} /> Camera
          </button>
          <button className="flex-1 py-3.5 rounded-2xl bg-[#F0F0F2] text-sm font-semibold text-[#444] flex items-center justify-center gap-2">
            <Upload size={16} /> Gallery
          </button>
        </div>
        <button className="w-full py-4 rounded-2xl bg-[#E8450F] text-white font-bold text-base">Continue</button>
      </div>
    </div>
  );
}

/* ─── 05 Live Navigation ──────────────────────────────────────────────────── */
function LiveNavigationScreen() {
  return (
    <div className="flex flex-col h-full relative overflow-hidden">
      {/* Map background */}
      <div className="absolute inset-0" style={{ background: "linear-gradient(170deg, #d8e8d8 0%, #c5d9c5 50%, #b8d0b8 100%)" }}>
        <svg className="absolute inset-0 w-full h-full opacity-20"><line x1="0" y1="30%" x2="100%" y2="30%" stroke="#666" strokeWidth="0.5" /><line x1="0" y1="60%" x2="100%" y2="60%" stroke="#666" strokeWidth="0.5" /><line x1="30%" y1="0" x2="30%" y2="100%" stroke="#666" strokeWidth="0.5" /><line x1="70%" y1="0" x2="70%" y2="100%" stroke="#666" strokeWidth="0.5" /></svg>
        {/* Route line */}
        <svg className="absolute inset-0 w-full h-full"><path d="M 80 750 C 150 600 200 450 250 350 S 310 200 375 120" stroke="white" strokeWidth="5" fill="none" strokeLinecap="round" /><path d="M 80 750 C 150 600 200 450 250 350 S 310 200 375 120" stroke="#E8450F" strokeWidth="3" fill="none" strokeLinecap="round" strokeDasharray="10 5" /></svg>
        {/* Pickup marker */}
        <div className="absolute flex flex-col items-center" style={{ left: 62, bottom: 180 }}><div className="w-8 h-8 rounded-full bg-[#E8450F] border-2 border-white flex items-center justify-center shadow-lg"><MapPin size={14} className="text-white" /></div></div>
        {/* Vehicle */}
        <div className="absolute" style={{ left: 230, top: 320 }}><div className="w-10 h-10 rounded-full bg-[#1C1C2E] border-2 border-white shadow-xl flex items-center justify-center"><Truck size={16} className="text-white" /></div><div className="absolute inset-0 rounded-full border-2 border-[#E8450F] animate-ping opacity-30" /></div>
        {/* Dest marker */}
        <div className="absolute flex flex-col items-center" style={{ right: 30, top: 100 }}><div className="w-8 h-8 rounded-full bg-[#16A34A] border-2 border-white flex items-center justify-center shadow-lg"><MapPin size={14} className="text-white" /></div></div>
      </div>
      {/* Status bar */}
      <div className="relative z-10 pt-11 px-4 flex items-center gap-2">
        <button className="w-9 h-9 rounded-xl bg-white shadow-md flex items-center justify-center"><ChevronLeft size={18} className="text-[#444]" /></button>
        <div className="flex-1 flex items-center gap-2 px-3 py-2 bg-white rounded-xl shadow-md">
          <Navigation2 size={14} className="text-[#E8450F]" />
          <span className="text-xs font-semibold text-[#111] truncate">Jeddah Islamic Port</span>
        </div>
      </div>
      {/* Speed + ETA widgets */}
      <div className="absolute left-4 right-4 z-10" style={{ top: 100 }}>
        <div className="flex gap-2">
          {[{ icon: Gauge, label: "Speed", value: "92 km/h", color: "#2563EB", bg: "bg-white" }, { icon: Clock, label: "ETA", value: "6h 12m", color: "#E8450F", bg: "bg-white" }].map((w) => (
            <div key={w.label} className={`flex items-center gap-2 px-3 py-2 rounded-xl shadow-md ${w.bg} flex-1`}>
              <w.icon size={16} style={{ color: w.color }} />
              <div><p className="text-[9px] text-[#6E6E80]">{w.label}</p><p className="text-xs font-bold text-[#111]">{w.value}</p></div>
            </div>
          ))}
        </div>
      </div>
      {/* SOS Button */}
      <div className="absolute right-4 z-10" style={{ bottom: 200 }}>
        <button className="w-14 h-14 rounded-full bg-[#DC2626] text-white flex items-center justify-center shadow-xl">
          <AlertCircle size={24} />
        </button>
      </div>
      {/* Bottom info card */}
      <div className="absolute bottom-0 left-0 right-0 z-10 bg-white rounded-t-3xl px-5 pt-4 pb-6 shadow-2xl">
        <div className="w-10 h-1 rounded-full bg-[#D8D8DC] mx-auto mb-4" />
        <div className="grid grid-cols-3 gap-3 text-center">
          {[["482 km", "Remaining"], ["6h 12m", "ETA"], ["19:45", "Arrival"]].map(([v, l]) => (
            <div key={l}><p className="text-base font-bold text-[#111]">{v}</p><p className="text-[10px] text-[#6E6E80]">{l}</p></div>
          ))}
        </div>
        <div className="mt-3 h-1.5 rounded-full bg-[#EBEBED] overflow-hidden">
          <div className="h-full w-1/2 rounded-full bg-gradient-to-r from-[#E8450F] to-[#D97706]" />
        </div>
        <p className="text-[10px] text-[#6E6E80] text-center mt-1">50.5% completed</p>
      </div>
    </div>
  );
}

/* ─── 06 Emergency ────────────────────────────────────────────────────────── */
function EmergencyScreen() {
  return (
    <div className="flex flex-col h-full bg-white">
      <div className="bg-[#DC2626] px-5 pt-12 pb-5">
        <div className="flex items-center gap-3 mb-3">
          <button className="w-9 h-9 rounded-xl bg-[rgba(255,255,255,0.2)] flex items-center justify-center"><ChevronLeft size={20} className="text-white" /></button>
          <p className="text-lg font-bold text-white">Emergency Report</p>
        </div>
        <div className="flex items-center gap-2 px-3 py-2 bg-[rgba(255,255,255,0.1)] rounded-xl">
          <span className="w-2 h-2 rounded-full bg-white animate-pulse" />
          <span className="text-xs text-white font-semibold">TRP-2387 · King Fahd Road, km 492</span>
        </div>
      </div>
      <div className="flex-1 overflow-y-auto px-5 py-4 space-y-4">
        <button className="w-full flex items-center gap-4 p-4 rounded-2xl bg-[#FEF2F2] border-2 border-[#DC2626]">
          <div className="w-12 h-12 rounded-2xl bg-[#DC2626] flex items-center justify-center shrink-0"><Phone size={22} className="text-white" /></div>
          <div className="text-left"><p className="text-sm font-bold text-[#DC2626]">Call Operator</p><p className="text-xs text-[#6E6E80]">+966 11 000 0000</p></div>
          <ChevronRight size={16} className="text-[#DC2626] ml-auto" />
        </button>
        <div className="bg-[#F5F5F7] rounded-2xl p-4">
          <p className="text-sm font-bold text-[#111] mb-3">Upload Incident Photos</p>
          <div className="grid grid-cols-3 gap-2 mb-2">
            {[0, 1, 2].map((i) => (
              <div key={i} className="aspect-square rounded-xl bg-white border-2 border-dashed border-[#D8D8DC] flex items-center justify-center">
                <Camera size={18} className="text-[#9898A4]" />
              </div>
            ))}
          </div>
        </div>
        <div>
          <label className="text-xs font-semibold text-[#111] block mb-1.5">Incident Notes</label>
          <div className="px-4 py-3 rounded-2xl bg-[#F5F5F7] min-h-[80px]">
            <p className="text-sm text-[#9898A4]">Describe the incident…</p>
          </div>
        </div>
        <div className="bg-[#FFFBEB] rounded-2xl p-4 border border-[#FDE68A]">
          <p className="text-xs font-semibold text-[#111] mb-1">Current Trip</p>
          <div className="flex justify-between text-xs">
            <span className="text-[#6E6E80]">TRP-2387 · Riyadh → Jeddah</span>
            <span className="text-[#D97706] font-semibold">In Transit</span>
          </div>
        </div>
        <button className="w-full py-4 rounded-2xl bg-[#DC2626] text-white font-bold text-base">Send Emergency Report</button>
      </div>
    </div>
  );
}

/* ─── 07 Replacement Driver Assigned ─────────────────────────────────────── */
function ReplacementDriverScreen() {
  return (
    <div className="flex flex-col h-full bg-white">
      <StatusBar />
      <div className="flex-1 flex flex-col px-6 pt-2 pb-6">
        <div className="flex-1 flex flex-col items-center justify-center text-center mb-4">
          <div className="w-20 h-20 rounded-full bg-[#F0FDF4] flex items-center justify-center mb-5">
            <CheckCircle2 size={40} className="text-[#16A34A]" />
          </div>
          <p className="text-xl font-bold text-[#111] mb-1">Replacement Assigned</p>
          <p className="text-sm text-[#6E6E80] leading-relaxed">Your operator has assigned a replacement driver to complete the trip.</p>
        </div>
        {/* Operator message */}
        <div className="bg-[#F5F5F7] rounded-2xl p-4 mb-4">
          <p className="text-[10px] font-semibold text-[#9898A4] uppercase tracking-wider mb-1.5">Message from Operator</p>
          <p className="text-sm text-[#444]">"Driver Faisal Baraka will continue TRP-2387. Please hand over the keys and documents."</p>
        </div>
        {/* Replacement driver card */}
        <div className="bg-white rounded-2xl p-4 border border-[#EBEBED] shadow-sm mb-4">
          <p className="text-[10px] font-semibold text-[#9898A4] uppercase tracking-wider mb-3">Replacement Driver</p>
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-full bg-[#2563EB] flex items-center justify-center text-white font-bold">FK</div>
            <div>
              <p className="text-sm font-bold text-[#111]">Faisal Baraka</p>
              <p className="text-xs text-[#6E6E80]">DRV-0088 · ★ 4.5 · +966 50 987 6543</p>
            </div>
            <button className="ml-auto w-9 h-9 rounded-xl bg-[#F0FDF4] flex items-center justify-center"><Phone size={16} className="text-[#16A34A]" /></button>
          </div>
        </div>
        {/* Vehicle */}
        <div className="flex items-center gap-3 p-3 rounded-xl bg-[#F5F5F7] mb-6">
          <Truck size={18} className="text-[#6E6E80]" />
          <span className="text-xs font-semibold text-[#111]">TRK-2041 · Hino 500 · 10 TON</span>
          <span className="ml-auto text-xs text-[#16A34A] font-semibold">Transferred</span>
        </div>
        <button className="w-full py-4 rounded-2xl bg-[#1A1A1A] text-white font-bold text-base">Return to Home</button>
      </div>
    </div>
  );
}

/* ─── 08 Destination Reached (Bottom Sheet) ──────────────────────────────── */
function DestinationReachedScreen() {
  return (
    <div className="flex flex-col h-full relative overflow-hidden">
      {/* Map bg */}
      <div className="absolute inset-0" style={{ background: "linear-gradient(170deg, #d8e8d8 0%, #c5d9c5 100%)" }}>
        <svg className="absolute inset-0 w-full h-full opacity-20"><line x1="0" y1="40%" x2="100%" y2="40%" stroke="#666" strokeWidth="0.5" /><line x1="50%" y1="0" x2="50%" y2="100%" stroke="#666" strokeWidth="0.5" /></svg>
      </div>
      <div className="absolute inset-0 bg-[rgba(0,0,0,0.4)]" />
      {/* Bottom sheet */}
      <div className="absolute bottom-0 left-0 right-0 bg-white rounded-t-3xl px-6 pb-8 pt-4 z-20">
        <div className="w-10 h-1 rounded-full bg-[#D8D8DC] mx-auto mb-6" />
        <div className="flex flex-col items-center text-center mb-6">
          <div className="w-16 h-16 rounded-full bg-[#F0FDF4] flex items-center justify-center mb-4">
            <MapPin size={28} className="text-[#16A34A]" />
          </div>
          <p className="text-xl font-bold text-[#111] mb-1">You Have Arrived!</p>
          <p className="text-sm text-[#6E6E80]">You have reached your destination at Jeddah Islamic Port.</p>
        </div>
        <div className="flex items-center gap-3 p-3 rounded-2xl bg-[#F5F5F7] mb-6">
          <div className="w-2 h-2 rounded-full bg-[#16A34A]" />
          <span className="text-xs font-semibold text-[#111]">Jeddah Islamic Port</span>
          <span className="ml-auto text-[10px] text-[#6E6E80]">Arrived 19:45</span>
        </div>
        <button className="w-full py-4 rounded-2xl bg-[#E8450F] text-white font-bold text-base mb-3">End Trip & Verify Delivery</button>
        <button className="w-full py-3 rounded-2xl bg-[#F0F0F2] text-sm font-semibold text-[#6E6E80]">Cancel</button>
      </div>
    </div>
  );
}

/* ─── 09 Delivery Verification ───────────────────────────────────────────── */
function DeliveryVerificationScreen() {
  return (
    <div className="flex flex-col h-full bg-[#F5F5F7]">
      <div className="bg-white px-5 pt-12 pb-4 flex items-center gap-3">
        <button className="w-9 h-9 rounded-xl bg-[#F5F5F7] flex items-center justify-center"><ChevronLeft size={20} className="text-[#444]" /></button>
        <div><p className="text-base font-bold text-[#111]">Delivery Verification</p><p className="text-xs text-[#6E6E80]">TRP-2387 · Jeddah Islamic Port</p></div>
      </div>
      <div className="flex-1 overflow-y-auto px-5 py-4 space-y-4">
        {/* Upload cargo photos */}
        <div className="bg-white rounded-2xl p-4 shadow-sm border border-black/[0.06]">
          <div className="flex items-center gap-2 mb-3">
            <div className="w-5 h-5 rounded-full bg-[#E8450F] flex items-center justify-center"><span className="text-[9px] font-bold text-white">1</span></div>
            <p className="text-sm font-bold text-[#111]">Cargo Photos</p>
            <span className="ml-auto text-xs text-[#16A34A] font-semibold">✓ 2 uploaded</span>
          </div>
          <div className="grid grid-cols-3 gap-2">
            {[true, true, false].map((done, i) => (
              <div key={i} className={`aspect-square rounded-xl flex items-center justify-center ${done ? "bg-[#F0FDF4] border border-[#BBF7D0]" : "bg-[#F5F5F7] border-2 border-dashed border-[#D8D8DC]"}`}>
                {done ? <CheckCircle2 size={18} className="text-[#16A34A]" /> : <Camera size={18} className="text-[#9898A4]" />}
              </div>
            ))}
          </div>
        </div>
        {/* Receiver signature */}
        <div className="bg-white rounded-2xl p-4 shadow-sm border border-black/[0.06]">
          <div className="flex items-center gap-2 mb-3">
            <div className="w-5 h-5 rounded-full bg-[#E8450F] flex items-center justify-center"><span className="text-[9px] font-bold text-white">2</span></div>
            <p className="text-sm font-bold text-[#111]">Receiver Signature</p>
          </div>
          <div className="h-24 rounded-xl border-2 border-dashed border-[#D8D8DC] bg-[#FAFAFA] flex flex-col items-center justify-center gap-1">
            <Edit2 size={20} className="text-[#D8D8DC]" />
            <p className="text-xs text-[#9898A4]">Sign here</p>
          </div>
          <div className="mt-3">
            <label className="text-xs font-semibold text-[#111] block mb-1.5">Receiver Name</label>
            <div className="px-4 py-3 rounded-xl bg-[#F5F5F7]">
              <p className="text-sm text-[#9898A4]">Enter receiver name…</p>
            </div>
          </div>
        </div>
        <button className="w-full py-4 rounded-2xl bg-[#E8450F] text-white font-bold text-base">Complete Trip</button>
      </div>
    </div>
  );
}

/* ─── 10 Trip Completed ───────────────────────────────────────────────────── */
function TripCompletedScreen() {
  return (
    <div className="flex flex-col h-full bg-white">
      <StatusBar />
      <div className="flex-1 flex flex-col px-6 pb-6">
        <div className="flex-1 flex flex-col items-center justify-center text-center">
          <div className="relative mb-6">
            <div className="w-24 h-24 rounded-full bg-[#F0FDF4] flex items-center justify-center">
              <CheckCircle2 size={48} className="text-[#16A34A]" />
            </div>
            <div className="absolute inset-0 rounded-full border-4 border-[rgba(22,163,74,0.2)] animate-ping" />
          </div>
          <span className="px-3 py-1 rounded-full bg-[#F0FDF4] text-[#16A34A] text-xs font-bold mb-4">COMPLETED</span>
          <p className="text-2xl font-bold text-[#111] mb-1">Trip Completed!</p>
          <p className="text-sm text-[#6E6E80]">TRP-2387 has been delivered successfully.</p>
        </div>
        {/* Trip summary */}
        <div className="bg-[#F5F5F7] rounded-2xl p-4 mb-6 space-y-2.5">
          {[["Trip ID", "TRP-2387"], ["Route", "Riyadh → Jeddah"], ["Distance", "974 km"], ["Duration", "8h 22m"], ["Cargo", "18,500 KG — General Goods"]].map(([k, v]) => (
            <div key={k} className="flex justify-between text-xs">
              <span className="text-[#6E6E80]">{k}</span>
              <span className="font-semibold text-[#111]">{v}</span>
            </div>
          ))}
        </div>
        <button className="w-full py-4 rounded-2xl bg-[#1A1A1A] text-white font-bold text-base">Return to Home</button>
      </div>
    </div>
  );
}

/* ─── 11 Trips ────────────────────────────────────────────────────────────── */
function TripsScreen() {
  const [tab, setTab] = useState<"Active" | "Upcoming" | "Completed">("Active");
  const trips = [
    { id: "TRP-2387", from: "Riyadh", to: "Jeddah", status: "In Transit", sc: "#2563EB", sb: "#EFF6FF", date: "Today" },
    { id: "TRP-2390", from: "Jeddah", to: "Tabouk", status: "Upcoming", sc: "#D97706", sb: "#FFFBEB", date: "Tomorrow" },
    { id: "TRP-2385", from: "Riyadh", to: "Dammam", status: "Completed", sc: "#16A34A", sb: "#F0FDF4", date: "23 May" },
  ];
  return (
    <div className="flex flex-col h-full bg-[#F5F5F7]">
      <div className="bg-white px-5 pt-12 pb-0">
        <p className="text-lg font-bold text-[#111] mb-3">My Trips</p>
        {/* Search */}
        <div className="flex items-center gap-2 px-3 py-2.5 rounded-xl bg-[#F5F5F7] mb-3">
          <Search size={15} className="text-[#9898A4]" />
          <span className="text-sm text-[#9898A4]">Search trips…</span>
        </div>
        {/* Tabs */}
        <div className="flex gap-0 border-b border-[#EBEBED]">
          {(["Active", "Upcoming", "Completed"] as const).map((t) => (
            <button key={t} onClick={() => setTab(t)} className={`flex-1 py-2.5 text-xs font-semibold border-b-2 transition-colors ${tab === t ? "border-[#E8450F] text-[#E8450F]" : "border-transparent text-[#6E6E80]"}`}>{t}</button>
          ))}
        </div>
      </div>
      <div className="flex-1 overflow-y-auto px-5 py-4 space-y-3">
        {trips.map((t) => (
          <div key={t.id} className="bg-white rounded-2xl p-4 shadow-sm border border-black/[0.06]">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-mono font-bold text-[#E8450F]">{t.id}</span>
              <span className="text-xs font-semibold px-2 py-0.5 rounded-full" style={{ color: t.sc, background: t.sb }}>{t.status}</span>
            </div>
            <div className="flex items-center gap-2 text-xs text-[#444] mb-2">
              <MapPin size={11} className="text-[#E8450F]" />{t.from}
              <ArrowRight size={10} className="text-[#9898A4]" />
              <MapPin size={11} className="text-[#6E6E80]" />{t.to}
            </div>
            <div className="flex justify-between items-center">
              <span className="text-[10px] text-[#9898A4]">{t.date}</span>
              <ChevronRight size={14} className="text-[#D8D8DC]" />
            </div>
          </div>
        ))}
      </div>
      <DriverNav active="Trips" />
    </div>
  );
}

/* ─── 12 Notifications ───────────────────────────────────────────────────── */
function NotificationsScreen() {
  const notifs = [
    { icon: Truck, color: "#2563EB", bg: "#EFF6FF", title: "Trip TRP-2388 Assigned", body: "New trip assigned: Riyadh → Abha, 12 TON", time: "2 min", unread: true },
    { icon: AlertTriangle, color: "#D97706", bg: "#FFFBEB", title: "Document Expiring", body: "Your Iqama expires in 14 days. Renew now.", time: "1 hr", unread: true },
    { icon: CheckCircle2, color: "#16A34A", bg: "#F0FDF4", title: "Trip TRP-2385 Closed", body: "Trip completed and billing processed.", time: "2 hr", unread: false },
    { icon: Shield, color: "#7C3AED", bg: "#F5F3FF", title: "Insurance Renewed", body: "Vehicle TRK-2041 insurance renewed until 2026.", time: "Yesterday", unread: false },
  ];
  return (
    <div className="flex flex-col h-full bg-[#F5F5F7]">
      <div className="bg-white px-5 pt-12 pb-4 flex items-center justify-between">
        <p className="text-lg font-bold text-[#111]">Notifications</p>
        <button className="text-xs text-[#E8450F] font-semibold">Mark all read</button>
      </div>
      <div className="flex-1 overflow-y-auto px-5 py-4 space-y-2">
        {notifs.map((n, i) => (
          <div key={i} className={`flex items-start gap-3 p-4 rounded-2xl border shadow-sm ${n.unread ? "bg-white border-[rgba(232,69,15,0.1)]" : "bg-white border-black/[0.06]"}`}>
            <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0" style={{ background: n.bg }}>
              <n.icon size={18} style={{ color: n.color }} />
            </div>
            <div className="flex-1 min-w-0">
              <p className={`text-sm ${n.unread ? "font-bold" : "font-medium"} text-[#111]`}>{n.title}</p>
              <p className="text-xs text-[#6E6E80] mt-0.5 leading-relaxed">{n.body}</p>
            </div>
            <div className="flex flex-col items-end gap-2 shrink-0">
              <span className="text-[10px] text-[#9898A4]">{n.time}</span>
              {n.unread && <div className="w-2 h-2 rounded-full bg-[#E8450F]" />}
            </div>
          </div>
        ))}
      </div>
      <DriverNav active="Home" />
    </div>
  );
}

/* ─── 13 Profile ──────────────────────────────────────────────────────────── */
function ProfileScreen() {
  return (
    <div className="flex flex-col h-full bg-[#F5F5F7]">
      <div className="bg-white px-5 pt-12 pb-5">
        <div className="flex items-center gap-4">
          <div className="w-16 h-16 rounded-2xl bg-[#E8450F] flex items-center justify-center text-white text-xl font-bold shadow-sm">AK</div>
          <div className="flex-1">
            <p className="text-lg font-bold text-[#111]">Ahmed Kareem</p>
            <p className="text-xs text-[#6E6E80]">DRV-0041 · +966 50 123 4567</p>
            <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-[#FFF0EB] text-[#E8450F]">Mercon Logistics</span>
          </div>
          <div className="flex flex-col items-center gap-0.5"><Star size={14} className="text-[#D97706] fill-[#D97706]" /><span className="text-xs font-bold text-[#111]">4.7</span></div>
        </div>
      </div>
      <div className="flex-1 overflow-y-auto px-5 py-4 space-y-3">
        {/* Quick actions */}
        <div className="grid grid-cols-3 gap-3">
          {[{ icon: FileText, label: "Documents", color: "#2563EB", bg: "#EFF6FF" }, { icon: Truck, label: "My Vehicle", color: "#E8450F", bg: "#FFF0EB" }, { icon: Settings, label: "Settings", color: "#6E6E80", bg: "#F5F5F7" }].map((a) => (
            <button key={a.label} className="flex flex-col items-center gap-2 p-4 bg-white rounded-2xl shadow-sm border border-black/[0.06]">
              <div className="w-9 h-9 rounded-xl flex items-center justify-center" style={{ background: a.bg }}><a.icon size={18} style={{ color: a.color }} /></div>
              <p className="text-[10px] font-semibold text-[#111]">{a.label}</p>
            </button>
          ))}
        </div>
        {/* Stats */}
        <div className="bg-white rounded-2xl p-4 shadow-sm border border-black/[0.06]">
          <p className="text-xs font-bold text-[#111] mb-3">Performance</p>
          <div className="grid grid-cols-3 gap-2 text-center">
            {[["1,248", "Total Trips"], ["94%", "On-Time"], ["4.7★", "Rating"]].map(([v, l]) => (
              <div key={l}><p className="text-base font-bold text-[#E8450F]">{v}</p><p className="text-[9px] text-[#6E6E80]">{l}</p></div>
            ))}
          </div>
        </div>
        {/* Rows */}
        {[{ icon: Bell, label: "Notifications" }, { icon: Globe, label: "Language" }, { icon: Info, label: "About App" }, { icon: Lock, label: "Privacy Policy" }].map((row) => (
          <div key={row.label} className="flex items-center gap-3 px-4 py-3.5 bg-white rounded-2xl shadow-sm border border-black/[0.06]">
            <div className="w-8 h-8 rounded-xl bg-[#F5F5F7] flex items-center justify-center"><row.icon size={16} className="text-[#6E6E80]" /></div>
            <p className="text-sm font-semibold text-[#111] flex-1">{row.label}</p>
            <ChevronRight size={16} className="text-[#D8D8DC]" />
          </div>
        ))}
        <button className="w-full flex items-center gap-3 px-4 py-3.5 bg-[#FEF2F2] rounded-2xl border border-[#FECACA]">
          <div className="w-8 h-8 rounded-xl bg-[#FEE2E2] flex items-center justify-center"><LogOut size={16} className="text-[#DC2626]" /></div>
          <p className="text-sm font-bold text-[#DC2626] flex-1">Logout</p>
        </button>
      </div>
      <DriverNav active="Profile" />
    </div>
  );
}

/* ─── 14 Documents ────────────────────────────────────────────────────────── */
function DocumentsScreen() {
  const docs = [
    { name: "Driving License", exp: "12 Aug 2027", status: "Active", sc: "#16A34A", sb: "#F0FDF4" },
    { name: "Iqama", exp: "03 Jul 2025", status: "Expiring", sc: "#D97706", sb: "#FFFBEB" },
    { name: "National ID", exp: "18 Sep 2028", status: "Active", sc: "#16A34A", sb: "#F0FDF4" },
    { name: "Medical Certificate", exp: "01 Mar 2025", status: "Expired", sc: "#DC2626", sb: "#FEF2F2" },
  ];
  return (
    <div className="flex flex-col h-full bg-[#F5F5F7]">
      <div className="bg-white px-5 pt-12 pb-4 flex items-center gap-3">
        <button className="w-9 h-9 rounded-xl bg-[#F5F5F7] flex items-center justify-center"><ChevronLeft size={20} className="text-[#444]" /></button>
        <p className="text-base font-bold text-[#111]">My Documents</p>
      </div>
      <div className="flex-1 overflow-y-auto px-5 py-4 space-y-3">
        {docs.map((d) => (
          <div key={d.name} className="bg-white rounded-2xl p-4 shadow-sm border border-black/[0.06]">
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-xl bg-[#F5F5F7] flex items-center justify-center shrink-0"><FileText size={18} className="text-[#6E6E80]" /></div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-0.5">
                  <p className="text-sm font-bold text-[#111]">{d.name}</p>
                  <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full" style={{ color: d.sc, background: d.sb }}>{d.status}</span>
                </div>
                <p className="text-xs text-[#6E6E80]">Expires: {d.exp}</p>
              </div>
            </div>
            {d.status === "Expiring" && (
              <div className="mt-3 flex items-center gap-2 px-3 py-2 rounded-xl bg-[#FFFBEB]">
                <AlertTriangle size={13} className="text-[#D97706]" />
                <p className="text-xs text-[#D97706] font-medium">Expires in 14 days</p>
              </div>
            )}
            <div className="flex gap-2 mt-3">
              <button className="flex-1 py-2 rounded-xl bg-[#F5F5F7] text-xs font-semibold text-[#444] flex items-center justify-center gap-1.5"><Eye size={13} /> View</button>
              <button className="flex-1 py-2 rounded-xl bg-[#F5F5F7] text-xs font-semibold text-[#444] flex items-center justify-center gap-1.5"><Download size={13} /> Download</button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ─── 15 Assigned Vehicle ─────────────────────────────────────────────────── */
function AssignedVehicleScreen() {
  return (
    <div className="flex flex-col h-full bg-[#F5F5F7]">
      <div className="bg-[#1C1C2E] px-5 pt-12 pb-5">
        <div className="flex items-center gap-3 mb-4">
          <button className="w-9 h-9 rounded-xl bg-[rgba(255,255,255,0.1)] flex items-center justify-center"><ChevronLeft size={20} className="text-white" /></button>
          <p className="text-base font-bold text-white">Assigned Vehicle</p>
        </div>
        <div className="flex items-start justify-between">
          <div>
            <p className="text-2xl font-bold text-white">TRK-2041</p>
            <p className="text-sm text-[rgba(255,255,255,0.5)]">Hino 500 · 10 TON · 2024</p>
          </div>
          <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-[rgba(22,163,74,0.2)] text-[#4ADE80]">Available</span>
        </div>
        <div className="mt-4 flex justify-center">
          <div className="w-32 h-20 rounded-2xl bg-[rgba(255,255,255,0.1)] flex items-center justify-center">
            <Truck size={48} className="text-[rgba(255,255,255,0.4)]" />
          </div>
        </div>
      </div>
      <div className="flex-1 overflow-y-auto px-5 py-4 space-y-3">
        <div className="bg-white rounded-2xl p-4 shadow-sm border border-black/[0.06]">
          <p className="text-xs font-bold text-[#111] mb-3">Vehicle Information</p>
          <div className="grid grid-cols-2 gap-2">
            {[["Plate", "ABC-1234"], ["Model", "Hino 500"], ["Capacity", "10 TON"], ["Fuel", "Diesel"], ["Year", "2024"], ["Mileage", "248,320 km"]].map(([k, v]) => (
              <div key={k} className="p-2.5 rounded-xl bg-[#F5F5F7]">
                <p className="text-[9px] text-[#9898A4]">{k}</p>
                <p className="text-xs font-semibold text-[#111] mt-0.5">{v}</p>
              </div>
            ))}
          </div>
        </div>
        <div className="bg-white rounded-2xl p-4 shadow-sm border border-black/[0.06]">
          <p className="text-xs font-bold text-[#111] mb-3">Document Status</p>
          {[["Insurance", "Active", "#16A34A", "#F0FDF4"], ["Fahas", "Active", "#16A34A", "#F0FDF4"], ["Istimara", "Expiring", "#D97706", "#FFFBEB"], ["SASO", "Active", "#16A34A", "#F0FDF4"]].map(([name, status, color, bg]) => (
            <div key={name as string} className="flex items-center justify-between py-2 border-b border-[#F5F5F7] last:border-0">
              <div className="flex items-center gap-2"><Shield size={14} className="text-[#6E6E80]" /><span className="text-xs font-medium text-[#111]">{name}</span></div>
              <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full" style={{ color: color as string, background: bg as string }}>{status}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

/* ─── 16 Settings ─────────────────────────────────────────────────────────── */
function SettingsScreen() {
  const [notifs, setNotifs] = useState(true);
  const groups = [
    {
      title: "Preferences",
      rows: [
        { icon: Bell, label: "Push Notifications", toggle: true, value: notifs, onToggle: () => setNotifs(!notifs) },
        { icon: Globe, label: "Language", value: "English" },
      ],
    },
    {
      title: "About",
      rows: [
        { icon: Info, label: "About Mercon", chevron: true },
        { icon: Shield, label: "Privacy Policy", chevron: true },
        { icon: FileText, label: "Terms of Service", chevron: true },
        { icon: Star, label: "Rate the App", chevron: true },
      ],
    },
  ];
  return (
    <div className="flex flex-col h-full bg-[#F5F5F7]">
      <div className="bg-white px-5 pt-12 pb-4 flex items-center gap-3">
        <button className="w-9 h-9 rounded-xl bg-[#F5F5F7] flex items-center justify-center"><ChevronLeft size={20} className="text-[#444]" /></button>
        <p className="text-base font-bold text-[#111]">Settings</p>
      </div>
      <div className="flex-1 overflow-y-auto px-5 py-4 space-y-5">
        {/* App version badge */}
        <div className="flex items-center gap-3 px-4 py-3 bg-white rounded-2xl shadow-sm border border-black/[0.06]">
          <div className="w-10 h-10 rounded-xl bg-[#FFF0EB] flex items-center justify-center">
            <ImageWithFallback src={macronLogo} alt="Mercon" className="w-7 h-7 object-contain" />
          </div>
          <div><p className="text-sm font-bold text-[#111]">Driver App</p><p className="text-xs text-[#6E6E80]">Version 2.1.4</p></div>
          <span className="ml-auto text-[10px] px-2 py-0.5 rounded-full bg-[#F0FDF4] text-[#16A34A] font-semibold">Up to date</span>
        </div>

        {groups.map((g) => (
          <div key={g.title}>
            <p className="text-[10px] font-bold uppercase tracking-widest text-[#9898A4] mb-2 px-1">{g.title}</p>
            <div className="space-y-1">
              {g.rows.map((row) => (
                <div key={row.label} className="flex items-center gap-3 px-4 py-3.5 bg-white rounded-2xl shadow-sm border border-black/[0.06]">
                  <div className="w-8 h-8 rounded-xl bg-[#F5F5F7] flex items-center justify-center"><row.icon size={16} className="text-[#6E6E80]" /></div>
                  <p className="text-sm font-semibold text-[#111] flex-1">{row.label}</p>
                  {(row as any).toggle ? (
                    <button onClick={(row as any).onToggle} className={`relative w-11 h-6 rounded-full transition-colors ${(row as any).value ? "bg-[#E8450F]" : "bg-[#D8D8DC]"}`}>
                      <span className={`absolute top-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform ${(row as any).value ? "translate-x-5" : "translate-x-0.5"}`} />
                    </button>
                  ) : (row as any).chevron ? (
                    <ChevronRight size={16} className="text-[#D8D8DC]" />
                  ) : (
                    <span className="text-xs text-[#6E6E80]">{(row as any).value}</span>
                  )}
                </div>
              ))}
            </div>
          </div>
        ))}

        <button className="w-full flex items-center gap-3 px-4 py-3.5 bg-[#FEF2F2] rounded-2xl border border-[#FECACA] mt-2">
          <div className="w-8 h-8 rounded-xl bg-[#FEE2E2] flex items-center justify-center"><LogOut size={16} className="text-[#DC2626]" /></div>
          <p className="text-sm font-bold text-[#DC2626] flex-1">Logout</p>
        </button>
      </div>
      <DriverNav active="Profile" />
    </div>
  );
}

/* ─── Screen registry ─────────────────────────────────────────────────────── */
const DRIVER_SCREENS = [
  { id: 1,  title: "Splash",                    component: SplashScreen },
  { id: 2,  title: "Login",                     component: LoginScreen },
  { id: 3,  title: "Home",                      component: HomeScreen },
  { id: 4,  title: "Pickup Verification",       component: PickupVerificationScreen },
  { id: 5,  title: "Live Navigation",           component: LiveNavigationScreen },
  { id: 6,  title: "Emergency",                 component: EmergencyScreen },
  { id: 7,  title: "Replacement Driver",        component: ReplacementDriverScreen },
  { id: 8,  title: "Destination Reached",       component: DestinationReachedScreen },
  { id: 9,  title: "Delivery Verification",     component: DeliveryVerificationScreen },
  { id: 10, title: "Trip Completed",            component: TripCompletedScreen },
  { id: 11, title: "Trips",                     component: TripsScreen },
  { id: 12, title: "Notifications",             component: NotificationsScreen },
  { id: 13, title: "Profile",                   component: ProfileScreen },
  { id: 14, title: "Documents",                 component: DocumentsScreen },
  { id: 15, title: "Assigned Vehicle",          component: AssignedVehicleScreen },
  { id: 16, title: "Settings",                  component: SettingsScreen },
];

/* ─── Main export ─────────────────────────────────────────────────────────── */
export function DriverAppSection() {
  const [active, setActive] = useState(1);
  const screen = DRIVER_SCREENS.find((s) => s.id === active)!;

  return (
    <div>
      <SectionHeader title="Driver App" desc="16 high-fidelity iPhone screens for the MERCON Driver Operations App." />

      {/* Screen selector */}
      <div className="flex flex-wrap gap-2 mb-8">
        {DRIVER_SCREENS.map((s) => (
          <button key={s.id} onClick={() => setActive(s.id)}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold transition-all ${active === s.id ? "bg-[#E8450F] text-white shadow-sm" : "bg-white text-[#444] border border-[#EBEBED] hover:border-[rgba(232,69,15,0.4)]"}`}>
            <span className={`text-[10px] font-mono ${active === s.id ? "text-[rgba(255,255,255,0.7)]" : "text-[#9898A4]"}`}>{String(s.id).padStart(2, "0")}</span>
            {s.title}
          </button>
        ))}
      </div>

      {/* Large phone preview */}
      <div className="flex justify-center mb-10">
        <PhoneFrame title={screen.title} screen={screen.id} total={DRIVER_SCREENS.length}>
          <screen.component />
        </PhoneFrame>
      </div>

      {/* All screens mini grid */}
      <div className="mb-4">
        <p className="text-xs font-semibold uppercase tracking-widest text-[#6E6E80] mb-4">All Screens — Flow Overview</p>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {DRIVER_SCREENS.map((s) => (
            <div key={s.id} onClick={() => setActive(s.id)} role="button" tabIndex={0}
              onKeyDown={(e) => e.key === "Enter" && setActive(s.id)}
              className={`group rounded-2xl overflow-hidden border-2 transition-all cursor-pointer ${active === s.id ? "border-[#E8450F] shadow-lg" : "border-transparent hover:border-[rgba(232,69,15,0.3)]"}`}>
              <div className="relative overflow-hidden rounded-xl" style={{ height: 200, background: "#1A1A1A" }}>
                <div className="absolute inset-0 scale-[0.42] origin-top-left pointer-events-none" style={{ width: "238%", height: "238%" }}>
                  <div style={{ width: 375, height: 476 }}>
                    <s.component />
                  </div>
                </div>
              </div>
              <div className="py-2 px-2 bg-white text-left">
                <p className="text-[10px] font-mono text-[#9898A4]">{String(s.id).padStart(2, "0")}</p>
                <p className="text-xs font-semibold text-[#111] truncate">{s.title}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
