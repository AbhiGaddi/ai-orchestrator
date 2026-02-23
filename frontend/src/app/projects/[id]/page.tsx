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
                    <div style={{ display: 'flex', gap: 32, borderBottom: '1px solid rgba(255,255,255,0.05)', marginBottom: 24, paddingLeft: 4 }}>
                        <button
                            onClick={() => setActiveMainTab('OVERVIEW')}
                            style={{
                                padding: '12px 0',
                                fontSize: '0.9rem',
                                fontWeight: 600,
                                color: activeMainTab === 'OVERVIEW' ? '#3b82f6' : 'rgba(255,255,255,0.4)',
                                borderBottom: activeMainTab === 'OVERVIEW' ? '2px solid #3b82f6' : 'none',
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
                                padding: '12px 0',
                                fontSize: '0.9rem',
                                fontWeight: 600,
                                color: activeMainTab === 'PIPELINE' ? '#3b82f6' : 'rgba(255,255,255,0.4)',
                                borderBottom: activeMainTab === 'PIPELINE' ? '2px solid #3b82f6' : 'none',
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
                            <span style={{ fontSize: '10px', opacity: 0.6, background: 'rgba(255,255,255,0.05)', padding: '2px 6px', borderRadius: 10 }}>{tasks.length}</span>
                        </button>
                        {project.sonar_project_key && (
                            <button
                                onClick={() => setActiveMainTab('SONAR')}
                                style={{
                                    padding: '12px 0',
                                    fontSize: '0.9rem',
                                    fontWeight: 600,
                                    color: activeMainTab === 'SONAR' ? '#3b82f6' : 'rgba(255,255,255,0.4)',
                                    borderBottom: activeMainTab === 'SONAR' ? '2px solid #3b82f6' : 'none',
                                    transition: 'all 0.2s',
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: 8,
                                    background: 'none',
                                    cursor: 'pointer',
                                    border: 'none'
                                }}
                            >
                                <Bug size={16} /> SonarCloud Health
                                <span style={{ fontSize: '10px', opacity: 0.6, background: 'rgba(255,255,255,0.05)', padding: '2px 6px', borderRadius: 10 }}>{sonarIssues.length}</span>
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
    );
}

function TaskPipelineSection({ tasks, selectedTaskStatus, setSelectedTaskStatus, taskStats, filteredTasks }: any) {
    return (
        <section>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                <h2 style={{ fontSize: '1.2rem', margin: 0, display: 'flex', alignItems: 'center', gap: 8 }}>
                    <FileText size={20} color="var(--accent-light)" /> Project Pipeline
                </h2>
                <div className="flex bg-[#1a1d29] p-1 rounded-lg border border-white/5 gap-1">
                    <CategoryBtn label="All" count={tasks.length} active={selectedTaskStatus === 'ALL'} onClick={() => setSelectedTaskStatus('ALL')} />
                    <CategoryBtn label="To Do" count={taskStats.TODO} active={selectedTaskStatus === 'TODO'} onClick={() => setSelectedTaskStatus('TODO')} />
                    <CategoryBtn label="In Progress" count={taskStats.IN_PROGRESS} active={selectedTaskStatus === 'IN_PROGRESS'} onClick={() => setSelectedTaskStatus('IN_PROGRESS')} />
                    <CategoryBtn label="Done" count={taskStats.COMPLETED} active={selectedTaskStatus === 'COMPLETED'} onClick={() => setSelectedTaskStatus('COMPLETED')} />
                </div>
            </div>

            {filteredTasks.length > 0 ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                    {filteredTasks.map((task: any) => (
                        <Link key={task.id} href={`/tasks/${task.id}`} className="task-card-link">
                            <div className="card hover:border-white/20" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '16px 20px' }}>
                                <div style={{ display: 'flex', gap: 16, alignItems: 'center' }}>
                                    <div style={{
                                        width: 8,
                                        height: 8,
                                        borderRadius: '50%',
                                        background: task.status === 'COMPLETED' ? 'var(--green)' : task.status === 'FAILED' ? 'var(--red)' : 'var(--blue)'
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
                <div className="card" style={{ padding: 48, textAlign: 'center', opacity: 0.6 }}>
                    <CheckCircle2 size={32} className="text-green-400 mx-auto mb-4 opacity-30" />
                    <div style={{ fontSize: '1.1rem', fontWeight: 600 }}>Pipe Clean</div>
                    <p style={{ color: 'var(--text-muted)', marginTop: 8 }}>
                        No tasks found in this category.
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
                <h2 style={{ fontSize: '1.2rem', margin: 0, display: 'flex', alignItems: 'center', gap: 8 }}>
                    <Bug size={20} className="text-red-400" /> SonarCloud Health
                </h2>
                <div className="flex items-center gap-2">
                    <button
                        onClick={handleSweepAllSonar}
                        disabled={sweeping || sonarIssues.length === 0}
                        className="btn btn-primary h-7 px-3 text-[10px] flex items-center gap-2"
                    >
                        {sweeping ? <span className="spinner w-3 h-3" /> : <Zap size={12} className="fill-white" />}
                        Auto-Fix All
                    </button>
                    <button
                        onClick={handleSyncSonar}
                        disabled={isSyncing}
                        className="text-[10px] text-slate-500 hover:text-white flex items-center gap-1 transition-colors bg-white/5 px-2 py-1 rounded h-7"
                    >
                        <RefreshCw size={10} className={isSyncing ? 'animate-spin' : ''} />
                        {isSyncing ? 'Sync' : 'Sync'}
                    </button>
                </div>
            </div>

            <div className="grid grid-cols-5 gap-3 mb-6">
                <SeverityTile label="ALL" count={sonarIssues.length} active={selectedSonarSeverity === 'ALL'} onClick={() => setSelectedSonarSeverity('ALL')} color="slate" />
                <SeverityTile label="BLOCKER" count={sonarStats.BLOCKER} active={selectedSonarSeverity === 'BLOCKER'} onClick={() => setSelectedSonarSeverity('BLOCKER')} color="red" />
                <SeverityTile label="CRITICAL" count={sonarStats.CRITICAL} active={selectedSonarSeverity === 'CRITICAL'} onClick={() => setSelectedSonarSeverity('CRITICAL')} color="orange" />
                <SeverityTile label="MAJOR" count={sonarStats.MAJOR} active={selectedSonarSeverity === 'MAJOR'} onClick={() => setSelectedSonarSeverity('MAJOR')} color="yellow" />
                <SeverityTile label="MINOR" count={sonarStats.MINOR} active={selectedSonarSeverity === 'MINOR'} onClick={() => setSelectedSonarSeverity('MINOR')} color="blue" />
            </div>

            {filteredSonarIssues.length > 0 ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                    {filteredSonarIssues.map((issue: any) => (
                        <div key={issue.key} className="card shadow-sm hover:border-white/20 transition-all border-l-2" style={{
                            padding: '16px 20px',
                            borderLeftColor: issue.severity === 'CRITICAL' || issue.severity === 'BLOCKER' ? 'var(--red)' : issue.severity === 'MAJOR' ? 'var(--yellow)' : 'var(--blue)'
                        }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                                <div style={{ display: 'flex', gap: 16, alignItems: 'flex-start' }}>
                                    <div style={{ marginTop: 4 }}>
                                        {issue.type === 'BUG' ? <Bug size={16} className="text-red-400" /> :
                                            issue.type === 'VULNERABILITY' ? <Shield size={16} className="text-orange-400" /> :
                                                <Search size={16} className="text-yellow-400" />}
                                    </div>
                                    <div>
                                        <div style={{ fontWeight: 600, fontSize: '0.95rem', color: 'white' }}>{issue.message}</div>
                                        <div className="flex gap-3 mt-2 text-[11px] font-mono text-slate-500">
                                            <span className="flex items-center gap-1">
                                                <FileText size={10} /> {issue.component?.split(':').pop()}
                                            </span>
                                            <span className="flex items-center gap-1">
                                                <Clock size={10} /> Line {issue.line || 'global'}
                                            </span>
                                        </div>
                                    </div>
                                </div>
                                <button
                                    className="btn btn-secondary border-white/10 hover:bg-white/5 h-8 px-3 text-xs flex items-center gap-2"
                                    disabled={fixingIssue === issue.key}
                                    onClick={() => handleFixSonarIssue(issue)}
                                >
                                    {fixingIssue === issue.key ? <span className="spinner w-3 h-3" /> : <Zap size={12} className="text-yellow-400 fill-yellow-400" />}
                                    Fix with AI
                                </button>
                            </div>
                        </div>
                    ))}
                </div>
            ) : (
                <div className="card" style={{ padding: 48, textAlign: 'center', opacity: 0.6 }}>
                    <CheckCircle2 size={32} className="text-green-400 mx-auto mb-4 opacity-50" />
                    <div style={{ fontSize: '1.1rem', fontWeight: 600 }}>Category Resolved</div>
                    <p style={{ color: 'var(--text-muted)', marginTop: 8 }}>
                        No active {selectedSonarSeverity === 'ALL' ? '' : selectedSonarSeverity.toLowerCase()} violations found.
                    </p>
                </div>
            )}
        </section>
    );
}

function SonarSidebarCard({ project }: { project: Project | null }) {
    return (
        <Card className="bg-[#141721] border-white/10">
            <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
                <CardTitle className="text-sm">SonarCloud</CardTitle>
                {(() => {
                    const { label, bg, text } = getSonarStatus(project);
                    return (
                        <div style={{
                            padding: '2px 8px',
                            borderRadius: '4px',
                            background: bg,
                            color: text,
                            fontSize: '10px',
                            fontWeight: 600
                        }}>
                            {label}
                        </div>
                    );
                })()}
            </CardHeader>
            <CardContent>
                {project?.sonar_project_key ? (
                    <div className="grid grid-cols-3 gap-2 text-center pt-2">
                        <div className="p-2 rounded bg-white/5">
                            <div className="text-[10px] text-slate-500 mb-1">Bugs</div>
                            <div className="text-sm font-bold text-red-400">{project.sonar_metrics?.bugs || 0}</div>
                        </div>
                        <div className="p-2 rounded bg-white/5">
                            <div className="text-[10px] text-slate-500 mb-1">Vulner.</div>
                            <div className="text-sm font-bold text-orange-400">{project.sonar_metrics?.vulnerabilities || 0}</div>
                        </div>
                        <div className="p-2 rounded bg-white/5">
                            <div className="text-[10px] text-slate-500 mb-1">Smells</div>
                            <div className="text-sm font-bold text-yellow-400">{project.sonar_metrics?.code_smells || 0}</div>
                        </div>
                    </div>
                ) : (
                    <p className="text-[10px] text-slate-500 italic mt-1">Configure Sonar in Project Settings to track issues.</p>
                )}
            </CardContent>
        </Card>
    );
}

function GuidelinesSidebarCard({ project }: { project: Project }) {
    return (
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
    );
}

function CategoryBtn({ label, count, active, onClick }: { label: string, count: number, active: boolean, onClick: () => void }) {
    return (
        <button
            onClick={onClick}
            className={`px-3 py-1.5 rounded-md text-[11px] font-medium transition-all flex items-center gap-2 ${active ? 'bg-[#3b82f6] text-white shadow-lg shadow-blue-500/20' : 'text-slate-400 hover:text-white hover:bg-white/5'}`}
        >
            {label}
            <span className={`px-1.5 py-0.5 rounded-full text-[9px] ${active ? 'bg-white/20' : 'bg-white/5'}`}>{count}</span>
        </button>
    );
}

function SeverityTile({ label, count, active, onClick, color }: { label: string, count: number, active: boolean, onClick: () => void, color: string }) {
    const colorClasses: any = {
        red: active ? 'bg-red-500 text-white shadow-lg shadow-red-500/20' : 'border-red-500/20 text-red-400 bg-red-500/5',
        orange: active ? 'bg-orange-500 text-white shadow-lg shadow-orange-500/20' : 'border-orange-500/20 text-orange-400 bg-orange-500/5',
        yellow: active ? 'bg-yellow-500 text-black shadow-lg shadow-yellow-500/20' : 'border-yellow-500/20 text-yellow-400 bg-yellow-500/5',
        blue: active ? 'bg-blue-500 text-white shadow-lg shadow-blue-500/20' : 'border-blue-500/20 text-blue-400 bg-blue-500/5',
        slate: active ? 'bg-slate-500 text-white' : 'border-slate-500/20 text-slate-400 bg-slate-500/5',
    };

    return (
        <button
            onClick={onClick}
            className={`p-3 rounded-lg border flex flex-col items-center gap-1 transition-all ${colorClasses[color]}`}
        >
            <div className={`text-[9px] font-bold tracking-wider ${active ? 'opacity-90' : 'opacity-60'}`}>{label}</div>
            <div className="text-lg font-bold">{count}</div>
        </button>
    );
}

