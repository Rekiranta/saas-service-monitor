import asyncio
from datetime import datetime
from typing import Optional
from uuid import UUID
import httpx
from sqlalchemy import select, desc
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload
from app.models.environment import Environment
from app.models.health_check import HealthCheck, HealthStatus
from app.models.service import Service


async def check_endpoint_health(url: str, timeout: float = 10.0) -> tuple[HealthStatus, int, Optional[int], Optional[str]]:
    """Check health of an endpoint and return status, response_time_ms, status_code, error_message"""
    start_time = datetime.utcnow()

    try:
        async with httpx.AsyncClient() as client:
            response = await client.get(url, timeout=timeout, follow_redirects=True)
            response_time_ms = int((datetime.utcnow() - start_time).total_seconds() * 1000)

            if response.status_code >= 500:
                return HealthStatus.DOWN, response_time_ms, response.status_code, f"Server error: {response.status_code}"
            elif response.status_code >= 400:
                return HealthStatus.DEGRADED, response_time_ms, response.status_code, f"Client error: {response.status_code}"
            elif response_time_ms > 5000:
                return HealthStatus.DEGRADED, response_time_ms, response.status_code, "Slow response time"
            else:
                return HealthStatus.HEALTHY, response_time_ms, response.status_code, None

    except httpx.TimeoutException:
        response_time_ms = int(timeout * 1000)
        return HealthStatus.DOWN, response_time_ms, None, "Request timed out"
    except httpx.RequestError as e:
        response_time_ms = int((datetime.utcnow() - start_time).total_seconds() * 1000)
        return HealthStatus.DOWN, response_time_ms, None, str(e)


async def perform_health_check(db: AsyncSession, environment_id: UUID) -> HealthCheck:
    """Perform a health check for an environment and save the result"""
    result = await db.execute(select(Environment).where(Environment.id == environment_id))
    environment = result.scalar_one_or_none()

    if not environment:
        raise ValueError(f"Environment {environment_id} not found")

    status, response_time_ms, status_code, error_message = await check_endpoint_health(environment.url)

    health_check = HealthCheck(
        environment_id=environment_id,
        status=status,
        response_time_ms=response_time_ms,
        status_code=status_code,
        error_message=error_message
    )

    db.add(health_check)
    await db.flush()
    await db.refresh(health_check)

    return health_check


async def get_latest_health_check(db: AsyncSession, environment_id: UUID) -> Optional[HealthCheck]:
    """Get the most recent health check for an environment"""
    result = await db.execute(
        select(HealthCheck)
        .where(HealthCheck.environment_id == environment_id)
        .order_by(desc(HealthCheck.checked_at))
        .limit(1)
    )
    return result.scalar_one_or_none()


async def get_health_check_history(
    db: AsyncSession,
    environment_id: UUID,
    limit: int = 100
) -> list[HealthCheck]:
    """Get health check history for an environment"""
    result = await db.execute(
        select(HealthCheck)
        .where(HealthCheck.environment_id == environment_id)
        .order_by(desc(HealthCheck.checked_at))
        .limit(limit)
    )
    return list(result.scalars().all())


async def get_services_with_status(db: AsyncSession, team_id: Optional[UUID] = None) -> list[Service]:
    """Get all services with their environments and latest health status"""
    query = select(Service).options(selectinload(Service.environments))

    if team_id:
        query = query.where(Service.team_id == team_id)

    result = await db.execute(query)
    services = list(result.scalars().all())

    # Fetch latest health check for each environment
    for service in services:
        for env in service.environments:
            latest_check = await get_latest_health_check(db, env.id)
            if latest_check:
                env.current_status = latest_check.status
                env.last_check = latest_check.checked_at

    return services
