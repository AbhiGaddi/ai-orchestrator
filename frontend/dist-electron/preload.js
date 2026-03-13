"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const electron_1 = require("electron");
// Expose a typed `window.api` to the renderer (Next.js)
// All IPC calls go through this bridge — no direct Node.js access from renderer
electron_1.contextBridge.exposeInMainWorld('api', {
    // ── Projects ───────────────────────────────────────────────────────────────
    projects: {
        list: () => electron_1.ipcRenderer.invoke('projects:list'),
        get: (id) => electron_1.ipcRenderer.invoke('projects:get', id),
        create: (data) => electron_1.ipcRenderer.invoke('projects:create', data),
        update: (id, data) => electron_1.ipcRenderer.invoke('projects:update', id, data),
        delete: (id) => electron_1.ipcRenderer.invoke('projects:delete', id),
    },
    // ── Tasks ──────────────────────────────────────────────────────────────────
    tasks: {
        list: (projectId) => electron_1.ipcRenderer.invoke('tasks:list', projectId),
        get: (id) => electron_1.ipcRenderer.invoke('tasks:get', id),
        create: (data) => electron_1.ipcRenderer.invoke('tasks:create', data),
        update: (id, data) => electron_1.ipcRenderer.invoke('tasks:update', id, data),
        approve: (id, edits) => electron_1.ipcRenderer.invoke('tasks:approve', id, edits),
        reject: (id) => electron_1.ipcRenderer.invoke('tasks:reject', id),
        delete: (id) => electron_1.ipcRenderer.invoke('tasks:delete', id),
        execute: (id) => electron_1.ipcRenderer.invoke('tasks:execute', id),
        getGitDiff: (id) => electron_1.ipcRenderer.invoke('tasks:getGitDiff', id),
        commit: (id, message) => electron_1.ipcRenderer.invoke('tasks:commit', id, message),
        discard: (id) => electron_1.ipcRenderer.invoke('tasks:discard', id),
        extract: (transcript, projectId) => electron_1.ipcRenderer.invoke('tasks:extract', transcript, projectId),
    },
    // ── Agent Profiles ─────────────────────────────────────────────────────────
    agentProfiles: {
        list: () => electron_1.ipcRenderer.invoke('agentProfiles:list'),
        get: (id) => electron_1.ipcRenderer.invoke('agentProfiles:get', id),
        create: (data) => electron_1.ipcRenderer.invoke('agentProfiles:create', data),
        update: (id, data) => electron_1.ipcRenderer.invoke('agentProfiles:update', id, data),
        delete: (id) => electron_1.ipcRenderer.invoke('agentProfiles:delete', id),
    },
    // ── Agent Runs ────────────────────────────────────────────────────────────
    agentRuns: {
        list: (taskId) => electron_1.ipcRenderer.invoke('agentRuns:list', taskId),
        getSteps: (runId) => electron_1.ipcRenderer.invoke('agentRuns:getSteps', runId),
    },
    // ── Agents (parallel execution) ───────────────────────────────────────────
    agents: {
        list: () => electron_1.ipcRenderer.invoke('agents:list'),
        get: (id) => electron_1.ipcRenderer.invoke('agents:get', id),
        create: (data) => electron_1.ipcRenderer.invoke('agents:create', data),
        start: (id, prompt, model) => electron_1.ipcRenderer.invoke('agents:start', id, prompt, model),
        stop: (id) => electron_1.ipcRenderer.invoke('agents:stop', id),
        remove: (id) => electron_1.ipcRenderer.invoke('agents:remove', id),
        sendInput: (id, input) => electron_1.ipcRenderer.invoke('agents:sendInput', id, input),
        getOutput: (id, lines) => electron_1.ipcRenderer.invoke('agents:getOutput', id, lines),
    },
    // ── Kanban ────────────────────────────────────────────────────────────────
    kanban: {
        list: (column) => electron_1.ipcRenderer.invoke('kanban:list', column),
        create: (data) => electron_1.ipcRenderer.invoke('kanban:create', data),
        move: (taskId, column) => electron_1.ipcRenderer.invoke('kanban:move', taskId, column),
        update: (taskId, data) => electron_1.ipcRenderer.invoke('kanban:update', taskId, data),
        delete: (taskId) => electron_1.ipcRenderer.invoke('kanban:delete', taskId),
        assign: (taskId, agentId) => electron_1.ipcRenderer.invoke('kanban:assign', taskId, agentId),
    },
    // ── Vault ─────────────────────────────────────────────────────────────────
    vault: {
        listFolders: () => electron_1.ipcRenderer.invoke('vault:listFolders'),
        createFolder: (name, parentId) => electron_1.ipcRenderer.invoke('vault:createFolder', name, parentId),
        deleteFolder: (id) => electron_1.ipcRenderer.invoke('vault:deleteFolder', id),
        listDocuments: (folderId) => electron_1.ipcRenderer.invoke('vault:listDocuments', folderId),
        getDocument: (id) => electron_1.ipcRenderer.invoke('vault:getDocument', id),
        createDocument: (data) => electron_1.ipcRenderer.invoke('vault:createDocument', data),
        updateDocument: (id, data) => electron_1.ipcRenderer.invoke('vault:updateDocument', id, data),
        deleteDocument: (id) => electron_1.ipcRenderer.invoke('vault:deleteDocument', id),
        search: (query) => electron_1.ipcRenderer.invoke('vault:search', query),
    },
    // ── Scheduled Tasks ───────────────────────────────────────────────────────
    scheduled: {
        list: () => electron_1.ipcRenderer.invoke('scheduled:list'),
        create: (data) => electron_1.ipcRenderer.invoke('scheduled:create', data),
        delete: (id) => electron_1.ipcRenderer.invoke('scheduled:delete', id),
        toggle: (id, enabled) => electron_1.ipcRenderer.invoke('scheduled:toggle', id, enabled),
        runNow: (id) => electron_1.ipcRenderer.invoke('scheduled:runNow', id),
    },
    // ── Automations ───────────────────────────────────────────────────────────
    automations: {
        list: () => electron_1.ipcRenderer.invoke('automations:list'),
        get: (id) => electron_1.ipcRenderer.invoke('automations:get', id),
        create: (data) => electron_1.ipcRenderer.invoke('automations:create', data),
        update: (id, data) => electron_1.ipcRenderer.invoke('automations:update', id, data),
        delete: (id) => electron_1.ipcRenderer.invoke('automations:delete', id),
        toggle: (id, enabled) => electron_1.ipcRenderer.invoke('automations:toggle', id, enabled),
        runNow: (id) => electron_1.ipcRenderer.invoke('automations:runNow', id),
        getLogs: (id, limit) => electron_1.ipcRenderer.invoke('automations:getLogs', id, limit),
    },
    // ── Settings ──────────────────────────────────────────────────────────────
    settings: {
        get: () => electron_1.ipcRenderer.invoke('settings:get'),
        update: (data) => electron_1.ipcRenderer.invoke('settings:update', data),
    },
    // ── Usage ─────────────────────────────────────────────────────────────────
    usage: {
        summary: () => electron_1.ipcRenderer.invoke('usage:summary'),
        byAgent: () => electron_1.ipcRenderer.invoke('usage:byAgent'),
        byProject: () => electron_1.ipcRenderer.invoke('usage:byProject'),
    },
    // ── Hooks Manager ──────────────────────────────────────────────────────────
    hooks: {
        list: (scope, projectPath) => electron_1.ipcRenderer.invoke('hooks:list', scope, projectPath),
        update: (hooks, scope, projectPath) => electron_1.ipcRenderer.invoke('hooks:update', hooks, scope, projectPath),
    },
    // ── MCP Manager ────────────────────────────────────────────────────────────
    mcp: {
        list: (scope, projectPath) => electron_1.ipcRenderer.invoke('mcp:list', scope, projectPath),
        save: (name, config, scope, projectPath) => electron_1.ipcRenderer.invoke('mcp:save', name, config, scope, projectPath),
        delete: (name, scope, projectPath) => electron_1.ipcRenderer.invoke('mcp:delete', name, scope, projectPath),
    },
    // ── Environment Manager ────────────────────────────────────────────────────
    env: {
        list: () => electron_1.ipcRenderer.invoke('env:list'),
        save: (key, value) => electron_1.ipcRenderer.invoke('env:save', key, value),
        delete: (key) => electron_1.ipcRenderer.invoke('env:delete', key),
    },
    // ── Sessions ───────────────────────────────────────────────────────────────
    sessions: {
        list: () => electron_1.ipcRenderer.invoke('sessions:list'),
        read: (filePath) => electron_1.ipcRenderer.invoke('sessions:read', filePath),
        delete: (filePath) => electron_1.ipcRenderer.invoke('sessions:delete', filePath),
        resume: (agentId, sessionId) => electron_1.ipcRenderer.invoke('sessions:resume', agentId, sessionId),
    },
    // ── Skills ─────────────────────────────────────────────────────────────────
    skills: {
        list: (projectPath) => electron_1.ipcRenderer.invoke('skills:list', projectPath),
        get: (name, scope, projectPath) => electron_1.ipcRenderer.invoke('skills:get', name, scope, projectPath),
        create: (name, content, scope, projectPath) => electron_1.ipcRenderer.invoke('skills:create', name, content, scope, projectPath),
        update: (name, content, scope, projectPath) => electron_1.ipcRenderer.invoke('skills:update', name, content, scope, projectPath),
        delete: (name, scope, projectPath) => electron_1.ipcRenderer.invoke('skills:delete', name, scope, projectPath),
    },
    // ── Memory ─────────────────────────────────────────────────────────────────
    memory: {
        list: (projectPaths) => electron_1.ipcRenderer.invoke('memory:list', projectPaths),
        read: (filePath) => electron_1.ipcRenderer.invoke('memory:read', filePath),
        write: (filePath, content) => electron_1.ipcRenderer.invoke('memory:write', filePath, content),
        delete: (filePath) => electron_1.ipcRenderer.invoke('memory:delete', filePath),
    },
    // ── Utils ──────────────────────────────────────────────────────────────────
    utils: {
        selectDirectory: () => electron_1.ipcRenderer.invoke('utils:selectDirectory'),
    },
    // ── Event subscriptions (main → renderer) ─────────────────────────────────
    on: (channel, cb) => electron_1.ipcRenderer.on(channel, (_event, ...args) => cb(...args)),
    off: (channel, cb) => electron_1.ipcRenderer.removeListener(channel, (_event, ...args) => cb(...args)),
    once: (channel, cb) => electron_1.ipcRenderer.once(channel, (_event, ...args) => cb(...args)),
});
//# sourceMappingURL=preload.js.map