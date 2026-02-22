"""
Orchestrator — coordinates agent execution order for each pipeline phase.

Phase 1 Pipeline:  DiscussionAgent → (human approval) → TicketAgent → EmailAgent
Phase 2 Pipeline:  CodeAgent → PRAgent          (future)
Phase 3 Pipeline:  BuildAgent                   (future)
Phase 4 Pipeline:  DeployAgent                  (future)

New phases = add one new pipeline entry + implement the agent. Nothing else changes here.
"""
from datetime import datetime
from typing import List, Type
from sqlalchemy.ext.asyncio import AsyncSession

from backend.agents.base_agent import BaseAgent, AgentResult
from backend.db.models import AgentRun, Task
from backend.core.logging import get_logger

logger = get_logger(__name__)


class Orchestrator:
    def __init__(self, db: AsyncSession):
        self.db = db

    async def run_agent(
        self,
        agent_cls: Type[BaseAgent],
        task: Task,
        context: dict,
    ) -> AgentResult:
        """
        Wraps a single agent run with full lifecycle logging into agent_runs table.
        """
        agent = agent_cls()
        run = AgentRun(
            task_id=task.id,
            agent_name=agent.name,
            status="RUNNING",
            input_context=context,
            started_at=datetime.utcnow(),
        )
        self.db.add(run)
        await self.db.flush()  # get the run.id without committing

        logger.info(f"[{agent.name}] Starting — task_id={task.id}")
        try:
            result = await agent.run(context)
            run.status = "COMPLETED"
            run.output = result.output
            run.completed_at = datetime.utcnow()
            logger.info(f"[{agent.name}] Completed — task_id={task.id}")
        except Exception as exc:
            run.status = "FAILED"
            run.error_message = str(exc)
            run.completed_at = datetime.utcnow()
            logger.error(f"[{agent.name}] Failed — task_id={task.id} error={exc}")
            raise

        return result

    async def run_pipeline(
        self,
        agents: List[Type[BaseAgent]],
        task: Task,
        initial_context: dict,
    ) -> dict:
        """
        Runs a list of agents sequentially, passing each agent's output
        as part of context to the next agent.
        """
        context = initial_context.copy()
        for agent_cls in agents:
            result = await self.run_agent(agent_cls, task, context)
            context.update(result.output or {})
        return context
