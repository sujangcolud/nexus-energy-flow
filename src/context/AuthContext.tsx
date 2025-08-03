
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
  hasRole: (role: UserRole) => boolean;
  login: (email: string, password: string) => Promise<void>;
  signup: (email: string, password: string) => Promise<void>;
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

      // Fallback to default role
      return 'user';
    } catch (error) {
      console.error('Error in getUserRole:', error);
      return 'user';
    }
  };

  const mapRole = (role: string): UserRole => {
    switch (role?.toLowerCase()) {
      case 'super_admin':
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

  const hasRole = (role: UserRole): boolean => {
    const roleHierarchy = {
      'user': 1,
      'data_entry': 2,
      'reports_viewer': 3,
      'super_admin': 4
    };
    return roleHierarchy[userRole] >= roleHierarchy[role];
  };

  const login = async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    if (error) throw error;
    toast.success('Signed in successfully');
  };

  const signup = async (email: string, password: string) => {
    const { error } = await supabase.auth.signUp({
      email,
      password,
    });
    if (error) throw error;
    toast.success('Account created successfully');
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
    hasRole,
    login,
    signup,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};
