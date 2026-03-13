"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.lastPermissionMsg = exports.agents = void 0;
exports.loadAgents = loadAgents;
exports.createAgent = createAgent;
exports.getAgent = getAgent;
exports.listAgents = listAgents;
exports.removeAgent = removeAgent;
exports.startAgent = startAgent;
exports.stopAgent = stopAgent;
exports.markIdeAgentDone = markIdeAgentDone;
const uuid_1 = require("uuid");
const pty_manager_1 = require("./pty-manager");
const database_1 = require("../db/database");
const engines_1 = require("./engines");
// In-memory agent registry (synced to DB on changes)
exports.agents = new Map();
// Antigravity file watchers — keyed by agentId
const ideWatchers = new Map();
// ── Status detection ─────────────────────────────────────────────────────────
const STATUS_PATTERNS = {
    waiting: /\?\s*$|waiting for|press enter|y\/n\]|input:/i,
    completed: /\n>\s*$|✓|task completed|done\./i,
    error: /error:|failed:|exception:|traceback/i,
};
function detectStatus(output) {
    if (STATUS_PATTERNS.error.test(output))
        return 'error';
    if (STATUS_PATTERNS.waiting.test(output))
        return 'waiting';
    if (STATUS_PATTERNS.completed.test(output))
        return 'completed';
    return null;
}
// ── Load agents from DB on startup ───────────────────────────────────────────
function loadAgents() {
    const rows = (0, database_1.getDb)().prepare('SELECT * FROM agents').all();
    for (const row of rows) {
        const agent = rowToAgent(row);
        // Reset running agents to idle (they were interrupted by restart)
        if (agent.status === 'running' || agent.status === 'waiting') {
            agent.status = 'idle';
            (0, database_1.getDb)().prepare(`UPDATE agents SET status = 'idle', updated_at = datetime('now') WHERE id = ?`).run(agent.id);
        }
        exports.agents.set(agent.id, agent);
    }
}
// ── CRUD ─────────────────────────────────────────────────────────────────────
function createAgent(data) {
    const agent = {
        id: (0, uuid_1.v4)(),
        name: data.name ?? `Agent ${Date.now().toString(36).toUpperCase()}`,
        projectPath: data.projectPath ?? process.env.HOME ?? '/',
        status: 'idle',
        model: data.model ?? 'sonnet',
        skills: data.skills || [],
        systemPrompt: data.systemPrompt,
        skipPermissions: data.skipPermissions,
        taskId: data.taskId,
        runId: data.runId,
        outputBuffer: [],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
    };
    (0, database_1.getDb)().prepare(`
    INSERT INTO agents (id, name, project_path, status, model, skills, system_prompt, skip_permissions, output_buffer, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(agent.id, agent.name, agent.projectPath, agent.status, agent.model, (0, database_1.toJson)(agent.skills), agent.systemPrompt ?? null, agent.skipPermissions ? 1 : 0, (0, database_1.toJson)(agent.outputBuffer), agent.createdAt, agent.updatedAt);
    exports.agents.set(agent.id, agent);
    return agent;
}
function getAgent(id) {
    return exports.agents.get(id);
}
function listAgents() {
    return Array.from(exports.agents.values());
}
function removeAgent(id) {
    (0, pty_manager_1.killPty)(id);
    exports.agents.delete(id);
    (0, database_1.getDb)().prepare('DELETE FROM agents WHERE id = ?').run(id);
}
// ── Start agent ──────────────────────────────────────────────────────────────
function startAgent(id, prompt, model, settings, mainWindow) {
    const agent = exports.agents.get(id);
    if (!agent)
        throw new Error(`Agent ${id} not found`);
    if (agent.status === 'running') {
        (0, pty_manager_1.writeToPty)(id, prompt + '\n');
        return;
    }
    const engineId = agent.engine || 'claude';
    const engine = (0, engines_1.getEngine)(engineId);
    agent.status = 'running';
    agent.currentTask = prompt;
    agent.outputBuffer = [];
    agent.updatedAt = new Date().toISOString();
    persistAgent(agent);
    emitAgentEvent(mainWindow, 'agent:status', { id, status: 'running', task: prompt });
    if (engine.mode === 'ide') {
        startIdeAgent(id, prompt, model, settings, agent, engine, mainWindow);
    }
    else {
        startHeadlessAgent(id, prompt, model, settings, agent, engine, mainWindow);
    }
}
function startHeadlessAgent(id, prompt, model, settings, agent, engine, mainWindow) {
    const binary = engine.getBinary(settings);
    const args = engine.buildArgs(prompt, model ?? agent.model, agent);
    const env = engine.buildEnv(settings);
    console.log('[agent-manager] Spawning headless engine:', { engine: engine.id, binary, args, cwd: agent.projectPath });
    emitAgentEvent(mainWindow, 'agent:stream-event', {
        id,
        event: { type: 'diagnostic', engine: engine.id, cwd: agent.projectPath, command: `${binary} ${args.join(' ')}` },
    });
    (0, pty_manager_1.spawnPty)(id, binary, args, agent.projectPath, env, (data) => handleOutput(id, data, mainWindow), (code) => handleExit(id, code, mainWindow));
}
function startIdeAgent(id, prompt, _model, settings, agent, engine, mainWindow) {
    const { spawn } = require('node:child_process');
    const chokidar = require('chokidar');
    const binary = engine.getBinary(settings);
    const args = [...engine.buildArgs(prompt, 'default', agent), agent.projectPath];
    console.log('[agent-manager] Launching IDE engine:', { engine: engine.id, binary, args, cwd: agent.projectPath });
    // Launch IDE as detached process (fire-and-forget)
    const ideProcess = spawn(binary, args, {
        cwd: agent.projectPath,
        detached: true,
        stdio: 'ignore',
    });
    ideProcess.unref();
    emitAgentEvent(mainWindow, 'agent:stream-event', {
        id,
        event: { type: 'ide_opened', engine: engine.id, cwd: agent.projectPath },
    });
    // Watch filesystem for changes so we can show a live file change list
    const changedFiles = new Map(); // relativePath → 'added'|'changed'|'deleted'
    const watcher = chokidar.watch(agent.projectPath, {
        ignored: /(node_modules|\.git|target|build|\.metals|\.bsp|out)/,
        ignoreInitial: true,
        persistent: true,
        awaitWriteFinish: { stabilityThreshold: 500, pollInterval: 100 },
    });
    const onFileChange = (event, filePath) => {
        const rel = require('node:path').relative(agent.projectPath, filePath);
        changedFiles.set(rel, event);
        emitAgentEvent(mainWindow, 'agent:stream-event', {
            id,
            event: { type: 'file_change', changeEvent: event, file: rel, total: changedFiles.size },
        });
    };
    watcher.on('add', (p) => onFileChange('added', p));
    watcher.on('change', (p) => onFileChange('changed', p));
    watcher.on('unlink', (p) => onFileChange('deleted', p));
    ideWatchers.set(id, watcher);
}
// ── Stop agent ───────────────────────────────────────────────────────────────
function stopAgent(id, mainWindow) {
    const agent = exports.agents.get(id);
    if (!agent)
        return;
    (0, pty_manager_1.killPty)(id);
    stopIdeWatcher(id);
    agent.status = 'idle';
    agent.updatedAt = new Date().toISOString();
    persistAgent(agent);
    emitAgentEvent(mainWindow, 'agent:status', { id, status: 'idle' });
}
/** Called when the user clicks "Mark Complete" for an IDE-based task */
function markIdeAgentDone(id, mainWindow) {
    stopIdeWatcher(id);
    handleExit(id, 0, mainWindow);
}
function stopIdeWatcher(id) {
    const watcher = ideWatchers.get(id);
    if (watcher) {
        watcher.close();
        ideWatchers.delete(id);
    }
}
// ── ANSI stripping ────────────────────────────────────────────────────────────
function stripAnsi(str) {
    // eslint-disable-next-line no-control-regex
    return str.replace(/\x1B\[[\d;]*[a-zA-Z]|\x1B\][\d;]*[;\x07]|\r/g, '');
}
// ── Permission detection ──────────────────────────────────────────────────────
// Claude CLI bash permission prompt patterns (raw PTY text, ANSI-stripped)
const PERMISSION_PATTERNS = [
    /do you want to run/i,
    /allow this command/i,
    /allow.*bash/i,
    /bash.*allow/i,
    /yes\s+no\s+always/i, // Claude CLI y/n prompt footer
    /\[y\/n\]/i,
    /permission.*needed/i,
    /grant.*permission/i,
    /needs.*permission/i,
    /please.*grant/i,
    /would you like to/i,
];
// Track last permission message per agent to avoid repeated notifications
exports.lastPermissionMsg = new Map();
function checkPermissionRequest(id, text, mainWindow) {
    const cleaned = stripAnsi(text).trim();
    if (!PERMISSION_PATTERNS.some(p => p.test(cleaned)))
        return;
    // De-duplicate: don't re-fire for the same prompt while agent is still waiting
    if (exports.lastPermissionMsg.get(id) === cleaned)
        return;
    exports.lastPermissionMsg.set(id, cleaned);
    // Update agent to 'waiting'
    const agent = exports.agents.get(id);
    if (agent && agent.status !== 'waiting') {
        agent.status = 'waiting';
        agent.updatedAt = new Date().toISOString();
        persistAgent(agent);
        emitAgentEvent(mainWindow, 'agent:status', { id, status: 'waiting' });
    }
    emitAgentEvent(mainWindow, 'agent:permission-request', { id, message: cleaned });
    const { Notification } = require('electron');
    try {
        new Notification({
            title: 'Agent needs your approval',
            body: cleaned.replace(/\s+/g, ' ').slice(0, 140),
        }).show();
    }
    catch { /* notifications may not be available */ }
}
// ── Output handling ──────────────────────────────────────────────────────────
function handleOutput(id, data, mainWindow) {
    const agent = exports.agents.get(id);
    if (!agent)
        return;
    agent.streamBuffer = (agent.streamBuffer || '') + data;
    const lines = agent.streamBuffer.split('\n');
    agent.streamBuffer = lines.pop(); // keep remainder
    let isJson = false;
    for (const line of lines) {
        if (!line.trim())
            continue;
        try {
            const event = JSON.parse(line);
            handleStreamEvent(id, event, mainWindow);
            isJson = true;
        }
        catch {
            // not JSON — could be a permission prompt or other raw output
        }
    }
    // Check raw (non-JSON) output for permission prompts.
    // Claude CLI emits bash permission requests as styled terminal text, not JSON.
    if (!isJson) {
        checkPermissionRequest(id, data, mainWindow);
    }
    // Detect general status changes (waiting/completed/error) from raw text
    const detectedStatus = detectStatus(data);
    if (detectedStatus && agent.status !== detectedStatus) {
        agent.status = detectedStatus;
        agent.updatedAt = new Date().toISOString();
        persistAgent(agent);
        emitAgentEvent(mainWindow, 'agent:status', { id, status: detectedStatus });
    }
    // Append to buffer (keep last 2000 lines)
    agent.outputBuffer.push(data);
    if (agent.outputBuffer.length > 2000)
        agent.outputBuffer.shift();
    // Stream raw output to renderer only for non-JSON lines
    if (!isJson) {
        emitAgentEvent(mainWindow, 'agent:output', { id, data });
    }
}
function handleStreamEvent(id, event, mainWindow) {
    const agent = exports.agents.get(id);
    if (!agent)
        return;
    emitAgentEvent(mainWindow, 'agent:stream-event', { id, event });
    // Detect permission requests in assistant text blocks
    if (event.type === 'assistant') {
        const content = event.message?.content ?? [];
        for (const block of content) {
            if (block.type === 'text' && block.text) {
                checkPermissionRequest(id, String(block.text), mainWindow);
            }
        }
    }
    // Capture tool_result errors from user messages (these fire when a tool write/bash fails)
    if (event.type === 'user') {
        const content = event.message?.content ?? [];
        for (const block of content) {
            if (block.type === 'tool_result' && block.is_error) {
                const errText = Array.isArray(block.content)
                    ? block.content.map((c) => c.text ?? '').join('\n')
                    : String(block.content ?? 'Tool call failed');
                emitAgentEvent(mainWindow, 'agent:stream-event', { id, event: { type: 'tool_error', message: errText } });
            }
        }
    }
    // Capture the final result text so the terminal can show what Claude actually said
    if (event.type === 'result') {
        const resultText = String(event.result ?? '').trim();
        if (resultText) {
            emitAgentEvent(mainWindow, 'agent:stream-event', { id, event: { type: 'result_text', text: resultText, is_error: Boolean(event.is_error) } });
        }
    }
    if (event.type === 'message_start' && event.message?.usage) {
        agent.inputTokens = (agent.inputTokens || 0) + (event.message.usage.input_tokens || 0);
    }
    if (event.type === 'message_delta' && event.usage) {
        agent.outputTokens = (agent.outputTokens || 0) + (event.usage.output_tokens || 0);
    }
    // Persist tool calls as steps
    if (agent.runId && event.type === 'content_block_start' && event.content_block?.type === 'tool_use') {
        const db = (0, database_1.getDb)();
        const stepId = (0, uuid_1.v4)();
        const tool = event.content_block;
        db.prepare(`
      INSERT INTO agent_run_steps (id, run_id, step_number, tool_called, tool_input, thought)
      VALUES (?, ?, (SELECT COALESCE(MAX(step_number), 0) + 1 FROM agent_run_steps WHERE run_id = ?), ?, ?, ?)
    `).run(stepId, agent.runId, agent.runId, tool.name, JSON.stringify(tool.input), agent.lastThought || null);
        // Increment turn count in tasks table
        if (agent.taskId) {
            db.prepare('UPDATE tasks SET turn_count = turn_count + 1 WHERE id = ?').run(agent.taskId);
        }
        // Clear last thought after assignment
        agent.lastThought = undefined;
    }
    if (event.type === 'content_block_delta' && event.delta?.type === 'text_delta') {
        agent.lastThought = (agent.lastThought || '') + event.delta.text;
    }
}
function handleExit(id, code, mainWindow) {
    const agent = exports.agents.get(id);
    if (!agent)
        return;
    agent.status = code === 0 ? 'completed' : 'error';
    agent.pid = undefined;
    agent.updatedAt = new Date().toISOString();
    persistAgent(agent);
    emitAgentEvent(mainWindow, 'agent:status', { id, status: agent.status, exitCode: code });
    // Desktop Notification — always fire on completion/error
    const taskTitle = agent.currentTask
        ? agent.currentTask.slice(0, 80) + (agent.currentTask.length > 80 ? '…' : '')
        : agent.name;
    const isSuccess = agent.status === 'completed';
    console.log('[agent-manager] handleExit: firing notification, status=', agent.status);
    try {
        const { Notification, app } = require('electron');
        // Bounce the dock icon on macOS (works even without notification permission)
        if (process.platform === 'darwin' && app.dock) {
            app.dock.bounce('critical');
        }
        // Show OS notification
        const notif = new Notification({
            title: isSuccess ? 'Task Completed' : 'Task Failed',
            body: taskTitle,
            urgency: 'critical',
        });
        notif.on('show', () => console.log('[agent-manager] Notification shown'));
        notif.on('failed', (e) => console.error('[agent-manager] Notification failed:', e));
        notif.show();
    }
    catch (err) {
        console.error('[agent-manager] Notification error:', err);
    }
    // Final persistence to tasks and runs
    if (agent.taskId) {
        const db = (0, database_1.getDb)();
        db.prepare(`
      UPDATE tasks SET 
        input_tokens = input_tokens + ?, 
        output_tokens = output_tokens + ?,
        status = ?,
        updated_at = ?
      WHERE id = ?
    `).run(agent.inputTokens || 0, agent.outputTokens || 0, agent.status.toUpperCase(), new Date().toISOString(), agent.taskId);
    }
    if (agent.runId) {
        const db = (0, database_1.getDb)();
        db.prepare(`
      UPDATE agent_runs SET 
        status = ?, 
        input_tokens = ?, 
        output_tokens = ?, 
        updated_at = ?
      WHERE id = ?
    `).run(agent.status.toUpperCase(), agent.inputTokens || 0, agent.outputTokens || 0, new Date().toISOString(), agent.runId);
    }
}
// ── Persistence ──────────────────────────────────────────────────────────────
function persistAgent(agent) {
    (0, database_1.getDb)().prepare(`
    UPDATE agents
    SET status = ?, model = ?, skills = ?, system_prompt = ?, skip_permissions = ?, current_task = ?, output_buffer = ?,
        pid = ?, updated_at = ?
    WHERE id = ?
  `).run(agent.status, agent.model, (0, database_1.toJson)(agent.skills), agent.systemPrompt ?? null, agent.skipPermissions ? 1 : 0, agent.currentTask ?? null, (0, database_1.toJson)(agent.outputBuffer.slice(-200)), // persist last 200 lines
    agent.pid ?? null, agent.updatedAt, agent.id);
}
// ── Utilities ────────────────────────────────────────────────────────────────
function rowToAgent(row) {
    return {
        id: row.id,
        name: row.name,
        projectPath: row.project_path,
        status: row.status,
        model: row.model ?? 'sonnet',
        skills: (0, database_1.parseJson)(row.skills, []),
        systemPrompt: row.system_prompt ?? undefined,
        skipPermissions: Boolean(row.skip_permissions),
        outputBuffer: (0, database_1.parseJson)(row.output_buffer, []),
        currentTask: row.current_task ?? undefined,
        pid: row.pid ?? undefined,
        createdAt: row.created_at,
        updatedAt: row.updated_at,
    };
}
function emitAgentEvent(mainWindow, channel, data) {
    mainWindow?.webContents.send(channel, data);
}
//# sourceMappingURL=agent-manager.js.map