import os
from datetime import datetime, timezone

import pandas as pd
from fastapi import APIRouter, HTTPException

from app.models.schemas import ProfileRequest
from app.services import storage
from app.services.profiling import build_profile

router = APIRouter(prefix="/api", tags=["profile"])


@router.post("/profile/{dataset_id}")
async def profile_dataset(dataset_id: str, request: ProfileRequest = ProfileRequest()):
    if not storage.dataset_exists(dataset_id):
        raise HTTPException(status_code=404, detail=f"Dataset '{dataset_id}' not found.")

    meta = storage.load_metadata(dataset_id)
    raw_path = storage.raw_csv_path(dataset_id)

    try:
        df = pd.read_csv(raw_path, dtype=str, keep_default_na=False, na_values=[])
    except Exception as e:
        raise HTTPException(status_code=422, detail=f"Could not load dataset for profiling: {e}")

    file_size = os.path.getsize(raw_path)

    report_body = build_profile(
        df,
        file_size_bytes=file_size,
        near_constant_threshold=request.near_constant_threshold,
        id_uniqueness_threshold=request.id_uniqueness_threshold,
    )

    report = {
        "dataset_id": dataset_id,
        "filename": meta["filename"] if meta else None,
        "created_at": datetime.now(timezone.utc).isoformat(),
        **report_body,
    }

    storage.save_profile(dataset_id, report)
    storage.update_metadata_status(dataset_id, "profiled")

    return report


@router.get("/profile/{dataset_id}")
async def get_profile(dataset_id: str):
    profile = storage.load_profile(dataset_id)
    if profile is None:
        if not storage.dataset_exists(dataset_id):
            raise HTTPException(status_code=404, detail=f"Dataset '{dataset_id}' not found.")
        raise HTTPException(
            status_code=404,
            detail=f"No profiling report exists yet for '{dataset_id}'. POST to /api/profile/{dataset_id} first.",
        )
    return profile
