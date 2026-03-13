import type { Agent, AppSettings } from '../../types';
import type { ExecutionEngine, EngineModel } from './types';

// Antigravity uses whatever model is configured inside the IDE.
// We expose a single "default" option since model selection happens in the IDE itself.
const ANTIGRAVITY_MODELS: EngineModel[] = [
  { id: 'default', label: 'IDE Default (configured in Antigravity)' },
];

export const antigravityEngine: ExecutionEngine = {
  id: 'antigravity',
  label: 'Antigravity',
  mode: 'ide',
  models: ANTIGRAVITY_MODELS,

  getBinary(settings: AppSettings): string {
    return settings.antigravityPath || 'antigravity';
  },

  buildArgs(prompt: string, _model: string, _agent?: Agent): string[] {
    // Opens Antigravity IDE with the task pre-filled in the agent chat panel.
    // --new-window ensures a fresh window for each task.
    // --mode agent uses the agentic chat mode.
    return ['chat', '--mode', 'agent', '--new-window', prompt];
  },

  buildEnv(_settings: AppSettings): Record<string, string> {
    return {};
  },
};
