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
exports.registerMcpServers = registerMcpServers;
const fs = __importStar(require("fs"));
const path = __importStar(require("path"));
const os = __importStar(require("os"));
/**
 * Registers Flow's MCP servers into the Claude CLI/Desktop configuration file.
 */
function registerMcpServers() {
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
    let config = {};
    if (fs.existsSync(configPath)) {
        try {
            config = JSON.parse(fs.readFileSync(configPath, 'utf8'));
        }
        catch (e) {
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
        }
        catch (e) {
            console.error('Failed to write MCP configuration:', e);
        }
    }
    else {
        console.log(`MCP servers already registered correctly in ${configPath}`);
    }
}
//# sourceMappingURL=mcp-registry.js.map