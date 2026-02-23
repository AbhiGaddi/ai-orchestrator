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
Your job is to perform a 'Clean Sweep' of multiple SonarCloud violations in a single file.
</IDENTITY>

<ANALYSIS_PROTOCOL>
1. You will be provided with the current content of a file and a list of Sonar violations within that file.
2. Study the rule, message, and line number for each violation.
3. Apply fixes for ALL provided violations in the file.
4. Ensure the logic and style of the original code are preserved.
5. Your output MUST be strictly the complete, corrected string content of the file.
</ANALYSIS_PROTOCOL>
"""

class SonarSweepAgent(BaseAgent):
    name = "SonarSweepAgent"

    def __init__(self):
        self.llm = GeminiService()

    async def run(self, context: dict) -> AgentResult:
        issues = context.get("sonar_issues")
        if not issues:
            return AgentResult(success=False, error="No sonar issues provided for sweep")

        github_repo = context.get("github_repo")
        github = GitHubService(repo=github_repo)
        
        # Group issues by file (component)
        file_map = {}
        for issue in issues:
            file_path = issue.get("component", "").split(":")[-1]
            if file_path not in file_map:
                file_map[file_path] = []
            file_map[file_path].append(issue)

        task_id = str(context.get("task_id", "unknown"))
        branch_suffix = task_id[:8] if "-" in task_id else task_id
        branch_name = f"fix/sonar-sweep-{branch_suffix}"
        base_branch = await github.get_default_branch()
        
        guidelines = context.get("project_guidelines", "Standard best practices.")
        architecture = context.get("services_architecture", "Standard modular architecture.")

        try:
            logger.info(f"[{self.name}] Starting sweep on {len(file_map)} files...")
            await github.create_branch(branch_name, from_ref=base_branch)
            
            applied_count = 0
            for file_path, file_issues in file_map.items():
                logger.info(f"[{self.name}] Fixing {len(file_issues)} issues in {file_path}")
                
                # Fetch the current file content to provide context for fixes
                original_content = ""
                try:
                    original_content = await github.get_file_content(file_path, ref=base_branch)
                except Exception as e:
                    logger.warning(f"[{self.name}] Could not fetch {file_path}, skipping: {e}")
                    continue
                
                issue_descriptions = "\n".join([
                    f"- Line {i.get('line')}: {i.get('message')} ({i.get('rule')})"
                    for i in file_issues
                ])
                
                prompt = f"{SYSTEM_CONSTITUTION}\n\n"
                prompt += f"<FILE_PATH>{file_path}</FILE_PATH>\n\n"
                prompt += f"<ORIGINAL_CONTENT>\n{original_content}\n</ORIGINAL_CONTENT>\n\n"
                prompt += f"<SONAR_VIOLATIONS>\n{issue_descriptions}\n</SONAR_VIOLATIONS>\n\n"
                prompt += f"<PROJECT_CONTEXT>\nGuidelines: {guidelines}\nArchitecture: {architecture}\n</PROJECT_CONTEXT>\n\n"
                prompt += "Please provide the FULL corrected file content."

                fixed_content = await self.llm.complete(prompt)
                
                # Clean up markdown if LLM includes it
                fixed_content = re.sub(r'^```[a-z]*\n', '', fixed_content, flags=re.MULTILINE)
                fixed_content = re.sub(r'\n```$', '', fixed_content, flags=re.MULTILINE)

                await github.create_or_update_file(
                    branch=branch_name,
                    file_path=file_path,
                    content=fixed_content,
                    commit_message=f"Sonar Sweep: Resolving {len(file_issues)} violations in {file_path}"
                )
                applied_count += len(file_issues)

            pr_title = f"🧹 SonarCloud Clean Sweep: {applied_count} issues resolved"
            pr_body = f"## 🤖 AI Automated Sonar Clean Sweep\n\nI have successfully resolved **{applied_count} violations** across **{len(file_map)} files**.\n\n### Resolved Files:\n"
            for fp in file_map.keys():
                pr_body += f"- {fp}\n"
            
            pr_result = await github.create_pull_request(
                title=pr_title,
                body=pr_body,
                head=branch_name,
                base=base_branch
            )

            return AgentResult(
                success=True,
                output={
                    "github_pr_id": str(pr_result.get("number", "")),
                    "github_pr_url": pr_result.get("html_url", ""),
                    "branch_name": branch_name,
                    "applied_count": applied_count
                }
            )

        except Exception as e:
            logger.error(f"[{self.name}] Sweep failed: {e}")
            return AgentResult(success=False, error=str(e))
