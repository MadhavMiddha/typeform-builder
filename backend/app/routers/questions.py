"""Questions router – thin HTTP layer only.

Handles /api/questions/{qid} endpoints.
All business logic lives in app.services.question_service.
"""
from __future__ import annotations

import json
from typing import Any, Dict, List, Optional

from fastapi import APIRouter, Depends, status
from fastapi.responses import JSONResponse, Response
from pydantic import BaseModel
from sqlalchemy.orm import Session

from app.db import get_db
from app.dependencies import get_current_user
from app.models.user import User
from app.services import question_service
from app.services.exceptions import ConflictError, NotFoundError, ValidationError

router = APIRouter(prefix="/api/questions", tags=["questions"])


# ---------------------------------------------------------------------------
# Error helpers (duplicated from forms router to keep each router self-contained)
# ---------------------------------------------------------------------------

def _err(status_code: int, code: str, message: str, fields: dict | None = None) -> JSONResponse:
    body: Dict[str, Any] = {"error": {"code": code, "message": message}}
    if fields:
        body["error"]["fields"] = fields
    return JSONResponse(status_code=status_code, content=body)


def _handle_service_errors(exc: Exception) -> JSONResponse:
    if isinstance(exc, NotFoundError):
        return _err(status.HTTP_404_NOT_FOUND, "NOT_FOUND", exc.message)
    if isinstance(exc, ConflictError):
        return _err(status.HTTP_409_CONFLICT, exc.code, exc.message)
    if isinstance(exc, ValidationError):
        return _err(status.HTTP_422_UNPROCESSABLE_ENTITY, "VALIDATION_ERROR", exc.message, exc.fields)
    raise exc


def _question_to_dict(q: Any) -> dict:
    settings = None
    if q.settings:
        try:
            settings = json.loads(q.settings)
        except Exception:
            settings = None
    return {
        "id": q.id,
        "form_id": q.form_id,
        "position": q.position,
        "type": q.type,
        "title": q.title,
        "description": q.description,
        "required": q.required,
        "settings": settings,
        "created_at": q.created_at.isoformat() if q.created_at else None,
        "updated_at": q.updated_at.isoformat() if q.updated_at else None,
        "options": [
            {"id": o.id, "question_id": o.question_id, "label": o.label, "position": o.position}
            for o in sorted(q.options, key=lambda o: o.position)
        ],
        "logic_rules": [
            {
                "id": r.id,
                "question_id": r.question_id,
                "operator": r.operator,
                "value": r.value,
                "jump_to_question_id": r.jump_to_question_id,
                "jump_to_end": r.jump_to_end,
            }
            for r in q.logic_rules
        ],
    }


# ---------------------------------------------------------------------------
# Request schemas
# ---------------------------------------------------------------------------

class QuestionUpdateBody(BaseModel):
    type: Optional[str] = None
    title: Optional[str] = None
    description: Optional[str] = None
    required: Optional[bool] = None
    settings: Optional[Dict[str, Any]] = None


class OptionsReplaceBody(BaseModel):
    options: List[str]  # list of labels


class LogicRuleBody(BaseModel):
    operator: str
    value: Optional[str] = None
    jump_to_question_id: Optional[int] = None
    jump_to_end: bool = False


class LogicReplaceBody(BaseModel):
    rules: List[LogicRuleBody]


# ---------------------------------------------------------------------------
# Endpoints
# ---------------------------------------------------------------------------

@router.patch("/{question_id}", response_class=JSONResponse)
def update_question(
    question_id: int,
    body: QuestionUpdateBody,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> JSONResponse:
    """PATCH /api/questions/{qid} – partial update (title, description, required, type, settings)."""
    set_fields = body.model_fields_set
    kwargs: Dict[str, Any] = {}
    if "type" in set_fields:
        kwargs["question_type"] = body.type
    if "title" in set_fields:
        kwargs["title"] = body.title
    if "description" in set_fields:
        kwargs["description"] = body.description
    if "required" in set_fields:
        kwargs["required"] = body.required
    if "settings" in set_fields:
        kwargs["settings"] = body.settings

    try:
        q = question_service.update_question(db, question_id, current_user.id, **kwargs)
    except Exception as exc:
        return _handle_service_errors(exc)
    return JSONResponse(content=_question_to_dict(q))


@router.delete("/{question_id}")
def delete_question(
    question_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> Response:
    """DELETE /api/questions/{qid} – delete question and re-compact positions. Returns 204."""
    try:
        question_service.delete_question(db, question_id, current_user.id)
        return Response(status_code=status.HTTP_204_NO_CONTENT)
    except NotFoundError as exc:
        return _err(status.HTTP_404_NOT_FOUND, "NOT_FOUND", exc.message)


@router.put("/{question_id}/options", response_class=JSONResponse)
def replace_options(
    question_id: int,
    body: OptionsReplaceBody,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> JSONResponse:
    """PUT /api/questions/{qid}/options – replace all options (2-20 labels)."""
    try:
        q = question_service.replace_options(db, question_id, current_user.id, body.options)
    except Exception as exc:
        return _handle_service_errors(exc)
    return JSONResponse(content=_question_to_dict(q))


@router.put("/{question_id}/logic", response_class=JSONResponse)
def replace_logic(
    question_id: int,
    body: LogicReplaceBody,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> JSONResponse:
    """PUT /api/questions/{qid}/logic – replace all logic rules."""
    rules_dicts = [r.model_dump() for r in body.rules]
    try:
        q = question_service.replace_logic(db, question_id, current_user.id, rules_dicts)
    except Exception as exc:
        return _handle_service_errors(exc)
    return JSONResponse(content=_question_to_dict(q))
