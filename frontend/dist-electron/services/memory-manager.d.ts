export interface MemoryFile {
    path: string;
    name: string;
    scope: 'global' | 'project';
    projectPath?: string;
    content: string;
    mtime: string;
}
export declare function listMemoryFiles(projectPaths?: string[]): MemoryFile[];
export declare function readMemoryFile(filePath: string): string;
export declare function writeMemoryFile(filePath: string, content: string): void;
export declare function deleteMemoryFile(filePath: string): void;
