import Link from 'next/link';
import { Upload, CheckSquare, Github, Mail, Code, Package, Rocket, ArrowRight, Bot } from 'lucide-react';

const phases = [
  {
    phase: '1', label: 'Phase 1', subtitle: 'Active', active: true,
    steps: [
      { icon: Upload, label: 'Extract Tasks', desc: 'Paste discussion, Claude extracts structured tasks' },
      { icon: CheckSquare, label: 'Review & Approve', desc: 'Edit, approve or reject each extracted task' },
      { icon: Github, label: 'GitHub Issue', desc: 'One-click issue creation with full context' },
      { icon: Mail, label: 'Email Summary', desc: 'Automated HTML email to stakeholders' },
    ],
    color: '#6366f1',
  },
  {
    phase: '2', label: 'Phase 2', subtitle: 'Planned', active: false,
    steps: [
      { icon: Code, label: 'Code Agent', desc: 'AI writes implementation code' },
      { icon: Github, label: 'Pull Request', desc: 'Branch + PR created automatically' },
    ],
    color: '#10b981',
  },
  {
    phase: '3', label: 'Phase 3', subtitle: 'Planned', active: false,
    steps: [
      { icon: Package, label: 'Build Image', desc: 'Docker image built & tagged' },
    ],
    color: '#a855f7',
  },
  {
    phase: '4', label: 'Phase 4', subtitle: 'Planned', active: false,
    steps: [
      { icon: Rocket, label: 'Deploy', desc: 'Kubernetes rollout triggered' },
    ],
    color: '#f97316',
  },
];

export default function HomePage() {
  return (
    <div style={{ position: 'relative', overflow: 'hidden' }}>
      {/* Glow blobs */}
      <div className="glow-blob glow-blob-1" />
      <div className="glow-blob glow-blob-2" />

      {/* Hero */}
      <section style={{ padding: '100px 24px 60px', textAlign: 'center', maxWidth: 860, margin: '0 auto' }}>
        <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8, padding: '6px 16px', background: 'var(--accent-glow)', border: '1px solid rgba(99,102,241,0.3)', borderRadius: 999, fontSize: '0.8rem', fontWeight: 600, color: 'var(--accent-light)', marginBottom: 28 }}>
          <Bot size={14} />
          AI-Powered Engineering Pipeline
        </div>
        <h1 className="gradient-text" style={{ marginBottom: 20 }}>
          Discussion → Code → Deploy
        </h1>
        <p style={{ fontSize: '1.15rem', color: 'var(--text-secondary)', maxWidth: 560, margin: '0 auto 40px', lineHeight: 1.8 }}>
          Turn messy meeting transcripts into GitHub issues, code, Docker images,
          and Kubernetes deployments — fully orchestrated by AI agents.
        </p>
        <div style={{ display: 'flex', gap: 14, justifyContent: 'center', flexWrap: 'wrap' }}>
          <Link href="/extract" className="btn btn-primary btn-lg">
            <Upload size={18} />
            Start Extracting Tasks
            <ArrowRight size={16} />
          </Link>
          <Link href="/dashboard" className="btn btn-secondary btn-lg">
            View Dashboard
          </Link>
        </div>
      </section>

      {/* Pipeline phases */}
      <section className="container" style={{ paddingBottom: 80 }}>
        <div style={{ textAlign: 'center', marginBottom: 48 }}>
          <h2 style={{ marginBottom: 8 }}>Multi-Phase Pipeline</h2>
          <p>Each phase plugs in cleanly — no rewrites, just new agents.</p>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: 20 }}>
          {phases.map(p => (
            <div key={p.phase} className="card" style={{ borderColor: p.active ? `${p.color}40` : 'var(--border)', background: p.active ? `${p.color}08` : 'var(--bg-card)', position: 'relative', overflow: 'hidden' }}>
              {p.active && (
                <div style={{ position: 'absolute', top: 14, right: 14 }}>
                  <span className="nav-badge" style={{ background: 'var(--green-dim)', borderColor: 'rgba(16,185,129,0.3)', color: 'var(--green)' }}>
                    <span className="nav-badge-dot" />Live
                  </span>
                </div>
              )}
              <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 20 }}>
                <div style={{ width: 40, height: 40, borderRadius: 10, background: `${p.color}20`, border: `1px solid ${p.color}40`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.1rem', fontWeight: 800, color: p.color }}>
                  {p.phase}
                </div>
                <div>
                  <div style={{ fontWeight: 700, fontSize: '1rem' }}>{p.label}</div>
                  <div style={{ fontSize: '0.75rem', color: p.active ? p.color : 'var(--text-muted)', fontWeight: 600 }}>{p.subtitle}</div>
                </div>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {p.steps.map((s, i) => (
                  <div key={i} style={{ display: 'flex', gap: 10, alignItems: 'flex-start' }}>
                    <div style={{ width: 28, height: 28, borderRadius: 7, background: `${p.color}15`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, marginTop: 1 }}>
                      <s.icon size={13} color={p.color} />
                    </div>
                    <div>
                      <div style={{ fontSize: '0.875rem', fontWeight: 600, color: 'var(--text-primary)' }}>{s.label}</div>
                      <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>{s.desc}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
