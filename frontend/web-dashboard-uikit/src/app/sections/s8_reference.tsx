import React, { useState } from "react";
import {
  ArrowUp, ArrowDown, Truck, Home, ChevronRight, ChevronLeft, ChevronDown,
  ChevronUp, ArrowRight, MoreHorizontal, Package, Shield, Fuel, Star,
  TrendingUp, Activity, Zap, Circle, Info, Check, X, Loader2, RotateCcw,
  Car, User, Image, File, CloudUpload, Paperclip, Layers, Navigation,
  WifiOff, Camera, PenLine, Grip, ToggleLeft, ToggleRight, SlidersHorizontal,
  Hash, DollarSign, Copy, QrCode, Timer, Minus, Route, Gauge, Wifi, Signal,
  Battery, AlertCircle, Lock, Wrench, CreditCard, ReceiptText, Flame,
  Megaphone, Construction, Sparkles, Globe, RadioTower, Milestone,
  Navigation2, LocateFixed, FileText, Download, Eye, EyeOff, Calendar,
  Upload, Phone, Mail, Filter, Edit2, Trash2, Bell, Settings, Users,
  Plus, Search, AlertTriangle, CheckCircle2, XCircle, BarChart3, MapPin, Clock
} from "lucide-react";
import { Card, SectionHeader, SubHeader } from "./common";

/* ═══════════════════════════════════════════════════════════════════════════ */
/*  KPI SECTION                                                                 */
/* ═══════════════════════════════════════════════════════════════════════════ */
export const kpiSparkData = [12,18,15,22,19,25,21,28];

export function KPISection() {
  return (
    <div>
      <SectionHeader title="KPI Components" desc="Metric cards, trend indicators, comparisons, and mini sparklines." />

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        {[
          { label: "Total Revenue",    value: "SAR 213,540", delta: "+12.4%", up: true,  sub: "vs last month" },
          { label: "Avg Trip Cost",    value: "SAR 1,668",   delta: "-3.2%",  up: false, sub: "vs last month" },
          { label: "On-Time Rate",     value: "89.3%",       delta: "+5.1%",  up: true,  sub: "vs last month" },
          { label: "Fleet Efficiency", value: "78%",         delta: "+2.8%",  up: true,  sub: "utilization" },
        ].map((kpi) => (
          <Card key={kpi.label} className="p-5">
            <p className="text-xs text-[#6E6E80] mb-1">{kpi.label}</p>
            <p className="text-xl font-bold text-[#111] mb-1">{kpi.value}</p>
            <div className="flex items-center gap-1">
              {kpi.up ? <ArrowUp size={12} className="text-[#16A34A]" /> : <ArrowDown size={12} className="text-[#DC2626]" />}
              <span className={`text-xs font-semibold ${kpi.up ? "text-[#16A34A]" : "text-[#DC2626]"}`}>{kpi.delta}</span>
              <span className="text-[10px] text-[#9898A4]">{kpi.sub}</span>
            </div>
          </Card>
        ))}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card className="p-6">
          <SubHeader title="Metric with Sparkline" />
          <div className="space-y-4">
            {[
              { label: "Total Trips",  value: "128", delta: "+16", color: "#E8450F" },
              { label: "Completed",   value: "86",  delta: "+10", color: "#16A34A" },
              { label: "In Transit",  value: "28",  delta: "+3",  color: "#2563EB" },
            ].map((m) => (
              <div key={m.label} className="flex items-center gap-4">
                <div className="flex-1">
                  <p className="text-xs text-[#6E6E80]">{m.label}</p>
                  <div className="flex items-baseline gap-2">
                    <p className="text-2xl font-bold text-[#111]">{m.value}</p>
                    <span className="text-xs font-semibold text-[#16A34A]">{m.delta}</span>
                  </div>
                </div>
                <svg width={80} height={32} viewBox="0 0 80 32">
                  <polyline
                    points={kpiSparkData.map((v, i) => `${i * 11.4},${32 - (v / 28) * 30}`).join(" ")}
                    fill="none" stroke={m.color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round"
                  />
                </svg>
              </div>
            ))}
          </div>
        </Card>

        <Card className="p-6">
          <SubHeader title="Comparison — This Month vs Last" />
          <div className="space-y-3">
            {[
              { label: "Trips",      curr: 128, prev: 110 },
              { label: "Revenue",    curr: 213, prev: 190 },
              { label: "On-Time %",  curr: 89,  prev: 84  },
              { label: "Fleet %",    curr: 78,  prev: 75  },
            ].map((c) => {
              const pct = Math.round((c.curr / (c.curr + c.prev)) * 100);
              return (
                <div key={c.label}>
                  <div className="flex justify-between text-xs mb-1">
                    <span className="text-[#6E6E80]">{c.label}</span>
                    <span className="text-[#9898A4]">{c.curr} vs {c.prev}</span>
                  </div>
                  <div className="h-2 rounded-full bg-[#EBEBED] overflow-hidden flex">
                    <div className="h-full rounded-full bg-[#E8450F] transition-all" style={{ width: `${pct}%` }} />
                  </div>
                </div>
              );
            })}
          </div>
        </Card>
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════════════════ */
/*  ICONS SECTION                                                               */
/* ═══════════════════════════════════════════════════════════════════════════ */
export const ICON_GROUPS = [
  { group: "Navigation", icons: [{ name: "Home", el: <Home /> }, { name: "ChevronRight", el: <ChevronRight /> }, { name: "ChevronLeft", el: <ChevronLeft /> }, { name: "ChevronDown", el: <ChevronDown /> }, { name: "ChevronUp", el: <ChevronUp /> }, { name: "ArrowRight", el: <ArrowRight /> }, { name: "ArrowLeft", el: <ArrowDown style={{transform:"rotate(90deg)"}} /> }, { name: "MoreHorizontal", el: <MoreHorizontal /> }] },
  { group: "Trips & Logistics", icons: [{ name: "Truck", el: <Truck /> }, { name: "MapPin", el: <MapPin /> }, { name: "Package", el: <Package /> }, { name: "Navigation", el: <Navigation /> }, { name: "Fuel", el: <Fuel /> }, { name: "Activity", el: <Activity /> }, { name: "Clock", el: <Clock /> }, { name: "Calendar", el: <Calendar /> }] },
  { group: "Documents", icons: [{ name: "FileText", el: <FileText /> }, { name: "Upload", el: <Upload /> }, { name: "Download", el: <Download /> }, { name: "Paperclip", el: <Paperclip /> }, { name: "File", el: <File /> }, { name: "Image", el: <Image /> }, { name: "CloudUpload", el: <CloudUpload /> }, { name: "Shield", el: <Shield /> }] },
  { group: "Status & Alerts", icons: [{ name: "CheckCircle2", el: <CheckCircle2 /> }, { name: "XCircle", el: <XCircle /> }, { name: "AlertTriangle", el: <AlertTriangle /> }, { name: "Info", el: <Info /> }, { name: "Bell", el: <Bell /> }, { name: "Star", el: <Star /> }, { name: "Zap", el: <Zap /> }, { name: "TrendingUp", el: <TrendingUp /> }] },
  { group: "Users & People", icons: [{ name: "User", el: <User /> }, { name: "Users", el: <Users /> }, { name: "Phone", el: <Phone /> }, { name: "Mail", el: <Mail /> }, { name: "Eye", el: <Eye /> }, { name: "EyeOff", el: <EyeOff /> }, { name: "Edit2", el: <Edit2 /> }, { name: "Trash2", el: <Trash2 /> }] },
  { group: "UI Controls", icons: [{ name: "Search", el: <Search /> }, { name: "Filter", el: <Filter /> }, { name: "Settings", el: <Settings /> }, { name: "Plus", el: <Plus /> }, { name: "X", el: <X /> }, { name: "BarChart3", el: <BarChart3 /> }, { name: "Layers", el: <Layers /> }, { name: "Grip", el: <Grip /> }] },
];

const ICON_SIZES = [16, 20, 24, 28, 32, 40, 48];

export function IconsSection() {
  return (
    <div>
      <SectionHeader title="Icons" desc="Lucide icon library organized by category with all sizing tokens." />

      <Card className="p-6 mb-6">
        <SubHeader title="Size Tokens" />
        <div className="flex flex-wrap items-end gap-6">
          {ICON_SIZES.map((s) => (
            <div key={s} className="flex flex-col items-center gap-2">
              <Truck size={s} className="text-[#E8450F]" />
              <p className="text-[10px] font-mono text-[#6E6E80]">{s}px</p>
            </div>
          ))}
        </div>
      </Card>

      {ICON_GROUPS.map((g) => (
        <Card key={g.group} className="p-6 mb-4">
          <SubHeader title={g.group} />
          <div className="grid grid-cols-4 md:grid-cols-8 gap-3">
            {g.icons.map((ic) => (
              <div key={ic.name} className="flex flex-col items-center gap-2 p-3 rounded-xl hover:bg-[#F5F5F7] transition-colors cursor-default group">
                <div className="text-[#444] group-hover:text-[#E8450F] transition-colors">
                  {React.cloneElement(ic.el as React.ReactElement<any>, { size: 22 })}
                </div>
                <p className="text-[9px] text-[#9898A4] text-center leading-tight">{ic.name}</p>
              </div>
            ))}
          </div>
        </Card>
      ))}
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════════════════ */
/*  MOTION SECTION                                                              */
/* ═══════════════════════════════════════════════════════════════════════════ */
export function MotionSection() {
  const [btnPulse, setBtnPulse] = useState(false);
  const [toastIn, setToastIn] = useState(false);
  const [sheetUp, setSheetUp] = useState(false);
  const [pageSwap, setPageSwap] = useState(false);

  return (
    <div>
      <SectionHeader title="Motion" desc="Animation tokens and interactive examples for button, toast, sheet, and page transitions." />

      <Card className="p-8 mb-6">
        <SubHeader title="Duration Tokens" />
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
          {[
            { token: "duration-fast",   val: "100ms", use: "Micro feedback" },
            { token: "duration-normal", val: "200ms", use: "Button, hover" },
            { token: "duration-medium", val: "300ms", use: "Toast, badge" },
            { token: "duration-slow",   val: "400ms", use: "Sheet, drawer" },
            { token: "duration-page",   val: "500ms", use: "Page transition" },
          ].map((t) => (
            <div key={t.token} className="p-4 rounded-xl bg-[#F5F5F7] text-center">
              <p className="text-lg font-bold text-[#E8450F] mb-0.5">{t.val}</p>
              <p className="text-[10px] font-mono text-[#6E6E80]">{t.token}</p>
              <p className="text-[10px] text-[#9898A4] mt-1">{t.use}</p>
            </div>
          ))}
        </div>
      </Card>

      <Card className="p-8 mb-6">
        <SubHeader title="Easing Tokens" />
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {[
            { name: "ease-out",    curve: "cubic-bezier(0, 0, 0.2, 1)", use: "Elements entering the screen" },
            { name: "ease-in",     curve: "cubic-bezier(0.4, 0, 1, 1)", use: "Elements leaving the screen" },
            { name: "ease-spring", curve: "cubic-bezier(0.34, 1.56, 0.64, 1)", use: "Bouncy interactions, FAB" },
          ].map((e) => (
            <div key={e.name} className="p-4 rounded-xl bg-[#F5F5F7]">
              <p className="text-sm font-semibold text-[#111] mb-0.5">{e.name}</p>
              <p className="text-[10px] font-mono text-[#6E6E80] mb-2 break-all">{e.curve}</p>
              <p className="text-xs text-[#9898A4]">{e.use}</p>
            </div>
          ))}
        </div>
      </Card>

      <Card className="p-8">
        <SubHeader title="Interactive Examples" />
        <div className="flex flex-wrap gap-4">
          <button onClick={() => { setBtnPulse(true); setTimeout(() => setBtnPulse(false), 600); }}
            className={`px-5 py-2.5 rounded-xl bg-[#E8450F] text-white text-sm font-semibold transition-transform active:scale-95 ${btnPulse ? "scale-95 opacity-80" : "scale-100"}`}
            style={{ transition: "transform 200ms cubic-bezier(0.34,1.56,0.64,1), opacity 200ms" }}>
            Button Spring ↗
          </button>

          <button onClick={() => { setToastIn(true); setTimeout(() => setToastIn(false), 2000); }}
            className="px-5 py-2.5 rounded-xl bg-[#F0F0F2] text-[#111] text-sm font-semibold hover:bg-[#E5E5E8] transition-colors">
            Toast Slide-in ↑
          </button>

          <button onClick={() => setSheetUp(!sheetUp)}
            className="px-5 py-2.5 rounded-xl bg-[#1A1A1A] text-white text-sm font-semibold hover:bg-[#333] transition-colors">
            Bottom Sheet {sheetUp ? "↓" : "↑"}
          </button>

          <button onClick={() => { setPageSwap(true); setTimeout(() => setPageSwap(false), 400); }}
            className="px-5 py-2.5 rounded-xl border-2 border-[#E8450F] text-[#E8450F] text-sm font-semibold hover:bg-[#FFF0EB] transition-colors">
            Page Fade →
          </button>
        </div>

        {toastIn && (
          <div className="fixed bottom-6 right-6 z-[200] px-4 py-3.5 rounded-2xl bg-[#F0FDF4] border border-[#BBF7D0] shadow-xl flex items-center gap-2 text-sm font-semibold text-[#16A34A]"
            style={{ animation: "slideUp 300ms cubic-bezier(0,0,0.2,1)" }}>
            <CheckCircle2 size={16} /> Toast slide-in demo
          </div>
        )}

        {sheetUp && (
          <div className="fixed inset-x-0 bottom-0 z-[200] bg-white rounded-t-3xl border-t border-black/[0.08] shadow-2xl p-5 pb-8"
            style={{ animation: "sheetUp 400ms cubic-bezier(0,0,0.2,1)" }}>
            <div className="flex justify-center mb-3"><div className="w-10 h-1 rounded-full bg-[#D8D8DC]" /></div>
            <p className="text-base font-bold text-[#111] mb-1">Bottom Sheet</p>
            <p className="text-xs text-[#6E6E80] mb-4">400ms ease-out slide from bottom</p>
            <button onClick={() => setSheetUp(false)} className="w-full py-3 rounded-2xl bg-[#F0F0F2] text-sm font-semibold text-[#6E6E80]">Dismiss</button>
          </div>
        )}

        <style>{`
          @keyframes slideUp { from { transform: translateY(20px); opacity: 0; } to { transform: none; opacity: 1; } }
          @keyframes sheetUp { from { transform: translateY(100%); } to { transform: none; } }
          @keyframes fadeIn  { from { opacity: 0; } to { opacity: 1; } }
        `}</style>
      </Card>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════════════════ */
/*  ACCESSIBILITY SECTION                                                       */
/* ═══════════════════════════════════════════════════════════════════════════ */
export function AccessibilitySection() {
  return (
    <div>
      <SectionHeader title="Accessibility" desc="Touch targets, contrast ratios, keyboard focus, and color-blind safe palettes." />

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
        <Card className="p-6">
          <SubHeader title="Touch Target Sizes" />
          <div className="space-y-4">
            {[
              { label: "Minimum (iOS HIG)", size: 44, pass: true },
              { label: "Recommended",       size: 48, pass: true },
              { label: "Comfortable",       size: 56, pass: true },
              { label: "Too Small ✗",       size: 32, pass: false },
            ].map((t) => (
              <div key={t.label} className="flex items-center gap-4">
                <div className={`flex items-center justify-center rounded-xl text-xs font-bold text-white shrink-0 ${t.pass ? "bg-[#16A34A]" : "bg-[#DC2626]"}`} style={{ width: t.size, height: t.size }}>{t.size}</div>
                <div>
                  <p className="text-sm font-semibold text-[#111]">{t.size}px × {t.size}px</p>
                  <p className="text-xs text-[#6E6E80]">{t.label}</p>
                </div>
                <span className={`ml-auto text-xs font-bold ${t.pass ? "text-[#16A34A]" : "text-[#DC2626]"}`}>{t.pass ? "✓ Pass" : "✗ Fail"}</span>
              </div>
            ))}
          </div>
        </Card>

        <Card className="p-6">
          <SubHeader title="Contrast Ratios" />
          <div className="space-y-3">
            {[
              { fg: "#111111", bg: "#FFFFFF", ratio: "19.3:1", level: "AAA", pass: true },
              { fg: "#E8450F", bg: "#FFFFFF", ratio: "4.8:1",  level: "AA",  pass: true },
              { fg: "#FFFFFF", bg: "#E8450F", ratio: "4.8:1",  level: "AA",  pass: true },
              { fg: "#6E6E80", bg: "#FFFFFF", ratio: "4.6:1",  level: "AA",  pass: true },
              { fg: "#9898A4", bg: "#FFFFFF", ratio: "2.9:1",  level: "—",   pass: false, note: "Use only for decorative text" },
            ].map((c) => (
              <div key={c.fg + c.bg} className="flex items-center gap-3 p-2.5 rounded-xl bg-[#F5F5F7]">
                <div className="w-8 h-8 rounded-lg border border-black/[0.06] shrink-0" style={{ background: c.bg }}>
                  <p className="text-center leading-8 text-sm font-bold" style={{ color: c.fg }}>Aa</p>
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex gap-1 text-[10px] font-mono text-[#6E6E80]">
                    <span>{c.fg}</span><span>on</span><span>{c.bg}</span>
                  </div>
                  {(c as any).note && <p className="text-[10px] text-[#D97706]">{(c as any).note}</p>}
                </div>
                <span className="text-xs font-bold text-[#111]">{c.ratio}</span>
                <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${c.pass ? "bg-[#F0FDF4] text-[#16A34A]" : "bg-[#FEF2F2] text-[#DC2626]"}`}>{c.level}</span>
              </div>
            ))}
          </div>
        </Card>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card className="p-6">
          <SubHeader title="Keyboard Focus Styles" />
          <div className="flex flex-wrap gap-3">
            <button className="px-5 py-2.5 rounded-xl bg-[#E8450F] text-white text-sm font-semibold ring-4 ring-[rgba(232,69,15,0.3)] ring-offset-2">Focused Button</button>
            <input className="px-4 py-2.5 rounded-xl bg-[#F0F0F2] text-sm ring-2 ring-[rgba(232,69,15,0.4)] ring-offset-1 outline-none" defaultValue="Focused Input" />
          </div>
          <div className="mt-4 p-3 rounded-xl bg-[#F5F5F7] text-xs text-[#6E6E80]">
            <p className="font-semibold text-[#111] mb-1">Rule: Focus visible must always be shown</p>
            <p>Use <code className="bg-white px-1 rounded">ring-2 ring-[rgba(232,69,15,0.4)]</code> for inputs and <code className="bg-white px-1 rounded">ring-4 ring-[rgba(232,69,15,0.3)]</code> for buttons.</p>
          </div>
        </Card>

        <Card className="p-6">
          <SubHeader title="Minimum Font Sizes" />
          <div className="space-y-2">
            {[
              { size: "11px", token: "Overline",   ok: true },
              { size: "12px", token: "Caption",    ok: true },
              { size: "13px", token: "Body Small", ok: true },
              { size: "10px", token: "Avoid",      ok: false, note: "Too small for mobile" },
            ].map((f) => (
              <div key={f.token} className="flex items-center gap-3">
                <p style={{ fontSize: f.size, fontWeight: 500, color: f.ok ? "#111" : "#B8B8C0" }} className="w-44">The quick brown fox</p>
                <span className="text-[10px] font-mono text-[#9898A4]">{f.size}</span>
                <span className={`text-[10px] font-semibold ${f.ok ? "text-[#16A34A]" : "text-[#DC2626]"}`}>{f.ok ? `✓ ${f.token}` : `✗ ${f.note}`}</span>
              </div>
            ))}
          </div>
        </Card>
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════════════════ */
/*  NAMING GUIDE SECTION                                                        */
/* ═══════════════════════════════════════════════════════════════════════════ */
export const NAMING_EXAMPLES = [
  { name: "Button/Primary/Large/Default",  desc: "Primary CTA, large size, default state" },
  { name: "Button/Primary/Large/Hover",    desc: "Primary CTA, large size, hover state" },
  { name: "Button/Primary/Large/Disabled", desc: "Primary CTA, large size, disabled state" },
  { name: "Button/Outline/Small",          desc: "Outline variant, small size" },
  { name: "Input/Text/Default",            desc: "Text input, resting state" },
  { name: "Input/Text/Focused",            desc: "Text input, keyboard focused" },
  { name: "Input/Text/Error",              desc: "Text input, validation error" },
  { name: "Input/Text/Success",            desc: "Text input, value validated" },
  { name: "Badge/Trip/Completed",          desc: "Trip status chip — completed" },
  { name: "Badge/Trip/InTransit",          desc: "Trip status chip — in transit" },
  { name: "Badge/Document/Critical",       desc: "Document expiry — critical" },
  { name: "Card/Trip/Default",             desc: "Trip list card, default state" },
  { name: "Card/Trip/Selected",            desc: "Trip list card, selected" },
  { name: "Card/Vehicle/Available",        desc: "Vehicle card, available status" },
  { name: "Card/Stat/Dark",               desc: "KPI stat card, dark surface" },
  { name: "Nav/Bottom/Operator",           desc: "Bottom nav — operator app variant" },
  { name: "Nav/Bottom/Driver",             desc: "Bottom nav — driver app pill variant" },
  { name: "Nav/Bottom/Driver/Active",      desc: "Driver nav item in active state" },
  { name: "Modal/Confirmation/Default",    desc: "Confirmation dialog" },
  { name: "Modal/Delete/Default",          desc: "Destructive delete dialog" },
  { name: "Modal/BottomSheet/Trip",        desc: "Mobile bottom sheet — trip actions" },
  { name: "Color/Primary/500",             desc: "#E8450F — main brand orange" },
  { name: "Color/Neutral/500",             desc: "#6E6E80 — secondary text" },
  { name: "Color/Success/Default",         desc: "#16A34A" },
  { name: "Spacing/16",                    desc: "16px — standard inner padding" },
  { name: "Spacing/24",                    desc: "24px — card padding" },
  { name: "Radius/16",                     desc: "16px — standard card radius" },
  { name: "Radius/Full",                   desc: "9999px — pill / avatar" },
  { name: "Typography/H1",                 desc: "Display Large — 40px 800" },
  { name: "Typography/Body/Medium",        desc: "Body Medium — 14px 400" },
  { name: "Typography/Caption",            desc: "Caption — 12px 400" },
];

export const COMPONENT_STATES = ["Default","Hover","Pressed","Focused","Disabled","Loading","Selected","Active","Error","Success"];

export function NamingGuideSection() {
  return (
    <div>
      <SectionHeader title="Naming Guide" desc="Enterprise naming convention — Component/Variant/Size/State. Used in Figma variables and dev handoff." />

      <Card className="p-8 mb-6">
        <SubHeader title="Convention Pattern" />
        <div className="flex flex-wrap items-center gap-2 text-sm font-mono mb-4">
          {["Component", "/", "Variant", "/", "Size", "/", "State"].map((p, i) => (
            <span key={i} className={i % 2 === 0 ? "px-3 py-1.5 rounded-lg bg-[#FFF0EB] text-[#E8450F] font-bold" : "text-[#9898A4]"}>{p}</span>
          ))}
        </div>
        <p className="text-xs text-[#6E6E80]">Not all segments are required — use only what's meaningful. A badge may only need <code className="bg-[#F5F5F7] px-1 rounded">Badge/Completed</code>, while a button needs all four.</p>
      </Card>

      <Card className="p-8 mb-6">
        <SubHeader title="Full Example Library" />
        <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
          {NAMING_EXAMPLES.map((e) => (
            <div key={e.name} className="flex items-start gap-3 p-3 rounded-xl hover:bg-[#F5F5F7] transition-colors">
              <code className="text-xs font-mono font-semibold text-[#E8450F] bg-[#FFF0EB] px-2 py-1 rounded-lg shrink-0 leading-relaxed">{e.name}</code>
              <p className="text-xs text-[#6E6E80] mt-1">{e.desc}</p>
            </div>
          ))}
        </div>
      </Card>

      <Card className="p-8">
        <SubHeader title="Required States per Component" />
        <div className="grid grid-cols-2 md:grid-cols-5 gap-2 mb-6">
          {COMPONENT_STATES.map((s) => (
            <div key={s} className="px-3 py-2 rounded-xl bg-[#F5F5F7] text-center">
              <p className="text-xs font-semibold text-[#111]">{s}</p>
            </div>
          ))}
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b border-[#F0F0F2]">
                <th className="text-left py-2 pr-4 text-[#6E6E80] font-semibold w-28">Component</th>
                {COMPONENT_STATES.map((s) => <th key={s} className="text-center py-2 px-2 text-[#6E6E80] font-semibold whitespace-nowrap">{s}</th>)}
              </tr>
            </thead>
            <tbody>
              {[
                { name: "Button",   states: [1,1,1,1,1,1,1,0,1,1] },
                { name: "Input",    states: [1,0,0,1,1,0,1,0,1,1] },
                { name: "Badge",    states: [1,0,0,0,1,0,1,1,0,0] },
                { name: "Card",     states: [1,1,1,0,0,1,1,0,0,0] },
                { name: "Tab",      states: [1,1,1,1,1,0,1,1,0,0] },
                { name: "Checkbox", states: [1,1,1,1,1,0,1,0,0,0] },
              ].map((row) => (
                <tr key={row.name} className="border-b border-[#F5F5F7] last:border-0">
                  <td className="py-2.5 pr-4 font-semibold text-[#111]">{row.name}</td>
                  {row.states.map((v, i) => (
                    <td key={i} className="text-center py-2.5 px-2">
                      {v ? <span className="text-[#16A34A] font-bold">✓</span> : <span className="text-[#EBEBED]">—</span>}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}
