"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.antigravityEngine = void 0;
// Antigravity uses whatever model is configured inside the IDE.
// We expose a single "default" option since model selection happens in the IDE itself.
const ANTIGRAVITY_MODELS = [
    { id: 'default', label: 'IDE Default (configured in Antigravity)' },
];
exports.antigravityEngine = {
    id: 'antigravity',
    label: 'Antigravity',
    mode: 'ide',
    models: ANTIGRAVITY_MODELS,
    getBinary(settings) {
        return settings.antigravityPath || 'antigravity';
    },
    buildArgs(prompt, _model, _agent) {
        // Opens Antigravity IDE with the task pre-filled in the agent chat panel.
        // --new-window ensures a fresh window for each task.
        // --mode agent uses the agentic chat mode.
        return ['chat', '--mode', 'agent', '--new-window', prompt];
    },
    buildEnv(_settings) {
        return {};
    },
};
//# sourceMappingURL=antigravity.js.map