"""
API Dependencies — DB session, current user extraction, role guards
"""

from typing import Union
from uuid import UUID

from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.models.user import Doctor, Patient
from app.utils.security import decode_token

security_scheme = HTTPBearer()


class CurrentUser:
    """Wrapper for the authenticated user."""

    def __init__(self, user_id: UUID, user_type: str, email: str, entity: Union[Doctor, Patient]):
        self.user_id = user_id
        self.user_type = user_type
        self.email = email
        self.entity = entity

    @property
    def is_doctor(self) -> bool:
        return self.user_type == "doctor"

    @property
    def is_patient(self) -> bool:
        return self.user_type == "patient"


async def get_current_user(
    credentials: HTTPAuthorizationCredentials = Depends(security_scheme),
    db: AsyncSession = Depends(get_db),
) -> CurrentUser:
    """Decode JWT and load the user entity from DB."""
    payload = decode_token(credentials.credentials)
    if payload is None or payload.get("kind") != "access":
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid or expired token")

    user_id = UUID(payload["sub"])
    user_type = payload["type"]
    email = payload["email"]

    if user_type == "doctor":
        result = await db.execute(select(Doctor).where(Doctor.doctor_id == user_id))
        entity = result.scalar_one_or_none()
    elif user_type == "patient":
        result = await db.execute(select(Patient).where(Patient.patient_id == user_id))
        entity = result.scalar_one_or_none()
    else:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid user type")

    if entity is None:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="User not found")

    return CurrentUser(user_id=user_id, user_type=user_type, email=email, entity=entity)


async def require_doctor(current_user: CurrentUser = Depends(get_current_user)) -> CurrentUser:
    if not current_user.is_doctor:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Doctor access required")
    return current_user


async def require_patient(current_user: CurrentUser = Depends(get_current_user)) -> CurrentUser:
    if not current_user.is_patient:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Patient access required")
    return current_user
