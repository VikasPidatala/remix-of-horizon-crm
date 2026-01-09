import { useState, useEffect, useMemo } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import { Plus, Edit, Trash2, CalendarDays, ChevronLeft, ChevronRight } from 'lucide-react';
import { format, parseISO, eachDayOfInterval } from 'date-fns';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import HolidayFormModal from './HolidayFormModal';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';

interface Holiday {
  id: string;
  title: string;
  start_date: string;
  end_date: string;
  message?: string;
  image_url?: string;
  created_by: string;
  created_at: string;
}

interface HolidayCalendarModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export default function HolidayCalendarModal({ open, onOpenChange }: HolidayCalendarModalProps) {
  const { user } = useAuth();
  const isAdmin = user?.role === 'admin';

  const [holidays, setHolidays] = useState<Holiday[]>([]);
  const [loading, setLoading] = useState(true);
  const [formOpen, setFormOpen] = useState(false);
  const [editingHoliday, setEditingHoliday] = useState<Holiday | null>(null);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [deletingHoliday, setDeletingHoliday] = useState<Holiday | null>(null);
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(undefined);

  const fetchHolidays = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('holidays')
      .select('*')
      .order('start_date', { ascending: true });

    if (error) {
      toast.error('Failed to load holidays');
    } else {
      setHolidays(data || []);
    }
    setLoading(false);
  };

  useEffect(() => {
    if (open) {
      fetchHolidays();
    }
  }, [open]);

  const handleSave = async (data: { title: string; start_date: string; end_date: string; message?: string; image_url?: string }) => {
    if (editingHoliday) {
      const { error } = await supabase
        .from('holidays')
        .update({ ...data, updated_at: new Date().toISOString() })
        .eq('id', editingHoliday.id);

      if (error) {
        toast.error('Failed to update holiday');
      } else {
        toast.success('Holiday updated');
        fetchHolidays();
      }
    } else {
      const { error } = await supabase.from('holidays').insert({
        ...data,
        created_by: user?.name || 'Admin',
      });

      if (error) {
        toast.error('Failed to add holiday');
      } else {
        toast.success('Holiday added');
        fetchHolidays();
      }
    }
    setEditingHoliday(null);
  };

  const handleDelete = async () => {
    if (!deletingHoliday) return;

    const { error } = await supabase.from('holidays').delete().eq('id', deletingHoliday.id);

    if (error) {
      toast.error('Failed to delete holiday');
    } else {
      toast.success('Holiday deleted');
      fetchHolidays();
    }
    setDeletingHoliday(null);
    setDeleteConfirmOpen(false);
  };

  // Get holidays for a specific date
  const getHolidaysForDate = (date: Date) => {
    return holidays.filter((holiday) => {
      const start = parseISO(holiday.start_date);
      const end = parseISO(holiday.end_date);
      return date >= start && date <= end;
    });
  };

  // Get all dates that have holidays
  const holidayDates = useMemo(() => {
    const dates: Date[] = [];
    holidays.forEach((holiday) => {
      const start = parseISO(holiday.start_date);
      const end = parseISO(holiday.end_date);
      const daysInRange = eachDayOfInterval({ start, end });
      dates.push(...daysInRange);
    });
    return dates;
  }, [holidays]);

  // Selected date holidays
  const selectedDateHolidays = selectedDate ? getHolidaysForDate(selectedDate) : [];

  const handlePrevMonth = () => {
    setCurrentMonth(prev => new Date(prev.getFullYear(), prev.getMonth() - 1, 1));
  };

  const handleNextMonth = () => {
    setCurrentMonth(prev => new Date(prev.getFullYear(), prev.getMonth() + 1, 1));
  };

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-4xl max-h-[90vh] flex flex-col overflow-hidden">
          <DialogHeader className="pr-8 shrink-0">
            <div className="flex items-center justify-between gap-4">
              <DialogTitle className="flex items-center gap-2">
                <CalendarDays className="h-5 w-5 text-primary" />
                Holiday Calendar
              </DialogTitle>
              {isAdmin && (
                <Button onClick={() => setFormOpen(true)} size="sm" className="shrink-0">
                  <Plus className="h-4 w-4 mr-2" />
                  Add Holiday
                </Button>
              )}
            </div>
          </DialogHeader>

          <div className="flex-1 flex flex-col lg:flex-row gap-6 min-h-0 overflow-auto">
            {/* Calendar Section */}
            <div className="flex-1 flex flex-col items-center">
              {/* Month Navigation */}
              <div className="flex items-center justify-between w-full max-w-sm mb-4">
                <Button variant="outline" size="icon" onClick={handlePrevMonth}>
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <h3 className="font-semibold text-lg">
                  {format(currentMonth, 'MMMM yyyy')}
                </h3>
                <Button variant="outline" size="icon" onClick={handleNextMonth}>
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>

              {loading ? (
                <div className="text-center py-8 text-muted-foreground">Loading...</div>
              ) : (
                <Calendar
                  mode="single"
                  selected={selectedDate}
                  onSelect={setSelectedDate}
                  month={currentMonth}
                  onMonthChange={setCurrentMonth}
                  className="rounded-md border pointer-events-auto"
                  modifiers={{
                    holiday: holidayDates,
                  }}
                  modifiersClassNames={{
                    holiday: 'bg-primary/20 text-primary font-semibold',
                  }}
                  components={{
                    DayContent: ({ date }) => {
                      const dayHolidays = getHolidaysForDate(date);
                      const hasHoliday = dayHolidays.length > 0;
                      return (
                        <div className="relative w-full h-full flex items-center justify-center">
                          <span>{date.getDate()}</span>
                          {hasHoliday && (
                            <span className="absolute bottom-0 left-1/2 -translate-x-1/2 w-1.5 h-1.5 rounded-full bg-primary" />
                          )}
                        </div>
                      );
                    },
                  }}
                />
              )}
            </div>

            {/* Selected Date Details */}
            <div className="lg:w-72 shrink-0 border-t lg:border-t-0 lg:border-l pt-4 lg:pt-0 lg:pl-6">
              <h4 className="font-semibold mb-3 text-sm text-muted-foreground uppercase tracking-wide">
                {selectedDate ? format(selectedDate, 'EEEE, MMM d, yyyy') : 'Select a date'}
              </h4>
              
              {selectedDate && selectedDateHolidays.length === 0 && (
                <p className="text-sm text-muted-foreground">No holidays on this date</p>
              )}

              <div className="space-y-3">
                {selectedDateHolidays.map((holiday) => (
                  <div
                    key={holiday.id}
                    className="p-3 rounded-lg border bg-card"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1 min-w-0">
                        <h5 className="font-medium text-sm">{holiday.title}</h5>
                        <p className="text-xs text-muted-foreground mt-0.5">
                          {format(parseISO(holiday.start_date), 'MMM d')} - {format(parseISO(holiday.end_date), 'MMM d, yyyy')}
                        </p>
                        {holiday.message && (
                          <p className="text-xs text-muted-foreground mt-2 line-clamp-2">
                            {holiday.message}
                          </p>
                        )}
                      </div>
                      {isAdmin && (
                        <div className="flex gap-1 shrink-0">
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7"
                            onClick={() => {
                              setEditingHoliday(holiday);
                              setFormOpen(true);
                            }}
                          >
                            <Edit className="h-3.5 w-3.5" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7 text-destructive hover:text-destructive"
                            onClick={() => {
                              setDeletingHoliday(holiday);
                              setDeleteConfirmOpen(true);
                            }}
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>

              {!selectedDate && holidays.length > 0 && (
                <div className="mt-4">
                  <p className="text-xs text-muted-foreground mb-2">Upcoming Holidays:</p>
                  <div className="space-y-2">
                    {holidays.slice(0, 3).map((holiday) => (
                      <div
                        key={holiday.id}
                        className="text-xs p-2 rounded bg-muted/50 cursor-pointer hover:bg-muted"
                        onClick={() => setSelectedDate(parseISO(holiday.start_date))}
                      >
                        <span className="font-medium">{holiday.title}</span>
                        <span className="text-muted-foreground ml-2">
                          {format(parseISO(holiday.start_date), 'MMM d')}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <HolidayFormModal
        open={formOpen}
        onOpenChange={(open) => {
          setFormOpen(open);
          if (!open) setEditingHoliday(null);
        }}
        holiday={editingHoliday}
        onSave={handleSave}
      />

      <AlertDialog open={deleteConfirmOpen} onOpenChange={setDeleteConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Holiday</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete "{deletingHoliday?.title}"? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground">
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
