/**
 * Typed IPC client for communicating with the Electron main process.
 *
 * window.api is injected by electron/preload.ts via contextBridge.
 * In non-Electron environments (e.g. plain browser dev), calls will throw.
 */

declare global {
  interface Window {
    api: {
      projects: {
        list: () => Promise<import('@/types').Project[]>;
        get: (id: string) => Promise<import('@/types').Project>;
        create: (data: Partial<import('@/types').Project>) => Promise<import('@/types').Project>;
        update: (id: string, data: Partial<import('@/types').Project>) => Promise<import('@/types').Project>;
        delete: (id: string) => Promise<void>;
      };
      tasks: {
        list: (projectId?: string) => Promise<import('@/types').Task[]>;
        get: (id: string) => Promise<import('@/types').Task>;
        create: (data: Partial<import('@/types').Task>) => Promise<import('@/types').Task>;
        update: (id: string, data: Partial<import('@/types').Task>) => Promise<import('@/types').Task>;
        approve: (id: string, edits?: Partial<import('@/types').Task>) => Promise<import('@/types').Task>;
        reject: (id: string) => Promise<import('@/types').Task>;
        delete: (id: string) => Promise<void>;
        execute: (id: string) => Promise<import('@/types').AgentRun>;
        getGitDiff: (id: string) => Promise<{ file: string; oldValue: string; newValue: string }[]>;
        commit: (id: string, message: string) => Promise<{ success: boolean }>;
        discard: (id: string) => Promise<{ success: boolean }>;
        extract: (transcript: string, projectId?: string) => Promise<import('@/types').Task[]>;
      };
      agentProfiles: {
        list: () => Promise<import('@/types').AgentProfile[]>;
        get: (id: string) => Promise<import('@/types').AgentProfile>;
        create: (data: Partial<import('@/types').AgentProfile>) => Promise<import('@/types').AgentProfile>;
        update: (id: string, data: Partial<import('@/types').AgentProfile>) => Promise<import('@/types').AgentProfile>;
        delete: (id: string) => Promise<void>;
      };
      agentRuns: {
        list: (taskId?: string) => Promise<import('@/types').AgentRun[]>;
        getSteps: (runId: string) => Promise<import('@/types').AgentRunStep[]>;
      };
      agents: {
        list: () => Promise<import('@/types').Agent[]>;
        get: (id: string) => Promise<import('@/types').Agent>;
        create: (data: Partial<import('@/types').Agent>) => Promise<import('@/types').Agent>;
        start: (id: string, prompt: string, model?: string) => Promise<void>;
        stop: (id: string) => Promise<void>;
        remove: (id: string) => Promise<void>;
        sendInput: (id: string, input: string) => Promise<void>;
        getOutput: (id: string, lines?: number) => Promise<string[]>;
      };
      kanban: {
        list: (column?: string) => Promise<import('@/types').KanbanTask[]>;
        create: (data: Partial<import('@/types').KanbanTask>) => Promise<import('@/types').KanbanTask>;
        move: (taskId: string, column: import('@/types').KanbanColumn) => Promise<import('@/types').KanbanTask>;
        update: (taskId: string, data: Partial<import('@/types').KanbanTask>) => Promise<import('@/types').KanbanTask>;
        delete: (taskId: string) => Promise<void>;
        assign: (taskId: string, agentId?: string) => Promise<import('@/types').KanbanTask>;
      };
      vault: {
        listFolders: () => Promise<import('@/types').VaultFolder[]>;
        createFolder: (name: string, parentId?: string) => Promise<import('@/types').VaultFolder>;
        deleteFolder: (id: string) => Promise<void>;
        listDocuments: (folderId?: string) => Promise<import('@/types').VaultDocument[]>;
        getDocument: (id: string) => Promise<import('@/types').VaultDocument>;
        createDocument: (data: Partial<import('@/types').VaultDocument>) => Promise<import('@/types').VaultDocument>;
        updateDocument: (id: string, data: Partial<import('@/types').VaultDocument>) => Promise<import('@/types').VaultDocument>;
        deleteDocument: (id: string) => Promise<void>;
        search: (query: string) => Promise<import('@/types').VaultDocument[]>;
      };
      scheduled: {
        list: () => Promise<import('@/types').ScheduledTask[]>;
        create: (data: Partial<import('@/types').ScheduledTask>) => Promise<import('@/types').ScheduledTask>;
        delete: (id: string) => Promise<void>;
        toggle: (id: string, enabled: boolean) => Promise<import('@/types').ScheduledTask>;
        runNow: (id: string) => Promise<void>;
      };
      automations: {
        list: () => Promise<import('@/types').Automation[]>;
        get: (id: string) => Promise<import('@/types').Automation>;
        create: (data: Partial<import('@/types').Automation>) => Promise<import('@/types').Automation>;
        update: (id: string, data: Partial<import('@/types').Automation>) => Promise<import('@/types').Automation>;
        delete: (id: string) => Promise<void>;
        toggle: (id: string, enabled: boolean) => Promise<import('@/types').Automation>;
        runNow: (id: string) => Promise<void>;
        getLogs: (id: string, limit?: number) => Promise<import('@/types').AutomationRun[]>;
      };
      settings: {
        get: () => Promise<import('@/types').AppSettings>;
        update: (data: Partial<import('@/types').AppSettings>) => Promise<import('@/types').AppSettings>;
      };
      usage: {
        summary: () => Promise<import('@/types').UsageSummary>;
        byAgent: () => Promise<import('@/types').UsageByAgent[]>;
        byProject: () => Promise<import('@/types').UsageByProject[]>;
      };
      hooks: {
        list: (scope: 'global' | 'project', projectPath?: string) => Promise<any[]>;
        update: (hooks: any[], scope: 'global' | 'project', projectPath?: string) => Promise<void>;
      };
      mcp: {
        list: (scope: 'global' | 'project', projectPath?: string) => Promise<any[]>;
        save: (name: string, config: any, scope: 'global' | 'project', projectPath?: string) => Promise<void>;
        delete: (name: string, scope: 'global' | 'project', projectPath?: string) => Promise<void>;
      };
      env: {
        list: () => Promise<any[]>;
        save: (key: string, value: string) => Promise<void>;
        delete: (key: string) => Promise<void>;
      };
      sessions: {
        list: () => Promise<any[]>;
        read: (filePath: string) => Promise<any[]>;
        delete: (filePath: string) => Promise<void>;
        resume: (agentId: string, sessionId: string) => Promise<void>;
      };
      skills: {
        list: (projectPath?: string) => Promise<any[]>;
        get: (name: string, scope: 'global' | 'project', projectPath?: string) => Promise<string>;
        create: (name: string, content: string, scope: 'global' | 'project', projectPath?: string) => Promise<any>;
        update: (name: string, content: string, scope: 'global' | 'project', projectPath?: string) => Promise<any>;
        delete: (name: string, scope: 'global' | 'project', projectPath?: string) => Promise<void>;
      };
      memory: {
        list: (projectPaths?: string[]) => Promise<any[]>;
        read: (filePath: string) => Promise<string>;
        write: (filePath: string, content: string) => Promise<void>;
        delete: (filePath: string) => Promise<void>;
      };
      utils: {
        selectDirectory: () => Promise<string | null>;
      };
      on: (channel: string, cb: (...args: unknown[]) => void) => void;
      off: (channel: string, cb: (...args: unknown[]) => void) => void;
      once: (channel: string, cb: (...args: unknown[]) => void) => void;
    };
  }
}

function getApi() {
  if (typeof window === 'undefined' || !window.api) {
    throw new Error('window.api is not available. Are you running inside Electron?');
  }
  return window.api;
}

export const ipc = {
  get projects() { return getApi().projects; },
  get agentProfiles() { return getApi().agentProfiles; },
  get tasks() { return getApi().tasks; },
  get agentRuns() { return getApi().agentRuns; },
  get agents() { return getApi().agents; },
  get kanban() { return getApi().kanban; },
  get vault() { return getApi().vault; },
  get scheduled() { return getApi().scheduled; },
  get automations() { return getApi().automations; },
  get settings() { return getApi().settings; },
  get usage() { return getApi().usage; },
  get hooks() { return getApi().hooks; },
  get mcp() { return getApi().mcp; },
  get env() { return getApi().env; },
  get sessions() { return getApi().sessions; },
  get skills() { return getApi().skills; },
  get memory() { return getApi().memory; },
  get utils() { return getApi().utils; },

  on: (channel: string, cb: (...args: unknown[]) => void) => getApi().on(channel, cb),
  off: (channel: string, cb: (...args: unknown[]) => void) => getApi().off(channel, cb),
  once: (channel: string, cb: (...args: unknown[]) => void) => getApi().once(channel, cb),
};
