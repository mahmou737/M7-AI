import React, {
  createContext,
  useContext,
  useEffect,
  useState,
  useCallback,
} from "react";

export type AuthUser = {
  id: string;
  email: string;
  displayName?: string;
};

type AuthContextValue = {
  user: AuthUser | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (email: string, password: string, displayName?: string) => Promise<void>;
  signOut: () => void;
};

const STORAGE_KEY = "m7ai.auth.user";

const AuthContext = createContext<AuthContextValue>({
  user: null,
  loading: true,
  signIn: async () => {},
  signUp: async () => {},
  signOut: () => {},
});

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);

  // Restore session on mount
  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) setUser(JSON.parse(raw) as AuthUser);
    } catch {
      // ignore malformed storage
    } finally {
      setLoading(false);
    }
  }, []);

  const persist = useCallback((next: AuthUser | null) => {
    setUser(next);
    try {
      if (next) localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
      else localStorage.removeItem(STORAGE_KEY);
    } catch {
      // ignore storage errors
    }
  }, []);

  const signIn = useCallback(
    async (email: string, password: string) => {
      const trimmed = email.trim();
      if (!trimmed || !password) {
        throw new Error("يرجى إدخال البريد الإلكتروني وكلمة المرور");
      }
      persist({
        id: trimmed.toLowerCase(),
        email: trimmed,
        displayName: trimmed.split("@")[0],
      });
    },
    [persist]
  );

  const signUp = useCallback(
    async (email: string, password: string, displayName?: string) => {
      const trimmed = email.trim();
      if (!trimmed || !password) {
        throw new Error("يرجى إدخال البريد الإلكتروني وكلمة المرور");
      }
      persist({
        id: trimmed.toLowerCase(),
        email: trimmed,
        displayName: displayName?.trim() || trimmed.split("@")[0],
      });
    },
    [persist]
  );

  const signOut = useCallback(() => persist(null), [persist]);

  return (
    <AuthContext.Provider value={{ user, loading, signIn, signUp, signOut }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
