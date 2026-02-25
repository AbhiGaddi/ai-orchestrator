"use client";

import { useState } from "react";
import { Project } from "@/types";
import {
    FolderOpen, Github, ShieldCheck,
    ChevronLeft, Sparkles, Plus, Edit2
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { useRouter } from "next/navigation";

interface ProjectFormProps {
    initialData?: Partial<Project>;
    onSubmit: (data: any) => Promise<void>;
    isLoading?: boolean;
    title: string;
    description: string;
}

export default function ProjectForm({ initialData, onSubmit, isLoading, title, description }: ProjectFormProps) {
    const router = useRouter();
    const [form, setForm] = useState({
        name: initialData?.name || "",
        description: initialData?.description || "",
        github_repos: (initialData?.github_repos || []).join(", "),
        coding_guidelines: initialData?.coding_guidelines || "",
        sonar_project_key: initialData?.sonar_project_key || "",
        sonar_token: initialData?.sonar_token || "",
    });

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        const payload = {
            ...form,
            github_repos: form.github_repos.split(",").map(s => s.trim()).filter(Boolean),
            services_context: initialData?.services_context || {},
        };
        await onSubmit(payload);
    };

    const isEditing = !!initialData?.id;
    const submitLabel = isLoading ? 'Processing...' : (isEditing ? 'Save Changes' : 'Initialize Workspace');

    return (
        <div style={{ position: 'relative', overflow: 'hidden', minHeight: 'calc(100vh - 72px)' }}>
            <div className="glow-blob glow-blob-1" />
            <div className="glow-blob glow-blob-2" />

            <div className="container" style={{ position: 'relative', zIndex: 1, maxWidth: 1600, padding: '0 80px', paddingBottom: 60, paddingTop: 40 }}>
                {/* Header / Back navigation */}
                <div style={{ marginBottom: 32, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
                        <div style={{
                            width: 44, height: 44, borderRadius: 12,
                            background: 'linear-gradient(135deg, #a855f7, #7c3aed)',
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            boxShadow: '0 8px 16px rgba(168,85,247,0.25)',
                            flexShrink: 0
                        }}>
                            {isEditing ? <Edit2 size={20} color="white" /> : <Plus size={22} color="white" />}
                        </div>
                        <div>
                            <h1 style={{ fontSize: '1.5rem', fontWeight: 900, color: 'var(--text-primary)', letterSpacing: '-0.02em', marginBottom: 2 }}>
                                {title}
                            </h1>
                            <p style={{ color: 'var(--text-muted)', fontSize: '0.82rem' }}>
                                {description}
                            </p>
                        </div>
                    </div>

                    <button
                        onClick={() => router.back()}
                        style={{
                            display: 'flex', alignItems: 'center', gap: 6,
                            background: 'rgba(255,255,255,0.03)', border: '1px solid var(--border)',
                            color: 'var(--text-muted)', fontSize: '0.8rem', fontWeight: 700,
                            cursor: 'pointer', padding: '8px 16px', borderRadius: 10,
                            transition: 'all 0.2s'
                        }}
                        onMouseEnter={e => {
                            e.currentTarget.style.color = 'var(--text-primary)';
                            e.currentTarget.style.background = 'rgba(255,255,255,0.06)';
                        }}
                        onMouseLeave={e => {
                            e.currentTarget.style.color = 'var(--text-muted)';
                            e.currentTarget.style.background = 'rgba(255,255,255,0.03)';
                        }}
                    >
                        <ChevronLeft size={14} /> Close
                    </button>
                </div>

                <form onSubmit={handleSubmit} style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(auto-fit, minmax(480px, 1fr))',
                    gap: 24,
                    alignItems: 'stretch'
                }}>

                    {/* ── LEFT COLUMN: Identity & Security ── */}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>

                        {/* Identity Section */}
                        <div style={{
                            padding: '24px', borderRadius: 20,
                            background: 'var(--bg-card)',
                            border: '1px solid var(--border)',
                            boxShadow: '0 2px 8px rgba(0,0,0,0.1)'
                        }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 20 }}>
                                <FolderOpen size={16} color="#a855f7" />
                                <span style={{ fontSize: '0.75rem', fontWeight: 800, color: 'var(--text-primary)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Core Identity</span>
                            </div>

                            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                                <div>
                                    <Label style={{ fontSize: '0.68rem', fontWeight: 700, color: 'var(--text-muted)', display: 'block', marginBottom: 8 }}>PROJECT NAME *</Label>
                                    <Input
                                        placeholder="e.g. Finance Analytics Engine"
                                        required
                                        style={{
                                            height: 44, borderRadius: 10,
                                            background: 'var(--bg-input)', border: '1px solid var(--border)',
                                            color: 'var(--text-primary)', fontSize: '0.9rem', padding: '0 14px'
                                        }}
                                        value={form.name}
                                        onChange={e => setForm({ ...form, name: e.target.value })}
                                    />
                                </div>

                                <div>
                                    <Label style={{ fontSize: '0.68rem', fontWeight: 700, color: 'var(--text-muted)', display: 'block', marginBottom: 8 }}>MISSION DESCRIPTION</Label>
                                    <Textarea
                                        placeholder="Describe the purpose, business context, and core objectives..."
                                        style={{
                                            background: 'var(--bg-input)', border: '1px solid var(--border)',
                                            color: 'var(--text-primary)', borderRadius: 10,
                                            resize: 'none', height: 160, fontSize: '0.88rem',
                                            padding: '12px 14px', fontFamily: 'inherit', outline: 'none',
                                            width: '100%', lineHeight: 1.6
                                        }}
                                        value={form.description}
                                        onChange={e => setForm({ ...form, description: e.target.value })}
                                    />
                                </div>
                            </div>
                        </div>

                        {/* Sonar Section */}
                        <div style={{
                            padding: '24px', borderRadius: 20,
                            background: 'rgba(245,158,11,0.03)',
                            border: '1px solid rgba(245,158,11,0.15)',
                        }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 20 }}>
                                <ShieldCheck size={16} color="#f59e0b" />
                                <span style={{ fontSize: '0.75rem', fontWeight: 800, color: '#f59e0b', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Quality Gate: SonarQube</span>
                            </div>

                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                                <div>
                                    <Label style={{ fontSize: '0.65rem', fontWeight: 700, color: 'rgba(245,158,11,0.7)', display: 'block', marginBottom: 6 }}>PROJECT KEY</Label>
                                    <Input
                                        placeholder="org_project-key"
                                        style={{
                                            height: 40, borderRadius: 8,
                                            background: 'rgba(0,0,0,0.2)', border: '1px solid rgba(245,158,11,0.12)',
                                            color: 'var(--text-primary)', fontFamily: 'var(--font-mono)',
                                            fontSize: '0.82rem', padding: '0 12px'
                                        }}
                                        value={form.sonar_project_key}
                                        onChange={e => setForm({ ...form, sonar_project_key: e.target.value })}
                                    />
                                </div>
                                <div>
                                    <Label style={{ fontSize: '0.65rem', fontWeight: 700, color: 'rgba(245,158,11,0.7)', display: 'block', marginBottom: 6 }}>ACCESS TOKEN</Label>
                                    <Input
                                        type="password"
                                        placeholder="squ_..."
                                        style={{
                                            height: 40, borderRadius: 8,
                                            background: 'rgba(0,0,0,0.2)', border: '1px solid rgba(245,158,11,0.12)',
                                            color: 'var(--text-primary)', fontFamily: 'var(--font-mono)',
                                            fontSize: '0.82rem', padding: '0 12px'
                                        }}
                                        value={form.sonar_token}
                                        onChange={e => setForm({ ...form, sonar_token: e.target.value })}
                                    />
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* ── RIGHT COLUMN: Repositories & Rules ── */}
                    <div style={{
                        padding: '24px', borderRadius: 20,
                        background: 'var(--bg-card)',
                        border: '1px solid var(--border)',
                        boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
                        display: 'flex',
                        flexDirection: 'column',
                        height: '100%'
                    }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 20 }}>
                            <Github size={16} color="#6366f1" />
                            <span style={{ fontSize: '0.75rem', fontWeight: 800, color: 'var(--text-primary)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Repositories & Intelligence</span>
                        </div>

                        <div style={{ display: 'flex', flexDirection: 'column', gap: 16, flex: 1 }}>
                            <div>
                                <Label style={{ fontSize: '0.68rem', fontWeight: 700, color: 'var(--text-muted)', display: 'block', marginBottom: 8 }}>GITHUB REPOSITORIES</Label>
                                <Input
                                    placeholder="owner/repo1, owner/repo2"
                                    style={{
                                        height: 44, borderRadius: 10,
                                        background: 'var(--bg-input)', border: '1px solid var(--border)',
                                        color: 'var(--text-primary)', fontFamily: 'var(--font-mono)',
                                        fontSize: '0.85rem', padding: '0 14px'
                                    }}
                                    value={form.github_repos}
                                    onChange={e => setForm({ ...form, github_repos: e.target.value })}
                                />
                                <p style={{ fontSize: '0.62rem', color: 'var(--text-muted)', marginTop: 6, opacity: 0.7 }}>Comma-separated — e.g. AbhiGaddi/ai-orchestrator</p>
                            </div>

                            <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
                                <Label style={{ fontSize: '0.68rem', fontWeight: 700, color: 'var(--text-muted)', display: 'block', marginBottom: 8 }}>CODING GUIDELINES & ARCHITECTURAL RULES</Label>
                                <Textarea
                                    placeholder="Define specific patterns, preferences, or rules for your AI agents..."
                                    style={{
                                        background: 'var(--bg-input)', border: '1px solid var(--border)',
                                        color: 'var(--text-primary)', borderRadius: 10,
                                        resize: 'none', flex: 1, minHeight: 180, fontSize: '0.88rem',
                                        padding: '14px 16px', fontFamily: 'inherit', outline: 'none',
                                        width: '100%', lineHeight: 1.6
                                    }}
                                    value={form.coding_guidelines}
                                    onChange={e => setForm({ ...form, coding_guidelines: e.target.value })}
                                />
                            </div>
                        </div>

                        {/* Submit Actions */}
                        <div style={{
                            display: 'flex', alignItems: 'center', justifyContent: 'flex-end',
                            gap: 12, marginTop: 24, paddingTop: 20, borderTop: '1px solid var(--border)'
                        }}>
                            <button
                                type="submit"
                                disabled={isLoading}
                                style={{
                                    height: 44, padding: '0 28px', borderRadius: 10,
                                    background: 'linear-gradient(135deg, #a855f7, #7c3aed)',
                                    border: 'none', color: '#fff', fontSize: '0.9rem',
                                    fontWeight: 800, cursor: isLoading ? 'not-allowed' : 'pointer',
                                    boxShadow: '0 8px 16px rgba(168,85,247,0.3)',
                                    transition: 'all 0.2s',
                                    opacity: isLoading ? 0.7 : 1,
                                    display: 'flex', alignItems: 'center', gap: 8
                                }}
                                onMouseEnter={e => {
                                    if (!isLoading) {
                                        e.currentTarget.style.transform = 'translateY(-1px)';
                                        e.currentTarget.style.boxShadow = '0 10px 20px rgba(168,85,247,0.4)';
                                    }
                                }}
                                onMouseLeave={e => {
                                    if (!isLoading) {
                                        e.currentTarget.style.transform = 'translateY(0)';
                                        e.currentTarget.style.boxShadow = '0 8px 16px rgba(168,85,247,0.3)';
                                    }
                                }}
                            >
                                {submitLabel}
                                {!isLoading && (isEditing ? <Edit2 size={16} /> : <Sparkles size={16} />)}
                            </button>
                        </div>
                    </div>
                </form>
            </div>
        </div>
    );
}
