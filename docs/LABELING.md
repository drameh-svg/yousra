# Team labeling: checking the AI attribute by attribute

`/admin/label` (admins only, `ADMIN_EMAILS`) shows one piece at a time with the AI's answers for sleeves, neckline,
length, fit, fabric, slits and cutouts pre-selected. You confirm or fix each one, optionally pick an overall coverage
level, and save. The goal: a verified dataset to measure Gemini honestly and, later, train our own model.

## 1. Fill the queue
```
npm run label:queue -- --dry-run        # see the ~96 planned searches; spends nothing
npm run label:queue -- --max=50         # small first batch
npm run label:queue                     # up to 300 pieces (default)
npm run label:queue -- --priority=1     # only priority-1 brands, plus random stores
```
- Brands and priorities: `src/label-brands.mjs` (from the brand research sheet). Priority 1 gets 4 searches per brand,
  priority 2 gets 2, priority 3 gets 1. 16 searches run across any store, including deliberately non-modest ones
  (sheer, slits, cutouts, mini) so the model also sees what fails.
- Cost: about 3 Serper calls per brand search and 1 Gemini call per new piece, within the usual daily caps.
- Queued pieces are stored as `label_item` records, separate from the shopper catalog, so they never crowd real
  products out of feeds. (Discovery may still save a few late-loading results to the catalog, as it always does.)

## 2. Label
Keys: **1–7** pick a row · **←/→** change it · **↑/↓** move · **C M R N** coverage level · **P** next photo ·
**Enter** save · **U** not sure · **K** skip.
- Judge only the piece for sale, not layers the model wears with it.
- Use **Can't tell** when the photos don't show it. It is left out of accuracy numbers.
- The least certain pieces come first, at most 2 per store per batch.
- ~1 in 10 pieces are **blind** (`LABEL_BLIND_SHARE`, default 0.1): the AI's answer is hidden. Compare "AI right
  (blind)" with "AI right (shown)": a big gap means labelers are accepting the AI's answers too easily.
- A coverage level also counts as a shopper vote (feeds `humanModesty`, so the human override applies right away).
  Verified attributes are saved on the piece as `verifiedAttributes` (not yet used for matching).

## 3. Use the data
- The page shows accuracy per attribute and the most common AI mistakes. Use those mistakes as few-shot examples.
- Download JSONL/CSV from the page (`/api/admin/label-queue/stats?format=jsonl|csv`): human vs model attributes per
  piece, with photos and listing text. Only human-checked rows should be used for training.

## Improving the prompt with your labels

1. Export from `/admin/label` (JSONL) and `/admin/reviews` (Modesty labels JSONL) into `data/labels/`.
2. `npm run eval:prompt -- data/labels/attribute-labels-*.jsonl data/labels/modesty-labels-*.jsonl`
   re-runs the current prompt on every labeled piece and prints old vs new accuracy per attribute, the
   coverage-level confusion table, how many not-modest dresses are hidden, and every remaining mistake.
3. Change `visionPrompt` in `src/discovery.mjs`, bump `VISION_VERSION`, and run step 2 again.
4. When the new prompt scores better: `npm run vision:refresh -- --kind=both --max=500` re-analyses the
   catalog and the labeling queue (one Gemini call per piece; also fills in the photo zoom box).
