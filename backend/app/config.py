"""
Central configuration for the MDM Data Quality backend.
All storage is file-based (no database), as required by Module 2 & 3 specs.
"""
import os

BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
STORAGE_DIR = os.path.join(BASE_DIR, "storage")

RAW_DIR = os.path.join(STORAGE_DIR, "raw")            # original, untouched CSVs
METADATA_DIR = os.path.join(STORAGE_DIR, "metadata")  # dataset metadata JSON
PROFILES_DIR = os.path.join(STORAGE_DIR, "profiles")  # profiling report JSON

for d in (RAW_DIR, METADATA_DIR, PROFILES_DIR):
    os.makedirs(d, exist_ok=True)

# Values that should be treated as "missing" even though they are not a
# true pandas NaN. Configurable per the Module 3 spec (section 4).
MISSING_VALUE_TOKENS = {
    "null", "n/a", "na", "", " ", "unknown", "not available", "none", "nil", "-"
}

# Threshold at/above which a column counts as "near-constant" (section 7)
NEAR_CONSTANT_THRESHOLD = 0.99

# Threshold at/above which a column's uniqueness suggests an identifier (section 6)
ID_UNIQUENESS_THRESHOLD = 0.95
ID_NULL_PCT_THRESHOLD = 5.0
ID_NAME_HINTS = ("id", "_id", "duns", "number", "no.", "_nbr", "code")

# Max distinct values to keep in a "top values" breakdown
TOP_VALUES_LIMIT = 10

MAX_UPLOAD_SIZE_BYTES = 500 * 1024 * 1024  # 500 MB safety cap
