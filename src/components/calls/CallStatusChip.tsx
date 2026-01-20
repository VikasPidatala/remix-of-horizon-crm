import { CallStatus } from '@/types';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

interface CallStatusChipProps {
  status: CallStatus;
}

const statusConfig: Record<CallStatus, { label: string; className: string }> = {
  new: { label: 'New', className: 'bg-blue-100 text-blue-800 border-blue-200' },
  contacted: { label: 'Contacted', className: 'bg-green-100 text-green-800 border-green-200' },
  not_answered: { label: 'Not Answered', className: 'bg-orange-100 text-orange-800 border-orange-200' },
  callback: { label: 'Callback', className: 'bg-purple-100 text-purple-800 border-purple-200' },
  converted: { label: 'Converted', className: 'bg-emerald-100 text-emerald-800 border-emerald-200' },
};

export default function CallStatusChip({ status }: CallStatusChipProps) {
  const config = statusConfig[status] || statusConfig.new;
  
  return (
    <Badge variant="outline" className={cn('font-medium', config.className)}>
      {config.label}
    </Badge>
  );
}
