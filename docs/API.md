# API reference

The API is JSON under `/api`. Creator routes use the seeded default creator (there
is no real authentication). Public routes do not require authentication.

## Common response and errors

Errors use this shape:

```json
{"error":{"code":"VALIDATION_ERROR","message":"Answer validation failed.","fields":{"12":"This field is required."}}}
```

## Create a form

```http
POST /api/forms
Content-Type: application/json
```

```json
{"title":"Customer interview"}
```

Returns `201` with the form, including its numeric `id` and 10-character
`public_id`.

## Add a question

```http
POST /api/forms/1/questions
Content-Type: application/json
```

```json
{"type":"multiple_choice","title":"Which plan do you use?","required":true}
```

## Publish

```http
POST /api/forms/1/publish
```

Returns the updated form with `status: "published"` and `published_at`.

## Fetch a public form

```http
GET /api/public/forms/feedback001
```

Draft forms return the standard `NOT_FOUND` error. Published forms return the
welcome screen, questions, options, logic rules, theme, and thank-you screen.

## Submit a response

```http
POST /api/public/forms/feedback001/responses
Content-Type: application/json
```

```json
{
  "answers": [
    {"question_id": 1, "value": "Ada Lovelace"},
    {"question_id": 2, "value": "ada@example.com"},
    {"question_id": 3, "value": 5}
  ]
}
```

The server is authoritative for required fields, question ownership, option
ownership, type limits, logic jumps, and duplicate continuation tokens.

## Summary

```http
GET /api/forms/1/summary?days=14&status=completed
```

Returns totals, completion rate, abandoned responses, daily counts, and typed
per-question statistics.

## Export

```http
GET /api/forms/1/responses/export?format=csv&status=completed
GET /api/forms/1/responses/export?format=xlsx&ids=1,2
```

The legacy `GET /api/forms/{id}/responses/export.csv` route remains available.
CSV responses are UTF-8 with a BOM and formula-safe cells; XLSX responses have
a frozen header row and sized columns.

## Route overview

| Method | Path | Purpose | Auth |
|---|---|---|---|
| GET | `/api/health` | Health check | None |
| GET/POST | `/api/forms` | List or create forms | Default creator |
| GET/PATCH/DELETE | `/api/forms/{id}` | Read, edit, or delete a form | Default creator |
| GET | `/api/forms/{id}/preview` | Preview a form before publish | Default creator |
| POST | `/api/forms/{id}/duplicate` | Duplicate a form | Default creator |
| POST | `/api/forms/{id}/publish` | Publish a form | Default creator |
| POST | `/api/forms/{id}/unpublish` | Unpublish a form | Default creator |
| POST | `/api/forms/{id}/questions` | Add a question | Default creator |
| PUT | `/api/forms/{id}/questions/order` | Reorder questions | Default creator |
| PATCH/DELETE | `/api/questions/{id}` | Edit or delete a question | Default creator |
| PUT | `/api/questions/{id}/options` | Replace question options | Default creator |
| PUT | `/api/questions/{id}/logic` | Replace logic rules | Default creator |
| GET | `/api/forms/{id}/responses` | Paginated response list | Default creator |
| GET | `/api/forms/{id}/responses/{rid}` | Response detail | Default creator |
| DELETE | `/api/forms/{id}/responses/{rid}` | Delete a response | Default creator |
| GET | `/api/forms/{id}/summary` | Results summary | Default creator |
| GET | `/api/forms/{id}/stats` | Summary-compatible alias | Default creator |
| GET | `/api/forms/{id}/responses/export.csv` | Legacy CSV export | Default creator |
| GET | `/api/forms/{id}/responses/export` | CSV/XLSX export | Default creator |
| GET | `/api/public/forms/{public_id}` | Fetch published form | None |
| POST | `/api/public/forms/{public_id}/responses/start` | Start partial response | None |
| POST | `/api/public/forms/{public_id}/responses` | Submit response | None |
