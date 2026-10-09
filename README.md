# Typeform Builder

A full-featured Typeform clone: create forms, collect responses, view analytics.

## Stack
- **Backend**: Python 3.11+, FastAPI, SQLAlchemy 2.0, Pydantic v2, SQLite, pytest
- **Frontend**: Next.js 14+ App Router, TypeScript (strict), Tailwind CSS, TanStack Query, Framer Motion, dnd-kit, Radix UI, sonner, lucide-react

## Architecture

```
typeform-builder/
├── backend/
│   ├── app/
│   │   ├── main.py          # FastAPI app, CORS, exception handlers
│   │   ├── config.py        # pydantic-settings (DATABASE_URL, CORS, etc.)
│   │   ├── db.py            # SQLAlchemy engine, session, Base, get_db
│   │   ├── models/          # ORM models (User, Form, Question, Response, Answer…)
│   │   ├── schemas/         # Pydantic v2 request/response schemas
│   │   ├── routers/         # Thin HTTP-only route handlers (Phase 2+)
│   │   ├── services/        # Business logic layer (Phase 2+)
│   │   └── validators/      # Pure answer validation functions (no DB)
│   ├── scripts/seed.py      # Idempotent seed (3 forms, 37 responses)
│   ├── tests/               # pytest suite (54 test cases)
│   ├── requirements.txt
│   └── pytest.ini
├── frontend/
│   └── src/
│       ├── app/             # Next.js App Router pages
│       ├── components/      # ui/, builder/, dashboard/, player/, results/
│       ├── lib/             # api.ts, types.ts, tokens.ts
│       └── hooks/
└── reference/               # UI screenshots for design reference
```

## Database Schema
See `PROJECT_SPEC.md` §3 for the full schema.  Key tables:
`users → forms → questions → question_options`
`forms → responses → answers → answer_options`

## Running locally

### Backend

```bash
cd backend
pip install -r requirements.txt
python -m scripts.seed       # seed once
uvicorn app.main:app --reload --port 8000
```

API docs: http://localhost:8000/api/docs

### Frontend

```bash
cd frontend
npm install
cp .env.example .env.local
npm run dev
```

App: http://localhost:3000

### Tests

```bash
cd backend
python -m pytest
```

## API Overview
All endpoints under `/api`. Error shape: `{"error":{"code":str,"message":str,"fields":{...}}}`.

| Method | Path | Description |
|--------|------|-------------|
| GET | /api/health | Health check |
| GET | /api/forms | List creator forms |
| POST | /api/forms | Create form |
| GET | /api/forms/{id} | Get form with questions |
| PATCH | /api/forms/{id} | Update form |
| DELETE | /api/forms/{id} | Delete form |
| POST | /api/forms/{id}/publish | Publish form |
| GET | /public/forms/{public_id} | Public form (published only) |
| POST | /public/forms/{public_id}/responses/start | Start response |
| POST | /public/forms/{public_id}/responses | Submit response |

Public response continuation IDs are opaque, single-response tokens; the
database response primary key is never accepted as authorization for submit.

## Assumptions
- No real authentication; default user seeded as id=1.
- SQLite for development; schema is portable to PostgreSQL with minor changes.
- Published form edits go live immediately (Typeform requires "Publish edits" – listed as a deviation).
