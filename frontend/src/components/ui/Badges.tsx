import { Task } from '@/types';

const statusMap: Record<string, string> = {
    PENDING: 'badge-pending',
    APPROVED: 'badge-approved',
    REJECTED: 'badge-rejected',
    IN_PROGRESS: 'badge-in-progress',
    COMPLETED: 'badge-approved', // Show as blueish/purple since it's just in review, not entirely done
    FAILED: 'badge-failed',
    DONE: 'badge-completed', // The actual fully done state
};
const priorityMap: Record<string, string> = {
    LOW: 'priority-low',
    MEDIUM: 'priority-medium',
    HIGH: 'priority-high',
    CRITICAL: 'priority-critical',
};

export function StatusBadge({ status, label }: { status: string, label?: string }) {
    let displayLabel = label || status.replace('_', ' ');
    if (status === 'COMPLETED') {
        displayLabel = label || 'IN REVIEW';
    } else if (status === 'DONE') {
        displayLabel = label || 'MERGED';
    }
    return <span className={`badge ${statusMap[status] ?? 'badge-pending'}`}>{displayLabel}</span>;
}

export function PriorityBadge({ priority }: { priority: Task['priority'] }) {
    return <span className={`badge ${priorityMap[priority] ?? 'priority-medium'}`}>{priority}</span>;
}

export function AgentStatusBadge({ status }: { status: string }) {
    return <span className={`badge ${statusMap[status] ?? 'badge-pending'}`}>{status}</span>;
}
