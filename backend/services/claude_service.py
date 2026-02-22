"""
ClaudeService — pure wrapper around Anthropic API.
No business logic here. Agents use this service.
"""
import anthropic
from backend.config import get_settings
from backend.core.logging import get_logger

logger = get_logger(__name__)
settings = get_settings()


class ClaudeService:
    def __init__(self):
        self.client = anthropic.Anthropic(api_key=settings.CLAUDE_API_KEY)
        self.model = settings.CLAUDE_MODEL

    async def complete(self, prompt: str, max_tokens: int = 4096) -> str:
        """
        Send a prompt to Claude and return the raw text response.
        Callers are responsible for parsing the output.
        """
        logger.debug(f"[ClaudeService] Calling model={self.model} max_tokens={max_tokens}")
        message = self.client.messages.create(
            model=self.model,
            max_tokens=max_tokens,
            messages=[{"role": "user", "content": prompt}],
        )
        return message.content[0].text
