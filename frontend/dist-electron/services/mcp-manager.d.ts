export interface McpServerConfig {
    name: string;
    command: string;
    args?: string[];
    env?: Record<string, string>;
    type?: 'stdio' | 'sse';
    status?: string;
}
export declare function readMcpServers(scope: 'global' | 'project', projectPath?: string): McpServerConfig[];
export declare function writeMcpServer(name: string, mcpConfig: any, scope: 'global' | 'project', projectPath?: string): void;
export declare function deleteMcpServer(name: string, scope: 'global' | 'project', projectPath?: string): void;
