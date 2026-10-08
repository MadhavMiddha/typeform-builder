"""FastAPI dependencies shared across routers.

SIMPLIFICATION: get_current_user always returns the seeded default user (id=1,
email=creator@example.com). This is a clearly-marked placeholder for real JWT/session
auth which would be wired in later without touching service or router logic.

See DECISIONS.md for the rationale.
"""
from __future__ import annotations

from fastapi import Depends, HTTPException, status
from sqlalchemy.orm import Session
from sqlalchemy import select

from app.db import get_db
from app.models.user import User


def get_current_user(db: Session = Depends(get_db)) -> User:
    """
    Return the seeded default user.

    ⚠️  SIMPLIFICATION – no real authentication.
    Every form/question query is scoped to this user's id so that replacing
    this function with a real auth lookup requires zero changes to services.
    """
    user = db.execute(
        select(User).where(User.email == "creator@example.com")
    ).scalar_one_or_none()

    if user is None:
        # Seed on first request if not yet seeded (e.g. fresh test DB)
        user = User(email="creator@example.com", name="Default Creator")
        db.add(user)
        db.commit()
        db.refresh(user)

    return user
