-- V1: initial schema. Applied migrations are never edited; add a new V<n>__*.sql instead.
-- All objects live in the `autojournal` schema (Flyway default schema; nothing in `public`).
-- Every table enables RLS with no policies: defense in depth. The backend connects as the table
-- owner and bypasses RLS; any other role (e.g. Supabase anon/authenticated) gets nothing.

-- Owned by module: projects
CREATE TABLE project (
    id          UUID PRIMARY KEY,
    name        VARCHAR(100)  NOT NULL,
    description VARCHAR(2000),
    created_at  TIMESTAMPTZ   NOT NULL
);

-- Business rule: project names are unique, case-insensitive.
CREATE UNIQUE INDEX project_name_lower_uk ON project (LOWER(name));

ALTER TABLE project ENABLE ROW LEVEL SECURITY;

-- Owned by module: tasks
CREATE TABLE task (
    id         UUID PRIMARY KEY,
    project_id UUID         NOT NULL REFERENCES project (id),
    title      VARCHAR(200) NOT NULL,
    status     VARCHAR(10)  NOT NULL CHECK (status IN ('OPEN', 'DONE')),
    created_at TIMESTAMPTZ  NOT NULL
);

CREATE INDEX task_project_id_idx ON task (project_id);

ALTER TABLE task ENABLE ROW LEVEL SECURITY;
