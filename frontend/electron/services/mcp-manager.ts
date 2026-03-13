import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';

function getConfigPath(scope: 'global' | 'project', projectPath?: string): string {
    if (scope === 'project' && projectPath) {
        return path.join(projectPath, '.claude', 'settings.json');
    }
    return path.join(os.homedir(), '.claude.json');
}

function readConfig(configPath: string): any {
    if (!fs.existsSync(configPath)) return {};
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

export interface McpServerConfig {
    name: string;
    command: string;
    args?: string[];
    env?: Record<string, string>;
    type?: 'stdio' | 'sse';
    status?: string;
}

export function readMcpServers(scope: 'global' | 'project', projectPath?: string): McpServerConfig[] {
    const configPath = getConfigPath(scope, projectPath);
    const config = readConfig(configPath);
    const servers = config.mcpServers || {};

    return Object.entries(servers).map(([name, conf]: [string, any]) => ({
        name,
        command: conf.command,
        args: conf.args || [],
        env: conf.env || {},
        type: conf.type || 'stdio',
        status: 'Registered'
    }));
}

export function writeMcpServer(name: string, mcpConfig: any, scope: 'global' | 'project', projectPath?: string): void {
    const configPath = getConfigPath(scope, projectPath);
    const config = readConfig(configPath);

    if (!config.mcpServers) config.mcpServers = {};

    config.mcpServers[name] = {
        command: mcpConfig.command,
        args: mcpConfig.args,
        env: mcpConfig.env,
        type: mcpConfig.type
    };

    writeConfig(configPath, config);
}

export function deleteMcpServer(name: string, scope: 'global' | 'project', projectPath?: string): void {
    const configPath = getConfigPath(scope, projectPath);
    const config = readConfig(configPath);

    if (config.mcpServers && config.mcpServers[name]) {
        delete config.mcpServers[name];
        writeConfig(configPath, config);
    }
}
