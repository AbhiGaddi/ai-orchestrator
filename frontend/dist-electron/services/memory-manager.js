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
exports.listMemoryFiles = listMemoryFiles;
exports.readMemoryFile = readMemoryFile;
exports.writeMemoryFile = writeMemoryFile;
exports.deleteMemoryFile = deleteMemoryFile;
const fs = __importStar(require("fs"));
const path = __importStar(require("path"));
const os = __importStar(require("os"));
const CLAUDE_BASE_DIR = path.join(os.homedir(), '.claude');
const GLOBAL_MEMORY_DIR = path.join(CLAUDE_BASE_DIR, 'memory');
const GLOBAL_CLAUDE_MD = path.join(CLAUDE_BASE_DIR, 'CLAUDE.md');
function ensureDir(dirPath) {
    if (!fs.existsSync(dirPath)) {
        fs.mkdirSync(dirPath, { recursive: true });
    }
}
function readFileSafe(filePath) {
    if (!fs.existsSync(filePath))
        return '';
    return fs.readFileSync(filePath, 'utf-8');
}
function listMemoryFiles(projectPaths = []) {
    const files = [];
    // Global CLAUDE.md
    if (fs.existsSync(GLOBAL_CLAUDE_MD)) {
        files.push({
            path: GLOBAL_CLAUDE_MD,
            name: 'CLAUDE.md',
            scope: 'global',
            content: readFileSafe(GLOBAL_CLAUDE_MD),
            mtime: fs.statSync(GLOBAL_CLAUDE_MD).mtime.toISOString(),
        });
    }
    // Global memory/ dir
    if (fs.existsSync(GLOBAL_MEMORY_DIR)) {
        for (const file of fs.readdirSync(GLOBAL_MEMORY_DIR)) {
            if (!file.endsWith('.md'))
                continue;
            const fullPath = path.join(GLOBAL_MEMORY_DIR, file);
            files.push({
                path: fullPath,
                name: `memory/${file}`,
                scope: 'global',
                content: readFileSafe(fullPath),
                mtime: fs.statSync(fullPath).mtime.toISOString(),
            });
        }
    }
    // Project CLAUDE.md and memory/
    for (const projectPath of projectPaths) {
        const pClaudeMd = path.join(projectPath, 'CLAUDE.md');
        if (fs.existsSync(pClaudeMd)) {
            files.push({
                path: pClaudeMd,
                name: 'CLAUDE.md',
                scope: 'project',
                projectPath,
                content: readFileSafe(pClaudeMd),
                mtime: fs.statSync(pClaudeMd).mtime.toISOString(),
            });
        }
        const pMemoryDir = path.join(projectPath, '.claude', 'memory');
        if (fs.existsSync(pMemoryDir)) {
            for (const file of fs.readdirSync(pMemoryDir)) {
                if (!file.endsWith('.md'))
                    continue;
                const fullPath = path.join(pMemoryDir, file);
                files.push({
                    path: fullPath,
                    name: `memory/${file}`,
                    scope: 'project',
                    projectPath,
                    content: readFileSafe(fullPath),
                    mtime: fs.statSync(fullPath).mtime.toISOString(),
                });
            }
        }
    }
    return files.sort((a, b) => new Date(b.mtime).getTime() - new Date(a.mtime).getTime());
}
function readMemoryFile(filePath) {
    return readFileSafe(filePath);
}
function writeMemoryFile(filePath, content) {
    ensureDir(path.dirname(filePath));
    fs.writeFileSync(filePath, content, 'utf-8');
}
function deleteMemoryFile(filePath) {
    if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
    }
}
//# sourceMappingURL=memory-manager.js.map