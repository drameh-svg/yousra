"""Modal T4 GPU pilot for the Yusra style classifier.

REVIEW-READY ONLY — do not deploy to a live public endpoint until explicitly approved.

Secrets (Modal Secret `yusra-style-classifier`, never in Git):
  STYLE_CLASSIFIER_PATH  — absolute path inside the mounted volume / image where the joblib lives
  STYLE_WORKER_SECRET    — Bearer token shared with the Node app
  STYLE_CLASSIFIER_TRUSTED_DIR — optional directory jail for the joblib

Artifact delivery (private host storage):
  1. Upload style_classifier_and_config.joblib to a Modal Volume (or bake into a private image).
  2. Point STYLE_CLASSIFIER_PATH at that path inside the container.
  3. Set STYLE_WORKER_URL on Vercel to the Modal web endpoint only after go-live approval.

Dry-run / inspect:
  modal app list
  python modal_app.py  # prints setup checklist; does not deploy

Deploy (only after user approval):
  ./scripts/modal-deploy.sh --approve-live
"""
from __future__ import annotations

import os
from pathlib import Path

import modal

APP_NAME = "yusra-style-classifier"
VOLUME_NAME = "yusra-style-artifacts"
SECRET_NAME = "yusra-style-classifier"

# GPU pilot: T4. Image pins the same deps as requirements.txt (+ Modal runtime bits).
image = (
    modal.Image.debian_slim(python_version="3.11")
    .pip_install(
        "numpy==2.2.6",
        "Pillow==11.2.1",
        "joblib==1.5.1",
        "scikit-learn==1.6.1",
        "torch==2.7.1",
        "transformers==4.52.4",
        "huggingface-hub==0.33.0",
        "safetensors==0.5.3",
        "fastapi==0.115.12",
        "httpx==0.28.1",
        "pydantic==2.11.5",
    )
    .env({"HF_HOME": "/vol/hf-cache"})
    .add_local_dir(
        str(Path(__file__).parent),
        remote_path="/app/style-classifier",
        ignore=[".venv", "__pycache__", "*.pyc", ".git"],
    )
)

app = modal.App(APP_NAME, image=image)
volume = modal.Volume.from_name(VOLUME_NAME, create_if_missing=True)


def _checklist() -> str:
    return """
Modal T4 pilot checklist (NOT live until approved)
=================================================
1. Create Modal secret (CLI, values never in Git):
     modal secret create yusra-style-classifier \\
       STYLE_WORKER_SECRET=... \\
       STYLE_CLASSIFIER_PATH=/vol/artifacts/style_classifier_and_config.joblib \\
       STYLE_CLASSIFIER_TRUSTED_DIR=/vol/artifacts

2. Upload joblib to the volume (private storage):
     modal volume put yusra-style-artifacts ./style_classifier_and_config.joblib /artifacts/

3. Review this app (web endpoint + T4 GPU) without advertising the URL as production.

4. Only after explicit approval:
     ./scripts/modal-deploy.sh --approve-live
     Then set on Vercel (server-only):
       STYLE_WORKER_URL=https://<modal-endpoint>
       STYLE_WORKER_SECRET=<same as Modal secret>

Gemini remains for coverage/modesty only. Aesthetic gates use this worker's styleClassification.
""".strip()


@app.function(
    gpu="T4",
    timeout=120,
    memory=8192,
    volumes={"/vol": volume},
    secrets=[modal.Secret.from_name(SECRET_NAME)],
)
@modal.asgi_app(label="yusra-style-classify")
def fastapi_app():
    """ASGI entry: reuses app.py FastAPI routes (/health, /v1/classify)."""
    import sys

    sys.path.insert(0, "/app/style-classifier")
    # Ensure volume paths exist for HF cache + artifacts.
    Path("/vol/hf-cache").mkdir(parents=True, exist_ok=True)
    Path("/vol/artifacts").mkdir(parents=True, exist_ok=True)
    # Import after env/secrets are injected by Modal.
    from app import app as api  # noqa: WPS433

    return api


@app.local_entrypoint()
def main():
    print(_checklist())
    print("\nNo deploy performed by this entrypoint.")
