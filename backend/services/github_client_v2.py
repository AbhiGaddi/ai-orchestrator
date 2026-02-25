import httpx
import jwt
import time
from tenacity import retry, wait_exponential, stop_after_attempt, retry_if_exception_type
from pydantic import BaseModel
from typing import Dict, Any, List

class GitHubError(Exception):
    def __init__(self, message: str, status_code: int):
        self.status_code = status_code
        super().__init__(f"[{status_code}] {message}")

class PullRequestResponse(BaseModel):
    id: int
    number: int
    html_url: str
    state: str

class GitHubAppClient:
    def __init__(self, app_id: str, private_key: str, installation_id: str, repo: str):
        self.app_id = app_id
        self.private_key = private_key
        self.installation_id = installation_id
        self.repo = repo
        self._token = None
        self._token_expires_at = 0
        self.base_url = "https://api.github.com"

    def _generate_jwt(self) -> str:
        now = int(time.time())
        payload = {"iat": now - 60, "exp": now + (10 * 60), "iss": self.app_id}
        return jwt.encode(payload, self.private_key, algorithm="RS256")

    async def _get_installation_token(self) -> str:
        if self._token and time.time() < self._token_expires_at:
            return self._token

        jwt_token = self._generate_jwt()
        url = f"{self.base_url}/app/installations/{self.installation_id}/access_tokens"
        
        async with httpx.AsyncClient() as client:
            resp = await client.post(
                url, 
                headers={"Authorization": f"Bearer {jwt_token}", "Accept": "application/vnd.github+json"}
            )
            resp.raise_for_status()
            data = resp.json()
            self._token = data["token"]
            # Expire internal cache 1 minute before actual API expiry
            self._token_expires_at = int(time.time()) + 3540 
            return self._token

    @retry(
        wait=wait_exponential(multiplier=1, min=2, max=10),
        stop=stop_after_attempt(3),
        retry=retry_if_exception_type((httpx.RequestError, httpx.TimeoutException))
    )
    async def _request(self, method: str, endpoint: str, **kwargs) -> Dict[str, Any]:
        token = await self._get_installation_token()
        headers = kwargs.pop("headers", {})
        headers.update({
            "Authorization": f"Bearer {token}",
            "Accept": "application/vnd.github+json",
            "X-GitHub-Api-Version": "2022-11-28"
        })
        
        async with httpx.AsyncClient(timeout=30.0) as client:
            response = await client.request(method, f"{self.base_url}/repos/{self.repo}/{endpoint}", headers=headers, **kwargs)
            
            if response.status_code >= 400:
                raise GitHubError(response.text, response.status_code)
                
            # Handle 204 No Content
            if response.status_code == 204:
                return {}
            # Process empty bodies gracefully
            try:
                return response.json()
            except Exception:
                return {}

    async def create_pull_request(self, title: str, head: str, base: str, body: str = "") -> PullRequestResponse:
        data = await self._request("POST", "pulls", json={"title": title, "head": head, "base": base, "body": body})
        return PullRequestResponse(**data)
        
    async def get_file_content(self, file_path: str, ref: str = "main") -> str:
        import base64
        data = await self._request("GET", f"contents/{file_path}?ref={ref}")
        content_b64 = data.get("content", "")
        return base64.b64decode(content_b64).decode("utf-8")
