import React, { useState } from "react";
import {
  Home, Truck, Users, MoreHorizontal, Plus, Bell, ChevronRight, ChevronLeft,
  MapPin, Package, Clock, CheckCircle2, AlertTriangle, Camera, Upload,
  FileText, Settings, Eye, Download, Phone, Mail, Shield, Search, Filter,
  ArrowRight, LogOut, Globe, Lock, Info, Star, Edit2, Trash2, X, Check,
  User, BarChart3, Fuel, Calendar, DollarSign, Navigation2, Loader2,
  ReceiptText, Building2, CreditCard, AlertCircle, ChevronDown, Paperclip
} from "lucide-react";
import macronLogo from "@/imports/MACRON_LOGO.jpeg";
import { ImageWithFallback } from "@/app/components/figma/ImageWithFallback";
import { SectionHeader } from "./common";
import { OPERATOR_CORE_SCREENS } from "./s_operator_screens";

/* ─── Shared chrome ───────────────────────────────────────────────────────── */
function OStatusBar({ light = false }: { light?: boolean }) {
  const c = light ? "text-white" : "text-[#111]";
  return (
    <div className={`h-11 flex items-end justify-between px-6 pb-1.5 shrink-0 ${c}`}>
      <span className="text-[13px] font-semibold">9:41</span>
      <div className="flex items-center gap-1 text-current">
        <svg width="16" height="12" viewBox="0 0 16 12" fill="currentColor"><rect x="0" y="4" width="3" height="8" rx="1" opacity=".4"/><rect x="4.5" y="2.5" width="3" height="9.5" rx="1" opacity=".7"/><rect x="9" y="0.5" width="3" height="11.5" rx="1"/><rect x="13.5" y="0" width="2.5" height="12" rx="1" opacity=".3"/></svg>
        <svg width="16" height="12" viewBox="0 0 24 18" fill="none" stroke="currentColor" strokeWidth="2"><path d="M1.5 6.5C5.5 2.5 10.5 0.5 12 0.5s6.5 2 10.5 6"/><path d="M4.5 9.5C7 7 9.5 6 12 6s5 1 7.5 3.5"/><path d="M7.5 12.5C9 11 10.5 10.5 12 10.5s3 .5 4.5 2"/><circle cx="12" cy="16" r="1.5" fill="currentColor"/></svg>
        <svg width="25" height="12" viewBox="0 0 25 12" fill="none"><rect x="0.5" y="0.5" width="21" height="11" rx="3.5" stroke="currentColor" strokeOpacity=".35"/><rect x="2" y="2" width="16" height="8" rx="2" fill="currentColor"/><path d="M23 4v4a2 2 0 0 0 0-4z" fill="currentColor" opacity=".4"/></svg>
      </div>
    </div>
  );
}

function OperatorNav({ active }: { active: "Home" | "Trips" | "Drivers" | "More" }) {
  const items = [
    { label: "Home",    icon: Home },
    { label: "Trips",   icon: Truck },
    { label: "Drivers", icon: Users },
    { label: "More",    icon: MoreHorizontal },
  ] as const;
  return (
    <div className="shrink-0 px-4 pb-6 pt-2">
      <div className="flex items-center px-3 py-2 rounded-full"
        style={{ background: "#1C1C2E", boxShadow: "0 8px 32px rgba(28,28,46,0.5)" }}>
        {items.slice(0, 2).map((item) => (
          <NavBtn key={item.label} label={item.label} icon={item.icon} active={active === item.label} />
        ))}
        {/* FAB */}
        <div className="flex-1 flex justify-center">
          <div className="w-12 h-12 rounded-full bg-white border-2 border-[#E8450F] flex items-center justify-center shadow-md">
            <Plus size={22} className="text-[#E8450F]" strokeWidth={2.5} />
          </div>
        </div>
        {items.slice(2).map((item) => (
          <NavBtn key={item.label} label={item.label} icon={item.icon} active={active === item.label} />
        ))}
      </div>
    </div>
  );
}

function NavBtn({ label, icon: Icon, active }: { label: string; icon: React.ElementType; active: boolean }) {
  return (
    <div className="flex-1 flex flex-col items-center gap-0.5 py-1">
      <Icon size={20} style={{ color: active ? "#E8450F" : "rgba(255,255,255,0.45)" }} strokeWidth={active ? 2.2 : 1.7} />
      <span className="text-[9px] font-semibold" style={{ color: active ? "#E8450F" : "rgba(255,255,255,0.45)" }}>{label}</span>
    </div>
  );
}

function OPhoneFrame({ children, title, screen }: { children: React.ReactNode; title: string; screen: number }) {
  return (
    <div className="flex flex-col items-center shrink-0">
      <div className="relative rounded-[44px] overflow-hidden flex flex-col"
        style={{ width: 375, height: 812, background: "#F5F5F7", border: "8px solid #1A1A1A", boxShadow: "0 24px 64px rgba(0,0,0,0.35), inset 0 0 0 1px rgba(255,255,255,0.08)" }}>
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-28 h-7 rounded-b-2xl z-20" style={{ background: "#1A1A1A" }} />
        <div className="flex flex-col h-full">{children}</div>
      </div>
      <div className="mt-4 text-center">
        <p className="text-xs font-bold text-[#111]">{String(screen).padStart(2, "0")} — {title}</p>
      </div>
    </div>
  );
}

/* ─── Shared form primitives ──────────────────────────────────────────────── */
function OInput({ label, value, placeholder, icon }: { label: string; value?: string; placeholder?: string; icon?: React.ReactNode }) {
  return (
    <div>
      <p className="text-xs font-semibold text-[#111] mb-1.5">{label}</p>
      <div className="flex items-center gap-2.5 px-4 py-3 rounded-2xl bg-[#F5F5F7]">
        {icon && <span className="text-[#9898A4]">{icon}</span>}
        <span className={`text-sm ${value ? "text-[#111]" : "text-[#9898A4]"}`}>{value ?? placeholder}</span>
      </div>
    </div>
  );
}

function OHeader({ title, subtitle, back = true, action }: { title: string; subtitle?: string; back?: boolean; action?: React.ReactNode }) {
  return (
    <div className="bg-white px-5 pt-11 pb-4 shrink-0">
      <div className="flex items-center gap-3">
        {back && <div className="w-9 h-9 rounded-2xl bg-[#F5F5F7] flex items-center justify-center shrink-0"><ChevronLeft size={20} className="text-[#444]" /></div>}
        <div className="flex-1">
          <p className="text-base font-bold text-[#111]">{title}</p>
          {subtitle && <p className="text-xs text-[#6E6E80]">{subtitle}</p>}
        </div>
        {action}
      </div>
    </div>
  );
}

function StickyActions({ cancel = "Cancel", confirm = "Save Changes", danger = false }: { cancel?: string; confirm?: string; danger?: boolean }) {
  return (
    <div className="shrink-0 bg-white border-t border-black/[0.06] px-5 py-4 flex gap-3">
      <div className="flex-1 py-3 rounded-2xl bg-[#F0F0F2] flex items-center justify-center">
        <p className="text-sm font-semibold text-[#444]">{cancel}</p>
      </div>
      <div className={`flex-1 py-3 rounded-2xl flex items-center justify-center ${danger ? "bg-[#DC2626]" : "bg-[#E8450F]"}`}>
        <p className="text-sm font-bold text-white">{confirm}</p>
      </div>
    </div>
  );
}

function UploadBox({ label, done = false }: { label: string; done?: boolean }) {
  return (
    <div className={`flex items-center gap-3 p-3.5 rounded-2xl border-2 ${done ? "border-[#BBF7D0] bg-[#F0FDF4]" : "border-dashed border-[#D8D8DC] bg-[#FAFAFA]"}`}>
      <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${done ? "bg-[#DCFCE7]" : "bg-[#F5F5F7]"}`}>
        {done ? <CheckCircle2 size={18} className="text-[#16A34A]" /> : <Upload size={18} className="text-[#9898A4]" />}
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-xs font-semibold text-[#111] truncate">{label}</p>
        <p className={`text-[10px] mt-0.5 ${done ? "text-[#16A34A]" : "text-[#9898A4]"}`}>{done ? "Uploaded · PDF" : "Tap to upload"}</p>
      </div>
      {!done && <Upload size={16} className="text-[#9898A4] shrink-0" />}
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════════════════ */
/* 01 EDIT TRIP                                                                 */
/* ═══════════════════════════════════════════════════════════════════════════ */
function EditTripScreen() {
  return (
    <div className="flex flex-col h-full bg-[#F5F5F7]">
      <OHeader title="Edit Trip" subtitle="TRP-2387" />
      <div className="flex-1 overflow-y-auto px-5 py-4 space-y-4">
        <div className="bg-white rounded-2xl p-4 shadow-sm space-y-4">
          <p className="text-xs font-bold text-[#9898A4] uppercase tracking-wider">Route</p>
          <OInput label="Pickup Location" value="Riyadh Industrial City, Gate 3" icon={<MapPin size={15} className="text-[#E8450F]" />} />
          <OInput label="Destination" value="Jeddah Islamic Port, Terminal 2" icon={<MapPin size={15} className="text-[#6E6E80]" />} />
        </div>
        <div className="bg-white rounded-2xl p-4 shadow-sm space-y-4">
          <p className="text-xs font-bold text-[#9898A4] uppercase tracking-wider">Cargo</p>
          <OInput label="Cargo Type" value="General Goods" icon={<Package size={15} />} />
          <OInput label="Weight (KG)" value="18,500" />
          <OInput label="Schedule" value="24 May 2025, 08:00 AM" icon={<Calendar size={15} />} />
        </div>
        <div className="bg-white rounded-2xl p-4 shadow-sm space-y-4">
          <p className="text-xs font-bold text-[#9898A4] uppercase tracking-wider">Assignment</p>
          <div>
            <p className="text-xs font-semibold text-[#111] mb-1.5">Truck</p>
            <div className="flex items-center gap-2.5 px-4 py-3 rounded-2xl bg-[#F5F5F7] justify-between">
              <div className="flex items-center gap-2"><Truck size={15} className="text-[#6E6E80]" /><span className="text-sm text-[#111]">TRK-2041 · Hino 500</span></div>
              <ChevronDown size={14} className="text-[#9898A4]" />
            </div>
          </div>
          <div>
            <p className="text-xs font-semibold text-[#111] mb-1.5">Driver</p>
            <div className="flex items-center gap-2.5 px-4 py-3 rounded-2xl bg-[#F5F5F7] justify-between">
              <div className="flex items-center gap-2"><User size={15} className="text-[#6E6E80]" /><span className="text-sm text-[#111]">Ahmed Kareem</span></div>
              <ChevronDown size={14} className="text-[#9898A4]" />
            </div>
          </div>
        </div>
        <div className="bg-white rounded-2xl p-4 shadow-sm space-y-4">
          <p className="text-xs font-bold text-[#9898A4] uppercase tracking-wider">Pricing</p>
          <OInput label="Base Freight (SAR)" value="1,400" icon={<DollarSign size={15} />} />
          <OInput label="Internal Notes" placeholder="Add notes…" />
        </div>
      </div>
      <StickyActions confirm="Save Changes" />
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════════════════ */
/* 02 ADD DRIVER                                                                */
/* ═══════════════════════════════════════════════════════════════════════════ */
function AddDriverScreen() {
  return (
    <div className="flex flex-col h-full bg-[#F5F5F7]">
      <OHeader title="Add Driver" />
      <div className="flex-1 overflow-y-auto px-5 py-4 space-y-4">
        {/* Photo upload */}
        <div className="bg-white rounded-2xl p-5 shadow-sm flex flex-col items-center">
          <div className="relative mb-3">
            <div className="w-20 h-20 rounded-full bg-[#F5F5F7] flex items-center justify-center border-2 border-dashed border-[#D8D8DC]">
              <User size={32} className="text-[#D8D8DC]" />
            </div>
            <div className="absolute -bottom-1 -right-1 w-7 h-7 rounded-full bg-[#E8450F] flex items-center justify-center">
              <Camera size={14} className="text-white" />
            </div>
          </div>
          <p className="text-xs text-[#6E6E80]">Tap to add profile photo</p>
        </div>
        <div className="bg-white rounded-2xl p-4 shadow-sm space-y-4">
          <p className="text-xs font-bold text-[#9898A4] uppercase tracking-wider">Personal Information</p>
          <OInput label="Full Name" placeholder="Driver full name" icon={<User size={15} />} />
          <OInput label="Phone Number" placeholder="+966 50 000 0000" icon={<Phone size={15} />} />
          <OInput label="Email Address" placeholder="driver@email.com" icon={<Mail size={15} />} />
          <OInput label="National ID / Iqama" placeholder="ID number" icon={<Shield size={15} />} />
          <OInput label="Emergency Contact" placeholder="+966 50 000 0001" icon={<Phone size={15} />} />
        </div>
        <div className="bg-white rounded-2xl p-4 shadow-sm space-y-3">
          <p className="text-xs font-bold text-[#9898A4] uppercase tracking-wider">Documents</p>
          <UploadBox label="Driving License (PDF / JPG)" />
          <UploadBox label="National ID / Iqama" />
          <UploadBox label="Medical Certificate" />
        </div>
        <div className="bg-white rounded-2xl p-4 shadow-sm">
          <p className="text-xs font-bold text-[#9898A4] uppercase tracking-wider mb-3">Availability</p>
          <div className="flex items-center justify-between">
            <div><p className="text-sm font-semibold text-[#111]">Available for Assignment</p><p className="text-xs text-[#6E6E80]">Driver can be assigned to trips</p></div>
            <div className="w-11 h-6 rounded-full bg-[#E8450F] relative"><span className="absolute top-0.5 right-0.5 w-5 h-5 bg-white rounded-full shadow" /></div>
          </div>
        </div>
      </div>
      <StickyActions cancel="Cancel" confirm="Save Driver" />
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════════════════ */
/* 03 EDIT DRIVER                                                               */
/* ═══════════════════════════════════════════════════════════════════════════ */
function EditDriverScreen() {
  return (
    <div className="flex flex-col h-full bg-[#F5F5F7]">
      <OHeader title="Edit Driver" subtitle="DRV-0041 · Ahmed Kareem" />
      <div className="flex-1 overflow-y-auto px-5 py-4 space-y-4">
        <div className="bg-white rounded-2xl p-5 shadow-sm flex flex-col items-center">
          <div className="relative mb-2">
            <div className="w-20 h-20 rounded-full bg-[#E8450F] flex items-center justify-center text-white text-2xl font-bold">AK</div>
            <div className="absolute -bottom-1 -right-1 w-7 h-7 rounded-full bg-[#E8450F] flex items-center justify-center border-2 border-white">
              <Camera size={13} className="text-white" />
            </div>
          </div>
          <p className="text-sm font-bold text-[#111]">Ahmed Kareem</p>
          <p className="text-xs text-[#6E6E80]">DRV-0041 · ★ 4.7</p>
        </div>
        <div className="bg-white rounded-2xl p-4 shadow-sm space-y-4">
          <p className="text-xs font-bold text-[#9898A4] uppercase tracking-wider">Information</p>
          <OInput label="Full Name" value="Ahmed Kareem" icon={<User size={15} />} />
          <OInput label="Phone" value="+966 50 123 4567" icon={<Phone size={15} />} />
          <OInput label="Email" value="ahmed.kareem@mercon.sa" icon={<Mail size={15} />} />
          <OInput label="National ID" value="1012345678" icon={<Shield size={15} />} />
          <OInput label="License No." value="SA-DL-2019-00441" icon={<FileText size={15} />} />
          <OInput label="License Expiry" value="12 Aug 2027" icon={<Calendar size={15} />} />
        </div>
        <div className="bg-white rounded-2xl p-4 shadow-sm space-y-3">
          <p className="text-xs font-bold text-[#9898A4] uppercase tracking-wider">Documents</p>
          <UploadBox label="Driving License" done />
          <UploadBox label="National ID / Iqama" done />
          <UploadBox label="Medical Certificate" />
        </div>
      </div>
      <StickyActions confirm="Save Changes" />
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════════════════ */
/* 04 ADD CUSTOMER                                                              */
/* ═══════════════════════════════════════════════════════════════════════════ */
function AddCustomerScreen() {
  return (
    <div className="flex flex-col h-full bg-[#F5F5F7]">
      <OHeader title="Add Customer" />
      <div className="flex-1 overflow-y-auto px-5 py-4 space-y-4">
        <div className="bg-white rounded-2xl p-5 shadow-sm flex flex-col items-center">
          <div className="relative mb-2">
            <div className="w-20 h-20 rounded-2xl bg-[#F5F5F7] flex items-center justify-center border-2 border-dashed border-[#D8D8DC]">
              <Building2 size={30} className="text-[#D8D8DC]" />
            </div>
            <div className="absolute -bottom-1 -right-1 w-7 h-7 rounded-full bg-[#E8450F] flex items-center justify-center">
              <Camera size={13} className="text-white" />
            </div>
          </div>
          <p className="text-xs text-[#6E6E80]">Upload company logo</p>
        </div>
        <div className="bg-white rounded-2xl p-4 shadow-sm space-y-4">
          <p className="text-xs font-bold text-[#9898A4] uppercase tracking-wider">Company Details</p>
          <OInput label="Company Name" placeholder="e.g. Fahad Trading Co." icon={<Building2 size={15} />} />
          <OInput label="Contact Person" placeholder="Full name" icon={<User size={15} />} />
          <OInput label="Phone" placeholder="+966 55 000 0000" icon={<Phone size={15} />} />
          <OInput label="Email" placeholder="contact@company.com" icon={<Mail size={15} />} />
        </div>
        <div className="bg-white rounded-2xl p-4 shadow-sm space-y-4">
          <p className="text-xs font-bold text-[#9898A4] uppercase tracking-wider">Address</p>
          <OInput label="Business Address" placeholder="Street, City" icon={<MapPin size={15} />} />
          <OInput label="Billing Address" placeholder="Same as business" icon={<MapPin size={15} />} />
        </div>
        <div className="bg-white rounded-2xl p-4 shadow-sm space-y-3">
          <p className="text-xs font-bold text-[#9898A4] uppercase tracking-wider">Contract & Rates</p>
          <UploadBox label="Rate Card / Contract PDF" />
          <OInput label="Payment Terms" placeholder="Net 30 days" icon={<CreditCard size={15} />} />
          <OInput label="Notes" placeholder="Add internal notes…" />
        </div>
      </div>
      <StickyActions cancel="Cancel" confirm="Save Customer" />
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════════════════ */
/* 05 EDIT CUSTOMER                                                             */
/* ═══════════════════════════════════════════════════════════════════════════ */
function EditCustomerScreen() {
  return (
    <div className="flex flex-col h-full bg-[#F5F5F7]">
      <OHeader title="Edit Customer" subtitle="Fahad Trading Co." />
      <div className="flex-1 overflow-y-auto px-5 py-4 space-y-4">
        <div className="bg-white rounded-2xl p-4 shadow-sm space-y-4">
          <p className="text-xs font-bold text-[#9898A4] uppercase tracking-wider">Company Details</p>
          <OInput label="Company Name" value="Fahad Trading Co." icon={<Building2 size={15} />} />
          <OInput label="Contact Person" value="Fahad Al Harbi" icon={<User size={15} />} />
          <OInput label="Phone" value="+966 55 123 4567" icon={<Phone size={15} />} />
          <OInput label="Email" value="fahad@trading.sa" icon={<Mail size={15} />} />
        </div>
        <div className="bg-white rounded-2xl p-4 shadow-sm space-y-4">
          <p className="text-xs font-bold text-[#9898A4] uppercase tracking-wider">Address</p>
          <OInput label="Business Address" value="King Abdullah Rd, Riyadh" icon={<MapPin size={15} />} />
          <OInput label="Billing Address" value="Same as business" icon={<MapPin size={15} />} />
        </div>
        <div className="bg-white rounded-2xl p-4 shadow-sm space-y-4">
          <p className="text-xs font-bold text-[#9898A4] uppercase tracking-wider">Rates & Terms</p>
          <OInput label="Base Rate (SAR/km)" value="1.55" icon={<DollarSign size={15} />} />
          <OInput label="Payment Terms" value="Net 30 days" icon={<CreditCard size={15} />} />
          <OInput label="Notes" value="VIP client — priority dispatch" />
        </div>
      </div>
      <StickyActions confirm="Save Changes" />
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════════════════ */
/* 06 ADD VEHICLE                                                               */
/* ═══════════════════════════════════════════════════════════════════════════ */
function AddVehicleScreen() {
  return (
    <div className="flex flex-col h-full bg-[#F5F5F7]">
      <OHeader title="Add Vehicle" />
      <div className="flex-1 overflow-y-auto px-5 py-4 space-y-4">
        <div className="bg-white rounded-2xl p-4 shadow-sm">
          <div className="border-2 border-dashed border-[#D8D8DC] rounded-2xl h-28 flex flex-col items-center justify-center bg-[#FAFAFA] gap-2">
            <Camera size={24} className="text-[#D8D8DC]" />
            <p className="text-xs text-[#9898A4]">Upload vehicle photo</p>
          </div>
        </div>
        <div className="bg-white rounded-2xl p-4 shadow-sm space-y-4">
          <p className="text-xs font-bold text-[#9898A4] uppercase tracking-wider">Vehicle Information</p>
          <OInput label="Registration Number" placeholder="TRK-XXXX" icon={<Truck size={15} />} />
          <OInput label="Plate Number" placeholder="ABC-1234" />
          <OInput label="Model / Make" placeholder="e.g. Hino 500" />
          <OInput label="Year" placeholder="2024" icon={<Calendar size={15} />} />
          <OInput label="VIN Number" placeholder="Vehicle ID number" />
          <div className="grid grid-cols-2 gap-3">
            <OInput label="Capacity (TON)" placeholder="10" />
            <div>
              <p className="text-xs font-semibold text-[#111] mb-1.5">Fuel Type</p>
              <div className="flex items-center gap-2.5 px-4 py-3 rounded-2xl bg-[#F5F5F7] justify-between">
                <div className="flex items-center gap-2"><Fuel size={15} className="text-[#6E6E80]" /><span className="text-sm text-[#9898A4]">Diesel</span></div>
                <ChevronDown size={14} className="text-[#9898A4]" />
              </div>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-2xl p-4 shadow-sm">
          <p className="text-xs font-bold text-[#9898A4] uppercase tracking-wider mb-3">Assigned Driver</p>
          <div className="flex items-center gap-2.5 px-4 py-3 rounded-2xl bg-[#F5F5F7] justify-between">
            <div className="flex items-center gap-2"><User size={15} className="text-[#6E6E80]" /><span className="text-sm text-[#9898A4]">Select driver</span></div>
            <ChevronDown size={14} className="text-[#9898A4]" />
          </div>
        </div>
        <div className="bg-white rounded-2xl p-4 shadow-sm space-y-3">
          <p className="text-xs font-bold text-[#9898A4] uppercase tracking-wider">Documents</p>
          <UploadBox label="Vehicle Registration" />
          <UploadBox label="Insurance Certificate" />
          <UploadBox label="Permit / License" />
        </div>
      </div>
      <StickyActions cancel="Cancel" confirm="Save Vehicle" />
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════════════════ */
/* 07 EDIT VEHICLE                                                              */
/* ═══════════════════════════════════════════════════════════════════════════ */
function EditVehicleScreen() {
  return (
    <div className="flex flex-col h-full bg-[#F5F5F7]">
      <OHeader title="Edit Vehicle" subtitle="TRK-2041 · Hino 500" />
      <div className="flex-1 overflow-y-auto px-5 py-4 space-y-4">
        <div className="bg-[#1C1C2E] rounded-2xl p-4 flex items-center justify-between">
          <div>
            <p className="text-lg font-bold text-white">TRK-2041</p>
            <p className="text-xs text-[rgba(255,255,255,0.5)]">Hino 500 · 10 TON · 2024</p>
          </div>
          <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-[rgba(22,163,74,0.2)] text-[#4ADE80]">Available</span>
        </div>
        <div className="bg-white rounded-2xl p-4 shadow-sm space-y-4">
          <p className="text-xs font-bold text-[#9898A4] uppercase tracking-wider">Vehicle Details</p>
          <OInput label="Registration No." value="TRK-2041" icon={<Truck size={15} />} />
          <OInput label="Plate Number" value="ABC-1234" />
          <OInput label="Model" value="Hino 500" />
          <OInput label="Year" value="2024" icon={<Calendar size={15} />} />
          <OInput label="Capacity (TON)" value="10" />
          <OInput label="Fuel Type" value="Diesel" icon={<Fuel size={15} />} />
        </div>
        <div className="bg-white rounded-2xl p-4 shadow-sm">
          <p className="text-xs font-bold text-[#9898A4] uppercase tracking-wider mb-3">Assigned Driver</p>
          <div className="flex items-center gap-3 px-4 py-3 rounded-2xl bg-[#F5F5F7] justify-between">
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-full bg-[#E8450F] flex items-center justify-center text-white text-[10px] font-bold">AK</div>
              <span className="text-sm text-[#111]">Ahmed Kareem</span>
            </div>
            <ChevronDown size={14} className="text-[#9898A4]" />
          </div>
        </div>
        <div className="bg-white rounded-2xl p-4 shadow-sm space-y-3">
          <p className="text-xs font-bold text-[#9898A4] uppercase tracking-wider">Documents</p>
          <UploadBox label="Vehicle Registration" done />
          <UploadBox label="Insurance Certificate" done />
          <UploadBox label="Permit / License" />
        </div>
      </div>
      <StickyActions confirm="Save Changes" />
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════════════════ */
/* 08 CREATE RATE CARD                                                          */
/* ═══════════════════════════════════════════════════════════════════════════ */
function CreateRateCardScreen() {
  return (
    <div className="flex flex-col h-full bg-[#F5F5F7]">
      <OHeader title="Create Rate Card" />
      <div className="flex-1 overflow-y-auto px-5 py-4 space-y-4">
        <div className="bg-white rounded-2xl p-4 shadow-sm space-y-4">
          <p className="text-xs font-bold text-[#9898A4] uppercase tracking-wider">Route & Customer</p>
          <div>
            <p className="text-xs font-semibold text-[#111] mb-1.5">Customer</p>
            <div className="flex items-center gap-2.5 px-4 py-3 rounded-2xl bg-[#F5F5F7] justify-between">
              <div className="flex items-center gap-2"><Building2 size={15} className="text-[#6E6E80]" /><span className="text-sm text-[#9898A4]">Select customer</span></div>
              <ChevronDown size={14} className="text-[#9898A4]" />
            </div>
          </div>
          <OInput label="Pickup City" value="Riyadh" icon={<MapPin size={15} className="text-[#E8450F]" />} />
          <OInput label="Destination City" value="Jeddah" icon={<MapPin size={15} className="text-[#6E6E80]" />} />
          <div>
            <p className="text-xs font-semibold text-[#111] mb-1.5">Vehicle Type</p>
            <div className="flex items-center gap-2.5 px-4 py-3 rounded-2xl bg-[#F5F5F7] justify-between">
              <div className="flex items-center gap-2"><Truck size={15} className="text-[#6E6E80]" /><span className="text-sm text-[#111]">10 TON Truck</span></div>
              <ChevronDown size={14} className="text-[#9898A4]" />
            </div>
          </div>
        </div>
        <div className="bg-white rounded-2xl p-4 shadow-sm space-y-4">
          <p className="text-xs font-bold text-[#9898A4] uppercase tracking-wider">Pricing Breakdown</p>
          <OInput label="Base Freight (SAR)" value="1,400.00" icon={<DollarSign size={15} />} />
          <OInput label="Fuel Surcharge (SAR)" value="180.00" icon={<Fuel size={15} />} />
          <OInput label="Loading Charges (SAR)" value="50.00" />
          <OInput label="Waiting Charges (SAR/hr)" value="40.00" icon={<Clock size={15} />} />
          <OInput label="Other Charges (SAR)" value="28.00" />
          <div className="flex items-center justify-between pt-3 border-t border-[#F0F0F2]">
            <p className="text-sm font-bold text-[#111]">Total Rate</p>
            <p className="text-lg font-bold text-[#E8450F]">SAR 1,698.00</p>
          </div>
        </div>
        <div className="bg-white rounded-2xl p-4 shadow-sm">
          <OInput label="Valid Until" value="31 Dec 2025" icon={<Calendar size={15} />} />
        </div>
      </div>
      <StickyActions cancel="Cancel" confirm="Save Rate Card" />
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════════════════ */
/* 09 UPLOAD RATE CARD DOCUMENTS                                                */
/* ═══════════════════════════════════════════════════════════════════════════ */
function UploadRateCardScreen() {
  return (
    <div className="flex flex-col h-full bg-[#F5F5F7]">
      <OHeader title="Upload Documents" subtitle="Rate Card · Fahad Trading Co." />
      <div className="flex-1 overflow-y-auto px-5 py-4 space-y-4">
        <div className="border-2 border-dashed border-[rgba(232,69,15,0.4)] rounded-2xl p-6 flex flex-col items-center bg-[#FFF8F6]">
          <div className="w-14 h-14 rounded-2xl bg-[#FFF0EB] flex items-center justify-center mb-3">
            <Upload size={26} className="text-[#E8450F]" />
          </div>
          <p className="text-sm font-bold text-[#111] mb-1">Drag & Drop Files</p>
          <p className="text-xs text-[#6E6E80] mb-4 text-center">PDF, JPG, PNG · Max 10MB each</p>
          <div className="flex gap-2">
            <div className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-[#1A1A1A] text-white text-xs font-semibold"><Camera size={13} /> Camera</div>
            <div className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-[#F0F0F2] text-[#444] text-xs font-semibold"><Upload size={13} /> Gallery</div>
            <div className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-[#F0F0F2] text-[#444] text-xs font-semibold"><FileText size={13} /> PDF</div>
          </div>
        </div>
        <div className="space-y-2">
          <p className="text-xs font-bold text-[#9898A4] uppercase tracking-wider">Uploaded Files</p>
          {[
            { name: "rate_card_fahad_2025.pdf", size: "1.2 MB", done: true },
            { name: "contract_signed.pdf",      size: "2.4 MB", done: true },
            { name: "addendum_jan2025.pdf",      size: "845 KB", done: false, pct: 72 },
          ].map((f, i) => (
            <div key={i} className={`flex items-center gap-3 p-3.5 rounded-2xl bg-white shadow-sm border ${f.done ? "border-black/[0.06]" : "border-[rgba(232,69,15,0.2)]"}`}>
              <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${f.done ? "bg-[#F0FDF4]" : "bg-[#FFF0EB]"}`}>
                <FileText size={18} className={f.done ? "text-[#16A34A]" : "text-[#E8450F]"} />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xs font-semibold text-[#111] truncate">{f.name}</p>
                {f.done ? (
                  <p className="text-[10px] text-[#16A34A] mt-0.5">✓ {f.size} · Uploaded</p>
                ) : (
                  <div className="mt-1.5">
                    <div className="h-1.5 rounded-full bg-[#EBEBED] overflow-hidden">
                      <div className="h-full rounded-full bg-[#E8450F]" style={{ width: `${f.pct}%` }} />
                    </div>
                    <p className="text-[10px] text-[#E8450F] mt-0.5">{f.pct}% uploading…</p>
                  </div>
                )}
              </div>
              <X size={14} className="text-[#9898A4] shrink-0" />
            </div>
          ))}
        </div>
      </div>
      <StickyActions cancel="Back" confirm="Submit Documents" />
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════════════════ */
/* 10 INVOICE LIST                                                              */
/* ═══════════════════════════════════════════════════════════════════════════ */
function InvoiceListScreen() {
  const invoices = [
    { id: "INV-2025-0489", customer: "Fahad Trading Co.", amount: "SAR 1,668", status: "Paid",    sc: "#16A34A", sb: "#F0FDF4", date: "24 May 25" },
    { id: "INV-2025-0488", customer: "Al-Rashid Group",  amount: "SAR 2,240", status: "Pending", sc: "#D97706", sb: "#FFFBEB", date: "23 May 25" },
    { id: "INV-2025-0487", customer: "Saudi Polymers",   amount: "SAR 3,120", status: "Overdue", sc: "#DC2626", sb: "#FEF2F2", date: "18 May 25" },
    { id: "INV-2025-0486", customer: "SABIC Trading",    amount: "SAR 1,890", status: "Draft",   sc: "#6E6E80", sb: "#F5F5F7", date: "15 May 25" },
  ];
  return (
    <div className="flex flex-col h-full bg-[#F5F5F7]">
      <div className="bg-white px-5 pt-11 pb-3">
        <div className="flex items-center justify-between mb-3">
          <p className="text-lg font-bold text-[#111]">Invoices</p>
          <div className="w-9 h-9 rounded-2xl bg-[#F5F5F7] flex items-center justify-center"><Filter size={16} className="text-[#444]" /></div>
        </div>
        <div className="flex items-center gap-2 px-3 py-2.5 rounded-xl bg-[#F5F5F7] mb-3">
          <Search size={15} className="text-[#9898A4]" />
          <span className="text-sm text-[#9898A4]">Search invoices…</span>
        </div>
      </div>
      <div className="flex-1 overflow-y-auto px-5 py-3 space-y-3">
        <div className="grid grid-cols-4 gap-2">
          {[["SAR 4.2K", "Pending", "#D97706", "#FFFBEB"], ["SAR 12.8K", "Paid", "#16A34A", "#F0FDF4"], ["SAR 1.9K", "Overdue", "#DC2626", "#FEF2F2"], ["2", "Draft", "#6E6E80", "#F5F5F7"]].map(([v, l, c, b]) => (
            <div key={l as string} className="rounded-2xl p-2.5 text-center" style={{ background: b as string }}>
              <p className="text-sm font-bold" style={{ color: c as string }}>{v}</p>
              <p className="text-[9px] font-medium mt-0.5" style={{ color: c as string }}>{l}</p>
            </div>
          ))}
        </div>
        {invoices.map((inv) => (
          <div key={inv.id} className="bg-white rounded-2xl p-4 shadow-sm border border-black/[0.06]">
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-xs font-mono font-bold text-[#E8450F]">{inv.id}</span>
              <span className="text-xs font-semibold px-2 py-0.5 rounded-full" style={{ color: inv.sc, background: inv.sb }}>{inv.status}</span>
            </div>
            <p className="text-sm font-semibold text-[#111]">{inv.customer}</p>
            <div className="flex items-center justify-between mt-2">
              <span className="text-base font-bold text-[#111]">{inv.amount}</span>
              <span className="text-[10px] text-[#9898A4]">{inv.date}</span>
            </div>
          </div>
        ))}
      </div>
      {/* FAB */}
      <div className="absolute bottom-24 right-5">
        <div className="w-14 h-14 rounded-full bg-[#E8450F] flex items-center justify-center shadow-xl" style={{ boxShadow: "0 4px 16px rgba(232,69,15,0.4)" }}>
          <Plus size={24} className="text-white" />
        </div>
      </div>
      <OperatorNav active="More" />
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════════════════ */
/* 11 INVOICE DETAILS                                                           */
/* ═══════════════════════════════════════════════════════════════════════════ */
function InvoiceDetailsScreen() {
  return (
    <div className="flex flex-col h-full bg-[#F5F5F7]">
      <OHeader title="Invoice Details" subtitle="INV-2025-0489"
        action={<div className="flex gap-2"><div className="w-9 h-9 rounded-2xl bg-[#F5F5F7] flex items-center justify-center"><Download size={16} className="text-[#444]" /></div></div>} />
      <div className="flex-1 overflow-y-auto px-5 py-4 space-y-4">
        <div className="bg-white rounded-2xl p-4 shadow-sm">
          <div className="flex items-center justify-between mb-3">
            <div>
              <p className="text-xs text-[#6E6E80]">Invoice Number</p>
              <p className="text-base font-bold text-[#111]">INV-2025-0489</p>
            </div>
            <span className="text-sm font-bold px-3 py-1.5 rounded-full bg-[#F0FDF4] text-[#16A34A]">Paid</span>
          </div>
          <div className="grid grid-cols-2 gap-3 text-xs">
            {[["Customer", "Fahad Trading Co."], ["Trip", "TRP-2387"], ["Issue Date", "24 May 2025"], ["Due Date", "23 Jun 2025"]].map(([k, v]) => (
              <div key={k}><p className="text-[#9898A4]">{k}</p><p className="font-semibold text-[#111] mt-0.5">{v}</p></div>
            ))}
          </div>
        </div>
        <div className="bg-white rounded-2xl p-4 shadow-sm">
          <p className="text-xs font-bold text-[#9898A4] uppercase tracking-wider mb-3">Pricing Breakdown</p>
          {[["Base Freight", "SAR 1,400.00"], ["Fuel Surcharge", "SAR 168.00"], ["Loading", "SAR 50.00"], ["Waiting", "SAR 50.00"]].map(([k, v]) => (
            <div key={k} className="flex justify-between text-sm py-2 border-b border-[#F5F5F7] last:border-0">
              <span className="text-[#6E6E80]">{k}</span><span className="font-medium text-[#111]">{v}</span>
            </div>
          ))}
          <div className="flex justify-between text-base font-bold pt-3 border-t border-[#EBEBED] mt-1">
            <span className="text-[#111]">Total</span><span className="text-[#E8450F]">SAR 1,668.00</span>
          </div>
        </div>
        <div className="bg-white rounded-2xl p-4 shadow-sm">
          <p className="text-xs font-bold text-[#9898A4] uppercase tracking-wider mb-3">Payment Timeline</p>
          {[{ label: "Invoice Issued", date: "24 May 2025", done: true }, { label: "Payment Received", date: "28 May 2025", done: true }, { label: "Reconciled", date: "28 May 2025", done: true }].map((t, i) => (
            <div key={i} className="flex items-center gap-3 py-2">
              <div className={`w-6 h-6 rounded-full flex items-center justify-center shrink-0 ${t.done ? "bg-[#16A34A]" : "bg-[#EBEBED]"}`}>
                {t.done && <Check size={12} className="text-white" />}
              </div>
              <div className="flex-1"><p className="text-xs font-semibold text-[#111]">{t.label}</p><p className="text-[10px] text-[#9898A4]">{t.date}</p></div>
            </div>
          ))}
        </div>
      </div>
      <div className="shrink-0 bg-white border-t border-black/[0.06] px-5 py-4 flex gap-2">
        <div className="flex-1 py-3 rounded-2xl bg-[#F0F0F2] flex items-center justify-center gap-2"><Download size={15} className="text-[#444]" /><p className="text-sm font-semibold text-[#444]">PDF</p></div>
        <div className="flex-1 py-3 rounded-2xl bg-[#F0F0F2] flex items-center justify-center gap-2"><Phone size={15} className="text-[#444]" /><p className="text-sm font-semibold text-[#444]">Share</p></div>
        <div className="flex-1 py-3 rounded-2xl bg-[#16A34A] flex items-center justify-center"><p className="text-sm font-bold text-white">Mark Paid</p></div>
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════════════════ */
/* 12 CREATE INVOICE                                                            */
/* ═══════════════════════════════════════════════════════════════════════════ */
function CreateInvoiceScreen() {
  return (
    <div className="flex flex-col h-full bg-[#F5F5F7]">
      <OHeader title="Create Invoice" subtitle="From Trip TRP-2387" />
      <div className="flex-1 overflow-y-auto px-5 py-4 space-y-4">
        <div className="bg-[#FFF0EB] rounded-2xl p-3 border border-[rgba(232,69,15,0.2)] flex items-center gap-2">
          <CheckCircle2 size={16} className="text-[#E8450F]" />
          <p className="text-xs font-semibold text-[#E8450F]">Auto-populated from TRP-2387 · TRK-2041 · Ahmed Kareem</p>
        </div>
        <div className="bg-white rounded-2xl p-4 shadow-sm space-y-3">
          <p className="text-xs font-bold text-[#9898A4] uppercase tracking-wider">Invoice Details</p>
          <OInput label="Customer" value="Fahad Trading Co." icon={<Building2 size={15} />} />
          <OInput label="Trip Reference" value="TRP-2387 · Riyadh → Jeddah" icon={<Truck size={15} />} />
          <OInput label="Invoice Date" value="24 May 2025" icon={<Calendar size={15} />} />
          <OInput label="Due Date" value="23 Jun 2025" icon={<Calendar size={15} />} />
        </div>
        <div className="bg-white rounded-2xl p-4 shadow-sm space-y-3">
          <p className="text-xs font-bold text-[#9898A4] uppercase tracking-wider">Pricing</p>
          <OInput label="Base Freight (SAR)" value="1,400.00" icon={<DollarSign size={15} />} />
          <OInput label="Fuel Surcharge (SAR)" value="168.00" icon={<Fuel size={15} />} />
          <OInput label="Additional Charges (SAR)" value="100.00" />
          <OInput label="VAT 15% (SAR)" value="250.20" />
          <OInput label="Discount (SAR)" placeholder="0.00" />
          <div className="flex items-center justify-between pt-3 border-t border-[#F0F0F2]">
            <p className="text-sm font-bold text-[#111]">Total (incl. VAT)</p>
            <p className="text-lg font-bold text-[#E8450F]">SAR 1,918.20</p>
          </div>
        </div>
        <div className="bg-white rounded-2xl p-4 shadow-sm">
          <OInput label="Remarks / Notes" placeholder="Add invoice notes…" />
        </div>
      </div>
      <StickyActions cancel="Discard" confirm="Generate Invoice" />
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════════════════ */
/* 13 OPERATOR PROFILE                                                          */
/* ═══════════════════════════════════════════════════════════════════════════ */
function OperatorProfileScreen() {
  return (
    <div className="flex flex-col h-full bg-[#F5F5F7]">
      <OHeader title="My Profile" back={false}
        action={<div className="w-9 h-9 rounded-2xl bg-[#FFF0EB] flex items-center justify-center"><Edit2 size={16} className="text-[#E8450F]" /></div>} />
      <div className="flex-1 overflow-y-auto px-5 py-3 space-y-4">
        <div className="bg-white rounded-2xl p-5 shadow-sm flex flex-col items-center">
          <div className="relative mb-3">
            <div className="w-20 h-20 rounded-full bg-[#1A1A1A] flex items-center justify-center text-white text-2xl font-bold">MH</div>
            <div className="absolute -bottom-1 -right-1 w-7 h-7 rounded-full bg-[#E8450F] flex items-center justify-center border-2 border-white"><Camera size={13} className="text-white" /></div>
          </div>
          <p className="text-lg font-bold text-[#111]">Mohammed Al-Harbi</p>
          <p className="text-xs text-[#6E6E80]">OPR-0012 · Fleet Operations Manager</p>
          <div className="flex items-center gap-1.5 mt-2 px-3 py-1 bg-[#FFF0EB] rounded-full">
            <Building2 size={12} className="text-[#E8450F]" />
            <span className="text-xs font-semibold text-[#E8450F]">Riyadh Branch · Mercon Logistics</span>
          </div>
        </div>
        <div className="grid grid-cols-3 gap-3">
          {[["128", "Trips Managed", "#E8450F"], ["94%", "On-Time Rate", "#16A34A"], ["4.8★", "Team Rating", "#D97706"]].map(([v, l, c]) => (
            <div key={l as string} className="bg-white rounded-2xl p-3 text-center shadow-sm">
              <p className="text-lg font-bold" style={{ color: c as string }}>{v}</p>
              <p className="text-[9px] text-[#6E6E80] mt-0.5">{l}</p>
            </div>
          ))}
        </div>
        <div className="bg-white rounded-2xl p-4 shadow-sm space-y-2.5">
          <p className="text-xs font-bold text-[#9898A4] uppercase tracking-wider mb-1">Contact</p>
          {[{ icon: Phone, label: "+966 55 456 7890" }, { icon: Mail, label: "m.harbi@mercon.sa" }].map((r) => (
            <div key={r.label} className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-xl bg-[#F5F5F7] flex items-center justify-center"><r.icon size={15} className="text-[#6E6E80]" /></div>
              <p className="text-sm text-[#111]">{r.label}</p>
            </div>
          ))}
        </div>
        {[{ icon: FileText, label: "My Documents" }, { icon: Settings, label: "Settings" }, { icon: Bell, label: "Notifications" }].map((row) => (
          <div key={row.label} className="flex items-center gap-3 px-4 py-3.5 bg-white rounded-2xl shadow-sm">
            <div className="w-8 h-8 rounded-xl bg-[#F5F5F7] flex items-center justify-center"><row.icon size={16} className="text-[#6E6E80]" /></div>
            <p className="text-sm font-semibold text-[#111] flex-1">{row.label}</p>
            <ChevronRight size={16} className="text-[#D8D8DC]" />
          </div>
        ))}
        <div className="flex items-center gap-3 px-4 py-3.5 bg-[#FEF2F2] rounded-2xl border border-[#FECACA]">
          <div className="w-8 h-8 rounded-xl bg-[#FEE2E2] flex items-center justify-center"><LogOut size={16} className="text-[#DC2626]" /></div>
          <p className="text-sm font-bold text-[#DC2626] flex-1">Logout</p>
        </div>
      </div>
      <OperatorNav active="More" />
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════════════════ */
/* 14 SETTINGS                                                                  */
/* ═══════════════════════════════════════════════════════════════════════════ */
function SettingsScreen() {
  const [notifTrips, setNotifTrips] = useState(true);
  const [notifDocs, setNotifDocs] = useState(true);
  const [biometric, setBiometric] = useState(false);
  const groups = [
    { title: "Notifications", rows: [
      { icon: Truck, label: "Trip Updates", toggle: true, val: notifTrips, set: setNotifTrips },
      { icon: FileText, label: "Document Alerts", toggle: true, val: notifDocs, set: setNotifDocs },
      { icon: Bell, label: "System Announcements", chevron: true },
    ]},
    { title: "Security", rows: [
      { icon: Lock, label: "Biometric Login", toggle: true, val: biometric, set: setBiometric },
      { icon: Shield, label: "Change Password", chevron: true },
      { icon: AlertCircle, label: "Active Sessions", chevron: true },
    ]},
    { title: "Preferences", rows: [
      { icon: Globe, label: "Language", value: "English", chevron: true },
      { icon: Star, label: "Appearance", value: "Light", chevron: true },
    ]},
    { title: "Support & Legal", rows: [
      { icon: Info, label: "Help Center", chevron: true },
      { icon: Mail, label: "Contact Support", chevron: true },
      { icon: FileText, label: "Terms of Service", chevron: true },
      { icon: Lock, label: "Privacy Policy", chevron: true },
    ]},
  ];
  return (
    <div className="flex flex-col h-full bg-[#F5F5F7]">
      <OHeader title="Settings" back={false} />
      <div className="flex-1 overflow-y-auto px-5 py-3 space-y-5">
        <div className="flex items-center gap-3 px-4 py-3.5 bg-white rounded-2xl shadow-sm">
          <div className="w-10 h-10 rounded-2xl bg-[#FFF0EB] flex items-center justify-center">
            <ImageWithFallback src={macronLogo} alt="Mercon" className="w-7 h-7 object-contain" />
          </div>
          <div><p className="text-sm font-bold text-[#111]">Operator App</p><p className="text-xs text-[#6E6E80]">v2.1.4 · Up to date</p></div>
        </div>
        {groups.map((g) => (
          <div key={g.title}>
            <p className="text-[10px] font-bold uppercase tracking-widest text-[#9898A4] mb-2 px-1">{g.title}</p>
            <div className="space-y-0.5">
              {g.rows.map((row: any) => (
                <div key={row.label} className="flex items-center gap-3 px-4 py-3.5 bg-white first:rounded-t-2xl last:rounded-b-2xl shadow-sm">
                  <div className="w-8 h-8 rounded-xl bg-[#F5F5F7] flex items-center justify-center"><row.icon size={16} className="text-[#6E6E80]" /></div>
                  <p className="text-sm font-semibold text-[#111] flex-1">{row.label}</p>
                  {row.toggle ? (
                    <button onClick={() => row.set(!row.val)} className={`relative w-11 h-6 rounded-full transition-colors ${row.val ? "bg-[#E8450F]" : "bg-[#D8D8DC]"}`}>
                      <span className={`absolute top-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform ${row.val ? "translate-x-5" : "translate-x-0.5"}`} />
                    </button>
                  ) : row.value ? (
                    <div className="flex items-center gap-1"><span className="text-xs text-[#6E6E80]">{row.value}</span><ChevronRight size={14} className="text-[#D8D8DC]" /></div>
                  ) : (
                    <ChevronRight size={16} className="text-[#D8D8DC]" />
                  )}
                </div>
              ))}
            </div>
          </div>
        ))}
        <div className="flex items-center gap-3 px-4 py-3.5 bg-[#FEF2F2] rounded-2xl border border-[#FECACA]">
          <div className="w-8 h-8 rounded-xl bg-[#FEE2E2] flex items-center justify-center"><LogOut size={16} className="text-[#DC2626]" /></div>
          <p className="text-sm font-bold text-[#DC2626] flex-1">Logout</p>
        </div>
      </div>
      <OperatorNav active="More" />
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════════════════ */
/* 15 LOGOUT CONFIRMATION                                                       */
/* ═══════════════════════════════════════════════════════════════════════════ */
function LogoutScreen() {
  return (
    <div className="flex flex-col h-full bg-[#F5F5F7]">
      <OStatusBar />
      <div className="flex-1 flex flex-col items-center justify-center px-6 text-center">
        <div className="w-24 h-24 rounded-3xl bg-[#FEF2F2] flex items-center justify-center mb-6">
          <LogOut size={40} className="text-[#DC2626]" />
        </div>
        <p className="text-2xl font-bold text-[#111] mb-2">Log Out?</p>
        <p className="text-sm text-[#6E6E80] leading-relaxed mb-8">You are about to log out of your Mercon Operator account. All unsaved changes will be lost.</p>
        <div className="w-full space-y-3">
          <div className="w-full py-4 rounded-2xl bg-[#DC2626] flex items-center justify-center">
            <p className="text-base font-bold text-white">Yes, Log Out</p>
          </div>
          <div className="w-full py-4 rounded-2xl bg-white border border-[#EBEBED] flex items-center justify-center shadow-sm">
            <p className="text-base font-semibold text-[#444]">Cancel</p>
          </div>
        </div>
      </div>
      <div className="pb-8 text-center">
        <p className="text-xs text-[#9898A4]">Mercon Logistics Services Company</p>
      </div>
    </div>
  );
}

/* ─── Screen registry ─────────────────────────────────────────────────────── */
export const OPERATOR_APP_SCREENS = [
  { id: 1,  group: "Trips",      title: "Edit Trip",                  component: EditTripScreen },
  { id: 2,  group: "Drivers",    title: "Add Driver",                 component: AddDriverScreen },
  { id: 3,  group: "Drivers",    title: "Edit Driver",                component: EditDriverScreen },
  { id: 4,  group: "Customers",  title: "Add Customer",               component: AddCustomerScreen },
  { id: 5,  group: "Customers",  title: "Edit Customer",              component: EditCustomerScreen },
  { id: 6,  group: "Vehicles",   title: "Add Vehicle",                component: AddVehicleScreen },
  { id: 7,  group: "Vehicles",   title: "Edit Vehicle",               component: EditVehicleScreen },
  { id: 8,  group: "Rate Cards", title: "Create Rate Card",           component: CreateRateCardScreen },
  { id: 9,  group: "Rate Cards", title: "Upload Documents",           component: UploadRateCardScreen },
  { id: 10, group: "Invoices",   title: "Invoice List",               component: InvoiceListScreen },
  { id: 11, group: "Invoices",   title: "Invoice Details",            component: InvoiceDetailsScreen },
  { id: 12, group: "Invoices",   title: "Create Invoice",             component: CreateInvoiceScreen },
  { id: 13, group: "Profile",    title: "Operator Profile",           component: OperatorProfileScreen },
  { id: 14, group: "Profile",    title: "Settings",                   component: SettingsScreen },
  { id: 15, group: "Profile",    title: "Logout Confirmation",        component: LogoutScreen },
];

const GROUPS = [...new Set(OPERATOR_APP_SCREENS.map((s) => s.group))];

/* ─── Combine both screen registries into one unified list ───────────────── */
// OPERATOR_APP_SCREENS uses { id, group, title, component }
// OPERATOR_CORE_SCREENS uses { n, g, t, C } — normalise to same shape
type UnifiedScreen = { id: number; group: string; title: string; Comp: React.ComponentType };

function buildAllScreens(): UnifiedScreen[] {
  const appScreens: UnifiedScreen[] = OPERATOR_APP_SCREENS.map((s) => ({
    id: s.id + 26,          // offset so IDs 27-41 follow the 26 core screens
    group: s.group,
    title: s.title,
    Comp:  s.component,
  }));
  const coreScreens: UnifiedScreen[] = OPERATOR_CORE_SCREENS.map((s) => ({
    id:    s.n,
    group: s.g,
    title: s.t,
    Comp:  s.C,
  }));
  return [...coreScreens, ...appScreens];
}

/* ─── Main export ─────────────────────────────────────────────────────────── */
export function OperatorAppSection() {
  const ALL_SCREENS = React.useMemo(buildAllScreens, []);
  const ALL_GROUPS  = React.useMemo(() => ["All", ...new Set(ALL_SCREENS.map((s) => s.group))], [ALL_SCREENS]);

  const [active,      setActive]      = useState(1);
  const [filterGroup, setFilterGroup] = useState("All");

  const screen   = ALL_SCREENS.find((s) => s.id === active) ?? ALL_SCREENS[0];
  const filtered = filterGroup === "All" ? ALL_SCREENS : ALL_SCREENS.filter((s) => s.group === filterGroup);

  return (
    <div>
      <SectionHeader
        title="Operator App"
        desc={`All 41 production-ready screens — 26 core flows + 15 new screens for the MERCON Operator mobile app.`}
      />

      {/* Stats */}
      <div className="flex flex-wrap gap-3 mb-6">
        {[["41", "Total Screens"], ["9", "Flow Groups"], ["26", "Core Screens"], ["15", "New Screens"]].map(([v, l]) => (
          <div key={l} className="flex items-center gap-2 px-4 py-2.5 bg-white rounded-2xl border border-[#EBEBED] shadow-sm">
            <span className="text-base font-bold text-[#E8450F]">{v}</span>
            <span className="text-xs text-[#6E6E80]">{l}</span>
          </div>
        ))}
      </div>

      {/* Group filter */}
      <div className="flex flex-wrap gap-2 mb-4">
        {ALL_GROUPS.map((g) => (
          <button key={g} onClick={() => setFilterGroup(g)}
            className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all ${filterGroup === g ? "bg-[#1A1A1A] text-white" : "bg-white text-[#444] border border-[#EBEBED] hover:border-[rgba(26,26,26,0.3)]"}`}>
            {g}
            {g !== "All" && (
              <span className="ml-1.5 text-[9px] opacity-60">
                {ALL_SCREENS.filter((s) => s.group === g).length}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Screen selector pills */}
      <div className="flex flex-wrap gap-2 mb-8">
        {filtered.map((s) => (
          <button key={s.id} onClick={() => setActive(s.id)}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold transition-all ${active === s.id ? "bg-[#E8450F] text-white shadow-sm" : "bg-white text-[#444] border border-[#EBEBED] hover:border-[rgba(232,69,15,0.4)]"}`}>
            <span className={`text-[10px] font-mono ${active === s.id ? "text-[rgba(255,255,255,0.7)]" : "text-[#9898A4]"}`}>
              {String(s.id).padStart(2, "0")}
            </span>
            {s.title}
          </button>
        ))}
      </div>

      {/* Large preview */}
      <div className="flex justify-center mb-10">
        <OPhoneFrame title={screen.title} screen={screen.id}>
          <screen.Comp />
        </OPhoneFrame>
      </div>

      {/* Full 41-screen thumbnail grid */}
      <p className="text-xs font-semibold uppercase tracking-widest text-[#6E6E80] mb-4">
        All 41 Screens — Complete Flow Overview
      </p>
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        {ALL_SCREENS.map((s) => (
          <div key={s.id} onClick={() => setActive(s.id)} role="button" tabIndex={0}
            onKeyDown={(e) => e.key === "Enter" && setActive(s.id)}
            className={`rounded-2xl overflow-hidden border-2 transition-all cursor-pointer ${active === s.id ? "border-[#E8450F] shadow-lg" : "border-transparent hover:border-[rgba(232,69,15,0.3)]"}`}>
            <div className="relative overflow-hidden" style={{ height: 180, background: "#1A1A1A" }}>
              <div className="absolute inset-0 pointer-events-none origin-top-left scale-[0.38]" style={{ width: "263%", height: "263%" }}>
                <div style={{ width: 375, height: 474 }}><s.Comp /></div>
              </div>
            </div>
            <div className="py-2 px-2 bg-white">
              <p className="text-[9px] font-mono text-[#9898A4]">{String(s.id).padStart(2, "0")} · {s.group}</p>
              <p className="text-xs font-semibold text-[#111] truncate">{s.title}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
