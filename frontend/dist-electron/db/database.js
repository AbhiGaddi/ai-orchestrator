"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getDb = getDb;
exports.initDatabase = initDatabase;
exports.parseJson = parseJson;
exports.toJson = toJson;
const better_sqlite3_1 = __importDefault(require("better-sqlite3"));
const path = __importStar(require("node:path"));
const fs = __importStar(require("node:fs"));
const electron_1 = require("electron");
let db;
function getDb() {
    if (!db)
        throw new Error('Database not initialized. Call initDatabase() first.');
    return db;
}
function initDatabase() {
    const dataDir = path.join(electron_1.app.getPath('userData'), 'data');
    if (!fs.existsSync(dataDir))
        fs.mkdirSync(dataDir, { recursive: true });
    const dbPath = path.join(dataDir, 'flow.db');
    db = new better_sqlite3_1.default(dbPath);
    // Enable WAL mode for better concurrent read performance
    db.pragma('journal_mode = WAL');
    db.pragma('foreign_keys = ON');
    runMigrations();
}
function runMigrations() {
    db.exec(`
    -- Projects
    CREATE TABLE IF NOT EXISTS projects (
      id                TEXT PRIMARY KEY,
      name              TEXT NOT NULL,
      description       TEXT,
      local_path        TEXT NOT NULL DEFAULT '',
      github_repos      TEXT NOT NULL DEFAULT '[]',
      coding_guidelines TEXT,
      created_at        TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at        TEXT NOT NULL DEFAULT (datetime('now'))
    );

    -- Agent Profiles
    CREATE TABLE IF NOT EXISTS agent_profiles (
      id            TEXT PRIMARY KEY,
      name          TEXT NOT NULL,
      model         TEXT NOT NULL DEFAULT 'sonnet',
      skills        TEXT NOT NULL DEFAULT '[]',
      plugins       TEXT NOT NULL DEFAULT '[]',
      system_prompt TEXT,
      max_turns     INTEGER DEFAULT 20,
      allowed_tools TEXT,
      skip_permissions INTEGER DEFAULT 0,
      branch_prefix TEXT DEFAULT 'feat/',
      is_default    INTEGER DEFAULT 0,
      created_at    TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at    TEXT NOT NULL DEFAULT (datetime('now'))
    );

    -- Tasks
    CREATE TABLE IF NOT EXISTS tasks (
      id                   TEXT PRIMARY KEY,
      title                TEXT NOT NULL,
      description          TEXT NOT NULL DEFAULT '',
      status               TEXT NOT NULL DEFAULT 'PENDING',
      priority             TEXT NOT NULL DEFAULT 'MEDIUM',
      project_id           TEXT REFERENCES projects(id) ON DELETE SET NULL,
      profile_id           TEXT REFERENCES agent_profiles(id) ON DELETE SET NULL,
      branch_name          TEXT,
      turn_count           INTEGER DEFAULT 0,
      input_tokens         INTEGER DEFAULT 0,
      output_tokens        INTEGER DEFAULT 0,
      elapsed_seconds      INTEGER DEFAULT 0,
      queued_at            TEXT,
      started_at           TEXT,
      completed_at         TEXT,
      acceptance_criteria  TEXT,
      deadline             TEXT,
      github_repo          TEXT,
      github_issue_url     TEXT,
      github_pr_url        TEXT,
      deployment_url       TEXT,
      created_at           TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at           TEXT NOT NULL DEFAULT (datetime('now'))
    );
  `);
    // Migrate projects table for existing databases
    try {
        db.exec('ALTER TABLE projects ADD COLUMN local_path TEXT NOT NULL DEFAULT \'\';');
    }
    catch { }
    try {
        db.exec('ALTER TABLE projects DROP COLUMN sonar_project_key;');
    }
    catch { }
    try {
        db.exec('ALTER TABLE projects DROP COLUMN sonar_token;');
    }
    catch { }
    try {
        db.exec('ALTER TABLE projects DROP COLUMN sonar_url;');
    }
    catch { }
    // Backfill local_path from first github_repos entry if it looks like a path
    try {
        db.exec(`
      UPDATE projects
      SET local_path = json_extract(github_repos, '$[0]')
      WHERE local_path = ''
        AND json_extract(github_repos, '$[0]') LIKE '/%'
    `);
    }
    catch { }
    // Alter tasks table for existing databases
    try {
        db.exec('ALTER TABLE tasks ADD COLUMN profile_id TEXT REFERENCES agent_profiles(id) ON DELETE SET NULL;');
    }
    catch { }
    try {
        db.exec('ALTER TABLE tasks ADD COLUMN branch_name TEXT;');
    }
    catch { }
    try {
        db.exec('ALTER TABLE tasks ADD COLUMN turn_count INTEGER DEFAULT 0;');
    }
    catch { }
    try {
        db.exec('ALTER TABLE tasks ADD COLUMN input_tokens INTEGER DEFAULT 0;');
    }
    catch { }
    try {
        db.exec('ALTER TABLE tasks ADD COLUMN output_tokens INTEGER DEFAULT 0;');
    }
    catch { }
    try {
        db.exec('ALTER TABLE tasks ADD COLUMN elapsed_seconds INTEGER DEFAULT 0;');
    }
    catch { }
    try {
        db.exec('ALTER TABLE tasks ADD COLUMN queued_at TEXT;');
    }
    catch { }
    try {
        db.exec('ALTER TABLE tasks ADD COLUMN started_at TEXT;');
    }
    catch { }
    try {
        db.exec('ALTER TABLE tasks ADD COLUMN completed_at TEXT;');
    }
    catch { }
    // Alter agents table
    try {
        db.exec('ALTER TABLE agents ADD COLUMN system_prompt TEXT;');
    }
    catch { }
    try {
        db.exec('ALTER TABLE agents ADD COLUMN skip_permissions INTEGER DEFAULT 0;');
    }
    catch { }
    db.exec(`

    -- Agent Runs
    CREATE TABLE IF NOT EXISTS agent_runs (
      id           TEXT PRIMARY KEY,
      task_id      TEXT REFERENCES tasks(id) ON DELETE CASCADE,
      agent_type   TEXT NOT NULL,
      status       TEXT NOT NULL DEFAULT 'PENDING',
      input        TEXT,
      output       TEXT,
      error        TEXT,
      input_tokens  INTEGER DEFAULT 0,
      output_tokens INTEGER DEFAULT 0,
      created_at   TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at   TEXT NOT NULL DEFAULT (datetime('now'))
    );

    -- Agent Run Steps
    CREATE TABLE IF NOT EXISTS agent_run_steps (
      id            TEXT PRIMARY KEY,
      run_id        TEXT NOT NULL REFERENCES agent_runs(id) ON DELETE CASCADE,
      step_number   INTEGER NOT NULL,
      thought       TEXT,
      tool_called   TEXT,
      tool_input    TEXT,
      tool_output   TEXT,
      input_tokens  INTEGER DEFAULT 0,
      output_tokens INTEGER DEFAULT 0,
      created_at    TEXT NOT NULL DEFAULT (datetime('now'))
    );

    -- Agents (parallel execution)
    CREATE TABLE IF NOT EXISTS agents (
      id               TEXT PRIMARY KEY,
      name             TEXT NOT NULL,
      project_path     TEXT NOT NULL,
      status           TEXT NOT NULL DEFAULT 'idle',
      model            TEXT NOT NULL DEFAULT 'sonnet',
      skills           TEXT NOT NULL DEFAULT '[]',
      system_prompt    TEXT,
      skip_permissions INTEGER DEFAULT 0,
      current_task     TEXT,
      output_buffer    TEXT NOT NULL DEFAULT '[]',
      pid              INTEGER,
      created_at       TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at       TEXT NOT NULL DEFAULT (datetime('now'))
    );

    -- Kanban Tasks
    CREATE TABLE IF NOT EXISTS kanban_tasks (
      id                   TEXT PRIMARY KEY,
      title                TEXT NOT NULL,
      description          TEXT,
      column_name          TEXT NOT NULL DEFAULT 'backlog',
      priority             TEXT NOT NULL DEFAULT 'MEDIUM',
      progress             INTEGER NOT NULL DEFAULT 0,
      labels               TEXT NOT NULL DEFAULT '[]',
      skill_requirements   TEXT NOT NULL DEFAULT '[]',
      assigned_agent_id    TEXT REFERENCES agents(id) ON DELETE SET NULL,
      project_path         TEXT,
      created_at           TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at           TEXT NOT NULL DEFAULT (datetime('now'))
    );

    -- Vault Folders
    CREATE TABLE IF NOT EXISTS vault_folders (
      id         TEXT PRIMARY KEY,
      name       TEXT NOT NULL,
      parent_id  TEXT REFERENCES vault_folders(id) ON DELETE CASCADE,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    -- Vault Documents
    CREATE TABLE IF NOT EXISTS vault_documents (
      id         TEXT PRIMARY KEY,
      title      TEXT NOT NULL,
      content    TEXT NOT NULL DEFAULT '',
      folder_id  TEXT REFERENCES vault_folders(id) ON DELETE SET NULL,
      tags       TEXT NOT NULL DEFAULT '[]',
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    -- FTS index for vault documents
    CREATE VIRTUAL TABLE IF NOT EXISTS vault_fts USING fts5(
      title,
      content,
      tags,
      content='vault_documents',
      content_rowid='rowid'
    );

    -- Vault FTS triggers
    CREATE TRIGGER IF NOT EXISTS vault_ai AFTER INSERT ON vault_documents BEGIN
      INSERT INTO vault_fts(rowid, title, content, tags)
        VALUES (new.rowid, new.title, new.content, new.tags);
    END;
    CREATE TRIGGER IF NOT EXISTS vault_ad AFTER DELETE ON vault_documents BEGIN
      INSERT INTO vault_fts(vault_fts, rowid, title, content, tags)
        VALUES ('delete', old.rowid, old.title, old.content, old.tags);
    END;
    CREATE TRIGGER IF NOT EXISTS vault_au AFTER UPDATE ON vault_documents BEGIN
      INSERT INTO vault_fts(vault_fts, rowid, title, content, tags)
        VALUES ('delete', old.rowid, old.title, old.content, old.tags);
      INSERT INTO vault_fts(rowid, title, content, tags)
        VALUES (new.rowid, new.title, new.content, new.tags);
    END;

    -- Scheduled Tasks
    CREATE TABLE IF NOT EXISTS scheduled_tasks (
      id             TEXT PRIMARY KEY,
      prompt         TEXT NOT NULL,
      schedule_cron  TEXT NOT NULL,
      project_path   TEXT NOT NULL,
      model          TEXT NOT NULL DEFAULT 'sonnet',
      enabled        INTEGER NOT NULL DEFAULT 1,
      last_run       TEXT,
      last_output    TEXT,
      created_at     TEXT NOT NULL DEFAULT (datetime('now'))
    );

    -- Automations
    CREATE TABLE IF NOT EXISTS automations (
      id                    TEXT PRIMARY KEY,
      name                  TEXT NOT NULL,
      source_type           TEXT NOT NULL,
      source_config         TEXT NOT NULL DEFAULT '{}',
      schedule_minutes      INTEGER NOT NULL DEFAULT 30,
      agent_prompt          TEXT NOT NULL DEFAULT '',
      agent_project_path    TEXT,
      agent_model           TEXT NOT NULL DEFAULT 'sonnet',
      output_github_comment INTEGER NOT NULL DEFAULT 0,
      output_slack          INTEGER NOT NULL DEFAULT 0,
      output_telegram       INTEGER NOT NULL DEFAULT 0,
      enabled               INTEGER NOT NULL DEFAULT 1,
      last_run              TEXT,
      created_at            TEXT NOT NULL DEFAULT (datetime('now'))
    );

    -- Automation Runs
    CREATE TABLE IF NOT EXISTS automation_runs (
      id              TEXT PRIMARY KEY,
      automation_id   TEXT NOT NULL REFERENCES automations(id) ON DELETE CASCADE,
      status          TEXT NOT NULL DEFAULT 'running',
      items_processed INTEGER NOT NULL DEFAULT 0,
      output          TEXT,
      created_at      TEXT NOT NULL DEFAULT (datetime('now'))
    );

    -- Processed Items (deduplication for automations)
    CREATE TABLE IF NOT EXISTS processed_items (
      id            TEXT PRIMARY KEY,
      automation_id TEXT NOT NULL REFERENCES automations(id) ON DELETE CASCADE,
      item_hash     TEXT NOT NULL,
      processed_at  TEXT NOT NULL DEFAULT (datetime('now')),
      UNIQUE(automation_id, item_hash)
    );

    -- Settings (single row)
    CREATE TABLE IF NOT EXISTS settings (
      id                  INTEGER PRIMARY KEY DEFAULT 1,
      claude_path         TEXT NOT NULL DEFAULT 'claude',
      default_model       TEXT NOT NULL DEFAULT 'sonnet',
      telegram_token      TEXT,
      telegram_chat_ids   TEXT NOT NULL DEFAULT '[]',
      slack_bot_token     TEXT,
      slack_app_token     TEXT,
      slack_enabled       INTEGER NOT NULL DEFAULT 0,
      telegram_enabled    INTEGER NOT NULL DEFAULT 0,
      notify_on_complete  INTEGER NOT NULL DEFAULT 1,
      notify_on_error     INTEGER NOT NULL DEFAULT 1,
      notify_on_waiting   INTEGER NOT NULL DEFAULT 1,
      skip_permissions    INTEGER NOT NULL DEFAULT 0
    );

    CREATE TABLE IF NOT EXISTS env_vars (
      key TEXT PRIMARY KEY,
      encrypted_value BLOB NOT NULL,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );

    -- Insert default settings row if missing
    INSERT OR IGNORE INTO settings (id) VALUES (1);
  `);
    // ── Incremental migrations (safe to run on existing DBs) ────────────────────
    const migrations = [
        `ALTER TABLE agent_profiles ADD COLUMN engine TEXT NOT NULL DEFAULT 'claude'`,
        `ALTER TABLE settings ADD COLUMN antigravity_path TEXT NOT NULL DEFAULT 'antigravity'`,
    ];
    for (const sql of migrations) {
        try {
            db.exec(sql);
        }
        catch { /* column already exists — ignore */ }
    }
}
// ── Helpers ──────────────────────────────────────────────────────────────────
function parseJson(value, fallback) {
    if (!value)
        return fallback;
    try {
        return JSON.parse(value);
    }
    catch {
        return fallback;
    }
}
function toJson(value) {
    return JSON.stringify(value ?? null);
}
//# sourceMappingURL=database.js.map