import { ipcMain, BrowserWindow, dialog } from 'electron';
import { v4 as uuidv4 } from 'uuid';
import { getDb, parseJson, toJson } from '../db/database';
import {
  createAgent, listAgents, getAgent, removeAgent,
  startAgent, stopAgent, lastPermissionMsg,
} from '../core/agent-manager';
import { writeToPty } from '../core/pty-manager';
import type {
  Task, Project, AgentRun, AgentRunStep, KanbanTask, KanbanColumn,
  VaultFolder, VaultDocument, ScheduledTask, Automation, AutomationRun,
  AppSettings, AgentProfile,
} from '../types';
import { readHooks, writeHooks } from '../services/hooks-manager';
import { readMcpServers, writeMcpServer, deleteMcpServer } from '../services/mcp-manager';
import { listEnvVars, writeEnvVar, deleteEnvVar } from '../services/env-manager';
import { listSessions, readSession, deleteSession } from '../services/session-reader';

function getMainWindow(): BrowserWindow | null {
  return BrowserWindow.getAllWindows()[0] ?? null;
}

function getSettings(): AppSettings {
  const row = getDb().prepare('SELECT * FROM settings WHERE id = 1').get() as Record<string, unknown>;
  return rowToSettings(row);
}

export function setupIpcHandlers(): void {
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

  ipcMain.handle('agentProfiles:list', () => listProfiles());
  ipcMain.handle('agentProfiles:get', (_e, id: string) => getProfile(id));
  ipcMain.handle('agentProfiles:create', (_e, data: Partial<AgentProfile>) => createProfile(data));
  ipcMain.handle('agentProfiles:update', (_e, id: string, data: Partial<AgentProfile>) => updateProfile(id, data));
  ipcMain.handle('agentProfiles:delete', (_e, id: string) => deleteProfile(id));
}

// ── Projects ─────────────────────────────────────────────────────────────────

function setupProjectHandlers() {
  ipcMain.handle('projects:list', () => {
    return (getDb().prepare('SELECT * FROM projects ORDER BY created_at DESC').all() as Record<string, unknown>[])
      .map(rowToProject);
  });

  ipcMain.handle('projects:get', (_e, id: string) => {
    const row = getDb().prepare('SELECT * FROM projects WHERE id = ?').get(id);
    if (!row) throw new Error(`Project ${id} not found`);
    return rowToProject(row as Record<string, unknown>);
  });

  ipcMain.handle('projects:create', (_e, data: Partial<Project>) => {
    const project: Project = {
      id: uuidv4(),
      name: data.name ?? 'Untitled Project',
      description: data.description,
      local_path: data.local_path ?? '',
      coding_guidelines: data.coding_guidelines,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
    getDb().prepare(`
      INSERT INTO projects (id, name, description, local_path, coding_guidelines, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `).run(project.id, project.name, project.description ?? null,
      project.local_path, project.coding_guidelines ?? null,
      project.created_at, project.updated_at);
    return project;
  });

  ipcMain.handle('projects:update', (_e, id: string, data: Partial<Project>) => {
    const now = new Date().toISOString();
    getDb().prepare(`
      UPDATE projects SET
        name = COALESCE(?, name),
        description = COALESCE(?, description),
        local_path = COALESCE(?, local_path),
        coding_guidelines = COALESCE(?, coding_guidelines),
        updated_at = ?
      WHERE id = ?
    `).run(
      data.name ?? null, data.description ?? null,
      data.local_path ?? null, data.coding_guidelines ?? null,
      now, id
    );
    const row = getDb().prepare('SELECT * FROM projects WHERE id = ?').get(id);
    return rowToProject(row as Record<string, unknown>);
  });

  ipcMain.handle('projects:delete', (_e, id: string) => {
    getDb().prepare('DELETE FROM projects WHERE id = ?').run(id);
  });
}

// ── Tasks ─────────────────────────────────────────────────────────────────────

function setupTaskHandlers() {
  ipcMain.handle('tasks:list', (_e, projectId?: string) => {
    const rows = projectId
      ? getDb().prepare('SELECT * FROM tasks WHERE project_id = ? ORDER BY created_at DESC').all(projectId)
      : getDb().prepare('SELECT * FROM tasks ORDER BY created_at DESC').all();
    return (rows as Record<string, unknown>[]).map(rowToTask);
  });

  ipcMain.handle('tasks:get', (_e, id: string) => {
    const row = getDb().prepare('SELECT * FROM tasks WHERE id = ?').get(id);
    if (!row) throw new Error(`Task ${id} not found`);
    return rowToTask(row as Record<string, unknown>);
  });

  ipcMain.handle('tasks:create', (_e, data: Partial<Task>) => {
    const task: Task = {
      id: uuidv4(),
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

  ipcMain.handle('tasks:update', (_e, id: string, data: Partial<Task>) => {
    updateTaskFields(id, data);
    return rowToTask(getDb().prepare('SELECT * FROM tasks WHERE id = ?').get(id) as Record<string, unknown>);
  });

  ipcMain.handle('tasks:approve', (_e, id: string, edits?: Partial<Task>) => {
    updateTaskFields(id, { ...edits, status: 'APPROVED' });
    return rowToTask(getDb().prepare('SELECT * FROM tasks WHERE id = ?').get(id) as Record<string, unknown>);
  });

  ipcMain.handle('tasks:reject', (_e, id: string) => {
    updateTaskFields(id, { status: 'REJECTED' });
    return rowToTask(getDb().prepare('SELECT * FROM tasks WHERE id = ?').get(id) as Record<string, unknown>);
  });

  ipcMain.handle('tasks:delete', (_e, id: string) => {
    getDb().prepare('DELETE FROM tasks WHERE id = ?').run(id);
  });

  ipcMain.handle('tasks:execute', (_e, taskId: string) => {
    // Create an agent run record and start a Claude agent for this task
    const task = rowToTask(getDb().prepare('SELECT * FROM tasks WHERE id = ?').get(taskId) as Record<string, unknown>);

    // Fetch Project Path
    let projectPath = process.env.HOME ?? '/';
    if (task.project_id) {
      const project = getDb().prepare('SELECT * FROM projects WHERE id = ?').get(task.project_id) as any;
      if (project?.local_path) {
        projectPath = project.local_path;
      }
    }

    // Fetch Profile
    const { getProfile, listProfiles } = require('../services/agent-profiles');
    let profile: AgentProfile | null = null;
    if (task.profile_id) {
      profile = getProfile(task.profile_id);
    } else {
      // Find default profile
      const profiles = listProfiles();
      profile = profiles.find((p: any) => p.is_default) || profiles[0] || null;
    }

    const run: AgentRun = {
      id: uuidv4(),
      task_id: taskId,
      agent_type: 'CodeAgent',
      status: 'RUNNING',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
    getDb().prepare(`
      INSERT INTO agent_runs (id, task_id, agent_type, status, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?)
    `).run(run.id, run.task_id, run.agent_type, run.status, run.created_at, run.updated_at);

    updateTaskFields(taskId, { status: 'IN_PROGRESS' });

    const settings = getSettings();
    const agent = createAgent({
      name: `Task: ${task.title.slice(0, 30)}`,
      taskId: taskId,
      runId: run.id,
      projectPath: projectPath,
      model: profile?.model || settings.defaultModel,
      skills: profile?.skills || [],
      systemPrompt: profile?.system_prompt,
      skipPermissions: profile?.skip_permissions || settings.skipPermissions,
    });

    startAgent(agent.id, task.description, agent.model, settings, getMainWindow());

    return run;
  });

  ipcMain.handle('tasks:getGitDiff', async (_e, taskId: string) => {
    const task = rowToTask(getDb().prepare('SELECT * FROM tasks WHERE id = ?').get(taskId) as Record<string, unknown>);
    if (!task.project_id) throw new Error("Task has no associated project");

    // Get project path
    const project = getDb().prepare('SELECT * FROM projects WHERE id = ?').get(task.project_id) as any;
    const projectPath = project?.local_path || null;
    if (!projectPath) throw new Error("Could not determine project path");

    const { execSync } = require('node:child_process');
    try {
      // Get list of changed files
      const statusOutput = execSync('git status --short', { cwd: projectPath, encoding: 'utf8' }) as string;
      const changedFiles = statusOutput.split('\n').filter(Boolean).map((line: string) => line.slice(3).trim());

      const diffs = changedFiles.map((file: string) => {
        try {
          // Get diff for each file
          const diffResult = execSync(`git diff HEAD -- "${file}"`, { cwd: projectPath, encoding: 'utf8' });

          // Get original content (oldValue) and new content (newValue)
          // oldValue from HEAD
          let oldValue = '';
          try {
            oldValue = execSync(`git show HEAD:"${file}"`, { cwd: projectPath, encoding: 'utf8' });
          } catch {
            // File might be new
          }

          const fs = require('node:fs');
          const path = require('node:path');
          let newValue = '';
          try {
            newValue = fs.readFileSync(path.join(projectPath, file), 'utf8');
          } catch {
            // File might be deleted
          }

          return { file, diff: diffResult, oldValue, newValue };
        } catch (e) {
          return { file, diff: '', oldValue: '', newValue: '', error: String(e) };
        }
      });

      return diffs;
    } catch (err: any) {
      throw new Error(`Failed to get git diff: ${err.message}`);
    }
  });

  ipcMain.handle('tasks:commit', async (_e, taskId: string, message: string) => {
    const task = rowToTask(getDb().prepare('SELECT * FROM tasks WHERE id = ?').get(taskId) as Record<string, unknown>);
    if (!task.project_id) throw new Error("Task has no associated project");

    const project = getDb().prepare('SELECT * FROM projects WHERE id = ?').get(task.project_id) as any;
    const projectPath = project?.local_path || null;
    if (!projectPath) throw new Error("Could not determine project path");

    const { execSync } = require('node:child_process');
    try {
      execSync(`git add . && git commit -m ${JSON.stringify(message)}`, { cwd: projectPath });
      updateTaskFields(taskId, { status: 'DONE' });
      return { success: true };
    } catch (err: any) {
      throw new Error(`Failed to commit changes: ${err.message}`);
    }
  });

  ipcMain.handle('tasks:discard', async (_e, taskId: string) => {
    const task = rowToTask(getDb().prepare('SELECT * FROM tasks WHERE id = ?').get(taskId) as Record<string, unknown>);
    if (!task.project_id) throw new Error("Task has no associated project");

    const project = getDb().prepare('SELECT * FROM projects WHERE id = ?').get(task.project_id) as any;
    const projectPath = project?.local_path || null;
    if (!projectPath) throw new Error("Could not determine project path");

    const { execSync } = require('node:child_process');
    try {
      execSync('git reset --hard HEAD && git clean -fd', { cwd: projectPath });
      updateTaskFields(taskId, { status: 'APPROVED' });
      return { success: true };
    } catch (err: any) {
      throw new Error(`Failed to discard changes: ${err.message}`);
    }
  });

  ipcMain.handle('tasks:extract', (_e, transcript: string, projectId?: string) => {
    // Spawn Claude to extract tasks from a transcript
    const settings = getSettings();
    const prompt = `Extract actionable tasks from this meeting transcript. For each task output JSON with fields: title, description, priority (LOW/MEDIUM/HIGH/CRITICAL), acceptance_criteria. Return a JSON array.\n\nTranscript:\n${transcript}`;

    return new Promise<Task[]>((resolve, reject) => {
      // Simple one-shot execution
      const { execSync } = require('node:child_process');
      try {
        const executable = settings.claudePath || 'claude';
        const result = execSync(
          `${executable} --print -p ${JSON.stringify(prompt)}`,
          { encoding: 'utf8', timeout: 60000 }
        );
        const match = result.match(/\[[\s\S]*\]/);
        if (!match) return resolve([]);
        const extracted = JSON.parse(match[0]) as Array<{
          title: string;
          description: string;
          priority: string;
          acceptance_criteria: string;
        }>;
        const tasks = extracted.map(t => {
          const task: Task = {
            id: uuidv4(),
            title: t.title,
            description: t.description,
            status: 'PENDING',
            priority: (t.priority as Task['priority']) ?? 'MEDIUM',
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
      } catch (err: any) {
        if (err.message && (err.message.includes('command not found') || err.message.includes('ENOENT'))) {
          reject(new Error('Claude CLI not found. Please configure Claude path in Settings.'));
        } else {
          reject(err);
        }
      }
    });
  });
}

// ── Agent Runs ───────────────────────────────────────────────────────────────

function setupAgentRunHandlers() {
  ipcMain.handle('agentRuns:list', (_e, taskId?: string) => {
    const rows = taskId
      ? getDb().prepare('SELECT * FROM agent_runs WHERE task_id = ? ORDER BY created_at DESC').all(taskId)
      : getDb().prepare('SELECT * FROM agent_runs ORDER BY created_at DESC LIMIT 100').all();
    return (rows as Record<string, unknown>[]).map(rowToAgentRun);
  });

  ipcMain.handle('agentRuns:getSteps', (_e, runId: string) => {
    const rows = getDb()
      .prepare('SELECT * FROM agent_run_steps WHERE run_id = ? ORDER BY step_number ASC')
      .all(runId);
    return (rows as Record<string, unknown>[]).map(rowToAgentRunStep);
  });
}

// ── Agents ───────────────────────────────────────────────────────────────────

function setupAgentHandlers() {
  ipcMain.handle('agents:list', () => listAgents());

  ipcMain.handle('agents:get', (_e, id: string) => {
    const agent = getAgent(id);
    if (!agent) throw new Error(`Agent ${id} not found`);
    return agent;
  });

  ipcMain.handle('agents:create', (_e, data) => createAgent(data));

  ipcMain.handle('agents:start', (_e, id: string, prompt: string, model?: string) => {
    const settings = getSettings();
    startAgent(id, prompt, model ?? settings.defaultModel, settings, getMainWindow());
  });

  ipcMain.handle('agents:stop', (_e, id: string) => {
    stopAgent(id, getMainWindow());
  });

  ipcMain.handle('agents:remove', (_e, id: string) => removeAgent(id));

  ipcMain.handle('agents:sendInput', (_e, id: string, input: string) => {
    writeToPty(id, input);
    // Clear permission de-dup cache so the next prompt fires a new notification
    lastPermissionMsg.delete(id);
  });

  ipcMain.handle('agents:getOutput', (_e, id: string, lines?: number) => {
    const agent = getAgent(id);
    if (!agent) return [];
    const buf = agent.outputBuffer;
    return lines ? buf.slice(-lines) : buf;
  });
}

// ── Kanban ───────────────────────────────────────────────────────────────────

function setupKanbanHandlers() {
  ipcMain.handle('kanban:list', (_e, column?: string) => {
    const rows = column
      ? getDb().prepare('SELECT * FROM kanban_tasks WHERE column_name = ? ORDER BY created_at DESC').all(column)
      : getDb().prepare('SELECT * FROM kanban_tasks ORDER BY created_at DESC').all();
    return (rows as Record<string, unknown>[]).map(rowToKanbanTask);
  });

  ipcMain.handle('kanban:create', (_e, data: Partial<KanbanTask>) => {
    const task: KanbanTask = {
      id: uuidv4(),
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
    getDb().prepare(`
      INSERT INTO kanban_tasks
        (id, title, description, column_name, priority, progress, labels, skill_requirements, project_path, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(task.id, task.title, task.description ?? null, task.column, task.priority,
      task.progress, toJson(task.labels), toJson(task.skill_requirements),
      task.project_path ?? null, task.created_at, task.updated_at);
    return task;
  });

  ipcMain.handle('kanban:move', (_e, taskId: string, column: KanbanColumn) => {
    const now = new Date().toISOString();
    getDb().prepare(`UPDATE kanban_tasks SET column_name = ?, updated_at = ? WHERE id = ?`).run(column, now, taskId);
    return rowToKanbanTask(getDb().prepare('SELECT * FROM kanban_tasks WHERE id = ?').get(taskId) as Record<string, unknown>);
  });

  ipcMain.handle('kanban:update', (_e, taskId: string, data: Partial<KanbanTask>) => {
    const now = new Date().toISOString();
    getDb().prepare(`
      UPDATE kanban_tasks SET
        title = COALESCE(?, title),
        description = COALESCE(?, description),
        priority = COALESCE(?, priority),
        progress = COALESCE(?, progress),
        labels = COALESCE(?, labels),
        skill_requirements = COALESCE(?, skill_requirements),
        updated_at = ?
      WHERE id = ?
    `).run(
      data.title ?? null, data.description ?? null, data.priority ?? null,
      data.progress ?? null, data.labels ? toJson(data.labels) : null,
      data.skill_requirements ? toJson(data.skill_requirements) : null,
      now, taskId
    );
    return rowToKanbanTask(getDb().prepare('SELECT * FROM kanban_tasks WHERE id = ?').get(taskId) as Record<string, unknown>);
  });

  ipcMain.handle('kanban:assign', (_e, taskId: string, agentId?: string) => {
    const now = new Date().toISOString();
    getDb().prepare(`UPDATE kanban_tasks SET assigned_agent_id = ?, updated_at = ? WHERE id = ?`).run(agentId ?? null, now, taskId);
    return rowToKanbanTask(getDb().prepare('SELECT * FROM kanban_tasks WHERE id = ?').get(taskId) as Record<string, unknown>);
  });

  ipcMain.handle('kanban:delete', (_e, taskId: string) => {
    getDb().prepare('DELETE FROM kanban_tasks WHERE id = ?').run(taskId);
  });
}

// ── Vault ─────────────────────────────────────────────────────────────────────

function setupVaultHandlers() {
  ipcMain.handle('vault:listFolders', () => {
    return (getDb().prepare('SELECT * FROM vault_folders ORDER BY name').all() as Record<string, unknown>[]).map(rowToFolder);
  });

  ipcMain.handle('vault:createFolder', (_e, name: string, parentId?: string) => {
    const folder: VaultFolder = {
      id: uuidv4(), name, parent_id: parentId,
      created_at: new Date().toISOString(),
    };
    getDb().prepare('INSERT INTO vault_folders (id, name, parent_id, created_at) VALUES (?, ?, ?, ?)').run(folder.id, folder.name, folder.parent_id ?? null, folder.created_at);
    return folder;
  });

  ipcMain.handle('vault:deleteFolder', (_e, id: string) => {
    getDb().prepare('DELETE FROM vault_folders WHERE id = ?').run(id);
  });

  ipcMain.handle('vault:listDocuments', (_e, folderId?: string) => {
    const rows = folderId
      ? getDb().prepare('SELECT * FROM vault_documents WHERE folder_id = ? ORDER BY updated_at DESC').all(folderId)
      : getDb().prepare('SELECT * FROM vault_documents ORDER BY updated_at DESC').all();
    return (rows as Record<string, unknown>[]).map(rowToDocument);
  });

  ipcMain.handle('vault:getDocument', (_e, id: string) => {
    const row = getDb().prepare('SELECT * FROM vault_documents WHERE id = ?').get(id);
    if (!row) throw new Error(`Document ${id} not found`);
    return rowToDocument(row as Record<string, unknown>);
  });

  ipcMain.handle('vault:createDocument', (_e, data: Partial<VaultDocument>) => {
    const doc: VaultDocument = {
      id: uuidv4(), title: data.title ?? 'Untitled', content: data.content ?? '',
      folder_id: data.folder_id, tags: data.tags ?? [],
      created_at: new Date().toISOString(), updated_at: new Date().toISOString(),
    };
    getDb().prepare(`
      INSERT INTO vault_documents (id, title, content, folder_id, tags, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `).run(doc.id, doc.title, doc.content, doc.folder_id ?? null, toJson(doc.tags), doc.created_at, doc.updated_at);
    return doc;
  });

  ipcMain.handle('vault:updateDocument', (_e, id: string, data: Partial<VaultDocument>) => {
    const now = new Date().toISOString();
    getDb().prepare(`
      UPDATE vault_documents SET
        title = COALESCE(?, title), content = COALESCE(?, content),
        folder_id = COALESCE(?, folder_id), tags = COALESCE(?, tags), updated_at = ?
      WHERE id = ?
    `).run(data.title ?? null, data.content ?? null, data.folder_id ?? null,
      data.tags ? toJson(data.tags) : null, now, id);
    return rowToDocument(getDb().prepare('SELECT * FROM vault_documents WHERE id = ?').get(id) as Record<string, unknown>);
  });

  ipcMain.handle('vault:deleteDocument', (_e, id: string) => {
    getDb().prepare('DELETE FROM vault_documents WHERE id = ?').run(id);
  });

  ipcMain.handle('vault:search', (_e, query: string) => {
    const rows = getDb().prepare(`
      SELECT vd.* FROM vault_documents vd
      JOIN vault_fts ON vault_fts.rowid = vd.rowid
      WHERE vault_fts MATCH ? ORDER BY rank LIMIT 50
    `).all(query);
    return (rows as Record<string, unknown>[]).map(rowToDocument);
  });
}

// ── Scheduled Tasks ───────────────────────────────────────────────────────────

function setupScheduledHandlers() {
  ipcMain.handle('scheduled:list', () => {
    return (getDb().prepare('SELECT * FROM scheduled_tasks ORDER BY created_at DESC').all() as Record<string, unknown>[]).map(rowToScheduledTask);
  });

  ipcMain.handle('scheduled:create', (_e, data: Partial<ScheduledTask>) => {
    const task: ScheduledTask = {
      id: uuidv4(),
      prompt: data.prompt ?? '',
      schedule_cron: data.schedule_cron ?? '0 9 * * *',
      project_path: data.project_path ?? process.env.HOME ?? '/',
      model: data.model ?? 'sonnet',
      enabled: true,
      created_at: new Date().toISOString(),
    };
    getDb().prepare(`
      INSERT INTO scheduled_tasks (id, prompt, schedule_cron, project_path, model, enabled, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `).run(task.id, task.prompt, task.schedule_cron, task.project_path, task.model, 1, task.created_at);
    return task;
  });

  ipcMain.handle('scheduled:delete', (_e, id: string) => {
    getDb().prepare('DELETE FROM scheduled_tasks WHERE id = ?').run(id);
  });

  ipcMain.handle('scheduled:toggle', (_e, id: string, enabled: boolean) => {
    getDb().prepare('UPDATE scheduled_tasks SET enabled = ? WHERE id = ?').run(enabled ? 1 : 0, id);
    return rowToScheduledTask(getDb().prepare('SELECT * FROM scheduled_tasks WHERE id = ?').get(id) as Record<string, unknown>);
  });

  ipcMain.handle('scheduled:runNow', (_e, id: string) => {
    const task = rowToScheduledTask(getDb().prepare('SELECT * FROM scheduled_tasks WHERE id = ?').get(id) as Record<string, unknown>);
    const settings = getSettings();
    const agent = createAgent({ name: `Scheduled: ${task.id.slice(0, 8)}`, projectPath: task.project_path, model: task.model });
    startAgent(agent.id, task.prompt, task.model, settings, getMainWindow());
  });
}

// ── Automations ───────────────────────────────────────────────────────────────

function setupAutomationHandlers() {
  ipcMain.handle('automations:list', () => {
    return (getDb().prepare('SELECT * FROM automations ORDER BY created_at DESC').all() as Record<string, unknown>[]).map(rowToAutomation);
  });

  ipcMain.handle('automations:get', (_e, id: string) => {
    const row = getDb().prepare('SELECT * FROM automations WHERE id = ?').get(id);
    if (!row) throw new Error(`Automation ${id} not found`);
    return rowToAutomation(row as Record<string, unknown>);
  });

  ipcMain.handle('automations:create', (_e, data: Partial<Automation>) => {
    const auto: Automation = {
      id: uuidv4(),
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
    getDb().prepare(`
      INSERT INTO automations
        (id, name, source_type, source_config, schedule_minutes, agent_prompt,
         agent_project_path, agent_model, output_github_comment, output_slack, output_telegram, enabled, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(auto.id, auto.name, auto.source_type, toJson(auto.source_config), auto.schedule_minutes,
      auto.agent_prompt, auto.agent_project_path ?? null, auto.agent_model,
      auto.output_github_comment ? 1 : 0, auto.output_slack ? 1 : 0,
      auto.output_telegram ? 1 : 0, 1, auto.created_at);
    return auto;
  });

  ipcMain.handle('automations:update', (_e, id: string, data: Partial<Automation>) => {
    const now = new Date().toISOString();
    getDb().prepare(`
      UPDATE automations SET
        name = COALESCE(?, name), source_config = COALESCE(?, source_config),
        schedule_minutes = COALESCE(?, schedule_minutes), agent_prompt = COALESCE(?, agent_prompt),
        agent_project_path = COALESCE(?, agent_project_path), agent_model = COALESCE(?, agent_model),
        output_github_comment = COALESCE(?, output_github_comment),
        output_slack = COALESCE(?, output_slack), output_telegram = COALESCE(?, output_telegram)
      WHERE id = ?
    `).run(
      data.name ?? null, data.source_config ? toJson(data.source_config) : null,
      data.schedule_minutes ?? null, data.agent_prompt ?? null,
      data.agent_project_path ?? null, data.agent_model ?? null,
      data.output_github_comment != null ? (data.output_github_comment ? 1 : 0) : null,
      data.output_slack != null ? (data.output_slack ? 1 : 0) : null,
      data.output_telegram != null ? (data.output_telegram ? 1 : 0) : null,
      id
    );
    return rowToAutomation(getDb().prepare('SELECT * FROM automations WHERE id = ?').get(id) as Record<string, unknown>);
  });

  ipcMain.handle('automations:delete', (_e, id: string) => {
    getDb().prepare('DELETE FROM automations WHERE id = ?').run(id);
  });

  ipcMain.handle('automations:toggle', (_e, id: string, enabled: boolean) => {
    getDb().prepare('UPDATE automations SET enabled = ? WHERE id = ?').run(enabled ? 1 : 0, id);
    return rowToAutomation(getDb().prepare('SELECT * FROM automations WHERE id = ?').get(id) as Record<string, unknown>);
  });

  ipcMain.handle('automations:runNow', (_e, id: string) => {
    // Trigger the automation service to run immediately
    getMainWindow()?.webContents.send('automation:trigger', { id });
  });

  ipcMain.handle('automations:getLogs', (_e, id: string, limit = 10) => {
    const rows = getDb()
      .prepare('SELECT * FROM automation_runs WHERE automation_id = ? ORDER BY created_at DESC LIMIT ?')
      .all(id, limit);
    return (rows as Record<string, unknown>[]).map(rowToAutomationRun);
  });
}

// ── Settings ──────────────────────────────────────────────────────────────────

function setupSettingsHandlers() {
  ipcMain.handle('settings:get', () => getSettings());

  ipcMain.handle('settings:update', (_e, data: Partial<AppSettings>) => {
    getDb().prepare(`
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
    `).run(
      data.claudePath ?? null, data.defaultModel ?? null,
      data.telegramToken ?? null,
      data.telegramChatIds ? toJson(data.telegramChatIds) : null,
      data.slackBotToken ?? null, data.slackAppToken ?? null,
      data.slackEnabled != null ? (data.slackEnabled ? 1 : 0) : null,
      data.telegramEnabled != null ? (data.telegramEnabled ? 1 : 0) : null,
      data.notifyOnComplete != null ? (data.notifyOnComplete ? 1 : 0) : null,
      data.notifyOnError != null ? (data.notifyOnError ? 1 : 0) : null,
      data.notifyOnWaiting != null ? (data.notifyOnWaiting ? 1 : 0) : null,
      data.skipPermissions != null ? (data.skipPermissions ? 1 : 0) : null,
    );
    return getSettings();
  });
}

// ── Sessions ──────────────────────────────────────────────────────────────────

function setupSessionsHandlers() {
  ipcMain.handle('sessions:list', () => listSessions());

  ipcMain.handle('sessions:read', (_e, filePath: string) => readSession(filePath));

  ipcMain.handle('sessions:delete', (_e, filePath: string) => deleteSession(filePath));

  ipcMain.handle('sessions:resume', (_e, agentId: string, sessionId: string) => {
    // Need to start agent with --resume <sessionId>
    // This requires passing the logic to agentManager or doing it from the UI.
    // For now we'll just proxy the args when startAgent is improved or we can send input.
    // The UI should handle recreating agent with correct resume param.
  });
}

// ── Skills ────────────────────────────────────────────────────────────────────

function setupSkillsHandlers() {
  const { listSkills, readSkill, writeSkill, deleteSkill } = require('../services/skills-manager');

  ipcMain.handle('skills:list', (_e, projectPath?: string) => listSkills(projectPath));

  ipcMain.handle('skills:get', (_e, name: string, scope: 'global' | 'project', projectPath?: string) =>
    readSkill(name, scope, projectPath)
  );

  ipcMain.handle('skills:create', (_e, name: string, content: string, scope: 'global' | 'project', projectPath?: string) =>
    writeSkill(name, content, scope, projectPath)
  );

  ipcMain.handle('skills:update', (_e, name: string, content: string, scope: 'global' | 'project', projectPath?: string) =>
    writeSkill(name, content, scope, projectPath)
  );

  ipcMain.handle('skills:delete', (_e, name: string, scope: 'global' | 'project', projectPath?: string) =>
    deleteSkill(name, scope, projectPath)
  );
}

// ── Memory ────────────────────────────────────────────────────────────────────

function setupMemoryHandlers() {
  const { listMemoryFiles, readMemoryFile, writeMemoryFile, deleteMemoryFile } = require('../services/memory-manager');

  ipcMain.handle('memory:list', (_e, projectPaths?: string[]) => listMemoryFiles(projectPaths));
  ipcMain.handle('memory:read', (_e, filePath: string) => readMemoryFile(filePath));
  ipcMain.handle('memory:write', (_e, filePath: string, content: string) => writeMemoryFile(filePath, content));
  ipcMain.handle('memory:delete', (_e, filePath: string) => deleteMemoryFile(filePath));
}

// ── Usage ─────────────────────────────────────────────────────────────────────

function setupUsageHandlers() {
  ipcMain.handle('usage:summary', () => {
    const today = new Date().toISOString().slice(0, 10);
    const total = getDb().prepare(`
      SELECT SUM(input_tokens) as input, SUM(output_tokens) as output, COUNT(*) as runs
      FROM agent_runs
    `).get() as Record<string, number>;
    const todayStats = getDb().prepare(`
      SELECT SUM(input_tokens) as input, SUM(output_tokens) as output
      FROM agent_runs WHERE date(created_at) = ?
    `).get(today) as Record<string, number>;
    return {
      total_input_tokens: total.input ?? 0,
      total_output_tokens: total.output ?? 0,
      total_runs: total.runs ?? 0,
      today_input_tokens: todayStats.input ?? 0,
      today_output_tokens: todayStats.output ?? 0,
    };
  });

  ipcMain.handle('usage:byAgent', () => {
    return getDb().prepare(`
      SELECT agent_type, SUM(input_tokens) as total_input_tokens,
        SUM(output_tokens) as total_output_tokens, COUNT(*) as run_count
      FROM agent_runs GROUP BY agent_type ORDER BY total_input_tokens DESC
    `).all();
  });

  ipcMain.handle('usage:byProject', () => {
    return getDb().prepare(`
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

function rowToProject(row: Record<string, unknown>): Project {
  return {
    id: row.id as string,
    name: row.name as string,
    description: row.description as string | undefined,
    local_path: (row.local_path as string) || '',
    coding_guidelines: row.coding_guidelines as string | undefined,
    created_at: row.created_at as string,
    updated_at: row.updated_at as string,
  };
}

function rowToTask(row: Record<string, unknown>): Task {
  const issueUrl = row.github_issue_url as string | undefined;
  const prUrl = row.github_pr_url as string | undefined;
  return {
    id: row.id as string,
    title: row.title as string,
    description: row.description as string,
    status: row.status as Task['status'],
    priority: row.priority as Task['priority'],
    project_id: row.project_id as string | undefined,
    acceptance_criteria: row.acceptance_criteria as string | undefined,
    deadline: row.deadline as string | undefined,
    github_repo: row.github_repo as string | undefined,
    github_issue_url: issueUrl,
    github_pr_url: prUrl,
    deployment_url: row.deployment_url as string | undefined,
    profile_id: row.profile_id as string | undefined,
    branch_name: row.branch_name as string | undefined,
    turn_count: (row.turn_count as number) || 0,
    input_tokens: (row.input_tokens as number) || 0,
    output_tokens: (row.output_tokens as number) || 0,
    elapsed_seconds: (row.elapsed_seconds as number) || 0,
    queued_at: row.queued_at as string | undefined,
    started_at: row.started_at as string | undefined,
    completed_at: row.completed_at as string | undefined,
    created_at: row.created_at as string,
    updated_at: row.updated_at as string,
    // Legacy compat
    approved: (row.status as string) === 'APPROVED',
    github_issue_id: issueUrl ? issueUrl.split('/').pop() : undefined,
    github_pr_id: prUrl ? prUrl.split('/').pop() : undefined,
    email_sent: false,
    pr_reviewed: false,
  };
}

function rowToAgentRun(row: Record<string, unknown>): AgentRun {
  return {
    id: row.id as string,
    task_id: row.task_id as string,
    agent_type: row.agent_type as string,
    agent_name: row.agent_type as string,   // legacy alias
    error_message: (row.error as string) ?? undefined, // legacy alias
    started_at: row.created_at as string,   // legacy alias
    completed_at: row.updated_at as string,   // legacy alias
    status: row.status as AgentRun['status'],
    input: parseJson(row.input as string, undefined),
    output: parseJson(row.output as string, undefined),
    error: row.error as string | undefined,
    input_tokens: row.input_tokens as number | undefined,
    output_tokens: row.output_tokens as number | undefined,
    created_at: row.created_at as string,
    updated_at: row.updated_at as string,
  };
}

function rowToAgentRunStep(row: Record<string, unknown>): AgentRunStep {
  return {
    id: row.id as string,
    run_id: row.run_id as string,
    step_number: row.step_number as number,
    thought: row.thought as string | undefined,
    tool_called: row.tool_called as string | undefined,
    tool_input: parseJson(row.tool_input as string, undefined),
    tool_output: row.tool_output as string | undefined,
    input_tokens: row.input_tokens as number | undefined,
    output_tokens: row.output_tokens as number | undefined,
    created_at: row.created_at as string,
  };
}

function rowToKanbanTask(row: Record<string, unknown>): KanbanTask {
  return {
    id: row.id as string,
    title: row.title as string,
    description: row.description as string | undefined,
    column: row.column_name as KanbanColumn,
    priority: row.priority as KanbanTask['priority'],
    progress: row.progress as number,
    labels: parseJson<string[]>(row.labels as string, []),
    skill_requirements: parseJson<string[]>(row.skill_requirements as string, []),
    assigned_agent_id: row.assigned_agent_id as string | undefined,
    project_path: row.project_path as string | undefined,
    created_at: row.created_at as string,
    updated_at: row.updated_at as string,
  };
}

function rowToFolder(row: Record<string, unknown>): VaultFolder {
  return {
    id: row.id as string,
    name: row.name as string,
    parent_id: row.parent_id as string | undefined,
    created_at: row.created_at as string,
  };
}

function rowToDocument(row: Record<string, unknown>): VaultDocument {
  return {
    id: row.id as string,
    title: row.title as string,
    content: row.content as string,
    folder_id: row.folder_id as string | undefined,
    tags: parseJson<string[]>(row.tags as string, []),
    created_at: row.created_at as string,
    updated_at: row.updated_at as string,
  };
}

function rowToScheduledTask(row: Record<string, unknown>): ScheduledTask {
  return {
    id: row.id as string,
    prompt: row.prompt as string,
    schedule_cron: row.schedule_cron as string,
    project_path: row.project_path as string,
    model: row.model as ScheduledTask['model'],
    enabled: Boolean(row.enabled),
    last_run: row.last_run as string | undefined,
    last_output: row.last_output as string | undefined,
    created_at: row.created_at as string,
  };
}

function rowToAutomation(row: Record<string, unknown>): Automation {
  return {
    id: row.id as string,
    name: row.name as string,
    source_type: row.source_type as Automation['source_type'],
    source_config: parseJson<Record<string, unknown>>(row.source_config as string, {}),
    schedule_minutes: row.schedule_minutes as number,
    agent_prompt: row.agent_prompt as string,
    agent_project_path: row.agent_project_path as string | undefined,
    agent_model: row.agent_model as Automation['agent_model'],
    output_github_comment: Boolean(row.output_github_comment),
    output_slack: Boolean(row.output_slack),
    output_telegram: Boolean(row.output_telegram),
    enabled: Boolean(row.enabled),
    last_run: row.last_run as string | undefined,
    created_at: row.created_at as string,
  };
}

function rowToAutomationRun(row: Record<string, unknown>): AutomationRun {
  return {
    id: row.id as string,
    automation_id: row.automation_id as string,
    status: row.status as AutomationRun['status'],
    items_processed: row.items_processed as number,
    output: row.output as string | undefined,
    created_at: row.created_at as string,
  };
}

function rowToSettings(row: Record<string, unknown>): AppSettings {
  return {
    claudePath: (row.claude_path as string) || 'claude',
    defaultModel: (row.default_model as AppSettings['defaultModel']) || 'sonnet',
    telegramToken: row.telegram_token as string | undefined,
    telegramChatIds: parseJson<string[]>(row.telegram_chat_ids as string, []),
    slackBotToken: row.slack_bot_token as string | undefined,
    slackAppToken: row.slack_app_token as string | undefined,
    slackEnabled: Boolean(row.slack_enabled),
    telegramEnabled: Boolean(row.telegram_enabled),
    notifyOnComplete: Boolean(row.notify_on_complete),
    notifyOnError: Boolean(row.notify_on_error),
    notifyOnWaiting: Boolean(row.notify_on_waiting),
    skipPermissions: Boolean(row.skip_permissions),
  };
}

// ── Task helpers ──────────────────────────────────────────────────────────────

function insertTask(task: Task): void {
  getDb().prepare(`
    INSERT INTO tasks
      (id, title, description, status, priority, project_id, acceptance_criteria,
       deadline, github_repo, profile_id, branch_name, turn_count, input_tokens, output_tokens,
       elapsed_seconds, queued_at, started_at, completed_at, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(task.id, task.title, task.description, task.status, task.priority,
    task.project_id ?? null, task.acceptance_criteria ?? null,
    task.deadline ?? null, task.github_repo ?? null,
    task.profile_id ?? null, task.branch_name ?? null, task.turn_count,
    task.input_tokens, task.output_tokens, task.elapsed_seconds,
    task.queued_at ?? null, task.started_at ?? null, task.completed_at ?? null,
    task.created_at, task.updated_at);
}

function updateTaskFields(id: string, data: Partial<Task>): void {
  getDb().prepare(`
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
  `).run(
    data.title ?? null, data.description ?? null, data.status ?? null,
    data.priority ?? null, data.acceptance_criteria ?? null,
    data.deadline ?? null, data.github_repo ?? null,
    data.github_issue_url ?? null, data.github_pr_url ?? null,
    data.deployment_url ?? null,
    data.profile_id ?? null, data.branch_name ?? null, data.turn_count ?? null,
    data.input_tokens ?? null, data.output_tokens ?? null, data.elapsed_seconds ?? null,
    data.queued_at ?? null, data.started_at ?? null, data.completed_at ?? null,
    id
  );
}

// ── Settings Sub-managers ───────────────────────────────────────────────────

function setupHooksHandlers() {
  ipcMain.handle('hooks:list', (_e, scope: 'global' | 'project', projectPath?: string) => {
    return readHooks(scope, projectPath);
  });

  ipcMain.handle('hooks:update', (_e, hooks: any[], scope: 'global' | 'project', projectPath?: string) => {
    writeHooks(hooks, scope, projectPath);
  });
}

function setupMcpHandlers() {
  ipcMain.handle('mcp:list', (_e, scope: 'global' | 'project', projectPath?: string) => {
    return readMcpServers(scope, projectPath);
  });

  ipcMain.handle('mcp:save', (_e, name: string, config: any, scope: 'global' | 'project', projectPath?: string) => {
    writeMcpServer(name, config, scope, projectPath);
  });

  ipcMain.handle('mcp:delete', (_e, name: string, scope: 'global' | 'project', projectPath?: string) => {
    deleteMcpServer(name, scope, projectPath);
  });
}

function setupEnvHandlers() {
  ipcMain.handle('env:list', () => listEnvVars());
  ipcMain.handle('env:save', (_e, key: string, value: string) => writeEnvVar(key, value));
  ipcMain.handle('env:delete', (_e, key: string) => deleteEnvVar(key));
}
function setupUtilHandlers() {
  ipcMain.handle('utils:selectDirectory', async () => {
    const result = await dialog.showOpenDialog(getMainWindow()!, {
      properties: ['openDirectory'],
    });
    if (result.canceled) return null;
    return result.filePaths[0];
  });
}
