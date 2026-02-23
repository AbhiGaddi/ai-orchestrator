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
    def __init__(self, repo: str = None):
        repo_str = repo or settings.GITHUB_REPO
        # Handle full URL if pasted
        if repo_str.startswith("http"):
            # owner/repo is usually the last two segments
            parts = repo_str.rstrip("/").split("/")
            if len(parts) >= 2:
                repo_str = f"{parts[-2]}/{parts[-1]}"
        
        self.repo = repo_str  # owner/repo
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
    # Phase 2 — CodeAgent & PR Operations
    # -------------------------------------------------------
    async def get_ref(self, ref: str = "heads/main") -> str:
        """Get the SHA of a specific reference (e.g., branch)."""
        url = f"{GITHUB_API_BASE}/repos/{self.repo}/git/ref/{ref}"
        async with httpx.AsyncClient(timeout=30) as client:
            response = await client.get(url, headers=self.headers)
        
        if response.status_code != 200:
            raise RuntimeError(f"GitHub API error {response.status_code}: {response.text}")
        return response.json()["object"]["sha"]

    async def create_branch(self, branch_name: str, from_ref: str = "main") -> dict:
        """Create a new branch from a base branch."""
        # 1. Get the base branch SHA
        base_sha = await self.get_ref(f"heads/{from_ref}")
        
        # 2. Create the new branch ref
        url = f"{GITHUB_API_BASE}/repos/{self.repo}/git/refs"
        payload = {
            "ref": f"refs/heads/{branch_name}",
            "sha": base_sha
        }
        
        async with httpx.AsyncClient(timeout=30) as client:
            response = await client.post(url, json=payload, headers=self.headers)
            
        if response.status_code != 201:
            raise RuntimeError(f"Failed to create branch: {response.status_code} - {response.text}")
        return response.json()
        
    async def create_or_update_file(self, branch: str, file_path: str, content: str, commit_message: str) -> dict:
        """Create or update a file in the repository."""
        import base64
        url = f"{GITHUB_API_BASE}/repos/{self.repo}/contents/{file_path}"
        
        payload = {
            "message": commit_message,
            "content": base64.b64encode(content.encode("utf-8")).decode("utf-8"),
            "branch": branch
        }
        
        async with httpx.AsyncClient(timeout=30) as client:
            # Check if file exists to get its SHA (required for updates)
            get_resp = await client.get(url, params={"ref": branch}, headers=self.headers)
            if get_resp.status_code == 200:
                payload["sha"] = get_resp.json()["sha"]
                
            response = await client.put(url, json=payload, headers=self.headers)
            
        if response.status_code not in (200, 201):
            raise RuntimeError(f"Failed to commit file: {response.status_code} - {response.text}")
        return response.json()

    async def create_pull_request(self, title: str, body: str, head: str, base: str = "main") -> dict:
        """Create a Pull Request."""
        url = f"{GITHUB_API_BASE}/repos/{self.repo}/pulls"
        payload = {
            "title": title,
            "body": body,
            "head": head,
            "base": base
        }
        async with httpx.AsyncClient(timeout=30) as client:
            response = await client.post(url, json=payload, headers=self.headers)
            
        if response.status_code != 201:
            raise RuntimeError(f"Failed to create PR: {response.status_code} - {response.text}")
        return response.json()

    async def get_pull_request_files(self, pr_number: int) -> list:
        """Fetch the list of files modified in a Pull Request, including their patch/diff."""
        url = f"{GITHUB_API_BASE}/repos/{self.repo}/pulls/{pr_number}/files"
        async with httpx.AsyncClient(timeout=30) as client:
            response = await client.get(url, headers=self.headers)
            
        if response.status_code != 200:
            raise RuntimeError(f"Failed to fetch PR files: {response.status_code} - {response.text}")
        return response.json()

    async def create_pr_review_comment(self, pr_number: int, body: str) -> dict:
        """Add a general comment to the Pull Request."""
        # Note: GitHub PR comments use the issues endpoint
        url = f"{GITHUB_API_BASE}/repos/{self.repo}/issues/{pr_number}/comments"
        payload = {"body": body}
        
        async with httpx.AsyncClient(timeout=30) as client:
            response = await client.post(url, json=payload, headers=self.headers)
            
        if response.status_code != 201:
            raise RuntimeError(f"Failed to post PR comment: {response.status_code} - {response.text}")
        return response.json()

    async def get_pr_comments(self, pr_number: int) -> list:
        """Fetch all comments on the Pull Request (both issue comments and review comments)."""
        issue_comments_url = f"{GITHUB_API_BASE}/repos/{self.repo}/issues/{pr_number}/comments"
        review_comments_url = f"{GITHUB_API_BASE}/repos/{self.repo}/pulls/{pr_number}/comments"
        
        async with httpx.AsyncClient(timeout=30) as client:
            issue_resp = await client.get(issue_comments_url, headers=self.headers)
            review_resp = await client.get(review_comments_url, headers=self.headers)
            
        all_comments = []
        if issue_resp.status_code == 200:
            all_comments.extend(issue_resp.json())
        if review_resp.status_code == 200:
            all_comments.extend(review_resp.json())
            
        return all_comments
