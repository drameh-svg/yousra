"""HTTP worker for aesthetic classification. Auth: Authorization: Bearer $STYLE_WORKER_SECRET."""
from __future__ import annotations

import os
from datetime import datetime, timezone

import httpx
from fastapi import FastAPI, Header, HTTPException
from pydantic import BaseModel, Field

from infer import classify_bytes, health, load_bundle

app = FastAPI(title="Yusra style classifier", version="1.0.0")


def _check_secret(authorization: str | None) -> None:
    expected = os.environ.get("STYLE_WORKER_SECRET", "").strip()
    if not expected:
        raise HTTPException(503, "STYLE_WORKER_SECRET is not configured")
    if not authorization or authorization != f"Bearer {expected}":
        raise HTTPException(401, "Unauthorized")


class ClassifyBody(BaseModel):
    image_url: str | None = None
    image_base64: str | None = None
    top_k: int = Field(default=3, ge=1, le=7)


@app.get("/health")
def get_health():
    return health()


@app.post("/v1/classify")
async def classify(body: ClassifyBody, authorization: str | None = Header(default=None)):
    _check_secret(authorization)
    try:
        load_bundle()
    except Exception as exc:  # noqa: BLE001
        raise HTTPException(503, f"Classifier unavailable: {exc}") from exc

    data: bytes | None = None
    if body.image_base64:
        import base64

        try:
            data = base64.b64decode(body.image_base64)
        except Exception as exc:  # noqa: BLE001
            raise HTTPException(400, f"Invalid image_base64: {exc}") from exc
    elif body.image_url:
        try:
            async with httpx.AsyncClient(timeout=20.0, follow_redirects=True) as client:
                resp = await client.get(
                    body.image_url,
                    headers={"user-agent": "yusra-style-classifier/1.0"},
                )
            if resp.status_code != 200:
                raise HTTPException(502, f"Image fetch failed ({resp.status_code})")
            data = resp.content
        except HTTPException:
            raise
        except Exception as exc:  # noqa: BLE001
            raise HTTPException(502, f"Image fetch error: {exc}") from exc
    else:
        raise HTTPException(400, "Provide image_url or image_base64")

    if not data or len(data) < 32:
        raise HTTPException(400, "Empty or broken image")

    try:
        result = classify_bytes(data, top_k=body.top_k)
    except Exception as exc:  # noqa: BLE001
        raise HTTPException(500, f"Classification failed: {exc}") from exc

    result["classifiedAt"] = datetime.now(timezone.utc).isoformat()
    return result


@app.post("/v1/reload")
def reload(authorization: str | None = Header(default=None)):
    _check_secret(authorization)
    # Force reload by clearing loaded flag via load_bundle with explicit path.
    from infer import _state  # noqa: PLC0415

    _state["loaded"] = False
    load_bundle()
    return {"ok": True, "modelVersion": _state.get("model_version")}
