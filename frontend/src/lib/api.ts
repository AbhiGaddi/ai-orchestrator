/**
 * api.ts — unified API layer
 *
 * All calls are routed through Electron IPC (window.api).
 * Function signatures are preserved from the original REST-based api.ts
 * so that existing pages (tasks, projects, dashboard, extract) continue
 * working without changes.
 */

import { ipc } from './ipc';
import type {
  Task, Project, AgentRun, ExtractResponse,
  Agent, KanbanTask, KanbanColumn, VaultDocument,
  ScheduledTask, Automation, AppSettings, AgentProfile,
} from '@/types';

// ── Projects ──────────────────────────────────────────────────────────────────

export const listProjects = () => ipc.projects.list();
export const getProject = (id: string) => ipc.projects.get(id);
export const createProject = (data: Partial<Project>) => ipc.projects.create(data);
export const updateProject = (id: string, data: Partial<Project>) => ipc.projects.update(id, data);
export const deleteProject = (id: string) => ipc.projects.delete(id);

// ── Agent Profiles ────────────────────────────────────────────────────────────

export const listAgentProfiles = () => ipc.agentProfiles.list();
export const getAgentProfile = (id: string) => ipc.agentProfiles.get(id);
export const createAgentProfile = (data: Partial<AgentProfile>) => ipc.agentProfiles.create(data);
export const updateAgentProfile = (id: string, data: Partial<AgentProfile>) => ipc.agentProfiles.update(id, data);
export const deleteAgentProfile = (id: string) => ipc.agentProfiles.delete(id);

// ── Tasks ─────────────────────────────────────────────────────────────────────

export const listTasks = (projectId?: string) => ipc.tasks.list(projectId);
export const getTask = (id: string) => ipc.tasks.get(id);
export const createTask = (data: Partial<Task>) => ipc.tasks.create(data);
export const updateTask = (id: string, data: Partial<Task>) => ipc.tasks.update(id, data);
export const approveTask = (id: string, edits?: Partial<Task>) => ipc.tasks.approve(id, edits);
export const rejectTask = (id: string) => ipc.tasks.reject(id);
export const deleteTask = (id: string) => ipc.tasks.delete(id);
export const executeTask = (id: string): Promise<Task> => ipc.tasks.execute(id).then(() => ipc.tasks.get(id));

export const extractTasks = (
  transcript: string,
  project_id?: string,
): Promise<ExtractResponse> =>
  ipc.tasks.extract(transcript, project_id).then(tasks => ({ tasks, count: tasks.length }));

// Legacy stubs kept for page compatibility
export const syncTasks = async () => ({ status: 'ok', updated_tasks: 0 });
export const abortTask = (id: string) => ipc.tasks.update(id, { status: 'FAILED' });
export const generateCodeTask = (id: string): Promise<Task> => ipc.tasks.execute(id).then(() => ipc.tasks.get(id));
export const reviewPRTask = (id: string): Promise<Task> => ipc.tasks.execute(id).then(() => ipc.tasks.get(id));

// SonarQube stubs (FastAPI backend removed — future: implement via MCP or local CLI)
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const listSonarIssues = async (_projectId: string): Promise<any[]> => [];
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const syncSonarMetrics = async (_projectId: string): Promise<any> => null;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const fixSonarIssue = async (_projectId: string, _issue: unknown): Promise<any> => null;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const sweepSonarIssues = async (_projectId: string, _issues: unknown[]): Promise<any> => null;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const triggerManualPRReview = async (_projectId: string, _prNumber: number, _repo?: string): Promise<any> => null;

// ── Agent Runs ────────────────────────────────────────────────────────────────

export const listAgentRuns = (taskId?: string) => ipc.agentRuns.list(taskId);
export const getAgentRunSteps = (runId: string) => ipc.agentRuns.getSteps(runId);

// ── Agents (parallel Claude CLI execution) ────────────────────────────────────

export const listAgents = () => ipc.agents.list();
export const getAgent = (id: string) => ipc.agents.get(id);
export const createAgent = (data: Partial<Agent>) => ipc.agents.create(data);
export const startAgent = (id: string, prompt: string, model?: string) => ipc.agents.start(id, prompt, model);
export const stopAgent = (id: string) => ipc.agents.stop(id);
export const removeAgent = (id: string) => ipc.agents.remove(id);
export const sendAgentInput = (id: string, input: string) => ipc.agents.sendInput(id, input);
export const getAgentOutput = (id: string, lines?: number) => ipc.agents.getOutput(id, lines);

// ── Kanban ────────────────────────────────────────────────────────────────────

export const listKanbanTasks = (column?: string) => ipc.kanban.list(column);
export const createKanbanTask = (data: Partial<KanbanTask>) => ipc.kanban.create(data);
export const moveKanbanTask = (taskId: string, column: KanbanColumn) => ipc.kanban.move(taskId, column);
export const updateKanbanTask = (taskId: string, data: Partial<KanbanTask>) => ipc.kanban.update(taskId, data);
export const deleteKanbanTask = (taskId: string) => ipc.kanban.delete(taskId);
export const assignKanbanTask = (taskId: string, agentId?: string) => ipc.kanban.assign(taskId, agentId);

// ── Vault ─────────────────────────────────────────────────────────────────────

export const listVaultFolders = () => ipc.vault.listFolders();
export const createVaultFolder = (name: string, parentId?: string) => ipc.vault.createFolder(name, parentId);
export const deleteVaultFolder = (id: string) => ipc.vault.deleteFolder(id);
export const listVaultDocuments = (folderId?: string) => ipc.vault.listDocuments(folderId);
export const getVaultDocument = (id: string) => ipc.vault.getDocument(id);
export const createVaultDocument = (data: Partial<VaultDocument>) => ipc.vault.createDocument(data);
export const updateVaultDocument = (id: string, data: Partial<VaultDocument>) => ipc.vault.updateDocument(id, data);
export const deleteVaultDocument = (id: string) => ipc.vault.deleteDocument(id);
export const searchVault = (query: string) => ipc.vault.search(query);

// ── Scheduled Tasks ───────────────────────────────────────────────────────────

export const listScheduledTasks = () => ipc.scheduled.list();
export const createScheduledTask = (data: Partial<ScheduledTask>) => ipc.scheduled.create(data);
export const deleteScheduledTask = (id: string) => ipc.scheduled.delete(id);
export const toggleScheduledTask = (id: string, enabled: boolean) => ipc.scheduled.toggle(id, enabled);
export const runScheduledTaskNow = (id: string) => ipc.scheduled.runNow(id);

// ── Automations ───────────────────────────────────────────────────────────────

export const listAutomations = () => ipc.automations.list();
export const getAutomation = (id: string) => ipc.automations.get(id);
export const createAutomation = (data: Partial<Automation>) => ipc.automations.create(data);
export const updateAutomation = (id: string, data: Partial<Automation>) => ipc.automations.update(id, data);
export const deleteAutomation = (id: string) => ipc.automations.delete(id);
export const toggleAutomation = (id: string, enabled: boolean) => ipc.automations.toggle(id, enabled);
export const runAutomationNow = (id: string) => ipc.automations.runNow(id);
export const getAutomationLogs = (id: string, limit?: number) => ipc.automations.getLogs(id, limit);

// ── Settings ──────────────────────────────────────────────────────────────────

export const getSettings = () => ipc.settings.get();
export const updateSettings = (data: Partial<AppSettings>) => ipc.settings.update(data);

// ── Usage ─────────────────────────────────────────────────────────────────────

export const getUsageSummary = () => ipc.usage.summary();
export const getUsageByAgent = () => ipc.usage.byAgent();
export const getUsageByProject = () => ipc.usage.byProject();
