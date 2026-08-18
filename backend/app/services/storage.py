"""
File-based storage helpers.
Raw CSVs are stored unchanged under storage/raw/<dataset_id>.csv
Dataset metadata is stored separately under storage/metadata/<dataset_id>.json
Profiling reports are stored under storage/profiles/<dataset_id>.json
"""
import json
import os
from typing import Any, Dict, Optional

from app.config import RAW_DIR, METADATA_DIR, PROFILES_DIR


def raw_csv_path(dataset_id: str) -> str:
    return os.path.join(RAW_DIR, f"{dataset_id}.csv")


def metadata_path(dataset_id: str) -> str:
    return os.path.join(METADATA_DIR, f"{dataset_id}.json")


def profile_path(dataset_id: str) -> str:
    return os.path.join(PROFILES_DIR, f"{dataset_id}.json")


def save_raw_csv(dataset_id: str, content: bytes) -> None:
    with open(raw_csv_path(dataset_id), "wb") as f:
        f.write(content)


def save_metadata(dataset_id: str, metadata: Dict[str, Any]) -> None:
    with open(metadata_path(dataset_id), "w", encoding="utf-8") as f:
        json.dump(metadata, f, indent=2, default=str)


def load_metadata(dataset_id: str) -> Optional[Dict[str, Any]]:
    path = metadata_path(dataset_id)
    if not os.path.exists(path):
        return None
    with open(path, "r", encoding="utf-8") as f:
        return json.load(f)


def update_metadata_status(dataset_id: str, status: str) -> None:
    meta = load_metadata(dataset_id)
    if meta is not None:
        meta["status"] = status
        save_metadata(dataset_id, meta)


def dataset_exists(dataset_id: str) -> bool:
    return os.path.exists(raw_csv_path(dataset_id))


def save_profile(dataset_id: str, profile: Dict[str, Any]) -> None:
    with open(profile_path(dataset_id), "w", encoding="utf-8") as f:
        json.dump(profile, f, indent=2, default=str)


def load_profile(dataset_id: str) -> Optional[Dict[str, Any]]:
    path = profile_path(dataset_id)
    if not os.path.exists(path):
        return None
    with open(path, "r", encoding="utf-8") as f:
        return json.load(f)


def list_datasets() -> list:
    """Return metadata for all datasets, most recent first."""
    results = []
    if not os.path.isdir(METADATA_DIR):
        return results
    for fname in os.listdir(METADATA_DIR):
        if fname.endswith(".json"):
            with open(os.path.join(METADATA_DIR, fname), "r", encoding="utf-8") as f:
                results.append(json.load(f))
    results.sort(key=lambda m: m.get("upload_timestamp", ""), reverse=True)
    return results
