// ── Core enums ────────────────────────────────────────────────────────────────

export type TaskStatus =
  | 'PENDING'
  | 'APPROVED'
  | 'REJECTED'
  | 'IN_PROGRESS'
  | 'COMPLETED'
  | 'FAILED'
  | 'DONE';

export type Priority = 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';

export type AgentRunStatus = 'PENDING' | 'RUNNING' | 'COMPLETED' | 'FAILED';

export type AgentStatus = 'idle' | 'running' | 'waiting' | 'completed' | 'error';

export type KanbanColumn = 'backlog' | 'planned' | 'ongoing' | 'done';

export type AutomationSourceType = 'github' | 'jira' | 'custom';

export type SupportedModel = 'sonnet' | 'opus' | 'haiku';

// ── Domain models ─────────────────────────────────────────────────────────────

export type EngineId = 'claude' | 'antigravity';

export interface AgentProfile {
  id: string;
  name: string;
  engine: EngineId;
  model: 'sonnet' | 'opus' | 'haiku';
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

export interface Task {
  id: string;
  project_id?: string;
  profile_id?: string;
  title: string;
  description: string;
  acceptance_criteria?: string;
  deadline?: string;
  priority: Priority;
  status: TaskStatus | 'QUEUED' | 'REVIEW';
  branch_name?: string;
  turn_count: number;
  input_tokens: number;
  output_tokens: number;
  elapsed_seconds: number;
  queued_at?: string;
  started_at?: string;
  completed_at?: string;
  github_repo?: string;
  github_issue_url?: string;
  github_pr_url?: string;
  deployment_url?: string;
  error_message?: string;
  created_at: string;
  updated_at: string;

  // Legacy compat fields
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

export interface AgentRun {
  id: string;
  task_id: string;
  agent_type: string;
  agent_name?: string;        // legacy alias for agent_type
  status: AgentRunStatus;
  input?: Record<string, unknown>;
  output?: Record<string, unknown>;
  error?: string;
  error_message?: string;     // legacy alias for error
  input_tokens?: number;
  output_tokens?: number;
  created_at: string;
  updated_at: string;
  started_at?: string;        // legacy alias for created_at
  completed_at?: string;      // legacy alias for updated_at
}

export interface AgentRunStep {
  id: string;
  run_id: string;
  agent_run_id?: string;    // legacy alias for run_id
  step_number: number;
  thought?: string;
  tool_called?: string;
  tool_input?: Record<string, unknown>;
  tool_output?: string;
  input_tokens?: number;
  output_tokens?: number;
  prompt_tokens?: number;      // legacy alias for input_tokens
  completion_tokens?: number;  // legacy alias for output_tokens
  status?: string;             // legacy field (not used in new model)
  created_at: string;
}

// ── Agent (parallel execution) ────────────────────────────────────────────────

export interface Agent {
  id: string;
  name: string;
  projectPath: string;
  status: AgentStatus;
  model: 'sonnet' | 'opus' | 'haiku';
  skills: string[];
  currentTask?: string;
  systemPrompt?: string;
  skipPermissions?: boolean;
  outputBuffer: string[];
  pid?: number;
  taskId?: string;   // links to Task.id when spawned via tasks:execute
  runId?: string;    // links to AgentRun.id
  createdAt: string;
  updatedAt: string;
}

// ── Kanban ────────────────────────────────────────────────────────────────────

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

// ── Vault ─────────────────────────────────────────────────────────────────────

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

// ── Scheduled Tasks ───────────────────────────────────────────────────────────

export interface ScheduledTask {
  id: string;
  prompt: string;
  schedule_cron: string;
  project_path: string;
  model: 'sonnet' | 'opus' | 'haiku';
  enabled: boolean;
  last_run?: string;
  last_output?: string;
  created_at: string;
}

// ── Automations ───────────────────────────────────────────────────────────────

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

// ── Settings ──────────────────────────────────────────────────────────────────

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

// ── Usage stats ───────────────────────────────────────────────────────────────

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

// ── Legacy compat ─────────────────────────────────────────────────────────────

export interface ExtractResponse {
  tasks: Task[];
  count: number;
}
