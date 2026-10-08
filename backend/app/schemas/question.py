"""Question and related schemas."""
from __future__ import annotations

from datetime import datetime
from typing import Any, Dict, List, Optional

from pydantic import BaseModel


class QuestionOptionCreate(BaseModel):
    label: str
    position: int


class QuestionOptionRead(BaseModel):
    id: int
    question_id: int
    label: str
    position: int

    model_config = {"from_attributes": True}


class QuestionLogicCreate(BaseModel):
    operator: str
    value: Optional[str] = None
    jump_to_question_id: Optional[int] = None
    jump_to_end: bool = False


class QuestionLogicRead(BaseModel):
    id: int
    question_id: int
    operator: str
    value: Optional[str] = None
    jump_to_question_id: Optional[int] = None
    jump_to_end: bool

    model_config = {"from_attributes": True}


class QuestionCreate(BaseModel):
    type: str
    title: str = ""
    description: Optional[str] = None
    required: bool = False
    settings: Optional[Dict[str, Any]] = None
    position: Optional[int] = None


class QuestionUpdate(BaseModel):
    type: Optional[str] = None
    title: Optional[str] = None
    description: Optional[str] = None
    required: Optional[bool] = None
    settings: Optional[Dict[str, Any]] = None
    position: Optional[int] = None


class QuestionRead(BaseModel):
    id: int
    form_id: int
    position: int
    type: str
    title: str
    description: Optional[str] = None
    required: bool
    settings: Optional[Dict[str, Any]] = None
    created_at: datetime
    updated_at: datetime
    options: List[QuestionOptionRead] = []
    logic_rules: List[QuestionLogicRead] = []

    model_config = {"from_attributes": True}
