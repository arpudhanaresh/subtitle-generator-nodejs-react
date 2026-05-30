# CLAUDE.md

Guidance for Claude Code (and humans) working in this repository.

## What this project is

A **subtitle generator**: a user uploads a video, the backend extracts the audio,
sends it to **Deepgram** for speech-to-text, groups the returned words into
sentences with timestamps, stores them in **MySQL**, and lets the user download the
result as an `.srt` file. Identical audio (same SHA-256) is de-duplicated so a
re-upload returns the cached transcription instantly.

## Architecture

```
app/  ── Frontend: Vite + React 19 + TypeScript + Tailwind CSS v4
api/  ── Backend:  Python + FastAPI (uvicorn), SQLAlchemy + PyMySQL, Deepgram, ffmpeg
              │
              ├── MySQL  (subtitles table; subtitle lines stored in a JSON column)
              └── Deepgram REST API  (model: nova-2, smart_format)
```

- The frontend talks to the backend over HTTP (default `http://localhost:5000`).
  There is **no direct DB access from the browser** — only the API touches MySQL.
- Audio extraction uses a bundled static ffmpeg binary via `imageio-ffmpeg`
  (no system ffmpeg install required), mirroring the old `ffmpeg-static` setup.

### Backend layout (`api/`)
| File | Responsibility |
|------|----------------|
| `main.py` | FastAPI app, CORS, routes (`POST /upload`, `GET /subtitles/recent`, `GET /subtitles/{sha256}`) |
| `config.py` | Typed settings loaded from `.env` via `pydantic-settings` |
| `database.py` | SQLAlchemy engine/session, table auto-create on startup |
| `models.py` | `Subtitle` ORM model (`subtitles` is a JSON column of `{start,end,text}`) |
| `services/media.py` | Extract audio from the uploaded video with ffmpeg |
| `services/deepgram.py` | Call the Deepgram REST API and return words |
| `services/subtitles.py` | Words → sentences, and sentences → SRT text |

### Frontend layout (`app/`)
| File | Responsibility |
|------|----------------|
| `src/main.tsx` | React entrypoint (`createRoot`) |
| `src/App.tsx` | Two-column layout: upload card + recent sidebar |
| `src/components/Upload.tsx` | Drag-drop upload, preview, download/share |
| `src/components/RecentSubtitles.tsx` | Recent list with search, download/share |
| `src/lib/api.ts` | Axios instance + typed API calls |
| `src/types.ts` | Shared TS types (`SubtitleRecord`, etc.) |
| `src/index.css` | `@import "tailwindcss";` + base styles |

## Common commands

### Backend (`api/`)
```bash
# one-time
python -m venv .venv
.venv\Scripts\activate          # Windows (PowerShell: .venv\Scripts\Activate.ps1)
pip install -r requirements.txt

# run (serves on PORT, default 5000)
uvicorn main:app --reload --port 5000
```

### Frontend (`app/`)
```bash
npm install
npm run dev      # Vite dev server (default http://localhost:5173)
npm run build    # type-check (tsc) + production build to dist/
npm run preview  # serve the production build locally
```

## Environment variables

Backend `api/.env` (copy from `api/.env.example`, never commit the real file):
```
PORT=5000
DB_HOST=...        DB_PORT=3306
DB_USER=...        DB_PASSWORD=...
DB_NAME=...
DEEPGRAM_API_KEY=...
```
Frontend `app/.env`:
```
VITE_API_URL=http://localhost:5000
```

## Conventions & gotchas

- **API response shape is a contract.** `/subtitles/recent` returns rows with
  `id`, `sha256`, `originalFilename`, and `subtitles` (an array). The frontend keys
  off `id` and reads `subtitles.length`. Keep these names stable across changes.
- **Deepgram is called via REST** (`POST https://api.deepgram.com/v1/listen`,
  `Token` auth, `model=nova-2&smart_format=true`) for behavior parity with the
  original implementation. The official `deepgram-sdk` is a valid alternative.
- **Shared hosting:** `DB_HOST` points at cPanel-style shared MySQL
  (user prefix `uhhkfcjm_`). The DB user usually cannot `CREATE DATABASE`, so the
  backend only ensures the **table** exists; the database must already exist.
- **MySQL JSON column:** subtitle lines are stored as JSON. Serialize on write,
  and treat the read value as already-parsed.
- Uploaded/extracted temp files live in `api/uploads/` and are deleted after each
  request; the folder is gitignored.

## History

This started as a Node/Express + Mongoose (MongoDB) backend and a Create React App
(JavaScript) frontend. It was migrated to React 19 + MySQL, then re-platformed to
the FastAPI + Vite/TS/Tailwind stack described above. See `IMPLEMENTATION_PLAN.md`.
