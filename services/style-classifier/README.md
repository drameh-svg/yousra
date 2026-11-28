# Style classifier worker (SigLIP2 + joblib)

Separate Python service used by the Yusra Node backend. **Do not run SigLIP2 on Vercel request paths.**

## Artifact delivery

1. Obtain `style_classifier_and_config.joblib` from the training Colab export (never invent a replacement).
2. Place it on the inference host under an ops-controlled directory.
3. Set:
   ```bash
   export STYLE_CLASSIFIER_PATH=/absolute/trusted/style_classifier_and_config.joblib
   export STYLE_CLASSIFIER_TRUSTED_DIR=/absolute/trusted   # optional; refuses paths outside
   export STYLE_WORKER_SECRET='long-random-string'
   ```
4. Dev copy used in Cloud Agent (not committed):  
   `/cursor/stores/self/internal/aesthetic-assets/trusted/style_classifier_and_config.joblib`

## Setup

```bash
cd services/style-classifier
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
```

First run downloads `google/siglip2-base-patch16-224` from Hugging Face into the local cache.

## Run worker

```bash
export STYLE_CLASSIFIER_PATH=...
export STYLE_WORKER_SECRET=...
uvicorn app:app --host 127.0.0.1 --port 8091
```

Node env:

```bash
STYLE_WORKER_URL=http://127.0.0.1:8091
STYLE_WORKER_SECRET=...   # same secret
```

## CLIs

```bash
python cli_classify_one.py /path/to/product.jpg
python cli_backfill.py --manifest queue.jsonl --out results.jsonl
```

## Match policy (initial)

See `config.defaults.json`. Accept top-1..top-3 if score ≥ 0.10; ranking weights 1.0 / 0.55 / 0.25. Scores are for ranking only.

## Modal T4 GPU pilot (review-ready — not live)

Deployment is prepared but **must not go live** until explicitly approved.

```bash
# Checklist / dry-run (default — no deploy)
./scripts/modal-deploy.sh

# Only after user approval:
./scripts/modal-deploy.sh --approve-live
```

1. `modal secret create yusra-style-classifier STYLE_WORKER_SECRET=... STYLE_CLASSIFIER_PATH=/vol/artifacts/style_classifier_and_config.joblib STYLE_CLASSIFIER_TRUSTED_DIR=/vol/artifacts`
2. `modal volume put yusra-style-artifacts ./style_classifier_and_config.joblib /artifacts/`
3. Review `modal_app.py` (FastAPI ASGI on T4).
4. After approval, set Vercel server env `STYLE_WORKER_URL` + `STYLE_WORKER_SECRET`.

Joblib and secrets stay outside Git (Modal Volume + Modal Secret / Vercel env).
