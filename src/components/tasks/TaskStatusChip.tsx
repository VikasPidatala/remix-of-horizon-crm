import { TaskStatus } from '@/types';
import { cn } from '@/lib/utils';

interface TaskStatusChipProps {
  status: TaskStatus;
}

const statusConfig: Record<TaskStatus, { label: string; className: string }> = {
  visit: { label: 'Visit', className: 'bg-info/15 text-info ring-1 ring-info/30' },
  family_visit: { label: 'Family Visit', className: 'bg-primary/15 text-primary ring-1 ring-primary/30' },
  pending: { label: 'Pending', className: 'status-pending' },
  completed: { label: 'Completed', className: 'status-interested' },
  rejected: { label: 'Rejected', className: 'status-not-interested' },
};

export default function TaskStatusChip({ status }: TaskStatusChipProps) {
  const config = statusConfig[status];
  
  return (
    <span className={cn('status-chip', config.className)}>
      <span className="w-1.5 h-1.5 rounded-full bg-current" />
      {config.label}
    </span>
  );
}
