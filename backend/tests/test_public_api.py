"""
Public respondent API tests – Phase 4.

Run: pytest tests/test_public_api.py -v
"""
from __future__ import annotations

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine, event, select
from sqlalchemy.orm import Session, sessionmaker

from app.db import Base, get_db
from app.dependencies import get_current_user
from app.main import app
from app.models.answer import Answer
from app.models.form import Form
from app.models.user import User


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
    def _get_db_override():
        yield db

    app.dependency_overrides[get_db] = _get_db_override
    app.dependency_overrides[get_current_user] = lambda: default_user

    with TestClient(app, raise_server_exceptions=True) as c:
        yield c

    app.dependency_overrides.clear()


def create_form(client: TestClient, title: str = "Survey") -> dict:
    r = client.post("/api/forms", json={"title": title})
    assert r.status_code == 201
    return r.json()


def publish(client: TestClient, form_id: int) -> dict:
    r = client.post(f"/api/forms/{form_id}/publish")
    assert r.status_code == 200
    return r.json()


def add_question(client: TestClient, form_id: int, qtype: str, title: str, **extra) -> dict:
    body = {"type": qtype, "title": title, **extra}
    r = client.post(f"/api/forms/{form_id}/questions", json=body)
    assert r.status_code == 201
    return r.json()


def set_options(client: TestClient, qid: int, labels: list[str]) -> None:
    r = client.put(f"/api/questions/{qid}/options", json={"options": labels})
    assert r.status_code == 200


def build_published_survey(client: TestClient) -> dict:
    form = create_form(client, "Public Survey")
    q_text = add_question(client, form["id"], "short_text", "Name", required=True)
    q_email = add_question(client, form["id"], "email", "Email", required=True)
    q_mc = add_question(client, form["id"], "multiple_choice", "Pick one", required=True)
    set_options(client, q_mc["id"], ["A", "B"])
    q_rating = add_question(
        client,
        form["id"],
        "rating",
        "Rate us",
        required=False,
        settings={"rating_max": 5},
    )
    published = publish(client, form["id"])
    full = client.get(f"/api/forms/{form['id']}").json()
    by_id = {q["id"]: q for q in full["questions"]}
    return {
        "form": published,
        "questions": {
            "text": by_id[q_text["id"]],
            "email": by_id[q_email["id"]],
            "mc": by_id[q_mc["id"]],
            "rating": by_id[q_rating["id"]],
        },
    }


def test_public_get_draft_returns_404(client):
    form = create_form(client)
    r = client.get(f"/api/public/forms/{form['public_id']}")
    assert r.status_code == 404
    assert r.json()["error"]["code"] == "FORM_NOT_FOUND"


def test_public_get_published_ok(client):
    bundle = build_published_survey(client)
    r = client.get(f"/api/public/forms/{bundle['form']['public_id']}")
    assert r.status_code == 200
    data = r.json()
    assert data["title"] == "Public Survey"
    assert "user_id" not in data
    assert len(data["questions"]) == 4


def test_public_get_unpublished_after_unpublish(client):
    bundle = build_published_survey(client)
    pid = bundle["form"]["public_id"]
    client.post(f"/api/forms/{bundle['form']['id']}/unpublish")
    r = client.get(f"/api/public/forms/{pid}")
    assert r.status_code == 404


def test_preview_draft_works(client):
    form = create_form(client)
    add_question(client, form["id"], "short_text", "Q1")
    r = client.get(f"/api/forms/{form['id']}/preview")
    assert r.status_code == 200
    assert r.json()["public_id"] == form["public_id"]


def test_start_response_creates_partial(client):
    bundle = build_published_survey(client)
    r = client.post(f"/api/public/forms/{bundle['form']['public_id']}/responses/start")
    assert r.status_code == 200
    data = r.json()
    assert data["status"] == "partial"
    assert data["form_id"] == bundle["form"]["id"]


def test_submit_valid_all_types(client):
    bundle = build_published_survey(client)
    mc_opts = bundle["questions"]["mc"]["options"]
    body = {
        "answers": [
            {"question_id": bundle["questions"]["text"]["id"], "value": "Alice"},
            {"question_id": bundle["questions"]["email"]["id"], "value": "alice@example.com"},
            {"question_id": bundle["questions"]["mc"]["id"], "value": mc_opts[0]["id"]},
            {"question_id": bundle["questions"]["rating"]["id"], "value": 4},
        ]
    }
    r = client.post(f"/api/public/forms/{bundle['form']['public_id']}/responses", json=body)
    assert r.status_code == 200
    assert r.json()["status"] == "completed"


def test_submit_invalid_email(client):
    bundle = build_published_survey(client)
    mc_opts = bundle["questions"]["mc"]["options"]
    body = {
        "answers": [
            {"question_id": bundle["questions"]["text"]["id"], "value": "Alice"},
            {"question_id": bundle["questions"]["email"]["id"], "value": "not-an-email"},
            {"question_id": bundle["questions"]["mc"]["id"], "value": mc_opts[0]["id"]},
        ]
    }
    r = client.post(f"/api/public/forms/{bundle['form']['public_id']}/responses", json=body)
    assert r.status_code == 422
    fields = r.json()["error"]["fields"]
    assert str(bundle["questions"]["email"]["id"]) in fields


def test_submit_required_missing(client):
    bundle = build_published_survey(client)
    body = {"answers": []}
    r = client.post(f"/api/public/forms/{bundle['form']['public_id']}/responses", json=body)
    assert r.status_code == 422
    fields = r.json()["error"]["fields"]
    assert str(bundle["questions"]["text"]["id"]) in fields


def test_submit_unknown_question_id(client):
    bundle = build_published_survey(client)
    body = {"answers": [{"question_id": 99999, "value": "x"}]}
    r = client.post(f"/api/public/forms/{bundle['form']['public_id']}/responses", json=body)
    assert r.status_code == 422
    assert "99999" in r.json()["error"]["fields"]


def test_submit_foreign_option_id(client):
    form_a = create_form(client, "A")
    q_a = add_question(client, form_a["id"], "multiple_choice", "A only", required=True)
    set_options(client, q_a["id"], ["One", "Two"])
    publish(client, form_a["id"])

    form_b = create_form(client, "B")
    q_b = add_question(client, form_b["id"], "multiple_choice", "B only", required=True)
    set_options(client, q_b["id"], ["X", "Y"])
    pub_b = publish(client, form_b["id"])

    foreign_option = q_a["options"][0]["id"]
    body = {"answers": [{"question_id": q_b["id"], "value": foreign_option}]}
    r = client.post(f"/api/public/forms/{pub_b['public_id']}/responses", json=body)
    assert r.status_code == 422
    assert str(q_b["id"]) in r.json()["error"]["fields"]


def test_double_submit_conflict(client):
    bundle = build_published_survey(client)
    start = client.post(f"/api/public/forms/{bundle['form']['public_id']}/responses/start").json()
    mc_opts = bundle["questions"]["mc"]["options"]
    body = {
        "response_id": start["id"],
        "answers": [
            {"question_id": bundle["questions"]["text"]["id"], "value": "Bob"},
            {"question_id": bundle["questions"]["email"]["id"], "value": "bob@example.com"},
            {"question_id": bundle["questions"]["mc"]["id"], "value": mc_opts[0]["id"]},
        ],
    }
    r1 = client.post(f"/api/public/forms/{bundle['form']['public_id']}/responses", json=body)
    assert r1.status_code == 200
    r2 = client.post(f"/api/public/forms/{bundle['form']['public_id']}/responses", json=body)
    assert r2.status_code == 409
    assert r2.json()["error"]["code"] == "ALREADY_SUBMITTED"


def test_partial_then_complete(client):
    bundle = build_published_survey(client)
    start = client.post(f"/api/public/forms/{bundle['form']['public_id']}/responses/start").json()
    mc_opts = bundle["questions"]["mc"]["options"]
    body = {
        "response_id": start["id"],
        "answers": [
            {"question_id": bundle["questions"]["text"]["id"], "value": "Cara"},
            {"question_id": bundle["questions"]["email"]["id"], "value": "cara@example.com"},
            {"question_id": bundle["questions"]["mc"]["id"], "value": mc_opts[1]["id"]},
        ],
    }
    r = client.post(f"/api/public/forms/{bundle['form']['public_id']}/responses", json=body)
    assert r.status_code == 200
    assert r.json()["status"] == "completed"


def test_invalid_answer_does_not_persist(client, db):
    bundle = build_published_survey(client)
    mc_opts = bundle["questions"]["mc"]["options"]
    body = {
        "answers": [
            {"question_id": bundle["questions"]["text"]["id"], "value": "Dave"},
            {"question_id": bundle["questions"]["email"]["id"], "value": "bad-email"},
            {"question_id": bundle["questions"]["mc"]["id"], "value": mc_opts[0]["id"]},
        ]
    }
    r = client.post(f"/api/public/forms/{bundle['form']['public_id']}/responses", json=body)
    assert r.status_code == 422
    count = db.execute(select(Answer)).scalars().all()
    assert len(count) == 0


def test_long_text_valid(client):
    form = create_form(client)
    q = add_question(client, form["id"], "long_text", "Essay", required=True)
    form = publish(client, form["id"])
    body = {"answers": [{"question_id": q["id"], "value": "Hello world"}]}
    r = client.post(f"/api/public/forms/{form['public_id']}/responses", json=body)
    assert r.status_code == 200


def test_long_text_too_long(client):
    form = create_form(client)
    q = add_question(client, form["id"], "long_text", "Essay", required=True)
    form = publish(client, form["id"])
    body = {"answers": [{"question_id": q["id"], "value": "x" * 5001}]}
    r = client.post(f"/api/public/forms/{form['public_id']}/responses", json=body)
    assert r.status_code == 422


def test_number_in_range(client):
    form = create_form(client)
    q = add_question(
        client,
        form["id"],
        "number",
        "Age",
        required=True,
        settings={"number_min": 1, "number_max": 10},
    )
    form = publish(client, form["id"])
    body = {"answers": [{"question_id": q["id"], "value": 5}]}
    assert client.post(f"/api/public/forms/{form['public_id']}/responses", json=body).status_code == 200
    body_bad = {"answers": [{"question_id": q["id"], "value": 99}]}
    assert client.post(f"/api/public/forms/{form['public_id']}/responses", json=body_bad).status_code == 422


def test_yes_no_valid(client):
    form = create_form(client)
    q = add_question(client, form["id"], "yes_no", "Agree?", required=True)
    form = publish(client, form["id"])
    body = {"answers": [{"question_id": q["id"], "value": True}]}
    assert client.post(f"/api/public/forms/{form['public_id']}/responses", json=body).status_code == 200


def test_dropdown_exactly_one(client):
    form = create_form(client)
    q = add_question(client, form["id"], "dropdown", "Pick", required=True)
    set_options(client, q["id"], ["Red", "Blue"])
    form = publish(client, form["id"])
    opt_id = client.get(f"/api/forms/{form['id']}").json()["questions"][-1]["options"][0]["id"]
    body = {"answers": [{"question_id": q["id"], "value": opt_id}]}
    assert client.post(f"/api/public/forms/{form['public_id']}/responses", json=body).status_code == 200


def test_rating_bounds(client):
    form = create_form(client)
    q = add_question(client, form["id"], "rating", "Stars", required=True, settings={"rating_max": 5})
    form = publish(client, form["id"])
    assert (
        client.post(
            f"/api/public/forms/{form['public_id']}/responses",
            json={"answers": [{"question_id": q["id"], "value": 6}]},
        ).status_code
        == 422
    )
    assert (
        client.post(
            f"/api/public/forms/{form['public_id']}/responses",
            json={"answers": [{"question_id": q["id"], "value": 3}]},
        ).status_code
        == 200
    )


def test_multiple_choice_allow_multiple(client):
    form = create_form(client)
    q = add_question(
        client,
        form["id"],
        "multiple_choice",
        "Many",
        required=True,
        settings={"allow_multiple": True},
    )
    set_options(client, q["id"], ["One", "Two", "Three"])
    form = publish(client, form["id"])
    full = client.get(f"/api/forms/{form['id']}").json()
    opts = full["questions"][-1]["options"]
    body = {"answers": [{"question_id": q["id"], "value": [opts[0]["id"], opts[2]["id"]]}]}
    assert client.post(f"/api/public/forms/{form['public_id']}/responses", json=body).status_code == 200


def test_short_text_max_length(client):
    form = create_form(client)
    q = add_question(client, form["id"], "short_text", "Short", required=True)
    form = publish(client, form["id"])
    body = {"answers": [{"question_id": q["id"], "value": "a" * 256}]}
    assert client.post(f"/api/public/forms/{form['public_id']}/responses", json=body).status_code == 422


def test_optional_empty_skipped(client):
    bundle = build_published_survey(client)
    mc_opts = bundle["questions"]["mc"]["options"]
    body = {
        "answers": [
            {"question_id": bundle["questions"]["text"]["id"], "value": "Eve"},
            {"question_id": bundle["questions"]["email"]["id"], "value": "eve@example.com"},
            {"question_id": bundle["questions"]["mc"]["id"], "value": mc_opts[0]["id"]},
        ]
    }
    r = client.post(f"/api/public/forms/{bundle['form']['public_id']}/responses", json=body)
    assert r.status_code == 200


def test_submit_draft_form_404(client):
    form = create_form(client)
    q = add_question(client, form["id"], "short_text", "Q", required=True)
    body = {"answers": [{"question_id": q["id"], "value": "x"}]}
    r = client.post(f"/api/public/forms/{form['public_id']}/responses", json=body)
    assert r.status_code == 404


def test_too_many_answers_rejected(client):
    bundle = build_published_survey(client)
    answers = [{"question_id": bundle["questions"]["text"]["id"], "value": "x"}] * 201
    r = client.post(
        f"/api/public/forms/{bundle['form']['public_id']}/responses",
        json={"answers": answers},
    )
    assert r.status_code == 422
    assert r.json()["error"]["code"] == "VALIDATION_ERROR"


def test_public_get_unknown_id(client):
    r = client.get("/api/public/forms/zzzzzzzzzz")
    assert r.status_code == 404


def test_start_on_unpublished_404(client):
    form = create_form(client)
    r = client.post(f"/api/public/forms/{form['public_id']}/responses/start")
    assert r.status_code == 404
