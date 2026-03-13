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
Object.defineProperty(exports, "__esModule", { value: true });
exports.getMainWindow = getMainWindow;
exports.sendToRenderer = sendToRenderer;
const electron_1 = require("electron");
const path = __importStar(require("path"));
const database_1 = require("./db/database");
const ipc_handlers_1 = require("./handlers/ipc-handlers");
const agent_manager_1 = require("./core/agent-manager");
const isDev = !electron_1.app.isPackaged || process.env.NODE_ENV === 'development';
const NEXT_DEV_URL = 'http://localhost:3000';
let mainWindow = null;
// ── Window ────────────────────────────────────────────────────────────────────
function createWindow() {
    mainWindow = new electron_1.BrowserWindow({
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
    }
    else {
        // In production, Next.js standalone server is started separately
        // and Electron loads from it, OR we use a static export
        mainWindow.loadURL(NEXT_DEV_URL);
    }
    mainWindow.once('ready-to-show', () => mainWindow?.show());
    // Open external links in the system browser, not in Electron
    mainWindow.webContents.setWindowOpenHandler(({ url }) => {
        electron_1.shell.openExternal(url);
        return { action: 'deny' };
    });
    mainWindow.on('closed', () => { mainWindow = null; });
}
// ── App lifecycle ─────────────────────────────────────────────────────────────
electron_1.app.whenReady().then(() => {
    // 1. Initialize SQLite database (creates tables if needed)
    (0, database_1.initDatabase)();
    // 1.5 Seed test data
    const { seedDatabase } = require('./db/seed');
    seedDatabase();
    // 1.8 Register MCP servers
    const { registerMcpServers } = require('./core/mcp-registry');
    registerMcpServers();
    // 2. Load persisted agent states
    (0, agent_manager_1.loadAgents)();
    // 3. Register all IPC handlers (projects, tasks, agents, kanban, vault, etc.)
    (0, ipc_handlers_1.setupIpcHandlers)();
    // 4. Create the browser window
    createWindow();
    // 5. Force dark theme to match the app's design system
    electron_1.nativeTheme.themeSource = 'dark';
    electron_1.app.on('activate', () => {
        if (electron_1.BrowserWindow.getAllWindows().length === 0)
            createWindow();
    });
});
electron_1.app.on('window-all-closed', () => {
    if (process.platform !== 'darwin')
        electron_1.app.quit();
});
// ── Dev tools helper ──────────────────────────────────────────────────────────
electron_1.app.on('web-contents-created', (_event, contents) => {
    // Block navigation to unexpected origins in production
    if (!isDev) {
        contents.on('will-navigate', (event, url) => {
            if (!url.startsWith('http://localhost'))
                event.preventDefault();
        });
    }
});
// ── Export mainWindow ref for services ────────────────────────────────────────
function getMainWindow() {
    return mainWindow;
}
function sendToRenderer(channel, data) {
    mainWindow?.webContents.send(channel, data);
}
//# sourceMappingURL=main.js.map