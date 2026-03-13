export interface HookConfig {
    event: string;
    matcher?: string;
    command: string;
    timeout?: number;
    background?: boolean;
}
export declare function readHooks(scope: 'global' | 'project', projectPath?: string): HookConfig[];
export declare function writeHooks(hooks: any[], scope: 'global' | 'project', projectPath?: string): void;
