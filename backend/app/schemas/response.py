"""Response and Answer schemas."""
from __future__ import annotations

from datetime import datetime
from typing import Any, Dict, List, Optional

from pydantic import BaseModel


class AnswerOptionRead(BaseModel):
    option_id: int

    model_config = {"from_attributes": True}


class AnswerCreate(BaseModel):
    question_id: int
    value: Optional[Any] = None  # raw value; validator normalises it


class AnswerRead(BaseModel):
    id: int
    question_id: int
    value_text: Optional[str] = None
    value_number: Optional[float] = None
    value_bool: Optional[bool] = None
    chosen_option_ids: List[int] = []

    model_config = {"from_attributes": True}


class ResponseStartRead(BaseModel):
    id: int
    form_id: int
    status: str
    started_at: datetime

    model_config = {"from_attributes": True}


class ResponseSubmit(BaseModel):
    answers: List[AnswerCreate]


class ResponseRead(BaseModel):
    id: int
    form_id: int
    status: str
    started_at: datetime
    submitted_at: Optional[datetime] = None
    answers: List[AnswerRead] = []

    model_config = {"from_attributes": True}


class ResponseListItem(BaseModel):
    id: int
    status: str
    started_at: datetime
    submitted_at: Optional[datetime] = None
    answer_count: int = 0

    model_config = {"from_attributes": True}
