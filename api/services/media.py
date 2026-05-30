import subprocess

import imageio_ffmpeg


def extract_audio(video_path: str, audio_path: str) -> None:
    """Extract an MP3 audio track from a video file using a bundled ffmpeg.

    `imageio_ffmpeg` ships a static ffmpeg binary, so no system-wide ffmpeg
    install is required (this replaces the Node `ffmpeg-static` dependency).
    """
    ffmpeg_exe = imageio_ffmpeg.get_ffmpeg_exe()
    cmd = [
        ffmpeg_exe,
        "-y",                    # overwrite the output file if it exists
        "-i", video_path,
        "-vn",                   # drop the video stream
        "-acodec", "libmp3lame",
        audio_path,
    ]
    result = subprocess.run(
        cmd,
        capture_output=True,
        text=True,
        encoding="utf-8",
        errors="replace",
    )
    if result.returncode != 0:
        raise RuntimeError(f"ffmpeg failed ({result.returncode}): {result.stderr[-500:]}")
