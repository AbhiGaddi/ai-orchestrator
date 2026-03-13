import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';

/**
 * Registers Flow's MCP servers into the Claude CLI/Desktop configuration file.
 */
export function registerMcpServers() {
    // Common possible paths for Claude configuration
    const possiblePaths = [
        // Claude CLI config path
        path.join(os.homedir(), '.claude.json'),
        // Alternative path mentioned in PLAN
        path.join(os.homedir(), '.claude', 'settings.json'),
        // Claude Desktop app config path (macOS/Linux)
        path.join(os.homedir(), 'Library', 'Application Support', 'Claude', 'claude_desktop_config.json')
    ];

    // Pick the first path that exists, or default to ~/.claude.json
    let configPath = possiblePaths.find(p => fs.existsSync(p)) || possiblePaths[0];

    // Ensure the directory exists
    const configDir = path.dirname(configPath);
    if (!fs.existsSync(configDir)) {
        fs.mkdirSync(configDir, { recursive: true });
    }

    let config: any = {};
    if (fs.existsSync(configPath)) {
        try {
            config = JSON.parse(fs.readFileSync(configPath, 'utf8'));
        } catch (e) {
            console.error(`Failed to parse Claude configuration file at ${configPath}:`, e);
            config = {};
        }
    }

    if (!config.mcpServers) {
        config.mcpServers = {};
    }

    // Define paths to the MCP server entry points (compiled dist directories)
    // Assuming the `mcp-*` directories are siblings to `frontend`
    const baseDir = path.resolve(__dirname, '..', '..', '..');

    const serversToRegister = {
        'flow-orchestrator': path.join(baseDir, 'mcp-orchestrator', 'dist', 'index.js'),
        'flow-kanban': path.join(baseDir, 'mcp-kanban', 'dist', 'index.js'),
        'flow-vault': path.join(baseDir, 'mcp-vault', 'dist', 'index.js')
    };

    let updated = false;

    for (const [key, scriptPath] of Object.entries(serversToRegister)) {
        // Only register if the server exists
        if (!config.mcpServers[key] || config.mcpServers[key].command !== 'node' || config.mcpServers[key].args?.[0] !== scriptPath) {
            config.mcpServers[key] = {
                command: "node",
                args: [scriptPath],
                type: "stdio"
            };
            updated = true;
        }
    }

    if (updated) {
        try {
            fs.writeFileSync(configPath, JSON.stringify(config, null, 2), 'utf8');
            console.log(`Registered MCP servers implicitly to ${configPath}`);
        } catch (e) {
            console.error('Failed to write MCP configuration:', e);
        }
    } else {
        console.log(`MCP servers already registered correctly in ${configPath}`);
    }
}
