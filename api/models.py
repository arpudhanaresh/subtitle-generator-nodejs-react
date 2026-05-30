from datetime import datetime

from sqlalchemy import JSON, DateTime, Integer, String, func
from sqlalchemy.orm import Mapped, mapped_column

from database import Base


class Subtitle(Base):
    __tablename__ = "subtitles"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    sha256: Mapped[str] = mapped_column(String(64), unique=True, nullable=False)
    # Each entry is {"start": float, "end": float, "text": str}.
    subtitles: Mapped[list] = mapped_column(JSON, nullable=False)
    format: Mapped[str | None] = mapped_column(String(32), nullable=True)
    originalFilename: Mapped[str | None] = mapped_column(String(255), nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, server_default=func.now())

    def to_dict(self) -> dict:
        return {
            "id": self.id,
            "sha256": self.sha256,
            "subtitles": self.subtitles,
            "format": self.format,
            "originalFilename": self.originalFilename,
            "created_at": self.created_at.isoformat() if self.created_at else None,
        }
