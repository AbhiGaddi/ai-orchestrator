import { ExtractResponse, Task, AgentRun, AgentRunStep, Project } from '@/types';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

export async function fetchApi<T>(endpoint: string, options?: RequestInit): Promise<T> {
    const res = await fetch(`${API_URL}${endpoint}`, {
        ...options,
        headers: { 'Content-Type': 'application/json', ...options?.headers },
    });
    if (res.status === 204) {
        return {} as T;
    }
    if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.detail || `API Error: ${res.status}`);
    }
    return res.json();
}

// -- Projects --
export function listProjects() {
    return fetchApi<Project[]>('/projects');
}

export function getProject(id: string) {
    return fetchApi<Project>(`/projects/${id}`);
}

export function createProject(data: Partial<Project>) {
    return fetchApi<Project>('/projects', {
        method: 'POST',
        body: JSON.stringify(data),
    });
}

export function updateProject(id: string, data: Partial<Project>) {
    return fetchApi<Project>(`/projects/${id}`, {
        method: 'PUT',
        body: JSON.stringify(data),
    });
}

export function listSonarIssues(projectId: string) {
    return fetchApi<any[]>(`/projects/${projectId}/sonar/issues`);
}

export function syncSonarMetrics(projectId: string) {
    return fetchApi<any>(`/projects/${projectId}/sonar/sync`, {
        method: 'POST'
    });
}

export function fixSonarIssue(projectId: string, issue: any) {
    return fetchApi<any>(`/api/execution/sonar-fix?project_id=${projectId}`, {
        method: 'POST',
        body: JSON.stringify(issue)
    });
}

export function sweepSonarIssues(projectId: string, issues: any[]) {
    return fetchApi<any>(`/api/execution/sonar-sweep?project_id=${projectId}`, {
        method: 'POST',
        body: JSON.stringify(issues)
    });
}

export function triggerManualPRReview(projectId: string, prNumber: number, repo?: string) {
    const qs = repo ? `&repo=${repo}` : '';
    return fetchApi<any>(`/api/execution/pr-review?project_id=${projectId}&pr_number=${prNumber}${qs}`, {
        method: 'POST'
    });
}

// -- Discussion Phase 1 --
export const extractTasks = (transcript: string, project_id?: string, github_repo?: string): Promise<ExtractResponse> =>
    fetchApi('/api/discussion/extract', {
        method: 'POST',
        body: JSON.stringify({ transcript, project_id, github_repo }),
    });

// -- Tasks --
export const listTasks = (projectId?: string): Promise<Task[]> => {
    const qs = projectId ? `?project_id=${projectId}` : '';
    return fetchApi(`/api/tasks${qs}`);
};

export const syncTasks = (): Promise<{ status: string; updated_tasks: number }> =>
    fetchApi('/api/tasks/sync', { method: 'POST' });

export const getTask = (id: string): Promise<Task> => fetchApi(`/api/tasks/${id}`);

export const updateTask = (
    id: string,
    data: Partial<Pick<Task, 'title' | 'description' | 'acceptance_criteria' | 'deadline' | 'priority' | 'github_repo'>>
): Promise<Task> => fetchApi(`/api/tasks/${id}`, { method: 'PATCH', body: JSON.stringify(data) });

export const approveTask = (id: string, edits?: Partial<Task>): Promise<Task> =>
    fetchApi(`/api/tasks/${id}/approve`, {
        method: 'PATCH',
        body: JSON.stringify(edits || {}),
    });

export const rejectTask = (id: string): Promise<Task> =>
    fetchApi(`/api/tasks/${id}/reject`, { method: 'PATCH' });

export const abortTask = (id: string): Promise<Task> =>
    fetchApi(`/api/tasks/${id}/abort`, { method: 'POST' });

export const deleteTask = (id: string): Promise<void> =>
    fetchApi(`/api/tasks/${id}`, { method: 'DELETE' });

// -- Execution --
export const executeTask = (id: string): Promise<Task> =>
    fetchApi(`/api/execution/${id}/execute`, { method: 'POST' });

export const generateCodeTask = (id: string, baseBranch?: string, targetBranch?: string): Promise<Task> => {
    const searchParams = new URLSearchParams();
    if (baseBranch) searchParams.append('base_branch', baseBranch);
    if (targetBranch) searchParams.append('target_branch', targetBranch);
    const qs = searchParams.toString() ? `?${searchParams.toString()}` : '';
    return fetchApi(`/api/execution/${id}/code${qs}`, { method: 'POST' });
};

export const reviewPRTask = (id: string): Promise<Task> =>
    fetchApi(`/api/execution/${id}/review`, { method: 'POST' });

// -- Agent Runs --
export const listAgentRuns = (taskId?: string): Promise<AgentRun[]> => {
    const qs = taskId ? `?task_id=${taskId}` : '';
    return fetchApi(`/api/agent-runs${qs}`);
};

export const getAgentRunSteps = (runId: string): Promise<AgentRunStep[]> =>
    fetchApi(`/api/agent-runs/${runId}/steps`);
