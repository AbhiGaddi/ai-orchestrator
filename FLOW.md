# Sanketika — Product Flow & Design

> Core loop: Create task → select profile → click Code → Claude runs locally → review → done.
> This is a local-first AI coding assistant with a task queue, skill marketplace, and notification layer.

---

## Core User Journey

```
1. Create Project  →  link local codebase folder
2. Create Tasks    →  title, description, acceptance criteria
3. Assign Profile  →  pick agent profile (model + skills + plugins)
4. Click ▶ Code    →  Claude CLI runs locally on that folder
5. Track Live      →  stream output, current tool, turn count, cost
6. Review          →  optional: diff viewer before committing changes
7. Notify          →  desktop + Telegram + Slack on complete/error
```

---

## Concepts & Definitions

### Project
A project is a **local codebase folder** + metadata.

```
Project
  ├── name, description
  ├── path: /Users/me/my-app   ← the actual folder on disk
  ├── github_repos: []          ← optional GitHub integration
  ├── CLAUDE.md               ← auto-loaded as context
  └── Tasks[]
```

When Claude runs on a task, it gets:
- `--add-dir /Users/me/my-app` — working directory
- `CLAUDE.md` content injected as system context
- All selected skills appended to the prompt

---

### Task
A unit of work to be done by Claude.

```
Task
  ├── title: "Implement login page"
  ├── description: detailed spec
  ├── acceptance_criteria: "User can log in with email + password"
  ├── priority: LOW | MEDIUM | HIGH | CRITICAL
  ├── status: PENDING → QUEUED → IN_PROGRESS → REVIEW → DONE | FAILED
  ├── assigned_profile: AgentProfile (or null = use default)
  ├── branch_name: auto-generated from title slug
  └── agent_run_id: links to the live execution
```

**Task status flow:**
```
PENDING
  ↓ [▶ Code] clicked
QUEUED  (waiting for concurrency slot)
  ↓ slot available
IN_PROGRESS  (Claude actively working)
  ↓ Claude exits 0
REVIEW  (awaiting human diff review — if review gate enabled)
  ↓ [✓ Accept] or auto-accept
DONE
  ↓ (or if Claude exits non-0)
FAILED → [↩ Retry]
```

---

### Agent Profile
A saved configuration for running Claude — reusable across tasks.

```
AgentProfile
  ├── name: "Frontend Expert"
  ├── model: claude-sonnet-4-6
  ├── skills: [tailwind-components, react-patterns, accessibility]
  ├── plugins: [github-mcp, figma-mcp]
  ├── system_prompt: "You are a senior React developer..."
  ├── max_turns: 20
  ├── allowed_tools: [Bash, Write, Edit, Read, Glob, WebSearch]
  └── skip_permissions: false
```

Built-in default profiles:
- **General** — Sonnet, no skills, all tools
- **Frontend** — Sonnet, tailwind + react skills, figma plugin
- **Backend** — Opus, api + sql skills, github plugin
- **Reviewer** — Haiku, read-only tools, fast/cheap

---

### Skill
A markdown prompt template that guides Claude on a specific topic.
Stored as `~/.claude/commands/<name>.md` or `.claude/commands/<name>.md` per-project.

```markdown
# tailwind-components
You are an expert in Tailwind CSS v4 utility-first patterns.
Always use semantic class names. Avoid inline styles.
Prefer composition over custom CSS.
$ARGUMENTS
```

Skills are injected into the Claude prompt before the task description.
Multiple skills can be selected per task (they stack).

---

### Plugin
An MCP server that extends Claude's tool capabilities.

```
Plugin
  ├── name: "github-mcp"
  ├── description: "Read/write GitHub PRs, issues, repos"
  ├── mcp_command: "npx @modelcontextprotocol/server-github"
  ├── env_vars: { GITHUB_TOKEN: "..." }
  └── tools: [create_pr, list_issues, comment_pr, ...]
```

Plugins are installed into `~/.claude/settings.json` → `mcpServers`.
When a task uses a profile with plugins, those MCPs are active for that Claude session.

---

## UI Pages & Flow

### `/projects` — Project List
```
┌────────────────────────────────────────────────────────────┐
│ Projects                                    [+ New Project] │
├────────────────────────────────────────────────────────────┤
│  my-app          /Users/me/my-app      3 tasks   ● 1 live  │
│  backend-api     /Users/me/backend     7 tasks   ○ idle    │
│  design-system   /Users/me/ds          1 task    ✓ done    │
└────────────────────────────────────────────────────────────┘
```

**New Project modal fields:**
- Name
- Folder path → native folder picker (Electron `dialog.showOpenDialog`)
- Description (optional)
- GitHub repo (optional)

---

### `/projects/[id]` — Project Detail
Main workspace. This is where users spend most time.

```
┌─────────────────────────────────────────────────────────────┐
│ my-app  /Users/me/my-app                   [+ New Task]      │
├───────────────────────────────────────────────────────────── │
│ [All] [Pending] [Running] [Review] [Done]      🔍 search    │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  ● Implement login page               HIGH    IN_PROGRESS   │
│    Frontend Expert · Sonnet 4.6 · Turn 8/20  $0.03         │
│    ████████████░░░░░░ Currently: writing src/auth/login.tsx │
│    [View Output ▼]  [Stop]                                  │
│                                                             │
│  ○ Add password reset flow            MEDIUM  PENDING       │
│    No profile selected                                      │
│    [▶ Code]  [Edit]  [Delete]                               │
│                                                             │
│  ✓ Fix navbar spacing                 LOW     REVIEW        │
│    3 files changed · +45 -12 lines                          │
│    [View Diff]  [✓ Accept]  [✗ Reject]                      │
│                                                             │
│  ✓ Setup ESLint config                LOW     DONE          │
│    Completed 2h ago · 6 turns · $0.01                       │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

---

### Task Card — States

**PENDING state:**
```
○ Add password reset flow            MEDIUM  PENDING
  [▶ Code ▼]  [Edit]  [Delete]
       ↓ dropdown
  [General Profile]
  [Frontend Expert]
  [Backend Expert]
  [+ Use Custom Profile]
```

**IN_PROGRESS state — live view:**
```
● Implement login page               HIGH    IN_PROGRESS
  Frontend Expert · Sonnet 4.6
  Turn 12/20 · $0.04 · 4m 32s elapsed

  Progress:  ████████████████░░░░ 80%
  Doing:     ✎ Editing src/auth/login.tsx

  [▼ View Live Output]
  ┌────────────────────────────────────────────────────────┐
  │ > Creating the login form with Zod validation...       │
  │ ✎ Writing src/auth/login.tsx (148 lines)              │
  │ ✎ Writing src/auth/schemas.ts (24 lines)              │
  │ > Running tests...                                     │
  │ $ npm test src/auth/login.test.tsx                    │
  │   ✓ 3 tests passed                                    │
  └────────────────────────────────────────────────────────┘
  [Stop]  [Send Message ▶]  [/compact]  [/cost]
```

**REVIEW state — diff viewer:**
```
✓ Fix navbar spacing                 LOW     REVIEW
  2 files changed · +45 -12 lines · Claude exited cleanly

  [View Diff]  [✓ Accept & Commit]  [✗ Reject & Retry]

  Expanded diff:
  ┌────────────────────────────────────────────────────────┐
  │ src/components/Nav.tsx                                 │
  │ @@ -12,7 +12,7 @@                                     │
  │ - <nav className="py-2 px-4">                         │
  │ + <nav className="py-3 px-6 gap-4">                   │
  └────────────────────────────────────────────────────────┘
```

---

### New Task Modal

```
┌─────────────────────────────────────────────────────────────┐
│ New Task                                                     │
├─────────────────────────────────────────────────────────────┤
│ Title *                                                      │
│ [Implement login page___________________________________]    │
│                                                             │
│ Description                                                  │
│ [Create a login form with email + password fields.          │
│  Use Zod for validation. Store JWT in httpOnly cookie.      │
│  Redirect to /dashboard on success.____________________]    │
│                                                             │
│ Acceptance Criteria                                          │
│ [- User can log in with valid credentials                   │
│  - Invalid credentials show error message                   │
│  - Session persists across page refresh_________________]   │
│                                                             │
│ Priority:  [ LOW]  [● MEDIUM]  [ HIGH]  [ CRITICAL]        │
│                                                             │
│ Agent Profile:  [Frontend Expert ▼]                         │
│   Model: Sonnet 4.6  Skills: tailwind, react  Plugins: —   │
│   [Manage Profiles]                                         │
│                                                             │
│ Branch name: (auto) implement-login-page                    │
│                                                             │
│              [Cancel]  [Save as Pending]  [▶ Code Now]      │
└─────────────────────────────────────────────────────────────┘
```

---

### Task Queue / Concurrency

When multiple tasks are running:
```
┌─────────────────────────────────────────────────────────────┐
│ Running (2/3 slots)                          Concurrency: 3 │
├─────────────────────────────────────────────────────────────┤
│ ● Implement login page          Turn 8  $0.03   [Stop]      │
│ ● Add payment integration       Turn 3  $0.01   [Stop]      │
├─────────────────────────────────────────────────────────────┤
│ Queued (1)                                                   │
│ ⏳ Fix navbar spacing                              [Remove]  │
└─────────────────────────────────────────────────────────────┘
```

**Settings:** max concurrent Claude sessions (default: 3).
When a slot frees up, the next queued task starts automatically.

---

### `/skills` — Skill Marketplace

```
┌─────────────────────────────────────────────────────────────┐
│ Skills                    [Marketplace]  [+ New Skill]       │
├──────────────┬──────────────────────────────────────────────┤
│ Installed    │  tailwind-components                         │
│  tailwind    │  ─────────────────────────────────────────── │
│  react       │  Guides Claude to use Tailwind v4 utility    │
│  typescript  │  patterns, semantic class composition, and   │
│  api-design  │  avoid inline styles.                        │
│              │                                              │
│ Marketplace  │  Used in: Frontend Expert, 3 tasks          │
│  [Browse]    │  Source: local  Version: —                   │
│              │                                              │
│              │  [Edit Content]  [Delete]                    │
│              │  ────────────────────────────────────────── │
│              │  Content preview:                            │
│              │  You are an expert in Tailwind CSS v4...    │
└──────────────┴──────────────────────────────────────────────┘
```

**Marketplace tab** — skills from a curated GitHub repo:
```
  Skill Marketplace                         🔍 search

  ★ react-patterns      ↓ 2.4k   React best practices + hooks patterns
  ★ typescript-strict   ↓ 1.8k   Strict TS, no any, proper generics
  ★ api-rest-design     ↓ 1.2k   REST API conventions + OpenAPI
  ★ test-driven         ↓ 980    TDD, vitest/jest, 100% coverage mindset
  ★ sql-optimization    ↓ 760    Query optimization, indexes, N+1 fixes
  ★ accessibility       ↓ 650    WCAG 2.1, ARIA, semantic HTML

  [↓ Install] on each card → downloads .md to ~/.claude/commands/
```

Marketplace source: pull from a GitHub repo (`sanketika-ai/skills-marketplace`).
`skills:marketplace:list` IPC → fetches README index → lists available skills.
`skills:marketplace:install [name]` IPC → downloads .md file to `~/.claude/commands/`.

---

### `/plugins` — Plugin Marketplace

```
┌─────────────────────────────────────────────────────────────┐
│ Plugins (MCP Servers)          [Marketplace]  [+ Add Custom] │
├──────────────┬──────────────────────────────────────────────┤
│ Installed    │  github-mcp                     ● Connected  │
│  github      │  ────────────────────────────────────────── │
│  filesystem  │  GitHub integration for Claude agents.       │
│              │  Create PRs, comment issues, list repos.     │
│ Marketplace  │                                              │
│  [Browse]    │  Tools available:                            │
│              │   create_pull_request    list_issues         │
│              │   comment_on_pr         get_file_contents    │
│              │   merge_pull_request    create_branch        │
│              │                                              │
│              │  Config:                                     │
│              │   GITHUB_TOKEN: ●●●●●●●●●● [Edit]           │
│              │                                              │
│              │  [Test Connection]  [Remove]                 │
└──────────────┴──────────────────────────────────────────────┘
```

**Marketplace tab** — curated MCP servers:
```
  Plugin Marketplace                        🔍 search

  ★ github          Create PRs, manage issues, review code
  ★ filesystem      Enhanced file operations with safety
  ★ linear          Sync Linear tickets with tasks
  ★ jira            Sync Jira issues with tasks
  ★ figma           Read Figma designs, extract tokens
  ★ notion          Read/write Notion pages as context
  ★ postgres        Query databases directly
  ★ puppeteer       Browser automation, screenshots
  ★ slack           Post updates, read channel context

  [↓ Install] → runs `npx @modelcontextprotocol/server-<name>`
              → registers in ~/.claude/settings.json
              → prompts for required env vars (GITHUB_TOKEN etc.)
```

---

### `/agents` — Agent Profiles

```
┌─────────────────────────────────────────────────────────────┐
│ Agent Profiles                              [+ New Profile]  │
├──────────────────────────────────────────────────────────────┤
│  ✦ General         Sonnet 4.6   No skills   No plugins      │
│    Default profile for all tasks                            │
│    [Edit]  [Set as Default]                                 │
├──────────────────────────────────────────────────────────────┤
│  Frontend Expert   Sonnet 4.6   tailwind, react   figma     │
│    For UI/component/styling tasks                           │
│    [Edit]  [Duplicate]  [Delete]                            │
├──────────────────────────────────────────────────────────────┤
│  Backend Expert    Opus 4.6     api-design, sql   github    │
│    For API, database, and infrastructure tasks              │
│    [Edit]  [Duplicate]  [Delete]                            │
├──────────────────────────────────────────────────────────────┤
│  Quick Fix         Haiku 4.5    No skills   No plugins      │
│    Fast + cheap for small bug fixes                         │
│    [Edit]  [Duplicate]  [Delete]                            │
└──────────────────────────────────────────────────────────────┘
```

**New/Edit Profile modal:**
```
Name:            [Frontend Expert_________]
Model:           [● Sonnet 4.6] [Opus 4.6] [Haiku 4.5]
Skills:          [✓ tailwind] [✓ react] [ typescript] [ sql]
Plugins:         [✓ figma] [ github] [ linear] [ notion]
System prompt:   [You are a senior React/Next.js developer...]
Max turns:       [20]
Skip permissions:[toggle]
Branch prefix:   [feat/   ] (branch = feat/task-slug)
```

---

### Notifications

**Desktop notifications** (Electron `Notification` API):
```
┌─────────────────────────────────────────────────────────────┐
│ ✅ Task Complete — Sanketika                                 │
│ "Implement login page" finished in 4m 32s                   │
│ 12 turns · $0.04 · 3 files changed                         │
│ [View Changes]  [Start Next Task]                           │
└─────────────────────────────────────────────────────────────┘
```

**Telegram push:**
```
✅ Task complete: Implement login page
Project: my-app | Profile: Frontend Expert
Turns: 12 | Cost: $0.04 | Time: 4m 32s
Files changed: 3

/status — /tasks — /start
```

**Slack message:**
```
✅ *Task Complete* | my-app
> Implement login page
Model: Sonnet 4.6 · 12 turns · $0.04
[View in Sanketika]
```

**Notification triggers (configurable in Settings):**
- Task complete ✅
- Task failed ❌
- Task needs review 👀
- Claude waiting for input ⏸
- Queue empty 🎉

---

## Revised Page Map

```
/                           → redirect to /projects
/projects                   → project list
/projects/new               → new project (folder picker)
/projects/[id]              → project detail + task list  ← MAIN VIEW
/projects/[id]/tasks/new    → new task modal (or inline)
/tasks                      → all tasks across projects (global view)
/tasks/[id]                 → task detail + live output + diff viewer
/agents                     → agent profiles CRUD
/skills                     → skill manager + marketplace
/plugins                    → plugin/MCP manager + marketplace
/usage                      → token + cost tracking
/settings                   → claude path, hooks, env vars, notifications
  ?tab=claude               → claude binary, model defaults
  ?tab=notifications        → telegram, slack tokens, triggers
  ?tab=hooks                → hook event manager
  ?tab=env                  → encrypted env vars
```

---

## Data Model Updates

### New: `agent_profiles` table

```sql
CREATE TABLE agent_profiles (
  id            TEXT PRIMARY KEY,
  name          TEXT NOT NULL,
  model         TEXT NOT NULL DEFAULT 'sonnet',
  skills        TEXT NOT NULL DEFAULT '[]',   -- JSON array of skill names
  plugins       TEXT NOT NULL DEFAULT '[]',   -- JSON array of plugin names
  system_prompt TEXT,
  max_turns     INTEGER DEFAULT 20,
  allowed_tools TEXT,                          -- JSON array or null (= all)
  skip_permissions INTEGER DEFAULT 0,
  branch_prefix TEXT DEFAULT 'feat/',
  is_default    INTEGER DEFAULT 0,
  created_at    TEXT NOT NULL,
  updated_at    TEXT NOT NULL
);
```

### Updated: `tasks` table

Add columns:
```sql
ALTER TABLE tasks ADD COLUMN profile_id TEXT REFERENCES agent_profiles(id);
ALTER TABLE tasks ADD COLUMN branch_name TEXT;
ALTER TABLE tasks ADD COLUMN turn_count INTEGER DEFAULT 0;
ALTER TABLE tasks ADD COLUMN input_tokens INTEGER DEFAULT 0;
ALTER TABLE tasks ADD COLUMN output_tokens INTEGER DEFAULT 0;
ALTER TABLE tasks ADD COLUMN elapsed_seconds INTEGER DEFAULT 0;
ALTER TABLE tasks ADD COLUMN queued_at TEXT;
ALTER TABLE tasks ADD COLUMN started_at TEXT;
ALTER TABLE tasks ADD COLUMN completed_at TEXT;
```

### Updated task statuses:
```
PENDING → QUEUED → IN_PROGRESS → REVIEW → DONE | FAILED
```

---

## Build Sequence (Revised Priority)

```
Sprint 1 — Core loop works end-to-end
  1. Settings: Claude path + folder picker for projects
  2. Project detail page: task list with status badges
  3. Execute task: wire ▶ Code button → Claude CLI → stream output
  4. Task status updates: IN_PROGRESS → DONE/FAILED via stream-json
  5. Desktop notification on complete
  → Result: basic "create task → code → done" loop working

Sprint 2 — Agent Profiles + Skills
  6. Agent profiles CRUD page
  7. Profile picker in task assignment
  8. Skills manager (local CRUD)
  9. Skills injected into Claude prompt at execution time
  → Result: different profiles produce different Claude behavior

Sprint 3 — Task Queue + Review Gate
  10. Concurrency queue (max N parallel tasks)
  11. QUEUED status + auto-start when slot opens
  12. REVIEW status + git diff viewer (parse `git diff HEAD`)
  13. Accept → auto-commit | Reject → re-queue
  → Result: production-safe workflow

Sprint 4 — Marketplace
  14. Skills marketplace (fetch from GitHub index)
  15. Plugin marketplace (curated MCP list)
  16. Install/uninstall flows
  → Result: ecosystem growth

Sprint 5 — Remote Notifications
  17. Telegram bot notifications
  18. Slack bot notifications
  19. Notification settings page
  → Result: monitor tasks from phone
```

---

## What Makes This Better Than a Plain Claude Terminal

| Feature | Plain Claude Terminal | Sanketika |
|---|---|---|
| Task tracking | None | Full lifecycle: pending → done |
| Multiple tasks | Manual | Concurrent queue, auto-managed |
| Context | Blank slate | CLAUDE.md + skills injected |
| Specialization | One model | Agent profiles per task type |
| Extensions | CLI flags | Plugin marketplace |
| Prompt templates | Copy-paste | Skill marketplace |
| Notifications | None | Desktop + Telegram + Slack |
| Code review | Exit and open git | Inline diff viewer |
| Cost tracking | None | Per-task, per-project breakdown |
| History | JSONL files | Structured DB with search |
