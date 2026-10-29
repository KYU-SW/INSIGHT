import type { Metadata, Viewport } from "next";
import { AppShell } from "@/components/app-shell";
import { ClinicalDataProvider } from "@/components/clinical-data-provider";
import "./globals.css";

export const metadata: Metadata = {
  title: { default: "INSIGHT | Clinical Screening", template: "%s | INSIGHT" },
  description: "Research voice screening results for clinician review.",
  applicationName: "INSIGHT",
  appleWebApp: { capable: true, title: "INSIGHT", statusBarStyle: "default" },
  icons: { icon: "/pwa-icon/192", apple: "/pwa-icon/180" },
};

export const viewport: Viewport = { width: "device-width", initialScale: 1, viewportFit: "cover", themeColor: "#0c2340" };

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="en"><body><ClinicalDataProvider><AppShell>{children}</AppShell></ClinicalDataProvider></body></html>;
}
