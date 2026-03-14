"""
routers/cards.py

Endpoints:
  GET    /cards?topic_id={id}     → list cards for a topic
  GET    /cards/search?q={query}  → full-text search across JSONB content
  POST   /cards                   → create a new card
  PATCH  /cards/{id}              → update card content or mark done/undone
  DELETE /cards/{id}              → delete a card
"""

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from sqlalchemy import cast, String

from database import get_db
from models import Card, Topic
from schemas import CardCreate, CardUpdate, CardOut

router = APIRouter(prefix="/cards", tags=["cards"])


@router.get("/search", response_model=list[CardOut])
def search_cards(q: str = Query(..., min_length=1), db: Session = Depends(get_db)):
    """
    Search all cards by casting JSONB content to text and doing a case-insensitive match.
    This is simple and effective for personal use — no need for full-text indexes.
    """
    results = (
        db.query(Card)
        .filter(cast(Card.content, String).ilike(f"%{q}%"))
        .order_by(Card.created_at.desc())
        .all()
    )
    return results


@router.get("", response_model=list[CardOut])
def list_cards(topic_id: int = Query(...), db: Session = Depends(get_db)):
    """List all cards for a given topic. Done cards are included (frontend sorts them)."""
    topic = db.query(Topic).filter(Topic.id == topic_id).first()
    if not topic:
        raise HTTPException(status_code=404, detail="Topic not found")

    cards = (
        db.query(Card)
        .filter(Card.topic_id == topic_id)
        .order_by(Card.done, Card.created_at)  # undone first, then done
        .all()
    )
    return cards


@router.post("", response_model=CardOut, status_code=201)
def create_card(payload: CardCreate, db: Session = Depends(get_db)):
    """
    Create a card. The content field is flexible JSONB — pass any of:
      {"type": "qa", "question": "...", "answer": "...", "tags": [], "difficulty": "easy"}
      {"type": "concept", "title": "...", "explanation": "...", "tags": [], "difficulty": "medium"}
      {"type": "code_snippet", "title": "...", "code": "...", "explanation": "...", "tags": [], "difficulty": "hard"}
    """
    topic = db.query(Topic).filter(Topic.id == payload.topic_id).first()
    if not topic:
        raise HTTPException(status_code=404, detail="Topic not found")

    card = Card(topic_id=payload.topic_id, content=payload.content)
    db.add(card)
    db.commit()
    db.refresh(card)
    return card


@router.patch("/{card_id}", response_model=CardOut)
def update_card(card_id: int, payload: CardUpdate, db: Session = Depends(get_db)):
    """
    Partially update a card. Common uses:
      - Mark done: PATCH /cards/5  body: {"done": true}
      - Edit content: PATCH /cards/5  body: {"content": {...}}
    """
    card = db.query(Card).filter(Card.id == card_id).first()
    if not card:
        raise HTTPException(status_code=404, detail="Card not found")

    if payload.content is not None:
        card.content = payload.content
    if payload.done is not None:
        card.done = payload.done

    db.commit()
    db.refresh(card)
    return card


@router.delete("/{card_id}", status_code=204)
def delete_card(card_id: int, db: Session = Depends(get_db)):
    card = db.query(Card).filter(Card.id == card_id).first()
    if not card:
        raise HTTPException(status_code=404, detail="Card not found")

    db.delete(card)
    db.commit()
