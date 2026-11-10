-- V8: issues (specs/issues.md, ADR 0021). An issue is not a journal entry: it never counts in totals, insights,
-- the current odometer or distance (BR-IS2).

-- Owned by module: issues
CREATE TABLE issue (
    id          UUID PRIMARY KEY,
    -- BR-V6: deleting a vehicle deletes its issues (no module event).
    vehicle_id  UUID         NOT NULL REFERENCES vehicle (id) ON DELETE CASCADE,
    title       VARCHAR(60)  NOT NULL,
    severity    VARCHAR(20)  NOT NULL CHECK (severity IN ('WATCH', 'FIX_SOON', 'URGENT')),
    source      VARCHAR(20)  NOT NULL CHECK (source IN ('NOTICED', 'MECHANIC', 'WARNING_LIGHT')),
    noticed_on  DATE         NOT NULL,
    odometer    INTEGER CHECK (odometer >= 0),
    note        VARCHAR(500),
    outcome     VARCHAR(20) CHECK (outcome IN ('FIXED', 'GONE')),
    resolved_on DATE,
    created_at  TIMESTAMPTZ  NOT NULL,
    -- BR-IS3: open = both null, resolved = both set.
    CONSTRAINT issue_resolution_check CHECK ((outcome IS NULL) = (resolved_on IS NULL))
);

CREATE INDEX issue_vehicle_idx ON issue (vehicle_id);

ALTER TABLE issue ENABLE ROW LEVEL SECURITY;
