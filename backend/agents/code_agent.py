import json
from backend.agents.base_agent import BaseAgent, AgentResult
from backend.services.github_service import GitHubService
from backend.services.llm_provider import GeminiProvider
from backend.db.models import AgentRunStep
from backend.core.logging import get_logger

logger = get_logger(__name__)

class CodeAgent(BaseAgent):
    name = "CodeAgent"

    async def run(self, context: dict) -> AgentResult:
        run_id = getattr(self, "run_id", None)
        db_session = getattr(self, "db_session", None)

        if not run_id or not db_session:
            return AgentResult(success=False, error="run_id and db_session required for CodeAgent")

        self.github = GitHubService(repo=context.get("github_repo"))
        base_branch = context.get('base_branch')
        branch_name = context.get('target_branch') or f"feat/task-{context.get('task_id', 'unknown')[:8]}"
        title = context.get("title", "")
        description = context.get("description", "")
        issue_id = context.get("github_issue_id", "N/A")

        llm = GeminiProvider()

        logger.info(f"[{self.name}] Generating code without looping for task: {title}")
        
        try:
            # Inject context
            internal_context = {
                "task_title": title,
                "task_description": description,
                "guidelines": context.get("project_guidelines", "Follow standard best practices."),
                "architecture": context.get("services_architecture", "No architecture provided.")
            }

            system_prompt = """
                    You are an expert AI software engineer.
                    Based on the task description and guidelines, write the required code.
                    You MUST respond with a JSON object where keys are the file paths to create/modify, and values are the precise full file contents.
                    Return ONLY valid JSON.
                    Example:
                    {
                    "src/main.py": "print('hello')",
                    "src/utils.py": "def add(a, b): return a + b"
                    }
                    """
            
            prompt = f"Task Context: {json.dumps(internal_context)}"

            # 1. Reason and generate code
            response = await llm.generate(
                prompt=prompt, 
                system_prompt=system_prompt,
                require_json=True
            )
            
            files = response.parsed_json if hasattr(response, 'parsed_json') and response.parsed_json else {}
            if not files or not isinstance(files, dict):
                 raise ValueError(f"Expected a json dictionary of files, got: {files}")

            # Persist Reasoning to DB for transparency
            db_step = AgentRunStep(
                agent_run_id=run_id,
                step_number=1,
                thought="Generating code straight from context without looping.",
                tool_called="apply_code_and_pr",
                tool_input={"files": list(files.keys())},
                tool_output="Files generated successfully",
                prompt_tokens=response.prompt_tokens,
                completion_tokens=response.completion_tokens,
                status="COMPLETED"
            )
            db_session.add(db_step)
            await db_session.commit()

            # 2. Apply code & PR
            logger.info(f"[{self.name}] Creating branch and PR...")
            try:
                base_branch_actual = base_branch or await self.github.get_default_branch()
                await self.github.create_branch(branch_name, from_ref=base_branch_actual)
            except Exception as e:
                logger.warning(f"Could not create branch (might exist): {e}")

            for file_path, content in files.items():
                logger.info(f"[{self.name}] Committing file: {file_path}")
                await self.github.create_or_update_file(
                    branch=branch_name,
                    file_path=file_path,
                    content=str(content),
                    commit_message=f"Auto-generated code for {file_path}"
                )

            pr_result = await self.github.create_pull_request(
                title=f"#{issue_id} - Feat: {title}",
                body=f"## AI Generated PR\n\nCloses #{issue_id}\n\n{description}",
                head=branch_name,
                base=base_branch
            )
            
            final_output = {
                "github_pr_id": str(pr_result.get("number", "")),
                "github_pr_url": pr_result.get("html_url", ""),
                "branch_name": branch_name
            }

            return AgentResult(success=True, output=final_output)

        except Exception as e:
            logger.error(f"[{self.name}] Code generation failed: {e}")
            return AgentResult(success=False, error=str(e))
