import React, { createContext, useContext, useState, useEffect } from 'react';
import { setAuthTokenGetter } from '@workspace/api-client-react';

export interface User {
  id: string;
  email: string;
  displayName: string;
  photoURL?: string;
  isGuest?: boolean;
  language?: 'ar' | 'en';
}

interface AuthContextType {
  user: User | null;
  loading: boolean;
  login: (email: string, password?: string) => Promise<void>;
  register: (name: string, email: string, password?: string) => Promise<void>;
  loginAsGuest: () => void;
  logout: () => void;
  updateProfile: (data: Partial<User>) => void;
}

const STORAGE_KEY = 'm7_auth_user';

const AuthContext = createContext<AuthContextType>({
  user: null,
  loading: true,
  login: async () => {},
  register: async () => {},
  loginAsGuest: () => {},
  logout: () => {},
  updateProfile: () => {},
});

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState<boolean>(true);

  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        setUser(parsed);
      } else {
        setUser(null);
      }
    } catch (e) {
      console.error('Error loading user from localStorage:', e);
      setUser(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    // Configure api-client to attach user id as bearer token
    if (user?.id) {
      setAuthTokenGetter(() => user.id);
    } else {
      setAuthTokenGetter(null);
    }
  }, [user]);

  const login = async (email: string, _password?: string) => {
    const namePart = email.split('@')[0] || 'مستخدم M7';
    const loggedUser: User = {
      id: 'usr_' + btoa(email).replace(/[^a-zA-Z0-9]/g, '').substring(0, 10),
      email,
      displayName: namePart.charAt(0).toUpperCase() + namePart.slice(1),
      isGuest: false,
      language: 'ar',
    };
    setUser(loggedUser);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(loggedUser));
  };

  const register = async (name: string, email: string, _password?: string) => {
    const newUser: User = {
      id: 'usr_' + btoa(email).replace(/[^a-zA-Z0-9]/g, '').substring(0, 10),
      email,
      displayName: name.trim() || 'مستخدم M7',
      isGuest: false,
      language: 'ar',
    };
    setUser(newUser);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(newUser));
  };

  const loginAsGuest = () => {
    const guestUser: User = {
      id: 'guest_' + Math.random().toString(36).substring(2, 9),
      email: 'guest@m7.ai',
      displayName: 'زائر M7 AI',
      isGuest: true,
      language: 'ar',
    };
    setUser(guestUser);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(guestUser));
  };

  const logout = () => {
    localStorage.removeItem(STORAGE_KEY);
    setUser(null);
  };

  const updateProfile = (data: Partial<User>) => {
    if (!user) return;
    const updated = { ...user, ...data };
    setUser(updated);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        loading,
        login,
        register,
        loginAsGuest,
        logout,
        updateProfile,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
