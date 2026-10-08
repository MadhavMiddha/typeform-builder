# Rules for the whole project
- Never silently skip or simplify a requirement.
- If something is impossible, write it under 'Deviations' in PROGRESS.md.
- Before ending any phase, produce a table of checklist item, file(s), status.
- Update PROGRESS.md and DECISIONS.md at the end of every phase.

# PROJECT_SPEC: Typeform Builder

## 0. Goal
Functional Typeform clone: creators build forms (drag-and-drop), publish a public link, respondents fill one question at a time, creators view responses. UI and UX must closely match Typeform. Graded on: functionality, UI/UX similarity, database design, API design, code quality, modularity, and my ability to explain every line.

## 1. Stack (fixed)
- Frontend: Next.js 14+ App Router, TypeScript (strict), Tailwind CSS, Framer Motion (transitions), @dnd-kit (drag and drop), TanStack Query (server state), Radix UI primitives (dialogs, dropdown, switch), sonner (toasts), lucide-react (icons), zod + react-hook-form only where useful.
- Backend: Python 3.11+, FastAPI, SQLAlchemy 2.0, Pydantic v2, SQLite (file db.sqlite3), pytest + httpx for tests, uvicorn.
- Fonts: Inter for app chrome, Karla (or closest free match) for the respondent flow. All colours/spacing in one design-tokens file.

## 2. Folder structure
frontend/ (src/app, src/components/{ui,builder,dashboard,player,results}, src/lib/{api,types,utils}, src/hooks)
backend/ (app/{main.py,config.py,db.py,models/,schemas/,routers/,services/,validators/}, scripts/seed.py, tests/)
reference/ (screenshots), README.md, PROJECT_SPEC.md, PROGRESS.md, DECISIONS.md
Rules: routers are thin (HTTP only), services hold business logic, models hold DB, schemas hold Pydantic. Frontend files under ~250 lines; split big components. No dead code, no console.log, no any.

## 3. Data model (SQLite, foreign keys ON, PRAGMA foreign_keys=1 on every connection)
users(id PK, email UNIQUE, name, created_at)  -- one seeded default creator, no real auth
forms(id PK, user_id FK->users CASCADE, public_id UNIQUE (nanoid, 10 chars), title, status CHECK in ('draft','published'), welcome_title, welcome_description, welcome_button_label, thank_you_title, thank_you_message, theme JSON, created_at, updated_at, published_at NULL)
questions(id PK, form_id FK->forms CASCADE, position INT, type CHECK in ('short_text','long_text','multiple_choice','dropdown','email','number','yes_no','rating'), title, description NULL, required BOOL, settings JSON (e.g. rating_max, allow_multiple, number_min, number_max, placeholder), created_at, updated_at; UNIQUE(form_id, position) enforced by service logic, INDEX(form_id, position))
question_options(id PK, question_id FK->questions CASCADE, label, position INT; INDEX(question_id, position))
question_logic(id PK, question_id FK->questions CASCADE, operator CHECK in ('equals','not_equals','contains','greater_than','less_than'), value TEXT, jump_to_question_id FK->questions NULL SET NULL, jump_to_end BOOL)  -- used in bonus phase, table created in phase 1
responses(id PK, form_id FK->forms CASCADE, status CHECK in ('partial','completed'), started_at, submitted_at NULL; INDEX(form_id, submitted_at))
answers(id PK, response_id FK->responses CASCADE, question_id FK->questions CASCADE, value_text NULL, value_number NULL, value_bool NULL; UNIQUE(response_id, question_id); INDEX(question_id))
answer_options(answer_id FK->answers CASCADE, option_id FK->question_options CASCADE, PRIMARY KEY(answer_id, option_id))  -- chosen options for multiple_choice/dropdown
Why this shape: typed answer columns avoid JSON parsing for stats; answer_options makes per-option counts a simple GROUP BY; settings/theme are JSON because they are per-type, never queried.

## 4. API (all under /api, JSON, consistent error shape {"error":{"code":str,"message":str,"fields":{...}}})
Creator (default user id 1, no auth):
GET /forms (list with status, response_count, updated_at) | POST /forms | GET /forms/{id} (with questions+options+logic) | PATCH /forms/{id} | DELETE /forms/{id} | POST /forms/{id}/duplicate | POST /forms/{id}/publish | POST /forms/{id}/unpublish
POST /forms/{id}/questions | PATCH /questions/{qid} | DELETE /questions/{qid} | PUT /forms/{id}/questions/order (body: ordered_ids) | PUT /questions/{qid}/options (replace-all) | PUT /questions/{qid}/logic (replace-all)
Results: GET /forms/{id}/responses?page=&page_size= | GET /forms/{id}/responses/{rid} | GET /forms/{id}/summary | GET /forms/{id}/responses/export.csv
Public (no auth): GET /public/forms/{public_id} (404 unless published) | POST /public/forms/{public_id}/responses/start | POST /public/forms/{public_id}/responses (submit)
GET /health

## 5. Question types and validation (the SAME rules on client and server; server is the authority)
short_text (max 255), long_text (max 5000), email (RFC-lite regex), number (optional min/max from settings), yes_no (boolean), rating (1..rating_max, default 5, allowed 3..10), multiple_choice (1+ option ids, allow_multiple setting, 2..20 options), dropdown (exactly 1 option id). required=true rejects empty. Unknown/foreign question ids or option ids are rejected. Unpublished form submit returns 404.

## 6. UI/UX requirements
Dashboard: Typeform-like workspace list (form cards/rows with title, status badge, response count, updated date, kebab menu: rename, duplicate, delete, publish/unpublish, copy link), 'Create form' button, empty state, skeleton loaders, confirm modal for delete, toasts for every action.
Builder: top bar (back, editable title, tabs Create | Share | Results, Preview, Publish), three panes: left = ordered question list with drag handle, number, type icon, truncated title, 'Add question' button, plus Welcome and Thank-you screen entries; centre = live canvas rendering the selected question exactly as respondent sees it, with inline editable title/description; right = settings panel (type switcher, required toggle, description, options editor, rating max, number min/max, theme, logic placeholder). Autosave with Saving.../Saved indicator, optimistic updates. Edits to a published form go live immediately (deliberate simplification of Typeform's 'Publish edits' step, listed under Deviations).
Respondent (/f/[publicId]): full screen, one question at a time, vertical slide+fade transitions, question number with arrow, large text, underline-style inputs, OK button with 'press Enter' hint, letter badges (A, B, C) on choices selectable by keypress, Y/N keys for yes/no, star rating, top progress bar, bottom-right up/down nav arrows, Enter or Down to advance, Up to go back, Shift+Enter for new line in long text, inline validation message with shake, welcome screen, thank-you screen, 'form not found/closed' screen, mobile responsive, prevents double submit, small 'Powered by' style footer using OUR name.
Results: tabs Summary | Responses; paginated table; click row for full response drawer; per-question summary (choice counts as bars, rating avg + distribution, number min/avg/max, latest text answers), totals and completion rate; CSV export.
Placeholders ('Coming soon'): advanced logic, integrations/webhooks, team collaboration, payments/file upload question types, settings theme extras.

## 7. Seed data (scripts/seed.py, idempotent)
Default creator; 3 forms: 'Customer Feedback Survey' (published, all 8 types, 25 responses), 'Event Registration' (published, 12 responses), 'Job Application' (draft, 6 questions, no responses). Responses spread over the last 14 days, mixed completed/partial.

## 8. Quality bar
Type-safe end to end, centralised API client, error boundaries, loading/empty/error states everywhere, accessible (labels, focus rings, aria-live for errors), pytest coverage of services and validators, README with setup, architecture, schema, API overview and assumptions.
