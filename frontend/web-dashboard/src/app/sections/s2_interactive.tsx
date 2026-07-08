import React, { useState } from "react";
import {
  Plus, Download, Eye, EyeOff, ChevronRight, Filter, FileText,
  Search, Calendar, Check, Loader2
} from "lucide-react";
import { Card, SectionHeader, SubHeader } from "./common";

/* ═══════════════════════════════════════════════════════════════════════════ */
/*  BUTTONS SECTION                                                             */
/* ═══════════════════════════════════════════════════════════════════════════ */
export function ButtonsSection() {
  const [loading, setLoading] = useState(false);

  return (
    <div>
      <SectionHeader title="Buttons" desc="All button variants, sizes, and states." />

      <Card className="p-8 mb-6">
        <SubHeader title="Variants" />
        <div className="flex flex-wrap gap-3">
          <button className="px-5 py-2.5 rounded-xl bg-[#E8450F] text-white text-sm font-semibold hover:bg-[#C7380A] transition-colors">Primary</button>
          <button className="px-5 py-2.5 rounded-xl bg-[#1A1A1A] text-white text-sm font-semibold hover:bg-[#333] transition-colors">Dark</button>
          <button className="px-5 py-2.5 rounded-xl bg-[#F0F0F2] text-[#111] text-sm font-semibold hover:bg-[#E5E5E8] transition-colors">Secondary</button>
          <button className="px-5 py-2.5 rounded-xl border-2 border-[#E8450F] text-[#E8450F] text-sm font-semibold hover:bg-[#FFF0EB] transition-colors">Outline</button>
          <button className="px-5 py-2.5 rounded-xl text-[#E8450F] text-sm font-semibold hover:bg-[#FFF0EB] transition-colors">Ghost</button>
          <button className="px-5 py-2.5 rounded-xl bg-[#F0FDF4] text-[#16A34A] text-sm font-semibold border border-[rgba(22,163,74,0.2)] hover:bg-[#DCFCE7] transition-colors">Success</button>
          <button className="px-5 py-2.5 rounded-xl bg-[#FEF2F2] text-[#DC2626] text-sm font-semibold border border-[rgba(220,38,38,0.2)] hover:bg-[#FEE2E2] transition-colors">Danger</button>
          <button className="px-5 py-2.5 rounded-xl bg-[#F0F0F2] text-[#B8B8C0] text-sm font-semibold cursor-not-allowed" disabled>Disabled</button>
        </div>
      </Card>

      <Card className="p-8 mb-6">
        <SubHeader title="Sizes" />
        <div className="flex flex-wrap items-center gap-3">
          <button className="px-3 py-1.5 rounded-lg bg-[#E8450F] text-white text-xs font-semibold">Small</button>
          <button className="px-4 py-2 rounded-xl bg-[#E8450F] text-white text-sm font-semibold">Medium</button>
          <button className="px-6 py-3 rounded-xl bg-[#E8450F] text-white text-base font-semibold">Large</button>
          <button className="px-8 py-4 rounded-2xl bg-[#E8450F] text-white text-lg font-semibold">XL</button>
        </div>
      </Card>

      <Card className="p-8 mb-6">
        <SubHeader title="With Icons" />
        <div className="flex flex-wrap gap-3">
          <button className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-[#E8450F] text-white text-sm font-semibold hover:bg-[#C7380A] transition-colors">
            <Plus size={16} /> New Trip
          </button>
          <button className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-[#F0F0F2] text-[#111] text-sm font-semibold hover:bg-[#E5E5E8] transition-colors">
            <Download size={16} /> Export
          </button>
          <button className="flex items-center gap-2 px-5 py-2.5 rounded-xl border-2 border-[#E8450F] text-[#E8450F] text-sm font-semibold hover:bg-[#FFF0EB] transition-colors">
            <Eye size={16} /> View Details <ChevronRight size={14} />
          </button>
          <button className="flex items-center justify-center w-10 h-10 rounded-xl bg-[#E8450F] text-white hover:bg-[#C7380A] transition-colors">
            <Plus size={20} />
          </button>
          <button className="flex items-center justify-center w-10 h-10 rounded-xl bg-[#F0F0F2] text-[#444] hover:bg-[#E5E5E8] transition-colors">
            <Filter size={18} />
          </button>
        </div>
      </Card>

      <Card className="p-8 mb-6">
        <SubHeader title="Full Width — App CTAs" />
        <div className="max-w-sm space-y-3">
          <button className="w-full flex items-center justify-between px-5 py-4 rounded-2xl bg-[#E8450F] text-white text-sm font-semibold hover:bg-[#C7380A] transition-colors">
            <span className="flex items-center gap-2"><FileText size={18} /> Continue to Billing</span>
            <ChevronRight size={18} />
          </button>
          <button className="w-full flex items-center justify-center gap-2 px-5 py-4 rounded-2xl border-2 border-[#E8E8EB] text-[#111] text-sm font-semibold hover:bg-[#F5F5F7] transition-colors">
            <FileText size={18} /> View Trip Details
          </button>
          <button className="w-full flex items-center justify-center gap-2 px-5 py-3.5 rounded-2xl bg-[#F0F0F2] text-[#444] text-sm font-semibold hover:bg-[#E5E5E8] transition-colors">
            Go to Home
          </button>
        </div>
      </Card>

      <Card className="p-8">
        <SubHeader title="Loading State" />
        <div className="flex flex-wrap gap-3 items-center">
          <button
            onClick={() => { setLoading(true); setTimeout(() => setLoading(false), 2000); }}
            className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-[#E8450F] text-white text-sm font-semibold hover:bg-[#C7380A] transition-colors disabled:opacity-70"
            disabled={loading}
          >
            {loading ? (
              <>
                <svg className="animate-spin w-4 h-4" viewBox="0 0 24 24" fill="none">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z" />
                </svg>
                Loading…
              </>
            ) : "Click to Load"}
          </button>
          <p className="text-xs text-[#6E6E80]">{loading ? "Loading in progress" : "Click to trigger loading state"}</p>
        </div>
      </Card>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════════════════ */
/*  BADGES SECTION                                                              */
/* ═══════════════════════════════════════════════════════════════════════════ */
export function Badge({ color, bg, label, dot = false }: { color: string; bg: string; label: string; dot?: boolean }) {
  return (
    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold" style={{ color, background: bg }}>
      {dot && <span className="w-1.5 h-1.5 rounded-full" style={{ background: color }} />}
      {label}
    </span>
  );
}

export function BadgesSection() {
  return (
    <div>
      <SectionHeader title="Badges" desc="Status chips, tags, and indicator pills used throughout the app." />

      <Card className="p-8 mb-6">
        <SubHeader title="Trip Status Badges" />
        <div className="flex flex-wrap gap-3">
          <Badge color="#16A34A" bg="#F0FDF4" label="Completed" dot />
          <Badge color="#2563EB" bg="#EFF6FF" label="In Transit" dot />
          <Badge color="#D97706" bg="#FFFBEB" label="Delayed" dot />
          <Badge color="#DC2626" bg="#FEF2F2" label="Cancelled" dot />
          <Badge color="#6E6E80" bg="#F5F5F7" label="Pending" dot />
          <Badge color="#7C3AED" bg="#F5F3FF" label="Scheduled" dot />
        </div>
      </Card>

      <Card className="p-8 mb-6">
        <SubHeader title="Document Status Badges" />
        <div className="flex flex-wrap gap-3">
          <Badge color="#16A34A" bg="#F0FDF4" label="Active" />
          <Badge color="#D97706" bg="#FFFBEB" label="Expiring Soon" />
          <Badge color="#DC2626" bg="#FEF2F2" label="Expired" />
          <Badge color="#DC2626" bg="#FEF2F2" label="Overdue" />
          <Badge color="#2563EB" bg="#EFF6FF" label="Renewed" />
          <Badge color="#6E6E80" bg="#F5F5F7" label="Pending Upload" />
        </div>
      </Card>

      <Card className="p-8 mb-6">
        <SubHeader title="Vehicle Status" />
        <div className="flex flex-wrap gap-3">
          <Badge color="#16A34A" bg="#F0FDF4" label="Available" />
          <Badge color="#2563EB" bg="#EFF6FF" label="On Trip" />
          <Badge color="#D97706" bg="#FFFBEB" label="Maintenance" />
          <Badge color="#DC2626" bg="#FEF2F2" label="Inactive" />
          <Badge color="#6E6E80" bg="#F5F5F7" label="Assigned" />
        </div>
      </Card>

      <Card className="p-8 mb-6">
        <SubHeader title="Priority / Urgency" />
        <div className="flex flex-wrap gap-3">
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-[#DC2626] text-white">Critical</span>
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-[#D97706] text-white">High</span>
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-[#2563EB] text-white">Medium</span>
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-[#6E6E80] text-white">Low</span>
        </div>
      </Card>

      <Card className="p-8">
        <SubHeader title="Filter Chips" />
        <div className="flex flex-wrap gap-2">
          {["All", "This Week", "This Month", "Completed", "In Transit", "Delayed", "Cancelled"].map((label, i) => (
            <button
              key={label}
              className={`px-3 py-1.5 rounded-full text-xs font-semibold transition-colors ${
                i === 0
                  ? "bg-[#1A1A1A] text-white"
                  : i === 2
                  ? "bg-[#E8450F] text-white"
                  : "bg-[#F0F0F2] text-[#444] hover:bg-[#E5E5E8]"
              }`}
            >
              {label}
            </button>
          ))}
        </div>
      </Card>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════════════════ */
/*  INPUTS SECTION                                                              */
/* ═══════════════════════════════════════════════════════════════════════════ */
export function InputsSection() {
  const [showPwd, setShowPwd] = useState(false);
  const [searchVal, setSearchVal] = useState("");

  return (
    <div>
      <SectionHeader title="Inputs" desc="Form controls — text fields, dropdowns, search, and states." />

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card className="p-6">
          <SubHeader title="Default" />
          <div className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-[#111] mb-1.5">Trip ID</label>
              <input
                className="w-full px-4 py-3 rounded-xl bg-[#F0F0F2] text-sm text-[#111] outline-none focus:ring-2 focus:ring-[rgba(232,69,15,0.3)] placeholder:text-[#9898A4]"
                placeholder="e.g. TRP-2387"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-[#111] mb-1.5">Driver Name</label>
              <input
                className="w-full px-4 py-3 rounded-xl bg-[#F0F0F2] text-sm text-[#111] outline-none focus:ring-2 focus:ring-[rgba(232,69,15,0.3)] placeholder:text-[#9898A4]"
                defaultValue="Ahmed Kareem"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-[#111] mb-1.5">Notes</label>
              <textarea
                className="w-full px-4 py-3 rounded-xl bg-[#F0F0F2] text-sm text-[#111] outline-none focus:ring-2 focus:ring-[rgba(232,69,15,0.3)] placeholder:text-[#9898A4] resize-none"
                rows={3}
                placeholder="Add delivery notes..."
              />
            </div>
          </div>
        </Card>

        <Card className="p-6">
          <SubHeader title="States" />
          <div className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-[#111] mb-1.5">Focused</label>
              <input
                className="w-full px-4 py-3 rounded-xl bg-[#F0F0F2] text-sm text-[#111] ring-2 ring-[rgba(232,69,15,0.3)] outline-none"
                defaultValue="Riyadh, Saudi Arabia"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-[#DC2626] mb-1.5">Error</label>
              <input
                className="w-full px-4 py-3 rounded-xl bg-[#FEF2F2] text-sm text-[#111] ring-2 ring-[rgba(220,38,38,0.4)] outline-none"
                defaultValue="invalid-plate"
              />
              <p className="text-xs text-[#DC2626] mt-1">Plate number format is invalid</p>
            </div>
            <div>
              <label className="block text-xs font-semibold text-[#16A34A] mb-1.5">Success</label>
              <input
                className="w-full px-4 py-3 rounded-xl bg-[#F0FDF4] text-sm text-[#111] ring-2 ring-[rgba(22,163,74,0.4)] outline-none"
                defaultValue="ABC-1234"
              />
              <p className="text-xs text-[#16A34A] mt-1">Plate number verified</p>
            </div>
          </div>
        </Card>

        <Card className="p-6">
          <SubHeader title="Search" />
          <div className="relative">
            <Search size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-[#9898A4]" />
            <input
              className="w-full pl-10 pr-4 py-3 rounded-xl bg-[#F0F0F2] text-sm text-[#111] outline-none focus:ring-2 focus:ring-[rgba(232,69,15,0.3)] placeholder:text-[#9898A4]"
              placeholder="Search Trip, Route, Customer..."
              value={searchVal}
              onChange={(e) => setSearchVal(e.target.value)}
            />
            {searchVal && (
              <button
                onClick={() => setSearchVal("")}
                className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 rounded-full bg-[#D8D8DC] flex items-center justify-center text-[#6E6E80] hover:bg-[#B8B8C0] transition-colors"
              >
                ×
              </button>
            )}
          </div>
        </Card>

        <Card className="p-6">
          <SubHeader title="Password" />
          <div className="relative">
            <input
              type={showPwd ? "text" : "password"}
              className="w-full px-4 py-3 rounded-xl bg-[#F0F0F2] text-sm text-[#111] outline-none focus:ring-2 focus:ring-[rgba(232,69,15,0.3)] placeholder:text-[#9898A4] pr-12"
              defaultValue="secure123"
            />
            <button
              onClick={() => setShowPwd(!showPwd)}
              className="absolute right-4 top-1/2 -translate-y-1/2 text-[#9898A4] hover:text-[#444] transition-colors"
            >
              {showPwd ? <EyeOff size={16} /> : <Eye size={16} />}
            </button>
          </div>
        </Card>

        <Card className="p-6">
          <SubHeader title="Dropdown / Select" />
          <div className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-[#111] mb-1.5">Cargo Type</label>
              <select className="w-full px-4 py-3 rounded-xl bg-[#F0F0F2] text-sm text-[#111] outline-none focus:ring-2 focus:ring-[rgba(232,69,15,0.3)] appearance-none">
                <option>General Goods</option>
                <option>Heavy Equipment</option>
                <option>Refrigerated</option>
                <option>Hazardous</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-[#111] mb-1.5">Date Range</label>
              <div className="relative">
                <Calendar size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-[#9898A4]" />
                <input
                  type="date"
                  className="w-full pl-10 pr-4 py-3 rounded-xl bg-[#F0F0F2] text-sm text-[#111] outline-none focus:ring-2 focus:ring-[rgba(232,69,15,0.3)]"
                  defaultValue="2025-05-24"
                />
              </div>
            </div>
          </div>
        </Card>

        <Card className="p-6">
          <SubHeader title="Disabled" />
          <div className="space-y-4">
            <input
              disabled
              className="w-full px-4 py-3 rounded-xl bg-[#F0F0F2] text-sm text-[#B8B8C0] cursor-not-allowed"
              defaultValue="Read-only value"
            />
            <textarea
              disabled
              className="w-full px-4 py-3 rounded-xl bg-[#F0F0F2] text-sm text-[#B8B8C0] cursor-not-allowed resize-none"
              rows={2}
              defaultValue="This field is disabled and cannot be edited"
            />
          </div>
        </Card>
      </div>
    </div>
  );
}
