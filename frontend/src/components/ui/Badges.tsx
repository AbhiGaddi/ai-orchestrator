import { Task } from '@/types';

const statusMap: Record<string, string> = {
    PENDING: 'badge-pending',
    APPROVED: 'badge-approved',
    REJECTED: 'badge-rejected',
    IN_PROGRESS: 'badge-in-progress',
    COMPLETED: 'badge-completed',
    FAILED: 'badge-failed',
};
const priorityMap: Record<string, string> = {
    LOW: 'priority-low',
    MEDIUM: 'priority-medium',
    HIGH: 'priority-high',
    CRITICAL: 'priority-critical',
};

export function StatusBadge({ status }: { status: Task['status'] }) {
    const label = status.replace('_', ' ');
    return <span className={`badge ${statusMap[status] ?? 'badge-pending'}`}>{label}</span>;
}

export function PriorityBadge({ priority }: { priority: Task['priority'] }) {
    return <span className={`badge ${priorityMap[priority] ?? 'priority-medium'}`}>{priority}</span>;
}

export function AgentStatusBadge({ status }: { status: string }) {
    return <span className={`badge ${statusMap[status] ?? 'badge-pending'}`}>{status}</span>;
}
