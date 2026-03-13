export type SupportedModel = 'sonnet' | 'opus' | 'haiku';
export type EngineId = 'claude' | 'antigravity';
export interface AgentProfile {
    id: string;
    name: string;
    engine: EngineId;
    model: SupportedModel;
    skills: string[];
    plugins: string[];
    system_prompt?: string;
    max_turns: number;
    allowed_tools?: string[];
    skip_permissions: boolean;
    branch_prefix: string;
    is_default: boolean;
    created_at: string;
    updated_at: string;
}
export type AgentStatus = 'idle' | 'running' | 'waiting' | 'completed' | 'error';
export interface Agent {
    id: string;
    name: string;
    taskId?: string;
    runId?: string;
    projectPath: string;
    status: AgentStatus;
    model: SupportedModel;
    skills: string[];
    currentTask?: string;
    systemPrompt?: string;
    skipPermissions?: boolean;
    outputBuffer: string[];
    streamBuffer?: string;
    inputTokens?: number;
    outputTokens?: number;
    lastThought?: string;
    pid?: number;
    createdAt: string;
    updatedAt: string;
}
export type TaskStatus = 'PENDING' | 'APPROVED' | 'REJECTED' | 'IN_PROGRESS' | 'COMPLETED' | 'FAILED' | 'DONE';
export type Priority = 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
export interface Task {
    id: string;
    title: string;
    description: string;
    status: TaskStatus;
    priority: Priority;
    project_id?: string;
    profile_id?: string;
    acceptance_criteria?: string;
    deadline?: string;
    github_repo?: string;
    github_issue_url?: string;
    github_pr_url?: string;
    deployment_url?: string;
    branch_name?: string;
    turn_count: number;
    input_tokens: number;
    output_tokens: number;
    elapsed_seconds: number;
    queued_at?: string;
    started_at?: string;
    completed_at?: string;
    created_at: string;
    updated_at: string;
    approved?: boolean;
    github_issue_id?: string;
    github_pr_id?: string;
    email_sent?: boolean;
    pr_reviewed?: boolean;
}
export interface Project {
    id: string;
    name: string;
    description?: string;
    local_path: string;
    coding_guidelines?: string;
    created_at: string;
    updated_at: string;
}
export type AgentRunStatus = 'PENDING' | 'RUNNING' | 'COMPLETED' | 'FAILED';
export interface AgentRun {
    id: string;
    task_id: string;
    agent_type: string;
    agent_name?: string;
    status: AgentRunStatus;
    input?: Record<string, unknown>;
    output?: Record<string, unknown>;
    error?: string;
    error_message?: string;
    input_tokens?: number;
    output_tokens?: number;
    created_at: string;
    updated_at: string;
    started_at?: string;
    completed_at?: string;
}
export interface AgentRunStep {
    id: string;
    run_id: string;
    step_number: number;
    thought?: string;
    tool_called?: string;
    tool_input?: Record<string, unknown>;
    tool_output?: string;
    input_tokens?: number;
    output_tokens?: number;
    created_at: string;
}
export type KanbanColumn = 'backlog' | 'planned' | 'ongoing' | 'done';
export interface KanbanTask {
    id: string;
    title: string;
    description?: string;
    column: KanbanColumn;
    priority: Priority;
    progress: number;
    labels: string[];
    skill_requirements: string[];
    assigned_agent_id?: string;
    project_path?: string;
    created_at: string;
    updated_at: string;
}
export interface VaultFolder {
    id: string;
    name: string;
    parent_id?: string;
    created_at: string;
}
export interface VaultDocument {
    id: string;
    title: string;
    content: string;
    folder_id?: string;
    tags: string[];
    created_at: string;
    updated_at: string;
}
export interface ScheduledTask {
    id: string;
    prompt: string;
    schedule_cron: string;
    project_path: string;
    model: SupportedModel;
    enabled: boolean;
    last_run?: string;
    last_output?: string;
    created_at: string;
}
export type AutomationSourceType = 'github' | 'jira' | 'custom';
export interface Automation {
    id: string;
    name: string;
    source_type: AutomationSourceType;
    source_config: Record<string, unknown>;
    schedule_minutes: number;
    agent_prompt: string;
    agent_project_path?: string;
    agent_model: SupportedModel;
    output_github_comment: boolean;
    output_slack: boolean;
    output_telegram: boolean;
    enabled: boolean;
    last_run?: string;
    created_at: string;
}
export interface AutomationRun {
    id: string;
    automation_id: string;
    status: 'running' | 'completed' | 'failed';
    items_processed: number;
    output?: string;
    created_at: string;
}
export interface AppSettings {
    claudePath: string;
    antigravityPath: string;
    defaultModel: SupportedModel;
    telegramToken?: string;
    telegramChatIds: string[];
    slackBotToken?: string;
    slackAppToken?: string;
    slackEnabled: boolean;
    telegramEnabled: boolean;
    notifyOnComplete: boolean;
    notifyOnError: boolean;
    notifyOnWaiting: boolean;
    skipPermissions: boolean;
}
export interface IpcChannels {
    'projects:list': [undefined, Project[]];
    'projects:get': [string, Project];
    'projects:create': [Partial<Project>, Project];
    'projects:update': [[string, Partial<Project>], Project];
    'projects:delete': [string, void];
    'agentProfiles:list': [undefined, AgentProfile[]];
    'agentProfiles:get': [string, AgentProfile];
    'agentProfiles:create': [Partial<AgentProfile>, AgentProfile];
    'agentProfiles:update': [[string, Partial<AgentProfile>], AgentProfile];
    'agentProfiles:delete': [string, void];
    'tasks:list': [string | undefined, Task[]];
    'tasks:get': [string, Task];
    'tasks:create': [Partial<Task>, Task];
    'tasks:update': [[string, Partial<Task>], Task];
    'tasks:approve': [[string, Partial<Task> | undefined], Task];
    'tasks:reject': [string, Task];
    'tasks:delete': [string, void];
    'tasks:execute': [string, AgentRun];
    'tasks:extract': [[string, string | undefined], Task[]];
    'agentRuns:list': [string | undefined, AgentRun[]];
    'agentRuns:getSteps': [string, AgentRunStep[]];
    'agents:list': [undefined, Agent[]];
    'agents:get': [string, Agent];
    'agents:create': [Partial<Agent>, Agent];
    'agents:start': [[string, string, string | undefined], void];
    'agents:stop': [string, void];
    'agents:remove': [string, void];
    'agents:sendInput': [[string, string], void];
    'agents:getOutput': [[string, number | undefined], string[]];
    'kanban:list': [string | undefined, KanbanTask[]];
    'kanban:create': [Partial<KanbanTask>, KanbanTask];
    'kanban:move': [[string, KanbanColumn], KanbanTask];
    'kanban:update': [[string, Partial<KanbanTask>], KanbanTask];
    'kanban:delete': [string, void];
    'kanban:assign': [[string, string | undefined], KanbanTask];
    'vault:listFolders': [undefined, VaultFolder[]];
    'vault:createFolder': [[string, string | undefined], VaultFolder];
    'vault:deleteFolder': [string, void];
    'vault:listDocuments': [string | undefined, VaultDocument[]];
    'vault:getDocument': [string, VaultDocument];
    'vault:createDocument': [Partial<VaultDocument>, VaultDocument];
    'vault:updateDocument': [[string, Partial<VaultDocument>], VaultDocument];
    'vault:deleteDocument': [string, void];
    'vault:search': [string, VaultDocument[]];
    'scheduled:list': [undefined, ScheduledTask[]];
    'scheduled:create': [Partial<ScheduledTask>, ScheduledTask];
    'scheduled:delete': [string, void];
    'scheduled:toggle': [[string, boolean], ScheduledTask];
    'scheduled:runNow': [string, void];
    'automations:list': [undefined, Automation[]];
    'automations:get': [string, Automation];
    'automations:create': [Partial<Automation>, Automation];
    'automations:update': [[string, Partial<Automation>], Automation];
    'automations:delete': [string, void];
    'automations:toggle': [[string, boolean], Automation];
    'automations:runNow': [string, void];
    'automations:getLogs': [[string, number | undefined], AutomationRun[]];
    'settings:get': [undefined, AppSettings];
    'settings:update': [Partial<AppSettings>, AppSettings];
    'usage:summary': [undefined, UsageSummary];
    'usage:byAgent': [undefined, UsageByAgent[]];
    'usage:byProject': [undefined, UsageByProject[]];
}
export interface UsageSummary {
    total_input_tokens: number;
    total_output_tokens: number;
    total_runs: number;
    today_input_tokens: number;
    today_output_tokens: number;
}
export interface UsageByAgent {
    agent_type: string;
    total_input_tokens: number;
    total_output_tokens: number;
    run_count: number;
}
export interface UsageByProject {
    project_id: string;
    project_name: string;
    total_input_tokens: number;
    total_output_tokens: number;
    run_count: number;
}
