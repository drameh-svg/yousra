# Frontend handoff

All paths below start with `/api`. Keep the frontend and API on the same origin. Requests use HttpOnly session cookies. For an independent authorized API client, a Supabase `Authorization: Bearer <access_token>` is also supported. Never put the service role key in a browser. Authenticated JSON responses use `Cache-Control: no-store`.

Mutations require `Content-Type: application/json`. Browser requests must have the configured `APP_ORIGIN`; set it to the actual frontend origin. Responses use `{error: "message"}` for errors, with HTTP 400/401/403/404/409/429/503 where appropriate. On 401 in Supabase mode, call `/auth/refresh` once, then retry or send the user to sign-in.

| Method | Path | Body / purpose |
| --- | --- | --- |
| GET | `/health` | Configuration status, no keys |
| POST | `/auth/signup` | `{email,password,newsletterOptIn?:boolean}`; may return `confirmationRequired:true` |
| POST | `/auth/signin` | `{email,password}` |
| POST | `/auth/refresh` | `{}`; refresh Supabase session cookies |
| POST | `/auth/signout` | `{}` |
| GET | `/me` | `{user,profile,localTest}` |
| GET | `/onboarding` | `{photos,required:15}`; requires account |
| PUT | `/profile` | `{preferences,swipes?,styleVotes?,completeOnboarding?}` |
| GET | `/feed` | Create a personalized feed session; accepts filters and `limit` |
| GET | `/feed/:feedId` | Read the next stable page with `offset` and `limit`; owner only |
| POST | `/feed/:feedId/advance` | `{}`; discover/analyze the next batch, returning the requested page |
| GET | `/products/:id/image` | Authenticated image delivery; optional `index=0..5` |
| POST | `/search` | `{query,filters?,preferences?}`; optional preferences override for this search only |
| GET | `/search/:jobId` | Read job/results, `offset`, `limit`; owner only |
| POST | `/search/:jobId/advance` | `{}`; perform the next discovery/analysis batch |
| GET | `/search/suggestions` | `{recent,suggested,trending:[]}` |
| GET | `/products/:id` | `{product,reaction,similar}` |
| POST | `/products/:id/reaction` | `{action:"like"\|"dislike"\|"clear"}` |
| GET | `/products/:id/outbound?surface=card` | Tracked HTTP 302 to original / affiliate URL |
| GET | `/products/:id/outbound?surface=detail` | Same tracking, different placement |
| GET | `/reactions` | `{reactions:{[productId]:{liked,disliked,clicks}}}` |
| GET | `/collections` | `{collections}`; private to this user |
| POST | `/collections` | `{name}` |
| GET | `/collections/:id` | `{collection,items}` |
| PATCH | `/collections/:id` | `{name?}` or `{productId,remove?:true}` |
| DELETE | `/collections/:id` | `{}`; Likes cannot be deleted |
| GET | `/metrics` | This account's own activity counts |
| GET | `/admin/metrics` | Brand aggregates and provider counters; allowlisted user IDs only |

Use reactions, not direct collection writes, to modify Likes. System ID `likes` is scoped per user. Dislike / clear removes a piece from Likes. Dislike does not erase a user's other custom collection saves. Preferences are updated explicitly; feed ranking re-evaluates them on each fetch.

## Preferences object

```json
{
  "styles": ["minimal", "casual"],
  "colors": ["black", "blue"],
  "sizes": ["m"],
  "excludedBrands": [],
  "budgetMax": null,
  "pantsAllowed": true,
  "allowLayering": false,
  "destination": "US",
  "rules": {
    "dress": {
      "sleeves": "long",
      "neckline": "high",
      "length": "maxi",
      "fit": "loose",
      "transparency": "opaque",
      "slits": "none",
      "cutouts": "none"
    }
  }
}
```

Other categories: `skirt`, `pants`, `top`, `outerwear`. Omitted category fields default to `any`. Send the complete object when editing; partial preference fields are not merged. Sleeve and neckline rules do not apply to skirts or pants.

| Field | Values, from less to more coverage / looseness |
| --- | --- |
| `sleeves` | `any`, `sleeveless`, `short`, `elbow`, `long` |
| `neckline` | `any`, `open`, `medium`, `high` |
| `length` | `any`, `mini`, `knee`, `midi`, `maxi` |
| `fit` | `any`, `fitted`, `regular`, `loose`, `wide` |
| `transparency` | `any`, `opaque` |
| `slits`, `cutouts` | `any`, `none` |

These are minimums: e.g. `short` permits longer sleeves. This interpretation should appear clearly in your friend's UI. In product attributes, `unknown`, `sheer`, or `present` can also occur.

Complete onboarding using all 15 distinct swipe IDs:

```js
await fetch('/api/profile', {
  method: 'PUT',
  headers: {'Content-Type': 'application/json'},
  body: JSON.stringify({
    preferences,
    swipes: photos.map(p => ({id:p.id, like:answers[p.id]})),
    completeOnboarding:true
  })
});
```

## Filter object / feed parameters

`style`, `color`, `size`, `category`, `minPrice`, `maxPrice`, `shipping`. Use `shipping=confirmed` to require explicit US-shipping evidence; otherwise unknown delivery is permitted and shown as unverified. Price filters require known USD prices; size filters require an extracted size. They never guess that an unknown product satisfies the filter.

## Progressive search

```js
let result = await request('/api/search', 'POST', {
  query: 'light blue maxi dress for the beach under $50',
  filters: {},
  // preferences: optionalFullPreferencesForThisSearch
});
render(result.items); // Cached matching products can appear immediately.
while (result.canAdvance) {
  result = await request(`/api/search/${result.jobId}/advance`, 'POST', {});
  render(result.items); // Replace this page's results as analysis changes ranking.
}
```

`result` contains `items`, `total`, `nextOffset`, `jobId`, `status`, `phase`, `processed`, `discovered`, `canAdvance`, `warnings`, and `demo`. Statuses: `pending`, `running`, `complete`, `error`. If another request is already processing a job, `running` may be returned; poll with a short delay. A stale lock can be retried after 90 seconds. Once stopped, a search can be resumed by advancing its owned job. Do not call `advance` concurrently from the same UI.

The first advance performs discovery, subsequent advances analyze two candidates each. There are no in-memory background tasks that disappear on a serverless freeze. Errors keep whatever results already exist and return a warning. Paginate a job's results with `GET /search/:jobId?offset=24&limit=24`; rank order can change while analysis is running, so wait for completion before infinite scrolling.

## Product card contract

`id`, `title`, `description`, `store`, `brand`, `url`, `sourceUrl`, `image`, `images`, `price:number|null`, `currency:string|null`, `sizes`, `shippingUS:yes|no|unknown`, `availability`, `category`, `styles`, `colors`, `attributes`, `evidence`, `analysisSource`, `confidence`, timestamps, `demo`, `affiliate`, `shopPath`, and (in ranked results) `match`.

Use `shopPath + '?surface=card'` on card links and `'?surface=detail'` on detail links. Opening `sourceUrl` directly bypasses click logging. Use normal anchors with `target="_blank" rel="noopener noreferrer"`; do not prefetch shop links or create automatic redirects, since those would produce misleading clicks.

`match.uncertain` signals lower-confidence coverage. Similar products obey the user's current profile modesty preferences. Product detail is readable for any known catalog product, including a previously saved piece that now falls outside their rules.

## Email accounts and optional newsletter

Google sign-in is removed. Email confirmation is disabled in the current project. Signup stores the account email in Supabase Auth. The optional `newsletterOptIn` boolean defaults to false; a server-only `newsletter` record stores the email, choice, timestamp and displayed consent text. Sign-in does not change this choice. No newsletter sending or mailing-list provider is connected.

## Continuous For You feed (current contract)

`GET /feed` starts a new session and returns `feedId`, `items`, `total`, `nextOffset`, `cursorEnd`, `canDiscover`, `busy`, `excludedIds`, `warnings`, and `demo`.

1. Render the initial items. Observe an end-of-grid sentinel for automatic scrolling.
2. When `nextOffset` is non-null, read `GET /feed/:feedId?offset=nextOffset`.
3. At the end of known items, when `canDiscover` is true, call `POST /feed/:feedId/advance?offset=cursorEnd` with `{}`. Reuse the returned `cursorEnd`, even if the batch has no visible matches yet. Discovery and analysis can require several sequential advances.
4. Remove `excludedIds` from the existing view; subsequent analysis or changed rules can make an item ineligible. Append new items by ID without duplicates. Offsets refer to the session's stable sequence, not the count of currently visible cards.
5. Never advance the same session concurrently. For `busy:true`, wait before retrying. Stop when `canDiscover` is false and there is no next page. Display warnings; do not loop on quota failures.

New sessions re-rank using the latest profile and interactions. The existing session keeps an append-only ID sequence so scrolling does not repeat or reshuffle known pages. Current restrictions are rechecked on every response. Eligible newly discovered items are ranked before being appended. Previously displayed uncertain pieces can be removed by later analysis. This is a finite external index with usage limits, not a promise of infinite inventory.

Product photos and names should link to `/products/:id` in the current tab. The standalone server and Next.js both support direct loading and reloading of that route. The temporary interface stores browse state for browser Back. Keep the separate `shopPath?surface=card|detail` links for tracked retailer shopping.

Use returned `image`/`images` paths. For real products these point to the authenticated image endpoint, which tries the source image and its indexed thumbnail. It never accepts a user-supplied URL. If all images fail, display an honest placeholder. Photos come from the retailer metadata or the search index, never generated images or substituted clothing.

## Active repository frontend

The Next.js UI from `drameh-svg/yousra` now connects through `lib/api.ts` and `SessionProvider`. It runs on the same origin as the backend. `/`, `/explore`, `/saved`, `/profile`, `/search`, `/search/results`, `/category/:slug` and `/products/:id` are working routes. `/product/:slug` is an alias for the existing product ID route. Bookmarks use a regular private collection named Saved; the heart continues to manage the system Likes collection. The frontend does not use the repository's hard-coded sample listings as real inventory.


### Short adaptive onboarding (current frontend)
The current onboarding sends `PUT /api/profile` with explicit `preferences`,
`styleVotes: [{id, like}]` (zero to five unique curated product IDs), and
`completeOnboarding: true`. Zero choices supports skipping the optional examples.
The original fifteen-photo `swipes` contract remains supported for the legacy UI.
Style answers influence taste; coverage comes from explicit preferences.
Curated product IDs are recognized for account-owned reactions and collections.
Guests keep bookmarks and reactions in browser storage; these do not automatically
migrate to an account. Live product IDs continue to use backend product pages.

Validation on 2026-11-11: 20 backend tests, lint and production build passed.
Browser checks covered five unique style choices, style-specific feed results,
optional searchable brands, guest save/detail consistency, account save/like
persistence, account onboarding persistence, and desktop/mobile grid widths.
Live Supabase create/read/update/delete and Auth settings checks passed; no fresh
Serper or Gemini inference calls were made during this validation.


### Homepage live discovery
The homepage now reads `/api/feed` and appends paginated products, then calls
`POST /api/feed/:id/advance` automatically as the scroll sentinel approaches.
It uses account-owned preferences, reactions and saved references. Style pills
create a filtered feed; search submits to the live search-results route.
Account creation and the shorter optional-example onboarding precede live discovery.
The homepage no longer renders the curated reference array as its product feed.
Existing provider daily/total caps are unchanged; warnings and cached products stay
visible when fresh discovery is paused. A manual More pieces button provides a
fallback when automatic observation is unavailable.

Validation: production build, lint and 20 backend tests passed. Browser scrolling
expanded 24 to 62 products with simulated external providers and the real feed API,
without duplicate IDs or moving earlier cards. One real-provider verification used
3 Serper calls and 2 Gemini calls, grew eligible matches from 28 to 37, returned no
warnings, and removed its temporary feed record afterward.


### Verified prices and preference priority — 2026-11-13
- `POST /api/products/:id/price` refreshes retailer/indexed pricing. It requires the
  same authenticated/onboarded account and CSRF protection as other product actions.
- Product responses can include `priceSource`, `priceCheckedAt`, `priceFrom`,
  `priceRange` and `priceNote`. Variant ranges render as “From”, never an exact selected price.
- Parse all primary-product offers, non-membership price specifications, alternate
  meta tags and unambiguous microdata. Shopify public product JSON uses cents and
  an explicitly identified currency. Exact-product index fallback uses existing Serper limits.
- Card checks are limited to six automatic visible unknowns per browser session,
  serialized; opened details can refresh independently. Pages render before refresh.
- Successful price checks cache for six hours; failed checks for thirty minutes.
  Do not overwrite a verified old price with a guessed value or mark a failed refresh fresh.
- `preferences.preferredBrands` and optional `coveragePreset` are validated and stored.
  The main Profile page now writes preferences to the backend, not just local storage.
- Chosen styles/colors/brands and interaction similarity meaningfully influence the
  top of both search and feed; coverage, budget and other explicit exclusions stay hard filters.
- Existing device-only settings can be loaded explicitly in Profile and saved to the account.

Validation: 36 tests, lint and production build passed. Browser checks proved visible
price recovery, backend preference persistence and recommendation order changing after
Profile edits and reload. A real retailer-only refresh recovered 16 missing prices from
20 checked listings. The referenced Amazon product remained unavailable from exact
price sources; no value was invented. No paid billing or provider caps were increased.
