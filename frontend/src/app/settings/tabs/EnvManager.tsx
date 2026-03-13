import React, { useEffect, useState } from 'react';
import { useEnvStore } from '@/store/env';

export default function EnvManager() {
    const { variables, loading, load, save, remove } = useEnvStore();
    const [newKey, setNewKey] = useState('');
    const [newValue, setNewValue] = useState('');

    useEffect(() => { load(); }, [load]);

    const handleSave = async () => {
        if (!newKey || !newValue) return;
        await save(newKey, newValue);
        setNewKey('');
        setNewValue('');
    };

    return (
        <div className="bg-[#1f2937] rounded-lg p-6 mb-8 border border-[#374151]">
            <div className="flex justify-between items-center mb-6">
                <h2 className="text-xl font-bold text-gray-200">Environment Variables</h2>
            </div>

            <div className="text-gray-400 text-sm mb-6">
                Variables injected into the environment of every Claude Code CLI execution. Stored securely on your local file system using OS keychain bindings.
            </div>

            <div className="flex gap-2 mb-6">
                <input
                    type="text"
                    placeholder="KEY (e.g. ANTHROPIC_API_KEY)"
                    value={newKey} onChange={e => setNewKey(e.target.value)}
                    className="bg-[#111827] border border-[#374151] rounded p-2 text-white flex-1 text-sm font-mono"
                />
                <input
                    type="password"
                    placeholder="Value"
                    value={newValue} onChange={e => setNewValue(e.target.value)}
                    className="bg-[#111827] border border-[#374151] rounded p-2 text-white flex-1 text-sm font-mono"
                />
                <button onClick={handleSave} className="bg-violet-600 hover:bg-violet-700 text-white font-bold py-1.5 px-6 rounded transition-colors whitespace-nowrap">
                    + Add Variable
                </button>
            </div>

            <div className="border border-[#374151] rounded-lg overflow-hidden bg-[#111827]">
                {loading && variables.length === 0 ? (
                    <div className="p-4 text-gray-500 text-sm">Loading...</div>
                ) : (
                    <table className="w-full text-left text-sm text-gray-300">
                        <tbody>
                            {variables.map((v) => (
                                <tr key={v.key} className="border-b border-[#374151] hover:bg-white/5">
                                    <td className="px-4 py-3 font-mono text-xs w-64 text-sky-400">{v.key}</td>
                                    <td className="px-4 py-3 font-mono text-xs text-gray-500">{v.value}</td>
                                    <td className="px-4 py-3 text-right">
                                        <button onClick={() => remove(v.key)} className="text-gray-500 hover:text-red-400 transition-colors text-xs">🗑 Remove</button>
                                    </td>
                                </tr>
                            ))}
                            {variables.length === 0 && (
                                <tr><td colSpan={3} className="px-4 py-6 text-center text-gray-500">No environment variables configured</td></tr>
                            )}
                        </tbody>
                    </table>
                )}
            </div>
        </div>
    );
}
