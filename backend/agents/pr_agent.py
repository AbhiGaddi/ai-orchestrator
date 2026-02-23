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

        logger.info(f"[{self.name}] Fetching files for PR #{pr_id}")
        
        try:
            files_data = await self.github.get_pull_request_files(int(pr_id))
            
            diffs = []
            for file in files_data:
                diffs.append(f"File: {file.get('filename')}\nChanges (Patch):\n{file.get('patch', 'No patch diff available')}\n")
                
            pr_diff = "\n".join(diffs)
            
        except Exception as e:
            logger.error(f"[{self.name}] Failed fetching PR files: {e}")
            return AgentResult(success=False, error=str(e))

        user_comments = "No external developer comments."
        try:
            comments_data = await self.github.get_pr_comments(int(pr_id))
            if comments_data:
                # Filter out our own bot comments ("ai-orchestrator[bot]" or just the automated response texts)
                # to prevent feedback loops where the AI reviews its own "LGTM" comment.
                filtered = [
                    c for c in comments_data 
                    if "[bot]" not in c.get('user',{}).get('login','').lower() 
                    and "🤖 AI Code Review:" not in c.get('body','')
                ]
                
                if filtered:
                    comment_texts = [f"- {c.get('user',{}).get('login','User')}: {c.get('body')}" for c in filtered]
                    user_comments = "\n".join(comment_texts)
        except Exception as e:
            logger.warning(f"[{self.name}] Failed fetching PR comments (continuing anyway): {e}")

        prompt = f"{SYSTEM_CONSTITUTION}\n\n{USER_PROMPT.format(title=title, description=description, guidelines=guidelines, architecture=architecture, pr_diff=pr_diff, user_comments=user_comments)}"

        logger.info(f"[{self.name}] Analyzing PR code and {len(comments_data) if 'comments_data' in locals() else 0} comments...")
        raw_response = await self.llm.complete(prompt)
        
        clean_response = raw_response
        match = re.search(r'\{.*\}', raw_response, re.DOTALL)
        if match:
            clean_response = match.group(0)
            
        try:
            decision = json.loads(clean_response)
        except Exception as e:
            logger.error(f"[{self.name}] Failed to parse review JSON: {e}")
            return AgentResult(success=False, error="Failed to parse Review Agent JSON response")

        status = decision.get("status", "CHANGES_REQUESTED")
        comment = decision.get("comment", "Automated code review completed.")
        resolutions = decision.get("resolutions", {})

        try:
            # 1. Post the general review comment
            status_emoji = "✅" if status == "APPROVED" else "⚠️"
            full_comment = f"## 🤖 AI Code Review: {status_emoji} {status}\n\n{comment}"
            await self.github.create_pr_review_comment(int(pr_id), full_comment)
            
            # 2. If changes requested, commit fixes!
            if status == "CHANGES_REQUESTED" and resolutions:
                logger.info(f"[{self.name}] Committing resolutions to branch {branch_name}")
                for file_path, content in resolutions.items():
                    await self.github.create_or_update_file(
                        branch=branch_name,
                        file_path=file_path,
                        content=str(content),
                        commit_message=f"AI Code Review Resolution: Fixed {file_path}"
                    )
                full_comment += "\n\n**Note**: I have automatically pushed resolution commits to address these issues."
                
        except Exception as e:
            logger.error(f"[{self.name}] GitHub review actions failed: {e}")
            return AgentResult(success=False, error=str(e))

        return AgentResult(
            success=True,
            output={
                "pr_review_status": status,
                "pr_review_comment": comment,
                "resolutions_applied": len(resolutions)
            },
        )
