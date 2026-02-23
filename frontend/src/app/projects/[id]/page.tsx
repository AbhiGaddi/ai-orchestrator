'use client';
import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import {
    ArrowLeft,
    Github,
    Layers,
    Calendar,
    Code2,
    CheckCircle2,
    Clock,
    Plus,
    FileText,
    ExternalLink
} from 'lucide-react';
import { Project, Task } from '@/types';
import { getProject, listTasks } from '@/lib/api';
import { StatusBadge, PriorityBadge } from '@/components/ui/Badges';
import ToastContainer, { toast } from '@/components/ui/Toast';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';

export default function ProjectDashboardPage() {
    const params = useParams();
    const router = useRouter();
    const projectId = params.id as string;

    const [project, setProject] = useState<Project | null>(null);
    const [tasks, setTasks] = useState<Task[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (!projectId) return;
        loadData();
    }, [projectId]);

    async function loadData() {
        try {
            const [p, t] = await Promise.all([
                getProject(projectId),
                listTasks(projectId)
            ]);
            setProject(p);
            setTasks(t);
        } catch (err: any) {
            toast('error', err.message || 'Failed to load project details');
        } finally {
            setLoading(false);
        }
    }

    if (loading) {
        return (
            <div className="container py-12 text-center">
                <span className="spinner" style={{ width: 32, height: 32 }} />
            </div>
        );
    }

    if (!project) {
        return (
            <div className="container py-12">
                <p>Project not found.</p>
                <Link href="/projects" className="text-blue-500 mt-4 block">Back to Projects</Link>
            </div>
        );
    }

    return (
        <div className="container py-8">
            <ToastContainer />

            <div style={{ marginBottom: 24 }}>
                <Link href="/projects" style={{ display: 'inline-flex', alignItems: 'center', gap: 6, color: 'var(--text-muted)', textDecoration: 'none', fontSize: '0.9rem' }}>
                    <ArrowLeft size={16} /> Back to Projects
                </Link>
            </div>

            <div className="page-header" style={{ marginBottom: 40 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 20 }}>
                    <div style={{ flex: 1 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 8 }}>
                            <div className="page-title-icon" style={{ width: 32, height: 32 }}>
                                <Layers size={18} />
                            </div>
                            <h1 style={{ margin: 0 }}>{project.name}</h1>
                        </div>
                        <p className="page-subtitle" style={{ maxWidth: '800px' }}>
                            {project.description || "Project-specific orchestration context and environment boundary."}
                        </p>
                    </div>
                    <div style={{ display: 'flex', gap: 12 }}>
                        <Link href={`/extract?project_id=${project.id}`}>
                            <button className="btn btn-primary">
                                <Plus size={16} className="mr-2" /> New Extraction
                            </button>
                        </Link>
                    </div>
                </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 300px', gap: 32, alignItems: 'start' }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 32 }}>

                    {/* Repositories Section */}
                    <section>
                        <h2 style={{ fontSize: '1.2rem', marginBottom: 16, display: 'flex', alignItems: 'center', gap: 8 }}>
                            <Github size={20} color="var(--blue)" /> Connected Repositories
                        </h2>
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 16 }}>
                            {project.github_repos?.length > 0 ? (
                                project.github_repos.map((repo) => (
                                    <Card key={repo} className="bg-[#141721] border-white/10">
                                        <CardHeader className="pb-3">
                                            <CardTitle className="text-sm font-mono text-blue-400">{repo}</CardTitle>
                                        </CardHeader>
                                        <CardContent>
                                            <a
                                                href={`https://github.com/${repo}`}
                                                target="_blank"
                                                rel="noreferrer"
                                                className="text-xs text-slate-400 hover:text-white flex items-center gap-1 transition-colors"
                                            >
                                                View on GitHub <ExternalLink size={10} />
                                            </a>
                                        </CardContent>
                                    </Card>
                                ))
                            ) : (
                                <div className="card" style={{ padding: 32, textAlign: 'center', background: 'var(--bg-card-hover)', borderStyle: 'dashed' }}>
                                    <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>No repositories configured for this project.</p>
                                </div>
                            )}
                        </div>
                    </section>

                    {/* Tasks Section */}
                    <section>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                            <h2 style={{ fontSize: '1.2rem', margin: 0, display: 'flex', alignItems: 'center', gap: 8 }}>
                                <FileText size={20} color="var(--accent-light)" /> Project Tasks
                            </h2>
                            <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>{tasks.length} total</span>
                        </div>

                        {tasks.length > 0 ? (
                            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                                {tasks.map((task) => (
                                    <Link key={task.id} href={`/tasks/${task.id}`} className="task-card-link">
                                        <div className="card" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '16px 20px' }}>
                                            <div style={{ display: 'flex', gap: 16, alignItems: 'center' }}>
                                                <div style={{
                                                    width: 8,
                                                    height: 8,
                                                    borderRadius: '50%',
                                                    background: task.status === 'COMPLETED' ? 'var(--green)' : 'var(--blue)'
                                                }} />
                                                <div>
                                                    <div style={{ fontWeight: 600, fontSize: '0.95rem' }}>{task.title}</div>
                                                    <div style={{ display: 'flex', gap: 12, marginTop: 4 }}>
                                                        <StatusBadge status={task.status} />
                                                        <PriorityBadge priority={task.priority} />
                                                    </div>
                                                </div>
                                            </div>
                                            <div style={{ color: 'var(--text-muted)', fontSize: '0.8rem' }}>
                                                {new Date(task.updated_at).toLocaleDateString()}
                                            </div>
                                        </div>
                                    </Link>
                                ))}
                            </div>
                        ) : (
                            <div className="card" style={{ padding: 48, textAlign: 'center' }}>
                                <FileText size={32} style={{ opacity: 0.2, marginBottom: 16 }} />
                                <div style={{ fontSize: '1.1rem', fontWeight: 600 }}>No tasks yet</div>
                                <p style={{ color: 'var(--text-muted)', marginTop: 8 }}>
                                    Start by extracting tasks for this project from a transcript.
                                </p>
                            </div>
                        )}
                    </section>
                </div>

                {/* Sidebar Info */}
                <aside style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
                    <Card className="bg-[#141721] border-white/10">
                        <CardHeader>
                            <CardTitle className="text-sm">Guidelines</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <p className="text-xs text-slate-400 leading-relaxed">
                                {project.coding_guidelines || "No specific coding guidelines defined for this project context."}
                            </p>
                        </CardContent>
                    </Card>

                    <div className="card" style={{ background: 'var(--accent-glow)', borderColor: 'rgba(99,102,241,0.2)' }}>
                        <h4 style={{ fontSize: '0.8rem', margin: '0 0 8px 0', color: 'var(--accent-light)' }}>Project Stats</h4>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem' }}>
                                <span style={{ opacity: 0.7 }}>Success Rate</span>
                                <span style={{ fontWeight: 600 }}>100%</span>
                            </div>
                            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem' }}>
                                <span style={{ opacity: 0.7 }}>Avg. Execution</span>
                                <span style={{ fontWeight: 600 }}>4.2m</span>
                            </div>
                        </div>
                    </div>
                </aside>
            </div>
        </div>
    );
}
