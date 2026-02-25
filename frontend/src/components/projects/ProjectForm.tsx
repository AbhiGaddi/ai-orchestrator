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
    const submitLabel = isLoading ? 'Processing...' : (isEditing ? 'Save Changes' : 'Initialize Project');

    return (
        <div style={{ position: 'relative', overflow: 'hidden', minHeight: 'calc(100vh - 72px)' }}>
            <div className="glow-blob glow-blob-1" />
            <div className="glow-blob glow-blob-2" />

            <div className="container" style={{ position: 'relative', zIndex: 1, maxWidth: 1600, padding: '0 80px', paddingBottom: 40, paddingTop: 20 }}>
                {/* Header / Back navigation */}
                <div style={{ marginBottom: 20, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
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
                    gap: 16,
                    alignItems: 'start'
                }}>

                    {/* ── LEFT COLUMN: Core Identity & Rules ── */}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>

                        {/* Identity Section */}
                        <div style={{
                            padding: '18px 22px', borderRadius: 18,
                            background: 'var(--bg-card)',
                            border: '1px solid var(--border)',
                            boxShadow: 'var(--shadow-card)'
                        }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 14 }}>
                                <div style={{ width: 28, height: 28, borderRadius: 7, background: 'rgba(168,85,247,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                    <FolderOpen size={14} color="#a855f7" />
                                </div>
                                <span style={{ fontSize: '0.72rem', fontWeight: 800, color: 'var(--text-primary)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Core Identity</span>
                            </div>

                            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                                <div>
                                    <Label style={{ fontSize: '0.65rem', fontWeight: 700, color: 'var(--text-secondary)', display: 'block', marginBottom: 6 }}>PROJECT NAME *</Label>
                                    <Input
                                        placeholder="e.g. Finance Analytics Engine"
                                        required
                                        style={{
                                            height: 40, borderRadius: 10,
                                            background: 'var(--bg-input)', border: '1px solid var(--border)',
                                            color: 'var(--text-primary)', fontSize: '0.9rem', padding: '0 14px'
                                        }}
                                        value={form.name}
                                        onChange={e => setForm({ ...form, name: e.target.value })}
                                    />
                                </div>

                                <div>
                                    <Label style={{ fontSize: '0.65rem', fontWeight: 700, color: 'var(--text-secondary)', display: 'block', marginBottom: 6 }}>MISSION DESCRIPTION</Label>
                                    <Textarea
                                        placeholder="Describe the purpose, business context, and core objectives..."
                                        style={{
                                            background: 'var(--bg-input)', border: '1px solid var(--border)',
                                            color: 'var(--text-primary)', borderRadius: 10,
                                            resize: 'none', height: 70, fontSize: '0.82rem',
                                            padding: '10px 14px', fontFamily: 'inherit', outline: 'none',
                                            width: '100%', lineHeight: 1.6
                                        }}
                                        value={form.description}
                                        onChange={e => setForm({ ...form, description: e.target.value })}
                                    />
                                </div>
                            </div>
                        </div>

                        {/* Rules Section */}
                        <div style={{
                            padding: '18px 22px', borderRadius: 18,
                            background: 'var(--bg-card)',
                            border: '1px solid var(--border)',
                            boxShadow: 'var(--shadow-card)'
                        }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 14 }}>
                                <div style={{ width: 28, height: 28, borderRadius: 7, background: 'rgba(99,102,241,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                    <Sparkles size={14} color="#6366f1" />
                                </div>
                                <span style={{ fontSize: '0.72rem', fontWeight: 800, color: 'var(--text-primary)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Intelligence & Rules</span>
                            </div>

                            <div>
                                <Label style={{ fontSize: '0.65rem', fontWeight: 700, color: 'var(--text-secondary)', display: 'block', marginBottom: 6 }}>CODING GUIDELINES & ARCHITECTURAL PREFERENCES</Label>
                                <Textarea
                                    placeholder="Define specific patterns, preferences, or rules for your AI agents..."
                                    style={{
                                        background: 'var(--bg-input)', border: '1px solid var(--border)',
                                        color: 'var(--text-primary)', borderRadius: 10,
                                        resize: 'none', height: 110, fontSize: '0.82rem',
                                        padding: '10px 14px', fontFamily: 'inherit', outline: 'none',
                                        width: '100%', lineHeight: 1.6
                                    }}
                                    value={form.coding_guidelines}
                                    onChange={e => setForm({ ...form, coding_guidelines: e.target.value })}
                                />
                            </div>
                        </div>
                    </div>

                    {/* ── RIGHT COLUMN: Integration & Infrastructure ── */}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>

                        {/* Repos Section */}
                        <div style={{
                            padding: '18px 22px', borderRadius: 18,
                            background: 'var(--bg-card)',
                            border: '1px solid var(--border)',
                            boxShadow: 'var(--shadow-card)'
                        }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 14 }}>
                                <div style={{ width: 28, height: 28, borderRadius: 7, background: 'rgba(255,255,255,0.05)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                    <Github size={14} color="var(--text-primary)" />
                                </div>
                                <span style={{ fontSize: '0.72rem', fontWeight: 800, color: 'var(--text-primary)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Source Control</span>
                            </div>

                            <div>
                                <Label style={{ fontSize: '0.65rem', fontWeight: 700, color: 'var(--text-secondary)', display: 'block', marginBottom: 6 }}>GITHUB REPOSITORIES</Label>
                                <Input
                                    placeholder="owner/repo1, owner/repo2"
                                    style={{
                                        height: 40, borderRadius: 10,
                                        background: 'var(--bg-input)', border: '1px solid var(--border)',
                                        color: 'var(--text-primary)', fontFamily: 'var(--font-mono)',
                                        fontSize: '0.85rem', padding: '0 14px'
                                    }}
                                    value={form.github_repos}
                                    onChange={e => setForm({ ...form, github_repos: e.target.value })}
                                />
                                <p style={{ fontSize: '0.62rem', color: 'var(--text-muted)', marginTop: 4, opacity: 0.8 }}>Comma-separated — e.g. AbhiGaddi/ai-orchestrator</p>
                            </div>
                        </div>

                        {/* Sonar Section */}
                        <div style={{
                            padding: '18px 22px', borderRadius: 18,
                            background: 'var(--bg-card)',
                            border: '1px solid var(--border)',
                            boxShadow: 'var(--shadow-card)'
                        }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 14 }}>
                                <div style={{ width: 28, height: 28, borderRadius: 7, background: 'rgba(245,158,11,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                    <ShieldCheck size={14} color="#f59e0b" />
                                </div>
                                <span style={{ fontSize: '0.72rem', fontWeight: 800, color: 'var(--text-primary)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Quality Gate: SonarQube</span>
                            </div>

                            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                                <div>
                                    <Label style={{ fontSize: '0.65rem', fontWeight: 700, color: 'var(--text-secondary)', display: 'block', marginBottom: 6 }}>PROJECT KEY</Label>
                                    <Input
                                        placeholder="org_project-key"
                                        style={{
                                            height: 40, borderRadius: 10,
                                            background: 'var(--bg-input)', border: '1px solid var(--border)',
                                            color: 'var(--text-primary)', fontFamily: 'var(--font-mono)',
                                            fontSize: '0.85rem', padding: '0 14px'
                                        }}
                                        value={form.sonar_project_key}
                                        onChange={e => setForm({ ...form, sonar_project_key: e.target.value })}
                                    />
                                </div>
                                <div>
                                    <Label style={{ fontSize: '0.65rem', fontWeight: 700, color: 'var(--text-secondary)', display: 'block', marginBottom: 6 }}>ACCESS TOKEN</Label>
                                    <Input
                                        type="password"
                                        placeholder="squ_..."
                                        style={{
                                            height: 40, borderRadius: 10,
                                            background: 'var(--bg-input)', border: '1px solid var(--border)',
                                            color: 'var(--text-primary)', fontFamily: 'var(--font-mono)',
                                            fontSize: '0.85rem', padding: '0 14px'
                                        }}
                                        value={form.sonar_token}
                                        onChange={e => setForm({ ...form, sonar_token: e.target.value })}
                                    />
                                </div>

                                {/* Submit Actions Integrated into the card */}
                                <div style={{ marginTop: 12, display: 'flex', justifyContent: 'center' }}>
                                    <button
                                        type="submit"
                                        disabled={isLoading}
                                        style={{
                                            height: 44, padding: '0 40px', borderRadius: 12,
                                            background: 'linear-gradient(135deg, #a855f7, #6366f1)',
                                            border: 'none', color: '#fff', fontSize: '0.9rem',
                                            fontWeight: 900, cursor: isLoading ? 'not-allowed' : 'pointer',
                                            boxShadow: '0 10px 20px rgba(168,85,247,0.3)',
                                            transition: 'all 0.25s cubic-bezier(0.175, 0.885, 0.32, 1.275)',
                                            opacity: isLoading ? 0.7 : 1,
                                            display: 'flex', alignItems: 'center', gap: 8,
                                            textTransform: 'uppercase',
                                            letterSpacing: '0.04em',
                                            width: '100%'
                                        }}
                                        onMouseEnter={e => {
                                            if (!isLoading) {
                                                e.currentTarget.style.transform = 'translateY(-2px)';
                                                e.currentTarget.style.boxShadow = '0 15px 30px rgba(168,85,247,0.5)';
                                            }
                                        }}
                                        onMouseLeave={e => {
                                            if (!isLoading) {
                                                e.currentTarget.style.transform = 'translateY(0)';
                                                e.currentTarget.style.boxShadow = '0 10px 20px rgba(168,85,247,0.3)';
                                            }
                                        }}
                                    >
                                        <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
                                            {submitLabel}
                                            {!isLoading && (isEditing ? <Edit2 size={16} /> : <Sparkles size={16} />)}
                                        </div>
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                </form>
            </div>
        </div>
    );
}
