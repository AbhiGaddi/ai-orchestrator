import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';

const CLAUDE_BASE_DIR = path.join(os.homedir(), '.claude');
const GLOBAL_MEMORY_DIR = path.join(CLAUDE_BASE_DIR, 'memory');
const GLOBAL_CLAUDE_MD = path.join(CLAUDE_BASE_DIR, 'CLAUDE.md');

export interface MemoryFile {
    path: string;
    name: string;
    scope: 'global' | 'project';
    projectPath?: string;
    content: string;
    mtime: string;
}

function ensureDir(dirPath: string) {
    if (!fs.existsSync(dirPath)) {
        fs.mkdirSync(dirPath, { recursive: true });
    }
}

function readFileSafe(filePath: string): string {
    if (!fs.existsSync(filePath)) return '';
    return fs.readFileSync(filePath, 'utf-8');
}

export function listMemoryFiles(projectPaths: string[] = []): MemoryFile[] {
    const files: MemoryFile[] = [];

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
            if (!file.endsWith('.md')) continue;
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
                if (!file.endsWith('.md')) continue;
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

export function readMemoryFile(filePath: string): string {
    return readFileSafe(filePath);
}

export function writeMemoryFile(filePath: string, content: string): void {
    ensureDir(path.dirname(filePath));
    fs.writeFileSync(filePath, content, 'utf-8');
}

export function deleteMemoryFile(filePath: string): void {
    if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
    }
}
