import React, { useEffect, useState } from 'react';
import { useMcpStore } from '@/store/mcp';

export default function McpManager() {
    const { globalServers, loading, loadGlobal, saveGlobal, deleteGlobal } = useMcpStore();
    const [selectedServer, setSelectedServer] = useState<any>(null);

    const [isAdding, setIsAdding] = useState(false);
    const [newName, setNewName] = useState('');
    const [newCommand, setNewCommand] = useState('');
    const [newArgs, setNewArgs] = useState('');

    useEffect(() => { loadGlobal(); }, [loadGlobal]);

    const handleSave = async () => {
        if (!newName || !newCommand) return;
        const config = {
            command: newCommand,
            args: newArgs ? newArgs.split(' ') : [],
            env: {},
            type: 'stdio'
        };
        await saveGlobal(newName, config);
        setIsAdding(false);
        setNewName('');
        setNewCommand('');
        setNewArgs('');
    };

    return (
        <div className="bg-[#1f2937] rounded-lg p-6 mb-8 border border-[#374151]">
            <div className="flex justify-between items-center mb-6">
                <h2 className="text-xl font-bold text-gray-200">Global MCP Manager</h2>
                <button onClick={() => setIsAdding(!isAdding)} className="bg-violet-600 hover:bg-violet-700 text-white font-bold py-1.5 px-4 text-sm rounded transition-colors">
                    {isAdding ? 'Cancel' : '+ Add Server'}
                </button>
            </div>

            <div className="text-gray-400 text-sm mb-6">
                Manage Model Context Protocol servers tied to <code className="bg-[#111827] px-1 text-violet-300 rounded">~/.claude.json</code>.
            </div>

            {isAdding && (
                <div className="bg-[#111827] border border-[#374151] p-4 rounded-lg mb-6 grid gap-3">
                    <input type="text" placeholder="Server Name (e.g. flow-orchestrator)" value={newName} onChange={e => setNewName(e.target.value)} className="bg-[#1f2937] border border-[#374151] rounded p-2 text-white text-sm font-mono w-full" />
                    <input type="text" placeholder="Command (e.g. node)" value={newCommand} onChange={e => setNewCommand(e.target.value)} className="bg-[#1f2937] border border-[#374151] rounded p-2 text-white flex-1 text-sm font-mono w-full" />
                    <input type="text" placeholder="Args (e.g. /path/to/server.js)" value={newArgs} onChange={e => setNewArgs(e.target.value)} className="bg-[#1f2937] border border-[#374151] rounded p-2 text-white flex-1 text-sm font-mono w-full" />
                    <div className="flex justify-end">
                        <button onClick={handleSave} className="bg-violet-600 hover:bg-violet-700 text-white font-bold py-2 px-6 rounded transition-colors text-sm">Save MCP Server</button>
                    </div>
                </div>
            )}

            <div className="border border-[#374151] rounded-lg overflow-hidden mb-6">
                {loading && globalServers.length === 0 ? (
                    <div className="p-4 text-gray-500 text-sm">Loading...</div>
                ) : (
                    <table className="w-full text-left text-sm text-gray-400">
                        <thead className="bg-[#111827] text-gray-300 border-b border-[#374151]">
                            <tr>
                                <th className="px-4 py-3 font-semibold">Name</th>
                                <th className="px-4 py-3 font-semibold">Type</th>
                                <th className="px-4 py-3 font-semibold">Status</th>
                                <th className="px-4 py-3 font-semibold text-right">Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {globalServers.map(server => (
                                <tr
                                    key={server.name}
                                    className={`border-b border-[#374151] hover:bg-[#111827]/50 cursor-pointer ${selectedServer?.name === server.name ? 'bg-violet-900/10' : ''}`}
                                    onClick={() => setSelectedServer(server)}
                                >
                                    <td className="px-4 py-3 font-medium text-gray-200">{server.name}</td>
                                    <td className="px-4 py-3 font-mono text-xs">{server.type || 'stdio'}</td>
                                    <td className="px-4 py-3 text-emerald-400 flex items-center gap-1">✓ {server.status || 'Registered'}</td>
                                    <td className="px-4 py-3 text-right">
                                        <div className="flex justify-end gap-3 text-xs">
                                            <button onClick={(e) => { e.stopPropagation(); deleteGlobal(server.name); }} className="text-gray-500 hover:text-red-400 transition-colors">🗑 Delete</button>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                            {globalServers.length === 0 && (
                                <tr><td colSpan={4} className="px-4 py-6 text-center text-gray-500">No MCP servers registered globally</td></tr>
                            )}
                        </tbody>
                    </table>
                )}
            </div>

            {selectedServer && (
                <div className="bg-[#111827] p-4 rounded border border-[#374151]">
                    <h3 className="text-sm font-bold text-gray-200 mb-2">Selected: {selectedServer.name}</h3>
                    <div className="text-xs font-mono text-gray-400 flex flex-col gap-1.5">
                        <div className="flex"><span className="w-20 text-gray-500">Command:</span> <span className="text-sky-400">{selectedServer.command}</span></div>
                        <div className="flex items-start"><span className="w-20 text-gray-500 shrink-0">Args:</span> <span className="break-all">{selectedServer.args?.join(' ') || '(none)'}</span></div>
                        <div className="flex"><span className="w-20 text-gray-500">Env:</span> <span>{selectedServer.env ? JSON.stringify(selectedServer.env) : '(none)'}</span></div>
                    </div>
                </div>
            )}
        </div>
    );
}
