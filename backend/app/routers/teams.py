from typing import List
from uuid import UUID
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from app.database import get_db
from app.models.user import User, Team, TeamMember, UserRole
from app.schemas.user import TeamCreate, TeamResponse
from app.services.auth_service import get_current_user

router = APIRouter(prefix="/api/teams", tags=["Teams"])


@router.get("", response_model=List[TeamResponse])
async def list_teams(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    if current_user.role == UserRole.ADMIN:
        result = await db.execute(select(Team))
    else:
        result = await db.execute(
            select(Team)
            .join(TeamMember)
            .where(TeamMember.user_id == current_user.id)
        )
    return list(result.scalars().all())


@router.post("", response_model=TeamResponse, status_code=status.HTTP_201_CREATED)
async def create_team(
    team_data: TeamCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    team = Team(name=team_data.name, description=team_data.description)
    db.add(team)
    await db.flush()

    # Add creator as admin of the team
    team_member = TeamMember(user_id=current_user.id, team_id=team.id, role=UserRole.ADMIN)
    db.add(team_member)
    await db.flush()
    await db.refresh(team)

    return team


@router.get("/{team_id}", response_model=TeamResponse)
async def get_team(
    team_id: UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    result = await db.execute(select(Team).where(Team.id == team_id))
    team = result.scalar_one_or_none()

    if not team:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Team not found")

    # Check access
    if current_user.role != UserRole.ADMIN:
        member_result = await db.execute(
            select(TeamMember).where(
                TeamMember.team_id == team_id,
                TeamMember.user_id == current_user.id
            )
        )
        if not member_result.scalar_one_or_none():
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Access denied")

    return team


@router.delete("/{team_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_team(
    team_id: UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    result = await db.execute(select(Team).where(Team.id == team_id))
    team = result.scalar_one_or_none()

    if not team:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Team not found")

    # Check if user is admin
    if current_user.role != UserRole.ADMIN:
        member_result = await db.execute(
            select(TeamMember).where(
                TeamMember.team_id == team_id,
                TeamMember.user_id == current_user.id,
                TeamMember.role == UserRole.ADMIN
            )
        )
        if not member_result.scalar_one_or_none():
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Admin access required")

    await db.delete(team)
