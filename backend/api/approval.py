"""
Approval API
  PATCH /api/tasks/{task_id}/approve   — approve + optionally edit a task
  PATCH /api/tasks/{task_id}/reject    — reject a task
  GET   /api/tasks                     — list all tasks
  GET   /api/tasks/{task_id}           — get single task
  PATCH /api/tasks/{task_id}           — edit task fields
"""
from uuid import UUID
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, and_
from typing import Optional

from backend.db.database import get_db
from backend.db.models import Task
from backend.schemas.task import TaskResponse, TaskUpdate
from backend.core.logging import get_logger

logger = get_logger(__name__)
router = APIRouter(prefix="/api/tasks", tags=["Tasks"])


async def _get_task_or_404(task_id: UUID, db: AsyncSession) -> Task:
    result = await db.execute(select(Task).where(Task.id == task_id))
    task = result.scalar_one_or_none()
    if not task:
        raise HTTPException(status_code=404, detail=f"Task {task_id} not found")
    return task


@router.get("", response_model=list[TaskResponse])
async def list_tasks(project_id: Optional[UUID] = None, db: AsyncSession = Depends(get_db)):
    """Return all tasks ordered by created_at desc. Optionally filter by project."""
    query = select(Task).order_by(Task.created_at.desc())
    if project_id:
        query = query.where(Task.project_id == project_id)
    
    result = await db.execute(query)
    tasks = result.scalars().all()
    return [TaskResponse.model_validate(t) for t in tasks]


@router.get("/{task_id}", response_model=TaskResponse)
async def get_task(task_id: UUID, db: AsyncSession = Depends(get_db)):
    task = await _get_task_or_404(task_id, db)
    return TaskResponse.model_validate(task)


@router.patch("/{task_id}", response_model=TaskResponse)
async def update_task(task_id: UUID, body: TaskUpdate, db: AsyncSession = Depends(get_db)):
    """Edit task fields before approval."""
    task = await _get_task_or_404(task_id, db)
    updates = body.model_dump(exclude_unset=True)
    for field, value in updates.items():
        setattr(task, field, value)
    return TaskResponse.model_validate(task)


@router.patch("/{task_id}/approve", response_model=TaskResponse)
async def approve_task(task_id: UUID, body: TaskUpdate = None, db: AsyncSession = Depends(get_db)):
    """
    Approve a task (with optional last-minute edits).
    Sets approved=True and status=APPROVED.
    Human must then explicitly call POST /api/execution/{task_id}/execute to trigger agents.
    """
    task = await _get_task_or_404(task_id, db)

    if task.approved:
        raise HTTPException(status_code=409, detail="Task is already approved")

    # Apply any edits that came with the approval
    if body:
        updates = body.model_dump(exclude_unset=True)
        for field, value in updates.items():
            setattr(task, field, value)

    task.approved = True
    task.status = "APPROVED"
    logger.info(f"[Approval API] Task {task_id} approved")
    return TaskResponse.model_validate(task)


@router.patch("/{task_id}/reject", response_model=TaskResponse)
async def reject_task(task_id: UUID, db: AsyncSession = Depends(get_db)):
    """Reject a task — status=REJECTED."""
    task = await _get_task_or_404(task_id, db)
    task.approved = False
    task.status = "REJECTED"
    logger.info(f"[Approval API] Task {task_id} rejected")
    return TaskResponse.model_validate(task)
