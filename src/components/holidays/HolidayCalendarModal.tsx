import { useState, useEffect, useMemo } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Plus, Edit, Trash2, CalendarDays, ChevronLeft, ChevronRight, ImageIcon, Download, X, ZoomIn, ZoomOut, RotateCcw } from 'lucide-react';
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
  const [viewingImage, setViewingImage] = useState<{ url: string; title: string } | null>(null);
  const [zoomLevel, setZoomLevel] = useState(1);

  const handleZoomIn = () => setZoomLevel(prev => Math.min(prev + 0.25, 3));
  const handleZoomOut = () => setZoomLevel(prev => Math.max(prev - 0.25, 0.5));
  const handleResetZoom = () => setZoomLevel(1);

  const handleDownloadImage = async (imageUrl: string, title: string) => {
    try {
      const response = await fetch(imageUrl);
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${title.replace(/\s+/g, '-').toLowerCase()}-holiday.${blob.type.split('/')[1] || 'jpg'}`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);
      toast.success('Image downloaded');
    } catch {
      toast.error('Failed to download image');
    }
  };

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

              <ScrollArea className="max-h-[300px] lg:max-h-[400px]">
                <div className="space-y-3 pr-2">
                  {selectedDateHolidays.map((holiday) => (
                    <div
                      key={holiday.id}
                      className="p-3 rounded-lg border bg-card"
                    >
                      {/* Holiday Image Thumbnail */}
                      {holiday.image_url && (
                        <div 
                          className="relative w-full h-24 sm:h-32 mb-3 rounded-md overflow-hidden bg-muted cursor-pointer group"
                          onClick={() => setViewingImage({ url: holiday.image_url!, title: holiday.title })}
                        >
                          <img
                            src={holiday.image_url}
                            alt={holiday.title}
                            className="w-full h-full object-cover transition-transform group-hover:scale-105"
                            onError={(e) => {
                              (e.target as HTMLImageElement).style.display = 'none';
                            }}
                          />
                          <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors flex items-center justify-center">
                            <ImageIcon className="h-6 w-6 text-white opacity-0 group-hover:opacity-100 transition-opacity" />
                          </div>
                        </div>
                      )}
                      
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

                      {/* View/Download buttons for mobile */}
                      {holiday.image_url && (
                        <div className="flex items-center gap-2 mt-3">
                          <Button
                            variant="outline"
                            size="sm"
                            className="flex-1 text-xs h-8"
                            onClick={() => setViewingImage({ url: holiday.image_url!, title: holiday.title })}
                          >
                            <ImageIcon className="h-3.5 w-3.5 mr-1.5" />
                            View
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            className="flex-1 text-xs h-8"
                            onClick={() => handleDownloadImage(holiday.image_url!, holiday.title)}
                          >
                            <Download className="h-3.5 w-3.5 mr-1.5" />
                            Download
                          </Button>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </ScrollArea>

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

      {/* Full-screen Image Viewer */}
      <Dialog
        open={!!viewingImage}
        onOpenChange={(open) => {
          if (!open) {
            setViewingImage(null);
            setZoomLevel(1);
          }
        }}
      >
        <DialogContent className="max-w-[95vw] sm:max-w-4xl h-[90vh] sm:h-[85vh] p-0 overflow-hidden [&>button]:hidden">
          <div className="flex h-full flex-col min-h-0">
            {/* Header with controls */}
            <div className="flex items-center justify-between p-3 sm:p-4 border-b bg-background shrink-0 gap-2">
              <h3 className="font-semibold text-sm sm:text-base truncate flex-1 min-w-0">
                {viewingImage?.title}
              </h3>
              <div className="flex items-center gap-1 sm:gap-2 shrink-0">
                <Button
                  variant="outline"
                  size="icon"
                  className="h-8 w-8"
                  onClick={handleZoomOut}
                  disabled={zoomLevel <= 0.5}
                >
                  <ZoomOut className="h-4 w-4" />
                </Button>
                <span className="text-xs sm:text-sm font-medium w-10 sm:w-12 text-center">
                  {Math.round(zoomLevel * 100)}%
                </span>
                <Button
                  variant="outline"
                  size="icon"
                  className="h-8 w-8"
                  onClick={handleZoomIn}
                  disabled={zoomLevel >= 3}
                >
                  <ZoomIn className="h-4 w-4" />
                </Button>
                <Button
                  variant="outline"
                  size="icon"
                  className="h-8 w-8"
                  onClick={handleResetZoom}
                >
                  <RotateCcw className="h-4 w-4" />
                </Button>
                <Button
                  variant="outline"
                  size="icon"
                  className="h-8 w-8"
                  onClick={() => viewingImage && handleDownloadImage(viewingImage.url, viewingImage.title)}
                >
                  <Download className="h-4 w-4" />
                </Button>
                <Button
                  variant="outline"
                  size="icon"
                  className="h-8 w-8"
                  onClick={() => {
                    setViewingImage(null);
                    setZoomLevel(1);
                  }}
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            </div>

            {/* Image container */}
            <div className="flex-1 overflow-auto bg-muted/30 flex items-center justify-center p-2 sm:p-4">
              {viewingImage && (
                <img
                  src={viewingImage.url}
                  alt={viewingImage.title}
                  className="max-w-full max-h-full object-contain transition-transform duration-200"
                  style={{ transform: `scale(${zoomLevel})` }}
                />
              )}
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
