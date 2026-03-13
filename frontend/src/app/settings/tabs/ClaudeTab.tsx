import React from 'react';

export default function ClaudeTab({ formData, handleChange, handleSave, saving }: any) {
    return (
        <div className="bg-[#1f2937] rounded-lg p-6 mb-8 border border-[#374151]">
            <h2 className="text-xl font-bold mb-4 text-gray-200">Claude CLI Configuration</h2>

            <div className="grid gap-4 mb-4">
                <div>
                    <label className="block text-sm font-medium text-gray-400 mb-1">Claude binary path</label>
                    <div className="flex gap-2">
                        <input
                            type="text"
                            name="claudePath"
                            value={formData.claudePath || ''}
                            onChange={handleChange}
                            className="w-full bg-[#111827] border border-[#374151] rounded p-2 text-white"
                        />
                        {/* Future placeholders: Browse & Test buttons */}
                        {/* <button className="bg-[#374151] hover:bg-[#4b5563] px-4 py-2 rounded text-sm text-gray-300 transition-colors">Browse</button> */}
                        {/* <button className="bg-[#374151] hover:bg-[#4b5563] px-4 py-2 rounded text-sm text-gray-300 transition-colors">Test</button> */}
                    </div>
                </div>

                <div>
                    <label className="block text-sm font-medium text-gray-400 mb-1">Default model</label>
                    <select
                        name="defaultModel"
                        value={formData.defaultModel || 'claude-sonnet-4-6'}
                        onChange={handleChange}
                        className="w-full bg-[#111827] border border-[#374151] rounded p-2 text-white"
                    >
                        <option value="claude-sonnet-4-6">Sonnet 4.6</option>
                        <option value="claude-opus-4-6">Opus 4.6</option>
                        <option value="claude-haiku-4-5">Haiku 4.5</option>
                    </select>
                </div>

                <div>
                    <label className="block text-sm font-medium text-gray-400 mb-1">Default output format</label>
                    <select
                        name="defaultOutputFormat"
                        value={formData.defaultOutputFormat || 'stream-json'}
                        onChange={handleChange}
                        className="w-full bg-[#111827] border border-[#374151] rounded p-2 text-white"
                    >
                        <option value="stream-json">stream-json</option>
                        <option value="json">json</option>
                        <option value="text">text</option>
                    </select>
                </div>

                <div>
                    <label className="block text-sm font-medium text-gray-400 mb-1">Max turns per session</label>
                    <input
                        type="number"
                        name="maxTurns"
                        value={formData.maxTurns || 10}
                        onChange={handleChange}
                        className="w-full bg-[#111827] border border-[#374151] rounded p-2 text-white"
                    />
                </div>

                <div className="flex items-center gap-2 mt-2">
                    <input
                        type="checkbox"
                        id="verbose"
                        name="verbose"
                        checked={formData.verbose || false}
                        onChange={handleChange}
                        className="w-4 h-4 rounded text-violet-600 focus:ring-violet-500 bg-[#111827] border-[#374151]"
                    />
                    <label htmlFor="verbose" className="text-sm font-medium text-gray-400">
                        Verbose output (--verbose)
                    </label>
                </div>

                <div className="flex items-center gap-2 mt-2">
                    <input
                        type="checkbox"
                        id="skipPermissions"
                        name="skipPermissions"
                        checked={formData.skipPermissions || false}
                        onChange={handleChange}
                        className="w-4 h-4 rounded text-violet-600 focus:ring-violet-500 bg-[#111827] border-[#374151]"
                    />
                    <label htmlFor="skipPermissions" className="text-sm font-medium text-gray-400">
                        Skip permissions (--dangerously-skip-permissions)
                    </label>
                </div>

                <div>
                    <label className="block text-sm font-medium text-gray-400 mb-1">Fallback permission tool</label>
                    <input
                        type="text"
                        name="fallbackPermissionTool"
                        value={formData.fallbackPermissionTool || ''}
                        onChange={handleChange}
                        placeholder="mcp__server__tool_____"
                        className="w-full bg-[#111827] border border-[#374151] rounded p-2 text-white"
                    />
                </div>
            </div>

            <div className="flex justify-end mt-4">
                <button
                    onClick={handleSave}
                    disabled={saving}
                    className="bg-violet-600 hover:bg-violet-700 text-white font-bold py-2 px-6 rounded transition-colors"
                >
                    {saving ? 'Saving...' : 'Save Configuration'}
                </button>
            </div>
        </div>
    );
}
