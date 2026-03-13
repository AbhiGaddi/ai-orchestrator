"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.setupIpcHandlers = setupIpcHandlers;
const electron_1 = require("electron");
const uuid_1 = require("uuid");
const database_1 = require("../db/database");
const agent_manager_1 = require("../core/agent-manager");
const pty_manager_1 = require("../core/pty-manager");
const hooks_manager_1 = require("../services/hooks-manager");
const mcp_manager_1 = require("../services/mcp-manager");
const env_manager_1 = require("../services/env-manager");
const session_reader_1 = require("../services/session-reader");
function getMainWindow() {
    return electron_1.BrowserWindow.getAllWindows()[0] ?? null;
}
function getSettings() {
    const row = (0, database_1.getDb)().prepare('SELECT * FROM settings WHERE id = 1').get();
    return rowToSettings(row);
}
function setupIpcHandlers() {
    setupProjectHandlers();
    setupTaskHandlers();
    setupAgentRunHandlers();
    setupAgentHandlers();
    setupKanbanHandlers();
    setupVaultHandlers();
    setupScheduledHandlers();
    setupAutomationHandlers();
    setupSettingsHandlers();
    setupUsageHandlers();
    setupHooksHandlers();
    setupMcpHandlers();
    setupEnvHandlers();
    setupSessionsHandlers();
    setupAgentProfileHandlers();
    setupSkillsHandlers();
    setupMemoryHandlers();
    setupUtilHandlers();
}
// ── Agent Profiles ─────────────────────────────────────────────────────────────
function setupAgentProfileHandlers() {
    const { listProfiles, getProfile, createProfile, updateProfile, deleteProfile } = require('../services/agent-profiles');
    electron_1.ipcMain.handle('agentProfiles:list', () => listProfiles());
    electron_1.ipcMain.handle('agentProfiles:get', (_e, id) => getProfile(id));
    electron_1.ipcMain.handle('agentProfiles:create', (_e, data) => createProfile(data));
    electron_1.ipcMain.handle('agentProfiles:update', (_e, id, data) => updateProfile(id, data));
    electron_1.ipcMain.handle('agentProfiles:delete', (_e, id) => deleteProfile(id));
}
// ── Projects ─────────────────────────────────────────────────────────────────
function setupProjectHandlers() {
    electron_1.ipcMain.handle('projects:list', () => {
        return (0, database_1.getDb)().prepare('SELECT * FROM projects ORDER BY created_at DESC').all()
            .map(rowToProject);
    });
    electron_1.ipcMain.handle('projects:get', (_e, id) => {
        const row = (0, database_1.getDb)().prepare('SELECT * FROM projects WHERE id = ?').get(id);
        if (!row)
            throw new Error(`Project ${id} not found`);
        return rowToProject(row);
    });
    electron_1.ipcMain.handle('projects:create', (_e, data) => {
        const project = {
            id: (0, uuid_1.v4)(),
            name: data.name ?? 'Untitled Project',
            description: data.description,
            local_path: data.local_path ?? '',
            coding_guidelines: data.coding_guidelines,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
        };
        (0, database_1.getDb)().prepare(`
      INSERT INTO projects (id, name, description, local_path, coding_guidelines, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `).run(project.id, project.name, project.description ?? null, project.local_path, project.coding_guidelines ?? null, project.created_at, project.updated_at);
        return project;
    });
    electron_1.ipcMain.handle('projects:update', (_e, id, data) => {
        const now = new Date().toISOString();
        (0, database_1.getDb)().prepare(`
      UPDATE projects SET
        name = COALESCE(?, name),
        description = COALESCE(?, description),
        local_path = COALESCE(?, local_path),
        coding_guidelines = COALESCE(?, coding_guidelines),
        updated_at = ?
      WHERE id = ?
    `).run(data.name ?? null, data.description ?? null, data.local_path ?? null, data.coding_guidelines ?? null, now, id);
        const row = (0, database_1.getDb)().prepare('SELECT * FROM projects WHERE id = ?').get(id);
        return rowToProject(row);
    });
    electron_1.ipcMain.handle('projects:delete', (_e, id) => {
        (0, database_1.getDb)().prepare('DELETE FROM projects WHERE id = ?').run(id);
    });
}
// ── Tasks ─────────────────────────────────────────────────────────────────────
function setupTaskHandlers() {
    electron_1.ipcMain.handle('tasks:list', (_e, projectId) => {
        const rows = projectId
            ? (0, database_1.getDb)().prepare('SELECT * FROM tasks WHERE project_id = ? ORDER BY created_at DESC').all(projectId)
            : (0, database_1.getDb)().prepare('SELECT * FROM tasks ORDER BY created_at DESC').all();
        return rows.map(rowToTask);
    });
    electron_1.ipcMain.handle('tasks:get', (_e, id) => {
        const row = (0, database_1.getDb)().prepare('SELECT * FROM tasks WHERE id = ?').get(id);
        if (!row)
            throw new Error(`Task ${id} not found`);
        return rowToTask(row);
    });
    electron_1.ipcMain.handle('tasks:create', (_e, data) => {
        const task = {
            id: (0, uuid_1.v4)(),
            title: data.title ?? 'Untitled Task',
            description: data.description ?? '',
            status: data.status ?? 'PENDING',
            priority: data.priority ?? 'MEDIUM',
            project_id: data.project_id,
            acceptance_criteria: data.acceptance_criteria,
            deadline: data.deadline,
            github_repo: data.github_repo,
            profile_id: data.profile_id,
            branch_name: data.branch_name,
            turn_count: 0,
            input_tokens: 0,
            output_tokens: 0,
            elapsed_seconds: 0,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
        };
        insertTask(task);
        return task;
    });
    electron_1.ipcMain.handle('tasks:update', (_e, id, data) => {
        updateTaskFields(id, data);
        return rowToTask((0, database_1.getDb)().prepare('SELECT * FROM tasks WHERE id = ?').get(id));
    });
    electron_1.ipcMain.handle('tasks:approve', (_e, id, edits) => {
        updateTaskFields(id, { ...edits, status: 'APPROVED' });
        return rowToTask((0, database_1.getDb)().prepare('SELECT * FROM tasks WHERE id = ?').get(id));
    });
    electron_1.ipcMain.handle('tasks:reject', (_e, id) => {
        updateTaskFields(id, { status: 'REJECTED' });
        return rowToTask((0, database_1.getDb)().prepare('SELECT * FROM tasks WHERE id = ?').get(id));
    });
    electron_1.ipcMain.handle('tasks:delete', (_e, id) => {
        (0, database_1.getDb)().prepare('DELETE FROM tasks WHERE id = ?').run(id);
    });
    electron_1.ipcMain.handle('tasks:execute', (_e, taskId) => {
        // Create an agent run record and start a Claude agent for this task
        const task = rowToTask((0, database_1.getDb)().prepare('SELECT * FROM tasks WHERE id = ?').get(taskId));
        // Fetch Project Path
        let projectPath = process.env.HOME ?? '/';
        if (task.project_id) {
            const project = (0, database_1.getDb)().prepare('SELECT * FROM projects WHERE id = ?').get(task.project_id);
            if (project?.local_path) {
                projectPath = project.local_path;
            }
        }
        // Fetch Profile
        const { getProfile, listProfiles } = require('../services/agent-profiles');
        let profile = null;
        if (task.profile_id) {
            profile = getProfile(task.profile_id);
        }
        else {
            // Find default profile
            const profiles = listProfiles();
            profile = profiles.find((p) => p.is_default) || profiles[0] || null;
        }
        const run = {
            id: (0, uuid_1.v4)(),
            task_id: taskId,
            agent_type: 'CodeAgent',
            status: 'RUNNING',
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
        };
        (0, database_1.getDb)().prepare(`
      INSERT INTO agent_runs (id, task_id, agent_type, status, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?)
    `).run(run.id, run.task_id, run.agent_type, run.status, run.created_at, run.updated_at);
        updateTaskFields(taskId, { status: 'IN_PROGRESS' });
        const settings = getSettings();
        const agent = (0, agent_manager_1.createAgent)({
            name: `Task: ${task.title.slice(0, 30)}`,
            taskId: taskId,
            runId: run.id,
            projectPath: projectPath,
            model: profile?.model || settings.defaultModel,
            skills: profile?.skills || [],
            systemPrompt: profile?.system_prompt,
            skipPermissions: profile?.skip_permissions || settings.skipPermissions,
        });
        (0, agent_manager_1.startAgent)(agent.id, task.description, agent.model, settings, getMainWindow());
        return run;
    });
    electron_1.ipcMain.handle('tasks:getGitDiff', async (_e, taskId) => {
        const task = rowToTask((0, database_1.getDb)().prepare('SELECT * FROM tasks WHERE id = ?').get(taskId));
        if (!task.project_id)
            throw new Error("Task has no associated project");
        // Get project path
        const project = (0, database_1.getDb)().prepare('SELECT * FROM projects WHERE id = ?').get(task.project_id);
        const projectPath = project?.local_path || null;
        if (!projectPath)
            throw new Error("Could not determine project path");
        const { execSync } = require('node:child_process');
        try {
            // Get list of changed files
            const statusOutput = execSync('git status --short', { cwd: projectPath, encoding: 'utf8' });
            const changedFiles = statusOutput.split('\n').filter(Boolean).map((line) => line.slice(3).trim());
            const diffs = changedFiles.map((file) => {
                try {
                    // Get diff for each file
                    const diffResult = execSync(`git diff HEAD -- "${file}"`, { cwd: projectPath, encoding: 'utf8' });
                    // Get original content (oldValue) and new content (newValue)
                    // oldValue from HEAD
                    let oldValue = '';
                    try {
                        oldValue = execSync(`git show HEAD:"${file}"`, { cwd: projectPath, encoding: 'utf8' });
                    }
                    catch {
                        // File might be new
                    }
                    const fs = require('node:fs');
                    const path = require('node:path');
                    let newValue = '';
                    try {
                        newValue = fs.readFileSync(path.join(projectPath, file), 'utf8');
                    }
                    catch {
                        // File might be deleted
                    }
                    return { file, diff: diffResult, oldValue, newValue };
                }
                catch (e) {
                    return { file, diff: '', oldValue: '', newValue: '', error: String(e) };
                }
            });
            return diffs;
        }
        catch (err) {
            throw new Error(`Failed to get git diff: ${err.message}`);
        }
    });
    electron_1.ipcMain.handle('tasks:commit', async (_e, taskId, message) => {
        const task = rowToTask((0, database_1.getDb)().prepare('SELECT * FROM tasks WHERE id = ?').get(taskId));
        if (!task.project_id)
            throw new Error("Task has no associated project");
        const project = (0, database_1.getDb)().prepare('SELECT * FROM projects WHERE id = ?').get(task.project_id);
        const projectPath = project?.local_path || null;
        if (!projectPath)
            throw new Error("Could not determine project path");
        const { execSync } = require('node:child_process');
        try {
            execSync(`git add . && git commit -m ${JSON.stringify(message)}`, { cwd: projectPath });
            updateTaskFields(taskId, { status: 'DONE' });
            return { success: true };
        }
        catch (err) {
            throw new Error(`Failed to commit changes: ${err.message}`);
        }
    });
    electron_1.ipcMain.handle('tasks:discard', async (_e, taskId) => {
        const task = rowToTask((0, database_1.getDb)().prepare('SELECT * FROM tasks WHERE id = ?').get(taskId));
        if (!task.project_id)
            throw new Error("Task has no associated project");
        const project = (0, database_1.getDb)().prepare('SELECT * FROM projects WHERE id = ?').get(task.project_id);
        const projectPath = project?.local_path || null;
        if (!projectPath)
            throw new Error("Could not determine project path");
        const { execSync } = require('node:child_process');
        try {
            execSync('git reset --hard HEAD && git clean -fd', { cwd: projectPath });
            updateTaskFields(taskId, { status: 'APPROVED' });
            return { success: true };
        }
        catch (err) {
            throw new Error(`Failed to discard changes: ${err.message}`);
        }
    });
    electron_1.ipcMain.handle('tasks:extract', (_e, transcript, projectId) => {
        // Spawn Claude to extract tasks from a transcript
        const settings = getSettings();
        const prompt = `Extract actionable tasks from this meeting transcript. For each task output JSON with fields: title, description, priority (LOW/MEDIUM/HIGH/CRITICAL), acceptance_criteria. Return a JSON array.\n\nTranscript:\n${transcript}`;
        return new Promise((resolve, reject) => {
            // Simple one-shot execution
            const { execSync } = require('node:child_process');
            try {
                const executable = settings.claudePath || 'claude';
                const result = execSync(`${executable} --print -p ${JSON.stringify(prompt)}`, { encoding: 'utf8', timeout: 60000 });
                const match = result.match(/\[[\s\S]*\]/);
                if (!match)
                    return resolve([]);
                const extracted = JSON.parse(match[0]);
                const tasks = extracted.map(t => {
                    const task = {
                        id: (0, uuid_1.v4)(),
                        title: t.title,
                        description: t.description,
                        status: 'PENDING',
                        priority: t.priority ?? 'MEDIUM',
                        project_id: projectId,
                        acceptance_criteria: t.acceptance_criteria,
                        turn_count: 0,
                        input_tokens: 0,
                        output_tokens: 0,
                        elapsed_seconds: 0,
                        created_at: new Date().toISOString(),
                        updated_at: new Date().toISOString(),
                    };
                    insertTask(task);
                    return task;
                });
                resolve(tasks);
            }
            catch (err) {
                if (err.message && (err.message.includes('command not found') || err.message.includes('ENOENT'))) {
                    reject(new Error('Claude CLI not found. Please configure Claude path in Settings.'));
                }
                else {
                    reject(err);
                }
            }
        });
    });
}
// ── Agent Runs ───────────────────────────────────────────────────────────────
function setupAgentRunHandlers() {
    electron_1.ipcMain.handle('agentRuns:list', (_e, taskId) => {
        const rows = taskId
            ? (0, database_1.getDb)().prepare('SELECT * FROM agent_runs WHERE task_id = ? ORDER BY created_at DESC').all(taskId)
            : (0, database_1.getDb)().prepare('SELECT * FROM agent_runs ORDER BY created_at DESC LIMIT 100').all();
        return rows.map(rowToAgentRun);
    });
    electron_1.ipcMain.handle('agentRuns:getSteps', (_e, runId) => {
        const rows = (0, database_1.getDb)()
            .prepare('SELECT * FROM agent_run_steps WHERE run_id = ? ORDER BY step_number ASC')
            .all(runId);
        return rows.map(rowToAgentRunStep);
    });
}
// ── Agents ───────────────────────────────────────────────────────────────────
function setupAgentHandlers() {
    electron_1.ipcMain.handle('agents:list', () => (0, agent_manager_1.listAgents)());
    electron_1.ipcMain.handle('agents:get', (_e, id) => {
        const agent = (0, agent_manager_1.getAgent)(id);
        if (!agent)
            throw new Error(`Agent ${id} not found`);
        return agent;
    });
    electron_1.ipcMain.handle('agents:create', (_e, data) => (0, agent_manager_1.createAgent)(data));
    electron_1.ipcMain.handle('agents:start', (_e, id, prompt, model) => {
        const settings = getSettings();
        (0, agent_manager_1.startAgent)(id, prompt, model ?? settings.defaultModel, settings, getMainWindow());
    });
    electron_1.ipcMain.handle('agents:stop', (_e, id) => {
        (0, agent_manager_1.stopAgent)(id, getMainWindow());
    });
    electron_1.ipcMain.handle('agents:remove', (_e, id) => (0, agent_manager_1.removeAgent)(id));
    electron_1.ipcMain.handle('agents:sendInput', (_e, id, input) => {
        (0, pty_manager_1.writeToPty)(id, input);
        // Clear permission de-dup cache so the next prompt fires a new notification
        agent_manager_1.lastPermissionMsg.delete(id);
    });
    electron_1.ipcMain.handle('agents:getOutput', (_e, id, lines) => {
        const agent = (0, agent_manager_1.getAgent)(id);
        if (!agent)
            return [];
        const buf = agent.outputBuffer;
        return lines ? buf.slice(-lines) : buf;
    });
}
// ── Kanban ───────────────────────────────────────────────────────────────────
function setupKanbanHandlers() {
    electron_1.ipcMain.handle('kanban:list', (_e, column) => {
        const rows = column
            ? (0, database_1.getDb)().prepare('SELECT * FROM kanban_tasks WHERE column_name = ? ORDER BY created_at DESC').all(column)
            : (0, database_1.getDb)().prepare('SELECT * FROM kanban_tasks ORDER BY created_at DESC').all();
        return rows.map(rowToKanbanTask);
    });
    electron_1.ipcMain.handle('kanban:create', (_e, data) => {
        const task = {
            id: (0, uuid_1.v4)(),
            title: data.title ?? 'Untitled',
            description: data.description,
            column: data.column ?? 'backlog',
            priority: data.priority ?? 'MEDIUM',
            progress: 0,
            labels: data.labels ?? [],
            skill_requirements: data.skill_requirements ?? [],
            project_path: data.project_path,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
        };
        (0, database_1.getDb)().prepare(`
      INSERT INTO kanban_tasks
        (id, title, description, column_name, priority, progress, labels, skill_requirements, project_path, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(task.id, task.title, task.description ?? null, task.column, task.priority, task.progress, (0, database_1.toJson)(task.labels), (0, database_1.toJson)(task.skill_requirements), task.project_path ?? null, task.created_at, task.updated_at);
        return task;
    });
    electron_1.ipcMain.handle('kanban:move', (_e, taskId, column) => {
        const now = new Date().toISOString();
        (0, database_1.getDb)().prepare(`UPDATE kanban_tasks SET column_name = ?, updated_at = ? WHERE id = ?`).run(column, now, taskId);
        return rowToKanbanTask((0, database_1.getDb)().prepare('SELECT * FROM kanban_tasks WHERE id = ?').get(taskId));
    });
    electron_1.ipcMain.handle('kanban:update', (_e, taskId, data) => {
        const now = new Date().toISOString();
        (0, database_1.getDb)().prepare(`
      UPDATE kanban_tasks SET
        title = COALESCE(?, title),
        description = COALESCE(?, description),
        priority = COALESCE(?, priority),
        progress = COALESCE(?, progress),
        labels = COALESCE(?, labels),
        skill_requirements = COALESCE(?, skill_requirements),
        updated_at = ?
      WHERE id = ?
    `).run(data.title ?? null, data.description ?? null, data.priority ?? null, data.progress ?? null, data.labels ? (0, database_1.toJson)(data.labels) : null, data.skill_requirements ? (0, database_1.toJson)(data.skill_requirements) : null, now, taskId);
        return rowToKanbanTask((0, database_1.getDb)().prepare('SELECT * FROM kanban_tasks WHERE id = ?').get(taskId));
    });
    electron_1.ipcMain.handle('kanban:assign', (_e, taskId, agentId) => {
        const now = new Date().toISOString();
        (0, database_1.getDb)().prepare(`UPDATE kanban_tasks SET assigned_agent_id = ?, updated_at = ? WHERE id = ?`).run(agentId ?? null, now, taskId);
        return rowToKanbanTask((0, database_1.getDb)().prepare('SELECT * FROM kanban_tasks WHERE id = ?').get(taskId));
    });
    electron_1.ipcMain.handle('kanban:delete', (_e, taskId) => {
        (0, database_1.getDb)().prepare('DELETE FROM kanban_tasks WHERE id = ?').run(taskId);
    });
}
// ── Vault ─────────────────────────────────────────────────────────────────────
function setupVaultHandlers() {
    electron_1.ipcMain.handle('vault:listFolders', () => {
        return (0, database_1.getDb)().prepare('SELECT * FROM vault_folders ORDER BY name').all().map(rowToFolder);
    });
    electron_1.ipcMain.handle('vault:createFolder', (_e, name, parentId) => {
        const folder = {
            id: (0, uuid_1.v4)(), name, parent_id: parentId,
            created_at: new Date().toISOString(),
        };
        (0, database_1.getDb)().prepare('INSERT INTO vault_folders (id, name, parent_id, created_at) VALUES (?, ?, ?, ?)').run(folder.id, folder.name, folder.parent_id ?? null, folder.created_at);
        return folder;
    });
    electron_1.ipcMain.handle('vault:deleteFolder', (_e, id) => {
        (0, database_1.getDb)().prepare('DELETE FROM vault_folders WHERE id = ?').run(id);
    });
    electron_1.ipcMain.handle('vault:listDocuments', (_e, folderId) => {
        const rows = folderId
            ? (0, database_1.getDb)().prepare('SELECT * FROM vault_documents WHERE folder_id = ? ORDER BY updated_at DESC').all(folderId)
            : (0, database_1.getDb)().prepare('SELECT * FROM vault_documents ORDER BY updated_at DESC').all();
        return rows.map(rowToDocument);
    });
    electron_1.ipcMain.handle('vault:getDocument', (_e, id) => {
        const row = (0, database_1.getDb)().prepare('SELECT * FROM vault_documents WHERE id = ?').get(id);
        if (!row)
            throw new Error(`Document ${id} not found`);
        return rowToDocument(row);
    });
    electron_1.ipcMain.handle('vault:createDocument', (_e, data) => {
        const doc = {
            id: (0, uuid_1.v4)(), title: data.title ?? 'Untitled', content: data.content ?? '',
            folder_id: data.folder_id, tags: data.tags ?? [],
            created_at: new Date().toISOString(), updated_at: new Date().toISOString(),
        };
        (0, database_1.getDb)().prepare(`
      INSERT INTO vault_documents (id, title, content, folder_id, tags, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `).run(doc.id, doc.title, doc.content, doc.folder_id ?? null, (0, database_1.toJson)(doc.tags), doc.created_at, doc.updated_at);
        return doc;
    });
    electron_1.ipcMain.handle('vault:updateDocument', (_e, id, data) => {
        const now = new Date().toISOString();
        (0, database_1.getDb)().prepare(`
      UPDATE vault_documents SET
        title = COALESCE(?, title), content = COALESCE(?, content),
        folder_id = COALESCE(?, folder_id), tags = COALESCE(?, tags), updated_at = ?
      WHERE id = ?
    `).run(data.title ?? null, data.content ?? null, data.folder_id ?? null, data.tags ? (0, database_1.toJson)(data.tags) : null, now, id);
        return rowToDocument((0, database_1.getDb)().prepare('SELECT * FROM vault_documents WHERE id = ?').get(id));
    });
    electron_1.ipcMain.handle('vault:deleteDocument', (_e, id) => {
        (0, database_1.getDb)().prepare('DELETE FROM vault_documents WHERE id = ?').run(id);
    });
    electron_1.ipcMain.handle('vault:search', (_e, query) => {
        const rows = (0, database_1.getDb)().prepare(`
      SELECT vd.* FROM vault_documents vd
      JOIN vault_fts ON vault_fts.rowid = vd.rowid
      WHERE vault_fts MATCH ? ORDER BY rank LIMIT 50
    `).all(query);
        return rows.map(rowToDocument);
    });
}
// ── Scheduled Tasks ───────────────────────────────────────────────────────────
function setupScheduledHandlers() {
    electron_1.ipcMain.handle('scheduled:list', () => {
        return (0, database_1.getDb)().prepare('SELECT * FROM scheduled_tasks ORDER BY created_at DESC').all().map(rowToScheduledTask);
    });
    electron_1.ipcMain.handle('scheduled:create', (_e, data) => {
        const task = {
            id: (0, uuid_1.v4)(),
            prompt: data.prompt ?? '',
            schedule_cron: data.schedule_cron ?? '0 9 * * *',
            project_path: data.project_path ?? process.env.HOME ?? '/',
            model: data.model ?? 'sonnet',
            enabled: true,
            created_at: new Date().toISOString(),
        };
        (0, database_1.getDb)().prepare(`
      INSERT INTO scheduled_tasks (id, prompt, schedule_cron, project_path, model, enabled, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `).run(task.id, task.prompt, task.schedule_cron, task.project_path, task.model, 1, task.created_at);
        return task;
    });
    electron_1.ipcMain.handle('scheduled:delete', (_e, id) => {
        (0, database_1.getDb)().prepare('DELETE FROM scheduled_tasks WHERE id = ?').run(id);
    });
    electron_1.ipcMain.handle('scheduled:toggle', (_e, id, enabled) => {
        (0, database_1.getDb)().prepare('UPDATE scheduled_tasks SET enabled = ? WHERE id = ?').run(enabled ? 1 : 0, id);
        return rowToScheduledTask((0, database_1.getDb)().prepare('SELECT * FROM scheduled_tasks WHERE id = ?').get(id));
    });
    electron_1.ipcMain.handle('scheduled:runNow', (_e, id) => {
        const task = rowToScheduledTask((0, database_1.getDb)().prepare('SELECT * FROM scheduled_tasks WHERE id = ?').get(id));
        const settings = getSettings();
        const agent = (0, agent_manager_1.createAgent)({ name: `Scheduled: ${task.id.slice(0, 8)}`, projectPath: task.project_path, model: task.model });
        (0, agent_manager_1.startAgent)(agent.id, task.prompt, task.model, settings, getMainWindow());
    });
}
// ── Automations ───────────────────────────────────────────────────────────────
function setupAutomationHandlers() {
    electron_1.ipcMain.handle('automations:list', () => {
        return (0, database_1.getDb)().prepare('SELECT * FROM automations ORDER BY created_at DESC').all().map(rowToAutomation);
    });
    electron_1.ipcMain.handle('automations:get', (_e, id) => {
        const row = (0, database_1.getDb)().prepare('SELECT * FROM automations WHERE id = ?').get(id);
        if (!row)
            throw new Error(`Automation ${id} not found`);
        return rowToAutomation(row);
    });
    electron_1.ipcMain.handle('automations:create', (_e, data) => {
        const auto = {
            id: (0, uuid_1.v4)(),
            name: data.name ?? 'Untitled Automation',
            source_type: data.source_type ?? 'github',
            source_config: data.source_config ?? {},
            schedule_minutes: data.schedule_minutes ?? 30,
            agent_prompt: data.agent_prompt ?? '',
            agent_project_path: data.agent_project_path,
            agent_model: data.agent_model ?? 'sonnet',
            output_github_comment: data.output_github_comment ?? false,
            output_slack: data.output_slack ?? false,
            output_telegram: data.output_telegram ?? false,
            enabled: true,
            created_at: new Date().toISOString(),
        };
        (0, database_1.getDb)().prepare(`
      INSERT INTO automations
        (id, name, source_type, source_config, schedule_minutes, agent_prompt,
         agent_project_path, agent_model, output_github_comment, output_slack, output_telegram, enabled, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(auto.id, auto.name, auto.source_type, (0, database_1.toJson)(auto.source_config), auto.schedule_minutes, auto.agent_prompt, auto.agent_project_path ?? null, auto.agent_model, auto.output_github_comment ? 1 : 0, auto.output_slack ? 1 : 0, auto.output_telegram ? 1 : 0, 1, auto.created_at);
        return auto;
    });
    electron_1.ipcMain.handle('automations:update', (_e, id, data) => {
        const now = new Date().toISOString();
        (0, database_1.getDb)().prepare(`
      UPDATE automations SET
        name = COALESCE(?, name), source_config = COALESCE(?, source_config),
        schedule_minutes = COALESCE(?, schedule_minutes), agent_prompt = COALESCE(?, agent_prompt),
        agent_project_path = COALESCE(?, agent_project_path), agent_model = COALESCE(?, agent_model),
        output_github_comment = COALESCE(?, output_github_comment),
        output_slack = COALESCE(?, output_slack), output_telegram = COALESCE(?, output_telegram)
      WHERE id = ?
    `).run(data.name ?? null, data.source_config ? (0, database_1.toJson)(data.source_config) : null, data.schedule_minutes ?? null, data.agent_prompt ?? null, data.agent_project_path ?? null, data.agent_model ?? null, data.output_github_comment != null ? (data.output_github_comment ? 1 : 0) : null, data.output_slack != null ? (data.output_slack ? 1 : 0) : null, data.output_telegram != null ? (data.output_telegram ? 1 : 0) : null, id);
        return rowToAutomation((0, database_1.getDb)().prepare('SELECT * FROM automations WHERE id = ?').get(id));
    });
    electron_1.ipcMain.handle('automations:delete', (_e, id) => {
        (0, database_1.getDb)().prepare('DELETE FROM automations WHERE id = ?').run(id);
    });
    electron_1.ipcMain.handle('automations:toggle', (_e, id, enabled) => {
        (0, database_1.getDb)().prepare('UPDATE automations SET enabled = ? WHERE id = ?').run(enabled ? 1 : 0, id);
        return rowToAutomation((0, database_1.getDb)().prepare('SELECT * FROM automations WHERE id = ?').get(id));
    });
    electron_1.ipcMain.handle('automations:runNow', (_e, id) => {
        // Trigger the automation service to run immediately
        getMainWindow()?.webContents.send('automation:trigger', { id });
    });
    electron_1.ipcMain.handle('automations:getLogs', (_e, id, limit = 10) => {
        const rows = (0, database_1.getDb)()
            .prepare('SELECT * FROM automation_runs WHERE automation_id = ? ORDER BY created_at DESC LIMIT ?')
            .all(id, limit);
        return rows.map(rowToAutomationRun);
    });
}
// ── Settings ──────────────────────────────────────────────────────────────────
function setupSettingsHandlers() {
    electron_1.ipcMain.handle('settings:get', () => getSettings());
    electron_1.ipcMain.handle('settings:update', (_e, data) => {
        (0, database_1.getDb)().prepare(`
      UPDATE settings SET
        claude_path        = COALESCE(?, claude_path),
        default_model      = COALESCE(?, default_model),
        telegram_token     = COALESCE(?, telegram_token),
        telegram_chat_ids  = COALESCE(?, telegram_chat_ids),
        slack_bot_token    = COALESCE(?, slack_bot_token),
        slack_app_token    = COALESCE(?, slack_app_token),
        slack_enabled      = COALESCE(?, slack_enabled),
        telegram_enabled   = COALESCE(?, telegram_enabled),
        notify_on_complete = COALESCE(?, notify_on_complete),
        notify_on_error    = COALESCE(?, notify_on_error),
        notify_on_waiting  = COALESCE(?, notify_on_waiting),
        skip_permissions   = COALESCE(?, skip_permissions)
      WHERE id = 1
    `).run(data.claudePath ?? null, data.defaultModel ?? null, data.telegramToken ?? null, data.telegramChatIds ? (0, database_1.toJson)(data.telegramChatIds) : null, data.slackBotToken ?? null, data.slackAppToken ?? null, data.slackEnabled != null ? (data.slackEnabled ? 1 : 0) : null, data.telegramEnabled != null ? (data.telegramEnabled ? 1 : 0) : null, data.notifyOnComplete != null ? (data.notifyOnComplete ? 1 : 0) : null, data.notifyOnError != null ? (data.notifyOnError ? 1 : 0) : null, data.notifyOnWaiting != null ? (data.notifyOnWaiting ? 1 : 0) : null, data.skipPermissions != null ? (data.skipPermissions ? 1 : 0) : null);
        return getSettings();
    });
}
// ── Sessions ──────────────────────────────────────────────────────────────────
function setupSessionsHandlers() {
    electron_1.ipcMain.handle('sessions:list', () => (0, session_reader_1.listSessions)());
    electron_1.ipcMain.handle('sessions:read', (_e, filePath) => (0, session_reader_1.readSession)(filePath));
    electron_1.ipcMain.handle('sessions:delete', (_e, filePath) => (0, session_reader_1.deleteSession)(filePath));
    electron_1.ipcMain.handle('sessions:resume', (_e, agentId, sessionId) => {
        // Need to start agent with --resume <sessionId>
        // This requires passing the logic to agentManager or doing it from the UI.
        // For now we'll just proxy the args when startAgent is improved or we can send input.
        // The UI should handle recreating agent with correct resume param.
    });
}
// ── Skills ────────────────────────────────────────────────────────────────────
function setupSkillsHandlers() {
    const { listSkills, readSkill, writeSkill, deleteSkill } = require('../services/skills-manager');
    electron_1.ipcMain.handle('skills:list', (_e, projectPath) => listSkills(projectPath));
    electron_1.ipcMain.handle('skills:get', (_e, name, scope, projectPath) => readSkill(name, scope, projectPath));
    electron_1.ipcMain.handle('skills:create', (_e, name, content, scope, projectPath) => writeSkill(name, content, scope, projectPath));
    electron_1.ipcMain.handle('skills:update', (_e, name, content, scope, projectPath) => writeSkill(name, content, scope, projectPath));
    electron_1.ipcMain.handle('skills:delete', (_e, name, scope, projectPath) => deleteSkill(name, scope, projectPath));
}
// ── Memory ────────────────────────────────────────────────────────────────────
function setupMemoryHandlers() {
    const { listMemoryFiles, readMemoryFile, writeMemoryFile, deleteMemoryFile } = require('../services/memory-manager');
    electron_1.ipcMain.handle('memory:list', (_e, projectPaths) => listMemoryFiles(projectPaths));
    electron_1.ipcMain.handle('memory:read', (_e, filePath) => readMemoryFile(filePath));
    electron_1.ipcMain.handle('memory:write', (_e, filePath, content) => writeMemoryFile(filePath, content));
    electron_1.ipcMain.handle('memory:delete', (_e, filePath) => deleteMemoryFile(filePath));
}
// ── Usage ─────────────────────────────────────────────────────────────────────
function setupUsageHandlers() {
    electron_1.ipcMain.handle('usage:summary', () => {
        const today = new Date().toISOString().slice(0, 10);
        const total = (0, database_1.getDb)().prepare(`
      SELECT SUM(input_tokens) as input, SUM(output_tokens) as output, COUNT(*) as runs
      FROM agent_runs
    `).get();
        const todayStats = (0, database_1.getDb)().prepare(`
      SELECT SUM(input_tokens) as input, SUM(output_tokens) as output
      FROM agent_runs WHERE date(created_at) = ?
    `).get(today);
        return {
            total_input_tokens: total.input ?? 0,
            total_output_tokens: total.output ?? 0,
            total_runs: total.runs ?? 0,
            today_input_tokens: todayStats.input ?? 0,
            today_output_tokens: todayStats.output ?? 0,
        };
    });
    electron_1.ipcMain.handle('usage:byAgent', () => {
        return (0, database_1.getDb)().prepare(`
      SELECT agent_type, SUM(input_tokens) as total_input_tokens,
        SUM(output_tokens) as total_output_tokens, COUNT(*) as run_count
      FROM agent_runs GROUP BY agent_type ORDER BY total_input_tokens DESC
    `).all();
    });
    electron_1.ipcMain.handle('usage:byProject', () => {
        return (0, database_1.getDb)().prepare(`
      SELECT t.project_id, p.name as project_name,
        SUM(ar.input_tokens) as total_input_tokens,
        SUM(ar.output_tokens) as total_output_tokens, COUNT(ar.id) as run_count
      FROM agent_runs ar
      JOIN tasks t ON ar.task_id = t.id
      LEFT JOIN projects p ON t.project_id = p.id
      GROUP BY t.project_id ORDER BY total_input_tokens DESC
    `).all();
    });
}
// ── Row mappers ───────────────────────────────────────────────────────────────
function rowToProject(row) {
    return {
        id: row.id,
        name: row.name,
        description: row.description,
        local_path: row.local_path || '',
        coding_guidelines: row.coding_guidelines,
        created_at: row.created_at,
        updated_at: row.updated_at,
    };
}
function rowToTask(row) {
    const issueUrl = row.github_issue_url;
    const prUrl = row.github_pr_url;
    return {
        id: row.id,
        title: row.title,
        description: row.description,
        status: row.status,
        priority: row.priority,
        project_id: row.project_id,
        acceptance_criteria: row.acceptance_criteria,
        deadline: row.deadline,
        github_repo: row.github_repo,
        github_issue_url: issueUrl,
        github_pr_url: prUrl,
        deployment_url: row.deployment_url,
        profile_id: row.profile_id,
        branch_name: row.branch_name,
        turn_count: row.turn_count || 0,
        input_tokens: row.input_tokens || 0,
        output_tokens: row.output_tokens || 0,
        elapsed_seconds: row.elapsed_seconds || 0,
        queued_at: row.queued_at,
        started_at: row.started_at,
        completed_at: row.completed_at,
        created_at: row.created_at,
        updated_at: row.updated_at,
        // Legacy compat
        approved: row.status === 'APPROVED',
        github_issue_id: issueUrl ? issueUrl.split('/').pop() : undefined,
        github_pr_id: prUrl ? prUrl.split('/').pop() : undefined,
        email_sent: false,
        pr_reviewed: false,
    };
}
function rowToAgentRun(row) {
    return {
        id: row.id,
        task_id: row.task_id,
        agent_type: row.agent_type,
        agent_name: row.agent_type, // legacy alias
        error_message: row.error ?? undefined, // legacy alias
        started_at: row.created_at, // legacy alias
        completed_at: row.updated_at, // legacy alias
        status: row.status,
        input: (0, database_1.parseJson)(row.input, undefined),
        output: (0, database_1.parseJson)(row.output, undefined),
        error: row.error,
        input_tokens: row.input_tokens,
        output_tokens: row.output_tokens,
        created_at: row.created_at,
        updated_at: row.updated_at,
    };
}
function rowToAgentRunStep(row) {
    return {
        id: row.id,
        run_id: row.run_id,
        step_number: row.step_number,
        thought: row.thought,
        tool_called: row.tool_called,
        tool_input: (0, database_1.parseJson)(row.tool_input, undefined),
        tool_output: row.tool_output,
        input_tokens: row.input_tokens,
        output_tokens: row.output_tokens,
        created_at: row.created_at,
    };
}
function rowToKanbanTask(row) {
    return {
        id: row.id,
        title: row.title,
        description: row.description,
        column: row.column_name,
        priority: row.priority,
        progress: row.progress,
        labels: (0, database_1.parseJson)(row.labels, []),
        skill_requirements: (0, database_1.parseJson)(row.skill_requirements, []),
        assigned_agent_id: row.assigned_agent_id,
        project_path: row.project_path,
        created_at: row.created_at,
        updated_at: row.updated_at,
    };
}
function rowToFolder(row) {
    return {
        id: row.id,
        name: row.name,
        parent_id: row.parent_id,
        created_at: row.created_at,
    };
}
function rowToDocument(row) {
    return {
        id: row.id,
        title: row.title,
        content: row.content,
        folder_id: row.folder_id,
        tags: (0, database_1.parseJson)(row.tags, []),
        created_at: row.created_at,
        updated_at: row.updated_at,
    };
}
function rowToScheduledTask(row) {
    return {
        id: row.id,
        prompt: row.prompt,
        schedule_cron: row.schedule_cron,
        project_path: row.project_path,
        model: row.model,
        enabled: Boolean(row.enabled),
        last_run: row.last_run,
        last_output: row.last_output,
        created_at: row.created_at,
    };
}
function rowToAutomation(row) {
    return {
        id: row.id,
        name: row.name,
        source_type: row.source_type,
        source_config: (0, database_1.parseJson)(row.source_config, {}),
        schedule_minutes: row.schedule_minutes,
        agent_prompt: row.agent_prompt,
        agent_project_path: row.agent_project_path,
        agent_model: row.agent_model,
        output_github_comment: Boolean(row.output_github_comment),
        output_slack: Boolean(row.output_slack),
        output_telegram: Boolean(row.output_telegram),
        enabled: Boolean(row.enabled),
        last_run: row.last_run,
        created_at: row.created_at,
    };
}
function rowToAutomationRun(row) {
    return {
        id: row.id,
        automation_id: row.automation_id,
        status: row.status,
        items_processed: row.items_processed,
        output: row.output,
        created_at: row.created_at,
    };
}
function rowToSettings(row) {
    return {
        claudePath: row.claude_path || 'claude',
        defaultModel: row.default_model || 'sonnet',
        telegramToken: row.telegram_token,
        telegramChatIds: (0, database_1.parseJson)(row.telegram_chat_ids, []),
        slackBotToken: row.slack_bot_token,
        slackAppToken: row.slack_app_token,
        slackEnabled: Boolean(row.slack_enabled),
        telegramEnabled: Boolean(row.telegram_enabled),
        notifyOnComplete: Boolean(row.notify_on_complete),
        notifyOnError: Boolean(row.notify_on_error),
        notifyOnWaiting: Boolean(row.notify_on_waiting),
        skipPermissions: Boolean(row.skip_permissions),
    };
}
// ── Task helpers ──────────────────────────────────────────────────────────────
function insertTask(task) {
    (0, database_1.getDb)().prepare(`
    INSERT INTO tasks
      (id, title, description, status, priority, project_id, acceptance_criteria,
       deadline, github_repo, profile_id, branch_name, turn_count, input_tokens, output_tokens,
       elapsed_seconds, queued_at, started_at, completed_at, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(task.id, task.title, task.description, task.status, task.priority, task.project_id ?? null, task.acceptance_criteria ?? null, task.deadline ?? null, task.github_repo ?? null, task.profile_id ?? null, task.branch_name ?? null, task.turn_count, task.input_tokens, task.output_tokens, task.elapsed_seconds, task.queued_at ?? null, task.started_at ?? null, task.completed_at ?? null, task.created_at, task.updated_at);
}
function updateTaskFields(id, data) {
    (0, database_1.getDb)().prepare(`
    UPDATE tasks SET
      title               = COALESCE(?, title),
      description         = COALESCE(?, description),
      status              = COALESCE(?, status),
      priority            = COALESCE(?, priority),
      acceptance_criteria = COALESCE(?, acceptance_criteria),
      deadline            = COALESCE(?, deadline),
      github_repo         = COALESCE(?, github_repo),
      github_issue_url    = COALESCE(?, github_issue_url),
      github_pr_url       = COALESCE(?, github_pr_url),
      deployment_url      = COALESCE(?, deployment_url),
      profile_id          = COALESCE(?, profile_id),
      branch_name         = COALESCE(?, branch_name),
      turn_count          = COALESCE(?, turn_count),
      input_tokens        = COALESCE(?, input_tokens),
      output_tokens       = COALESCE(?, output_tokens),
      elapsed_seconds     = COALESCE(?, elapsed_seconds),
      queued_at           = COALESCE(?, queued_at),
      started_at          = COALESCE(?, started_at),
      completed_at        = COALESCE(?, completed_at),
      updated_at          = datetime('now')
    WHERE id = ?
  `).run(data.title ?? null, data.description ?? null, data.status ?? null, data.priority ?? null, data.acceptance_criteria ?? null, data.deadline ?? null, data.github_repo ?? null, data.github_issue_url ?? null, data.github_pr_url ?? null, data.deployment_url ?? null, data.profile_id ?? null, data.branch_name ?? null, data.turn_count ?? null, data.input_tokens ?? null, data.output_tokens ?? null, data.elapsed_seconds ?? null, data.queued_at ?? null, data.started_at ?? null, data.completed_at ?? null, id);
}
// ── Settings Sub-managers ───────────────────────────────────────────────────
function setupHooksHandlers() {
    electron_1.ipcMain.handle('hooks:list', (_e, scope, projectPath) => {
        return (0, hooks_manager_1.readHooks)(scope, projectPath);
    });
    electron_1.ipcMain.handle('hooks:update', (_e, hooks, scope, projectPath) => {
        (0, hooks_manager_1.writeHooks)(hooks, scope, projectPath);
    });
}
function setupMcpHandlers() {
    electron_1.ipcMain.handle('mcp:list', (_e, scope, projectPath) => {
        return (0, mcp_manager_1.readMcpServers)(scope, projectPath);
    });
    electron_1.ipcMain.handle('mcp:save', (_e, name, config, scope, projectPath) => {
        (0, mcp_manager_1.writeMcpServer)(name, config, scope, projectPath);
    });
    electron_1.ipcMain.handle('mcp:delete', (_e, name, scope, projectPath) => {
        (0, mcp_manager_1.deleteMcpServer)(name, scope, projectPath);
    });
}
function setupEnvHandlers() {
    electron_1.ipcMain.handle('env:list', () => (0, env_manager_1.listEnvVars)());
    electron_1.ipcMain.handle('env:save', (_e, key, value) => (0, env_manager_1.writeEnvVar)(key, value));
    electron_1.ipcMain.handle('env:delete', (_e, key) => (0, env_manager_1.deleteEnvVar)(key));
}
function setupUtilHandlers() {
    electron_1.ipcMain.handle('utils:selectDirectory', async () => {
        const result = await electron_1.dialog.showOpenDialog(getMainWindow(), {
            properties: ['openDirectory'],
        });
        if (result.canceled)
            return null;
        return result.filePaths[0];
    });
}
//# sourceMappingURL=ipc-handlers.js.map