"""Response model."""
from __future__ import annotations

from datetime import datetime
from typing import TYPE_CHECKING, List, Optional

from sqlalchemy import CheckConstraint, DateTime, ForeignKey, Index, String, func
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db import Base

if TYPE_CHECKING:
    from app.models.answer import Answer
    from app.models.form import Form


class Response(Base):
    __tablename__ = "responses"
    __table_args__ = (
        CheckConstraint(
            "status IN ('partial', 'completed')", name="ck_responses_status"
        ),
        Index("ix_responses_form_submitted_at", "form_id", "submitted_at"),
    )

    id: Mapped[int] = mapped_column(primary_key=True)
    token: Mapped[Optional[str]] = mapped_column(String(64), unique=True, nullable=True)
    form_id: Mapped[int] = mapped_column(
        ForeignKey("forms.id", ondelete="CASCADE"), nullable=False
    )
    status: Mapped[str] = mapped_column(nullable=False, default="partial")
    started_at: Mapped[datetime] = mapped_column(
        DateTime, default=func.now(), server_default=func.now()
    )
    submitted_at: Mapped[Optional[datetime]] = mapped_column(DateTime, nullable=True)

    # Relationships
    form: Mapped["Form"] = relationship("Form", back_populates="responses")
    answers: Mapped[List["Answer"]] = relationship(
        "Answer", back_populates="response", cascade="all, delete-orphan"
    )
