import React, { createContext, useCallback, useContext, useEffect, useState } from 'react';
import { UNAUTHORIZED_EVENT } from '../services/apiClient';
import {
  getCurrentUser,
  listUsers,
  login as loginService,
  logout as logoutService,
} from '../services/authService';
import { User, UserRole } from '../types/auth';

interface AuthContextType {
  currentUser: User | null;
  role: UserRole;
  isAdmin: boolean;
  isEmployee: boolean;
  /** Directory users (admins only; used e.g. to reassign link owners). Empty for employees. */
  availableUsers: User[];
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  refreshAuth: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [currentUser, setCurrUser] = useState<User | null>(null);
  const [availableUsers, setAvailableUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);

  const loadDirectory = useCallback(async (user: User | null) => {
    if (user?.role !== 'admin') {
      setAvailableUsers([]);
      return;
    }
    try {
      setAvailableUsers((await listUsers()).filter((u) => u.isActive));
    } catch (err) {
      console.warn('Failed to load user directory', err);
      setAvailableUsers([]);
    }
  }, []);

  const loadAuth = useCallback(async () => {
    try {
      setLoading(true);
      const user = await getCurrentUser();
      setCurrUser(user);
      await loadDirectory(user);
    } catch (err) {
      console.error('Failed to initialize auth', err);
      setCurrUser(null);
    } finally {
      setLoading(false);
    }
  }, [loadDirectory]);

  useEffect(() => {
    loadAuth();
  }, [loadAuth]);

  // Any API call that comes back 401 means the session expired or was revoked.
  useEffect(() => {
    const onUnauthorized = () => {
      setCurrUser(null);
      setAvailableUsers([]);
    };
    window.addEventListener(UNAUTHORIZED_EVENT, onUnauthorized);
    return () => window.removeEventListener(UNAUTHORIZED_EVENT, onUnauthorized);
  }, []);

  const handleLogin = async (email: string, password: string) => {
    const user = await loginService(email, password);
    setCurrUser(user);
    await loadDirectory(user);
  };

  const handleLogout = async () => {
    try {
      await logoutService();
    } finally {
      setCurrUser(null);
      setAvailableUsers([]);
    }
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
        login: handleLogin,
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
