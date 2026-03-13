"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.claudeEngine = void 0;
const CLAUDE_MODELS = [
    { id: 'sonnet', label: 'Claude Sonnet' },
    { id: 'opus', label: 'Claude Opus' },
    { id: 'haiku', label: 'Claude Haiku' },
];
exports.claudeEngine = {
    id: 'claude',
    label: 'Claude',
    mode: 'headless',
    models: CLAUDE_MODELS,
    getBinary(settings) {
        return settings.claudePath || 'claude';
    },
    buildArgs(prompt, model, agent) {
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
    buildEnv(_settings) {
        return {};
    },
};
//# sourceMappingURL=claude.js.map