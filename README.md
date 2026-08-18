# ChainSys MDM — Data Quality Platform
### Module 2 (CSV Upload & Ingestion) + Module 3 (Data Profiling)

A FastAPI + React application for enterprise master-data quality work,
built as the foundation for a `dedupe`-based golden-record pipeline.

- **No database.** Everything is file-based storage, exactly as the spec requires:
  raw CSVs, metadata, and profiling reports each live in their own folder as
  JSON/CSV on disk.
- **Raw data is never modified.** Module 2 stores the uploaded bytes untouched.
  Module 3 loads that same file read-only for every profiling run.

```
vertiv-mdm-app/
├── backend/                  FastAPI service
│   ├── app/
│   │   ├── main.py           App entrypoint, CORS, routers
│   │   ├── config.py         Storage paths + configurable thresholds
│   │   ├── models/schemas.py Pydantic response models
│   │   ├── routers/
│   │   │   ├── upload.py     POST /api/upload, GET /api/datasets
│   │   │   └── profile.py    POST/GET /api/profile/{dataset_id}
│   │   └── services/
│   │       ├── validation.py CSV validation checklist (Module 2 §2)
│   │       ├── storage.py    File read/write helpers
│   │       └── profiling.py  All profiling checks (Module 3 §2–11)
│   ├── storage/               raw/, metadata/, profiles/  (created at runtime)
│   └── requirements.txt
└── frontend/                 React (Vite) app
    └── src/
        ├── App.jsx            Upload → Profile flow
        ├── api.js              Backend client
        └── components/
            ├── Header.jsx
            ├── UploadPanel.jsx
            ├── ProfileDashboard.jsx   KPIs, quality scores, charts
            └── ColumnTable.jsx        Per-column detail, search & filter
```

## Run it

**Backend**
```bash
cd backend
python3 -m venv .venv && source .venv/bin/activate   # optional but recommended
pip install -r requirements.txt
uvicorn app.main:app --reload --port 8000
```
API docs (Swagger) will be live at `http://localhost:8000/docs`.

**Frontend**
```bash
cd frontend
npm install
npm run dev
```
Open `http://localhost:5173`. It talks to the backend at the URL set in
`frontend/.env` (`VITE_API_BASE_URL`, defaults to `http://localhost:8000`).

## API summary

| Method | Path | Purpose |
|---|---|---|
| POST | `/api/upload` | Upload + validate a CSV, store it, return `dataset_id` + metadata |
| GET  | `/api/datasets` | List previously uploaded datasets |
| GET  | `/api/datasets/{id}` | Get one dataset's metadata |
| POST | `/api/profile/{id}` | Run all profiling checks, store + return the report |
| GET  | `/api/profile/{id}` | Retrieve a previously generated report |

## What was corrected/tightened vs. the original spec

- **Duplicate/empty column-name detection** happens on the *raw header line*
  before pandas silently renames collisions (`a`, `a` → `a`, `a.1`) — otherwise
  the spec's "detect duplicate column names" check would never actually fire.
- **`near_constant` and `is_constant`** are reported as two separate booleans
  (spec lumped them under "constant columns"), so the UI can visually
  distinguish a truly single-valued column from a 99%-dominant one.
- **ID detection** requires the uniqueness threshold *and* (an ID-like column
  name *or* near-100% uniqueness) — a plain high-cardinality free-text column
  (e.g. `description`) shouldn't be flagged as an identifier just because
  it's mostly unique.
- **Quality scores** are kept as four separate scores (completeness,
  validity, uniqueness, consistency) rather than one blended "overall" number,
  per the spec's own caution against an arbitrary composite score.
- Configurable knobs (`near_constant_threshold`, `id_uniqueness_threshold`)
  are exposed as optional fields on the `POST /api/profile/{id}` body instead
  of being hardcoded, so profiling behavior can be tuned per dataset without
  a code change.

## Tested against your data

Verified end-to-end against `Vertiv_Customer_Sample_Data...csv`
(9,996 rows × 68 columns): upload, all 12 profiling check categories, and
report retrieval all pass, in ~1.4s for profiling.
