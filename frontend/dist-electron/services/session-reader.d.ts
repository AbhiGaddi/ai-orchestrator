export interface SessionSummary {
    sessionId: string;
    projectPathHash: string;
    projectPath?: string;
    filePath: string;
    mtime: string;
    turnCount: number;
    inputTokens: number;
    outputTokens: number;
    model: string;
    estimatedCost: number;
}
export interface SessionEntry {
    type: string;
    timestamp?: string;
    message?: any;
    usage?: any;
    [key: string]: any;
}
export declare function listSessions(): SessionSummary[];
export declare function readSession(filePath: string): SessionEntry[];
export declare function deleteSession(filePath: string): void;
