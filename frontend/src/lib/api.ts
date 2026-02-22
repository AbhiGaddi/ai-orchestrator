import { Task, AgentRun, ExtractResponse } from '@/types';

const BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

async function request<T>(path: string, options?: RequestInit): Promise<T> {
    const res = await fetch(`${BASE_URL}${path}`, {
        headers: { 'Content-Type': 'application/json', ...options?.headers },
        ...options,
    });
    if (!res.ok) {
        const error = await res.json().catch(() => ({ detail: res.statusText }));
        throw new Error(error.detail || 'Request failed');
    }
    return res.json();
}

// ─── Discussion ────────────────────────────────────────────────────────────
export const extractTasks = (transcript: string): Promise<ExtractResponse> =>
    request('/api/discussion/extract', {
        method: 'POST',
        body: JSON.stringify({ transcript }),
    });

// ─── Tasks ─────────────────────────────────────────────────────────────────
export const listTasks = (): Promise<Task[]> => request('/api/tasks');

export const getTask = (id: string): Promise<Task> => request(`/api/tasks/${id}`);

export const updateTask = (
    id: string,
    data: Partial<Pick<Task, 'title' | 'description' | 'acceptance_criteria' | 'deadline' | 'priority'>>
): Promise<Task> =>
    request(`/api/tasks/${id}`, { method: 'PATCH', body: JSON.stringify(data) });

export const approveTask = (id: string, edits?: Partial<Task>): Promise<Task> =>
    request(`/api/tasks/${id}/approve`, {
        method: 'PATCH',
        body: JSON.stringify(edits || {}),
    });

export const rejectTask = (id: string): Promise<Task> =>
    request(`/api/tasks/${id}/reject`, { method: 'PATCH' });

// ─── Execution ─────────────────────────────────────────────────────────────
export const executeTask = (id: string): Promise<Task> =>
    request(`/api/execution/${id}/execute`, { method: 'POST' });

// ─── Agent Runs ────────────────────────────────────────────────────────────
export const listAgentRuns = (taskId?: string): Promise<AgentRun[]> => {
    const qs = taskId ? `?task_id=${taskId}` : '';
    return request(`/api/agent-runs${qs}`);
};
