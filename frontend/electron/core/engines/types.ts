import type { BrowserWindow } from 'electron';
import type { Agent, AppSettings } from '../../types';

export type EngineId = 'claude' | 'antigravity';
export type EngineMode = 'headless' | 'ide';

export interface EngineModel {
  id: string;
  label: string;
}

export interface ExecutionEngine {
  id: EngineId;
  label: string;
  mode: EngineMode;
  models: EngineModel[];

  /** Returns the binary path to use */
  getBinary(settings: AppSettings): string;

  /** Build the CLI args array. Prompt is included. */
  buildArgs(prompt: string, model: string, agent?: Agent): string[];

  /** Extra env vars to merge into the process env */
  buildEnv(settings: AppSettings): Record<string, string>;
}
