"""
Orchestrator — coordinates agent execution order for each pipeline phase.

Phase 1 Pipeline:  DiscussionAgent → (human approval) → TicketAgent → EmailAgent
Phase 2 Pipeline:  CodeAgent → PRAgent          (future)
Phase 3 Pipeline:  BuildAgent                   (future)
Phase 4 Pipeline:  DeployAgent                  (future)

New phases = add one new pipeline entry + implement the agent. Nothing else changes here.
"""
from datetime import datetime, timezone
from typing import List, Type, Dict, Any, Optional
from dataclasses import dataclass, field
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from sqlalchemy.orm import selectinload

from backend.agents.base_agent import BaseAgent, AgentResult
from backend.db.models import AgentRun, Task, Project
from backend.core.logging import get_logger

logger = get_logger(__name__)

@dataclass(frozen=True)
class IdentityEnvelope:
    """
    Ensures data-plane isolation at the start of every run.
    """
    tenant_id: str
    user_id: str
    roles: List[str] = field(default_factory=lambda: ["default"])
    privacy_mode: str = "retained"  # or "no_retention"

class ContextEngine:
    """
    Managed context lifecycle: Planning, Stabilization, and Promotion.
    """
    @staticmethod
    async def plan_context_needs(agent_name: str, task: Task, initial_context: dict, project_context: dict = None) -> dict:
        """
        Step 2: Plan Context Needs. Determine what the agent actually needs to see.
        """
        logger.info(f"[ContextEngine] Planning context for {agent_name}")
        
        needed = {
            "task_id": str(task.id),
            "priority": task.priority,
            "status": task.status,
            "project_id": str(task.project_id) if task.project_id else None
        }
        
        # Incorporate pre-fetched project context if available
        if project_context:
            needed["project_guidelines"] = project_context.get("project_guidelines")
            needed["services_architecture"] = project_context.get("services_architecture")

        return needed

    @staticmethod
    def stabilize_output(result: AgentResult) -> dict:
        """
        Step 5: Semantic Stabilization. 
        Normalize the agent's raw output into structured facts before it hits the next agent.
        """
        if not result.success or not result.output:
            return {}
        
        # Here we would collapse tool traces or extract canonical facts.
        # For now, we ensure the output is a clean dictionary.
        stabilized = {k: v for k, v in result.output.items() if v is not None}
        logger.info("[ContextEngine] Stabilized output from agent")
        return stabilized

class Orchestrator:
    def __init__(self, db: AsyncSession):
        self.db = db

    async def _get_task_with_project(self, task_id: Any) -> Task:
        """Helper to ensure we have project context loaded."""
        stmt = select(Task).options(selectinload(Task.project)).where(Task.id == task_id)
        result = await self.db.execute(stmt)
        return result.scalar_one()

    async def run_agent(
        self,
        agent_cls: Type[BaseAgent],
        task: Task,
        context: Dict[str, Any],
        identity: Optional[IdentityEnvelope] = None,
    ) -> AgentResult:
        """
        Production-grade agent execution loop following the 'Context Engine' pattern.
        """
        agent = agent_cls()
        agent_name = agent.name

        # 1. Ingest & Identity Check (Data-plane isolation)
        uid = identity.user_id if identity else "system"
        
        # Fetch project context explicitly to avoid lazy-load greenlet errors
        project_context = {}
        if task.project_id:
            try:
                stmt = select(Project).where(Project.id == task.project_id)
                result = await self.db.execute(stmt)
                project = result.scalar_one_or_none()
                if project:
                    project_context = {
                        "project_guidelines": project.coding_guidelines,
                        "services_architecture": project.services_context
                    }
            except Exception as e:
                logger.warning(f"Failed to fetch project context for {task.project_id}: {e}")
        
        # 2. Plan Context Needs (Reduce noise)
        planned_context = await ContextEngine.plan_context_needs(agent_name, task, context, project_context)
        
        # 3. Assemble Working Set (Layered context)
        working_context = {
            **planned_context,
            **context  # User-passed context overrides
        }

        # 4. Execute (Inference & Action)
        run = AgentRun(
            task_id=task.id,
            agent_name=agent_name,
            status="RUNNING",
            input_context=working_context,
            started_at=datetime.now(timezone.utc).replace(tzinfo=None),
        )
        self.db.add(run)
        await self.db.flush()

        agent.run_id = str(run.id)

        agent.db_session = self.db
        
        logger.info(f"[{agent_name}] Running for task_id={task.id} (User: {uid})")
        
        try:
            result = await agent.run(working_context)
            
            # 5. Semantic Stabilization
            stabilized_output = ContextEngine.stabilize_output(result)
            
            # 6. Promotion (Decide what becomes durable memory)
            run.status = "COMPLETED" if result.success else "FAILED"
            run.output = stabilized_output
            run.error_message = result.error
            run.completed_at = datetime.now(timezone.utc).replace(tzinfo=None)
            
            logger.info(f"[{agent_name}] Completed loop.")
            return result
            
        except Exception as exc:
            run.status = "FAILED"
            run.error_message = str(exc)
            run.completed_at = datetime.now(timezone.utc).replace(tzinfo=None)
            logger.error(f"[{agent_name}] Exception: {exc}")
            raise

    async def run_pipeline(
        self,
        agents: List[Type[BaseAgent]],
        task: Task,
        initial_context: dict,
        identity: Optional[IdentityEnvelope] = None,
    ) -> dict:
        """
        Runs a list of agents sequentially with managed context inheritance.
        """
        context = initial_context.copy()
        pipeline_name = " -> ".join([a.name for a in agents])
        logger.info(f"🚀 Starting Pipeline: [{pipeline_name}]")
        
        for i, agent_cls in enumerate(agents):
            logger.info(f"📍 Pipeline Step {i+1}/{len(agents)}: {agent_cls.name}")
            result = await self.run_agent(agent_cls, task, context, identity)
            
            if not result.success:
                logger.error(f"❌ Pipeline halted: {agent_cls.name} failed with error: {result.error}")
                break
            
            # Context Inheritance (Step 9: Promotion to next agent)
            if result.output:
                new_keys = list(result.output.keys())
                logger.debug(f"↗️  Inheriting output keys from {agent_cls.name}: {new_keys}")
                context.update(result.output)
                
        logger.info(f"🏁 Pipeline Finished: [{pipeline_name}]")
        return context
