# Latest verification — feed, photos and recommendations

- 18 backend tests pass.
- Next.js production build includes `/products/[id]`.
- Updated desktop/mobile browser journey passes, including direct product reload and Back restoring search.
- Live scrolling grew the feed from 3 to 9 unique pieces; actual product photos rendered. A live search completed 12 discovery/analysis candidates and extracted prices on several items.
- Feed/image/recommendation details and remaining limits: `RECOMMENDATIONS.md`. New frontend endpoints and cursor semantics: `API.md`.
- Earlier status records below are historical. Supabase schema and email-only authentication have since been connected; email confirmation is disabled at the user's request. Google sign-in was removed. No paid services were enabled.

---

# Verified November 9, 2026

- 11 backend tests pass, including modern Supabase key headers and legacy fallback.
- Next.js 16.4.5 production build passes on Node 24.22.0. Dependency versions are pinned and package-lock.json is included.
- Chromium browser journey passes: local signup, 15 swipes, questionnaire, feed, like, private Likes collection, sample search, details, desktop and mobile. No page errors; no mobile horizontal overflow. Desktop/mobile screenshots were visually inspected.
- Fixed browser test navigation waits and the UI retaining Stop discovery after a completed search.
- Supabase Yousra project was found connected and healthy; public schema was empty. Migration confirmation expired, so no hosted schema changes were applied. Live RLS, auth and storage are NOT verified.
- Modern Supabase secret keys are now supported via SUPABASE_SECRET_KEY. API keys are not sent as bearer JWTs unless they are legacy JWT keys. Explicit user bearer tokens remain supported.
- Schema helper functions now use SECURITY INVOKER and remain callable only by service_role.
- Live Serper, Gemini, email/password confirmation, Google OAuth, deployed cookies and real Supabase click persistence remain unverified. Keys/account configuration are still required.
- No paid services, top-ups or public deployment were enabled.

The original starter validation below is historical and is superseded by this record where it differs.

---

# Validation record

## Passed in the build workspace

- `npm test`: **10 tests passed**, zero failures.
- Tests cover confident vs uncertain modesty matches, strict exclusions, layering, category rules, dislikes in feed vs search, explicit size/price filtering, learning signals, structured merchant extraction, natural-language price/category/color parsing, public-address restrictions and robots matching.
- The API journey covers account gating, signup, all 15 swipes, questionnaire completion, feed, likes/dislikes, collections, search history, tracked redirects, separate sample/real click counts, admin access restrictions, cross-user collection/job isolation, cross-origin mutation rejection, signout and signin.
- Simultaneous provider reservations honor their cap. Simultaneous collection writes preserve both saves.
- JavaScript syntax checks passed for the backend, standalone server and frontend test UI.
- A real HTTP-server smoke check passed for the HTML/CSS/JS assets, unauthorized feed rejection, signup/session cookies, completed onboarding, a 15-item feed, and a tracked 302 redirect.

## Not verified here

- Browser visual layout, swipe gestures and the browser smoke journey: Playwright is present in the environment but no Chromium browser executable is installed. A runnable script is included for local verification.
- Next.js installation/build: the environment blocks npm registry downloads; the plain-Node server runs independently. The Next API adapter and page are included, but the Next build must be checked on your machine after `npm install`.
- Live Supabase database schema execution, email delivery/confirmation, Google OAuth, refresh/revocation, and deployed session cookies: project credentials are not available.
- Live Serper discovery, retailer/image fetch coverage and Gemini classification: provider keys are not available. These are implemented integrations, not evidence of a successful live run.
- Affiliate attribution or purchases: affiliate accounts are not approved or connected yet. Original links work; sample clicks are excluded from traction.

The local test backend is working; completing the live acceptance sequence in `MONDAY.md` is required before describing the app as ready for real users.
