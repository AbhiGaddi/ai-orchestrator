export { claudeEngine } from './claude';
export { antigravityEngine } from './antigravity';
export type { ExecutionEngine, EngineId, EngineMode, EngineModel } from './types';
import type { EngineId, ExecutionEngine } from './types';
export declare function getEngine(id: EngineId): ExecutionEngine;
export declare const ALL_ENGINES: ExecutionEngine[];
