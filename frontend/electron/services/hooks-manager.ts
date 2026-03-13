import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';

function getConfigPath(scope: 'global' | 'project', projectPath?: string): string {
    if (scope === 'project' && projectPath) {
        return path.join(projectPath, '.claude', 'settings.json');
    }
    return path.join(os.homedir(), '.claude.json'); // Also could map to ~/.claude/settings.json
}

function readConfig(configPath: string): any {
    if (!fs.existsSync(configPath)) {
        return {};
    }
    try {
        return JSON.parse(fs.readFileSync(configPath, 'utf8'));
    } catch {
        return {};
    }
}

function writeConfig(configPath: string, config: any) {
    const dir = path.dirname(configPath);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(configPath, JSON.stringify(config, null, 2), 'utf8');
}

export interface HookConfig {
    event: string;
    matcher?: string;
    command: string;
    timeout?: number;
    background?: boolean;
}

export function readHooks(scope: 'global' | 'project', projectPath?: string): HookConfig[] {
    const configPath = getConfigPath(scope, projectPath);
    const config = readConfig(configPath);
    const rawHooks = config.hooks || {};

    return Object.entries(rawHooks).map(([id, hook]: [string, any]) => ({
        id,
        event: hook.event,
        matcher: hook.matcher,
        command: hook.command,
        timeout: hook.timeout,
        background: hook.background
    }));
}

export function writeHooks(hooks: any[], scope: 'global' | 'project', projectPath?: string): void {
    const configPath = getConfigPath(scope, projectPath);
    const config = readConfig(configPath);

    // Convert array back to object format mapping IDs if it's the expected struct
    const hooksObj: any = {};
    for (const hook of hooks) {
        const id = hook.id || `${hook.event}_${Math.random().toString(36).substr(2, 6)}`;
        hooksObj[id] = {
            event: hook.event,
            matcher: hook.matcher,
            command: hook.command,
            timeout: hook.timeout,
            background: hook.background
        };
    }

    config.hooks = hooksObj;
    writeConfig(configPath, config);
}
