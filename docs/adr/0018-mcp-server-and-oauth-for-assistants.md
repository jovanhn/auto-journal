# 0018. MCP server in the backend, Supabase OAuth 2.1 for assistants

- **Status:** Accepted
- **Date:** 2026-11-07

## Context

specs/assistant-mcp.md lets a user connect Claude (claude.ai or the desktop, mobile and Code apps) to autojournal as a
custom connector. The user then manages vehicles and expenses from the chat: logging fuel from receipt and
dashboard photos, and asking for figures that Claude draws as charts. Claude connects to **remote MCP
servers** over Streamable HTTP and authorizes with **OAuth 2.1** (protected resource metadata RFC 9728,
authorization server metadata, PKCE). It supports dynamic client registration, or a client id/secret
entered by the user. Its callback URLs are `https://claude.ai/api/mcp/auth_callback` and
`https://claude.com/api/mcp/auth_callback`.

Constraints:

- Identity lives in Supabase Auth (ADR 0013, 0015), with closed sign-up.
- The backend validates ES256 Supabase JWTs.
- The backend runs on Render's free plan: it sleeps after 15 min idle, wakes in about a minute, and has
  512 MB.
- No new dependency is allowed without an ADR.

## Decision

1. **The MCP server is part of the backend** at `/mcp`: Streamable HTTP in **stateless** mode, so a
   sleep or restart loses no session.
   - New dependencies (spike result): **`org.springframework.ai:mcp-spring-webmvc` 2.0.2** (Spring AI's
     WebMVC stateless transport, built against Boot 4.1.2; a `RouterFunction`, so MockMvc tests it) and
     **`io.modelcontextprotocol.sdk:mcp-json-jackson3` 2.1.0** (the official MCP Java SDK core with Jackson 3).
     They bring `reactor-core` and the networknt JSON Schema validator. **Not** the Spring AI MCP server
     *starter*: it pulls in `spring-ai-model` (Jackson 2, ANTLR, StringTemplate, victools) that the 512 MB
     instance does not need, and its annotation-generated schemas would not come from the contract.
   - The server is built by hand in `shared/mcp` (`McpServer.sync(...)`, `immediateExecution`, so tools run
     on the request thread and `CurrentUser` works unchanged). Tool JSON Schemas are converted at startup
     from `contracts/openapi.yaml`, which the build puts on the classpath.
2. **Tools are adapters inside the owning module** (`<module>/internal/mcp`), like controllers. They call
   the module's own services and reuse its mappers and the generated contract models for input and
   output. They never call another module's internals. Cross-cutting MCP support (error mapping,
   transport and security config) lives in `shared`.
3. **Authorization uses Supabase Auth's OAuth 2.1 server** (beta, no extra cost):
   - The backend publishes `/.well-known/oauth-protected-resource`, pointing to
     `<SUPABASE_URL>/auth/v1`, and returns `WWW-Authenticate: Bearer resource_metadata=…` on 401. Spring
     Security 7.1's built-in protected resource metadata filter serves it (customized with
     `MCP_RESOURCE_URL`); no extra controller.
   - The frontend hosts the consent page `/oauth/consent`, which uses the existing
     `@supabase/supabase-js` `auth.oauth.*` methods.
   - The Claude client is **pre-registered** in Supabase; dynamic client registration stays off unless
     the spec's open question decides otherwise.
   - Issued tokens are standard Supabase user JWTs (same issuer and JWKS, `aud: authenticated`, plus
     `client_id`), so the existing resource-server configuration validates them unchanged.
4. **A public `GET /api/status`** (no database, tag `system`, implemented in `shared`) plus a documented
   **wake-up protocol**: timeout or 5xx → wait 50 s → retry, at most 3 times. Clients use it, and the MCP
   server instructions tell assistants to follow it. The `system` tag is the one exception to "tag =
   owning module" (contracts/AGENTS.md), because `shared` owns no business data.

## Consequences

- Every existing rule applies to assistants for free: tools call the same services, so ownership,
  validation, rate snapshots and odometer logic stay identical. Tools and API share contract models, so
  they cannot drift.
- New attack surface: `/mcp` and the OAuth flow. Tokens are full-access user tokens (Supabase has no
  custom scopes and no RFC 8707 audience binding yet), so a token issued to Claude also works on `/api`.
  Accepted for a private single-user app. Revisit when Supabase supports audiences or scopes.
- Depends on a Supabase **beta** feature. If it changes, the consent page and possibly the metadata change.
- New env var `MCP_RESOURCE_URL`, which must be set on Render before the merge. Supabase dashboard
  settings (OAuth Server, authorization path, OAuth app) are owner steps, documented in operations.md.
- Measured at implementation: cold starts already took 133–169 s before this change, so assistants retry
  up to 3 times (about 2.5 min) instead of once; memory after startup is ~296 MB of 512 MB.
- Cold starts still hurt: the first call after 15 min idle waits 2–3 minutes. Faster startup, keep-warm
  pings or a paid plan are a separate decision.

## Alternatives considered

- **Separate MCP server (TypeScript on a Cloudflare Worker) calling the REST API.** It is always warm, so
  it could answer "waking up, retry in 50 s" itself. But it is a third deployable, with a new language
  runtime and SDK, no agent access to Cloudflare, and duplicated input schemas. Rejected for now. It is
  the fallback if cold starts make the in-backend server unusable.
- **One `mcp` module calling every module's `api` package.** Every module's public API would have to grow
  to mirror its controllers, adding a lot of interface code for no boundary benefit. Tools as per-module
  adapters keep the APIs small.
- **Own OAuth authorization server (Spring Authorization Server).** A new framework and token store, and a
  second identity system next to Supabase. Rejected.
- **Personal access tokens pasted into the connector.** Simpler, but Claude's custom connectors support
  OAuth or no auth, not static bearer tokens. A no-auth server is not acceptable.
- **Upload images to the backend for OCR.** Claude already reads images in the chat. Storing receipts is
  out of scope (AGENTS.md).
