-- V4: expenses (specs/expenses.md).

-- Owned by module: expenses
CREATE TABLE expense (
    id          UUID PRIMARY KEY,
    -- BR-V6: deleting a vehicle deletes its expenses (no module event).
    vehicle_id  UUID            NOT NULL REFERENCES vehicle (id) ON DELETE CASCADE,
    date        DATE            NOT NULL,
    amount      NUMERIC(12, 2)  NOT NULL CHECK (amount >= 0),
    currency    VARCHAR(3)      NOT NULL CHECK (currency IN ('EUR', 'RSD', 'USD')),
    rate_to_eur NUMERIC(20, 16) NOT NULL, -- rate snapshot (BR-C4)
    category    VARCHAR(20)     NOT NULL CHECK (category IN ('FUEL', 'SERVICE', 'REPAIRS', 'INSURANCE',
                                                             'REGISTRATION_TAX', 'TIRES', 'PARKING_TOLLS', 'OTHER')),
    odometer    INTEGER CHECK (odometer >= 0),
    note        VARCHAR(500),
    created_at  TIMESTAMPTZ     NOT NULL
);

CREATE INDEX expense_vehicle_date_idx ON expense (vehicle_id, date);

ALTER TABLE expense ENABLE ROW LEVEL SECURITY;
