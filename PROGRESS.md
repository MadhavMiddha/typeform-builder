# Project Progress

## Phases Checklist
- [x] Phase 1: Project Setup, Database Schema & Models
- [x] Phase 2: Backend Core API & Form/Question Management
- [ ] Phase 3: Response Handling, Server Validation & Seed Data
- [ ] Phase 4: Frontend Foundation, Design Tokens & API Client
- [ ] Phase 5: Creator Dashboard & Form Lifecycle Management
- [ ] Phase 6: Form Builder (Canvas, Settings, Drag & Drop, Autosave)
- [ ] Phase 7: Respondent Experience (/f/[publicId], Keyboard Nav, Animations)
- [ ] Phase 8: Results View (Summary, Responses Table, Drawer, CSV Export) & Polish

## Deviations from spec
- Edits to a published form go live immediately through autosave; real Typeform requires clicking Publish edits. Simplified on purpose.

## Known issues

## Phase 1 – Completion table

| Item | File(s) | Status |
|------|---------|--------|
| 1 – Folder structure + __init__.py | backend/app/, models/, schemas/, routers/, services/, validators/, scripts/, tests/ | ✅ Done |
| 2 – config.py + .env.example | backend/app/config.py, backend/.env.example | ✅ Done |
| 3 – db.py (engine, session, Base, PRAGMA, get_db) | backend/app/db.py | ✅ Done |
| 4 – Models (User/Form/Question/Option/Logic/Response/Answer/AnswerOption) | backend/app/models/*.py | ✅ Done |
| 5 – Schemas (form/question/option/logic/response/answer + error shape) | backend/app/schemas/*.py | ✅ Done |
| 6 – answer_validators.py + dispatch validate_answer() | backend/app/validators/answer_validators.py | ✅ Done |
| 7 – main.py (CORS, handlers, GET /api/health, table creation) | backend/app/main.py | ✅ Done |
| 8 – seed.py (idempotent, 3 forms, all 8 types, 25+12 responses, 14d spread) | backend/scripts/seed.py | ✅ Done |
| 9 – requirements.txt, pytest.ini, tests/test_validators.py (54 cases) | backend/requirements.txt, pytest.ini, tests/ | ✅ Done |
| 10 – Next.js scaffold (App Router, TS strict, Tailwind, src dir) + libs | frontend/ | ✅ Done |
| 11 – Design tokens + Tailwind theme + Inter/Karla fonts | frontend/src/lib/tokens.ts, tailwind.config.ts | ✅ Done |
| 12 – api.ts, types.ts, QueryClientProvider, Toaster | frontend/src/lib/api.ts, types.ts, app/layout.tsx | ✅ Done |
| 13 – Home page (/api/health wiring) + .env.example | frontend/src/app/page.tsx, .env.example | ✅ Done |
| 14 – README.md, PROGRESS.md tick, DECISIONS.md rows | README.md, PROGRESS.md, DECISIONS.md | ✅ Done |

## Phase 2 – Completion table

| Item | File(s) | Status | Evidence |
|------|---------|--------|----------|
| 1 – form_service.py (CRUD, single aggregate, dup logic, publish bounds) | backend/app/services/form_service.py | ✅ Done | `pytest` passed |
| 2 – question_service.py (CRUD, positional logic, options logic) | backend/app/services/question_service.py | ✅ Done | `pytest` passed |
| 3 – get_current_user stub | backend/app/dependencies.py | ✅ Done | `pytest` passed |
| 4 – forms.py and questions.py routers + exception handlers | backend/app/routers/*.py, exceptions.py, main.py | ✅ Done | `pytest` passed |
| 5 – pytest tests (35+ test coverage on phase 2 APIs) | backend/tests/test_api.py | ✅ Done | 38 tests passing |
| 6 – TanStack Query hooks (optimistic updates, toasts) | frontend/src/lib/api/forms.ts | ✅ Done | `tsc` passed |
| 7 – Dashboard UI + grid/list view | frontend/src/app/page.tsx, components/dashboard/*.tsx | ✅ Done | `tsc` & `lint` & `build` passed |
| 8 – Placeholder builder route + navigation | frontend/src/app/forms/[id]/edit/page.tsx | ✅ Done | `tsc` & `lint` passed |
| 9 – Reusable accessible UI primitives | frontend/src/components/ui/*.tsx | ✅ Done | `tsc` & `lint` passed |
| 10 – Toasts and interactions | frontend/src/components/dashboard/*.tsx | ✅ Done | `tsc` & `lint` passed |
| 11 – Documentation & commands | PROGRESS.md, DECISIONS.md | ✅ Done | updated |
