from datetime import datetime
from typing import Optional, List
from uuid import UUID
from pydantic import BaseModel
from app.models.health_check import HealthStatus


class HealthCheckCreate(BaseModel):
    environment_id: UUID


class HealthCheckResponse(BaseModel):
    id: UUID
    environment_id: UUID
    status: HealthStatus
    response_time_ms: Optional[int]
    status_code: Optional[int]
    error_message: Optional[str]
    checked_at: datetime

    class Config:
        from_attributes = True


class HealthCheckListResponse(BaseModel):
    health_checks: List[HealthCheckResponse]
    total: int
