import React, { createContext, useContext, useState, useEffect } from 'react';
import { setAuthTokenGetter } from '@workspace/api-client-react';

export interface User {
  id: string;
  email: string;
  displayName: string;
  photoURL?: string;
  isGuest?: boolean;
  language?: 'ar' | 'en';
  plan?: 'free' | 'pro';
  proSince?: string;
}

export interface ImageLimitInfo {
  count: number;
  max: number;
  remainingImages: number;
  isExhausted: boolean;
  firstUsedAt: number | null;
  lastUsedAt: number | null;
  resetAt: number | null;
  remainingMs: number;
  remainingHours: number;
  remainingMinutes: number;
  canUse: boolean;
  isPro: boolean;
  formattedRemainingTimeAr: string;
  formattedRemainingTimeEn: string;
}

interface AuthContextType {
  user: User | null;
  plan: 'free' | 'pro';
  loading: boolean;
  login: (email: string, password?: string) => Promise<void>;
  register: (name: string, email: string, password?: string) => Promise<void>;
  loginAsGuest: () => void;
  logout: () => void;
  updateProfile: (data: Partial<User>) => void;
  upgradeToPro: () => void;
  downgradeToFree: () => void;
  getDailyImageUsage: () => number;
  getImageLimitInfo: () => ImageLimitInfo;
  recordImageUsage: () => number;
  canUseImages: () => boolean;
}

const STORAGE_KEY = 'm7_auth_user';
const DURATION_24H = 24 * 60 * 60 * 1000; // 24 hours in milliseconds

const defaultLimitInfo: ImageLimitInfo = {
  count: 0,
  max: 5,
  remainingImages: 5,
  isExhausted: false,
  firstUsedAt: null,
  lastUsedAt: null,
  resetAt: null,
  remainingMs: 0,
  remainingHours: 0,
  remainingMinutes: 0,
  canUse: true,
  isPro: false,
  formattedRemainingTimeAr: '24 ساعة',
  formattedRemainingTimeEn: '24 hours',
};

const AuthContext = createContext<AuthContextType>({
  user: null,
  plan: 'free',
  loading: true,
  login: async () => {},
  register: async () => {},
  loginAsGuest: () => {},
  logout: () => {},
  updateProfile: () => {},
  upgradeToPro: () => {},
  downgradeToFree: () => {},
  getDailyImageUsage: () => 0,
  getImageLimitInfo: () => defaultLimitInfo,
  recordImageUsage: () => 0,
  canUseImages: () => true,
});

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState<boolean>(true);

  useEffect(() => {
    try {
      // Check if user returned from Kashier payment gateway with success status
      const urlParams = new URLSearchParams(window.location.search);
      const paymentStatus =
        urlParams.get('paymentStatus') ||
        urlParams.get('payment_status') ||
        urlParams.get('kashier_payment_status');

      let currentUser: User | null = null;
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        currentUser = JSON.parse(stored);
      }

      if (paymentStatus && paymentStatus.toUpperCase() === 'SUCCESS') {
        if (!currentUser) {
          currentUser = {
            id: 'usr_' + Math.random().toString(36).substring(2, 10),
            email: 'pro_user@m7.ai',
            displayName: 'مشترك M7 PRO',
            isGuest: false,
            plan: 'pro',
            proSince: new Date().toISOString(),
          };
        } else {
          currentUser = {
            ...currentUser,
            plan: 'pro',
            proSince: currentUser.proSince || new Date().toISOString(),
          };
        }
        localStorage.setItem(STORAGE_KEY, JSON.stringify(currentUser));
        // Clean URL parameters cleanly
        const cleanUrl = window.location.pathname;
        window.history.replaceState({}, document.title, cleanUrl);
      }

      setUser(currentUser);
    } catch (e) {
      console.error('Error loading user from localStorage:', e);
      setUser(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    // Configure api-client to attach user id and plan as bearer token
    if (user?.id) {
      const plan = user.plan === 'pro' ? 'pro' : 'free';
      const rawToken = `${user.id}:${plan}`;
      // Ensure token contains strictly safe ASCII characters for HTTP Authorization header
      const safeToken = encodeURIComponent(rawToken);
      setAuthTokenGetter(() => safeToken);
    } else {
      setAuthTokenGetter(null);
    }
  }, [user]);

  const safeGenerateId = (emailStr: string) => {
    try {
      return 'usr_' + btoa(unescape(encodeURIComponent(emailStr))).replace(/[^a-zA-Z0-9]/g, '').substring(0, 10);
    } catch {
      return 'usr_' + Math.random().toString(36).substring(2, 10);
    }
  };

  const getUsageStorageKey = () => {
    const uid = user?.id || 'guest';
    return `m7_img_usage_v2_${uid}`;
  };

  const getStoredUsage = (): { count: number; firstUsedAt: number | null; lastUsedAt: number | null } => {
    try {
      const raw = localStorage.getItem(getUsageStorageKey());
      if (!raw) return { count: 0, firstUsedAt: null, lastUsedAt: null };
      const parsed = JSON.parse(raw);
      const now = Date.now();

      // Check if 24 hours have elapsed since the first image of this cycle
      if (parsed.firstUsedAt && now - parsed.firstUsedAt >= DURATION_24H) {
        // Automatically reset cycle!
        localStorage.removeItem(getUsageStorageKey());
        return { count: 0, firstUsedAt: null, lastUsedAt: null };
      }

      return {
        count: typeof parsed.count === 'number' ? parsed.count : 0,
        firstUsedAt: parsed.firstUsedAt || null,
        lastUsedAt: parsed.lastUsedAt || null,
      };
    } catch {
      return { count: 0, firstUsedAt: null, lastUsedAt: null };
    }
  };

  const getDailyImageUsage = (): number => {
    if (user?.plan === 'pro') return 0;
    return getStoredUsage().count;
  };

  const getImageLimitInfo = (): ImageLimitInfo => {
    const isPro = user?.plan === 'pro';
    if (isPro) {
      return {
        count: 0,
        max: Infinity,
        remainingImages: Infinity,
        isExhausted: false,
        firstUsedAt: null,
        lastUsedAt: null,
        resetAt: null,
        remainingMs: 0,
        remainingHours: 0,
        remainingMinutes: 0,
        canUse: true,
        isPro: true,
        formattedRemainingTimeAr: 'غير محدود ∞',
        formattedRemainingTimeEn: 'Unlimited ∞',
      };
    }

    const usage = getStoredUsage();
    const now = Date.now();
    const count = usage.count;
    const max = 5;
    const remainingImages = Math.max(0, max - count);
    const isExhausted = count >= max;

    let resetAt: number | null = null;
    let remainingMs = 0;
    let remainingHours = 0;
    let remainingMinutes = 0;
    let formattedRemainingTimeAr = '24 ساعة';
    let formattedRemainingTimeEn = '24 hours';

    if (usage.firstUsedAt) {
      resetAt = usage.firstUsedAt + DURATION_24H;
      remainingMs = Math.max(0, resetAt - now);
      remainingHours = Math.floor(remainingMs / (1000 * 60 * 60));
      remainingMinutes = Math.floor((remainingMs % (1000 * 60 * 60)) / (1000 * 60));

      if (remainingHours > 0) {
        formattedRemainingTimeAr = `${remainingHours} ساعة و ${remainingMinutes} دقيقة`;
        formattedRemainingTimeEn = `${remainingHours}h ${remainingMinutes}m`;
      } else {
        formattedRemainingTimeAr = `${remainingMinutes} دقيقة`;
        formattedRemainingTimeEn = `${remainingMinutes}m`;
      }
    }

    const canUse = count < max;

    return {
      count,
      max,
      remainingImages,
      isExhausted,
      firstUsedAt: usage.firstUsedAt,
      lastUsedAt: usage.lastUsedAt,
      resetAt,
      remainingMs,
      remainingHours,
      remainingMinutes,
      canUse,
      isPro: false,
      formattedRemainingTimeAr,
      formattedRemainingTimeEn,
    };
  };

  const recordImageUsage = (): number => {
    if (user?.plan === 'pro') return 0;
    try {
      const usage = getStoredUsage();
      const now = Date.now();
      const firstUsedAt = usage.firstUsedAt || now;
      const newCount = usage.count + 1;
      const updated = {
        count: newCount,
        firstUsedAt,
        lastUsedAt: now,
      };
      localStorage.setItem(getUsageStorageKey(), JSON.stringify(updated));
      return newCount;
    } catch {
      return 1;
    }
  };

  const canUseImages = (): boolean => {
    if (user?.plan === 'pro') return true;
    return getDailyImageUsage() < 3;
  };

  const upgradeToPro = () => {
    if (!user) {
      // Create guest or user if not logged in
      const defaultUser: User = {
        id: 'usr_' + Math.random().toString(36).substring(2, 10),
        email: 'pro_user@m7.ai',
        displayName: 'PRO Subscriber',
        isGuest: false,
        plan: 'pro',
        proSince: new Date().toISOString(),
      };
      setUser(defaultUser);
      localStorage.setItem(STORAGE_KEY, JSON.stringify(defaultUser));
      return;
    }
    const updated: User = {
      ...user,
      plan: 'pro',
      proSince: user.proSince || new Date().toISOString(),
    };
    setUser(updated);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
  };

  const downgradeToFree = () => {
    if (!user) return;
    const updated: User = {
      ...user,
      plan: 'free',
    };
    setUser(updated);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
  };

  const login = async (email: string, _password?: string) => {
    const namePart = email.split('@')[0] || 'مستخدم M7';
    const loggedUser: User = {
      id: safeGenerateId(email),
      email,
      displayName: namePart.charAt(0).toUpperCase() + namePart.slice(1),
      isGuest: false,
      language: 'ar',
      plan: 'free',
    };
    setUser(loggedUser);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(loggedUser));
  };

  const register = async (name: string, email: string, _password?: string) => {
    const newUser: User = {
      id: safeGenerateId(email),
      email,
      displayName: name.trim() || 'مستخدم M7',
      isGuest: false,
      language: 'ar',
      plan: 'free',
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
      plan: 'free',
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
        plan: user?.plan || 'free',
        loading,
        login,
        register,
        loginAsGuest,
        logout,
        updateProfile,
        upgradeToPro,
        downgradeToFree,
        getDailyImageUsage,
        getImageLimitInfo,
        recordImageUsage,
        canUseImages,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
