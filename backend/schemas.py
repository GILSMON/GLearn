"""
schemas.py — Pydantic models for request validation and response shaping.

Pydantic ensures:
- Incoming request bodies have the right fields and types
- Outgoing responses are serialized correctly

Naming convention:
  <Model>Create  → fields required to create a record (POST body)
  <Model>Update  → fields that can be updated (PATCH body, all optional)
  <Model>Out     → what the API returns (includes id, timestamps, etc.)
"""

from pydantic import BaseModel
from typing import Any, Optional
from datetime import datetime


# ─── Domain ───────────────────────────────────────────────────────────────────

class DomainCreate(BaseModel):
    name: str
    icon: Optional[str] = None
    color: Optional[str] = None


class DomainOut(BaseModel):
    id: int
    name: str
    icon: Optional[str]
    color: Optional[str]
    created_at: datetime
    # These are computed at query time, not DB columns
    card_count: int = 0
    done_count: int = 0

    model_config = {"from_attributes": True}


# ─── Topic ────────────────────────────────────────────────────────────────────

class TopicCreate(BaseModel):
    domain_id: int
    name: str


class TopicMove(BaseModel):
    topic_ids: list[int]
    target_domain_id: int


class TopicOut(BaseModel):
    id: int
    domain_id: int
    name: str
    created_at: datetime
    card_count: int = 0
    done_count: int = 0

    model_config = {"from_attributes": True}


# ─── Card ─────────────────────────────────────────────────────────────────────

class CardCreate(BaseModel):
    topic_id: int
    # content is flexible JSONB — accepts any dict matching qa/concept/code_snippet shape
    content: dict[str, Any]


class CardUpdate(BaseModel):
    # All fields optional — PATCH only updates what's provided
    content: Optional[dict[str, Any]] = None
    done: Optional[bool] = None


class CardOut(BaseModel):
    id: int
    topic_id: int
    content: dict[str, Any]
    done: bool
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}


# ─── Note ─────────────────────────────────────────────────────────────────────

class NoteCreate(BaseModel):
    topic_id: int
    content: str


class NoteOut(BaseModel):
    id: int
    topic_id: int
    content: str
    created_at: datetime

    model_config = {"from_attributes": True}


# ─── Project ──────────────────────────────────────────────────────────────────

class ProjectCreate(BaseModel):
    name: str
    description: Optional[str] = None
    tech_stack: Optional[list[str]] = None
    links: Optional[dict[str, str]] = None
    resume_bullets: Optional[list[str]] = None


class ProjectUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    tech_stack: Optional[list[str]] = None
    links: Optional[dict[str, str]] = None
    resume_bullets: Optional[list[str]] = None


class ProjectOut(BaseModel):
    id: int
    name: str
    description: Optional[str]
    tech_stack: Optional[list[str]]
    links: Optional[dict[str, str]]
    resume_bullets: Optional[list[str]]
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}


# ─── Stats ────────────────────────────────────────────────────────────────────

class DomainStat(BaseModel):
    domain_id: int
    domain_name: str
    card_count: int
    done_count: int


class StatsOut(BaseModel):
    total_cards: int
    done_count: int
    percent_done: float
    by_domain: list[DomainStat]
