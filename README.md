# Yousra

**Modest Shopping Made Easy**

A Next.js + TypeScript + Tailwind + shadcn/ui frontend for discovering modest fashion.

## Stack

- **Framework:** Next.js 16.4.6 (App Router)
- **Styling:** Tailwind CSS v4 + shadcn/ui
- **Hosting:** Vercel

## Getting Started

```bash
npm install
npm run dev
```

Open [http://localhost:3010](http://localhost:3010).


## Connected backend

This repository frontend is now connected to the Yousra backend in `src/`, exposed through `app/api/[...path]/route.js`. It uses the existing local `.env` for Supabase email/password accounts, live Serper discovery, Gemini image analysis, preferences, reactions, private collections and click tracking.

The active source is the Desktop `yousra ` folder. `npm run dev` starts the integrated Next.js application on port 3010. The earlier tester is retained under `public/tester.*` and `server.mjs` for legacy development, but is not used by the active application.

See `docs/GITHUB-INTEGRATION.md` for routes, validation and setup. `docs/API.md` remains the frontend-independent backend contract.

Checks: `npm test`, `npm run lint`, and `npm run build`. The full browser journey (`npm run test:browser`) requires the isolated sample-only server described in the integration notes; it refuses to create users against live Supabase.

## Claude search & image analysis (2026-11-16)

Serper + Gemini remain the defaults. To switch to Claude, set `ANTHROPIC_API_KEY` (server only) plus
`DISCOVERY_PROVIDER=claude` and/or `VISION_PROVIDER=claude`:

- **Discovery:** Claude (`CLAUDE_SEARCH_MODEL`, default `claude-haiku-5-5`) runs web search with the shopper's query
  and coverage needs, and returns individual product pages. Only URLs that the search actually returned are kept.
  Yousra then reads each retailer page for its photo, price and stock. Web search must be enabled for your
  organization in the Claude Console. Cost: about $0.01 per search (`CLAUDE_MAX_SEARCHES` per new query, cached
  for `SEARCH_TTL_HOURS`) plus very small token costs.
- **Image analysis:** with `VISION_PROVIDER=claude`, Claude reads the product photo and description.
- `DISCOVERY_PROVIDER=both` combines Claude's picks with Serper's images and indexed prices.
- Usage caps: `CLAUDE_SEARCH_DAILY_LIMIT/TOTAL_LIMIT`, `CLAUDE_VISION_DAILY_LIMIT/TOTAL_LIMIT`.

`/api/health` shows `discoveryProvider` and `visionProvider` so you can confirm which is live.

## Journey reviews

- `/feedback` — a seven-stop journey survey plus a "postcard" (overall feeling, coverage match, 0–10 recommend,
  loved / hard / wish, optional contact). Guests and signed-in users can submit.
- `/admin/reviews` — team dashboard with averages per stop, tags, NPS, every review and a CSV download.
  Add team emails to `ADMIN_EMAILS` (comma-separated) in Vercel, then redeploy.
- Reviews are stored in `records` with `kind='review'`. Run the end of `supabase/schema.sql` once to add the
  `journey_reviews` view for reading them in Supabase.

## Stock display

By default only listings the retailer confirmed sold out are hidden; unknown stock shows as "Unverified" on the
product page. `REQUIRE_VERIFIED_STOCK=true` restores strict mode (hides retailers that block automated checks).
