import {
  createContext,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";
import { setAuthTokenGetter } from "@workspace/api-client-react";
import {
  auth,
  registerUser,
  loginUser,
  logoutUser,
  resetPassword,
  onAuthStateChanged,
  type User,
} from "@/lib/firebase";

interface AuthContextValue {
  user: User | null;
  loading: boolean;
  register: (email: string, password: string, displayName: string) => Promise<void>;
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  sendReset: (email: string) => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (firebaseUser) => {
      setUser(firebaseUser);
      setLoading(false);

      // Inject Firebase UID as bearer token so every API call is scoped
      if (firebaseUser) {
        setAuthTokenGetter(() => firebaseUser.uid);
      } else {
        setAuthTokenGetter(null);
      }
    });
    return unsub;
  }, []);

  const register = async (email: string, password: string, displayName: string) => {
    const u = await registerUser(email, password, displayName);
    setAuthTokenGetter(() => u.uid);
  };

  const login = async (email: string, password: string) => {
    const u = await loginUser(email, password);
    setAuthTokenGetter(() => u.uid);
  };

  const logout = async () => {
    setAuthTokenGetter(null);
    await logoutUser();
  };

  const sendReset = async (email: string) => {
    await resetPassword(email);
  };

  return (
    <AuthContext.Provider value={{ user, loading, register, login, logout, sendReset }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used inside <AuthProvider>");
  return ctx;
}
