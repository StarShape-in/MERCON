import React, { useState } from "react";
import { Download, ChevronRight, Plus } from "lucide-react";
import macronLogo from "@/imports/MACRON_LOGO.jpeg";
import { ImageWithFallback } from "@/app/components/figma/ImageWithFallback";

import { BrandSection, ColorsSection, TypographySection, SpacingSection } from "./sections/s1_foundation";
import { ButtonsSection, BadgesSection, InputsSection } from "./sections/s2_interactive";
import { CardsSection, NavigationSection } from "./sections/s3_cards_nav";
import { ChartsSection, PatternsSection } from "./sections/s4_charts";
import { ModalsSection, ToastsSection, EmptyStatesSection, SkeletonsSection } from "./sections/s5_modals";
import { AvatarsSection, TablesSection, NotificationsSection, DrawersSection } from "./sections/s6_data";
import { TabsSection, ProgressSection, FileUploadSection, CalendarSection, SearchSection } from "./sections/s7_controls";
import { KPISection, IconsSection, MotionSection, AccessibilitySection, NamingGuideSection } from "./sections/s8_reference";
import { FormControlsSection, FeedbackSection, ExtendedCardsSection } from "./sections/s9a_forms";
import { MapsSection, LogisticsSection, UtilitiesSection, ComponentIndexSection } from "./sections/s9b_logistics";
import { DriverAppSection } from "./sections/s_driver_app";
import { OperatorAppSection } from "./sections/s_operator_app";
import { WebDashboardSection } from "./sections/s_dashboard";

const SECTIONS = [
  "Brand", "Colors", "Typography", "Spacing & Radius",
  "Buttons", "Badges", "Inputs", "Cards", "Navigation", "Charts", "Patterns",
  "Modals", "Toasts", "Empty States", "Skeletons",
  "Avatars", "Tables", "Notifications", "Drawers",
  "Tabs", "Progress", "File Upload", "Calendar",
  "Search", "KPI", "Icons", "Motion", "Accessibility", "Naming Guide",
  "Form Controls", "Feedback", "Extended Cards", "Maps",
  "Logistics", "Utilities", "Component Index",
  "Driver App", "Operator App", "Web Dashboard",
] as const;
type Section = (typeof SECTIONS)[number];

/* ─── Layout ──────────────────────────────────────────────────────────────── */
export default function App() {
  const [active, setActive] = useState<Section>("Brand");

  return (
    <div className="min-h-screen bg-[#F5F5F7]" style={{ fontFamily: "'Plus Jakarta Sans', 'Inter', system-ui, sans-serif" }}>
      {/* Top bar */}
      <header className="sticky top-0 z-50 bg-white border-b border-black/[0.08] px-6 h-14 flex items-center justify-between shadow-sm">
        <div className="flex items-center gap-3">
          <ImageWithFallback src={macronLogo} alt="Mercon Logistics" className="h-8 w-auto object-contain" />
          <div className="h-5 w-px bg-[rgba(0,0,0,0.1)]" />
          <span className="text-sm font-semibold text-[#111]">Design System</span>
          <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-[#FFF0EB] text-[#E8450F]">v1.0</span>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-xs text-[#6E6E80] font-medium hidden sm:block">Mercon Logistics Services</span>
          <button
            onClick={() => window.print()}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#1A1A1A] text-white text-xs font-semibold hover:bg-[#333] transition-colors print:hidden"
          >
            <Download size={13} /> Export PDF
          </button>
        </div>
      </header>

      <div className="flex">
        {/* Sidebar nav */}
        <aside className="sticky top-14 h-[calc(100vh-3.5rem)] w-52 shrink-0 bg-white border-r border-black/[0.08] overflow-y-auto py-4 hidden md:block">
          <div className="px-3 mb-2">
            <p className="text-[10px] font-semibold uppercase tracking-widest text-[#6E6E80] px-3 mb-1">Sections</p>
          </div>
          {SECTIONS.map((s) => (
            <button
              key={s}
              onClick={() => setActive(s)}
              className={`w-full text-left px-6 py-2 text-sm font-medium rounded-none transition-colors ${
                active === s
                  ? "text-[#E8450F] bg-[#FFF0EB] border-r-2 border-[#E8450F]"
                  : "text-[#444] hover:text-[#111] hover:bg-[#F5F5F7]"
              }`}
            >
              {s}
            </button>
          ))}
        </aside>

        {/* Mobile nav */}
        <div className="md:hidden w-full overflow-x-auto flex gap-1 px-4 py-2 bg-white border-b border-black/[0.08] sticky top-14 z-40">
          {SECTIONS.map((s) => (
            <button
              key={s}
              onClick={() => setActive(s)}
              className={`shrink-0 text-xs font-semibold px-3 py-1.5 rounded-full transition-colors ${
                active === s ? "bg-[#E8450F] text-white" : "bg-[#F0F0F2] text-[#444]"
              }`}
            >
              {s}
            </button>
          ))}
        </div>

        {/* Main content — interactive view */}
        <main className="flex-1 min-w-0 p-6 md:p-8 space-y-10 print:hidden">
          {active === "Brand" && <BrandSection />}
          {active === "Colors" && <ColorsSection />}
          {active === "Typography" && <TypographySection />}
          {active === "Spacing & Radius" && <SpacingSection />}
          {active === "Buttons" && <ButtonsSection />}
          {active === "Badges" && <BadgesSection />}
          {active === "Inputs" && <InputsSection />}
          {active === "Cards" && <CardsSection />}
          {active === "Navigation" && <NavigationSection />}
          {active === "Charts" && <ChartsSection />}
          {active === "Patterns" && <PatternsSection />}
          {active === "Modals" && <ModalsSection />}
          {active === "Toasts" && <ToastsSection />}
          {active === "Empty States" && <EmptyStatesSection />}
          {active === "Skeletons" && <SkeletonsSection />}
          {active === "Avatars" && <AvatarsSection />}
          {active === "Tables" && <TablesSection />}
          {active === "Notifications" && <NotificationsSection />}
          {active === "Drawers" && <DrawersSection />}
          {active === "Tabs" && <TabsSection />}
          {active === "Progress" && <ProgressSection />}
          {active === "File Upload" && <FileUploadSection />}
          {active === "Calendar" && <CalendarSection />}
          {active === "Search" && <SearchSection />}
          {active === "KPI" && <KPISection />}
          {active === "Icons" && <IconsSection />}
          {active === "Motion" && <MotionSection />}
          {active === "Accessibility" && <AccessibilitySection />}
          {active === "Naming Guide" && <NamingGuideSection />}
          {active === "Form Controls" && <FormControlsSection />}
          {active === "Feedback" && <FeedbackSection />}
          {active === "Extended Cards" && <ExtendedCardsSection />}
          {active === "Maps" && <MapsSection />}
          {active === "Logistics" && <LogisticsSection />}
          {active === "Utilities" && <UtilitiesSection />}
          {active === "Component Index" && <ComponentIndexSection />}
          {active === "Driver App" && <DriverAppSection />}
          {active === "Operator App" && <OperatorAppSection />}
          {active === "Web Dashboard" && <WebDashboardSection />}
        </main>
      </div>

      {/* ── Print-only full document ─────────────────────────────────────────── */}
      <div className="hidden print:block">
        <PrintDocument />
      </div>

      <style>{`
        @media print {
          @page {
            size: A4;
            margin: 16mm 14mm 18mm 14mm;
          }
          @page :first { margin-top: 0; margin-bottom: 0; }
          * { -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; }
          .print\\:hidden { display: none !important; }
          .print\\:block  { display: block  !important; }
          .pdf-page-break { page-break-before: always; }
          .pdf-no-break   { page-break-inside: avoid; }
          .pdf-cover      { page-break-after: always; min-height: 100vh; }
          .pdf-chapter    { page-break-before: always; page-break-after: avoid; }
          body { font-family: 'Plus Jakarta Sans','Inter',system-ui,sans-serif; }
        }
      `}</style>
    </div>
  );
}

/* ─── PDF helpers ─────────────────────────────────────────────────────────── */
const OR = "#E8450F";
const DARK = "#1A1A1A";
const MID = "#6E6E80";

const CHAPTERS = [
  {
    num: "01", title: "Design Foundations", color: "#E8450F",
    desc: "Brand identity, color palette, typography scale, spacing system, and border radius tokens.",
    sections: ["Brand", "Colors", "Typography", "Spacing & Radius"] as Section[],
  },
  {
    num: "02", title: "Core Components", color: "#2563EB",
    desc: "Buttons, badges, inputs, cards, navigation patterns, and chart components.",
    sections: ["Buttons", "Badges", "Inputs", "Cards", "Navigation", "Charts"] as Section[],
  },
  {
    num: "03", title: "Patterns & States", color: "#16A34A",
    desc: "Modals, toasts, empty states, skeleton loaders, and notification patterns.",
    sections: ["Patterns", "Modals", "Toasts", "Empty States", "Skeletons", "Notifications"] as Section[],
  },
  {
    num: "04", title: "Data & Layout", color: "#7C3AED",
    desc: "Tables with sorting and pagination, drawers, tabs, and progress indicators.",
    sections: ["Tables", "Drawers", "Tabs", "Progress", "Avatars"] as Section[],
  },
  {
    num: "05", title: "Forms & Inputs", color: "#D97706",
    desc: "Extended form controls, file upload, calendar picker, and search patterns.",
    sections: ["Form Controls", "File Upload", "Calendar", "Search", "Feedback"] as Section[],
  },
  {
    num: "06", title: "Dashboard & Analytics", color: "#0891B2",
    desc: "KPI cards, map components, logistics widgets, and utility components.",
    sections: ["KPI", "Maps", "Logistics", "Extended Cards", "Utilities"] as Section[],
  },
  {
    num: "07", title: "Reference & Guidelines", color: "#DC2626",
    desc: "Icon library, motion tokens, accessibility standards, and naming conventions.",
    sections: ["Icons", "Motion", "Accessibility", "Naming Guide", "Component Index"] as Section[],
  },
  {
    num: "08", title: "Driver Mobile App", color: "#1A1A1A",
    desc: "16 high-fidelity iPhone screens for the MERCON Driver Operations App.",
    sections: ["Driver App"] as Section[],
  },
  {
    num: "09", title: "Operator Mobile App", color: "#E8450F",
    desc: "41 production-ready screens for the MERCON Operator mobile application.",
    sections: ["Operator App"] as Section[],
  },
  {
    num: "10", title: "Web Dashboard", color: "#2563EB",
    desc: "44 enterprise desktop screens for the MERCON Operator web platform.",
    sections: ["Web Dashboard"] as Section[],
  },
] as const;

function PdfHeader({ chapter, section }: { chapter: string; section: string }) {
  return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", borderBottom: "1px solid #EBEBED", paddingBottom: 6, marginBottom: 24 }}>
      <span style={{ fontSize: 9, fontWeight: 700, color: OR, textTransform: "uppercase", letterSpacing: 1 }}>{chapter}</span>
      <span style={{ fontSize: 9, color: MID, textTransform: "uppercase", letterSpacing: 1 }}>{section}</span>
      <span style={{ fontSize: 9, color: MID }}>MERCON Design System · v1.0</span>
    </div>
  );
}

function ChapterDivider({ num, title, desc, color }: { num: string; title: string; desc: string; color: string }) {
  return (
    <div className="pdf-chapter" style={{ minHeight: "40vh", display: "flex", flexDirection: "column", justifyContent: "flex-end", paddingBottom: 48, borderBottom: `4px solid ${color}` }}>
      <div style={{ display: "flex", alignItems: "baseline", gap: 16, marginBottom: 12 }}>
        <span style={{ fontSize: 72, fontWeight: 900, color: color, lineHeight: 1, opacity: 0.15 }}>{num}</span>
        <h2 style={{ fontSize: 32, fontWeight: 800, color: DARK, margin: 0, letterSpacing: "-0.5px" }}>{title}</h2>
      </div>
      <p style={{ fontSize: 14, color: MID, margin: 0, maxWidth: 500, lineHeight: 1.6 }}>{desc}</p>
    </div>
  );
}

/* ─── Cover + TOC + Chapters ──────────────────────────────────────────────── */
function PrintDocument() {
  const date = new Date().toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" });
  const totalScreens = 16 + 41 + 44;
  const totalComponents = 140;

  return (
    <div style={{ fontFamily: "'Plus Jakarta Sans','Inter',system-ui,sans-serif", color: "#111", background: "#fff" }}>

      {/* ── COVER ─────────────────────────────────────────────────────────── */}
      <div className="pdf-cover" style={{ display: "flex", flexDirection: "column", background: DARK, padding: "10vh 60px", position: "relative", overflow: "hidden" }}>
        {/* Decorative circles */}
        <div style={{ position: "absolute", top: -80, right: -80, width: 320, height: 320, borderRadius: "50%", background: OR, opacity: 0.06 }} />
        <div style={{ position: "absolute", bottom: 60, left: -60, width: 240, height: 240, borderRadius: "50%", border: `2px solid ${OR}`, opacity: 0.1 }} />

        <div style={{ flex: 1, display: "flex", flexDirection: "column", justifyContent: "center" }}>
          <img src={macronLogo as unknown as string} alt="Mercon" style={{ height: 56, objectFit: "contain", objectPosition: "left", marginBottom: 40 }} />

          <div style={{ borderLeft: `4px solid ${OR}`, paddingLeft: 24, marginBottom: 48 }}>
            <h1 style={{ color: "#fff", fontSize: 52, fontWeight: 900, margin: "0 0 8px", letterSpacing: "-1px", lineHeight: 1.1 }}>Design<br/>System</h1>
            <p style={{ color: "rgba(255,255,255,0.5)", fontSize: 16, margin: 0 }}>Mercon Logistics Services Company</p>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 16, maxWidth: 500, marginBottom: 48 }}>
            {[["v1.0","Version"],["10","Chapters"],[`${totalComponents}+`,"Components"],[`${totalScreens}`,"App Screens"]].map(([v,l]) => (
              <div key={l} style={{ padding: "16px", background: "rgba(255,255,255,0.06)", borderRadius: 12 }}>
                <div style={{ fontSize: 22, fontWeight: 800, color: OR, marginBottom: 2 }}>{v}</div>
                <div style={{ fontSize: 10, color: "rgba(255,255,255,0.4)", textTransform: "uppercase", letterSpacing: 1 }}>{l}</div>
              </div>
            ))}
          </div>
        </div>

        <div style={{ borderTop: "1px solid rgba(255,255,255,0.1)", paddingTop: 20, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <span style={{ fontSize: 11, color: "rgba(255,255,255,0.3)" }}>Exported {date}</span>
          <span style={{ fontSize: 11, color: "rgba(255,255,255,0.3)" }}>Confidential · Internal Use Only</span>
        </div>
      </div>

      {/* ── TABLE OF CONTENTS ─────────────────────────────────────────────── */}
      <div className="pdf-page-break" style={{ padding: "48px 0" }}>
        <div style={{ borderBottom: `3px solid ${OR}`, paddingBottom: 16, marginBottom: 40 }}>
          <h2 style={{ fontSize: 28, fontWeight: 800, margin: 0 }}>Table of Contents</h2>
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 0 }}>
          {CHAPTERS.map((ch, i) => (
            <div key={ch.num} style={{ display: "flex", alignItems: "center", padding: "14px 0", borderBottom: "1px solid #F0F0F2" }}>
              <span style={{ fontSize: 11, fontWeight: 700, color: ch.color, width: 32, flexShrink: 0 }}>{ch.num}</span>
              <span style={{ fontSize: 15, fontWeight: 600, color: DARK, flex: 1 }}>{ch.title}</span>
              <span style={{ fontSize: 11, color: MID, marginRight: 16 }}>{ch.sections.join(", ")}</span>
              <div style={{ flex: 1, borderBottom: "1px dotted #D8D8DC", margin: "0 12px" }} />
              <span style={{ fontSize: 11, fontWeight: 600, color: MID, width: 24, textAlign: "right" }}>{i + 2}</span>
            </div>
          ))}
        </div>

        {/* About */}
        <div style={{ marginTop: 48, display: "grid", gridTemplateColumns: "1fr 1fr", gap: 24 }}>
          <div style={{ background: "#F5F5F7", borderRadius: 16, padding: 24 }}>
            <h3 style={{ fontSize: 13, fontWeight: 700, margin: "0 0 8px", color: DARK }}>About This Document</h3>
            <p style={{ fontSize: 12, color: MID, lineHeight: 1.7, margin: 0 }}>
              This design system defines the complete visual language for the MERCON Logistics platform ecosystem —
              covering the Operator Mobile App, Driver Mobile App, and Operator Web Dashboard.
              Built on an 8pt grid system with a consistent token architecture.
            </p>
          </div>
          <div style={{ background: "#FFF0EB", borderRadius: 16, padding: 24, border: `1px solid rgba(232,69,15,0.15)` }}>
            <h3 style={{ fontSize: 13, fontWeight: 700, margin: "0 0 8px", color: OR }}>Design Principles</h3>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 6 }}>
              {["Enterprise-grade","Mobile-first","Logistics-focused","Scalable","Accessible","Production-ready"].map(p => (
                <div key={p} style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 11, color: DARK }}>
                  <span style={{ width: 6, height: 6, borderRadius: "50%", background: OR, flexShrink: 0 }} />{p}
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* ── CHAPTERS ──────────────────────────────────────────────────────── */}
      {CHAPTERS.map((ch) => (
        <div key={ch.num}>
          <ChapterDivider num={ch.num} title={ch.title} desc={ch.desc} color={ch.color} />
          {ch.sections.map((s) => (
            <div key={s} className="pdf-page-break" style={{ paddingTop: 8 }}>
              <PdfHeader chapter={`Chapter ${ch.num} — ${ch.title}`} section={s} />
              <PrintSection name={s} />
            </div>
          ))}
        </div>
      ))}

      {/* ── BACK COVER ────────────────────────────────────────────────────── */}
      <div className="pdf-page-break" style={{ minHeight: "100vh", background: DARK, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", textAlign: "center", padding: 60 }}>
        <img src={macronLogo as unknown as string} alt="Mercon" style={{ height: 48, objectFit: "contain", marginBottom: 24, opacity: 0.8 }} />
        <p style={{ fontSize: 13, color: "rgba(255,255,255,0.3)", margin: "0 0 8px" }}>MERCON Design System · v1.0</p>
        <p style={{ fontSize: 11, color: "rgba(255,255,255,0.2)", margin: 0 }}>© 2025 Mercon Logistics Services Company · All rights reserved</p>
      </div>

    </div>
  );
}

function PrintSection({ name }: { name: Section }) {
  if (name === "Brand")            return <BrandSection />;
  if (name === "Colors")           return <ColorsSection />;
  if (name === "Typography")       return <TypographySection />;
  if (name === "Spacing & Radius") return <SpacingSection />;
  if (name === "Buttons")          return <ButtonsSection />;
  if (name === "Badges")           return <BadgesSection />;
  if (name === "Inputs")           return <InputsSection />;
  if (name === "Cards")            return <CardsSection />;
  if (name === "Navigation")       return <NavigationSection />;
  if (name === "Charts")           return <ChartsSection />;
  if (name === "Patterns")         return <PatternsSection />;
  if (name === "Modals")           return <ModalsSection />;
  if (name === "Toasts")           return <ToastsSection />;
  if (name === "Empty States")     return <EmptyStatesSection />;
  if (name === "Skeletons")        return <SkeletonsSection />;
  if (name === "Avatars")          return <AvatarsSection />;
  if (name === "Tables")           return <TablesSection />;
  if (name === "Notifications")    return <NotificationsSection />;
  if (name === "Drawers")          return <DrawersSection />;
  if (name === "Tabs")             return <TabsSection />;
  if (name === "Progress")         return <ProgressSection />;
  if (name === "File Upload")      return <FileUploadSection />;
  if (name === "Calendar")         return <CalendarSection />;
  if (name === "Search")           return <SearchSection />;
  if (name === "KPI")              return <KPISection />;
  if (name === "Icons")            return <IconsSection />;
  if (name === "Motion")           return <MotionSection />;
  if (name === "Accessibility")    return <AccessibilitySection />;
  if (name === "Naming Guide")     return <NamingGuideSection />;
  if (name === "Form Controls")    return <FormControlsSection />;
  if (name === "Feedback")         return <FeedbackSection />;
  if (name === "Extended Cards")   return <ExtendedCardsSection />;
  if (name === "Maps")             return <MapsSection />;
  if (name === "Logistics")        return <LogisticsSection />;
  if (name === "Utilities")        return <UtilitiesSection />;
  if (name === "Component Index")  return <ComponentIndexSection />;
  if (name === "Driver App")       return <DriverAppSection />;
  if (name === "Operator App")     return <OperatorAppSection />;
  if (name === "Web Dashboard")    return <WebDashboardSection />;
  return null;
}
