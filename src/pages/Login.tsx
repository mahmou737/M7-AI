import { useState } from "react";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useAuth } from "@/contexts/AuthContext";
import { useTranslation } from "react-i18next";
import { ThemeToggle } from "@/components/ThemeToggle";
import {
  User,
  Mail,
  Lock,
  ArrowRight,
  ArrowLeft,
  Sparkles,
  Zap,
  Languages,
  Home,
} from "lucide-react";

export default function Login() {
  const [, navigate] = useLocation();
  const { login, register, loginAsGuest } = useAuth();
  const { i18n } = useTranslation();

  const isRtl = i18n.language === "ar";

  const [mode, setMode] = useState<"login" | "register">("login");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const toggleLanguage = () => {
    const next = isRtl ? "en" : "ar";
    i18n.changeLanguage(next);
    document.dir = next === "ar" ? "rtl" : "ltr";
    document.documentElement.lang = next;
    localStorage.setItem("i18nextLng", next);
    localStorage.setItem("m7_lang", next);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (!email.trim()) {
      setError(isRtl ? "يرجى إدخال البريد الإلكتروني" : "Please enter your email");
      return;
    }

    if (mode === "register" && !name.trim()) {
      setError(isRtl ? "يرجى إدخال اسم المستخدم" : "Please enter your name");
      return;
    }

    setLoading(true);
    try {
      if (mode === "login") {
        await login(email, password);
      } else {
        await register(name, email, password);
      }
      navigate("/chat");
    } catch (err: any) {
      setError(err?.message || (isRtl ? "حدث خطأ أثناء العملية" : "An error occurred"));
    } finally {
      setLoading(false);
    }
  };

  const handleGuest = () => {
    loginAsGuest();
    navigate("/chat");
  };

  return (
    <div className="min-h-[100dvh] flex flex-col items-center justify-center bg-[var(--bg-primary)] text-[var(--text-main)] px-4 py-8 relative overflow-hidden transition-colors duration-200" dir={isRtl ? "rtl" : "ltr"}>
      {/* Glow background */}
      <div className="absolute top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[30rem] h-[25rem] bg-amber-500/10 blur-[130px] pointer-events-none rounded-full" />

      {/* Top Header */}
      <div className="w-full max-w-md flex items-center justify-between mb-6">
        <button
          onClick={() => navigate("/")}
          className="flex items-center gap-1.5 text-xs font-semibold text-[var(--text-secondary)] hover:text-[var(--text-main)] transition-colors p-2 rounded-xl hover:bg-black/5 dark:hover:bg-white/5"
        >
          {isRtl ? <ArrowRight className="w-4 h-4" /> : <ArrowLeft className="w-4 h-4" />}
          <span>{isRtl ? "الرئيسية" : "Home"}</span>
        </button>

        <div className="flex items-center gap-2">
          <ThemeToggle showLabel={false} isRtl={isRtl} />

          <button
            onClick={toggleLanguage}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-[var(--text-main)] bg-black/5 dark:bg-white/5 hover:bg-black/10 dark:hover:bg-white/10 border border-[var(--border-color)] rounded-xl transition-all"
          >
            <Languages className="w-3.5 h-3.5 text-amber-500" />
            <span>{isRtl ? "English" : "العربية"}</span>
          </button>
        </div>
      </div>

      {/* Card */}
      <div className="w-full max-w-md bg-[var(--bg-card)] border border-[var(--border-color)] backdrop-blur-2xl p-6 sm:p-8 rounded-3xl shadow-2xl relative z-10">
        {/* Brand */}
        <div className="flex flex-col items-center text-center mb-6">
          <div className="w-14 h-14 rounded-2xl bg-amber-500 flex items-center justify-center shadow-[0_0_25px_rgba(245,158,11,0.3)] mb-3 cursor-pointer" onClick={() => navigate("/")}>
            <span className="font-extrabold !text-black text-xl">M7</span>
          </div>
          <h1 className="text-2xl font-bold text-[var(--text-main)]">
            {mode === "login"
              ? isRtl
                ? "تسجيل الدخول إلى M7 AI"
                : "Sign In to M7 AI"
              : isRtl
                ? "إنشاء حساب جديد"
                : "Create New Account"}
          </h1>
          <p className="text-xs text-[var(--text-secondary)] mt-1">
            {isRtl
              ? "استمتع بمحادثات ذكية وحفظ دائم للمحادثات والذاكرة"
              : "Access continuous chat history and contextual smart memory"}
          </p>
        </div>

        {/* Tab switch */}
        <div className="grid grid-cols-2 p-1 bg-black/5 dark:bg-black/40 border border-[var(--border-color)] rounded-xl mb-6">
          <button
            type="button"
            onClick={() => {
              setMode("login");
              setError("");
            }}
            className={`py-2 text-xs font-bold rounded-lg transition-all ${
              mode === "login"
                ? "bg-amber-500 !text-black shadow-md"
                : "text-[var(--text-secondary)] hover:text-[var(--text-main)]"
            }`}
          >
            {isRtl ? "تسجيل الدخول" : "Sign In"}
          </button>
          <button
            type="button"
            onClick={() => {
              setMode("register");
              setError("");
            }}
            className={`py-2 text-xs font-bold rounded-lg transition-all ${
              mode === "register"
                ? "bg-amber-500 !text-black shadow-md"
                : "text-[var(--text-secondary)] hover:text-[var(--text-main)]"
            }`}
          >
            {isRtl ? "إنشاء حساب" : "Register"}
          </button>
        </div>

        {error && (
          <div className="mb-4 p-3 rounded-xl bg-red-500/10 border border-red-500/30 text-red-500 text-xs text-center font-medium">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          {mode === "register" && (
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-[var(--text-main)]">
                {isRtl ? "الاسم الكامل" : "Full Name"}
              </label>
              <div className="relative">
                <User className="w-4 h-4 absolute right-3.5 top-1/2 -translate-y-1/2 text-[var(--text-secondary)]" />
                <Input
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder={isRtl ? "مثال: محمود صبري" : "e.g. Mahmoud Sabry"}
                  className="pr-10 bg-[var(--bg-primary)] border-[var(--border-color)] h-11 text-sm text-[var(--text-main)]"
                  required
                />
              </div>
            </div>
          )}

          <div className="space-y-1.5">
            <label className="text-xs font-medium text-[var(--text-main)]">
              {isRtl ? "البريد الإلكتروني" : "Email Address"}
            </label>
            <div className="relative">
              <Mail className="w-4 h-4 absolute right-3.5 top-1/2 -translate-y-1/2 text-[var(--text-secondary)]" />
              <Input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="name@example.com"
                className="pr-10 bg-[var(--bg-primary)] border-[var(--border-color)] h-11 text-sm text-[var(--text-main)]"
                required
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <label className="text-xs font-medium text-[var(--text-main)]">
                {isRtl ? "كلمة المرور" : "Password"}
              </label>
              {mode === "login" && (
                <button
                  type="button"
                  onClick={() => navigate("/forgot-password")}
                  className="text-[11px] text-amber-500 hover:underline"
                >
                  {isRtl ? "نسيت كلمة المرور؟" : "Forgot password?"}
                </button>
              )}
            </div>
            <div className="relative">
              <Lock className="w-4 h-4 absolute right-3.5 top-1/2 -translate-y-1/2 text-[var(--text-secondary)]" />
              <Input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="pr-10 bg-[var(--bg-primary)] border-[var(--border-color)] h-11 text-sm text-[var(--text-main)]"
                required
              />
            </div>
          </div>

          <Button
            type="submit"
            disabled={loading}
            className="w-full h-11 font-bold text-sm bg-amber-500 hover:bg-amber-400 !text-black shadow-lg shadow-amber-500/20 rounded-xl mt-2"
          >
            <span className="!text-black">
              {loading
                ? isRtl
                  ? "جارٍ المعالجة..."
                  : "Processing..."
                : mode === "login"
                  ? isRtl
                    ? "تسجيل الدخول"
                    : "Sign In"
                  : isRtl
                    ? "إنشاء الحساب"
                    : "Create Account"}
            </span>
          </Button>
        </form>

        {/* Divider */}
        <div className="relative my-5 text-center">
          <div className="absolute inset-0 flex items-center">
            <div className="w-full border-t border-[var(--border-color)]" />
          </div>
          <span className="relative bg-[var(--bg-card)] px-3 text-[11px] text-[var(--text-secondary)] font-medium">
            {isRtl ? "أو" : "OR"}
          </span>
        </div>

        {/* Guest access button */}
        <Button
          type="button"
          variant="outline"
          onClick={handleGuest}
          className="w-full h-11 font-semibold text-xs border-[var(--border-color)] bg-black/5 dark:bg-white/5 hover:bg-black/10 dark:hover:bg-white/10 rounded-xl gap-2 text-[var(--text-main)]"
        >
          <Zap className="w-4 h-4 text-amber-500" />
          <span>{isRtl ? "الدخول السريع الفوري كضيف" : "Instant Guest Access"}</span>
        </Button>
      </div>
    </div>
  );
}
