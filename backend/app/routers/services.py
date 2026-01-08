from typing import Optional
from uuid import UUID
from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload
from app.database import get_db
from app.models.user import User, TeamMember, UserRole
from app.models.service import Service
from app.schemas.service import ServiceCreate, ServiceUpdate, ServiceResponse, ServiceListResponse
from app.services.auth_service import get_current_user
from app.services.monitor_service import get_services_with_status

router = APIRouter(prefix="/api/services", tags=["Services"])


async def check_team_access(db: AsyncSession, user: User, team_id: UUID) -> bool:
    if user.role == UserRole.ADMIN:
        return True
    result = await db.execute(
        select(TeamMember).where(
            TeamMember.team_id == team_id,
            TeamMember.user_id == user.id
        )
    )
    return result.scalar_one_or_none() is not None


@router.get("", response_model=ServiceListResponse)
async def list_services(
    team_id: Optional[UUID] = Query(None),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    if team_id and not await check_team_access(db, current_user, team_id):
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Access denied")

    services = await get_services_with_status(db, team_id)
    return ServiceListResponse(services=services, total=len(services))


@router.post("", response_model=ServiceResponse, status_code=status.HTTP_201_CREATED)
async def create_service(
    service_data: ServiceCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    if not await check_team_access(db, current_user, service_data.team_id):
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Access denied to team")

    service = Service(
        name=service_data.name,
        description=service_data.description,
        url=service_data.url,
        team_id=service_data.team_id
    )
    db.add(service)
    await db.flush()

    # Reload with environments relationship to avoid async lazy loading issue
    result = await db.execute(
        select(Service)
        .options(selectinload(Service.environments))
        .where(Service.id == service.id)
    )
    return result.scalar_one()


@router.get("/{service_id}", response_model=ServiceResponse)
async def get_service(
    service_id: UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    result = await db.execute(
        select(Service)
        .options(selectinload(Service.environments))
        .where(Service.id == service_id)
    )
    service = result.scalar_one_or_none()

    if not service:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Service not found")

    if not await check_team_access(db, current_user, service.team_id):
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Access denied")

    return service


@router.put("/{service_id}", response_model=ServiceResponse)
async def update_service(
    service_id: UUID,
    service_data: ServiceUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    result = await db.execute(select(Service).where(Service.id == service_id))
    service = result.scalar_one_or_none()

    if not service:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Service not found")

    if not await check_team_access(db, current_user, service.team_id):
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Access denied")

    if service_data.name is not None:
        service.name = service_data.name
    if service_data.description is not None:
        service.description = service_data.description
    if service_data.url is not None:
        service.url = service_data.url

    await db.flush()

    # Reload with environments relationship to avoid async lazy loading issue
    result = await db.execute(
        select(Service)
        .options(selectinload(Service.environments))
        .where(Service.id == service_id)
    )
    return result.scalar_one()


@router.delete("/{service_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_service(
    service_id: UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    result = await db.execute(select(Service).where(Service.id == service_id))
    service = result.scalar_one_or_none()

    if not service:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Service not found")

    if not await check_team_access(db, current_user, service.team_id):
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Access denied")

    await db.delete(service)
