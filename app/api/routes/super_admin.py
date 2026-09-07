import uuid
from fastapi import APIRouter, Depends, HTTPException, status
from pymongo.database import Database

from app.core.database import get_db
from app.api.deps import require_role, require_roles, get_current_user
from app.models.mongo_models import MongoUser, UserStatus
from app.schemas.auth import LoginRequest, TokenResponse, UserCreateRequest
from app.schemas.roles_api import (
    AdminUserOut,
    UpdateUserStatusRequest,
    SystemStatsOut,
    RolePermissionOut,
    MessageResponse,
)
from app.services import auth_service

router = APIRouter(
    prefix="/super-admin",
    tags=["1. Super Admin API"],
)


@router.post("/login", response_model=TokenResponse, summary="Super Admin Login")
def super_admin_login(payload: LoginRequest, db: Database = Depends(get_db)):
    """Dedicated login endpoint for Super Administrators."""
    user = auth_service.authenticate_user(db, payload.email, payload.password)
    user_roles = {ra.get("role_name") for ra in user.get("role_assignments", [])}
    if "super_admin" not in user_roles:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Access denied: Super Admin credentials required",
        )
    access_token, refresh_token = auth_service.issue_tokens(db, user)
    return TokenResponse(access_token=access_token, refresh_token=refresh_token)


@router.get("/dashboard", summary="Super Admin Dashboard Overview", dependencies=[Depends(require_role("super_admin"))])
def get_super_admin_dashboard(current_user: MongoUser = Depends(get_current_user), db: Database = Depends(get_db)):
    """Executive overview for Super Admin."""
    return {
        "admin_name": current_user.name,
        "admin_email": current_user.email,
        "total_users": db.users.count_documents({}),
        "total_documents": db.documents.count_documents({}),
        "total_jobs": db.processing_jobs.count_documents({}),
        "status": "operational",
    }


@router.get("/users", response_model=list[AdminUserOut], summary="List All Users", dependencies=[Depends(require_roles(["super_admin", "state_admin"]))])
def list_all_users(skip: int = 0, limit: int = 100, db: Database = Depends(get_db)):
    """Retrieve all users across states, districts, and tehsils."""
    users = list(db.users.find({}).skip(skip).limit(limit))
    out = []
    for u in users:
        ra = u.get("role_assignments", [{}])[0] if u.get("role_assignments") else {}
        out.append(
            AdminUserOut(
                id=uuid.UUID(str(u.get("_id", u.get("id")))),
                email=u["email"],
                name=u["name"],
                status=u.get("status", "active"),
                created_at=u.get("created_at"),
                role_name=ra.get("role_name"),
                scope_type=ra.get("scope_type"),
                scope_id=ra.get("scope_id"),
            )
        )
    return out


@router.post("/users", response_model=AdminUserOut, status_code=status.HTTP_201_CREATED, summary="Create Any User", dependencies=[Depends(require_roles(["super_admin", "state_admin"]))])
def create_system_user(payload: UserCreateRequest, db: Database = Depends(get_db)):
    """Provision a new user and assign any role/scope."""
    user = auth_service.create_user(
        db,
        email=payload.email,
        password=payload.password,
        name=payload.name,
        role_name=payload.role_name,
        scope_type=payload.scope_type,
        scope_id=payload.scope_id,
    )
    return AdminUserOut(
        id=uuid.UUID(str(user["id"])),
        email=user["email"],
        name=user["name"],
        status=user["status"],
        created_at=user["created_at"],
        role_name=payload.role_name,
        scope_type=payload.scope_type,
        scope_id=payload.scope_id,
    )


@router.put("/users/{user_id}/status", response_model=MessageResponse, summary="Activate/Suspend User", dependencies=[Depends(require_roles(["super_admin", "state_admin"]))])
def update_user_status(user_id: uuid.UUID, payload: UpdateUserStatusRequest, db: Database = Depends(get_db)):
    """Change account status (active / suspended / pending)."""
    user_id_str = str(user_id)
    user = db.users.find_one({"$or": [{"_id": user_id_str}, {"id": user_id_str}]})
    if not user:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "User not found")
    try:
        new_status = UserStatus(payload.status).value
    except ValueError:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, f"Invalid status: {payload.status}")

    db.users.update_one({"$or": [{"_id": user_id_str}, {"id": user_id_str}]}, {"$set": {"status": new_status}})
    return MessageResponse(message=f"User {user['email']} status updated to {payload.status}")


@router.get("/system/stats", response_model=SystemStatsOut, summary="System Metrics", dependencies=[Depends(require_role("super_admin"))])
def get_system_stats(db: Database = Depends(get_db)):
    """Global system health, documents count, and queue statistics."""
    return SystemStatsOut(
        total_users=db.users.count_documents({}),
        total_documents=db.documents.count_documents({}),
        total_processing_jobs=db.processing_jobs.count_documents({}),
        active_queues=db.processing_jobs.count_documents({"status": "queued"}),
        system_status="healthy",
        database_status="connected",
    )


@router.get("/roles", response_model=list[RolePermissionOut], summary="List Roles & Permissions", dependencies=[Depends(require_role("super_admin"))])
def list_system_roles(db: Database = Depends(get_db)):
    """List all seeded system roles and their assigned permissions."""
    roles = list(db.roles.find({}))
    return [
        RolePermissionOut(
            role_name=r["name"],
            permissions=r.get("permissions", []),
        )
        for r in roles
    ]
