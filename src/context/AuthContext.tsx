
import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';

export type UserRole = 'user' | 'super_user' | 'super_admin';

export interface User {
  id: string;
  email: string;
  name: string;
  role: UserRole;
  first_name?: string;
  last_name?: string;
}

interface AuthContextType {
  user: User | null;
  login: (email: string, password: string) => Promise<void>;
  logout: () => void;
  loading: boolean;
  hasRole: (requiredRole: UserRole) => boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

// Mock authentication - Replace with Supabase later
const mockUsers = [
  { 
    id: '1', 
    email: 'admin@energypalace.com', 
    password: 'admin123', 
    name: 'Admin User', 
    role: 'super_admin' as UserRole,
    first_name: 'Admin',
    last_name: 'User'
  },
  { 
    id: '2', 
    email: 'manager@energypalace.com', 
    password: 'manager123', 
    name: 'Manager User', 
    role: 'super_user' as UserRole,
    first_name: 'Manager',
    last_name: 'User'
  },
  { 
    id: '3', 
    email: 'user@energypalace.com', 
    password: 'user123', 
    name: 'Regular User', 
    role: 'user' as UserRole,
    first_name: 'Regular',
    last_name: 'User'
  }
];

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Check for stored auth
    const storedUser = localStorage.getItem('auth_user');
    if (storedUser) {
      setUser(JSON.parse(storedUser));
    }
    setLoading(false);
  }, []);

  const login = async (email: string, password: string) => {
    const mockUser = mockUsers.find(u => u.email === email && u.password === password);
    if (!mockUser) {
      throw new Error('Invalid credentials');
    }
    
    const userData: User = {
      id: mockUser.id,
      email: mockUser.email,
      name: mockUser.name,
      role: mockUser.role,
      first_name: mockUser.first_name,
      last_name: mockUser.last_name
    };
    
    setUser(userData);
    localStorage.setItem('auth_user', JSON.stringify(userData));
  };

  const logout = () => {
    setUser(null);
    localStorage.removeItem('auth_user');
  };

  const hasRole = (requiredRole: UserRole): boolean => {
    if (!user) return false;
    
    const roleHierarchy = {
      'user': 1,
      'super_user': 2,
      'super_admin': 3
    };
    
    return roleHierarchy[user.role] >= roleHierarchy[requiredRole];
  };

  return (
    <AuthContext.Provider value={{ user, login, logout, loading, hasRole }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
