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
exports.listSkills = listSkills;
exports.readSkill = readSkill;
exports.writeSkill = writeSkill;
exports.deleteSkill = deleteSkill;
const fs = __importStar(require("fs"));
const path = __importStar(require("path"));
const os = __importStar(require("os"));
const CLAUDE_BASE_DIR = path.join(os.homedir(), '.claude');
const GLOBAL_SKILLS_DIR = path.join(CLAUDE_BASE_DIR, 'commands');
function ensureDir(dirPath) {
    if (!fs.existsSync(dirPath)) {
        fs.mkdirSync(dirPath, { recursive: true });
    }
}
function getSkillsDir(scope, projectPath) {
    if (scope === 'global') {
        ensureDir(GLOBAL_SKILLS_DIR);
        return GLOBAL_SKILLS_DIR;
    }
    if (!projectPath)
        throw new Error('Project path is required for project-scoped skills');
    const projectSkillsDir = path.join(projectPath, '.claude', 'commands');
    ensureDir(projectSkillsDir);
    return projectSkillsDir;
}
function listSkills(projectPath) {
    const skills = [];
    // Read Global skills
    try {
        ensureDir(GLOBAL_SKILLS_DIR);
        const globalFiles = fs.readdirSync(GLOBAL_SKILLS_DIR);
        for (const file of globalFiles) {
            if (file.endsWith('.md')) {
                const content = fs.readFileSync(path.join(GLOBAL_SKILLS_DIR, file), 'utf-8');
                skills.push({
                    name: file.replace('.md', ''),
                    content,
                    scope: 'global'
                });
            }
        }
    }
    catch (err) {
        console.error('Failed to list global skills:', err);
    }
    // Read Project skills
    if (projectPath) {
        try {
            const pDir = path.join(projectPath, '.claude', 'commands');
            if (fs.existsSync(pDir)) {
                const projectFiles = fs.readdirSync(pDir);
                for (const file of projectFiles) {
                    if (file.endsWith('.md')) {
                        const content = fs.readFileSync(path.join(pDir, file), 'utf-8');
                        skills.push({
                            name: file.replace('.md', ''),
                            content,
                            scope: 'project',
                            projectPath
                        });
                    }
                }
            }
        }
        catch (err) {
            console.error('Failed to list project skills:', err);
        }
    }
    return skills;
}
function readSkill(name, scope, projectPath) {
    const dir = getSkillsDir(scope, projectPath);
    const filePath = path.join(dir, `${name}.md`);
    if (!fs.existsSync(filePath))
        throw new Error(`Skill ${name} not found`);
    return fs.readFileSync(filePath, 'utf-8');
}
function writeSkill(name, content, scope, projectPath) {
    const dir = getSkillsDir(scope, projectPath);
    const filePath = path.join(dir, `${name}.md`);
    fs.writeFileSync(filePath, content, 'utf-8');
    return {
        name,
        content,
        scope,
        projectPath
    };
}
function deleteSkill(name, scope, projectPath) {
    const dir = getSkillsDir(scope, projectPath);
    const filePath = path.join(dir, `${name}.md`);
    if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
    }
}
//# sourceMappingURL=skills-manager.js.map