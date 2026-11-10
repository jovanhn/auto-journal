-- V7: journal (specs/journal.md, ADR 0020). Every journal entry has a `journal_entry` row; an expense also has
-- an `expense` row with the same id (its cost); a log entry has only the `journal_entry` row.
-- Existing expenses keep their ids and data.

-- Owned by module: expenses
CREATE TABLE journal_entry (
    id         UUID PRIMARY KEY,
    -- BR-V6: deleting a vehicle deletes its journal entries (no module event).
    vehicle_id UUID         NOT NULL REFERENCES vehicle (id) ON DELETE CASCADE,
    date       DATE         NOT NULL,
    odometer   INTEGER CHECK (odometer >= 0),
    note       VARCHAR(500),
    created_at TIMESTAMPTZ  NOT NULL
);

CREATE INDEX journal_entry_vehicle_date_idx ON journal_entry (vehicle_id, date);

ALTER TABLE journal_entry ENABLE ROW LEVEL SECURITY;

INSERT INTO journal_entry (id, vehicle_id, date, odometer, note, created_at)
SELECT id, vehicle_id, date, odometer, note, created_at
FROM expense;

-- Deleting a journal entry deletes its cost.
ALTER TABLE expense
    ADD CONSTRAINT expense_journal_entry_fk FOREIGN KEY (id) REFERENCES journal_entry (id) ON DELETE CASCADE;

DROP INDEX expense_vehicle_date_idx;

ALTER TABLE expense
    DROP COLUMN vehicle_id,
    DROP COLUMN date,
    DROP COLUMN odometer,
    DROP COLUMN note,
    DROP COLUMN created_at;
