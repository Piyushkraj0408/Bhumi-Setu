from fastapi import Depends, HTTPException, status
from app.api.deps import get_current_user
from app.models.mongo_models import MongoUser

PERMISSIONS = [
    "UPLOAD_DOCUMENT",
    "PROCESS_DOCUMENT",
    "VIEW_RECORD",
    "EDIT_RECORD",
    "VERIFY_RECORD",
    "APPROVE_RECORD",
    "EXPORT_DATA",
    "VIEW_AUDIT",
    "MANAGE_USERS",
]

ROLE_PERMISSIONS: dict[str, list[str]] = {
    "super_admin": PERMISSIONS,  # All permissions
    "state_admin": [
        "UPLOAD_DOCUMENT",
        "PROCESS_DOCUMENT",
        "VIEW_RECORD",
        "EDIT_RECORD",
        "VERIFY_RECORD",
        "APPROVE_RECORD",
        "EXPORT_DATA",
        "VIEW_AUDIT",
        "MANAGE_USERS",
    ],
    "district_admin": [
        "UPLOAD_DOCUMENT",
        "PROCESS_DOCUMENT",
        "VIEW_RECORD",
        "EDIT_RECORD",
        "VERIFY_RECORD",
        "APPROVE_RECORD",
        "VIEW_AUDIT",
    ],
    "tehsil_officer": [
        "UPLOAD_DOCUMENT",
        "PROCESS_DOCUMENT",
        "VIEW_RECORD",
        "EDIT_RECORD",
        "VERIFY_RECORD",
    ],
    "verification_officer": [
        "VIEW_RECORD",
        "VERIFY_RECORD",
    ],
    "auditor": [
        "VIEW_RECORD",
        "VIEW_AUDIT",
        "EXPORT_DATA",
    ],
}


def require_permission(permission: str):
    """
    FastAPI dependency for RBAC permission checks.
    Extracts authenticated user from JWT token and verifies
    that user's role grants the requested permission.
    """
    def checker(current_user: MongoUser = Depends(get_current_user)) -> MongoUser:
        user_roles = {
            ra.get("role_name")
            for ra in (current_user.role_assignments or [])
        }
        if current_user.role:
            user_roles.add(current_user.role)

        # Super admin bypass
        if "super_admin" in user_roles:
            return current_user

        # Collect granted permissions
        user_permissions = set()
        for r in user_roles:
            user_permissions.update(ROLE_PERMISSIONS.get(r, []))

        if permission not in user_permissions:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"Not authorized for this action: requires '{permission}' permission"
            )

        return current_user

    return checker
