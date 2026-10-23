import React, { createContext, useContext, useEffect, useState } from 'react';
import {
  getCurrentUser,
  getMockUsers,
  loginWithMockUser,
  logout as logoutService,
} from '../services/authService';
import { User, UserRole } from '../types/auth';

interface AuthContextType {
  currentUser: User | null;
  role: UserRole;
  isAdmin: boolean;
  isEmployee: boolean;
  availableUsers: User[];
  loading: boolean;
  switchUser: (userId: string) => Promise<void>;
  logout: () => Promise<void>;
  refreshAuth: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [currentUser, setCurrUser] = useState<User | null>(null);
  const [availableUsers, setAvailableUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);

  const loadAuth = async () => {
    try {
      setLoading(true);
      const [user, users] = await Promise.all([getCurrentUser(), getMockUsers()]);
      setCurrUser(user);
      setAvailableUsers(users);
    } catch (err) {
      console.error('Failed to initialize auth', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAuth();
  }, []);

  const handleSwitchUser = async (userId: string) => {
    const user = await loginWithMockUser(userId);
    setCurrUser(user);
  };

  const handleLogout = async () => {
    await logoutService();
    setCurrUser(null);
  };

  const role: UserRole = currentUser?.role || 'employee';
  const isAdmin = role === 'admin';
  const isEmployee = role === 'employee';

  return (
    <AuthContext.Provider
      value={{
        currentUser,
        role,
        isAdmin,
        isEmployee,
        availableUsers,
        loading,
        switchUser: handleSwitchUser,
        logout: handleLogout,
        refreshAuth: loadAuth,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export function useAuth(): AuthContextType {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
