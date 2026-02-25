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


    return (
        <div style={{ position: 'relative', overflow: 'hidden', minHeight: 'calc(100vh - 72px)' }}>
            <ToastContainer />

            <div className="glow-blob glow-blob-1" />
            <div className="glow-blob glow-blob-2" />

            <div className="container" style={{ position: 'relative', zIndex: 1, maxWidth: 1600, padding: '0 60px' }}>
                {/* ── Page header ── */}
                <div style={{ padding: '20px 0 8px' }}>
                    <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '3px 10px', borderRadius: 999, background: 'rgba(99,102,241,0.08)', border: '1px solid rgba(99,102,241,0.2)', marginBottom: 12 }}>
                        <Zap size={10} color="#818cf8" />
                        <span style={{ fontSize: '0.65rem', fontWeight: 700, color: '#818cf8', letterSpacing: '0.05em', textTransform: 'uppercase' }}>AI Task Extraction</span>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
                        <div>
                            <h1 style={{ fontSize: 'clamp(1.3rem, 2.5vw, 1.8rem)', fontWeight: 800, letterSpacing: '-0.02em', marginBottom: 6, color: 'var(--text-primary)' }}>
                                Turn discussions into tasks
                            </h1>
                            <p style={{ fontSize: '0.88rem', color: 'var(--text-secondary)', maxWidth: 600, lineHeight: 1.5 }}>
                                Paste a transcript or discussion thread to extract tasks.
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
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>

                        {/* ── Context configuration (Now above the editor) ── */}
                        <div style={{
                            background: 'var(--bg-card)',
                            border: '1px solid var(--border)',
                            borderRadius: 16,
                            padding: '10px 18px',
                            display: 'grid',
                            gridTemplateColumns: '1fr 1fr',
                            gap: 16,
                            boxShadow: 'var(--shadow-card)',
                        }}>
                            <div>
                                <label style={{ fontSize: '0.68rem', fontWeight: 800, color: 'var(--text-primary)', textTransform: 'uppercase', letterSpacing: '0.08em', display: 'flex', alignItems: 'center', gap: 5, marginBottom: 6 }}>
                                    <Sparkles size={10} color="var(--accent)" /> Target Project
                                </label>
                                <Select value={projectId} onValueChange={setProjectId}>
                                    <SelectTrigger className="w-full bg-[var(--bg-input)] border-[var(--border)] text-[var(--text-primary)] h-9 hover:border-[var(--accent)] transition-all text-xs font-bold">
                                        <SelectValue placeholder="No project (global)" />
                                    </SelectTrigger>
                                    <SelectContent className="bg-[var(--bg-card)] border-[var(--border)] text-[var(--text-primary)] shadow-2xl">
                                        <SelectItem value="none" className="focus:bg-[var(--accent-glow)] focus:text-[var(--accent-light)] text-sm font-medium">
                                            No Project (Global)
                                        </SelectItem>
                                        {projects.map(p => (
                                            <SelectItem key={p.id} value={p.id} className="focus:bg-[var(--accent-glow)] focus:text-[var(--accent-light)] text-sm font-medium">
                                                {p.name}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>

                            <div>
                                <label style={{ fontSize: '0.68rem', fontWeight: 800, color: 'var(--text-primary)', textTransform: 'uppercase', letterSpacing: '0.08em', display: 'flex', alignItems: 'center', gap: 5, marginBottom: 6 }}>
                                    <Github size={10} color="var(--blue)" /> Repository
                                </label>
                                <input
                                    className="form-input"
                                    style={{ height: 36, fontSize: '0.8rem', fontWeight: 600, border: '1px solid var(--border)' }}
                                    placeholder="owner/repo-name"
                                    value={githubRepo}
                                    onChange={e => setGithubRepo(e.target.value)}
                                />
                            </div>
                        </div>

                        <div style={{
                            background: 'var(--bg-card)',
                            border: '1px solid var(--border)',
                            borderRadius: 16,
                            overflow: 'hidden',
                            boxShadow: 'var(--shadow-card)',
                        }}>
                            {/* Card Header bar */}
                            <div style={{
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'space-between',
                                padding: '10px 16px',
                                borderBottom: '1px solid var(--border)',
                                background: 'rgba(255,255,255,0.02)',
                            }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                    <div style={{ display: 'flex', gap: 5 }}>
                                        {['#ef4444', '#f59e0b', '#10b981'].map(c => (
                                            <div key={c} style={{ width: 10, height: 10, borderRadius: '50%', background: c, opacity: 0.7 }} />
                                        ))}
                                    </div>
                                    <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', fontWeight: 700, fontFamily: 'var(--font-mono)', marginLeft: 4 }}>
                                        transcript_editor.txt
                                    </span>
                                </div>
                                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                                    <input ref={fileRef} type="file" accept=".txt,.md" hidden onChange={e => e.target.files?.[0] && handleFile(e.target.files[0])} />
                                    <button
                                        className="btn btn-ghost btn-sm"
                                        onClick={() => fileRef.current?.click()}
                                        style={{ padding: '4px 10px', fontSize: '0.7rem', gap: 6, background: 'rgba(255,255,255,0.03)', border: '1px solid var(--border)' }}
                                    >
                                        <Upload size={12} /> Upload
                                    </button>
                                    {text && (
                                        <button
                                            className="btn btn-ghost btn-sm"
                                            onClick={() => setText('')}
                                            style={{ padding: '3px 8px', fontSize: '0.72rem', color: '#ef4444' }}
                                        >
                                            <X size={11} /> Clear
                                        </button>
                                    )}
                                </div>
                            </div>

                            {/* Textarea */}
                            <textarea
                                value={text}
                                onChange={e => setText(e.target.value)}
                                placeholder={"# Paste your meeting transcript here\n\nAlice: The API is timing out on large datasets...\nBob: Let's prioritize that for next sprint."}
                                style={{
                                    width: '100%',
                                    height: '30vh',
                                    minHeight: '180px',
                                    background: 'transparent',
                                    border: 'none',
                                    outline: 'none',
                                    resize: 'none',
                                    padding: '12px 16px',
                                    color: text ? 'var(--text-primary)' : 'var(--text-muted)',
                                    fontFamily: "'JetBrains Mono', monospace",
                                    fontSize: '0.8rem',
                                    lineHeight: 1.7,
                                    display: 'block',
                                }}
                            />
                        </div>

                        {/* ── CTA button (Now below the editor) ── */}
                        {(() => {
                            const words = text.trim() ? text.trim().split(/\s+/).length : 0;
                            const isMinLength = words >= 5;
                            const isDisabled = loading || !isMinLength;

                            return (
                                <div style={{ position: 'relative' }}>
                                    {/* Compact Stats Bar */}
                                    <div style={{
                                        display: 'grid',
                                        gridTemplateColumns: 'repeat(4, 1fr)',
                                        gap: 8,
                                        marginBottom: 10,
                                        background: 'rgba(255,255,255,0.02)',
                                        border: '1px solid var(--border)',
                                        borderRadius: 10,
                                        padding: '8px 12px',
                                    }}>
                                        {[
                                            { label: 'Chars', value: text.length.toLocaleString() },
                                            { label: 'Words', value: text.trim() ? text.trim().split(/\s+/).length.toLocaleString() : '0' },
                                            { label: 'Lines', value: text.trim() ? text.split('\n').length.toLocaleString() : '0' },
                                            { label: 'Tokens', value: text.trim() ? Math.round(text.length / 4).toLocaleString() : '0' },
                                        ].map(s => (
                                            <div key={s.label} style={{ textAlign: 'center' }}>
                                                <div style={{ fontSize: '0.6rem', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.04em', fontWeight: 700, marginBottom: 1 }}>{s.label}</div>
                                                <div style={{ fontSize: '0.85rem', fontWeight: 800, fontFamily: 'var(--font-mono)', color: text ? 'var(--accent-light)' : 'var(--text-muted)' }}>{s.value}</div>
                                            </div>
                                        ))}
                                    </div>

                                    <button
                                        className="btn btn-primary"
                                        onClick={handleExtract}
                                        disabled={isDisabled}
                                        style={{
                                            width: '100%',
                                            padding: '12px 0',
                                            fontSize: '0.88rem',
                                            fontWeight: 900,
                                            borderRadius: 10,
                                            background: isDisabled
                                                ? 'rgba(168, 85, 247, 0.15)'
                                                : 'linear-gradient(135deg, #a855f7, #6366f1)',
                                            border: `2px solid ${isDisabled ? 'rgba(168, 85, 247, 0.25)' : 'transparent'}`,
                                            color: isDisabled ? 'var(--text-secondary)' : '#fff',
                                            boxShadow: isDisabled
                                                ? 'none'
                                                : '0 12px 28px rgba(168,85,247,0.3)',
                                            display: 'flex',
                                            alignItems: 'center',
                                            justifyContent: 'center',
                                            gap: 12,
                                            transition: 'all 0.25s cubic-bezier(0.4, 0, 0.2, 1)',
                                            cursor: isDisabled ? 'not-allowed' : 'pointer',
                                            opacity: 1,
                                            textTransform: 'uppercase',
                                            letterSpacing: '0.03em',
                                            marginTop: 6,
                                        }}
                                    >
                                        {loading ? (
                                            <><span className="spinner" style={{ width: 16, height: 16 }} /> Extracting…</>
                                        ) : (
                                            <>
                                                <Sparkles size={18} />
                                                EXTRACT ACTIONABLE TASKS
                                                <ArrowRight size={16} />
                                            </>
                                        )}
                                    </button>
                                    {!isMinLength && text.trim().length > 0 && (
                                        <div style={{ textAlign: 'right', marginTop: 6, fontSize: '0.65rem', color: 'var(--red)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                                            Min. 5 words required ({words}/5)
                                        </div>
                                    )}
                                </div>
                            );
                        })()}
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


                    </div>
                </div>
            </div>

            <style>{`
                @keyframes pulse-glow {
                    0%, 100% { box-shadow: 0 0 0 0 rgba(99,102,241,0.4), 0 4px 20px rgba(99,102,241,0.3); }
                    50% { box-shadow: 0 0 0 6px rgba(99,102,241,0), 0 4px 20px rgba(99,102,241,0.5); }
                }
            `}</style>
        </div >
    );
}
