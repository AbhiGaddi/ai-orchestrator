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
from backend.agents.code_agent import CodeAgent
from backend.agents.pr_agent import PRAgent
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
        "github_repo": task.github_repo,
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

@router.post("/{task_id}/code", response_model=TaskResponse)
async def generate_code(
    task_id: UUID, 
    base_branch: str = None, 
    target_branch: str = None, 
    db: AsyncSession = Depends(get_db)
):
    """
    Explicit execution trigger for Phase 2: Code Generation.
    Triggers CodeAgent to read instructions, generate code, create a branch, and open a PR.
    """
    result = await db.execute(select(Task).where(Task.id == task_id))
    task = result.scalar_one_or_none()
    
    if not task:
        raise HTTPException(status_code=404, detail=f"Task {task_id} not found")

    if task.status != "COMPLETED" and not task.github_issue_id:
        raise HTTPException(
            status_code=400,
            detail="Phase 1 (Ticket Creation) must be completed before generating code."
        )

    task.status = "IN_PROGRESS"
    await db.flush()

    orchestrator = Orchestrator(db)
    context = {
        "task_id": str(task.id),
        "title": task.title,
        "description": task.description,
        "acceptance_criteria": task.acceptance_criteria,
        "github_issue_id": task.github_issue_id,
        "deadline": task.deadline,
        "priority": task.priority,
        "base_branch": base_branch,
        "target_branch": target_branch,
        "github_repo": task.github_repo,
    }

    try:
        # Step 3: Generate Code and PR
        code_result = await orchestrator.run_agent(CodeAgent, task, context)
        
        if code_result.success:
            task.github_pr_id = code_result.output.get("github_pr_id")
            task.github_pr_url = code_result.output.get("github_pr_url")
            task.branch_name = code_result.output.get("branch_name")

        task.status = "COMPLETED"
        logger.info(f"[Execution API] Task {task_id} Phase 2 completed")

    except Exception as e:
        task.status = "FAILED"
        logger.error(f"[Execution API] Task {task_id} Phase 2 failed: {e}")
        await db.flush()
        raise HTTPException(status_code=500, detail=f"Phase 2 pipeline failed: {str(e)}")

    return TaskResponse.model_validate(task)

@router.post("/{task_id}/review", response_model=TaskResponse)
async def review_pr(task_id: UUID, db: AsyncSession = Depends(get_db)):
    """
    Explicit execution trigger for Phase 2.5: PR Review.
    Triggers PRAgent to analyze the PR diff, post comments, and resolve any generated errors.
    """
    result = await db.execute(select(Task).where(Task.id == task_id))
    task = result.scalar_one_or_none()
    
    if not task:
        raise HTTPException(status_code=404, detail=f"Task {task_id} not found")

    if not task.github_pr_id or not task.branch_name:
        raise HTTPException(
            status_code=400,
            detail="Phase 2 (Code Generation) must be completed before reviewing code."
        )

    task.status = "IN_PROGRESS"
    await db.flush()

    orchestrator = Orchestrator(db)
    context = {
        "task_id": str(task.id),
        "title": task.title,
        "description": task.description,
        "github_pr_id": task.github_pr_id,
        "branch_name": task.branch_name,
        "github_repo": task.github_repo,
    }

    try:
        # Step 4: PR Review & Resolution
        await orchestrator.run_agent(PRAgent, task, context)
        
        task.pr_reviewed = True
        task.status = "COMPLETED"
        logger.info(f"[Execution API] Task {task_id} PR Review completed")

    except Exception as e:
        task.status = "FAILED"
        logger.error(f"[Execution API] Task {task_id} PR Review failed: {e}")
        await db.flush()
        raise HTTPException(status_code=500, detail=f"PR Review pipeline failed: {str(e)}")

    return TaskResponse.model_validate(task)
