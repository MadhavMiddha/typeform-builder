PRAGMA foreign_keys = ON;

CREATE TABLE users (
  id INTEGER PRIMARY KEY,
  email VARCHAR(255) NOT NULL UNIQUE,
  name VARCHAR(255) NOT NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE forms (
  id INTEGER PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  public_id VARCHAR(10) NOT NULL UNIQUE,
  title VARCHAR(255) NOT NULL,
  status VARCHAR(20) NOT NULL CHECK (status IN ('draft', 'published')),
  welcome_title VARCHAR(255),
  welcome_description TEXT,
  welcome_button_label VARCHAR(100),
  thank_you_title VARCHAR(255),
  thank_you_message TEXT,
  theme TEXT,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  published_at DATETIME
);

CREATE TABLE questions (
  id INTEGER PRIMARY KEY,
  form_id INTEGER NOT NULL REFERENCES forms(id) ON DELETE CASCADE,
  position INTEGER NOT NULL,
  type VARCHAR(30) NOT NULL CHECK (type IN (
    'short_text', 'long_text', 'multiple_choice', 'dropdown',
    'email', 'number', 'yes_no', 'rating'
  )),
  title VARCHAR(500) NOT NULL,
  description TEXT,
  required BOOLEAN NOT NULL,
  settings TEXT,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX ix_questions_form_position ON questions(form_id, position);

CREATE TABLE question_options (
  id INTEGER PRIMARY KEY,
  question_id INTEGER NOT NULL REFERENCES questions(id) ON DELETE CASCADE,
  label VARCHAR(500) NOT NULL,
  position INTEGER NOT NULL
);
CREATE INDEX ix_question_options_question_position
  ON question_options(question_id, position);

CREATE TABLE question_logic (
  id INTEGER PRIMARY KEY,
  question_id INTEGER NOT NULL REFERENCES questions(id) ON DELETE CASCADE,
  operator VARCHAR(20) NOT NULL CHECK (
    operator IN ('equals', 'not_equals', 'contains', 'greater_than', 'less_than')
  ),
  value VARCHAR(500),
  jump_to_question_id INTEGER REFERENCES questions(id) ON DELETE SET NULL,
  jump_to_end BOOLEAN NOT NULL
);

CREATE TABLE responses (
  id INTEGER PRIMARY KEY,
  form_id INTEGER NOT NULL REFERENCES forms(id) ON DELETE CASCADE,
  status VARCHAR NOT NULL CHECK (status IN ('partial', 'completed')),
  started_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  submitted_at DATETIME,
  token VARCHAR(64) UNIQUE
);
CREATE INDEX ix_responses_form_submitted_at ON responses(form_id, submitted_at);

CREATE TABLE answers (
  id INTEGER PRIMARY KEY,
  response_id INTEGER NOT NULL REFERENCES responses(id) ON DELETE CASCADE,
  question_id INTEGER NOT NULL REFERENCES questions(id) ON DELETE CASCADE,
  value_text VARCHAR(5000),
  value_number FLOAT,
  value_bool BOOLEAN,
  CONSTRAINT uq_answers_response_question UNIQUE (response_id, question_id)
);
CREATE INDEX ix_answers_question_id ON answers(question_id);

CREATE TABLE answer_options (
  answer_id INTEGER NOT NULL REFERENCES answers(id) ON DELETE CASCADE,
  option_id INTEGER NOT NULL REFERENCES question_options(id) ON DELETE CASCADE,
  PRIMARY KEY (answer_id, option_id)
);
