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
exports.readMcpServers = readMcpServers;
exports.writeMcpServer = writeMcpServer;
exports.deleteMcpServer = deleteMcpServer;
const fs = __importStar(require("fs"));
const path = __importStar(require("path"));
const os = __importStar(require("os"));
function getConfigPath(scope, projectPath) {
    if (scope === 'project' && projectPath) {
        return path.join(projectPath, '.claude', 'settings.json');
    }
    return path.join(os.homedir(), '.claude.json');
}
function readConfig(configPath) {
    if (!fs.existsSync(configPath))
        return {};
    try {
        return JSON.parse(fs.readFileSync(configPath, 'utf8'));
    }
    catch {
        return {};
    }
}
function writeConfig(configPath, config) {
    const dir = path.dirname(configPath);
    if (!fs.existsSync(dir))
        fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(configPath, JSON.stringify(config, null, 2), 'utf8');
}
function readMcpServers(scope, projectPath) {
    const configPath = getConfigPath(scope, projectPath);
    const config = readConfig(configPath);
    const servers = config.mcpServers || {};
    return Object.entries(servers).map(([name, conf]) => ({
        name,
        command: conf.command,
        args: conf.args || [],
        env: conf.env || {},
        type: conf.type || 'stdio',
        status: 'Registered'
    }));
}
function writeMcpServer(name, mcpConfig, scope, projectPath) {
    const configPath = getConfigPath(scope, projectPath);
    const config = readConfig(configPath);
    if (!config.mcpServers)
        config.mcpServers = {};
    config.mcpServers[name] = {
        command: mcpConfig.command,
        args: mcpConfig.args,
        env: mcpConfig.env,
        type: mcpConfig.type
    };
    writeConfig(configPath, config);
}
function deleteMcpServer(name, scope, projectPath) {
    const configPath = getConfigPath(scope, projectPath);
    const config = readConfig(configPath);
    if (config.mcpServers && config.mcpServers[name]) {
        delete config.mcpServers[name];
        writeConfig(configPath, config);
    }
}
//# sourceMappingURL=mcp-manager.js.map