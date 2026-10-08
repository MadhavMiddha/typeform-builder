"""AnswerOption join table – stores which options were chosen for an answer."""
from __future__ import annotations

from typing import TYPE_CHECKING

from sqlalchemy import ForeignKey
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db import Base

if TYPE_CHECKING:
    from app.models.answer import Answer
    from app.models.question_option import QuestionOption


class AnswerOption(Base):
    __tablename__ = "answer_options"

    answer_id: Mapped[int] = mapped_column(
        ForeignKey("answers.id", ondelete="CASCADE"), primary_key=True
    )
    option_id: Mapped[int] = mapped_column(
        ForeignKey("question_options.id", ondelete="CASCADE"), primary_key=True
    )

    # Relationships
    answer: Mapped["Answer"] = relationship("Answer", back_populates="answer_options")
    option: Mapped["QuestionOption"] = relationship(
        "QuestionOption", back_populates="answer_options"
    )
