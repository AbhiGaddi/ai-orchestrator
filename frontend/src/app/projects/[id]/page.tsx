'use client';
import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import {
    ArrowLeft,
    Github,
    Layers,
    CheckCircle2,
    Plus,
    FileText,
    ExternalLink,
    Zap,
    Shield,
    Bug,
    Search,
    MessageSquareCode,
    RefreshCw
} from 'lucide-react';
import { Project, Task } from '@/types';
import {
    getProject,
    listTasks,
    listSonarIssues,
    fixSonarIssue,
    triggerManualPRReview,
    sweepSonarIssues,
    syncSonarMetrics as syncSonar
} from '@/lib/api';
import { StatusBadge, PriorityBadge } from '@/components/ui/Badges';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import ToastContainer, { toast } from '@/components/ui/Toast';

const getSonarStatus = (project: Project | null) => {
    if (!project?.sonar_project_key) return { label: 'DISABLED', status: 'disabled', bg: 'rgba(255,255,255,0.05)', text: 'rgba(255,255,255,0.3)' };
    const hasMetrics = project.sonar_metrics && Object.keys(project.sonar_metrics).length > 0;
    if (hasMetrics) return { label: 'CONNECTED', status: 'connected', bg: 'rgba(34,197,94,0.1)', text: 'rgb(34,197,94)' };
    return { label: 'SYNCING', status: 'syncing', bg: 'rgba(59,130,246,0.1)', text: 'rgb(59,130,246)' };
};

export default function ProjectDashboardPage() {
    const params = useParams();
    const projectId = params.id as string;

    const [project, setProject] = useState<Project | null>(null);
    const [tasks, setTasks] = useState<Task[]>([]);
    const [sonarIssues, setSonarIssues] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [fixingIssue, setFixingIssue] = useState<string | null>(null);
    const [isPRModalOpen, setIsPRModalOpen] = useState(false);
    const [prNumber, setPRNumber] = useState("");
    const [reviewingPR, setReviewingPR] = useState(false);
    const [sweeping, setSweeping] = useState(false);
    const [isMounted, setIsMounted] = useState(false);

    useEffect(() => {
        setIsMounted(true);
    }, []);

    const [selectedSonarSeverity, setSelectedSonarSeverity] = useState<string>('ALL');
    const [selectedTaskStatus, setSelectedTaskStatus] = useState<string>('ALL');
    const [isSyncing, setIsSyncing] = useState(false);
    const [activeMainTab, setActiveMainTab] = useState<'OVERVIEW' | 'PIPELINE' | 'SONAR'>('OVERVIEW');

    useEffect(() => {
        if (!projectId) return;
        loadData();
    }, [projectId]);

    async function loadData() {
        try {
            const [p, t, s] = await Promise.all([
                getProject(projectId),
                listTasks(projectId),
                listSonarIssues(projectId).catch(() => [])
            ]);
            setProject(p);
            setTasks(t);
            setSonarIssues(s);
        } catch (err: any) {
            toast('error', err.message || 'Failed to load project details');
        } finally {
            setLoading(false);
        }
    }

    const handleFixSonarIssue = async (issue: any) => {
        setFixingIssue(issue.key);
        try {
            const result = await fixSonarIssue(projectId, issue);
            toast('success', `Created PR #${result.github_pr_id} to fix: ${issue.message}`);
            // Reload tasks to show the newly created fix task
            const t = await listTasks(projectId);
            setTasks(t);
        } catch (err: any) {
            toast('error', err.message || 'Failed to fix sonar issue');
        } finally {
            setFixingIssue(null);
        }
    };

    const handleManualReview = async () => {
        if (!prNumber) return;
        setReviewingPR(true);
        try {
            await triggerManualPRReview(projectId, Number.parseInt(prNumber));
            toast('success', `AI Review started for PR #${prNumber}`);
            setIsPRModalOpen(false);
            setPRNumber("");
            loadData(); // Refresh tasks
        } catch (err: any) {
            toast('error', err.message || 'Failed to trigger review');
        } finally {
            setReviewingPR(false);
        }
    };

    const handleSweepAllSonar = async () => {
        if (sonarIssues.length === 0) return;
        setSweeping(true);
        try {
            const result = await sweepSonarIssues(projectId, sonarIssues);
            toast('success', `🧹 Clean Sweep started! Created PR #${result.github_pr_id} resolving ${result.applied_count} issues.`);
            const t = await listTasks(projectId);
            setTasks(t);
        } catch (err: any) {
            toast('error', err.message || 'Failed to start clean sweep');
        } finally {
            setSweeping(false);
        }
    };

    const handleSyncSonar = async () => {
        setIsSyncing(true);
        try {
            await syncSonar(projectId);
            toast('success', 'SonarCloud sync completed. Fetching latest issues...');
            await loadData();
        } catch (err: any) {
            toast('error', err.message || 'SonarCloud sync failed');
        } finally {
            setIsSyncing(false);
        }
    };

    // Filter Tasks
    const filteredTasks = tasks.filter(t => {
        if (selectedTaskStatus === 'ALL') return true;
        if (selectedTaskStatus === 'TODO') return t.status === 'PENDING' || (t.status === 'FAILED' && !t.github_pr_id);
        if (selectedTaskStatus === 'IN_PROGRESS') return t.status === 'IN_PROGRESS';
        if (selectedTaskStatus === 'COMPLETED') return t.status === 'COMPLETED';
        if (selectedTaskStatus === 'FAILED') return t.status === 'FAILED';
        return true;
    });

    // Filter Sonar Issues
    const filteredSonarIssues = sonarIssues.filter(i => {
        if (selectedSonarSeverity === 'ALL') return true;
        return i.severity === selectedSonarSeverity;
    });

    const sonarStats = {
        BLOCKER: sonarIssues.filter(i => i.severity === 'BLOCKER').length,
        CRITICAL: sonarIssues.filter(i => i.severity === 'CRITICAL').length,
        MAJOR: sonarIssues.filter(i => i.severity === 'MAJOR').length,
        MINOR: sonarIssues.filter(i => i.severity === 'MINOR').length,
    };

    const taskStats = {
        TODO: tasks.filter(t => t.status === 'PENDING' || (t.status === 'FAILED' && !t.github_pr_id)).length,
        IN_PROGRESS: tasks.filter(t => t.status === 'IN_PROGRESS').length,
        COMPLETED: tasks.filter(t => t.status === 'COMPLETED').length,
    };

    const healthScore = tasks.length > 0 ? Math.round((taskStats.COMPLETED / tasks.length) * 100) : 0;

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
        <div style={{ position: 'relative', overflow: 'hidden', minHeight: 'calc(100vh - 72px)' }}>
            <ToastContainer />
            <div className="glow-blob glow-blob-1" />
            <div className="glow-blob glow-blob-2" />

            <div className="container" style={{
                position: 'relative',
                zIndex: 1,
                maxWidth: 1600,
                padding: '0 40px',
                paddingTop: 16,
                height: 'calc(100vh - 72px)',
                display: 'flex',
                flexDirection: 'column',
                overflow: 'hidden'
            }}>

                <div style={{ marginBottom: 12 }}>
                    <Link href="/projects" style={{ display: 'inline-flex', alignItems: 'center', gap: 6, color: 'var(--text-muted)', textDecoration: 'none', fontSize: '0.9rem' }}>
                        <ArrowLeft size={16} /> Back to Projects
                    </Link>
                </div>

                <div className="page-header" style={{ marginBottom: 20, borderBottom: '1px solid var(--border)', paddingBottom: 16 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'nowrap', gap: 20 }}>
                        <div style={{ flex: 1 }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 4 }}>
                                <div className="page-title-icon" style={{
                                    width: 36, height: 36, background: 'var(--purple-dim)',
                                    border: '1px solid rgba(168,85,247,0.2)', borderRadius: 10,
                                    display: 'flex', alignItems: 'center', justifyContent: 'center'
                                }}>
                                    <Layers size={18} color="var(--accent)" />
                                </div>
                                <h1 style={{ margin: 0, fontWeight: 900, fontSize: '1.8rem', letterSpacing: '-0.03em' }}>{project.name}</h1>
                                {project.sonar_project_key && (
                                    <div style={{ marginLeft: 8 }}>
                                        <StatusBadge status="ACTIVE" label="PROJECT BOUNDARY" />
                                    </div>
                                )}
                            </div>
                            <p className="page-subtitle" style={{ maxWidth: '900px', fontSize: '0.85rem', color: 'var(--text-muted)', margin: 0, lineHeight: 1.4 }}>
                                {project.description || "Project-specific orchestration context and environment boundary."}
                            </p>
                        </div>
                        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 12 }}>
                            <div style={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: 10,
                                padding: '4px 12px',
                                background: 'rgba(16,185,129,0.08)',
                                border: '1px solid rgba(16,185,129,0.2)',
                                borderRadius: 10,
                                boxShadow: '0 0 20px rgba(16,185,129,0.03)'
                            }}>
                                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end' }}>
                                    <span style={{ fontSize: '0.55rem', fontWeight: 900, color: 'var(--green)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>System Health</span>
                                    <span style={{ fontSize: '1.1rem', fontWeight: 900, color: '#fff', lineHeight: 1 }}>{healthScore}%</span>
                                </div>
                                <div style={{
                                    width: 28, height: 28,
                                    background: 'rgba(16,185,129,0.15)',
                                    borderRadius: 8,
                                    display: 'flex', alignItems: 'center', justifyContent: 'center'
                                }}>
                                    <Zap size={14} color="var(--green)" fill="var(--green)" style={{ filter: 'drop-shadow(0 0 4px var(--green))' }} />
                                </div>
                            </div>

                            <div style={{ display: 'flex', gap: 12 }}>
                                <Dialog open={isPRModalOpen} onOpenChange={setIsPRModalOpen}>
                                    <DialogTrigger asChild>
                                        <button className="btn btn-secondary border-white/10 flex items-center gap-2">
                                            <MessageSquareCode size={16} /> Review Existing PR
                                        </button>
                                    </DialogTrigger>
                                    <DialogContent className="sm:max-w-[400px] border-white/10 bg-[#141721] text-white">
                                        <DialogHeader>
                                            <DialogTitle>AI PR Review</DialogTitle>
                                            <DialogDescription className="text-slate-400">
                                                Enter the GitHub Pull Request number to trigger an automated AI review.
                                            </DialogDescription>
                                        </DialogHeader>
                                        <div className="grid gap-4 py-4">
                                            <div className="grid gap-2">
                                                <Label htmlFor="pr_number" className="text-slate-300">PR Number</Label>
                                                <Input
                                                    id="pr_number"
                                                    type="number"
                                                    placeholder="e.g. 42"
                                                    className="bg-black/50 border-white/10"
                                                    value={prNumber}
                                                    onChange={(e) => setPRNumber(e.target.value)}
                                                />
                                            </div>
                                        </div>
                                        <DialogFooter>
                                            <Button variant="ghost" className="text-slate-300 hover:text-white" onClick={() => setIsPRModalOpen(false)}>
                                                Cancel
                                            </Button>
                                            <Button className="btn-primary" onClick={handleManualReview} disabled={reviewingPR}>
                                                {reviewingPR ? <span className="spinner w-4 h-4 mr-2" /> : <Zap size={14} className="mr-2" />}
                                                Run Review
                                            </Button>
                                        </DialogFooter>
                                    </DialogContent>
                                </Dialog>

                                <Link href={`/extract?project_id=${project.id}`}>
                                    <button className="btn btn-primary">
                                        <Plus size={16} className="mr-2" /> New Extraction
                                    </button>
                                </Link>
                            </div>
                        </div>
                    </div>
                </div>

                <div style={{
                    display: 'grid',
                    gridTemplateColumns: '1fr 300px',
                    gap: 24,
                    alignItems: 'start',
                    flex: 1,
                    minHeight: 0,
                    marginBottom: 20
                }}>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 20, height: '100%', minHeight: 0 }}>

                        {/* Main Tabs */}
                        <div style={{ display: 'flex', gap: 24, borderBottom: '1px solid var(--border)', marginBottom: 16 }}>
                            <button
                                onClick={() => setActiveMainTab('OVERVIEW')}
                                style={{
                                    padding: '12px 0',
                                    fontSize: '0.8rem',
                                    fontWeight: 700,
                                    color: activeMainTab === 'OVERVIEW' ? 'var(--accent)' : 'var(--text-muted)',
                                    borderBottom: activeMainTab === 'OVERVIEW' ? '2px solid var(--accent)' : '2px solid transparent',
                                    transition: 'all 0.2s',
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: 6,
                                    background: 'none',
                                    cursor: 'pointer',
                                    borderTop: 'none',
                                    borderLeft: 'none',
                                    borderRight: 'none',
                                    outline: 'none',
                                    marginBottom: '-1px'
                                }}
                            >
                                <Github size={14} /> Overview
                            </button>
                            <button
                                onClick={() => setActiveMainTab('PIPELINE')}
                                style={{
                                    padding: '12px 0',
                                    fontSize: '0.8rem',
                                    fontWeight: 700,
                                    color: activeMainTab === 'PIPELINE' ? 'var(--accent)' : 'var(--text-muted)',
                                    borderBottom: activeMainTab === 'PIPELINE' ? '2px solid var(--accent)' : '2px solid transparent',
                                    transition: 'all 0.2s',
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: 6,
                                    background: 'none',
                                    cursor: 'pointer',
                                    borderTop: 'none',
                                    borderLeft: 'none',
                                    borderRight: 'none',
                                    outline: 'none',
                                    marginBottom: '-1px'
                                }}
                            >
                                <FileText size={14} /> Project Pipeline
                                <span style={{ fontSize: '9px', opacity: 0.6, background: 'var(--accent-glow)', color: 'var(--accent)', padding: '1px 6px', borderRadius: 8 }}>{tasks.length}</span>
                            </button>
                            {project.sonar_project_key && (
                                <button
                                    onClick={() => setActiveMainTab('SONAR')}
                                    style={{
                                        padding: '12px 0',
                                        fontSize: '0.8rem',
                                        fontWeight: 700,
                                        color: activeMainTab === 'SONAR' ? 'var(--accent)' : 'var(--text-muted)',
                                        borderBottom: activeMainTab === 'SONAR' ? '2px solid var(--accent)' : '2px solid transparent',
                                        transition: 'all 0.2s',
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: 6,
                                        background: 'none',
                                        cursor: 'pointer',
                                        borderTop: 'none',
                                        borderLeft: 'none',
                                        borderRight: 'none',
                                        outline: 'none',
                                        marginBottom: '-1px'
                                    }}
                                >
                                    <Bug size={14} /> Health Check
                                    <span style={{ fontSize: '9px', opacity: 0.6, background: 'var(--accent-glow)', color: 'var(--accent)', padding: '1px 6px', borderRadius: 8 }}>{sonarIssues.length}</span>
                                </button>
                            )}
                        </div>

                        <div style={{ flex: 1, minHeight: 0, overflowY: 'auto', paddingRight: 8 }}>
                            {activeMainTab === 'OVERVIEW' && (
                                <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
                                    {/* Stats Cards - High Visibility */}
                                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 12 }}>
                                        <div className="card" style={{ padding: '12px', background: 'linear-gradient(135deg, rgba(168,85,247,0.05), transparent)', borderLeft: '3px solid var(--accent)' }}>
                                            <div style={{ fontSize: '0.6rem', fontWeight: 800, color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: 2 }}>Tasks</div>
                                            <div style={{ fontSize: '1.1rem', fontWeight: 900 }}>{tasks.length}</div>
                                        </div>
                                        <div className="card" style={{ padding: '12px', background: 'linear-gradient(135deg, rgba(34,197,94,0.05), transparent)', borderLeft: '3px solid var(--green)' }}>
                                            <div style={{ fontSize: '0.6rem', fontWeight: 800, color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: 2 }}>Done</div>
                                            <div style={{ fontSize: '1.1rem', fontWeight: 900 }}>{taskStats.COMPLETED}</div>
                                        </div>
                                        <div className="card" style={{ padding: '12px', background: 'linear-gradient(135deg, rgba(239,68,68,0.05), transparent)', borderLeft: '3px solid var(--red)' }}>
                                            <div style={{ fontSize: '0.6rem', fontWeight: 800, color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: 2 }}>Issues</div>
                                            <div style={{ fontSize: '1.1rem', fontWeight: 900 }}>{project.sonar_metrics?.vulnerabilities || 0}</div>
                                        </div>
                                        <div className="card" style={{ padding: '12px', background: 'linear-gradient(135deg, rgba(59,130,246,0.05), transparent)', borderLeft: '3px solid var(--blue)' }}>
                                            <div style={{ fontSize: '0.6rem', fontWeight: 800, color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: 2 }}>Uptime</div>
                                            <div style={{ fontSize: '1.1rem', fontWeight: 900 }}>99.9%</div>
                                        </div>
                                        <div className="card" style={{ padding: '12px', background: 'linear-gradient(135deg, rgba(168,85,247,0.05), transparent)', borderLeft: '3px solid var(--accent)' }}>
                                            <div style={{ fontSize: '0.6rem', fontWeight: 800, color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: 2 }}>Avg. Fix</div>
                                            <div style={{ fontSize: '1.1rem', fontWeight: 900 }}>4.2m</div>
                                        </div>
                                    </div>

                                    <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1fr) 280px', gap: 20 }}>
                                        {/* Guidelines Section in Overview */}
                                        <section>
                                            <h2 style={{ fontSize: '0.9rem', marginBottom: 10, display: 'flex', alignItems: 'center', gap: 8, fontWeight: 800 }}>
                                                <Layers size={16} color="var(--accent)" /> Architecture Rules
                                            </h2>
                                            <div className="card" style={{ padding: '16px', background: 'rgba(255,255,255,0.02)', border: '1px dashed var(--border)' }}>
                                                <p style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', lineHeight: 1.6, margin: 0 }}>
                                                    {project.coding_guidelines || "System boundary guidelines are inherited from project context."}
                                                </p>
                                            </div>
                                        </section>

                                        {/* Simplified Repositories Section */}
                                        <section>
                                            <h2 style={{ fontSize: '0.9rem', marginBottom: 10, display: 'flex', alignItems: 'center', gap: 8, fontWeight: 800 }}>
                                                <Github size={16} color="var(--blue)" /> Source Code
                                            </h2>
                                            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                                                {project.github_repos?.length > 0 ? (
                                                    project.github_repos.map((repo) => (
                                                        <div key={repo} style={{
                                                            background: 'rgba(59,130,246,0.03)',
                                                            border: '1px solid rgba(59,130,246,0.1)',
                                                            borderRadius: 8,
                                                            padding: '8px 12px',
                                                            display: 'flex',
                                                            alignItems: 'center',
                                                            justifyContent: 'space-between',
                                                            transition: 'all 0.2s'
                                                        }} className="hover:border-blue-500/40 group">
                                                            <div style={{ display: 'flex', alignItems: 'center', gap: 8, overflow: 'hidden' }}>
                                                                <Github size={12} className="text-blue-400 shrink-0" />
                                                                <span style={{
                                                                    fontSize: '0.75rem',
                                                                    fontWeight: 800,
                                                                    color: 'var(--text-primary)',
                                                                    whiteSpace: 'nowrap',
                                                                    overflow: 'hidden',
                                                                    textOverflow: 'ellipsis'
                                                                }}>
                                                                    {repo}
                                                                </span>
                                                            </div>
                                                            <a
                                                                href={`https://github.com/${repo}`}
                                                                target="_blank"
                                                                rel="noreferrer"
                                                                style={{
                                                                    color: 'var(--blue)',
                                                                    fontSize: '0.62rem',
                                                                    fontWeight: 900,
                                                                    textDecoration: 'none',
                                                                    display: 'flex',
                                                                    alignItems: 'center',
                                                                    gap: 3,
                                                                    letterSpacing: '0.05em'
                                                                }}
                                                                className="hover:text-white transition-colors"
                                                            >
                                                                VIEW <ExternalLink size={10} />
                                                            </a>
                                                        </div>
                                                    ))
                                                ) : (
                                                    <div style={{ padding: 12, textAlign: 'center', opacity: 0.3, fontSize: '0.65rem' }}>No modules connected.</div>
                                                )}
                                            </div>
                                        </section>
                                    </div>
                                </div>
                            )}

                            {activeMainTab === 'PIPELINE' && (
                                <TaskPipelineSection
                                    tasks={tasks}
                                    selectedTaskStatus={selectedTaskStatus}
                                    setSelectedTaskStatus={setSelectedTaskStatus}
                                    taskStats={taskStats}
                                    filteredTasks={filteredTasks}
                                    isMounted={isMounted}
                                />
                            )}

                            {activeMainTab === 'SONAR' && (
                                <SonarHealthSection
                                    projectId={projectId}
                                    sonarIssues={sonarIssues}
                                    filteredSonarIssues={filteredSonarIssues}
                                    selectedSonarSeverity={selectedSonarSeverity}
                                    setSelectedSonarSeverity={setSelectedSonarSeverity}
                                    sonarStats={sonarStats}
                                    isSyncing={isSyncing}
                                    fixingIssue={fixingIssue}
                                    handleSyncSonar={handleSyncSonar}
                                    handleSweepAllSonar={handleSweepAllSonar}
                                    handleFixSonarIssue={handleFixSonarIssue}
                                    sweeping={sweeping}
                                />
                            )}
                        </div>
                    </div>

                    <aside style={{ display: 'flex', flexDirection: 'column', gap: 16, height: '100%', minHeight: 0, overflowY: 'auto', paddingRight: 4 }}>
                        <SonarSidebarCard project={project} />

                        <div className="card" style={{ padding: '16px', background: 'var(--bg-card)', border: '1px solid var(--border)' }}>
                            <div style={{ fontSize: '0.65rem', fontWeight: 800, color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: 12 }}>System Status</div>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                    <span style={{ fontSize: '0.7rem', color: 'var(--text-secondary)' }}>API Gateway</span>
                                    <div style={{ width: 6, height: 6, borderRadius: '50%', background: 'var(--green)' }} />
                                </div>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                    <span style={{ fontSize: '0.7rem', color: 'var(--text-secondary)' }}>Workflow Engine</span>
                                    <div style={{ width: 6, height: 6, borderRadius: '50%', background: 'var(--green)' }} />
                                </div>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                    <span style={{ fontSize: '0.7rem', color: 'var(--text-secondary)' }}>AI Agent Pool</span>
                                    <div style={{ width: 6, height: 6, borderRadius: '50%', background: 'var(--green)' }} />
                                </div>
                            </div>
                        </div>
                    </aside>
                </div>
            </div>
        </div>
    );
}

function TaskPipelineSection({ tasks, selectedTaskStatus, setSelectedTaskStatus, taskStats, filteredTasks, isMounted }: any) {
    return (
        <section style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                <h2 style={{ fontSize: '1rem', margin: 0, display: 'flex', alignItems: 'center', gap: 8, fontWeight: 800 }}>
                    <FileText size={16} color="var(--accent)" /> Pipeline View
                </h2>
                <div style={{ display: 'flex', background: 'var(--bg-card)', padding: 3, borderRadius: 8, border: '1px solid var(--border)', gap: 2 }}>
                    <CategoryBtn label="All" count={tasks.length} active={selectedTaskStatus === 'ALL'} onClick={() => setSelectedTaskStatus('ALL')} />
                    <CategoryBtn label="To Do" count={taskStats.TODO} active={selectedTaskStatus === 'TODO'} onClick={() => setSelectedTaskStatus('TODO')} />
                    <CategoryBtn label="In Progress" count={taskStats.IN_PROGRESS} active={selectedTaskStatus === 'IN_PROGRESS'} onClick={() => setSelectedTaskStatus('IN_PROGRESS')} />
                    <CategoryBtn label="Done" count={taskStats.COMPLETED} active={selectedTaskStatus === 'COMPLETED'} onClick={() => setSelectedTaskStatus('COMPLETED')} />
                </div>
            </div>

            <div style={{ flex: 1, minHeight: 0, overflowY: 'auto', paddingRight: 4 }}>
                {filteredTasks.length > 0 ? (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                        {filteredTasks.map((task: any) => (
                            <Link key={task.id} href={`/tasks/${task.id}`} style={{ textDecoration: 'none' }}>
                                <div className="card" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 16px', transition: 'all 0.2s' }}>
                                    <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
                                        <div style={{
                                            width: 6,
                                            height: 6,
                                            borderRadius: '50%',
                                            background: (() => {
                                                if (task.status === 'COMPLETED') return 'var(--green)';
                                                if (task.status === 'FAILED') return 'var(--red)';
                                                return 'var(--blue)';
                                            })()
                                        }} />
                                        <div>
                                            <div style={{ fontWeight: 700, fontSize: '0.85rem', color: 'var(--text-primary)' }}>{task.title}</div>
                                            <div style={{ display: 'flex', gap: 8, marginTop: 2 }}>
                                                <StatusBadge status={task.status} />
                                                <PriorityBadge priority={task.priority} />
                                            </div>
                                        </div>
                                    </div>
                                    <div style={{ color: 'var(--text-muted)', fontSize: '0.65rem', fontFamily: 'var(--font-mono)' }}>
                                        {isMounted ? new Date(task.updated_at).toLocaleDateString() : ''}
                                    </div>
                                </div>
                            </Link>
                        ))}
                    </div>
                ) : (
                    <div className="card" style={{ padding: 24, textAlign: 'center', borderStyle: 'dashed' }}>
                        <CheckCircle2 size={24} color="var(--green)" style={{ margin: '0 auto 12px', opacity: 0.3 }} />
                        <div style={{ fontSize: '0.9rem', fontWeight: 800 }}>Pipeline Clear</div>
                    </div>
                )}
            </div>
        </section>
    );
}

function SonarHealthSection({
    projectId,
    sonarIssues,
    filteredSonarIssues,
    selectedSonarSeverity,
    setSelectedSonarSeverity,
    sonarStats,
    isSyncing,
    fixingIssue,
    handleSyncSonar,
    handleSweepAllSonar,
    handleFixSonarIssue,
    sweeping
}: any) {
    return (
        <section style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                <h2 style={{ fontSize: '1rem', margin: 0, display: 'flex', alignItems: 'center', gap: 8, fontWeight: 800 }}>
                    <Bug size={16} color="var(--red)" /> Health Violations
                </h2>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <button
                        onClick={handleSweepAllSonar}
                        disabled={sweeping || sonarIssues.length === 0}
                        className="btn btn-primary btn-sm"
                        style={{ padding: '4px 12px', borderRadius: 6, fontSize: '0.7rem' }}
                    >
                        {sweeping ? <span className="spinner" /> : <Zap size={10} />}
                        Auto-Fix All
                    </button>
                    <button
                        onClick={handleSyncSonar}
                        disabled={isSyncing}
                        className="btn btn-secondary btn-sm"
                        style={{ padding: '4px 10px', borderRadius: 6, fontSize: '0.7rem' }}
                    >
                        <RefreshCw size={10} className={isSyncing ? 'animate-spin' : ''} />
                        Sync
                    </button>
                </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 8, marginBottom: 16 }}>
                <SeverityTile label="ALL" count={sonarIssues.length} active={selectedSonarSeverity === 'ALL'} onClick={() => setSelectedSonarSeverity('ALL')} color="slate" />
                <SeverityTile label="BLOCK" count={sonarStats.BLOCKER} active={selectedSonarSeverity === 'BLOCKER'} onClick={() => setSelectedSonarSeverity('BLOCKER')} color="red" />
                <SeverityTile label="CRIT" count={sonarStats.CRITICAL} active={selectedSonarSeverity === 'CRITICAL'} onClick={() => setSelectedSonarSeverity('CRITICAL')} color="orange" />
                <SeverityTile label="MAJOR" count={sonarStats.MAJOR} active={selectedSonarSeverity === 'MAJOR'} onClick={() => setSelectedSonarSeverity('MAJOR')} color="yellow" />
                <SeverityTile label="MINOR" count={sonarStats.MINOR} active={selectedSonarSeverity === 'MINOR'} onClick={() => setSelectedSonarSeverity('MINOR')} color="blue" />
            </div>

            <div style={{ flex: 1, minHeight: 0, overflowY: 'auto', paddingRight: 4 }}>
                {filteredSonarIssues.length > 0 ? (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                        {filteredSonarIssues.map((issue: any) => (
                            <div key={issue.key} className="card" style={{
                                padding: '12px 16px',
                                borderLeft: `3px solid ${(() => {
                                    if (issue.severity === 'CRITICAL' || issue.severity === 'BLOCKER') return 'var(--red)';
                                    if (issue.severity === 'MAJOR') return 'var(--yellow)';
                                    return 'var(--blue)';
                                })()}`
                            }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                                    <div style={{ display: 'flex', gap: 12, alignItems: 'flex-start' }}>
                                        <div style={{ marginTop: 2 }}>
                                            {(() => {
                                                if (issue.type === 'BUG') return <Bug size={14} color="var(--red)" />;
                                                if (issue.type === 'VULNERABILITY') return <Shield size={14} color="var(--orange)" />;
                                                return <Search size={14} color="var(--yellow)" />;
                                            })()}
                                        </div>
                                        <div>
                                            <div style={{ fontWeight: 700, fontSize: '0.85rem', color: 'var(--text-primary)' }}>{issue.message}</div>
                                            <div style={{ display: 'flex', gap: 10, marginTop: 4 }}>
                                                <span style={{ fontSize: '0.65rem', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: 3 }}>
                                                    <FileText size={10} /> {issue.component?.split(':').pop()}
                                                </span>
                                            </div>
                                        </div>
                                    </div>
                                    <button
                                        className="btn btn-secondary btn-sm"
                                        style={{ borderRadius: 6, padding: '4px 8px', fontSize: '0.65rem' }}
                                        disabled={fixingIssue === issue.key}
                                        onClick={() => handleFixSonarIssue(issue)}
                                    >
                                        {fixingIssue === issue.key ? <span className="spinner" /> : <Zap size={10} color="var(--yellow)" />}
                                        Fix
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>
                ) : (
                    <div className="card" style={{ padding: 24, textAlign: 'center', borderStyle: 'dashed' }}>
                        <CheckCircle2 size={24} color="var(--green)" style={{ margin: '0 auto 12px', opacity: 0.3 }} />
                        <div style={{ fontSize: '0.9rem', fontWeight: 800 }}>Code Health Optimal</div>
                    </div>
                )}
            </div>
        </section>
    );
}

function SonarSidebarCard({ project }: { project: Project | null }) {
    return (
        <div className="card" style={{
            padding: '14px 18px',
            background: 'rgba(59,130,246,0.03)',
            border: '1px solid rgba(59,130,246,0.1)'
        }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                <span style={{ fontSize: '0.75rem', fontWeight: 800, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>SonarCloud</span>
                {(() => {
                    const { label, bg, text } = getSonarStatus(project);
                    return (
                        <div style={{
                            padding: '2px 8px', borderRadius: 6,
                            background: bg, color: text, fontSize: '0.62rem', fontWeight: 800
                        }}>
                            {label}
                        </div>
                    );
                })()}
            </div>
            {project?.sonar_project_key ? (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8 }}>
                    <div style={{ background: 'var(--bg-base)', padding: '10px 5px', borderRadius: 8, textAlign: 'center' }}>
                        <div style={{ fontSize: '0.6rem', color: 'var(--text-muted)', marginBottom: 2 }}>BUGS</div>
                        <div style={{ fontSize: '1rem', fontWeight: 800, color: 'var(--red)' }}>{project.sonar_metrics?.bugs || 0}</div>
                    </div>
                    <div style={{ background: 'var(--bg-base)', padding: '10px 5px', borderRadius: 8, textAlign: 'center' }}>
                        <div style={{ fontSize: '0.6rem', color: 'var(--text-muted)', marginBottom: 2 }}>VULNER</div>
                        <div style={{ fontSize: '1rem', fontWeight: 800, color: 'var(--orange)' }}>{project.sonar_metrics?.vulnerabilities || 0}</div>
                    </div>
                    <div style={{ background: 'var(--bg-base)', padding: '10px 5px', borderRadius: 8, textAlign: 'center' }}>
                        <div style={{ fontSize: '0.6rem', color: 'var(--text-muted)', marginBottom: 2 }}>SMELLS</div>
                        <div style={{ fontSize: '1rem', fontWeight: 800, color: 'var(--yellow)' }}>{project.sonar_metrics?.code_smells || 0}</div>
                    </div>
                </div>
            ) : (
                <p style={{ fontSize: '0.7rem', color: 'var(--text-muted)', fontStyle: 'italic', margin: 0 }}>Configure Sonar in Project Settings to track issues.</p>
            )}
        </div>
    );
}

function GuidelinesSidebarCard({ project }: { project: Project }) {
    return (
        <div className="card" style={{
            padding: '14px 18px',
            background: 'rgba(168,85,247,0.03)',
            border: '1px solid rgba(168,85,247,0.1)'
        }}>
            <span style={{ fontSize: '0.75rem', fontWeight: 800, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', display: 'block', marginBottom: 10 }}>Guidelines</span>
            <p style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', lineHeight: 1.5, margin: 0 }}>
                {project.coding_guidelines || "No specific coding rules defined."}
            </p>
        </div>
    );
}

function CategoryBtn({ label, count, active, onClick }: { label: string, count: number, active: boolean, onClick: () => void }) {
    return (
        <button
            onClick={onClick}
            style={{
                background: active ? 'var(--accent)' : 'transparent',
                color: active ? '#fff' : 'var(--text-muted)',
                border: 'none',
                padding: '6px 12px',
                borderRadius: 8,
                fontSize: '0.72rem',
                fontWeight: 700,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: 6,
                transition: 'all 0.15s'
            }}
        >
            {label}
            <span style={{
                background: active ? 'rgba(255,255,255,0.2)' : 'rgba(255,255,255,0.05)',
                padding: '1px 6px', borderRadius: 6, fontSize: '0.6rem'
            }}>{count}</span>
        </button>
    );
}

function SeverityTile({ label, count, active, onClick, color }: { label: string, count: number, active: boolean, onClick: () => void, color: string }) {
    const brandColors: any = {
        red: 'var(--red)',
        orange: 'var(--orange)',
        yellow: 'var(--yellow)',
        blue: 'var(--blue)',
        slate: 'var(--text-muted)',
    };

    const bgColor = active ? brandColors[color] : 'var(--bg-base)';
    const textColor = active ? '#fff' : brandColors[color];
    const borderColor = active ? 'transparent' : `${brandColors[color]}20`;

    return (
        <button
            onClick={onClick}
            style={{
                background: bgColor,
                color: textColor,
                border: `1px solid ${borderColor}`,
                padding: '8px 4px',
                borderRadius: 10,
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: 2,
                cursor: 'pointer',
                transition: 'all 0.15s',
                boxShadow: active ? `0 4px 12px ${brandColors[color]}20` : 'none',
            }}
        >
            <div style={{ fontSize: '0.55rem', fontWeight: 800, opacity: active ? 0.9 : 0.6 }}>{label}</div>
            <div style={{ fontSize: '0.9rem', fontWeight: 900 }}>{count}</div>
        </button>
    );
}

