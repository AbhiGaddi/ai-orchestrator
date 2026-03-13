import { BrowserWindow } from 'electron';
export declare function getMainWindow(): BrowserWindow | null;
export declare function sendToRenderer(channel: string, data: unknown): void;
