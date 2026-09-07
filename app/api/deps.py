from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from jose import JWTError
from pymongo.database import Database

from app.core.database import get_db
from app.core.security import decode_token
from app.models.mongo_models import MongoUser, UserStatus


# HTTP Bearer authentication
security = HTTPBearer()


def get_current_user(
    credentials: HTTPAuthorizationCredentials = Depends(security),
    db: Database = Depends(get_db),
) -> MongoUser:
    credentials_error = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )

    # Get JWT token from:
    # Authorization: Bearer <token>
    token = credentials.credentials

    try:
        payload = decode_token(token)

        if payload.get("type") != "access":
            raise credentials_error

        user_id = payload.get("sub")

        if user_id is None:
            raise credentials_error

    except JWTError:
        raise credentials_error

    user_doc = (
        db.users.find_one({"_id": user_id})
        or db.users.find_one({"id": user_id})
    )

    if (
        user_doc is None
        or user_doc.get("status") != UserStatus.active.value
    ):
        raise credentials_error

    return MongoUser(user_doc)


def require_role(role_name: str):
    """
    Dependency factory requiring the current user
    to possess a specific role.
    """

    def dependency(
        current_user: MongoUser = Depends(get_current_user),
    ) -> MongoUser:

        user_roles = {
            ra.get("role_name")
            for ra in current_user.role_assignments
        }

        if (
            role_name not in user_roles
            and "super_admin" not in user_roles
        ):
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"Access denied: requires '{role_name}' role",
            )

        return current_user

    return dependency


def require_roles(role_names: list[str]):
    """
    Dependency factory requiring the current user
    to possess at least one of the specified roles.
    """

    def dependency(
        current_user: MongoUser = Depends(get_current_user),
    ) -> MongoUser:

        user_roles = {
            ra.get("role_name")
            for ra in current_user.role_assignments
        }

        if "super_admin" in user_roles:
            return current_user

        if not any(
            role in user_roles
            for role in role_names
        ):
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=(
                    f"Access denied: requires one of "
                    f"{role_names} roles"
                ),
            )

        return current_user

    return dependency


def require_permission(
    permission_name: str,
    scope_param: str | None = None,
):
    """
    Dependency factory requiring the current user
    to hold a specific permission.
    """

    def dependency(
        current_user: MongoUser = Depends(get_current_user),
        db: Database = Depends(get_db),
    ) -> MongoUser:

        user_roles = {
            ra.get("role_name")
            for ra in current_user.role_assignments
        }

        # Super admin has all permissions
        if "super_admin" in user_roles:
            return current_user

        # Fetch permissions for assigned roles
        roles_docs = list(
            db.roles.find(
                {
                    "name": {
                        "$in": list(user_roles)
                    }
                }
            )
        )

        user_permissions = set()

        for role in roles_docs:
            user_permissions.update(
                role.get("permissions", [])
            )

        if permission_name not in user_permissions:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"Missing permission: {permission_name}",
            )

        return current_user

    return dependency