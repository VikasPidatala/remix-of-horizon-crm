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
import { format, isSameDay, parseISO, startOfDay } from 'date-fns';
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

    // Sort dates in descending order
    return Object.entries(grouped)
      .sort((a, b) => b[0].localeCompare(a[0]))
      .reduce((acc, [key, value]) => {
        acc[key] = value;
        return acc;
      }, {} as Record<string, Call[]>);
  }, [calls]);

  // Get unique dates for calendar navigation
  const availableDates = useMemo(() => {
    return Object.keys(callsByDate).map(d => parseISO(d));
  }, [callsByDate]);

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
    const sortedDates = availableDates.sort((a, b) => a.getTime() - b.getTime());
    const currentIndex = sortedDates.findIndex(d => isSameDay(d, selectedDate));
    
    if (direction === 'prev' && currentIndex > 0) {
      setSelectedDate(sortedDates[currentIndex - 1]);
    } else if (direction === 'next' && currentIndex < sortedDates.length - 1) {
      setSelectedDate(sortedDates[currentIndex + 1]);
    }
  };

  const selectedDateKey = format(selectedDate, 'yyyy-MM-dd');
  const hasCallsOnSelectedDate = callsByDate[selectedDateKey]?.length > 0;

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

      {/* Date Navigation */}
      <Card>
        <CardHeader className="py-3">
          <div className="flex items-center justify-between">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => navigateDate('prev')}
              disabled={!availableDates.some(d => d < selectedDate)}
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <div className="flex items-center gap-2">
              <Calendar className="h-4 w-4 text-muted-foreground" />
              <CardTitle className="text-lg font-medium">
                {format(selectedDate, 'EEEE, MMMM d, yyyy')}
              </CardTitle>
              {hasCallsOnSelectedDate && (
                <Badge variant="secondary" className="ml-2">
                  {callsByDate[selectedDateKey].length} calls
                </Badge>
              )}
            </div>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => navigateDate('next')}
              disabled={!availableDates.some(d => d > selectedDate)}
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </CardHeader>
      </Card>

      {/* Date Quick Select */}
      <ScrollArea className="w-full">
        <div className="flex gap-2 pb-2">
          {Object.entries(callsByDate).slice(0, 14).map(([dateKey, dateCalls]) => {
            const date = parseISO(dateKey);
            const isSelected = isSameDay(date, selectedDate);
            return (
              <Button
                key={dateKey}
                variant={isSelected ? 'default' : 'outline'}
                size="sm"
                onClick={() => setSelectedDate(date)}
                className="flex-shrink-0"
              >
                <div className="text-center">
                  <div className="text-xs">{format(date, 'MMM d')}</div>
                  <Badge variant={isSelected ? 'secondary' : 'outline'} className="mt-1 text-xs">
                    {dateCalls.length}
                  </Badge>
                </div>
              </Button>
            );
          })}
        </div>
      </ScrollArea>

      {/* Calls Table */}
      {filteredCalls.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center text-muted-foreground">
            {hasCallsOnSelectedDate 
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
                      <div className="flex items-center gap-2">
                        <Phone className="h-4 w-4 text-muted-foreground" />
                        <span className="font-medium">{call.phone}</span>
                      </div>
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
