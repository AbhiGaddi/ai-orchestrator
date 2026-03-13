import React, { useEffect, useState } from 'react';
import { useHooksStore } from '@/store/hooks';

export default function HooksManager() {
    const { globalHooks, loading, loadGlobal, saveGlobal } = useHooksStore();
    const [isAdding, setIsAdding] = useState(false);

    const [newEvent, setNewEvent] = useState('pre_command');
    const [newCommand, setNewCommand] = useState('');

    useEffect(() => { loadGlobal(); }, [loadGlobal]);

    const handleAdd = async () => {
        if (!newCommand) return;
        const newHook = {
            id: Math.random().toString(36).substring(2, 9),
            event: newEvent,
            command: newCommand
        };
        await saveGlobal([...globalHooks, newHook]);
        setIsAdding(false);
        setNewCommand('');
    };

    const handleDelete = async (index: number) => {
        const updated = [...globalHooks];
        updated.splice(index, 1);
        await saveGlobal(updated);
    };

    return (
        <div className="bg-[#1f2937] rounded-lg p-6 mb-8 border border-[#374151]">
            <div className="flex justify-between items-center mb-6">
                <h2 className="text-xl font-bold text-gray-200">Global CLI Hooks</h2>
                <button onClick={() => setIsAdding(!isAdding)} className="bg-violet-600 hover:bg-violet-700 text-white font-bold py-1.5 px-4 text-sm rounded transition-colors">
                    {isAdding ? 'Cancel' : '+ Add Hook'}
                </button>
            </div>

            <div className="text-gray-400 text-sm mb-6">
                Hooks run shell commands automatically before or after certain Claude Code CLI actions.
            </div>

            {isAdding && (
                <div className="bg-[#111827] border border-[#374151] p-4 rounded-lg mb-6 grid gap-3">
                    <select value={newEvent} onChange={e => setNewEvent(e.target.value)} className="bg-[#1f2937] border border-[#374151] rounded p-2 text-white text-sm w-full">
                        <option value="pre_command">pre_command</option>
                        <option value="post_command">post_command</option>
                        <option value="pre_tool">pre_tool</option>
                        <option value="post_tool">post_tool</option>
                    </select>
                    <input type="text" placeholder="Command to execute (e.g. npm run build)" value={newCommand} onChange={e => setNewCommand(e.target.value)} className="bg-[#1f2937] border border-[#374151] rounded p-2 text-white flex-1 text-sm font-mono w-full" />
                    <div className="flex justify-end">
                        <button onClick={handleAdd} className="bg-violet-600 hover:bg-violet-700 text-white font-bold py-2 px-6 rounded transition-colors text-sm">Save Hook</button>
                    </div>
                </div>
            )}

            <div className="border border-[#374151] rounded-lg overflow-hidden bg-[#111827]">
                {loading && globalHooks.length === 0 ? (
                    <div className="p-4 text-gray-500 text-sm">Loading...</div>
                ) : (
                    <table className="w-full text-left text-sm text-gray-300">
                        <tbody>
                            {globalHooks.map((hook, idx) => (
                                <tr key={hook.id || idx} className="border-b border-[#374151] hover:bg-white/5">
                                    <td className="px-4 py-3 font-mono text-xs w-32 text-emerald-400">{hook.event}</td>
                                    <td className="px-4 py-3 font-mono text-xs text-gray-400">{hook.command}</td>
                                    <td className="px-4 py-3 text-right">
                                        <button onClick={() => handleDelete(idx)} className="text-gray-500 hover:text-red-400 transition-colors text-xs">🗑 Remove</button>
                                    </td>
                                </tr>
                            ))}
                            {globalHooks.length === 0 && (
                                <tr><td colSpan={3} className="px-4 py-6 text-center text-gray-500">No hooks configured</td></tr>
                            )}
                        </tbody>
                    </table>
                )}
            </div>
        </div>
    );
}
