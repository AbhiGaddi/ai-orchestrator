"use client";

import { useEffect, useState } from "react";
import { Project } from "@/types";
import { listProjects } from "@/lib/api";
import { toast } from "@/components/ui/Toast";
import ToastContainer from "@/components/ui/Toast";
import Link from "next/link";
import {
    Edit2, Plus, FolderOpen, Github,
    BookOpen, LayoutDashboard, ChevronRight,
    ShieldCheck, GitBranch, Sparkles,
} from "lucide-react";

/* Accent colours cycling per project index */
const ACCENTS = [
    { color: '#a855f7', glow: 'rgba(168,85,247,0.12)' },
    { color: '#6366f1', glow: 'rgba(99,102,241,0.12)' },
    { color: '#10b981', glow: 'rgba(16,185,129,0.12)' },
    { color: '#22d3ee', glow: 'rgba(34,211,238,0.12)' },
    { color: '#f59e0b', glow: 'rgba(245,158,11,0.12)' },
    { color: '#ec4899', glow: 'rgba(236,72,153,0.12)' },
];

function ProjectCard({ project, index }: { project: Project; index: number }) {
    const accent = ACCENTS[index % ACCENTS.length];
    const [hovered, setHovered] = useState(false);

    const repoCount = project.github_repos?.length ?? 0;
    const hasGuidelines = !!project.coding_guidelines;
    const hasSonar = !!project.sonar_project_key;
    const createdDate = new Date(project.created_at).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });

    return (
        <div
            onMouseEnter={() => setHovered(true)}
            onMouseLeave={() => setHovered(false)}
            style={{
                background: 'var(--bg-card)',
                border: `1px solid ${hovered ? `${accent.color}40` : 'var(--border)'}`,
                borderRadius: 16,
                overflow: 'hidden',
                transition: 'all 0.2s ease',
                transform: hovered ? 'translateY(-3px)' : 'none',
                boxShadow: hovered ? `0 12px 32px rgba(0,0,0,0.4), 0 0 0 1px ${accent.color}20` : '0 2px 8px rgba(0,0,0,0.2)',
                display: 'flex',
                flexDirection: 'column',
            }}
        >
            {/* Coloured top stripe */}
            <div style={{
                height: 3,
                background: `linear-gradient(90deg, ${accent.color}, ${accent.color}60)`,
                opacity: hovered ? 1 : 0.5,
                transition: 'opacity 0.2s',
            }} />

            {/* Header */}
            <div style={{ padding: '20px 20px 14px' }}>
                <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12, marginBottom: 10 }}>
                    {/* Project icon */}
                    <div style={{
                        width: 40, height: 40, borderRadius: 10,
                        background: accent.glow,
                        border: `1px solid ${accent.color}30`,
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        flexShrink: 0,
                    }}>
                        <FolderOpen size={18} color={accent.color} />
                    </div>

                    <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontSize: '0.95rem', fontWeight: 800, color: 'var(--text-primary)', marginBottom: 2, letterSpacing: '-0.02em' }}>
                            {project.name}
                        </div>
                        <div style={{ fontSize: '0.72rem', fontFamily: 'var(--font-mono)', color: 'var(--text-muted)' }}>
                            ID: {project.id.slice(0, 8)}…
                        </div>
                    </div>

                    {/* Live dot */}
                    <div style={{
                        display: 'flex', alignItems: 'center', gap: 5,
                        padding: '3px 8px',
                        borderRadius: 999,
                        background: accent.glow,
                        border: `1px solid ${accent.color}25`,
                        flexShrink: 0,
                    }}>
                        <span style={{ width: 5, height: 5, borderRadius: '50%', background: accent.color, display: 'inline-block' }} />
                        <span style={{ fontSize: '0.62rem', fontWeight: 700, color: accent.color, textTransform: 'uppercase', letterSpacing: '0.04em' }}>Active</span>
                    </div>
                </div>

                {/* Description */}
                <p style={{
                    fontSize: '0.8rem',
                    color: 'var(--text-muted)',
                    lineHeight: 1.6,
                    display: '-webkit-box',
                    WebkitLineClamp: 2,
                    WebkitBoxOrient: 'vertical' as const,
                    overflow: 'hidden',
                    minHeight: 38,
                }}>
                    {project.description || "No description provided."}
                </p>
            </div>

            {/* Stat chips */}
            <div style={{ padding: '0 20px 16px', display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                {/* Repos */}
                <div style={{
                    display: 'flex', alignItems: 'center', gap: 5,
                    padding: '4px 10px', borderRadius: 8,
                    background: 'rgba(255,255,255,0.04)',
                    border: '1px solid var(--border)',
                }}>
                    <Github size={11} color="var(--text-muted)" />
                    <span style={{ fontSize: '0.7rem', color: 'var(--text-secondary)', fontWeight: 600 }}>
                        {repoCount} {repoCount === 1 ? 'repo' : 'repos'}
                    </span>
                </div>

                {/* Guidelines */}
                {hasGuidelines && (
                    <div style={{
                        display: 'flex', alignItems: 'center', gap: 5,
                        padding: '4px 10px', borderRadius: 8,
                        background: 'rgba(16,185,129,0.08)',
                        border: '1px solid rgba(16,185,129,0.2)',
                    }}>
                        <BookOpen size={11} color="#10b981" />
                        <span style={{ fontSize: '0.7rem', color: '#10b981', fontWeight: 600 }}>Guidelines</span>
                    </div>
                )}

                {/* SonarQube */}
                {hasSonar && (
                    <div style={{
                        display: 'flex', alignItems: 'center', gap: 5,
                        padding: '4px 10px', borderRadius: 8,
                        background: 'rgba(245,158,11,0.08)',
                        border: '1px solid rgba(245,158,11,0.2)',
                    }}>
                        <ShieldCheck size={11} color="#f59e0b" />
                        <span style={{ fontSize: '0.7rem', color: '#f59e0b', fontWeight: 600 }}>Sonar</span>
                    </div>
                )}
            </div>

            {/* Divider */}
            <div style={{ height: 1, background: 'var(--border)', margin: '0 20px' }} />

            {/* Footer */}
            <div style={{ padding: '14px 20px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 'auto' }}>
                <span style={{ fontSize: '0.68rem', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>
                    Created {createdDate}
                </span>
                <div style={{ display: 'flex', gap: 8 }}>
                    <Link href={`/projects/edit/${project.id}`}>
                        <button
                            style={{
                                display: 'flex', alignItems: 'center', gap: 5,
                                padding: '6px 14px', borderRadius: 8,
                                background: 'rgba(255,255,255,0.04)',
                                border: '1px solid var(--border)',
                                color: 'var(--text-secondary)',
                                fontSize: '0.75rem', fontWeight: 600,
                                cursor: 'pointer',
                                fontFamily: 'inherit',
                                transition: 'all 0.15s',
                            }}
                            onMouseEnter={e => {
                                (e.currentTarget as HTMLButtonElement).style.background = 'rgba(255,255,255,0.07)';
                                (e.currentTarget as HTMLButtonElement).style.color = 'var(--text-primary)';
                            }}
                            onMouseLeave={e => {
                                (e.currentTarget as HTMLButtonElement).style.background = 'rgba(255,255,255,0.04)';
                                (e.currentTarget as HTMLButtonElement).style.color = 'var(--text-secondary)';
                            }}
                        >
                            <Edit2 size={12} /> Edit
                        </button>
                    </Link>
                    <Link href={`/projects/${project.id}`} style={{ textDecoration: 'none' }}>
                        <button style={{
                            display: 'flex', alignItems: 'center', gap: 5,
                            padding: '6px 14px', borderRadius: 8,
                            background: accent.glow,
                            border: `1px solid ${accent.color}30`,
                            color: accent.color,
                            fontSize: '0.75rem', fontWeight: 700,
                            cursor: 'pointer',
                            fontFamily: 'inherit',
                            transition: 'all 0.15s',
                        }}>
                            <LayoutDashboard size={12} /> Dashboard
                            <ChevronRight size={11} />
                        </button>
                    </Link>
                </div>
            </div>
        </div>
    );
}

export default function ProjectsPage() {
    const [projects, setProjects] = useState<Project[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => { fetchProjects(); }, []);

    const fetchProjects = async () => {
        try {
            setIsLoading(true);
            setProjects(await listProjects());
        } catch (e: unknown) {
            toast("error", e instanceof Error ? e.message : "Failed to fetch projects");
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div style={{ position: 'relative', overflow: 'hidden', minHeight: 'calc(100vh - 72px)' }}>
            <ToastContainer />
            <div className="glow-blob glow-blob-1" />
            <div className="glow-blob glow-blob-2" />

            <div className="container" style={{ position: 'relative', zIndex: 1, paddingTop: 44, paddingBottom: 80, maxWidth: 1600, padding: '0 80px' }}>

                {/* ── Page Header: Unified Hero ── */}
                <div style={{
                    display: 'grid',
                    gridTemplateColumns: 'minmax(0, 1fr) auto',
                    gap: 40,
                    alignItems: 'center',
                    marginBottom: 48,
                    background: 'linear-gradient(180deg, rgba(255,255,255,0.03) 0%, transparent 100%)',
                    padding: '32px 40px',
                    borderRadius: 24,
                    border: '1px solid var(--border)',
                }}>
                    {/* Left: Branding & Info */}
                    <div style={{ maxWidth: 700 }}>
                        <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '4px 10px', borderRadius: 999, background: 'rgba(168,85,247,0.1)', border: '1px solid rgba(168,85,247,0.22)', marginBottom: 16 }}>
                            <FolderOpen size={11} color="#c084fc" />
                            <span style={{ fontSize: '0.68rem', fontWeight: 700, color: '#c084fc', letterSpacing: '0.07em', textTransform: 'uppercase' }}>Workspace Engine</span>
                        </div>
                        <h1 style={{ fontSize: '2.5rem', fontWeight: 900, letterSpacing: '-0.04em', marginBottom: 12, color: 'var(--text-primary)' }}>Flow Projects</h1>
                        <p style={{ fontSize: '0.98rem', color: 'var(--text-muted)', lineHeight: 1.6, maxWidth: 640 }}>
                            Isolated execution contexts for your AI agents. Each Flow workspace encapsulates repositories, architectural guidelines, and security quality gates.
                        </p>
                    </div>

                    {/* Right: Actions & Stats */}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 20, alignItems: 'flex-end', minWidth: 320 }}>
                        <Link href="/projects/new" style={{ width: '100%' }}>
                            <button
                                style={{
                                    display: 'flex', alignItems: 'center', gap: 10,
                                    padding: '14px 28px', borderRadius: 14,
                                    background: 'linear-gradient(135deg, #a855f7, #7c3aed)',
                                    border: 'none', color: '#fff',
                                    fontSize: '1rem', fontWeight: 800,
                                    cursor: 'pointer', fontFamily: 'inherit',
                                    boxShadow: '0 8px 24px rgba(168,85,247,0.3)',
                                    transition: 'all 0.2s',
                                    width: '100%',
                                    justifyContent: 'center'
                                }}
                                onMouseEnter={e => {
                                    (e.currentTarget as HTMLButtonElement).style.transform = 'translateY(-2px)';
                                    (e.currentTarget as HTMLButtonElement).style.boxShadow = '0 12px 32px rgba(168,85,247,0.45)';
                                }}
                                onMouseLeave={e => {
                                    (e.currentTarget as HTMLButtonElement).style.transform = 'translateY(0)';
                                    (e.currentTarget as HTMLButtonElement).style.boxShadow = '0 8px 24px rgba(168,85,247,0.3)';
                                }}
                            >
                                <Plus size={20} /> Initialize Project
                            </button>
                        </Link>

                        <div style={{ display: 'flex', gap: 12, width: '100%' }}>
                            {[
                                { icon: FolderOpen, label: 'Projects', value: projects.length, color: '#a855f7' },
                                { icon: GitBranch, label: 'Repos', value: projects.reduce((s, p) => s + (p.github_repos?.length ?? 0), 0), color: '#6366f1' },
                                { icon: ShieldCheck, label: 'Sonar', value: projects.filter(p => p.sonar_project_key).length, color: '#f59e0b' },
                            ].map(s => (
                                <div key={s.label} style={{
                                    flex: 1,
                                    padding: '12px', borderRadius: 14,
                                    background: 'rgba(0,0,0,0.2)',
                                    border: '1px solid var(--border)',
                                    textAlign: 'center',
                                }}>
                                    <div style={{ fontSize: '1.2rem', fontWeight: 900, color: s.color, fontFamily: 'var(--font-mono)', lineHeight: 1 }}>{s.value}</div>
                                    <div style={{ fontSize: '0.62rem', color: 'var(--text-muted)', marginTop: 4, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.02em' }}>{s.label}</div>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>

                {/* ── Content ── */}
                {isLoading ? (
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: 20 }}>
                        {[1, 2, 3].map(i => (
                            <div key={i} style={{ height: 260, borderRadius: 16, background: 'var(--bg-card)', border: '1px solid var(--border)', animation: 'pulse 1.5s infinite' }} />
                        ))}
                    </div>
                ) : projects.length === 0 ? (
                    <div style={{
                        display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
                        padding: '100px 40px',
                        border: '1.5px dashed rgba(168,85,247,0.2)', borderRadius: 24,
                        background: 'rgba(168,85,247,0.03)',
                    }}>
                        <div style={{ width: 64, height: 64, borderRadius: 18, background: 'rgba(168,85,247,0.1)', border: '1px solid rgba(168,85,247,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 20 }}>
                            <FolderOpen size={30} color="#a855f7" />
                        </div>
                        <h3 style={{ fontSize: '1.25rem', fontWeight: 900, marginBottom: 10, color: 'var(--text-primary)' }}>No active projects</h3>
                        <p style={{ color: 'var(--text-muted)', fontSize: '0.95rem', textAlign: 'center', maxWidth: 400, marginBottom: 32, lineHeight: 1.7 }}>
                            Your AI agents need a project context to operate. Initialize your first workspace to start extracting and executing tasks.
                        </p>
                        <Link href="/projects/new">
                            <button
                                style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '14px 32px', borderRadius: 14, background: 'linear-gradient(135deg, #a855f7, #7c3aed)', border: 'none', color: '#fff', fontSize: '0.95rem', fontWeight: 800, cursor: 'pointer', fontFamily: 'inherit', boxShadow: '0 8px 24px rgba(168,85,247,0.35)' }}
                            >
                                <Plus size={20} /> Initialize Workspace
                            </button>
                        </Link>
                    </div>
                ) : (
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(360px, 1fr))', gap: 20 }}>
                        {projects.map((project, i) => (
                            <ProjectCard key={project.id} project={project} index={i} />
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}
