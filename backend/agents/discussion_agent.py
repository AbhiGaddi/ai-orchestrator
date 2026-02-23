"""
DiscussionAgent — Phase 1

Responsibility:
  Takes a raw discussion transcript and uses Gemini to extract
  structured tasks (title, description, acceptance_criteria, deadline).

Input context keys:
  - transcript: str

Output context keys:
  - extracted_tasks: list[dict]
"""
import json
import re
from backend.agents.base_agent import BaseAgent, AgentResult
from backend.services.gemini_service import GeminiService
from backend.core.logging import get_logger

logger = get_logger(__name__)

# --- AGENT CONSTITUTION (Inspired by system-prompts repository) ---
SYSTEM_CONSTITUTION = """
<IDENTITY>
You are a Lead Engineering Project Manager specializing in translating high-level product discussions into actionable technical tasks.
</IDENTITY>

<PROJECT_CONTEXT>
{project_context}
</PROJECT_CONTEXT>

<GLOBAL_GUIDELINES>
1. ACCURACY: Only extract tasks explicitly agreed upon or clearly intended.
2. ATOMICITY: Each task should represent a single unit of work.
3. COMPLETENESS: Ensure every task has clear acceptance criteria.
4. NON-HALLUCINATION: If a detail (like a deadline) is missing, mark it as null.
</GLOBAL_GUIDELINES>

<CONSTRAINTS>
- Output MUST be a valid JSON array.
- No conversational filler, no markdown code blocks (unless specified), no preamble.
- Merging: If multiple people discuss the same task, consolidate it into one entry.
</CONSTRAINTS>

<TASK_SCHEMA>
{{
  "title": str,
  "description": str (technical context included),
  "acceptance_criteria": str (bullet points preferred),
  "deadline": str | null,
  "priority": "HIGH" | "MEDIUM" | "LOW"
}}
</TASK_SCHEMA>
"""

USER_PROMPT = """
<INPUT_TRANSCRIPT>
{transcript}
</INPUT_TRANSCRIPT>

Analyze the transcript above and return the extracted tasks as a JSON array following the <TASK_SCHEMA>.
"""

class DiscussionAgent(BaseAgent):
    name = "DiscussionAgent"

    def __init__(self):
        self.llm = GeminiService()

    def _extract_json(self, response: str) -> list:
        """Helper to clean and parse JSON from LLM response."""
        # Use regex to find the first [ and last ] to handle any leakage
        match = re.search(r'\[.*\]', response, re.DOTALL)
        if match:
            response = match.group(0)
        try:
            return json.loads(response)
        except json.JSONDecodeError:
            return []

    async def run(self, context: dict) -> AgentResult:
        transcript = context.get("transcript", "").strip()
        if not transcript:
            return AgentResult(success=False, error="No transcript provided")

        # Pull project context from the Orchestrator's planning step
        project_guidelines = context.get("project_guidelines", "No specific guidelines provided.")
        services_architecture = context.get("services_architecture", "No architecture details.")
        
        project_context_str = f"Guidelines: {project_guidelines}\nArchitecture: {services_architecture}"
        
        system_msg = SYSTEM_CONSTITUTION.format(project_context=project_context_str)
        user_msg = USER_PROMPT.format(transcript=transcript)
        
        full_prompt = f"{system_msg}\n\n{user_msg}"
        
        logger.info(f"[{self.name}] Running extraction with refined constitution.")
        raw_response = await self.llm.complete(full_prompt)

        tasks = self._extract_json(raw_response)
        
        if not tasks:
            logger.error(f"[{self.name}] Failed to parse tasks from LLM output.")
            return AgentResult(
                success=False,
                error="Could not parse valid JSON tasks from response",
                output={"raw": raw_response}
            )

        logger.info(f"[{self.name}] Successfully extracted {len(tasks)} tasks.")
        return AgentResult(
            success=True,
            output={"extracted_tasks": tasks, "task_count": len(tasks)},
        )
