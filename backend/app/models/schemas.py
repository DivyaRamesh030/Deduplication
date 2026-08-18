from typing import List, Optional, Dict, Any
from pydantic import BaseModel


class DatasetMetadata(BaseModel):
    dataset_id: str
    filename: str
    upload_timestamp: str
    rows: int
    columns: int
    column_names: List[str]
    file_size_bytes: int
    status: str


class UploadResponse(BaseModel):
    dataset_id: str
    filename: str
    rows: int
    columns: int
    column_names: List[str]
    file_size_bytes: int
    status: str
    upload_timestamp: str


class ErrorResponse(BaseModel):
    detail: str


class ProfileRequest(BaseModel):
    # Optional overrides for configurable thresholds
    near_constant_threshold: Optional[float] = None
    id_uniqueness_threshold: Optional[float] = None
    outlier_method: Optional[str] = "iqr"
