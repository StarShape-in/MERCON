import React from "react";
import macronLogo from "@/imports/MACRON_LOGO.jpeg";
import { ImageWithFallback } from "@/app/components/figma/ImageWithFallback";
import { Card, SectionHeader, SubHeader } from "./common";

/* ═══════════════════════════════════════════════════════════════════════════ */
/*  BRAND SECTION                                                              */
/* ═══════════════════════════════════════════════════════════════════════════ */
export function BrandSection() {
  return (
    <div>
      <SectionHeader title="Brand" desc="Mercon Logistics visual identity, colors, and brand voice." />

      {/* Logo showcase */}
      <Card className="p-8 mb-6">
        <SubHeader title="Logo" />
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="flex flex-col items-center justify-center p-8 bg-white rounded-xl border border-black/[0.07] gap-4">
            <ImageWithFallback src={macronLogo} alt="Mercon Logistics on white" className="h-16 object-contain" />
            <p className="text-xs text-[#6E6E80]">On White</p>
          </div>
          <div className="flex flex-col items-center justify-center p-8 rounded-xl bg-[#1A1A1A] gap-4">
            <ImageWithFallback src={macronLogo} alt="Mercon Logistics on dark" className="h-16 object-contain" />
            <p className="text-xs text-[rgba(255,255,255,0.4)]">On Dark</p>
          </div>
          <div className="flex flex-col items-center justify-center p-8 rounded-xl bg-[#E8450F] gap-4">
            <ImageWithFallback src={macronLogo} alt="Mercon Logistics on brand" className="h-16 object-contain" />
            <p className="text-xs text-[rgba(255,255,255,0.7)]">On Brand</p>
          </div>
        </div>
      </Card>

      {/* Brand colors */}
      <Card className="p-8 mb-6">
        <SubHeader title="Brand Colors" />
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[
            { name: "Brand Orange", hex: "#E8450F", desc: "Primary action, CTAs" },
            { name: "Brand Black", hex: "#1A1A1A", desc: "Primary text, dark surfaces" },
            { name: "Off White", hex: "#F5F5F7", desc: "Page background" },
            { name: "Pure White", hex: "#FFFFFF", desc: "Card surfaces" },
          ].map((c) => (
            <div key={c.name}>
              <div className="h-20 rounded-xl mb-3 border border-black/[0.06]" style={{ background: c.hex }} />
              <p className="text-sm font-semibold text-[#111]">{c.name}</p>
              <p className="text-xs font-mono text-[#6E6E80]">{c.hex}</p>
              <p className="text-xs text-[#6E6E80] mt-0.5">{c.desc}</p>
            </div>
          ))}
        </div>
      </Card>

      {/* Brand values */}
      <Card className="p-8">
        <SubHeader title="Brand Voice" />
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {[
            { title: "Operational", desc: "Every element serves a function. No decoration without purpose." },
            { title: "Trustworthy", desc: "Clean structure, clear hierarchy, consistent data display." },
            { title: "Efficient", desc: "Information at a glance. Actions one tap away." },
          ].map((v) => (
            <div key={v.title} className="p-5 rounded-xl bg-[#F5F5F7]">
              <div className="w-2 h-2 rounded-full bg-[#E8450F] mb-3" />
              <p className="font-semibold text-[#111] text-sm mb-1">{v.title}</p>
              <p className="text-xs text-[#6E6E80] leading-relaxed">{v.desc}</p>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════════════════ */
/*  COLORS SECTION                                                             */
/* ═══════════════════════════════════════════════════════════════════════════ */
export function ColorsSection() {
  const primaryScale = [
    { shade: "50", hex: "#FFF4F1" },
    { shade: "100", hex: "#FFE4DA" },
    { shade: "200", hex: "#FFC3AA" },
    { shade: "300", hex: "#FF9C75" },
    { shade: "400", hex: "#FF6E3E" },
    { shade: "500", hex: "#E8450F" },
    { shade: "600", hex: "#C7380A" },
    { shade: "700", hex: "#A22C07" },
    { shade: "800", hex: "#7D2005" },
    { shade: "900", hex: "#5A1603" },
  ];

  const neutralScale = [
    { shade: "0", hex: "#FFFFFF" },
    { shade: "25", hex: "#FAFAFA" },
    { shade: "50", hex: "#F5F5F7" },
    { shade: "100", hex: "#EBEBED" },
    { shade: "200", hex: "#D8D8DC" },
    { shade: "300", hex: "#B8B8C0" },
    { shade: "400", hex: "#9898A4" },
    { shade: "500", hex: "#6E6E80" },
    { shade: "600", hex: "#52525E" },
    { shade: "700", hex: "#3B3B44" },
    { shade: "800", hex: "#27272E" },
    { shade: "900", hex: "#111111" },
  ];

  const semanticColors = [
    { name: "Success", hex: "#16A34A", bg: "#F0FDF4", label: "Completed, verified" },
    { name: "Warning", hex: "#D97706", bg: "#FFFBEB", label: "Delayed, expiring soon" },
    { name: "Danger", hex: "#DC2626", bg: "#FEF2F2", label: "Cancelled, overdue" },
    { name: "Info", hex: "#2563EB", bg: "#EFF6FF", label: "In Transit, general info" },
  ];

  return (
    <div>
      <SectionHeader title="Colors" desc="Full token palette — primary brand, neutrals, and semantic states." />

      <Card className="p-8 mb-6">
        <SubHeader title="Primary — Orange Scale" />
        <div className="grid grid-cols-5 md:grid-cols-10 gap-2">
          {primaryScale.map((c) => (
            <div key={c.shade}>
              <div
                className="h-12 rounded-lg mb-1.5 border border-black/[0.06]"
                style={{ background: c.hex }}
              />
              <p className="text-[10px] font-semibold text-[#111]">{c.shade}</p>
              <p className="text-[10px] font-mono text-[#6E6E80]">{c.hex}</p>
            </div>
          ))}
        </div>
      </Card>

      <Card className="p-8 mb-6">
        <SubHeader title="Neutral — Gray Scale" />
        <div className="grid grid-cols-5 md:grid-cols-12 gap-2">
          {neutralScale.map((c) => (
            <div key={c.shade}>
              <div
                className="h-12 rounded-lg mb-1.5 border border-black/[0.06]"
                style={{ background: c.hex }}
              />
              <p className="text-[10px] font-semibold text-[#111]">{c.shade}</p>
              <p className="text-[10px] font-mono text-[#6E6E80]">{c.hex}</p>
            </div>
          ))}
        </div>
      </Card>

      <Card className="p-8 mb-6">
        <SubHeader title="Semantic Colors" />
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {semanticColors.map((c) => (
            <div key={c.name} className="rounded-xl overflow-hidden border border-black/[0.07]">
              <div className="h-16" style={{ background: c.hex }} />
              <div className="p-4" style={{ background: c.bg }}>
                <p className="text-sm font-semibold text-[#111]">{c.name}</p>
                <p className="text-[10px] font-mono text-[#6E6E80] mt-0.5">{c.hex}</p>
                <p className="text-xs text-[#6E6E80] mt-1">{c.label}</p>
              </div>
            </div>
          ))}
        </div>
      </Card>

      <Card className="p-8">
        <SubHeader title="Semantic Token Mapping" />
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {[
            { token: "--background", value: "#F5F5F7", role: "Page background" },
            { token: "--foreground", value: "#111111", role: "Default text" },
            { token: "--card", value: "#FFFFFF", role: "Card/panel surface" },
            { token: "--primary", value: "#E8450F", role: "Brand orange — CTAs, links" },
            { token: "--muted", value: "#EBEBED", role: "Subdued backgrounds" },
            { token: "--muted-foreground", value: "#6E6E80", role: "Labels, captions" },
            { token: "--border", value: "rgba(0,0,0,0.08)", role: "Hairline dividers" },
            { token: "--accent", value: "#FFF0EB", role: "Tinted orange bg" },
          ].map((t) => (
            <div key={t.token} className="flex items-center gap-3 p-3 rounded-lg bg-[#F5F5F7]">
              <div className="w-8 h-8 rounded-lg border border-black/[0.08] shrink-0" style={{ background: t.value }} />
              <div className="min-w-0">
                <p className="text-xs font-mono font-medium text-[#111] truncate">{t.token}</p>
                <p className="text-[10px] text-[#6E6E80]">{t.role}</p>
              </div>
              <span className="ml-auto text-[10px] font-mono text-[#6E6E80] shrink-0">{t.value}</span>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════════════════ */
/*  TYPOGRAPHY SECTION                                                         */
/* ═══════════════════════════════════════════════════════════════════════════ */
export function TypographySection() {
  const scale = [
    { name: "Display Large", size: "2.5rem / 40px", weight: "800", lh: "1.2", sample: "Fleet Operations" },
    { name: "Display Medium", size: "2rem / 32px", weight: "800", lh: "1.2", sample: "Trip Management" },
    { name: "Display Small", size: "1.75rem / 28px", weight: "700", lh: "1.25", sample: "Vehicle Reports" },
    { name: "Heading XL", size: "1.5rem / 24px", weight: "700", lh: "1.3", sample: "Driver Dashboard" },
    { name: "Heading L", size: "1.25rem / 20px", weight: "700", lh: "1.35", sample: "Document Center" },
    { name: "Heading M", size: "1.125rem / 18px", weight: "600", lh: "1.4", sample: "Renewal Alerts" },
    { name: "Heading S", size: "1rem / 16px", weight: "600", lh: "1.4", sample: "Trip TRP-2387" },
    { name: "Body Large", size: "1rem / 16px", weight: "400", lh: "1.6", sample: "Your trip has been created and is ready to be executed." },
    { name: "Body Medium", size: "0.875rem / 14px", weight: "400", lh: "1.6", sample: "Delivery confirmed and POD received and verified by the system." },
    { name: "Body Small", size: "0.8125rem / 13px", weight: "400", lh: "1.5", sample: "Last updated: 24 May 2025" },
    { name: "Caption", size: "0.75rem / 12px", weight: "400", lh: "1.4", sample: "Document expires in 5 days" },
    { name: "Overline", size: "0.6875rem / 11px", weight: "600", lh: "1.2", sample: "TRIP STATUS — SECTION LABEL" },
    { name: "Button Large", size: "1rem / 16px", weight: "600", lh: "1", sample: "Continue to Billing" },
    { name: "Button Medium", size: "0.875rem / 14px", weight: "600", lh: "1", sample: "View Trip Details" },
    { name: "Button Small", size: "0.75rem / 12px", weight: "600", lh: "1", sample: "View" },
  ];

  return (
    <div>
      <SectionHeader title="Typography" desc="Plus Jakarta Sans for headings, Inter for body, JetBrains Mono for data." />

      <Card className="p-8 mb-6">
        <SubHeader title="Font Families" />
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {[
            { family: "Plus Jakarta Sans", use: "Headings, display, buttons", sample: "AaBbCc 0123" },
            { family: "Inter", use: "Body copy, labels, captions", sample: "AaBbCc 0123", style: { fontFamily: "Inter, sans-serif" } },
            { family: "JetBrains Mono", use: "Trip IDs, codes, data values", sample: "TRP-2387 ·  18,500 KG", style: { fontFamily: "'JetBrains Mono', monospace" } },
          ].map((f) => (
            <div key={f.family} className="p-5 rounded-xl bg-[#F5F5F7]">
              <p className="text-xs font-medium text-[#6E6E80] mb-2">{f.family}</p>
              <p className="text-2xl font-bold text-[#111] mb-1" style={f.style || {}}>{f.sample}</p>
              <p className="text-xs text-[#6E6E80]">{f.use}</p>
            </div>
          ))}
        </div>
      </Card>

      <Card className="p-8">
        <SubHeader title="Type Scale" />
        <div className="space-y-1">
          {scale.map((t, i) => (
            <div key={t.name} className={`flex items-baseline gap-4 py-3 px-4 rounded-lg ${i % 2 === 0 ? "bg-[#F5F5F7]" : ""}`}>
              <div className="w-28 shrink-0">
                <p className="text-[10px] font-semibold text-[#6E6E80]">{t.name}</p>
                <p className="text-[10px] font-mono text-[#9898A4]">{t.size} · {t.weight}w</p>
              </div>
              <p
                className="text-[#111] truncate"
                style={{
                  fontSize: t.size.split(" ")[0],
                  fontWeight: parseInt(t.weight),
                  lineHeight: t.lh,
                  fontFamily: t.name.startsWith("Caption") || t.name.startsWith("Body") || t.name.startsWith("Overline") ? "Inter, sans-serif" : undefined,
                }}
              >
                {t.sample}
              </p>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════════════════ */
/*  SPACING & RADIUS                                                            */
/* ═══════════════════════════════════════════════════════════════════════════ */
export function SpacingSection() {
  const spacingTokens = [2, 4, 8, 12, 16, 20, 24, 32, 40, 48, 56, 64, 80, 96, 128];
  const radiusTokens = [
    { name: "xs", value: "4px" },
    { name: "sm", value: "8px" },
    { name: "md", value: "12px" },
    { name: "lg", value: "16px" },
    { name: "xl", value: "20px" },
    { name: "2xl", value: "24px" },
    { name: "3xl", value: "32px" },
    { name: "full", value: "9999px" },
  ];

  return (
    <div>
      <SectionHeader title="Spacing & Radius" desc="8pt base grid with consistent radius tokens." />

      <Card className="p-8 mb-6">
        <SubHeader title="Spacing Scale — 8pt Grid" />
        <div className="space-y-3">
          {spacingTokens.map((s) => (
            <div key={s} className="flex items-center gap-4">
              <span className="text-xs font-mono text-[#6E6E80] w-8 text-right">{s}</span>
              <div className="h-4 rounded-sm bg-[rgba(232,69,15,0.8)]" style={{ width: `${Math.min(s * 2.5, 400)}px` }} />
              <span className="text-xs text-[#6E6E80]">{s}px</span>
            </div>
          ))}
        </div>
      </Card>

      <Card className="p-8">
        <SubHeader title="Border Radius Tokens" />
        <div className="flex flex-wrap gap-6">
          {radiusTokens.map((r) => (
            <div key={r.name} className="flex flex-col items-center gap-2">
              <div
                className="w-16 h-16 bg-[rgba(232,69,15,0.1)] border-2 border-[rgba(232,69,15,0.4)]"
                style={{ borderRadius: r.value }}
              />
              <p className="text-xs font-semibold text-[#111]">{r.name}</p>
              <p className="text-[10px] font-mono text-[#6E6E80]">{r.value}</p>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}
