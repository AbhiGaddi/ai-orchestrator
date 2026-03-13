import type { Agent, AppSettings } from '../../types';
import type { ExecutionEngine, EngineModel } from './types';

const CLAUDE_MODELS: EngineModel[] = [
  { id: 'sonnet', label: 'Claude Sonnet' },
  { id: 'opus',   label: 'Claude Opus'   },
  { id: 'haiku',  label: 'Claude Haiku'  },
];

export const claudeEngine: ExecutionEngine = {
  id: 'claude',
  label: 'Claude',
  mode: 'headless',
  models: CLAUDE_MODELS,

  getBinary(settings: AppSettings): string {
    return settings.claudePath || 'claude';
  },

  buildArgs(prompt: string, model: string, agent?: Agent): string[] {
    const args = [
      '--print',
      '--verbose',
      '--output-format', 'stream-json',
      '--model', model || 'sonnet',
      '--dangerously-skip-permissions',
    ];
    if (agent?.systemPrompt) {
      args.push('--system-prompt', agent.systemPrompt);
    }
    // Prompt as positional argument (must be last)
    args.push(prompt);
    return args;
  },

  buildEnv(_settings: AppSettings): Record<string, string> {
    return {};
  },
};
