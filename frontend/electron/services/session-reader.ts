import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import * as crypto from 'crypto';

const CLAUDE_BASE_DIR = path.join(os.homedir(), '.claude');
const CLAUDE_PROJECTS_DIR = path.join(CLAUDE_BASE_DIR, 'projects');

export interface SessionSummary {
    sessionId: string;
    projectPathHash: string;
    projectPath?: string;
    filePath: string;
    mtime: string;
    turnCount: number;
    inputTokens: number;
    outputTokens: number;
    model: string;
    estimatedCost: number;
}

export interface SessionEntry {
    type: string;
    timestamp?: string;
    message?: any;
    usage?: any;
    [key: string]: any;
}

const COST_PER_M = {
    'claude-sonnet': { in: 3, out: 15 },
    'claude-opus': { in: 15, out: 75 },
    'claude-haiku': { in: 0.25, out: 1.25 }
};

export function listSessions(): SessionSummary[] {
    if (!fs.existsSync(CLAUDE_PROJECTS_DIR)) return [];

    const summaries: SessionSummary[] = [];
    const projectDirs = fs.readdirSync(CLAUDE_PROJECTS_DIR);

    for (const dir of projectDirs) {
        const projectPathHash = dir;
        const projectDir = path.join(CLAUDE_PROJECTS_DIR, dir);
        if (!fs.statSync(projectDir).isDirectory()) continue;

        const files = fs.readdirSync(projectDir);
        for (const file of files) {
            if (!file.endsWith('.jsonl')) continue;

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
                    if (!line.trim()) continue;
                    try {
                        const entry = JSON.parse(line);
                        if (entry.type === 'message_start' && entry.message) {
                            turnCount++;
                            if (entry.message.model) model = entry.message.model;
                            if (entry.message.usage?.input_tokens) inputTokens += entry.message.usage.input_tokens;
                        } else if (entry.type === 'message_delta' && entry.usage) {
                            if (entry.usage.output_tokens) outputTokens += entry.usage.output_tokens;
                        }
                    } catch {
                        // ignore JSON parse errors for incomplete lines
                    }
                }
            } catch (err) {
                console.error(`Failed to read session file: ${filePath}`, err);
            }

            let base = 'claude-sonnet';
            if (model.includes('opus')) base = 'claude-opus';
            if (model.includes('haiku')) base = 'claude-haiku';
            const rate = COST_PER_M[base as keyof typeof COST_PER_M];

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

export function readSession(filePath: string): SessionEntry[] {
    if (!fs.existsSync(filePath)) return [];
    const entries: SessionEntry[] = [];
    try {
        const content = fs.readFileSync(filePath, 'utf-8');
        for (const line of content.split('\n')) {
            if (!line.trim()) continue;
            try {
                entries.push(JSON.parse(line));
            } catch {
                // ignore
            }
        }
    } catch (err) {
        console.error(`Failed to read session file: ${filePath}`, err);
    }
    return entries;
}

export function deleteSession(filePath: string): void {
    if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
    }
}
