import { app, BrowserWindow, shell, nativeTheme } from 'electron';
import * as path from 'path';
import { initDatabase } from './db/database';
import { setupIpcHandlers } from './handlers/ipc-handlers';
import { loadAgents } from './core/agent-manager';

const isDev = !app.isPackaged || process.env.NODE_ENV === 'development';
const NEXT_DEV_URL = 'http://localhost:3000';

let mainWindow: BrowserWindow | null = null;

// ── Window ────────────────────────────────────────────────────────────────────

function createWindow(): void {
  mainWindow = new BrowserWindow({
    width: 1440,
    height: 900,
    minWidth: 1000,
    minHeight: 700,
    titleBarStyle: 'hiddenInset',
    backgroundColor: '#111827',
    vibrancy: 'under-window',
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
      webSecurity: true,
    },
    show: false,
  });

  // Load the app
  if (isDev) {
    mainWindow.loadURL(NEXT_DEV_URL);
    mainWindow.webContents.openDevTools({ mode: 'detach' });
  } else {
    // In production, Next.js standalone server is started separately
    // and Electron loads from it, OR we use a static export
    mainWindow.loadURL(NEXT_DEV_URL);
  }

  mainWindow.once('ready-to-show', () => mainWindow?.show());

  // Open external links in the system browser, not in Electron
  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    shell.openExternal(url);
    return { action: 'deny' };
  });

  mainWindow.on('closed', () => { mainWindow = null; });
}

// ── App lifecycle ─────────────────────────────────────────────────────────────

app.whenReady().then(() => {
  // 1. Initialize SQLite database (creates tables if needed)
  initDatabase();

  // 1.5 Seed test data
  const { seedDatabase } = require('./db/seed');
  seedDatabase();

  // 1.8 Register MCP servers
  const { registerMcpServers } = require('./core/mcp-registry');
  registerMcpServers();

  // 2. Load persisted agent states
  loadAgents();

  // 3. Register all IPC handlers (projects, tasks, agents, kanban, vault, etc.)
  setupIpcHandlers();

  // 4. Create the browser window
  createWindow();

  // 5. Force dark theme to match the app's design system
  nativeTheme.themeSource = 'dark';

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});

// ── Dev tools helper ──────────────────────────────────────────────────────────

app.on('web-contents-created', (_event, contents) => {
  // Block navigation to unexpected origins in production
  if (!isDev) {
    contents.on('will-navigate', (event, url) => {
      if (!url.startsWith('http://localhost')) event.preventDefault();
    });
  }
});

// ── Export mainWindow ref for services ────────────────────────────────────────

export function getMainWindow(): BrowserWindow | null {
  return mainWindow;
}

export function sendToRenderer(channel: string, data: unknown): void {
  mainWindow?.webContents.send(channel, data);
}
