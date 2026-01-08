from datetime import datetime
from typing import Optional, List
from uuid import UUID
from pydantic import BaseModel
from app.schemas.environment import EnvironmentResponse


class ServiceCreate(BaseModel):
    name: str
    description: Optional[str] = None
    url: Optional[str] = None
    team_id: UUID


class ServiceUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    url: Optional[str] = None


class ServiceResponse(BaseModel):
    id: UUID
    name: str
    description: Optional[str]
    url: Optional[str]
    team_id: UUID
    created_at: datetime
    environments: List[EnvironmentResponse] = []

    class Config:
        from_attributes = True


class ServiceListResponse(BaseModel):
    services: List[ServiceResponse]
    total: int
