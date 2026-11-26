# INSIGHT

ALS (amyotrophic lateral sclerosis) voice screening support research prototype: Next.js UI + FastAPI HuBERT inference (`src/backend/`) + Firebase Realtime Database. Uses anonymized/test data only; outputs are screening support, never a diagnosis.

- The original `insight_*/code.html`, `screen.png`, and `clinical_diagnostic_precision/DESIGN.md` are the visual reference. Keep original Stitch artifacts unchanged. App code lives in `src/`.
- Input is an uploaded audio file. Do not add in-app microphone recording, audio device, sensor, Bluetooth, serial, or hardware features.
- No fictional patient or analysis fixtures in app code. Never fabricate unmeasured values (Jitter/Shimmer/HNR, status thresholds stay `null` until validated).
- Pages use the async service layer through the shared provider (`src/components/clinical-data-provider.tsx`).
- Firebase: rules deny all client access; only the Next.js server accesses the DB with credentials from `.env.local` (never commit them). Schema: `docs/database-schema.md`.
- Model weights (`head.pt`, `scaler.npz`) are tied to training run 20261005T055211_070474Z by `model_card.json`; regenerate with `scripts/build_model_card.py` after any change and keep `--check` passing.
- VHI-30 items and F/P/E domains in `src/data/vhi.ts` must match the PhenX worksheet; scores are recomputed on the server.
- Validate with `npm run lint`, `npm run typecheck`, `npm test`, `npm run build`, `python scripts/build_model_card.py --check`, and `python scripts/reproduce_inference.py`.

<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->
