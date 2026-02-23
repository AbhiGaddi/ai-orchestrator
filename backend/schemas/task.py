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
    project_id: Optional[UUID] = None
    github_repo: Optional[str] = None


class TaskUpdate(BaseModel):
    title: Optional[str] = Field(None, max_length=500)
    description: Optional[str] = None
    acceptance_criteria: Optional[str] = None
    deadline: Optional[str] = None
    priority: Optional[str] = None
    project_id: Optional[UUID] = None
    github_repo: Optional[str] = None


class TaskResponse(BaseModel):
    id: UUID
    project_id: Optional[UUID] = None
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
    github_repo: Optional[str] = None
    # Phase 2+
    github_pr_id: Optional[str]
    github_pr_url: Optional[str]
    branch_name: Optional[str]
    pr_reviewed: bool
    
    # Phase 2.75+
    tests_passed: Optional[bool] = None
    test_report_url: Optional[str] = None
    
    # Phase 3+
    image_tag: Optional[str] = None
    image_built_at: Optional[datetime] = None
    build_status: Optional[str] = None
    build_logs_url: Optional[str] = None
    docker_image_url: Optional[str] = None
    
    # Phase 4+
    deployed_at: Optional[datetime] = None
    deploy_environment: Optional[str] = None
    deployment_status: Optional[str] = None
    deployment_url: Optional[str] = None
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


class ExtractRequest(BaseModel):
    transcript: str = Field(..., min_length=10, description="Raw discussion transcript text")
    project_id: Optional[UUID] = None
    github_repo: Optional[str] = None


class ExtractResponse(BaseModel):
    tasks: list[TaskResponse]
    count: int
