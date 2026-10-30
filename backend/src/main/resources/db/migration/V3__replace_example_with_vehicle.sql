-- V3: vehicles (specs/vehicles.md). Removes the projects/tasks example scaffold (spec AC 11).

DROP TABLE task;
DROP TABLE project;

-- Owned by module: vehicles
CREATE TABLE vehicle (
    id                         UUID PRIMARY KEY,
    owner_id                   UUID           NOT NULL, -- user_profile.user_id (Supabase Auth user id)
    nickname                   VARCHAR(50)    NOT NULL,
    make                       VARCHAR(50)    NOT NULL,
    model                      VARCHAR(50)    NOT NULL,
    year                       INTEGER        NOT NULL CHECK (year >= 1900),
    plate                      VARCHAR(20),
    odometer_at_start          INTEGER        NOT NULL CHECK (odometer_at_start >= 0),
    purchase_price_amount      NUMERIC(12, 2) NOT NULL CHECK (purchase_price_amount >= 0),
    purchase_price_currency    VARCHAR(3)     NOT NULL CHECK (purchase_price_currency IN ('EUR', 'RSD', 'USD')),
    purchase_price_rate_to_eur NUMERIC(20, 16) NOT NULL, -- rate snapshot (BR-C4)
    purchase_date              DATE           NOT NULL,
    created_at                 TIMESTAMPTZ    NOT NULL
);

-- BR-V4: nickname is unique among one user's vehicles, case-insensitive.
CREATE UNIQUE INDEX vehicle_owner_nickname_lower_uk ON vehicle (owner_id, LOWER(nickname));

ALTER TABLE vehicle ENABLE ROW LEVEL SECURITY;
