"""Schemas used by the creator results API."""
from __future__ import annotations

from datetime import datetime
from typing import Any, Optional

from pydantic import BaseModel, Field


class ResultsAnswerRead(BaseModel):
    id: int
    question_id: int
    question_title: Optional[str] = None
    value_text: Optional[str] = None
    value_number: Optional[float] = None
    value_bool: Optional[bool] = None
    chosen_option_ids: list[int] = Field(default_factory=list)
    chosen_options: list[str] = Field(default_factory=list)


class ResultsResponseRead(BaseModel):
    id: int
    form_id: int
    status: str
    started_at: datetime
    submitted_at: Optional[datetime] = None
    answers: list[ResultsAnswerRead] = Field(default_factory=list)


class ResultsListItem(BaseModel):
    id: int
    status: str
    started_at: datetime
    submitted_at: Optional[datetime] = None
    answer_count: int = 0
    answer_preview: Optional[str] = None
    answer_previews: dict[str, str] = Field(default_factory=dict)


class ResultsPage(BaseModel):
    items: list[ResultsListItem] = Field(default_factory=list)
    page: int
    page_size: int
    total: int
    total_pages: int


class QuestionSummary(BaseModel):
    question_id: int
    title: str
    type: str
    answered_count: int = 0
    choices: list[dict[str, Any]] = Field(default_factory=list)
    average: Optional[float] = None
    distribution: dict[str, int] = Field(default_factory=dict)
    minimum: Optional[float] = None
    maximum: Optional[float] = None
    latest_answers: list[str] = Field(default_factory=list)
    skipped_count: int = 0
    yes_count: int = 0
    no_count: int = 0
    percentages: list[dict[str, Any]] = Field(default_factory=list)


class ResultsSummary(BaseModel):
    total_responses: int
    completed_responses: int
    partial_responses: int
    completion_rate: float
    questions: list[QuestionSummary] = Field(default_factory=list)
    average_time_seconds: Optional[float] = None
    responses_per_day: list[dict[str, Any]] = Field(default_factory=list)
