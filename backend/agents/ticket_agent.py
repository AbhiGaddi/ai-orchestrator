"""
TicketAgent — Phase 1

Responsibility:
  Creates a GitHub issue for an approved task.

Input context keys:
  - task_id: str
  - title: str
  - description: str
  - acceptance_criteria: str
  - deadline: str | None
  - priority: str

Output context keys:
  - github_issue_id: str
  - github_issue_url: str
"""
from backend.agents.base_agent import BaseAgent, AgentResult
from backend.services.github_service import GitHubService
from backend.core.logging import get_logger

logger = get_logger(__name__)


class TicketAgent(BaseAgent):
    name = "TicketAgent"

    def __init__(self):
        self.github = GitHubService()

    async def run(self, context: dict) -> AgentResult:
        title = context.get("title", "")
        description = context.get("description", "")
        acceptance_criteria = context.get("acceptance_criteria", "")
        deadline = context.get("deadline", "Not specified")
        priority = context.get("priority", "MEDIUM")
        task_id = context.get("task_id", "")

        if not title:
            return AgentResult(success=False, error="Task title is required to create a GitHub issue")

        body = self._format_issue_body(description, acceptance_criteria, deadline, priority, task_id)

        logger.info(f"[{self.name}] Creating GitHub issue: {title!r}")
        try:
            issue = await self.github.create_issue(title=title, body=body, labels=["ai-orchestrator", priority.lower()])
        except Exception as e:
            return AgentResult(success=False, error=str(e))

        logger.info(f"[{self.name}] Issue created: #{issue['number']} {issue['html_url']}")
        return AgentResult(
            success=True,
            output={
                "github_issue_id": str(issue["number"]),
                "github_issue_url": issue["html_url"],
            },
        )

    def _format_issue_body(self, description, acceptance_criteria, deadline, priority, task_id) -> str:
        return f"""## 📋 Description
{description or "_No description provided._"}

## ✅ Acceptance Criteria
{acceptance_criteria or "_No acceptance criteria provided._"}

## 📅 Deadline
{deadline or "Not specified"}

## 🔥 Priority
{priority}

---
> 🤖 *This issue was automatically created by AI Orchestrator*
> Task ID: `{task_id}`
"""
