from sqlalchemy import create_engine
from sqlalchemy.orm import DeclarativeBase, sessionmaker

from config import settings


class Base(DeclarativeBase):
    pass


# pool_pre_ping avoids stale connections being handed out (common on shared
# hosting that drops idle connections); pool_recycle keeps them under the
# server's wait_timeout.
engine = create_engine(
    settings.database_url,
    pool_pre_ping=True,
    pool_recycle=280,
)

SessionLocal = sessionmaker(bind=engine, autoflush=False, autocommit=False)


def init_db() -> None:
    """Create the subtitles table if it does not already exist.

    We deliberately do NOT create the database itself: on shared hosting the
    database is provisioned by the control panel and the DB user typically lacks
    the CREATE DATABASE privilege.
    """
    from models import Subtitle  # noqa: F401  (registers the table on Base.metadata)

    Base.metadata.create_all(bind=engine)


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
