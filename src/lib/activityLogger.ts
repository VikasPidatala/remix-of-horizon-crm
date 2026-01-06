import { supabase } from '@/integrations/supabase/client';

interface LogActivityParams {
  userId: string;
  userName: string;
  userRole: 'admin' | 'manager' | 'staff';
  module: 'leads' | 'tasks' | 'projects' | 'leaves' | 'users' | 'announcements';
  action: string;
  details: string;
}

export async function logActivity({
  userId,
  userName,
  userRole,
  module,
  action,
  details,
}: LogActivityParams): Promise<void> {
  try {
    const { error } = await supabase.from('activity_logs').insert([{
      user_id: userId,
      user_name: userName,
      user_role: userRole,
      module,
      action,
      details,
    }]);

    if (error) {
      console.error('Error logging activity:', error);
    }
  } catch (error) {
    console.error('Error logging activity:', error);
  }
}
