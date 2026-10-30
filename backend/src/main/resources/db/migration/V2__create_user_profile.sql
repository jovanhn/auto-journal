-- V2: user profiles (specs/auth.md). Identity lives in Supabase Auth; only app data is stored here.

-- Owned by module: users
CREATE TABLE user_profile (
    user_id          UUID PRIMARY KEY, -- Supabase Auth user id (JWT `sub`)
    display_currency VARCHAR(3)  NOT NULL CHECK (display_currency IN ('EUR', 'RSD', 'USD')),
    created_at       TIMESTAMPTZ NOT NULL
);

ALTER TABLE user_profile ENABLE ROW LEVEL SECURITY;
