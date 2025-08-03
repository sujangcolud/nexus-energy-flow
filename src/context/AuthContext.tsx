
import React, { createContext, useContext, useEffect, useState } from 'react';
import { User } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export type UserRole = 'user' | 'super_admin' | 'data_entry' | 'reports_viewer';

export interface AuthContextType {
  user: User | null;
  userRole: UserRole;
  loading: boolean;
  signOut: () => Promise<void>;
  refreshUserRole: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const [user, setUser] = useState<User | null>(null);
  const [userRole, setUserRole] = useState<UserRole>('user');
  const [loading, setLoading] = useState(true);

  const getUserRole = async (userId: string): Promise<UserRole> => {
    try {
      // First try to get role from profiles table
      const { data: profileData, error: profileError } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', userId)
        .single();

      if (!profileError && profileData?.role) {
        const mappedRole = mapRole(profileData.role);
        console.log('Role from profiles:', profileData.role, 'mapped to:', mappedRole);
        return mappedRole;
      }

      // If profiles doesn't have role, try user_roles table
      const { data: roleData, error: roleError } = await supabase
        .from('user_roles')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .limit(1);

      if (roleError) {
        console.warn('Error fetching user role:', roleError);
        return 'user';
      }

      // Since user_roles table doesn't have role column in current schema,
      // we'll use a fallback approach
      if (roleData && roleData.length > 0) {
        // For now, return user as default since we can't access the role column
        return 'user';
      }

      return 'user';
    } catch (error) {
      console.error('Error in getUserRole:', error);
      return 'user';
    }
  };

  const mapRole = (role: string): UserRole => {
    switch (role?.toLowerCase()) {
      case 'super_admin':
      case 'super_user': // Handle legacy super_user mapping
        return 'super_admin';
      case 'data_entry':
        return 'data_entry';
      case 'reports_viewer':
        return 'reports_viewer';
      default:
        return 'user';
    }
  };

  const refreshUserRole = async () => {
    if (user) {
      const role = await getUserRole(user.id);
      setUserRole(role);
    }
  };

  useEffect(() => {
    // Get initial session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
      if (session?.user) {
        getUserRole(session.user.id).then(setUserRole);
      }
      setLoading(false);
    });

    // Listen for auth changes
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (event, session) => {
      console.log('Auth state changed:', event, session?.user?.email);
      
      setUser(session?.user ?? null);
      
      if (session?.user) {
        const role = await getUserRole(session.user.id);
        setUserRole(role);
      } else {
        setUserRole('user');
      }
      
      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  const signOut = async () => {
    try {
      const { error } = await supabase.auth.signOut();
      if (error) throw error;
      
      setUser(null);
      setUserRole('user');
      toast.success('Signed out successfully');
    } catch (error) {
      console.error('Error signing out:', error);
      toast.error('Error signing out');
    }
  };

  const value: AuthContextType = {
    user,
    userRole,
    loading,
    signOut,
    refreshUserRole,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};
