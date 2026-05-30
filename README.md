# Subtitle Generator

A full-stack subtitle generator. Upload a video, extract its audio, send the
audio to Deepgram for transcription, store the result in MySQL, and download the
generated subtitles as an `.srt` file.

## Stack

- Frontend: Vite, React, TypeScript, Tailwind CSS
- Backend: Python, FastAPI, SQLAlchemy, PyMySQL
- Database: MySQL
- Transcription: Deepgram
- Audio extraction: bundled FFmpeg through `imageio-ffmpeg`

## Project Structure

```text
api/        FastAPI backend
app/        Vite React frontend
run.md      Local PowerShell run commands
deploy.md   Docker deployment notes
```

## Environment Files

Use the root env files as the source:

```text
development.env   Local development
production.env    Docker/production deployment
```

Example files are included:

```text
development.env.example
production.env.example
```

## Local Run

See [run.md](run.md) for PowerShell commands.

Default local URLs:

```text
Frontend: http://localhost:5173
Backend:  http://localhost:5000
API docs: http://localhost:5000/docs
```

## Docker Deploy

See [deploy.md](deploy.md) for Docker deployment commands and example Docker
files.

## Notes

- The backend uses `imageio-ffmpeg`, so a separate system FFmpeg install is not
  normally required.
- The MySQL database must already exist. The backend creates the `subtitles`
  table on startup if needed.
- Do not commit real `.env` files or secrets.
