# INSIGHT

Clinician-facing Huntington disease voice screening decision support UI. This is a frontend prototype using fictional, precomputed data.

- The original `insight_*/code.html`, `screen.png`, and `clinical_diagnostic_precision/DESIGN.md` are the visual source of truth. Preserve their layout, density, colors, and typography; screenshots take priority.
- Keep original Stitch artifacts unchanged. App code lives in `src/`.
- Never add microphone input, recording, audio device, sensor, Bluetooth, serial, or hardware features.
- Centralize domain types and mock data; pages use the async service layer through the shared provider. Keep it ready for later FastAPI integration.
- Clinical wording must describe screening support, never a definitive diagnosis. Local review/export actions must clearly identify prototype data.
- Validate with `npm run lint`, `npm run typecheck`, `npm test`, and `npm run build`. Run `npm run dev` for browser verification and compare against Stitch screenshots at desktop sizes.

<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->
