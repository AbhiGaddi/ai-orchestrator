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


@router.post("/{task_id}/abort", response_model=TaskResponse)
async def abort_task(task_id: UUID, db: AsyncSession = Depends(get_db)):
    """Stop a task that is currently IN_PROGRESS."""
    task = await _get_task_or_404(task_id, db)
    
    # We allow aborting if it's WORKING or stuck in APPROVED
    task.status = "FAILED"
    task.error_message = "Canceled by user"
    
    logger.info(f"[Approval API] Task {task_id} manually aborted")
    await db.commit()
    return TaskResponse.model_validate(task)


@router.delete("/{task_id}", status_code=204)
async def delete_task(task_id: UUID, db: AsyncSession = Depends(get_db)):
    """Delete a task permanently."""
    task = await _get_task_or_404(task_id, db)
    await db.delete(task)
    await db.commit()
    logger.info(f"[Approval API] Task {task_id} deleted")
    return None

from backend.services.github_service import GitHubService

@router.post("/sync", response_model=dict)
async def sync_tasks(db: AsyncSession = Depends(get_db)):
    """Sync tasks with GitHub to check if PRs are merged."""
    query = select(Task).where(
        and_(
            Task.github_pr_id.is_not(None),
            Task.status.in_(["COMPLETED", "IN_PROGRESS", "REVIEW_DONE"])
        )
    )
    result = await db.execute(query)
    tasks = result.scalars().all()
    
    updated_count = 0
    github_clients = {}
    
    for task in tasks:
        if not task.github_repo:
            continue
            
        repo = task.github_repo
        if repo not in github_clients:
            github_clients[repo] = GitHubService(repo=repo)
            
        try:
            pr_data = await github_clients[repo].get_pull_request(int(task.github_pr_id))
            if pr_data.get("merged"):
                task.status = "DONE"
                updated_count += 1
            elif pr_data.get("state") == "closed" and not pr_data.get("merged"):
                pass  # Do we want to set it to FAILED or leave it?
        except Exception as e:
            logger.error(f"[Sync] Failed to check PR {task.github_pr_id} for task {task.id}: {e}")
            
    if updated_count > 0:
        await db.commit()
        
    return {"status": "success", "updated_tasks": updated_count}
