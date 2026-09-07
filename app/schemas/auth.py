import uuid
from datetime import datetime

from pydantic import BaseModel, EmailStr


class LoginRequest(BaseModel):
    email: EmailStr
    password: str


class TokenResponse(BaseModel):
    access_token: str
    refresh_token: str
    token_type: str = "bearer"


class RefreshRequest(BaseModel):
    refresh_token: str


class UserOut(BaseModel):
    id: uuid.UUID
    email: EmailStr
    name: str
    status: str
    last_login_at: datetime | None = None

    class Config:
        from_attributes = True


class RoleAssignmentOut(BaseModel):
    role_name: str
    scope_type: str | None = None
    scope_id: str | None = None
    permissions: list[str] = []


class CurrentUserOut(BaseModel):
    id: uuid.UUID
    email: EmailStr
    name: str
    status: str
    last_login_at: datetime | None = None
    roles: list[RoleAssignmentOut] = []
    all_permissions: list[str] = []

    class Config:
        from_attributes = True


class UserCreateRequest(BaseModel):
    email: EmailStr
    password: str
    name: str
    role_name: str
    scope_type: str | None = None
    scope_id: str | None = None


class SignupRequest(BaseModel):
    email: EmailStr
    password: str
    name: str
    role_name: str = "citizen"
    scope_type: str | None = None
    scope_id: str | None = None


