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
