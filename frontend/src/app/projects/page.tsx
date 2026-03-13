"use client";

import { useEffect, useState } from "react";
import { Project } from "@/types";
import { ipc } from "@/lib/ipc";
import Link from "next/link";
import {
    Plus, FolderOpen, Sparkles, Edit2, LayoutDashboard, ChevronRight,
} from "lucide-react";

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

    const createdDate = new Date(project.created_at).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
    const folderName = project.local_path ? project.local_path.split('/').filter(Boolean).pop() : null;

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
            {/* Top stripe */}
            <div style={{
                height: 3,
                background: `linear-gradient(90deg, ${accent.color}, ${accent.color}60)`,
                opacity: hovered ? 1 : 0.5,
                transition: 'opacity 0.2s',
            }} />

            <Link href={`/projects/${project.id}`} style={{ textDecoration: 'none', color: 'inherit', flex: 1 }}>
                <div style={{ padding: '20px 20px 14px' }}>
                    <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12, marginBottom: 10 }}>
                        {/* Icon */}
                        <div style={{
                            width: 40, height: 40, borderRadius: 10,
                            background: accent.glow, border: `1px solid ${accent.color}30`,
                            display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
                        }}>
                            <FolderOpen size={18} color={accent.color} />
                        </div>

                        <div style={{ flex: 1, minWidth: 0 }}>
                            <div style={{ fontSize: '0.95rem', fontWeight: 800, color: 'var(--text-primary)', marginBottom: 3, letterSpacing: '-0.02em' }}>
                                {project.name}
                            </div>
                            {project.local_path && (
                                <div style={{ fontSize: '0.68rem', fontFamily: 'var(--font-mono)', color: 'var(--text-muted)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                    {project.local_path}
                                </div>
                            )}
                        </div>

                        {folderName && (
                            <div style={{
                                display: 'flex', alignItems: 'center', gap: 5,
                                padding: '3px 8px', borderRadius: 999,
                                background: accent.glow, border: `1px solid ${accent.color}25`, flexShrink: 0,
                            }}>
                                <span style={{ fontSize: '0.62rem', fontWeight: 700, color: accent.color, textTransform: 'uppercase', letterSpacing: '0.04em' }}>{folderName}</span>
                            </div>
                        )}
                    </div>

                    {/* Description */}
                    <p style={{
                        fontSize: '0.8rem', color: 'var(--text-secondary)', lineHeight: 1.6,
                        display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' as const,
                        overflow: 'hidden', minHeight: 38,
                    }}>
                        {project.description || "No description provided."}
                    </p>
                </div>

                {project.coding_guidelines && (
                    <div style={{ padding: '0 20px 14px' }}>
                        <div style={{
                            display: 'inline-flex', alignItems: 'center', gap: 5,
                            padding: '4px 10px', borderRadius: 8,
                            background: 'rgba(16,185,129,0.08)', border: '1px solid rgba(16,185,129,0.2)',
                        }}>
                            <Sparkles size={11} color="#10b981" />
                            <span style={{ fontSize: '0.7rem', color: '#10b981', fontWeight: 600 }}>AI Rules set</span>
                        </div>
                    </div>
                )}
            </Link>

            {/* Divider */}
            <div style={{ height: 1, background: 'var(--border)', margin: '0 20px' }} />

            {/* Footer */}
            <div style={{ padding: '12px 20px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <span style={{ fontSize: '0.68rem', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>
                    Created {createdDate}
                </span>
                <div style={{ display: 'flex', gap: 8 }}>
                    <Link href={`/projects/edit/${project.id}`}>
                        <button style={{
                            display: 'flex', alignItems: 'center', gap: 5,
                            padding: '6px 12px', borderRadius: 8,
                            background: 'rgba(255,255,255,0.04)', border: '1px solid var(--border)',
                            color: 'var(--text-secondary)', fontSize: '0.75rem', fontWeight: 600,
                            cursor: 'pointer', fontFamily: 'inherit', transition: 'all 0.15s',
                        }}>
                            <Edit2 size={12} /> Edit
                        </button>
                    </Link>
                    <Link href={`/projects/${project.id}`} style={{ textDecoration: 'none' }}>
                        <button style={{
                            display: 'flex', alignItems: 'center', gap: 5,
                            padding: '6px 12px', borderRadius: 8,
                            background: accent.glow, border: `1px solid ${accent.color}30`,
                            color: accent.color, fontSize: '0.75rem', fontWeight: 700,
                            cursor: 'pointer', fontFamily: 'inherit', transition: 'all 0.15s',
                        }}>
                            <LayoutDashboard size={12} /> Open
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

    useEffect(() => {
        ipc.projects.list()
            .then(setProjects)
            .finally(() => setIsLoading(false));
    }, []);

    return (
        <div style={{ position: 'relative', overflow: 'hidden', minHeight: 'calc(100vh - 72px)' }}>
            <div className="glow-blob glow-blob-1" />
            <div className="glow-blob glow-blob-2" />

            <div style={{ position: 'relative', zIndex: 1, maxWidth: 1600, margin: '0 auto', padding: '40px 48px 80px' }}>

                {/* Header */}
                <div style={{
                    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                    marginBottom: 32,
                }}>
                    <div>
                        <h1 style={{ fontSize: '1.8rem', fontWeight: 900, color: 'var(--text-primary)', letterSpacing: '-0.03em', marginBottom: 6 }}>
                            Projects
                        </h1>
                        <p style={{ fontSize: '0.9rem', color: 'var(--text-secondary)' }}>
                            Each project maps to a local codebase and runs Claude agents against it.
                        </p>
                    </div>

                    <Link href="/projects/new">
                        <button style={{
                            height: 44, padding: '0 24px',
                            display: 'flex', alignItems: 'center', gap: 8,
                            borderRadius: 12,
                            background: 'linear-gradient(135deg, #a855f7, #6366f1)',
                            border: 'none', color: '#fff',
                            fontSize: '0.9rem', fontWeight: 800,
                            cursor: 'pointer', fontFamily: 'inherit',
                            boxShadow: '0 6px 20px rgba(168,85,247,0.25)',
                            transition: 'transform 0.2s',
                        }}>
                            <Plus size={16} /> New Project
                        </button>
                    </Link>
                </div>

                {/* Content */}
                {isLoading ? (
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(340px, 1fr))', gap: 20 }}>
                        {[1, 2, 3].map(i => (
                            <div key={i} style={{ height: 220, borderRadius: 16, background: 'var(--bg-card)', border: '1px solid var(--border)', animation: 'pulse 1.5s infinite' }} />
                        ))}
                    </div>
                ) : projects.length === 0 ? (
                    <div style={{
                        display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
                        minHeight: '55vh', background: 'var(--bg-card)', border: '1px solid var(--border)',
                        borderRadius: 24, padding: '64px 40px', textAlign: 'center', position: 'relative', overflow: 'hidden',
                    }}>
                        <div style={{ position: 'absolute', top: '-10%', right: '-5%', width: '35%', height: '50%', background: 'radial-gradient(circle, rgba(168,85,247,0.12) 0%, transparent 70%)', filter: 'blur(40px)' }} />

                        <div style={{ position: 'relative', zIndex: 1 }}>
                            <div style={{
                                width: 64, height: 64, borderRadius: 18, margin: '0 auto 24px',
                                background: 'rgba(168,85,247,0.1)', border: '1px solid rgba(168,85,247,0.2)',
                                display: 'flex', alignItems: 'center', justifyContent: 'center',
                            }}>
                                <FolderOpen size={28} color="#a855f7" />
                            </div>

                            <h2 style={{ fontSize: '1.5rem', fontWeight: 900, color: 'var(--text-primary)', marginBottom: 12, letterSpacing: '-0.02em' }}>
                                No projects yet
                            </h2>
                            <p style={{ color: 'var(--text-secondary)', fontSize: '0.95rem', maxWidth: 420, marginBottom: 32, lineHeight: 1.7 }}>
                                Create a project by pointing to a local codebase folder. Claude agents will work inside that directory.
                            </p>

                            <Link href="/projects/new">
                                <button style={{
                                    display: 'flex', alignItems: 'center', gap: 10,
                                    padding: '14px 36px', borderRadius: 14,
                                    background: 'linear-gradient(135deg, #a855f7, #6366f1)',
                                    border: 'none', color: '#fff', fontSize: '1rem', fontWeight: 800,
                                    cursor: 'pointer', fontFamily: 'inherit',
                                    boxShadow: '0 10px 32px rgba(168,85,247,0.35)',
                                    margin: '0 auto',
                                }}>
                                    <Plus size={18} /> Create your first project
                                </button>
                            </Link>
                        </div>
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
