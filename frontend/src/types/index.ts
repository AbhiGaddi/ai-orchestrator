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
    project_id?: string;
    title: string;
    description?: string;
    acceptance_criteria?: string;
    deadline?: string;
    priority: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
    status: TaskStatus;
    approved: boolean;
    github_issue_id?: string;
    github_issue_url?: string;
    email_sent: boolean;
    github_repo?: string;
    github_pr_id?: string;
    github_pr_url?: string;
    branch_name?: string;
    pr_reviewed: boolean;

    tests_passed?: boolean | null;
    test_report_url?: string | null;

    image_tag?: string | null;
    image_built_at?: string | null;
    build_status?: string | null;
    build_logs_url?: string | null;
    docker_image_url?: string | null;

    deployed_at?: string | null;
    deploy_environment?: string | null;
    deployment_status?: string | null;
    deployment_url?: string | null;

    created_at: string;
    updated_at: string;
}

export interface Project {
    id: string;
    name: string;
    description?: string;
    github_repos: string[];
    services_context: Record<string, any>;
    coding_guidelines?: string;
    sonar_project_key?: string;
    sonar_token?: string;
    sonar_metrics?: Record<string, any>;
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
