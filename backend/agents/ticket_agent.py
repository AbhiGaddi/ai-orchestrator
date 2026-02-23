import json
import re
from backend.agents.base_agent import BaseAgent, AgentResult
from backend.services.github_service import GitHubService
from backend.services.gemini_service import GeminiService
from backend.core.logging import get_logger

logger = get_logger(__name__)

# --- TICKET AGENT CONSTITUTION ---
SYSTEM_CONSTITUTION = """
<IDENTITY>
You are a Technical Security Officer and Project Manager. Your job is to ensure that engineering tickets are clear, actionable, and SECURE.
</IDENTITY>

<SECURITY_PROTOCOL>
Before formatting the issue, you MUST perform a reasoning-based security check on the task details:
1. SECRETS: Look for passwords, API keys, or tokens in the description.
2. SENSITIVE_INFO: Look for customer PII, internal IP addresses, or proprietary credentials.
3. EXPOSURE: If this is a public repository, ensure internal architecture details are not overly exposed.

If you find a security risk, you MUST redact it or sanitize the description before outputting.
</SECURITY_PROTOCOL>

<FORMATTING_GUIDELINES>
- Use professional Markdown.
- Ensure acceptance criteria are bulleted.
- Attach the original Task ID for traceability.
</FORMATTING_GUIDELINES>

<OUTPUT_SCHEMA>
{{
  "security_scan": {{
    "risk_found": bool,
    "severity": "NONE" | "LOW" | "HIGH",
    "redactions_made": [str]
  }},
  "sanitized_title": str,
  "issue_body": str
}}
</OUTPUT_SCHEMA>
"""

USER_PROMPT = """
<TASK_DETAILS>
Title: {title}
Description: {description}
Acceptance Criteria: {acceptance_criteria}
Deadline: {deadline}
Priority: {priority}
Task ID: {task_id}
</TASK_DETAILS>

Analyze the task above. Perform the security scan and generate the sanitized GitHub issue content in JSON format according to the <OUTPUT_SCHEMA>.
"""

class TicketAgent(BaseAgent):
    name = "TicketAgent"

    def __init__(self):
        self.llm = GeminiService()

    async def run(self, context: dict) -> AgentResult:
        github = GitHubService(repo=context.get("github_repo"))
        title = context.get("title", "")
        description = context.get("description", "")
        acceptance_criteria = context.get("acceptance_criteria", "")
        deadline = context.get("deadline", "Not specified")
        priority = context.get("priority", "MEDIUM")
        task_id = context.get("task_id", "")

        if not title:
            return AgentResult(success=False, error="Task title is required")

        # 1. Security Analysis & Formatting (Reasoning Step)
        prompt = f"{SYSTEM_CONSTITUTION}\n\n{USER_PROMPT.format(title=title, description=description, acceptance_criteria=acceptance_criteria, deadline=deadline, priority=priority, task_id=task_id)}"

        logger.info(f"[{self.name}] Performing security scan and formatting.")
        raw_response = await self.llm.complete(prompt)
        
        # Clean markdown formatting if present
        clean_response = raw_response
        match = re.search(r'\{.*\}', raw_response, re.DOTALL)
        if match:
            clean_response = match.group(0)
        
        try:
            data = json.loads(clean_response)
            security_info = data.get("security_scan", {})
            sanitized_title = data.get("sanitized_title", title)
            issue_body = data.get("issue_body", "")
            
            if security_info.get("risk_found"):
                logger.warning(f"[{self.name}] Security risk detected (Severity: {security_info.get('severity')}). Redactions: {security_info.get('redactions_made')}")
        except Exception as e:
            logger.error(f"[{self.name}] Failed to parse security scan output: {e}")
            return AgentResult(success=False, error="Failed to verify security of ticket content")

        # 2. Action (Create Issue)
        try:
            logger.info(f"[{self.name}] Calling GitHub API to create issue in {github.repo}")
            issue = await github.create_issue(
                title=sanitized_title,
                body=issue_body,
                labels=["ai-orchestrator", priority.lower()]
            )
        except Exception as e:
            return AgentResult(success=False, error=str(e))

        logger.info(f"[{self.name}] Issue created: #{issue['number']}")
        return AgentResult(
            success=True,
            output={
                "github_issue_id": str(issue["number"]),
                "github_issue_url": issue["html_url"],
                "security_scan_results": security_info
            },
        )
