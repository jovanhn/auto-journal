-- V5: planned expenses (specs/planned-expenses.md).

-- Owned by module: planning
CREATE TABLE planned_expense (
    id                UUID PRIMARY KEY,
    -- BR-V6: deleting a vehicle deletes its planned expenses (no module event).
    vehicle_id        UUID           NOT NULL REFERENCES vehicle (id) ON DELETE CASCADE,
    category          VARCHAR(20)    NOT NULL CHECK (category IN ('FUEL', 'SERVICE', 'REPAIRS', 'INSURANCE',
                                                                  'REGISTRATION_TAX', 'TIRES', 'PARKING_TOLLS', 'OTHER')),
    estimated_amount  NUMERIC(12, 2) NOT NULL CHECK (estimated_amount >= 0),
    currency          VARCHAR(3)     NOT NULL CHECK (currency IN ('EUR', 'RSD', 'USD')),
    due_date          DATE           NOT NULL,
    recurrence_months INTEGER CHECK (recurrence_months >= 1), -- null = one-time
    note              VARCHAR(500),
    created_at        TIMESTAMPTZ    NOT NULL
);

CREATE INDEX planned_expense_vehicle_due_idx ON planned_expense (vehicle_id, due_date);

ALTER TABLE planned_expense ENABLE ROW LEVEL SECURITY;
