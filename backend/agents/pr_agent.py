import json
import re
from backend.agents.base_agent import BaseAgent, AgentResult
from backend.services.github_service import GitHubService
from backend.services.gemini_service import GeminiService
from backend.core.logging import get_logger

logger = get_logger(__name__)

SYSTEM_CONSTITUTION = """
<IDENTITY>
You are a Principal Software Engineer acting as a strict Code Reviewer.
Your job is to review Pull Requests submitted by the AI CodeAgent. 
You must scrutinize the code against the provided Architecture and Guidelines.
</IDENTITY>

<REVIEW_PROTOCOL>
1. Analyze the original task and the files modified in the PR.
2. Read any external developer comments provided in the context. If a user asked for a change, you MUST address it!
3. If the code is perfect and follows all rules (No unallowed imports, logic is sound, security is good), you approve it.
4. If there are violations, bugs, or user requested revisions, you must act to resolve them by returning the CORRECTED file contents.

You MUST always output strictly formatted JSON. Do not include markdown outside of the JSON.

If the PR is approved:
{
  "status": "APPROVED",
  "comment": "The code perfectly aligns with the requirements."
}

If the PR needs changes (Resolution):
{
  "status": "CHANGES_REQUESTED",
  "comment": "I found a violation of our guidelines regarding X. I have provided a fix.",
  "resolutions": {
     "file_path.ts": "entire fixed file content here" 
  }
}
</REVIEW_PROTOCOL>
"""

USER_PROMPT = """
<TASK>
Title: {title}
Description: {description}
</TASK>

<CONTEXT>
Guidelines: {guidelines}
Architecture: {architecture}
</CONTEXT>

<PR_FILES_MODIFIED>
{pr_diff}
</PR_FILES_MODIFIED>

<DEVELOPER_COMMENTS>
{user_comments}
</DEVELOPER_COMMENTS>

Review the PR and return your strict JSON decision.
"""

class PRAgent(BaseAgent):
    name = "PRAgent"

    def __init__(self):
        self.llm = GeminiService()

    async def run(self, context: dict) -> AgentResult:
        self.github = GitHubService(repo=context.get("github_repo"))
        title = context.get("title", "")
        description = context.get("description", "")
        pr_id = context.get("github_pr_id")
        branch_name = context.get("branch_name")
        
        guidelines = context.get("project_guidelines", "Standard best practices.")
        architecture = context.get("services_architecture", "No specific architecture provided.")

        if not pr_id or not branch_name:
            return AgentResult(success=False, error="PR ID and Branch Name are required for review.")

        try:
            pr_diff = await self._fetch_pr_diffs(int(pr_id))
            user_comments = await self._fetch_user_comments(int(pr_id))
            
            prompt = f"{SYSTEM_CONSTITUTION}\n\n{USER_PROMPT.format(title=title, description=description, guidelines=guidelines, architecture=architecture, pr_diff=pr_diff, user_comments=user_comments)}"

            logger.info(f"[{self.name}] Analyzing PR code and comments...")
            raw_response = await self.llm.complete(prompt)
            
            decision = self._parse_decision(raw_response)
            if not decision:
                return AgentResult(success=False, error="Failed to parse Review Agent JSON response")

            status = decision.get("status", "CHANGES_REQUESTED")
            comment = decision.get("comment", "")
            resolutions = decision.get("resolutions", {})

            # Apply actions (post comment and push fixes)
            await self._apply_resolutions(int(pr_id), branch_name, status, comment, resolutions)

            return AgentResult(
                success=True,
                output={
                    "pr_review_status": status,
                    "pr_review_comment": comment,
                    "resolutions_applied": len(resolutions)
                },
            )

        except Exception as e:
            logger.error(f"[{self.name}] Agent execution failed: {e}")
            return AgentResult(success=False, error=str(e))

    async def _fetch_pr_diffs(self, pr_id: int) -> str:
        files_data = await self.github.get_pull_request_files(pr_id)
        diffs = [f"File: {f.get('filename')}\nChanges (Patch):\n{f.get('patch', 'No patch diff available')}\n" for f in files_data]
        return "\n".join(diffs)

    async def _fetch_user_comments(self, pr_id: int) -> str:
        try:
            comments_data = await self.github.get_pr_comments(pr_id)
            filtered = [
                c for c in comments_data 
                if "[bot]" not in c.get('user',{}).get('login','').lower() 
                and "🤖 AI Code Review:" not in c.get('body','')
            ]
            if not filtered:
                return "No external developer comments."
            return "\n".join([f"- {c.get('user',{}).get('login','User')}: {c.get('body')}" for c in filtered])
        except Exception:
            return "No external developer comments."

    def _parse_decision(self, raw_response: str) -> dict:
        match = re.search(r'\{.*\}', raw_response, re.DOTALL)
        if match:
            try:
                return json.loads(match.group(0))
            except Exception:
                pass
        return {}

    async def _apply_resolutions(self, pr_id: int, branch_name: str, status: str, comment: str, resolutions: dict):
        status_emoji = "✅" if status == "APPROVED" else "⚠️"
        full_comment = f"## 🤖 AI Code Review: {status_emoji} {status}\n\n{comment}"
        
        if status == "CHANGES_REQUESTED" and resolutions:
            for file_path, content in resolutions.items():
                await self.github.create_or_update_file(
                    branch=branch_name,
                    file_path=file_path,
                    content=str(content),
                    commit_message=f"AI Code Review Resolution: Fixed {file_path}"
                )
            full_comment += "\n\n**Note**: I have automatically pushed resolution commits to address these issues."
        
        await self.github.create_pr_review_comment(pr_id, full_comment)
