# Claude Code CLI — Full Feature Exposure Plan

> This plan maps every Claude Code CLI feature to a specific UI element or Electron service.
> It extends PLAN.md (Phase 0 done, Phases 1-5 in progress).

---

## Feature → UI Mapping Overview

| Claude CLI Feature | UI Location |
|---|---|
| CLI flags (`--model`, `--resume`, `--system-prompt`, etc.) | Agent Launch Modal + Settings |
| Slash commands (`/clear`, `/compact`, `/cost`, `/memory`, etc.) | Terminal toolbar + command palette |
| Keyboard shortcuts | Keyboard shortcut overlay |
| Hook events (23 types) | Hooks Manager page `/settings/hooks` |
| MCP servers | MCP Manager page `/settings/mcp` |
| Skills system | Skills Manager page `/skills` |
| Memory system (CLAUDE.md, `.claude/memory/`) | Memory Manager page `/memory` |
| Session history / `--resume` / `--continue` | Sessions Browser panel |
| stream-json output parsing | Agent terminal (already wired) |
| Cost & token tracking | Usage page + per-session cost badge |
| `~/.claude/settings.json` file | Settings page (all tabs) |
| Subagents | Agents page sub-tab |
| Worktrees (`--worktree`) | Agent Launch Modal option |
| `--output-format` (text/json/stream-json) | Agent Launch Modal option |
| `--allowedTools` / `--disallowedTools` | Agent Launch Modal tool filter |
| `--add-dir` | Agent Launch Modal working dirs |
| `--verbose` | Agent debug mode toggle |
| `--max-turns` | Agent Launch Modal number input |
| `--permission-prompt-tool` | Settings > Permissions |

---

## Phase A — Settings Page Tabs (Priority 1)

### File: `src/app/settings/page.tsx`

Expand the existing Settings layout into a multi-tab page:

```
/settings
  ├── /settings           → Claude tab (default)
  ├── /settings?tab=hooks → Hooks Manager
  ├── /settings?tab=mcp   → MCP Manager
  ├── /settings?tab=env   → Environment Variables
  ├── /settings?tab=permissions → Permissions
  └── /settings?tab=notifications → Telegram/Slack
```

#### Tab: Claude (existing, expanded)

```
Claude binary path:       [claude________________] [Browse] [Test]
Default model:            [● Sonnet 4.6] [ Opus 4.6] [ Haiku 4.5]
Default output format:    [● stream-json] [ json] [ text]
Max turns per session:    [____10____]
Verbose output:           [toggle] — passes --verbose to Claude
Skip permissions:         [toggle] — --dangerously-skip-permissions
Fallback permission tool: [mcp__server__tool_____]
```

**IPC:** `settings:get` / `settings:update`

---

#### Tab: Hooks Manager

**Purpose:** Edit the `hooks` section of `~/.claude/settings.json` (or per-project `.claude/settings.json`) through a visual UI instead of raw JSON.

**File:** `src/app/settings/tabs/HooksManager.tsx`

```
┌─────────────────────────────────────────────────────────────┐
│ Hooks                                      [+ Add Hook]      │
├──────────────────┬────────────────────────────────┬─────────┤
│ Event            │ Command                        │ Actions │
├──────────────────┼────────────────────────────────┼─────────┤
│ PreToolUse       │ ./scripts/validate-tool.sh     │ ✎ 🗑   │
│  matcher: Bash   │                                │         │
├──────────────────┼────────────────────────────────┼─────────┤
│ PostToolUse      │ ./scripts/log-tool.sh          │ ✎ 🗑   │
│  matcher: *      │                                │         │
├──────────────────┼────────────────────────────────┼─────────┤
│ Notification     │ ./scripts/notify.sh            │ ✎ 🗑   │
│  matcher: *      │                                │         │
└──────────────────┴────────────────────────────────┴─────────┘

Scope:  [● Global (~/.claude/settings.json)]  [ Project (.claude/settings.json)]
```

**New Hook Modal fields:**
- Event type (dropdown, all 23 events)
- Matcher (glob, e.g. `Bash`, `Write`, `*`)
- Command (shell script path or inline command)
- Timeout (ms)
- Background toggle

**All 23 hook events to expose:**
```
PreToolUse         PostToolUse        Notification
Stop               SubagentStop       PreCompact

# Tool-specific matchers:
Bash  Write  Edit  MultiEdit  Read  Glob  Grep
WebFetch  WebSearch  TodoWrite  TodoRead  mcp__*
```

**Electron service:** `electron/services/hooks-manager.ts`
```typescript
import * as fs from 'fs'
import * as path from 'path'
import * as os from 'os'

// Read ~/.claude/settings.json hooks section
export function readHooks(scope: 'global' | 'project', projectPath?: string): HookConfig[]

// Write hooks back to settings.json (merge, not overwrite)
export function writeHooks(hooks: HookConfig[], scope: 'global' | 'project', projectPath?: string): void

interface HookConfig {
  event: string
  matcher?: string
  command: string
  timeout?: number
  background?: boolean
}
```

**IPC handlers to add:**
```
hooks:list   [scope, projectPath?]  → HookConfig[]
hooks:create [HookConfig, scope]    → HookConfig
hooks:update [[id, HookConfig]]     → HookConfig
hooks:delete [[id, scope]]          → void
hooks:test   [HookConfig]           → { stdout, stderr, exitCode }
```

---

#### Tab: MCP Manager

**Purpose:** Visual manager for `~/.claude/settings.json` `mcpServers` section.

**File:** `src/app/settings/tabs/McpManager.tsx`

```
┌─────────────────────────────────────────────────────────────┐
│ MCP Servers                              [+ Add Server]      │
├──────────────────┬──────────────┬──────────────┬────────────┤
│ Name             │ Type         │ Status       │ Actions    │
├──────────────────┼──────────────┼──────────────┼────────────┤
│ flow-orchestrator│ stdio        │ ✓ Registered │ ✎ 🗑 Test  │
│ flow-kanban      │ stdio        │ ✓ Registered │ ✎ 🗑 Test  │
│ filesystem       │ stdio        │ ✓ Registered │ ✎ 🗑 Test  │
│ github           │ stdio        │ ✓ Registered │ ✎ 🗑 Test  │
└──────────────────┴──────────────┴──────────────┴────────────┘

Selected: flow-orchestrator
  Command:  /Users/me/.flow/bin/mcp-orchestrator
  Args:     []
  Env:      FLOW_DB_PATH=/Users/me/.config/Flow/data/flow.db
  Scope:    Global
```

**New Server Modal:**
```
Name:     [flow-orchestrator_____]
Type:     [● stdio] [ sse]
Command:  [/path/to/server______] [Browse]
Args:     [+ Add arg]
Env vars: [KEY=VALUE            ] [+ Add]
Scope:    [● Global] [ Project]
Trust:    [● approved] [ untrusted]
```

**Electron service:** `electron/services/mcp-manager.ts`
```typescript
export function readMcpServers(scope: 'global' | 'project', projectPath?: string): McpServerConfig[]
export function writeMcpServer(name: string, config: McpServerConfig, scope: string): void
export function deleteMcpServer(name: string, scope: string): void
export function testMcpServer(config: McpServerConfig): Promise<{ tools: string[], error?: string }>

interface McpServerConfig {
  command: string
  args?: string[]
  env?: Record<string, string>
  type?: 'stdio' | 'sse'
}
```

**IPC handlers to add:**
```
mcp:list   [scope, projectPath?]         → {name, config}[]
mcp:add    [[name, config, scope]]       → void
mcp:update [[name, config, scope]]       → void
mcp:delete [[name, scope]]               → void
mcp:test   [McpServerConfig]             → {tools[], error?}
```

---

#### Tab: Permissions

**Purpose:** Configure tool allow/deny lists — maps to `--allowedTools` / `--disallowedTools` defaults.

```
Default Tool Permissions

  ✓ Bash (shell commands)
  ✓ Write (file creation)
  ✓ Edit (file edits)
  ✓ Read (file reads)
  ✓ WebFetch
  ✓ WebSearch
  ✗ mcp__github__create_pull_request   [requires approval]

  [ Allow all ]  [ Deny all ]  [ Reset to defaults ]

Prompt Mode:   [● default] [ acceptEdits] [ bypassPermissions] [ plan]
```

Stored in `AppSettings` and applied when spawning agents via `--allowedTools Bash,Write,Edit`.

---

#### Tab: Environment Variables

**Purpose:** Set env vars passed to every Claude CLI invocation.

```
Environment Variables (passed to all Claude agents)

  ANTHROPIC_API_KEY  ●●●●●●●●●●●●●●●●  [Edit] [Delete]
  GITHUB_TOKEN       ●●●●●●●●●●●●       [Edit] [Delete]

  [+ Add Variable]

Note: Variables stored encrypted in SQLite, passed via env to node-pty.
```

Stored in new `env_vars` table (key, value encrypted with `safeStorage.encryptString()`).

---

## Phase B — Agent Terminal Enhancements (Priority 2)

### Slash Command Toolbar

**File:** `src/components/agents/AgentTerminal.tsx`

Add a toolbar above the xterm.js terminal with buttons that inject slash commands:

```
┌─────────────────────────────────────────────────────────────┐
│ [/clear] [/compact] [/cost] [/memory] [⌨ custom...]        │
│ Model: [Sonnet ▼]  Session: abc123  Turns: 4  Cost: $0.03   │
├─────────────────────────────────────────────────────────────┤
│  xterm.js terminal output                                    │
│                                                              │
│  $ claude --model claude-sonnet-4-6 -p "..."                 │
│  > Working on task...                                        │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

Each button calls `window.api.agents.sendInput(agentId, '/clear\n')`.

**Slash commands to expose as buttons:**

| Button | Command | Effect |
|---|---|---|
| /clear | `/clear` | Clear context, start fresh |
| /compact | `/compact [instructions]` | Compress conversation |
| /cost | `/cost` | Show token/cost for session |
| /memory | `/memory` | View CLAUDE.md and memory files |
| /mcp | `/mcp` | List connected MCP servers + status |
| /status | `/status` | Show current session status |
| /help | `/help` | Show help in terminal |
| /doctor | `/doctor` | Environment diagnostic |

**Custom command input:** text field to type any slash command or text, `Enter` sends it.

### Session Info Bar

Above the toolbar, show live session metadata parsed from stream-json events:

```typescript
// Parse from stream-json output
interface SessionInfo {
  sessionId: string       // from message_start.session_id
  model: string           // from message_start.model
  turnCount: number       // count message_start events
  inputTokens: number     // sum of usage.input_tokens
  outputTokens: number    // sum of usage.output_tokens
  estimatedCost: number   // computed from token counts + model pricing
}
```

**stream-json events to parse (enhance agent-manager.ts):**

```typescript
// electron/core/agent-manager.ts — enhance handleOutput()
function parseStreamEvent(line: string): StreamEvent | null {
  try {
    const event = JSON.parse(line)
    return event  // { type, ... }
  } catch { return null }
}

// Events to handle:
// message_start      → extract session_id, model, input_tokens
// content_block_delta → text to display
// tool_use           → show tool name in status bar
// tool_result        → show result summary
// message_delta      → extract output_tokens, stop_reason
// message_stop       → session complete
```

Emit enriched events to renderer:
```typescript
sendToRenderer('agent:stream-event', { agentId: id, event })
```

### Model Switcher

Dropdown in terminal toolbar to change the model for the next run:
- Sonnet 4.6 (`claude-sonnet-4-6`)
- Opus 4.6 (`claude-opus-4-6`)
- Haiku 4.5 (`claude-haiku-4-5-20251001`)

### Agent Launch Modal Enhancements

**File:** `src/components/agents/NewAgentModal.tsx`

Add advanced options (collapsible "Advanced" section):

```
Name:             [my-agent______________]
Project path:     [/path/to/project] [Browse]
Model:            [● Sonnet 4.6] [Opus 4.6] [Haiku 4.5]
Initial prompt:   [____________________________]

▶ Advanced Options
  Output format:    [● stream-json] [json] [text]
  Max turns:        [____10____]
  Working dirs:     [+ Add directory] (--add-dir)
  System prompt:    [textarea] or [file picker]
  Allowed tools:    [multi-select checklist]
  Disallowed tools: [multi-select checklist]
  Resume session:   [session ID or dropdown of recent]
  Worktree:         [toggle] Create isolated git worktree
  Verbose:          [toggle] --verbose flag
  Skip permissions: [toggle] --dangerously-skip-permissions

  [Cancel] [Launch Agent]
```

---

## Phase C — Sessions Browser (Priority 3)

### File: `src/app/agents/sessions/page.tsx`

**Purpose:** Browse all past Claude CLI sessions, resume them, view cost breakdown.

Claude CLI stores sessions in `~/.claude/projects/<path-hash>/` as JSONL files.

```
┌─────────────────────────────────────────────────────────────┐
│ Sessions                                    [🔍 Search]      │
├──────────────┬────────────┬───────────┬────────────┬────────┤
│ Session ID   │ Project    │ Date      │ Turns/Cost │ Action │
├──────────────┼────────────┼───────────┼────────────┼────────┤
│ abc123...    │ my-app     │ Today     │ 12 / $0.04 │Resume  │
│ def456...    │ backend    │ Yesterday │ 5 / $0.01  │Resume  │
│ ghi789...    │ my-app     │ 3 days ago│ 23 / $0.09 │Resume  │
└──────────────┴────────────┴───────────┴────────────┴────────┘

Selected Session: abc123...
  Project: /Users/me/my-app
  Started: 2026-03-08 14:32
  Model:   claude-sonnet-4-6
  Turns:   12 turns
  Cost:    $0.04 (45K input + 12K output tokens)

  [View Transcript] [Resume in New Agent] [Delete]
```

**Electron service:** `electron/services/session-reader.ts`

```typescript
import * as fs from 'fs'
import * as path from 'path'
import * as os from 'os'

const CLAUDE_PROJECTS_DIR = path.join(os.homedir(), '.claude', 'projects')

export interface SessionSummary {
  sessionId: string
  projectPathHash: string
  projectPath?: string   // resolved from hash
  filePath: string
  mtime: Date
  turnCount: number
  inputTokens: number
  outputTokens: number
  model: string
  estimatedCost: number
}

export function listSessions(): SessionSummary[]
export function readSession(filePath: string): SessionEntry[]
export function resolveProjectPath(hash: string): string | undefined

// Resume: pass --resume <sessionId> to Claude CLI
export function resumeSession(agentId: string, sessionId: string, settings: AppSettings): void
```

**IPC handlers to add:**
```
sessions:list    []              → SessionSummary[]
sessions:read    [filePath]      → SessionEntry[]
sessions:resume  [[agentId, sessionId]] → void
sessions:delete  [filePath]     → void
```

---

## Phase D — Skills Manager (Priority 4)

### File: `src/app/skills/page.tsx`

**Purpose:** Create and manage Claude Code skills (reusable prompt templates stored in `~/.claude/commands/`).

```
┌─────────────────────────────────────────────────────────────┐
│ Skills                                     [+ New Skill]     │
├──────────────────┬──────────────────────────────────────────┤
│ Skill List       │  Skill: /commit                          │
│                  │                                          │
│ Global Skills    │  File: ~/.claude/commands/commit.md      │
│  /commit         │  Scope: Global                           │
│  /review-pr      │                                          │
│  /test           │  Content:                                │
│                  │  ┌──────────────────────────────────────┐│
│ Project Skills   │  │Create a git commit with a clear      ││
│  /deploy         │  │commit message. Follow conventional   ││
│  /rollback       │  │commits format: type(scope): desc     ││
│                  │  │                                      ││
│                  │  │$ARGUMENTS                            ││
│                  │  └──────────────────────────────────────┘│
│                  │  [Edit] [Delete] [Use in Agent]           │
└──────────────────┴──────────────────────────────────────────┘
```

**Skill file format** (markdown stored in `~/.claude/commands/<name>.md`):
```markdown
Create a git commit message following conventional commits.

Analyze the staged changes with `git diff --cached`, then:
1. Identify the change type (feat/fix/refactor/docs/test/chore)
2. Write a concise subject line (max 72 chars)
3. Add body if changes are complex

$ARGUMENTS
```

**Electron service:** `electron/services/skills-manager.ts`

```typescript
const GLOBAL_SKILLS_DIR = path.join(os.homedir(), '.claude', 'commands')

export function listSkills(projectPath?: string): Skill[]
export function readSkill(name: string, scope: 'global' | 'project', projectPath?: string): string
export function writeSkill(name: string, content: string, scope: 'global' | 'project', projectPath?: string): void
export function deleteSkill(name: string, scope: 'global' | 'project', projectPath?: string): void

interface Skill {
  name: string             // filename without .md
  content: string
  scope: 'global' | 'project'
  projectPath?: string
}
```

**IPC handlers to add:**
```
skills:list    [projectPath?]           → Skill[]
skills:get     [[name, scope, projectPath?]] → string
skills:create  [[name, content, scope, projectPath?]] → Skill
skills:update  [[name, content, scope, projectPath?]] → Skill
skills:delete  [[name, scope, projectPath?]] → void
```

**Use in Agent**: button that pre-fills agent prompt with `/<skill-name> ` prefix.

---

## Phase E — Memory Manager (Priority 5)

### File: `src/app/memory/page.tsx`

**Purpose:** View and edit `CLAUDE.md` (global and per-project) and `.claude/memory/` files.

```
┌─────────────────────────────────────────────────────────────┐
│ Memory                                                       │
├──────────────────┬──────────────────────────────────────────┤
│ Files            │  CLAUDE.md — Global                      │
│                  │                                          │
│ ▼ Global         │  [Edit] [Preview]                        │
│   CLAUDE.md      │  ┌──────────────────────────────────────┐│
│   memory/        │  │# Project Memory                      ││
│     arch.md      │  │                                      ││
│     bugs.md      │  │## Stack                              ││
│     patterns.md  │  │- Next.js + TypeScript + Electron     ││
│                  │  │                                      ││
│ ▼ Projects       │  │## Key Commands                       ││
│   my-app/        │  │```bash                               ││
│     CLAUDE.md    │  │npm run electron:dev                  ││
│     memory/      │  │```                                   ││
│                  │  └──────────────────────────────────────┘│
│ [+ New File]     │  [Save]                                  │
└──────────────────┴──────────────────────────────────────────┘
```

**Electron service:** `electron/services/memory-manager.ts`

```typescript
export interface MemoryFile {
  path: string          // absolute path
  name: string          // display name
  scope: 'global' | 'project'
  projectPath?: string
  content: string
  mtime: Date
}

export function listMemoryFiles(projectPaths?: string[]): MemoryFile[]
export function readMemoryFile(filePath: string): string
export function writeMemoryFile(filePath: string, content: string): void
export function deleteMemoryFile(filePath: string): void
```

**IPC handlers to add:**
```
memory:list    [projectPaths?]     → MemoryFile[]
memory:read    [filePath]          → string
memory:write   [[filePath, content]] → void
memory:delete  [filePath]          → void
```

---

## Phase F — Enhanced Usage Page (Priority 6)

### File: `src/app/usage/page.tsx` (enhance existing)

Add session-level cost breakdown and Claude Code-specific metrics:

```
┌──────────┬──────────┬──────────┬──────────┬──────────────┐
│ All Time  │ Today    │ Runs     │ Sessions │ Est. Cost     │
│ 1.2M tok  │ 45K tok  │ 234      │ 89       │ $3.60 total   │
└──────────┴──────────┴──────────┴──────────┴──────────────┘

Cost by Model
  claude-sonnet-4-6  ████████████ 450K tok  $1.35
  claude-opus-4-6    ████████     300K tok  $1.50
  claude-haiku-4-5   ████         150K tok  $0.02

Recent Sessions (cost per session)
  abc123  my-app      Today      45K tok  $0.14
  def456  backend     Yesterday  23K tok  $0.07

Pricing reference (used for estimates):
  Sonnet 4.6:  input $3/M, output $15/M
  Opus 4.6:    input $15/M, output $75/M
  Haiku 4.5:   input $0.25/M, output $1.25/M
```

---

## Phase G — Keyboard Shortcut Overlay (Low Priority)

### File: `src/components/ui/KeyboardShortcuts.tsx`

Show an overlay (Cmd+? or F1) listing all keyboard shortcuts:

```
┌─────────────────────────────────────────────────────────────┐
│ Keyboard Shortcuts                                    [✕]    │
├─────────────────────────────────────────────────────────────┤
│ Agent Terminal                                               │
│   Enter            Send message                             │
│   Ctrl+C           Interrupt agent                          │
│   Ctrl+Z           Pause agent                              │
│   Esc              Cancel current operation                 │
│                                                             │
│ UI Navigation                                               │
│   Cmd+1..9         Switch to page by number                 │
│   Cmd+K            Open command palette                     │
│   Cmd+?            Show this help                           │
│                                                             │
│ Claude Code Slash Commands (in terminal)                    │
│   /clear           Clear context                            │
│   /compact         Compress conversation                    │
│   /cost            Show session cost                        │
│   /memory          View memory files                        │
│   /mcp             List MCP servers                         │
│   /help            Show Claude help                         │
└─────────────────────────────────────────────────────────────┘
```

Triggered by Electron global shortcut: `globalShortcut.register('CommandOrControl+?', showHelp)`.

---

## Phase H — Command Palette (Low Priority)

### File: `src/components/ui/CommandPalette.tsx`

**Trigger:** `Cmd+K` anywhere in the app.

```
┌─────────────────────────────────────────────────────────────┐
│ > ___________________________________                        │
├─────────────────────────────────────────────────────────────┤
│ Actions                                                      │
│   ⚡ New Agent              Start a new Claude agent        │
│   📋 New Task               Create a task                   │
│   🔍 Search Vault           Search knowledge base           │
│   ⚙ Open Settings          Configure the app               │
│   💾 View Sessions          Browse past sessions            │
│                                                             │
│ Recent                                                      │
│   📄 Task: Implement login page                             │
│   🤖 Agent: coding-agent (running)                          │
│   📁 Project: my-app                                        │
└─────────────────────────────────────────────────────────────┘
```

---

## New Electron Files to Create

| File | Purpose |
|---|---|
| `electron/services/hooks-manager.ts` | Read/write hook configs in `~/.claude/settings.json` |
| `electron/services/mcp-manager.ts` | Read/write MCP server configs |
| `electron/services/skills-manager.ts` | CRUD for `~/.claude/commands/*.md` |
| `electron/services/memory-manager.ts` | CRUD for `CLAUDE.md` and `.claude/memory/` |
| `electron/services/session-reader.ts` | List/read `~/.claude/projects/*/` JSONL files |
| `electron/services/env-manager.ts` | Encrypted env vars storage |

## New IPC Channels to Add

Add to `electron/handlers/ipc-handlers.ts` and `electron/preload.ts`:

```typescript
// Hooks
'hooks:list'    'hooks:create'    'hooks:update'    'hooks:delete'    'hooks:test'

// MCP
'mcp:list'      'mcp:add'         'mcp:update'      'mcp:delete'      'mcp:test'

// Skills
'skills:list'   'skills:get'      'skills:create'   'skills:update'   'skills:delete'

// Memory
'memory:list'   'memory:read'     'memory:write'    'memory:delete'

// Sessions
'sessions:list' 'sessions:read'   'sessions:resume' 'sessions:delete'

// Stream events (emit only, no handlers)
'agent:stream-event'  // { agentId, event: StreamEvent }
```

## New Frontend Pages and Components

| Path | Component | Phase |
|---|---|---|
| `/settings?tab=hooks` | `HooksManager.tsx` | A |
| `/settings?tab=mcp` | `McpManager.tsx` | A |
| `/settings?tab=permissions` | `PermissionsManager.tsx` | A |
| `/settings?tab=env` | `EnvManager.tsx` | A |
| `/agents/sessions` | `SessionsBrowser.tsx` | C |
| `/skills` | `SkillsPage.tsx` | D |
| `/memory` | `MemoryPage.tsx` | E |
| `AgentTerminal.tsx` (enhance) | Toolbar + session info bar | B |
| `NewAgentModal.tsx` (enhance) | Advanced options panel | B |
| `KeyboardShortcuts.tsx` | Overlay modal | G |
| `CommandPalette.tsx` | Cmd+K overlay | H |

## Navigation Updates

Add to `src/components/ui/Nav.tsx`:

```
─── Existing ───────────────────────────────────────────
  Extract | Tasks | Dashboard | Projects

─── New ─────────────────────────────────────────────────
  Agents | Kanban | Vault | Sessions | Skills | Memory

─── Tools ───────────────────────────────────────────────
  Automations | Scheduled | Usage | Settings
```

## Implementation Order

```
Priority 1 (unblocks everything):
  A. Settings page with all tabs
     → Claude path, hooks manager, MCP manager, permissions, env vars

Priority 2 (core CLI feature exposure):
  B. Agent Terminal enhancements
     → Slash command toolbar, session info bar, stream-json parsing
     → Agent Launch Modal advanced options (all CLI flags)

Priority 3 (session management):
  C. Sessions Browser
     → List past sessions, resume with --resume <sessionId>

Priority 4 (knowledge management):
  D. Skills Manager (read/write ~/.claude/commands/)
  E. Memory Manager (read/write CLAUDE.md, .claude/memory/)

Priority 5 (polish):
  F. Usage page enhancements (cost per model/session)
  G. Keyboard shortcut overlay
  H. Command palette (Cmd+K)
```

## stream-json Enhancement for agent-manager.ts

The current `handleOutput()` just buffers text. Enhance to parse stream-json events:

```typescript
// electron/core/agent-manager.ts

function handleOutput(id: string, data: string): void {
  const agent = agents.get(id)
  if (!agent) return

  // Buffer raw output (existing behavior)
  agent.outputBuffer.push(...data.split('\n'))
  if (agent.outputBuffer.length > 2000) agent.outputBuffer.splice(0, agent.outputBuffer.length - 2000)

  // NEW: Parse stream-json events line by line
  for (const line of data.split('\n')) {
    if (!line.trim()) continue
    try {
      const event = JSON.parse(line) as StreamEvent
      handleStreamEvent(id, event)
    } catch { /* raw text line, not JSON */ }
  }

  // Existing status detection
  detectStatus(id, data)

  // Emit raw output for xterm.js
  sendToRenderer('agent:output', { id, data })
}

function handleStreamEvent(id: string, event: StreamEvent): void {
  // Emit to renderer for session info bar
  sendToRenderer('agent:stream-event', { id, event })

  // Persist token usage
  if (event.type === 'message_start') {
    updateAgentTokens(id, event.message.usage.input_tokens, 0)
  }
  if (event.type === 'message_delta') {
    updateAgentTokens(id, 0, event.usage.output_tokens)
  }
  if (event.type === 'tool_use') {
    sendToRenderer('agent:tool-use', { id, tool: event.name, input: event.input })
  }
}

type StreamEvent =
  | { type: 'message_start'; message: { id: string; model: string; usage: { input_tokens: number } } }
  | { type: 'content_block_delta'; delta: { type: 'text_delta'; text: string } }
  | { type: 'tool_use'; id: string; name: string; input: Record<string, unknown> }
  | { type: 'tool_result'; tool_use_id: string; content: string }
  | { type: 'message_delta'; usage: { output_tokens: number }; delta: { stop_reason: string } }
  | { type: 'message_stop' }
```

---

## Scope Summary

| Category | New Files | New IPC Channels |
|---|---|---|
| Settings tabs | 4 components + 2 services | 10 channels |
| Terminal enhancements | 1 component update | 2 new events |
| Sessions Browser | 1 page + 1 service | 4 channels |
| Skills Manager | 1 page + 1 service | 5 channels |
| Memory Manager | 1 page + 1 service | 4 channels |
| Usage enhancements | 1 page update | 0 |
| Keyboard/Palette | 2 components | 0 |
| **Total** | **~15 new, 3 updated** | **25 new** |
