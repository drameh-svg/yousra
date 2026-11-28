"""SigLIP2 + joblib aesthetic classifier (Colab-parity inference).

Image pixels only — never titles, descriptions, retailers, or metadata.
"""
from __future__ import annotations

import hashlib
import os
import threading
from pathlib import Path
from typing import Any

import joblib
import numpy as np
import torch
from PIL import Image, ImageOps

STYLES = [
    "90s_minimalism",
    "clean_girl",
    "coquette",
    "earthy",
    "grunge",
    "streetwear",
    "y2k",
]

_lock = threading.Lock()
_state: dict[str, Any] = {"loaded": False}


def _trusted_path(path: str) -> Path:
    p = Path(path).expanduser().resolve()
    if not p.is_file():
        raise FileNotFoundError(f"STYLE_CLASSIFIER_PATH not a file: {p}")
    trusted = os.environ.get("STYLE_CLASSIFIER_TRUSTED_DIR", "").strip()
    if trusted:
        root = Path(trusted).expanduser().resolve()
        if root not in p.parents and p.parent != root:
            raise PermissionError(
                f"Refusing to load classifier outside STYLE_CLASSIFIER_TRUSTED_DIR ({root}): {p}"
            )
    if p.suffix.lower() != ".joblib":
        raise ValueError("Classifier artifact must be a .joblib file")
    return p


def model_version(bundle: dict[str, Any] | None = None) -> str:
    bundle = bundle or _state.get("bundle") or {}
    mid = bundle.get("model_id") or os.environ.get("STYLE_BASE_MODEL", "google/siglip2-base-patch16-224")
    method = bundle.get("selected_method") or "trained_classifier"
    return f"{mid}+{method}"


def load_bundle(path: str | None = None) -> dict[str, Any]:
    with _lock:
        if _state["loaded"] and path is None:
            return _state["bundle"]
        raw = path or os.environ.get("STYLE_CLASSIFIER_PATH", "")
        if not raw:
            raise RuntimeError(
                "STYLE_CLASSIFIER_PATH is unset. Place style_classifier_and_config.joblib "
                "on a trusted host path and set the env var. Do not invent a replacement model."
            )
        artifact = _trusted_path(raw)
        bundle = joblib.load(artifact)
        if not isinstance(bundle, dict) or "classifier" not in bundle:
            raise ValueError("Unexpected joblib payload; expected dict with 'classifier'")
        clf = bundle["classifier"]
        if not hasattr(clf, "predict_proba"):
            raise ValueError("Classifier must expose predict_proba")
        styles = list(bundle.get("styles") or getattr(clf, "classes_", STYLES))
        model_id = bundle.get("model_id") or "google/siglip2-base-patch16-224"
        # Lazy-load HF model once.
        from transformers import AutoModel, AutoProcessor

        processor = AutoProcessor.from_pretrained(model_id)
        vision = AutoModel.from_pretrained(model_id)
        vision.eval()
        device = "cuda" if torch.cuda.is_available() else "cpu"
        vision.to(device)
        _state.update(
            {
                "loaded": True,
                "bundle": bundle,
                "classifier": clf,
                "styles": styles,
                "processor": processor,
                "vision": vision,
                "device": device,
                "artifact": str(artifact),
                "model_version": model_version(bundle),
            }
        )
        return bundle


def image_hash(data: bytes) -> str:
    return hashlib.sha256(data).hexdigest()


def load_rgb(data: bytes) -> Image.Image:
    from io import BytesIO

    img = Image.open(BytesIO(data))
    img = ImageOps.exif_transpose(img)
    return img.convert("RGB")


def embed(image: Image.Image) -> np.ndarray:
    load_bundle()
    processor = _state["processor"]
    vision = _state["vision"]
    device = _state["device"]
    inputs = processor(images=image, return_tensors="pt")
    inputs = {k: v.to(device) for k, v in inputs.items()}
    with torch.no_grad():
        feats = vision.get_image_features(**inputs)
    if hasattr(feats, "pooler_output") and feats.pooler_output is not None:
        feats = feats.pooler_output
    elif isinstance(feats, (tuple, list)):
        feats = feats[0]
    vec = feats.detach().float().cpu().numpy().reshape(1, -1)
    norm = np.linalg.norm(vec, axis=1, keepdims=True)
    norm = np.maximum(norm, 1e-12)
    return vec / norm


def classify_bytes(data: bytes, top_k: int = 3) -> dict[str, Any]:
    """Return top-k ranked styles + raw scores for ranking only."""
    load_bundle()
    digest = image_hash(data)
    image = load_rgb(data)
    emb = embed(image)
    clf = _state["classifier"]
    proba = clf.predict_proba(emb)[0]
    classes = list(getattr(clf, "classes_", _state["styles"]))
    ranked = sorted(
        (
            {"style": str(label), "score": float(score), "rank": 0}
            for label, score in zip(classes, proba)
        ),
        key=lambda row: -row["score"],
    )[: max(1, top_k)]
    for i, row in enumerate(ranked, start=1):
        row["rank"] = i
    return {
        "status": "ok",
        "modelVersion": _state["model_version"],
        "imageHash": digest,
        "imageId": digest,
        "ranked": ranked,
        "styles": list(classes),
    }


def health() -> dict[str, Any]:
    path = os.environ.get("STYLE_CLASSIFIER_PATH", "")
    info = {
        "ok": True,
        "classifierConfigured": bool(path),
        "loaded": bool(_state.get("loaded")),
        "modelVersion": _state.get("model_version"),
        "device": _state.get("device"),
        "artifact": _state.get("artifact"),
    }
    if path and not _state.get("loaded"):
        try:
            load_bundle()
            info.update(
                {
                    "loaded": True,
                    "modelVersion": _state.get("model_version"),
                    "device": _state.get("device"),
                    "artifact": _state.get("artifact"),
                }
            )
        except Exception as exc:  # noqa: BLE001 — surface load errors in health
            info["ok"] = False
            info["error"] = str(exc)
    return info
