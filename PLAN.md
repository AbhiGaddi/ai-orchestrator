# Flow — Migration Plan & Design

> Transforming a web-based AI orchestrator into a Dorothy-style Electron desktop app
> with parallel Claude CLI agents, Kanban, Vault, Automations, Telegram/Slack remote control.

---

## Current State (Phase 0 — DONE)

### What exists

```
frontend/
├── electron/                    ✅ Electron main process
│   ├── main.ts                  ✅ BrowserWindow, app lifecycle
│   ├── preload.ts               ✅ contextBridge → window.api
│   ├── types.ts                 ✅ All domain interfaces
│   ├── db/database.ts           ✅ SQLite schema (12 tables)
│   ├── core/agent-manager.ts    ✅ node-pty Claude CLI spawner
│   ├── core/pty-manager.ts      ✅ PTY session multiplexer
│   └── handlers/ipc-handlers.ts ✅ 50+ IPC handlers (all domains)
├── src/
│   ├── lib/ipc.ts               ✅ Typed window.api client
│   ├── lib/api.ts               ✅ All calls routed through IPC
│   └── types/index.ts           ✅ Updated + legacy compat fields
├── dist-electron/               ✅ Compiled Electron JS
├── tsconfig.electron.json       ✅ Separate TS config for Electron
└── package.json                 ✅ All deps installed, electron:dev script
```

### What the app does today
- All existing pages (extract, tasks, projects, dashboard) compile with zero TS errors
- IPC handlers are registered for every domain (projects, tasks, agents, kanban, vault, automations, scheduled tasks, settings, usage)
- SQLite database initializes with full schema on first launch
- Claude CLI agent spawning is wired (node-pty) — untested end-to-end
- FastAPI backend is **retired** — all data goes through SQLite

### How to start dev
```bash
cd frontend
npm run electron:dev
# Starts: Next.js dev server (port 3000) + tsc --watch + Electron
```

---

## What Still Needs to Be Done

---

## Phase 1 — Smoke Test & Fix Existing Pages (1–2 days)

**Goal:** Launch `npm run electron:dev` and have all existing pages work correctly inside Electron.

### Tasks

#### 1.1 Verify Electron launches
- [ ] Run `npm run electron:dev` — confirm BrowserWindow opens and loads `localhost:3000`
- [ ] Check DevTools console for errors
- [ ] Confirm `window.api` is available in renderer (`console.log(window.api)`)

#### 1.2 Seed test data
The SQLite DB is empty on first run. Add a seed script to insert sample data:

**File to create:** `electron/db/seed.ts`
```
- 1 sample project (name, github_repos)
- 3 sample tasks (PENDING, APPROVED, IN_PROGRESS)
- 2 sample agent runs
```

#### 1.3 Fix any IPC issues in existing pages
Each page currently calls `ipc.*` but the data flow hasn't been tested end-to-end.

| Page | IPC calls used | Expected behavior |
|---|---|---|
| `/extract` | `tasks.extract()`, `projects.list()` | Paste transcript → creates tasks in SQLite |
| `/tasks` | `tasks.list()`, `tasks.approve()`, `tasks.reject()`, `tasks.delete()` | Shows task list from SQLite |
| `/tasks/[id]` | `tasks.get()`, `agentRuns.list()`, `tasks.execute()` | Task detail + run history |
| `/projects` | `projects.list()`, `projects.create()` | Project list from SQLite |
| `/projects/[id]` | `projects.get()`, `tasks.list()` | Project detail |
| `/dashboard` | `agentRuns.list()`, `tasks.list()` | Agent run monitor |

#### 1.4 Fix extract page — connect to Claude CLI
Currently `tasks:extract` uses `execSync` to call `claude --print -p "..."`. Needs:
- Settings page must exist first (to configure `claude` path)
- Fallback: if Claude not found, show "Configure Claude path in Settings"

**File to update:** `electron/handlers/ipc-handlers.ts` → `tasks:extract` handler

---

## Phase 2 — New Feature Pages (5–7 days)

### 2.1 Agents Page `/agents`

**Purpose:** View and manage all Claude CLI agents running in parallel.

**File to create:** `src/app/agents/page.tsx`

#### Layout
```
┌─────────────────────────────────────────────────────────┐
│  Agents                              [+ New Agent]       │
├──────────────┬──────────────┬──────────────┬────────────┤
│  Agent Card  │  Agent Card  │  Agent Card  │  ...       │
│  name        │  name        │  name        │            │
│  ● running   │  ○ idle      │  ✓ done      │            │
│  model: son  │  model: opus │  model: son  │            │
│  [Stop][Log] │  [Start]     │  [Remove]    │            │
└──────────────┴──────────────┴──────────────┴────────────┘
│  Terminal Output (xterm.js — active agent)               │
└─────────────────────────────────────────────────────────┘
```

#### Components to create
- `src/components/agents/AgentCard.tsx` — status badge, model label, start/stop/remove buttons
- `src/components/agents/AgentTerminal.tsx` — xterm.js terminal, receives `agent:output` IPC events
- `src/components/agents/NewAgentModal.tsx` — form: name, project path (folder picker), model selector, skills

#### IPC events to handle (renderer subscribes)
```typescript
window.api.on('agent:output', ({ id, data }) => { terminal.write(data) })
window.api.on('agent:status', ({ id, status }) => { updateAgentCard(id, status) })
```

#### State management
Create `src/store/agents.ts` (Zustand):
```typescript
interface AgentsStore {
  agents: Agent[]
  activeAgentId: string | null
  load: () => Promise<void>
  setActive: (id: string) => void
}
```

#### xterm.js integration
```typescript
// src/components/agents/AgentTerminal.tsx
import { Terminal } from '@xterm/xterm'
import { FitAddon } from '@xterm/addon-fit'
import '@xterm/xterm/css/xterm.css'

// Mount terminal → subscribe to IPC → write chunks
// User input → window.api.agents.sendInput(agentId, text)
```

---

### 2.2 Kanban Board `/kanban`

**Purpose:** Drag-and-drop task board. `backlog → planned → ongoing → done`.

**File to create:** `src/app/kanban/page.tsx`

#### Layout
```
┌──────────┬──────────┬──────────┬──────────┐
│ BACKLOG  │ PLANNED  │ ONGOING  │   DONE   │
│  (3)     │  (1)     │  (2)     │  (5)     │
├──────────┼──────────┼──────────┼──────────┤
│ ┌──────┐ │ ┌──────┐ │ ┌──────┐ │ ┌──────┐ │
│ │Task A│ │ │Task B│ │ │Task C│ │ │Task D│ │
│ │HIGH  │ │ │MED   │ │ │LOW   │ │ │DONE  │ │
│ │──────│ │ └──────┘ │ │▓▓░░  │ │ └──────┘ │
│ │drag↕ │ │          │ │ 60%  │ │          │
│ └──────┘ │          │ └──────┘ │          │
└──────────┴──────────┴──────────┴──────────┘
```

#### Components to create
- `src/components/kanban/KanbanBoard.tsx` — DndContext wrapper, 4 columns
- `src/components/kanban/KanbanColumn.tsx` — SortableContext, droppable area, column header
- `src/components/kanban/KanbanCard.tsx` — useSortable, priority badge, progress bar, agent avatar
- `src/components/kanban/NewTaskModal.tsx` — create task form

#### Drag-and-drop logic
```typescript
// Uses @dnd-kit/core
import { DndContext, DragEndEvent } from '@dnd-kit/core'

function onDragEnd(event: DragEndEvent) {
  const { active, over } = event
  if (over && active.id !== over.id) {
    window.api.kanban.move(active.id as string, over.id as KanbanColumn)
  }
}
```

#### Auto-assignment feature
When a task moves to `ongoing`, offer to assign to an available idle agent:
- Show agent picker dropdown on the card
- Call `window.api.kanban.assign(taskId, agentId)`
- Optionally auto-start the agent with the task description as prompt

---

### 2.3 Vault `/vault`

**Purpose:** Shared markdown knowledge base. Agents can read/write docs. Humans can browse.

**File to create:** `src/app/vault/page.tsx`

#### Layout
```
┌──────────────┬──────────────────────────────────────────┐
│ Folders      │  Document Title                          │
│              │                                          │
│ ▼ Research   │  [Edit] [Delete]          tags: [ai][ml]│
│   ├ Notes    │  ─────────────────────────────────────── │
│   └ Reports  │  # Document content (markdown rendered)  │
│ ▶ Code       │                                          │
│ ▶ Decisions  │  ...                                     │
│              │                                          │
│ [+ Folder]   │                                          │
├──────────────┤  ┌─────────────────────────────────────┐ │
│ 🔍 Search    │  │ Search results...                   │ │
│ ____________ │  └─────────────────────────────────────┘ │
└──────────────┴──────────────────────────────────────────┘
```

#### Components to create
- `src/components/vault/FolderTree.tsx` — recursive folder tree with expand/collapse
- `src/components/vault/DocumentEditor.tsx` — textarea for markdown editing + preview toggle
- `src/components/vault/VaultSearch.tsx` — search input → calls `vault.search(query)` (SQLite FTS5)
- `src/components/vault/NewDocumentModal.tsx` — title, folder, tags, initial content

#### Key behavior
- Full-text search powered by SQLite FTS5 (already set up in `database.ts`)
- Tags rendered as chips: `['ai', 'research']`
- Documents editable inline (not a separate edit page)

---

### 2.4 Scheduled Tasks `/scheduled-tasks`

**Purpose:** Cron-based recurring Claude agent runs.

**File to create:** `src/app/scheduled-tasks/page.tsx`

#### Layout
```
┌────────────────────────────────────────────────────────┐
│ Scheduled Tasks                     [+ New Schedule]   │
├────────┬──────────────┬────────────┬────────┬──────────┤
│ Name   │ Schedule     │ Last Run   │ Status │ Actions  │
├────────┼──────────────┼────────────┼────────┼──────────┤
│ Daily  │ 0 9 * * *   │ 2h ago     │ ● ON   │ ▶ ✕ 🗑  │
│ Review │ Every day    │ Success    │        │          │
├────────┼──────────────┼────────────┼────────┼──────────┤
│ Weekly │ 0 9 * * 1   │ 3d ago     │ ○ OFF  │ ▶ ✕ 🗑  │
└────────┴──────────────┴────────────┴────────┴──────────┘
```

#### Electron service to create
**File:** `electron/services/scheduler.ts`

Uses `node-cron` to register jobs dynamically:
```typescript
import cron from 'node-cron'

const jobs = new Map<string, cron.ScheduledTask>()

export function scheduleTask(task: ScheduledTask, settings: AppSettings): void {
  const job = cron.schedule(task.schedule_cron, () => {
    const agent = createAgent({ projectPath: task.project_path, model: task.model })
    startAgent(agent.id, task.prompt, task.model, settings, getMainWindow())
    // Update last_run in DB
  }, { scheduled: task.enabled })
  jobs.set(task.id, job)
}
```

Called from `electron/main.ts` on startup:
```typescript
// After initDatabase() and loadAgents():
loadScheduledTasks().forEach(t => scheduleTask(t, getSettings()))
```

#### Components to create
- `src/components/scheduled/NewScheduleModal.tsx` — prompt textarea, cron picker, project path, model
- `src/components/scheduled/CronHelper.tsx` — visual cron expression builder with presets

---

### 2.5 Automations `/automations`

**Purpose:** Poll GitHub PRs/issues (and JIRA) → spawn agents automatically per item.

**File to create:** `src/app/automations/page.tsx`

#### Layout
```
┌─────────────────────────────────────────────────────────┐
│ Automations                           [+ New Automation] │
├────────────────────────────────────────────────────────┬┤
│ ● PR Reviewer        GitHub · every 15m · Enabled      ││
│  repos: myorg/myrepo                 Last run: 5m ago   ││
│  3 items processed today             [Run Now] [Edit]   ││
├────────────────────────────────────────────────────────┼┤
│ ○ JIRA Bug Handler   JIRA · every 5m · Disabled        ││
│  project: PROJ-*                     Never run          ││
└────────────────────────────────────────────────────────┴┘
```

#### Electron service to create
**File:** `electron/services/automation.ts`

Core polling loop:
```typescript
// GitHub source
async function pollGitHub(auto: Automation): Promise<void> {
  const config = auto.source_config  // { repos: string[], pollFor: string[] }
  for (const repo of config.repos) {
    const items = await fetchGitHubItems(repo, config.pollFor)
    for (const item of items) {
      const hash = hashItem(item)
      if (alreadyProcessed(auto.id, hash)) continue
      const prompt = interpolateTemplate(auto.agent_prompt, item)
      const agent = createAgent({ projectPath: auto.agent_project_path })
      startAgent(agent.id, prompt, auto.agent_model, getSettings(), getMainWindow())
      markProcessed(auto.id, hash)
    }
  }
}

// Template variable interpolation
function interpolateTemplate(template: string, item: GitHubItem): string {
  return template
    .replace('{{title}}', item.title)
    .replace('{{body}}', item.body)
    .replace('{{url}}', item.url)
    .replace('{{author}}', item.author)
    .replace('{{number}}', String(item.number))
    .replace('{{repo}}', item.repo)
}
```

Uses `gh` CLI for GitHub (already on most machines):
```typescript
const { stdout } = await exec(`gh pr list --repo ${repo} --json number,title,body,author,url`)
```

Scheduled via `node-cron` (same scheduler as scheduled tasks):
```typescript
cron.schedule(`*/${auto.schedule_minutes} * * * *`, () => pollGitHub(auto))
```

#### Components to create
- `src/components/automations/NewAutomationModal.tsx` — multi-step form:
  - Step 1: Name + source type (GitHub/JIRA)
  - Step 2: Source config (repos, poll for, schedule)
  - Step 3: Agent config (prompt template with `{{variable}}` hints, model, project path)
  - Step 4: Output config (GitHub comment, Slack, Telegram)
- `src/components/automations/AutomationCard.tsx` — status, last run, item count, run-now button
- `src/components/automations/AutomationLogs.tsx` — expandable run history

---

### 2.6 Settings `/settings`

**Purpose:** Configure Claude CLI path, default model, Telegram/Slack tokens, notification prefs.

**File to create:** `src/app/settings/page.tsx`

#### Sections

**Claude CLI**
```
Claude binary path:  [claude________________] [Browse] [Test]
Default model:       [● Sonnet] [ Opus] [ Haiku]
Skip permissions:    [✓] (--dangerously-skip-permissions)
```

**Telegram**
```
Bot Token:           [____________________________] [Save]
Enable Telegram:     [toggle]
Registered Chat IDs: [list of chat IDs]
Status:              ✓ Connected / ✗ Not configured
```

**Slack**
```
Bot Token (xoxb-): [____________________________]
App Token (xapp-): [____________________________]
Enable Slack:      [toggle]
```

**Notifications**
```
Notify on agent complete  [toggle]
Notify on agent error     [toggle]
Notify on agent waiting   [toggle]
```

#### IPC calls
```typescript
const settings = await window.api.settings.get()
await window.api.settings.update({ claudePath: '/usr/local/bin/claude', ... })
```

---

### 2.7 Usage Stats `/usage`

**Purpose:** Token consumption and cost tracking across all agents.

**File to create:** `src/app/usage/page.tsx`

#### Layout
```
┌──────────┬──────────┬──────────┬──────────┐
│ Total    │ Today    │ Runs     │ Est.Cost  │
│ 1.2M tok │ 45K tok  │ 234      │ $3.60     │
└──────────┴──────────┴──────────┴──────────┘

By Agent Type (bar chart)
  CodeAgent    ████████████ 450K
  Discussion   ████████ 300K
  TicketAgent  ████ 150K

By Project (table)
  my-app       320K tokens  45 runs
  backend-api  180K tokens  23 runs
```

#### Components
- Simple bar chart (pure CSS, no chart library needed)
- Token → cost conversion: `input: $3/M, output: $15/M` for Sonnet 4.5

---

## Phase 3 — Remote Control (2–3 days)

### 3.1 Telegram Bot

**File to create:** `electron/services/telegram-bot.ts`

Uses `node-telegram-bot-api`:

```typescript
import TelegramBot from 'node-telegram-bot-api'

let bot: TelegramBot | null = null

export function startTelegramBot(settings: AppSettings): void {
  if (!settings.telegramToken || !settings.telegramEnabled) return
  bot = new TelegramBot(settings.telegramToken, { polling: true })

  bot.onText(/\/status/, async (msg) => {
    const agents = listAgents()
    const text = agents.map(a =>
      `${a.status === 'running' ? '🟢' : '⚪'} ${a.name} — ${a.status}`
    ).join('\n')
    bot!.sendMessage(msg.chat.id, text || 'No agents.')
    // Store chat ID for future push notifications
    addChatId(String(msg.chat.id), settings)
  })

  bot.onText(/\/agents/, (msg) => { /* list agents with tasks */ })
  bot.onText(/\/start_agent (.+)/, (msg, match) => { /* create + start agent */ })
  bot.onText(/\/stop_agent (.+)/, (msg, match) => { /* stop agent by name */ })
  bot.onText(/\/ask (.+)/, (msg, match) => { /* delegate to super agent */ })
  bot.onText(/\/usage/, (msg) => { /* token stats */ })

  // Push notifications: called from agent-manager on status changes
}

export function sendTelegramMessage(text: string): void {
  const chatIds = getSettings().telegramChatIds
  chatIds.forEach(id => bot?.sendMessage(id, text))
}
```

**Wire into `main.ts`:**
```typescript
// After setupIpcHandlers():
import { startTelegramBot } from './services/telegram-bot'
const settings = getSettings()
startTelegramBot(settings)
```

**Wire into `agent-manager.ts`:**
```typescript
// In handleExit():
import { sendTelegramMessage } from '../services/telegram-bot'
if (settings.notifyOnComplete) {
  sendTelegramMessage(`✅ ${agent.name} completed: ${agent.currentTask?.slice(0,50)}`)
}
```

---

### 3.2 Slack Bot

**File to create:** `electron/services/slack-bot.ts`

Uses `@slack/bolt` with Socket Mode (no public URL needed):

```typescript
import { App } from '@slack/bolt'

export function startSlackBot(settings: AppSettings): void {
  if (!settings.slackBotToken || !settings.slackEnabled) return

  const app = new App({
    token: settings.slackBotToken,
    appToken: settings.slackAppToken,
    socketMode: true,
  })

  app.message('status', async ({ say }) => {
    const agents = listAgents()
    await say(agents.map(a => `${a.name}: ${a.status}`).join('\n'))
  })

  app.message('start', async ({ message, say }) => { /* start agent */ })
  app.message('stop', async ({ message, say }) => { /* stop agent */ })

  app.start()
}
```

---

## Phase 4 — MCP Servers (3–5 days)

MCP servers expose app capabilities to Claude CLI agents as tools.
Each MCP server is a standalone Node.js process that communicates via stdio.

### Servers to create

| Server | Directory | Tools | Purpose |
|---|---|---|---|
| `mcp-orchestrator` | `mcp-orchestrator/` | 26+ tools | Agent management, scheduling, automations |
| `mcp-kanban` | `mcp-kanban/` | 8 tools | Kanban CRUD from inside agents |
| `mcp-vault` | `mcp-vault/` | 10 tools | Vault read/write/search from agents |
| `mcp-telegram` | `mcp-telegram/` | 4 tools | Send messages/media to Telegram |

### Architecture
Each MCP server connects to the same SQLite database:
```
Claude Agent (PTY) ←→ stdio ←→ MCP Server ←→ SQLite DB (~/.config/Flow/data/flow.db)
```

### Registration
On first launch, `electron/main.ts` auto-registers all MCP servers in `~/.claude/settings.json`:
```json
{
  "mcpServers": {
    "flow-orchestrator": {
      "command": "/path/to/flow-mcp-orchestrator",
      "type": "stdio"
    },
    "flow-kanban": { "command": "...", "type": "stdio" },
    "flow-vault":  { "command": "...", "type": "stdio" }
  }
}
```

### `mcp-orchestrator` tool list
```
list_agents        get_agent          create_agent
start_agent        stop_agent         remove_agent
wait_for_agent     get_agent_output   send_message
list_scheduled     create_scheduled   delete_scheduled
run_scheduled      list_automations   create_automation
run_automation     send_telegram      send_slack
list_kanban        create_kanban_task move_kanban_task
vault_search       vault_create       vault_get
```

---

## Phase 5 — Build & Distribution (1–2 days)

### 5.1 Production Next.js + Electron

**Problem:** In dev, Electron loads `http://localhost:3000`. In production there's no server.

**Solution:** Use Next.js standalone output mode + run as local server:

```typescript
// next.config.ts
const nextConfig: NextConfig = {
  output: 'standalone',
}
```

**`electron/services/next-server.ts`:**
```typescript
import { spawn } from 'child_process'
import * as path from 'path'

export function startNextServer(): Promise<void> {
  return new Promise((resolve) => {
    const serverPath = path.join(process.resourcesPath, '.next/standalone/server.js')
    const server = spawn(process.execPath, [serverPath], {
      env: { ...process.env, PORT: '3000', HOSTNAME: '127.0.0.1' }
    })
    server.stdout.on('data', (d) => {
      if (d.toString().includes('started server')) resolve()
    })
  })
}
```

### 5.2 electron-builder config (already in package.json)
```json
"build": {
  "appId": "com.sanketika.flow",
  "productName": "Flow",
  "files": ["dist-electron/**", ".next/**", "public/**"],
  "mac":   { "target": ["dmg", "zip"] },
  "linux": { "target": ["AppImage", "deb"] }
}
```

### 5.3 Build command
```bash
npm run electron:build
# Output: release/mac-arm64/Flow.app (macOS)
#         release/linux-unpacked/flow (Linux)
```

---

## Navigation Updates

Add new pages to `src/components/ui/Nav.tsx`:

```
Current nav:  Extract | Tasks | Dashboard | Projects
New nav:      Extract | Tasks | Agents | Kanban | Vault | Automations | Scheduled | Usage | Settings
```

Grouped nav approach (matches Dorothy):
```
[ Extract ]  [ Tasks ]  ──  [ Agents ]  [ Kanban ]  ──  [ Vault ]  [ Automations ]  [ Scheduled ]  ──  [ Usage ]  [ Settings ]
```

---

## Zustand Stores to Create

| Store file | State managed |
|---|---|
| `src/store/agents.ts` | `agents[]`, `activeAgentId`, terminal output buffer |
| `src/store/kanban.ts` | `tasks[]` by column, drag state |
| `src/store/vault.ts` | `folders[]`, `documents[]`, `activeDocId` |
| `src/store/settings.ts` | `AppSettings`, loaded once on mount |
| `src/store/automations.ts` | `automations[]`, `runs[]` |

Pattern for all stores:
```typescript
import { create } from 'zustand'

interface Store { /* state */ }
const useStore = create<Store>((set) => ({
  // initial state + actions that call window.api.*
}))
export default useStore
```

---

## Custom React Hooks to Create

| Hook | Purpose |
|---|---|
| `src/hooks/useIpcEvent.ts` | Subscribe/unsubscribe to IPC events on mount/unmount |
| `src/hooks/useAgentTerminal.ts` | Attach xterm.js to an agent's output stream |
| `src/hooks/useSettings.ts` | Load/update app settings with optimistic updates |

```typescript
// useIpcEvent.ts
export function useIpcEvent(channel: string, callback: (...args: unknown[]) => void) {
  useEffect(() => {
    window.api.on(channel, callback)
    return () => window.api.off(channel, callback)
  }, [channel, callback])
}
```

---

## Implementation Order (Recommended)

```
Week 1
  Day 1-2:  Phase 1  — smoke test, seed data, verify all existing pages
  Day 3-5:  Phase 2a — Settings page (needed before anything else works)
            Phase 2g — Usage page (simple, good warmup)
            Phase 2b — Agents page + xterm.js terminal

Week 2
  Day 1-2:  Phase 2c — Kanban board (dnd-kit)
  Day 3-4:  Phase 2d — Vault (FTS search, markdown editor)
  Day 5:    Phase 2e — Scheduled Tasks

Week 3
  Day 1-3:  Phase 2f — Automations (GitHub polling, template system)
  Day 4-5:  Phase 3  — Telegram + Slack bots

Week 4
  Day 1-3:  Phase 4  — MCP servers (orchestrator + kanban + vault)
  Day 4-5:  Phase 5  — Build pipeline, distribution
```

---

## Key Dependency Chain

```
Settings page
    └── Claude path configured
            └── Agent execution works (extract, execute task)
                    ├── Agents page (real terminal output)
                    ├── Scheduled tasks (uses agent execution)
                    └── Automations (uses agent execution)

Telegram/Slack tokens in Settings
    └── Telegram bot starts
            └── Remote /status, /ask commands work
                    └── Automation output delivery works
```

**Start with Settings** — everything else depends on it.

---

## File Count Summary

| Phase | Files to create | Files to modify |
|---|---|---|
| 0 (done) | 9 | 5 |
| 1 | 1 (seed.ts) | 1 (ipc-handlers.ts) |
| 2 | ~25 (pages + components + stores + hooks) | 1 (Nav.tsx) |
| 3 | 2 (telegram-bot.ts, slack-bot.ts) | 1 (main.ts) |
| 4 | 4 (mcp-* servers) | 1 (main.ts) |
| 5 | 1 (next-server.ts) | 2 (next.config.ts, main.ts) |
| **Total** | **~42 new files** | **~11 modified** |
