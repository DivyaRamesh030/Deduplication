import uuid
from datetime import datetime, timezone

from fastapi import APIRouter, UploadFile, File, HTTPException

from app.models.schemas import UploadResponse
from app.services.validation import parse_and_validate_csv, validate_filename, CSVValidationError
from app.services import storage

router = APIRouter(prefix="/api", tags=["upload"])


@router.post("/upload", response_model=UploadResponse)
async def upload_csv(file: UploadFile = File(...)):
    """
    Accept a CSV, validate it, store the raw bytes unchanged, and return
    dataset metadata + a new dataset_id. No cleansing happens here.
    """
    try:
        validate_filename(file.filename)
        content = await file.read()
        df, encoding = parse_and_validate_csv(content)
    except CSVValidationError as e:
        raise HTTPException(status_code=e.status_code, detail=e.message)

    dataset_id = str(uuid.uuid4())
    timestamp = datetime.now(timezone.utc).isoformat()

    # 1. Store raw data, unchanged, first (source of truth)
    storage.save_raw_csv(dataset_id, content)

    # 2. Build + store metadata separately
    metadata = {
        "dataset_id": dataset_id,
        "filename": file.filename,
        "upload_timestamp": timestamp,
        "rows": int(len(df)),
        "columns": int(len(df.columns)),
        "column_names": list(df.columns),
        "file_size_bytes": len(content),
        "status": "uploaded",
        "encoding": encoding,
    }
    storage.save_metadata(dataset_id, metadata)

    return UploadResponse(**{k: metadata[k] for k in UploadResponse.model_fields.keys()})


@router.get("/datasets")
async def list_datasets():
    """List all uploaded datasets (most recent first)."""
    return storage.list_datasets()


@router.get("/datasets/{dataset_id}")
async def get_dataset(dataset_id: str):
    meta = storage.load_metadata(dataset_id)
    if meta is None:
        raise HTTPException(status_code=404, detail=f"Dataset '{dataset_id}' not found.")
    return meta
