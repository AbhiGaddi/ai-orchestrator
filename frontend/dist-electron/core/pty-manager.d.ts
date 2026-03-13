import * as pty from 'node-pty';
export declare const ptyProcesses: Map<string, pty.IPty>;
export declare function spawnPty(agentId: string, command: string, args: string[], cwd: string, env: Record<string, string>, onData: (data: string) => void, onExit: (code: number | undefined) => void): pty.IPty;
export declare function writeToPty(agentId: string, data: string): boolean;
export declare function killPty(agentId: string): void;
export declare function resizePty(agentId: string, cols: number, rows: number): void;
