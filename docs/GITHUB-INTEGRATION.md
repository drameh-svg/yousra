# Repository frontend integration

The active project is `/Users/amaniziane/Desktop/yousra ` (including the trailing space in the directory name).

Repository: https://github.com/drameh-svg/yousra
Base commit: 208622f3556737a49d9445e182e5ad7a54617519 (`main`).
Git origin uses HTTPS because the computer's SSH key was rejected. All repository-tracked files were copied into Desktop, and its `.git` history is installed there. Integration changes are local and have not been committed or pushed.

## Frontend source

The repository's Next.js/TypeScript frontend is the active application. It uses the original global stylesheet, cream/stone palette, Inter font, top navigation, hero, aesthetic filters, card shapes and shared UI components. Added screens and controls follow those components and styles.

The repository's `lib/products.ts` sample definitions remain in source, but the active feed and search use the backend API. Sample catalog prices from that frontend are not imported as verified live facts.

The earlier standalone tester remains available only as a legacy development tool. The production/home/product routes do not embed it or use an iframe.

## Connected features

- Email/password accounts, optional newsletter choice, and account-required browsing.
- Fifteen onboarding swipes followed by category-specific coverage, size, budget, color and style preferences.
- Personalized For You with progressive external discovery and stable feed cursors.
- Search results, aesthetics and advanced filters, temporary search-only coverage overrides.
- Existing persistent like/dislike signals and a default private Saved collection for bookmarks.
- Private collection creation, selection, rename, removal and deletion; default Likes remains synchronized.
- Dedicated product routes, photos, known/unknown facts, similar eligible products and tracked shopping links.
- Profile preference editing, email display and signout.
- Working Explore, category and mobile navigation routes. No invented trending or spotlight-brand data.

## Run

Node 24 or newer is required.

- `npm ci`
- `npm run dev` → http://localhost:3010
- `npm run build` → production build
- `npm start` → production server on port 3010
- `npm test` → 18 backend regression checks
- `npm run lint` → Next.js/React/TypeScript checks

The existing `.env` remains local, with the configured Supabase, Serper and Gemini credentials. No server credential was placed in client code. `.env`, local databases, dependencies and test screenshots are ignored by Git. Production requires Supabase auth/storage and the final HTTPS APP_ORIGIN. Google sign-in remains removed; email confirmation remains disabled in Supabase at the user's request.

## Verification

- Production build and TypeScript check pass with the integrated frontend.
- React/Next lint passes.
- All 18 backend tests pass.
- Production dependencies: `npm audit --omit=dev` reports zero vulnerabilities. The repository's shadcn generator is retained as a development dependency.
- Built client assets were scanned against the configured server/provider keys: no secret values found.
- Disposable local production-mode browser test passes: account gating, email signup, 15 swipes, preference completion, feed, persistent likes/bookmarks, collection create/rename/delete, product direct reload, sample click logging, search, strict price filters, Back navigation, saved profile, Explore/category, mobile menu and signout/signin. No page errors.
- Browser testing uses AUTH_MODE=local, STORAGE=local, empty provider keys and an isolated `/tmp` SQLite database on port 3012. Its events are sample events, not real traction.
- The live preview uses Supabase and live discovery. The existing signed-in account, personalized products and authenticated product photos were observed in the repository design.

The browser test caught and fixed cache contamination between filter combinations. Cached results are now bound to account, profile version, query, filters and temporary preferences; old-filter cards are hidden while a new response is loading.

## Remaining limits

External discovery and image analysis still depend on index coverage, retailer access and free provider caps. Unknown stock, shipping, sizes and prices remain unknown. A retailer can withdraw an image, in which case the existing image endpoint tries its indexed fallback and the card displays an honest placeholder if both fail. No new paid services were enabled. No public deployment was made.
