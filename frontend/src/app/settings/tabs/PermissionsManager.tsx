import React from 'react';

export default function PermissionsManager() {
    return (
        <div className="bg-[#1f2937] rounded-lg p-6 mb-8 border border-[#374151]">
            <h2 className="text-xl font-bold mb-4 text-gray-200">Default Tool Permissions</h2>
            <div className="text-gray-400 text-sm mb-6">
                Configure the tool allow/deny lists applied globally to all new Agents via the <code className="bg-[#111827] px-1 text-violet-300 rounded">--allowedTools</code> and <code className="bg-[#111827] px-1 text-violet-300 rounded">--disallowedTools</code> flags.
            </div>

            <div className="space-y-2 mb-6 text-sm text-gray-200">
                <label className="flex items-center gap-3 p-2 bg-[#111827] border border-[#374151] rounded cursor-pointer hover:border-violet-500 transition-colors">
                    <input type="checkbox" defaultChecked className="w-4 h-4 text-violet-600 focus:ring-violet-500 bg-[#111827] border-[#374151] rounded" />
                    <span>Bash (shell commands)</span>
                </label>
                <label className="flex items-center gap-3 p-2 bg-[#111827] border border-[#374151] rounded cursor-pointer hover:border-violet-500 transition-colors">
                    <input type="checkbox" defaultChecked className="w-4 h-4 text-violet-600 focus:ring-violet-500 bg-[#111827] border-[#374151] rounded" />
                    <span>Write (file creation)</span>
                </label>
                <label className="flex items-center gap-3 p-2 bg-[#111827] border border-[#374151] rounded cursor-pointer hover:border-violet-500 transition-colors">
                    <input type="checkbox" defaultChecked className="w-4 h-4 text-violet-600 focus:ring-violet-500 bg-[#111827] border-[#374151] rounded" />
                    <span>Edit (file edits)</span>
                </label>
                <label className="flex items-center gap-3 p-2 bg-[#111827] border border-[#374151] rounded cursor-pointer hover:border-violet-500 transition-colors">
                    <input type="checkbox" defaultChecked className="w-4 h-4 text-violet-600 focus:ring-violet-500 bg-[#111827] border-[#374151] rounded" />
                    <span>Read (file reads)</span>
                </label>
                <label className="flex items-center gap-3 p-2 bg-[#111827] border border-[#374151] rounded cursor-pointer hover:border-violet-500 transition-colors">
                    <input type="checkbox" defaultChecked className="w-4 h-4 text-violet-600 focus:ring-violet-500 bg-[#111827] border-[#374151] rounded" />
                    <span>WebFetch & WebSearch</span>
                </label>
            </div>

            <div className="flex gap-4">
                <button className="bg-[#111827] border border-[#374151] hover:border-gray-500 px-4 py-2 text-sm rounded transition-colors text-white">Allow all</button>
                <button className="bg-[#111827] border border-[#374151] hover:border-gray-500 px-4 py-2 text-sm rounded transition-colors text-white">Deny all</button>
                <button className="bg-[#111827] border border-[#374151] hover:border-gray-500 px-4 py-2 text-sm rounded transition-colors text-white">Reset defaults</button>
            </div>

            <h3 className="text-md font-bold text-gray-200 mt-8 mb-4">Prompt Mode</h3>
            <div className="flex gap-4 text-sm text-gray-300">
                <label className="flex items-center gap-2 cursor-pointer">
                    <input type="radio" name="promptMode" className="text-violet-600 focus:ring-violet-500 bg-[#111827] border-[#374151]" defaultChecked />
                    default
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                    <input type="radio" name="promptMode" className="text-violet-600 focus:ring-violet-500 bg-[#111827] border-[#374151]" />
                    acceptEdits
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                    <input type="radio" name="promptMode" className="text-violet-600 focus:ring-violet-500 bg-[#111827] border-[#374151]" />
                    bypassPermissions
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                    <input type="radio" name="promptMode" className="text-violet-600 focus:ring-violet-500 bg-[#111827] border-[#374151]" />
                    plan
                </label>
            </div>
        </div>
    );
}
