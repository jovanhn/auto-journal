# 0014. Multi-currency amounts with fixed exchange rates from configuration

- **Status:** Proposed
- **Date:** 2026-10-25

## Context

Users pay car costs in EUR, RSD and USD and want totals in one currency of their choice (domain BR-C1…C6).
Live exchange rates would add an external integration and scheduling that the product doesn't need yet.

## Decision

- Supported currencies: `EUR`, `RSD`, `USD`. Every amount is stored as `numeric(12,2)` plus its currency.
- Exchange rates live in **application configuration** (Spring `@ConfigurationProperties`, overridable by
  env vars), one rate per currency against the base currency `EUR`. No table, no admin UI.
- Real money already spent (expenses, purchase price) stores a **rate snapshot** (`rate_to_eur`) when saved,
  so later rate changes don't rewrite history. Estimates (planned expenses) use the current rates.
- Conversion happens in the backend; the API returns totals in the requested display currency. The frontend
  never converts.

## Consequences

- Changing rates is a config change + redeploy, which is acceptable while rates are fixed.
- A later refresh (scheduled or triggered) can replace the config source without changing stored data,
  since snapshots are already in place.
- Adding a currency means updating the contract enum, config and a migration for the DB enum/check.

## Alternatives considered

- **Single currency** — simplest, but doesn't match how users pay.
- **Rates table editable at runtime** — more moving parts with no current need.
- **Live rates from an external API** — new dependency and failure mode; postponed.
