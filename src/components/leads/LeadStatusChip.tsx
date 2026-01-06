import { LeadStatus } from '@/types';
import { cn } from '@/lib/utils';

interface LeadStatusChipProps {
  status: LeadStatus;
}

const statusConfig: Record<LeadStatus, { label: string; className: string }> = {
  interested: { label: 'Interested', className: 'status-interested' },
  not_interested: { label: 'Not Interested', className: 'status-not-interested' },
  pending: { label: 'Pending', className: 'status-pending' },
  reminder: { label: 'Reminder', className: 'status-reminder' },
};

export default function LeadStatusChip({ status }: LeadStatusChipProps) {
  const config = statusConfig[status];
  
  return (
    <span className={cn('status-chip', config.className)}>
      <span className="w-1.5 h-1.5 rounded-full bg-current" />
      {config.label}
    </span>
  );
}
