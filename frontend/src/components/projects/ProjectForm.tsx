"use client";

import { useState } from "react";
import { Project } from "@/types";
import { ipc } from "@/lib/ipc";
import {
    FolderOpen, Sparkles, Plus, Edit2, ChevronLeft, FolderSearch,
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { useRouter } from "next/navigation";

interface ProjectFormProps {
    initialData?: Partial<Project>;
    onSubmit: (data: Partial<Project>) => Promise<void>;
    isLoading?: boolean;
    title: string;
    description: string;
}

export default function ProjectForm({ initialData, onSubmit, isLoading, title, description }: ProjectFormProps) {
    const router = useRouter();
    const [form, setForm] = useState({
        name: initialData?.name ?? "",
        description: initialData?.description ?? "",
        local_path: initialData?.local_path ?? "",
        coding_guidelines: initialData?.coding_guidelines ?? "",
    });

    const handleBrowse = async () => {
        const dir = await ipc.utils.selectDirectory();
        if (dir) setForm(f => ({ ...f, local_path: dir }));
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        await onSubmit({
            name: form.name.trim(),
            description: form.description.trim() || undefined,
            local_path: form.local_path.trim(),
            coding_guidelines: form.coding_guidelines.trim() || undefined,
        });
    };

    const isEditing = !!initialData?.id;
    const submitLabel = isLoading ? 'Saving...' : (isEditing ? 'Save Changes' : 'Create Project');

    return (
        <div style={{ position: 'relative', overflow: 'hidden', minHeight: 'calc(100vh - 72px)' }}>
            <div className="glow-blob glow-blob-1" />
            <div className="glow-blob glow-blob-2" />

            <div style={{ position: 'relative', zIndex: 1, maxWidth: 720, margin: '0 auto', padding: '32px 24px 80px' }}>

                {/* Header */}
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 32 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
                        <div style={{
                            width: 42, height: 42, borderRadius: 12,
                            background: 'linear-gradient(135deg, #a855f7, #6366f1)',
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            boxShadow: '0 8px 16px rgba(168,85,247,0.25)',
                        }}>
                            {isEditing ? <Edit2 size={18} color="white" /> : <Plus size={20} color="white" />}
                        </div>
                        <div>
                            <h1 style={{ fontSize: '1.4rem', fontWeight: 900, color: 'var(--text-primary)', letterSpacing: '-0.02em', marginBottom: 2 }}>
                                {title}
                            </h1>
                            <p style={{ color: 'var(--text-muted)', fontSize: '0.8rem' }}>{description}</p>
                        </div>
                    </div>

                    <button
                        type="button"
                        onClick={() => router.back()}
                        style={{
                            display: 'flex', alignItems: 'center', gap: 6,
                            background: 'rgba(255,255,255,0.03)', border: '1px solid var(--border)',
                            color: 'var(--text-muted)', fontSize: '0.8rem', fontWeight: 600,
                            cursor: 'pointer', padding: '8px 16px', borderRadius: 10,
                            transition: 'all 0.15s',
                        }}
                    >
                        <ChevronLeft size={14} /> Back
                    </button>
                </div>

                <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>

                    {/* Identity */}
                    <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 16, padding: '20px 24px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16 }}>
                            <div style={{ width: 26, height: 26, borderRadius: 7, background: 'rgba(168,85,247,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                <FolderOpen size={13} color="#a855f7" />
                            </div>
                            <span style={{ fontSize: '0.7rem', fontWeight: 800, color: 'var(--text-primary)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Project Info</span>
                        </div>

                        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                            <div>
                                <Label style={{ fontSize: '0.65rem', fontWeight: 700, color: 'var(--text-secondary)', display: 'block', marginBottom: 6 }}>NAME *</Label>
                                <Input
                                    required
                                    autoFocus
                                    placeholder="e.g. My API Service"
                                    style={{
                                        height: 40, borderRadius: 10,
                                        background: 'var(--bg-input)', border: '1px solid var(--border)',
                                        color: 'var(--text-primary)', fontSize: '0.9rem', padding: '0 14px'
                                    }}
                                    value={form.name}
                                    onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                                />
                            </div>

                            <div>
                                <Label style={{ fontSize: '0.65rem', fontWeight: 700, color: 'var(--text-secondary)', display: 'block', marginBottom: 6 }}>DESCRIPTION</Label>
                                <Textarea
                                    placeholder="What does this project do?"
                                    style={{
                                        background: 'var(--bg-input)', border: '1px solid var(--border)',
                                        color: 'var(--text-primary)', borderRadius: 10,
                                        resize: 'none', height: 72, fontSize: '0.85rem',
                                        padding: '10px 14px', fontFamily: 'inherit', outline: 'none',
                                        width: '100%', lineHeight: 1.6
                                    }}
                                    value={form.description}
                                    onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
                                />
                            </div>
                        </div>
                    </div>

                    {/* Local Path */}
                    <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 16, padding: '20px 24px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16 }}>
                            <div style={{ width: 26, height: 26, borderRadius: 7, background: 'rgba(99,102,241,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                <FolderSearch size={13} color="#6366f1" />
                            </div>
                            <span style={{ fontSize: '0.7rem', fontWeight: 800, color: 'var(--text-primary)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Local Codebase</span>
                        </div>

                        <Label style={{ fontSize: '0.65rem', fontWeight: 700, color: 'var(--text-secondary)', display: 'block', marginBottom: 6 }}>PROJECT PATH *</Label>
                        <div style={{ display: 'flex', gap: 8 }}>
                            <Input
                                required
                                placeholder="/Users/you/projects/my-app"
                                style={{
                                    flex: 1, height: 40, borderRadius: 10,
                                    background: 'var(--bg-input)', border: '1px solid var(--border)',
                                    color: 'var(--text-primary)', fontFamily: 'var(--font-mono)',
                                    fontSize: '0.82rem', padding: '0 14px'
                                }}
                                value={form.local_path}
                                onChange={e => setForm(f => ({ ...f, local_path: e.target.value }))}
                            />
                            <button
                                type="button"
                                onClick={handleBrowse}
                                style={{
                                    height: 40, padding: '0 16px', borderRadius: 10, flexShrink: 0,
                                    background: 'rgba(99,102,241,0.1)', border: '1px solid rgba(99,102,241,0.25)',
                                    color: '#6366f1', fontSize: '0.82rem', fontWeight: 700,
                                    cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6,
                                    transition: 'all 0.15s',
                                }}
                            >
                                <FolderOpen size={14} /> Browse
                            </button>
                        </div>
                        <p style={{ fontSize: '0.65rem', color: 'var(--text-muted)', marginTop: 6 }}>
                            The local folder Claude agents will work in when running tasks.
                        </p>
                    </div>

                    {/* AI Rules */}
                    <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 16, padding: '20px 24px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16 }}>
                            <div style={{ width: 26, height: 26, borderRadius: 7, background: 'rgba(16,185,129,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                <Sparkles size={13} color="#10b981" />
                            </div>
                            <span style={{ fontSize: '0.7rem', fontWeight: 800, color: 'var(--text-primary)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                                AI Rules <span style={{ color: 'var(--text-muted)', fontWeight: 600, textTransform: 'none', letterSpacing: 0 }}>(optional)</span>
                            </span>
                        </div>

                        <Textarea
                            placeholder={`e.g.\n- Use TypeScript strict mode\n- Prefer functional components\n- Follow existing file structure`}
                            style={{
                                background: 'var(--bg-input)', border: '1px solid var(--border)',
                                color: 'var(--text-primary)', borderRadius: 10,
                                resize: 'none', height: 110, fontSize: '0.82rem',
                                padding: '10px 14px', fontFamily: 'inherit', outline: 'none',
                                width: '100%', lineHeight: 1.6
                            }}
                            value={form.coding_guidelines}
                            onChange={e => setForm(f => ({ ...f, coding_guidelines: e.target.value }))}
                        />
                        <p style={{ fontSize: '0.65rem', color: 'var(--text-muted)', marginTop: 6 }}>
                            Instructions passed to the AI agent before every task in this project.
                        </p>
                    </div>

                    {/* Submit */}
                    <button
                        type="submit"
                        disabled={isLoading || !form.name.trim() || !form.local_path.trim()}
                        style={{
                            height: 48, borderRadius: 14,
                            background: 'linear-gradient(135deg, #a855f7, #6366f1)',
                            border: 'none', color: '#fff', fontSize: '0.95rem',
                            fontWeight: 800, cursor: isLoading ? 'not-allowed' : 'pointer',
                            boxShadow: '0 8px 24px rgba(168,85,247,0.3)',
                            transition: 'all 0.2s',
                            opacity: (isLoading || !form.name.trim() || !form.local_path.trim()) ? 0.5 : 1,
                            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                            letterSpacing: '0.02em',
                        }}
                    >
                        {isEditing ? <Edit2 size={16} /> : <Plus size={16} />}
                        {submitLabel}
                    </button>
                </form>
            </div>
        </div>
    );
}
