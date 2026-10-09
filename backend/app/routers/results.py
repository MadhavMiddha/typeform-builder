"""Authenticated creator results endpoints."""
from __future__ import annotations

import re
from datetime import datetime
from typing import Literal

from fastapi import APIRouter, Depends, Query, status
from fastapi.responses import JSONResponse, Response, StreamingResponse
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


def _slug(title: str) -> str:
    slug = re.sub(r"[^a-z0-9]+", "-", title.lower()).strip("-")
    return slug or "form"


@router.get("/responses", response_model=ResultsPage)
def list_responses(
    form_id: int,
    page: int = Query(1, ge=1),
    page_size: int = Query(25, ge=1, le=100),
    status_filter: Literal["completed", "partial"] | None = Query(None, alias="status"),
    q: str | None = Query(None),
    from_date: datetime | None = Query(None, alias="from"),
    to_date: datetime | None = Query(None, alias="to"),
    sort: Literal["asc", "desc"] | None = Query(None),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> ResultsPage:
    try:
        return results_service.list_responses(
            db, form_id, current_user.id,
            page=page, page_size=page_size, status=status_filter,
            q=q, from_date=from_date, to_date=to_date, sort=sort,
        )
    except NotFoundError as exc:
        return _not_found(exc)


@router.get("/summary", response_model=ResultsSummary)
@router.get("/stats", response_model=ResultsSummary)
def get_summary(
    form_id: int,
    days: int = Query(14, ge=1, le=90),
    from_date: datetime | None = Query(None, alias="from"),
    to_date: datetime | None = Query(None, alias="to"),
    status: Literal["completed", "partial"] | None = Query(None),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> ResultsSummary:
    try:
        return results_service.get_summary(
            db, form_id, current_user.id, days=days, from_date=from_date, to_date=to_date, status=status
        )
    except NotFoundError as exc:
        return _not_found(exc)


@router.get("/responses/export.csv", response_model=None)
def export_csv_legacy(
    form_id: int, db: Session = Depends(get_db), current_user: User = Depends(get_current_user),
) -> StreamingResponse:
    """Legacy export.csv endpoint — delegates to the new export endpoint."""
    return _do_export(form_id, "csv", None, None, None, None, None, db, current_user)


@router.get("/responses/export", response_model=None)
def export_responses(
    form_id: int,
    fmt: Literal["csv", "xlsx"] = Query("csv", alias="format"),
    ids_raw: str | None = Query(None, alias="ids"),
    status_filter: Literal["completed", "partial"] | None = Query(None, alias="status"),
    from_date: datetime | None = Query(None, alias="from"),
    to_date: datetime | None = Query(None, alias="to"),
    q: str | None = Query(None),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> StreamingResponse | JSONResponse:
    """Export responses as CSV or XLSX, with optional id/status/date/q filters."""
    ids: list[int] | None = None
    if ids_raw:
        try:
            ids = [int(x.strip()) for x in ids_raw.split(",") if x.strip()]
        except ValueError:
            return JSONResponse(
                status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                content={"error": {"code": "invalid_ids", "message": "ids must be comma-separated integers"}},
            )
    return _do_export(form_id, fmt, ids, status_filter, from_date, to_date, q, db, current_user)


def _do_export(
    form_id: int,
    fmt: str,
    ids: list[int] | None,
    status_filter: str | None,
    from_date: datetime | None,
    to_date: datetime | None,
    q: str | None,
    db: Session,
    current_user: User,
) -> StreamingResponse | JSONResponse:
    from app.models.form import Form
    from sqlalchemy import select
    try:
        form_row = db.execute(select(Form).where(Form.id == form_id, Form.user_id == current_user.id)).scalar_one_or_none()
        if form_row is None:
            raise NotFoundError(f"Form {form_id} not found.")
        title_slug = _slug(form_row.title)
        date_str = datetime.utcnow().strftime("%Y-%m-%d")
        if fmt == "xlsx":
            data = results_service.export_xlsx(
                db, form_id, current_user.id,
                ids=ids, status=status_filter, from_date=from_date, to_date=to_date, q=q,
            )
            filename = f"{title_slug}-responses-{date_str}.xlsx"
            return Response(
                content=data,
                media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
                headers={"Content-Disposition": f'attachment; filename="{filename}"'},
            )
        # CSV (default)
        stream = results_service.export_csv(
            db, form_id, current_user.id,
            ids=ids, status=status_filter, from_date=from_date, to_date=to_date, q=q,
        )
        try:
            first = next(stream)
        except StopIteration:
            first = ""

        def chunks():
            yield first
            yield from stream

        filename = f"{title_slug}-responses-{date_str}.csv"
        return StreamingResponse(
            chunks(), media_type="text/csv; charset=utf-8",
            headers={"Content-Disposition": f'attachment; filename="{filename}"'},
        )
    except NotFoundError as exc:
        return _not_found(exc)


@router.get("/responses/{response_id}", response_model=ResultsResponseRead)
def get_response(
    form_id: int, response_id: int, db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> ResultsResponseRead:
    try:
        return results_service.get_response(db, form_id, response_id, current_user.id)
    except NotFoundError as exc:
        return _not_found(exc)


@router.delete("/responses/{response_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_response(
    form_id: int, response_id: int, db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    try:
        results_service.delete_response(db, form_id, response_id, current_user.id)
        return Response(status_code=status.HTTP_204_NO_CONTENT)
    except NotFoundError as exc:
        return _not_found(exc)
