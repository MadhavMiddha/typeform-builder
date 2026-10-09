"""Forms router – thin HTTP layer only.

All business logic lives in app.services.form_service.
Error codes follow the standard shape: {"error": {"code": str, "message": str, "fields": {...}}}.
"""
from __future__ import annotations

import json
from typing import Any, Dict, List, Optional

from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.responses import JSONResponse, Response
from pydantic import BaseModel
from sqlalchemy.orm import Session

from app.db import get_db
from app.dependencies import get_current_user
from app.models.user import User
from app.schemas.form import FormCreate, FormListItem, FormRead, FormUpdate
from app.schemas.question import QuestionCreate, QuestionRead
from app.services import form_service, question_service
from app.services.exceptions import ConflictError, NotFoundError, ValidationError

router = APIRouter(prefix="/api/forms", tags=["forms"])


# ---------------------------------------------------------------------------
# Error helpers
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


def _form_to_list_item(form: Any) -> dict:
    """Convert a Form ORM object (with response_count attribute) to a dict."""
    response_count = getattr(form, "response_count", 0)
    theme = None
    if form.theme:
        try:
            theme = json.loads(form.theme)
        except Exception:
            theme = None
    return {
        "id": form.id,
        "public_id": form.public_id,
        "title": form.title,
        "status": form.status,
        "response_count": response_count,
        "updated_at": form.updated_at.isoformat() if form.updated_at else None,
        "created_at": form.created_at.isoformat() if form.created_at else None,
    }


def _form_to_dict(form: Any) -> dict:
    """Convert a Form ORM with eager-loaded relations to a dict."""
    theme = None
    if form.theme:
        try:
            theme = json.loads(form.theme)
        except Exception:
            theme = None

    questions = []
    for q in sorted(getattr(form, "questions", []), key=lambda x: x.position):
        settings = None
        if q.settings:
            try:
                settings = json.loads(q.settings)
            except Exception:
                settings = None
        questions.append({
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
        })

    return {
        "id": form.id,
        "public_id": form.public_id,
        "user_id": form.user_id,
        "title": form.title,
        "status": form.status,
        "welcome_title": form.welcome_title,
        "welcome_description": form.welcome_description,
        "welcome_button_label": form.welcome_button_label,
        "thank_you_title": form.thank_you_title,
        "thank_you_message": form.thank_you_message,
        "theme": theme,
        "created_at": form.created_at.isoformat() if form.created_at else None,
        "updated_at": form.updated_at.isoformat() if form.updated_at else None,
        "published_at": form.published_at.isoformat() if form.published_at else None,
        "questions": questions,
    }


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
# Form endpoints
# ---------------------------------------------------------------------------

@router.get("", response_class=JSONResponse)
def list_forms(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> JSONResponse:
    """GET /api/forms – list all forms for the current user with response_count."""
    forms = form_service.list_forms(db, current_user.id)
    return JSONResponse(content=[_form_to_list_item(f) for f in forms])


@router.post("", status_code=status.HTTP_201_CREATED, response_class=JSONResponse)
def create_form(
    body: FormCreate = FormCreate(),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> JSONResponse:
    """POST /api/forms – create a new draft form."""
    form = form_service.create_form(db, current_user.id, title=body.title)
    return JSONResponse(status_code=201, content=_form_to_dict(
        form_service.get_form(db, form.id, current_user.id)
    ))


@router.get("/{form_id}", response_class=JSONResponse)
def get_form(
    form_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> JSONResponse:
    """GET /api/forms/{id} – get a single form with questions, options, logic."""
    try:
        form = form_service.get_form(db, form_id, current_user.id)
    except Exception as exc:
        return _handle_service_errors(exc)
    return JSONResponse(content=_form_to_dict(form))


@router.patch("/{form_id}", response_class=JSONResponse)
def update_form(
    form_id: int,
    body: FormUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> JSONResponse:
    """PATCH /api/forms/{id} – partial update (title, welcome/thank-you, theme)."""
    # Only pass fields that were explicitly set in the request body
    set_fields = body.model_fields_set
    kwargs = {}
    if "title" in set_fields and body.title is not None:
        kwargs["title"] = body.title
    if "welcome_title" in set_fields:
        kwargs["welcome_title"] = body.welcome_title
    if "welcome_description" in set_fields:
        kwargs["welcome_description"] = body.welcome_description
    if "welcome_button_label" in set_fields:
        kwargs["welcome_button_label"] = body.welcome_button_label
    if "thank_you_title" in set_fields:
        kwargs["thank_you_title"] = body.thank_you_title
    if "thank_you_message" in set_fields:
        kwargs["thank_you_message"] = body.thank_you_message
    if "theme" in set_fields and body.theme is not None:
        kwargs["theme"] = body.theme

    try:
        form = form_service.update_form(db, form_id, current_user.id, **kwargs)
    except Exception as exc:
        return _handle_service_errors(exc)
    return JSONResponse(content=_form_to_dict(
        form_service.get_form(db, form.id, current_user.id)
    ))


@router.delete("/{form_id}")
def delete_form(
    form_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> Response:
    """DELETE /api/forms/{id} – delete a form and all its children. Returns 204 on success."""
    try:
        form_service.delete_form(db, form_id, current_user.id)
        return Response(status_code=status.HTTP_204_NO_CONTENT)
    except NotFoundError as exc:
        return _err(status.HTTP_404_NOT_FOUND, "NOT_FOUND", exc.message)


@router.post("/{form_id}/duplicate", status_code=status.HTTP_201_CREATED, response_class=JSONResponse)
def duplicate_form(
    form_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> JSONResponse:
    """POST /api/forms/{id}/duplicate – deep-copy a form (no responses)."""
    try:
        form = form_service.duplicate_form(db, form_id, current_user.id)
    except Exception as exc:
        return _handle_service_errors(exc)
    return JSONResponse(status_code=201, content=_form_to_dict(form))


@router.post("/{form_id}/publish", response_class=JSONResponse)
def publish_form(
    form_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> JSONResponse:
    """POST /api/forms/{id}/publish – publish a form (requires ≥1 question)."""
    try:
        form = form_service.publish_form(db, form_id, current_user.id)
    except Exception as exc:
        return _handle_service_errors(exc)
    return JSONResponse(content=_form_to_dict(
        form_service.get_form(db, form.id, current_user.id)
    ))


@router.post("/{form_id}/unpublish", response_class=JSONResponse)
def unpublish_form(
    form_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> JSONResponse:
    """POST /api/forms/{id}/unpublish – set form back to draft."""
    try:
        form = form_service.unpublish_form(db, form_id, current_user.id)
    except Exception as exc:
        return _handle_service_errors(exc)
    return JSONResponse(content=_form_to_dict(
        form_service.get_form(db, form.id, current_user.id)
    ))


# ---------------------------------------------------------------------------
# Question sub-endpoints (under /api/forms/{id}/questions)
# ---------------------------------------------------------------------------

class QuestionCreateBody(BaseModel):
    type: str
    title: Optional[str] = ""
    description: Optional[str] = None
    required: bool = False
    settings: Optional[Dict[str, Any]] = None
    after_id: Optional[int] = None


class ReorderBody(BaseModel):
    ordered_ids: List[int]


@router.post("/{form_id}/questions", status_code=status.HTTP_201_CREATED, response_class=JSONResponse)
def add_question(
    form_id: int,
    body: QuestionCreateBody,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> JSONResponse:
    """POST /api/forms/{id}/questions – add a question to the form."""
    try:
        q = question_service.add_question(
            db,
            form_id,
            current_user.id,
            question_type=body.type,
            title=body.title or "",
            description=body.description,
            required=body.required,
            settings=body.settings,
            after_id=body.after_id,
        )
    except Exception as exc:
        return _handle_service_errors(exc)
    return JSONResponse(status_code=201, content=_question_to_dict(q))


@router.put("/{form_id}/questions/order", response_class=JSONResponse)
def reorder_questions(
    form_id: int,
    body: ReorderBody,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> JSONResponse:
    """PUT /api/forms/{id}/questions/order – reorder all questions."""
    try:
        questions = question_service.reorder_questions(db, form_id, current_user.id, body.ordered_ids)
    except Exception as exc:
        return _handle_service_errors(exc)
    return JSONResponse(content=[_question_to_dict(q) for q in questions])
