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
