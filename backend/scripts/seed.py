"""
Idempotent seed script.

Usage:
    cd backend
    python -m scripts.seed

Running it twice must NOT duplicate data.
Fixed random seed = 42 for determinism.
"""
from __future__ import annotations

import json
import random
import sys
import os
from datetime import datetime, timedelta, timezone

# Allow running as `python -m scripts.seed` from backend/
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app.config import settings
from app.db import Base, SessionLocal, engine
from app.models import (
    Answer,
    AnswerOption,
    Form,
    Question,
    QuestionOption,
    Response,
    User,
)

RNG = random.Random(42)

NOW = datetime.now(timezone.utc)


def _now_minus(days: float) -> datetime:
    return NOW - timedelta(days=days)


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

def get_or_create_user(db) -> User:
    user = db.query(User).filter_by(email=settings.DEFAULT_USER_EMAIL).first()
    if not user:
        user = User(email=settings.DEFAULT_USER_EMAIL, name=settings.DEFAULT_USER_NAME)
        db.add(user)
        db.flush()
        print(f"  Created user: {user.email}")
    else:
        print(f"  User already exists: {user.email}")
    return user


def _nanoid(n: int = 10) -> str:
    alphabet = "0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ"
    return "".join(RNG.choice(alphabet) for _ in range(n))


def get_or_create_form(db, user_id: int, title: str, default_pub_id: str, **kwargs) -> Form:
    form = db.query(Form).filter_by(title=title).first()
    if not form:
        form = Form(user_id=user_id, public_id=default_pub_id, title=title, **kwargs)
        db.add(form)
        db.flush()
        print(f"  Created form: {title!r} [{form.public_id}]")
    else:
        print(f"  Form already exists: {title!r}")
    return form


def get_or_create_question(db, form_id: int, position: int, **kwargs) -> Question:
    q = db.query(Question).filter_by(form_id=form_id, position=position).first()
    if not q:
        q = Question(form_id=form_id, position=position, **kwargs)
        db.add(q)
        db.flush()
    else:
        # If existing question had empty or default title and kwargs provides a title, ensure it's populated
        if "title" in kwargs and kwargs["title"] and not q.title:
            q.title = kwargs["title"]
            db.flush()
    return q


def get_or_create_option(db, question_id: int, position: int, label: str) -> QuestionOption:
    opt = db.query(QuestionOption).filter_by(question_id=question_id, position=position).first()
    if not opt:
        opt = QuestionOption(question_id=question_id, label=label, position=position)
        db.add(opt)
        db.flush()
    return opt


# ---------------------------------------------------------------------------
# Form 1: Customer Feedback Survey (published, all 8 types, 25 responses)
# ---------------------------------------------------------------------------

def seed_form1(db, user_id: int) -> None:
    form = get_or_create_form(
        db,
        user_id=user_id,
        title="Customer Feedback Survey",
        default_pub_id="feedback001",
        status="published",
        welcome_title="We'd love your feedback!",
        welcome_description="This takes about 2 minutes. Your responses help us improve.",
        welcome_button_label="Start Survey",
        thank_you_title="Thank you!",
        thank_you_message="Your feedback means a lot to us.",
        theme=json.dumps({"primary": "#6366f1", "background": "#ffffff"}),
        created_at=_now_minus(14),
        updated_at=_now_minus(14),
        published_at=_now_minus(13),
    )
    form_id = form.id

    # Questions
    q1 = get_or_create_question(db, form_id, 1, type="short_text", title="What is your name?", required=True)
    q2 = get_or_create_question(db, form_id, 2, type="email", title="What is your email address?", required=True)
    q3 = get_or_create_question(db, form_id, 3, type="rating", title="How would you rate our service overall?", required=True, settings=json.dumps({"rating_max": 5}))
    q4 = get_or_create_question(db, form_id, 4, type="yes_no", title="Would you recommend us to a friend?", required=True)
    q5 = get_or_create_question(db, form_id, 5, type="multiple_choice", title="Which features do you use most?", required=False, settings=json.dumps({"allow_multiple": True}))
    q6 = get_or_create_question(db, form_id, 6, type="dropdown", title="How did you hear about us?", required=False)
    q7 = get_or_create_question(db, form_id, 7, type="number", title="How many times have you used our product this month?", required=False, settings=json.dumps({"number_min": 0, "number_max": 999}))
    q8 = get_or_create_question(db, form_id, 8, type="long_text", title="Any additional comments or suggestions?", required=False)

    # Options
    features_labels = ["Dashboard", "Analytics", "API access", "Mobile app", "Integrations"]
    f_opts = [get_or_create_option(db, q5.id, i + 1, lbl) for i, lbl in enumerate(features_labels)]

    source_labels = ["Google search", "Social media", "Friend referral", "Blog / article", "Advertisement"]
    s_opts = [get_or_create_option(db, q6.id, i + 1, lbl) for i, lbl in enumerate(source_labels)]

    db.flush()

    # Check existing response count
    existing = db.query(Response).filter_by(form_id=form_id).count()
    needed = 25 - existing
    if needed <= 0:
        print(f"  Form 1 already has {existing} responses, skipping.")
        return

    names = [
        "Alice Johnson", "Bob Smith", "Carol White", "David Brown", "Eve Davis",
        "Frank Miller", "Grace Wilson", "Henry Moore", "Irene Taylor", "Jack Anderson",
        "Kate Thomas", "Liam Jackson", "Mia Harris", "Noah Martin", "Olivia Thompson",
        "Paul Garcia", "Quinn Martinez", "Rachel Robinson", "Sam Clark", "Tina Lewis",
        "Uma Hall", "Victor Allen", "Wendy Young", "Xander King", "Yara Wright",
    ]
    comments = [
        "Great product, very intuitive!", "Could improve mobile experience.",
        "Love the analytics dashboard.", "API docs need work.",
        "Excellent customer support!", None, "Would love dark mode.",
        "Fast and reliable.", "Needs better onboarding.", None,
        "Very happy overall.", "Minor UI glitches sometimes.", None,
        "Best tool in its category!", "Good value for money.",
        "Integration with Slack would be amazing.", None,
        "Response times could be faster.", "Clean interface.",
        "Really enjoying it so far!", None,
        "Would like more export options.", "Great team behind this.",
        "Feature requests go unheard sometimes.", "Top notch!",
    ]

    for i in range(needed):
        abs_idx = existing + i
        day_offset = RNG.uniform(0, 13)
        started = _now_minus(day_offset)
        is_partial = abs_idx in {3, 11, 18}  # 3 partial responses
        submitted = None if is_partial else started + timedelta(minutes=RNG.randint(2, 15))

        resp = Response(
            form_id=form_id,
            status="partial" if is_partial else "completed",
            started_at=started,
            submitted_at=submitted,
        )
        db.add(resp)
        db.flush()

        def add_text(qid, val):
            if val is None:
                return
            a = Answer(response_id=resp.id, question_id=qid, value_text=val)
            db.add(a)
            db.flush()

        def add_number(qid, val):
            a = Answer(response_id=resp.id, question_id=qid, value_number=val)
            db.add(a)
            db.flush()

        def add_bool(qid, val):
            a = Answer(response_id=resp.id, question_id=qid, value_bool=val)
            db.add(a)
            db.flush()

        def add_options(qid, opt_ids):
            a = Answer(response_id=resp.id, question_id=qid)
            db.add(a)
            db.flush()
            for oid in opt_ids:
                db.add(AnswerOption(answer_id=a.id, option_id=oid))

        name = names[abs_idx % len(names)]
        email = name.lower().replace(" ", ".") + f"{abs_idx}@example.com"

        add_text(q1.id, name)
        add_text(q2.id, email)
        add_number(q3.id, float(RNG.randint(1, 5)))
        add_bool(q4.id, RNG.random() > 0.25)

        if not is_partial:
            chosen_features = RNG.sample(f_opts, k=RNG.randint(1, 3))
            add_options(q5.id, [o.id for o in chosen_features])
            add_options(q6.id, [RNG.choice(s_opts).id])
            add_number(q7.id, float(RNG.randint(0, 50)))
            comment = comments[abs_idx % len(comments)]
            if comment:
                add_text(q8.id, comment)

        db.flush()

    print(f"  Seeded {needed} responses for Form 1.")


# ---------------------------------------------------------------------------
# Form 2: Event Registration (published, 12 responses)
# ---------------------------------------------------------------------------

def seed_form2(db, user_id: int) -> None:
    form = get_or_create_form(
        db,
        user_id=user_id,
        title="Event Registration",
        default_pub_id="eventReg01",
        status="published",
        welcome_title="Register for our Annual Conference",
        welcome_description="Secure your spot at the biggest event of the year.",
        welcome_button_label="Register Now",
        thank_you_title="You're registered!",
        thank_you_message="We'll send a confirmation email shortly.",
        theme=json.dumps({"primary": "#0ea5e9", "background": "#f8fafc"}),
        created_at=_now_minus(10),
        updated_at=_now_minus(10),
        published_at=_now_minus(9),
    )
    form_id = form.id

    q1 = get_or_create_question(db, form_id, 1, type="short_text", title="Full name", required=True)
    q2 = get_or_create_question(db, form_id, 2, type="email", title="Work email", required=True)
    q3 = get_or_create_question(db, form_id, 3, type="dropdown", title="Which session are you attending?", required=True)
    q4 = get_or_create_question(db, form_id, 4, type="multiple_choice", title="Dietary requirements", required=False, settings=json.dumps({"allow_multiple": True}))
    q5 = get_or_create_question(db, form_id, 5, type="yes_no", title="Will you need accommodation?", required=True)
    q6 = get_or_create_question(db, form_id, 6, type="long_text", title="Any accessibility needs?", required=False)

    sessions = ["Morning Keynote (9am)", "Workshop A (11am)", "Workshop B (2pm)", "Evening Gala (6pm)"]
    sess_opts = [get_or_create_option(db, q3.id, i + 1, lbl) for i, lbl in enumerate(sessions)]

    diets = ["Vegetarian", "Vegan", "Gluten-free", "Halal", "No restriction"]
    diet_opts = [get_or_create_option(db, q4.id, i + 1, lbl) for i, lbl in enumerate(diets)]

    db.flush()

    existing = db.query(Response).filter_by(form_id=form_id).count()
    needed = 12 - existing
    if needed <= 0:
        print(f"  Form 2 already has {existing} responses, skipping.")
        return

    reg_names = [
        "Amy Chen", "Brian Fox", "Clara Diaz", "Derek Nam", "Elena Russo",
        "Finn O'Brien", "Gina Park", "Harry White", "Isla Green", "James Liu",
        "Karen Scott", "Leo Nguyen",
    ]

    for i in range(needed):
        abs_idx = existing + i
        day_offset = RNG.uniform(0, 9)
        started = _now_minus(day_offset)
        is_partial = abs_idx == 7  # 1 partial
        submitted = None if is_partial else started + timedelta(minutes=RNG.randint(1, 8))

        resp = Response(
            form_id=form_id,
            status="partial" if is_partial else "completed",
            started_at=started,
            submitted_at=submitted,
        )
        db.add(resp)
        db.flush()

        name = reg_names[abs_idx % len(reg_names)]
        email = name.lower().replace(" ", ".").replace("'", "") + f"@corp{abs_idx}.com"

        a1 = Answer(response_id=resp.id, question_id=q1.id, value_text=name)
        db.add(a1)
        a2 = Answer(response_id=resp.id, question_id=q2.id, value_text=email)
        db.add(a2)
        db.flush()

        if not is_partial:
            sess_ans = Answer(response_id=resp.id, question_id=q3.id)
            db.add(sess_ans)
            db.flush()
            db.add(AnswerOption(answer_id=sess_ans.id, option_id=RNG.choice(sess_opts).id))

            chosen_diets = RNG.sample(diet_opts, k=RNG.randint(1, 2))
            diet_ans = Answer(response_id=resp.id, question_id=q4.id)
            db.add(diet_ans)
            db.flush()
            for opt in chosen_diets:
                db.add(AnswerOption(answer_id=diet_ans.id, option_id=opt.id))

            db.add(Answer(response_id=resp.id, question_id=q5.id, value_bool=RNG.random() > 0.5))
            if RNG.random() > 0.7:
                db.add(Answer(response_id=resp.id, question_id=q6.id, value_text="Wheelchair accessible seating required."))

        db.flush()

    print(f"  Seeded {needed} responses for Form 2.")


# ---------------------------------------------------------------------------
# Form 3: Job Application (draft, 6 questions, no responses)
# ---------------------------------------------------------------------------

def seed_form3(db, user_id: int) -> None:
    form = get_or_create_form(
        db,
        user_id=user_id,
        title="Job Application",
        default_pub_id="jobapply1",
        status="draft",
        welcome_title="Apply to join our team",
        welcome_description="We're growing! Tell us about yourself.",
        welcome_button_label="Apply Now",
        thank_you_title="Application received!",
        thank_you_message="We'll be in touch within 5 business days.",
        theme=json.dumps({"primary": "#10b981", "background": "#f0fdf4"}),
        created_at=_now_minus(5),
        updated_at=_now_minus(2),
    )
    form_id = form.id

    get_or_create_question(db, form_id, 1, type="short_text", title="Full name", required=True)
    get_or_create_question(db, form_id, 2, type="email", title="Email address", required=True)
    get_or_create_question(db, form_id, 3, type="dropdown", title="Role you are applying for", required=True)
    q_role = db.query(Question).filter_by(form_id=form_id, position=3).first()
    for i, lbl in enumerate(["Software Engineer", "Product Manager", "Designer", "Marketing"]):
        get_or_create_option(db, q_role.id, i + 1, lbl)

    get_or_create_question(db, form_id, 4, type="number", title="Years of experience", required=True, settings=json.dumps({"number_min": 0, "number_max": 50}))
    get_or_create_question(db, form_id, 5, type="yes_no", title="Are you available to start immediately?", required=True)
    get_or_create_question(db, form_id, 6, type="long_text", title="Tell us about yourself", required=True)
    print("  Form 3 (Job Application) seeded – no responses (draft).")


# ---------------------------------------------------------------------------
# Main
# ---------------------------------------------------------------------------

def main() -> None:
    print("=== Seed script starting ===")
    # Ensure tables exist
    import app.models  # noqa: F401
    Base.metadata.create_all(bind=engine)

    db = SessionLocal()
    try:
        user = get_or_create_user(db)
        seed_form1(db, user.id)
        seed_form2(db, user.id)
        seed_form3(db, user.id)
        db.commit()
        print("=== Seed complete ===")
    except Exception:
        db.rollback()
        raise
    finally:
        db.close()


if __name__ == "__main__":
    main()
