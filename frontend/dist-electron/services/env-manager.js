"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.listEnvVars = listEnvVars;
exports.writeEnvVar = writeEnvVar;
exports.deleteEnvVar = deleteEnvVar;
const electron_1 = require("electron");
const database_1 = require("../db/database");
function listEnvVars() {
    const db = (0, database_1.getDb)();
    const rows = db.prepare('SELECT * FROM env_vars ORDER BY key ASC').all();
    return rows.map(row => {
        let decrypted = '•'.repeat(16);
        if (electron_1.safeStorage.isEncryptionAvailable()) {
            try {
                decrypted = electron_1.safeStorage.decryptString(row.encrypted_value);
            }
            catch (e) {
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
function writeEnvVar(key, value) {
    const db = (0, database_1.getDb)();
    if (!electron_1.safeStorage.isEncryptionAvailable()) {
        throw new Error('OS Encryption not available');
    }
    const encrypted = electron_1.safeStorage.encryptString(value);
    db.prepare(`
        INSERT INTO env_vars (key, encrypted_value, created_at, updated_at) 
        VALUES (?, ?, ?, ?)
        ON CONFLICT(key) DO UPDATE SET encrypted_value = excluded.encrypted_value, updated_at = excluded.updated_at
    `).run(key, encrypted, new Date().toISOString(), new Date().toISOString());
}
function deleteEnvVar(key) {
    const db = (0, database_1.getDb)();
    db.prepare('DELETE FROM env_vars WHERE key = ?').run(key);
}
//# sourceMappingURL=env-manager.js.map