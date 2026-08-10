from __future__ import annotations

import uuid
from datetime import datetime
from enum import Enum
from typing import Optional

from beanie import Document
from pydantic import Field


class OccurrenceSource(str, Enum):
    INTERNAL = "internal"
    EXTERNAL = "external"


class UrgencyLevel(str, Enum):
    CRITICAL = "critical"
    HIGH = "high"
    MEDIUM = "medium"
    LOW = "low"


class OccurrenceStatus(str, Enum):
    OPEN = "open"
    IN_PROGRESS = "in_progress"
    RESOLVED = "resolved"
    CANCELED = "canceled"


class ProtectiveLevel(str, Enum):
    CRITICAL = "critical"
    HIGH = "high"
    MEDIUM = "medium"
    MONITORING = "monitoring"


class UserRole(str, Enum):
    ADMIN = "admin"
    SECRETARY = "secretary"
    CITIZEN = "citizen"


class Secretariat(Document):
    name: str
    sigla: str = ""
    phone: str = ""
    email: str = ""
    address: str = ""
    description: Optional[str] = None

    class Settings:
        name = "secretariats"


class Category(Document):
    name: str
    description: str = ""
    secretariat_id: str
    sla_days: int = Field(default=5, ge=1)

    class Settings:
        name = "categories"


class Occurrence(Document):
    external_id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    source: OccurrenceSource
    title: str
    description: str
    latitude: float
    longitude: float
    urgency: UrgencyLevel = Field(default=UrgencyLevel.MEDIUM)
    status: OccurrenceStatus = Field(default=OccurrenceStatus.OPEN)

    reporter_name: Optional[str] = None
    reporter_contact: Optional[str] = None
    reporter_role: Optional[str] = None
    reporter_user_id: Optional[str] = None
    cep: Optional[str] = None
    address: Optional[str] = None
    number: Optional[str] = None
    complement: Optional[str] = None
    neighborhood: Optional[str] = None
    city: Optional[str] = None
    state: Optional[str] = None

    secretariat_id: Optional[str] = None
    category_id: Optional[str] = None
    assigned_team: Optional[str] = None

    duplicate_of_id: Optional[str] = None
    priority_score: int = Field(default=0)

    created_at: datetime = Field(default_factory=datetime.utcnow, index=True)
    updated_at: datetime = Field(default_factory=datetime.utcnow)
    due_at: Optional[datetime] = None
    resolved_at: Optional[datetime] = None

    class Settings:
        name = "occurrences"


class OccurrenceHistory(Document):
    occurrence_id: str
    event_type: str
    status: Optional[OccurrenceStatus] = None
    message: str
    actor_user_id: Optional[str] = None
    actor_name: Optional[str] = None
    created_at: datetime = Field(default_factory=datetime.utcnow, index=True)

    class Settings:
        name = "occurrence_history"


class CitizenNotification(Document):
    user_id: str
    occurrence_id: str
    title: str
    body: str
    read: bool = Field(default=False)
    created_at: datetime = Field(default_factory=datetime.utcnow, index=True)

    class Settings:
        name = "citizen_notifications"


class ProtectiveMeasure(Document):
    occurrence_id: Optional[str] = None
    level: ProtectiveLevel
    trigger: str
    action: str
    notified_roles: str
    active: bool = Field(default=True)
    created_at: datetime = Field(default_factory=datetime.utcnow, index=True)

    class Settings:
        name = "protective_measures"


class User(Document):
    name: str
    email: str
    password_hash: str
    role: UserRole
    secretariat_id: Optional[str] = None
    is_active: bool = Field(default=True)
    created_at: datetime = Field(default_factory=datetime.utcnow)

    class Settings:
        name = "users"
