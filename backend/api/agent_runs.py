"""
Agent Runs API — GET /api/agent-runs
Polled by frontend dashboard every 3-5 seconds.
"""
from uuid import UUID
from typing import Optional
from fastapi import APIRouter, Depends, Query, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from backend.db.database import get_db
from backend.db.models import AgentRun, AgentRunStep
from backend.schemas.agent_run import AgentRunResponse, AgentRunStepResponse

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
        raise HTTPException(status_code=404, detail=f"AgentRun {run_id} not found")
    return AgentRunResponse.model_validate(run)


@router.get("/{run_id}/steps", response_model=list[AgentRunStepResponse])
async def list_agent_run_steps(run_id: UUID, db: AsyncSession = Depends(get_db)):
    """
    Returns all reasoning steps (ReAct loop iterations) for a specific agent run.
    Used by the frontend AI Reasoning Panel to show the agent's decision trace.
    """
    # Verify the run exists first
    run_result = await db.execute(select(AgentRun).where(AgentRun.id == run_id))
    run = run_result.scalar_one_or_none()
    if not run:
        raise HTTPException(status_code=404, detail=f"AgentRun {run_id} not found")

    result = await db.execute(
        select(AgentRunStep)
        .where(AgentRunStep.agent_run_id == run_id)
        .order_by(AgentRunStep.step_number.asc())
    )
    steps = result.scalars().all()
    return [AgentRunStepResponse.model_validate(s) for s in steps]

