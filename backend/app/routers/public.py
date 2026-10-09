"""Public respondent API – no authentication.

Public POST endpoints enforce a 512 KiB request-body limit and a maximum of
200 answers per submission.  They also use the in-memory, per-process IP
limiter in :mod:`app.middleware.rate_limit` (30 requests per minute by
default); deployments with multiple workers should enforce a shared limit at
the edge or in Redis.
"""
from __future__ import annotations

import json
from typing import Any, Dict

from fastapi import APIRouter, Depends, Request, status
from fastapi.responses import JSONResponse
from sqlalchemy.orm import Session

from app.db import get_db
from app.middleware.rate_limit import public_post_limiter
from app.schemas.public import PublicFormRead, PublicQuestionRead
from app.schemas.response import AnswerRead, ResponseStartRead, ResponseSubmit, ResponseRead
from app.services import response_service
from app.services.exceptions import ConflictError, NotFoundError, ValidationError

router = APIRouter(prefix="/api/public", tags=["public"])

MAX_BODY_BYTES = 512_000
MAX_ANSWERS = 200


def _err(
    status_code: int,
    code: str,
    message: str,
    fields: dict | None = None,
) -> JSONResponse:
    body: Dict[str, Any] = {"error": {"code": code, "message": message}}
    if fields:
        body["error"]["fields"] = fields
    return JSONResponse(status_code=status_code, content=body)


def _client_ip(request: Request) -> str:
    forwarded = request.headers.get("x-forwarded-for")
    if forwarded:
        return forwarded.split(",")[0].strip()
    if request.client:
        return request.client.host
    return "unknown"


def _rate_limit_or_429(request: Request) -> JSONResponse | None:
    allowed, retry_after = public_post_limiter.check(_client_ip(request))
    if not allowed:
        response = _err(
            status.HTTP_429_TOO_MANY_REQUESTS,
            "RATE_LIMITED",
            "Too many requests. Please try again shortly.",
        )
        response.headers["Retry-After"] = str(retry_after)
        return response
    return None


def _question_settings(q) -> dict | None:
    if not q.settings:
        return None
    if isinstance(q.settings, dict):
        return q.settings
    if isinstance(q.settings, str):
        try:
            parsed = json.loads(q.settings)
            return parsed if isinstance(parsed, dict) else None
        except json.JSONDecodeError:
            return None
    return None


def _form_theme(form) -> dict | None:
    if not form.theme:
        return None
    if isinstance(form.theme, dict):
        return form.theme
    try:
        parsed = json.loads(form.theme)
    except (TypeError, json.JSONDecodeError):
        return None
    return parsed if isinstance(parsed, dict) else None


def _form_to_public(form) -> PublicFormRead:
    questions = []
    for q in sorted(form.questions, key=lambda x: x.position):
        questions.append(
            PublicQuestionRead(
                id=q.id,
                position=q.position,
                type=q.type,
                title=q.title,
                description=q.description,
                required=q.required,
                settings=_question_settings(q),
                options=sorted(q.options, key=lambda o: o.position),
                logic_rules=sorted(q.logic_rules, key=lambda rule: rule.id),
            )
        )
    return PublicFormRead(
        public_id=form.public_id,
        title=form.title,
        welcome_title=form.welcome_title,
        welcome_description=form.welcome_description,
        welcome_button_label=form.welcome_button_label,
        thank_you_title=form.thank_you_title,
        thank_you_message=form.thank_you_message,
        theme=_form_theme(form),
        questions=questions,
    )


@router.get("/forms/{public_id}", response_model=PublicFormRead)
def get_public_form(public_id: str, db: Session = Depends(get_db)):
    try:
        form = response_service.get_public_form(db, public_id)
    except NotFoundError as exc:
        return _err(status.HTTP_404_NOT_FOUND, exc.code, exc.message)
    return _form_to_public(form)


@router.post("/forms/{public_id}/responses/start", response_model=ResponseStartRead)
async def start_response(public_id: str, request: Request, db: Session = Depends(get_db)):
    limited = _rate_limit_or_429(request)
    if limited:
        return limited

    content_length = request.headers.get("content-length")
    if content_length and content_length.isdigit() and int(content_length) > MAX_BODY_BYTES:
        return _err(status.HTTP_413_REQUEST_ENTITY_TOO_LARGE, "PAYLOAD_TOO_LARGE", "Request body too large.")

    try:
        response = response_service.start_response(db, public_id)
    except NotFoundError as exc:
        return _err(status.HTTP_404_NOT_FOUND, exc.code, exc.message)
    return ResponseStartRead(
        id=response.token or "",
        form_id=response.form_id,
        status=response.status,
        started_at=response.started_at,
    )


@router.post("/forms/{public_id}/responses", response_model=ResponseRead)
async def submit_response(
    public_id: str,
    payload: ResponseSubmit,
    request: Request,
    db: Session = Depends(get_db),
):
    limited = _rate_limit_or_429(request)
    if limited:
        return limited

    content_length = request.headers.get("content-length")
    if content_length and content_length.isdigit() and int(content_length) > MAX_BODY_BYTES:
        return _err(status.HTTP_413_REQUEST_ENTITY_TOO_LARGE, "PAYLOAD_TOO_LARGE", "Request body too large.")

    if len(payload.answers) > MAX_ANSWERS:
        return _err(
            status.HTTP_422_UNPROCESSABLE_ENTITY,
            "VALIDATION_ERROR",
            "Too many answers in one submission.",
        )

    try:
        response = response_service.submit_response(
            db,
            public_id,
            payload.answers,
            response_id=payload.response_id,
        )
    except NotFoundError as exc:
        return _err(status.HTTP_404_NOT_FOUND, exc.code, exc.message)
    except ConflictError as exc:
        return _err(status.HTTP_409_CONFLICT, exc.code, exc.message)
    except ValidationError as exc:
        return _err(
            status.HTTP_422_UNPROCESSABLE_ENTITY,
            "VALIDATION_ERROR",
            exc.message,
            exc.fields,
        )

    return ResponseRead(
        id=response.id,
        form_id=response.form_id,
        status=response.status,
        started_at=response.started_at,
        submitted_at=response.submitted_at,
        answers=[
            AnswerRead(
                id=answer.id,
                question_id=answer.question_id,
                value_text=answer.value_text,
                value_number=answer.value_number,
                value_bool=answer.value_bool,
                chosen_option_ids=sorted(
                    option.option_id for option in answer.answer_options
                ),
            )
            for answer in response.answers
        ],
    )
