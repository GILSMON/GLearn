"""
database.py — sets up the SQLAlchemy engine and session.

- engine: the connection to PostgreSQL
- SessionLocal: a factory that creates new DB sessions
- Base: all models inherit from this so SQLAlchemy knows about them
- get_db(): a FastAPI dependency that opens a session, yields it, then closes it
"""

from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, DeclarativeBase
from dotenv import load_dotenv
import os

load_dotenv()

DATABASE_URL = os.getenv("DATABASE_URL", "postgresql://gilsmonpcherian@localhost/gilslearn")

engine = create_engine(DATABASE_URL)

# autocommit=False: we control when to commit (safer)
# autoflush=False: don't auto-write to DB until we explicitly commit
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)


class Base(DeclarativeBase):
    """All models inherit from this base class."""
    pass


def get_db():
    """
    FastAPI dependency. Use with Depends(get_db) in route functions.
    Opens a DB session, yields it to the route, then closes it when done.
    """
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
