'use client';
import Link from 'next/link';
import { useState, useEffect } from 'react';
import {
    Upload, Github, Mail, Code,
    ArrowRight, Bot, Sparkles, GitPullRequest, Zap,
    MessageSquare, LayoutDashboard, ShieldCheck,
} from 'lucide-react';

/* Inline SonarQube logo as a lightweight SVG component */
function SonarIcon({ size = 15, color = 'currentColor' }: { size?: number; color?: string }) {
    return (
        <svg width={size} height={size} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path
                d="M3 17.5C5.5 17.5 7.5 15.5 7.5 13C7.5 10.5 5.5 8.5 3 8.5"
                stroke={color} strokeWidth="2" strokeLinecap="round"
            />
            <path
                d="M7 20C10.5 20 13.5 17 13.5 13.5C13.5 10 10.5 7 7 7"
                stroke={color} strokeWidth="2" strokeLinecap="round"
            />
            <path
                d="M12 21C16.5 21 20 17.5 20 13C20 8.5 16.5 5 12 5"
                stroke={color} strokeWidth="2" strokeLinecap="round"
            />
        </svg>
    );
}

/* ─── Pipeline stepper data ───────────────────────────────────────────── */
const pipelineSteps = [
    { icon: MessageSquare, label: 'Discussion', color: '#a855f7', live: true, sonar: false },
    { icon: Sparkles, label: 'Extract', color: '#c084fc', live: true, sonar: false },
    { icon: Github, label: 'Issue', color: '#818cf8', live: true, sonar: false },
    { icon: Mail, label: 'Email', color: '#6366f1', live: true, sonar: false },
    { icon: Code, label: 'Code', color: '#10b981', live: true, sonar: false },
    { icon: GitPullRequest, label: 'PR', color: '#22d3ee', live: true, sonar: false },
    { icon: ShieldCheck, label: 'Code Quality', color: '#f59e0b', live: false, sonar: true },
];

/* ─── Right-side live pipeline preview ────────────────────────────────── */
const previewStages = [
    { icon: MessageSquare, label: 'Discussion ingested', status: 'done', time: '0s' },
    { icon: Sparkles, label: '3 tasks extracted', status: 'done', time: '4s' },
    { icon: Github, label: 'Issues #42 #43 #44', status: 'done', time: '7s' },
    { icon: Mail, label: 'Email sent to 5 members', status: 'done', time: '9s' },
    { icon: Code, label: 'Code agent running…', status: 'running', time: 'now' },
    { icon: GitPullRequest, label: 'PR pending', status: 'pending', time: '—' },
];

function PipelinePreview() {
    const [tick, setTick] = useState(0);
    useEffect(() => {
        const t = setInterval(() => setTick(n => (n + 1) % 30), 1400);
        return () => clearInterval(t);
    }, []);

    return (
        <div style={{
            background: 'rgba(12,10,26,0.7)',
            border: '1px solid rgba(168,85,247,0.2)',
            borderRadius: 20,
            overflow: 'hidden',
            backdropFilter: 'blur(24px)',
            boxShadow: '0 20px 50px rgba(0,0,0,0.6), 0 0 0 1px rgba(168,85,247,0.1)',
            width: '100%'
        }}>
            <div style={{
                display: 'flex', alignItems: 'center', gap: 6,
                padding: '16px 20px',
                borderBottom: '1px solid rgba(168,85,247,0.12)',
                background: 'rgba(255,255,255,0.03)',
            }}>
                {['#ef4444', '#f59e0b', '#10b981'].map(c => (
                    <div key={c} style={{ width: 11, height: 11, borderRadius: '50%', background: c }} />
                ))}
                <span style={{ fontSize: '0.8rem', color: 'rgba(192,132,252,0.6)', fontFamily: 'var(--font-mono)', marginLeft: 10 }}>
                    flow — main agent line
                </span>
                <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 6 }}>
                    <span style={{ width: 8, height: 8, borderRadius: '50%', background: '#10b981', display: 'inline-block', animation: 'pulse 2s infinite' }} />
                    <span style={{ fontSize: '0.75rem', color: '#10b981', fontWeight: 800 }}>LIVE</span>
                </div>
            </div>

            <div style={{ padding: '16px 0' }}>
                {previewStages.map((stage, i) => {
                    const isDone = stage.status === 'done';
                    const isRunning = stage.status === 'running';
                    const dotColor = isDone ? '#10b981' : isRunning ? '#a855f7' : 'rgba(255,255,255,0.1)';

                    return (
                        <div key={i} style={{
                            display: 'flex', alignItems: 'center', gap: 14,
                            padding: '10px 24px',
                            background: isRunning ? 'rgba(168,85,247,0.08)' : 'transparent',
                        }}>
                            <div style={{
                                width: 8, height: 8, borderRadius: '50%',
                                background: dotColor,
                                boxShadow: isRunning ? '0 0 10px #a855f7' : isDone ? '0 0 8px #10b981' : 'none',
                                animation: isRunning ? 'pulse 1.5s infinite' : 'none',
                            }} />
                            <stage.icon size={14} color={isDone ? '#10b981' : isRunning ? '#c084fc' : 'rgba(255,255,255,0.2)'} />
                            <span style={{
                                fontSize: '0.85rem',
                                color: isDone ? '#fff' : isRunning ? '#c084fc' : 'rgba(255,255,255,0.3)',
                                fontFamily: 'var(--font-mono)',
                                flex: 1,
                                fontWeight: isRunning ? 700 : 400,
                            }}>
                                {stage.label}{isRunning && '▌'}
                            </span>
                            <span style={{ fontSize: '0.7rem', color: 'rgba(255,255,255,0.2)', fontFamily: 'var(--font-mono)' }}>{stage.time}</span>
                        </div>
                    );
                })}
            </div>

            <div style={{ padding: '12px 24px', borderTop: '1px solid rgba(168,85,247,0.1)', display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ fontSize: '0.7rem', color: 'rgba(192,132,252,0.4)', fontFamily: 'var(--font-mono)' }}>Agent.v2 @ main</span>
                <span style={{ fontSize: '0.7rem', color: '#10b981', fontFamily: 'var(--font-mono)' }}>active</span>
            </div>
        </div>
    );
}

export default function HomePage() {
    return (
        <div style={{
            position: 'relative',
            overflow: 'hidden',
            height: 'calc(100vh - 65px)',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'space-between',
            background: 'var(--bg-base)',
            padding: '24px 0'
        }}>
            <div className="glow-blob glow-blob-1" />
            <div className="glow-blob glow-blob-2" />

            {/* UP ZONE: Hero (Flexible) */}
            <section style={{ flex: 1, display: 'flex', alignItems: 'center', padding: '0 80px', maxWidth: 1600, width: '100%', margin: '0 auto' }}>
                <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: 100, width: '100%', alignItems: 'center' }}>

                    <div>
                        <div style={{
                            display: 'inline-flex', alignItems: 'center', gap: 8,
                            padding: '5px 14px',
                            background: 'rgba(168,85,247,0.08)',
                            border: '1px solid rgba(168,85,247,0.15)',
                            borderRadius: 999,
                            marginBottom: 20,
                        }}>
                            <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#a855f7', animation: 'pulse 2s infinite' }} />
                            <span style={{ fontSize: '0.72rem', fontWeight: 800, color: '#c084fc', letterSpacing: '0.06em', textTransform: 'uppercase' }}>
                                Autonomous Software Agent
                            </span>
                        </div>

                        {/* HEADLINE: GUARANTEED VISIBILITY */}
                        <h1 style={{
                            fontSize: 'clamp(2rem, 4.5vw, 3.2rem)',
                            fontWeight: 900,
                            letterSpacing: '-0.05em',
                            lineHeight: 1,
                            marginBottom: 20,
                            whiteSpace: 'nowrap',
                            color: 'var(--text-primary)'
                        }}>
                            <span className="hero-reveal" style={{ display: 'inline-block', color: '#a855f7', animationDelay: '0.1s' }}>Discussion</span>
                            <span className="hero-reveal" style={{ display: 'inline-block', margin: '0 12px', color: 'var(--text-muted)', animationDelay: '0.2s', opacity: 0.15 }}>→</span>
                            <span className="hero-reveal" style={{ display: 'inline-block', color: '#818cf8', animationDelay: '0.3s' }}>Code</span>
                            <span className="hero-reveal" style={{ display: 'inline-block', margin: '0 12px', color: 'var(--text-muted)', animationDelay: '0.4s', opacity: 0.15 }}>→</span>
                            <span className="hero-reveal" style={{ display: 'inline-block', color: '#6366f1', animationDelay: '0.5s' }}>Deploy</span>
                        </h1>

                        <p style={{ fontSize: '1.25rem', color: 'var(--text-secondary)', lineHeight: 1.6, maxWidth: 640, marginBottom: 48 }}>
                            The ultimate AI orchestration engine for engineering teams.
                            Turn high-level discussions into production code and cloud deployments automatically.
                        </p>

                        <div style={{ display: 'flex', gap: 14 }}>
                            <Link href="/extract" className="btn btn-primary btn-md" style={{ borderRadius: 12, padding: '12px 32px', fontSize: '0.95rem', boxShadow: '0 8px 30px rgba(168,85,247,0.2)' }}>
                                <Upload size={18} />
                                Start Engine
                                <ArrowRight size={16} />
                            </Link>
                            <Link href="/dashboard" className="btn btn-secondary btn-md" style={{ borderRadius: 12, padding: '12px 32px', fontSize: '0.95rem' }}>
                                <LayoutDashboard size={18} />
                                Dashboard
                            </Link>
                        </div>
                    </div>

                    <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                        <div style={{ width: '100%', maxWidth: 540 }}>
                            <PipelinePreview />
                        </div>
                    </div>
                </div>
            </section>

            {/* DOWN ZONE: Core (Flexible) */}
            <section style={{ flex: 0.8, display: 'flex', flexDirection: 'column', padding: '0 80px 60px', maxWidth: 1600, width: '100%', margin: '0 auto' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 28 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
                        <div style={{ width: 18, height: 18, borderRadius: 4, background: 'linear-gradient(135deg, #a855f7, #6366f1)', boxShadow: '0 0 15px rgba(168,85,247,0.5)' }} />
                        <h2 style={{ fontSize: '1.6rem', fontWeight: 900, color: 'var(--text-primary)' }}>
                            Flow <span style={{ fontWeight: 400, opacity: 0.4 }}>: Intelligent Framework</span>
                        </h2>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, background: 'var(--bg-surface)', padding: '8px 20px', borderRadius: 99, border: '1px solid var(--border)' }}>
                        <span style={{ width: 8, height: 8, borderRadius: '50%', background: '#10b981', boxShadow: '0 0 10px #10b981' }} />
                        <span style={{ fontSize: '0.75rem', fontWeight: 800, color: 'var(--text-secondary)', textTransform: 'uppercase' }}>System Active</span>
                    </div>
                </div>

                <div style={{
                    background: 'linear-gradient(180deg, var(--bg-card) 0%, var(--bg-surface) 100%)',
                    border: '1px solid var(--border)', borderRadius: 24, padding: '32px 60px',
                    position: 'relative', overflow: 'hidden', display: 'flex', alignItems: 'center',
                    boxShadow: 'var(--shadow-card)'
                }}>
                    <div style={{ position: 'absolute', inset: 0, opacity: 0.06, backgroundImage: 'radial-gradient(circle at 2px 2px, #a855f7 0.5px, transparent 0)', backgroundSize: '32px 32px' }} />

                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%', position: 'relative', zIndex: 2 }}>
                        {pipelineSteps.map((step, i) => (
                            <div key={i} className="stage-entrance" style={{ display: 'flex', alignItems: 'center', flex: i < pipelineSteps.length - 1 ? 1 : 0, animationDelay: `${i * 0.1}s` }}>
                                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                                    <div style={{
                                        width: 48, height: 48, borderRadius: '50%',
                                        background: step.live ? `${step.color}12` : 'rgba(255,255,255,0.01)',
                                        border: `1.5px solid ${step.live ? step.color : 'rgba(255,255,255,0.06)'}`,
                                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                                        boxShadow: step.live ? `0 0 20px ${step.color}25` : 'none',
                                        position: 'relative'
                                    }}>
                                        {step.sonar ? <SonarIcon size={20} color={step.live ? step.color : '#333'} /> : <step.icon size={20} color={step.live ? step.color : '#333'} />}
                                        {step.live && <span style={{ position: 'absolute', top: 0, right: 0, width: 10, height: 10, borderRadius: '50%', background: '#10b981', border: '2px solid var(--bg-card)' }} />}
                                    </div>
                                    <span style={{ marginTop: 12, fontSize: '0.72rem', fontWeight: 800, color: step.live ? 'var(--text-primary)' : 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>{step.label}</span>
                                </div>
                                {i < pipelineSteps.length - 1 && (
                                    <div style={{ flex: 1, height: 1.5, margin: '0 20px', marginBottom: 24, background: step.live ? step.color + '30' : 'var(--border)' }}>
                                        {step.live && <div style={{ height: '100%', width: '35%', background: `linear-gradient(90deg, transparent, ${step.color}, transparent)`, animation: 'flow 2s infinite linear' }} />}
                                    </div>
                                )}
                            </div>
                        ))}
                    </div>
                </div>
            </section>

            <style>{`
                @keyframes pulse { 0%, 100% { opacity: 1; transform: scale(1); } 50% { opacity: 0.6; transform: scale(0.9); } }
                @keyframes flow { 0% { transform: translateX(-100%); } 100% { transform: translateX(300%); } }
                @keyframes stageIn { from { opacity: 0; transform: translateY(30px); } to { opacity: 1; transform: translateY(0); } }
                .stage-entrance { opacity: 0; animation: stageIn 0.8s cubic-bezier(0.2, 0.8, 0.2, 1) forwards; }
                .hero-reveal { opacity: 0; transform: translateY(20px); animation: heroFadeIn 0.8s cubic-bezier(0.2, 0.8, 0.2, 1) forwards; }
                @keyframes heroFadeIn { from { opacity: 0; transform: translateY(20px); } to { opacity: 1; transform: translateY(0); } }
            `}</style>
        </div>
    );
}
