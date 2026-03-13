import Database from 'better-sqlite3';
export declare function getDb(): Database.Database;
export declare function initDatabase(): void;
export declare function parseJson<T>(value: string | null | undefined, fallback: T): T;
export declare function toJson(value: unknown): string;
