"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ALL_ENGINES = exports.antigravityEngine = exports.claudeEngine = void 0;
exports.getEngine = getEngine;
var claude_1 = require("./claude");
Object.defineProperty(exports, "claudeEngine", { enumerable: true, get: function () { return claude_1.claudeEngine; } });
var antigravity_1 = require("./antigravity");
Object.defineProperty(exports, "antigravityEngine", { enumerable: true, get: function () { return antigravity_1.antigravityEngine; } });
const claude_2 = require("./claude");
const antigravity_2 = require("./antigravity");
const ENGINES = {
    claude: claude_2.claudeEngine,
    antigravity: antigravity_2.antigravityEngine,
};
function getEngine(id) {
    return ENGINES[id] ?? ENGINES.claude;
}
exports.ALL_ENGINES = Object.values(ENGINES);
//# sourceMappingURL=index.js.map