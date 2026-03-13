export { claudeEngine } from './claude';
export { antigravityEngine } from './antigravity';
export type { ExecutionEngine, EngineId, EngineMode, EngineModel } from './types';

import { claudeEngine } from './claude';
import { antigravityEngine } from './antigravity';
import type { EngineId, ExecutionEngine } from './types';

const ENGINES: Record<EngineId, ExecutionEngine> = {
  claude: claudeEngine,
  antigravity: antigravityEngine,
};

export function getEngine(id: EngineId): ExecutionEngine {
  return ENGINES[id] ?? ENGINES.claude;
}

export const ALL_ENGINES = Object.values(ENGINES);
