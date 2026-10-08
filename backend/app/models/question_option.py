"""QuestionOption model."""
from __future__ import annotations

from typing import TYPE_CHECKING, List

from sqlalchemy import ForeignKey, Index, Integer, String
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db import Base

if TYPE_CHECKING:
    from app.models.question import Question
    from app.models.answer_option import AnswerOption


class QuestionOption(Base):
    __tablename__ = "question_options"
    __table_args__ = (
        Index("ix_question_options_question_position", "question_id", "position"),
    )

    id: Mapped[int] = mapped_column(primary_key=True)
    question_id: Mapped[int] = mapped_column(
        ForeignKey("questions.id", ondelete="CASCADE"), nullable=False
    )
    label: Mapped[str] = mapped_column(String(500), nullable=False)
    position: Mapped[int] = mapped_column(Integer, nullable=False)

    # Relationships
    question: Mapped["Question"] = relationship("Question", back_populates="options")
    answer_options: Mapped[List["AnswerOption"]] = relationship(
        "AnswerOption", back_populates="option", cascade="all, delete-orphan"
    )
