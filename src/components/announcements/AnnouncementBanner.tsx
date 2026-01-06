import { useState } from 'react';
import { Announcement } from '@/types';
import { X, Megaphone, AlertTriangle } from 'lucide-react';
import { cn } from '@/lib/utils';

interface AnnouncementBannerProps {
  announcements: Announcement[];
  userRole: 'manager' | 'staff' | 'admin';
}

export default function AnnouncementBanner({ announcements, userRole }: AnnouncementBannerProps) {
  const [dismissedIds, setDismissedIds] = useState<string[]>([]);

  const visibleAnnouncements = announcements.filter(
    a => a.isActive && 
    (userRole === 'admin' || a.targetRoles.includes(userRole as 'manager' | 'staff')) && 
    !dismissedIds.includes(a.id) &&
    (!a.expiresAt || new Date(a.expiresAt) > new Date())
  );

  if (visibleAnnouncements.length === 0) return null;

  const dismiss = (id: string) => {
    setDismissedIds([...dismissedIds, id]);
  };

  return (
    <div className="space-y-3 mb-6">
      {visibleAnnouncements.map((announcement) => (
        <div
          key={announcement.id}
          className={cn(
            "relative p-4 rounded-xl border animate-slide-up flex items-start gap-3",
            announcement.priority === 'high' 
              ? 'bg-destructive/10 border-destructive/30' 
              : announcement.priority === 'medium'
              ? 'bg-warning/10 border-warning/30'
              : 'bg-primary/10 border-primary/30'
          )}
        >
          <div className={cn(
            "w-8 h-8 rounded-lg flex items-center justify-center shrink-0",
            announcement.priority === 'high' 
              ? 'bg-destructive/20' 
              : announcement.priority === 'medium'
              ? 'bg-warning/20'
              : 'bg-primary/20'
          )}>
            {announcement.priority === 'high' ? (
              <AlertTriangle className="w-4 h-4 text-destructive" />
            ) : (
              <Megaphone className={cn(
                "w-4 h-4",
                announcement.priority === 'medium' ? 'text-warning' : 'text-primary'
              )} />
            )}
          </div>

          <div className="flex-1 min-w-0">
            <h4 className={cn(
              "font-semibold text-sm",
              announcement.priority === 'high' 
                ? 'text-destructive' 
                : announcement.priority === 'medium'
                ? 'text-warning'
                : 'text-primary'
            )}>
              {announcement.title}
            </h4>
            <p className="text-sm text-muted-foreground mt-0.5">
              {announcement.message}
            </p>
          </div>

          <button
            onClick={() => dismiss(announcement.id)}
            className="p-1 rounded hover:bg-foreground/10 transition-colors shrink-0"
          >
            <X className="w-4 h-4 text-muted-foreground" />
          </button>
        </div>
      ))}
    </div>
  );
}
