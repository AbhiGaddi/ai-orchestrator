"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.listProfiles = listProfiles;
exports.getProfile = getProfile;
exports.createProfile = createProfile;
exports.updateProfile = updateProfile;
exports.deleteProfile = deleteProfile;
const database_1 = require("../db/database");
const crypto_1 = __importDefault(require("crypto"));
function listProfiles() {
    const db = (0, database_1.getDb)();
    const rows = db.prepare('SELECT * FROM agent_profiles ORDER BY is_default DESC, name ASC').all();
    return rows.map(mapRow);
}
function getProfile(id) {
    const db = (0, database_1.getDb)();
    const row = db.prepare('SELECT * FROM agent_profiles WHERE id = ?').get(id);
    if (!row)
        return undefined;
    return mapRow(row);
}
function createProfile(data) {
    const db = (0, database_1.getDb)();
    const id = crypto_1.default.randomUUID();
    if (data.is_default) {
        db.prepare('UPDATE agent_profiles SET is_default = 0').run();
    }
    const stmt = db.prepare(`
    INSERT INTO agent_profiles (
      id, name, model, skills, plugins, system_prompt, 
      max_turns, allowed_tools, skip_permissions, branch_prefix, is_default
    ) VALUES (
      ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?
    )
  `);
    stmt.run(id, data.name || 'New Profile', data.model || 'sonnet', (0, database_1.toJson)(data.skills || []), (0, database_1.toJson)(data.plugins || []), data.system_prompt || null, data.max_turns || 20, (0, database_1.toJson)(data.allowed_tools), data.skip_permissions ? 1 : 0, data.branch_prefix || 'feat/', data.is_default ? 1 : 0);
    return getProfile(id);
}
function updateProfile(id, data) {
    const db = (0, database_1.getDb)();
    if (data.is_default) {
        db.prepare('UPDATE agent_profiles SET is_default = 0').run();
    }
    const updates = [];
    const values = [];
    const add = (col, val) => {
        updates.push(`${col} = ?`);
        values.push(val);
    };
    if (data.name !== undefined)
        add('name', data.name);
    if (data.model !== undefined)
        add('model', data.model);
    if (data.skills !== undefined)
        add('skills', (0, database_1.toJson)(data.skills));
    if (data.plugins !== undefined)
        add('plugins', (0, database_1.toJson)(data.plugins));
    if (data.system_prompt !== undefined)
        add('system_prompt', data.system_prompt);
    if (data.max_turns !== undefined)
        add('max_turns', data.max_turns);
    if (data.allowed_tools !== undefined)
        add('allowed_tools', (0, database_1.toJson)(data.allowed_tools));
    if (data.skip_permissions !== undefined)
        add('skip_permissions', data.skip_permissions ? 1 : 0);
    if (data.branch_prefix !== undefined)
        add('branch_prefix', data.branch_prefix);
    if (data.is_default !== undefined)
        add('is_default', data.is_default ? 1 : 0);
    add('updated_at', new Date().toISOString());
    if (updates.length > 0) {
        values.push(id);
        db.prepare(`UPDATE agent_profiles SET ${updates.join(', ')} WHERE id = ?`).run(...values);
    }
    return getProfile(id);
}
function deleteProfile(id) {
    const db = (0, database_1.getDb)();
    db.prepare('DELETE FROM agent_profiles WHERE id = ?').run(id);
}
function mapRow(row) {
    return {
        id: row.id,
        name: row.name,
        model: row.model,
        skills: (0, database_1.parseJson)(row.skills, []),
        plugins: (0, database_1.parseJson)(row.plugins, []),
        system_prompt: row.system_prompt || undefined,
        max_turns: row.max_turns,
        allowed_tools: (0, database_1.parseJson)(row.allowed_tools, undefined),
        skip_permissions: Boolean(row.skip_permissions),
        branch_prefix: row.branch_prefix,
        is_default: Boolean(row.is_default),
        created_at: row.created_at,
        updated_at: row.updated_at
    };
}
//# sourceMappingURL=agent-profiles.js.map