import React from "react";
import {
  Truck, MapPin, ArrowRight, CheckCircle2, Bell, Camera, PenLine, User, FileText
} from "lucide-react";
import {
  LineChart, Line, AreaChart, Area, BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer
} from "recharts";
import { Card, SectionHeader, SubHeader } from "./common";

/* ═══════════════════════════════════════════════════════════════════════════ */
/*  CHARTS DATA                                                                 */
/* ═══════════════════════════════════════════════════════════════════════════ */
export const tripTrendData = [
  { day: "01", completed: 12, inTransit: 5, delayed: 2, cancelled: 1 },
  { day: "05", completed: 18, inTransit: 7, delayed: 3, cancelled: 0 },
  { day: "10", completed: 15, inTransit: 8, delayed: 4, cancelled: 2 },
  { day: "15", completed: 22, inTransit: 6, delayed: 1, cancelled: 1 },
  { day: "20", completed: 19, inTransit: 9, delayed: 3, cancelled: 0 },
  { day: "24", completed: 25, inTransit: 7, delayed: 2, cancelled: 1 },
];

export const utilizationData = [
  { name: "Available", value: 48, color: "#16A34A" },
  { name: "On Trip", value: 12, color: "#2563EB" },
  { name: "Maintenance", value: 8, color: "#D97706" },
  { name: "Inactive", value: 4, color: "#9898A4" },
];

export const revenueData = [
  { month: "Jan", revenue: 180000 },
  { month: "Feb", revenue: 210000 },
  { month: "Mar", revenue: 195000 },
  { month: "Apr", revenue: 240000 },
  { month: "May", revenue: 213540 },
  { month: "Jun", revenue: 228000 },
];

/* ═══════════════════════════════════════════════════════════════════════════ */
/*  CHARTS SECTION                                                              */
/* ═══════════════════════════════════════════════════════════════════════════ */
export function ChartsSection() {
  return (
    <div>
      <SectionHeader title="Charts" desc="Line, area, bar, donut charts — all used in the reports screens." />

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
        <Card className="p-6">
          <p className="text-sm font-bold text-[#111] mb-1">Trip Trend (This Month)</p>
          <p className="text-xs text-[#6E6E80] mb-4">Daily trip status breakdown</p>
          <ResponsiveContainer width="100%" height={200}>
            <LineChart data={tripTrendData} key="trip-trend-chart">
              <CartesianGrid strokeDasharray="3 3" stroke="#F0F0F2" />
              <XAxis dataKey="day" tick={{ fontSize: 10, fill: "#9898A4" }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 10, fill: "#9898A4" }} axisLine={false} tickLine={false} />
              <Tooltip contentStyle={{ borderRadius: 12, border: "1px solid #F0F0F2", fontSize: 11 }} />
              <Line type="monotone" dataKey="completed" stroke="#16A34A" strokeWidth={2} dot={false} name="completed" />
              <Line type="monotone" dataKey="inTransit" stroke="#2563EB" strokeWidth={2} dot={false} name="inTransit" />
              <Line type="monotone" dataKey="delayed"   stroke="#D97706" strokeWidth={2} dot={false} name="delayed" />
              <Line type="monotone" dataKey="cancelled" stroke="#DC2626" strokeWidth={2} dot={false} name="cancelled" />
            </LineChart>
          </ResponsiveContainer>
          <div className="flex flex-wrap gap-3 mt-3">
            {[["Completed", "#16A34A"], ["In Transit", "#2563EB"], ["Delayed", "#D97706"], ["Cancelled", "#DC2626"]].map(([l, c]) => (
              <span key={l} className="flex items-center gap-1 text-[10px] text-[#6E6E80]">
                <span className="w-2.5 h-2.5 rounded-full" style={{ background: c }} />{l}
              </span>
            ))}
          </div>
        </Card>

        <Card className="p-6">
          <p className="text-sm font-bold text-[#111] mb-1">Fleet Status Distribution</p>
          <p className="text-xs text-[#6E6E80] mb-4">72 total vehicles</p>
          <div className="flex items-center gap-4">
            <PieChart width={160} height={160}>
              <Pie data={utilizationData} cx={75} cy={75} innerRadius={50} outerRadius={75} dataKey="value" strokeWidth={0}>
                {utilizationData.map((e) => <Cell key={`cell-${e.name}`} fill={e.color} />)}
              </Pie>
            </PieChart>
            <div className="space-y-2 flex-1">
              {utilizationData.map((d) => (
                <div key={d.name} className="flex items-center justify-between">
                  <span className="flex items-center gap-1.5 text-xs text-[#444]">
                    <span className="w-2 h-2 rounded-full" style={{ background: d.color }} />{d.name}
                  </span>
                  <span className="text-xs font-semibold text-[#111]">{d.value}</span>
                </div>
              ))}
            </div>
          </div>
        </Card>
      </div>

      <Card className="p-6 mb-6">
        <p className="text-sm font-bold text-[#111] mb-1">Total SAR Revenue</p>
        <p className="text-xs text-[#6E6E80] mb-4">Monthly revenue trend</p>
        <ResponsiveContainer width="100%" height={200}>
          <AreaChart data={revenueData} key="revenue-area-chart">
            <defs>
              <linearGradient id="revenueGradCs" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#E8450F" stopOpacity={0.15} />
                <stop offset="95%" stopColor="#E8450F" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="#F0F0F2" />
            <XAxis dataKey="month" tick={{ fontSize: 10, fill: "#9898A4" }} axisLine={false} tickLine={false} />
            <YAxis tick={{ fontSize: 10, fill: "#9898A4" }} axisLine={false} tickLine={false} tickFormatter={(v) => `${(v / 1000).toFixed(0)}K`} />
            <Tooltip
              formatter={(v: number) => [`SAR ${v.toLocaleString()}`, "Revenue"]}
              contentStyle={{ borderRadius: 12, border: "1px solid #F0F0F2", fontSize: 11 }}
            />
            <Area type="monotone" dataKey="revenue" stroke="#E8450F" strokeWidth={2} fill="url(#revenueGradCs)" name="revenue" />
          </AreaChart>
        </ResponsiveContainer>
      </Card>

      <Card className="p-6">
        <p className="text-sm font-bold text-[#111] mb-4">Fleet Utilization % (Top Vehicles)</p>
        <ResponsiveContainer width="100%" height={180}>
          <BarChart key="utilization-bar-chart" data={[
            { vehicle: "TRK-2041", util: 85 },
            { vehicle: "DRA-9973", util: 78 },
            { vehicle: "VRA-3358", util: 92 },
            { vehicle: "LKA-3812", util: 61 },
            { vehicle: "FAD-2210", util: 74 },
          ]} layout="vertical">
            <CartesianGrid strokeDasharray="3 3" stroke="#F0F0F2" horizontal={false} />
            <XAxis type="number" domain={[0, 100]} tick={{ fontSize: 10, fill: "#9898A4" }} axisLine={false} tickLine={false} tickFormatter={(v) => `${v}%`} />
            <YAxis type="category" dataKey="vehicle" tick={{ fontSize: 10, fill: "#444", fontFamily: "JetBrains Mono, monospace" }} axisLine={false} tickLine={false} width={70} />
            <Tooltip formatter={(v) => [`${v}%`, "Utilization"]} contentStyle={{ borderRadius: 12, border: "1px solid #F0F0F2", fontSize: 11 }} />
            <Bar dataKey="util" fill="#E8450F" radius={[0, 6, 6, 0]} name="util">
              {[85, 78, 92, 61, 74].map((_, i) => <Cell key={`bar-util-${i}`} fill="#E8450F" />)}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </Card>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════════════════ */
/*  PATTERNS SECTION                                                            */
/* ═══════════════════════════════════════════════════════════════════════════ */
export function PatternsSection() {
  return (
    <div>
      <SectionHeader title="Patterns" desc="Full-screen pattern previews: success states, detail views, and list pages." />

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
        {/* Trip Created Success */}
        <Card className="overflow-hidden">
          <div className="bg-[#F5F5F7] px-4 py-3 border-b border-black/[0.07]">
            <p className="text-xs font-semibold text-[#6E6E80]">Pattern / Success State</p>
            <p className="text-sm font-bold text-[#111]">Trip Created Successfully</p>
          </div>
          <div className="p-6">
            <div className="text-center mb-6">
              <div className="w-16 h-16 rounded-full bg-[#F0FDF4] border-4 border-[#DCFCE7] flex items-center justify-center mx-auto mb-4">
                <CheckCircle2 size={32} className="text-[#16A34A]" />
              </div>
              <h3 className="text-xl font-bold text-[#111]">Trip Created</h3>
              <p className="text-lg font-bold text-[#16A34A]">Successfully!</p>
              <p className="text-xs text-[#6E6E80] mt-2">Your trip has been created and is ready to be executed.</p>
            </div>
            <div className="bg-[#F5F5F7] rounded-2xl p-4 space-y-2 mb-4">
              {[
                { label: "Trip ID", value: "TRP-2387", mono: true },
                { label: "Created On", value: "24 May 2025, 08:00 AM" },
                { label: "Route", value: "Riyadh → Jeddah" },
                { label: "Cargo", value: "General Goods · 18,500 KG" },
                { label: "Vehicle", value: "TRK-2041 · Ahmed Kareem" },
                { label: "Est. Delivery", value: "24 May 2025, 08:00 PM" },
              ].map((r) => (
                <div key={r.label} className="flex items-center justify-between text-sm">
                  <span className="text-[#6E6E80] text-xs">{r.label}</span>
                  <span className={`font-medium text-[#111] text-xs ${r.mono ? "font-mono text-[#E8450F]" : ""}`}>{r.value}</span>
                </div>
              ))}
            </div>
            <div className="p-3 rounded-xl bg-[#F0FDF4] border border-[#BBF7D0] flex items-start gap-2 mb-4">
              <CheckCircle2 size={14} className="text-[#16A34A] mt-0.5 shrink-0" />
              <p className="text-xs text-[#16A34A] font-medium">Your trip is confirmed! We will notify you of any updates.</p>
            </div>
            <button className="w-full py-3.5 rounded-2xl bg-[#1A1A1A] text-white text-sm font-semibold flex items-center justify-between px-5 hover:bg-[#333] transition-colors">
              <span className="flex items-center gap-2"><FileText size={16} /> View Trip Details</span>
              <ArrowRight size={16} />
            </button>
          </div>
        </Card>

        {/* Trip Completed */}
        <Card className="overflow-hidden">
          <div className="bg-[#F5F5F7] px-4 py-3 border-b border-black/[0.07]">
            <p className="text-xs font-semibold text-[#6E6E80]">Pattern / Completion State</p>
            <p className="text-sm font-bold text-[#111]">Trip Completed — POD</p>
          </div>
          <div className="p-6">
            <div className="text-center mb-4">
              <p className="text-base font-bold text-[#111]">Trip Completed</p>
              <p className="text-xs text-[#6E6E80]">The delivery has been completed successfully</p>
            </div>
            <div className="flex items-center gap-2 mb-4">
              <span className="text-xs font-mono font-bold text-[#E8450F]">TRP-2387</span>
              <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-[#F0FDF4] text-[#16A34A]">Completed</span>
            </div>
            <div className="flex items-center justify-between text-xs text-[#444] mb-4 px-2">
              <div className="flex flex-col items-center gap-1">
                <MapPin size={14} className="text-[#E8450F]" />
                <span className="font-medium">Riyadh</span>
                <span className="text-[#9898A4]">Pickup</span>
              </div>
              <div className="flex-1 h-px bg-[#E8E8EB] mx-3" />
              <Truck size={18} className="text-[#6E6E80]" />
              <div className="flex-1 h-px bg-[#E8E8EB] mx-3" />
              <div className="flex flex-col items-center gap-1">
                <MapPin size={14} className="text-[#6E6E80]" />
                <span className="font-medium">Jeddah</span>
                <span className="text-[#9898A4]">Delivery</span>
              </div>
            </div>
            <div className="bg-[#F5F5F7] rounded-2xl p-4 mb-4">
              <p className="text-xs font-bold text-[#111] mb-3">Proof of Delivery (POD)</p>
              <div className="grid grid-cols-3 gap-2">
                {[
                  { label: "Delivery Photo",   Icon: Camera,  color: "#2563EB", bg: "#EFF6FF", status: "Uploaded" },
                  { label: "Signed POD",       Icon: PenLine, color: "#7C3AED", bg: "#F5F3FF", status: "Uploaded" },
                  { label: "Receiver Details", Icon: User,    color: "#16A34A", bg: "#F0FDF4", status: "Confirmed" },
                ].map((p) => (
                  <div key={p.label} className="text-center p-2 bg-white rounded-xl border border-black/[0.07]">
                    <div className="w-8 h-8 rounded-xl flex items-center justify-center mx-auto mb-1" style={{ background: p.bg }}>
                      <p.Icon size={16} style={{ color: p.color }} />
                    </div>
                    <p className="text-[9px] font-medium text-[#111]">{p.label}</p>
                    <p className="text-[9px] text-[#16A34A]">✓ {p.status}</p>
                  </div>
                ))}
              </div>
            </div>
            <button className="w-full py-3.5 rounded-2xl bg-[#E8450F] text-white text-sm font-semibold flex items-center justify-between px-5 hover:bg-[#C7380A] transition-colors">
              <span className="flex items-center gap-2"><FileText size={16} /> Continue to Billing</span>
              <ArrowRight size={16} />
            </button>
          </div>
        </Card>
      </div>

      {/* Renewal Center Pattern */}
      <Card className="overflow-hidden mb-6">
        <div className="bg-[#F5F5F7] px-4 py-3 border-b border-black/[0.07]">
          <p className="text-xs font-semibold text-[#6E6E80]">Pattern / Alert Center</p>
          <p className="text-sm font-bold text-[#111]">Vehicle Renewal Center</p>
        </div>
        <div className="p-6">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
            {[
              { label: "Due This Month", value: "14", color: "#E8450F", bg: "#FFF0EB" },
              { label: "Critical (1 Day)", value: "5", color: "#DC2626", bg: "#FEF2F2" },
              { label: "Overdue", value: "2", color: "#D97706", bg: "#FFFBEB" },
              { label: "Renewed", value: "28", color: "#16A34A", bg: "#F0FDF4" },
            ].map((s) => (
              <div key={s.label} className="rounded-2xl p-4 text-center" style={{ background: s.bg }}>
                <p className="text-2xl font-bold" style={{ color: s.color }}>{s.value}</p>
                <p className="text-xs font-medium mt-1" style={{ color: s.color }}>{s.label}</p>
              </div>
            ))}
          </div>
          <div className="p-4 rounded-2xl border border-[rgba(232,69,15,0.2)] bg-[#FFF0EB] flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Bell size={20} className="text-[#E8450F]" />
              <div>
                <p className="text-sm font-semibold text-[#E8450F]">Get Renewal Alerts</p>
                <p className="text-xs text-[rgba(232,69,15,0.7)]">Receive timely reminders for upcoming renewals and past penalties.</p>
              </div>
            </div>
            <button className="px-4 py-2 rounded-xl bg-[#E8450F] text-white text-xs font-semibold whitespace-nowrap hover:bg-[#C7380A] transition-colors">
              Enable Alerts
            </button>
          </div>
        </div>
      </Card>

      {/* Shadows & Elevation */}
      <Card className="p-8">
        <SubHeader title="Elevation & Shadow Tokens" />
        <div className="flex flex-wrap gap-6">
          {[
            { name: "None", shadow: "none", label: "Flat" },
            { name: "sm", shadow: "0 1px 3px rgba(0,0,0,0.06), 0 1px 2px rgba(0,0,0,0.04)", label: "Cards" },
            { name: "md", shadow: "0 4px 12px rgba(0,0,0,0.08)", label: "Modals" },
            { name: "lg", shadow: "0 8px 24px rgba(0,0,0,0.12)", label: "Popovers" },
            { name: "floating", shadow: "0 12px 40px rgba(232,69,15,0.2)", label: "FAB" },
          ].map((s) => (
            <div key={s.name} className="flex flex-col items-center gap-3">
              <div
                className="w-20 h-20 rounded-2xl bg-white"
                style={{ boxShadow: s.shadow }}
              />
              <div className="text-center">
                <p className="text-xs font-semibold text-[#111]">{s.name}</p>
                <p className="text-[10px] text-[#6E6E80]">{s.label}</p>
              </div>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}
