import { useEffect, useState } from 'react';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import {
  HoverCard,
  HoverCardContent,
  HoverCardTrigger,
} from '@/components/ui/hover-card';
import { Badge } from '@/components/ui/badge';
import { Phone, Mail, MapPin } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';

interface Profile {
  id: string;
  user_id: string;
  name: string;
  email?: string;
  phone?: string;
  address?: string;
  status: string;
}

interface UserRole {
  role: 'admin' | 'manager' | 'staff';
}

interface StaffProfileChipProps {
  userId: string;
  showDetails?: boolean;
}

// Cache for profiles to avoid repeated fetches
const profileCache: Record<string, { profile: Profile | null; role: string }> = {};

export default function StaffProfileChip({ userId, showDetails = true }: StaffProfileChipProps) {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [role, setRole] = useState<string>('staff');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    async function fetchProfile() {
      if (!userId) {
        setProfile(null);
        setRole('staff');
        setLoading(false);
        return;
      }

      // Check cache first
      if (profileCache[userId]) {
        setProfile(profileCache[userId].profile);
        setRole(profileCache[userId].role);
        setLoading(false);
        return;
      }

      setLoading(true);

      const isUuid = (value: string) =>
        /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);

      try {
        // Support both identifiers:
        // - auth UUID (profiles.id)
        // - human login id (profiles.user_id)
        const { data: profileData, error: profileError } = await supabase
          .from('profiles')
          .select('*')
          .eq(isUuid(userId) ? 'id' : 'user_id', userId)
          .maybeSingle();

        if (profileError && profileError.code !== 'PGRST116') {
          console.error('Error fetching profile:', profileError);
        }

        let userRole = 'staff';
        if (profileData?.id) {
          // user_roles.user_id is a UUID (auth uid)
          const { data: roleData, error: roleError } = await supabase
            .from('user_roles')
            .select('role')
            .eq('user_id', profileData.id)
            .maybeSingle();

          if (roleError && roleError.code !== 'PGRST116') {
            console.error('Error fetching role:', roleError);
          }

          userRole = roleData?.role || 'staff';
        }

        if (cancelled) return;

        // Cache the result under all useful keys to reduce fetches
        const keys = new Set<string>([userId]);
        if (profileData?.id) keys.add(profileData.id);
        if (profileData?.user_id) keys.add(profileData.user_id);

        for (const key of keys) {
          profileCache[key] = {
            profile: profileData ?? null,
            role: userRole,
          };
        }

        setProfile(profileData ?? null);
        setRole(userRole);
      } catch (error) {
        console.error('Error fetching profile:', error);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    fetchProfile();
    return () => {
      cancelled = true;
    };
  }, [userId]);

  const getRoleColor = (role: string) => {
    switch (role) {
      case 'admin':
        return 'bg-primary text-primary-foreground';
      case 'manager':
        return 'bg-secondary text-secondary-foreground';
      case 'staff':
        return 'bg-accent text-accent-foreground';
      default:
        return 'bg-muted text-muted-foreground';
    }
  };

  if (loading) {
    return <span className="text-muted-foreground text-sm">Loading...</span>;
  }

  if (!profile) {
    return <span className="text-muted-foreground text-sm">Unknown</span>;
  }

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map((n) => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  const chipContent = (
    <div className="flex items-center gap-2">
      <Avatar className="h-7 w-7">
        <AvatarFallback className={`text-xs ${getRoleColor(role)}`}>
          {getInitials(profile.name)}
        </AvatarFallback>
      </Avatar>
      <div className="flex flex-col">
        <span className="text-sm font-medium leading-none">{profile.name}</span>
        <span className="text-xs text-muted-foreground capitalize">{role}</span>
      </div>
    </div>
  );

  if (!showDetails) {
    return chipContent;
  }

  return (
    <HoverCard>
      <HoverCardTrigger asChild>
        <button className="flex items-center gap-2 hover:opacity-80 transition-opacity cursor-pointer">
          {chipContent}
        </button>
      </HoverCardTrigger>
      <HoverCardContent className="w-72" align="start">
        <div className="space-y-3">
          <div className="flex items-center gap-3">
            <Avatar className="h-12 w-12">
              <AvatarFallback className={`text-lg ${getRoleColor(role)}`}>
                {getInitials(profile.name)}
              </AvatarFallback>
            </Avatar>
            <div>
              <h4 className="font-semibold">{profile.name}</h4>
              <Badge variant="outline" className="capitalize mt-1">
                {role}
              </Badge>
            </div>
          </div>
          
          <div className="space-y-2 text-sm">
            {profile.phone && (
              <div className="flex items-center gap-2 text-muted-foreground">
                <Phone className="w-3.5 h-3.5" />
                <span>{profile.phone}</span>
              </div>
            )}
            {profile.email && (
              <div className="flex items-center gap-2 text-muted-foreground">
                <Mail className="w-3.5 h-3.5" />
                <span>{profile.email}</span>
              </div>
            )}
            {profile.address && (
              <div className="flex items-center gap-2 text-muted-foreground">
                <MapPin className="w-3.5 h-3.5" />
                <span>{profile.address}</span>
              </div>
            )}
          </div>

          <div className="pt-2 border-t">
            <p className="text-xs text-muted-foreground">
              Status: <span className={profile.status === 'active' ? 'text-success' : 'text-destructive'}>{profile.status}</span>
            </p>
          </div>
        </div>
      </HoverCardContent>
    </HoverCard>
  );
}
