import { useState, useMemo, useEffect } from 'react';
import TopBar from '@/components/layout/TopBar';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { formatDistanceToNow, format, isWithinInterval, startOfDay, endOfDay } from 'date-fns';
import { ClipboardList, CheckSquare, Building, CalendarOff, Users, FileText, Search, Calendar, Filter } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar as CalendarComponent } from '@/components/ui/calendar';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { cn } from '@/lib/utils';
import { Loader2 } from 'lucide-react';

interface ActivityLog {
  id: string;
  user_id: string;
  user_name: string;
  user_role: string;
  module: string;
  action: string;
  details: string;
  created_at: string;
}

interface Profile {
  id: string;
  name: string;
  user_id: string;
}

const moduleIcons: Record<string, React.ElementType> = {
  leads: ClipboardList,
  tasks: CheckSquare,
  projects: Building,
  leaves: CalendarOff,
  users: Users,
  reports: FileText,
};

const actionColors: Record<string, string> = {
  created: 'text-success',
  updated: 'text-info',
  converted: 'text-accent',
  approved: 'text-success',
  rejected: 'text-destructive',
  deleted: 'text-destructive',
};

export default function AdminActivity() {
  const { user } = useAuth();
  const [activities, setActivities] = useState<ActivityLog[]>([]);
  const [staffAndManagers, setStaffAndManagers] = useState<Profile[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedUser, setSelectedUser] = useState<string>('all');
  const [selectedModule, setSelectedModule] = useState<string>('all');
  const [selectedAction, setSelectedAction] = useState<string>('all');
  const [dateRange, setDateRange] = useState<{ from?: Date; to?: Date }>({});

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        // Fetch activities
        const { data: activityData, error: activityError } = await supabase
          .from('activity_logs')
          .select('*')
          .order('created_at', { ascending: false });

        if (activityError) {
          console.error('Error fetching activities:', activityError);
        } else {
          setActivities(activityData || []);
        }

        // Fetch profiles for staff/manager filter
        const { data: profilesData, error: profilesError } = await supabase
          .from('profiles')
          .select('id, name, user_id');

        if (profilesError) {
          console.error('Error fetching profiles:', profilesError);
        } else if (profilesData) {
          // Get roles for each profile
          const profilesWithRoles: Profile[] = [];
          for (const profile of profilesData) {
            const { data: roleData } = await supabase.rpc('get_user_role', {
              _user_id: profile.id,
            });
            if (roleData === 'staff' || roleData === 'manager') {
              profilesWithRoles.push(profile);
            }
          }
          setStaffAndManagers(profilesWithRoles);
        }
      } catch (error) {
        console.error('Error:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  // Get unique actions from activities
  const uniqueActions = useMemo(() => {
    const actions = [...new Set(activities.map(a => a.action))];
    return actions;
  }, [activities]);

  // Filter activities
  const filteredActivities = useMemo(() => {
    return activities.filter(activity => {
      // Search filter
      const matchesSearch = 
        activity.user_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        activity.details.toLowerCase().includes(searchQuery.toLowerCase());
      
      // User filter
      const matchesUser = selectedUser === 'all' || activity.user_id === selectedUser;
      
      // Module filter
      const matchesModule = selectedModule === 'all' || activity.module === selectedModule;
      
      // Action filter
      const matchesAction = selectedAction === 'all' || activity.action === selectedAction;
      
      // Date filter
      let matchesDate = true;
      if (dateRange.from && dateRange.to) {
        matchesDate = isWithinInterval(new Date(activity.created_at), {
          start: startOfDay(dateRange.from),
          end: endOfDay(dateRange.to),
        });
      } else if (dateRange.from) {
        matchesDate = new Date(activity.created_at) >= startOfDay(dateRange.from);
      }
      
      return matchesSearch && matchesUser && matchesModule && matchesAction && matchesDate;
    });
  }, [activities, searchQuery, selectedUser, selectedModule, selectedAction, dateRange]);

  // Group activities by module
  const leadActivities = filteredActivities.filter(a => a.module === 'leads');
  const taskActivities = filteredActivities.filter(a => a.module === 'tasks');
  const leaveActivities = filteredActivities.filter(a => a.module === 'leaves');
  const otherActivities = filteredActivities.filter(a => !['leads', 'tasks', 'leaves'].includes(a.module));

  const clearFilters = () => {
    setSearchQuery('');
    setSelectedUser('all');
    setSelectedModule('all');
    setSelectedAction('all');
    setDateRange({});
  };

  const renderActivityItem = (activity: ActivityLog, index: number) => {
    const Icon = moduleIcons[activity.module] || FileText;
    
    return (
      <div 
        key={activity.id} 
        className="flex gap-4 p-4 rounded-xl hover:bg-muted/50 transition-colors animate-slide-up border border-border/50"
        style={{ animationDelay: `${index * 50}ms` }}
      >
        <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
          <Icon className="w-5 h-5 text-primary" />
        </div>
        
        <div className="flex-1 min-w-0">
          <p className="text-sm text-foreground">
            <span className="font-medium">{activity.user_name}</span>
            {' '}
            <span className={actionColors[activity.action] || 'text-muted-foreground'}>
              {activity.action}
            </span>
            {' '}
            {activity.details}
          </p>
          <div className="flex items-center gap-4 mt-2">
            <p className="text-xs text-muted-foreground">
              {formatDistanceToNow(new Date(activity.created_at), { addSuffix: true })}
            </p>
            <p className="text-xs text-muted-foreground">
              {format(new Date(activity.created_at), 'MMM dd, yyyy HH:mm')}
            </p>
            <span className="text-xs px-2 py-0.5 rounded-full bg-muted capitalize">
              {activity.module}
            </span>
          </div>
        </div>
      </div>
    );
  };

  const renderActivityList = (activityList: ActivityLog[]) => {
    if (activityList.length === 0) {
      return (
        <div className="text-center py-12">
          <p className="text-muted-foreground">No activities found</p>
        </div>
      );
    }
    
    return (
      <div className="space-y-3">
        {activityList.map((activity, index) => renderActivityItem(activity, index))}
      </div>
    );
  };

  if (loading) {
    return (
      <div className="min-h-screen">
        <TopBar title="Activity Log" subtitle="Track all system activities by staff and managers" />
        <div className="flex items-center justify-center py-12">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen">
      <TopBar title="Activity Log" subtitle="Track all system activities by staff and managers" />
      <div className="p-4 md:p-6 space-y-6">
        {/* Filters */}
        <div className="glass-card rounded-2xl p-4 md:p-6">
          <div className="flex flex-col gap-4">
            <div className="flex flex-wrap gap-4 items-end">
              {/* Search */}
              <div className="flex-1 min-w-[200px]">
                <label className="text-sm font-medium text-muted-foreground mb-2 block">Search</label>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input
                    placeholder="Search by name or details..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-10"
                  />
                </div>
              </div>

              {/* User Filter */}
              <div className="min-w-[180px]">
                <label className="text-sm font-medium text-muted-foreground mb-2 block">Staff/Manager</label>
                <Select value={selectedUser} onValueChange={setSelectedUser}>
                  <SelectTrigger>
                    <SelectValue placeholder="All Users" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Users</SelectItem>
                    {staffAndManagers.map(profile => (
                      <SelectItem key={profile.id} value={profile.id}>
                        {profile.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Module Filter */}
              <div className="min-w-[150px]">
                <label className="text-sm font-medium text-muted-foreground mb-2 block">Module</label>
                <Select value={selectedModule} onValueChange={setSelectedModule}>
                  <SelectTrigger>
                    <SelectValue placeholder="All Modules" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Modules</SelectItem>
                    <SelectItem value="leads">Leads</SelectItem>
                    <SelectItem value="tasks">Tasks</SelectItem>
                    <SelectItem value="leaves">Leaves</SelectItem>
                    <SelectItem value="projects">Projects</SelectItem>
                    <SelectItem value="users">Users</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Action Filter */}
              <div className="min-w-[150px]">
                <label className="text-sm font-medium text-muted-foreground mb-2 block">Action</label>
                <Select value={selectedAction} onValueChange={setSelectedAction}>
                  <SelectTrigger>
                    <SelectValue placeholder="All Actions" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Actions</SelectItem>
                    {uniqueActions.map(action => (
                      <SelectItem key={action} value={action} className="capitalize">
                        {action}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Date Range Filter */}
              <div className="min-w-[200px]">
                <label className="text-sm font-medium text-muted-foreground mb-2 block">Date Range</label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button variant="outline" className="w-full justify-start text-left font-normal">
                      <Calendar className="mr-2 h-4 w-4" />
                      {dateRange.from ? (
                        dateRange.to ? (
                          <>
                            {format(dateRange.from, "MMM dd")} - {format(dateRange.to, "MMM dd, yyyy")}
                          </>
                        ) : (
                          format(dateRange.from, "MMM dd, yyyy")
                        )
                      ) : (
                        "Select dates"
                      )}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <CalendarComponent
                      initialFocus
                      mode="range"
                      selected={{ from: dateRange.from, to: dateRange.to }}
                      onSelect={(range) => setDateRange({ from: range?.from, to: range?.to })}
                      numberOfMonths={2}
                      className="pointer-events-auto"
                    />
                  </PopoverContent>
                </Popover>
              </div>

              {/* Clear Filters */}
              <Button variant="outline" onClick={clearFilters} className="shrink-0">
                <Filter className="w-4 h-4 mr-2" />
                Clear
              </Button>
            </div>

            {/* Filter Summary */}
            <div className="text-sm text-muted-foreground">
              Showing {filteredActivities.length} of {activities.length} activities
            </div>
          </div>
        </div>

        {/* Activity Tabs */}
        <Tabs defaultValue="all" className="w-full">
          <TabsList className="grid w-full grid-cols-2 sm:grid-cols-5 mb-6">
            <TabsTrigger value="all">All ({filteredActivities.length})</TabsTrigger>
            <TabsTrigger value="leads">Leads ({leadActivities.length})</TabsTrigger>
            <TabsTrigger value="tasks">Tasks ({taskActivities.length})</TabsTrigger>
            <TabsTrigger value="leaves">Leaves ({leaveActivities.length})</TabsTrigger>
            <TabsTrigger value="other">Other ({otherActivities.length})</TabsTrigger>
          </TabsList>

          <TabsContent value="all" className="glass-card rounded-2xl p-6">
            <h3 className="text-lg font-semibold text-foreground mb-4">All Activities</h3>
            {renderActivityList(filteredActivities)}
          </TabsContent>

          <TabsContent value="leads" className="glass-card rounded-2xl p-6">
            <h3 className="text-lg font-semibold text-foreground mb-4">Lead Activities</h3>
            {renderActivityList(leadActivities)}
          </TabsContent>

          <TabsContent value="tasks" className="glass-card rounded-2xl p-6">
            <h3 className="text-lg font-semibold text-foreground mb-4">Task Activities</h3>
            {renderActivityList(taskActivities)}
          </TabsContent>

          <TabsContent value="leaves" className="glass-card rounded-2xl p-6">
            <h3 className="text-lg font-semibold text-foreground mb-4">Leave Activities</h3>
            {renderActivityList(leaveActivities)}
          </TabsContent>

          <TabsContent value="other" className="glass-card rounded-2xl p-6">
            <h3 className="text-lg font-semibold text-foreground mb-4">Other Activities</h3>
            {renderActivityList(otherActivities)}
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
