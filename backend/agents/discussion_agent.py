"""
DiscussionAgent — Phase 1

Responsibility:
  Takes a raw discussion transcript and uses Claude to extract
  structured tasks (title, description, acceptance_criteria, deadline).

Input context keys:
  - transcript: str

Output context keys:
  - extracted_tasks: list[dict]
"""
import json
from backend.agents.base_agent import BaseAgent, AgentResult
from backend.services.claude_service import ClaudeService
from backend.core.logging import get_logger

logger = get_logger(__name__)

EXTRACTION_PROMPT = """
You are a senior engineering project manager. Analyze the following meeting transcript or discussion text and extract all actionable engineering tasks.

Return ONLY a valid JSON array. No markdown, no explanation, no extra text — just the raw JSON array.

Each task must follow this exact structure:
[
  {
    "title": "Short, clear task title",
    "description": "Detailed description of what needs to be done",
    "acceptance_criteria": "Clear, testable criteria for when this task is done",
    "deadline": "Relative deadline if mentioned (e.g. '2 weeks', 'end of sprint'), or null if not mentioned",
    "priority": "HIGH | MEDIUM | LOW based on urgency/importance discussed"
  }
]

Rules:
- Only extract tasks explicitly discussed or decided
- Do NOT invent tasks not mentioned
- Merge duplicate tasks
- If no clear tasks found, return an empty array []
- priority defaults to MEDIUM if not clear from context

Transcript:
\"\"\"
{transcript}
\"\"\"
"""


class DiscussionAgent(BaseAgent):
    name = "DiscussionAgent"

    def __init__(self):
        self.claude = ClaudeService()

    async def run(self, context: dict) -> AgentResult:
        transcript = context.get("transcript", "").strip()
        if not transcript:
            return AgentResult(success=False, error="No transcript provided")

        prompt = EXTRACTION_PROMPT.format(transcript=transcript)
        logger.info(f"[{self.name}] Sending transcript to Claude ({len(transcript)} chars)")

        raw_response = await self.claude.complete(prompt)

        try:
            tasks = json.loads(raw_response)
            if not isinstance(tasks, list):
                raise ValueError("Claude response is not a JSON array")
        except (json.JSONDecodeError, ValueError) as e:
            logger.error(f"[{self.name}] Claude returned invalid JSON: {e}\nRaw: {raw_response}")
            return AgentResult(
                success=False,
                error=f"Invalid JSON from Claude: {str(e)}",
                output={"raw_response": raw_response},
            )

        logger.info(f"[{self.name}] Extracted {len(tasks)} tasks")
        return AgentResult(
            success=True,
            output={"extracted_tasks": tasks, "task_count": len(tasks)},
        )
