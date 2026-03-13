import { BrowserWindow } from 'electron';
import type { Agent, AppSettings } from '../types';
export declare const agents: Map<string, Agent>;
export declare function loadAgents(): void;
export declare function createAgent(data: Partial<Agent>): Agent;
export declare function getAgent(id: string): Agent | undefined;
export declare function listAgents(): Agent[];
export declare function removeAgent(id: string): void;
export declare function startAgent(id: string, prompt: string, model: string, settings: AppSettings, mainWindow: BrowserWindow | null): void;
export declare function stopAgent(id: string, mainWindow: BrowserWindow | null): void;
/** Called when the user clicks "Mark Complete" for an IDE-based task */
export declare function markIdeAgentDone(id: string, mainWindow: BrowserWindow | null): void;
export declare const lastPermissionMsg: Map<string, string>;
