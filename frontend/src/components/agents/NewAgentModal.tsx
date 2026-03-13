import React, { useState, useEffect } from 'react';
import { X, Folder, Settings2, ChevronDown, ChevronUp, Search } from 'lucide-react';
import { ipc } from '@/lib/ipc';

export function NewAgentModal({ onClose, onSuccess }: { onClose: () => void, onSuccess: () => void }) {
    const [name, setName] = useState('');
    const [projectPath, setProjectPath] = useState('~/');
    const [model, setModel] = useState('sonnet');
    const [submitting, setSubmitting] = useState(false);
    const [showAdvanced, setShowAdvanced] = useState(false);

    // Skills handling
    const [allSkills, setAllSkills] = useState<any[]>([]);
    const [selectedSkills, setSelectedSkills] = useState<string[]>([]);
    const [skillSearch, setSkillSearch] = useState('');

    useEffect(() => {
        loadSkills();
    }, []);

    async function loadSkills() {
        try {
            const list = await ipc.skills.list();
            setAllSkills(list);
        } catch (err) {
            console.error('Failed to load skills:', err);
        }
    }

    const toggleSkill = (skillName: string) => {
        setSelectedSkills(prev =>
            prev.includes(skillName)
                ? prev.filter(s => s !== skillName)
                : [...prev, skillName]
        );
    };

    const handleSelectDirectory = async () => {
        try {
            const path = await ipc.utils.selectDirectory();
            if (path) setProjectPath(path);
        } catch (err) {
            console.error('Failed to select directory:', err);
        }
    };

    // Advanced options
    const [outputFormat, setOutputFormat] = useState('stream-json');
    const [maxTurns, setMaxTurns] = useState(10);
    const [workingDirs, setWorkingDirs] = useState('');
    const [systemPrompt, setSystemPrompt] = useState('');
    const [resumeSession, setResumeSession] = useState('');
    const [worktree, setWorktree] = useState(false);
    const [verbose, setVerbose] = useState(false);
    const [skipPermissions, setSkipPermissions] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setSubmitting(true);
        try {
            await ipc.agents.create({
                name,
                projectPath,
                model: model as 'sonnet' | 'opus' | 'haiku',
                skills: selectedSkills,
                systemPrompt,
                skipPermissions,
            });
            onSuccess();
        } catch (err) {
            alert('Failed to create agent');
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 backdrop-blur-sm px-4 overflow-y-auto py-10">
            <div className="bg-[#1f2937] p-8 rounded-xl w-full max-w-2xl border border-[#374151] shadow-2xl my-auto">
                <div className="flex justify-between items-center mb-6 border-b border-[#374151] pb-4">
                    <h2 className="text-xl font-bold text-gray-100 flex items-center gap-2">
                        <Settings2 size={24} className="text-violet-500" />
                        Create New Agent
                    </h2>
                    <button onClick={onClose} className="text-gray-400 hover:text-white transition-colors bg-[#111827] p-2 rounded-lg">
                        <X size={20} />
                    </button>
                </div>

                <form onSubmit={handleSubmit} className="space-y-5">
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-semibold text-gray-300 mb-1.5">Agent Name</label>
                            <input
                                required
                                type="text"
                                value={name}
                                onChange={e => setName(e.target.value)}
                                placeholder="e.g. Frontend Helper"
                                className="w-full bg-[#111827] border border-[#374151] rounded-lg p-2.5 text-white focus:outline-none focus:border-violet-500 transition-all font-sans"
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-semibold text-gray-300 mb-1.5">Project Path</label>
                            <div className="flex gap-2">
                                <div className="relative flex-1">
                                    <Folder size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" />
                                    <input
                                        required
                                        type="text"
                                        value={projectPath}
                                        onChange={e => setProjectPath(e.target.value)}
                                        placeholder="e.g. /Users/name/projects/app"
                                        className="w-full bg-[#111827] border border-[#374151] rounded-lg py-2.5 pl-10 pr-3 text-white focus:outline-none focus:border-violet-500 transition-all font-mono text-sm"
                                    />
                                </div>
                                <button
                                    type="button"
                                    onClick={handleSelectDirectory}
                                    className="px-4 bg-[#111827] border border-[#374151] rounded-lg hover:bg-[#374151] transition-colors text-gray-400"
                                    title="Choose Directory"
                                >
                                    Choose
                                </button>
                            </div>
                        </div>
                    </div>

                    <div>
                        <label className="block text-sm font-semibold text-gray-300 mb-1.5 flex justify-between items-center">
                            Skills
                            <span className="text-xs text-gray-500 font-normal">{selectedSkills.length} selected</span>
                        </label>
                        <div className="bg-[#111827] border border-[#374151] rounded-xl p-4">
                            <div className="relative mb-3">
                                <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" />
                                <input
                                    type="text"
                                    placeholder="Search installed skills..."
                                    className="w-full bg-[#1f2937] border border-[#374151] rounded-lg py-1.5 pl-9 pr-3 text-sm text-white focus:outline-none focus:border-violet-500"
                                    value={skillSearch}
                                    onChange={e => setSkillSearch(e.target.value)}
                                />
                            </div>

                            <div className="flex flex-wrap gap-2 max-h-[120px] overflow-y-auto pr-1" style={{ scrollbarWidth: 'thin' }}>
                                {allSkills
                                    .filter(s => s.name.toLowerCase().includes(skillSearch.toLowerCase()))
                                    .map(skill => (
                                        <button
                                            key={skill.name}
                                            type="button"
                                            onClick={() => toggleSkill(skill.name)}
                                            className={`
                                                px-3 py-1.5 rounded-lg text-xs font-semibold transition-all border
                                                ${selectedSkills.includes(skill.name)
                                                    ? 'bg-violet-600/20 border-violet-500 text-violet-300'
                                                    : 'bg-[#1f2937] border-[#374151] text-gray-400 hover:border-gray-500'}
                                            `}
                                        >
                                            {skill.name}
                                        </button>
                                    ))
                                }
                                {allSkills.length === 0 && (
                                    <p className="text-xs text-gray-500 italic p-2 w-full text-center">No skills installed. Go to Skills page more.</p>
                                )}
                            </div>
                        </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-semibold text-gray-300 mb-1.5">Model Override</label>
                            <select
                                value={model}
                                onChange={e => setModel(e.target.value)}
                                className="w-full bg-[#111827] border border-[#374151] rounded-lg p-2.5 text-white focus:outline-none focus:border-violet-500 transition-all cursor-pointer"
                            >
                                <option value="sonnet">Claude 3.5 Sonnet (Default)</option>
                                <option value="opus">Claude 3 Opus</option>
                                <option value="haiku">Claude 3 Haiku</option>
                            </select>
                        </div>
                    </div>

                    {/* Advanced Options Toggle */}
                    <div className="pt-2 border-t border-[#374151]">
                        <button
                            type="button"
                            onClick={() => setShowAdvanced(!showAdvanced)}
                            className="flex items-center gap-2 text-sm text-violet-400 hover:text-violet-300 font-semibold focus:outline-none transition-colors"
                        >
                            {showAdvanced ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                            Advanced Options
                        </button>
                    </div>

                    {showAdvanced && (
                        <div className="space-y-4 p-4 bg-[#111827] border border-[#374151] rounded-lg">
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-xs font-semibold text-gray-400 mb-1">Output Format</label>
                                    <select
                                        value={outputFormat}
                                        onChange={e => setOutputFormat(e.target.value)}
                                        className="w-full bg-[#1f2937] border border-[#374151] rounded p-2 text-sm text-white"
                                    >
                                        <option value="stream-json">stream-json (Recommended)</option>
                                        <option value="json">json</option>
                                        <option value="text">text</option>
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-xs font-semibold text-gray-400 mb-1">Max Turns</label>
                                    <input
                                        type="number"
                                        value={maxTurns}
                                        onChange={e => setMaxTurns(parseInt(e.target.value) || 10)}
                                        className="w-full bg-[#1f2937] border border-[#374151] rounded p-2 text-sm text-white"
                                    />
                                </div>
                            </div>

                            <div>
                                <label className="block text-xs font-semibold text-gray-400 mb-1">Working Dirs (--add-dir)</label>
                                <input
                                    type="text"
                                    value={workingDirs}
                                    onChange={e => setWorkingDirs(e.target.value)}
                                    placeholder="e.g. /var/logs, /tmp/output"
                                    className="w-full bg-[#1f2937] border border-[#374151] rounded p-2 text-sm text-white font-mono"
                                />
                            </div>

                            <div>
                                <label className="block text-xs font-semibold text-gray-400 mb-1">System Prompt</label>
                                <textarea
                                    value={systemPrompt}
                                    onChange={e => setSystemPrompt(e.target.value)}
                                    rows={2}
                                    placeholder="Override default system prompt..."
                                    className="w-full bg-[#1f2937] border border-[#374151] rounded p-2 text-sm text-white resize-none"
                                />
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-xs font-semibold text-gray-400 mb-1">Resume Session ID</label>
                                    <input
                                        type="text"
                                        value={resumeSession}
                                        onChange={e => setResumeSession(e.target.value)}
                                        placeholder="e.g. abc-123"
                                        className="w-full bg-[#1f2937] border border-[#374151] rounded p-2 text-sm text-white font-mono"
                                    />
                                </div>
                                <div className="flex flex-col gap-2 pt-2">
                                    <label className="flex items-center gap-2 text-sm text-gray-300 cursor-pointer">
                                        <input type="checkbox" checked={worktree} onChange={e => setWorktree(e.target.checked)} className="rounded bg-[#1f2937] border-[#374151] text-violet-500 focus:ring-violet-500" />
                                        Create Git Worktree (<span className="text-gray-500 font-mono text-xs">--worktree</span>)
                                    </label>
                                    <label className="flex items-center gap-2 text-sm text-gray-300 cursor-pointer">
                                        <input type="checkbox" checked={verbose} onChange={e => setVerbose(e.target.checked)} className="rounded bg-[#1f2937] border-[#374151] text-violet-500 focus:ring-violet-500" />
                                        Verbose Mode (<span className="text-gray-500 font-mono text-xs">--verbose</span>)
                                    </label>
                                    <label className="flex items-center gap-2 text-sm text-gray-300 cursor-pointer">
                                        <input type="checkbox" checked={skipPermissions} onChange={e => setSkipPermissions(e.target.checked)} className="rounded bg-[#1f2937] border-[#374151] text-violet-500 focus:ring-violet-500" />
                                        Skip Permissions <span className="text-red-400 text-xs ml-auto font-bold">Danger</span>
                                    </label>
                                </div>
                            </div>
                        </div>
                    )}

                    <div className="flex justify-end gap-3 pt-6 border-t border-[#374151] mt-2">
                        <button
                            type="button"
                            onClick={onClose}
                            disabled={submitting}
                            className="px-5 py-2.5 text-sm font-semibold text-gray-300 hover:text-white hover:bg-[#374151] rounded-lg transition-colors disabled:opacity-50"
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            disabled={submitting}
                            className="px-5 py-2.5 bg-violet-600 hover:bg-violet-700 active:bg-violet-800 text-white text-sm font-bold rounded-lg shadow-lg shadow-violet-500/20 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            {submitting ? 'Creating...' : 'Create Agent'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}
