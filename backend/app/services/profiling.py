"""
Data profiling engine.

Takes a raw (string-typed, untouched) DataFrame as loaded from the stored
CSV and produces a structured data-quality report covering every check
required by Module 3. Never mutates or rewrites the source CSV.
"""
import re
import math
from datetime import datetime
from typing import Any, Dict, List, Optional

import pandas as pd
import numpy as np

from app.config import (
    MISSING_VALUE_TOKENS,
    NEAR_CONSTANT_THRESHOLD,
    ID_UNIQUENESS_THRESHOLD,
    ID_NULL_PCT_THRESHOLD,
    ID_NAME_HINTS,
    TOP_VALUES_LIMIT,
)

EMAIL_RE = re.compile(r"^[A-Za-z0-9._%+\-]+@[A-Za-z0-9.\-]+\.[A-Za-z]{2,}$")
# Loose phone matcher: 7-15 digits, allows +, spaces, dashes, parens, dots
PHONE_RE = re.compile(r"^\+?[\d\s().\-]{7,20}$")
PHONE_DIGIT_COUNT_RANGE = (7, 15)
POSTAL_RE = re.compile(r"^[A-Za-z0-9][A-Za-z0-9\s\-]{2,9}[A-Za-z0-9]$")

DATE_FORMATS = (
    "%Y-%m-%d", "%m/%d/%Y", "%d/%m/%Y", "%m-%d-%Y", "%d-%m-%Y",
    "%Y/%m/%d", "%m/%d/%Y %H:%M", "%m/%d/%Y %H:%M:%S", "%d %b %Y",
    "%b %d, %Y", "%Y-%m-%dT%H:%M:%S",
)


def _is_missing(value: Any) -> bool:
    if value is None:
        return True
    s = str(value).strip()
    return s.lower() in MISSING_VALUE_TOKENS


def _clean_series(series: pd.Series) -> pd.Series:
    """Return series with configured missing tokens converted to NaN, values stripped."""
    def norm(v):
        if v is None:
            return np.nan
        s = str(v).strip()
        return np.nan if s.lower() in MISSING_VALUE_TOKENS else s
    return series.map(norm)


def _try_parse_date(value: str) -> bool:
    for fmt in DATE_FORMATS:
        try:
            datetime.strptime(value, fmt)
            return True
        except (ValueError, TypeError):
            continue
    return False


def _looks_numeric(series: pd.Series) -> bool:
    non_null = series.dropna()
    if len(non_null) == 0:
        return False
    try:
        pd.to_numeric(non_null)
        return True
    except (ValueError, TypeError):
        return False


def _looks_boolean(series: pd.Series) -> bool:
    non_null = series.dropna().astype(str).str.strip().str.lower()
    if len(non_null) == 0:
        return False
    bool_tokens = {"true", "false", "yes", "no", "y", "n", "0", "1"}
    return non_null.isin(bool_tokens).mean() > 0.98


def _looks_date(series: pd.Series, sample_size: int = 50) -> bool:
    non_null = series.dropna().astype(str)
    if len(non_null) == 0:
        return False
    sample = non_null.sample(min(sample_size, len(non_null)), random_state=42)
    hits = sample.map(_try_parse_date).sum()
    return hits / len(sample) > 0.8


def infer_data_type(series: pd.Series) -> str:
    non_null = series.dropna()
    if len(non_null) == 0:
        return "unknown"
    if _looks_boolean(series):
        return "boolean"
    if _looks_numeric(series):
        numeric = pd.to_numeric(non_null)
        return "integer" if (numeric.dropna() % 1 == 0).all() else "float"
    if _looks_date(series):
        return "date"
    return "string"


def _column_name_hints_id(col_name: str) -> bool:
    lowered = col_name.lower()
    return any(hint in lowered for hint in ID_NAME_HINTS)


def _format_check(col_name: str, non_null: pd.Series) -> Optional[Dict[str, Any]]:
    """Run an email/phone/date/postal-code check if the column name suggests one."""
    lowered = col_name.lower()
    total = len(non_null)
    if total == 0:
        return None

    if "email" in lowered:
        valid = non_null.astype(str).str.strip().map(lambda v: bool(EMAIL_RE.match(v)))
        valid_count = int(valid.sum())
        invalid_count = total - valid_count
        return {
            "format_type": "email",
            "valid_count": valid_count,
            "invalid_count": invalid_count,
            "invalid_percentage": round(invalid_count / total * 100, 2),
        }

    if "phone" in lowered or "mobile" in lowered or "fax" in lowered:
        def phone_ok(v):
            v = str(v).strip()
            digits = re.sub(r"\D", "", v)
            return bool(PHONE_RE.match(v)) and PHONE_DIGIT_COUNT_RANGE[0] <= len(digits) <= PHONE_DIGIT_COUNT_RANGE[1]
        valid = non_null.map(phone_ok)
        valid_count = int(valid.sum())
        invalid_count = total - valid_count
        return {
            "format_type": "phone",
            "valid_count": valid_count,
            "invalid_count": invalid_count,
            "invalid_percentage": round(invalid_count / total * 100, 2),
        }

    if "date" in lowered:
        valid = non_null.astype(str).str.strip().map(_try_parse_date)
        valid_count = int(valid.sum())
        invalid_count = total - valid_count
        return {
            "format_type": "date",
            "valid_count": valid_count,
            "invalid_count": invalid_count,
            "invalid_percentage": round(invalid_count / total * 100, 2),
        }

    if "postal" in lowered or "zip" in lowered:
        valid = non_null.astype(str).str.strip().map(lambda v: bool(POSTAL_RE.match(v)))
        valid_count = int(valid.sum())
        invalid_count = total - valid_count
        return {
            "format_type": "postal_code",
            "valid_count": valid_count,
            "invalid_count": invalid_count,
            "invalid_percentage": round(invalid_count / total * 100, 2),
        }

    return None


def _numeric_stats(non_null: pd.Series) -> Optional[Dict[str, Any]]:
    try:
        values = pd.to_numeric(non_null)
    except (ValueError, TypeError):
        return None
    if len(values) == 0:
        return None

    q1 = float(values.quantile(0.25))
    q2 = float(values.quantile(0.50))
    q3 = float(values.quantile(0.75))
    iqr = q3 - q1
    lower_fence = q1 - 1.5 * iqr
    upper_fence = q3 + 1.5 * iqr
    outliers = values[(values < lower_fence) | (values > upper_fence)]

    return {
        "min": float(values.min()),
        "max": float(values.max()),
        "mean": round(float(values.mean()), 4),
        "median": q2,
        "standard_deviation": round(float(values.std()) if len(values) > 1 else 0.0, 4),
        "25th_percentile": q1,
        "50th_percentile": q2,
        "75th_percentile": q3,
        "outlier_count": int(len(outliers)),
        "outlier_percentage": round(len(outliers) / len(values) * 100, 2),
        "outlier_method": "IQR (1.5x)",
    }


def _categorical_profile(non_null: pd.Series) -> Dict[str, Any]:
    value_counts = non_null.value_counts()
    top = value_counts.head(TOP_VALUES_LIMIT)
    total = len(non_null)
    top_values = [
        {"value": str(v), "count": int(c), "percentage": round(c / total * 100, 2)}
        for v, c in top.items()
    ]
    rare_threshold = max(1, int(total * 0.01))
    rare_count = int((value_counts < rare_threshold).sum())
    return {
        "distinct_values": int(value_counts.shape[0]),
        "top_values": top_values,
        "rare_value_count": rare_count,
    }


def profile_column(df: pd.DataFrame, col_name: str, near_constant_threshold: float, id_uniqueness_threshold: float) -> Dict[str, Any]:
    raw_series = df[col_name]
    total_count = int(len(raw_series))

    empty_string_count = int(raw_series.astype(str).str.strip().eq("").sum())
    cleaned = _clean_series(raw_series)
    null_count = int(cleaned.isna().sum())
    null_percentage = round(null_count / total_count * 100, 2) if total_count else 0.0

    non_null = cleaned.dropna()
    distinct_count = int(non_null.nunique())
    uniqueness_percentage = round(distinct_count / total_count * 100, 2) if total_count else 0.0
    duplicate_count = int(len(non_null) - distinct_count)

    data_type = infer_data_type(non_null)

    is_constant = distinct_count <= 1
    top_share = (non_null.value_counts().iloc[0] / len(non_null)) if len(non_null) > 0 else 0
    is_near_constant = (not is_constant) and top_share >= near_constant_threshold

    is_id_hint_name = _column_name_hints_id(col_name)
    uniqueness_ratio = distinct_count / total_count if total_count else 0
    is_potential_id = (
        uniqueness_ratio >= id_uniqueness_threshold
        and null_percentage <= ID_NULL_PCT_THRESHOLD
    )
    id_reasons = []
    if uniqueness_ratio >= id_uniqueness_threshold:
        id_reasons.append("high uniqueness")
    if is_id_hint_name:
        id_reasons.append("ID-like column name")
    if null_percentage <= ID_NULL_PCT_THRESHOLD:
        id_reasons.append("low null percentage")
    # require at least uniqueness signal + one other to avoid false positives on plain text columns
    is_potential_id = is_potential_id and (is_id_hint_name or uniqueness_ratio >= 0.999)

    top_duplicate_values = []
    if len(non_null) > 0:
        vc = non_null.value_counts()
        dupes = vc[vc > 1].head(TOP_VALUES_LIMIT)
        top_duplicate_values = [{"value": str(v), "occurrences": int(c)} for v, c in dupes.items()]

    column_profile: Dict[str, Any] = {
        "column_name": col_name,
        "data_type": data_type,
        "total_count": total_count,
        "null_count": null_count,
        "null_percentage": null_percentage,
        "empty_string_count": empty_string_count,
        "distinct_count": distinct_count,
        "uniqueness_percentage": uniqueness_percentage,
        "duplicate_count": duplicate_count,
        "top_duplicate_values": top_duplicate_values,
        "is_constant": is_constant,
        "is_near_constant": bool(is_near_constant),
        "is_potential_id": bool(is_potential_id),
        "id_detection_reason": ", ".join(id_reasons) if is_potential_id else None,
    }

    fmt = _format_check(col_name, non_null)
    if fmt:
        column_profile["format_validation"] = fmt

    if data_type in ("integer", "float"):
        stats = _numeric_stats(non_null)
        if stats:
            column_profile["statistics"] = stats
    else:
        column_profile["categorical_profile"] = _categorical_profile(non_null)

    return column_profile


def build_profile(df: pd.DataFrame, file_size_bytes: int, near_constant_threshold: float = None, id_uniqueness_threshold: float = None) -> Dict[str, Any]:
    near_constant_threshold = near_constant_threshold or NEAR_CONSTANT_THRESHOLD
    id_uniqueness_threshold = id_uniqueness_threshold or ID_UNIQUENESS_THRESHOLD

    row_count = int(len(df))
    column_count = int(len(df.columns))

    columns_profile = [
        profile_column(df, col, near_constant_threshold, id_uniqueness_threshold)
        for col in df.columns
    ]

    exact_duplicate_rows = int(df.duplicated().sum())

    columns_with_nulls = sum(1 for c in columns_profile if c["null_count"] > 0)
    potential_id_columns = [c["column_name"] for c in columns_profile if c["is_potential_id"]]
    constant_columns = [c["column_name"] for c in columns_profile if c["is_constant"]]
    near_constant_columns = [c["column_name"] for c in columns_profile if c["is_near_constant"]]

    avg_completeness = round(
        sum(100 - c["null_percentage"] for c in columns_profile) / column_count, 2
    ) if column_count else 0.0
    avg_uniqueness = round(
        sum(c["uniqueness_percentage"] for c in columns_profile) / column_count, 2
    ) if column_count else 0.0

    invalid_emails = sum(
        c["format_validation"]["invalid_count"]
        for c in columns_profile if c.get("format_validation", {}).get("format_type") == "email"
    )
    invalid_phones = sum(
        c["format_validation"]["invalid_count"]
        for c in columns_profile if c.get("format_validation", {}).get("format_type") == "phone"
    )
    invalid_dates = sum(
        c["format_validation"]["invalid_count"]
        for c in columns_profile if c.get("format_validation", {}).get("format_type") == "date"
    )

    total_cells = row_count * column_count
    total_nulls = sum(c["null_count"] for c in columns_profile)
    completeness_score = round((1 - total_nulls / total_cells) * 100, 2) if total_cells else 0.0

    validity_checks_total = 0
    validity_checks_invalid = 0
    for c in columns_profile:
        fv = c.get("format_validation")
        if fv:
            validity_checks_total += fv["valid_count"] + fv["invalid_count"]
            validity_checks_invalid += fv["invalid_count"]
    validity_score = round((1 - validity_checks_invalid / validity_checks_total) * 100, 2) if validity_checks_total else None

    uniqueness_score = avg_uniqueness
    consistency_score = round(100 - (exact_duplicate_rows / row_count * 100), 2) if row_count else 100.0

    data_type_distribution: Dict[str, int] = {}
    for c in columns_profile:
        data_type_distribution[c["data_type"]] = data_type_distribution.get(c["data_type"], 0) + 1

    summary = {
        "rows": row_count,
        "columns": column_count,
        "file_size_bytes": file_size_bytes,
        "completeness_percentage": avg_completeness,
        "uniqueness_percentage": avg_uniqueness,
        "exact_duplicate_rows": exact_duplicate_rows,
        "columns_with_nulls": columns_with_nulls,
        "potential_id_columns": potential_id_columns,
        "constant_columns": constant_columns,
        "near_constant_columns": near_constant_columns,
        "invalid_emails": int(invalid_emails),
        "invalid_phones": int(invalid_phones),
        "invalid_dates": int(invalid_dates),
        "data_type_distribution": data_type_distribution,
        "quality_scores": {
            "completeness_score": completeness_score,
            "validity_score": validity_score,
            "uniqueness_score": uniqueness_score,
            "consistency_score": consistency_score,
        },
    }

    return {
        "summary": summary,
        "columns": columns_profile,
    }
