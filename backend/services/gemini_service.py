"""
GeminiService — pure wrapper around Google GenAI API.
No business logic here. Agents use this service.
"""
from google import genai
from google.genai import types
from backend.config import get_settings
from backend.core.logging import get_logger

logger = get_logger(__name__)
settings = get_settings()

class GeminiService:
    def __init__(self):
        self.client = genai.Client(api_key=settings.GEMINI_API_KEY)
        self.model = settings.GEMINI_MODEL

    async def complete(self, prompt: str) -> str:
        """
        Send a prompt to Gemini and return the raw text response.
        Callers are responsible for parsing the output.
        """
        logger.debug(f"[GeminiService] Calling model={self.model}")
        try:
            # We use the synchronous generate_content because async might require aiogoogle or specific async client methods. 
            # The standard new API 'google-genai' uses client.models.generate_content.
            # To avoid blocking the event loop in a real production app we'd wrap it or use the async client if available (client.aio).
            # We'll use the async client here:
            response = await self.client.aio.models.generate_content(
                model=self.model,
                contents=prompt,
                config=types.GenerateContentConfig(
                    response_mime_type="application/json"
                )
            )
            return response.text
        except Exception as e:
            logger.error(f"[GeminiService] Error calling Gemini API: {str(e)}")
            raise
