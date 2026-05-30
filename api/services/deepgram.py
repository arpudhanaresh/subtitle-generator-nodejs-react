import httpx

DEEPGRAM_URL = "https://api.deepgram.com/v1/listen"


def transcribe(audio_path: str, api_key: str) -> list[dict]:
    """Send audio to Deepgram and return the list of recognized words.

    Uses the Deepgram REST API directly (same endpoint/params as the original
    Node implementation) for behavior parity: model `nova-2`, smart formatting on.
    """
    with open(audio_path, "rb") as f:
        audio_bytes = f.read()

    headers = {
        "Authorization": f"Token {api_key}",
        "Content-Type": "audio/mp3",
        "Accept": "application/json",
    }
    params = {"model": "nova-2", "smart_format": "true"}

    with httpx.Client(timeout=300.0) as client:
        response = client.post(DEEPGRAM_URL, headers=headers, params=params, content=audio_bytes)
    response.raise_for_status()
    data = response.json()

    try:
        return data["results"]["channels"][0]["alternatives"][0]["words"]
    except (KeyError, IndexError, TypeError):
        return []
