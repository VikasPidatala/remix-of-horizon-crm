import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import { Card, CardContent } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Plus, Edit, Trash2, CalendarDays, ImageIcon } from 'lucide-react';
import { format, isSameDay, parseISO } from 'date-fns';
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
  date: string;
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
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(new Date());
  const [formOpen, setFormOpen] = useState(false);
  const [editingHoliday, setEditingHoliday] = useState<Holiday | null>(null);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [deletingHoliday, setDeletingHoliday] = useState<Holiday | null>(null);

  const fetchHolidays = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('holidays')
      .select('*')
      .order('date', { ascending: true });

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

  const handleSave = async (data: { title: string; date: string; message?: string; image_url?: string }) => {
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

  const holidayDates = holidays.map((h) => parseISO(h.date));
  const selectedDateHolidays = holidays.filter((h) => selectedDate && isSameDay(parseISO(h.date), selectedDate));

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-hidden">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <CalendarDays className="h-5 w-5 text-primary" />
              Holiday Calendar
            </DialogTitle>
          </DialogHeader>

          <div className="grid md:grid-cols-2 gap-6">
            {/* Calendar Section */}
            <div className="flex flex-col items-center">
              <Calendar
                mode="single"
                selected={selectedDate}
                onSelect={setSelectedDate}
                modifiers={{ holiday: holidayDates }}
                modifiersStyles={{
                  holiday: {
                    backgroundColor: 'hsl(var(--primary) / 0.2)',
                    color: 'hsl(var(--primary))',
                    fontWeight: 'bold',
                  },
                }}
                className="rounded-md border"
              />
              {isAdmin && (
                <Button onClick={() => setFormOpen(true)} className="mt-4 w-full max-w-xs">
                  <Plus className="h-4 w-4 mr-2" />
                  Add Holiday
                </Button>
              )}
            </div>

            {/* Holiday Details Section */}
            <div className="flex flex-col">
              <h3 className="font-semibold mb-3">
                {selectedDate ? format(selectedDate, 'MMMM d, yyyy') : 'Select a date'}
              </h3>
              <ScrollArea className="flex-1 max-h-[400px]">
                {loading ? (
                  <p className="text-muted-foreground text-sm">Loading...</p>
                ) : selectedDateHolidays.length === 0 ? (
                  <p className="text-muted-foreground text-sm">No holidays on this date</p>
                ) : (
                  <div className="space-y-3">
                    {selectedDateHolidays.map((holiday) => (
                      <Card key={holiday.id} className="overflow-hidden">
                        {holiday.image_url && (
                          <div className="relative h-32 bg-muted">
                            <img
                              src={holiday.image_url}
                              alt={holiday.title}
                              className="w-full h-full object-cover"
                              onError={(e) => {
                                (e.target as HTMLImageElement).style.display = 'none';
                              }}
                            />
                          </div>
                        )}
                        <CardContent className="p-4">
                          <div className="flex items-start justify-between gap-2">
                            <div className="flex-1">
                              <h4 className="font-semibold text-lg">{holiday.title}</h4>
                              {holiday.message && (
                                <p className="text-sm text-muted-foreground mt-1">{holiday.message}</p>
                              )}
                            </div>
                            {isAdmin && (
                              <div className="flex gap-1 shrink-0">
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  onClick={() => {
                                    setEditingHoliday(holiday);
                                    setFormOpen(true);
                                  }}
                                >
                                  <Edit className="h-4 w-4" />
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="text-destructive hover:text-destructive"
                                  onClick={() => {
                                    setDeletingHoliday(holiday);
                                    setDeleteConfirmOpen(true);
                                  }}
                                >
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              </div>
                            )}
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                )}
              </ScrollArea>

              {/* All Holidays List */}
              <div className="mt-4 pt-4 border-t">
                <h4 className="font-medium text-sm mb-2">All Holidays</h4>
                <ScrollArea className="max-h-[150px]">
                  <div className="space-y-2">
                    {holidays.map((holiday) => (
                      <div
                        key={holiday.id}
                        className="flex items-center justify-between p-2 rounded-md bg-muted/50 text-sm cursor-pointer hover:bg-muted"
                        onClick={() => setSelectedDate(parseISO(holiday.date))}
                      >
                        <span className="font-medium">{holiday.title}</span>
                        <span className="text-muted-foreground">{format(parseISO(holiday.date), 'MMM d, yyyy')}</span>
                      </div>
                    ))}
                    {holidays.length === 0 && !loading && (
                      <p className="text-muted-foreground text-sm">No holidays added yet</p>
                    )}
                  </div>
                </ScrollArea>
              </div>
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
