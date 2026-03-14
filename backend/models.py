"""
models.py — SQLAlchemy ORM models.

Each class maps to a database table. SQLAlchemy translates Python
objects into SQL automatically — you rarely write raw SQL.

Tables:
  Domain  → study subject areas (e.g. FastAPI, DSA)
  Topic   → subtopics within a domain (e.g. Routing, Arrays)
  Card    → individual study cards (Q&A, concept, code snippet)
  Note    → free-form text notes attached to a topic
  Project → portfolio projects with tech stack and resume bullets
"""

from sqlalchemy import (
    Column, Integer, String, Boolean, Text, ForeignKey, DateTime
)
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func

from database import Base


class Domain(Base):
    __tablename__ = "domains"

    id         = Column(Integer, primary_key=True, index=True)
    name       = Column(String(100), nullable=False, unique=True)
    icon       = Column(String(50))   # emoji, e.g. "🧮"
    color      = Column(String(20))   # hex color, e.g. "#3B82F6"
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    # One domain has many topics; deleting a domain deletes its topics
    topics = relationship("Topic", back_populates="domain", cascade="all, delete-orphan")


class Topic(Base):
    __tablename__ = "topics"

    id         = Column(Integer, primary_key=True, index=True)
    domain_id  = Column(Integer, ForeignKey("domains.id", ondelete="CASCADE"), nullable=False)
    name       = Column(String(200), nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    domain = relationship("Domain", back_populates="topics")
    cards  = relationship("Card", back_populates="topic", cascade="all, delete-orphan")
    notes  = relationship("Note", back_populates="topic", cascade="all, delete-orphan")


class Card(Base):
    __tablename__ = "cards"

    id         = Column(Integer, primary_key=True, index=True)
    topic_id   = Column(Integer, ForeignKey("topics.id", ondelete="CASCADE"), nullable=False)
    # JSONB stores structured data flexibly — supports 3 card types (qa, concept, code_snippet)
    content    = Column(JSONB, nullable=False)
    done       = Column(Boolean, default=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())

    topic = relationship("Topic", back_populates="cards")


class Note(Base):
    __tablename__ = "notes"

    id         = Column(Integer, primary_key=True, index=True)
    topic_id   = Column(Integer, ForeignKey("topics.id", ondelete="CASCADE"), nullable=False)
    content    = Column(Text, nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    topic = relationship("Topic", back_populates="notes")


class Project(Base):
    __tablename__ = "projects"

    id             = Column(Integer, primary_key=True, index=True)
    name           = Column(String(200), nullable=False)
    description    = Column(Text)
    tech_stack     = Column(JSONB)  # e.g. ["LangGraph", "FastAPI", "pgvector"]
    links          = Column(JSONB)  # e.g. {"github": "...", "demo": "..."}
    resume_bullets = Column(JSONB)  # e.g. ["Architected...", "Designed..."]
    created_at     = Column(DateTime(timezone=True), server_default=func.now())
    updated_at     = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())
