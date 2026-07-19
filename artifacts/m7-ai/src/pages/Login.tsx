import { useState } from "react";
import { useLocation } from "wouter";
import { useAuth } from "@/contexts/AuthContext";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Loader2, Eye, EyeOff, Sparkles, Mail, Lock, User } from "lucide-react";
import { cn } from "@/lib/utils";

type Tab = "login" | "register";

export default function Login() {
  const [, navigate] = useLocation();
  const { login, register } = useAuth();

  const [tab, setTab] = useState<Tab>("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [showPass, setShowPass] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const clearForm = () => {
    setEmail("");
    setPassword("");
    setName("");
    setError("");
  };

  const handleTab = (t: Tab) => {
    setTab(t);
    clearForm();
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    if (!email.trim() || !password.trim()) {
      setError("يرجى تعبئة جميع الحقول");
      return;
    }
    if (tab === "register" && !name.trim()) {
      setError("يرجى إدخال اسمك");
      return;
    }
    if (password.length < 6) {
      setError("كلمة المرور يجب أن تكون 6 أحرف على الأقل");
      return;
    }

    setLoading(true);
    try {
      if (tab === "login") {
        await login(email.trim(), password);
      } else {
        await register(email.trim(), password, name.trim());
      }
      navigate("/");
    } catch (err: unknown) {
      const code = (err as { code?: string })?.code ?? "";
      const message = (err as { message?: string })?.message ?? "";
      console.error("[M7 Auth] error code:", code, "| message:", message);

      const messages: Record<string, string> = {
        // Registration errors
        "auth/email-already-in-use":    "البريد الإلكتروني مستخدم بالفعل",
        "auth/weak-password":           "كلمة المرور ضعيفة — يجب أن تكون 6 أحرف على الأقل",
        "auth/invalid-email":           "صيغة البريد الإلكتروني غير صحيحة",
        "auth/operation-not-allowed":   "تسجيل البريد الإلكتروني غير مفعّل — فعّله من Firebase Console",
        // Login errors
        "auth/user-not-found":          "البريد الإلكتروني غير مسجل",
        "auth/wrong-password":          "كلمة المرور غير صحيحة",
        "auth/invalid-credential":      "البريد أو كلمة المرور غير صحيحة",
        "auth/user-disabled":           "هذا الحساب موقوف",
        "auth/too-many-requests":       "محاولات كثيرة — حاول لاحقاً",
        // Network / config errors
        "auth/network-request-failed":  "تعذّر الاتصال بالإنترنت، تحقق من اتصالك",
        "auth/internal-error":          "خطأ داخلي في Firebase",
        "auth/configuration-not-found": "❌ Firebase Authentication غير مفعّل — شاهد التعليمات أدناه",
      };

      // Show mapped message, or fall back to the real Firebase error code
      setError(messages[code] ?? (code ? `[${code}] حدث خطأ، حاول مرة أخرى` : "حدث خطأ غير متوقع"));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      className="min-h-[100dvh] w-full flex flex-col items-center justify-center relative overflow-hidden px-4"
      dir="rtl"
    >
      {/* Background */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-[-15%] right-[-10%] w-[55%] h-[55%] rounded-full bg-primary/10 blur-[140px]" />
        <div className="absolute bottom-[-15%] left-[-10%] w-[50%] h-[50%] rounded-full bg-primary/6 blur-[120px]" />
        <div
          className="absolute inset-0 opacity-[0.03]"
          style={{
            backgroundImage:
              "linear-gradient(#f59e0b 1px, transparent 1px), linear-gradient(90deg, #f59e0b 1px, transparent 1px)",
            backgroundSize: "60px 60px",
          }}
        />
      </div>

      {/* Card */}
      <div className="relative z-10 w-full max-w-sm space-y-6 animate-in fade-in slide-in-from-bottom-6 duration-500">
        {/* Logo */}
        <div className="flex flex-col items-center gap-2">
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-primary/30 via-primary/10 to-transparent border border-primary/25 flex items-center justify-center shadow-[0_0_40px_rgba(245,158,11,0.18)]">
            <span className="text-2xl font-black text-primary">M7</span>
          </div>
          <h1 className="text-2xl font-bold">M7 AI</h1>
          <p className="text-sm text-muted-foreground">مساعدك الذكي الشخصي</p>
        </div>

        {/* Tabs */}
        <div className="glass rounded-2xl p-1 flex gap-1">
          {(["login", "register"] as Tab[]).map((t) => (
            <button
              key={t}
              onClick={() => handleTab(t)}
              className={cn(
                "flex-1 py-2 rounded-xl text-sm font-medium transition-all",
                tab === t
                  ? "bg-primary text-black shadow"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              {t === "login" ? "تسجيل الدخول" : "إنشاء حساب"}
            </button>
          ))}
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="glass rounded-2xl p-6 space-y-4">
          {tab === "register" && (
            <div className="relative">
              <User className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                type="text"
                placeholder="الاسم الكامل"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="pr-10 text-right"
                disabled={loading}
              />
            </div>
          )}

          <div className="relative">
            <Mail className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              type="email"
              placeholder="البريد الإلكتروني"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="pr-10 text-right"
              disabled={loading}
            />
          </div>

          <div className="relative">
            <Lock className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              type={showPass ? "text" : "password"}
              placeholder="كلمة المرور"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="pr-10 pl-10 text-right"
              disabled={loading}
            />
            <button
              type="button"
              onClick={() => setShowPass((v) => !v)}
              className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
            >
              {showPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            </button>
          </div>

          {error && (
            <p className="text-sm text-red-400 bg-red-500/10 border border-red-500/20 rounded-xl px-3 py-2 text-center">
              {error}
            </p>
          )}

          <Button type="submit" className="w-full rounded-xl gap-2" disabled={loading}>
            {loading ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Sparkles className="w-4 h-4" />
            )}
            {tab === "login" ? "دخول" : "إنشاء الحساب"}
          </Button>

          {tab === "login" && (
            <div className="text-center">
              <button
                type="button"
                onClick={() => navigate("/forgot-password")}
                className="text-xs text-primary/70 hover:text-primary transition-colors"
              >
                نسيت كلمة المرور؟
              </button>
            </div>
          )}
        </form>
      </div>
    </div>
  );
}
