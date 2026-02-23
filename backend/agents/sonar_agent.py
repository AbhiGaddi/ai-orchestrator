import json
import re
from backend.agents.base_agent import BaseAgent, AgentResult
from backend.services.github_service import GitHubService
from backend.services.gemini_service import GeminiService
from backend.core.logging import get_logger

logger = get_logger(__name__)

SYSTEM_CONSTITUTION = """
<IDENTITY>
You are a Staff Software Engineer and Static Analysis Specialist.
Your job is to analyze a SonarCloud issue and generate a production-ready fix.
</IDENTITY>

<ANALYSIS_PROTOCOL>
1. Look at the Sonar violation message, the file path, and the specific line/range.
2. Formulate a code fix that resolves the issue while maintaining the existing code's logic and style.
3. Your output MUST be a strict JSON object mapping the file path to its complete, corrected string content.
</ANALYSIS_PROTOCOL>

<OUTPUT_SCHEMA>
{
  "file_path.ts": "complete content with the sonar fix applied"
}
</OUTPUT_SCHEMA>
"""

USER_PROMPT = """
<SONAR_ISSUE>
Rule: {rule}
Severity: {severity}
Message: {message}
File: {file_path}
Line: {line}
Debt: {debt}
</SONAR_ISSUE>

<PROJECT_CONTEXT>
Guidelines: {guidelines}
Architecture: {architecture}
</PROJECT_CONTEXT>

Generate the necessary fix for this Sonar violation. Return the full file content strictly according to the <OUTPUT_SCHEMA>.
"""

class SonarAgent(BaseAgent):
    name = "SonarAgent"

    def __init__(self):
        self.llm = GeminiService()

    async def run(self, context: dict) -> AgentResult:
        issue = context.get("sonar_issue")
        if not issue:
            return AgentResult(success=False, error="No sonar issue provided in context")

        # Extract issue details
        rule = issue.get("rule", "Unknown")
        severity = issue.get("severity", "Unknown")
        message = issue.get("message", "")
        file_path = issue.get("component", "").split(":")[-1] # Sonar uses project:file format
        line = issue.get("line", "N/A")
        debt = issue.get("debt", "N/A")

        guidelines = context.get("project_guidelines", "Standard best practices.")
        architecture = context.get("services_architecture", "No specific architecture provided.")

        logger.info(f"[{self.name}] Analyzing Sonar issue: {message} at {file_path}:{line}")

        # 1. Generate Fix
        prompt = f"{SYSTEM_CONSTITUTION}\n\n{USER_PROMPT.format(rule=rule, severity=severity, message=message, file_path=file_path, line=line, debt=debt, guidelines=guidelines, architecture=architecture)}"
        
        raw_response = await self.llm.complete(prompt)
        
        clean_response = raw_response
        match = re.search(r'\{.*\}', raw_response, re.DOTALL)
        if match:
            clean_response = match.group(0)
            
        try:
            files_to_commit = json.loads(clean_response)
        except Exception as e:
            logger.error(f"[{self.name}] Failed to parse fix JSON: {e}")
            return AgentResult(success=False, error="Failed to generate parseable fix")

        # 2. Commit & PR (similar to CodeAgent but customized for Sonar)
        github = GitHubService(repo=context.get("github_repo"))
        branch_name = f"fix/sonar-{issue.get('key', 'unknown')[:8]}"
        base_branch = await github.get_default_branch()

        try:
            logger.info(f"[{self.name}] Creating branch {branch_name}")
            await github.create_branch(branch_name, from_ref=base_branch)
            
            for path, content in files_to_commit.items():
                await github.create_or_update_file(
                    branch=branch_name,
                    file_path=path,
                    content=str(content),
                    commit_message=f"Fix Sonar violation: {message}"
                )
                
            pr_title = f"Fix Sonar: {message}"
            pr_body = f"## 🤖 AI Automated Sonar Fix\n\n**Issue**: {message}\n**Rule**: {rule}\n**File**: {file_path}:{line}\n\nThis PR was automatically generated to resolve a SonarCloud violation."
            
            pr_result = await github.create_pull_request(
                title=pr_title,
                body=pr_body,
                head=branch_name,
                base=base_branch
            )
            
        except Exception as e:
            logger.error(f"[{self.name}] GitHub operation failed: {e}")
            return AgentResult(success=False, error=str(e))

        return AgentResult(
            success=True,
            output={
                "github_pr_id": str(pr_result.get("number", "")),
                "github_pr_url": pr_result.get("html_url", ""),
                "branch_name": branch_name,
                "issue_key": issue.get("key")
            }
        )
