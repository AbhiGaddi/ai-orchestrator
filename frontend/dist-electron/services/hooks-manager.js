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
exports.readHooks = readHooks;
exports.writeHooks = writeHooks;
const fs = __importStar(require("fs"));
const path = __importStar(require("path"));
const os = __importStar(require("os"));
function getConfigPath(scope, projectPath) {
    if (scope === 'project' && projectPath) {
        return path.join(projectPath, '.claude', 'settings.json');
    }
    return path.join(os.homedir(), '.claude.json'); // Also could map to ~/.claude/settings.json
}
function readConfig(configPath) {
    if (!fs.existsSync(configPath)) {
        return {};
    }
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
function readHooks(scope, projectPath) {
    const configPath = getConfigPath(scope, projectPath);
    const config = readConfig(configPath);
    const rawHooks = config.hooks || {};
    return Object.entries(rawHooks).map(([id, hook]) => ({
        id,
        event: hook.event,
        matcher: hook.matcher,
        command: hook.command,
        timeout: hook.timeout,
        background: hook.background
    }));
}
function writeHooks(hooks, scope, projectPath) {
    const configPath = getConfigPath(scope, projectPath);
    const config = readConfig(configPath);
    // Convert array back to object format mapping IDs if it's the expected struct
    const hooksObj = {};
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
//# sourceMappingURL=hooks-manager.js.map