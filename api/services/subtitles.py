def words_to_sentences(words: list[dict]) -> list[dict]:
    """Group Deepgram words into sentences with start/end timestamps.

    Ported 1:1 from the original Node logic: a sentence ends at a word whose
    punctuated form ends with '.' or ','.
    """
    sentences: list[dict] = []
    if not words:
        return sentences

    current = {"start": words[0]["start"], "text": ""}
    for index, word in enumerate(words):
        punctuated = word.get("punctuated_word") or word.get("word", "")
        current["text"] += punctuated

        if word.get("punctuated_word") and (
            word["punctuated_word"].endswith(".") or word["punctuated_word"].endswith(",")
        ):
            current["end"] = word["end"]
            sentences.append(current)
            if index < len(words) - 1:
                current = {"start": words[index + 1]["start"], "text": ""}
        else:
            current["text"] += " "

    if "end" not in current:
        current["end"] = words[-1]["end"]
        sentences.append(current)

    return sentences


def _format_timestamp(seconds: float) -> str:
    """Format seconds as an SRT timestamp: HH:MM:SS,mmm."""
    total_ms = int(round(seconds * 1000))
    hours, total_ms = divmod(total_ms, 3_600_000)
    minutes, total_ms = divmod(total_ms, 60_000)
    secs, millis = divmod(total_ms, 1000)
    return f"{hours:02d}:{minutes:02d}:{secs:02d},{millis:03d}"


def sentences_to_srt(sentences: list[dict]) -> str:
    """Render sentences as SRT subtitle text."""
    blocks = []
    for index, sentence in enumerate(sentences, start=1):
        start = _format_timestamp(sentence["start"])
        end = _format_timestamp(sentence["end"])
        blocks.append(f"{index}\n{start} --> {end}\n{sentence['text']}\n")
    return "\n".join(blocks)
