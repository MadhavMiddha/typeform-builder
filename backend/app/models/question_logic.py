"""QuestionLogic model (for conditional jump logic, used in bonus phase)."""
from __future__ import annotations

from typing import TYPE_CHECKING, Optional

from sqlalchemy import Boolean, CheckConstraint, ForeignKey, String
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db import Base

if TYPE_CHECKING:
    from app.models.question import Question


class QuestionLogic(Base):
    __tablename__ = "question_logic"
    __table_args__ = (
        CheckConstraint(
            "operator IN ('equals','not_equals','contains','greater_than','less_than')",
            name="ck_question_logic_operator",
        ),
    )

    id: Mapped[int] = mapped_column(primary_key=True)
    question_id: Mapped[int] = mapped_column(
        ForeignKey("questions.id", ondelete="CASCADE"), nullable=False
    )
    operator: Mapped[str] = mapped_column(String(20), nullable=False)
    value: Mapped[Optional[str]] = mapped_column(String(500), nullable=True)
    jump_to_question_id: Mapped[Optional[int]] = mapped_column(
        ForeignKey("questions.id", ondelete="SET NULL"), nullable=True
    )
    jump_to_end: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False)

    # Relationships
    question: Mapped["Question"] = relationship(
        "Question",
        foreign_keys=[question_id],
        back_populates="logic_rules",
    )
    jump_to_question: Mapped[Optional["Question"]] = relationship(
        "Question", foreign_keys=[jump_to_question_id]
    )
