from pydantic import BaseModel, Field
from typing import Optional
from uuid import UUID
from datetime import datetime


class TaskCreate(BaseModel):
    title: str = Field(..., min_length=1, max_length=500)
    description: Optional[str] = None
    acceptance_criteria: Optional[str] = None
    deadline: Optional[str] = None
    priority: Optional[str] = "MEDIUM"


class TaskUpdate(BaseModel):
    title: Optional[str] = Field(None, max_length=500)
    description: Optional[str] = None
    acceptance_criteria: Optional[str] = None
    deadline: Optional[str] = None
    priority: Optional[str] = None


class TaskResponse(BaseModel):
    id: UUID
    title: str
    description: Optional[str]
    acceptance_criteria: Optional[str]
    deadline: Optional[str]
    priority: str
    status: str
    approved: bool
    github_issue_id: Optional[str]
    github_issue_url: Optional[str]
    email_sent: bool
    # Phase 2+
    github_pr_id: Optional[str]
    github_pr_url: Optional[str]
    branch_name: Optional[str]
    image_tag: Optional[str]
    deployed_at: Optional[datetime]
    deploy_environment: Optional[str]
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


class ExtractRequest(BaseModel):
    transcript: str = Field(..., min_length=10, description="Raw discussion transcript text")


class ExtractResponse(BaseModel):
    tasks: list[TaskResponse]
    count: int
