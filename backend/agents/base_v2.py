import json
import logging
from typing import Dict, Any, List, Callable, Optional
from pydantic import BaseModel, Field
from backend.services.interfaces import LLMProvider
from backend.db.models import AgentRunStep

logger = logging.getLogger(__name__)

class AgentAction(BaseModel):
    action_type: str = Field(description="Must be 'tool_call' or 'final_answer'")
    thought: str = Field(description="Internal reasoning for this step")
    tool_name: Optional[str] = None
    tool_input: Optional[Dict[str, Any]] = None
    final_output: Optional[Dict[str, Any]] = None

class ToolRegistry:
    def __init__(self):
        self._tools: Dict[str, Callable] = {}
        self._schemas: List[Dict[str, Any]] = []

    def register(self, name: str, description: str, func: Callable):
        self._tools[name] = func
        self._schemas.append({"name": name, "description": description})

    async def execute(self, name: str, kwargs: Dict[str, Any]) -> str:
        if name not in self._tools:
            return f"Error: Tool '{name}' not found."
        try:
            import asyncio
            result = self._tools[name](**kwargs)
            if asyncio.iscoroutine(result):
                return await result
            return str(result)
        except Exception as e:
            return f"Tool Execution Error: {str(e)}"

class BoundedReActAgent:
    def __init__(self, llm_provider: LLMProvider, tool_registry: ToolRegistry, max_steps: int = 5):
        self.llm = llm_provider
        self.tools = tool_registry
        self.max_steps = max_steps
        self.system_prompt = self._build_system_prompt()

    def _build_system_prompt(self) -> str:
        return f"""
        You are an autonomous agent solving a task. 
        You MUST respond in strict JSON matching this schema:
        {{
            "action_type": "tool_call" | "final_answer",
            "thought": "Your reasoning",
            "tool_name": "name of tool",
            "tool_input": {{...}},
            "final_output": {{...}}
        }}
        Available Tools: {json.dumps(self._schemas if hasattr(self, "_schemas") else self.tools._schemas)}
        """

    async def run(self, task_context: Dict[str, Any], agent_run_id: str, db_session: Any) -> Dict[str, Any]:
        """Executes the bounded ReAct loop with precise DB persistence."""
        
        # Sliding context window
        conversation_history = f"Task: {json.dumps(task_context)}\n"
        
        for step in range(self.max_steps):
            logger.info(f"Agent Step {step+1}/{self.max_steps}")
            
            # 1. Reason
            response = await self.llm.generate(
                prompt=conversation_history, 
                system_prompt=self.system_prompt,
                require_json=True
            )
            
            # 2. Parse Action
            try:
                action = AgentAction(**response.parsed_json)
            except Exception as e:
                # Agent hallucinated schema. Push error into history and force retry.
                conversation_history += f"\nSystem Error: Invalid JSON schema returned: {e}\n"
                continue
            
            # 3. Persist Reasoning to DB (Constraint B: Observability)
            db_step = AgentRunStep(
                agent_run_id=agent_run_id,
                step_number=step + 1,
                thought=action.thought,
                tool_called=action.tool_name,
                tool_input=action.tool_input,
                prompt_tokens=response.prompt_tokens,
                completion_tokens=response.completion_tokens
            )
            db_session.add(db_step)
            await db_session.flush()

            # 4. Act & Observe
            if action.action_type == "final_answer":
                db_step.status = "COMPLETED"
                await db_session.commit()
                return action.final_output

            if action.action_type == "tool_call":
                tool_result = await self.tools.execute(action.tool_name, action.tool_input or {})
                
                # Summarization / Truncation guardrail (Constraint A: Token Control)
                result_str = str(tool_result)
                if len(result_str) > 5000:
                    result_str = result_str[:4900] + "\n...[TRUNCATED TO SAVE TOKENS]"
                    
                db_step.tool_output = result_str
                db_step.status = "COMPLETED"
                await db_session.flush()

                conversation_history += f"\nAction: {action.tool_name}\nResult: {result_str}\n"

        # Max steps reached without final_answer
        await db_session.commit()
        raise RuntimeError(f"Agent exceeded maximum bounded steps ({self.max_steps})")
