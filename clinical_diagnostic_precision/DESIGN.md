---
name: Clinical Diagnostic Precision
colors:
  surface: '#f7f9fb'
  surface-dim: '#d8dadc'
  surface-bright: '#f7f9fb'
  surface-container-lowest: '#ffffff'
  surface-container-low: '#f2f4f6'
  surface-container: '#eceef0'
  surface-container-high: '#e6e8ea'
  surface-container-highest: '#e0e3e5'
  on-surface: '#191c1e'
  on-surface-variant: '#44474d'
  inverse-surface: '#2d3133'
  inverse-on-surface: '#eff1f3'
  outline: '#74777e'
  outline-variant: '#c4c6ce'
  surface-tint: '#4b5f7f'
  primary: '#000d21'
  on-primary: '#ffffff'
  primary-container: '#0c2340'
  on-primary-container: '#778bad'
  inverse-primary: '#b3c7ec'
  secondary: '#35618e'
  on-secondary: '#ffffff'
  secondary-container: '#9fcafd'
  on-secondary-container: '#275582'
  tertiary: '#000d1e'
  on-tertiary: '#ffffff'
  tertiary-container: '#152335'
  on-tertiary-container: '#7c8ba0'
  error: '#ba1a1a'
  on-error: '#ffffff'
  error-container: '#ffdad6'
  on-error-container: '#93000a'
  primary-fixed: '#d5e3ff'
  primary-fixed-dim: '#b3c7ec'
  on-primary-fixed: '#031c38'
  on-primary-fixed-variant: '#334766'
  secondary-fixed: '#d1e4ff'
  secondary-fixed-dim: '#9fcafd'
  on-secondary-fixed: '#001d36'
  on-secondary-fixed-variant: '#184975'
  tertiary-fixed: '#d5e3fc'
  tertiary-fixed-dim: '#b9c7df'
  on-tertiary-fixed: '#0d1c2e'
  on-tertiary-fixed-variant: '#3a485b'
  background: '#f7f9fb'
  on-background: '#191c1e'
  surface-variant: '#e0e3e5'
typography:
  display-lg:
    fontFamily: Inter
    fontSize: 28px
    fontWeight: '700'
    lineHeight: 34px
    letterSpacing: -0.02em
  headline-lg:
    fontFamily: Inter
    fontSize: 20px
    fontWeight: '600'
    lineHeight: 26px
    letterSpacing: -0.01em
  headline-md:
    fontFamily: Inter
    fontSize: 16px
    fontWeight: '600'
    lineHeight: 22px
    letterSpacing: -0.005em
  headline-sm:
    fontFamily: Inter
    fontSize: 14px
    fontWeight: '600'
    lineHeight: 18px
  body-lg:
    fontFamily: Inter
    fontSize: 14px
    fontWeight: '400'
    lineHeight: 20px
  body-md:
    fontFamily: Inter
    fontSize: 13px
    fontWeight: '400'
    lineHeight: 18px
  body-sm:
    fontFamily: Inter
    fontSize: 12px
    fontWeight: '400'
    lineHeight: 16px
  data-lg:
    fontFamily: JetBrains Mono
    fontSize: 18px
    fontWeight: '600'
    lineHeight: 22px
  data-md:
    fontFamily: JetBrains Mono
    fontSize: 13px
    fontWeight: '500'
    lineHeight: 16px
  data-sm:
    fontFamily: JetBrains Mono
    fontSize: 11px
    fontWeight: '500'
    lineHeight: 14px
    letterSpacing: 0.02em
  label-caps:
    fontFamily: Inter
    fontSize: 11px
    fontWeight: '600'
    lineHeight: 14px
    letterSpacing: 0.05em
rounded:
  sm: 0.125rem
  DEFAULT: 0.25rem
  md: 0.375rem
  lg: 0.5rem
  xl: 0.75rem
  full: 9999px
spacing:
  unit-2xs: 0.125rem
  unit-xs: 0.25rem
  unit-sm: 0.5rem
  unit-md: 0.75rem
  unit-lg: 1rem
  unit-xl: 1.5rem
  gutter-dense: 0.5rem
  gutter-standard: 0.75rem
  panel-padding: 1rem
  table-cell-y: 0.375rem
  table-cell-x: 0.625rem
---

## Brand & Style
This design system establishes a high-acuity, evidence-based diagnostic aesthetic tailored for neurologists, movement disorder specialists, and clinical researchers. The visual language evokes institutional authority, surgical precision, and diagnostic clarity, drawing directly from advanced PACS (Picture Archiving and Communication System) and hospital workstation paradigms. 

Rather than adopting consumer health trends, soft pastels, or decorative gradients, the system is grounded in utilitarian minimalism and structured information density. Every visual element serves diagnostic triage, eliminating cognitive fatigue during intensive longitudinal reviews. The emotional tone is deliberate, objective, reliable, and clinically definitive.

## Colors
The palette is built around clinical utility, high contrast, and ergonomic optical comfort under hospital ambient lighting.

- **Primary (`#0C2340` - Deep Hospital Navy):** Anchors core operational frames, primary action switches, high-emphasis typography, and persistent clinical navigation.
- **Secondary (`#2E5B88` - Clinical Steel Blue):** Represents active multi-planar selections, active audio wave representations, focal diagnostic focus rings, and secondary interactive structures.
- **Tertiary (`#475569` - Slate Muted):** Governs structural axes, secondary labels, disabled states, baseline reference markers, and metric unit legends.
- **Neutral (`#F8FAFC` - Clinical Surface):** A balanced off-white substrate that mitigates screen glare, accompanied by crisp slate-50 (`#F1F5F9`) and slate-100 (`#E2E8F0`) surface containers.

### Diagnostic Risk Indicator System
Status colors never rely on saturation alone; they are strictly paired with explicit textual labels, numeric scores, and structural iconography:
- **Low Risk / Stable (`#0F766E` Teal / `#F0FDFA` Background):** Muted clinical teal. Signals baseline acoustic cadence and motor speech stability.
- **Moderate Risk / Monitor (`#B45309` Ochre Amber / `#FFFBEB` Background):** Restrained, non-alarmist amber indicating phonetic degradation or sub-threshold phonetic variations requiring follow-up.
- **High Risk / Alert (`#BE123C` Clinical Crimson / `#FFF1F2` Background):** Controlled deep crimson highlighting significant choreic speech intrusion, sustained vocal instability, or elevated diagnostic probabilities.

## Typography
The typographic architecture optimizes scanning speed and zero-error interpretation across complex tables, spectrogram readouts, and biomarker panels.

- **Interface Body & Headings (Inter):** Leveraged for clinical labels, patient demographic headers, status messaging, and anatomical classifications. Characterized by a tall x-height, clear letterforms, and unambiguous distinctions between similar glyphs (e.g., `1`, `l`, `I`).
- **Biomarker & Numerical Readouts (JetBrains Mono):** Monospaced tabular alignment is strictly enforced for acoustic analysis values (e.g., jitter, shimmer, harmonic-to-noise ratios, voice onset time, and Unified Huntington's Disease Rating Scale predictive indices). Numbers never shift column layout during live recording sweeps or playback scrubber motions.
- **Hierarchy Rules:** All section labels above clinical data tables and diagnostic charting matrices use uppercase tracking (`label-caps`) to differentiate metadata keys from clinical values.

## Layout & Spacing
The layout adheres to a data-dense, modular workstation structure inspired by multi-pane medical imaging and diagnostics consoles.

- **Grid Architecture:** A responsive 12-column fixed-ratio frame designed primarily for 1080p, 1440p, and 4K clinical desktop panels. Content does not sprawl fluidly across ultra-wide monitors; instead, it utilizes synchronized analytical panels (Patient Overview, Acoustic Waveform/Spectrogram Canvas, Biomarker Matrix, and Progression Trendline).
- **Density Model:** Spacing uses a compact 4px baseline rhythm (`0.25rem`). Standard table row heights remain condensed (`28px` to `32px`) to present longitudinal voice trials and scoring without excessive vertical scrolling.
- **Viewport Adaptation:**
  - **Desktop Workstation (>1280px):** 3-column split view (Left: Patient Demographics & Cohort Sessions, Center: Longitudinal Plots & Voice Phoneme Canvas, Right: Huntington Risk Indicator & Phenotype Scores).
  - **Tablet/Mobile Review (≤1024px):** Reflows into stacked single-focus diagnostic viewports managed via persistent clinical segment tabs.

## Elevation & Depth
Elevation is maintained nearly flat to emulate certified medical instrumentation, avoiding soft, decorative drop-shadows that distort visual hierarchy on color-calibrated monitors.

- **Structural Outlines:** Visual depth relies on crisp 1px borders using `#CBD5E1` (Slate-300) for structural cards and `#E2E8F0` (Slate-200) for internal table dividers.
- **Layering & Z-Index:**
  - **Base Canvas:** Neutral `#F8FAFC`.
  - **Active Workstation Panels:** Surface white (`#FFFFFF`) with a 1px solid `#CBD5E1` perimeter.
  - **Active Diagnostic Hover / Cell Selection:** Outlined in `#2E5B88` with a neutral tint (`#F1F5F9`).
  - **Modal / Diagnostic Dialog:** Single-plane elevation utilizing a clinical ambient shadow (`0 2px 8px rgba(12, 35, 64, 0.08)`) combined with a solid 1px `#94A3B8` border to delineate diagnostic alert dialogs cleanly from the underlying patient record.

## Shapes
A conservative, structural geometry (`roundedness: 1` — base `0.25rem` / `4px`) is utilized across all UI primitives. This slight softening prevents the harshness of completely sharp corners while preserving tabular alignment, dense cell stacking, and screen real estate.

- **Inputs, Buttons, and Data Cells:** Styled with `4px` corner radiuses (`rounded-sm`).
- **Clinical Badges & Risk Pills:** Constrained to `4px` radiuses rather than pill-shaped circles, ensuring they integrate cleanly into compact table rows alongside monospaced data values.
- **Modal Overlays and Floating Drawers:** Bound by a maximum radius of `6px` (`rounded-md`), reinforcing the software's identity as a clinical instrument.

## Components

### Buttons & Operational Switches
- **Primary Clinical Action (e.g., "Run Voice Biomarker Inference", "Export Clinical Report"):** Solid `#0C2340` background, pure white text, 1px border (`#0C2340`), `28px` height in dense mode, `4px` radius. Focus states exhibit a persistent 2px `#2E5B88` outer ring with 1px white offset.
- **Secondary Actions (e.g., "Calibrate Audio Input", "Compare Baseline"):** White background, `#0C2340` text, 1px `#CBD5E1` border; hover creates a slate-100 (`#F1F5F9`) shift.
- **Destructive/Alert Buttons:** Crimson `#BE123C` outline or fill, strictly reserved for actions such as session invalidation or diagnostic override.

### Diagnostic Risk Chips & Badges
- Constructed with a structural 1px border, light-tint background, and dark text for maximum contrast:
  - **Low / Stable:** `#0F766E` text, `#F0FDFA` fill, `#99F6E4` border.
  - **Moderate / Watch:** `#B45309` text, `#FFFBEB` fill, `#FDE68A` border.
  - **High / Alert:** `#BE123C` text, `#FFF1F2` fill, `#FECDD3` border.
- Always include an accompanying icon indicator (e.g., check, horizontal dash, warning delta) alongside text to guarantee accessibility for color-vision deficient clinicians.

### Tables & Longitudinal Matrices
- Headers feature uppercase tracking (`11px`), `#475569` slate text, `#F1F5F9` background, and a definitive 1px border bottom (`#CBD5E1`).
- Alternating zebra striping is omitted in favor of clear hover states (`#F8FAFC`) and thin 1px horizontal cell dividers (`#E2E8F0`).
- Numerical values default to `JetBrains Mono`, aligned right, with units (`ms`, `Hz`, `%`) rendered in a muted `#64748B` tone at `10px`.

### Acoustic Visualizers & Clinical Charting
- **Voice Spectrogram & Waveform Playback:** Clean `#0C2340` timeline trace over an off-white `#F8FAFC` grid canvas. Playback head is a high-visibility `1.5px` vertical `#2E5B88` line.
- **Huntington Phenotype Radar Chart:** Background grid polygons mapped with 1px `#E2E8F0` rings; healthy baseline depicted as a dashed `#94A3B8` outline; patient assessment profile plotted with a solid `#2E5B88` perimeter and `15%` fill opacity.
- **Progression Timelines:** Horizontal scatter/trend charts with discrete anchor nodes denoting clinical visits, accompanied by explicit error-bar whiskers and risk band fills.

### Input Fields & Search Bars
- Condensed height (`30px`), crisp `#CBD5E1` border, white background. On focus: `#2E5B88` border with zero drop-shadow. Monospaced patient MRN (Medical Record Number) search supports instant keyboard indexing (`Ctrl/Cmd + K`).