import json
from backend.agents.base_agent import BaseAgent, AgentResult
from backend.services.github_service import GitHubService
from backend.services.llm_provider import GeminiProvider
from backend.agents.base_v2 import BoundedReActAgent, ToolRegistry
from backend.core.logging import get_logger

logger = get_logger(__name__)

class CodeAgent(BaseAgent):
    name = "CodeAgent"

    async def run(self, context: dict) -> AgentResult:
        run_id = getattr(self, "run_id", None)
        db_session = getattr(self, "db_session", None)

        if not run_id or not db_session:
            return AgentResult(success=False, error="run_id and db_session required for CodeAgent V2")

        self.github = GitHubService(repo=context.get("github_repo"))
        base_branch = context.get('base_branch')
        branch_name = context.get('target_branch') or f"feat/task-{context.get('task_id', 'unknown')[:8]}"
        title = context.get("title", "")
        description = context.get("description", "")
        issue_id = context.get("github_issue_id", "N/A")

        # 1. Initialize ReAct tools
        registry = ToolRegistry()

        # Tool 1: File Search
        async def search_codebase(file_path: str) -> str:
            """Read a file from the repository to understand the existing codebase."""
            try:
                # Fallback to main/master if base_branch is not explicitly passed
                branch = base_branch or await self.github.get_default_branch()
                content = await self.github.get_file_content(file_path, ref=branch)
                return f"--- BEGIN {file_path} ---\n{content}\n--- END {file_path} ---"
            except Exception as e:
                return f"Error reading {file_path}: {e}"

        # Tool 2: Push & Deliver
        async def apply_code_and_pr(files: dict) -> str:
            """Commit generated files and open a Pull Request. Input files must be a dict mapping string file paths to string file contents."""
            try:
                await self.github.create_branch(branch_name, from_ref=base_branch)
                for file_path, content in files.items():
                    logger.info(f"[{self.name}] Committing file: {file_path}")
                    await self.github.create_or_update_file(
                        branch=branch_name,
                        file_path=file_path,
                        content=str(content),
                        commit_message=f"Auto-generated code for {file_path}"
                    )
                pr_result = await self.github.create_pull_request(
                    title=f"Feat: {title}",
                    body=f"## AI Generated PR\n\nCloses #{issue_id}\n\n{description}",
                    head=branch_name,
                    base=base_branch
                )
                
                # We return JSON string from the tool 
                return json.dumps({
                    "github_pr_id": str(pr_result.get("number", "")),
                    "github_pr_url": pr_result.get("html_url", ""),
                    "branch_name": branch_name
                })
            except Exception as e:
                return json.dumps({"error": str(e)})

        registry.register(
            name="search_codebase",
            description="Reads the contents of an existing file in the repository. Input kwargs: file_path (string).",
            func=search_codebase
        )
        registry.register(
            name="apply_code_and_pr",
            description="Commits code files and opens a PR. Input kwargs: files (dictionary mapping string file paths to string file contents). Always use this when you are ready to deliver the final code. Stop and output the final answer after this succeeds.",
            func=apply_code_and_pr
        )

        llm = GeminiProvider()
        agent = BoundedReActAgent(llm_provider=llm, tool_registry=registry, max_steps=5)

        logger.info(f"[{self.name}] Starting Bounded ReAct loop for task: {title}")
        
        try:
            # Inject context
            internal_context = {
                "task_title": title,
                "task_description": description,
                "guidelines": context.get("project_guidelines", "Follow standard best practices."),
                "architecture": context.get("services_architecture", "No architecture provided.")
            }

            final_output = await agent.run(internal_context, agent_run_id=run_id, db_session=db_session)
            
            # Since the tools act on Github, we need to extract the PR info for Orchestrator Promotion
            # We enforce final_output to contain the PR tracking info in system prompt, 
            # but we can fallback to searching agent runs if needed. We'll assume the final_output has it.
            
            if "error" in (final_output or {}):
                return AgentResult(success=False, error=final_output["error"])

            return AgentResult(success=True, output=final_output)

        except Exception as e:
            logger.error(f"[{self.name}] ReAct loop failed: {e}")
            return AgentResult(success=False, error=str(e))
