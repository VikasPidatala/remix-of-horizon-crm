import React, { createContext, useContext, useState, useCallback, useEffect } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';
import { UserRole } from '@/types';

interface Profile {
  id: string;
  user_id: string;
  name: string;
  email: string | null;
  phone: string | null;
  address: string | null;
  status: string;
  manager_id: string | null;
  created_at: string;
  updated_at: string;
}

interface AuthUser {
  id: string;
  userId: string;
  name: string;
  email: string | null;
  phone: string | null;
  address: string | null;
  role: UserRole;
  status: string;
  managerId: string | null;
}

interface AuthContextType {
  user: AuthUser | null;
  session: Session | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  adminExists: boolean | null;
  login: (email: string, password: string) => Promise<{ success: boolean; error?: string }>;
  loginWithUserId: (userId: string, password: string) => Promise<{ success: boolean; error?: string }>;
  signup: (email: string, password: string, name: string, phone: string, address: string) => Promise<{ success: boolean; error?: string }>;
  createUser: (email: string, password: string, name: string, phone: string, address: string, role: UserRole, managerId?: string) => Promise<{ success: boolean; error?: string; userId?: string }>;
  logout: () => Promise<void>;
  hasPermission: (module: string, action: string) => boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [adminExists, setAdminExists] = useState<boolean | null>(null);

  // Check if admin exists
  const checkAdminExists = useCallback(async () => {
    try {
      const { data, error } = await supabase.rpc('admin_exists');
      if (error) throw error;
      setAdminExists(data as boolean);
    } catch (error) {
      console.error('Error checking admin exists:', error);
      setAdminExists(false);
    }
  }, []);

  // Fetch user profile and role
  const fetchUserData = useCallback(async (authUser: User) => {
    try {
      // Fetch profile
      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', authUser.id)
        .single();

      if (profileError) throw profileError;

      // Fetch role
      const { data: role, error: roleError } = await supabase.rpc('get_user_role', {
        _user_id: authUser.id
      });

      if (roleError) throw roleError;

      const userData: AuthUser = {
        id: authUser.id,
        userId: profile.user_id,
        name: profile.name,
        email: profile.email,
        phone: profile.phone,
        address: profile.address,
        role: role as UserRole,
        status: profile.status,
        managerId: profile.manager_id,
      };

      setUser(userData);
    } catch (error) {
      console.error('Error fetching user data:', error);
      setUser(null);
    }
  }, []);

  useEffect(() => {
    // Check admin exists on mount
    checkAdminExists();

    // Set up auth state listener FIRST
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        setSession(session);
        
        if (session?.user) {
          // Defer Supabase calls with setTimeout
          setTimeout(() => {
            fetchUserData(session.user);
          }, 0);
        } else {
          setUser(null);
        }
        
        setIsLoading(false);
      }
    );

    // THEN check for existing session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      
      if (session?.user) {
        fetchUserData(session.user);
      }
      
      setIsLoading(false);
    });

    return () => subscription.unsubscribe();
  }, [fetchUserData, checkAdminExists]);

  // Admin login with email
  const login = useCallback(async (email: string, password: string): Promise<{ success: boolean; error?: string }> => {
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) {
        return { success: false, error: error.message };
      }

      if (data.user) {
        await fetchUserData(data.user);
      }

      return { success: true };
    } catch (error: any) {
      return { success: false, error: error.message || 'Login failed' };
    }
  }, [fetchUserData]);

  // Staff/Manager login with User ID via edge function
  const loginWithUserId = useCallback(async (userId: string, password: string): Promise<{ success: boolean; error?: string }> => {
    try {
      // Use edge function to login (bypasses RLS for profile lookup)
      const { data, error } = await supabase.functions.invoke('login-with-userid', {
        body: { userId, password },
      });

      if (error) {
        console.error('Login edge function error:', error);
        return { success: false, error: error.message || 'Login failed' };
      }

      if (data?.error) {
        return { success: false, error: data.error };
      }

      if (data?.session) {
        // Set the session directly
        const { error: setSessionError } = await supabase.auth.setSession({
          access_token: data.session.access_token,
          refresh_token: data.session.refresh_token,
        });

        if (setSessionError) {
          return { success: false, error: 'Failed to establish session' };
        }

        if (data.user) {
          await fetchUserData(data.user);
        }
      }

      return { success: true };
    } catch (error: any) {
      return { success: false, error: error.message || 'Login failed' };
    }
  }, [fetchUserData]);

  const signup = useCallback(async (
    email: string, 
    password: string, 
    name: string, 
    phone: string, 
    address: string
  ): Promise<{ success: boolean; error?: string }> => {
    try {
      const redirectUrl = `${window.location.origin}/`;
      
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          emailRedirectTo: redirectUrl,
        },
      });

      if (error) {
        return { success: false, error: error.message };
      }

      if (!data.user) {
        return { success: false, error: 'Signup failed' };
      }

      // Generate user_id
      const userId = `${name.toLowerCase().replace(/\s+/g, '_')}_admin_${Date.now().toString().slice(-4)}`;

      // Create profile
      const { error: profileError } = await supabase
        .from('profiles')
        .insert({
          id: data.user.id,
          user_id: userId,
          name,
          email,
          phone,
          address,
          status: 'active',
        });

      if (profileError) {
        return { success: false, error: profileError.message };
      }

      // Assign admin role
      const { error: roleError } = await supabase
        .from('user_roles')
        .insert({
          user_id: data.user.id,
          role: 'admin',
        });

      if (roleError) {
        return { success: false, error: roleError.message };
      }

      // Refresh admin exists check
      await checkAdminExists();

      return { success: true };
    } catch (error: any) {
      return { success: false, error: error.message || 'Signup failed' };
    }
  }, [checkAdminExists]);

  const createUser = useCallback(async (
    email: string,
    password: string,
    name: string,
    phone: string,
    address: string,
    role: UserRole,
    managerId?: string
  ): Promise<{ success: boolean; error?: string; userId?: string }> => {
    try {
      // Create user via edge function to bypass auth
      const { data: authData, error: authError } = await supabase.functions.invoke('create-user', {
        body: { email, password, name, phone, address, role, managerId },
      });

      if (authError) {
        console.error('Edge function error:', authError);
        return { success: false, error: authError.message };
      }

      if (authData?.error) {
        return { success: false, error: authData.error };
      }

      return { success: true, userId: authData?.userId };
    } catch (error: any) {
      console.error('Create user error:', error);
      return { success: false, error: error.message || 'Failed to create user' };
    }
  }, []);

  const logout = useCallback(async () => {
    await supabase.auth.signOut();
    setUser(null);
    setSession(null);
    // Refresh adminExists after logout (e.g., after admin self-deletion)
    setTimeout(() => {
      checkAdminExists();
    }, 0);
  }, [checkAdminExists]);

  const hasPermission = useCallback((module: string, action: string): boolean => {
    if (!user) return false;
    
    // Admin has all permissions
    if (user.role === 'admin') return true;

    // Manager permissions
    if (user.role === 'manager') {
      const managerPermissions: Record<string, string[]> = {
        leads: ['view', 'create', 'edit'],
        tasks: ['view', 'create', 'edit'],
        projects: ['view'],
        leaves: ['view', 'approve'],
        reports: ['view'],
      };
      return managerPermissions[module]?.includes(action) || false;
    }

    // Staff permissions
    if (user.role === 'staff') {
      const staffPermissions: Record<string, string[]> = {
        leads: ['view', 'create', 'edit'],
        tasks: ['view', 'create', 'edit'],
        projects: ['view'],
        leaves: ['view', 'create'],
      };
      return staffPermissions[module]?.includes(action) || false;
    }

    return false;
  }, [user]);

  return (
    <AuthContext.Provider value={{ 
      user, 
      session,
      isAuthenticated: !!user, 
      isLoading,
      adminExists,
      login, 
      loginWithUserId,
      signup,
      createUser,
      logout, 
      hasPermission 
    }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
