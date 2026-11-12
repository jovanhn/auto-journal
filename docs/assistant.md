# Use autojournal from Claude

autojournal is an MCP server, so Claude (claude.ai and the desktop and mobile apps) can manage
your cars from a chat: log a fill-up from photos of the receipt and the dashboard, fix or delete expenses,
plan upcoming costs, and answer questions with charts. Claude uses the same rules as the app
(specs/assistant-mcp.md, ADR 0018).

## Connect

Done once per Claude account. The owner must have enabled Supabase's OAuth server and registered the
"Claude" OAuth app first ([operations.md](operations.md#supabase-oauth-server-assistants-adr-0018)).

1. In Claude: Settings → Connectors → **Add custom connector**.
2. URL: `https://be-autojournal.skverly.com/mcp`.
3. Advanced settings: enter the **client id** (and secret, if one was issued) of the "Claude" OAuth app.
4. Connect. Claude opens `https://autojournal.skverly.com/oauth/consent`. Sign in if asked, check that it
   says "Claude wants to access your autojournal", and press **Approve**. Claude then shows the connector
   as connected.

Claude Code signs in through a local callback URL, which the "Claude" OAuth app does not list. Using it
needs that redirect URI registered in Supabase first (owner).

Claude gets full access to your data (Supabase has no read-only scopes). To revoke it, remove the connector
in Claude; the owner can also revoke grants in the Supabase dashboard.

## The server may be asleep

The backend runs on Render's free plan and sleeps after 15 minutes without traffic. The first call after
that can time out while it starts (currently 2–3 minutes). Claude is told to say the server is waking up,
then wait about 50 seconds and retry, at most 3 times. If it still fails, ask again a minute later. Other clients can check
`GET https://be-autojournal.skverly.com/api/status` (public): wait 50 s after a timeout or 5xx, at most
3 times.

## Example prompts

- *(paste a photo of the fuel receipt and of the dashboard)* "I just filled up the Golf." Claude reads the
  amount, currency, date, liters and odometer, shows them, asks you to confirm, then logs a Fuel expense.
  Liters, price per liter and the station go into the note.
- "What did the Golf cost me this year? Show it per month as a chart." Claude draws the chart from
  `get_vehicle_insights`.
- "Which category costs me the most across all cars?"
- "Insurance for the Clio is due on 1 March, about 320 EUR, every year." Creates a planned expense.
- "I paid the Clio insurance today, 315 EUR." Marks the planned expense as paid.
- "Delete yesterday's parking expense." Claude asks you to confirm before deleting.

## Tools

| Tool | What it does |
| ---- | ------------ |
| `get_profile`, `update_profile` | Display currency |
| `list_vehicles`, `create_vehicle`, `update_vehicle`, `delete_vehicle` | Vehicles (delete removes all their expenses and plans) |
| `get_garage_summary` | This year's total across all cars |
| `list_expenses`, `create_expense`, `update_expense`, `delete_expense` | Expenses of a vehicle, per year |
| `get_vehicle_insights` | Year figures, monthly totals, categories, distance and cost per km (year and lifetime) |
| `get_vehicle_all_time_insights` | All-time totals, yearly totals, categories, cost per km |
| `list_planned_expenses`, `list_next_due`, `create_planned_expense`, `update_planned_expense`, `delete_planned_expense`, `pay_planned_expense` | Planned expenses and the 12-month projection |

Images never reach autojournal: Claude reads the photos and sends only the expense fields.
