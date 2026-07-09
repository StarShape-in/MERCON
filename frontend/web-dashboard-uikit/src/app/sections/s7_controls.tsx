import React, { useState } from "react";
import {
  BarChart3, Truck, Car, Users, ChevronLeft, ChevronRight,
  Check, MapPin, Package, Search, Clock, Loader2,
  CloudUpload, FileText, X, Trash2, Image, Upload
} from "lucide-react";
import { Card, SectionHeader, SubHeader } from "./common";

/* ═══════════════════════════════════════════════════════════════════════════ */
/*  TABS SECTION                                                                */
/* ═══════════════════════════════════════════════════════════════════════════ */
export function TabsSection() {
  const [pill, setPill] = useState("All");
  const [underline, setUnderline] = useState("Trips");
  const [icon, setIcon] = useState("Overview");
  const [seg, setSeg] = useState("List");

  return (
    <div>
      <SectionHeader title="Tabs" desc="Four tab styles — pill, underline, icon, and segmented control." />

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card className="p-6">
          <SubHeader title="Pill Tabs" />
          <div className="flex gap-1 p-1 bg-[#F0F0F2] rounded-xl w-fit mb-4">
            {["All", "Active", "Expired", "Renewed"].map((t) => (
              <button key={t} onClick={() => setPill(t)}
                className={`px-4 py-2 rounded-lg text-xs font-semibold transition-all ${pill === t ? "bg-white text-[#111] shadow-sm" : "text-[#6E6E80] hover:text-[#111]"}`}>
                {t}
              </button>
            ))}
          </div>
          <p className="text-xs text-[#9898A4]">Active: <strong className="text-[#111]">{pill}</strong></p>
        </Card>

        <Card className="p-6">
          <SubHeader title="Underline Tabs" />
          <div className="flex gap-6 border-b border-[#EBEBED] mb-4">
            {["Trips", "Drivers", "Vehicles", "Reports"].map((t) => (
              <button key={t} onClick={() => setUnderline(t)}
                className={`pb-2.5 text-sm font-semibold border-b-2 -mb-px transition-colors ${underline === t ? "border-[#E8450F] text-[#E8450F]" : "border-transparent text-[#6E6E80] hover:text-[#111]"}`}>
                {t}
              </button>
            ))}
          </div>
          <p className="text-xs text-[#9898A4]">Active: <strong className="text-[#111]">{underline}</strong></p>
        </Card>

        <Card className="p-6">
          <SubHeader title="Icon Tabs" />
          <div className="flex gap-1 border border-[#EBEBED] rounded-2xl p-1 mb-4">
            {[
              { label: "Overview", icon: <BarChart3 size={16} /> },
              { label: "Trips",    icon: <Truck size={16} /> },
              { label: "Vehicles", icon: <Car size={16} /> },
              { label: "Drivers",  icon: <Users size={16} /> },
            ].map((t) => (
              <button key={t.label} onClick={() => setIcon(t.label)}
                className={`flex items-center gap-1.5 flex-1 justify-center py-2 rounded-xl text-xs font-semibold transition-all ${icon === t.label ? "bg-[#E8450F] text-white" : "text-[#6E6E80] hover:text-[#111]"}`}>
                {t.icon}{t.label}
              </button>
            ))}
          </div>
          <p className="text-xs text-[#9898A4]">Active: <strong className="text-[#111]">{icon}</strong></p>
        </Card>

        <Card className="p-6">
          <SubHeader title="Segmented Control" />
          <div className="flex gap-0 border border-[#EBEBED] rounded-xl overflow-hidden mb-4 w-fit">
            {["List", "Grid", "Map"].map((t, i) => (
              <button key={t} onClick={() => setSeg(t)}
                className={`px-5 py-2 text-xs font-semibold border-r border-[#EBEBED] last:border-0 transition-colors ${seg === t ? "bg-[#1A1A1A] text-white" : "bg-white text-[#6E6E80] hover:bg-[#F5F5F7]"}`}>
                {t}
              </button>
            ))}
          </div>
          <p className="text-xs text-[#9898A4]">Active: <strong className="text-[#111]">{seg}</strong></p>
        </Card>
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════════════════ */
/*  PROGRESS SECTION                                                            */
/* ═══════════════════════════════════════════════════════════════════════════ */
export function ProgressSection() {
  const [step, setStep] = useState(2);
  const steps = ["Create Trip", "Assign Driver", "Confirm Route", "Dispatch"];

  return (
    <div>
      <SectionHeader title="Progress" desc="Linear progress, circular rings, step indicators, and timeline." />

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
        <Card className="p-6">
          <SubHeader title="Linear Progress" />
          <div className="space-y-4">
            {[
              { label: "Fleet Utilization",  pct: 85, color: "#16A34A" },
              { label: "Document Compliance", pct: 67, color: "#2563EB" },
              { label: "On-Time Delivery",    pct: 78, color: "#E8450F" },
              { label: "Maintenance Due",     pct: 32, color: "#D97706" },
            ].map((p) => (
              <div key={p.label}>
                <div className="flex justify-between text-xs mb-1.5">
                  <span className="font-medium text-[#444]">{p.label}</span>
                  <span className="font-bold" style={{ color: p.color }}>{p.pct}%</span>
                </div>
                <div className="h-2 rounded-full bg-[#EBEBED] overflow-hidden">
                  <div className="h-full rounded-full transition-all" style={{ width: `${p.pct}%`, background: p.color }} />
                </div>
              </div>
            ))}
          </div>
        </Card>

        <Card className="p-6">
          <SubHeader title="Circular Progress Rings" />
          <div className="flex flex-wrap gap-6">
            {[
              { pct: 85, label: "TRK-2041", color: "#16A34A" },
              { pct: 78, label: "DRA-9973", color: "#2563EB" },
              { pct: 92, label: "VRA-3358", color: "#E8450F" },
            ].map((ring) => {
              const r = 28; const circ = 2 * Math.PI * r;
              return (
                <div key={ring.label} className="flex flex-col items-center gap-2">
                  <svg width={72} height={72} viewBox="0 0 72 72">
                    <circle cx={36} cy={36} r={r} fill="none" stroke="#EBEBED" strokeWidth={8} />
                    <circle cx={36} cy={36} r={r} fill="none" stroke={ring.color} strokeWidth={8}
                      strokeDasharray={circ} strokeDashoffset={circ * (1 - ring.pct / 100)}
                      strokeLinecap="round" transform="rotate(-90 36 36)" />
                    <text x={36} y={40} textAnchor="middle" fontSize={13} fontWeight={700} fill={ring.color}>{ring.pct}%</text>
                  </svg>
                  <p className="text-xs font-mono font-semibold text-[#444]">{ring.label}</p>
                </div>
              );
            })}
          </div>
        </Card>
      </div>

      <Card className="p-6 mb-6">
        <SubHeader title="Step Indicator — Trip Creation" />
        <div className="flex items-center justify-between max-w-lg relative">
          <div className="absolute left-0 right-0 top-4 h-0.5 bg-[#EBEBED] -z-0 mx-8" />
          <div className="absolute left-0 top-4 h-0.5 bg-[#E8450F] -z-0 mx-8 transition-all" style={{ right: `${(1 - (step) / (steps.length - 1)) * 100}%` }} />
          {steps.map((s, i) => (
            <button key={s} onClick={() => setStep(i)} className="flex flex-col items-center gap-2 relative z-10">
              <div className={`w-8 h-8 rounded-full border-2 flex items-center justify-center text-xs font-bold transition-all ${i < step ? "bg-[#E8450F] border-[#E8450F] text-white" : i === step ? "bg-white border-[#E8450F] text-[#E8450F]" : "bg-white border-[#EBEBED] text-[#9898A4]"}`}>
                {i < step ? <Check size={14} /> : i + 1}
              </div>
              <p className={`text-[10px] font-semibold whitespace-nowrap ${i <= step ? "text-[#111]" : "text-[#9898A4]"}`}>{s}</p>
            </button>
          ))}
        </div>
        <div className="flex gap-2 mt-6">
          <button onClick={() => setStep(Math.max(0, step-1))} className="px-4 py-2 rounded-xl bg-[#F0F0F2] text-xs font-semibold text-[#444] disabled:opacity-40" disabled={step===0}>← Back</button>
          <button onClick={() => setStep(Math.min(steps.length-1, step+1))} className="px-4 py-2 rounded-xl bg-[#E8450F] text-xs font-semibold text-white disabled:opacity-40" disabled={step===steps.length-1}>Next →</button>
        </div>
      </Card>

      <Card className="p-6">
        <SubHeader title="Timeline — Trip History" />
        <div className="relative pl-6">
          <div className="absolute left-2.5 top-0 bottom-0 w-0.5 bg-[#EBEBED]" />
          {[
            { icon: <Check size={14} />, color: "#16A34A", bg: "#F0FDF4", title: "Delivery Completed", sub: "POD received and verified · 24 May 2025, 08:03 PM" },
            { icon: <MapPin size={14} />,        color: "#2563EB", bg: "#EFF6FF", title: "Arrived at Destination", sub: "Jeddah, Saudi Arabia · 24 May 2025, 07:45 PM" },
            { icon: <Truck size={14} />,         color: "#E8450F", bg: "#FFF0EB", title: "In Transit",          sub: "Ahmed Kareem · TRK-2041 · 24 May 2025, 10:00 AM" },
            { icon: <Package size={14} />,       color: "#6E6E80", bg: "#F5F5F7", title: "Trip Dispatched",     sub: "Riyadh depot · 24 May 2025, 08:00 AM" },
          ].map((e, i) => (
            <div key={i} className="relative flex items-start gap-3 mb-5 last:mb-0">
              <div className="absolute -left-6 w-5 h-5 rounded-full flex items-center justify-center" style={{ background: e.bg, color: e.color }}>{e.icon}</div>
              <div>
                <p className="text-sm font-semibold text-[#111]">{e.title}</p>
                <p className="text-xs text-[#6E6E80] mt-0.5">{e.sub}</p>
              </div>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════════════════ */
/*  FILE UPLOAD SECTION                                                         */
/* ═══════════════════════════════════════════════════════════════════════════ */
export function FileUploadSection() {
  const [dragOver, setDragOver] = useState(false);

  return (
    <div>
      <SectionHeader title="File Upload" desc="Drag & drop, upload progress, preview, error, and multi-file states." />

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
        <Card className="p-6">
          <SubHeader title="Drag & Drop Zone" />
          <div onDragOver={(e) => { e.preventDefault(); setDragOver(true); }} onDragLeave={() => setDragOver(false)} onDrop={() => setDragOver(false)}
            className={`border-2 border-dashed rounded-2xl p-8 flex flex-col items-center text-center transition-colors ${dragOver ? "border-[#E8450F] bg-[#FFF0EB]" : "border-[#D8D8DC] hover:border-[#E8450F] hover:bg-[#FFF8F6]"}`}>
            <div className="w-12 h-12 rounded-2xl bg-[#FFF0EB] flex items-center justify-center mb-3">
              <CloudUpload size={24} className="text-[#E8450F]" />
            </div>
            <p className="text-sm font-semibold text-[#111] mb-1">Drop files here</p>
            <p className="text-xs text-[#6E6E80] mb-4">PDF, PNG, JPG up to 10MB</p>
            <button className="px-4 py-2 rounded-xl bg-[#E8450F] text-white text-xs font-semibold hover:bg-[#C7380A] transition-colors">Browse Files</button>
          </div>
        </Card>

        <Card className="p-6">
          <SubHeader title="Upload States" />
          <div className="space-y-3">
            {/* Uploading */}
            <div className="flex items-center gap-3 p-3 rounded-xl bg-[#F5F5F7]">
              <div className="w-9 h-9 rounded-xl bg-[#EFF6FF] flex items-center justify-center shrink-0"><FileText size={18} className="text-[#2563EB]" /></div>
              <div className="flex-1 min-w-0">
                <p className="text-xs font-semibold text-[#111] truncate">insurance_doc.pdf</p>
                <div className="mt-1 h-1.5 rounded-full bg-[#EBEBED] overflow-hidden">
                  <div className="h-full rounded-full bg-[#2563EB] w-[62%]" />
                </div>
                <p className="text-[10px] text-[#6E6E80] mt-0.5">62% · 1.2 MB of 2 MB</p>
              </div>
              <button className="text-[#9898A4] hover:text-[#DC2626]"><X size={14} /></button>
            </div>
            {/* Uploaded */}
            <div className="flex items-center gap-3 p-3 rounded-xl bg-[#F0FDF4] border border-[#BBF7D0]">
              <div className="w-9 h-9 rounded-xl bg-[#DCFCE7] flex items-center justify-center shrink-0"><FileText size={18} className="text-[#16A34A]" /></div>
              <div className="flex-1 min-w-0">
                <p className="text-xs font-semibold text-[#111] truncate">fahas_certificate.pdf</p>
                <p className="text-[10px] text-[#16A34A] mt-0.5">✓ Uploaded successfully · 856 KB</p>
              </div>
              <button className="text-[#9898A4] hover:text-[#DC2626]"><Trash2 size={14} /></button>
            </div>
            {/* Error */}
            <div className="flex items-center gap-3 p-3 rounded-xl bg-[#FEF2F2] border border-[#FECACA]">
              <div className="w-9 h-9 rounded-xl bg-[#FEE2E2] flex items-center justify-center shrink-0"><FileText size={18} className="text-[#DC2626]" /></div>
              <div className="flex-1 min-w-0">
                <p className="text-xs font-semibold text-[#111] truncate">large_video.mp4</p>
                <p className="text-[10px] text-[#DC2626] mt-0.5">✗ File too large (max 10MB)</p>
              </div>
              <button className="text-[#E8450F] text-[10px] font-bold hover:underline">Retry</button>
            </div>
            {/* Image preview */}
            <div className="flex items-center gap-3 p-3 rounded-xl bg-[#F5F5F7]">
              <div className="w-9 h-9 rounded-xl bg-[rgba(232,69,15,0.1)] flex items-center justify-center shrink-0"><Image size={18} className="text-[#E8450F]" /></div>
              <div className="flex-1 min-w-0">
                <p className="text-xs font-semibold text-[#111] truncate">delivery_photo.jpg</p>
                <p className="text-[10px] text-[#6E6E80] mt-0.5">Preview available · 340 KB</p>
              </div>
              <button className="text-xs text-[#2563EB] font-semibold hover:underline">View</button>
            </div>
          </div>
        </Card>
      </div>

      <Card className="p-6">
        <SubHeader title="Multiple Files Queue" />
        <div className="flex flex-wrap gap-2 mb-3">
          {["Insurance", "Fahas", "Istimara", "Misan Card", "SASO"].map((doc, i) => (
            <div key={doc} className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold border ${i < 2 ? "bg-[#F0FDF4] border-[#BBF7D0] text-[#16A34A]" : i === 2 ? "bg-[#EFF6FF] border-[#BFDBFE] text-[#2563EB]" : "bg-[#F5F5F7] border-[#EBEBED] text-[#6E6E80]"}`}>
              <FileText size={12} /> {doc}
              {i < 2 && <Check size={11} />}
              {i === 2 && <Loader2 size={11} className="animate-spin" />}
              {i >= 3 && <Upload size={11} />}
            </div>
          ))}
        </div>
        <p className="text-xs text-[#6E6E80]">2 of 5 uploaded · 3 pending</p>
      </Card>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════════════════ */
/*  CALENDAR SECTION                                                            */
/* ═══════════════════════════════════════════════════════════════════════════ */
export function CalendarSection() {
  const [selectedDate, setSelectedDate] = useState(24);
  const days = ["Sun","Mon","Tue","Wed","Thu","Fri","Sat"];
  const calDays = [null, null, null, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21, 22, 23, 24, 25, 26, 27, 28, 29, 30, 31];
  const events: Record<number, string> = { 5: "orange", 12: "blue", 18: "green", 24: "orange", 27: "green", 30: "red" };

  return (
    <div>
      <SectionHeader title="Calendar" desc="Month view, date picker, and logistics schedule timeline." />

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
        <Card className="p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-base font-bold text-[#111]">May 2025</h3>
            <div className="flex gap-1">
              <button className="w-8 h-8 rounded-lg bg-[#F0F0F2] flex items-center justify-center text-[#6E6E80] hover:bg-[#E5E5E8]"><ChevronLeft size={16} /></button>
              <button className="w-8 h-8 rounded-lg bg-[#F0F0F2] flex items-center justify-center text-[#6E6E80] hover:bg-[#E5E5E8]"><ChevronRight size={16} /></button>
            </div>
          </div>
          <div className="grid grid-cols-7 gap-0.5 mb-1">
            {days.map((d) => <p key={d} className="text-center text-[10px] font-semibold text-[#9898A4] py-1">{d}</p>)}
          </div>
          <div className="grid grid-cols-7 gap-0.5">
            {calDays.map((d, i) => (
              <button key={i} onClick={() => d && setSelectedDate(d)}
                className={`aspect-square flex flex-col items-center justify-center rounded-xl text-xs font-semibold relative transition-colors
                  ${!d ? "invisible" : ""}
                  ${d === selectedDate ? "bg-[#E8450F] text-white" : "text-[#444] hover:bg-[#F5F5F7]"}`}>
                {d}
                {d && events[d] && (
                  <span className={`absolute bottom-1 w-1 h-1 rounded-full ${d === selectedDate ? "bg-white" : events[d] === "orange" ? "bg-[#E8450F]" : events[d] === "green" ? "bg-[#16A34A]" : events[d] === "blue" ? "bg-[#2563EB]" : "bg-[#DC2626]"}`} />
                )}
              </button>
            ))}
          </div>
        </Card>

        <Card className="p-6">
          <SubHeader title="Scheduled Trips — May 24" />
          <div className="space-y-3">
            {[
              { time: "08:00", id: "TRP-2387", route: "Riyadh → Jeddah", driver: "Ahmed K.", color: "#E8450F" },
              { time: "10:30", id: "TRP-2388", route: "Riyadh → Abha",   driver: "Faisal B.", color: "#2563EB" },
              { time: "14:00", id: "TRP-2389", route: "Riyadh → Dammam", driver: "Bader A.",  color: "#16A34A" },
            ].map((ev) => (
              <div key={ev.id} className="flex items-center gap-3">
                <div className="text-right w-12 shrink-0">
                  <p className="text-[10px] font-semibold text-[#6E6E80]">{ev.time}</p>
                </div>
                <div className="w-0.5 h-10 rounded-full" style={{ background: ev.color }} />
                <div className="flex-1 min-w-0 p-2.5 rounded-xl bg-[#F5F5F7]">
                  <div className="flex items-center gap-1.5">
                    <span className="text-[10px] font-mono font-bold" style={{ color: ev.color }}>{ev.id}</span>
                  </div>
                  <p className="text-xs font-semibold text-[#111]">{ev.route}</p>
                  <p className="text-[10px] text-[#6E6E80]">{ev.driver}</p>
                </div>
              </div>
            ))}
          </div>
        </Card>
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════════════════ */
/*  SEARCH SECTION                                                              */
/* ═══════════════════════════════════════════════════════════════════════════ */
export function SearchSection() {
  const [query, setQuery] = useState("");

  const recent = ["TRP-2387", "Ahmed Kareem", "TRK-2041", "Riyadh → Jeddah"];
  const suggestions = ["TRP-2388 · In Transit", "TRP-2389 · Delayed", "TRK-2041 · Available", "Ahmed Kareem · Driver"];
  const noResult = query.length > 3 && !suggestions.some((s) => s.toLowerCase().includes(query.toLowerCase()));

  return (
    <div>
      <SectionHeader title="Search" desc="Recent searches, suggestions, no-result, and filtered result states." />

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card className="p-6">
          <SubHeader title="Empty / Recent Searches" />
          <div className="relative mb-4">
            <Search size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-[#9898A4]" />
            <input className="w-full pl-10 pr-4 py-3 rounded-xl bg-[#F0F0F2] text-sm outline-none focus:ring-2 focus:ring-[rgba(232,69,15,0.3)] placeholder:text-[#9898A4]"
              placeholder="Search Trip, Route, Customer…" value={query} onChange={(e) => setQuery(e.target.value)} />
          </div>
          {!query && (
            <div>
              <p className="text-[10px] font-bold uppercase tracking-wider text-[#9898A4] mb-2">Recent</p>
              {recent.map((r) => (
                <button key={r} onClick={() => setQuery(r)} className="w-full flex items-center gap-2.5 py-2 text-sm text-[#444] hover:bg-[#F5F5F7] rounded-lg px-2 -mx-2">
                  <Clock size={14} className="text-[#9898A4]" />{r}
                </button>
              ))}
            </div>
          )}
          {query && !noResult && (
            <div>
              <p className="text-[10px] font-bold uppercase tracking-wider text-[#9898A4] mb-2">Suggestions</p>
              {suggestions.filter((s) => s.toLowerCase().includes(query.toLowerCase())).map((s) => (
                <button key={s} onClick={() => setQuery(s.split(" · ")[0])} className="w-full flex items-center gap-2.5 py-2 text-sm text-[#444] hover:bg-[#F5F5F7] rounded-lg px-2 -mx-2">
                  <Search size={14} className="text-[#9898A4]" />
                  <span dangerouslySetInnerHTML={{ __html: s.replace(new RegExp(`(${query})`, "gi"), "<strong>$1</strong>") }} />
                </button>
              ))}
            </div>
          )}
          {noResult && (
            <div className="text-center py-6">
              <div className="w-12 h-12 rounded-2xl bg-[#F5F5F7] flex items-center justify-center mx-auto mb-3">
                <Search size={22} className="text-[#9898A4]" strokeWidth={1.8} />
              </div>
              <p className="text-sm font-semibold text-[#111]">No results for "{query}"</p>
              <p className="text-xs text-[#6E6E80] mt-1">Try different keywords or clear filters</p>
            </div>
          )}
        </Card>

        <Card className="p-6">
          <SubHeader title="Filter Result State" />
          <div className="flex flex-wrap gap-2 mb-4">
            {["Completed ×", "This Month ×", "Riyadh ×"].map((chip) => (
              <span key={chip} className="flex items-center gap-1 px-3 py-1 rounded-full bg-[#FFF0EB] text-[#E8450F] text-xs font-semibold">{chip}</span>
            ))}
            <button className="text-xs text-[#6E6E80] font-medium hover:text-[#DC2626]">Clear all</button>
          </div>
          <p className="text-xs text-[#6E6E80] mb-3">86 results found</p>
          {["TRP-2387", "TRP-2388", "TRP-2392"].map((id) => (
            <div key={id} className="flex items-center gap-3 py-2.5 border-b border-[#F5F5F7] last:border-0">
              <Truck size={14} className="text-[#6E6E80]" />
              <span className="text-xs font-mono font-semibold text-[#E8450F]">{id}</span>
              <span className="text-xs text-[#6E6E80]">Riyadh → Jeddah</span>
              <span className="ml-auto text-xs font-semibold text-[#16A34A]">Completed</span>
            </div>
          ))}
        </Card>
      </div>
    </div>
  );
}
