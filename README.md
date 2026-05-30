# Subtitle Generator

A full-stack web application that generates subtitles from uploaded videos.

Users upload a video, the backend extracts the audio, sends it to Deepgram for
speech-to-text transcription, stores the generated subtitle data in MySQL, and
returns a downloadable `.srt` file.

## Features

- Upload video files from the browser.
- Extract audio from video on the backend.
- Generate speech-to-text subtitles with Deepgram.
- Store subtitle results in MySQL.
- Avoid duplicate work by caching transcriptions with a SHA-256 audio hash.
- View recent subtitle generations.
- Download subtitles as `.srt` files.
- Run locally with PowerShell commands.
- Deploy with Docker.

## Tech Stack

### Frontend

- Vite
- React
- TypeScript
- Tailwind CSS
- Axios

### Backend

- Python
- FastAPI
- Uvicorn
- SQLAlchemy
- PyMySQL
- Deepgram REST API
- `imageio-ffmpeg`

### Database

- MySQL

## How It Works

```text
Browser
  |
  | Upload video
  v
FastAPI backend
  |
  | Extract audio with bundled FFmpeg
  v
Audio file
  |
  | Send to Deepgram
  v
Transcript words with timestamps
  |
  | Group into subtitle sentences
  v
MySQL + downloadable SRT
```

The backend uses `imageio-ffmpeg`, which provides a bundled FFmpeg executable.
In normal use, a separate system-wide FFmpeg install is not required.

## Project Structure

```text
.
|-- api/                         # FastAPI backend
|   |-- main.py                  # API routes and app startup
|   |-- config.py                # Environment-based settings
|   |-- database.py              # SQLAlchemy engine/session setup
|   |-- models.py                # Subtitle database model
|   |-- requirements.txt         # Python dependencies
|   `-- services/
|       |-- media.py             # Audio extraction
|       |-- deepgram.py          # Deepgram transcription
|       `-- subtitles.py         # Subtitle formatting helpers
|
|-- app/                         # Vite React frontend
|   |-- src/
|   |   |-- App.tsx
|   |   |-- components/
|   |   |-- lib/
|   |   `-- types.ts
|   |-- package.json
|   `-- vite.config.ts
|
|-- development.env.example      # Local env template
|-- production.env.example       # Production env template
|-- run.md                       # Local PowerShell commands
`-- deploy.md                    # Docker deployment notes
```

## Environment Variables

Create local env files from the example files and fill in your own values.

```env
PORT=5000

DB_HOST=your-db-host
DB_PORT=3306
DB_USER=your-db-user
DB_PASSWORD=your-db-password
DB_NAME=your-db-name

DEEPGRAM_API_KEY=your-deepgram-api-key

VITE_API_URL=http://localhost:5000
```

Use:

```text
development.env   Local development
production.env    Docker or production deployment
```

Do not commit real secrets.

## Local Development

Local run commands are documented in [run.md](run.md).

Default local URLs:

```text
Frontend: http://localhost:5173
Backend:  http://localhost:5000
API docs: http://localhost:5000/docs
```

Quick start on Windows PowerShell:

```powershell
Copy-Item development.env api\.env
Get-Content development.env | Where-Object { $_ -match '^VITE_' } | Set-Content app\.env
```

Start the backend:

```powershell
cd api
python -m venv .venv
.\.venv\Scripts\Activate.ps1
pip install -r requirements.txt
uvicorn main:app --reload --host 0.0.0.0 --port 5000
```

Start the frontend in another terminal:

```powershell
cd app
npm install
npm run dev
```

## API Endpoints

### `POST /upload`

Upload a video file and generate subtitles.

Form field:

```text
video
```

Response includes:

```json
{
  "message": "Subtitles fetched from Deepgram API and saved to database.",
  "sha256": "audio-hash",
  "filename": "original-file-name",
  "format": "json",
  "subtitleSize": 12
}
```

### `GET /subtitles/recent`

Returns recent subtitle records from MySQL.

### `GET /subtitles/{sha256}`

Downloads the generated `.srt` file for a subtitle record.

## Docker Deployment

Docker deployment notes are documented in [deploy.md](deploy.md).

Use `production.env` for deployment configuration. Set `VITE_API_URL` to the
public backend URL before building the frontend image because Vite includes that
value in the static frontend bundle.

## Database Notes

The backend creates the `subtitles` table automatically on startup if it does
not already exist.

The MySQL database itself must already exist, especially on shared hosting where
application users often do not have permission to create databases.

## Subtitle Storage

Subtitle lines are stored in MySQL as JSON, with each line containing:

```json
{
  "start": 0.0,
  "end": 2.5,
  "text": "Example subtitle text"
}
```

When users download subtitles, the backend converts this JSON data into SRT
format.

## Build

Build the frontend:

```powershell
cd app
npm run build
```

Compile-check backend Python files:

```powershell
cd api
.\.venv\Scripts\python.exe -m py_compile main.py services\media.py services\deepgram.py services\subtitles.py
```

## Security Notes

- Keep `.env` files out of Git.
- Rotate any API keys or database credentials that were accidentally shared.
- Use HTTPS in production.
- Restrict CORS origins before deploying to a public production environment.
- Use a production-ready reverse proxy in front of the backend when deploying
  outside Docker Compose.

## License

Add a license before publishing this project publicly.
