-- V6: approximate expenses (specs/approximate-expenses.md, BR-E6). Existing expenses become exact.

ALTER TABLE expense ADD COLUMN approximate BOOLEAN NOT NULL DEFAULT false;
