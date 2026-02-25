'use client';
import { useState, useRef, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Upload, FileText, Sparkles, ArrowRight, X, Github, Zap, Brain, CheckCircle2, GitBranch } from 'lucide-react';
import { extractTasks, listProjects } from '@/lib/api';
import { toast } from '@/components/ui/Toast';
import ToastContainer from '@/components/ui/Toast';
import { Project } from '@/types';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

const SAMPLE = `Product meeting — Feb 2026

Alice: The pagination API is completely broken for large datasets. Users are getting timeouts.
Bob: Agreed, we need to fix that. I'd say high priority, target next sprint.
Alice: Also, the mobile app is missing dark mode. A lot of users have been requesting it.
Carol: Let's add dark mode to the roadmap. Give it 2 weeks.
Bob: One more thing — we need to set up automated database backups. Daily backups to S3.
Alice: That's critical. Should be done within this week.`;

const HOW_IT_WORKS = [
    {
        icon: FileText,
        color: '#6366f1',
        title: 'Paste transcript',
        desc: 'Meeting notes, Slack thread, or any discussion text',
    },
    {
        icon: Brain,
        color: '#a855f7',
        title: 'AI extracts tasks',
        desc: 'Identifies tasks with title, description, criteria & deadline',
    },
    {
        icon: CheckCircle2,
        color: '#10b981',
        title: 'Review & edit',
        desc: 'Edit tasks before approval in the Tasks view',
    },
    {
        icon: GitBranch,
        color: '#3b82f6',
        title: 'Approve & execute',
        desc: 'One click creates GitHub issue + sends email to stakeholders',
    },
];

export default function ExtractPage() {
    const [text, setText] = useState('');
    const [projectId, setProjectId] = useState<string | undefined>("none");
    const [githubRepo, setGithubRepo] = useState('');
    const [projects, setProjects] = useState<Project[]>([]);
    const [dragOver, setDragOver] = useState(false);
    const [loading, setLoading] = useState(false);
    const router = useRouter();
    const fileRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        listProjects().then(data => setProjects(data)).catch(console.error);
        const searchParams = new URLSearchParams(window.location.search);
        const pId = searchParams.get('project_id');
        if (pId) setProjectId(pId);
    }, []);

    async function handleExtract() {
        if (!text.trim()) { toast('error', 'Please paste or upload a transcript first'); return; }
        setLoading(true);
        try {
            const result = await extractTasks(
                text.trim(),
                projectId === "none" ? undefined : projectId,
                githubRepo.trim() || undefined
            );
            toast('success', `Extracted ${result.count} task${result.count !== 1 ? 's' : ''} successfully!`);
            setTimeout(() => router.push('/tasks'), 800);
        } catch (err: unknown) {
            toast('error', err instanceof Error ? err.message : 'Extraction failed');
        } finally {
            setLoading(false);
        }
    }

    function handleFile(file: File) {
        if (!file.type.startsWith('text/')) { toast('error', 'Please upload a .txt or .md file'); return; }
        const reader = new FileReader();
        reader.onload = e => setText(e.target?.result as string ?? '');
        reader.readAsText(file);
    }

    function onDrop(e: React.DragEvent) {
        e.preventDefault(); setDragOver(false);
        const file = e.dataTransfer.files[0];
        if (file) handleFile(file);
    }

    return (
        <div style={{ position: 'relative', overflow: 'hidden', minHeight: 'calc(100vh - 72px)' }}>
            <ToastContainer />

            <div className="glow-blob glow-blob-1" />
            <div className="glow-blob glow-blob-2" />

            <div className="container" style={{ position: 'relative', zIndex: 1, maxWidth: 1600, padding: '0 80px' }}>
                {/* ── Page header ── */}
                <div style={{ padding: '48px 0 36px' }}>
                    <div style={{ display: 'inline-flex', alignItems: 'center', gap: 7, padding: '4px 12px', borderRadius: 999, background: 'rgba(99,102,241,0.1)', border: '1px solid rgba(99,102,241,0.25)', marginBottom: 18 }}>
                        <Zap size={12} color="#818cf8" />
                        <span style={{ fontSize: '0.72rem', fontWeight: 700, color: '#818cf8', letterSpacing: '0.06em', textTransform: 'uppercase' }}>AI Task Extraction</span>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
                        <div>
                            <h1 style={{ fontSize: 'clamp(1.6rem, 3vw, 2.4rem)', fontWeight: 800, letterSpacing: '-0.03em', marginBottom: 8, color: 'var(--text-primary)' }}>
                                Turn discussions into tasks
                            </h1>
                            <p style={{ fontSize: '0.95rem', color: 'var(--text-muted)', maxWidth: 500, lineHeight: 1.7 }}>
                                Paste any meeting transcript or Slack thread — the AI extracts structured, actionable tasks automatically.
                            </p>
                        </div>
                        <button
                            className="btn btn-secondary"
                            onClick={() => setText(SAMPLE)}
                            style={{ whiteSpace: 'nowrap', gap: 8 }}
                        >
                            <FileText size={14} />
                            Try sample transcript
                        </button>
                    </div>
                </div>

                {/* ── Main 2-column layout ── */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 320px', gap: 24, alignItems: 'start', paddingBottom: 80 }}>

                    {/* ── Left: Input panel ── */}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
                        <div style={{
                            background: 'var(--bg-card)',
                            border: '1px solid var(--border)',
                            borderRadius: 16,
                            overflow: 'hidden',
                            boxShadow: '0 4px 24px rgba(0,0,0,0.3)',
                        }}>
                            {/* Card Header bar */}
                            <div style={{
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'space-between',
                                padding: '14px 20px',
                                borderBottom: '1px solid var(--border)',
                                background: 'rgba(255,255,255,0.02)',
                            }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                    <div style={{ display: 'flex', gap: 5 }}>
                                        {['#ef4444', '#f59e0b', '#10b981'].map(c => (
                                            <div key={c} style={{ width: 10, height: 10, borderRadius: '50%', background: c, opacity: 0.7 }} />
                                        ))}
                                    </div>
                                    <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)', marginLeft: 4 }}>
                                        transcript_input.txt
                                    </span>
                                </div>
                                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                    {text && (
                                        <span style={{ fontSize: '0.68rem', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>
                                            {text.length.toLocaleString()} chars
                                        </span>
                                    )}
                                    {text && (
                                        <button
                                            className="btn btn-ghost btn-sm"
                                            onClick={() => setText('')}
                                            style={{ padding: '3px 8px', fontSize: '0.72rem' }}
                                        >
                                            <X size={11} /> Clear
                                        </button>
                                    )}
                                </div>
                            </div>

                            {/* Drop zone (only when empty) */}
                            {!text && (
                                <div
                                    onDragOver={e => { e.preventDefault(); setDragOver(true); }}
                                    onDragLeave={() => setDragOver(false)}
                                    onDrop={onDrop}
                                    onClick={() => fileRef.current?.click()}
                                    style={{
                                        padding: '52px 40px',
                                        textAlign: 'center',
                                        cursor: 'pointer',
                                        transition: 'all 0.15s ease',
                                        background: dragOver ? 'rgba(99,102,241,0.06)' : 'transparent',
                                        borderBottom: '1px solid var(--border)',
                                    }}
                                >
                                    <input ref={fileRef} type="file" accept=".txt,.md" hidden onChange={e => e.target.files?.[0] && handleFile(e.target.files[0])} />
                                    <div style={{
                                        width: 56, height: 56,
                                        borderRadius: 14,
                                        background: 'rgba(99,102,241,0.1)',
                                        border: `1px solid ${dragOver ? 'rgba(99,102,241,0.6)' : 'rgba(99,102,241,0.2)'}`,
                                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                                        margin: '0 auto 16px',
                                        transition: 'all 0.15s ease',
                                    }}>
                                        <Upload size={22} color={dragOver ? 'var(--accent-light)' : 'rgba(129,140,248,0.6)'} />
                                    </div>
                                    <div style={{ fontWeight: 700, fontSize: '1rem', color: 'var(--text-primary)', marginBottom: 6 }}>
                                        Drop a file or click to upload
                                    </div>
                                    <div style={{ fontSize: '0.82rem', color: 'var(--text-muted)' }}>
                                        Supports .txt and .md — or paste text in the editor below
                                    </div>
                                </div>
                            )}

                            {/* Textarea */}
                            <textarea
                                value={text}
                                onChange={e => setText(e.target.value)}
                                placeholder={"# Paste your meeting transcript here\n\nAlice: The API is timing out on large datasets...\nBob: Let's prioritize that for next sprint."}
                                rows={text ? 20 : 6}
                                style={{
                                    width: '100%',
                                    background: 'transparent',
                                    border: 'none',
                                    outline: 'none',
                                    resize: 'none',
                                    padding: '18px 20px',
                                    color: text ? 'var(--text-primary)' : 'var(--text-muted)',
                                    fontFamily: "'JetBrains Mono', monospace",
                                    fontSize: '0.83rem',
                                    lineHeight: 1.85,
                                    display: 'block',
                                }}
                            />
                        </div>

                        {/* ── Context configuration ── */}
                        <div style={{
                            marginTop: 16,
                            background: 'var(--bg-card)',
                            border: '1px solid var(--border)',
                            borderRadius: 14,
                            padding: '18px 20px',
                            display: 'grid',
                            gridTemplateColumns: '1fr 1fr',
                            gap: 16,
                        }}>
                            {/* Project selector */}
                            <div>
                                <label style={{ fontSize: '0.7rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.07em', display: 'flex', alignItems: 'center', gap: 5, marginBottom: 8 }}>
                                    <Sparkles size={11} /> Target Project
                                </label>
                                <Select value={projectId} onValueChange={setProjectId}>
                                    <SelectTrigger className="w-full bg-[var(--bg-input)] border-[var(--border)] text-[var(--text-primary)] h-10 hover:border-[var(--accent)] transition-all text-sm">
                                        <SelectValue placeholder="No project (global)" />
                                    </SelectTrigger>
                                    <SelectContent className="bg-[var(--bg-card)] border-[var(--border)] text-[var(--text-primary)]">
                                        <SelectItem value="none" className="focus:bg-[var(--accent-glow)] focus:text-[var(--accent-light)] text-sm">
                                            No Project (Global)
                                        </SelectItem>
                                        {projects.map(p => (
                                            <SelectItem key={p.id} value={p.id} className="focus:bg-[var(--accent-glow)] focus:text-[var(--accent-light)] text-sm">
                                                {p.name}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                                <p style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginTop: 5 }}>
                                    Injects coding guidelines & architecture context
                                </p>
                            </div>

                            {/* Repo override */}
                            <div>
                                <label style={{ fontSize: '0.7rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.07em', display: 'flex', alignItems: 'center', gap: 5, marginBottom: 8 }}>
                                    <Github size={11} /> Repository Override
                                </label>
                                <input
                                    className="form-input"
                                    style={{ height: 40, fontSize: '0.83rem' }}
                                    placeholder="owner/repo-name"
                                    value={githubRepo}
                                    onChange={e => setGithubRepo(e.target.value)}
                                />
                                <p style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginTop: 5 }}>
                                    Overrides the project's default repository
                                </p>
                            </div>
                        </div>

                        {/* ── CTA button ── */}
                        <button
                            className="btn btn-primary"
                            onClick={handleExtract}
                            disabled={loading || !text.trim()}
                            style={{
                                marginTop: 14,
                                padding: '14px 28px',
                                fontSize: '0.95rem',
                                fontWeight: 700,
                                alignSelf: 'flex-start',
                                borderRadius: 12,
                                background: 'linear-gradient(135deg, #6366f1, #7c3aed)',
                                boxShadow: loading || !text.trim() ? 'none' : '0 0 0 0 rgba(99,102,241,0.4)',
                                animation: loading || !text.trim() ? 'none' : 'pulse-glow 2.5s infinite',
                            }}
                        >
                            {loading
                                ? <><span className="spinner" /> Extracting tasks…</>
                                : <><Sparkles size={17} /> Extract Tasks <ArrowRight size={15} /></>
                            }
                        </button>
                    </div>

                    {/* ── Right: Sidebar ── */}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 14, position: 'sticky', top: 80 }}>

                        {/* How it works */}
                        <div style={{
                            background: 'var(--bg-card)',
                            border: '1px solid var(--border)',
                            borderRadius: 14,
                            overflow: 'hidden',
                        }}>
                            <div style={{ padding: '14px 16px', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', gap: 7 }}>
                                <Zap size={13} color="var(--accent-light)" />
                                <span style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--text-primary)' }}>How it works</span>
                            </div>
                            <div style={{ padding: '14px 16px', display: 'flex', flexDirection: 'column', gap: 0 }}>
                                {HOW_IT_WORKS.map((step, i) => (
                                    <div key={i} style={{ display: 'flex', gap: 12, paddingBottom: i < HOW_IT_WORKS.length - 1 ? 14 : 0, marginBottom: i < HOW_IT_WORKS.length - 1 ? 14 : 0, borderBottom: i < HOW_IT_WORKS.length - 1 ? '1px solid var(--border)' : 'none' }}>
                                        <div style={{
                                            width: 32, height: 32, borderRadius: 9,
                                            background: `${step.color}15`,
                                            border: `1px solid ${step.color}30`,
                                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                                            flexShrink: 0,
                                        }}>
                                            <step.icon size={14} color={step.color} />
                                        </div>
                                        <div style={{ paddingTop: 2 }}>
                                            <div style={{ fontSize: '0.82rem', fontWeight: 700, color: 'var(--text-primary)', marginBottom: 2 }}>{step.title}</div>
                                            <div style={{ fontSize: '0.74rem', color: 'var(--text-muted)', lineHeight: 1.5 }}>{step.desc}</div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>

                        {/* Tips card */}
                        <div style={{
                            background: 'linear-gradient(135deg, rgba(99,102,241,0.08), rgba(168,85,247,0.06))',
                            border: '1px solid rgba(99,102,241,0.2)',
                            borderRadius: 14,
                            padding: '14px 16px',
                        }}>
                            <div style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--accent-light)', marginBottom: 10, display: 'flex', alignItems: 'center', gap: 6 }}>
                                <Brain size={13} /> Pro Tips
                            </div>
                            {[
                                'Include speaker names for better task attribution',
                                'Mention deadlines and priorities explicitly',
                                'Slack threads work just as well as meeting notes',
                            ].map((tip, i) => (
                                <div key={i} style={{ display: 'flex', gap: 7, marginBottom: i < 2 ? 8 : 0, alignItems: 'flex-start' }}>
                                    <div style={{ width: 4, height: 4, borderRadius: '50%', background: 'var(--accent-light)', marginTop: 6, flexShrink: 0, opacity: 0.7 }} />
                                    <span style={{ fontSize: '0.76rem', color: 'var(--text-muted)', lineHeight: 1.5 }}>{tip}</span>
                                </div>
                            ))}
                        </div>

                        {/* Stats card */}
                        <div style={{
                            background: 'var(--bg-card)',
                            border: '1px solid var(--border)',
                            borderRadius: 14,
                            padding: '14px 16px',
                        }}>
                            <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em', fontWeight: 700, marginBottom: 12 }}>
                                Input stats
                            </div>
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                                {[
                                    { label: 'Characters', value: text.length.toLocaleString() },
                                    { label: 'Words', value: text.trim() ? text.trim().split(/\s+/).length.toLocaleString() : '0' },
                                    { label: 'Lines', value: text.trim() ? text.split('\n').length.toLocaleString() : '0' },
                                    { label: 'Est. tokens', value: text.trim() ? Math.round(text.length / 4).toLocaleString() : '0' },
                                ].map(s => (
                                    <div key={s.label} style={{ background: 'var(--bg-base)', borderRadius: 8, padding: '8px 10px' }}>
                                        <div style={{ fontSize: '0.65rem', color: 'var(--text-muted)', marginBottom: 2 }}>{s.label}</div>
                                        <div style={{ fontSize: '1rem', fontWeight: 800, fontFamily: 'var(--font-mono)', color: text ? 'var(--accent-light)' : 'var(--text-muted)' }}>{s.value}</div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            <style>{`
                @keyframes pulse-glow {
                    0%, 100% { box-shadow: 0 0 0 0 rgba(99,102,241,0.4), 0 4px 20px rgba(99,102,241,0.3); }
                    50% { box-shadow: 0 0 0 6px rgba(99,102,241,0), 0 4px 20px rgba(99,102,241,0.5); }
                }
            `}</style>
        </div>
    );
}
