'use client';
import { useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { Upload, FileText, Sparkles, ArrowRight, X } from 'lucide-react';
import { extractTasks } from '@/lib/api';
import { toast } from '@/components/ui/Toast';
import ToastContainer from '@/components/ui/Toast';

const SAMPLE = `Product meeting — Feb 2026

Alice: The pagination API is completely broken for large datasets. Users are getting timeouts.
Bob: Agreed, we need to fix that. I'd say high priority, target next sprint.
Alice: Also, the mobile app is missing dark mode. A lot of users have been requesting it.
Carol: Let's add dark mode to the roadmap. Give it 2 weeks.
Bob: One more thing — we need to set up automated database backups. Daily backups to S3.
Alice: That's critical. Should be done within this week.`;

export default function ExtractPage() {
    const [text, setText] = useState('');
    const [dragOver, setDragOver] = useState(false);
    const [loading, setLoading] = useState(false);
    const router = useRouter();
    const fileRef = useRef<HTMLInputElement>(null);

    async function handleExtract() {
        if (!text.trim()) { toast('error', 'Please paste or upload a transcript first'); return; }
        setLoading(true);
        try {
            const result = await extractTasks(text.trim());
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
        <>
            <ToastContainer />
            <div className="container">
                <div className="page-header">
                    <div className="page-title">
                        <div className="page-title-icon" style={{ background: 'var(--accent-glow)', border: '1px solid rgba(99,102,241,0.2)' }}>
                            <Sparkles size={20} color="var(--accent-light)" />
                        </div>
                        <h1 style={{ fontSize: '2rem' }}>Extract Tasks</h1>
                    </div>
                    <p className="page-subtitle">Paste a meeting transcript or discussion — Claude will extract structured tasks automatically.</p>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 340px', gap: 24, alignItems: 'start' }}>
                    {/* Main input */}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                        {/* Drag & drop zone */}
                        <div
                            className={`upload-area ${dragOver ? 'drag-over' : ''}`}
                            onDragOver={e => { e.preventDefault(); setDragOver(true); }}
                            onDragLeave={() => setDragOver(false)}
                            onDrop={onDrop}
                            onClick={() => fileRef.current?.click()}
                            style={{ display: text ? 'none' : 'block' }}
                        >
                            <input ref={fileRef} type="file" accept=".txt,.md" hidden onChange={e => e.target.files?.[0] && handleFile(e.target.files[0])} />
                            <div className="upload-icon">📋</div>
                            <div className="upload-title">Drop a file or click to upload</div>
                            <div className="upload-sub">Supports .txt and .md files · Or paste text below</div>
                        </div>

                        {/* Textarea */}
                        <div className="form-group">
                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
                                <label className="form-label" style={{ margin: 0 }}>
                                    <FileText size={12} style={{ display: 'inline', marginRight: 5 }} />
                                    Discussion Transcript
                                </label>
                                {text && (
                                    <button className="btn btn-ghost btn-sm" onClick={() => setText('')}>
                                        <X size={12} /> Clear
                                    </button>
                                )}
                            </div>
                            <textarea
                                className="form-textarea"
                                value={text}
                                onChange={e => setText(e.target.value)}
                                placeholder="Paste your meeting notes, Slack thread, or discussion here…"
                                rows={16}
                                style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: '0.85rem', lineHeight: 1.8 }}
                            />
                            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textAlign: 'right' }}>
                                {text.length.toLocaleString()} characters
                            </div>
                        </div>

                        <button
                            className="btn btn-primary btn-lg"
                            onClick={handleExtract}
                            disabled={loading || !text.trim()}
                            style={{ alignSelf: 'flex-start' }}
                        >
                            {loading
                                ? <><span className="spinner" /> Extracting with Claude…</>
                                : <><Sparkles size={18} /> Extract Tasks <ArrowRight size={16} /></>
                            }
                        </button>
                    </div>

                    {/* Sidebar */}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                        {/* Try with sample */}
                        <div className="card">
                            <div style={{ fontWeight: 700, marginBottom: 4, fontSize: '0.9rem' }}>🧪 Try with sample</div>
                            <p style={{ fontSize: '0.82rem', color: 'var(--text-muted)', marginBottom: 14 }}>
                                Load a demo transcript to see Claude in action.
                            </p>
                            <button className="btn btn-secondary" style={{ width: '100%' }} onClick={() => setText(SAMPLE)}>
                                <FileText size={14} /> Load Sample Transcript
                            </button>
                        </div>

                        {/* How it works */}
                        <div className="card">
                            <div style={{ fontWeight: 700, marginBottom: 14, fontSize: '0.9rem' }}>⚡ How it works</div>
                            {[
                                ['1', 'Paste transcript', 'Meeting notes, Slack thread, or any discussion text'],
                                ['2', 'Claude extracts', 'AI identifies tasks with title, description, criteria & deadline'],
                                ['3', 'Review & edit', 'Edit tasks before approval in the Tasks view'],
                                ['4', 'Approve & execute', 'One click creates GitHub issue + sends email'],
                            ].map(([n, title, desc]) => (
                                <div key={n} style={{ display: 'flex', gap: 10, marginBottom: 14 }}>
                                    <div style={{ width: 24, height: 24, borderRadius: '50%', background: 'var(--accent-glow)', border: '1px solid rgba(99,102,241,0.3)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.72rem', fontWeight: 800, color: 'var(--accent-light)', flexShrink: 0, marginTop: 1 }}>{n}</div>
                                    <div>
                                        <div style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-primary)' }}>{title}</div>
                                        <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>{desc}</div>
                                    </div>
                                </div>
                            ))}
                        </div>

                        {/* Tip */}
                        <div className="card" style={{ background: 'var(--accent-glow)', borderColor: 'rgba(99,102,241,0.2)' }}>
                            <div style={{ fontSize: '0.8rem', color: 'var(--accent-light)', lineHeight: 1.7 }}>
                                <strong>💡 Tip:</strong> The better the context in your transcript (urgency, assignee, deadlines), the more accurate the extraction.
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </>
    );
}
