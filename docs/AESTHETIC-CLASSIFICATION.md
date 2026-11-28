# Aesthetic classification (SigLIP2)

Full architecture write-up (inspection + design): see the Project store doc  
`/cursor/stores/self/docs/aesthetic-classification-architecture.md`  
(or the Cloud Agent Context copy of the same path).

## Local run

### 1. Deliver the joblib (required)

```bash
export STYLE_CLASSIFIER_PATH=/absolute/path/style_classifier_and_config.joblib
export STYLE_CLASSIFIER_TRUSTED_DIR=/absolute/path   # optional
export STYLE_WORKER_SECRET='long-random-string'
```

Do **not** invent a replacement classifier. Dev artifact (not in git):  
`/cursor/stores/self/internal/aesthetic-assets/trusted/style_classifier_and_config.joblib`

### 2. Start the Python worker

```bash
cd services/style-classifier
python3 -m venv .venv && source .venv/bin/activate
pip install -r requirements.txt
uvicorn app:app --host 127.0.0.1 --port 8091
```

### 3. Point the Node app at the worker

```bash
export STYLE_WORKER_URL=http://127.0.0.1:8091
export STYLE_WORKER_SECRET='long-random-string'
npm run dev
```

### CLIs

```bash
# One local image (needs STYLE_CLASSIFIER_PATH + HF model download)
python3 services/style-classifier/cli_classify_one.py /path/to/image.jpg

# Backfill stored products via the worker
npm run style:backfill -- --limit 50
npm run style:backfill -- --force --limit 20
```

### Review workflow

Signed-in admin: `/admin/style-review` — confirm/correct top style on real catalog photos.

## Tests

```bash
npm test -- tests/style-classifier.test.mjs
npm test
```

## Hosting

- Node/Next stays on Vercel.
- Style worker pilot: **Modal T4** (`services/style-classifier/modal_app.py`). Dry-run: `./scripts/modal-deploy.sh`. Live deploy only with `./scripts/modal-deploy.sh --approve-live` after approval.
- Secrets: Modal Secret + Volume for joblib; Vercel `STYLE_WORKER_URL` / `STYLE_WORKER_SECRET` server-only.
- **Aesthetic filters use SigLIP `styleClassification` only — never Gemini style tags.**
- **No production go-live from this change set without an explicit ops decision.**

## Preference migration (ambiguous — needs confirmation)

Clear maps (`90s chic`→`90s_minimalism`, `clean girl`→`clean_girl`, …) are coded.  
**Do not auto-migrate** until confirmed: `whimsy`→?`coquette`, `alternative`→?`grunge`, `sporty`→?`streetwear`, `romantic`→?`coquette`. See `src/style-preferences.mjs`.
