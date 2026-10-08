"""Form schemas."""
from __future__ import annotations

from datetime import datetime
from typing import Any, Dict, List, Optional

from pydantic import BaseModel

from app.schemas.question import QuestionRead


class FormCreate(BaseModel):
    title: str = "Untitled form"
    welcome_title: Optional[str] = None
    welcome_description: Optional[str] = None
    welcome_button_label: Optional[str] = None
    thank_you_title: Optional[str] = None
    thank_you_message: Optional[str] = None
    theme: Optional[Dict[str, Any]] = None


class FormUpdate(BaseModel):
    title: Optional[str] = None
    status: Optional[str] = None
    welcome_title: Optional[str] = None
    welcome_description: Optional[str] = None
    welcome_button_label: Optional[str] = None
    thank_you_title: Optional[str] = None
    thank_you_message: Optional[str] = None
    theme: Optional[Dict[str, Any]] = None


class FormListItem(BaseModel):
    id: int
    public_id: str
    title: str
    status: str
    response_count: int = 0
    updated_at: datetime
    created_at: datetime

    model_config = {"from_attributes": True}


class FormRead(BaseModel):
    id: int
    public_id: str
    user_id: int
    title: str
    status: str
    welcome_title: Optional[str] = None
    welcome_description: Optional[str] = None
    welcome_button_label: Optional[str] = None
    thank_you_title: Optional[str] = None
    thank_you_message: Optional[str] = None
    theme: Optional[Dict[str, Any]] = None
    created_at: datetime
    updated_at: datetime
    published_at: Optional[datetime] = None
    questions: List[QuestionRead] = []

    model_config = {"from_attributes": True}
