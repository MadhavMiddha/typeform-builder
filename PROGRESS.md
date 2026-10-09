# Project Progress

## Phases Checklist
- [x] Phase 1: Project Setup, Database Schema & Models
- [x] Phase 2: Backend Core API & Form/Question Management
- [x] Phase 3: Form Builder (Canvas, Settings, Drag & Drop, Autosave)
- [ ] Phase 4: Frontend Foundation, Design Tokens & API Client
- [ ] Phase 5: Creator Dashboard & Form Lifecycle Management
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
