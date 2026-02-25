from pydantic import BaseModel
from typing import Optional, Any
from uuid import UUID
from datetime import datetime


class AgentRunResponse(BaseModel):
    id: UUID
    task_id: UUID
    agent_name: str
    status: str
    input_context: Optional[Any]
    output: Optional[Any]
    error_message: Optional[str]
    started_at: Optional[datetime]
    completed_at: Optional[datetime]

    class Config:
        from_attributes = True


class AgentRunStepResponse(BaseModel):
    id: UUID
    agent_run_id: UUID
    step_number: int
    thought: Optional[str]
    tool_called: Optional[str]
    tool_input: Optional[Any]
    tool_output: Optional[str]
    prompt_tokens: int
    completion_tokens: int
    status: str
    created_at: datetime

    class Config:
        from_attributes = True
