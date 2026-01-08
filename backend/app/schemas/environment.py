from datetime import datetime
from typing import Optional
from uuid import UUID
from pydantic import BaseModel
from app.models.environment import EnvironmentType
from app.models.health_check import HealthStatus


class EnvironmentCreate(BaseModel):
    name: EnvironmentType
    url: str


class EnvironmentResponse(BaseModel):
    id: UUID
    name: EnvironmentType
    url: str
    service_id: UUID
    created_at: datetime
    current_status: Optional[HealthStatus] = None
    last_check: Optional[datetime] = None

    class Config:
        from_attributes = True
