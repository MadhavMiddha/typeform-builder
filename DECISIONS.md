# Architecture Decision Log

| Date | Decision | Alternatives considered | Why |
| ---- | -------- | ----------------------- | --- |
| 2026-10-08 | FastAPI over Django | Django REST Framework, Flask | FastAPI gives async-first, auto-generated OpenAPI docs, and Pydantic v2 natively. Much less boilerplate for an API-only backend. |
| 2026-10-08 | SQLite typed answer columns (value_text, value_number, value_bool) | Single JSON blob column | Typed columns allow GROUP BY / aggregate queries (avg rating, min/max number) without JSON parsing; better for the Results summary endpoint. |
| 2026-10-08 | answer_options join table | Storing chosen option ids as JSON in answers.value_text | Join table makes per-option response counts a simple `GROUP BY option_id` query instead of string parsing; normalized. |
| 2026-10-08 | JSON for settings and theme | Separate typed columns per field | question.settings fields differ per type (rating_max, number_min/max, allow_multiple). A JSON column avoids a sparse wide table and these fields are never queried in WHERE clauses. |
| 2026-10-08 | nanoid 10-char public_id on forms | UUID, sequential id | Hides internal DB ids from public URLs, hard to enumerate, short enough for shareable links. |
| 2026-10-08 | Service-layer architecture (routers thin, services hold logic) | Fat controllers / Active Record | Separation of HTTP concerns from business logic makes unit testing, reuse, and future auth changes easier. Routers become testable independently from service functions. |
| 2026-10-09 | Form response_count via single aggregate subquery | N+1 queries when loading dashboard | Outerjoin with func.count() avoids N+1 queries for the dashboard list endpoint. |
| 2026-10-09 | model_fields_set for partial PATCH | Setting fields to None by default | Explicitly tracking fields_set ensures missing fields don't overwrite existing db fields with nulls. |
| 2026-10-09 | Optimistic UI updates with TanStack Query | Waiting for API response | onMutate updates the local cache before network roundtrips complete for renaming, deleting, and publishing forms, reducing perceived latency. |
| 2026-10-09 | Returning Response directly for 204 | Using status_code=204 decorator + JSONResponse | Newer FastAPI strict validation throws AssertionErrors if body is theoretically possible for 204. Returning `Response(status_code=204)` fixes this while retaining standard 404 bodies. |
