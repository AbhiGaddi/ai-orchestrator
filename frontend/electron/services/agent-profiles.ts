import { getDb, parseJson, toJson } from '../db/database';
import { AgentProfile } from '../types';
import crypto from 'crypto';

export function listProfiles(): AgentProfile[] {
    const db = getDb();
    const rows = db.prepare('SELECT * FROM agent_profiles ORDER BY is_default DESC, name ASC').all() as any[];
    return rows.map(mapRow);
}

export function getProfile(id: string): AgentProfile | undefined {
    const db = getDb();
    const row = db.prepare('SELECT * FROM agent_profiles WHERE id = ?').get(id) as any;
    if (!row) return undefined;
    return mapRow(row);
}

export function createProfile(data: Partial<AgentProfile>): AgentProfile {
    const db = getDb();
    const id = crypto.randomUUID();

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

    stmt.run(
        id,
        data.name || 'New Profile',
        data.model || 'sonnet',
        toJson(data.skills || []),
        toJson(data.plugins || []),
        data.system_prompt || null,
        data.max_turns || 20,
        toJson(data.allowed_tools),
        data.skip_permissions ? 1 : 0,
        data.branch_prefix || 'feat/',
        data.is_default ? 1 : 0
    );

    return getProfile(id)!;
}

export function updateProfile(id: string, data: Partial<AgentProfile>): AgentProfile {
    const db = getDb();

    if (data.is_default) {
        db.prepare('UPDATE agent_profiles SET is_default = 0').run();
    }

    const updates: string[] = [];
    const values: any[] = [];

    const add = (col: string, val: any) => {
        updates.push(`${col} = ?`);
        values.push(val);
    };

    if (data.name !== undefined) add('name', data.name);
    if (data.model !== undefined) add('model', data.model);
    if (data.skills !== undefined) add('skills', toJson(data.skills));
    if (data.plugins !== undefined) add('plugins', toJson(data.plugins));
    if (data.system_prompt !== undefined) add('system_prompt', data.system_prompt);
    if (data.max_turns !== undefined) add('max_turns', data.max_turns);
    if (data.allowed_tools !== undefined) add('allowed_tools', toJson(data.allowed_tools));
    if (data.skip_permissions !== undefined) add('skip_permissions', data.skip_permissions ? 1 : 0);
    if (data.branch_prefix !== undefined) add('branch_prefix', data.branch_prefix);
    if (data.is_default !== undefined) add('is_default', data.is_default ? 1 : 0);

    add('updated_at', new Date().toISOString());

    if (updates.length > 0) {
        values.push(id);
        db.prepare(`UPDATE agent_profiles SET ${updates.join(', ')} WHERE id = ?`).run(...values);
    }

    return getProfile(id)!;
}

export function deleteProfile(id: string): void {
    const db = getDb();
    db.prepare('DELETE FROM agent_profiles WHERE id = ?').run(id);
}

function mapRow(row: any): AgentProfile {
    return {
        id: row.id,
        name: row.name,
        model: row.model,
        skills: parseJson(row.skills, []),
        plugins: parseJson(row.plugins, []),
        system_prompt: row.system_prompt || undefined,
        max_turns: row.max_turns,
        allowed_tools: parseJson(row.allowed_tools, undefined),
        skip_permissions: Boolean(row.skip_permissions),
        branch_prefix: row.branch_prefix,
        is_default: Boolean(row.is_default),
        created_at: row.created_at,
        updated_at: row.updated_at
    };
}
