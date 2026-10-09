"""Public respondent-facing form schemas (no creator-only fields)."""
from __future__ import annotations

from typing import Any, Dict, List, Optional

from pydantic import BaseModel

from app.schemas.question import QuestionLogicRead, QuestionOptionRead


class PublicQuestionRead(BaseModel):
    id: int
    position: int
    type: str
    title: str
    description: Optional[str] = None
    required: bool
    settings: Optional[Dict[str, Any]] = None
    options: List[QuestionOptionRead] = []
    logic_rules: List[QuestionLogicRead] = []

    model_config = {"from_attributes": True}


class PublicFormRead(BaseModel):
    public_id: str
    title: str
    welcome_title: Optional[str] = None
    welcome_description: Optional[str] = None
    welcome_button_label: Optional[str] = None
    thank_you_title: Optional[str] = None
    thank_you_message: Optional[str] = None
    theme: Optional[Dict[str, Any]] = None
    questions: List[PublicQuestionRead] = []
