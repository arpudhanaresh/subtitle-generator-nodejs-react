# Implementation Plan — Re-platform to FastAPI + Vite/React/TS/Tailwind

> **Status: ✅ COMPLETE** (2026-05-30). Both halves re-platformed, built, and verified
> live against the remote MySQL. See the Verification checklist at the bottom.

## Goal

Replaced the previous stack with:

- **Frontend:** Vite + React 19 + TypeScript + Tailwind CSS v4 (was: Create React App, JS)
- **Backend:** Python + FastAPI (was: Node.js + Express)
- **Kept:** MySQL and Deepgram for transcription.

Behavior is identical: upload video → extract audio → Deepgram → group into sentences →
store in MySQL (JSON column) → download `.srt`, with SHA-256 dedup and a "recent
subtitles" sidebar.

## Database migration scope (decided 2026-05-30)

- **Schema / code migration — ✅ DONE and is the agreed final scope.** The application is
  fully on MySQL: Mongoose/MongoDB removed, SQLAlchemy 2.0 + PyMySQL in, `Subtitle` model
  with a JSON column, `CREATE TABLE IF NOT EXISTS` on startup. No MongoDB code paths remain.
- **Data migration — ❌ NOT REQUIRED (explicitly out of scope).** No historical documents
  are copied from any prior MongoDB into MySQL. The `subtitles` table starts empty and is
  populated solely by future `/upload` requests. No ETL/seed/dump script will be written.

## Final dependency versions

**Backend (`api/requirements.txt`, pinned):**
- fastapi 0.136.3, uvicorn[standard] 0.48.0
- sqlalchemy 2.0.50, pymysql 1.2.0 (pure-Python; no build tools needed)
- pydantic-settings 2.14.1 — typed config from `.env`
- python-multipart 0.0.29 — required by FastAPI for file uploads
- httpx 0.28.1 — Deepgram REST calls
- imageio-ffmpeg 0.6.0 — bundled static ffmpeg binary (replaces `ffmpeg-static`)

**Frontend (`app/package.json`):**
- react 19.2.6, react-dom 19.2.6
- vite 8.0.14, @vitejs/plugin-react 6.0.2
- typescript 6.0.3, @types/react 19.2.15, @types/react-dom 19.2.3
- tailwindcss 4.3.0 + @tailwindcss/vite 4.3.0
- axios 1.16.1

## Phases

### Phase 1 — Backend (FastAPI) ✅ DONE
1. ✅ `config.py` — `Settings(BaseSettings)` reads `PORT`, `DB_*`, `DEEPGRAM_API_KEY`; the DB
   password is percent-encoded in the `mysql+pymysql://` URL.
2. ✅ `database.py` — SQLAlchemy engine (pool_pre_ping/pool_recycle), session factory,
   `init_db()` that runs `CREATE TABLE IF NOT EXISTS` (no `CREATE DATABASE` — shared hosting
   can't; best-effort attempt is wrapped so it never crashes startup).
3. ✅ `models.py` — `Subtitle` model: `id`, `sha256` (unique), `subtitles` (JSON),
   `format`, `originalFilename`, `created_at`, plus `to_dict()` for the API contract.
4. ✅ `services/media.py` — extract audio to mp3 with the `imageio-ffmpeg` binary.
5. ✅ `services/deepgram.py` — `POST /v1/listen` via httpx with `Token` auth, `nova-2`,
   `smart_format`.
6. ✅ `services/subtitles.py` — `words_to_sentences()` and `sentences_to_srt()`
   (ported 1:1 from the Node logic; verified byte-identical for normal inputs).
7. ✅ `main.py` — FastAPI app + CORS + the three routes (`/subtitles/recent` declared
   before `/subtitles/{sha256}`); `init_db()` via lifespan; best-effort temp-file cleanup.
8. ✅ `.env.example` (placeholders), `.gitignore` switched to Python, `.env` kept (gitignored).

### Phase 2 — Remove old Node backend ✅ DONE
Deleted `index.js`, `debug-subtitles.js`, `package.json`, `package-lock.json`, `node_modules/`.
Audit confirms `api/` is pure Python (no `require(`/`module.exports`, no Mongoose/Express).

### Phase 3 — Verify backend ✅ DONE
venv created, deps installed, app boots → logs `Connected to MySQL`;
`GET /subtitles/recent` → 404 on the empty table; `/docs` → 200; `SELECT COUNT(*)` → 0.

### Phase 4 — Frontend (Vite + React + TS + Tailwind) ✅ DONE
1. ✅ `package.json`, `vite.config.ts` (react + `@tailwindcss/vite`), `tsconfig.json`, `index.html`.
2. ✅ `src/main.tsx` (`createRoot`), `src/index.css` (`@import "tailwindcss";`), `src/vite-env.d.ts`.
3. ✅ `src/types.ts` — `SubtitleRecord`, `SubtitleLine`, `UploadResponse` (match backend `to_dict()`).
4. ✅ `src/lib/api.ts` — axios instance using `import.meta.env.VITE_API_URL`.
5. ✅ `src/App.tsx`, `src/components/Upload.tsx`, `src/components/RecentSubtitles.tsx`
   — UI ported to TSX, styled with Tailwind (blue accent, dashed dropzone, white cards, sidebar).
6. ✅ `.env` (`VITE_API_URL`), `.gitignore` (Vite).

### Phase 5 — Remove old CRA frontend & verify ✅ DONE
Deleted CRA `src/` JS, CRA `public/index.html`/`manifest.json`/logos, `package-lock.json`,
old `node_modules/`, `build/`. `npm install` → 0 vulnerabilities; `npm run build`
(tsc --noEmit + vite build) → clean build emitting `dist/`.

## Out of scope / follow-ups
- **Data migration from MongoDB** — not required (see Database migration scope above).
- Deployment config for FastAPI on cPanel/Passenger (ASGI) — documented in CLAUDE.md as a
  known constraint; may need a dedicated host or `uvicorn` behind a reverse proxy.
- Validate the bundled ffmpeg includes `libmp3lame` on the actual (Linux) deploy target.
- The `file.io` share feature is preserved as-is (third-party upload from the browser).
- Automated tests for the new stack (pytest for the API, Vitest for the UI) — recommended next.
- Rotate the Deepgram key and DB password (they were shared in chat).

## Verification checklist
- [x] `uvicorn main:app` boots and logs "Connected to MySQL" — verified (live, remote MySQL)
- [x] `GET /subtitles/recent` → 404 on empty DB (`SELECT COUNT(*)` = 0); `/docs` → 200
- [x] `npm run build` (frontend) completes with no TS errors (`tsc --noEmit` clean)
- [x] Adversarial code review of both halves — no high/medium correctness bugs
- [ ] Upload flow exercised end-to-end (needs a real video + live Deepgram credits) — not run
