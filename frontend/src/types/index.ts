export type TaskStatus =
    | 'PENDING'
    | 'APPROVED'
    | 'REJECTED'
    | 'IN_PROGRESS'
    | 'COMPLETED'
    | 'FAILED';

export type Priority = 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';

export type AgentRunStatus = 'PENDING' | 'RUNNING' | 'COMPLETED' | 'FAILED';

export interface Task {
    id: string;
    title: string;
    description: string | null;
    acceptance_criteria: string | null;
    deadline: string | null;
    priority: Priority;
    status: TaskStatus;
    approved: boolean;
    github_issue_id: string | null;
    github_issue_url: string | null;
    email_sent: boolean;
    // Phase 2+
    github_pr_id: string | null;
    github_pr_url: string | null;
    branch_name: string | null;
    image_tag: string | null;
    deployed_at: string | null;
    deploy_environment: string | null;
    created_at: string;
    updated_at: string;
}

export interface AgentRun {
    id: string;
    task_id: string;
    agent_name: string;
    status: AgentRunStatus;
    input_context: Record<string, unknown> | null;
    output: Record<string, unknown> | null;
    error_message: string | null;
    started_at: string | null;
    completed_at: string | null;
}

export interface ExtractResponse {
    tasks: Task[];
    count: number;
}
