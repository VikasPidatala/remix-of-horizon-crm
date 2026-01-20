import { useState, useMemo } from 'react';
import { Call, CallStatus } from '@/types';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Search, Phone, Calendar, Clock, ArrowRight, Trash2, Edit, ChevronLeft, ChevronRight } from 'lucide-react';
import { format, isSameDay, parseISO, addDays, subDays, startOfDay, eachDayOfInterval } from 'date-fns';
import CallStatusChip from './CallStatusChip';
import { cn } from '@/lib/utils';

interface CallListProps {
  calls: Call[];
  onEdit?: (call: Call) => void;
  onDelete?: (id: string) => void;
  onConvertToLead?: (call: Call) => void;
}

export default function CallList({ calls, onEdit, onDelete, onConvertToLead }: CallListProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<CallStatus | 'all'>('all');
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());

  // Group calls by date
  const callsByDate = useMemo(() => {
    const grouped: Record<string, Call[]> = {};
    
    calls.forEach(call => {
      const dateKey = format(call.callDate, 'yyyy-MM-dd');
      if (!grouped[dateKey]) {
        grouped[dateKey] = [];
      }
      grouped[dateKey].push(call);
    });

    return grouped;
  }, [calls]);

  // Get 7 days around selected date for calendar strip
  const calendarDays = useMemo(() => {
    const start = subDays(selectedDate, 3);
    const end = addDays(selectedDate, 3);
    return eachDayOfInterval({ start, end });
  }, [selectedDate]);

  // Filter calls for selected date
  const filteredCalls = useMemo(() => {
    const dateKey = format(selectedDate, 'yyyy-MM-dd');
    let dateCalls = callsByDate[dateKey] || [];

    if (statusFilter !== 'all') {
      dateCalls = dateCalls.filter(c => c.status === statusFilter);
    }

    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      dateCalls = dateCalls.filter(c =>
        c.phone.toLowerCase().includes(term) ||
        (c.name && c.name.toLowerCase().includes(term)) ||
        (c.email && c.email.toLowerCase().includes(term))
      );
    }

    return dateCalls;
  }, [callsByDate, selectedDate, statusFilter, searchTerm]);

  const navigateDate = (direction: 'prev' | 'next') => {
    if (direction === 'prev') {
      setSelectedDate(subDays(selectedDate, 1));
    } else {
      setSelectedDate(addDays(selectedDate, 1));
    }
  };

  const handleCall = (phone: string) => {
    window.location.href = `tel:${phone}`;
  };

  const selectedDateKey = format(selectedDate, 'yyyy-MM-dd');
  const callCountForSelectedDate = callsByDate[selectedDateKey]?.length || 0;

  return (
    <div className="space-y-4">
      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
          <Input
            placeholder="Search by phone, name, or email..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-9"
          />
        </div>
        <Select value={statusFilter} onValueChange={(v) => setStatusFilter(v as CallStatus | 'all')}>
          <SelectTrigger className="w-full sm:w-[180px]">
            <SelectValue placeholder="Filter by status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Statuses</SelectItem>
            <SelectItem value="new">New</SelectItem>
            <SelectItem value="contacted">Contacted</SelectItem>
            <SelectItem value="not_answered">Not Answered</SelectItem>
            <SelectItem value="callback">Callback</SelectItem>
            <SelectItem value="converted">Converted</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Simple Calendar Strip */}
      <Card>
        <CardContent className="py-4">
          {/* Date Header with Navigation */}
          <div className="flex items-center justify-between mb-4">
            <Button
              variant="default"
              size="icon"
              onClick={() => navigateDate('prev')}
              className="bg-primary hover:bg-primary/90 text-primary-foreground rounded-lg"
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <div className="flex items-center gap-2">
              <Calendar className="h-4 w-4 text-muted-foreground" />
              <span className="text-lg font-medium">
                {format(selectedDate, 'EEEE, MMMM d, yyyy')}
              </span>
              <Badge variant="secondary" className="ml-2">
                {callCountForSelectedDate} calls
              </Badge>
            </div>
            <Button
              variant="outline"
              size="icon"
              onClick={() => navigateDate('next')}
              className="rounded-lg"
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>

          {/* Horizontal Calendar Strip */}
          <div className="flex justify-center gap-2">
            {calendarDays.map((day) => {
              const dateKey = format(day, 'yyyy-MM-dd');
              const isSelected = isSameDay(day, selectedDate);
              const isToday = isSameDay(day, new Date());
              const callCount = callsByDate[dateKey]?.length || 0;
              
              return (
                <button
                  key={dateKey}
                  onClick={() => setSelectedDate(day)}
                  className={cn(
                    "flex flex-col items-center p-2 rounded-lg min-w-[60px] transition-all",
                    isSelected 
                      ? "bg-primary text-primary-foreground" 
                      : isToday
                        ? "bg-accent text-accent-foreground"
                        : "hover:bg-muted"
                  )}
                >
                  <span className="text-xs font-medium">
                    {format(day, 'MMM d')}
                  </span>
                  {callCount > 0 && (
                    <Badge 
                      variant={isSelected ? "secondary" : "outline"} 
                      className={cn(
                        "mt-1 text-xs px-2 py-0",
                        isSelected && "bg-primary-foreground/20 text-primary-foreground border-0"
                      )}
                    >
                      {callCount}
                    </Badge>
                  )}
                </button>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Calls Table */}
      {filteredCalls.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center text-muted-foreground">
            {callCountForSelectedDate > 0
              ? 'No calls match your search criteria'
              : 'No calls recorded for this date'}
          </CardContent>
        </Card>
      ) : (
        <Card>
          <ScrollArea className="h-[500px]">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Phone</TableHead>
                  <TableHead>Name</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Time</TableHead>
                  <TableHead>Source</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Notes</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredCalls.map((call) => (
                  <TableRow key={call.id}>
                    <TableCell>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleCall(call.phone)}
                        className="flex items-center gap-2 text-primary hover:text-primary hover:bg-primary/10 p-0 h-auto font-medium"
                        title="Click to call"
                      >
                        <Phone className="h-4 w-4" />
                        {call.phone}
                      </Button>
                    </TableCell>
                    <TableCell>{call.name || '-'}</TableCell>
                    <TableCell>{call.email || '-'}</TableCell>
                    <TableCell>
                      {call.callTime ? (
                        <div className="flex items-center gap-1 text-muted-foreground">
                          <Clock className="h-3 w-3" />
                          {call.callTime}
                        </div>
                      ) : '-'}
                    </TableCell>
                    <TableCell>
                      {call.source ? (
                        <Badge variant="outline" className="capitalize">
                          {call.source.replace('_', ' ')}
                        </Badge>
                      ) : '-'}
                    </TableCell>
                    <TableCell>
                      <CallStatusChip status={call.status} />
                    </TableCell>
                    <TableCell className="max-w-[200px] truncate">
                      {call.notes || '-'}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-1">
                        {call.status !== 'converted' && onConvertToLead && (
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => onConvertToLead(call)}
                            title="Convert to Lead"
                            className="text-primary hover:text-primary"
                          >
                            <ArrowRight className="h-4 w-4" />
                          </Button>
                        )}
                        {onEdit && (
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => onEdit(call)}
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                        )}
                        {onDelete && (
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => onDelete(call.id)}
                            className="text-destructive hover:text-destructive"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </ScrollArea>
        </Card>
      )}
    </div>
  );
}
