import React, { createContext, useContext, useState, useCallback, useEffect, useRef } from 'react';
import { Announcement, Lead, Project, Task } from '@/types';
import { useNotifications } from './NotificationContext';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { logActivity } from '@/lib/activityLogger';
import { toast } from 'sonner';

interface DataContextType {
  leads: Lead[];
  tasks: Task[];
  projects: Project[];
  announcements: Announcement[];
  loading: boolean;
  addLead: (lead: Omit<Lead, 'id' | 'createdAt' | 'updatedAt'>) => Promise<void>;
  updateLead: (id: string, data: Partial<Lead>) => Promise<void>;
  deleteLead: (id: string) => Promise<void>;
  addTask: (task: Omit<Task, 'id' | 'createdAt' | 'updatedAt'>) => Promise<void>;
  updateTask: (id: string, data: Partial<Task>) => Promise<void>;
  deleteTask: (id: string) => Promise<void>;
  addProject: (project: Omit<Project, 'id' | 'createdAt'>) => Promise<void>;
  updateProject: (id: string, data: Partial<Project>) => Promise<void>;
  deleteProject: (id: string) => Promise<void>;
  addAnnouncement: (announcement: Omit<Announcement, 'id' | 'createdAt'>) => Promise<void>;
  deleteAnnouncement: (id: string) => Promise<void>;
  toggleAnnouncementActive: (id: string) => Promise<void>;
  refreshData: () => Promise<void>;
}

const DataContext = createContext<DataContextType | undefined>(undefined);

// Helper to convert DB row to Lead type
const dbToLead = (row: any, projects: Project[]): Lead => ({
  id: row.id,
  name: row.name,
  phone: row.phone,
  email: row.email,
  address: row.address || '',
  requirementType: row.requirement_type,
  bhkRequirement: row.bhk_requirement,
  budgetMin: Number(row.budget_min),
  budgetMax: Number(row.budget_max),
  description: row.description || '',
  preferredLocation: row.preferred_location,
  source: row.source,
  status: row.status,
  followUpDate: row.follow_up_date ? new Date(row.follow_up_date) : undefined,
  notes: row.notes || [],
  createdBy: row.created_by,
  assignedProject: row.assigned_project,
  createdAt: new Date(row.created_at),
  updatedAt: new Date(row.updated_at),
});

// Helper to convert DB row to Task type
const dbToTask = (row: any, leads: Lead[]): Task => {
  const lead = leads.find(l => l.id === row.lead_id);
  return {
    id: row.id,
    leadId: row.lead_id,
    lead: lead || {
      id: row.lead_id,
      name: 'Unknown',
      phone: '',
      email: '',
      address: '',
      requirementType: 'apartment',
      bhkRequirement: '2',
      budgetMin: 0,
      budgetMax: 0,
      description: '',
      status: 'pending',
      notes: [],
      createdBy: '',
      createdAt: new Date(),
      updatedAt: new Date(),
    },
    status: row.status,
    nextActionDate: row.next_action_date ? new Date(row.next_action_date) : undefined,
    notes: row.notes || [],
    attachments: row.attachments || [],
    assignedTo: row.assigned_to,
    assignedProject: row.assigned_project,
    createdAt: new Date(row.created_at),
    updatedAt: new Date(row.updated_at),
  };
};

// Helper to convert DB row to Project type
const dbToProject = (row: any): Project => ({
  id: row.id,
  name: row.name,
  location: row.location,
  type: row.type,
  priceMin: Number(row.price_min),
  priceMax: Number(row.price_max),
  launchDate: new Date(row.launch_date),
  possessionDate: new Date(row.possession_date),
  amenities: row.amenities || [],
  description: row.description || '',
  towerDetails: row.tower_details,
  nearbyLandmarks: row.nearby_landmarks || [],
  photos: row.photos || [],
  coverImage: row.cover_image || '',
  status: row.status,
  createdAt: new Date(row.created_at),
});

// Helper to convert DB row to Announcement type
const dbToAnnouncement = (row: any): Announcement => ({
  id: row.id,
  title: row.title,
  message: row.message,
  priority: row.priority,
  targetRoles: row.target_roles || ['manager', 'staff'],
  createdBy: row.created_by,
  createdAt: new Date(row.created_at),
  expiresAt: row.expires_at ? new Date(row.expires_at) : undefined,
  isActive: row.is_active,
});

export function DataProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const [leads, setLeads] = useState<Lead[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [loading, setLoading] = useState(true);
  const isRefreshing = useRef(false);
  
  const notificationContext = useNotifications();

  const fetchProjects = useCallback(async () => {
    const { data, error } = await supabase
      .from('projects')
      .select('*')
      .order('created_at', { ascending: false });
    
    if (error) {
      console.error('Error fetching projects:', error);
      return [];
    }
    
    const projectsList = (data || []).map(dbToProject);
    setProjects(projectsList);
    return projectsList;
  }, []);

  const fetchLeads = useCallback(async (projectsList: Project[]) => {
    const { data, error } = await supabase
      .from('leads')
      .select('*')
      .order('created_at', { ascending: false });
    
    if (error) {
      console.error('Error fetching leads:', error);
      return [];
    }
    
    const leadsList = (data || []).map(row => dbToLead(row, projectsList));
    setLeads(leadsList);
    return leadsList;
  }, []);

  const fetchTasks = useCallback(async (leadsList: Lead[]) => {
    const { data, error } = await supabase
      .from('tasks')
      .select('*')
      .order('created_at', { ascending: false });
    
    if (error) {
      console.error('Error fetching tasks:', error);
      return [];
    }
    
    const tasksList = (data || []).map(row => dbToTask(row, leadsList));
    setTasks(tasksList);
    return tasksList;
  }, []);

  const fetchAnnouncements = useCallback(async () => {
    const { data, error } = await supabase
      .from('announcements')
      .select('*')
      .order('created_at', { ascending: false });
    
    if (error) {
      console.error('Error fetching announcements:', error);
      return [];
    }
    
    const announcementsList = (data || []).map(dbToAnnouncement);
    setAnnouncements(announcementsList);
    return announcementsList;
  }, []);

  const refreshData = useCallback(async () => {
    // Prevent multiple simultaneous refreshes
    if (isRefreshing.current) return;
    isRefreshing.current = true;
    setLoading(true);
    try {
      const projectsList = await fetchProjects();
      const leadsList = await fetchLeads(projectsList);
      await fetchTasks(leadsList);
      await fetchAnnouncements();
    } catch (error) {
      console.error('Error refreshing data:', error);
    } finally {
      setLoading(false);
      isRefreshing.current = false;
    }
  }, [fetchProjects, fetchLeads, fetchTasks, fetchAnnouncements]);

  // Initial fetch
  useEffect(() => {
    refreshData();
  }, [refreshData]);

  // Real-time subscriptions - immediate refresh on changes
  useEffect(() => {
    const channel = supabase
      .channel('data-changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'leads' }, () => refreshData())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'tasks' }, () => refreshData())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'projects' }, () => refreshData())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'announcements' }, () => refreshData())
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [refreshData]);

  const addLead = useCallback(async (lead: Omit<Lead, 'id' | 'createdAt' | 'updatedAt'>) => {
    const { data, error } = await supabase.from('leads').insert([{
      name: lead.name,
      phone: lead.phone,
      email: lead.email,
      address: lead.address,
      requirement_type: lead.requirementType,
      bhk_requirement: lead.bhkRequirement,
      budget_min: lead.budgetMin,
      budget_max: lead.budgetMax,
      description: lead.description,
      preferred_location: lead.preferredLocation,
      source: lead.source,
      status: lead.status,
      follow_up_date: lead.followUpDate?.toISOString(),
      notes: lead.notes as any,
      created_by: lead.createdBy,
      assigned_project: lead.assignedProject,
    }]).select();

    if (error) {
      console.error('Error adding lead:', error);
      toast.error('Failed to add lead');
      throw error;
    }

    // Optimistically add the new lead to state
    if (data && data[0]) {
      const newLead = dbToLead(data[0], projects);
      setLeads(prev => [newLead, ...prev]);
    }

    if (notificationContext?.addNotification) {
      notificationContext.addNotification({
        title: 'New Lead Created',
        message: `Lead "${lead.name}" has been created`,
        type: 'lead',
        createdAt: new Date(),
      });
    }
  }, [notificationContext, projects]);

  const updateLead = useCallback(async (id: string, data: Partial<Lead>) => {
    const updateData: any = {};
    if (data.name !== undefined) updateData.name = data.name;
    if (data.phone !== undefined) updateData.phone = data.phone;
    if (data.email !== undefined) updateData.email = data.email;
    if (data.address !== undefined) updateData.address = data.address;
    if (data.requirementType !== undefined) updateData.requirement_type = data.requirementType;
    if (data.bhkRequirement !== undefined) updateData.bhk_requirement = data.bhkRequirement;
    if (data.budgetMin !== undefined) updateData.budget_min = data.budgetMin;
    if (data.budgetMax !== undefined) updateData.budget_max = data.budgetMax;
    if (data.description !== undefined) updateData.description = data.description;
    if (data.preferredLocation !== undefined) updateData.preferred_location = data.preferredLocation;
    if (data.source !== undefined) updateData.source = data.source;
    if (data.status !== undefined) updateData.status = data.status;
    if (data.followUpDate !== undefined) updateData.follow_up_date = data.followUpDate?.toISOString();
    if (data.notes !== undefined) updateData.notes = data.notes;
    if (data.assignedProject !== undefined) updateData.assigned_project = data.assignedProject;

    const { error } = await supabase.from('leads').update(updateData).eq('id', id);

    if (error) {
      console.error('Error updating lead:', error);
      toast.error('Failed to update lead');
      throw error;
    }

    if (user) {
      const existing = leads.find(l => l.id === id);
      const name = data.name ?? existing?.name ?? id;
      void logActivity({
        userId: user.id,
        userName: user.name,
        userRole: user.role,
        module: 'leads',
        action: 'updated',
        details: `updated lead "${name}"`,
      });
    }
  }, [leads, user]);

  const deleteLead = useCallback(async (id: string) => {
    const { error } = await supabase.from('leads').delete().eq('id', id);

    if (error) {
      console.error('Error deleting lead:', error);
      toast.error('Failed to delete lead');
      throw error;
    }

    if (user) {
      const existing = leads.find(l => l.id === id);
      void logActivity({
        userId: user.id,
        userName: user.name,
        userRole: user.role,
        module: 'leads',
        action: 'deleted',
        details: `deleted lead "${existing?.name ?? id}"`,
      });
    }
  }, [leads, user]);

  const addTask = useCallback(async (task: Omit<Task, 'id' | 'createdAt' | 'updatedAt'>) => {
    const { data, error } = await supabase.from('tasks').insert([{
      lead_id: task.leadId,
      status: task.status,
      next_action_date: task.nextActionDate?.toISOString(),
      notes: task.notes as any,
      attachments: task.attachments as any,
      assigned_to: task.assignedTo,
      assigned_project: task.assignedProject,
    }]).select();

    if (error) {
      console.error('Error adding task:', error);
      toast.error('Failed to add task');
      throw error;
    }

    // Optimistically add the new task to state
    if (data && data[0]) {
      const newTask = dbToTask(data[0], leads);
      setTasks(prev => [newTask, ...prev]);
    }

    if (notificationContext?.addNotification) {
      notificationContext.addNotification({
        title: 'New Task Created',
        message: `Task for "${task.lead?.name || 'lead'}" has been created`,
        type: 'task',
        createdAt: new Date(),
      });
    }
  }, [notificationContext, leads]);

  const updateTask = useCallback(async (id: string, data: Partial<Task>) => {
    const updateData: any = {};
    if (data.status !== undefined) updateData.status = data.status;
    if (data.nextActionDate !== undefined) updateData.next_action_date = data.nextActionDate?.toISOString();
    if (data.notes !== undefined) updateData.notes = data.notes;
    if (data.attachments !== undefined) updateData.attachments = data.attachments;
    if (data.assignedTo !== undefined) updateData.assigned_to = data.assignedTo;
    if (data.assignedProject !== undefined) updateData.assigned_project = data.assignedProject;

    const { error } = await supabase.from('tasks').update(updateData).eq('id', id);

    if (error) {
      console.error('Error updating task:', error);
      toast.error('Failed to update task');
      throw error;
    }

    if (user) {
      const existing = tasks.find(t => t.id === id);
      const leadName = data.lead?.name || existing?.lead?.name || 'lead';
      void logActivity({
        userId: user.id,
        userName: user.name,
        userRole: user.role,
        module: 'tasks',
        action: 'updated',
        details: `updated task for "${leadName}"`,
      });
    }
  }, [tasks, user]);

  const deleteTask = useCallback(async (id: string) => {
    const { error } = await supabase.from('tasks').delete().eq('id', id);

    if (error) {
      console.error('Error deleting task:', error);
      toast.error('Failed to delete task');
      throw error;
    }

    if (user) {
      const existing = tasks.find(t => t.id === id);
      void logActivity({
        userId: user.id,
        userName: user.name,
        userRole: user.role,
        module: 'tasks',
        action: 'deleted',
        details: `deleted task for "${existing?.lead?.name ?? 'lead'}"`,
      });
    }
  }, [tasks, user]);

  const addProject = useCallback(async (project: Omit<Project, 'id' | 'createdAt'>) => {
    const { data, error } = await supabase.from('projects').insert([{
      name: project.name,
      location: project.location,
      type: project.type,
      price_min: project.priceMin,
      price_max: project.priceMax,
      launch_date: project.launchDate.toISOString().split('T')[0],
      possession_date: project.possessionDate.toISOString().split('T')[0],
      amenities: project.amenities as any,
      description: project.description,
      tower_details: project.towerDetails,
      nearby_landmarks: project.nearbyLandmarks as any,
      photos: project.photos as any,
      cover_image: project.coverImage,
      status: project.status,
      created_by: (project as any).createdBy || 'system',
    }]).select();

    if (error) {
      console.error('Error adding project:', error);
      toast.error('Failed to add project');
      throw error;
    }

    // Optimistically add the new project to state
    if (data && data[0]) {
      const newProject = dbToProject(data[0]);
      setProjects(prev => [newProject, ...prev]);
    }
  }, []);

  const updateProject = useCallback(async (id: string, data: Partial<Project>) => {
    const updateData: any = {};
    if (data.name !== undefined) updateData.name = data.name;
    if (data.location !== undefined) updateData.location = data.location;
    if (data.type !== undefined) updateData.type = data.type;
    if (data.priceMin !== undefined) updateData.price_min = data.priceMin;
    if (data.priceMax !== undefined) updateData.price_max = data.priceMax;
    if (data.launchDate !== undefined) updateData.launch_date = data.launchDate.toISOString().split('T')[0];
    if (data.possessionDate !== undefined) updateData.possession_date = data.possessionDate.toISOString().split('T')[0];
    if (data.amenities !== undefined) updateData.amenities = data.amenities;
    if (data.description !== undefined) updateData.description = data.description;
    if (data.towerDetails !== undefined) updateData.tower_details = data.towerDetails;
    if (data.nearbyLandmarks !== undefined) updateData.nearby_landmarks = data.nearbyLandmarks;
    if (data.photos !== undefined) updateData.photos = data.photos;
    if (data.coverImage !== undefined) updateData.cover_image = data.coverImage;
    if (data.status !== undefined) updateData.status = data.status;

    const { error } = await supabase.from('projects').update(updateData).eq('id', id);

    if (error) {
      console.error('Error updating project:', error);
      toast.error('Failed to update project');
      throw error;
    }
  }, []);

  const deleteProject = useCallback(async (id: string) => {
    const { error } = await supabase.from('projects').delete().eq('id', id);

    if (error) {
      console.error('Error deleting project:', error);
      toast.error('Failed to delete project');
      throw error;
    }
  }, []);

  const addAnnouncement = useCallback(async (announcement: Omit<Announcement, 'id' | 'createdAt'>) => {
    const { data, error } = await supabase.from('announcements').insert([{
      title: announcement.title,
      message: announcement.message,
      priority: announcement.priority,
      target_roles: announcement.targetRoles as any,
      created_by: announcement.createdBy,
      expires_at: announcement.expiresAt?.toISOString(),
      is_active: announcement.isActive,
    }]).select();

    if (error) {
      console.error('Error adding announcement:', error);
      toast.error('Failed to add announcement');
      throw error;
    }

    // Optimistically add the new announcement to state
    if (data && data[0]) {
      const newAnnouncement = dbToAnnouncement(data[0]);
      setAnnouncements(prev => [newAnnouncement, ...prev]);
    }

    if (notificationContext?.addNotification) {
      notificationContext.addNotification({
        title: 'New Announcement',
        message: announcement.title,
        type: 'announcement',
        createdAt: new Date(),
      });
    }
  }, [notificationContext]);

  const deleteAnnouncement = useCallback(async (id: string) => {
    const { error } = await supabase.from('announcements').delete().eq('id', id);

    if (error) {
      console.error('Error deleting announcement:', error);
      toast.error('Failed to delete announcement');
      throw error;
    }
  }, []);

  const toggleAnnouncementActive = useCallback(async (id: string) => {
    const announcement = announcements.find(a => a.id === id);
    if (!announcement) return;

    const { error } = await supabase
      .from('announcements')
      .update({ is_active: !announcement.isActive })
      .eq('id', id);

    if (error) {
      console.error('Error toggling announcement:', error);
      toast.error('Failed to update announcement');
      throw error;
    }
  }, [announcements]);

  const value = {
    leads,
    tasks,
    projects,
    announcements,
    loading,
    addLead,
    updateLead,
    deleteLead,
    addTask,
    updateTask,
    deleteTask,
    addProject,
    updateProject,
    deleteProject,
    addAnnouncement,
    deleteAnnouncement,
    toggleAnnouncementActive,
    refreshData,
  };

  return (
    <DataContext.Provider value={value}>
      {children}
    </DataContext.Provider>
  );
}

export function useData() {
  const context = useContext(DataContext);
  if (!context) {
    throw new Error('useData must be used within a DataProvider');
  }
  return context;
}
