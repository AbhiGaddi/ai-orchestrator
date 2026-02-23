import httpx
from typing import Dict, Any
from backend.core.logging import get_logger

logger = get_logger(__name__)

SONAR_API_BASE = "https://sonarcloud.io/api"

class SonarService:
    def __init__(self, project_key: str, token: str):
        self.project_key = project_key
        self.token = token
        self.auth = (token, "") # SonarCloud uses basic auth with token as username and empty password

    async def get_metrics(self) -> Dict[str, int]:
        """Fetch bug, vulnerability, and code smell counts for the project."""
        url = f"{SONAR_API_BASE}/measures/component"
        params = {
            "component": self.project_key,
            "metricKeys": "bugs,vulnerabilities,code_smells"
        }
        
        async with httpx.AsyncClient(timeout=30) as client:
            try:
                response = await client.get(url, params=params, auth=self.auth)
                if response.status_code != 200:
                    logger.error(f"[SonarService] API error {response.status_code}: {response.text}")
                    return {}
                
                data = response.json()
                measures = data.get("component", {}).get("measures", [])
                
                metrics = {
                    "bugs": 0,
                    "vulnerabilities": 0,
                    "code_smells": 0
                }
                
                for m in measures:
                    key = m.get("metric")
                    value = int(m.get("value", 0))
                    if key == "bugs":
                        metrics["bugs"] = value
                    elif key == "vulnerabilities":
                        metrics["vulnerabilities"] = value
                    elif key == "code_smells":
                        metrics["code_smells"] = value
                        
                return metrics
            except Exception as e:
                logger.error(f"[SonarService] Failed to fetch metrics: {e}")
                return {}

    async def get_issues(self, severity: str = None) -> list:
        """Fetch detailed issues from SonarCloud."""
        url = f"{SONAR_API_BASE}/issues/search"
        params = {
            "componentKeys": self.project_key,
            "resolved": "false",
            "ps": 100 # Page size
        }
        if severity:
            params["severities"] = severity

        async with httpx.AsyncClient(timeout=30) as client:
            try:
                response = await client.get(url, params=params, auth=self.auth)
                if response.status_code != 200:
                    logger.error(f"[SonarService] API error {response.status_code}: {response.text}")
                    return []
                
                return response.json().get("issues", [])
            except Exception as e:
                logger.error(f"[SonarService] Failed to fetch issues: {e}")
                return []
