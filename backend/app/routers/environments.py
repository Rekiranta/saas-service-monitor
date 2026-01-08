from uuid import UUID
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from app.database import get_db
from app.models.user import User, TeamMember, UserRole
from app.models.service import Service
from app.models.environment import Environment
from app.schemas.environment import EnvironmentCreate, EnvironmentResponse
from app.services.auth_service import get_current_user
from app.services.monitor_service import get_latest_health_check

router = APIRouter(prefix="/api", tags=["Environments"])


async def check_service_access(db: AsyncSession, user: User, service_id: UUID) -> Service:
    result = await db.execute(select(Service).where(Service.id == service_id))
    service = result.scalar_one_or_none()

    if not service:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Service not found")

    if user.role != UserRole.ADMIN:
        member_result = await db.execute(
            select(TeamMember).where(
                TeamMember.team_id == service.team_id,
                TeamMember.user_id == user.id
            )
        )
        if not member_result.scalar_one_or_none():
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Access denied")

    return service


@router.get("/services/{service_id}/environments", response_model=list[EnvironmentResponse])
async def list_environments(
    service_id: UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    await check_service_access(db, current_user, service_id)

    result = await db.execute(
        select(Environment).where(Environment.service_id == service_id)
    )
    environments = list(result.scalars().all())

    # Add current status to each environment
    for env in environments:
        latest_check = await get_latest_health_check(db, env.id)
        if latest_check:
            env.current_status = latest_check.status
            env.last_check = latest_check.checked_at

    return environments


@router.post("/services/{service_id}/environments", response_model=EnvironmentResponse, status_code=status.HTTP_201_CREATED)
async def create_environment(
    service_id: UUID,
    env_data: EnvironmentCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    await check_service_access(db, current_user, service_id)

    environment = Environment(
        name=env_data.name,
        url=env_data.url,
        service_id=service_id
    )
    db.add(environment)
    await db.flush()
    await db.refresh(environment)
    return environment


@router.get("/environments/{environment_id}", response_model=EnvironmentResponse)
async def get_environment(
    environment_id: UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    result = await db.execute(select(Environment).where(Environment.id == environment_id))
    environment = result.scalar_one_or_none()

    if not environment:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Environment not found")

    await check_service_access(db, current_user, environment.service_id)

    latest_check = await get_latest_health_check(db, environment.id)
    if latest_check:
        environment.current_status = latest_check.status
        environment.last_check = latest_check.checked_at

    return environment


@router.delete("/environments/{environment_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_environment(
    environment_id: UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    result = await db.execute(select(Environment).where(Environment.id == environment_id))
    environment = result.scalar_one_or_none()

    if not environment:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Environment not found")

    await check_service_access(db, current_user, environment.service_id)
    await db.delete(environment)
