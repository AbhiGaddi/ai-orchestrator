import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';

const CLAUDE_BASE_DIR = path.join(os.homedir(), '.claude');
const GLOBAL_SKILLS_DIR = path.join(CLAUDE_BASE_DIR, 'commands');

export interface Skill {
    name: string;
    content: string;
    scope: 'global' | 'project';
    projectPath?: string;
}

function ensureDir(dirPath: string) {
    if (!fs.existsSync(dirPath)) {
        fs.mkdirSync(dirPath, { recursive: true });
    }
}

function getSkillsDir(scope: 'global' | 'project', projectPath?: string): string {
    if (scope === 'global') {
        ensureDir(GLOBAL_SKILLS_DIR);
        return GLOBAL_SKILLS_DIR;
    }
    if (!projectPath) throw new Error('Project path is required for project-scoped skills');
    const projectSkillsDir = path.join(projectPath, '.claude', 'commands');
    ensureDir(projectSkillsDir);
    return projectSkillsDir;
}

export function listSkills(projectPath?: string): Skill[] {
    const skills: Skill[] = [];

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
    } catch (err) {
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
        } catch (err) {
            console.error('Failed to list project skills:', err);
        }
    }

    return skills;
}

export function readSkill(name: string, scope: 'global' | 'project', projectPath?: string): string {
    const dir = getSkillsDir(scope, projectPath);
    const filePath = path.join(dir, `${name}.md`);
    if (!fs.existsSync(filePath)) throw new Error(`Skill ${name} not found`);
    return fs.readFileSync(filePath, 'utf-8');
}

export function writeSkill(name: string, content: string, scope: 'global' | 'project', projectPath?: string): Skill {
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

export function deleteSkill(name: string, scope: 'global' | 'project', projectPath?: string): void {
    const dir = getSkillsDir(scope, projectPath);
    const filePath = path.join(dir, `${name}.md`);
    if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
    }
}
