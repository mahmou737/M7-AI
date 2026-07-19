import { useLocation } from "wouter";
import { buttonVariants } from "@/components/ui/button";
import { Sparkles, Zap, Shield, Brain, MessageCircle, Loader2, LogIn } from "lucide-react";
import { cn } from "@/lib/utils";
import { useCreateConversation } from "@workspace/api-client-react";
import { useAuth } from "@/contexts/AuthContext";

export default function Home() {
  const [, navigate] = useLocation();
  const { user } = useAuth();
  const createConversation = useCreateConversation();

  const handleStart = () => {
    createConversation.mutate(undefined, {
      onSuccess: (conv) => {
        navigate(`/chat/${conv.id}`);
      },
    });
  };

  // Derive display name and initials
  const displayName = user?.displayName ?? user?.email?.split("@")[0] ?? null;
  const initials = displayName
    ? displayName.slice(0, 2).toUpperCase()
    : user?.email?.slice(0, 2).toUpperCase() ?? "M7";
  const greeting = displayName
    ? `مرحبًا، ${displayName}`
    : "مرحبًا بك في M7 AI";

  return (
    <div
      className="min-h-[100dvh] w-full flex flex-col items-center justify-between relative overflow-hidden"
      dir="rtl"
    >
      {/* ── Background ─────────────────────────────────────────────────────── */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-[-20%] right-[-12%] w-[60%] h-[60%] rounded-full bg-primary/10 blur-[160px]" />
        <div className="absolute bottom-[-20%] left-[-12%] w-[55%] h-[55%] rounded-full bg-primary/7 blur-[140px]" />
        <div className="absolute top-[40%] left-[30%] w-[30%] h-[30%] rounded-full bg-primary/4 blur-[100px]" />
        {/* grid */}
        <div
          className="absolute inset-0 opacity-[0.025]"
          style={{
            backgroundImage:
              "linear-gradient(#f59e0b 1px, transparent 1px), linear-gradient(90deg, #f59e0b 1px, transparent 1px)",
            backgroundSize: "60px 60px",
          }}
        />
      </div>

      {/* ── Top bar ────────────────────────────────────────────────────────── */}
      <header className="w-full flex items-center justify-between px-5 md:px-8 pt-5 z-10">
        {/* Brand */}
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-primary to-primary/50 flex items-center justify-center shadow-[0_0_14px_rgba(245,158,11,0.4)]">
            <span className="text-[11px] font-black text-black">M7</span>
          </div>
          <span className="font-bold text-sm tracking-wide">M7 AI</span>
        </div>

        {/* Right side: live dot + user */}
        <div className="flex items-center gap-3">
          <div className="hidden sm:flex items-center gap-1.5 text-xs text-muted-foreground">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75" />
              <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500" />
            </span>
            متاح الآن
          </div>

          {user ? (
            /* Logged-in avatar */
            <button
              onClick={() => navigate("/profile")}
              title="الملف الشخصي"
              className="flex items-center gap-2 group"
            >
              <span className="hidden sm:block text-xs text-muted-foreground group-hover:text-foreground transition-colors truncate max-w-[120px]">
                {displayName ?? user.email}
              </span>
              <div className="w-9 h-9 rounded-full bg-gradient-to-br from-primary/50 to-primary/20 border border-primary/30 flex items-center justify-center shadow-[0_0_12px_rgba(245,158,11,0.2)] group-hover:shadow-[0_0_20px_rgba(245,158,11,0.35)] group-hover:border-primary/60 transition-all duration-300">
                <span className="text-xs font-bold text-primary">{initials}</span>
              </div>
            </button>
          ) : (
            /* Guest login button */
            <button
              onClick={() => navigate("/login")}
              className={cn(
                "flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-full border border-white/10 text-muted-foreground hover:text-foreground hover:border-white/25 hover:bg-white/5 transition-all"
              )}
            >
              <LogIn className="w-3.5 h-3.5" />
              تسجيل الدخول
            </button>
          )}
        </div>
      </header>

      {/* ── Hero ───────────────────────────────────────────────────────────── */}
      <main className="flex-1 flex flex-col items-center justify-center text-center px-4 z-10 max-w-4xl mx-auto w-full py-10 gap-12">

        {/* Logo */}
        <div
          className="flex flex-col items-center gap-8 animate-in fade-in slide-in-from-bottom-8 duration-700"
          style={{ animationFillMode: "both" }}
        >
          <div className="relative flex items-center justify-center">
            {/* Outer pulse ring */}
            <div className="absolute w-40 h-40 rounded-full border border-primary/15 animate-[spin_18s_linear_infinite]" />
            <div className="absolute w-52 h-52 rounded-full border border-primary/8 animate-[spin_28s_linear_infinite_reverse]" />

            {/* Glow halo */}
            <div className="absolute w-32 h-32 rounded-full bg-primary/8 blur-2xl" />

            {/* Main logo card */}
            <div className="relative w-28 h-28 rounded-[2rem] bg-gradient-to-br from-primary/25 via-primary/10 to-transparent border border-primary/25 flex items-center justify-center shadow-[0_0_50px_rgba(245,158,11,0.2)] hover:shadow-[0_0_80px_rgba(245,158,11,0.3)] transition-shadow duration-700">
              <span className="text-4xl font-black text-primary tracking-tighter select-none">M7</span>
            </div>

            {/* Orbiting dots */}
            <span className="absolute top-2 right-2 w-3 h-3 rounded-full bg-primary/50 blur-[1px] animate-pulse" />
            <span
              className="absolute bottom-2 left-2 w-2 h-2 rounded-full bg-primary/35 animate-pulse"
              style={{ animationDelay: "0.8s" }}
            />
            <span
              className="absolute top-1/2 -right-1 w-1.5 h-1.5 rounded-full bg-primary/25 animate-pulse"
              style={{ animationDelay: "1.4s" }}
            />
          </div>

          {/* Text */}
          <div className="space-y-3">
            {/* Personal greeting */}
            {user && (
              <p
                className="text-sm text-primary/80 font-medium tracking-widest uppercase animate-in fade-in duration-500"
                style={{ animationDelay: "200ms", animationFillMode: "both" }}
              >
                {greeting}
              </p>
            )}

            <h1 className="text-5xl sm:text-6xl md:text-8xl font-black tracking-tight leading-none">
              <span className="text-transparent bg-clip-text bg-gradient-to-b from-white via-white/95 to-white/30">
                M7 AI
              </span>
            </h1>

            <p className="text-base md:text-xl text-primary font-semibold tracking-wide">
              مساعدك الذكي الشخصي
            </p>
            <p className="mx-auto max-w-md text-sm md:text-base text-muted-foreground leading-relaxed">
              صُمم ليفهمك بعمق، يتذكر تفضيلاتك، ويجيب بذكاء —
              بالعربية الفصحى الواضحة.
            </p>
          </div>
        </div>

        {/* Feature cards */}
        <div
          className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4 w-full animate-in fade-in slide-in-from-bottom-10 duration-700"
          style={{ animationDelay: "180ms", animationFillMode: "both" }}
        >
          <FeatureCard icon={<Zap className="w-5 h-5" />} title="سرعة فائقة" desc="ردود فورية في ثوانٍ" />
          <FeatureCard icon={<Brain className="w-5 h-5" />} title="ذاكرة دائمة" desc="يتذكر معلوماتك" />
          <FeatureCard icon={<Shield className="w-5 h-5" />} title="خصوصية تامة" desc="بياناتك محمية" />
          <FeatureCard icon={<MessageCircle className="w-5 h-5" />} title="محادثات محفوظة" desc="سجل كامل لشاتاتك" />
        </div>

        {/* CTA */}
        <div
          className="flex flex-col items-center gap-4 animate-in fade-in slide-in-from-bottom-10 duration-700"
          style={{ animationDelay: "340ms", animationFillMode: "both" }}
        >
          <button
            onClick={handleStart}
            disabled={createConversation.isPending}
            className={cn(
              "relative inline-flex items-center justify-center gap-3",
              "rounded-full px-12 py-5 text-base font-bold",
              "bg-primary text-primary-foreground",
              "shadow-[0_0_30px_rgba(245,158,11,0.3),0_4px_24px_rgba(0,0,0,0.4)]",
              "hover:shadow-[0_0_55px_rgba(245,158,11,0.5),0_6px_32px_rgba(0,0,0,0.5)]",
              "hover:brightness-110 hover:scale-[1.03]",
              "active:scale-[0.97] active:brightness-95",
              "transition-all duration-200 ease-out",
              "disabled:opacity-60 disabled:cursor-not-allowed disabled:hover:scale-100 disabled:hover:shadow-[0_0_30px_rgba(245,158,11,0.3)]",
              "before:absolute before:inset-0 before:rounded-full before:bg-white/10 before:opacity-0 hover:before:opacity-100 before:transition-opacity"
            )}
          >
            {createConversation.isPending ? (
              <Loader2 className="w-5 h-5 animate-spin" />
            ) : (
              <Sparkles className="w-5 h-5" />
            )}
            {createConversation.isPending ? "جارٍ التحميل..." : "ابدأ المحادثة"}
          </button>

          {!user && (
            <p className="text-xs text-muted-foreground/60">
              أو{" "}
              <button
                onClick={() => navigate("/login")}
                className="text-primary/70 hover:text-primary underline underline-offset-2 transition-colors"
              >
                سجّل دخولك
              </button>{" "}
              لحفظ محادثاتك
            </p>
          )}
        </div>
      </main>

      {/* ── Footer ─────────────────────────────────────────────────────────── */}
      <footer className="w-full z-10 pb-6 pt-4 flex flex-col items-center gap-1 border-t border-white/5">
        <div className="flex items-center gap-3">
          <span className="block w-12 h-px bg-gradient-to-r from-transparent to-primary/40" />
          <p className="text-xs text-muted-foreground text-center tracking-wide">
            <span className="text-primary/70 font-semibold">الصانع: </span>
            محمود صبري عبد العزيز محمد سالم الدالي
          </p>
          <span className="block w-12 h-px bg-gradient-to-l from-transparent to-primary/40" />
        </div>
        <p className="text-[10px] text-muted-foreground/40">M7 AI · جميع الحقوق محفوظة</p>
      </footer>
    </div>
  );
}

function FeatureCard({
  icon,
  title,
  desc,
}: {
  icon: React.ReactNode;
  title: string;
  desc: string;
}) {
  return (
    <div className="glass rounded-2xl p-4 md:p-5 flex flex-col items-center text-center gap-3 hover:border-primary/30 hover:bg-white/5 transition-all duration-300 group cursor-default">
      <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center text-primary group-hover:scale-110 group-hover:bg-primary/20 transition-all duration-300">
        {icon}
      </div>
      <div>
        <p className="text-sm font-bold">{title}</p>
        <p className="text-[11px] text-muted-foreground mt-0.5">{desc}</p>
      </div>
    </div>
  );
}
