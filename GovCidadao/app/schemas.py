from datetime import datetime
from typing import Literal, Optional

from pydantic import BaseModel, Field

from app.models import (
    OccurrenceSource,
    OccurrenceStatus,
    ProtectiveLevel,
    UserRole,
    UrgencyLevel,
)


class OccurrenceCreate(BaseModel):
    source: OccurrenceSource
    title: str = Field(min_length=3, max_length=120)
    description: str = Field(min_length=5, max_length=1500)
    latitude: float = Field(ge=-90, le=90)
    longitude: float = Field(ge=-180, le=180)
    urgency: UrgencyLevel = UrgencyLevel.MEDIUM
    reporter_name: Optional[str] = Field(default=None, max_length=120)
    reporter_contact: Optional[str] = Field(default=None, max_length=160)
    reporter_role: Optional[str] = Field(default=None, max_length=40)
    secretariat_id: Optional[str] = None
    category_id: Optional[str] = None
    cep: Optional[str] = Field(default=None, max_length=16)
    address: Optional[str] = Field(default=None, max_length=200)
    number: Optional[str] = Field(default=None, max_length=30)
    complement: Optional[str] = Field(default=None, max_length=120)
    neighborhood: Optional[str] = Field(default=None, max_length=120)
    city: Optional[str] = Field(default=None, max_length=120)
    state: Optional[str] = Field(default=None, max_length=2)


class OccurrenceUpdate(BaseModel):
    status: Optional[OccurrenceStatus] = None
    assigned_team: Optional[str] = None
    urgency: Optional[UrgencyLevel] = None
    secretariat_id: Optional[str] = None
    category_id: Optional[str] = None
    cep: Optional[str] = Field(default=None, max_length=16)
    address: Optional[str] = Field(default=None, max_length=200)
    number: Optional[str] = Field(default=None, max_length=30)
    complement: Optional[str] = Field(default=None, max_length=120)
    neighborhood: Optional[str] = Field(default=None, max_length=120)
    city: Optional[str] = Field(default=None, max_length=120)
    state: Optional[str] = Field(default=None, max_length=2)


class CitizenNotificationRead(BaseModel):
    id: str
    occurrence_id: str
    title: str
    body: str
    read: bool
    created_at: datetime


class OccurrenceHistoryRead(BaseModel):
    id: str
    occurrence_id: str
    event_type: str
    status: Optional[OccurrenceStatus] = None
    message: str
    created_at: datetime


class OccurrenceRead(BaseModel):
    id: str
    external_id: str
    source: OccurrenceSource
    title: str
    description: str
    latitude: float
    longitude: float
    urgency: UrgencyLevel
    status: OccurrenceStatus
    priority_score: int
    duplicate_of_id: Optional[str]
    secretariat_id: Optional[str]
    category_id: Optional[str]
    assigned_team: Optional[str]
    reporter_name: Optional[str] = None
    reporter_contact: Optional[str] = None
    reporter_role: Optional[str] = None
    cep: Optional[str] = None
    address: Optional[str] = None
    number: Optional[str] = None
    complement: Optional[str] = None
    neighborhood: Optional[str] = None
    city: Optional[str] = None
    state: Optional[str] = None
    created_at: datetime
    updated_at: datetime
    due_at: Optional[datetime]
    resolved_at: Optional[datetime]
    sla_overdue_days: int = 0
    sla_escalation_level: int = 0
    recurrence_count: int = 0
    recurrence_level: int = 0
    recurrence_address_count: int = 0
    recurrence_topic_count: int = 0
    recurrence_geo_count: int = 0


class HeatmapPoint(BaseModel):
    lat_cell: float
    lon_cell: float
    count: int
    weighted_score: int


class ProtectiveMeasureRead(BaseModel):
    id: str
    occurrence_id: Optional[str]
    level: ProtectiveLevel
    trigger: str
    action: str
    notified_roles: str
    active: bool
    created_at: datetime


class SecretariatRead(BaseModel):
    id: str
    title: str
    sigla: str = ""
    phone: str
    email: str
    address: str


class SecretariatCreate(BaseModel):
    title: str = Field(min_length=3, max_length=120)
    sigla: str = Field(min_length=2, max_length=20)
    phone: str = Field(min_length=3, max_length=30)
    email: str = Field(min_length=5, max_length=160)
    address: str = Field(min_length=5, max_length=200)


class SecretariatUpdate(BaseModel):
    title: str = Field(min_length=3, max_length=120)
    sigla: str = Field(min_length=2, max_length=20)
    phone: str = Field(min_length=3, max_length=30)
    email: str = Field(min_length=5, max_length=160)
    address: str = Field(min_length=5, max_length=200)


class CategoryRead(BaseModel):
    id: str
    title: str
    description: str
    secretariat_id: str
    sla_days: int


class CategoryCreate(BaseModel):
    title: str = Field(min_length=3, max_length=120)
    description: str = Field(min_length=5, max_length=300)
    secretariat_id: str = Field(min_length=8)
    sla_days: int = Field(default=5, ge=1, le=60)


class CategoryUpdate(BaseModel):
    title: str = Field(min_length=3, max_length=120)
    description: str = Field(min_length=5, max_length=300)
    secretariat_id: str = Field(min_length=8)
    sla_days: int = Field(default=5, ge=1, le=60)


class LoginRequest(BaseModel):
    email: str = Field(min_length=5, max_length=160)
    password: str = Field(min_length=6, max_length=72)


class RegisterRequest(BaseModel):
    name: str = Field(min_length=3, max_length=120)
    cpf: str = Field(min_length=11, max_length=18)
    phone: str = Field(min_length=10, max_length=20)
    email: str = Field(min_length=5, max_length=160)
    password: str = Field(min_length=6, max_length=72)
    confirm_password: str = Field(min_length=6, max_length=72)
    accepted_terms: bool


class UserRead(BaseModel):
    id: str
    name: str
    email: str
    image: Optional[str] = None
    role: UserRole
    secretariat_id: Optional[str] = None
    is_active: bool
    created_at: datetime


class LoginResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: UserRead


class SecretaryCreate(BaseModel):
    name: str = Field(min_length=3, max_length=120)
    email: str = Field(min_length=5, max_length=160)
    image: Optional[str] = Field(default=None, min_length=5, max_length=500)
    password: str = Field(min_length=6, max_length=72)
    secretariat_id: str = Field(min_length=8)


class UserCreate(BaseModel):
    name: str = Field(min_length=3, max_length=120)
    email: str = Field(min_length=5, max_length=160)
    image: Optional[str] = Field(default=None, min_length=5, max_length=500)
    password: str = Field(min_length=6, max_length=72)
    role: UserRole | Literal["prefeito"]
    secretariat_id: Optional[str] = None


class UserUpdate(BaseModel):
    name: Optional[str] = Field(default=None, min_length=3, max_length=120)
    email: Optional[str] = Field(default=None, min_length=5, max_length=160)
    image: Optional[str] = Field(default=None, min_length=5, max_length=500)
    password: Optional[str] = Field(default=None, min_length=6, max_length=72)
    role: Optional[UserRole | Literal["prefeito"]] = None
    secretariat_id: Optional[str] = None
    is_active: Optional[bool] = None
