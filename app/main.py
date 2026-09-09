from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.api.routes import blockchain
from app.api.routes import blockchain_governance

from app.api.routes import (
    auth,
    documents,
    super_admin,
    state_admin,
    district_admin,
    tehsil_officer,
    verification_officer,
    auditor,
    public_portal,
    validation,
    records,
)
from app.core.config import settings
from app.core.database import init_db


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Ensure MongoDB collections and indexes are initialized on startup
    init_db()
    yield


app = FastAPI(
    title="Land Records Management & Document AI API",
    description="Role-Differentiated Backend API for Land Records Processing, Quality Analysis, AI Pipelines & Verification",
    version="1.0.0",
    lifespan=lifespan,
)

# Enable CORS with explicit origin whitelist (rejects wildcard with credentials)
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# 1. Authentication & Common Endpoints
app.include_router(auth.router, prefix="/api/v1")
app.include_router(documents.router, prefix="/api/v1")
app.include_router(records.router, prefix="/api/v1")

# 2. Role-Differentiated APIs
app.include_router(super_admin.router, prefix="/api/v1")
app.include_router(state_admin.router, prefix="/api/v1")
app.include_router(district_admin.router, prefix="/api/v1")
app.include_router(tehsil_officer.router, prefix="/api/v1")
app.include_router(verification_officer.router, prefix="/api/v1")
app.include_router(auditor.router, prefix="/api/v1")
app.include_router(public_portal.router, prefix="/api/v1")
app.include_router(validation.router, prefix="/api/v1")
app.include_router(blockchain.router, prefix="/api/v1")
app.include_router(
    blockchain_governance.router,
    prefix="/api/v1",
)

@app.get("/health", tags=["system"])
def health():
    return {"status": "ok", "service": "land-records-backend", "database": "mongodb"}
