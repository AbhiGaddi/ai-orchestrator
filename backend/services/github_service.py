"""
GitHubService — pure wrapper around GitHub REST API.
No business logic. TicketAgent (and future PRAgent) use this.
"""
import httpx
from backend.config import get_settings
from backend.core.logging import get_logger

logger = get_logger(__name__)
settings = get_settings()

GITHUB_API_BASE = "https://api.github.com"


class GitHubService:
    def __init__(self):
        self.repo = settings.GITHUB_REPO  # owner/repo
        self.headers = {
            "Authorization": f"Bearer {settings.GITHUB_TOKEN}",
            "Accept": "application/vnd.github+json",
            "X-GitHub-Api-Version": "2022-11-28",
        }

    async def create_issue(self, title: str, body: str, labels: list[str] = None) -> dict:
        """Create a GitHub issue and return the issue dict."""
        url = f"{GITHUB_API_BASE}/repos/{self.repo}/issues"
        payload = {"title": title, "body": body}
        if labels:
            payload["labels"] = labels

        async with httpx.AsyncClient(timeout=30) as client:
            response = await client.post(url, json=payload, headers=self.headers)

        if response.status_code not in (200, 201):
            raise RuntimeError(
                f"GitHub API error {response.status_code}: {response.text}"
            )
        return response.json()

    async def get_issue(self, issue_number: int) -> dict:
        """Fetch a GitHub issue by number."""
        url = f"{GITHUB_API_BASE}/repos/{self.repo}/issues/{issue_number}"
        async with httpx.AsyncClient(timeout=30) as client:
            response = await client.get(url, headers=self.headers)
        response.raise_for_status()
        return response.json()

    # -------------------------------------------------------
    # Phase 2 stubs — will be implemented in CodeAgent
    # -------------------------------------------------------
    async def create_branch(self, branch_name: str, from_ref: str = "main") -> dict:
        raise NotImplementedError("Phase 2 — create_branch not yet implemented")

    async def create_pull_request(self, title: str, body: str, head: str, base: str = "main") -> dict:
        raise NotImplementedError("Phase 2 — create_pull_request not yet implemented")
