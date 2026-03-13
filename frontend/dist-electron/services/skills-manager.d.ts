export interface Skill {
    name: string;
    content: string;
    scope: 'global' | 'project';
    projectPath?: string;
}
export declare function listSkills(projectPath?: string): Skill[];
export declare function readSkill(name: string, scope: 'global' | 'project', projectPath?: string): string;
export declare function writeSkill(name: string, content: string, scope: 'global' | 'project', projectPath?: string): Skill;
export declare function deleteSkill(name: string, scope: 'global' | 'project', projectPath?: string): void;
