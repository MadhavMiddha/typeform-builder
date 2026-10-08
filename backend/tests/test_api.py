"""
pytest tests for Phase 2 API endpoints.

Uses a temporary SQLite DB (in-memory per session) and httpx TestClient.
Covers all form and question endpoints, error shapes, ordering, duplicate,
publish/unpublish rules, ownership scoping, option limits, and type change behaviour.

Run: pytest tests/test_api.py -v
"""
from __future__ import annotations

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine, event
from sqlalchemy.engine import Engine
from sqlalchemy.orm import sessionmaker, Session

from app.main import app
from app.db import Base, get_db
from app.dependencies import get_current_user
from app.models.user import User


# ---------------------------------------------------------------------------
# Fixtures
# ---------------------------------------------------------------------------

TEST_DB_URL = "sqlite:///:memory:"


@pytest.fixture(scope="session")
def engine():
    eng = create_engine(TEST_DB_URL, connect_args={"check_same_thread": False})

    @event.listens_for(eng, "connect")
    def set_pragma(conn, _rec):
        cursor = conn.cursor()
        cursor.execute("PRAGMA foreign_keys=ON")
        cursor.close()

    Base.metadata.create_all(bind=eng)
    yield eng
    Base.metadata.drop_all(bind=eng)
    eng.dispose()


@pytest.fixture(scope="session")
def SessionFactory(engine):
    return sessionmaker(bind=engine, autocommit=False, autoflush=False, expire_on_commit=False)


@pytest.fixture()
def db(SessionFactory):
    """Transactional test session – rolls back after each test."""
    connection = SessionFactory.kw["bind"].connect()
    transaction = connection.begin()
    session = Session(bind=connection)
    try:
        yield session
    finally:
        session.close()
        transaction.rollback()
        connection.close()


@pytest.fixture()
def default_user(db) -> User:
    user = User(email="creator@example.com", name="Default Creator")
    db.add(user)
    db.commit()
    db.refresh(user)
    return user


@pytest.fixture()
def client(db, default_user) -> TestClient:
    """TestClient with overridden DB dependency."""

    def _get_db_override():
        yield db

    def _get_user_override():
        return default_user

    app.dependency_overrides[get_db] = _get_db_override
    app.dependency_overrides[get_current_user] = _get_user_override

    with TestClient(app, raise_server_exceptions=True) as c:
        yield c

    app.dependency_overrides.clear()


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

def create_form(client: TestClient, title: str | None = None) -> dict:
    body = {"title": title} if title else {}
    r = client.post("/api/forms", json=body)
    assert r.status_code == 201
    return r.json()


def add_question(client: TestClient, form_id: int, qtype: str = "short_text", title: str = "Q") -> dict:
    r = client.post(f"/api/forms/{form_id}/questions", json={"type": qtype, "title": title})
    assert r.status_code == 201
    return r.json()


def assert_error_shape(data: dict) -> None:
    assert "error" in data, f"Expected 'error' key in response: {data}"
    assert "code" in data["error"], f"Expected 'code' in error: {data['error']}"
    assert "message" in data["error"], f"Expected 'message' in error: {data['error']}"


# ---------------------------------------------------------------------------
# Tests 1-5: Form list and create
# ---------------------------------------------------------------------------

def test_01_list_forms_empty(client):
    """GET /api/forms returns empty list when no forms exist."""
    r = client.get("/api/forms")
    assert r.status_code == 200
    assert r.json() == []


def test_02_create_form_defaults(client):
    """POST /api/forms with no body creates a draft 'Untitled form'."""
    r = client.post("/api/forms", json={})
    assert r.status_code == 201
    data = r.json()
    assert data["title"] == "Untitled form"
    assert data["status"] == "draft"
    assert data["public_id"] is not None and len(data["public_id"]) == 10
    assert data["welcome_title"] is not None
    assert data["thank_you_title"] is not None


def test_03_create_form_custom_title(client):
    """POST /api/forms with title sets it correctly."""
    r = client.post("/api/forms", json={"title": "My Survey"})
    assert r.status_code == 201
    assert r.json()["title"] == "My Survey"


def test_04_get_form_not_found(client):
    """GET /api/forms/9999 returns 404 with correct error shape."""
    r = client.get("/api/forms/9999")
    assert r.status_code == 404
    assert_error_shape(r.json())


def test_05_get_form_success(client):
    """GET /api/forms/{id} returns the form with empty questions list."""
    form = create_form(client, "Test Form")
    r = client.get(f"/api/forms/{form['id']}")
    assert r.status_code == 200
    data = r.json()
    assert data["id"] == form["id"]
    assert data["title"] == "Test Form"
    assert data["questions"] == []


# ---------------------------------------------------------------------------
# Tests 6-8: Update and delete
# ---------------------------------------------------------------------------

def test_06_update_form_title(client):
    """PATCH /api/forms/{id} updates the title."""
    form = create_form(client)
    r = client.patch(f"/api/forms/{form['id']}", json={"title": "Renamed"})
    assert r.status_code == 200
    assert r.json()["title"] == "Renamed"


def test_07_update_form_welcome_thankyou(client):
    """PATCH /api/forms/{id} updates welcome and thank-you fields."""
    form = create_form(client)
    patch = {
        "welcome_title": "Hello!",
        "welcome_description": "This is a test.",
        "thank_you_title": "Done",
        "thank_you_message": "Thanks!",
    }
    r = client.patch(f"/api/forms/{form['id']}", json=patch)
    assert r.status_code == 200
    data = r.json()
    assert data["welcome_title"] == "Hello!"
    assert data["thank_you_message"] == "Thanks!"


def test_08_delete_form_204(client):
    """DELETE /api/forms/{id} returns 204 and the form is gone."""
    form = create_form(client)
    r = client.delete(f"/api/forms/{form['id']}")
    assert r.status_code == 204
    # Confirm gone
    r2 = client.get(f"/api/forms/{form['id']}")
    assert r2.status_code == 404


def test_09_delete_form_not_found(client):
    """DELETE /api/forms/9999 returns 404."""
    r = client.delete("/api/forms/9999")
    assert r.status_code == 404


# ---------------------------------------------------------------------------
# Tests 10-12: Duplicate
# ---------------------------------------------------------------------------

def test_10_duplicate_deep_copy(client):
    """Duplicate copies questions and options."""
    form = create_form(client, "Original")
    add_question(client, form["id"], "multiple_choice", "Fav color?")
    add_question(client, form["id"], "short_text", "Name?")

    r = client.post(f"/api/forms/{form['id']}/duplicate")
    assert r.status_code == 201
    dup = r.json()
    assert dup["title"] == "Original (copy)"
    assert dup["status"] == "draft"
    assert len(dup["questions"]) == 2
    # Multiple choice questions should have options
    mc = next(q for q in dup["questions"] if q["type"] == "multiple_choice")
    assert len(mc["options"]) == 2


def test_11_duplicate_independence(client):
    """Editing the duplicate does not affect the original."""
    form = create_form(client, "Original")
    add_question(client, form["id"], "short_text", "Q1")

    dup = client.post(f"/api/forms/{form['id']}/duplicate").json()
    # Rename the duplicate
    client.patch(f"/api/forms/{dup['id']}", json={"title": "Copy renamed"})

    # Original unchanged
    orig = client.get(f"/api/forms/{form['id']}").json()
    assert orig["title"] == "Original"


def test_12_duplicate_no_responses(client, db):
    """Duplicate form has response_count=0."""
    form = create_form(client, "Source")
    dup = client.post(f"/api/forms/{form['id']}/duplicate").json()
    # List both and check response counts
    forms_list = client.get("/api/forms").json()
    dup_in_list = next(f for f in forms_list if f["id"] == dup["id"])
    assert dup_in_list["response_count"] == 0


# ---------------------------------------------------------------------------
# Tests 13-16: Publish / Unpublish
# ---------------------------------------------------------------------------

def test_13_publish_form_success(client):
    """POST publish succeeds when form has at least one question."""
    form = create_form(client)
    add_question(client, form["id"])
    r = client.post(f"/api/forms/{form['id']}/publish")
    assert r.status_code == 200
    data = r.json()
    assert data["status"] == "published"
    assert data["published_at"] is not None


def test_14_publish_empty_form_409(client):
    """POST publish on empty form returns 409."""
    form = create_form(client)
    r = client.post(f"/api/forms/{form['id']}/publish")
    assert r.status_code == 409
    assert_error_shape(r.json())
    assert r.json()["error"]["code"] == "EMPTY_FORM"


def test_15_publish_idempotent(client):
    """Publishing an already-published form returns 200 and stays published."""
    form = create_form(client)
    add_question(client, form["id"])
    client.post(f"/api/forms/{form['id']}/publish")
    r = client.post(f"/api/forms/{form['id']}/publish")
    assert r.status_code == 200
    assert r.json()["status"] == "published"


def test_16_unpublish_form(client):
    """POST unpublish sets form back to draft."""
    form = create_form(client)
    add_question(client, form["id"])
    client.post(f"/api/forms/{form['id']}/publish")
    r = client.post(f"/api/forms/{form['id']}/unpublish")
    assert r.status_code == 200
    assert r.json()["status"] == "draft"


# ---------------------------------------------------------------------------
# Tests 17-21: Questions add / defaults
# ---------------------------------------------------------------------------

def test_17_add_question_defaults(client):
    """POST question with type short_text has correct structure."""
    form = create_form(client)
    r = client.post(f"/api/forms/{form['id']}/questions", json={"type": "short_text"})
    assert r.status_code == 201
    q = r.json()
    assert q["type"] == "short_text"
    assert q["position"] == 1
    assert q["required"] is False


def test_18_add_question_multiple_choice_defaults(client):
    """multiple_choice question gets 2 default options."""
    form = create_form(client)
    q = add_question(client, form["id"], "multiple_choice", "Choose one")
    assert len(q["options"]) == 2
    labels = [o["label"] for o in q["options"]]
    assert "Option 1" in labels
    assert "Option 2" in labels


def test_19_add_question_rating_settings(client):
    """rating question gets rating_max=5 in settings."""
    form = create_form(client)
    q = add_question(client, form["id"], "rating", "Rate us")
    assert q["settings"] is not None
    assert q["settings"]["rating_max"] == 5


def test_20_update_question_title(client):
    """PATCH /api/questions/{qid} updates the title."""
    form = create_form(client)
    q = add_question(client, form["id"], "short_text", "Old title")
    r = client.patch(f"/api/questions/{q['id']}", json={"title": "New title"})
    assert r.status_code == 200
    assert r.json()["title"] == "New title"


def test_21_update_question_type_change_resets(client):
    """Changing question type resets settings and adds default options for choice types."""
    form = create_form(client)
    q = add_question(client, form["id"], "rating", "Rate")
    # Change to multiple_choice
    r = client.patch(f"/api/questions/{q['id']}", json={"type": "multiple_choice"})
    assert r.status_code == 200
    data = r.json()
    assert data["type"] == "multiple_choice"
    assert len(data["options"]) == 2
    # Settings should be reset to multiple_choice defaults (no rating_max)
    if data["settings"]:
        assert "rating_max" not in data["settings"]


# ---------------------------------------------------------------------------
# Tests 22-24: Delete and ordering
# ---------------------------------------------------------------------------

def test_22_delete_question_compacts_positions(client):
    """After deleting the middle question, positions are re-compacted to 1, 2."""
    form = create_form(client)
    q1 = add_question(client, form["id"], "short_text", "Q1")
    q2 = add_question(client, form["id"], "short_text", "Q2")
    q3 = add_question(client, form["id"], "short_text", "Q3")
    assert q1["position"] == 1
    assert q2["position"] == 2
    assert q3["position"] == 3

    # Delete the middle question
    r = client.delete(f"/api/questions/{q2['id']}")
    assert r.status_code == 204

    # Get form and check positions
    form_data = client.get(f"/api/forms/{form['id']}").json()
    positions = [q["position"] for q in form_data["questions"]]
    assert positions == [1, 2], f"Expected [1,2] but got {positions}"


def test_23_reorder_questions_success(client):
    """PUT /api/forms/{id}/questions/order reorders questions."""
    form = create_form(client)
    q1 = add_question(client, form["id"], "short_text", "Q1")
    q2 = add_question(client, form["id"], "short_text", "Q2")
    q3 = add_question(client, form["id"], "short_text", "Q3")

    # Reverse order
    new_order = [q3["id"], q1["id"], q2["id"]]
    r = client.put(f"/api/forms/{form['id']}/questions/order", json={"ordered_ids": new_order})
    assert r.status_code == 200

    form_data = client.get(f"/api/forms/{form['id']}").json()
    ids_in_order = [q["id"] for q in form_data["questions"]]
    assert ids_in_order == new_order


def test_24_reorder_wrong_ids(client):
    """PUT order with wrong id set returns 422."""
    form = create_form(client)
    q1 = add_question(client, form["id"])
    r = client.put(f"/api/forms/{form['id']}/questions/order", json={"ordered_ids": [q1["id"], 99999]})
    assert r.status_code == 422
    assert_error_shape(r.json())


# ---------------------------------------------------------------------------
# Tests 25-28: Options and logic
# ---------------------------------------------------------------------------

def test_25_replace_options_success(client):
    """PUT /api/questions/{qid}/options replaces options."""
    form = create_form(client)
    q = add_question(client, form["id"], "multiple_choice", "Colors?")
    r = client.put(f"/api/questions/{q['id']}/options", json={"options": ["Red", "Green", "Blue"]})
    assert r.status_code == 200
    labels = [o["label"] for o in r.json()["options"]]
    assert labels == ["Red", "Green", "Blue"]


def test_26_replace_options_too_few(client):
    """PUT options with 1 label returns 422."""
    form = create_form(client)
    q = add_question(client, form["id"], "multiple_choice", "Colors?")
    r = client.put(f"/api/questions/{q['id']}/options", json={"options": ["Only one"]})
    assert r.status_code == 422
    assert_error_shape(r.json())


def test_27_replace_options_too_many(client):
    """PUT options with 21 labels returns 422."""
    form = create_form(client)
    q = add_question(client, form["id"], "multiple_choice", "Colors?")
    labels = [f"Option {i}" for i in range(21)]
    r = client.put(f"/api/questions/{q['id']}/options", json={"options": labels})
    assert r.status_code == 422
    assert_error_shape(r.json())


def test_28_replace_logic_valid(client):
    """PUT /api/questions/{qid}/logic stores valid logic rules."""
    form = create_form(client)
    q1 = add_question(client, form["id"], "short_text", "Q1")
    q2 = add_question(client, form["id"], "short_text", "Q2")

    rules = [{"operator": "equals", "value": "yes", "jump_to_question_id": q2["id"], "jump_to_end": False}]
    r = client.put(f"/api/questions/{q1['id']}/logic", json={"rules": rules})
    assert r.status_code == 200
    assert len(r.json()["logic_rules"]) == 1
    assert r.json()["logic_rules"][0]["operator"] == "equals"


def test_29_replace_logic_invalid_operator(client):
    """PUT logic with invalid operator returns 422."""
    form = create_form(client)
    q = add_question(client, form["id"])
    rules = [{"operator": "invalid_op", "value": "x", "jump_to_end": True}]
    r = client.put(f"/api/questions/{q['id']}/logic", json={"rules": rules})
    assert r.status_code == 422
    assert_error_shape(r.json())


# ---------------------------------------------------------------------------
# Tests 30: Ownership scoping
# ---------------------------------------------------------------------------

def test_30_ownership_scoping(db, default_user):
    """A second user cannot access forms owned by the first user."""
    from app.models.user import User as UserModel
    from app.main import app
    from fastapi.testclient import TestClient

    # Create second user
    user2 = UserModel(email="other@example.com", name="Other User")
    db.add(user2)
    db.commit()
    db.refresh(user2)

    def _get_db_u1():
        yield db

    def _get_db_u2():
        yield db

    # Client for user1 (default_user)
    def _user1():
        return default_user

    # Client for user2
    def _user2():
        return user2

    app.dependency_overrides[get_db] = _get_db_u1
    app.dependency_overrides[get_current_user] = _user1
    client1 = TestClient(app)
    r = client1.post("/api/forms", json={"title": "User1 Form"})
    form_id = r.json()["id"]

    # Switch to user2
    app.dependency_overrides[get_current_user] = _user2
    client2 = TestClient(app)
    r2 = client2.get(f"/api/forms/{form_id}")
    assert r2.status_code == 404, "User2 should not see User1's form"

    app.dependency_overrides.clear()


# ---------------------------------------------------------------------------
# Tests 31-32: Error shapes
# ---------------------------------------------------------------------------

def test_31_404_error_shape(client):
    """404 response has the standard error shape."""
    r = client.get("/api/forms/999999")
    assert r.status_code == 404
    data = r.json()
    assert_error_shape(data)


def test_32_422_error_shape_invalid_type(client):
    """Adding question with invalid type returns 422 with fields."""
    form = create_form(client)
    r = client.post(f"/api/forms/{form['id']}/questions", json={"type": "not_a_real_type"})
    assert r.status_code == 422
    data = r.json()
    assert_error_shape(data)


# ---------------------------------------------------------------------------
# Tests 33-35: Ordering preserved, positions after adds/deletes
# ---------------------------------------------------------------------------

def test_33_ordering_preserved_after_multiple_adds(client):
    """Questions added sequentially have consecutive positions."""
    form = create_form(client)
    for i in range(5):
        add_question(client, form["id"], "short_text", f"Q{i+1}")
    form_data = client.get(f"/api/forms/{form['id']}").json()
    positions = [q["position"] for q in form_data["questions"]]
    assert positions == list(range(1, 6))


def test_34_positions_after_first_delete(client):
    """After deleting q1, remaining questions have positions 1, 2."""
    form = create_form(client)
    q1 = add_question(client, form["id"], "short_text", "First")
    q2 = add_question(client, form["id"], "short_text", "Second")
    q3 = add_question(client, form["id"], "short_text", "Third")

    client.delete(f"/api/questions/{q1['id']}")

    form_data = client.get(f"/api/forms/{form['id']}").json()
    titles = [q["title"] for q in form_data["questions"]]
    positions = [q["position"] for q in form_data["questions"]]
    assert titles == ["Second", "Third"]
    assert positions == [1, 2]


def test_35_get_form_returns_options_logic_eager_loaded(client):
    """GET /api/forms/{id} returns options and logic_rules inside questions."""
    form = create_form(client)
    q = add_question(client, form["id"], "multiple_choice", "Choose")
    # Add logic rule
    q2 = add_question(client, form["id"], "short_text", "Follow-up")
    client.put(f"/api/questions/{q['id']}/logic", json={
        "rules": [{"operator": "equals", "value": "Option 1", "jump_to_question_id": q2["id"], "jump_to_end": False}]
    })

    form_data = client.get(f"/api/forms/{form['id']}").json()
    mc = next(qu for qu in form_data["questions"] if qu["id"] == q["id"])
    assert len(mc["options"]) == 2, "Options should be eager-loaded"
    assert len(mc["logic_rules"]) == 1, "Logic rules should be eager-loaded"


def test_36_list_forms_shows_response_count(client):
    """GET /api/forms returns response_count without N+1."""
    create_form(client, "Form A")
    create_form(client, "Form B")
    r = client.get("/api/forms")
    assert r.status_code == 200
    forms = r.json()
    assert len(forms) == 2
    for f in forms:
        assert "response_count" in f
        assert f["response_count"] == 0


def test_37_duplicate_form_has_new_public_id(client):
    """Duplicate form gets a different public_id."""
    form = create_form(client, "Original")
    dup = client.post(f"/api/forms/{form['id']}/duplicate").json()
    assert dup["public_id"] != form["public_id"]


def test_38_publish_form_not_found(client):
    """POST publish on non-existent form returns 404."""
    r = client.post("/api/forms/99999/publish")
    assert r.status_code == 404
    assert_error_shape(r.json())
