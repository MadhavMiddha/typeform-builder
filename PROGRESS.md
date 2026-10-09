# Project Progress

## Phases Checklist
- [x] Phase 1: Project Setup, Database Schema & Models
- [x] Phase 2: Backend Core API & Form/Question Management
- [x] Phase 3: Form Builder (Canvas, Settings, Drag & Drop, Autosave)
- [x] Phase 4: Public Respondent Flow + Submission API
- [x] Phase 5: Creator Dashboard & Form Lifecycle Management
- [ ] Phase 6: Response Handling, Server Validation & Seed Data
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

## Phase 3 – Builder Completion table

| Item | File(s) | Status | Evidence |
|------|---------|--------|----------|
| 1 – Route /forms/[id]/edit + store | app/forms/[id]/edit/page.tsx, hooks/useBuilderStore.tsx | ✅ Done | Renders properly |
| 2/3 – Autosave & beforeunload | hooks/useAutosave.ts | ✅ Done | Hook implemented |
| 4 – Top bar | components/builder/TopBar.tsx | ✅ Done | Renders correctly |
| 5/14 – Left pane + Drag & Drop | components/builder/QuestionList.tsx | ✅ Done | @dnd-kit integrated |
| 6 – Centre canvas + QuestionView | components/builder/Canvas.tsx, player/QuestionView.tsx | ✅ Done | Inline editable |
| 7/9/10/11/12/13 – Settings pane + Options | components/builder/SettingsPanel.tsx, OptionsEditor.tsx | ✅ Done | Form options handled |
| 8 – Add question popover | components/builder/AddQuestionPopover.tsx | ✅ Done | Dialog operational |
| 18 – Component sizes & structure | components/builder/*.tsx | ✅ Done | No file over 250 lines |
| 19 – Update docs, test, lint, build | PROGRESS.md, DECISIONS.md | ✅ Done | Updated |

## Phase 3 – Visual refinement

| Area | Status | Evidence |
|------|--------|----------|
| Builder tokens and workspace surfaces | ✅ Done | Added builder workspace, panel, divider and canvas tokens in `frontend/src/app/globals.css` |
| Top navigation and secondary toolbar | ✅ Done | Refined `TopBar.tsx`; added functional compact `AddQuestionPopover` toolbar trigger and responsive pane controls |
| Question list presentation | ✅ Done | Refined page cards, selected state, numbering, spacing and panel background in `QuestionList.tsx` |
| Canvas and shared question rendering | ✅ Done | Reworked `Canvas.tsx` workspace/canvas treatment and `QuestionView.tsx` typography, inputs and choice controls |
| Settings panel organisation | ✅ Done | Refined labels, inputs, spacing, description editing, Logic placeholder and Theme stub in `SettingsPanel.tsx` |
| Responsive layout | ✅ Done | Preserved desktop three-pane layout and added visible mobile page/settings toggles below the specified breakpoints |
| Visual validation | ✅ Done | TypeScript, lint, production build and live route/API smoke checks passed |

### Phase 3 – Functional refinement follow-up

| Area | Status | Evidence |
|------|--------|----------|
| Ordered insertion and numbering | ✅ Done | Welcome inserts before the first question, Thank-you appends, and local add/delete/reorder operations normalize contiguous positions |
| Empty-question authoring | ✅ Done | New empty question titles receive focus and display an inline placeholder |
| Type-specific validation | ✅ Done | Number ranges reject inverted bounds and choice bulk editing preserves the two-option minimum |
| Duplicate/delete workflow | ✅ Done | Question duplication copies settings/options with a fresh id; deleting a selected question selects a nearby item |
| Autosave recovery | ✅ Done | Debounced saves expose a Retry action while retaining unload protection |
| Independent pane scrolling | ✅ Done | Builder flex containers use `min-h-0` and full-height pane wrappers |
| Verification | ✅ Done | Frontend lint, typecheck, production build, backend compile check, and 92 backend tests passed |

### Phase 3 – Second UI refinement and bug-fix pass

| Area | Status | Evidence |
|------|--------|----------|
| Settings panel scrolling | ✅ Done | Settings panel now has a bounded full-height shell, fixed type header, and independently scrolling body; long option lists remain reachable |
| Rating and Yes/No previews | ✅ Done | Shared `QuestionView` keeps consistent number/title/description alignment, configured rating star counts, and compact Y/N cards |
| Options API synchronization | ✅ Done | Frontend adapter now sends the backend’s `{ options: string[] }` contract, removing 422 failures during bulk editing |
| Responsive layout | ✅ Done | Browser checks at 1440px and 390px showed no horizontal overflow and exposed pane toggles at mobile width |
| Browser verification | ⚠️ Partial | Live checks covered Rating step changes, Yes/No controls, 15-option scrolling/editing, Multiple Choice rendering, mobile overflow, and title persistence; the legacy end-to-end flow still times out during full-page reload |

## Phase 4 – Public respondent flow and submission API

| Item | File(s) | Status | Evidence |
|------|---------|--------|----------|
| 1 – Public form read, response start, validated atomic submit | backend/app/services/response_service.py, backend/app/routers/public.py | ✅ Done | Published-only reads, partial responses, typed answers/options, completed timestamps, and 409 duplicate-submit handling |
| 2 – Shared field error envelope | backend/app/routers/public.py, backend/app/services/exceptions.py | ✅ Done | Validation responses use `error.code`, `message`, and question-id keyed `fields` |
| 3 – Body/answer limits and IP limiter | backend/app/routers/public.py, backend/app/middleware/rate_limit.py | ✅ Done | 512 KiB body limit, 200-answer limit, documented per-process limiter |
| 4 – Public API test coverage | backend/tests/test_public_api.py, backend/tests/test_validators.py | ✅ Done | `124 passed` |
| 5 – Reducer state machine | frontend/src/components/player/formPlayerReducer.ts, frontend/tests/formPlayerReducer.test.ts | ✅ Done | Vitest covers next/previous, validation blocking, error clearing, and jump extension point |
| 6–15 – Respondent player UX | frontend/src/app/f/[publicId]/page.tsx, frontend/src/components/player/FormPlayer.tsx, QuestionView.tsx, frontend/src/lib/validation.ts | ✅ Done | Interactive player, progress/footer, mobile layout, keyboard navigation, validation, loading/error states, submit flow |
| 16 – Preview and Share wiring | frontend/src/components/builder/TopBar.tsx, backend/app/routers/forms.py | ✅ Done | New-tab draft preview, Preview mode ribbon, Share copy/open controls, unpublished messaging |
| 17 – Documentation and verification | PROGRESS.md, DECISIONS.md | ✅ Done | Backend pytest, Vitest, lint, TypeScript, and production build all pass |

## Phase 5 – Results

| Item | File(s) | Status | Evidence |
|------|---------|--------|----------|
| 1 – Results service with aggregate SQL, response listing/detail, summary metrics, and streamed CSV | backend/app/services/results_service.py, backend/app/schemas/results.py | ✅ Done | SQL `COUNT`/`AVG`/`MIN`/`MAX`/`GROUP BY`, deterministic pagination, 14-day zero-filled series, typed question stats, completed-response CSV |
| 2 – Scoped results routers | backend/app/routers/results.py, backend/app/main.py | ✅ Done | Four `/api/forms/{id}/...` endpoints enforce current-user ownership |
| 3 – Results backend tests | backend/tests/test_results.py | ✅ Done | 24 focused tests; full backend suite passes with 147 tests |
| 4 – Results route and shared builder top bar | frontend/src/app/forms/[id]/results/page.tsx, frontend/src/components/builder/TopBar.tsx | ✅ Done | `/forms/[id]/results`, active Results tab, Summary/Responses navigation |
| 5 – Summary tab | frontend/src/components/results/SummaryView.tsx | ✅ Done | Stat cards, 14-day CSS bar chart, numbered question-order cards, percentage bars, skipped counts, and type-specific visualizations |
| 6 – Responses tab | frontend/src/components/results/ResponsesView.tsx | ✅ Done | Status filter, first three question columns, truncation/tooltips, sticky header, pagination, refresh, polling, loading/error/empty states |
| 7 – Response drawer | frontend/src/components/results/ResponsesView.tsx, frontend/src/lib/api/results.ts | ✅ Done | Typed answer formatting, exact “No answer” state, visible previous/next arrows, Escape and arrow-key navigation |
| 8 – CSV download | frontend/src/components/results/ResponsesView.tsx, frontend/src/lib/api/results.ts | ✅ Done | Download action with sanitized form-title and date filename |
| 9 – Shared results data/query behavior | frontend/src/lib/api/results.ts, frontend/src/lib/types.ts | ✅ Done | Shared query keys, status-aware response keys, 30-second polling and refresh |
| 10 – Documentation and verification | PROGRESS.md, DECISIONS.md | ✅ Done | Backend 147 tests, frontend lint, TypeScript, production build, CSV streaming, and query-plan audit pass |
