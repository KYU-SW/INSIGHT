import type { Config } from "tailwindcss";

export default {
  content: ["./src/**/*.{js,ts,jsx,tsx,mdx}"],
  theme: { extend: {
  "colors": {
    "on-primary-fixed": "#031c38",
    "inverse-surface": "#2d3133",
    "surface-bright": "#f7f9fb",
    "primary": "#000d21",
    "surface-dim": "#d8dadc",
    "on-error-container": "#93000a",
    "primary-fixed": "#d5e3ff",
    "tertiary": "#000d1e",
    "on-background": "#191c1e",
    "surface-container-highest": "#e0e3e5",
    "on-tertiary": "#ffffff",
    "inverse-primary": "#b3c7ec",
    "on-tertiary-fixed-variant": "#3a485b",
    "on-secondary-fixed-variant": "#184975",
    "surface-container-lowest": "#ffffff",
    "tertiary-fixed": "#d5e3fc",
    "background": "#f7f9fb",
    "secondary-fixed-dim": "#9fcafd",
    "error": "#ba1a1a",
    "surface-container": "#eceef0",
    "inverse-on-surface": "#eff1f3",
    "on-primary-container": "#778bad",
    "tertiary-fixed-dim": "#b9c7df",
    "on-surface-variant": "#44474d",
    "on-secondary": "#ffffff",
    "on-surface": "#191c1e",
    "surface": "#f7f9fb",
    "outline-variant": "#c4c6ce",
    "on-primary": "#ffffff",
    "surface-container-high": "#e6e8ea",
    "secondary": "#35618e",
    "primary-fixed-dim": "#b3c7ec",
    "tertiary-container": "#152335",
    "secondary-container": "#9fcafd",
    "on-tertiary-fixed": "#0d1c2e",
    "on-secondary-fixed": "#001d36",
    "on-primary-fixed-variant": "#334766",
    "surface-variant": "#e0e3e5",
    "on-secondary-container": "#275582",
    "error-container": "#ffdad6",
    "secondary-fixed": "#d1e4ff",
    "on-tertiary-container": "#7c8ba0",
    "outline": "#74777e",
    "surface-container-low": "#f2f4f6",
    "primary-container": "#0c2340",
    "surface-tint": "#4b5f7f",
    "on-error": "#ffffff"
  },
  "borderRadius": {
    "DEFAULT": "0.125rem",
    "lg": "0.25rem",
    "xl": "0.5rem",
    "full": "0.75rem"
  },
  "spacing": {
    "unit-2xs": "0.125rem",
    "unit-md": "0.75rem",
    "table-cell-y": "0.375rem",
    "table-cell-x": "0.625rem",
    "panel-padding": "1rem",
    "unit-lg": "1rem",
    "unit-xs": "0.25rem",
    "unit-xl": "1.5rem",
    "gutter-standard": "0.75rem",
    "gutter-dense": "0.5rem",
    "unit-sm": "0.5rem"
  },
  "fontFamily": {
    "body-lg": [
      "var(--font-inter)",
      "Arial",
      "sans-serif"
    ],
    "display-lg": [
      "var(--font-inter)",
      "Arial",
      "sans-serif"
    ],
    "body-md": [
      "var(--font-inter)",
      "Arial",
      "sans-serif"
    ],
    "data-md": [
      "var(--font-jetbrains)",
      "monospace"
    ],
    "body-sm": [
      "var(--font-inter)",
      "Arial",
      "sans-serif"
    ],
    "data-lg": [
      "var(--font-jetbrains)",
      "monospace"
    ],
    "headline-sm": [
      "var(--font-inter)",
      "Arial",
      "sans-serif"
    ],
    "headline-lg": [
      "var(--font-inter)",
      "Arial",
      "sans-serif"
    ],
    "label-caps": [
      "var(--font-inter)",
      "Arial",
      "sans-serif"
    ],
    "data-sm": [
      "var(--font-jetbrains)",
      "monospace"
    ],
    "headline-md": [
      "var(--font-inter)",
      "Arial",
      "sans-serif"
    ],
    "sans": [
      "var(--font-inter)",
      "Arial",
      "sans-serif"
    ],
    "mono": [
      "var(--font-jetbrains)",
      "monospace"
    ]
  },
  "fontSize": {
    "body-lg": [
      "14px",
      {
        "lineHeight": "20px",
        "fontWeight": "400"
      }
    ],
    "display-lg": [
      "28px",
      {
        "lineHeight": "34px",
        "letterSpacing": "-0.02em",
        "fontWeight": "700"
      }
    ],
    "body-md": [
      "13px",
      {
        "lineHeight": "18px",
        "fontWeight": "400"
      }
    ],
    "data-md": [
      "13px",
      {
        "lineHeight": "16px",
        "fontWeight": "500"
      }
    ],
    "body-sm": [
      "12px",
      {
        "lineHeight": "16px",
        "fontWeight": "400"
      }
    ],
    "data-lg": [
      "18px",
      {
        "lineHeight": "22px",
        "fontWeight": "600"
      }
    ],
    "headline-sm": [
      "14px",
      {
        "lineHeight": "18px",
        "fontWeight": "600"
      }
    ],
    "headline-lg": [
      "20px",
      {
        "lineHeight": "26px",
        "letterSpacing": "-0.01em",
        "fontWeight": "600"
      }
    ],
    "label-caps": [
      "11px",
      {
        "lineHeight": "14px",
        "letterSpacing": "0.05em",
        "fontWeight": "600"
      }
    ],
    "data-sm": [
      "11px",
      {
        "lineHeight": "14px",
        "letterSpacing": "0.02em",
        "fontWeight": "500"
      }
    ],
    "headline-md": [
      "16px",
      {
        "lineHeight": "22px",
        "letterSpacing": "-0.005em",
        "fontWeight": "600"
      }
    ]
  }
} },
  plugins: [],
} satisfies Config;
