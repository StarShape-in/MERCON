import React from "react";

/* ─── Shared token constants ──────────────────────────────────────────────── */
export const ORANGE = "#E8450F";
export const BLACK = "#1A1A1A";
export const SUCCESS = "#16A34A";
export const WARNING = "#D97706";
export const DANGER = "#DC2626";
export const INFO = "#2563EB";

export function SectionHeader({ title, desc }: { title: string; desc: string }) {
  return (
    <div className="mb-8">
      <h2 className="text-2xl font-bold text-[#111] tracking-tight">{title}</h2>
      <p className="text-sm text-[#6E6E80] mt-1">{desc}</p>
      <div className="mt-4 h-px bg-black/[0.08]" />
    </div>
  );
}

export function SubHeader({ title }: { title: string }) {
  return <h3 className="text-xs font-semibold uppercase tracking-widest text-[#6E6E80] mb-4">{title}</h3>;
}

export function Card({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return (
    <div className={`bg-white rounded-2xl border border-black/[0.07] shadow-sm ${className}`}>
      {children}
    </div>
  );
}
