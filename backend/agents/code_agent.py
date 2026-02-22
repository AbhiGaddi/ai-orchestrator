"""
CodeAgent — Phase 2 (NOT YET IMPLEMENTED)

Planned Responsibility:
  Given an approved task, write the implementation code,
  create a new git branch, commit the code, and open a Pull Request.

Input context keys (planned):
  - task_id: str
  - title: str
  - description: str
  - acceptance_criteria: str
  - github_issue_id: str

Output context keys (planned):
  - github_pr_id: str
  - github_pr_url: str
  - branch_name: str
"""
from backend.agents.base_agent import BaseAgent, AgentResult


class CodeAgent(BaseAgent):
    name = "CodeAgent"

    async def run(self, context: dict) -> AgentResult:
        raise NotImplementedError(
            "CodeAgent is planned for Phase 2. "
            "It will write code, commit to a branch, and open a Pull Request."
        )
