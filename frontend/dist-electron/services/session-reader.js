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
exports.listSessions = listSessions;
exports.readSession = readSession;
exports.deleteSession = deleteSession;
const fs = __importStar(require("fs"));
const path = __importStar(require("path"));
const os = __importStar(require("os"));
const CLAUDE_BASE_DIR = path.join(os.homedir(), '.claude');
const CLAUDE_PROJECTS_DIR = path.join(CLAUDE_BASE_DIR, 'projects');
const COST_PER_M = {
    'claude-sonnet': { in: 3, out: 15 },
    'claude-opus': { in: 15, out: 75 },
    'claude-haiku': { in: 0.25, out: 1.25 }
};
function listSessions() {
    if (!fs.existsSync(CLAUDE_PROJECTS_DIR))
        return [];
    const summaries = [];
    const projectDirs = fs.readdirSync(CLAUDE_PROJECTS_DIR);
    for (const dir of projectDirs) {
        const projectPathHash = dir;
        const projectDir = path.join(CLAUDE_PROJECTS_DIR, dir);
        if (!fs.statSync(projectDir).isDirectory())
            continue;
        const files = fs.readdirSync(projectDir);
        for (const file of files) {
            if (!file.endsWith('.jsonl'))
                continue;
            const filePath = path.join(projectDir, file);
            const stat = fs.statSync(filePath);
            const sessionId = file.replace('.jsonl', '');
            let turnCount = 0;
            let inputTokens = 0;
            let outputTokens = 0;
            let model = 'unknown';
            try {
                const content = fs.readFileSync(filePath, 'utf-8');
                const lines = content.split('\n');
                for (const line of lines) {
                    if (!line.trim())
                        continue;
                    try {
                        const entry = JSON.parse(line);
                        if (entry.type === 'message_start' && entry.message) {
                            turnCount++;
                            if (entry.message.model)
                                model = entry.message.model;
                            if (entry.message.usage?.input_tokens)
                                inputTokens += entry.message.usage.input_tokens;
                        }
                        else if (entry.type === 'message_delta' && entry.usage) {
                            if (entry.usage.output_tokens)
                                outputTokens += entry.usage.output_tokens;
                        }
                    }
                    catch {
                        // ignore JSON parse errors for incomplete lines
                    }
                }
            }
            catch (err) {
                console.error(`Failed to read session file: ${filePath}`, err);
            }
            let base = 'claude-sonnet';
            if (model.includes('opus'))
                base = 'claude-opus';
            if (model.includes('haiku'))
                base = 'claude-haiku';
            const rate = COST_PER_M[base];
            let estimatedCost = 0;
            if (rate) {
                estimatedCost = (inputTokens / 1000000) * rate.in + (outputTokens / 1000000) * rate.out;
            }
            summaries.push({
                sessionId,
                projectPathHash,
                filePath,
                mtime: stat.mtime.toISOString(),
                turnCount,
                inputTokens,
                outputTokens,
                model,
                estimatedCost
            });
        }
    }
    // Sort by modified time descending
    return summaries.sort((a, b) => new Date(b.mtime).getTime() - new Date(a.mtime).getTime());
}
function readSession(filePath) {
    if (!fs.existsSync(filePath))
        return [];
    const entries = [];
    try {
        const content = fs.readFileSync(filePath, 'utf-8');
        for (const line of content.split('\n')) {
            if (!line.trim())
                continue;
            try {
                entries.push(JSON.parse(line));
            }
            catch {
                // ignore
            }
        }
    }
    catch (err) {
        console.error(`Failed to read session file: ${filePath}`, err);
    }
    return entries;
}
function deleteSession(filePath) {
    if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
    }
}
//# sourceMappingURL=session-reader.js.map