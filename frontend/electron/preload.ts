import { contextBridge, ipcRenderer } from 'electron';

// Expose a typed `window.api` to the renderer (Next.js)
// All IPC calls go through this bridge — no direct Node.js access from renderer
contextBridge.exposeInMainWorld('api', {
  // ── Projects ───────────────────────────────────────────────────────────────
  projects: {
    list: () => ipcRenderer.invoke('projects:list'),
    get: (id: string) => ipcRenderer.invoke('projects:get', id),
    create: (data: unknown) => ipcRenderer.invoke('projects:create', data),
    update: (id: string, data: unknown) => ipcRenderer.invoke('projects:update', id, data),
    delete: (id: string) => ipcRenderer.invoke('projects:delete', id),
  },

  // ── Tasks ──────────────────────────────────────────────────────────────────
  tasks: {
    list: (projectId?: string) => ipcRenderer.invoke('tasks:list', projectId),
    get: (id: string) => ipcRenderer.invoke('tasks:get', id),
    create: (data: unknown) => ipcRenderer.invoke('tasks:create', data),
    update: (id: string, data: unknown) => ipcRenderer.invoke('tasks:update', id, data),
    approve: (id: string, edits?: unknown) => ipcRenderer.invoke('tasks:approve', id, edits),
    reject: (id: string) => ipcRenderer.invoke('tasks:reject', id),
    delete: (id: string) => ipcRenderer.invoke('tasks:delete', id),
    execute: (id: string) => ipcRenderer.invoke('tasks:execute', id),
    getGitDiff: (id: string) => ipcRenderer.invoke('tasks:getGitDiff', id),
    commit: (id: string, message: string) => ipcRenderer.invoke('tasks:commit', id, message),
    discard: (id: string) => ipcRenderer.invoke('tasks:discard', id),
    extract: (transcript: string, projectId?: string) =>
      ipcRenderer.invoke('tasks:extract', transcript, projectId),
  },

  // ── Agent Profiles ─────────────────────────────────────────────────────────
  agentProfiles: {
    list: () => ipcRenderer.invoke('agentProfiles:list'),
    get: (id: string) => ipcRenderer.invoke('agentProfiles:get', id),
    create: (data: unknown) => ipcRenderer.invoke('agentProfiles:create', data),
    update: (id: string, data: unknown) => ipcRenderer.invoke('agentProfiles:update', id, data),
    delete: (id: string) => ipcRenderer.invoke('agentProfiles:delete', id),
  },

  // ── Agent Runs ────────────────────────────────────────────────────────────
  agentRuns: {
    list: (taskId?: string) => ipcRenderer.invoke('agentRuns:list', taskId),
    getSteps: (runId: string) => ipcRenderer.invoke('agentRuns:getSteps', runId),
  },

  // ── Agents (parallel execution) ───────────────────────────────────────────
  agents: {
    list: () => ipcRenderer.invoke('agents:list'),
    get: (id: string) => ipcRenderer.invoke('agents:get', id),
    create: (data: unknown) => ipcRenderer.invoke('agents:create', data),
    start: (id: string, prompt: string, model?: string) => ipcRenderer.invoke('agents:start', id, prompt, model),
    stop: (id: string) => ipcRenderer.invoke('agents:stop', id),
    remove: (id: string) => ipcRenderer.invoke('agents:remove', id),
    sendInput: (id: string, input: string) => ipcRenderer.invoke('agents:sendInput', id, input),
    getOutput: (id: string, lines?: number) => ipcRenderer.invoke('agents:getOutput', id, lines),
  },

  // ── Kanban ────────────────────────────────────────────────────────────────
  kanban: {
    list: (column?: string) => ipcRenderer.invoke('kanban:list', column),
    create: (data: unknown) => ipcRenderer.invoke('kanban:create', data),
    move: (taskId: string, column: string) => ipcRenderer.invoke('kanban:move', taskId, column),
    update: (taskId: string, data: unknown) => ipcRenderer.invoke('kanban:update', taskId, data),
    delete: (taskId: string) => ipcRenderer.invoke('kanban:delete', taskId),
    assign: (taskId: string, agentId?: string) => ipcRenderer.invoke('kanban:assign', taskId, agentId),
  },

  // ── Vault ─────────────────────────────────────────────────────────────────
  vault: {
    listFolders: () => ipcRenderer.invoke('vault:listFolders'),
    createFolder: (name: string, parentId?: string) => ipcRenderer.invoke('vault:createFolder', name, parentId),
    deleteFolder: (id: string) => ipcRenderer.invoke('vault:deleteFolder', id),
    listDocuments: (folderId?: string) => ipcRenderer.invoke('vault:listDocuments', folderId),
    getDocument: (id: string) => ipcRenderer.invoke('vault:getDocument', id),
    createDocument: (data: unknown) => ipcRenderer.invoke('vault:createDocument', data),
    updateDocument: (id: string, data: unknown) => ipcRenderer.invoke('vault:updateDocument', id, data),
    deleteDocument: (id: string) => ipcRenderer.invoke('vault:deleteDocument', id),
    search: (query: string) => ipcRenderer.invoke('vault:search', query),
  },

  // ── Scheduled Tasks ───────────────────────────────────────────────────────
  scheduled: {
    list: () => ipcRenderer.invoke('scheduled:list'),
    create: (data: unknown) => ipcRenderer.invoke('scheduled:create', data),
    delete: (id: string) => ipcRenderer.invoke('scheduled:delete', id),
    toggle: (id: string, enabled: boolean) => ipcRenderer.invoke('scheduled:toggle', id, enabled),
    runNow: (id: string) => ipcRenderer.invoke('scheduled:runNow', id),
  },

  // ── Automations ───────────────────────────────────────────────────────────
  automations: {
    list: () => ipcRenderer.invoke('automations:list'),
    get: (id: string) => ipcRenderer.invoke('automations:get', id),
    create: (data: unknown) => ipcRenderer.invoke('automations:create', data),
    update: (id: string, data: unknown) => ipcRenderer.invoke('automations:update', id, data),
    delete: (id: string) => ipcRenderer.invoke('automations:delete', id),
    toggle: (id: string, enabled: boolean) => ipcRenderer.invoke('automations:toggle', id, enabled),
    runNow: (id: string) => ipcRenderer.invoke('automations:runNow', id),
    getLogs: (id: string, limit?: number) => ipcRenderer.invoke('automations:getLogs', id, limit),
  },

  // ── Settings ──────────────────────────────────────────────────────────────
  settings: {
    get: () => ipcRenderer.invoke('settings:get'),
    update: (data: unknown) => ipcRenderer.invoke('settings:update', data),
  },

  // ── Usage ─────────────────────────────────────────────────────────────────
  usage: {
    summary: () => ipcRenderer.invoke('usage:summary'),
    byAgent: () => ipcRenderer.invoke('usage:byAgent'),
    byProject: () => ipcRenderer.invoke('usage:byProject'),
  },

  // ── Hooks Manager ──────────────────────────────────────────────────────────
  hooks: {
    list: (scope: 'global' | 'project', projectPath?: string) => ipcRenderer.invoke('hooks:list', scope, projectPath),
    update: (hooks: unknown[], scope: 'global' | 'project', projectPath?: string) => ipcRenderer.invoke('hooks:update', hooks, scope, projectPath),
  },

  // ── MCP Manager ────────────────────────────────────────────────────────────
  mcp: {
    list: (scope: 'global' | 'project', projectPath?: string) => ipcRenderer.invoke('mcp:list', scope, projectPath),
    save: (name: string, config: unknown, scope: 'global' | 'project', projectPath?: string) => ipcRenderer.invoke('mcp:save', name, config, scope, projectPath),
    delete: (name: string, scope: 'global' | 'project', projectPath?: string) => ipcRenderer.invoke('mcp:delete', name, scope, projectPath),
  },

  // ── Environment Manager ────────────────────────────────────────────────────
  env: {
    list: () => ipcRenderer.invoke('env:list'),
    save: (key: string, value: string) => ipcRenderer.invoke('env:save', key, value),
    delete: (key: string) => ipcRenderer.invoke('env:delete', key),
  },

  // ── Sessions ───────────────────────────────────────────────────────────────
  sessions: {
    list: () => ipcRenderer.invoke('sessions:list'),
    read: (filePath: string) => ipcRenderer.invoke('sessions:read', filePath),
    delete: (filePath: string) => ipcRenderer.invoke('sessions:delete', filePath),
    resume: (agentId: string, sessionId: string) => ipcRenderer.invoke('sessions:resume', agentId, sessionId),
  },

  // ── Skills ─────────────────────────────────────────────────────────────────
  skills: {
    list: (projectPath?: string) => ipcRenderer.invoke('skills:list', projectPath),
    get: (name: string, scope: 'global' | 'project', projectPath?: string) => ipcRenderer.invoke('skills:get', name, scope, projectPath),
    create: (name: string, content: string, scope: 'global' | 'project', projectPath?: string) => ipcRenderer.invoke('skills:create', name, content, scope, projectPath),
    update: (name: string, content: string, scope: 'global' | 'project', projectPath?: string) => ipcRenderer.invoke('skills:update', name, content, scope, projectPath),
    delete: (name: string, scope: 'global' | 'project', projectPath?: string) => ipcRenderer.invoke('skills:delete', name, scope, projectPath),
  },

  // ── Memory ─────────────────────────────────────────────────────────────────
  memory: {
    list: (projectPaths?: string[]) => ipcRenderer.invoke('memory:list', projectPaths),
    read: (filePath: string) => ipcRenderer.invoke('memory:read', filePath),
    write: (filePath: string, content: string) => ipcRenderer.invoke('memory:write', filePath, content),
    delete: (filePath: string) => ipcRenderer.invoke('memory:delete', filePath),
  },

  // ── Utils ──────────────────────────────────────────────────────────────────
  utils: {
    selectDirectory: () => ipcRenderer.invoke('utils:selectDirectory'),
  },

  // ── Event subscriptions (main → renderer) ─────────────────────────────────
  on: (channel: string, cb: (...args: unknown[]) => void) =>
    ipcRenderer.on(channel, (_event, ...args) => cb(...args)),
  off: (channel: string, cb: (...args: unknown[]) => void) =>
    ipcRenderer.removeListener(channel, (_event, ...args) => cb(...args)),
  once: (channel: string, cb: (...args: unknown[]) => void) =>
    ipcRenderer.once(channel, (_event, ...args) => cb(...args)),
});
