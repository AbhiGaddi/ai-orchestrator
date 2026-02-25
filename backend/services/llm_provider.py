import json
from google import genai
from google.genai import types
from backend.services.interfaces import LLMProvider, LLMResponse
from backend.config import get_settings

settings = get_settings()

class GeminiProvider(LLMProvider):
    def __init__(self):
        self.client = genai.Client(api_key=settings.GEMINI_API_KEY)
        self.model = settings.GEMINI_MODEL

    async def generate(self, prompt: str, system_prompt: str = None, require_json: bool = False) -> LLMResponse:
        config = types.GenerateContentConfig()
        if require_json:
            config.response_mime_type = "application/json"
        if system_prompt:
            config.system_instruction = system_prompt

        response = await self.client.aio.models.generate_content(
            model=self.model,
            contents=prompt,
            config=config
        )
        
        # In a real app, track usage metadata returned by Gemini here
        result = LLMResponse(
            content=response.text,
            prompt_tokens=0, 
            completion_tokens=0,
            total_tokens=0
        )
        
        if require_json:
            try:
                result.parsed_json = json.loads(response.text)
            except json.JSONDecodeError:
                pass # Handled by Agent retry loop
                
        return result

# OpenAI Implementation (Stub for extension)
class OpenAIProvider(LLMProvider):
    async def generate(self, prompt: str, system_prompt: str = None, require_json: bool = False) -> LLMResponse:
         # implement openai.AsyncClient() logic here
         pass
