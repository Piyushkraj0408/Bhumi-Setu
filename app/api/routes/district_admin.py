import uuid
from fastapi import APIRouter, Depends, HTTPException, status
from pymongo.database import Database

from app.core.database import get_db
from app.api.deps import require_roles, get_current_user
from app.models.mongo_models import MongoUser
from app.schemas.auth import LoginRequest, TokenResponse, UserCreateRequest
from app.schemas.roles_api import (
    TehsilOverview,
    QueueMonitoringOut,
    AdminUserOut,
)
from app.services import auth_service

router = APIRouter(
    prefix="/district-admin",
    tags=["3. District Admin API"],
)


@router.post("/login", response_model=TokenResponse, summary="District Admin Login")
def district_admin_login(payload: LoginRequest, db: Database = Depends(get_db)):
    """Dedicated login endpoint for District Administrators."""
    user = auth_service.authenticate_user(db, payload.email, payload.password)
    user_roles = {ra.get("role_name") for ra in user.get("role_assignments", [])}
    if "district_admin" not in user_roles and "super_admin" not in user_roles:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Access denied: District Admin credentials required",
        )
    access_token, refresh_token = auth_service.issue_tokens(db, user)
    return TokenResponse(access_token=access_token, refresh_token=refresh_token)


@router.get("/dashboard", summary="District Admin Dashboard Overview", dependencies=[Depends(require_roles(["district_admin", "super_admin"]))])
def get_district_admin_dashboard(current_user: MongoUser = Depends(get_current_user), db: Database = Depends(get_db)):
    """District Executive Dashboard."""
    dist_code = current_user.role_assignments[0].get("scope_id") if current_user.role_assignments else "D-01"
    return {
        "admin_name": current_user.name,
        "district_code": dist_code,
        "queued_jobs": db.processing_jobs.count_documents({"status": "queued"}),
        "status": "operational",
    }


@router.get("/tehsils", response_model=list[TehsilOverview], summary="List Tehsils in District", dependencies=[Depends(require_roles(["district_admin", "super_admin"]))])
def list_tehsils(current_user: MongoUser = Depends(get_current_user)):
    """List tehsils and active officer counts in the administrator's district."""
    dist_code = current_user.role_assignments[0].get("scope_id") if current_user.role_assignments else "D-01"
    return [
        TehsilOverview(
            tehsil_code=f"{dist_code}-TH-01",
            tehsil_name="Haveli",
            active_officers=5,
            documents_in_queue=12,
        ),
        TehsilOverview(
            tehsil_code=f"{dist_code}-TH-02",
            tehsil_name="Mulshi",
            active_officers=3,
            documents_in_queue=7,
        ),
        TehsilOverview(
            tehsil_code=f"{dist_code}-TH-03",
            tehsil_name="Baramati",
            active_officers=4,
            documents_in_queue=4,
        ),
    ]


@router.get("/officers", response_model=list[AdminUserOut], summary="List Tehsil and Verification Officers", dependencies=[Depends(require_roles(["district_admin", "super_admin"]))])
def list_district_officers(db: Database = Depends(get_db)):
    """List tehsil and verification officers assigned to this district."""
    users = list(db.users.find({"role_assignments.role_name": {"$in": ["tehsil_officer", "verification_officer"]}}))
    out = []
    for u in users:
        ra = u.get("role_assignments", [{}])[0] if u.get("role_assignments") else {}
        out.append(
            AdminUserOut(
                id=uuid.UUID(str(u.get("_id", u.get("id")))),
                email=u["email"],
                name=u["name"],
                status=u.get("status", "active"),
                created_at=u["created_at"],
                role_name=ra.get("role_name"),
                scope_type=ra.get("scope_type"),
                scope_id=ra.get("scope_id"),
            )
        )
    return out


@router.post("/officers", response_model=AdminUserOut, status_code=status.HTTP_201_CREATED, summary="Create Tehsil/Verifier Officer", dependencies=[Depends(require_roles(["district_admin", "super_admin"]))])
def create_district_sub_officer(payload: UserCreateRequest, current_user: MongoUser = Depends(get_current_user), db: Database = Depends(get_db)):
    """Create a Tehsil Officer or Verification Officer in this district."""
    if payload.role_name not in ["tehsil_officer", "verification_officer"]:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, "Can only create tehsil_officer or verification_officer")
    
    dist_code = current_user.role_assignments[0].get("scope_id") if current_user.role_assignments else "D-01"
    user = auth_service.create_user(
        db,
        email=payload.email,
        password=payload.password,
        name=payload.name,
        role_name=payload.role_name,
        scope_type="tehsil",
        scope_id=payload.scope_id or f"{dist_code}-TH-01",
    )
    return AdminUserOut(
        id=uuid.UUID(str(user["id"])),
        email=user["email"],
        name=user["name"],
        status=user["status"],
        created_at=user["created_at"],
        role_name=payload.role_name,
        scope_type="tehsil",
        scope_id=payload.scope_id,
    )


@router.get("/queue", response_model=QueueMonitoringOut, summary="Monitor District Processing Queue", dependencies=[Depends(require_roles(["district_admin", "super_admin"]))])
def get_district_queue_status(current_user: MongoUser = Depends(get_current_user), db: Database = Depends(get_db)):
    """Real-time pipeline queue and processing statistics."""
    dist_code = current_user.role_assignments[0].get("scope_id") if current_user.role_assignments else "D-01"
    queued = db.processing_jobs.count_documents({"status": "queued"})
    processing = db.processing_jobs.count_documents({"status": "processing"})
    done = db.processing_jobs.count_documents({"status": "done"})
    failed = db.processing_jobs.count_documents({"status": "failed"})
    
    return QueueMonitoringOut(
        district_code=dist_code or "D-01",
        queued_jobs=queued,
        processing_jobs=processing,
        completed_today=done,
        failed_jobs=failed,
    )
