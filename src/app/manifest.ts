import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "INSIGHT ALS Voice Research",
    short_name: "INSIGHT",
    description: "Research voice screening results for clinician review.",
    start_url: "/analysis",
    scope: "/",
    display: "standalone",
    background_color: "#f7f9fb",
    theme_color: "#0c2340",
    icons: [
      { src: "/pwa-icon/192", sizes: "192x192", type: "image/png" },
      { src: "/pwa-icon/512", sizes: "512x512", type: "image/png" },
      { src: "/pwa-icon/512", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
  };
}
