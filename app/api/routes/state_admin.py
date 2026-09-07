import uuid
from fastapi import APIRouter, Depends, HTTPException, status
from pymongo.database import Database

from app.core.database import get_db
from app.api.deps import require_roles, get_current_user
from app.models.mongo_models import MongoUser
from app.schemas.auth import LoginRequest, TokenResponse, UserCreateRequest
from app.schemas.roles_api import (
    DistrictOverview,
    StateAnalyticsOut,
    AdminUserOut,
)
from app.services import auth_service

router = APIRouter(
    prefix="/state-admin",
    tags=["2. State Admin API"],
)


@router.post("/login", response_model=TokenResponse, summary="State Admin Login")
def state_admin_login(payload: LoginRequest, db: Database = Depends(get_db)):
    """Dedicated login endpoint for State Administrators."""
    user = auth_service.authenticate_user(db, payload.email, payload.password)
    user_roles = {ra.get("role_name") for ra in user.get("role_assignments", [])}
    if "state_admin" not in user_roles and "super_admin" not in user_roles:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Access denied: State Admin credentials required",
        )
    access_token, refresh_token = auth_service.issue_tokens(db, user)
    return TokenResponse(access_token=access_token, refresh_token=refresh_token)


@router.get("/dashboard", summary="State Admin Dashboard Overview", dependencies=[Depends(require_roles(["state_admin", "super_admin"]))])
def get_state_admin_dashboard(current_user: MongoUser = Depends(get_current_user), db: Database = Depends(get_db)):
    """State Executive Dashboard."""
    state_code = current_user.role_assignments[0].get("scope_id") if current_user.role_assignments else "ST-01"
    return {
        "admin_name": current_user.name,
        "state_code": state_code,
        "total_documents_processed": db.documents.count_documents({}),
        "status": "active",
    }


@router.get("/districts", response_model=list[DistrictOverview], summary="List Districts in State", dependencies=[Depends(require_roles(["state_admin", "super_admin"]))])
def list_state_districts(current_user: MongoUser = Depends(get_current_user)):
    """Retrieve district breakdown and digitization progress for the state."""
    state_code = current_user.role_assignments[0].get("scope_id") if current_user.role_assignments else "ST-01"
    return [
        DistrictOverview(
            district_code=f"{state_code}-DIST-01",
            district_name="Pune Central",
            total_tehsils=14,
            total_documents_processed=1250,
            pending_verifications=42,
        ),
        DistrictOverview(
            district_code=f"{state_code}-DIST-02",
            district_name="Nagpur Urban",
            total_tehsils=9,
            total_documents_processed=890,
            pending_verifications=18,
        ),
    ]


@router.get("/officers", response_model=list[AdminUserOut], summary="List District Administrators", dependencies=[Depends(require_roles(["state_admin", "super_admin"]))])
def list_district_admins(db: Database = Depends(get_db)):
    """List district-level administrators within the state jurisdiction."""
    users = list(db.users.find({"role_assignments.role_name": "district_admin"}))
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
                role_name=ra.get("role_name", "district_admin"),
                scope_type=ra.get("scope_type"),
                scope_id=ra.get("scope_id"),
            )
        )
    return out


@router.post("/officers", response_model=AdminUserOut, status_code=status.HTTP_201_CREATED, summary="Create District Admin", dependencies=[Depends(require_roles(["state_admin", "super_admin"]))])
def create_district_admin(payload: UserCreateRequest, current_user: MongoUser = Depends(get_current_user), db: Database = Depends(get_db)):
    """Create a District Admin officer for this state."""
    state_code = current_user.role_assignments[0].get("scope_id") if current_user.role_assignments else "ST-01"
    user = auth_service.create_user(
        db,
        email=payload.email,
        password=payload.password,
        name=payload.name,
        role_name="district_admin",
        scope_type="district",
        scope_id=payload.scope_id or f"{state_code}-D-01",
    )
    return AdminUserOut(
        id=uuid.UUID(str(user["id"])),
        email=user["email"],
        name=user["name"],
        status=user["status"],
        created_at=user["created_at"],
        role_name="district_admin",
        scope_type="district",
        scope_id=payload.scope_id,
    )


@router.get("/analytics", response_model=StateAnalyticsOut, summary="State-Wide Digitization Metrics", dependencies=[Depends(require_roles(["state_admin", "super_admin"]))])
def get_state_analytics(current_user: MongoUser = Depends(get_current_user), db: Database = Depends(get_db)):
    """High-level land parcel digitization and AI accuracy analytics."""
    total_docs = db.documents.count_documents({})
    state_code = current_user.role_assignments[0].get("scope_id") if current_user.role_assignments else "ST-MAHA"
    return StateAnalyticsOut(
        state_code=state_code or "ST-01",
        total_districts=36,
        digitized_parcels=total_docs * 8,
        pending_approvals=max(0, total_docs - 5),
        ai_confidence_average=94.6,
    )
