# Recommendations, discovery and navigation — November 9, 2026

## Selected approach

Use a constraint-based, content-based recommender with TF-IDF weighted item vectors, cosine similarity, interaction weighting, and greedy diversity re-ranking. It runs inside the existing Node backend and adds no paid ranking service or downloadable model.

Research reviewed:

- Google content-based filtering: https://developers.google.com/machine-learning/recommendation/content-based/basics
- Google candidate generation, scoring and re-ranking: https://developers.google.com/machine-learning/recommendation/overview/types
- TensorFlow Recommenders: https://www.tensorflow.org/recommenders
- Recommenders library and available content/collaborative models: https://github.com/recommenders-team/recommenders

TensorFlow Recommenders/two-tower training and collaborative models remain future options. There is not yet a meaningful cross-user interaction dataset to train or validate one, and adding a Python serving stack now would add operational work without demonstrated relevance gains. This implementation applies established algorithms directly in JavaScript; it is not a pretrained fashion model. Gemini remains the image-plus-description attribute classifier.

## Eligibility before taste

Exclude known modesty violations, disallowed pants, excluded stores/brands, out-of-stock items, unsupported items and known US-shipping exclusions before scoring. Enforce requested price/currency, size and other search filters. Saved sizes reject known incompatible size lists; unknown size availability stays unverified unless a specific size filter requires evidence. Optional layering relaxes only the fields the existing preference contract permits.

Parse explicit wording such as sheer, see-through, cutouts, slits and three-quarter sleeves conservatively. Conflicting or incomplete evidence remains uncertain. Ranking separates confident and uncertain candidates; likes never override a hard restriction. Stable feed sessions freeze their current sequence while later discovery batches append; a refreshed feed re-ranks the whole available pool.

## Taste and variety

Learn from selected styles/colors, onboarding swipes, current likes/dislikes, collection saves and capped outbound-click counts. Use the full catalog as signal context, even when a search returns a smaller subset. Dislikes remove the item from For You; custom saves do not overwrite that choice.

Item vectors contain style, color, category, known attributes and title tokens. TF-IDF reduces the influence of common features. Cosine similarity relates unseen items to previously liked/saved/disliked items. Greedy similarity and repeated-retailer penalties diversify eligible recommendations within confidence tiers. Scores are heuristic preference signals, not probabilities or measured recommendation accuracy.

Candidate discovery uses learned style/color/category preferences plus category-specific coverage wording, rotates categories, and paginates external searches. Explicit profile rules continue to filter every result. Results and analysis use persistent caches and existing provider caps. No top-ups or paid services were enabled.

## Photos and individual products

The earlier shopping response often linked to Google redirect pages, and organic results were mostly category pages without photos. Discovery now combines indexed image results (direct product link plus source photo), Shopping and organic metadata. Category pages and unsupported results are excluded. Retailer extraction adds available facts, then Gemini checks images plus descriptions. Unknown prices, stock, sizes and shipping remain unknown; zero/blank/currency-less placeholder prices are not shown as real prices.

An authenticated image endpoint retrieves only stored product images and falls back to the same index result's thumbnail. Public HTTPS validation, DNS pinning, response limits and image MIME restrictions apply. Failed images get placeholders, never unrelated replacements.

## Validation and limits

18 backend tests cover the prior flows plus indexed-image attribution, known violations, learning from historical likes, stable private feed cursors, duplicate prevention, live-feed expansion with deterministic provider responses, caps and placeholder prices. Production build supports `/products/[id]`. The Chromium desktop/mobile journey covers signup through product direct load/reload and browser Back.

Live browser checks saw the feed grow from 3 to 9 pieces on scrolling, real photos render, a card navigate to its own product URL, and a search finish discovery/analysis of 12 candidates with extracted prices on several items. These are functionality checks, not a relevance benchmark. Shipping and sizing remain incomplete when retailer metadata is inaccessible. Broad search coverage and continuous replenishment depend on indexing, eligible inventory and free provider quotas. A representative shopper evaluation is still needed to tune weights and measure relevance.
