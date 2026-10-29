"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Brain, ClipboardClock, Database, Users } from "lucide-react";
import type { ReactNode } from "react";
import { useClinicalData } from "@/components/clinical-data-provider";

export function AppShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const { databaseConnected, databaseBusy, databaseError, connect } = useClinicalData();
  const navigation = [
    { href: "/analysis", label: "Voice Analysis", icon: Brain, active: pathname === "/" || pathname === "/analysis" },
    { href: "/patients", label: "Patient Registry", icon: Users, active: pathname.startsWith("/patients") },
    { href: "/history", label: "History", icon: ClipboardClock, active: pathname === "/history" },
  ];
  const currentLabel = navigation.find(item => item.active)?.label ?? "Voice Analysis";

  return <>
    <a href="#main-content" className="fixed left-4 top-2 z-[100] -translate-y-20 rounded bg-white p-2 text-primary focus:translate-y-0">Skip to research workspace</a>
    <header className="emr-header">
      <Link href="/analysis" className="emr-brand" aria-label="INSIGHT voice analysis">INSIGHT <span>ALS Voice Research</span></Link>
      <span className="emr-location">{currentLabel}</span>
    </header>
    <div className="emr-toolbar">
      <nav className="sidebar-nav emr-tabs" aria-label="Main navigation">
        {navigation.map(({ href, label, active }) => <Link key={href} href={href} title={label} aria-current={active ? "page" : undefined}>{label}</Link>)}
      </nav>
      <div className="emr-connection">
        <span className="emr-db-status">Database: {databaseConnected ? "Connected" : "Not connected"}</span>
        <button type="button" disabled={databaseBusy} onClick={() => void connect().catch(() => {})} title={databaseError ?? (databaseConnected ? "Reconnect database" : "Connect database")} aria-label={databaseConnected ? "Reconnect database" : "Connect database"}><Database size={14} aria-hidden="true" />{databaseBusy ? "연동 확인 중…" : databaseConnected ? "DB 다시 연결" : "DB 연동"}</button>
      </div>
    </div>
    {databaseError && <p role="alert" className="emr-db-error">{databaseError}</p>}
    <main id="main-content" className="workspace">{children}</main>
    <nav className="mobile-nav" aria-label="Mobile navigation">
      {navigation.map(({ href, label, icon: Icon, active }) => <Link key={href} href={href} aria-current={active ? "page" : undefined} className={active ? "text-white" : "text-slate-400"}><Icon size={20} aria-hidden="true" /><span>{label.replace("Patient ", "")}</span></Link>)}
      <button type="button" disabled={databaseBusy} onClick={() => void connect().catch(() => {})} aria-label={databaseConnected ? "Reconnect database" : "Connect database"} className={databaseConnected ? "text-sky-300" : "text-slate-400"}><Database size={20} aria-hidden="true" /><span>{databaseConnected ? "DB ✓" : "DB"}</span></button>
    </nav>
  </>;
}
