"""Answer model."""
from __future__ import annotations

from typing import TYPE_CHECKING, List, Optional

from sqlalchemy import Float, ForeignKey, Index, Integer, String, UniqueConstraint
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db import Base

if TYPE_CHECKING:
    from app.models.answer_option import AnswerOption
    from app.models.question import Question
    from app.models.response import Response


class Answer(Base):
    __tablename__ = "answers"
    __table_args__ = (
        UniqueConstraint("response_id", "question_id", name="uq_answers_response_question"),
        Index("ix_answers_question_id", "question_id"),
    )

    id: Mapped[int] = mapped_column(primary_key=True)
    response_id: Mapped[int] = mapped_column(
        ForeignKey("responses.id", ondelete="CASCADE"), nullable=False
    )
    question_id: Mapped[int] = mapped_column(
        ForeignKey("questions.id", ondelete="CASCADE"), nullable=False
    )
    value_text: Mapped[Optional[str]] = mapped_column(String(5000), nullable=True)
    value_number: Mapped[Optional[float]] = mapped_column(Float, nullable=True)
    value_bool: Mapped[Optional[bool]] = mapped_column(nullable=True)

    # Relationships
    response: Mapped["Response"] = relationship("Response", back_populates="answers")
    question: Mapped["Question"] = relationship("Question")
    answer_options: Mapped[List["AnswerOption"]] = relationship(
        "AnswerOption", back_populates="answer", cascade="all, delete-orphan"
    )
