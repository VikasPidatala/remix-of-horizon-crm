import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import UserFormModal from './UserFormModal';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Search, Plus, MoreHorizontal, Edit, UserX, Trash2, Loader2 } from 'lucide-react';
import { Checkbox } from '@/components/ui/checkbox';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu';
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
import { format } from 'date-fns';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { UserRole } from '@/types';

interface DBUser {
  id: string;
  user_id: string;
  name: string;
  email: string | null;
  phone: string | null;
  address: string | null;
  status: string;
  manager_id: string | null;
  created_at: string;
  role?: UserRole;
}

export default function UserList() {
  const { createUser } = useAuth();
  const [users, setUsers] = useState<DBUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [roleFilter, setRoleFilter] = useState<string>('all');
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<DBUser | null>(null);
  const [deleteUser, setDeleteUser] = useState<DBUser | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [showBulkDeleteDialog, setShowBulkDeleteDialog] = useState(false);

  const managers = users.filter(u => u.role === 'manager');

  // Fetch users from database
  const fetchUsers = async (showLoader = true) => {
    try {
      // Only show loader on initial load
      if (showLoader && users.length === 0) {
        setLoading(true);
      }
      
      // Fetch profiles
      const { data: profiles, error: profilesError } = await supabase
        .from('profiles')
        .select('*')
        .order('created_at', { ascending: false });

      if (profilesError) throw profilesError;

      // Fetch all roles in parallel
      const rolePromises = (profiles || []).map(async (profile) => {
        const { data: roleData } = await supabase.rpc('get_user_role', {
          _user_id: profile.id
        });
        return { profile, role: roleData as UserRole };
      });

      const profilesWithRoles = await Promise.all(rolePromises);
      
      const usersWithRoles: DBUser[] = profilesWithRoles
        .filter(({ role }) => role !== 'admin') // Don't show admin in the list
        .map(({ profile, role }) => ({
          ...profile,
          role
        }));

      setUsers(usersWithRoles);
    } catch (error: any) {
      console.error('Error fetching users:', error);
      toast.error('Failed to load users');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers(true);
  }, []);

  const filteredUsers = users.filter(user => {
    const matchesSearch = 
      user.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      user.user_id.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (user.email?.toLowerCase().includes(searchQuery.toLowerCase()) ?? false);
    
    const matchesRole = roleFilter === 'all' || user.role === roleFilter;
    
    return matchesSearch && matchesRole;
  });

  const allSelected = filteredUsers.length > 0 && filteredUsers.every(user => selectedIds.has(user.id));
  const someSelected = selectedIds.size > 0;

  const toggleSelectAll = () => {
    if (allSelected) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(filteredUsers.map(user => user.id)));
    }
  };

  const toggleSelect = (id: string) => {
    const newSet = new Set(selectedIds);
    if (newSet.has(id)) {
      newSet.delete(id);
    } else {
      newSet.add(id);
    }
    setSelectedIds(newSet);
  };

  const handleBulkDelete = async () => {
    try {
      for (const id of selectedIds) {
        await supabase.functions.invoke('delete-user', {
          body: { userId: id }
        });
      }
      setUsers(prev => prev.filter(u => !selectedIds.has(u.id)));
      toast.success(`${selectedIds.size} user(s) deleted successfully`);
      setSelectedIds(new Set());
      setShowBulkDeleteDialog(false);
    } catch (error: any) {
      toast.error('Failed to delete some users', {
        description: error.message
      });
    }
  };

  const handleSaveUser = async (userData: {
    email: string;
    password: string;
    name: string;
    phone: string;
    address: string;
    role: UserRole;
    managerId?: string;
  }): Promise<{ success: boolean; userId?: string }> => {
    try {
      setIsSubmitting(true);
      
      const result = await createUser(
        userData.email,
        userData.password,
        userData.name,
        userData.phone,
        userData.address,
        userData.role,
        userData.managerId
      );

      if (result.success) {
        toast.success(`User created successfully!`);
        await fetchUsers(false);
        return { success: true, userId: result.userId };
      } else {
        toast.error('Failed to create user', {
          description: result.error
        });
        return { success: false };
      }
    } catch (error: any) {
      toast.error('Error creating user', {
        description: error.message
      });
      return { success: false };
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleUpdateUser = async (
    userId: string,
    userData: { name: string; phone: string; address: string; newPassword?: string }
  ): Promise<{ success: boolean }> => {
    try {
      setIsSubmitting(true);
      
      const { data, error } = await supabase.functions.invoke('update-user', {
        body: { userId, ...userData },
      });

      if (error) {
        toast.error('Failed to update user', { description: error.message });
        return { success: false };
      }

      if (data?.error) {
        toast.error('Failed to update user', { description: data.error });
        return { success: false };
      }

      await fetchUsers(false);
      return { success: true };
    } catch (error: any) {
      toast.error('Error updating user', { description: error.message });
      return { success: false };
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleToggleStatus = async (user: DBUser) => {
    try {
      const newStatus = user.status === 'active' ? 'inactive' : 'active';
      
      const { error } = await supabase
        .from('profiles')
        .update({ status: newStatus })
        .eq('id', user.id);

      if (error) throw error;

      setUsers(prev => prev.map(u => 
        u.id === user.id ? { ...u, status: newStatus } : u
      ));
      
      const action = user.status === 'active' ? 'disabled' : 'enabled';
      toast.success(`${user.name}'s account has been ${action}`);
    } catch (error: any) {
      toast.error('Failed to update user status');
    }
  };

  const handleDeleteUser = async () => {
    if (!deleteUser) return;
    
    try {
      // Delete via edge function to properly clean up auth user
      const { error } = await supabase.functions.invoke('delete-user', {
        body: { userId: deleteUser.id }
      });

      if (error) throw error;

      setUsers(prev => prev.filter(u => u.id !== deleteUser.id));
      toast.success('User deleted successfully');
      setDeleteUser(null);
    } catch (error: any) {
      toast.error('Failed to delete user', {
        description: error.message
      });
    }
  };

  const getRoleBadgeColor = (role: string) => {
    switch (role) {
      case 'manager':
        return 'bg-primary/15 text-primary border-primary/30';
      case 'staff':
        return 'bg-info/15 text-info border-info/30';
      default:
        return 'bg-muted text-muted-foreground';
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-6 h-6 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
        <div className="flex gap-4 flex-1 w-full sm:w-auto flex-wrap items-center">
          <div className="relative flex-1 sm:max-w-xs">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Search users..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10 input-field"
            />
          </div>
          
          <Select value={roleFilter} onValueChange={setRoleFilter}>
            <SelectTrigger className="w-36">
              <SelectValue placeholder="All Roles" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Roles</SelectItem>
              <SelectItem value="manager">Manager</SelectItem>
              <SelectItem value="staff">Staff</SelectItem>
            </SelectContent>
          </Select>

          {someSelected && (
            <Button 
              variant="destructive" 
              size="sm"
              onClick={() => setShowBulkDeleteDialog(true)}
            >
              <Trash2 className="w-4 h-4 mr-2" />
              Delete ({selectedIds.size})
            </Button>
          )}
        </div>

        <Button className="btn-accent shrink-0" onClick={() => setIsFormOpen(true)}>
          <Plus className="w-4 h-4 mr-2" />
          Add User
        </Button>
      </div>

      {/* Table */}
      <div className="glass-card rounded-2xl overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow className="hover:bg-transparent">
              <TableHead className="w-12">
                <Checkbox 
                  checked={allSelected} 
                  onCheckedChange={toggleSelectAll}
                  aria-label="Select all"
                />
              </TableHead>
              <TableHead className="font-semibold">User</TableHead>
              <TableHead className="font-semibold">User ID</TableHead>
              <TableHead className="font-semibold hidden sm:table-cell">Contact</TableHead>
              <TableHead className="font-semibold">Role</TableHead>
              <TableHead className="font-semibold">Status</TableHead>
              <TableHead className="font-semibold hidden md:table-cell">Joined</TableHead>
              <TableHead className="font-semibold w-20"></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredUsers.map((user, index) => (
              <TableRow 
                key={user.id} 
                className="table-row-hover animate-fade-in"
                style={{ animationDelay: `${index * 50}ms` }}
              >
                <TableCell>
                  <Checkbox 
                    checked={selectedIds.has(user.id)} 
                    onCheckedChange={() => toggleSelect(user.id)}
                    aria-label={`Select ${user.name}`}
                  />
                </TableCell>
                <TableCell>
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full gradient-primary flex items-center justify-center text-white font-semibold shrink-0">
                      {user.name.charAt(0)}
                    </div>
                    <div>
                      <p className="font-medium text-foreground">{user.name}</p>
                      {user.email && <p className="text-xs text-muted-foreground">{user.email}</p>}
                    </div>
                  </div>
                </TableCell>
                <TableCell>
                  <code className="text-xs bg-muted px-2 py-1 rounded font-mono">
                    {user.user_id}
                  </code>
                </TableCell>
                <TableCell className="hidden sm:table-cell">
                  <p className="text-sm text-muted-foreground">{user.phone || '-'}</p>
                </TableCell>
                <TableCell>
                  <Badge 
                    variant="outline" 
                    className={cn("capitalize", getRoleBadgeColor(user.role || ''))}
                  >
                    {user.role}
                  </Badge>
                </TableCell>
                <TableCell>
                  <Badge 
                    variant="outline"
                    className={cn(
                      user.status === 'active' 
                        ? 'bg-success/15 text-success border-success/30' 
                        : 'bg-muted text-muted-foreground'
                    )}
                  >
                    {user.status}
                  </Badge>
                </TableCell>
                <TableCell className="hidden md:table-cell">
                  <p className="text-sm text-muted-foreground">
                    {format(new Date(user.created_at), 'MMM dd, yyyy')}
                  </p>
                </TableCell>
                <TableCell>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon" className="h-8 w-8">
                        <MoreHorizontal className="w-4 h-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem 
                        onClick={() => setEditingUser(user)}
                      >
                        <Edit className="w-4 h-4 mr-2" />
                        Edit User
                      </DropdownMenuItem>
                      <DropdownMenuItem 
                        onClick={() => handleToggleStatus(user)}
                      >
                        <UserX className="w-4 h-4 mr-2" />
                        {user.status === 'active' ? 'Disable Account' : 'Enable Account'}
                      </DropdownMenuItem>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem 
                        className="text-destructive focus:text-destructive"
                        onClick={() => setDeleteUser(user)}
                      >
                        <Trash2 className="w-4 h-4 mr-2" />
                        Delete User
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>

        {filteredUsers.length === 0 && (
          <div className="text-center py-12">
            <p className="text-muted-foreground">No users found</p>
          </div>
        )}
      </div>

      <UserFormModal
        open={isFormOpen || !!editingUser}
        onClose={() => { setIsFormOpen(false); setEditingUser(null); }}
        onSave={handleSaveUser}
        onUpdate={handleUpdateUser}
        managers={managers.map(m => ({ id: m.id, name: m.name }))}
        isSubmitting={isSubmitting}
        editUser={editingUser}
      />

      <AlertDialog open={!!deleteUser} onOpenChange={() => setDeleteUser(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete User</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete {deleteUser?.name}? This action cannot be undone. All data created by this user will also be deleted.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteUser} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={showBulkDeleteDialog} onOpenChange={setShowBulkDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Selected Users</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete {selectedIds.size} user(s)? This action cannot be undone. All data created by these users will also be deleted.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleBulkDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
