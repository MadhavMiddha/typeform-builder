"""Authenticated creator results endpoints."""
from __future__ import annotations

from typing import Literal

from fastapi import APIRouter, Depends, Query, status
from fastapi.responses import JSONResponse, StreamingResponse
from sqlalchemy.orm import Session

from app.db import get_db
from app.dependencies import get_current_user
from app.models.user import User
from app.schemas.results import ResultsPage, ResultsResponseRead, ResultsSummary
from app.services import results_service
from app.services.exceptions import NotFoundError

router = APIRouter(prefix="/api/forms/{form_id}", tags=["results"])


def _not_found(exc: NotFoundError) -> JSONResponse:
    return JSONResponse(
        status_code=status.HTTP_404_NOT_FOUND,
        content={"error": {"code": exc.code, "message": exc.message}},
    )


@router.get("/responses", response_model=ResultsPage)
def list_responses(
    form_id: int, page: int = Query(1, ge=1), page_size: int = Query(25, ge=1, le=100),
    status_filter: Literal["completed", "partial"] | None = Query(None, alias="status"),
    db: Session = Depends(get_db), current_user: User = Depends(get_current_user),
) -> ResultsPage:
    try:
        return results_service.list_responses(db, form_id, current_user.id, page, page_size, status_filter)
    except NotFoundError as exc:
        return _not_found(exc)


@router.get("/summary", response_model=ResultsSummary)
def get_summary(
    form_id: int, db: Session = Depends(get_db), current_user: User = Depends(get_current_user),
) -> ResultsSummary:
    try:
        return results_service.get_summary(db, form_id, current_user.id)
    except NotFoundError as exc:
        return _not_found(exc)


@router.get("/responses/export.csv", response_model=None)
def export_csv(
    form_id: int, db: Session = Depends(get_db), current_user: User = Depends(get_current_user),
) -> StreamingResponse:
    try:
        stream = results_service.export_csv(db, form_id, current_user.id)
        # The service validates ownership before yielding, so an invalid form
        # produces the normal JSON error rather than a late stream failure.
        first = next(stream)
    except NotFoundError as exc:
        return _not_found(exc)

    def chunks():
        yield first
        yield from stream

    return StreamingResponse(
        chunks(), media_type="text/csv",
        headers={"Content-Disposition": f'attachment; filename="form-{form_id}-responses.csv"'},
    )


@router.get("/responses/{response_id}", response_model=ResultsResponseRead)
def get_response(
    form_id: int, response_id: int, db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> ResultsResponseRead:
    try:
        return results_service.get_response(db, form_id, response_id, current_user.id)
    except NotFoundError as exc:
        return _not_found(exc)
