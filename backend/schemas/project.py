from pydantic import BaseModel, Field
from typing import List, Dict, Any, Optional
from datetime import datetime
from uuid import UUID


class ProjectBase(BaseModel):
    name: str = Field(..., max_length=200)
    description: Optional[str] = None
    github_repos: List[str] = Field(default_factory=list)
    services_context: Dict[str, Any] = Field(default_factory=dict)
    coding_guidelines: Optional[str] = None
    sonar_project_key: Optional[str] = None
    sonar_token: Optional[str] = None
    sonar_metrics: Dict[str, Any] = Field(default_factory=dict)


class ProjectCreate(ProjectBase):
    pass


class ProjectUpdate(BaseModel):
    name: Optional[str] = Field(None, max_length=200)
    description: Optional[str] = None
    github_repos: Optional[List[str]] = None
    services_context: Optional[Dict[str, Any]] = None
    coding_guidelines: Optional[str] = None
    sonar_project_key: Optional[str] = None
    sonar_token: Optional[str] = None
    sonar_metrics: Optional[Dict[str, Any]] = None


class ProjectResponse(ProjectBase):
    id: UUID
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True
