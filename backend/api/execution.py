"""
Execution API — POST /api/execution/{task_id}/execute
Triggers TicketAgent → EmailAgent for an approved task.
This is the explicit human-triggered step after approval.
"""
from uuid import UUID
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from backend.db.database import get_db
from backend.db.models import Task
from backend.schemas.task import TaskResponse
from backend.agents.ticket_agent import TicketAgent
from backend.agents.email_agent import EmailAgent
from backend.core.orchestrator import Orchestrator
from backend.core.logging import get_logger

logger = get_logger(__name__)
router = APIRouter(prefix="/api/execution", tags=["Execution"])


@router.post("/{task_id}/execute", response_model=TaskResponse)
async def execute_task(task_id: UUID, db: AsyncSession = Depends(get_db)):
    """
    Explicit execution trigger (human-approved).
    Pipeline: TicketAgent → EmailAgent

    Requires task.approved == True.
    Steps:
      1. TicketAgent creates GitHub issue
      2. EmailAgent sends email summary
    """
    result = await db.execute(select(Task).where(Task.id == task_id))
    task = result.scalar_one_or_none()
    if not task:
        raise HTTPException(status_code=404, detail=f"Task {task_id} not found")

    if not task.approved:
        raise HTTPException(
            status_code=400,
            detail="Task must be approved before execution. Call /approve first."
        )

    if task.status in ("IN_PROGRESS", "COMPLETED"):
        raise HTTPException(
            status_code=409,
            detail=f"Task is already in status={task.status}"
        )

    task.status = "IN_PROGRESS"
    await db.flush()

    orchestrator = Orchestrator(db)

    context = {
        "task_id": str(task.id),
        "title": task.title,
        "description": task.description,
        "acceptance_criteria": task.acceptance_criteria,
        "deadline": task.deadline,
        "priority": task.priority,
    }

    try:
        # Step 1: Create GitHub issue
        ticket_result = await orchestrator.run_agent(TicketAgent, task, context)
        if ticket_result.success:
            task.github_issue_id = ticket_result.output.get("github_issue_id")
            task.github_issue_url = ticket_result.output.get("github_issue_url")
            context.update(ticket_result.output)

        # Step 2: Send email (even if ticket failed, we note it gracefully)
        email_context = {**context, "github_issue_url": task.github_issue_url or ""}
        email_result = await orchestrator.run_agent(EmailAgent, task, email_context)
        if email_result.success:
            task.email_sent = True

        task.status = "COMPLETED"
        logger.info(f"[Execution API] Task {task_id} pipeline completed")

    except Exception as e:
        task.status = "FAILED"
        logger.error(f"[Execution API] Task {task_id} pipeline failed: {e}")
        await db.flush()
        raise HTTPException(status_code=500, detail=f"Execution pipeline failed: {str(e)}")

    return TaskResponse.model_validate(task)
