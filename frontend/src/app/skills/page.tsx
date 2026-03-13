'use client';

import React, { useEffect, useState } from 'react';
import { Lightbulb, Plus, Trash2, Edit2, Play, Globe, FolderCode } from 'lucide-react';
import { ipc } from '@/lib/ipc';

interface Skill {
    name: string;
    content: string;
    scope: 'global' | 'project';
    projectPath?: string;
}

export default function SkillsPage() {
    const [skills, setSkills] = useState<Skill[]>([]);
    const [selectedSkill, setSelectedSkill] = useState<Skill | null>(null);
    const [isEditing, setIsEditing] = useState(false);

    // Editor State
    const [editName, setEditName] = useState('');
    const [editContent, setEditContent] = useState('');
    const [editScope, setEditScope] = useState<'global' | 'project'>('global');

    const loadSkills = async () => {
        try {
            // For now, testing with only global skills visually if we don't have project path.
            // In a real scenario, we might pass the current active project path.
            const list = await ipc.skills.list(undefined);
            setSkills(list);
            if (list.length > 0 && !selectedSkill) {
                setSelectedSkill(list[0]);
            }
        } catch (err) {
            console.error('Failed to load skills:', err);
        }
    };

    useEffect(() => {
        loadSkills();
    }, []);

    const handleNewSkill = () => {
        setSelectedSkill(null);
        setEditName('');
        setEditContent('');
        setEditScope('global');
        setIsEditing(true);
    };

    const handleSaveSkill = async () => {
        if (!editName.trim()) {
            alert('Skill name is required');
            return;
        }

        try {
            if (selectedSkill) {
                await ipc.skills.update(editName, editContent, editScope, undefined);
            } else {
                await ipc.skills.create(editName, editContent, editScope, undefined);
            }
            setIsEditing(false);
            await loadSkills();
            setSelectedSkill({ name: editName, content: editContent, scope: editScope });
        } catch (err) {
            console.error('Failed to save skill:', err);
            alert('Failed to save skill');
        }
    };

    const handleDelete = async (s: Skill) => {
        if (!confirm(`Are you sure you want to delete ${s.name}?`)) return;
        try {
            await ipc.skills.delete(s.name, s.scope, s.projectPath);
            setSelectedSkill(null);
            setIsEditing(false);
            await loadSkills();
        } catch (err) {
            console.error('Failed to delete skill:', err);
            alert('Failed to delete skill');
        }
    };

    const handleEdit = () => {
        if (!selectedSkill) return;
        setEditName(selectedSkill.name);
        setEditContent(selectedSkill.content);
        setEditScope(selectedSkill.scope);
        setIsEditing(true);
    };

    const handleUseInAgent = (s: Skill) => {
        alert(`Use in agent: /${s.name}`);
        // This would typically navigate to an agent creation page with pre-filled prompt 
        // or trigger a modal. For now just an alert.
    };

    const globalSkills = skills.filter(s => s.scope === 'global');
    const projectSkills = skills.filter(s => s.scope === 'project');

    return (
        <div className="flex flex-col h-full bg-[#030712] text-gray-100 overflow-hidden">
            <div className="flex items-center justify-between p-6 border-b border-[#1f2937]">
                <div>
                    <h1 className="text-2xl font-bold flex items-center gap-2">
                        <Lightbulb className="text-violet-500" /> Skills Manager
                    </h1>
                    <p className="text-sm text-gray-400 mt-1">Manage reusable prompt templates (`~/.claude/commands/`)</p>
                </div>
                <button
                    onClick={handleNewSkill}
                    className="px-4 py-2 bg-violet-600 hover:bg-violet-700 text-white rounded-lg font-medium transition-colors flex items-center gap-2"
                >
                    <Plus size={18} /> New Skill
                </button>
            </div>

            <div className="flex flex-1 overflow-hidden">
                {/* Sidebar List */}
                <div className="w-1/3 flex flex-col border-r border-[#1f2937] overflow-y-auto bg-[#09090b] p-4">
                    <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3 flex items-center gap-2">
                        <Globe size={14} /> Global Skills
                    </h3>
                    <div className="space-y-1 mb-6">
                        {globalSkills.length === 0 && <p className="text-sm text-gray-600 px-3">No global skills</p>}
                        {globalSkills.map(s => (
                            <button
                                key={`global-${s.name}`}
                                onClick={() => { setSelectedSkill(s); setIsEditing(false); }}
                                className={`w-full text-left px-3 py-2 rounded-md text-sm transition-colors flex items-center gap-2
                                    ${selectedSkill?.name === s.name && selectedSkill?.scope === 'global' && !isEditing
                                        ? 'bg-violet-600/20 text-violet-400'
                                        : 'text-gray-300 hover:bg-[#1f2937]'}`}
                            >
                                <span className="font-mono text-xs opacity-50">/</span>{s.name}
                            </button>
                        ))}
                    </div>

                    <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3 flex items-center gap-2">
                        <FolderCode size={14} /> Project Skills
                    </h3>
                    <div className="space-y-1">
                        {projectSkills.length === 0 && <p className="text-sm text-gray-600 px-3">No project skills</p>}
                        {projectSkills.map(s => (
                            <button
                                key={`project-${s.name}`}
                                onClick={() => { setSelectedSkill(s); setIsEditing(false); }}
                                className={`w-full text-left px-3 py-2 rounded-md text-sm transition-colors flex items-center gap-2
                                    ${selectedSkill?.name === s.name && selectedSkill?.scope === 'project' && !isEditing
                                        ? 'bg-violet-600/20 text-violet-400'
                                        : 'text-gray-300 hover:bg-[#1f2937]'}`}
                            >
                                <span className="font-mono text-xs opacity-50">/</span>{s.name}
                            </button>
                        ))}
                    </div>
                </div>

                {/* Main Content Area */}
                <div className="w-2/3 flex flex-col bg-[#111827] overflow-hidden">
                    {isEditing ? (
                        <div className="p-6 flex flex-col h-full">
                            <h2 className="text-xl font-bold mb-6">{selectedSkill ? 'Edit Skill' : 'Create New Skill'}</h2>

                            <div className="space-y-4 flex-1">
                                <div>
                                    <label className="block text-sm font-medium text-gray-400 mb-1">Command Name (without slash)</label>
                                    <input
                                        type="text"
                                        value={editName}
                                        onChange={e => setEditName(e.target.value)}
                                        placeholder="e.g. commit"
                                        disabled={!!selectedSkill} // Cannot rename easily without deleting, simplify for now
                                        className="w-full bg-[#1f2937] border border-[#374151] rounded-lg p-2 focus:outline-none focus:border-violet-500 font-mono"
                                    />
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-gray-400 mb-1">Scope</label>
                                    <select
                                        value={editScope}
                                        onChange={e => setEditScope(e.target.value as 'global' | 'project')}
                                        disabled={!!selectedSkill}
                                        className="w-full bg-[#1f2937] border border-[#374151] rounded-lg p-2 focus:outline-none focus:border-violet-500"
                                    >
                                        <option value="global">Global (~/.claude/commands/)</option>
                                        <option value="project" disabled>Project (.claude/commands/) - Not active in UI yet</option>
                                    </select>
                                </div>

                                <div className="flex-1 flex flex-col pt-2 pb-6">
                                    <label className="block text-sm font-medium text-gray-400 mb-1 flex justify-between">
                                        Skill Prompt Content
                                        <span className="text-xs">Use $ARGUMENTS for parameter injection</span>
                                    </label>
                                    <textarea
                                        value={editContent}
                                        onChange={e => setEditContent(e.target.value)}
                                        className="flex-1 w-full bg-[#1f2937] border border-[#374151] rounded-lg p-4 font-mono text-sm focus:outline-none focus:border-violet-500 resize-none min-h-[300px]"
                                        placeholder="Create a git commit message following conventional commits.&#10;&#10;$ARGUMENTS"
                                    />
                                </div>
                            </div>

                            <div className="flex justify-end gap-3 mt-4 pt-4 border-t border-[#374151]">
                                <button
                                    onClick={() => {
                                        setIsEditing(false);
                                        if (!selectedSkill) setSelectedSkill(skills[0] || null);
                                    }}
                                    className="px-4 py-2 hover:bg-[#374151] rounded-lg transition-colors font-medium text-gray-300"
                                >
                                    Cancel
                                </button>
                                <button
                                    onClick={handleSaveSkill}
                                    className="px-6 py-2 bg-violet-600 hover:bg-violet-700 text-white rounded-lg transition-colors font-medium"
                                >
                                    Save Skill
                                </button>
                            </div>
                        </div>
                    ) : selectedSkill ? (
                        <div className="p-8 flex flex-col h-full overflow-y-auto">
                            <div className="flex items-start justify-between mb-8 pb-6 border-b border-[#1f2937]">
                                <div>
                                    <h2 className="text-2xl font-bold flex items-center gap-2 mb-2">
                                        <span className="text-gray-500">/</span>{selectedSkill.name}
                                    </h2>
                                    <div className="flex items-center gap-4 text-sm text-gray-400">
                                        <span className="flex items-center gap-1 bg-[#1f2937] px-2 py-1 rounded">
                                            {selectedSkill.scope === 'global' ? <Globe size={14} /> : <FolderCode size={14} />}
                                            {selectedSkill.scope === 'global' ? 'Global Scope' : 'Project Scope'}
                                        </span>
                                    </div>
                                </div>
                                <div className="flex items-center gap-2">
                                    <button
                                        onClick={() => handleUseInAgent(selectedSkill)}
                                        className="px-3 py-1.5 bg-green-600/20 hover:bg-green-600/30 text-green-400 rounded transition-colors flex items-center gap-2 text-sm font-medium border border-green-600/30"
                                    >
                                        <Play size={14} /> Use in Agent
                                    </button>
                                    <button
                                        onClick={handleEdit}
                                        className="px-3 py-1.5 bg-[#1f2937] hover:bg-[#374151] text-gray-200 rounded transition-colors flex items-center gap-2 text-sm font-medium border border-[#374151]"
                                    >
                                        <Edit2 size={14} /> Edit
                                    </button>
                                    <button
                                        onClick={() => handleDelete(selectedSkill)}
                                        className="px-3 py-1.5 bg-red-900/40 hover:bg-red-900/60 text-red-400 rounded transition-colors flex items-center gap-2 text-sm font-medium border border-red-900/50"
                                    >
                                        <Trash2 size={14} />
                                    </button>
                                </div>
                            </div>

                            <div>
                                <h3 className="text-sm font-semibold text-gray-400 mb-3 uppercase tracking-wider">Skill Content</h3>
                                <div className="bg-[#09090b] border border-[#1f2937] rounded-lg p-6 overflow-x-auto">
                                    <pre className="text-sm font-mono text-gray-300 whitespace-pre-wrap">{selectedSkill.content}</pre>
                                </div>
                            </div>
                        </div>
                    ) : (
                        <div className="flex items-center justify-center h-full text-gray-500">
                            Select a skill to view or create a new one
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
