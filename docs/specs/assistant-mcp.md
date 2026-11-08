# Spec: Assistant access (MCP server for Claude)

## Status

Implemented — release **v4 (assistant)**. Code merged and deployed (PR #26); ADR
[0018](../adr/0018-mcp-server-and-oauth-for-assistants.md) Accepted (spike result recorded there). Supabase
steps S1–S3 done; AC 5 / B6 (connect from Claude with a real OAuth token) and the manual release checks 1–4
passed on 2026-11-07 (owner).

## Goal

Let a user connect autojournal to Claude (claude.ai, the desktop or mobile app, or Claude Code) as a
**custom connector**, then manage their cars from the chat. For example: paste a photo of the dashboard
and the fuel receipt and say "I just filled up the Golf". Claude reads the photos, finds the car and logs
the expense. The user can also ask questions ("what did the Golf cost me this year?") and get charts drawn
by Claude from the data. The backend exposes the user's existing data and operations as **MCP tools**. It
adds no new product behavior: the tools follow the same rules as the app.

The backend runs on Render's free plan, which sleeps after 15 minutes without traffic and takes about a
minute to wake up. The spec also adds a fast **status endpoint** and a **wake-up protocol** for clients
(wait 50 s, then retry).

Depends on: specs/auth.md, specs/vehicles.md, specs/expenses.md, specs/insights.md,
specs/planned-expenses.md (all Implemented).

## User stories

- As a user, I want to connect autojournal to Claude with my existing account, so that Claude can act on
  my data without me sharing a password or token.
- As a user, I want to paste a photo of the receipt and the dashboard and say "I just put gas in the car",
  so that the expense (amount, currency, date, odometer, note) is logged without typing.
- As a user, I want to add, change and delete vehicles and expenses by chatting, so that I can manage my
  cars when the app is not open.
- As a user, I want to ask about my costs and get a chart in the chat, so that I can explore my data in
  ways the app's fixed screens don't offer.
- As a user, I want Claude to tell me when the backend is waking up and retry by itself, so that a sleeping
  server doesn't look like a broken connector.

## How it works

```
Claude (claude.ai / app / Claude Code)            ← reads photos itself (vision), draws charts itself
   │  MCP over Streamable HTTP, Bearer token
   ▼
https://be-autojournal.skverly.com/mcp            ← Spring Boot backend (same app, same deploy)
   │  tools call each module's own services (same validation, ownership, currency rules)
   ▼
PostgreSQL (Supabase)

Sign-in (once, when the connector is added):
Claude ─▶ /.well-known/oauth-protected-resource (backend) ─▶ Supabase OAuth 2.1 server (authorize)
       ─▶ https://autojournal.skverly.com/oauth/consent (frontend: sign in + Approve)
       ─▶ Supabase issues an access token + refresh token to Claude ─▶ Claude calls /mcp with it
```

**Who does what in the "fuel receipt" story:**

| Step | Done by | Backend needs |
| ---- | ------- | ------------- |
| Read amount, currency, date, liters, station from the receipt; odometer from the dashboard photo | Claude (vision, in the chat) | nothing. Images never reach the backend (BR-A3) |
| Work out which car ("the Golf", or the only car) | Claude, using `list_vehicles` | read tool |
| Check that it is not already logged; check that the odometer is plausible | Claude, using `list_expenses` (current odometer is in `list_vehicles`) | read tools |
| Show the values and ask the user to confirm | Claude (the connector's tool approval, plus the tool description) | tool annotations and description |
| Save | `create_expense` | write tool, same rules as `POST /api/vehicles/{id}/expenses` |
| Report back ("Logged €52.40 Fuel for Golf, 184,320 km; 3rd fill-up this month") | Claude | the created `Expense` in the tool result |

No other agent, OCR service or image storage is needed. Any MCP client with vision works the same way.

## Business rules

New rules in [business-rules.md](../domain/business-rules.md#assistant-mcp) (Planned):

- BR-A1: An assistant acts only as the user who authorized it. Every tool applies the same ownership
  (BR-U2), validation and calculation rules as the matching API operation, with the same results.
- BR-A2: An assistant can do only what the user can do in the app. No tool adds behavior that has no
  API operation.
- BR-A3: autojournal never receives or stores images. The assistant extracts values from photos and
  sends only the expense fields (receipt photos stay out of scope).
- BR-A4: Write tools that delete data are marked destructive, so the client asks the user to confirm.

Existing rules that apply unchanged: BR-U1…U4, BR-C1…C6, BR-V1…V8, BR-E1…E5, BR-PL1…PL6, BR-I1…I6.

## Acceptance criteria

### Status endpoint and wake-up protocol

1. **Status when awake**
   - Given the backend is running
   - When anyone calls `GET /api/status` without a token
   - Then it responds 200 within 500 ms (server time) with `{ status: "UP", version, startedAt }`. It does
     not query the database, and it is allowed from the app's CORS origins.
2. **Wake-up protocol (documented for every client)**
   - Given a client calls `GET /api/status` with a 5 s timeout
   - When it gets a timeout, a connection error, a 502/503/504, or a response that is not the status JSON
     (for example Render's "waking up" page)
   - Then the client treats the backend as starting (the call itself triggers the wake-up), waits 50 s and
     checks again, at most 3 times (about 2.5 min), and then reports "autojournal is unavailable".
3. **Assistant follows the protocol**
   - Given a connected Claude conversation, and the backend has gone to sleep since the last tool call
   - When a tool call fails with a timeout, a connection error or a 5xx
   - Then Claude tells the user the server is waking up and retries after about 50 s, at most 3 times
     (the same protocol as AC 2), as instructed by the MCP server `instructions` and the tool descriptions.
     It does not report a
     data error.

### Connecting

4. **Discovery**
   - Given no token
   - When a client calls `POST /mcp`
   - Then the response is 401 with `WWW-Authenticate: Bearer resource_metadata="<backend>/.well-known/oauth-protected-resource"`,
     and that public document names the Supabase project's auth (`<SUPABASE_URL>/auth/v1`) as its
     authorization server.
5. **Authorize from Claude**
   - Given I add the connector URL `https://be-autojournal.skverly.com/mcp` in Claude
   - When Claude sends me to sign in
   - Then I land on `https://autojournal.skverly.com/oauth/consent`, where I sign in if needed. The page
     shows the client's name ("Claude"), my email and what it gets ("full access to your autojournal
     data"), with Approve and Deny buttons.
     - Approve: the page sends me back to Claude, and the connector shows as connected.
     - Deny: Claude reports that access was denied, and no token is issued.
6. **Consent page states**
   - The consent page shows a loading state while it fetches the authorization details. A missing,
     expired or invalid `authorization_id` shows an error message with a link to the app; nothing is
     approved.
7. **Token use**
   - Given a token Supabase issued to Claude (it carries `client_id`)
   - When Claude calls `/mcp`
   - Then the backend accepts it (same issuer, ES256 JWKS and `aud: authenticated` as app tokens). An
     expired or invalid token gets 401 (Claude refreshes it).

### Tools: read

8. **Tool list**
   - When an authorized client lists tools
   - Then it gets the tools in [API impact](#api-impact), each with a description, a JSON input schema,
     an output schema and annotations (`readOnlyHint` on reads, `destructiveHint` on deletes).
9. **Read my data**
   - Given my vehicles "Golf" and "Clio" with expenses, and planned expenses on "Golf"
   - When Claude calls `list_vehicles`, `get_garage_summary`, `list_expenses` (Golf, 2026),
     `get_vehicle_insights` (Golf, 2026), `list_planned_expenses` (Golf) and `list_next_due`
   - Then each result's `structuredContent` equals the JSON of the matching API operation for the same
     user and inputs (`Vehicle[]`, `ExpenseSummary`, `ExpenseYear`, `VehicleInsights`,
     `PlannedExpenseList`, next-due list). The text content is the same JSON. MCP requires structured
     content to be an object, so the two list operations are wrapped: `list_vehicles` →
     `{ vehicles: Vehicle[] }`, `list_next_due` → `{ items: NextDuePlannedExpense[] }`.
10. **Charts from data**
    - Given the read tools above
    - When I ask "show my monthly costs for the Golf this year as a chart"
    - Then Claude can draw it from `get_vehicle_insights.monthTotals` / `categories` without any other
      backend call. (This is a manual check: no backend chart rendering.)

### Tools: write

11. **Log fuel from photos (main flow, manual check)**
    - Given one vehicle "Golf" (current odometer 184,000, display currency EUR)
    - When I paste a receipt (52.40 EUR, 2026-11-07, 31.8 L) and a dashboard photo (184,320 km) and write
      "just put gas in"
    - Then Claude proposes Fuel · €52.40 · 2026-11-07 · 184,320 km · note "31.8 L", asks me to confirm, and
      calls `create_expense`. The expense appears in the app with these values, and the Golf's current
      odometer is 184,320.
12. **Create, update, delete expenses and vehicles**
    - When Claude calls `create_expense`, `update_expense`, `delete_expense`, `create_vehicle`,
      `update_vehicle` or `delete_vehicle` with valid input
    - Then the effect is identical to the matching API operation (BR-A1), including rate snapshots
      (BR-C4), the current odometer (BR-V5) and cascades (BR-V6). The result is the saved resource, or
      `{ deleted: true }`.
13. **Validation errors are tool errors**
    - When a write tool gets invalid input (future date, negative amount, unknown category, duplicate
      nickname, …)
    - Then the tool result has `isError: true` and lists the same field errors the API would return
      (400/409), so Claude can fix the input and retry. Nothing is saved.
14. **Planned expenses**
    - When Claude calls `pay_planned_expense`, `create_planned_expense`, `update_planned_expense` or
      `delete_planned_expense`
    - Then the effect is identical to the matching API operation (BR-PL2…PL4).
15. **Another user's data**
    - Given an id that belongs to another user, or does not exist
    - When any tool uses it
    - Then the tool returns `isError: true` with "not found", and nothing changes (BR-U2).

## Edge cases

- **Which car:** tools take ids, not nicknames. Claude calls `list_vehicles` and matches the nickname or
  make/model. With one vehicle it uses that one. If the match is ambiguous it asks the user.
- **Duplicates:** the same receipt pasted twice would create two expenses. The `create_expense`
  description tells Claude to check `list_expenses` for the same date, amount and category first and ask
  before creating a duplicate. The backend does not block duplicates (no such rule exists).
- **Odometer from the dashboard:** may be lower than the current odometer (BR-E4, allowed). Claude
  mentions it to the user but does not refuse. It may be missing (a photo of the receipt only), in which
  case it is left empty.
- **Liters, price per liter, station:** there is no field for them. Claude may put them in `note` (≤ 500
  characters, BR-E1). A real fuel-volume field would be a domain change (see open questions).
- **Currency:** taken from the receipt. If none is visible, the default is the display currency (BR-C2)
  and Claude says so.
- **Date:** the receipt date. If none, today. "Not in the future" uses the server's UTC date (BR-E2).
  Around midnight in Serbia (UTC+1/+2), a receipt can be "tomorrow" in UTC and gets a validation error;
  Claude then reports the field error (existing behavior, accepted).
- **Backend restarts:** the MCP server is **stateless** (no `Mcp-Session-Id` kept in memory), so a sleep or
  restart between two tool calls does not invalidate the client's session.
- **Token lifetime:** access tokens live 1 h (Supabase default); Claude refreshes them with the refresh
  token. Revoking: the user removes the connector in Claude. Grants can also be revoked in the Supabase
  dashboard (owner).
- **Sign-up:** a signed-out user on the consent page signs in first (Google or password); a new Google
  account becomes a new user (ADR 0019).
- **Token scope:** Supabase OAuth tokens are full-access user tokens with `aud: authenticated` (no
  RFC 8707 audience binding). A token issued to Claude also works on `/api/**`, and an app token works on
  `/mcp`. Accepted for a private app (ADR 0018).

## API impact

### Contract (`contracts/openapi.yaml`): non-breaking

- `GET /api/status` → 200 `ServiceStatus { status: "UP" (enum), version: string (commit sha or
  "local"), startedAt: date-time }` (`getStatus`, tag `system`), `security: []` (public). The `system`
  tag is implemented in `shared` (an open module with no tables). This deviates from "tag = module" in
  contracts/AGENTS.md and is noted in ADR 0018.
- No other contract change. The MCP endpoint and the OAuth metadata are not REST resources and stay
  outside the OpenAPI document, like `/actuator/health`. Tool input and output schemas reuse the
  generated contract models (`ExpenseRequest`, `VehicleRequest`, `PlannedExpenseRequest`,
  `PayPlannedExpenseRequest`/`ExpenseRequest`, `Expense`, `Vehicle`, …), so tools and API cannot drift.

### Non-contract HTTP endpoints (backend)

| Path | Auth | Purpose |
| ---- | ---- | ------- |
| `POST /mcp` (and `GET`/`DELETE` as the transport requires) | Bearer JWT | MCP Streamable HTTP, **stateless** mode |
| `GET /.well-known/oauth-protected-resource` (RFC 9728) | public | `{ resource: "<backend>/mcp", authorization_servers: ["<SUPABASE_URL>/auth/v1"], bearer_methods_supported: ["header"] }` |

### MCP tools (all in the user's display currency where the API is)

| Tool | Maps to (operationId) | Annotations |
| ---- | --------------------- | ----------- |
| `get_profile` | `getMe` | read-only |
| `update_profile` | `updateMe` (display currency) | — |
| `list_vehicles` | `listVehicles` | read-only |
| `create_vehicle` / `update_vehicle` | `createVehicle` / `updateVehicle` | — |
| `delete_vehicle` | `deleteVehicle` | destructive |
| `get_garage_summary` | `getExpenseSummary` | read-only |
| `list_expenses` (vehicleId, year?) | `listExpenses` | read-only |
| `create_expense` (vehicleId + `ExpenseRequest`) | `createExpense` | — |
| `update_expense` / `delete_expense` | `updateExpense` / `deleteExpense` | — / destructive |
| `get_vehicle_insights` (vehicleId, year?) | `getVehicleInsights` | read-only |
| `list_planned_expenses` (vehicleId) | `listPlannedExpenses` (incl. projection) | read-only |
| `list_next_due` | `listNextDuePlannedExpenses` | read-only |
| `create_planned_expense` / `update_planned_expense` | `createPlannedExpense` / `updatePlannedExpense` | — |
| `delete_planned_expense` | `deletePlannedExpense` | destructive |
| `pay_planned_expense` | `payPlannedExpense` | — |

Server `instructions` (sent at initialize) state: what autojournal is; the categories and currencies; "find
the vehicle id with `list_vehicles` first"; "confirm extracted values with the user before writing"; and
the wake-up rule (AC 3).

### What the backend must implement (validated against the current code)

| # | Item | Where | Why / note |
| - | ---- | ----- | ---------- |
| B1 | **MCP server dependency**: Spring AI MCP server starter for WebMVC (Streamable HTTP, stateless), with a version that supports Spring Boot 4.1 | `backend/pom.xml` | New dependency: ADR 0018. **Spike first:** confirm a Spring AI 2.x release works with Boot 4.1.2 and Kotlin. Fallback: the official MCP Java SDK's servlet transport, which Spring AI wraps. |
| B2 | **Tool classes per module**: `vehicles/internal/mcp`, `expenses/internal/mcp`, `planning/internal/mcp`, `users/internal/mcp`, next to the controllers. They call the module's own services and reuse its mappers to build contract models. | each module | Tools are another adapter, like controllers. No module `api` needs to grow, and Modulith boundaries stay as they are (verified by the existing `ModularityTests`). |
| B3 | **Error mapping**: the exceptions `GlobalExceptionHandler` maps (validation → 400, not found → 404, conflict → 409) become tool results with `isError: true` and the same field errors | `shared/mcp` | AC 13, 15. Bean validation must run on tool input as it does on `@Valid` request bodies (call the `Validator` explicitly). |
| B4 | **Current user in tools**: tools run in the request thread with the JWT in the `SecurityContext`, so `CurrentUser` works unchanged. **Verify** this in stateless mode. If the transport runs tools on another thread, propagate the context. | `shared/security` | BR-A1 |
| B5 | **Security**: `/mcp` authenticated by the existing resource server. Public: `/.well-known/oauth-protected-resource` and `/api/status`. The entry point adds `WWW-Authenticate: Bearer resource_metadata="…"` on 401. Prefer Spring Security's built-in protected-resource-metadata support if Boot 4.1 has it; otherwise a small controller. | `SecurityConfig`, `ProblemDetailAuthenticationEntryPoint` | AC 4, 7. CORS is not needed for `/mcp` (Claude calls it server to server). |
| B6 | **Token validation**: no change expected. The existing ES256/JWKS/issuer/`aud: authenticated` config accepts Supabase OAuth tokens. **Verify** with a real token in the spike (the project must sign with its ES256 key, not HS256). | `application.yml` | AC 7 |
| B7 | **Status endpoint** `GET /api/status`: no database access. `version` comes from an env var or build info (`APP_VERSION`, set to the image's commit sha in the Dockerfile `ARG`); `startedAt` from application start. | `shared` (`system` tag) | AC 1 |
| B8 | **Config**: `autojournal.mcp.resource-url` (default `http://localhost:8080/mcp`; prod `https://be-autojournal.skverly.com/mcp`) for the metadata. Env var `MCP_RESOURCE_URL`, which must be set on Render before the merge. | `application*.yml`, `.env.example`, operations.md | AGENTS.md deployment rule |
| B9 | **Tests**: integration tests with an MCP client (the SDK's client, or plain JSON-RPC over MockMvc) and the existing mock JWTs: tool list, each tool's result equals the API's, errors, ownership. Unit tests for the status endpoint. Modulith verification stays green. | backend tests | AC 1, 4, 7–9, 12–15 |
| B10 | **Memory**: the free instance has 512 MB. Measure heap and startup time after adding the starter; startup must stay under about 50 s, or the 50 s rule changes. **Measured (2026-11-07):** production cold starts were already 133–169 s before this spec (Render logs), so AC 3 was changed from "retry once" to "at most 3 retries" (owner decision). The image with MCP uses ~296 MB of 512 MB after startup under a 0.1 CPU limit. Faster startup is a separate topic. | ops check | wake-up protocol |

### Frontend and Supabase (needed, not backend)

| # | Item | Note |
| - | ---- | ---- |
| F1 | Route `/oauth/consent` (public): if not signed in, show the sign-in form and come back. Then call `supabase.auth.oauth.getAuthorizationDetails(authorization_id)` and show the client name, email and access; Approve/Deny call `approveAuthorization` / `denyAuthorization` and redirect to `redirect_url`. Loading, error and empty states (AC 5, 6); component tests. | Uses the existing `@supabase/supabase-js` (2.118.0). **Verify** that this version has `auth.oauth.*`; if not, upgrade the existing dependency (no new dependency). |
| S1 | Supabase dashboard (owner): Authentication → OAuth Server → enable; Authorization Path `/oauth/consent` (Site URL must be exactly `https://autojournal.skverly.com`: the consent redirect is `<Site URL>/oauth/consent`, so no `/**` wildcard there; wildcards belong in Redirect URLs). | Beta feature, no extra cost; OAuth users count as MAU. |
| S2 | Register the client: **pre-register** an OAuth app "Claude" with redirect URIs `https://claude.ai/api/mcp/auth_callback` and `https://claude.com/api/mcp/auth_callback`; the user enters its client id (and secret) in Claude's connector "Advanced settings". Dynamic client registration stays **off**. | Keeps registration closed, like sign-up. Open question Q2. |
| S3 | Confirm the project's JWT signing key is ES256 (asymmetric). The backend already relies on it. | B6 |
| D1 | Docs: a short "Use autojournal from Claude" guide (`docs/assistant.md`) covering connector URL, client id, the wake-up note and example prompts. Also update `operations.md` (endpoints, `MCP_RESOURCE_URL`), `architecture.md` (MCP adapter per module) and ADR 0018 → Accepted. | — |

## UI notes

- Only new screen: **OAuth consent** (`/oauth/consent`). It has no mock. Use the sign-in screen's layout
  and tokens: app logo, "Claude wants to access your autojournal", signed-in email, one line on what
  access means, primary **Approve** and secondary **Deny**. Mobile-first. States: loading (spinner),
  error (message + link to the Garage), signed out (sign-in form first).
- No change to existing screens.

## E2E

- none. The consent page needs a live Supabase `authorization_id`, which E2E cannot create without
  driving a real OAuth client. It is covered by component tests (mocked `supabase.auth.oauth`) and the
  manual checks below.

Manual release checks (recorded in the PR):

1. Add the connector in claude.ai, approve, see the tools.
2. AC 11 (fuel receipt with two photos).
3. AC 10 (chart).
4. After 20 min idle, ask a question and see the wake-up message and the retry (AC 3).

## Out of scope

- Storing receipt or dashboard images, OCR in the backend (BR-A3).
- MCP "Apps" (interactive UI rendered inside the chat), MCP resources and prompts. Tools only.
- Server-side charts. Claude draws them.
- A fuel volume / price-per-liter field, or fuel consumption figures (domain change, see Q4).
- A "Connected apps" screen to list or revoke grants in the app (revoke in Claude or Supabase).
- Keeping the backend warm (cron pings) or a paid Render plan (see Q1).
- Scoped or read-only tokens. Supabase has no custom scopes yet.
- Pagination of tool results (same as the API).

## Open questions (answer before coding)

Implemented with the spec's defaults: Q1 no keep-warm; Q2 pre-registered client, DCR off; Q3
`delete_vehicle` included, marked destructive; Q4 liters only in the note; Q5 not part of this spec. Q6 is
a manual check after the release.

1. **Keep-warm instead of only waiting?** Render gives 750 free hours/month, enough for one service 24/7
   (~744 h). A ping to `/api/status` every 10 min (for example a Cloudflare cron or an uptime monitor)
   would avoid most cold starts, but uses the whole free quota. The spec assumes **no keep-warm**, only
   the wake-up protocol.
2. **Pre-registered client (recommended) or dynamic client registration?** With DCR, any MCP client can
   register itself (users still have to sign in and approve). Pre-registration means one manual step when
   connecting.
3. **Allow `delete_vehicle` from chat?** It cascades to all expenses and plans (BR-V6). The spec includes
   it as destructive (Claude asks first). The alternative is leaving it to the app only.
4. **Fuel details:** should liters (and so price per liter and consumption) become real fields? Today they
   can only go in the note.
5. **Should the SPA also use `/api/status`** to show "waking up the server (~1 min)" instead of slow
   spinners? That is a small, separate frontend change, not part of this spec.
6. **Render behavior for non-browser clients:** Render shows browsers a loading page while waking up; for
   API clients it is not documented whether the request is held or answered with an error. The spike
   must measure what `curl` and Claude get after 15 min idle. AC 2 already handles both cases.
