'use client';

import React, { useEffect, useState } from 'react';
import { useAgentProfilesStore } from '@/store/agent-profiles';
import { Users, Cpu, Wrench, Shield, Key, AlertCircle, Plus, Edit2, Trash2, Check, X, Search, Download, Puzzle } from 'lucide-react';
import type { AgentProfile, SupportedModel } from '@/types';
import { ipc } from '@/lib/ipc';

interface Skill {
    name: string;
    content: string;
    scope: 'global' | 'project';
    projectPath?: string;
}

export default function AgentProfilesPage() {
    const { profiles, loading, error, load, createProfile, updateProfile, deleteProfile } = useAgentProfilesStore();
    const [search, setSearch] = useState('');
    const [editingProfile, setEditingProfile] = useState<Partial<AgentProfile> | null>(null);

    // Global Marketplace State
    const [githubSkills, setGithubSkills] = useState<{ name: string, description: string, contentUrl: string }[]>([]);
    const [loadingMarketplace, setLoadingMarketplace] = useState(false);

    // Skills State
    const [activeTab, setActiveTab] = useState<'general' | 'skills' | 'marketplace'>('general');
    const [installedSkills, setInstalledSkills] = useState<Skill[]>([]);
    const [skillSearch, setSkillSearch] = useState('');

    useEffect(() => {
        load();
        fetchGithubMarketplace();
    }, [load]);

    useEffect(() => {
        if (editingProfile) {
            loadInstalledSkills();
            setActiveTab('general');
        }
    }, [!!editingProfile]); // Run when modal opens

    const fetchGithubMarketplace = async () => {
        try {
            setLoadingMarketplace(true);
            const res = await fetch('https://api.github.com/repos/anthropics/skills/contents/skills');
            if (res.ok) {
                const data = await res.json();
                if (Array.isArray(data)) {
                    const skills = data.filter(d => d.type === 'dir').map(d => ({
                        name: d.name,
                        description: `Official Anthropic template for ${d.name.replace(/-/g, ' ')}`,
                        contentUrl: `https://raw.githubusercontent.com/anthropics/skills/main/skills/${d.name}/SKILL.md`
                    }));
                    setGithubSkills(skills);
                }
            }
        } catch (err) {
            console.error("Failed to load github marketplace:", err);
        } finally {
            setLoadingMarketplace(false);
        }
    };

    const loadInstalledSkills = async () => {
        try {
            const list = await ipc.skills.list(undefined);
            setInstalledSkills(list);
        } catch (err) {
            console.error('Failed to load skills:', err);
        }
    };

    const handleDownloadSkill = async (marketplaceSkill: { name: string, description: string, contentUrl?: string, content?: string }) => {
        try {
            let skillContent = marketplaceSkill.content;
            if (!skillContent && marketplaceSkill.contentUrl) {
                const res = await fetch(marketplaceSkill.contentUrl);
                if (!res.ok) throw new Error("Failed to download raw skill markdown");
                skillContent = await res.text();
            }

            await ipc.skills.create(
                marketplaceSkill.name,
                skillContent || '',
                'global'
            );
            await loadInstalledSkills(); // Refresh locally installed list

            if (editingProfile) {
                const currentSkills = editingProfile.skills || [];
                // Only add if not already present
                if (!currentSkills.includes(marketplaceSkill.name)) {
                    setEditingProfile({
                        ...editingProfile,
                        skills: [...currentSkills, marketplaceSkill.name]
                    });
                }
            }
        } catch (err) {
            console.error("Failed to download skill:", err);
            alert("Failed to download skill.");
        }
    };

    const toggleSkillInProfile = (skillName: string) => {
        if (!editingProfile) return;
        const currentSkills = editingProfile.skills || [];
        if (currentSkills.includes(skillName)) {
            setEditingProfile({ ...editingProfile, skills: currentSkills.filter(s => s !== skillName) });
        } else {
            setEditingProfile({ ...editingProfile, skills: [...currentSkills, skillName] });
        }
    };

    const filteredProfiles = profiles.filter(p => !search || p.name.toLowerCase().includes(search.toLowerCase()));

    const handleSave = async () => {
        if (!editingProfile) return;
        if (editingProfile.id) {
            await updateProfile(editingProfile.id, editingProfile);
        } else {
            await createProfile(editingProfile);
        }
        setEditingProfile(null);
    };

    if (loading && profiles.length === 0) {
        return <div className="p-8 text-white relative z-10">Loading profiles...</div>;
    }

    return (
        <div className="h-screen flex flex-col p-8 w-full relative z-10">
            {/* Header */}
            <div className="flex justify-between items-center mb-6">
                <div>
                    <h1 className="text-3xl font-bold flex items-center gap-3">
                        <Users size={28} className="text-rose-500" />
                        Agent Profiles
                    </h1>
                    <p className="text-gray-400 text-sm mt-1 ml-10">
                        Manage reusable configurations for your AI agents (models, skills, plugins).
                    </p>
                </div>
                <div className="flex items-center gap-4">
                    <div className="relative">
                        <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                        <input
                            type="text"
                            placeholder="Search profiles..."
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            className="bg-[#1f2937] border border-[#374151] rounded-lg pl-9 pr-4 py-2 text-sm text-white focus:outline-none focus:border-rose-500 w-64"
                        />
                    </div>
                    <button
                        onClick={() => setEditingProfile({ name: '', model: 'sonnet', skills: [], plugins: [], max_turns: 20, branch_prefix: 'feat/', is_default: false, skip_permissions: false })}
                        className="flex items-center gap-2 bg-rose-600 hover:bg-rose-700 text-white px-5 py-2 rounded-lg font-bold transition-all shadow-lg shadow-rose-500/20 active:scale-95 text-sm"
                    >
                        <Plus size={16} />
                        New Profile
                    </button>
                </div>
            </div>

            {error && (
                <div className="bg-red-500/10 border border-red-500/50 text-red-500 p-4 rounded-xl mb-6 flex items-center gap-3">
                    <AlertCircle size={20} />
                    <p>{error}</p>
                </div>
            )}

            {/* Content grid */}
            <div className="flex-1 overflow-y-auto pr-2" style={{ scrollbarWidth: 'thin', scrollbarColor: '#374151 transparent' }}>
                {filteredProfiles.length === 0 ? (
                    <div className="flex flex-col items-center justify-center p-12 bg-[#1f2937]/50 rounded-2xl border border-[#374151] text-center mt-10">
                        <div className="bg-[#374151] p-4 rounded-full mb-4">
                            <Users size={32} className="text-gray-400" />
                        </div>
                        <p className="text-gray-300 font-medium text-lg mb-2">No agent profiles found</p>
                        <p className="text-sm text-gray-500 max-w-sm">Create a profile to bundle specific models, skills, and settings for different workflows.</p>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 pb-12">
                        {filteredProfiles.map(profile => (
                            <div key={profile.id} className="bg-[#1f2937]/30 border border-[#374151] rounded-xl hover:border-gray-500 transition-colors p-5 flex flex-col group relative overflow-hidden">
                                {profile.is_default && (
                                    <div className="absolute top-0 right-0 bg-gradient-to-l from-rose-500/20 to-transparent pr-4 pl-8 py-1 rounded-bl-full border-b border-l border-rose-500/30 text-xs font-bold text-rose-400 flex items-center gap-1">
                                        <Check size={12} /> Default
                                    </div>
                                )}

                                <div className="flex items-start justify-between mb-4">
                                    <h3 className="text-lg font-bold text-gray-100 flex items-center gap-2">
                                        {profile.name}
                                    </h3>
                                </div>

                                <div className="flex flex-wrap gap-2 mb-4">
                                    <span className="px-2.5 py-1 rounded bg-[#374151] text-xs font-semibold text-gray-300 flex items-center gap-1">
                                        <Cpu size={12} /> {profile.model}
                                    </span>
                                    <span className="px-2.5 py-1 rounded bg-[#374151] text-xs font-semibold text-gray-300 flex items-center gap-1">
                                        <Wrench size={12} /> {profile.skills.length} skills
                                    </span>
                                </div>

                                <p className="text-sm text-gray-400 mb-4 line-clamp-2 min-h-[40px]">
                                    {profile.system_prompt || 'No system prompt defined.'}
                                </p>

                                <div className="mt-auto pt-4 border-t border-[#374151] flex items-center justify-between text-xs text-gray-500">
                                    <div className="flex items-center gap-3">
                                        <span title="Branch Prefix" className="flex items-center gap-1"><Key size={14} /> {profile.branch_prefix}</span>
                                        {profile.skip_permissions && <span title="Skips permissions" className="flex items-center gap-1 text-amber-500/70"><Shield size={14} /> Auto-run</span>}
                                    </div>
                                    <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                        <button onClick={() => setEditingProfile(profile)} className="p-1.5 hover:bg-[#374151] rounded text-gray-400 hover:text-white transition-colors">
                                            <Edit2 size={16} />
                                        </button>
                                        {!profile.is_default && (
                                            <button onClick={() => deleteProfile(profile.id)} className="p-1.5 hover:bg-red-500/20 rounded text-gray-400 hover:text-red-500 transition-colors">
                                                <Trash2 size={16} />
                                            </button>
                                        )}
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>

            {/* Modal */}
            {editingProfile && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
                    <div className="bg-[#09090b] border border-[#374151] rounded-2xl w-full max-w-3xl overflow-hidden shadow-2xl flex flex-col max-h-[90vh]">

                        <div className="px-6 py-4 border-b border-[#374151] flex justify-between items-center bg-[#1f2937]/30">
                            <h2 className="text-xl font-bold">{editingProfile.id ? 'Edit Profile' : 'New Profile'}</h2>
                            <button onClick={() => setEditingProfile(null)} className="text-gray-400 hover:text-white transition-colors">
                                <X size={20} />
                            </button>
                        </div>

                        {/* Tabs */}
                        <div className="flex px-6 space-x-6 border-b border-[#374151] bg-[#1f2937]/10">
                            <button
                                onClick={() => setActiveTab('general')}
                                className={`py-4 text-sm font-semibold border-b-2 transition-colors ${activeTab === 'general' ? 'border-rose-500 text-rose-400' : 'border-transparent text-gray-400 hover:text-gray-200'}`}
                            >
                                General Settings
                            </button>
                            <button
                                onClick={() => setActiveTab('skills')}
                                className={`py-4 text-sm font-semibold border-b-2 transition-colors flex items-center gap-2 ${activeTab === 'skills' ? 'border-rose-500 text-rose-400' : 'border-transparent text-gray-400 hover:text-gray-200'}`}
                            >
                                <Wrench size={16} /> Skills & Marketplace
                            </button>
                        </div>

                        <div className="p-6 overflow-y-auto flex-1 space-y-5" style={{ scrollbarWidth: 'thin', scrollbarColor: '#374151 transparent' }}>
                            {/* General Settings Tab */}
                            {activeTab === 'general' && (
                                <div className="space-y-5 animate-in fade-in duration-200">
                                    <div className="grid grid-cols-2 gap-5">
                                        <div className="space-y-1.5">
                                            <label className="text-sm font-semibold text-gray-300">Profile Name</label>
                                            <input
                                                type="text"
                                                value={editingProfile.name || ''}
                                                onChange={e => setEditingProfile({ ...editingProfile, name: e.target.value })}
                                                className="w-full bg-[#1f2937] border border-[#374151] rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-rose-500 transition-colors"
                                                placeholder="e.g. Frontend Specialist"
                                            />
                                        </div>
                                        <div className="space-y-1.5">
                                            <label className="text-sm font-semibold text-gray-300">Model</label>
                                            <select
                                                value={editingProfile.model || 'sonnet'}
                                                onChange={e => setEditingProfile({ ...editingProfile, model: e.target.value as SupportedModel })}
                                                className="w-full bg-[#1f2937] border border-[#374151] rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-rose-500 transition-colors"
                                            >
                                                <option value="sonnet">Claude 3.5 Sonnet</option>
                                                <option value="opus">Claude 3 Opus</option>
                                                <option value="haiku">Claude 3 Haiku</option>
                                            </select>
                                        </div>
                                    </div>

                                    <div className="space-y-1.5">
                                        <label className="text-sm font-semibold text-gray-300">System Prompt</label>
                                        <textarea
                                            rows={4}
                                            value={editingProfile.system_prompt || ''}
                                            onChange={e => setEditingProfile({ ...editingProfile, system_prompt: e.target.value })}
                                            className="w-full bg-[#1f2937] border border-[#374151] rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-rose-500 transition-colors"
                                            placeholder="You are an expert React developer..."
                                        />
                                    </div>

                                    <div className="grid grid-cols-2 gap-5">
                                        <div className="space-y-1.5">
                                            <label className="text-sm font-semibold text-gray-300">Max Auto Turns</label>
                                            <input
                                                type="number"
                                                value={editingProfile.max_turns || 20}
                                                onChange={e => setEditingProfile({ ...editingProfile, max_turns: parseInt(e.target.value) || 20 })}
                                                className="w-full bg-[#1f2937] border border-[#374151] rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-rose-500 transition-colors"
                                            />
                                        </div>
                                        <div className="space-y-1.5">
                                            <label className="text-sm font-semibold text-gray-300">Git Branch Prefix</label>
                                            <input
                                                type="text"
                                                value={editingProfile.branch_prefix || 'feat/'}
                                                onChange={e => setEditingProfile({ ...editingProfile, branch_prefix: e.target.value })}
                                                className="w-full bg-[#1f2937] border border-[#374151] rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-rose-500 transition-colors"
                                            />
                                        </div>
                                    </div>

                                    <div className="flex gap-6 mt-4 pt-4 border-t border-[#374151]">
                                        <label className="flex items-center gap-2 text-sm text-gray-300 cursor-pointer">
                                            <input
                                                type="checkbox"
                                                checked={editingProfile.skip_permissions || false}
                                                onChange={e => setEditingProfile({ ...editingProfile, skip_permissions: e.target.checked })}
                                                className="rounded border-[#374151] bg-[#1f2937] text-rose-500 focus:ring-rose-500 focus:ring-offset-gray-900"
                                            />
                                            Skip Permissions (Auto-run tools)
                                        </label>
                                        <label className="flex items-center gap-2 text-sm text-gray-300 cursor-pointer">
                                            <input
                                                type="checkbox"
                                                checked={editingProfile.is_default || false}
                                                onChange={e => setEditingProfile({ ...editingProfile, is_default: e.target.checked })}
                                                className="rounded border-[#374151] bg-[#1f2937] text-rose-500 focus:ring-rose-500 focus:ring-offset-gray-900"
                                            />
                                            Set as Default Profile
                                        </label>
                                    </div>
                                </div>
                            )}

                            {/* Skills & Marketplace Tab */}
                            {activeTab === 'skills' && (
                                <div className="space-y-8 animate-in fade-in duration-200">
                                    <div className="relative">
                                        <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" />
                                        <input
                                            type="text"
                                            placeholder="Search skills..."
                                            value={skillSearch}
                                            onChange={e => setSkillSearch(e.target.value)}
                                            className="w-full bg-[#1f2937]/50 border border-[#374151] rounded-lg pl-9 pr-3 py-2 text-sm text-white focus:outline-none focus:border-rose-500 transition-colors"
                                        />
                                    </div>

                                    {/* Installed Skills Section */}
                                    <div className="space-y-4">
                                        <div className="mb-2">
                                            <h3 className="text-sm font-semibold text-gray-300">Installed Skills</h3>
                                            <p className="text-xs text-gray-500 mt-1">Select skills to inject their abilities directly into this agent's prompts.</p>
                                        </div>

                                        {installedSkills.length === 0 ? (
                                            <div className="bg-[#1f2937]/30 border border-[#374151] rounded-xl p-6 text-center text-gray-400">
                                                <Wrench size={32} className="mx-auto mb-3 opacity-30" />
                                                <p className="text-sm mb-2">No skills installed.</p>
                                                <p className="text-xs text-gray-500">Download skills from the Marketplace below.</p>
                                            </div>
                                        ) : (
                                            <div className="grid grid-cols-2 gap-3">
                                                {installedSkills
                                                    .filter(s => s.name.toLowerCase().includes(skillSearch.toLowerCase()))
                                                    .map(skill => {
                                                        const isSelected = (editingProfile.skills || []).includes(skill.name);
                                                        return (
                                                            <div
                                                                key={skill.name}
                                                                onClick={() => toggleSkillInProfile(skill.name)}
                                                                className={`p-3 rounded-xl border flex items-center justify-between cursor-pointer transition-colors ${isSelected ? 'bg-rose-500/10 border-rose-500/50 text-rose-400' : 'bg-[#1f2937]/50 border-[#374151] text-gray-300 hover:bg-[#1f2937]'}`}
                                                            >
                                                                <div className="flex items-center gap-2 overflow-hidden">
                                                                    <div className={`w-4 h-4 rounded border flex items-center justify-center shrink-0 ${isSelected ? 'bg-rose-500 border-rose-500 text-black' : 'border-gray-500'}`}>
                                                                        {isSelected && <Check size={12} strokeWidth={4} />}
                                                                    </div>
                                                                    <span className="text-sm font-medium truncate">{skill.name}</span>
                                                                </div>
                                                                <span className="text-[10px] bg-[#09090b] px-1.5 py-0.5 rounded text-gray-500 uppercase">
                                                                    {skill.scope === 'global' ? 'USER' : 'PROJECT'}
                                                                </span>
                                                            </div>
                                                        );
                                                    })}
                                                {installedSkills.filter(s => s.name.toLowerCase().includes(skillSearch.toLowerCase())).length === 0 && (
                                                    <div className="col-span-2 text-center py-4 text-xs text-gray-500 border border-dashed border-[#374151] rounded-xl">
                                                        No installed skills match your search.
                                                    </div>
                                                )}
                                            </div>
                                        )}
                                    </div>

                                    <div className="h-px bg-[#374151] w-full" />

                                    {/* Marketplace Section */}
                                    <div className="space-y-4">
                                        <div className="mb-2 flex items-center justify-between">
                                            <div>
                                                <h3 className="text-sm font-semibold text-gray-300 flex items-center gap-2">
                                                    <Puzzle size={16} /> Anthropic GitHub Marketplace
                                                </h3>
                                                <p className="text-xs text-gray-500 mt-1">Sourced live from `github.com/anthropics/skills`</p>
                                            </div>
                                            {loadingMarketplace && <div className="text-xs text-rose-500 animate-pulse">Fetching...</div>}
                                        </div>

                                        <div className="space-y-3">
                                            {githubSkills
                                                .filter(s => s.name.toLowerCase().includes(skillSearch.toLowerCase()) || s.description.toLowerCase().includes(skillSearch.toLowerCase()))
                                                .map(mSkill => {
                                                    const isInstalled = installedSkills.some(s => s.name === mSkill.name);

                                                    return (
                                                        <div key={mSkill.name} className="p-4 bg-[#1f2937]/30 border border-[#374151] rounded-xl flex items-center justify-between">
                                                            <div>
                                                                <h4 className="text-rose-400 text-sm font-bold">{mSkill.name}</h4>
                                                                <p className="text-xs text-gray-400 mt-1">{mSkill.description}</p>
                                                            </div>

                                                            {isInstalled ? (
                                                                <button
                                                                    disabled
                                                                    className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold bg-[#22c55e]/10 text-[#22c55e] rounded-lg border border-[#22c55e]/30 shrink-0"
                                                                >
                                                                    <Check size={14} /> Installed
                                                                </button>
                                                            ) : (
                                                                <button
                                                                    onClick={(e) => { e.stopPropagation(); handleDownloadSkill(mSkill); }}
                                                                    className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold bg-violet-600 hover:bg-violet-700 text-white rounded-lg transition-colors cursor-pointer shrink-0"
                                                                >
                                                                    <Download size={14} /> Download
                                                                </button>
                                                            )}
                                                        </div>
                                                    );
                                                })}
                                            {!loadingMarketplace && githubSkills.filter(s => s.name.toLowerCase().includes(skillSearch.toLowerCase()) || s.description.toLowerCase().includes(skillSearch.toLowerCase())).length === 0 && (
                                                <div className="text-center py-6 text-xs text-gray-500 border border-dashed border-[#374151] rounded-xl">
                                                    No marketplace skills match your search.
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            )}

                        </div>
                        <div className="px-6 py-4 border-t border-[#374151] bg-[#1f2937]/30 flex justify-end gap-3 z-10">
                            <button
                                onClick={() => setEditingProfile(null)}
                                className="px-4 py-2 rounded-lg text-sm font-medium text-gray-300 hover:text-white hover:bg-[#374151] transition-colors"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={handleSave}
                                disabled={!editingProfile.name}
                                className="px-5 py-2 rounded-lg text-sm font-bold bg-rose-600 hover:bg-rose-700 text-white transition-all shadow-lg shadow-rose-500/20 disabled:opacity-50 flex items-center gap-2"
                            >
                                <Check size={16} /> Save Profile
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
