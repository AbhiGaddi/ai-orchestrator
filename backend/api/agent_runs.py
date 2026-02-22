"""
Agent Runs API — GET /api/agent-runs
Polled by frontend dashboard every 3-5 seconds.
"""
from uuid import UUID
from typing import Optional
from fastapi import APIRouter, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from backend.db.database import get_db
from backend.db.models import AgentRun
from backend.schemas.agent_run import AgentRunResponse

router = APIRouter(prefix="/api/agent-runs", tags=["Agent Runs"])


@router.get("", response_model=list[AgentRunResponse])
async def list_agent_runs(
    task_id: Optional[UUID] = Query(None, description="Filter by task ID"),
    db: AsyncSession = Depends(get_db),
):
    """
    Returns all agent runs, optionally filtered by task_id.
    Frontend polls this endpoint every 3-5 seconds for live dashboard updates.
    """
    query = select(AgentRun).order_by(AgentRun.started_at.desc())
    if task_id:
        query = query.where(AgentRun.task_id == task_id)
    result = await db.execute(query)
    runs = result.scalars().all()
    return [AgentRunResponse.model_validate(r) for r in runs]


@router.get("/{run_id}", response_model=AgentRunResponse)
async def get_agent_run(run_id: UUID, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(AgentRun).where(AgentRun.id == run_id))
    run = result.scalar_one_or_none()
    if not run:
        from fastapi import HTTPException
        raise HTTPException(status_code=404, detail=f"AgentRun {run_id} not found")
    return AgentRunResponse.model_validate(run)
