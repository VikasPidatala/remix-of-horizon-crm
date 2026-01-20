import React, { createContext, useContext, useState, useCallback, useEffect, useRef } from 'react';
import { Call } from '@/types';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface CallsContextType {
  calls: Call[];
  loading: boolean;
  addCall: (call: Omit<Call, 'id' | 'createdAt' | 'updatedAt'>) => Promise<void>;
  addBulkCalls: (calls: Omit<Call, 'id' | 'createdAt' | 'updatedAt' | 'createdBy'>[]) => Promise<void>;
  updateCall: (id: string, data: Partial<Call>) => Promise<void>;
  deleteCall: (id: string) => Promise<void>;
  refreshCalls: () => Promise<void>;
}

const CallsContext = createContext<CallsContextType | undefined>(undefined);

// Helper to convert DB row to Call type
const dbToCall = (row: any): Call => ({
  id: row.id,
  name: row.name || undefined,
  phone: row.phone,
  email: row.email || undefined,
  source: row.source || undefined,
  status: row.status,
  notes: row.notes || undefined,
  callDate: new Date(row.call_date),
  callTime: row.call_time || undefined,
  createdBy: row.created_by,
  createdAt: new Date(row.created_at),
  updatedAt: new Date(row.updated_at),
});

export function CallsProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const [calls, setCalls] = useState<Call[]>([]);
  const [loading, setLoading] = useState(true);
  const isRefreshing = useRef(false);

  const fetchCalls = useCallback(async () => {
    const { data, error } = await supabase
      .from('calls')
      .select('*')
      .order('call_date', { ascending: false })
      .order('call_time', { ascending: false });
    
    if (error) {
      console.error('Error fetching calls:', error);
      return [];
    }
    
    const callsList = (data || []).map(dbToCall);
    setCalls(callsList);
    return callsList;
  }, []);

  const refreshCalls = useCallback(async () => {
    if (isRefreshing.current) return;
    isRefreshing.current = true;
    
    const isInitialLoad = calls.length === 0;
    if (isInitialLoad) {
      setLoading(true);
    }
    
    try {
      await fetchCalls();
    } catch (error) {
      console.error('Error refreshing calls:', error);
    } finally {
      setLoading(false);
      isRefreshing.current = false;
    }
  }, [fetchCalls, calls.length]);

  // Initial fetch
  useEffect(() => {
    refreshCalls();
  }, [refreshCalls]);

  // Real-time subscriptions
  useEffect(() => {
    const channel = supabase
      .channel('calls-changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'calls' }, () => refreshCalls())
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [refreshCalls]);

  const addCall = useCallback(async (call: Omit<Call, 'id' | 'createdAt' | 'updatedAt'>) => {
    if (!user) {
      toast.error('You must be logged in to add calls');
      return;
    }

    const { data, error } = await supabase.from('calls').insert([{
      name: call.name,
      phone: call.phone,
      email: call.email,
      source: call.source,
      status: call.status,
      notes: call.notes,
      call_date: call.callDate.toISOString().split('T')[0],
      call_time: call.callTime,
      created_by: user.id,
    }]).select();

    if (error) {
      console.error('Error adding call:', error);
      toast.error('Failed to add call');
      throw error;
    }

    if (data && data[0]) {
      const newCall = dbToCall(data[0]);
      setCalls(prev => [newCall, ...prev]);
    }

    toast.success('Call added successfully');
  }, [user]);

  const addBulkCalls = useCallback(async (callsData: Omit<Call, 'id' | 'createdAt' | 'updatedAt' | 'createdBy'>[]) => {
    if (!user) {
      toast.error('You must be logged in to add calls');
      return;
    }

    const insertData = callsData.map(call => ({
      name: call.name,
      phone: call.phone,
      email: call.email,
      source: call.source,
      status: call.status,
      notes: call.notes,
      call_date: call.callDate.toISOString().split('T')[0],
      call_time: call.callTime,
      created_by: user.id,
    }));

    const { data, error } = await supabase.from('calls').insert(insertData).select();

    if (error) {
      console.error('Error adding bulk calls:', error);
      toast.error('Failed to import calls');
      throw error;
    }

    if (data) {
      const newCalls = data.map(dbToCall);
      setCalls(prev => [...newCalls, ...prev]);
    }
  }, [user]);

  const updateCall = useCallback(async (id: string, data: Partial<Call>) => {
    const updateData: any = {};
    if (data.name !== undefined) updateData.name = data.name;
    if (data.phone !== undefined) updateData.phone = data.phone;
    if (data.email !== undefined) updateData.email = data.email;
    if (data.source !== undefined) updateData.source = data.source;
    if (data.status !== undefined) updateData.status = data.status;
    if (data.notes !== undefined) updateData.notes = data.notes;
    if (data.callDate !== undefined) updateData.call_date = data.callDate.toISOString().split('T')[0];
    if (data.callTime !== undefined) updateData.call_time = data.callTime;

    const { error } = await supabase.from('calls').update(updateData).eq('id', id);

    if (error) {
      console.error('Error updating call:', error);
      toast.error('Failed to update call');
      throw error;
    }

    setCalls(prev =>
      prev.map(c => (c.id === id ? { ...c, ...data, updatedAt: new Date() } : c))
    );

    toast.success('Call updated successfully');
  }, []);

  const deleteCall = useCallback(async (id: string) => {
    const { error } = await supabase.from('calls').delete().eq('id', id);

    if (error) {
      console.error('Error deleting call:', error);
      toast.error('Failed to delete call');
      throw error;
    }

    setCalls(prev => prev.filter(c => c.id !== id));
    toast.success('Call deleted successfully');
  }, []);

  return (
    <CallsContext.Provider value={{
      calls,
      loading,
      addCall,
      addBulkCalls,
      updateCall,
      deleteCall,
      refreshCalls,
    }}>
      {children}
    </CallsContext.Provider>
  );
}

export function useCalls() {
  const context = useContext(CallsContext);
  if (context === undefined) {
    throw new Error('useCalls must be used within a CallsProvider');
  }
  return context;
}
