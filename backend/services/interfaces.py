from abc import ABC, abstractmethod
from typing import Any, Dict, List, Optional
from pydantic import BaseModel

class LLMResponse(BaseModel):
    content: str
    parsed_json: Optional[Dict[str, Any]] = None
    prompt_tokens: int = 0
    completion_tokens: int = 0
    total_tokens: int = 0

class LLMProvider(ABC):
    @abstractmethod
    async def generate(self, prompt: str, system_prompt: str = None, require_json: bool = False) -> LLMResponse:
        """Generate a response from the LLM."""
        pass

class NotificationProvider(ABC):
    @abstractmethod
    async def send_message(self, target: str, subject: str, body: str) -> bool:
        """Send a notification to a specific target (email address, channel ID, etc)."""
        pass
