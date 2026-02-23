import { ExtractResponse, Task, AgentRun, Project } from '@/types';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

export async function fetchApi<T>(endpoint: string, options?: RequestInit): Promise<T> {
    const res = await fetch(`${API_URL}${endpoint}`, {
        ...options,
        headers: { 'Content-Type': 'application/json', ...options?.headers },
    });
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
