import React, { useState } from "react";
import {
  Search, Filter, ChevronDown, ChevronUp, ChevronLeft, ChevronRight,
  MoreHorizontal, CheckCircle2, AlertTriangle, Info, XCircle, Truck,
  Shield, Layers, X
} from "lucide-react";
import { Card, SectionHeader, SubHeader } from "./common";

/* ═══════════════════════════════════════════════════════════════════════════ */
/*  AVATARS SECTION                                                             */
/* ═══════════════════════════════════════════════════════════════════════════ */
export function Avatar({ initials, color = "#E8450F", size = "md", online = false, src }: { initials: string; color?: string; size?: "sm"|"md"|"lg"|"xl"; online?: boolean; src?: string }) {
  const sizes = { sm: "w-7 h-7 text-[10px]", md: "w-9 h-9 text-xs", lg: "w-12 h-12 text-sm", xl: "w-16 h-16 text-base" };
  const dotSizes = { sm: "w-2 h-2", md: "w-2.5 h-2.5", lg: "w-3 h-3", xl: "w-3.5 h-3.5" };
  return (
    <div className="relative inline-flex shrink-0">
      <div className={`${sizes[size]} rounded-full flex items-center justify-center text-white font-bold`} style={{ background: color }}>
        {initials}
      </div>
      {online && <span className={`absolute bottom-0 right-0 ${dotSizes[size]} rounded-full bg-[#16A34A] border-2 border-white`} />}
    </div>
  );
}

export function AvatarsSection() {
  return (
    <div>
      <SectionHeader title="Avatars" desc="Driver, company, and initial avatars with status indicators." />

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
        <Card className="p-6">
          <SubHeader title="Sizes" />
          <div className="flex items-end gap-4">
            <div className="flex flex-col items-center gap-2"><Avatar initials="AK" size="sm" /><p className="text-[10px] text-[#6E6E80]">sm · 28</p></div>
            <div className="flex flex-col items-center gap-2"><Avatar initials="AK" size="md" /><p className="text-[10px] text-[#6E6E80]">md · 36</p></div>
            <div className="flex flex-col items-center gap-2"><Avatar initials="AK" size="lg" /><p className="text-[10px] text-[#6E6E80]">lg · 48</p></div>
            <div className="flex flex-col items-center gap-2"><Avatar initials="AK" size="xl" /><p className="text-[10px] text-[#6E6E80]">xl · 64</p></div>
          </div>
        </Card>

        <Card className="p-6">
          <SubHeader title="Online Status" />
          <div className="flex items-end gap-6">
            <div className="flex flex-col items-center gap-2"><Avatar initials="AK" size="lg" online /><p className="text-[10px] text-[#16A34A]">Online</p></div>
            <div className="flex flex-col items-center gap-2"><Avatar initials="FK" size="lg" color="#6E6E80" /><p className="text-[10px] text-[#6E6E80]">Offline</p></div>
            <div className="flex flex-col items-center gap-2">
              <div className="relative inline-flex">
                <Avatar initials="SB" size="lg" color="#2563EB" />
                <span className="absolute bottom-0 right-0 w-3 h-3 rounded-full bg-[#D97706] border-2 border-white" />
              </div>
              <p className="text-[10px] text-[#D97706]">Busy</p>
            </div>
          </div>
        </Card>
      </div>

      <Card className="p-6 mb-6">
        <SubHeader title="Color Variants — Initial Avatars" />
        <div className="flex flex-wrap gap-3">
          {[
            { initials: "AK", color: "#E8450F", name: "Ahmed Kareem" },
            { initials: "FK", color: "#2563EB", name: "Faisal Baraka" },
            { initials: "SB", color: "#7C3AED", name: "Suresh Babu" },
            { initials: "MH", color: "#16A34A", name: "Mohammed Harbi" },
            { initials: "DN", color: "#D97706", name: "Danimam" },
            { initials: "TR", color: "#0891B2", name: "Tariq Rashed" },
          ].map((a) => (
            <div key={a.initials} className="flex items-center gap-2.5 px-3 py-2 bg-[#F5F5F7] rounded-xl">
              <Avatar initials={a.initials} color={a.color} size="md" />
              <p className="text-xs font-semibold text-[#111]">{a.name}</p>
            </div>
          ))}
        </div>
      </Card>

      <Card className="p-6">
        <SubHeader title="Avatar Stack" />
        <div className="flex items-center">
          {["AK", "FK", "SB", "MH", "DN"].map((init, i) => (
            <div key={init} className="rounded-full border-2 border-white -ml-2 first:ml-0" style={{ zIndex: 5 - i }}>
              <Avatar initials={init} color={["#E8450F","#2563EB","#7C3AED","#16A34A","#D97706"][i]} size="md" />
            </div>
          ))}
          <div className="w-9 h-9 rounded-full bg-[#F0F0F2] flex items-center justify-center text-xs font-bold text-[#6E6E80] border-2 border-white -ml-2">+3</div>
          <p className="ml-3 text-sm text-[#6E6E80]">8 drivers assigned</p>
        </div>
      </Card>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════════════════ */
/*  TABLES SECTION                                                              */
/* ═══════════════════════════════════════════════════════════════════════════ */
export const TABLE_TRIPS = [
  { id: "TRP-2387", from: "Riyadh", to: "Jeddah",  driver: "Ahmed Kareem",  status: "Completed", statusC: "#16A34A", statusBg: "#F0FDF4", weight: "18 TON", date: "24 May 25" },
  { id: "TRP-2388", from: "Riyadh", to: "Abha",    driver: "Faisal Baraka", status: "In Transit", statusC: "#2563EB", statusBg: "#EFF6FF", weight: "12 TON", date: "24 May 25" },
  { id: "TRP-2389", from: "Riyadh", to: "Dammam",  driver: "Bader Ali",     status: "Delayed",   statusC: "#D97706", statusBg: "#FFFBEB", weight: "9 TON",  date: "24 May 25" },
  { id: "TRP-2390", from: "Jeddah", to: "Tabouk",  driver: "Suresh Babu",   status: "Pending",   statusC: "#6E6E80", statusBg: "#F5F5F7", weight: "22 TON", date: "25 May 25" },
  { id: "TRP-2391", from: "Riyadh", to: "Medina",  driver: "Mohammed H.",   status: "Cancelled", statusC: "#DC2626", statusBg: "#FEF2F2", weight: "5 TON",  date: "25 May 25" },
];

export function TablesSection() {
  const [sortCol, setSortCol] = useState<string | null>(null);
  const [sortDir, setSortDir] = useState<"asc" | "desc">("asc");
  const [selected, setSelected] = useState<string[]>([]);
  const [page, setPage] = useState(1);

  const toggleSort = (col: string) => {
    if (sortCol === col) setSortDir(sortDir === "asc" ? "desc" : "asc");
    else { setSortCol(col); setSortDir("asc"); }
  };
  const toggleRow = (id: string) => setSelected((s) => s.includes(id) ? s.filter((x) => x !== id) : [...s, id]);
  const toggleAll = () => setSelected(selected.length === TABLE_TRIPS.length ? [] : TABLE_TRIPS.map((t) => t.id));

  return (
    <div>
      <SectionHeader title="Tables" desc="Sortable, selectable data tables with pagination, filters, and bulk actions." />

      {/* Filters + bulk actions bar */}
      <Card className="mb-4 overflow-hidden">
        <div className="flex items-center gap-3 px-4 py-3 border-b border-[#F0F0F2] flex-wrap">
          <div className="relative flex-1 min-w-[180px]">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#9898A4]" />
            <input className="w-full pl-8 pr-3 py-2 rounded-lg bg-[#F0F0F2] text-xs outline-none placeholder:text-[#9898A4]" placeholder="Search Trip, Route, Driver…" />
          </div>
          <select className="px-3 py-2 rounded-lg bg-[#F0F0F2] text-xs text-[#444] outline-none">
            <option>All Status</option><option>Completed</option><option>In Transit</option>
          </select>
          <select className="px-3 py-2 rounded-lg bg-[#F0F0F2] text-xs text-[#444] outline-none">
            <option>All Vehicles</option>
          </select>
          <button className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-[#F0F0F2] text-xs font-semibold text-[#444]"><Filter size={13} /> More Filters</button>
          {selected.length > 0 && (
            <div className="flex items-center gap-2 ml-auto bg-[#1A1A1A] text-white text-xs font-semibold px-3 py-2 rounded-lg">
              <span>{selected.length} selected</span>
              <button className="text-[#E8450F] hover:underline">Delete</button>
              <button className="text-[rgba(255,255,255,0.6)] hover:text-white">Export</button>
            </div>
          )}
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-[#F0F0F2] bg-[#FAFAFA]">
                <th className="px-4 py-3 w-8">
                  <input type="checkbox" checked={selected.length === TABLE_TRIPS.length} onChange={toggleAll} className="rounded accent-[#E8450F]" />
                </th>
                {[["id","Trip ID"],["from","Route"],["driver","Driver"],["status","Status"],["weight","Weight"],["date","Date"]].map(([col, label]) => (
                  <th key={col} onClick={() => toggleSort(col)} className="px-4 py-3 text-left text-xs font-semibold text-[#6E6E80] cursor-pointer hover:text-[#111] select-none whitespace-nowrap">
                    <span className="flex items-center gap-1">
                      {label}
                      {sortCol === col ? (sortDir === "asc" ? <ChevronUp size={12} /> : <ChevronDown size={12} />) : <ChevronDown size={12} className="opacity-20" />}
                    </span>
                  </th>
                ))}
                <th className="px-4 py-3 w-10" />
              </tr>
            </thead>
            <tbody>
              {TABLE_TRIPS.map((t) => (
                <tr key={t.id} className={`border-b border-[#F0F0F2] transition-colors hover:bg-[#FAFAFA] ${selected.includes(t.id) ? "bg-[#FFF0EB]" : ""}`}>
                  <td className="px-4 py-3">
                    <input type="checkbox" checked={selected.includes(t.id)} onChange={() => toggleRow(t.id)} className="rounded accent-[#E8450F]" />
                  </td>
                  <td className="px-4 py-3 font-mono text-xs font-semibold text-[#E8450F] whitespace-nowrap">{t.id}</td>
                  <td className="px-4 py-3 text-xs text-[#444] whitespace-nowrap">{t.from} → {t.to}</td>
                  <td className="px-4 py-3 text-xs text-[#444] whitespace-nowrap">{t.driver}</td>
                  <td className="px-4 py-3">
                    <span className="text-xs font-semibold px-2 py-0.5 rounded-full whitespace-nowrap" style={{ color: t.statusC, background: t.statusBg }}>{t.status}</span>
                  </td>
                  <td className="px-4 py-3 text-xs text-[#6E6E80]">{t.weight}</td>
                  <td className="px-4 py-3 text-xs text-[#9898A4] whitespace-nowrap">{t.date}</td>
                  <td className="px-4 py-3"><button className="text-[#9898A4] hover:text-[#444]"><MoreHorizontal size={16} /></button></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        <div className="flex items-center justify-between px-4 py-3 border-t border-[#F0F0F2]">
          <p className="text-xs text-[#6E6E80]">Showing 5 of 128 trips</p>
          <div className="flex items-center gap-1">
            <button onClick={() => setPage(Math.max(1, page-1))} className="w-7 h-7 rounded-lg flex items-center justify-center text-[#6E6E80] hover:bg-[#F0F0F2] disabled:opacity-40" disabled={page===1}><ChevronLeft size={14} /></button>
            {[1,2,3,"…",26].map((p, i) => (
              <button key={i} onClick={() => typeof p === "number" && setPage(p)}
                className={`w-7 h-7 rounded-lg text-xs font-semibold ${page === p ? "bg-[#E8450F] text-white" : "text-[#444] hover:bg-[#F0F0F2]"}`}>{p}</button>
            ))}
            <button onClick={() => setPage(page+1)} className="w-7 h-7 rounded-lg flex items-center justify-center text-[#6E6E80] hover:bg-[#F0F0F2]"><ChevronRight size={14} /></button>
          </div>
        </div>
      </Card>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════════════════ */
/*  NOTIFICATIONS SECTION                                                       */
/* ═══════════════════════════════════════════════════════════════════════════ */
export const NOTIFS = [
  { id: 1, type: "success", icon: <CheckCircle2 size={18} />, color: "#16A34A", bg: "#F0FDF4", title: "Trip Completed",       body: "TRP-2387 · Riyadh → Jeddah delivered and POD confirmed.", time: "2 min ago", unread: true,  group: "Trips" },
  { id: 2, type: "warning", icon: <AlertTriangle size={18} />, color: "#D97706", bg: "#FFFBEB", title: "Document Expiring",    body: "Insurance for TRK-2041 expires in 3 days. Renew now.", time: "14 min ago", unread: true,  group: "Documents" },
  { id: 3, type: "info",    icon: <Info size={18} />,          color: "#2563EB", bg: "#EFF6FF", title: "New Trip Assigned",    body: "TRP-2390 has been assigned to your fleet.", time: "1 hr ago",  unread: true,  group: "Trips" },
  { id: 4, type: "error",   icon: <XCircle size={18} />,       color: "#DC2626", bg: "#FEF2F2", title: "Trip Delayed",         body: "TRP-2389 is delayed by 2 hours due to traffic.", time: "2 hr ago",  unread: false, group: "Trips" },
  { id: 5, type: "info",    icon: <Truck size={18} />,         color: "#6E6E80", bg: "#F5F5F7", title: "Driver Checked In",    body: "Ahmed Kareem has checked in for TRP-2388.", time: "3 hr ago",  unread: false, group: "Drivers" },
  { id: 6, type: "success", icon: <Shield size={18} />,        color: "#16A34A", bg: "#F0FDF4", title: "Document Renewed",     body: "Istimara for VRA-3358 has been renewed successfully.", time: "Yesterday", unread: false, group: "Documents" },
];

export function NotificationsSection() {
  const [readIds, setReadIds] = useState<number[]>([4, 5, 6]);

  return (
    <div>
      <SectionHeader title="Notifications" desc="Notification cards — unread, read, and grouped by category." />

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="overflow-hidden">
          <div className="flex items-center justify-between px-5 py-4 border-b border-[#F0F0F2]">
            <div className="flex items-center gap-2">
              <p className="text-sm font-bold text-[#111]">Notifications</p>
              <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-[#E8450F] text-white">{NOTIFS.filter((n) => !readIds.includes(n.id)).length}</span>
            </div>
            <button onClick={() => setReadIds(NOTIFS.map((n) => n.id))} className="text-xs text-[#E8450F] font-semibold hover:underline">Mark all read</button>
          </div>
          <div className="divide-y divide-[#F0F0F2]">
            {NOTIFS.map((n) => {
              const isUnread = !readIds.includes(n.id);
              return (
                <div key={n.id} onClick={() => setReadIds((r) => [...r, n.id])}
                  className={`flex items-start gap-3 px-5 py-4 cursor-pointer hover:bg-[#FAFAFA] transition-colors ${isUnread ? "bg-[#FAFAFA]" : ""}`}>
                  <div className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0" style={{ background: n.bg, color: n.color }}>{n.icon}</div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2">
                      <p className={`text-sm ${isUnread ? "font-semibold text-[#111]" : "font-medium text-[#444]"}`}>{n.title}</p>
                      <span className="text-[10px] text-[#9898A4] shrink-0 mt-0.5">{n.time}</span>
                    </div>
                    <p className="text-xs text-[#6E6E80] mt-0.5 leading-relaxed line-clamp-2">{n.body}</p>
                  </div>
                  {isUnread && <div className="w-2 h-2 rounded-full bg-[#E8450F] shrink-0 mt-1.5" />}
                </div>
              );
            })}
          </div>
        </Card>

        <div className="space-y-4">
          <Card className="p-5">
            <SubHeader title="Grouped — By Category" />
            {["Trips", "Documents", "Drivers"].map((group) => {
              const items = NOTIFS.filter((n) => n.group === group);
              return (
                <div key={group} className="mb-4 last:mb-0">
                  <p className="text-[10px] font-bold uppercase tracking-widest text-[#9898A4] mb-2">{group}</p>
                  {items.map((n) => (
                    <div key={n.id} className="flex items-center gap-2.5 py-2 border-b border-[#F5F5F7] last:border-0">
                      <span className="w-6 h-6 rounded-lg flex items-center justify-center shrink-0" style={{ background: n.bg, color: n.color }}>
                        {React.cloneElement(n.icon as React.ReactElement<any>, { size: 12 })}
                      </span>
                      <p className="text-xs text-[#444] flex-1 truncate">{n.title}</p>
                      <span className="text-[10px] text-[#9898A4]">{n.time}</span>
                    </div>
                  ))}
                </div>
              );
            })}
          </Card>
        </div>
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════════════════ */
/*  DRAWERS SECTION                                                             */
/* ═══════════════════════════════════════════════════════════════════════════ */
export function DrawersSection() {
  const [drawerOpen, setDrawerOpen] = useState<string | null>(null);

  return (
    <div>
      <SectionHeader title="Drawers" desc="Slide-in side panels for vehicle details, driver profiles, and trip overviews." />

      <Card className="p-8 mb-6">
        <SubHeader title="Click to Preview" />
        <div className="flex flex-wrap gap-3 mb-8">
          {["Vehicle Drawer", "Driver Drawer", "Trip Drawer"].map((label) => (
            <button key={label} onClick={() => setDrawerOpen(label)}
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-[#1A1A1A] text-white text-sm font-semibold hover:bg-[#333] transition-colors">
              <Layers size={15} /> {label} →
            </button>
          ))}
        </div>

        {/* Static preview */}
        <div className="flex gap-4 overflow-x-auto pb-2">
          {[
            {
              title: "Vehicle Details", sub: "TRK-2041 · 10 TON",
              rows: [["Vehicle No.", "TRK-2041"],["Plate","ABC-1234"],["Type","Hino 500"],["Capacity","10 TON"],["Year","2024"],["Fuel","Diesel"],["Status","Available"],["Total Trips","1,248"]],
              cta: "Track Vehicle",
            },
            {
              title: "Driver Profile", sub: "Ahmed Kareem · ★ 4.7",
              rows: [["Driver ID","DRV-0041"],["Phone","+966 50 123 4567"],["License","ABC123456"],["Expires","24 Jul 2026"],["Trips Done","1,248"],["Rating","4.7 / 5"],["Status","Available"],["Vehicle","TRK-2041"]],
              cta: "Assign Trip",
            },
          ].map((drawer) => (
            <div key={drawer.title} className="min-w-[260px] rounded-2xl border border-black/[0.08] shadow-sm overflow-hidden bg-white">
              <div className="bg-[#1C1C1E] px-5 py-4">
                <p className="text-base font-bold text-white">{drawer.title}</p>
                <p className="text-xs text-[rgba(255,255,255,0.5)] mt-0.5">{drawer.sub}</p>
              </div>
              <div className="px-5 py-4 space-y-2.5">
                {drawer.rows.map(([k, v]) => (
                  <div key={k} className="flex justify-between text-xs">
                    <span className="text-[#6E6E80]">{k}</span>
                    <span className="font-medium text-[#111]">{v}</span>
                  </div>
                ))}
              </div>
              <div className="px-5 pb-5 pt-2">
                <button className="w-full py-2.5 rounded-xl bg-[#E8450F] text-white text-sm font-semibold hover:bg-[#C7380A] transition-colors">{drawer.cta}</button>
              </div>
            </div>
          ))}
        </div>
      </Card>

      {/* Live drawer */}
      {drawerOpen && (
        <div className="fixed inset-0 z-[100] flex" onClick={() => setDrawerOpen(null)}>
          <div className="absolute inset-0 bg-[rgba(0,0,0,0.4)] backdrop-blur-sm" />
          <div className="relative ml-auto w-80 bg-white h-full shadow-2xl flex flex-col" onClick={(e) => e.stopPropagation()}>
            <div className="bg-[#1C1C1E] px-5 py-5 flex items-center justify-between">
              <div>
                <p className="text-base font-bold text-white">{drawerOpen}</p>
                <p className="text-xs text-[rgba(255,255,255,0.5)] mt-0.5">TRK-2041 · 10 TON Hino 500</p>
              </div>
              <button onClick={() => setDrawerOpen(null)} className="w-8 h-8 rounded-lg bg-[rgba(255,255,255,0.1)] flex items-center justify-center text-white hover:bg-[rgba(255,255,255,0.2)]"><X size={16} /></button>
            </div>
            <div className="flex-1 overflow-y-auto px-5 py-5 space-y-3">
              {[["Vehicle No.","TRK-2041"],["Plate","ABC-1234"],["Type","Hino 500"],["Capacity","10 TON"],["Year","2024"],["Status","Available"],["Driver","Ahmed Kareem"],["Total Trips","1,248"],["Distance","248,320 km"]].map(([k,v]) => (
                <div key={k} className="flex justify-between py-2 border-b border-[#F5F5F7] text-sm">
                  <span className="text-[#6E6E80]">{k}</span>
                  <span className="font-semibold text-[#111]">{v}</span>
                </div>
              ))}
            </div>
            <div className="px-5 py-4 border-t border-[#F0F0F2] flex gap-2">
              <button className="flex-1 py-2.5 rounded-xl bg-[#F0F0F2] text-sm font-semibold text-[#444]">Edit</button>
              <button className="flex-1 py-2.5 rounded-xl bg-[#E8450F] text-white text-sm font-semibold">Track</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
