gfrom fastapi import APIRouter, Depends, HTTPException, status
from pymongo.database import Database

from app.core.database import get_db
from app.api.deps import require_permission, get_current_user
from app.models.mongo_models import MongoUser
from app.schemas.auth import (
    LoginRequest,
    TokenResponse,
    RefreshRequest,
    UserOut,
    UserCreateRequest,
    SignupRequest,
    CurrentUserOut,
    RoleAssignmentOut,
)
from app.services import auth_service

router = APIRouter(prefix="/auth", tags=["auth"])


@router.get("/me", response_model=CurrentUserOut)
def get_current_user_profile(
    current_user: MongoUser = Depends(get_current_user),
    db: Database = Depends(get_db),
):
    roles_out = []
    all_perms = set()

    user_role_names = [ra.get("role_name") for ra in current_user.role_assignments if ra.get("role_name")]
    role_docs = {r["name"]: r.get("permissions", []) for r in db.roles.find({"name": {"$in": user_role_names}})}

    for ra in current_user.role_assignments:
        r_name = ra.get("role_name")
        perms = role_docs.get(r_name, [])
        all_perms.update(perms)
        roles_out.append(
            RoleAssignmentOut(
                role_name=r_name or "",
                scope_type=ra.get("scope_type"),
                scope_id=ra.get("scope_id"),
                permissions=perms,
            )
        )

    return CurrentUserOut(
        id=current_user.id,
        email=current_user.email,
        name=current_user.name,
        status=current_user.status.value,
        last_login_at=current_user.last_login_at,
        roles=roles_out,
        all_permissions=sorted(list(all_perms)),
    )


def _login_with_role_check(db: Database, payload: LoginRequest, expected_role: str | None = None) -> TokenResponse:
    user = auth_service.authenticate_user(db, payload.email, payload.password)
    user_roles = {ra.get("role_name") for ra in user.get("role_assignments", [])}
    
    if expected_role and expected_role not in user_roles and "super_admin" not in user_roles:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail=f"Access denied: this portal requires '{expected_role}' role credentials",
        )
    
    access_token, refresh_token = auth_service.issue_tokens(db, user)
    return TokenResponse(access_token=access_token, refresh_token=refresh_token)


@router.post("/login", response_model=TokenResponse, summary="Universal Login")
def login(payload: LoginRequest, db: Database = Depends(get_db)):
    """Universal login endpoint for any authenticated user."""
    return _login_with_role_check(db, payload, expected_role=None)


@router.post("/super-admin/login", response_model=TokenResponse, summary="Super Admin Login")
def super_admin_login(payload: LoginRequest, db: Database = Depends(get_db)):
    """Dedicated login endpoint for Super Administrators."""
    return _login_with_role_check(db, payload, expected_role="super_admin")


@router.post("/state-admin/login", response_model=TokenResponse, summary="State Admin Login")
def state_admin_login(payload: LoginRequest, db: Database = Depends(get_db)):
    """Dedicated login endpoint for State Administrators."""
    return _login_with_role_check(db, payload, expected_role="state_admin")


@router.post("/district-admin/login", response_model=TokenResponse, summary="District Admin Login")
def district_admin_login(payload: LoginRequest, db: Database = Depends(get_db)):
    """Dedicated login endpoint for District Administrators."""
    return _login_with_role_check(db, payload, expected_role="district_admin")


@router.post("/tehsil/login", response_model=TokenResponse, summary="Tehsil Officer Login")
def tehsil_officer_login(payload: LoginRequest, db: Database = Depends(get_db)):
    """Dedicated login endpoint for Tehsil Land Officers."""
    return _login_with_role_check(db, payload, expected_role="tehsil_officer")


@router.post("/verifier/login", response_model=TokenResponse, summary="Verification Officer Login")
def verifier_login(payload: LoginRequest, db: Database = Depends(get_db)):
    """Dedicated login endpoint for Verification / HITL Officers."""
    return _login_with_role_check(db, payload, expected_role="verification_officer")


@router.post("/auditor/login", response_model=TokenResponse, summary="Auditor Login")
def auditor_login(payload: LoginRequest, db: Database = Depends(get_db)):
    """Dedicated login endpoint for Compliance & Audit Officers."""
    return _login_with_role_check(db, payload, expected_role="auditor")


@router.post("/citizen/login", response_model=TokenResponse, summary="Citizen / Public Login")
def citizen_login(payload: LoginRequest, db: Database = Depends(get_db)):
    """Login endpoint for Citizen / Public Portal users."""
    return _login_with_role_check(db, payload, expected_role=None)


@router.post("/refresh", response_model=TokenResponse)
def refresh(payload: RefreshRequest, db: Database = Depends(get_db)):
    access_token, refresh_token = auth_service.rotate_refresh_token(
        db, payload.refresh_token
    )
    return TokenResponse(access_token=access_token, refresh_token=refresh_token)


@router.post("/logout", status_code=status.HTTP_204_NO_CONTENT)
def logout(payload: RefreshRequest, db: Database = Depends(get_db)):
    auth_service.revoke_refresh_token(db, payload.refresh_token)


@router.post(
    "/register",
    response_model=UserOut,
    status_code=status.HTTP_201_CREATED,
    dependencies=[Depends(require_permission("MANAGE_USERS"))],
)
def register(payload: UserCreateRequest, db: Database = Depends(get_db)):
    user = auth_service.create_user(
        db,
        email=payload.email,
        password=payload.password,
        name=payload.name,
        role_name=payload.role_name,
        scope_type=payload.scope_type,
        scope_id=payload.scope_id,
    )
    return user


ALLOWED_PUBLIC_SIGNUP_ROLES = {"citizen", "tehsil_officer", "verification_officer", "auditor"}


@router.post(
    "/signup",
    response_model=TokenResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Public User Signup",
)
def signup(payload: SignupRequest, db: Database = Depends(get_db)):
    """Allows new users / consumers to self-register and immediately receive authentication tokens."""
    role = payload.role_name if payload.role_name in ALLOWED_PUBLIC_SIGNUP_ROLES else "citizen"
    user = auth_service.create_user(
        db,
        email=payload.email,
        password=payload.password,
        name=payload.name,
        role_name=role,
        scope_type=payload.scope_type,
        scope_id=payload.scope_id,
    )
    access_token, refresh_token = auth_service.issue_tokens(db, user)
    return TokenResponse(access_token=access_token, refresh_token=refresh_token)

