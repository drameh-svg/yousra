# Modesty labels: improving coverage detection with shopper ratings

## How labels are collected
- **/feedback → "Rate the coverage"**: signed-in testers rate 5–10 real listings Yousra scraped. The least-labelled pieces are shown first, spread across categories, and a shopper is never asked about the same piece twice.
- **Product pages**: one-tap "How much coverage does this piece really give?"
- Levels: `conservative`, `moderate`, `relaxed`, `not_modest`, with optional issues (`sleeves`, `neckline`, `length`, `fit`, `transparency`, `slits`, `cutouts`).

Each label is stored as `kind='modesty_label'` (one per shopper per product). It includes a snapshot of what the AI saw and predicted at that moment: image URLs, title, description, attributes and predicted level.

## How labels are used right away
Each product keeps a vote summary (`humanModesty`). In `modestyMatch`:
- One `not_modest` vote excludes the piece for anyone with coverage rules.
- Once at least `HUMAN_LABEL_MIN` (default 2) shoppers agree (60%+), their level overrides the AI's attributes. The piece is confirmed for shoppers whose rules that level satisfies, and excluded for shoppers who need the next level up.

## Measuring the AI
- `npm run eval:modesty` prints agreement between shoppers and the AI, a confusion matrix, and which attributes the AI misses most often. Unknown attributes do **not** count as covered.
- `/admin/reviews` shows the same matrix, with downloads: **Modesty labels (JSONL)** and **Labels CSV**.

## Using the data to improve Gemini (free paths)
1. **Evaluate every prompt or model change** against the labelled set before shipping. Bump `VISION_VERSION` in `src/discovery.mjs` to invalidate cached vision results.
2. **Few-shot examples**: add a handful of tricky, correctly labelled cases (for example "pair with a long-sleeve top" listings, or sheer sleeves) to the prompt as text rules.
3. **Fine-tuning / training**: the JSONL export has one row per label (`image_url`, `image_urls`, `title`, `description`, `human_level`, `human_issues`, `model_level`, `model_attributes`). Convert it to whichever tuning format the chosen model supports. Check current Google AI Studio / Vertex AI tuning availability first, because supported models change.
