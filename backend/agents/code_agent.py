import json
import re
from backend.agents.base_agent import BaseAgent, AgentResult
from backend.services.github_service import GitHubService
from backend.services.gemini_service import GeminiService
from backend.core.logging import get_logger

logger = get_logger(__name__)

# --- CODE AGENT CONSTITUTION ---
SYSTEM_CONSTITUTION = """
<IDENTITY>
You are a Staff Software Engineer. Your job is to generate production-ready code based on a task description and project context.
</IDENTITY>

<CODING_PROTOCOL>
Before writing code, analyze the task. Determine which files need to be created or modified. 
Your output MUST be a strict JSON object mapping file paths to their complete, raw string contents.
Do not include any explanation text outside the JSON block.

If the file is a TypeScript/JavaScript file, include necessary imports.
If the project has specific coding guidelines, follow them.
</CODING_PROTOCOL>

<OUTPUT_SCHEMA>
{{
  "file_path_1.ts": "content of file 1",
  "folder/file_path_2.tsx": "content of file 2"
}}
</OUTPUT_SCHEMA>
"""

USER_PROMPT = """
<TASK_DETAILS>
Title: {title}
Description: {description}
Acceptance Criteria: {acceptance_criteria}
Issue ID: {issue_id}
</TASK_DETAILS>

<CONTEXT>
Guidelines: {guidelines}
Architecture: {architecture}
</CONTEXT>

Generate the necessary code for this task and return it strictly according to the <OUTPUT_SCHEMA>.
"""

class CodeAgent(BaseAgent):
    name = "CodeAgent"

    def __init__(self):
        self.llm = GeminiService()

    async def run(self, context: dict) -> AgentResult:
        self.github = GitHubService(repo=context.get("github_repo"))
        title = context.get("title", "")
        description = context.get("description", "")
        acceptance_criteria = context.get("acceptance_criteria", "")
        issue_id = context.get("github_issue_id", "N/A")
        
        guidelines = context.get("project_guidelines", "Standard best practices.")
        architecture = context.get("services_architecture", "No specific architecture provided.")

        if not title:
            return AgentResult(success=False, error="Task title is required for coding")

        # 1. Generate Code (Reasoning & Action Planning)
        prompt = f"{SYSTEM_CONSTITUTION}\n\n{USER_PROMPT.format(title=title, description=description, acceptance_criteria=acceptance_criteria, issue_id=issue_id, guidelines=guidelines, architecture=architecture)}"

        logger.info(f"[{self.name}] Generating code for task: {title}")
        raw_response = await self.llm.complete(prompt)
        
        # Clean markdown formatting if present
        clean_response = raw_response
        match = re.search(r'\{.*\}', raw_response, re.DOTALL)
        if match:
            clean_response = match.group(0)
            
        try:
            files_to_commit = json.loads(clean_response)
            if not files_to_commit or not isinstance(files_to_commit, dict):
                return AgentResult(success=False, error="Invalid code format returned from LLM")
        except Exception as e:
            logger.error(f"[{self.name}] Failed to parse code JSON: {e}")
            return AgentResult(success=False, error="Failed to generate parseable code")

        # 2. GitHub Operations
        base_branch = context.get('base_branch') # Defaults to None, triggers discovery in GitHubService
        branch_name = context.get('target_branch') or f"feat/task-{context.get('task_id', 'unknown')[:8]}"
        
        try:
            logger.info(f"[{self.name}] Creating branch {branch_name} from {base_branch}")
            await self.github.create_branch(branch_name, from_ref=base_branch)
            
            # Commit files sequentially
            for file_path, content in files_to_commit.items():
                logger.info(f"[{self.name}] Committing file: {file_path}")
                await self.github.create_or_update_file(
                    branch=branch_name,
                    file_path=file_path,
                    content=str(content),
                    commit_message=f"Auto-generated code for {file_path}"
                )
                
            # Create Pull Request
            pr_title = f"Feat: {title}"
            pr_body = f"## AI Generated PR\n\nCloses #{issue_id} if applicable.\n\nDescription: {description}"
            logger.info(f"[{self.name}] Opening Pull Request")
            
            pr_result = await self.github.create_pull_request(
                title=pr_title,
                body=pr_body,
                head=branch_name,
                base=base_branch
            )
            
        except Exception as e:
            logger.error(f"[{self.name}] GitHub operation failed: {e}")
            return AgentResult(success=False, error=str(e))

        logger.info(f"[{self.name}] PR created: {pr_result['html_url']}")
        return AgentResult(
            success=True,
            output={
                "github_pr_id": str(pr_result.get("number", "")),
                "github_pr_url": pr_result.get("html_url", ""),
                "branch_name": branch_name
            },
        )
