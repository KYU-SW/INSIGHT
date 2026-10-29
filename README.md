# INSIGHT

Early Detection of Amyotrophic Lateral Sclerosis (ALS) through Speech Analysis

Research prototype (Next.js 16 / React 19 frontend + Python HuBERT inference service). Uses anonymized/test data only; outputs are screening support, not a diagnosis.

## Setup

```sh
cp .env.example .env.local   # then enter your own FIREBASE_DATABASE_URL
```

This is a Next.js 16 / React 19 research voice screening UI. The original Stitch `insight_*/code.html` and `screen.png` files provide the visual reference. Application code is in `src/`. The Voice Analysis, Patient Registry, and History tabs are active. Registry and history show results from the current browser session and, after manual connection and loading, Firebase Realtime Database. No fictional patient or analysis fixtures are included in app code.

The primary `/` and `/analysis` views accept an anonymized ID, a task label, and an uploaded WAV/FLAC/OGG file. `src/services/analysisService.ts` sends it through the shared provider to `src/app/api/analyze/route.ts`. This Next.js route forwards the request to the Python service in `src/backend/app.py`. The backend decodes audio, extracts HuBERT features, applies the saved scaler and MLP head, computes descriptive acoustic and recording measurements, and returns one structured JSON result. Results initially remain in browser memory. The lower-left DB button checks access; a result can then be uploaded below Acoustic Parameters, and Patient Registry can load stored results. Raw audio is not sent to Firebase.

## Realtime Database

`src/app/api/database/` uses the Firebase REST API with `FIREBASE_DATABASE_URL`. No default is bundled: copy `.env.example` to `.env.local` and enter your own Firebase URL, otherwise DB requests fail with an explicit error. The supplied rules permit child reads, but collection reads currently return HTTP 401. Registry loading needs reads at `/subjects`, `/recordings`, `/analyses`, and `/acoustic_metrics`; `firebase.database.rules.json` contains the minimum collection-level read additions required for the current unauthenticated prototype. Apply the rules in the Firebase console before using the Connect button. These rules make anonymized records publicly readable and writable. Use Firebase Authentication and restricted rules before storing real patient data. The supplied `database.json` is a schema example and is never imported by this app.

Uploads require every field named in the supplied Firebase `.validate` rules. If a required acoustic value is unavailable, the UI disables upload instead of fabricating it. The server stores the original 0–1 score, computes a SHA-256 identifier for `head.pt`, and records the pipeline identifier. The DB does not receive raw audio or a fabricated status/confidence value. DB list loading currently reads all four collections, so add pagination/query limits before using a large cohort.

## Run

Use Python 3.11 on Intel macOS for the tested inference environment and install `requirements-inference.txt`. Allow at least 2 GB of free disk space for the pinned HuBERT checkpoint, Python packages, and build files. Run the services in separate terminals:

```sh
python3.11 -m pip install -r requirements-inference.txt
HF_HOME=./hf-cache python3.11 -m uvicorn src.backend.app:app --host 127.0.0.1 --port 8001
npm install
npm run dev
```

`INFERENCE_API_URL` defaults to `http://127.0.0.1:8001`. The pinned `facebook/hubert-large-ls960-ft` revision is downloaded to `HF_HOME` (e.g. `./hf-cache`, git-ignored); keep `HF_HOME` set to the same path on restart. Run `npm run lint`, `npm run typecheck`, `npm test`, and `npm run build` for frontend checks.

## Model mapping

The supplied `head.pt` is authoritative for classifier shape and layer names: `Linear(1024,128)`, `ReLU`, `Linear(128,1)` in inference mode. Its final tensors are `classifier.2.*`; the notebook's dropout layer would be an identity in inference mode. The supplied `history.csv` includes 22 epochs, whereas the notebook sets `MAX_EPOCHS = 20`, and `validation.json` differs from the notebook output for `MLP_MAX_h07`. The weights do not encode the upstream HuBERT revision or hidden-state index. Those parts follow the supplied notebook and the requested h07 model name. This provenance difference limits confidence that the feature extraction exactly matches the training run.

The notebook pipeline is represented in `src/backend/model.py`: mono average, 16 kHz librosa resampling, frozen HuBERT hidden state 7, time maximum pooling to 1024 values, saved `StandardScaler` mean and scale, MLP logit and sigmoid for training label 1. The pinned checkpoint's legacy positional convolution tensors are mapped to current Transformers keys before loading. No validated three-level clinical thresholds were supplied. `src/backend/interpretation.py` keeps the status `null` until they are configured. Recording duration, RMS dBFS, and the proportion of near-full-scale samples are measured; no quality grade is inferred.

## Mobile (PWA)

The same Next.js app is the mobile client: below 760 px the sidebar becomes a bottom tab bar, `manifest.ts` and `/pwa-icon/[size]` make it installable (Android Chrome: Install app; iOS Safari: Share → Add to Home Screen). There is no service worker and no offline cache, so no results or audio are stored on the device. The phone selects an existing audio file (no in-app recording). WAV/FLAC/OGG is sent unchanged; other formats (e.g. iOS Voice Memos M4A, MP3) are decoded by the browser and re-encoded as 16 kHz mono PCM16 WAV before upload. Upload progress comes from XMLHttpRequest; the backend and model output are unchanged.

To reach it from a phone, serve a production build and expose it over HTTPS (PWA install requires HTTPS), e.g. a temporary tunnel; use anonymized/test data only because the URL is public:

```sh
npm run build && npm start
cloudflared tunnel --url http://127.0.0.1:3000   # or: ngrok http 3000
```
