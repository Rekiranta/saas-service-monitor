from typing import List
from uuid import UUID
from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from app.database import get_db
from app.models.user import User, TeamMember, UserRole
from app.models.environment import Environment
from app.models.service import Service
from app.schemas.health_check import HealthCheckResponse, HealthCheckCreate
from app.services.auth_service import get_current_user
from app.services.monitor_service import perform_health_check, get_health_check_history

router = APIRouter(prefix="/api/health-checks", tags=["Health Checks"])


async def check_environment_access(db: AsyncSession, user: User, environment_id: UUID) -> Environment:
    result = await db.execute(select(Environment).where(Environment.id == environment_id))
    environment = result.scalar_one_or_none()

    if not environment:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Environment not found")

    service_result = await db.execute(select(Service).where(Service.id == environment.service_id))
    service = service_result.scalar_one_or_none()

    if user.role != UserRole.ADMIN:
        member_result = await db.execute(
            select(TeamMember).where(
                TeamMember.team_id == service.team_id,
                TeamMember.user_id == user.id
            )
        )
        if not member_result.scalar_one_or_none():
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Access denied")

    return environment


@router.post("/trigger", response_model=HealthCheckResponse)
async def trigger_health_check(
    check_data: HealthCheckCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    await check_environment_access(db, current_user, check_data.environment_id)
    health_check = await perform_health_check(db, check_data.environment_id)
    return health_check


@router.get("/environment/{environment_id}", response_model=List[HealthCheckResponse])
async def get_environment_health_history(
    environment_id: UUID,
    limit: int = Query(default=100, le=500),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    await check_environment_access(db, current_user, environment_id)
    history = await get_health_check_history(db, environment_id, limit)
    return history


@router.get("/latest/{environment_id}", response_model=HealthCheckResponse)
async def get_latest_health(
    environment_id: UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    from app.services.monitor_service import get_latest_health_check

    await check_environment_access(db, current_user, environment_id)
    latest = await get_latest_health_check(db, environment_id)

    if not latest:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="No health checks found")

    return latest
