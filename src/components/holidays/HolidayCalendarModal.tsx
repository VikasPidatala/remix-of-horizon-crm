import { useState, useEffect, useMemo } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Plus, Edit, Trash2, CalendarDays, Download, ImageIcon, ZoomIn, ZoomOut, RotateCcw, Sparkles, Search, ArrowUpDown } from 'lucide-react';
import { format, parseISO, isBefore, startOfDay, isWithinInterval } from 'date-fns';
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
  const [viewingImage, setViewingImage] = useState<string | null>(null);
  const [zoomLevel, setZoomLevel] = useState(1);
  const [filter, setFilter] = useState<'all' | 'upcoming' | 'past'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState<'date-asc' | 'date-desc' | 'title-asc' | 'title-desc'>('date-asc');

  const handleZoomIn = () => setZoomLevel(prev => Math.min(prev + 0.25, 3));
  const handleZoomOut = () => setZoomLevel(prev => Math.max(prev - 0.25, 0.5));
  const handleResetZoom = () => setZoomLevel(1);

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

  const formatDateRange = (startDate: string, endDate: string) => {
    const start = parseISO(startDate);
    const end = parseISO(endDate);
    if (startDate === endDate) {
      return format(start, 'MMM dd, yyyy');
    }
    return `${format(start, 'MMM dd')} - ${format(end, 'MMM dd, yyyy')}`;
  };

  const today = startOfDay(new Date());

  const isHolidayToday = (holiday: Holiday) => {
    const start = startOfDay(parseISO(holiday.start_date));
    const end = startOfDay(parseISO(holiday.end_date));
    return isWithinInterval(today, { start, end });
  };

  const upcomingHolidays = holidays.filter((h) => !isBefore(parseISO(h.end_date), today));
  const pastHolidays = holidays.filter((h) => isBefore(parseISO(h.end_date), today));

  const filteredAndSortedHolidays = useMemo(() => {
    // Filter by tab
    let result = holidays.filter((holiday) => {
      const endDate = parseISO(holiday.end_date);
      if (filter === 'upcoming') return !isBefore(endDate, today);
      if (filter === 'past') return isBefore(endDate, today);
      return true;
    });

    // Filter by search query
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      result = result.filter(
        (h) =>
          h.title.toLowerCase().includes(query) ||
          (h.message && h.message.toLowerCase().includes(query))
      );
    }

    // Sort
    result.sort((a, b) => {
      switch (sortBy) {
        case 'date-asc':
          return parseISO(a.start_date).getTime() - parseISO(b.start_date).getTime();
        case 'date-desc':
          return parseISO(b.start_date).getTime() - parseISO(a.start_date).getTime();
        case 'title-asc':
          return a.title.localeCompare(b.title);
        case 'title-desc':
          return b.title.localeCompare(a.title);
        default:
          return 0;
      }
    });

    return result;
  }, [holidays, filter, searchQuery, sortBy, today]);

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-2xl max-h-[90vh] flex flex-col overflow-hidden">
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

          {/* Filter Tabs */}
          <Tabs value={filter} onValueChange={(v) => setFilter(v as 'all' | 'upcoming' | 'past')} className="shrink-0">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="all" className="gap-2">
                All
                <Badge variant="secondary" className="h-5 min-w-5 px-1.5 text-xs">
                  {holidays.length}
                </Badge>
              </TabsTrigger>
              <TabsTrigger value="upcoming" className="gap-2">
                Upcoming
                <Badge variant="secondary" className="h-5 min-w-5 px-1.5 text-xs">
                  {upcomingHolidays.length}
                </Badge>
              </TabsTrigger>
              <TabsTrigger value="past" className="gap-2">
                Past
                <Badge variant="secondary" className="h-5 min-w-5 px-1.5 text-xs">
                  {pastHolidays.length}
                </Badge>
              </TabsTrigger>
            </TabsList>
          </Tabs>

          {/* Search and Sort */}
          <div className="flex items-center gap-2 shrink-0">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search holidays..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9"
              />
            </div>
            <Select value={sortBy} onValueChange={(v) => setSortBy(v as typeof sortBy)}>
              <SelectTrigger className="w-[160px]">
                <ArrowUpDown className="h-4 w-4 mr-2" />
                <SelectValue placeholder="Sort by" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="date-asc">Date (Oldest)</SelectItem>
                <SelectItem value="date-desc">Date (Newest)</SelectItem>
                <SelectItem value="title-asc">Title (A-Z)</SelectItem>
                <SelectItem value="title-desc">Title (Z-A)</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <ScrollArea className="flex-1 -mx-6 px-6">
            <div className="space-y-4 pb-4">
              {loading ? (
                <div className="text-center py-8 text-muted-foreground">Loading...</div>
              ) : filteredAndSortedHolidays.length === 0 ? (
                <div className="text-center py-12">
                  <CalendarDays className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                  <p className="text-muted-foreground">
                    {holidays.length === 0 
                      ? 'No holidays added yet' 
                      : searchQuery 
                        ? 'No holidays match your search' 
                        : `No ${filter} holidays`}
                  </p>
                </div>
              ) : (
                filteredAndSortedHolidays.map((holiday, index) => {
                  const isTodayHoliday = isHolidayToday(holiday);
                  return (
                  <Card 
                    key={holiday.id} 
                    className={`overflow-hidden animate-slide-up ${isTodayHoliday ? 'ring-2 ring-primary ring-offset-2' : ''}`}
                    style={{ animationDelay: `${index * 50}ms` }}
                  >
                    {/* Today indicator */}
                    {isTodayHoliday && (
                      <div className="bg-primary text-primary-foreground px-3 py-1.5 flex items-center gap-2 text-sm font-medium">
                        <Sparkles className="h-4 w-4" />
                        Happening Today!
                      </div>
                    )}
                    <CardContent className="p-0">
                      <div className="flex flex-col sm:flex-row">
                        {/* Image Section */}
                        {holiday.image_url && (
                          <div className="relative sm:w-40 h-32 sm:h-auto shrink-0 bg-muted">
                            <img
                              src={holiday.image_url}
                              alt={holiday.title}
                              className="w-full h-full object-cover cursor-pointer"
                              onClick={() => setViewingImage(holiday.image_url!)}
                              onError={(e) => {
                                (e.target as HTMLImageElement).style.display = 'none';
                              }}
                            />
                            {/* Download button overlay */}
                            <Button
                              variant="secondary"
                              size="icon"
                              className="absolute bottom-2 right-2 h-8 w-8 opacity-90"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleDownloadImage(holiday.image_url!, holiday.title);
                              }}
                            >
                              <Download className="h-4 w-4" />
                            </Button>
                          </div>
                        )}

                        {/* Content Section */}
                        <div className="flex-1 p-4">
                          <div className="flex items-start justify-between gap-2">
                            <div className="flex-1 min-w-0">
                              <h3 className="font-semibold text-lg">{holiday.title}</h3>
                              <div className="flex items-center gap-2 text-sm text-primary mt-1">
                                <CalendarDays className="h-4 w-4" />
                                {formatDateRange(holiday.start_date, holiday.end_date)}
                              </div>
                              {holiday.message && (
                                <p className="text-sm text-muted-foreground mt-2">{holiday.message}</p>
                              )}
                            </div>

                            {/* Admin Actions */}
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

                          {/* View/Download for non-image cards */}
                          {holiday.image_url && (
                            <div className="flex items-center gap-2 mt-3 sm:hidden">
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => setViewingImage(holiday.image_url!)}
                              >
                                <ImageIcon className="h-4 w-4 mr-2" />
                                View Image
                              </Button>
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => handleDownloadImage(holiday.image_url!, holiday.title)}
                              >
                                <Download className="h-4 w-4 mr-2" />
                                Download
                              </Button>
                            </div>
                          )}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                  );
                })
              )}
            </div>
          </ScrollArea>
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
        <DialogContent className="max-w-6xl h-[95vh] p-0 overflow-hidden">
          <div className="flex h-full flex-col min-h-0">
            <div className="border-b p-4 pr-12 flex items-center justify-between gap-3 flex-wrap">
              <div className="flex items-center gap-2 font-semibold">
                <ImageIcon className="h-5 w-5 text-primary" />
                <span>Holiday Image</span>
              </div>

              <div className="flex items-center gap-1">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => viewingImage && handleDownloadImage(viewingImage, 'holiday')}
                >
                  <Download className="h-4 w-4 mr-2" />
                  Download
                </Button>
                <Button variant="outline" size="icon" onClick={handleZoomOut} disabled={zoomLevel <= 0.5}>
                  <ZoomOut className="h-4 w-4" />
                </Button>
                <span className="text-sm w-14 text-center">{Math.round(zoomLevel * 100)}%</span>
                <Button variant="outline" size="icon" onClick={handleZoomIn} disabled={zoomLevel >= 3}>
                  <ZoomIn className="h-4 w-4" />
                </Button>
                <Button variant="ghost" size="icon" onClick={handleResetZoom}>
                  <RotateCcw className="h-4 w-4" />
                </Button>
              </div>
            </div>

            {viewingImage && (
              <div className="flex-1 min-h-0 overflow-auto p-4">
                <img
                  src={viewingImage}
                  alt="Holiday"
                  className="mx-auto"
                  style={{ width: `${zoomLevel * 100}%` }}
                />
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
