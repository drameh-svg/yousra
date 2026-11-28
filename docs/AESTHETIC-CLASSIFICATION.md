# Aesthetic classification (SigLIP2)

Full architecture write-up: Context store  
`/cursor/stores/self/docs/aesthetic-classification-architecture.md`

## Shopper aesthetics (only these seven)

`90s_minimalism` · `clean_girl` · `coquette` · `earthy` · `grunge` · `streetwear` · `y2k`

Legacy labels (`whimsy`, `alternative`, `romantic`, `classic`, `casual`, `minimal`, `sporty`, `90s chic`, …) are **not** shown, accepted in filters, or remapped. Saved preferences containing them are **stripped** on read/write.

## Local run

### 1. Deliver the joblib (required)

```bash
export STYLE_CLASSIFIER_PATH=/absolute/path/style_classifier_and_config.joblib
export STYLE_CLASSIFIER_TRUSTED_DIR=/absolute/path   # optional
export STYLE_WORKER_SECRET='long-random-string'
```

### 2. Start the Python worker / Modal T4 pilot

See `services/style-classifier/README.md`. Modal dry-run: `./scripts/modal-deploy.sh` (live only with `--approve-live` after approval).

### 3. Point the Node app at the worker

```bash
export STYLE_WORKER_URL=http://127.0.0.1:8091
export STYLE_WORKER_SECRET='long-random-string'
npm run dev
```

## Filtering rule

When a style is selected, only SigLIP `styleClassification` may pass. Gemini is for coverage/modesty only.
