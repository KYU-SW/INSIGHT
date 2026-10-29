# EMR UI refactor

This revision changes the existing three-screen voice research interface, not its clinical or persistence behavior. The current app has analysis, patient registry and history routes; dashboard and patient-detail routes redirect. It has no separate patient registration, prescription or clinical-note editor. Original Stitch HTML, images and design documents remain unchanged. The new user instruction supersedes their visual layout for this revision.

## Layout

- A 38px application bar and 40px navigation toolbar replace the wide desktop sidebar. Existing routes and DB connection action remain available.
- Border-separated white/gray work areas replace shadowed cards. Body copy is 13px; section headings are 16px; controls are approximately 30px tall.
- At desktop widths of at least 1100px, the registry uses a 250px patient list beside recording rows and the selected result. Patient and result panes scroll independently.
- Recording tables have sticky headings, consistent row spacing, alternating row backgrounds and explicit selected states.
- Selected result identity stays visible while scrolling the detailed result. Following the subsequent user request, explanatory paragraphs, research/prototype badges and the research-use notice were removed.
- Korean system font fallbacks, tabular numeric values and keyboard focus indicators support readability. Narrow layouts retain the same top navigation and connection action.

## Preserved behavior

No changes to provider state, service calls, API endpoints, backend, domain types, task data, inference, conversion or persistence logic. Source AST comparison verifies unchanged event handlers, input values, disabled conditions, links and IDs in all three modified TSX files. Only presentation classes, shell markup and DB-button location guidance changed.

Input/selection lifetime across route navigation remains the existing React behavior; this change does not introduce cross-route draft persistence.

## References

- Oracle Health EHR User Guide: https://docs.oracle.com/en/industries/health/oracle-health-ehr/ehrfg/results.html — related results are grouped for review.
- Oracle Health EHR User Guide: https://docs.oracle.com/en/industries/health/oracle-health-ehr/ehrfg/oracle-health-ehr-user-guide.pdf — opening patient charts from patient rows.
- ezCaretech official BESTCare overview: https://global.ezcaretech.com/en/General_Hospital_EHR.html — product context only; no unverified screen details attributed to it.

The layout is an original adaptation to the implemented functionality, not a reproduction of a vendor UI.

## Validation

- `npm run lint`: pass.
- `npm run typecheck`: pass.
- `npm test`: all 6 tests pass.
- `npm run build`: pass.
- Browser regression: pass on the existing `npm run dev` server at localhost:3000, using an isolated headless browser profile and intercepted API responses (25 fictional session records). Checked ID normalization; task/time/file inputs; disabled submit; analysis result creation; DB connect/upload/load; patient selection and result reset; history rows; all three navigation tabs; shared result retention; independent patient scrolling; and absence of page JavaScript errors.
- Layout overflow checks: 1440×900, 1280×800 and 390×844. Desktop registry/history and narrow analysis screenshots reviewed; original Stitch patient directory screenshot used as a comparison reference.
- Screenshots in `docs/ui-verification/` contain only synthetic `UI_TEST_*` data. They are dev-server captures, including the Next.js development indicator.
- External production DB writes and real model inference were not exercised. Tests intercepted their responses; actual backend/network availability is outside this UI-only validation.
- Original JSX event handlers, values, disabled guards, links and IDs compare equal before/after via a TypeScript AST audit.
