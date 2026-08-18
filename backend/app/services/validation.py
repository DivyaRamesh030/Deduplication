"""
CSV file validation for the upload/ingestion module.
Every check returns (is_valid, error_message) so the router can raise
clean, specific HTTP errors.
"""
import csv
import io
from typing import Tuple

import pandas as pd

from app.config import MAX_UPLOAD_SIZE_BYTES


class CSVValidationError(Exception):
    """Raised when an uploaded file fails validation. Carries an HTTP-ready message."""
    def __init__(self, message: str, status_code: int = 400):
        self.message = message
        self.status_code = status_code
        super().__init__(message)


def validate_filename(filename: str) -> None:
    if not filename:
        raise CSVValidationError("No filename provided.")
    if not filename.lower().endswith(".csv"):
        raise CSVValidationError(
            f"Invalid file type: '{filename}'. Only .csv files are accepted."
        )


def validate_file_size(content: bytes) -> None:
    if len(content) == 0:
        raise CSVValidationError("The uploaded file is empty.")
    if len(content) > MAX_UPLOAD_SIZE_BYTES:
        raise CSVValidationError(
            f"File exceeds the maximum allowed size of "
            f"{MAX_UPLOAD_SIZE_BYTES // (1024 * 1024)} MB."
        )


def decode_content(content: bytes) -> Tuple[str, str]:
    """Try common encodings. Returns (decoded_text, encoding_used)."""
    for encoding in ("utf-8", "utf-8-sig", "latin-1", "cp1252"):
        try:
            return content.decode(encoding), encoding
        except (UnicodeDecodeError, LookupError):
            continue
    raise CSVValidationError(
        "Unable to read the file's text encoding. Please save it as UTF-8 and retry."
    )


def parse_and_validate_csv(content: bytes) -> Tuple[pd.DataFrame, str]:
    """
    Runs the full Module 2 validation checklist and returns a parsed
    DataFrame plus the encoding used. Raises CSVValidationError on any
    failure, with a message specific enough to act on.
    """
    validate_file_size(content)

    text, encoding = decode_content(content)

    if not text.strip():
        raise CSVValidationError("The uploaded file has no content.")

    # Inspect the raw header line BEFORE pandas has a chance to silently
    # rename duplicate/empty columns (e.g. "a" -> "a.1").
    try:
        first_line = next(csv.reader(io.StringIO(text)))
    except StopIteration:
        raise CSVValidationError("CSV has no headers.")

    if len(first_line) == 0:
        raise CSVValidationError("CSV has no headers.")

    empty_cols = [i for i, c in enumerate(first_line) if c.strip() == ""]
    if empty_cols:
        raise CSVValidationError(
            f"CSV contains {len(empty_cols)} column(s) with an empty header "
            f"(position(s): {[i + 1 for i in empty_cols]})."
        )

    seen = {}
    for c in first_line:
        seen[c] = seen.get(c, 0) + 1
    dupes = [c for c, count in seen.items() if count > 1]
    if dupes:
        raise CSVValidationError(
            f"CSV contains duplicate column names: {dupes}. "
            "Column names must be unique."
        )

    try:
        df = pd.read_csv(io.StringIO(text), dtype=str, keep_default_na=False, na_values=[])
    except pd.errors.EmptyDataError:
        raise CSVValidationError("CSV has no columns / headers to parse.")
    except pd.errors.ParserError as e:
        raise CSVValidationError(f"Malformed CSV: {e}")
    except Exception as e:
        raise CSVValidationError(f"Could not parse CSV: {e}")

    if len(df.columns) == 0:
        raise CSVValidationError("CSV has no headers.")

    # At least one data row
    if len(df) == 0:
        raise CSVValidationError("CSV has headers but no data rows.")

    return df, encoding
