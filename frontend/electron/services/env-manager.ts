import { safeStorage } from 'electron';
import { getDb } from '../db/database';

export interface EnvVar {
    key: string;
    value: string; // Will return decrypted if requested
    encrypted_value: Buffer;
    created_at: string;
}

export function listEnvVars(): EnvVar[] {
    const db = getDb();
    const rows = db.prepare('SELECT * FROM env_vars ORDER BY key ASC').all() as any[];

    return rows.map(row => {
        let decrypted = '•'.repeat(16);
        if (safeStorage.isEncryptionAvailable()) {
            try {
                decrypted = safeStorage.decryptString(row.encrypted_value);
            } catch (e) {
                decrypted = '(Decryption Failed)';
            }
        }
        return {
            key: row.key,
            value: decrypted,
            encrypted_value: row.encrypted_value,
            created_at: row.created_at
        };
    });
}

export function writeEnvVar(key: string, value: string): void {
    const db = getDb();
    if (!safeStorage.isEncryptionAvailable()) {
        throw new Error('OS Encryption not available');
    }
    const encrypted = safeStorage.encryptString(value);

    db.prepare(`
        INSERT INTO env_vars (key, encrypted_value, created_at, updated_at) 
        VALUES (?, ?, ?, ?)
        ON CONFLICT(key) DO UPDATE SET encrypted_value = excluded.encrypted_value, updated_at = excluded.updated_at
    `).run(key, encrypted, new Date().toISOString(), new Date().toISOString());
}

export function deleteEnvVar(key: string): void {
    const db = getDb();
    db.prepare('DELETE FROM env_vars WHERE key = ?').run(key);
}
