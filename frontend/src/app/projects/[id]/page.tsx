'use client';
import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import {
    ArrowLeft, Plus, Play, Loader2, FolderOpen,
    CheckCircle2, AlertCircle, Clock, Search, X, ChevronRight
} from 'lucide-react';
import type { Task, Project, AgentProfile, Agent } from '@/types';
import { ipc } from '@/lib/ipc';

// ── Status meta ───────────────────────────────────────────────────────────────

const S: Record<string, { label: string; color: string; dot?: string }> = {
    PENDING: { label: 'Pending', color: '#9ca3af' },
    APPROVED: { label: 'Approved', color: '#60a5fa' },
    QUEUED: { label: 'Queued', color: '#f59e0b' },
    IN_PROGRESS: { label: 'Running', color: '#0ea5e9', dot: 'animate-pulse' },
    REVIEW: { label: 'Review', color: '#a855f7' },
    COMPLETED: { label: 'Completed', color: '#10b981' },
    DONE: { label: 'Done', color: '#10b981' },
    FAILED: { label: 'Failed', color: '#ef4444' },
};

const P: Record<string, string> = {
    LOW: '#9ca3af', MEDIUM: '#f59e0b', HIGH: '#f97316', CRITICAL: '#ef4444',
};

const TABS = ['ALL', 'PENDING', 'IN_PROGRESS', 'DONE', 'FAILED'] as const;
type Tab = typeof TABS[number];

// ── New Task modal ─────────────────────────────────────────────────────────────

interface NewTaskForm {
    title: string;
    description: string;
    acceptance_criteria: string;
    priority: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
    profile_id: string;
}

function NewTaskModal({
    projectId,
    profiles,
    onClose,
    onCreated,
}: {
    projectId: string;
    profiles: AgentProfile[];
    onClose: () => void;
    onCreated: (task: Task) => void;
}) {
    const [form, setForm] = useState<NewTaskForm>({
        title: '', description: '', acceptance_criteria: '',
        priority: 'MEDIUM', profile_id: profiles.find(p => p.is_default)?.id ?? profiles[0]?.id ?? '',
    });
    const [saving, setSaving] = useState(false);

    async function handleSave(runNow = false) {
        if (!form.title.trim()) return;
        setSaving(true);
        try {
            const task = await ipc.tasks.create({
                title: form.title.trim(),
                description: form.description.trim(),
                acceptance_criteria: form.acceptance_criteria.trim() || undefined,
                priority: form.priority,
                project_id: projectId,
                profile_id: form.profile_id || undefined,
                status: 'PENDING',
            });
            if (runNow) await ipc.tasks.execute(task.id);
            onCreated(task);
        } finally {
            setSaving(false);
        }
    }

    return (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4" onClick={onClose}>
            <div className="bg-[#141820] border border-[#374151] rounded-2xl p-6 w-full max-w-lg flex flex-col gap-4" onClick={e => e.stopPropagation()}>
                <div className="flex items-center justify-between">
                    <h2 className="text-lg font-bold text-white">New Task</h2>
                    <button onClick={onClose} className="text-gray-500 hover:text-gray-300"><X size={18} /></button>
                </div>

                <div className="flex flex-col gap-3">
                    <div>
                        <label className="block text-xs font-semibold text-gray-400 mb-1.5">Title *</label>
                        <input
                            autoFocus
                            className="w-full bg-[#0B0D11] border border-[#374151] rounded-lg px-3 py-2 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-violet-500"
                            placeholder="e.g. Implement login page"
                            value={form.title}
                            onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
                        />
                    </div>
                    <div>
                        <label className="block text-xs font-semibold text-gray-400 mb-1.5">Description</label>
                        <textarea
                            rows={3}
                            className="w-full bg-[#0B0D11] border border-[#374151] rounded-lg px-3 py-2 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-violet-500 resize-none"
                            placeholder="What needs to be done..."
                            value={form.description}
                            onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
                        />
                    </div>
                    <div>
                        <label className="block text-xs font-semibold text-gray-400 mb-1.5">Acceptance Criteria</label>
                        <textarea
                            rows={2}
                            className="w-full bg-[#0B0D11] border border-[#374151] rounded-lg px-3 py-2 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-violet-500 resize-none"
                            placeholder="- User can log in&#10;- Errors are shown"
                            value={form.acceptance_criteria}
                            onChange={e => setForm(f => ({ ...f, acceptance_criteria: e.target.value }))}
                        />
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                        <div>
                            <label className="block text-xs font-semibold text-gray-400 mb-1.5">Priority</label>
                            <select
                                className="w-full bg-[#0B0D11] border border-[#374151] rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-violet-500"
                                value={form.priority}
                                onChange={e => setForm(f => ({ ...f, priority: e.target.value as NewTaskForm['priority'] }))}
                            >
                                {['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'].map(p => (
                                    <option key={p} value={p}>{p}</option>
                                ))}
                            </select>
                        </div>
                        <div>
                            <label className="block text-xs font-semibold text-gray-400 mb-1.5">Profile</label>
                            <select
                                className="w-full bg-[#0B0D11] border border-[#374151] rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-violet-500"
                                value={form.profile_id}
                                onChange={e => setForm(f => ({ ...f, profile_id: e.target.value }))}
                            >
                                <option value="">Default</option>
                                {profiles.map(p => (
                                    <option key={p.id} value={p.id}>{p.name}</option>
                                ))}
                            </select>
                        </div>
                    </div>
                </div>

                <div className="flex gap-2 pt-1">
                    <button onClick={onClose} className="flex-1 py-2 rounded-xl border border-[#374151] text-gray-400 hover:bg-[#1f2937] text-sm transition-colors">
                        Cancel
                    </button>
                    <button
                        onClick={() => handleSave(false)}
                        disabled={!form.title.trim() || saving}
                        className="flex-1 py-2 rounded-xl bg-[#1f2937] hover:bg-[#374151] border border-[#374151] text-gray-200 text-sm font-medium transition-colors disabled:opacity-40"
                    >
                        Save as Pending
                    </button>
                    <button
                        onClick={() => handleSave(true)}
                        disabled={!form.title.trim() || saving}
                        className="flex-1 py-2 rounded-xl bg-violet-600 hover:bg-violet-700 text-white text-sm font-semibold transition-colors disabled:opacity-40 flex items-center justify-center gap-1.5"
                    >
                        {saving ? <Loader2 size={13} className="animate-spin" /> : <Play size={13} />}
                        ▶ Code Now
                    </button>
                </div>
            </div>
        </div>
    );
}

// ── Task row ──────────────────────────────────────────────────────────────────

function TaskRow({
    task,
    profile,
    agent,
    onExecute,
}: {
    task: Task;
    profile?: AgentProfile;
    agent?: Agent;
    onExecute: (id: string) => void;
}) {
    const sm = S[task.status] ?? S.PENDING;
    const isRunning = task.status === 'IN_PROGRESS' || agent?.status === 'running';
    const isDone = ['COMPLETED', 'DONE', 'FAILED'].includes(task.status);

    return (
        <Link href={`/tasks/${task.id}`} className="block group">
            <div className={`flex items-center gap-4 px-4 py-3.5 rounded-xl border transition-all ${isRunning
                    ? 'bg-[#0d1520] border-sky-500/30 hover:border-sky-500/50'
                    : 'bg-[#141820] border-[#1f2937] hover:border-[#374151]'
                }`}>
                {/* Status dot */}
                <div
                    className={`flex-shrink-0 w-2 h-2 rounded-full${isRunning ? ' animate-pulse' : ''}`}
                    style={{ background: sm.color, boxShadow: isRunning ? `0 0 6px ${sm.color}` : 'none' }}
                />

                {/* Title + meta */}
                <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium text-gray-100 group-hover:text-white truncate">{task.title}</div>
                    <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                        <span className="text-[11px]" style={{ color: sm.color }}>{sm.label}</span>
                        <span className="text-gray-700">·</span>
                        <span className="text-[11px] font-semibold" style={{ color: P[task.priority] }}>{task.priority}</span>
                        {profile && (
                            <>
                                <span className="text-gray-700">·</span>
                                <span className="text-[11px] text-gray-500">{profile.name}</span>
                            </>
                        )}
                        {isRunning && task.turn_count > 0 && (
                            <>
                                <span className="text-gray-700">·</span>
                                <span className="text-[11px] text-sky-400 font-mono">Turn {task.turn_count}</span>
                            </>
                        )}
                    </div>
                </div>

                {/* Action */}
                <div className="flex-shrink-0" onClick={e => e.preventDefault()}>
                    {isRunning ? (
                        <div className="flex items-center gap-1.5 text-[11px] text-sky-400 font-medium px-2.5 py-1 bg-sky-500/10 rounded-lg">
                            <Loader2 size={11} className="animate-spin" /> Running
                        </div>
                    ) : isDone ? (
                        <div className="flex items-center gap-1 text-[11px]" style={{ color: sm.color }}>
                            {task.status === 'FAILED' ? <AlertCircle size={12} /> : <CheckCircle2 size={12} />}
                            {sm.label}
                        </div>
                    ) : (
                        <button
                            onClick={(e) => { e.preventDefault(); e.stopPropagation(); onExecute(task.id); }}
                            className="flex items-center gap-1 text-[11px] text-violet-400 bg-violet-500/10 hover:bg-violet-500/20 border border-violet-500/20 px-2.5 py-1 rounded-lg font-medium transition-colors"
                        >
                            <Play size={11} /> Code
                        </button>
                    )}
                </div>

                <ChevronRight size={14} className="text-gray-700 group-hover:text-gray-500 flex-shrink-0 transition-colors" />
            </div>
        </Link>
    );
}

// ── Page ───────────────────────────────────────────────────────────────────────

export default function ProjectDetailPage() {
    const { id: projectId } = useParams<{ id: string }>();
    const router = useRouter();

    const [project, setProject] = useState<Project | null>(null);
    const [tasks, setTasks] = useState<Task[]>([]);
    const [profiles, setProfiles] = useState<AgentProfile[]>([]);
    const [agents, setAgents] = useState<Agent[]>([]);
    const [loading, setLoading] = useState(true);
    const [tab, setTab] = useState<Tab>('ALL');
    const [search, setSearch] = useState('');
    const [showModal, setShowModal] = useState(false);
    const [executingId, setExecutingId] = useState<string | null>(null);

    async function load() {
        try {
            const [proj, taskList, profileList, agentList] = await Promise.all([
                ipc.projects.get(projectId),
                ipc.tasks.list(projectId),
                ipc.agentProfiles.list(),
                ipc.agents.list(),
            ]);
            setProject(proj);
            setTasks(taskList);
            setProfiles(profileList);
            setAgents(agentList);
        } catch {
            router.push('/projects');
        } finally {
            setLoading(false);
        }
    }

    useEffect(() => {
        load();
        const interval = setInterval(load, 8000); // refresh for live status
        return () => clearInterval(interval);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [projectId]);

    async function handleExecute(taskId: string) {
        setExecutingId(taskId);
        try {
            await ipc.tasks.execute(taskId);
            await load();
        } finally {
            setExecutingId(null);
        }
    }

    const filtered = tasks.filter(t => {
        const matchTab = tab === 'ALL'
            || (tab === 'DONE' && ['DONE', 'COMPLETED'].includes(t.status))
            || (tab === 'FAILED' && t.status === 'FAILED')
            || t.status === tab;
        const matchSearch = !search || t.title.toLowerCase().includes(search.toLowerCase());
        return matchTab && matchSearch;
    });

    const profileMap = Object.fromEntries(profiles.map(p => [p.id, p]));
    const agentByTask = Object.fromEntries(agents.filter(a => a.taskId).map(a => [a.taskId!, a]));

    const running = tasks.filter(t => t.status === 'IN_PROGRESS').length;
    const done = tasks.filter(t => ['DONE', 'COMPLETED'].includes(t.status)).length;
    const projectPath = project?.local_path ?? '';

    if (loading) {
        return (
            <div className="flex items-center justify-center h-screen pl-[256px]">
                <Loader2 size={24} className="animate-spin text-violet-400" />
            </div>
        );
    }

    if (!project) return null;

    return (
        <div className="min-h-screen bg-[#0B0D11]">
            <div className="max-w-[1600px] mx-auto px-6 py-6 flex flex-col gap-5">

                {/* Back */}
                <Link href="/projects" className="inline-flex items-center gap-1.5 text-xs text-gray-500 hover:text-gray-300 transition-colors w-fit">
                    <ArrowLeft size={13} /> Projects
                </Link>

                {/* Header */}
                <div className="flex items-start justify-between gap-4">
                    <div>
                        <div className="flex items-center gap-2 mb-1">
                            <FolderOpen size={18} className="text-indigo-400" />
                            <h1 className="text-2xl font-bold text-white">{project.name}</h1>
                        </div>
                        {projectPath && (
                            <p className="text-xs text-gray-500 font-mono ml-7">{projectPath}</p>
                        )}
                        {project.description && (
                            <p className="text-sm text-gray-400 mt-1 ml-7">{project.description}</p>
                        )}
                    </div>
                    <button
                        onClick={() => setShowModal(true)}
                        className="flex items-center gap-2 px-4 py-2 bg-violet-600 hover:bg-violet-700 text-white rounded-lg text-sm font-semibold transition-colors shadow-lg shadow-violet-500/20 flex-shrink-0"
                    >
                        <Plus size={16} /> New Task
                    </button>
                </div>

                {/* Stats */}
                <div className="grid grid-cols-4 gap-3">
                    {[
                        { label: 'Total', value: tasks.length, color: '#6366f1' },
                        { label: 'Running', value: running, color: '#0ea5e9' },
                        { label: 'Done', value: done, color: '#10b981' },
                        { label: 'Failed', value: tasks.filter(t => t.status === 'FAILED').length, color: '#ef4444' },
                    ].map(s => (
                        <div key={s.label} className="bg-[#141820] border border-[#1f2937] rounded-xl p-3 text-center">
                            <div className="text-2xl font-bold font-mono" style={{ color: s.color }}>{s.value}</div>
                            <div className="text-[11px] text-gray-500 mt-0.5">{s.label}</div>
                        </div>
                    ))}
                </div>

                {/* Filters */}
                <div className="flex items-center gap-3">
                    <div className="flex bg-[#141820] border border-[#1f2937] rounded-xl p-1 gap-0.5">
                        {TABS.map(t => (
                            <button
                                key={t}
                                onClick={() => setTab(t)}
                                className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${tab === t ? 'bg-violet-600 text-white' : 'text-gray-400 hover:text-gray-200'
                                    }`}
                            >
                                {t === 'IN_PROGRESS' ? 'Running' : t === 'ALL' ? 'All' : t.charAt(0) + t.slice(1).toLowerCase()}
                            </button>
                        ))}
                    </div>
                    <div className="flex-1 relative">
                        <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" />
                        <input
                            className="w-full bg-[#141820] border border-[#1f2937] rounded-xl pl-9 pr-3 py-2 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-[#374151]"
                            placeholder="Search tasks..."
                            value={search}
                            onChange={e => setSearch(e.target.value)}
                        />
                    </div>
                </div>

                {/* Task list */}
                <div className="flex flex-col gap-2">
                    {filtered.length === 0 ? (
                        <div className="flex flex-col items-center justify-center py-16 text-gray-600 gap-3">
                            <Clock size={36} className="opacity-30" />
                            <p className="text-sm">
                                {search ? 'No tasks match your search' : 'No tasks yet — create one to get started'}
                            </p>
                            {!search && (
                                <button onClick={() => setShowModal(true)} className="text-sm text-violet-400 hover:text-violet-300 transition-colors">
                                    + New Task
                                </button>
                            )}
                        </div>
                    ) : (
                        filtered.map(task => (
                            <TaskRow
                                key={task.id}
                                task={executingId === task.id ? { ...task, status: 'IN_PROGRESS' } : task}
                                profile={task.profile_id ? profileMap[task.profile_id] : undefined}
                                agent={agentByTask[task.id]}
                                onExecute={handleExecute}
                            />
                        ))
                    )}
                </div>
            </div>

            {showModal && (
                <NewTaskModal
                    projectId={projectId}
                    profiles={profiles}
                    onClose={() => setShowModal(false)}
                    onCreated={() => { setShowModal(false); load(); }}
                />
            )}
        </div>
    );
}
