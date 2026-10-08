# Architecture Decision Log

| Date | Decision | Alternatives considered | Why |
| ---- | -------- | ----------------------- | --- |
| 2026-10-08 | FastAPI over Django | Django REST Framework, Flask | FastAPI gives async-first, auto-generated OpenAPI docs, and Pydantic v2 natively. Much less boilerplate for an API-only backend. |
| 2026-10-08 | SQLite typed answer columns (value_text, value_number, value_bool) | Single JSON blob column | Typed columns allow GROUP BY / aggregate queries (avg rating, min/max number) without JSON parsing; better for the Results summary endpoint. |
| 2026-10-08 | answer_options join table | Storing chosen option ids as JSON in answers.value_text | Join table makes per-option response counts a simple `GROUP BY option_id` query instead of string parsing; normalized. |
| 2026-10-08 | JSON for settings and theme | Separate typed columns per field | question.settings fields differ per type (rating_max, number_min/max, allow_multiple). A JSON column avoids a sparse wide table and these fields are never queried in WHERE clauses. |
| 2026-10-08 | nanoid 10-char public_id on forms | UUID, sequential id | Hides internal DB ids from public URLs, hard to enumerate, short enough for shareable links. |
| 2026-10-08 | Service-layer architecture (routers thin, services hold logic) | Fat controllers / Active Record | Separation of HTTP concerns from business logic makes unit testing, reuse, and future auth changes easier. Routers become testable independently from service functions. |
