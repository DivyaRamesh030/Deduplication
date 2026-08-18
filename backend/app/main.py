from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.routers import upload, profile

app = FastAPI(
    title="MDM Data Quality Platform API",
    description="CSV ingestion and data profiling services (Module 2 & 3).",
    version="1.0.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(upload.router)
app.include_router(profile.router)


@app.get("/")
async def root():
    return {"status": "ok", "service": "mdm-data-quality-api"}


@app.get("/api/health")
async def health():
    return {"status": "healthy"}
