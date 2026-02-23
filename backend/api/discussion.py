"""
Discussion API — POST /api/discussion/extract
Accepts transcript text, runs DiscussionAgent, saves tasks to DB.
"""
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from backend.db.database import get_db
from backend.db.models import Task, AgentRun
from backend.schemas.task import ExtractRequest, ExtractResponse, TaskResponse
from backend.agents.discussion_agent import DiscussionAgent
from backend.core.orchestrator import Orchestrator
from backend.core.logging import get_logger

logger = get_logger(__name__)
router = APIRouter(prefix="/api/discussion", tags=["Discussion"])


@router.post("/extract", response_model=ExtractResponse)
async def extract_tasks(request: ExtractRequest, db: AsyncSession = Depends(get_db)):
    """
    Step 1: Upload transcript → DiscussionAgent extracts tasks → Save to DB.
    Returns the list of extracted tasks (status=PENDING, approved=False).
    """
    orchestrator = Orchestrator(db)

    # Create a placeholder task to log the extraction agent run
    # (We use a temporary task record for the agent run, then create real tasks after)
    placeholder = Task(
        title="[Extraction Run]",
        status="PENDING",
        project_id=request.project_id,
    )
    db.add(placeholder)
    await db.flush()

    try:
        result = await orchestrator.run_agent(
            agent_cls=DiscussionAgent,
            task=placeholder,
            context={"transcript": request.transcript, "project_id": str(request.project_id) if request.project_id else None},
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"DiscussionAgent failed: {str(e)}")

    if not result.success:
        raise HTTPException(status_code=422, detail=result.error)

    extracted = result.output.get("extracted_tasks", [])

    # Delete the placeholder extraction task
    await db.delete(placeholder)

    # Save real tasks
    saved_tasks = []
    for task_data in extracted:
        task = Task(
            title=task_data.get("title", "Untitled"),
            description=task_data.get("description"),
            acceptance_criteria=task_data.get("acceptance_criteria"),
            deadline=task_data.get("deadline"),
            priority=task_data.get("priority", "MEDIUM"),
            status="PENDING",
            approved=False,
            project_id=request.project_id,
            github_repo=request.github_repo,
        )
        db.add(task)
        saved_tasks.append(task)

    await db.flush()

    logger.info(f"[Discussion API] Saved {len(saved_tasks)} tasks from extraction")
    return ExtractResponse(
        tasks=[TaskResponse.model_validate(t) for t in saved_tasks],
        count=len(saved_tasks),
    )
