import { useState, useEffect, useRef } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import { Card, CardContent } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Plus, Edit, Trash2, CalendarDays, ImageIcon, Upload, X, ZoomIn, ZoomOut, RotateCcw } from 'lucide-react';
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
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [holidays, setHolidays] = useState<Holiday[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(new Date());
  const [formOpen, setFormOpen] = useState(false);
  const [editingHoliday, setEditingHoliday] = useState<Holiday | null>(null);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [deletingHoliday, setDeletingHoliday] = useState<Holiday | null>(null);
  const [overviewImageUrl, setOverviewImageUrl] = useState<string | null>(null);
  const [uploadingOverview, setUploadingOverview] = useState(false);
  const [showOverviewImage, setShowOverviewImage] = useState(false);
  const [zoomLevel, setZoomLevel] = useState(1);

  const handleZoomIn = () => setZoomLevel(prev => Math.min(prev + 0.25, 3));
  const handleZoomOut = () => setZoomLevel(prev => Math.max(prev - 0.25, 0.5));
  const handleResetZoom = () => setZoomLevel(1);

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

  const fetchOverviewImage = async () => {
    const { data } = await supabase
      .from('holiday_settings')
      .select('overview_image_url')
      .eq('id', '00000000-0000-0000-0000-000000000001')
      .single();
    
    if (data?.overview_image_url) {
      setOverviewImageUrl(data.overview_image_url);
    }
  };

  const handleOverviewImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 5 * 1024 * 1024) {
      toast.error('Image must be less than 5MB');
      return;
    }

    setUploadingOverview(true);
    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `overview-${Date.now()}.${fileExt}`;

      const { error: uploadError } = await supabase.storage
        .from('holiday-images')
        .upload(fileName, file, { upsert: true });

      if (uploadError) throw uploadError;

      const { data: urlData } = supabase.storage
        .from('holiday-images')
        .getPublicUrl(fileName);

      const publicUrl = urlData.publicUrl;

      const { error: updateError } = await supabase
        .from('holiday_settings')
        .update({ 
          overview_image_url: publicUrl,
          updated_at: new Date().toISOString(),
          updated_by: user?.name || 'Admin'
        })
        .eq('id', '00000000-0000-0000-0000-000000000001');

      if (updateError) throw updateError;

      setOverviewImageUrl(publicUrl);
      toast.success('Holidays overview image uploaded');
    } catch (error) {
      toast.error('Failed to upload image');
    } finally {
      setUploadingOverview(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleRemoveOverviewImage = async () => {
    try {
      const { error } = await supabase
        .from('holiday_settings')
        .update({ 
          overview_image_url: null,
          updated_at: new Date().toISOString(),
          updated_by: user?.name || 'Admin'
        })
        .eq('id', '00000000-0000-0000-0000-000000000001');

      if (error) throw error;

      setOverviewImageUrl(null);
      toast.success('Overview image removed');
    } catch (error) {
      toast.error('Failed to remove image');
    }
  };

  useEffect(() => {
    if (open) {
      fetchHolidays();
      fetchOverviewImage();
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
        <DialogContent className="max-w-4xl max-h-[90vh] flex flex-col overflow-hidden">
          <DialogHeader className="pr-8 shrink-0">
            <DialogTitle className="flex items-center gap-2">
              <CalendarDays className="h-5 w-5 text-primary" />
              Holiday Calendar
            </DialogTitle>
          </DialogHeader>

          <ScrollArea className="flex-1 -mx-6 px-6">
            <div className="space-y-4 pb-4">
              {/* View All Holidays Button - shown for all when image exists */}
              {overviewImageUrl && (
                <div className="flex justify-end">
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={() => setShowOverviewImage(true)}
                    className="flex items-center gap-2"
                  >
                    <ImageIcon className="h-4 w-4" />
                    View All Holidays
                  </Button>
                </div>
              )}

              {/* Admin Overview Image Upload Section */}
              {isAdmin && (
                <div className="border rounded-lg p-4 bg-muted/30">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div className="min-w-0">
                      <h4 className="font-medium text-sm">Holidays Overview Image</h4>
                      <p className="text-xs text-muted-foreground">Upload a single image showing all holidays (visible to managers & staff)</p>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      {overviewImageUrl && (
                        <Button 
                          variant="ghost" 
                          size="sm" 
                          onClick={handleRemoveOverviewImage}
                          className="text-destructive hover:text-destructive"
                        >
                          <X className="h-4 w-4 mr-1" />
                          Remove
                        </Button>
                      )}
                      <Button 
                        variant="outline" 
                        size="sm" 
                        onClick={() => fileInputRef.current?.click()}
                        disabled={uploadingOverview}
                      >
                        <Upload className="h-4 w-4 mr-2" />
                        {uploadingOverview ? 'Uploading...' : overviewImageUrl ? 'Replace' : 'Upload'}
                      </Button>
                      <input
                        ref={fileInputRef}
                        type="file"
                        accept="image/*"
                        onChange={handleOverviewImageUpload}
                        className="hidden"
                      />
                    </div>
                  </div>
                  {overviewImageUrl && (
                    <div className="mt-3">
                      <img 
                        src={overviewImageUrl} 
                        alt="Holidays Overview" 
                        className="max-h-32 rounded-md object-contain border"
                      />
                    </div>
                  )}
                </div>
              )}

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

      {/* Full-screen Overview Image Dialog */}
      <Dialog
        open={showOverviewImage}
        onOpenChange={(open) => {
          setShowOverviewImage(open);
          if (!open) setZoomLevel(1);
        }}
      >
        <DialogContent className="max-w-6xl h-[95vh] p-0 overflow-hidden">
          <div className="flex h-full flex-col min-h-0">
            <div className="border-b p-4 pr-12 flex items-center justify-between gap-3 flex-wrap">
              <div className="flex items-center gap-2 font-semibold">
                <CalendarDays className="h-5 w-5 text-primary" />
                <span>All Holidays</span>
              </div>

              <div className="flex items-center gap-1">
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

            {overviewImageUrl && (
              <div className="flex-1 min-h-0 overflow-auto bg-muted/20 p-4">
                <div className="min-w-full flex justify-center">
                  <img
                    src={overviewImageUrl}
                    alt="All Holidays"
                    className="max-w-none h-auto rounded-lg border bg-background transition-[width] duration-200"
                    style={{ width: `${zoomLevel * 100}%` }}
                    loading="lazy"
                  />
                </div>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
