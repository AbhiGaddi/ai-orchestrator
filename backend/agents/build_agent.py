"""
BuildAgent — Phase 3 (NOT YET IMPLEMENTED)

Planned Responsibility:
  After a PR is merged, build a Docker image, tag it with the
  commit SHA and version, and push to the container registry.

Input context keys (planned):
  - task_id: str
  - github_pr_id: str
  - commit_sha: str
  - version: str

Output context keys (planned):
  - image_tag: str
  - image_digest: str
  - registry_url: str
"""
from backend.agents.base_agent import BaseAgent, AgentResult


class BuildAgent(BaseAgent):
    name = "BuildAgent"

    async def run(self, context: dict) -> AgentResult:
        raise NotImplementedError(
            "BuildAgent is planned for Phase 3. "
            "It will build a Docker image, tag it, and push to the registry."
        )
