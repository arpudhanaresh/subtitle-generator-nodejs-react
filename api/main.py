import hashlib
import os
import shutil
import time
import uuid
from contextlib import asynccontextmanager
from urllib.parse import quote

from fastapi import Depends, FastAPI, File, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse, Response
from sqlalchemy import select
from sqlalchemy.orm import Session

from config import settings
from database import get_db, init_db
from models import Subtitle
from services.deepgram import transcribe
from services.media import extract_audio
from services.subtitles import sentences_to_srt, words_to_sentences

UPLOAD_DIR = os.path.join(os.path.dirname(__file__), "uploads")
os.makedirs(UPLOAD_DIR, exist_ok=True)


def download_header(filename: str) -> str:
    download_name = f"{filename}.srt"
    ascii_name = "".join(
        char if 32 <= ord(char) < 127 and char not in {'"', "\\"} else "_"
        for char in download_name
    )
    ascii_name = ascii_name.strip(" .") or "subtitles.srt"
    utf8_name = quote(download_name, safe="")
    return f'attachment; filename="{ascii_name}"; filename*=UTF-8\'\'{utf8_name}'


@asynccontextmanager
async def lifespan(app: FastAPI):
    init_db()
    print("Connected to MySQL")
    yield


app = FastAPI(title="Subtitle Generator API", lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.post("/upload")
def upload(video: UploadFile = File(...), db: Session = Depends(get_db)):
    start_time = time.time()
    print("Upload started.")

    safe_name = os.path.basename(video.filename or "video")
    video_path = os.path.join(UPLOAD_DIR, f"{int(time.time() * 1000)}-{safe_name}")
    audio_path = os.path.join(UPLOAD_DIR, f"{uuid.uuid4().hex}-audio.mp3")
    original_filename = os.path.splitext(safe_name)[0]

    try:
        with open(video_path, "wb") as f:
            shutil.copyfileobj(video.file, f)

        # Step 1: Extract audio from the video.
        extract_audio(video_path, audio_path)

        # Step 2: Compute the SHA-256 of the extracted audio.
        with open(audio_path, "rb") as f:
            sha256 = hashlib.sha256(f.read()).hexdigest()

        # Step 3: Return the cached transcription if we've seen this audio before.
        existing = db.execute(
            select(Subtitle).where(Subtitle.sha256 == sha256)
        ).scalar_one_or_none()
        if existing is not None:
            print(f"Subtitles found in database in {int((time.time() - start_time) * 1000)} ms.")
            return {
                "message": "Subtitles fetched from database.",
                "sha256": existing.sha256,
                "filename": existing.originalFilename,
                "format": existing.format,
                "subtitleSize": len(existing.subtitles),
            }

        # Step 4: Request a transcription from Deepgram.
        words = transcribe(audio_path, settings.DEEPGRAM_API_KEY)
        if not words:
            return JSONResponse(
                status_code=500,
                content={"error": "Unable to fetch subtitles from Deepgram API"},
            )

        # Step 5: Group the words into timestamped sentences.
        sentences = words_to_sentences(words)

        # Step 6: Persist the subtitles.
        record = Subtitle(
            sha256=sha256,
            subtitles=sentences,
            format="json",
            originalFilename=original_filename,
        )
        db.add(record)
        db.commit()

        return {
            "message": "Subtitles fetched from Deepgram API and saved to database.",
            "sha256": sha256,
            "filename": original_filename,
            "format": "json",
            "subtitleSize": len(sentences),
        }
    except Exception as err:  # noqa: BLE001 - mirror the original catch-all behavior
        print("Error:", err)
        return JSONResponse(
            status_code=500,
            content={"error": "An error occurred during the upload process."},
        )
    finally:
        # Best-effort cleanup: a failure to delete a temp file must not mask the
        # actual response (e.g. a lingering file handle on Windows).
        for path in (video_path, audio_path):
            if os.path.exists(path):
                try:
                    os.remove(path)
                except OSError as cleanup_err:
                    print(f"Warning: could not remove temp file {path}: {cleanup_err}")
        print(f"Total upload process completed in {int((time.time() - start_time) * 1000)} ms.")


# NOTE: this route must be declared before "/subtitles/{sha256}" so that the
# literal path "recent" is not captured by the path parameter.
@app.get("/subtitles/recent")
def recent_subtitles(db: Session = Depends(get_db)):
    try:
        print("Fetching recent subtitles...")
        rows = db.execute(
            select(Subtitle).order_by(Subtitle.id.desc()).limit(10)
        ).scalars().all()

        if not rows:
            print("No recent subtitles found.")
            return JSONResponse(status_code=404, content={"message": "No recent subtitles found."})

        return [row.to_dict() for row in rows]
    except Exception as err:  # noqa: BLE001
        print("Error fetching recent subtitles:", err)
        return JSONResponse(
            status_code=500,
            content={"error": "An error occurred while fetching recent subtitles."},
        )


@app.get("/subtitles/{sha256}")
def get_subtitle(sha256: str, db: Session = Depends(get_db)):
    try:
        record = db.execute(
            select(Subtitle).where(Subtitle.sha256 == sha256)
        ).scalar_one_or_none()

        if record is None:
            return JSONResponse(status_code=404, content={"error": "Subtitles not found."})

        srt = sentences_to_srt(record.subtitles)
        return Response(
            content=srt,
            media_type="text/plain",
            headers={
                "Content-Disposition": download_header(record.originalFilename)
            },
        )
    except Exception as err:  # noqa: BLE001
        print(err)
        return JSONResponse(
            status_code=500,
            content={"error": "An error occurred while fetching subtitles."},
        )


if __name__ == "__main__":
    import uvicorn

    uvicorn.run("main:app", host="0.0.0.0", port=settings.PORT)
