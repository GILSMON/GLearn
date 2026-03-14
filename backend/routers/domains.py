"""
routers/domains.py

Endpoints:
  GET    /domains        → list all domains, each with card_count and done_count
  POST   /domains        → create a new domain
  DELETE /domains/{id}   → delete a domain (cascades to topics/cards/notes)
"""

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy import func

from database import get_db
from models import Domain, Topic, Card
from schemas import DomainCreate, DomainOut

router = APIRouter(prefix="/domains", tags=["domains"])


@router.get("", response_model=list[DomainOut])
def list_domains(db: Session = Depends(get_db)):
    """
    Returns all domains. For each domain we also count total cards
    and how many are marked done, so the frontend can show progress bars.
    """
    domains = db.query(Domain).order_by(Domain.created_at).all()

    result = []
    for domain in domains:
        # Count cards across all topics in this domain
        total = (
            db.query(func.count(Card.id))
            .join(Topic, Card.topic_id == Topic.id)
            .filter(Topic.domain_id == domain.id)
            .scalar()
        )
        done = (
            db.query(func.count(Card.id))
            .join(Topic, Card.topic_id == Topic.id)
            .filter(Topic.domain_id == domain.id, Card.done == True)
            .scalar()
        )
        result.append(DomainOut(
            id=domain.id,
            name=domain.name,
            icon=domain.icon,
            color=domain.color,
            created_at=domain.created_at,
            card_count=total or 0,
            done_count=done or 0,
        ))

    return result


@router.post("", response_model=DomainOut, status_code=201)
def create_domain(payload: DomainCreate, db: Session = Depends(get_db)):
    """Create a new domain. Name must be unique."""
    existing = db.query(Domain).filter(Domain.name == payload.name).first()
    if existing:
        raise HTTPException(status_code=400, detail=f"Domain '{payload.name}' already exists")

    domain = Domain(name=payload.name, icon=payload.icon, color=payload.color)
    db.add(domain)
    db.commit()
    db.refresh(domain)

    return DomainOut(
        id=domain.id,
        name=domain.name,
        icon=domain.icon,
        color=domain.color,
        created_at=domain.created_at,
        card_count=0,
        done_count=0,
    )


@router.delete("/{domain_id}", status_code=204)
def delete_domain(domain_id: int, db: Session = Depends(get_db)):
    """Delete a domain. Cascade deletes all its topics, cards, and notes."""
    domain = db.query(Domain).filter(Domain.id == domain_id).first()
    if not domain:
        raise HTTPException(status_code=404, detail="Domain not found")

    db.delete(domain)
    db.commit()
