"""Form model."""
from __future__ import annotations

from datetime import datetime
from typing import TYPE_CHECKING, List, Optional

from sqlalchemy import (
    CheckConstraint,
    DateTime,
    ForeignKey,
    String,
    Text,
    func,
)
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db import Base

if TYPE_CHECKING:
    from app.models.question import Question
    from app.models.response import Response
    from app.models.user import User


class Form(Base):
    __tablename__ = "forms"
    __table_args__ = (
        CheckConstraint(
            "status IN ('draft', 'published')", name="ck_forms_status"
        ),
    )

    id: Mapped[int] = mapped_column(primary_key=True)
    user_id: Mapped[int] = mapped_column(
        ForeignKey("users.id", ondelete="CASCADE"), nullable=False
    )
    public_id: Mapped[str] = mapped_column(String(10), unique=True, nullable=False)
    title: Mapped[str] = mapped_column(String(255), nullable=False, default="Untitled form")
    status: Mapped[str] = mapped_column(String(20), nullable=False, default="draft")
    welcome_title: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)
    welcome_description: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    welcome_button_label: Mapped[Optional[str]] = mapped_column(String(100), nullable=True)
    thank_you_title: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)
    thank_you_message: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    theme: Mapped[Optional[str]] = mapped_column(Text, nullable=True)  # JSON string
    created_at: Mapped[datetime] = mapped_column(
        DateTime, default=func.now(), server_default=func.now()
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime,
        default=func.now(),
        server_default=func.now(),
        onupdate=func.now(),
    )
    published_at: Mapped[Optional[datetime]] = mapped_column(DateTime, nullable=True)

    # Relationships
    user: Mapped["User"] = relationship("User", back_populates="forms")
    questions: Mapped[List["Question"]] = relationship(
        "Question",
        back_populates="form",
        cascade="all, delete-orphan",
        order_by="Question.position",
    )
    responses: Mapped[List["Response"]] = relationship(
        "Response", back_populates="form", cascade="all, delete-orphan"
    )
