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
import { getProject, listTasks, listSonarIssues, fixSonarIssue, triggerManualPRReview, sweepSonarIssues } from '@/lib/api';
import { StatusBadge, PriorityBadge } from '@/components/ui/Badges';
import { AlertCircle, Zap, Shield, Bug, Search, MessageSquareCode } from 'lucide-react';
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
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { syncSonarMetrics as syncSonar } from '@/lib/api';
import { RefreshCw, ClipboardList, Activity, CheckCircle, XCircle } from 'lucide-react';

const getSonarStatus = (project: Project | null) => {
    if (!project?.sonar_project_key) return { label: 'DISABLED', status: 'disabled', bg: 'rgba(255,255,255,0.05)', text: 'rgba(255,255,255,0.3)' };
    const hasMetrics = project.sonar_metrics && Object.keys(project.sonar_metrics).length > 0;
    if (hasMetrics) return { label: 'CONNECTED', status: 'connected', bg: 'rgba(34,197,94,0.1)', text: 'rgb(34,197,94)' };
    return { label: 'SYNCING', status: 'syncing', bg: 'rgba(59,130,246,0.1)', text: 'rgb(59,130,246)' };
};

export default function ProjectDashboardPage() {
    const params = useParams();
    const router = useRouter();
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
            await triggerManualPRReview(projectId, parseInt(prNumber));
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

            <div className="container" style={{ position: 'relative', zIndex: 1, maxWidth: 1600, padding: '0 80px', paddingTop: 32 }}>

                <div style={{ marginBottom: 24 }}>
                    <Link href="/projects" style={{ display: 'inline-flex', alignItems: 'center', gap: 6, color: 'var(--text-muted)', textDecoration: 'none', fontSize: '0.9rem' }}>
                        <ArrowLeft size={16} /> Back to Projects
                    </Link>
                </div>

                <div className="page-header" style={{ marginBottom: 40, borderBottom: '1px solid var(--border)', paddingBottom: 32 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', flexWrap: 'wrap', gap: 20 }}>
                        <div style={{ flex: 1 }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 8 }}>
                                <div className="page-title-icon" style={{
                                    width: 44, height: 44, background: 'var(--purple-dim)',
                                    border: '1px solid rgba(168,85,247,0.2)', borderRadius: 12,
                                    display: 'flex', alignItems: 'center', justifyContent: 'center'
                                }}>
                                    <Layers size={22} color="var(--accent)" />
                                </div>
                                <h1 style={{ margin: 0, fontWeight: 900, fontSize: '2.4rem', letterSpacing: '-0.03em' }}>{project.name}</h1>
                            </div>
                            <p className="page-subtitle" style={{ maxWidth: '800px', fontSize: '1rem', color: 'var(--text-muted)' }}>
                                {project.description || "Project-specific orchestration context and environment boundary."}
                            </p>
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

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 300px', gap: 32, alignItems: 'start' }}>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 32 }}>

                        {/* Main Tabs */}
                        <div style={{ display: 'flex', gap: 32, borderBottom: '1px solid var(--border)', marginBottom: 24 }}>
                            <button
                                onClick={() => setActiveMainTab('OVERVIEW')}
                                style={{
                                    padding: '16px 0',
                                    fontSize: '0.9rem',
                                    fontWeight: 700,
                                    color: activeMainTab === 'OVERVIEW' ? 'var(--accent)' : 'var(--text-muted)',
                                    borderBottom: activeMainTab === 'OVERVIEW' ? '2px solid var(--accent)' : 'none',
                                    transition: 'all 0.2s',
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: 8,
                                    background: 'none',
                                    cursor: 'pointer',
                                    border: 'none'
                                }}
                            >
                                <Github size={16} /> Overview
                            </button>
                            <button
                                onClick={() => setActiveMainTab('PIPELINE')}
                                style={{
                                    padding: '16px 0',
                                    fontSize: '0.9rem',
                                    fontWeight: 700,
                                    color: activeMainTab === 'PIPELINE' ? 'var(--accent)' : 'var(--text-muted)',
                                    borderBottom: activeMainTab === 'PIPELINE' ? '2px solid var(--accent)' : 'none',
                                    transition: 'all 0.2s',
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: 8,
                                    background: 'none',
                                    cursor: 'pointer',
                                    border: 'none'
                                }}
                            >
                                <FileText size={16} /> Project Pipeline
                                <span style={{ fontSize: '10px', opacity: 0.6, background: 'var(--accent-glow)', color: 'var(--accent)', padding: '2px 8px', borderRadius: 10 }}>{tasks.length}</span>
                            </button>
                            {project.sonar_project_key && (
                                <button
                                    onClick={() => setActiveMainTab('SONAR')}
                                    style={{
                                        padding: '16px 0',
                                        fontSize: '0.9rem',
                                        fontWeight: 700,
                                        color: activeMainTab === 'SONAR' ? 'var(--accent)' : 'var(--text-muted)',
                                        borderBottom: activeMainTab === 'SONAR' ? '2px solid var(--accent)' : 'none',
                                        transition: 'all 0.2s',
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: 8,
                                        background: 'none',
                                        cursor: 'pointer',
                                        border: 'none'
                                    }}
                                >
                                    <Bug size={16} /> Health Check
                                    <span style={{ fontSize: '10px', opacity: 0.6, background: 'var(--accent-glow)', color: 'var(--accent)', padding: '2px 8px', borderRadius: 10 }}>{sonarIssues.length}</span>
                                </button>
                            )}
                        </div>

                        {activeMainTab === 'OVERVIEW' && (
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
                            </div>
                        )}

                        {activeMainTab === 'PIPELINE' && (
                            <TaskPipelineSection
                                tasks={tasks}
                                selectedTaskStatus={selectedTaskStatus}
                                setSelectedTaskStatus={setSelectedTaskStatus}
                                taskStats={taskStats}
                                filteredTasks={filteredTasks}
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

                    {/* Sidebar Info */}
                    <aside style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
                        <SonarSidebarCard project={project} />
                        <GuidelinesSidebarCard project={project} />

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
        </div>
    );
}

function TaskPipelineSection({ tasks, selectedTaskStatus, setSelectedTaskStatus, taskStats, filteredTasks }: any) {
    return (
        <section>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                <h2 style={{ fontSize: '1.2rem', margin: 0, display: 'flex', alignItems: 'center', gap: 8, fontWeight: 800 }}>
                    <FileText size={20} color="var(--accent)" /> Project Pipeline
                </h2>
                <div style={{ display: 'flex', background: 'var(--bg-card)', padding: 4, borderRadius: 10, border: '1px solid var(--border)', gap: 4 }}>
                    <CategoryBtn label="All" count={tasks.length} active={selectedTaskStatus === 'ALL'} onClick={() => setSelectedTaskStatus('ALL')} />
                    <CategoryBtn label="To Do" count={taskStats.TODO} active={selectedTaskStatus === 'TODO'} onClick={() => setSelectedTaskStatus('TODO')} />
                    <CategoryBtn label="In Progress" count={taskStats.IN_PROGRESS} active={selectedTaskStatus === 'IN_PROGRESS'} onClick={() => setSelectedTaskStatus('IN_PROGRESS')} />
                    <CategoryBtn label="Done" count={taskStats.COMPLETED} active={selectedTaskStatus === 'COMPLETED'} onClick={() => setSelectedTaskStatus('COMPLETED')} />
                </div>
            </div>

            {filteredTasks.length > 0 ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                    {filteredTasks.map((task: any) => (
                        <Link key={task.id} href={`/tasks/${task.id}`} style={{ textDecoration: 'none' }}>
                            <div className="card" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '16px 20px', transition: 'all 0.2s' }}>
                                <div style={{ display: 'flex', gap: 16, alignItems: 'center' }}>
                                    <div style={{
                                        width: 8,
                                        height: 8,
                                        borderRadius: '50%',
                                        background: task.status === 'COMPLETED' ? 'var(--green)' : task.status === 'FAILED' ? 'var(--red)' : 'var(--blue)'
                                    }} />
                                    <div>
                                        <div style={{ fontWeight: 700, fontSize: '0.95rem', color: 'var(--text-primary)' }}>{task.title}</div>
                                        <div style={{ display: 'flex', gap: 12, marginTop: 4 }}>
                                            <StatusBadge status={task.status} />
                                            <PriorityBadge priority={task.priority} />
                                        </div>
                                    </div>
                                </div>
                                <div style={{ color: 'var(--text-muted)', fontSize: '0.75rem', fontFamily: 'var(--font-mono)' }}>
                                    {new Date(task.updated_at).toLocaleDateString()}
                                </div>
                            </div>
                        </Link>
                    ))}
                </div>
            ) : (
                <div className="card" style={{ padding: 48, textAlign: 'center', borderStyle: 'dashed' }}>
                    <CheckCircle2 size={32} color="var(--green)" style={{ margin: '0 auto 16px', opacity: 0.3 }} />
                    <div style={{ fontSize: '1.1rem', fontWeight: 800 }}>Pipeline Clear</div>
                    <p style={{ color: 'var(--text-muted)', marginTop: 8, fontSize: '0.9rem' }}>
                        No tasks found in this segment.
                    </p>
                </div>
            )}
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
        <section>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                <h2 style={{ fontSize: '1.2rem', margin: 0, display: 'flex', alignItems: 'center', gap: 8, fontWeight: 800 }}>
                    <Bug size={20} color="var(--red)" /> Health Violations
                </h2>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <button
                        onClick={handleSweepAllSonar}
                        disabled={sweeping || sonarIssues.length === 0}
                        className="btn btn-primary btn-sm"
                        style={{ padding: '6px 16px', borderRadius: 8 }}
                    >
                        {sweeping ? <span className="spinner" /> : <Zap size={12} />}
                        Auto-Fix All
                    </button>
                    <button
                        onClick={handleSyncSonar}
                        disabled={isSyncing}
                        className="btn btn-secondary btn-sm"
                        style={{ padding: '6px 12px', borderRadius: 8 }}
                    >
                        <RefreshCw size={12} className={isSyncing ? 'animate-spin' : ''} />
                        Sync Issues
                    </button>
                </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 12, marginBottom: 24 }}>
                <SeverityTile label="ALL" count={sonarIssues.length} active={selectedSonarSeverity === 'ALL'} onClick={() => setSelectedSonarSeverity('ALL')} color="slate" />
                <SeverityTile label="BLOCKER" count={sonarStats.BLOCKER} active={selectedSonarSeverity === 'BLOCKER'} onClick={() => setSelectedSonarSeverity('BLOCKER')} color="red" />
                <SeverityTile label="CRITICAL" count={sonarStats.CRITICAL} active={selectedSonarSeverity === 'CRITICAL'} onClick={() => setSelectedSonarSeverity('CRITICAL')} color="orange" />
                <SeverityTile label="MAJOR" count={sonarStats.MAJOR} active={selectedSonarSeverity === 'MAJOR'} onClick={() => setSelectedSonarSeverity('MAJOR')} color="yellow" />
                <SeverityTile label="MINOR" count={sonarStats.MINOR} active={selectedSonarSeverity === 'MINOR'} onClick={() => setSelectedSonarSeverity('MINOR')} color="blue" />
            </div>

            {filteredSonarIssues.length > 0 ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                    {filteredSonarIssues.map((issue: any) => (
                        <div key={issue.key} className="card" style={{
                            padding: '16px 20px',
                            borderLeft: `3px solid ${issue.severity === 'CRITICAL' || issue.severity === 'BLOCKER' ? 'var(--red)' : issue.severity === 'MAJOR' ? 'var(--yellow)' : 'var(--blue)'}`
                        }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                                <div style={{ display: 'flex', gap: 16, alignItems: 'flex-start' }}>
                                    <div style={{ marginTop: 4 }}>
                                        {issue.type === 'BUG' ? <Bug size={16} color="var(--red)" /> :
                                            issue.type === 'VULNERABILITY' ? <Shield size={16} color="var(--orange)" /> :
                                                <Search size={16} color="var(--yellow)" />}
                                    </div>
                                    <div>
                                        <div style={{ fontWeight: 700, fontSize: '0.95rem', color: 'var(--text-primary)' }}>{issue.message}</div>
                                        <div style={{ display: 'flex', gap: 12, marginTop: 6 }}>
                                            <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: 4 }}>
                                                <FileText size={11} /> {issue.component?.split(':').pop()}
                                            </span>
                                            <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: 4 }}>
                                                <Clock size={11} /> Line {issue.line || 'global'}
                                            </span>
                                        </div>
                                    </div>
                                </div>
                                <button
                                    className="btn btn-secondary btn-sm"
                                    style={{ borderRadius: 8, padding: '6px 12px' }}
                                    disabled={fixingIssue === issue.key}
                                    onClick={() => handleFixSonarIssue(issue)}
                                >
                                    {fixingIssue === issue.key ? <span className="spinner" /> : <Zap size={12} color="var(--yellow)" />}
                                    Fix with AI
                                </button>
                            </div>
                        </div>
                    ))}
                </div>
            ) : (
                <div className="card" style={{ padding: 48, textAlign: 'center', borderStyle: 'dashed' }}>
                    <CheckCircle2 size={32} color="var(--green)" style={{ margin: '0 auto 16px', opacity: 0.3 }} />
                    <div style={{ fontSize: '1.1rem', fontWeight: 800 }}>Category Resolved</div>
                    <p style={{ color: 'var(--text-muted)', marginTop: 8, fontSize: '0.9rem' }}>
                        No active {selectedSonarSeverity === 'ALL' ? '' : selectedSonarSeverity.toLowerCase()} violations found.
                    </p>
                </div>
            )}
        </section>
    );
}

function SonarSidebarCard({ project }: { project: Project | null }) {
    return (
        <div className="card" style={{ padding: '16px 20px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
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
        <div className="card" style={{ padding: '16px 20px' }}>
            <span style={{ fontSize: '0.75rem', fontWeight: 800, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', display: 'block', marginBottom: 12 }}>Architecture Guidelines</span>
            <p style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', lineHeight: 1.6, margin: 0 }}>
                {project.coding_guidelines || "No specific coding guidelines defined for this project context."}
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
    const borderColor = active ? 'transparent' : `${brandColors[color]}30`;

    return (
        <button
            onClick={onClick}
            style={{
                background: bgColor,
                color: textColor,
                border: `1px solid ${borderColor}`,
                padding: '12px 10px',
                borderRadius: 12,
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: 4,
                cursor: 'pointer',
                transition: 'all 0.15s',
                boxShadow: active ? `0 8px 20px ${brandColors[color]}30` : 'none',
            }}
        >
            <div style={{ fontSize: '0.6rem', fontWeight: 800, opacity: active ? 0.9 : 0.6 }}>{label}</div>
            <div style={{ fontSize: '1.1rem', fontWeight: 900 }}>{count}</div>
        </button>
    );
}

