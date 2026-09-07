import uuid
from datetime import datetime, timezone
from fastapi import HTTPException, status
from jose import JWTError
from pymongo.database import Database

from app.core.security import (
    verify_password,
    hash_password,
    create_access_token,
    create_refresh_token,
    decode_token,
)
from app.models.mongo_models import MongoUser, UserStatus


def authenticate_user(db: Database, email: str, password: str) -> dict:
    user = db.users.find_one({"email": email})
    if not user or not verify_password(password, user.get("password_hash", "")):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid credentials"
        )
    if user.get("status") != UserStatus.active.value:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN, detail="Account is not active"
        )
    return user


def issue_tokens(db: Database, user: dict) -> tuple[str, str]:
    user_id = str(user.get("_id", user.get("id")))
    now_utc = datetime.now(timezone.utc)
    access_token = create_access_token(subject=user_id)
    refresh_token, jti, expires_at = create_refresh_token(subject=user_id)

    # Record login timestamp on the user in MongoDB
    db.users.update_one(
        {"$or": [{"_id": user_id}, {"id": user_id}, {"email": user.get("email")}]},
        {"$set": {"last_login_at": now_utc, "updated_at": now_utc}},
    )

    # Record audit log entry in MongoDB for user login
    try:
        db.audit_logs.insert_one({
            "_id": str(uuid.uuid4()),
            "user_id": user_id,
            "user_email": user.get("email", ""),
            "user_name": user.get("name", ""),
            "action": "USER_LOGIN",
            "resource_type": "User",
            "resource_id": user_id,
            "ip_address": "127.0.0.1",
            "details": {
                "login_at": now_utc.isoformat(),
                "email": user.get("email", ""),
            },
            "created_at": now_utc,
        })
    except Exception:
        pass

    db.refresh_tokens.insert_one({
        "_id": str(uuid.uuid4()),
        "user_id": user_id,
        "jti": jti,
        "expires_at": expires_at,
        "revoked": False,
        "created_at": now_utc,
    })

    return access_token, refresh_token


def rotate_refresh_token(db: Database, refresh_token: str) -> tuple[str, str]:
    try:
        payload = decode_token(refresh_token)
    except JWTError:
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, "Invalid refresh token")

    if payload.get("type") != "refresh":
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, "Invalid token type")

    jti = payload.get("jti")
    record = db.refresh_tokens.find_one({"jti": jti})
    if not record or record.get("revoked", False):
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, "Token revoked or unknown")

    now_utc = datetime.now(timezone.utc)
    record_exp = record.get("expires_at")
    if record_exp and record_exp.tzinfo is None:
        record_exp = record_exp.replace(tzinfo=timezone.utc)
    if record_exp and record_exp < now_utc:
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, "Token expired")

    # Rotate token
    db.refresh_tokens.update_one({"jti": jti}, {"$set": {"revoked": True}})
    
    user_id = payload.get("sub")
    user = db.users.find_one({"_id": user_id})
    if not user or user.get("status") != UserStatus.active.value:
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, "User not active")

    return issue_tokens(db, user)


def revoke_refresh_token(db: Database, refresh_token: str) -> None:
    try:
        payload = decode_token(refresh_token)
    except JWTError:
        return
    jti = payload.get("jti")
    if jti:
        db.refresh_tokens.update_one({"jti": jti}, {"$set": {"revoked": True}})


def create_user(
    db: Database,
    email: str,
    password: str,
    name: str,
    role_name: str,
    scope_type: str | None = None,
    scope_id: str | None = None,
) -> dict:
    if db.users.find_one({"email": email}):
        raise HTTPException(status.HTTP_409_CONFLICT, "Email already registered")

    role = db.roles.find_one({"name": role_name})
    if not role and role_name != "super_admin":
        # create role if missing
        pass

    user_id = str(uuid.uuid4())
    user_doc = {
        "_id": user_id,
        "id": user_id,
        "email": email,
        "password_hash": hash_password(password),
        "name": name,
        "status": UserStatus.active.value,
        "mfa_enabled": False,
        "created_at": datetime.now(timezone.utc),
        "role_assignments": [
            {
                "role_name": role_name,
                "scope_type": scope_type,
                "scope_id": scope_id,
            }
        ],
    }

    db.users.insert_one(user_doc)
    return user_doc
