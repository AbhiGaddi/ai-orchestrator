import uuid
from datetime import datetime
from sqlalchemy import (
    Column, String, Boolean, DateTime, Text, ForeignKey, JSON, Integer
)
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship
from backend.db.database import Base


CASCADE_DELETE = "all, delete-orphan"


class Project(Base):
    """
    Project entity to isolate multi-tenant execution contexts.
    Each task belongs to a project.
    """
    __tablename__ = "projects"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    name = Column(String(200), nullable=False)
    description = Column(Text, nullable=True)
    github_repos = Column(JSON, default=list)        # e.g., ["org/backend", "org/frontend"]
    services_context = Column(JSON, default=dict)    # Details about internal APIs, architecture, etc.
    coding_guidelines = Column(Text, nullable=True)  # Standards for the agent to follow
    
    # SonarCloud Integration
    sonar_project_key = Column(String(200), nullable=True)
    sonar_token = Column(String(500), nullable=True)
    sonar_metrics = Column(JSON, default=dict) # e.g. {"bugs": 0, "vulnerabilities": 0, "code_smells": 0}

    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)

    tasks = relationship("Task", back_populates="project", cascade=CASCADE_DELETE)

    def __repr__(self):
        return f"<Project id={self.id} name={self.name!r}>"


class Task(Base):
    """
    Central task entity. Grows across phases:
      Phase 1: github_issue_id, email_sent
      Phase 2: github_pr_id, branch_name
      Phase 3: image_tag, image_built_at
      Phase 4: deployed_at, deploy_environment
    """
    __tablename__ = "tasks"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    project_id = Column(UUID(as_uuid=True), ForeignKey("projects.id"), nullable=True) # nullable true for backward compat right now

    # Core — Phase 1
    title = Column(String(500), nullable=False)
    description = Column(Text, nullable=True)
    acceptance_criteria = Column(Text, nullable=True)
    deadline = Column(String(100), nullable=True)
    priority = Column(String(50), default="MEDIUM")  # LOW | MEDIUM | HIGH | CRITICAL

    # Status lifecycle
    status = Column(
        String(50),
        default="PENDING",
        nullable=False,
        # PENDING → APPROVED → IN_PROGRESS → COMPLETED | FAILED
    )
    approved = Column(Boolean, default=False, nullable=False)
    github_repo = Column(String(200), nullable=True) # e.g. "org/repo-name"

    # Phase 1 — TicketAgent
    github_issue_id = Column(String(50), nullable=True)
    github_issue_url = Column(String(500), nullable=True)
    email_sent = Column(Boolean, default=False)

    # Phase 2 — CodeAgent (stub columns, not used yet)
    github_pr_id = Column(String(50), nullable=True)
    github_pr_url = Column(String(500), nullable=True)
    branch_name = Column(String(200), nullable=True)
    pr_reviewed = Column(Boolean, default=False)

    # Phase 2.75 - QA / Testing (Stub)
    tests_passed = Column(Boolean, nullable=True)
    test_report_url = Column(String(500), nullable=True)

    # Phase 3 — BuildAgent (stub columns)
    image_tag = Column(String(200), nullable=True)
    image_built_at = Column(DateTime, nullable=True)
    build_status = Column(String(50), nullable=True)
    build_logs_url = Column(String(500), nullable=True)
    docker_image_url = Column(String(500), nullable=True)

    # Phase 4 — DeployAgent (stub columns)
    deployed_at = Column(DateTime, nullable=True)
    deploy_environment = Column(String(100), nullable=True)
    deployment_status = Column(String(50), nullable=True)
    deployment_url = Column(String(500), nullable=True)

    # Error Tracking
    error_message = Column(Text, nullable=True)

    # Timestamps
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)

    # Relationships
    project = relationship("Project", back_populates="tasks")
    agent_runs = relationship("AgentRun", back_populates="task", cascade=CASCADE_DELETE)

    def __repr__(self):
        return f"<Task id={self.id} title={self.title!r} status={self.status}>"


class AgentRun(Base):
    """
    Execution log for every agent invocation.
    One task can have multiple agent runs (one per agent).
    UI polls this table for real-time dashboard updates.
    """
    __tablename__ = "agent_runs"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    task_id = Column(UUID(as_uuid=True), ForeignKey("tasks.id"), nullable=False)
    agent_name = Column(String(100), nullable=False)  # e.g. "DiscussionAgent"

    # Status: PENDING | RUNNING | COMPLETED | FAILED
    status = Column(String(50), default="PENDING", nullable=False)

    # Context in / out stored as JSONB for full observability
    input_context = Column(JSON, nullable=True)
    output = Column(JSON, nullable=True)
    error_message = Column(Text, nullable=True)

    started_at = Column(DateTime, nullable=True)
    completed_at = Column(DateTime, nullable=True)

    # Relationships
    task = relationship("Task", back_populates="agent_runs")
    steps = relationship("AgentRunStep", back_populates="agent_run", cascade=CASCADE_DELETE)

    def __repr__(self):
        return f"<AgentRun agent={self.agent_name} task={self.task_id} status={self.status}>"


class AgentRunStep(Base):
    """
    Individual step within a single agent run.
    Provides fine-grained observability of the reasoning loop (ReAct). 
    """
    __tablename__ = "agent_run_steps"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    agent_run_id = Column(UUID(as_uuid=True), ForeignKey("agent_runs.id"), nullable=False)
    step_number = Column(Integer, default=1, nullable=False)

    thought = Column(Text, nullable=True)
    tool_called = Column(String(100), nullable=True)
    tool_input = Column(JSON, nullable=True)
    tool_output = Column(Text, nullable=True)

    prompt_tokens = Column(Integer, default=0)
    completion_tokens = Column(Integer, default=0)
    
    status = Column(String(50), default="PENDING", nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)

    # Relationships
    agent_run = relationship("AgentRun", back_populates="steps")

    def __repr__(self):
        return f"<AgentRunStep run={self.agent_run_id} step={self.step_number} tool={self.tool_called}>"
